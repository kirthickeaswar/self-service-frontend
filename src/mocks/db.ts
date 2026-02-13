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
      { id: 1, name: 'Admin', email: 'admin@example.com', password: 'admin123', isAdmin: true, userLevel: 1, role: 'ADMIN' },
      { id: 2, name: 'Editor', email: 'editor@example.com', password: 'editor123', isAdmin: false, userLevel: 1, role: 'EDITOR' },
      { id: 3, name: 'Viewer', email: 'viewer@example.com', password: 'viewer123', isAdmin: false, userLevel: 0, role: 'VIEWER' },
      { id: 4, name: 'Alice', email: 'alice@example.com', password: 'alice123', isAdmin: false, userLevel: 1, role: 'EDITOR' },
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
