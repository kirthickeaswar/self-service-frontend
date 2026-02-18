import {
  CreateScheduleInput,
  CreateTaskInput,
  Role,
  Schedule,
  ScheduleStatus,
  Task,
  TaskHistoryEntry,
  TaskFilters,
  TaskStatus,
  TaskTypeDefinition,
  User,
  UpdateScheduleInput,
  UpdateTaskInput,
} from '@/types/domain';
import { httpClient, isApiError } from '@/features/api/httpClient';

type BackendTaskStatus = 'Active' | 'Not Scheduled' | 'Deleted' | 'Error';
type BackendScheduleStatus = 'Active' | 'Paused' | 'Deleted';

interface BackendUser {
  id: number;
  name: string;
  email: string;
  userLevel: 0 | 1 | 2;
  createdAt?: string;
}

interface BackendTaskType {
  id: number;
  title: string;
  batchPath: string;
  createdAt?: string;
}

interface BackendTask {
  id: number;
  taskTypeId: number;
  name: string;
  description: string;
  ownerId: number;
  emailList: string;
  status: BackendTaskStatus;
  prevRun?: string | null;
  nextRun?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface BackendSchedule {
  id: number;
  taskId: number;
  windowStart: string;
  windowEnd?: string | null;
  cronExpression: string;
  status: BackendScheduleStatus;
  createdAt?: string;
}

interface RunTaskResponse {
  taskId: number;
  exitCode: number;
  outputSnippet: string;
}

interface BackendTaskHistoryEntry {
  id: number;
  taskId: number;
  scheduleId?: number | null;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  exitCode?: number | null;
  outputSnippet?: string;
  createdAt: string;
}

const toRole = (userLevel: number): Role => {
  if (userLevel === 2) return 'ADMIN';
  if (userLevel === 1) return 'EDITOR';
  return 'VIEWER';
};

const toTaskStatus = (status: BackendTaskStatus): TaskStatus => {
  if (status === 'Active') return 'ACTIVE';
  if (status === 'Error') return 'ERROR';
  if (status === 'Deleted') return 'DELETED';
  return 'NOT_SCHEDULED';
};

const fromTaskStatus = (status: TaskStatus): BackendTaskStatus => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'ERROR') return 'Error';
  if (status === 'DELETED') return 'Deleted';
  return 'Not Scheduled';
};

const toScheduleStatus = (status: BackendScheduleStatus): ScheduleStatus => {
  if (status === 'Active') return 'ACTIVE';
  if (status === 'Paused') return 'PAUSED';
  return 'DELETED';
};

const fromScheduleStatus = (status: ScheduleStatus): BackendScheduleStatus => {
  if (status === 'PAUSED') return 'Paused';
  if (status === 'DELETED') return 'Deleted';
  return 'Active';
};

const listToEmails = (value: string) =>
  value
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const emailsToList = (emails: string[]) => emails.map((item) => item.trim().toLowerCase()).filter(Boolean).join(';');

