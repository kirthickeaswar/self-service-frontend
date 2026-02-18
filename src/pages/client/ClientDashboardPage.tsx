import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Alert, Box, Button, Card, CardContent, Chip, LinearProgress, List, ListItem, ListItemButton, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/app/AuthContext';
import { formatTimeDisplay } from '@/features/tasks/utils/schedule';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task, TaskHistoryEntry } from '@/types/domain';

export const ClientDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TaskHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskData = await tasksApi.list();
      setTasks(taskData);
      setHistoryLoading(true);
      const historyResults = await Promise.allSettled(taskData.map((task) => tasksApi.history(task.id)));
      const mergedHistory = historyResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
      setHistoryEntries(mergedHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setHistoryLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((task) => task.status === 'ACTIVE').length,
      error: tasks.filter((task) => task.status === 'ERROR').length,
      notScheduled: tasks.filter((task) => task.status === 'NOT_SCHEDULED').length,
    };
  }, [tasks]);

  const executionSummary = useMemo(() => {
    const normalize = (status: string) => status.trim().toLowerCase();
    const totalRuns = historyEntries.length;
    const successRuns = historyEntries.filter((entry) => normalize(entry.status) === 'success').length;
    const failedRuns = historyEntries.filter((entry) => normalize(entry.status) === 'failed').length;
    const canceledRuns = historyEntries.filter((entry) => {
      const status = normalize(entry.status);
      return status === 'canceled' || status === 'cancelled';
    }).length;
    const runningOrQueuedRuns = historyEntries.filter((entry) => {
      const status = normalize(entry.status);
      return status === 'running' || status === 'queued';
    }).length;
    const completedRuns = successRuns + failedRuns + canceledRuns;
    const successRate = completedRuns > 0 ? Math.round((successRuns / completedRuns) * 100) : 0;
    const pausedSchedules = tasks.flatMap((task) => task.schedules).filter((schedule) => schedule.status === 'PAUSED').length;

    return {
      totalRuns,
      failedRuns,
      runningOrQueuedRuns,
      completedRuns,
      successRuns,
      successRate,
      pausedSchedules,
    };
  }, [historyEntries, tasks]);

  const nextRuns = useMemo(() => {
    return tasks
      .filter((task) => task.status === 'ACTIVE')
      .flatMap((task) =>
        task.schedules
          .filter((schedule) => schedule.status === 'ACTIVE')
          .map((schedule) => ({
            taskId: task.id,
            taskName: task.name,
            scheduleId: schedule.id,
            runAt: schedule.nextRunAt,
            mode: schedule.mode,
            time: schedule.time,
          })),
      )
      .sort((a, b) => +new Date(a.runAt) - +new Date(b.runAt))
      .slice(0, 6);
  }, [tasks]);

  const metricCards = [
    {
      label: 'Total Tasks',
      value: summary.total,
      icon: <TaskAltIcon fontSize="small" />,
      tone: 'rgba(111, 143, 180, 0.18)',
      subtitle: 'All visible tasks',
    },
    {
      label: 'Active',
      value: summary.active,
      icon: <PlayCircleOutlineIcon fontSize="small" />,
      tone: 'rgba(34, 197, 94, 0.18)',
      subtitle: 'Running healthy',
    },
    {
      label: 'Errors',
      value: summary.error,
      icon: <ErrorOutlineIcon fontSize="small" />,
      tone: 'rgba(239, 68, 68, 0.18)',
      subtitle: 'Need attention',
    },
    {
      label: 'Not Scheduled',
      value: summary.notScheduled,
      icon: <WarningAmberIcon fontSize="small" />,
      tone: 'rgba(59, 130, 246, 0.18)',
      subtitle: 'No schedule',
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader title="User Overview" subtitle="Monitor and operate scheduled tasks." />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2} alignItems="stretch">
        {metricCards.map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.2 }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {metric.label}
                    </Typography>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        bgcolor: metric.tone,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {metric.icon}
                    </Box>
                  </Stack>
                  {loading ? <Skeleton width={90} height={42} /> : <Typography variant="h4">{metric.value}</Typography>}
                  <Typography variant="caption" color="text.secondary">
                    {metric.subtitle}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, md: 7.5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                <Typography variant="h6">Execution Summary</Typography>
              </Stack>
              {historyLoading ? (
                <Stack spacing={1}>
                  <Skeleton height={24} />
                  <Skeleton height={24} />
                  <Skeleton height={24} />
                </Stack>
              ) : (
                <Stack spacing={1.2}>
                  <LinearProgress variant="determinate" value={executionSummary.successRate} sx={{ height: 10, borderRadius: 10 }} />
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      label={`Success Rate ${executionSummary.successRate}%`}
                      color={executionSummary.successRate >= 90 ? 'success' : executionSummary.successRate >= 70 ? 'warning' : 'error'}
                    />
                    <Chip size="small" variant="outlined" label={`${executionSummary.successRuns}/${executionSummary.completedRuns || 0} completed`} />
                  </Stack>

                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Runs
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.totalRuns}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Failed
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.failedRuns}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Running / Queued
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.runningOrQueuedRuns}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Paused Schedules
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.pausedSchedules}</Typography>
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4.5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Next Runs</Typography>
                {!loading ? <Chip size="small" color={nextRuns.length > 0 ? 'info' : 'default'} label={nextRuns.length} /> : null}
              </Stack>
              {loading ? (
                <Stack spacing={1}>
                  <Skeleton height={30} />
                  <Skeleton height={30} />
                  <Skeleton height={30} />
                </Stack>
              ) : nextRuns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No upcoming runs found for active scheduled items.
                </Typography>
              ) : (
                <List disablePadding sx={{ maxHeight: 318, overflowY: 'auto' }}>
                  {nextRuns.map((run) => (
                    <ListItem key={run.scheduleId} divider disablePadding>
                      <ListItemButton onClick={() => navigate(`/app/tasks/${run.taskId}`)} sx={{ py: 0.75 }}>
                        <ListItemText
                          primary={`${run.taskName} (${run.scheduleId})`}
                          secondary={`${new Date(run.runAt).toLocaleString()} | ${run.mode} at ${formatTimeDisplay(run.time)}`}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {user?.role === 'EDITOR' ? (
              <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => navigate('/app/create-task')}>
                Create Task
              </Button>
            ) : null}
            <Button startIcon={<DescriptionIcon />} variant="outlined" onClick={() => navigate('/app/audit')}>
              Audit
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
