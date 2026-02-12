import { useEffect, useState } from 'react';
import { tasksApi } from '@/features/tasks/api/tasksApi';

export const useTaskTypes = () => {
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [loadingTaskTypes, setLoadingTaskTypes] = useState(true);
  const [taskTypesError, setTaskTypesError] = useState<string | null>(null);

  const loadTaskTypes = async () => {
    setLoadingTaskTypes(true);
    setTaskTypesError(null);
    try {
      const types = await tasksApi.taskTypes();
      setTaskTypes(types);
    } catch (err) {
      setTaskTypesError(err instanceof Error ? err.message : 'Unable to load task types');
    } finally {
      setLoadingTaskTypes(false);
    }
  };

  useEffect(() => {
    void loadTaskTypes();
  }, []);

  return {
    taskTypes,
    loadingTaskTypes,
    taskTypesError,
    reloadTaskTypes: loadTaskTypes,
  };
};
