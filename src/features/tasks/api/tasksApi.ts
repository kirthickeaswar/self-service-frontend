import {
  CreateScheduleInput,
  CreateTaskInput,
  Schedule,
  ScheduleStatus,
  Task,
  TaskFilters,
  TaskStatus,
  TaskTypeDefinition,
  UpdateScheduleInput,
  UpdateTaskInput,
} from '@/types/domain';
import { apiServer } from '@/mocks/server';

export const tasksApi = {
  taskTypes: (): Promise<TaskTypeDefinition[]> => apiServer.getTaskTypes(),
  addTaskType: (payload: TaskTypeDefinition): Promise<TaskTypeDefinition[]> => apiServer.addTaskType(payload),
  updateTaskType: (currentName: string, payload: TaskTypeDefinition): Promise<TaskTypeDefinition[]> =>
    apiServer.updateTaskType(currentName, payload),
  deleteTaskType: (type: string): Promise<TaskTypeDefinition[]> => apiServer.deleteTaskType(type),
  list: (filters?: TaskFilters): Promise<Task[]> => apiServer.getTasks(filters),
  getById: (taskId: number): Promise<Task> => apiServer.getTask(taskId),
  create: (payload: CreateTaskInput): Promise<Task> => apiServer.createTask(payload),
  update: (taskId: number, payload: UpdateTaskInput): Promise<Task> => apiServer.updateTask(taskId, payload),
  remove: (taskId: number): Promise<{ success: boolean }> => apiServer.deleteTask(taskId),
  updateStatus: (taskId: number, status: TaskStatus): Promise<Task> => apiServer.updateTaskStatus(taskId, status),
  addSchedule: (taskId: number, payload: CreateScheduleInput): Promise<Schedule> => apiServer.createSchedule(taskId, payload),
  updateSchedule: (taskId: number, scheduleId: number, payload: UpdateScheduleInput): Promise<Schedule> =>
    apiServer.updateSchedule(taskId, scheduleId, payload),
  deleteSchedule: (taskId: number, scheduleId: number): Promise<{ success: boolean }> =>
    apiServer.deleteSchedule(taskId, scheduleId),
  updateScheduleStatus: (taskId: number, scheduleId: number, status: ScheduleStatus): Promise<Schedule> =>
    apiServer.updateScheduleStatus(taskId, scheduleId, status),
  owners: (): Promise<string[]> => apiServer.getOwners(),
};
