import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Button, Card, CardContent, Skeleton, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { useSnackbar } from '@/app/SnackbarContext';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task } from '@/types/domain';

export const TroubleshootPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useSnackbar();
  const isAdminView = location.pathname.startsWith('/admin');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskData = await tasksApi.list({ status: 'ERROR' });
      setTasks(taskData.filter((task) => task.status === 'ERROR'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load error tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const retryTask = async (task: Task) => {
    setRetryingTaskId(task.id);
    try {
      const result = await tasksApi.run(task.id, user?.id);
      showToast(`Task retried (exit code ${result.exitCode})`, result.exitCode === 0 ? 'success' : 'warning');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Retry failed', 'error');
    } finally {
      setRetryingTaskId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Troubleshoot"
        subtitle="Only tasks in error state are shown here."
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <Card>
          <CardContent>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks in error state" subtitle="Everything looks healthy right now." />
      ) : (
        <DataTable
          rows={tasks}
          rowKey={(task) => task.id}
          columns={[
            {
              id: 'name',
              label: 'Task',
              render: (task: Task) => task.name,
            },
            {
              id: 'type',
              label: 'Type',
              render: (task: Task) => task.type,
            },
            {
              id: 'createdBy',
              label: 'Created By',
              render: (task: Task) => task.createdBy,
            },
            {
              id: 'status',
              label: 'Status',
              render: (task: Task) => <StatusChip status={task.status} />,
            },
            {
              id: 'createdAt',
              label: 'Created At',
              render: (task: Task) => new Date(task.createdAt).toLocaleString(),
            },
            {
              id: 'actions',
              label: 'Actions',
              render: (task: Task) => (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    startIcon={<ReplayIcon fontSize="small" />}
                    disabled={retryingTaskId === task.id}
                    onClick={() => void retryTask(task)}
                  >
                    {retryingTaskId === task.id ? 'Retrying...' : 'Retry'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon fontSize="small" />}
                    onClick={() => navigate(isAdminView ? `/admin/tasks/${task.id}` : `/app/tasks/${task.id}`)}
                  >
                    Open Task
                  </Button>
                </Stack>
              ),
            },
          ]}
        />
      )}
    </Stack>
  );
};
