import { httpClient } from '@/features/api/httpClient';
import { LogEntry, LogFilters } from '@/types/domain';

interface BackendLog {
  id: number;
  userId: number;
  taskId: number;
  timestamp: string;
  action: string;
  body: string;
}

const toLogEntry = (item: BackendLog): LogEntry => ({
  id: item.id,
  userId: item.userId,
  taskId: item.taskId,
  timestamp: item.timestamp,
  action: item.action,
  body: item.body,
});

export const logsApi = {
  list: async (filters: LogFilters): Promise<LogEntry[]> => {
    let logs: BackendLog[] = [];
    if (filters.taskId || filters.from || filters.to) {
      const params = new URLSearchParams();
      if (filters.taskId) params.set('taskId', String(filters.taskId));
      if (filters.from) params.set('startTimestamp', filters.from);
      if (filters.to) params.set('endTimestamp', filters.to);
      logs = await httpClient.get<BackendLog[]>(`/logs?${params.toString()}`);
    } else {
      logs = await httpClient.get<BackendLog[]>('/logs/all');
    }

    return logs
      .map(toLogEntry)
      .filter(
        (item) =>
          !filters.search || `${item.action ?? item.message ?? ''} ${item.body ?? item.details ?? ''}`.toLowerCase().includes(filters.search.toLowerCase()),
      )
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  },
};
