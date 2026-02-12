import { LogEntry, Task } from '@/types/domain';
import { seedLogs, seedTasks } from './seed';

const nowIso = () => new Date().toISOString();

class MockDb {
  tasks: Task[];

  logs: LogEntry[];

  constructor() {
    this.tasks = seedTasks();
    this.logs = seedLogs(this.tasks);
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
