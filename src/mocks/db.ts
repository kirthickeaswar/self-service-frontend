import { LogEntry, Task, TaskTypeDefinition, User } from '@/types/domain';
import { seedLogs, seedTasks } from './seed';

const nowIso = () => new Date().toISOString();

class MockDb {
  tasks: Task[];

  logs: LogEntry[];
  taskTypes: TaskTypeDefinition[];
  users: User[];

  constructor() {
    this.tasks = seedTasks();
    this.logs = seedLogs(this.tasks);
    this.taskTypes = [
      { name: 'T1', batchFilePath: '/batch/t1.bat' },
      { name: 'T2', batchFilePath: '/batch/t2.bat' },
      { name: 'T3', batchFilePath: '/batch/t3.bat' },
      { name: 'T4', batchFilePath: '/batch/t4.bat' },
    ];
    this.users = [
      { id: 1, username: 'admin', password: 'admin123', role: 'ADMIN' },
      { id: 2, username: 'editor', password: 'editor123', role: 'EDITOR' },
      { id: 3, username: 'viewer', password: 'viewer123', role: 'VIEWER' },
      { id: 4, username: 'alice', password: 'alice123', role: 'EDITOR' },
    ];
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
