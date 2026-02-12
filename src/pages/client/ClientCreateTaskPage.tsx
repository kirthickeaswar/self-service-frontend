import { Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useSnackbar } from '@/app/SnackbarContext';
import { useAuth } from '@/app/AuthContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { CreateTaskInput } from '@/types/domain';

export const ClientCreateTaskPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useSnackbar();

  if (!user || user.role === 'VIEWER') {
    return (
      <Stack spacing={3}>
        <PageHeader title="Create Task" subtitle="Only editor users can create tasks." />
      </Stack>
    );
  }

  const submit = async (payload: CreateTaskInput) => {
    const created = await tasksApi.create(payload);
    showToast('Task created successfully', 'success');
    navigate(`/app/tasks/${created.id}`);
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Create Task" subtitle="Set up a new scheduled task." />
      <TaskForm createdBy={user.username} onSubmit={submit} />
    </Stack>
  );
};
