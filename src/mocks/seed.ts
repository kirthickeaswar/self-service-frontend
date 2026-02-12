import {
  CreateScheduleInput,
  LogEntry,
  LogLevel,
  Schedule,
  ScheduleStatus,
  Task,
  TaskStatus,
  TaskType,
} from '@/types/domain';
import { calculateNextRunAt, toIsoDateStart } from '@/features/tasks/utils/schedule';

const owners = ['alice@mock.com'];
const taskTypes: TaskType[] = ['T1', 'T2', 'T3', 'T4'];
const scheduleStatuses: ScheduleStatus[] = ['SCHEDULED', 'PAUSED', 'COMPLETED', 'FAILED'];
const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR'];

let idCounter = 1;

const makeId = () => idCounter++;

const createSchedule = (taskId: number, index: number): Schedule => {
  const recurring = index % 2 === 0;
  const mode = recurring ? 'CRON' : 'NON_RECURRING';
  const rawDate = recurring ? undefined : new Date(Date.now() + (index + 2) * 86400000);
  const date = rawDate ? toIsoDateStart(rawDate.toISOString().slice(0, 10)) : undefined;
  const time = `${String((8 + index * 2) % 24).padStart(2, '0')}:${index % 2 === 0 ? '30' : '00'}`;
  const cronExpression = recurring ? `${index % 2 === 0 ? '0' : '30'} ${8 + (index % 4) * 2}-18 * * 1-5` : undefined;

  return {
    id: makeId(),
    taskId,
    mode,
    time,
    cronExpression,
    date,
    nextRunAt: calculateNextRunAt({ mode, time, cronExpression, date }),
    status: scheduleStatuses[index % scheduleStatuses.length],
  };
};

