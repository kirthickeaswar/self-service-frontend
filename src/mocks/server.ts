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
  TaskTypeDefinition,
  User,
  UpdateScheduleInput,
  UpdateTaskInput,
} from '@/types/domain';
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
const isDateRangeInvalid = (start: string, end: string) => new Date(end) < new Date(start);

let mockIdCounter = 100000;
const id = () => mockIdCounter++;

const byTaskFilters = (tasks: Task[], filters?: TaskFilters) => {
  if (!filters) {
    return tasks;
  }

  return tasks.filter((task) => {
    const matchesSearch =
      !filters.search ||
      `${task.name} ${task.description} ${task.createdBy} ${task.accessEmails.join(' ')}`.toLowerCase().includes(
        filters.search.toLowerCase(),
      );

    const matchesType = !filters.type || filters.type === 'ALL' || task.type === filters.type;
    const matchesStatus = !filters.status || filters.status === 'ALL' || task.status === filters.status;
    const matchesCreator = !filters.createdBy || task.createdBy === filters.createdBy;

    return matchesSearch && matchesType && matchesStatus && matchesCreator;
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
  login(email: string, password: string) {
    return withMock(() => {
      const normalized = email.trim().toLowerCase();
      const user = mockDb.users.find((item) => item.email.toLowerCase() === normalized);
      if (!user || user.password !== password) {
        throw new Error('Invalid email or password');
      }
      return { id: user.id, username: user.email, role: user.role };
    }, readFailureRate);
  },

  getUsers() {
    return withMock(() => mockDb.users.map((user) => ({ ...user })), readFailureRate);
  },

  createUser(payload: Pick<User, 'name' | 'email' | 'password' | 'role' | 'isAdmin' | 'userLevel'>) {
    return withMock(() => {
      const name = payload.name.trim();
      const email = payload.email.trim().toLowerCase();
      const password = (payload.password ?? '').trim();
      if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
      }
      if (mockDb.users.some((user) => user.email.toLowerCase() === email)) {
        throw new Error('Email already exists');
      }
      const user: User = {
        id: id(),
        name,
        email,
        password,
        role: payload.role,
        isAdmin: payload.isAdmin,
        userLevel: payload.userLevel,
      };
      mockDb.users.push(user);
      return mockDb.users.map((item) => ({ ...item }));
    }, writeFailureRate);
  },

  updateUserRole(userId: number, role: User['role']) {
    return withMock(() => {
      const user = mockDb.users.find((item) => item.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      user.role = role;
      return mockDb.users.map((item) => ({ ...item }));
    }, writeFailureRate);
  },

  deleteUser(userId: number) {
    return withMock(() => {
      const target = mockDb.users.find((item) => item.id === userId);
      if (!target) {
        throw new Error('User not found');
      }
      const remainingAdmins = mockDb.users.filter((item) => item.role === 'ADMIN' && item.id !== userId);
      if (target.role === 'ADMIN' && remainingAdmins.length === 0) {
        throw new Error('At least one admin user must remain');
      }
      mockDb.users = mockDb.users.filter((item) => item.id !== userId);
      return { success: true };
    }, writeFailureRate);
  },

  getTaskTypeNames() {
    return mockDb.taskTypes.map((taskType) => taskType.name);
  },

  getTaskTypes() {
    return withMock(() => [...mockDb.taskTypes], readFailureRate);
  },

  addTaskType(payload: TaskTypeDefinition) {
    return withMock(() => {
      const normalized = payload.name.trim().toUpperCase();
      const batchFilePath = payload.batchFilePath.trim();
      if (!normalized) {
        throw new Error('Task type is required');
      }
      if (!batchFilePath) {
        throw new Error('Batch file path is required');
      }
      if (mockDb.taskTypes.some((item) => item.name === normalized)) {
        throw new Error('Task type already exists');
      }
      mockDb.taskTypes.push({ name: normalized, batchFilePath });
      return [...mockDb.taskTypes];
    }, writeFailureRate);
  },

  updateTaskType(currentName: string, payload: TaskTypeDefinition) {
    return withMock(() => {
      const current = currentName.trim().toUpperCase();
      const nextName = payload.name.trim().toUpperCase();
      const nextBatchFilePath = payload.batchFilePath.trim();

      if (!current) {
        throw new Error('Current task type is required');
      }
      if (!nextName) {
        throw new Error('Task type is required');
      }
      if (!nextBatchFilePath) {
        throw new Error('Batch file path is required');
      }

      const existing = mockDb.taskTypes.find((item) => item.name === current);
      if (!existing) {
        throw new Error('Task type not found');
      }

      const inUse = mockDb.tasks.some((task) => task.type === current);
      if (inUse && current !== nextName) {
        throw new Error('Task type name cannot be changed while tasks are using it. Update only batch file path.');
      }

      if (current !== nextName && mockDb.taskTypes.some((item) => item.name === nextName)) {
        throw new Error('Task type already exists');
      }

      existing.name = nextName;
      existing.batchFilePath = nextBatchFilePath;

      return [...mockDb.taskTypes];
    }, writeFailureRate);
  },

  deleteTaskType(type: string) {
    return withMock(() => {
      const normalized = type.trim().toUpperCase();
      if (!mockDb.taskTypes.some((item) => item.name === normalized)) {
        throw new Error('Task type not found');
      }
      const inUse = mockDb.tasks.some((task) => task.type === normalized);
      if (inUse) {
        throw new Error('Cannot delete a type currently used by existing tasks');
      }
      mockDb.taskTypes = mockDb.taskTypes.filter((item) => item.name !== normalized);
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
      if (!this.getTaskTypeNames().includes(input.type)) {
        throw new Error('Selected task type is not available');
      }

      const schedules: Schedule[] = input.schedule
        ? [
            {
              id: id(),
              taskId,
              mode: input.schedule.mode,
              time: input.schedule.time,
              cronExpression: input.schedule.cronExpression,
              startDate: input.schedule.startDate,
              endDate: input.schedule.endDate,
              daysOfWeek: input.schedule.daysOfWeek,
              dayOfMonth: input.schedule.dayOfMonth,
              monthOfYear: input.schedule.monthOfYear,
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
        accessEmails: [...new Set(input.accessEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))],
        type: input.type,
        createdBy: input.createdBy,
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
        message: `Task ${created.name} created by ${created.createdBy}`,
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
      if (!this.getTaskTypeNames().includes(input.type)) {
        throw new Error('Selected task type is not available');
      }

      task.name = input.name;
      task.description = input.description;
      task.accessEmails = [...new Set(input.accessEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
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
      if (input.mode === 'RECURRING') {
        if (!input.startDate) {
          throw new Error('Recurring schedules require start date');
        }
        if (input.endDate && isDateRangeInvalid(input.startDate, input.endDate)) {
          throw new Error('Recurring end date must be on or after start date');
        }
        if (input.dayOfMonth && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
          throw new Error('Day of month must be between 1 and 31');
        }
        if (input.monthOfYear && (input.monthOfYear < 1 || input.monthOfYear > 12)) {
          throw new Error('Month must be between 1 and 12');
        }
      }
      if (input.mode === 'CRON') {
        if (!input.cronExpression?.trim()) {
          throw new Error('Cron schedules require cron expression');
        }
      }

      const schedule: Schedule = {
        id: id(),
        taskId,
        mode: input.mode,
        time: input.time,
        cronExpression: input.mode === 'CRON' ? input.cronExpression?.trim() : undefined,
        startDate: input.mode === 'RECURRING' ? input.startDate : undefined,
        endDate: input.mode === 'RECURRING' ? input.endDate : undefined,
        daysOfWeek: input.mode === 'RECURRING' ? input.daysOfWeek : undefined,
        dayOfMonth: input.mode === 'RECURRING' ? input.dayOfMonth : undefined,
        monthOfYear: input.mode === 'RECURRING' ? input.monthOfYear : undefined,
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
      if (input.mode === 'RECURRING') {
        if (!input.startDate) {
          throw new Error('Recurring schedules require start date');
        }
        if (input.endDate && isDateRangeInvalid(input.startDate, input.endDate)) {
          throw new Error('Recurring end date must be on or after start date');
        }
        if (input.dayOfMonth && (input.dayOfMonth < 1 || input.dayOfMonth > 31)) {
          throw new Error('Day of month must be between 1 and 31');
        }
        if (input.monthOfYear && (input.monthOfYear < 1 || input.monthOfYear > 12)) {
          throw new Error('Month must be between 1 and 12');
        }
      }
      if (input.mode === 'CRON') {
        if (!input.cronExpression?.trim()) {
          throw new Error('Cron schedules require cron expression');
        }
      }

      schedule.mode = input.mode;
      schedule.time = input.time;
      schedule.cronExpression = input.mode === 'CRON' ? input.cronExpression?.trim() : undefined;
      schedule.startDate = input.mode === 'RECURRING' ? input.startDate : undefined;
      schedule.endDate = input.mode === 'RECURRING' ? input.endDate : undefined;
      schedule.daysOfWeek = input.mode === 'RECURRING' ? input.daysOfWeek : undefined;
      schedule.dayOfMonth = input.mode === 'RECURRING' ? input.dayOfMonth : undefined;
      schedule.monthOfYear = input.mode === 'RECURRING' ? input.monthOfYear : undefined;
      schedule.endTime = input.mode === 'RECURRING' ? input.endTime : undefined;
      schedule.interval = input.mode === 'RECURRING' ? input.interval : undefined;
      schedule.frequency = input.mode === 'RECURRING' ? input.frequency : undefined;
      schedule.date = input.mode === 'NON_RECURRING' ? input.date : undefined;
      schedule.nextRunAt = calculateNextRunAt({
        mode: input.mode,
        time: input.time,
        cronExpression: input.cronExpression,
        startDate: input.startDate,
        endDate: input.endDate,
        daysOfWeek: input.daysOfWeek,
        dayOfMonth: input.dayOfMonth,
        monthOfYear: input.monthOfYear,
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

  getCreators() {
    return withMock(() => [...new Set(mockDb.tasks.map((task) => task.createdBy))], readFailureRate);
  },
};