const withActorUserId = (path: string, actorUserId?: number) => {
  if (!actorUserId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}actorUserId=${actorUserId}`;
};

const KOLKATA_TIME_ZONE = 'Asia/Kolkata';
const KOLKATA_OFFSET_MINUTES = 5 * 60 + 30;

const pad2 = (value: number) => `${value}`.padStart(2, '0');

const toKolkataDateParts = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { year: '1970', month: '01', day: '01', hour: '00', minute: '00' };
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KOLKATA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
};

const toKolkataDateOnly = (value: string) => {
  const { year, month, day } = toKolkataDateParts(value);
  return `${year}-${month}-${day}`;
};

const toKolkataTime = (value: string) => {
  const { hour, minute } = toKolkataDateParts(value);
  return `${hour}:${minute}`;
};

const parseTime = (time: string) => {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw ?? '0');
  const minutes = Number(minutesRaw ?? '0');
  return {
    hours: Number.isNaN(hours) ? 0 : Math.max(0, Math.min(23, hours)),
    minutes: Number.isNaN(minutes) ? 0 : Math.max(0, Math.min(59, minutes)),
  };
};

const toKolkataIsoFromInstant = (date: Date) => {
  const shifted = new Date(date.getTime() + KOLKATA_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = pad2(shifted.getUTCMonth() + 1);
  const day = pad2(shifted.getUTCDate());
  const hour = pad2(shifted.getUTCHours());
  const minute = pad2(shifted.getUTCMinutes());
  const second = pad2(shifted.getUTCSeconds());
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
};

const combineKolkataDateTimeToIso = (dateOnly: string, time: string) => {
  const { hours, minutes } = parseTime(time);
  return `${dateOnly}T${pad2(hours)}:${pad2(minutes)}:00+05:30`;
};

const toDateOnlyFromIsoOrDate = (value: string | undefined) => {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
};

const normalizeCronExpression = (expression: string) => {
  const fields = expression
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (fields.length === 5) return fields.join(' ');
  if (fields.length === 6) return fields.slice(1).join(' ');
  return expression.trim();
};

const looksLikeSingleRunCron = (expression: string) => {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5 && parts.length !== 6) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.length === 6 ? parts.slice(1) : parts;
  const isSimple = (part: string) => !/[*?,/\-]/.test(part);
  return isSimple(minute) && isSimple(hour) && isSimple(dayOfMonth) && isSimple(month) && (dayOfWeek === '*' || dayOfWeek === '?');
};

const isNonRecurringBackendSchedule = (schedule: BackendSchedule) => {
  if (!schedule.windowEnd) return false;
  const startMs = +new Date(schedule.windowStart);
  const endMs = +new Date(schedule.windowEnd);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return false;
  const withinOneDay = endMs - startMs <= 24 * 60 * 60 * 1000;
  if (!withinOneDay) return false;
  return looksLikeSingleRunCron(schedule.cronExpression);
};

const shouldHideCompletedNonRecurringTask = (task: BackendTask, schedules: BackendSchedule[]) => {
  if (task.status !== 'Not Scheduled') return false;
  const activeOrPausedSchedules = schedules.filter((schedule) => schedule.status !== 'Deleted');
  if (activeOrPausedSchedules.length > 0) return false;
  const hadNonRecurringSchedule = schedules.some((schedule) => isNonRecurringBackendSchedule(schedule));
  if (!hadNonRecurringSchedule) return false;
  return Boolean(task.prevRun);
};

const toScheduleModel = (schedule: BackendSchedule): Schedule => {
  const mode = isNonRecurringBackendSchedule(schedule) ? 'NON_RECURRING' : 'CRON';
  const kolkataDateOnly = toKolkataDateOnly(schedule.windowStart);
  return {
    id: schedule.id,
    taskId: schedule.taskId,
    mode,
    time: toKolkataTime(schedule.windowStart),
    date: mode === 'NON_RECURRING' ? `${kolkataDateOnly}T00:00:00.000Z` : undefined,
    cronExpression: schedule.cronExpression,
    nextRunAt: schedule.windowStart,
    status: toScheduleStatus(schedule.status),
  };
};

const toBackendSchedulePayload = (payload: CreateScheduleInput | UpdateScheduleInput) => {
  if (payload.mode === 'NON_RECURRING') {
    const dateOnly = toDateOnlyFromIsoOrDate(payload.date);
    if (!dateOnly) throw new Error('Date is required for non-recurring schedule');
    if (!payload.time?.trim()) throw new Error('Time is required for non-recurring schedule');

    const { hours, minutes } = parseTime(payload.time);
    const windowStart = combineKolkataDateTimeToIso(dateOnly, payload.time);
    const startDate = new Date(windowStart);
    const windowEndDate = new Date(startDate);
    windowEndDate.setMinutes(windowEndDate.getMinutes() + 1);
    const [, monthRaw, dayRaw] = dateOnly.split('-');
    const month = Number(monthRaw ?? '1');
    const day = Number(dayRaw ?? '1');

    const cronExpression = `${minutes} ${hours} ${Number.isNaN(day) ? 1 : day} ${Number.isNaN(month) ? 1 : month} *`;
    return {
      windowStart,
      windowEnd: toKolkataIsoFromInstant(windowEndDate),
      cronExpression,
    };
  }

  if (!payload.cronExpression?.trim()) {
    throw new Error('Cron expression is required');
  }

  return {
    windowStart: toKolkataIsoFromInstant(new Date()),
    windowEnd: null,
    cronExpression: normalizeCronExpression(payload.cronExpression),
  };
};

const buildTask = (
  task: BackendTask,
  schedules: BackendSchedule[],
  typeById: Map<number, BackendTaskType>,
  userById: Map<number, BackendUser>,
): Task => {
  const taskType = typeById.get(task.taskTypeId);
  const owner = userById.get(task.ownerId);
  const mappedSchedules = schedules
    .filter((item) => item.status !== 'Deleted')
    .map((schedule) => toScheduleModel(schedule));
  const backendStatus = toTaskStatus(task.status);

  const derivedStatus: TaskStatus = (() => {
    if (backendStatus === 'ERROR' || backendStatus === 'DELETED') return backendStatus;
    if (mappedSchedules.length === 0) return 'NOT_SCHEDULED';
    if (mappedSchedules.some((schedule) => schedule.status === 'ACTIVE')) return 'ACTIVE';
    return backendStatus;
  })();

  return {
    id: task.id,
    name: task.name,
    description: task.description,
    accessEmails: listToEmails(task.emailList),
    type: taskType?.title ?? `TYPE-${task.taskTypeId}`,
    createdBy: owner?.email ?? owner?.name ?? `User-${task.ownerId}`,
    status: derivedStatus,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt ?? task.createdAt,
    schedules: mappedSchedules,
  };
};

const readTaskTypes = async () => httpClient.get<BackendTaskType[]>('/tasktypes');
const readUsers = async () => httpClient.get<BackendUser[]>('/users');
const setPasswordInitialPath =
  import.meta.env.VITE_SET_PASSWORD_INITIAL_PATH ?? import.meta.env.VITE_CREATE_PASSWORD_PATH ?? '/auth/set-password-initial';
const changePasswordPath = import.meta.env.VITE_CHANGE_PASSWORD_PATH ?? '/auth/change-password';

const resolveTaskTypeId = async (title: string) => {
  const types = await readTaskTypes();
  const match = types.find((item) => item.title === title);
  if (!match) throw new Error(`Task type "${title}" not found in backend`);
  return match.id;
};

const resolveOwnerId = async (createdBy: string) => {
  const users = await readUsers();
  const normalized = createdBy.trim().toLowerCase();
  const byEmail = users.find((item) => item.email.trim().toLowerCase() === normalized);
  if (byEmail) return byEmail.id;
  const byName = users.find((item) => item.name.trim().toLowerCase() === normalized);
  if (byName) return byName.id;
  throw new Error(`Unable to resolve owner from "${createdBy}". Use an existing user's email.`);
};

