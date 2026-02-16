import {
  CreateScheduleInput,
  CreateTaskInput,
  Role,
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
import { httpClient } from '@/features/api/httpClient';

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
  if (status === 'Active') return 'SCHEDULED';
  if (status === 'Paused') return 'PAUSED';
  return 'DELETED';
};

const fromScheduleStatus = (status: ScheduleStatus): BackendScheduleStatus => {
  if (status === 'PAUSED') return 'Paused';
  if (status === 'DELETED') return 'Deleted';
  return 'Active';
};

const csvToEmails = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const emailsToCsv = (emails: string[]) => emails.map((item) => item.trim().toLowerCase()).filter(Boolean).join(',');

const buildTask = (
  task: BackendTask,
  schedules: BackendSchedule[],
  typeById: Map<number, BackendTaskType>,
  userById: Map<number, BackendUser>,
): Task => {
  const taskType = typeById.get(task.taskTypeId);
  const owner = userById.get(task.ownerId);

  return {
    id: task.id,
    name: task.name,
    description: task.description,
    accessEmails: csvToEmails(task.emailList),
    type: taskType?.title ?? `TYPE-${task.taskTypeId}`,
    createdBy: owner?.email ?? owner?.name ?? `User-${task.ownerId}`,
    status: toTaskStatus(task.status),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt ?? task.createdAt,
    schedules: schedules
      .filter((item) => item.status !== 'Deleted')
      .map((schedule) => ({
        id: schedule.id,
        taskId: schedule.taskId,
        mode: 'CRON',
        time: '00:00',
        cronExpression: schedule.cronExpression,
        nextRunAt: schedule.windowStart,
        status: toScheduleStatus(schedule.status),
      })),
  };
};

const readTaskTypes = async () => httpClient.get<BackendTaskType[]>('/tasktypes');
const readUsers = async () => httpClient.get<BackendUser[]>('/users');
const createPasswordPath = import.meta.env.VITE_CREATE_PASSWORD_PATH ?? '/auth/create-password';

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

    const taskDetails = await Promise.all(
      backendTasks.map(async (task) => {
        const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${task.id}/schedules`);
        return buildTask(task, schedules, typeById, userById);
      }),
    );

    if (!filters?.createdBy) return taskDetails;
    return taskDetails.filter((item) => item.createdBy === filters.createdBy);
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
      emailList: emailsToCsv(payload.accessEmails),
    };
    if (payload.schedule?.mode === 'CRON' && payload.schedule.cronExpression) {
      body.schedule = {
        windowStart: new Date().toISOString(),
        windowEnd: null,
        cronExpression: payload.schedule.cronExpression,
      };
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
      emailList: emailsToCsv(payload.accessEmails),
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

  run: async (taskId: number): Promise<RunTaskResponse> => {
    return httpClient.post<RunTaskResponse>(`/tasks/${taskId}/run`, {});
  },

  addSchedule: async (taskId: number, payload: CreateScheduleInput): Promise<Schedule> => {
    if (!payload.cronExpression?.trim()) throw new Error('Cron expression is required');
    const createdId = await httpClient.post<number>(`/tasks/${taskId}/schedules`, {
      windowStart: new Date().toISOString(),
      windowEnd: null,
      cronExpression: payload.cronExpression.trim(),
    });
    const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`);
    const found = schedules.find((item) => item.id === createdId);
    if (!found) throw new Error('Schedule not found after create');
    return {
      id: found.id,
      taskId: found.taskId,
      mode: 'CRON',
      time: '00:00',
      cronExpression: found.cronExpression,
      nextRunAt: found.windowStart,
      status: toScheduleStatus(found.status),
    };
  },

  updateSchedule: async (taskId: number, scheduleId: number, payload: UpdateScheduleInput): Promise<Schedule> => {
    if (!payload.cronExpression?.trim()) throw new Error('Cron expression is required');
    await httpClient.put<void>(`/tasks/${taskId}/schedules/${scheduleId}`, {
      windowStart: new Date().toISOString(),
      windowEnd: null,
      cronExpression: payload.cronExpression.trim(),
    });
    const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`);
    const found = schedules.find((item) => item.id === scheduleId);
    if (!found) throw new Error('Schedule not found after update');
    return {
      id: found.id,
      taskId: found.taskId,
      mode: 'CRON',
      time: '00:00',
      cronExpression: found.cronExpression,
      nextRunAt: found.windowStart,
      status: toScheduleStatus(found.status),
    };
  },

  deleteSchedule: async (taskId: number, scheduleId: number): Promise<{ success: boolean }> => {
    await httpClient.delete<void>(`/tasks/${taskId}/schedules/${scheduleId}`);
    return { success: true };
  },

  updateScheduleStatus: async (taskId: number, scheduleId: number, status: ScheduleStatus): Promise<Schedule> => {
    await httpClient.patch<void>(`/tasks/${taskId}/schedules/${scheduleId}/status`, { status: fromScheduleStatus(status) });
    const schedules = await httpClient.get<BackendSchedule[]>(`/tasks/${taskId}/schedules`);
    const found = schedules.find((item) => item.id === scheduleId);
    if (!found) throw new Error('Schedule not found after status update');
    return {
      id: found.id,
      taskId: found.taskId,
      mode: 'CRON',
      time: '00:00',
      cronExpression: found.cronExpression,
      nextRunAt: found.windowStart,
      status: toScheduleStatus(found.status),
    };
  },

  creators: async (): Promise<string[]> => {
    const tasks = await tasksApi.list();
    return [...new Set(tasks.map((task) => task.createdBy))];
  },

  login: async (email: string, password: string): Promise<{ id: number; username: string; role: Role }> => {
    const response = await httpClient.post<{ id: number; name: string; email: string; userLevel: 0 | 1 | 2 }>('/auth/login', {
      email,
      password,
    });
    return { id: response.id, username: response.email || response.name, role: toRole(response.userLevel) };
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

  createUser: async (payload: { name: string; email: string; role: Role }): Promise<User[]> => {
    const userLevel: 0 | 1 | 2 = payload.role === 'ADMIN' ? 2 : payload.role === 'EDITOR' ? 1 : 0;
    await httpClient.post<number>('/users', {
      name: payload.name,
      email: payload.email,
      userLevel,
    });
    return tasksApi.users();
  },

  createPassword: async (email: string, password: string): Promise<void> => {
    await httpClient.post<void>(createPasswordPath, { email, password });
  },

  deleteUser: async (userId: number): Promise<{ success: boolean }> => {
    await httpClient.delete<void>(`/users/${userId}`);
    return { success: true };
  },
};
