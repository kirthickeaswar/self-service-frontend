import { Alert, Button, Card, CardContent, MenuItem, Skeleton, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/app/AuthContext';
import { useSnackbar } from '@/app/SnackbarContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { useTaskFilters } from '@/features/tasks/hooks/useTaskFilters';
import { useTaskTypes } from '@/features/tasks/hooks/useTaskTypes';
import { TasksTable } from '@/features/tasks/components/TasksTable';
import { Task } from '@/types/domain';

export const ClientTasksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [previousRunsByTask, setPreviousRunsByTask] = useState<Record<number, string | undefined>>({});
  const [nextRunsByTask, setNextRunsByTask] = useState<Record<number, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToDelete, setSelectedToDelete] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);

  const { search, setSearch, type, setType, status, setStatus, filters } = useTaskFilters();
  const { taskTypes } = useTaskTypes();

  const buildPreviousRuns = async (taskData: Task[]) => {
    const result: Record<number, string | undefined> = {};

    const historyResults = await Promise.allSettled(taskData.map((task) => tasksApi.history(task.id)));
    historyResults.forEach((entry, index) => {
      if (entry.status !== 'fulfilled') return;
      const latest = entry.value[0];
      result[taskData[index].id] = latest?.startedAt ?? latest?.createdAt;
    });

    return result;
  };

  const buildNextRuns = (taskData: Task[]) => {
    const result: Record<number, string | undefined> = {};
    taskData.forEach((task) => {
      const next = task.schedules
        .filter((schedule) => schedule.status === 'ACTIVE')
        .sort((a, b) => +new Date(a.nextRunAt) - +new Date(b.nextRunAt))[0];
      result[task.id] = next?.nextRunAt;
    });
    return result;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list(filters);
      const previousRuns = await buildPreviousRuns(data);
      setTasks(data);
      setPreviousRunsByTask(previousRuns);
      setNextRunsByTask(buildNextRuns(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters.search, filters.status, filters.type]);

  const toggleTaskStatus = async (task: Task) => {
    setBusy(true);
    try {
      const schedules = task.schedules.filter((schedule) => schedule.status !== 'DELETED');
      if (schedules.length === 0) {
        showToast('Not Scheduled', 'info');
        return;
      }

      const shouldResume = schedules.every((schedule) => schedule.status === 'PAUSED');
      const targetStatus = shouldResume ? 'ACTIVE' : 'PAUSED';
      const toUpdate = shouldResume
        ? schedules.filter((schedule) => schedule.status === 'PAUSED')
        : schedules.filter((schedule) => schedule.status === 'ACTIVE');

      if (toUpdate.length === 0) {
        showToast(shouldResume ? 'Nothing to resume' : 'Nothing to pause', 'info');
        return;
      }

      await Promise.all(toUpdate.map((schedule) => tasksApi.updateScheduleStatus(task.id, schedule.id, targetStatus, user?.id)));
      showToast(shouldResume ? 'Task resumed' : 'Task paused', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update task schedules', 'error');
    } finally {
      setBusy(false);
    }
  };

  const runTask = async (task: Task) => {
    setBusy(true);
    try {
      const result = await tasksApi.run(task.id, user?.id);
      showToast(`Task ran (exit code ${result.exitCode})`, result.exitCode === 0 ? 'success' : 'warning');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Run failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedToDelete) {
      return;
    }
    setBusy(true);
    try {
      await tasksApi.remove(selectedToDelete.id);
      showToast('Task deleted with all schedules', 'success');
      setSelectedToDelete(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Tasks"
        subtitle="View and manage all tasks."
        actions={
          user?.role === 'EDITOR' ? (
            <Button variant="contained" onClick={() => navigate('/app/create-task')}>
              Create Task
            </Button>
          ) : undefined
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth label="Search task" value={search} onChange={(event) => setSearch(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <TextField fullWidth select label="Type" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <MenuItem value="ALL">All</MenuItem>
                {taskTypes.map((taskType) => (
                  <MenuItem key={taskType} value={taskType}>
                    {taskType}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <TextField
                fullWidth
                select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="ERROR">ERROR</MenuItem>
                <MenuItem value="NOT_SCHEDULED">NOT SCHEDULED</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks found" subtitle="Try changing filters or create a new task." />
      ) : (
        <TasksTable
          rows={tasks}
          previousRunsByTask={previousRunsByTask}
          nextRunsByTask={nextRunsByTask}
          onView={(task) => navigate(`/app/tasks/${task.id}`)}
          onViewHistory={(task) => navigate(`/app/tasks/${task.id}/history`)}
          onRun={(task) => void runTask(task)}
          onTogglePause={(task) => void toggleTaskStatus(task)}
          onDelete={(task) => setSelectedToDelete(task)}
          readOnly={user?.role === 'VIEWER'}
        />
      )}

      <ConfirmDialog
        open={Boolean(selectedToDelete)}
        title="Delete task"
        description="Deleting a task also removes all schedules under it. This action cannot be undone."
        confirmText={busy ? 'Deleting...' : 'Delete'}
        confirmColor="error"
        onClose={() => setSelectedToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </Stack>
  );
};