export const tasksApi = {
  taskTypes: async (): Promise<TaskTypeDefinition[]> => {
    const types = await readTaskTypes();
    return types.map((item) => ({ id: item.id, name: item.title, batchFilePath: item.batchPath }));
  },

  addTaskType: async (payload: TaskTypeDefinition): Promise<TaskTypeDefinition[]> => {
    await httpClient.post<number>('/tasktypes', { title: payload.name, batchPath: payload.batchFilePath });
    return tasksApi.taskTypes();
  },

  updateTaskType: async (currentName: string, payload: TaskTypeDefinition): Promise<TaskTypeDefinition[]> => {
    const types = await readTaskTypes();
    const existing = types.find((item) => item.title === currentName);
    if (!existing) throw new Error('Task type not found');
    if (existing.batchPath !== payload.batchFilePath) {
      await httpClient.patch<void>(`/tasktypes/${existing.id}/batchpath`, { batchPath: payload.batchFilePath });
    }
    if (existing.title !== payload.name) {
      await httpClient.patch<void>(`/tasktypes/${existing.id}/title`, { title: payload.name });
    }
    return tasksApi.taskTypes();
  },

  deleteTaskType: async (type: string): Promise<TaskTypeDefinition[]> => {
    const types = await readTaskTypes();
    const existing = types.find((item) => item.title === type);
    if (!existing) throw new Error('Task type not found');
    await httpClient.delete<void>(`/tasktypes/${existing.id}`);
    return tasksApi.taskTypes();
  },

  list: async (filters?: TaskFilters): Promise<Task[]> => {
    const [types, users] = await Promise.all([readTaskTypes(), readUsers()]);
    const typeById = new Map(types.map((item) => [item.id, item]));
    const userById = new Map(users.map((item) => [item.id, item]));

    let backendTasks: BackendTask[] = [];
    const hasFilter = Boolean(filters?.search || (filters?.type && filters.type !== 'ALL') || (filters?.status && filters.status !== 'ALL'));
    if (hasFilter) {
      const params = new URLSearchParams();
      if (filters?.search) params.set('q', filters.search);
      if (filters?.type && filters.type !== 'ALL') {
        const typeId = await resolveTaskTypeId(filters.type);
        params.set('typeId', String(typeId));
      }
      if (filters?.status && filters.status !== 'ALL') params.set('status', fromTaskStatus(filters.status));
      backendTasks = await httpClient.get<BackendTask[]>(`/tasks/search?${params.toString()}`);
    } else {
      backendTasks = await httpClient.get<BackendTask[]>('/tasks');
    }

    const filteredBackendTasks = backendTasks.filter((task) => task.status !== 'Deleted');

    const taskDetails = await Promise.all(
      filteredBackendTasks.map(async (task) => {
        const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${task.id}/schedules`);
        return {
          task: buildTask(task, schedules, typeById, userById),
          hideFromList: shouldHideCompletedNonRecurringTask(task, schedules),
        };
      }),
    );

    const visibleTasks = taskDetails.filter((item) => !item.hideFromList).map((item) => item.task);

    if (!filters?.createdBy) return visibleTasks;
    return visibleTasks.filter((item) => item.createdBy === filters.createdBy);
  },

  getById: async (taskId: number): Promise<Task> => {
    const [task, types, users, schedules] = await Promise.all([
      httpClient.get<BackendTask>(`/tasks/${taskId}`),
      readTaskTypes(),
      readUsers(),
      httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`),
    ]);
    return buildTask(task, schedules, new Map(types.map((item) => [item.id, item])), new Map(users.map((item) => [item.id, item])));
  },

  create: async (payload: CreateTaskInput): Promise<Task> => {
    const [taskTypeId, ownerId] = await Promise.all([resolveTaskTypeId(payload.type), resolveOwnerId(payload.createdBy)]);
    const body: {
      name: string;
      description: string;
      taskTypeId: number;
      ownerId: number;
      emailList: string;
      schedule?: { windowStart: string; windowEnd: string | null; cronExpression: string };
    } = {
      name: payload.name,
      description: payload.description,
      taskTypeId,
      ownerId,
      emailList: emailsToList(payload.accessEmails),
    };
    if (payload.schedule) {
      body.schedule = toBackendSchedulePayload(payload.schedule);
    }
    const id = await httpClient.post<number>('/tasks', body);
    return tasksApi.getById(id);
  },

  update: async (taskId: number, payload: UpdateTaskInput): Promise<Task> => {
    const taskTypeId = await resolveTaskTypeId(payload.type);
    await httpClient.put<void>(`/tasks/${taskId}`, {
      name: payload.name,
      description: payload.description,
      taskTypeId,
      emailList: emailsToList(payload.accessEmails),
    });
    return tasksApi.getById(taskId);
  },

  remove: async (taskId: number): Promise<{ success: boolean }> => {
    await httpClient.delete<void>(`/tasks/${taskId}`);
    return { success: true };
  },

  updateStatus: async (taskId: number, status: TaskStatus): Promise<Task> => {
    await httpClient.patch<void>(`/tasks/${taskId}/status`, { status: fromTaskStatus(status) });
    return tasksApi.getById(taskId);
  },

  run: async (taskId: number, actorUserId?: number): Promise<RunTaskResponse> => {
    return httpClient.post<RunTaskResponse>(withActorUserId(`/tasks/${taskId}/run`, actorUserId), {});
  },

  addSchedule: async (taskId: number, payload: CreateScheduleInput, actorUserId?: number): Promise<Schedule> => {
    const createdId = await httpClient.post<number>(withActorUserId(`/tasks/${taskId}/schedules`, actorUserId), toBackendSchedulePayload(payload));
    const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`);
    const found = schedules.find((item) => item.id === createdId);
    if (!found) throw new Error('Schedule not found after create');
    return toScheduleModel(found);
  },

  updateSchedule: async (
    taskId: number,
    scheduleId: number,
    payload: UpdateScheduleInput,
    actorUserId?: number,
  ): Promise<Schedule> => {
    await httpClient.put<void>(withActorUserId(`/tasks/${taskId}/schedules/${scheduleId}`, actorUserId), toBackendSchedulePayload(payload));
    const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`);
    const found = schedules.find((item) => item.id === scheduleId);
    if (!found) throw new Error('Schedule not found after update');
    return toScheduleModel(found);
  },

  deleteSchedule: async (taskId: number, scheduleId: number, actorUserId?: number): Promise<{ success: boolean }> => {
    await httpClient.delete<void>(withActorUserId(`/tasks/${taskId}/schedules/${scheduleId}`, actorUserId));
    return { success: true };
  },

  updateScheduleStatus: async (
    taskId: number,
    scheduleId: number,
    status: ScheduleStatus,
    actorUserId?: number,
  ): Promise<Schedule> => {
    await httpClient.patch<void>(withActorUserId(`/tasks/${taskId}/schedules/${scheduleId}/status`, actorUserId), {
      status: fromScheduleStatus(status),
    });
    const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`);
    const found = schedules.find((item) => item.id === scheduleId);
    if (!found) throw new Error('Schedule not found after status update');
    return toScheduleModel(found);
  },

  creators: async (): Promise<string[]> => {
    const tasks = await tasksApi.list();
    return [...new Set(tasks.map((task) => task.createdBy))];
  },

  login: async (email: string, password: string): Promise<{ id: number; username: string; role: Role; userLevel: 0 | 1 | 2 }> => {
    const response = await httpClient.post<{ id: number; name: string; email: string; userLevel: 0 | 1 | 2 }>('/auth/login', {
      email,
      password,
    });
    return { id: response.id, username: response.email || response.name, role: toRole(response.userLevel), userLevel: response.userLevel };
  },

  probeLogin: async (email: string): Promise<'ENTER_PASSWORD' | 'SET_PASSWORD' | 'USER_NOT_FOUND'> => {
    const probePassword = `__probe__${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    try {
      await tasksApi.login(email, probePassword);
      return 'ENTER_PASSWORD';
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 403 && error.data?.requiresPasswordSetup) {
          return 'SET_PASSWORD';
        }
        const errorDetails = `${error.message} ${error.data?.detail ?? ''} ${error.data?.title ?? ''}`.toLowerCase();
        const userNotFound =
          errorDetails.includes('email not found') ||
          errorDetails.includes('user not found') ||
          errorDetails.includes('does not exist') ||
          errorDetails.includes('not found');
        if (error.status === 404 || (error.status === 401 && userNotFound)) {
          return 'USER_NOT_FOUND';
        }
        if (error.status === 401) {
          return 'ENTER_PASSWORD';
        }
      }
      throw error;
    }
  },

  users: async (): Promise<User[]> => {
    const users = await readUsers();
    return users.map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      userLevel: item.userLevel,
      role: toRole(item.userLevel),
      createdAt: item.createdAt,
    }));
  },

  userExistsByEmail: async (email: string): Promise<boolean> => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return false;
    const users = await readUsers();
    return users.some((item) => item.email.trim().toLowerCase() === normalized);
  },

  createUser: async (payload: { name: string; email: string; role: Role }): Promise<User[]> => {
    const userLevel: 0 | 1 | 2 = payload.role === 'ADMIN' ? 2 : payload.role === 'EDITOR' ? 1 : 0;
    await httpClient.post<number>('/users', {
      name: payload.name,
      email: payload.email,
      userLevel,
    });
    return tasksApi.users();
  },

  setPasswordInitial: async (email: string, password: string): Promise<void> => {
    await httpClient.post<void>(setPasswordInitialPath, { email, password });
  },

  changePassword: async (email: string, currentPassword: string, newPassword: string): Promise<void> => {
    await httpClient.post<void>(changePasswordPath, { email, currentPassword, newPassword });
  },

  history: async (taskId: number): Promise<TaskHistoryEntry[]> => {
    const items = await httpClient.get<BackendTaskHistoryEntry[]>(`/tasks/${taskId}/history`);
    return items.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
  },

  deleteUser: async (userId: number, actorUserId?: number): Promise<{ success: boolean }> => {
    await httpClient.delete<void>(withActorUserId(`/users/${userId}`, actorUserId));
    return { success: true };
  },
};
