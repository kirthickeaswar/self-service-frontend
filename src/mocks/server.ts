import {
  CreateScheduleInput,
  CreateTaskInput,
  LogEntry,
  LogFilters,
  Schedule,
  ScheduleStatus,
  Task,
  TaskFilters,
  TaskStatus,
  UpdateScheduleInput,
  UpdateTaskInput,
} from '@/types/domain';
import { ensureOwnerInAccess } from '@/features/tasks/utils/access';
import { calculateNextRunAt } from '@/features/tasks/utils/schedule';
import { mockDb } from './db';

const parseFailureRate = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
};

const readFailureRate = parseFailureRate(import.meta.env.VITE_MOCK_READ_ERROR_RATE, 0);
const writeFailureRate = parseFailureRate(import.meta.env.VITE_MOCK_WRITE_ERROR_RATE, 0.1);

const simulateLatency = () => Math.floor(Math.random() * 400) + 400;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isTimeRangeInvalid = (start: string, end: string) => end <= start;

let mockIdCounter = 100000;
const id = () => mockIdCounter++;

const byTaskFilters = (tasks: Task[], filters?: TaskFilters) => {
  if (!filters) {
    return tasks;
  }

  return tasks.filter((task) => {
    const matchesSearch =
      !filters.search ||
      `${task.name} ${task.description} ${task.owner} ${task.accessEmails.join(' ')}`.toLowerCase().includes(filters.search.toLowerCase());

    const matchesType = !filters.type || filters.type === 'ALL' || task.type === filters.type;
    const matchesStatus = !filters.status || filters.status === 'ALL' || task.status === filters.status;
    const matchesOwner = !filters.owner || task.owner === filters.owner;

    return matchesSearch && matchesType && matchesStatus && matchesOwner;
  });
};

const byLogFilters = (logs: LogEntry[], filters: LogFilters) => {
  return logs.filter((log) => {
    if (filters.taskId && log.taskId !== filters.taskId) {
      return false;
    }

    if (filters.scheduleId && log.scheduleId !== filters.scheduleId) {
      return false;
    }

    if (filters.level && filters.level !== 'ALL' && log.level !== filters.level) {
      return false;
    }

    if (
      filters.search &&
      !`${log.message} ${log.details ?? ''}`.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }

    if (filters.from && new Date(log.timestamp) < new Date(filters.from)) {
      return false;
    }

    if (filters.to && new Date(log.timestamp) > new Date(filters.to)) {
      return false;
    }

    return true;
  });
};

const withMock = <T>(resolver: () => T, failureRate = 0): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (failureRate > 0 && Math.random() < failureRate) {
        reject(new Error('Mock API: temporary failure. Please retry.'));
        return;
      }

      try {
        resolve(clone(resolver()));
      } catch (error) {
        reject(error);
      }
    }, simulateLatency());
  });
};

