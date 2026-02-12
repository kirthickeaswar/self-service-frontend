import { Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useSnackbar } from '@/app/SnackbarContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { CreateTaskInput } from '@/types/domain';

const clientOwner = 'alice@mock.com';

export const ClientCreateTaskPage = () => {
  const navigate = useNavigate();
  const { showToast } = useSnackbar();

  const submit = async (payload: CreateTaskInput) => {
    const created = await tasksApi.create(payload);
    showToast('Task created successfully', 'success');
    navigate(`/client/tasks/${created.id}`);
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Create Task" subtitle="Set up a new scheduled task." />
      <TaskForm owner={clientOwner} onSubmit={submit} />
    </Stack>
  );
};
