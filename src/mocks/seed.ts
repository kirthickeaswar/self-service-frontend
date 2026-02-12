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
const taskStatuses: TaskStatus[] = ['ACTIVE', 'PAUSED', 'ERROR'];
const scheduleStatuses: ScheduleStatus[] = ['SCHEDULED', 'PAUSED', 'COMPLETED', 'FAILED'];
const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR'];

let idCounter = 1;

const makeId = () => idCounter++;

const createSchedule = (taskId: number, index: number): Schedule => {
  const recurring = index % 2 === 0;
  const mode = recurring ? 'RECURRING' : 'NON_RECURRING';
  const rawDate = recurring ? undefined : new Date(Date.now() + (index + 2) * 86400000);
  const date = rawDate ? toIsoDateStart(rawDate.toISOString().slice(0, 10)) : undefined;
  const time = `${String((8 + index * 2) % 24).padStart(2, '0')}:${index % 2 === 0 ? '30' : '00'}`;
  const endTime = recurring ? `${String((10 + index * 2) % 24).padStart(2, '0')}:${index % 2 === 0 ? '30' : '00'}` : undefined;
  const frequency = recurring ? (['DAILY', 'WEEKLY', 'MONTHLY'][index % 3] as CreateScheduleInput['frequency']) : undefined;

  return {
    id: makeId(),
    taskId,
    mode,
    time,
    endTime,
    frequency,
    date,
    nextRunAt: calculateNextRunAt({ mode, time, endTime, frequency, date }),
    status: scheduleStatuses[index % scheduleStatuses.length],
  };
};

export const seedTasks = (): Task[] => {
  const tasks: Task[] = [];
  const parsedCount = Number(import.meta.env.VITE_SEED_TASK_COUNT ?? 0);
  const totalTasks = Number.isNaN(parsedCount) ? 0 : Math.max(0, parsedCount);

  for (let i = 0; i < totalTasks; i += 1) {
    const taskId = makeId();
    const createdAt = new Date(Date.now() - (i + 2) * 86400000).toISOString();
    const updatedAt = new Date(Date.now() - i * 3600000).toISOString();

    const scheduleCount = (i % 4) + 1;
    const schedules = Array.from({ length: scheduleCount }, (_, idx) => createSchedule(taskId, idx + i));

    tasks.push({
      id: taskId,
      name: `Spectrum Pipeline ${i + 1}`,
      description: `Automated workflow ${i + 1} for client-side schedule execution and monitoring.`,
      accessEmails: [owners[i % owners.length]],
      type: taskTypes[i % taskTypes.length],
      owner: owners[i % owners.length],
      status: taskStatuses[i % taskStatuses.length],
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