export const apiServer = {
  getTaskTypes() {
    return withMock(() => [...mockDb.taskTypes], readFailureRate);
  },

  addTaskType(type: string) {
    return withMock(() => {
      const normalized = type.trim().toUpperCase();
      if (!normalized) {
        throw new Error('Task type is required');
      }
      if (mockDb.taskTypes.includes(normalized)) {
        throw new Error('Task type already exists');
      }
      mockDb.taskTypes.push(normalized);
      return [...mockDb.taskTypes];
    }, writeFailureRate);
  },

  deleteTaskType(type: string) {
    return withMock(() => {
      const normalized = type.trim().toUpperCase();
      if (!mockDb.taskTypes.includes(normalized)) {
        throw new Error('Task type not found');
      }
      const inUse = mockDb.tasks.some((task) => task.type === normalized);
      if (inUse) {
        throw new Error('Cannot delete a type currently used by existing tasks');
      }
      mockDb.taskTypes = mockDb.taskTypes.filter((item) => item !== normalized);
      return [...mockDb.taskTypes];
    }, writeFailureRate);
  },

  getTasks(filters?: TaskFilters) {
    return withMock(() => byTaskFilters(mockDb.tasks, filters), readFailureRate);
  },

  getTask(taskId: number) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      return task;
    }, readFailureRate);
  },

  createTask(input: CreateTaskInput) {
    return withMock(() => {
      const now = new Date().toISOString();
      const taskId = id();
      if (!mockDb.taskTypes.includes(input.type)) {
        throw new Error('Selected task type is not available');
      }

      const schedules: Schedule[] = input.schedule
        ? [
            {
              id: id(),
              taskId,
              mode: input.schedule.mode,
              time: input.schedule.time,
              endTime: input.schedule.endTime,
              interval: input.schedule.interval,
              frequency: input.schedule.frequency,
              date: input.schedule.date,
              nextRunAt: calculateNextRunAt(input.schedule),
              status: 'SCHEDULED',
            },
          ]
        : [];

      const created: Task = {
        id: taskId,
        name: input.name,
        description: input.description,
        accessEmails: ensureOwnerInAccess(input.owner, input.accessEmails),
        type: input.type,
        owner: input.owner,
        status: schedules.length > 0 ? 'ACTIVE' : 'NOT_SCHEDULED',
        createdAt: now,
        updatedAt: now,
        schedules,
      };

      mockDb.tasks.unshift(created);

      mockDb.logs.unshift({
        id: id(),
        taskId,
        timestamp: now,
        level: 'INFO',
        message: `Task ${created.name} created by ${created.owner}`,
        details: 'Task initialized in mock scheduler store.',
        source: 'SYSTEM',
      });

      return created;
    }, writeFailureRate);
  },

  updateTask(taskId: number, input: UpdateTaskInput) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      if (!mockDb.taskTypes.includes(input.type)) {
        throw new Error('Selected task type is not available');
      }

      task.name = input.name;
      task.description = input.description;
      task.accessEmails = ensureOwnerInAccess(task.owner, input.accessEmails);
      task.type = input.type;
      task.updatedAt = new Date().toISOString();

      mockDb.logs.unshift({
        id: id(),
        taskId,
        timestamp: task.updatedAt,
        level: 'INFO',
        message: `Task metadata updated (${input.name}, ${input.type})`,
        details: input.description,
        source: 'SYSTEM',
      });

      return task;
    }, writeFailureRate);
  },

  deleteTask(taskId: number) {
    return withMock(() => {
      const existing = mockDb.tasks.find((task) => task.id === taskId);
      if (!existing) {
        throw new Error('Task not found');
      }

      mockDb.tasks = mockDb.tasks.filter((task) => task.id !== taskId);
      mockDb.logs = mockDb.logs.filter((log) => log.taskId !== taskId);

      return { success: true };
    }, writeFailureRate);
  },

  updateTaskStatus(taskId: number, status: TaskStatus) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      task.status = status;
      task.updatedAt = new Date().toISOString();

      mockDb.logs.unshift({
        id: id(),
        taskId,
        timestamp: task.updatedAt,
        level: status === 'ERROR' ? 'ERROR' : 'INFO',
        message: `Task status changed to ${status}`,
        source: 'SYSTEM',
      });

      return task;
    }, writeFailureRate);
  },

  createSchedule(taskId: number, input: CreateScheduleInput) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (input.mode === 'RECURRING' && !input.frequency) {
        throw new Error('Recurring schedules require frequency');
      }
      if (
        input.mode === 'RECURRING' &&
        input.endTime &&
        (input.frequency === 'MINUTELY' || input.frequency === 'HOURLY') &&
        isTimeRangeInvalid(input.time, input.endTime)
      ) {
        throw new Error('Recurring end time must be later than start time');
      }
      if (input.mode === 'RECURRING' && !(input.interval && input.interval >= 1)) {
        throw new Error('Recurring schedules require a valid interval');
      }

      if (input.mode === 'NON_RECURRING' && !input.date) {
        throw new Error('Non-recurring schedules require date');
      }

      const schedule: Schedule = {
        id: id(),
        taskId,
        mode: input.mode,
        time: input.time,
        endTime: input.endTime,
        interval: input.interval,
        frequency: input.frequency,
        date: input.date,
        nextRunAt: calculateNextRunAt(input),
        status: 'SCHEDULED',
      };

      task.schedules.push(schedule);
      if (task.status === 'NOT_SCHEDULED') {
        task.status = 'ACTIVE';
      }
      task.updatedAt = new Date().toISOString();

      return schedule;
    }, writeFailureRate);
  },

  updateSchedule(taskId: number, scheduleId: number, input: UpdateScheduleInput) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const schedule = task.schedules.find((item) => item.id === scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (input.mode === 'RECURRING' && !input.frequency) {
        throw new Error('Recurring schedules require frequency');
      }
      if (
        input.mode === 'RECURRING' &&
        input.endTime &&
        (input.frequency === 'MINUTELY' || input.frequency === 'HOURLY') &&
        isTimeRangeInvalid(input.time, input.endTime)
      ) {
        throw new Error('Recurring end time must be later than start time');
      }
      if (input.mode === 'RECURRING' && !(input.interval && input.interval >= 1)) {
        throw new Error('Recurring schedules require a valid interval');
      }

      if (input.mode === 'NON_RECURRING' && !input.date) {
        throw new Error('Non-recurring schedules require date');
      }

      schedule.mode = input.mode;
      schedule.time = input.time;
      schedule.endTime = input.mode === 'RECURRING' ? input.endTime : undefined;
      schedule.interval = input.mode === 'RECURRING' ? input.interval : undefined;
      schedule.frequency = input.mode === 'RECURRING' ? input.frequency : undefined;
      schedule.date = input.mode === 'NON_RECURRING' ? input.date : undefined;
      schedule.nextRunAt = calculateNextRunAt({
        mode: input.mode,
        time: input.time,
        endTime: input.endTime,
        interval: input.interval,
        frequency: input.frequency,
        date: input.date,
      });

      task.updatedAt = new Date().toISOString();
      return schedule;
    }, writeFailureRate);
  },

  deleteSchedule(taskId: number, scheduleId: number) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const initialLength = task.schedules.length;
      task.schedules = task.schedules.filter((schedule) => schedule.id !== scheduleId);

      if (task.schedules.length === initialLength) {
        throw new Error('Schedule not found');
      }

      if (task.schedules.length === 0) {
        task.status = 'NOT_SCHEDULED';
      }
      task.updatedAt = new Date().toISOString();
      mockDb.logs = mockDb.logs.filter((log) => log.scheduleId !== scheduleId);
      return { success: true };
    }, writeFailureRate);
  },

  updateScheduleStatus(taskId: number, scheduleId: number, status: ScheduleStatus) {
    return withMock(() => {
      const task = mockDb.tasks.find((item) => item.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const schedule = task.schedules.find((item) => item.id === scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      schedule.status = status;
      task.updatedAt = new Date().toISOString();
      return schedule;
    }, writeFailureRate);
  },

  getLogs(filters: LogFilters) {
    return withMock(
      () => byLogFilters(mockDb.logs, filters).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)),
      readFailureRate,
    );
  },

  getOwners() {
    return withMock(() => [...new Set(mockDb.tasks.map((task) => task.owner))], readFailureRate);
  },
};
