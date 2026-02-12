import { useEffect, useState } from 'react';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { TaskTypeDefinition } from '@/types/domain';

export const useTaskTypes = () => {
  const [taskTypeDefinitions, setTaskTypeDefinitions] = useState<TaskTypeDefinition[]>([]);
  const [loadingTaskTypes, setLoadingTaskTypes] = useState(true);
  const [taskTypesError, setTaskTypesError] = useState<string | null>(null);

  const loadTaskTypes = async () => {
    setLoadingTaskTypes(true);
    setTaskTypesError(null);
    try {
      const types = await tasksApi.taskTypes();
      setTaskTypeDefinitions(types);
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
    taskTypes: taskTypeDefinitions.map((item) => item.name),
    taskTypeDefinitions,
    loadingTaskTypes,
    taskTypesError,
    reloadTaskTypes: loadTaskTypes,
  };
};
