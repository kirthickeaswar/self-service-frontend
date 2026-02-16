import { Alert, Button, Card, CardContent, MenuItem, Skeleton, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from '@/app/SnackbarContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { logsApi } from '@/features/logs/api/logsApi';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { TasksTable } from '@/features/tasks/components/TasksTable';
import { useTaskFilters } from '@/features/tasks/hooks/useTaskFilters';
import { useTaskTypes } from '@/features/tasks/hooks/useTaskTypes';
import { LogEntry, Task } from '@/types/domain';

export const AdminTasksPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [previousRunsByTask, setPreviousRunsByTask] = useState<Record<number, string | undefined>>({});
  const [nextRunsByTask, setNextRunsByTask] = useState<Record<number, string | undefined>>({});
  const [creators, setCreators] = useState<string[]>([]);
  const [createdBy, setCreatedBy] = useState(searchParams.get('createdBy') ?? 'ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToDelete, setSelectedToDelete] = useState<Task | null>(null);

  const { search, setSearch, type, setType, status, setStatus, filters } = useTaskFilters();
  const { taskTypes } = useTaskTypes();

  const buildPreviousRuns = (taskData: Task[], logs: LogEntry[]) => {
    const result: Record<number, string | undefined> = {};
    taskData.forEach((task) => {
      const latest = logs
        .filter((log) => log.taskId === task.id)
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
      result[task.id] = latest?.timestamp;
    });
    return result;
  };

  const buildNextRuns = (taskData: Task[]) => {
    const result: Record<number, string | undefined> = {};
    taskData.forEach((task) => {
      const next = task.schedules
        .filter((schedule) => schedule.status === 'SCHEDULED')
        .sort((a, b) => +new Date(a.nextRunAt) - +new Date(b.nextRunAt))[0];
      result[task.id] = next?.nextRunAt;
    });
    return result;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskData, creatorList, logs] = await Promise.all([
        tasksApi.list({ ...filters, createdBy: createdBy === 'ALL' ? undefined : createdBy }),
        tasksApi.creators(),
        logsApi.list({}),
      ]);
      setTasks(taskData);
      setPreviousRunsByTask(buildPreviousRuns(taskData, logs));
      setNextRunsByTask(buildNextRuns(taskData));
      setCreators(creatorList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters.search, filters.status, filters.type, createdBy]);

  useEffect(() => {
    const creatorFromParams = searchParams.get('createdBy') ?? 'ALL';
    setCreatedBy(creatorFromParams);
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (createdBy === 'ALL') {
      nextParams.delete('createdBy');
    } else {
      nextParams.set('createdBy', createdBy);
    }
    setSearchParams(nextParams, { replace: true });
  }, [createdBy]);

  const toggleStatus = async (task: Task) => {
    try {
      await tasksApi.updateStatus(task.id, task.status === 'NOT_SCHEDULED' ? 'ACTIVE' : 'NOT_SCHEDULED');
      showToast('Task status updated', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const runTask = async (task: Task) => {
    try {
      const result = await tasksApi.run(task.id);
      showToast(`Task ran (exit code ${result.exitCode})`, result.exitCode === 0 ? 'success' : 'warning');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Run failed', 'error');
    }
  };

  const deleteTask = async () => {
    if (!selectedToDelete) return;
    try {
      await tasksApi.remove(selectedToDelete.id);
      showToast('Task deleted', 'success');
      setSelectedToDelete(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="All Tasks"
        subtitle="Filter and control tasks across all users."
        actions={
          <Button variant="contained" onClick={() => navigate('/admin/create-task')}>
            Create Task
          </Button>
        }
      />
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 2.25 }}>
              <TextField fullWidth select label="Type" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <MenuItem value="ALL">All</MenuItem>
                {taskTypes.map((taskType) => (
                  <MenuItem key={taskType} value={taskType}>
                    {taskType}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2.25 }}>
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
                <MenuItem value="DELETED">DELETED</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2.5 }}>
              <TextField
                fullWidth
                select
                label="Created By"
                value={createdBy}
                onChange={(event) => setCreatedBy(event.target.value)}
              >
                <MenuItem value="ALL">All</MenuItem>
                {creators.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <Skeleton height={40} />
            <Skeleton height={40} />
            <Skeleton height={40} />
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No matching tasks" subtitle="Adjust filters to widen your results." />
      ) : (
        <TasksTable
          rows={tasks}
          showCreatedBy
          previousRunsByTask={previousRunsByTask}
          nextRunsByTask={nextRunsByTask}
          onView={(task) => navigate(`/admin/tasks/${task.id}`)}
          onViewHistory={(task) => navigate(`/admin/logs?taskId=${task.id}`)}
          onRun={(task) => void runTask(task)}
          onTogglePause={(task) => void toggleStatus(task)}
          onDelete={(task) => setSelectedToDelete(task)}
        />
      )}

      <ConfirmDialog
        open={Boolean(selectedToDelete)}
        title="Delete task"
        description="All schedules and related logs for this task will be removed."
        confirmText="Delete"
        confirmColor="error"
        onClose={() => setSelectedToDelete(null)}
        onConfirm={() => void deleteTask()}
      />
    </Stack>
  );
};
