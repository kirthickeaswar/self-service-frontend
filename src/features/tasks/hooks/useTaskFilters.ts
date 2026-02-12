import { useMemo, useState } from 'react';
import { TaskStatus, TaskType } from '@/types/domain';

export const useTaskFilters = () => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TaskType | 'ALL'>('ALL');
  const [status, setStatus] = useState<TaskStatus | 'ALL'>('ALL');

  const filters = useMemo(
    () => ({
      search,
      type,
      status,
    }),
    [search, type, status],
  );

  return {
    search,
    setSearch,
    type,
    setType,
    status,
    setStatus,
    filters,
  };
};