export const seedTasks = (): Task[] => {
  const tasks: Task[] = [];
  const parsedCount = Number(import.meta.env.VITE_SEED_TASK_COUNT ?? 4);
  const totalTasks = Number.isNaN(parsedCount) ? 4 : Math.max(0, parsedCount);

  if (totalTasks === 0) {
    return tasks;
  }

  const owner = owners[0];
  const now = Date.now();

  const recurringTaskId = makeId();
  const recurringScheduleId = makeId();
  const recurringSchedule: Schedule = {
    id: recurringScheduleId,
    taskId: recurringTaskId,
    mode: 'CRON',
    time: '00:00',
    cronExpression: '0 9-18 * * 1-5',
    nextRunAt: calculateNextRunAt({
      mode: 'CRON',
      time: '00:00',
      cronExpression: '0 9-18 * * 1-5',
    }),
    status: 'SCHEDULED',
  };

  const nonRecurringTaskId = makeId();
  const nonRecurringScheduleId = makeId();
  const nonRecurringDate = new Date(now + 86400000).toISOString();
  const nonRecurringSchedule: Schedule = {
    id: nonRecurringScheduleId,
    taskId: nonRecurringTaskId,
    mode: 'NON_RECURRING',
    time: '14:30',
    date: nonRecurringDate,
    nextRunAt: calculateNextRunAt({
      mode: 'NON_RECURRING',
      time: '14:30',
      date: nonRecurringDate,
    }),
    status: 'SCHEDULED',
  };

  const notScheduledTaskId = makeId();

  const errorTaskId = makeId();
  const errorScheduleId = makeId();
  const errorDate = new Date(now - 2 * 3600000).toISOString();
  const errorSchedule: Schedule = {
    id: errorScheduleId,
    taskId: errorTaskId,
    mode: 'NON_RECURRING',
    time: '08:00',
    date: errorDate,
    nextRunAt: calculateNextRunAt({
      mode: 'NON_RECURRING',
      time: '08:00',
      date: errorDate,
    }),
    status: 'FAILED',
  };

  const presets: Task[] = [
    {
      id: recurringTaskId,
      name: 'Recurring Task',
      description: 'Recurring hourly task from 9:00 AM to 6:00 PM.',
      accessEmails: ['ops@mock.com'],
      type: taskTypes[0],
      owner,
      status: 'ACTIVE',
      createdAt: new Date(now - 4 * 86400000).toISOString(),
      updatedAt: new Date(now - 1 * 3600000).toISOString(),
      schedules: [recurringSchedule],
    },
    {
      id: nonRecurringTaskId,
      name: 'Non-Recurring Task',
      description: 'One-time scheduled task for tomorrow.',
      accessEmails: ['batch-team@mock.com'],
      type: taskTypes[1],
      owner,
      status: 'ACTIVE',
      createdAt: new Date(now - 3 * 86400000).toISOString(),
      updatedAt: new Date(now - 2 * 3600000).toISOString(),
      schedules: [nonRecurringSchedule],
    },
    {
      id: notScheduledTaskId,
      name: 'Not Scheduled Task',
      description: 'Task created without schedules.',
      accessEmails: [],
      type: taskTypes[2],
      owner,
      status: 'NOT_SCHEDULED',
      createdAt: new Date(now - 2 * 86400000).toISOString(),
      updatedAt: new Date(now - 3 * 3600000).toISOString(),
      schedules: [],
    },
    {
      id: errorTaskId,
      name: 'Error Task',
      description: 'Task with failed execution requiring troubleshooting.',
      accessEmails: ['support@mock.com'],
      type: taskTypes[3],
      owner,
      status: 'ERROR',
      createdAt: new Date(now - 1 * 86400000).toISOString(),
      updatedAt: new Date(now - 30 * 60000).toISOString(),
      schedules: [errorSchedule],
    },
  ];

  for (let i = 0; i < totalTasks; i += 1) {
    if (i < presets.length) {
      tasks.push(presets[i]);
      continue;
    }
    const taskId = makeId();
    const createdAt = new Date(now - (i + 1) * 86400000).toISOString();
    const updatedAt = new Date(now - i * 3600000).toISOString();
    const schedules = Array.from({ length: (i % 3) + 1 }, (_, idx) => createSchedule(taskId, idx + i));
    tasks.push({
      id: taskId,
      name: `Spectrum Pipeline ${i + 1}`,
      description: `Automated workflow ${i + 1} for client-side schedule execution and monitoring.`,
      accessEmails: [],
      type: taskTypes[i % taskTypes.length],
      owner,
      status: i % 3 === 0 ? 'ACTIVE' : i % 3 === 1 ? 'PAUSED' : 'ERROR',
      createdAt,
      updatedAt,
      schedules,
    });
  }

  return tasks;
};

export const seedLogs = (tasks: Task[]): LogEntry[] => {
  const logs: LogEntry[] = [];

  tasks.forEach((task, taskIndex) => {
    const taskLevel = levels[taskIndex % levels.length];
    logs.push({
      id: makeId(),
      taskId: task.id,
      timestamp: new Date(Date.now() - taskIndex * 600000).toISOString(),
      level: taskLevel,
      message: `${task.name} heartbeat received`,
      details: 'Scheduler confirmed task registration and queue health.',
      source: 'SYSTEM',
    });

    task.schedules.forEach((schedule, idx) => {
      logs.push({
        id: makeId(),
        taskId: task.id,
        scheduleId: schedule.id,
        timestamp: new Date(Date.now() - (taskIndex * 4 + idx) * 300000).toISOString(),
        level: levels[(taskIndex + idx) % levels.length],
        message:
          schedule.status === 'FAILED'
            ? 'Execution failed due to timeout while acquiring dependency.'
            : `Schedule ${schedule.id} executed in sandbox worker`,
        details:
          schedule.status === 'FAILED'
            ? 'Timeout after 45s. Retry policy exhausted. Please inspect downstream service latency.'
            : 'Execution completed with normal resource usage.',
        source: idx % 2 === 0 ? 'BATCH' : 'SYSTEM',
      });
    });
  });

  return logs;
};
