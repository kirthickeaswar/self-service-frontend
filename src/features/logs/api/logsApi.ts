import { apiServer } from '@/mocks/server';
import { LogEntry, LogFilters } from '@/types/domain';

export const logsApi = {
  list: (filters: LogFilters): Promise<LogEntry[]> => apiServer.getLogs(filters),
};
