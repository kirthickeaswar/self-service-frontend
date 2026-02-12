export type TaskType = string;
export type TaskStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'NOT_SCHEDULED';

export type ScheduleMode = 'RECURRING' | 'NON_RECURRING';
export type RecurringFrequency = 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type ScheduleStatus = 'SCHEDULED' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type LogSource = 'BATCH' | 'SYSTEM';

export interface Schedule {
  id: number;
  taskId: number;
  mode: ScheduleMode;
  time: string;
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
  owner: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  schedules: Schedule[];
}

export interface LogEntry {
  id: number;
  taskId: number;
  scheduleId?: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
  source: LogSource;
}

export type Role = 'CLIENT' | 'ADMIN';

export interface TaskFilters {
  search?: string;
  type?: TaskType | 'ALL';
  status?: TaskStatus | 'ALL';
  owner?: string;
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
  owner: string;
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
  endTime?: string;
  interval?: number;
  frequency?: RecurringFrequency;
  date?: string;
}
