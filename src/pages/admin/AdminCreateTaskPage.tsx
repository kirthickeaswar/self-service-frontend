import { Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useSnackbar } from '@/app/SnackbarContext';
import { useAuth } from '@/app/AuthContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { CreateTaskInput } from '@/types/domain';

export const AdminCreateTaskPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useSnackbar();

  const submit = async (payload: CreateTaskInput) => {
    const created = await tasksApi.create(payload);
    showToast('Admin task created successfully', 'success');
    navigate(`/admin/tasks/${created.id}`);
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Create Task (Admin)" subtitle="Create tasks with full admin control." />
      <TaskForm createdBy={user?.username ?? 'admin'} onSubmit={submit} />
    </Stack>
  );
};
