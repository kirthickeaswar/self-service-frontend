export type TaskType = string;
export type TaskStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'NOT_SCHEDULED' | 'DELETED';

export type ScheduleMode = 'RECURRING' | 'NON_RECURRING' | 'CRON';
export type RecurringFrequency = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type ScheduleStatus = 'SCHEDULED' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'DELETED';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type LogSource = 'BATCH' | 'SYSTEM';

export interface Schedule {
  id: number;
  taskId: number;
  mode: ScheduleMode;
  time: string;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endTime?: string;
  interval?: number;
  frequency?: RecurringFrequency;
  date?: string;
  nextRunAt: string;
  status: ScheduleStatus;
}

export interface Task {
  id: number;
  name: string;
  description: string;
  accessEmails: string[];
  type: TaskType;
  createdBy: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  schedules: Schedule[];
}

export interface LogEntry {
  id: number;
  userId?: number;
  taskId: number;
  scheduleId?: number;
  timestamp: string;
  action?: string;
  body?: string;
  level?: LogLevel;
  message?: string;
  details?: string;
  source?: LogSource;
}

export type TaskHistoryStatus = 'Queued' | 'Running' | 'Success' | 'Failed' | 'Canceled' | string;

export interface TaskHistoryEntry {
  id: number;
  taskId: number;
  scheduleId?: number | null;
  status: TaskHistoryStatus;
  startedAt: string;
  finishedAt?: string | null;
  exitCode?: number | null;
  outputSnippet?: string;
  createdAt: string;
}

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  userLevel: 0 | 1 | 2;
  role: Role;
  createdAt?: string;
}

export interface TaskTypeDefinition {
  id?: number;
  name: TaskType;
  batchFilePath: string;
}

export interface TaskFilters {
  search?: string;
  type?: TaskType | 'ALL';
  status?: TaskStatus | 'ALL';
  createdBy?: string;
}

export interface LogFilters {
  taskId?: number;
  scheduleId?: number;
  level?: LogLevel | 'ALL';
  search?: string;
  from?: string;
  to?: string;
}

export interface CreateScheduleInput {
  mode: ScheduleMode;
  time: string;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endTime?: string;
  interval?: number;
  frequency?: RecurringFrequency;
  date?: string;
}

export interface CreateTaskInput {
  name: string;
  description: string;
  accessEmails: string[];
  type: TaskType;
  createdBy: string;
  schedule?: CreateScheduleInput;
}

export interface UpdateTaskInput {
  name: string;
  description: string;
  accessEmails: string[];
  type: TaskType;
}

export interface UpdateScheduleInput {
  mode: ScheduleMode;
  time: string;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endTime?: string;
  interval?: number;
  frequency?: RecurringFrequency;
  date?: string;
}
