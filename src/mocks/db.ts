import { LogEntry, Task } from '@/types/domain';
import { seedLogs, seedTasks } from './seed';

const nowIso = () => new Date().toISOString();

class MockDb {
  tasks: Task[];

  logs: LogEntry[];
  taskTypes: string[];

  constructor() {
    this.tasks = seedTasks();
    this.logs = seedLogs(this.tasks);
    this.taskTypes = ['T1', 'T2', 'T3', 'T4'];
  }

  touchTask(taskId: number) {
    this.tasks = this.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            updatedAt: nowIso(),
          }
        : task,
    );
  }
}

export const mockDb = new MockDb();
