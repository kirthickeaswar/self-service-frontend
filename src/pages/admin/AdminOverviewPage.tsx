import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Alert, Box, Card, CardContent, Chip, LinearProgress, List, ListItem, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task, TaskHistoryEntry } from '@/types/domain';

export const AdminOverviewPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [historyEntries, setHistoryEntries] = useState<TaskHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tasksApi.list();
        setTasks(data);

        setHistoryLoading(true);
        const historyResults = await Promise.allSettled(data.map((task) => tasksApi.history(task.id)));
        const mergedHistory = historyResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        setHistoryEntries(mergedHistory);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load admin overview');
      } finally {
        setHistoryLoading(false);
        setLoading(false);
      }
    };

    void load();
  }, []);

  const metrics = useMemo(() => {
    return {
      tasks: tasks.length,
      activeTasks: tasks.filter((task) => task.status === 'ACTIVE').length,
      pausedTasks: tasks.filter((task) => task.status === 'PAUSED').length,
      errorTasks: tasks.filter((task) => task.status === 'ERROR').length,
      notScheduledTasks: tasks.filter((task) => task.status === 'NOT_SCHEDULED').length,
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

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const runsLast24h = historyEntries.filter((entry) => +new Date(entry.startedAt) >= oneDayAgo).length;
    const pausedSchedules = tasks.flatMap((task) => task.schedules).filter((schedule) => schedule.status === 'PAUSED').length;

    return {
      totalRuns,
      successRuns,
      failedRuns,
      runningOrQueuedRuns,
      completedRuns,
      successRate,
      runsLast24h,
      pausedSchedules,
    };
  }, [historyEntries, tasks]);

  const attentionTasks = tasks.filter(
    (task) => task.status === 'ERROR' || task.schedules.some((schedule) => schedule.status === 'FAILED'),
  );

  const metricCards = [
    {
      label: 'Total Tasks',
      value: metrics.tasks,
      icon: <TaskAltIcon fontSize="small" />,
      tone: 'rgba(111, 143, 180, 0.18)',
      subtitle: 'All configured tasks',
    },
    {
      label: 'Active',
      value: metrics.activeTasks,
      icon: <PlayCircleOutlineIcon fontSize="small" />,
      tone: 'rgba(34, 197, 94, 0.18)',
      subtitle: 'Running healthy',
    },
    {
      label: 'Paused',
      value: metrics.pausedTasks,
      icon: <PauseCircleOutlineIcon fontSize="small" />,
      tone: 'rgba(250, 204, 21, 0.18)',
      subtitle: 'Paused by users/admin',
    },
    {
      label: 'Errors',
      value: metrics.errorTasks,
      icon: <ErrorOutlineIcon fontSize="small" />,
      tone: 'rgba(239, 68, 68, 0.18)',
      subtitle: 'Need immediate action',
    },
    {
      label: 'Not Scheduled',
      value: metrics.notScheduledTasks,
      icon: <WarningAmberIcon fontSize="small" />,
      tone: 'rgba(59, 130, 246, 0.18)',
      subtitle: 'No active schedule',
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader title="Admin Overview" subtitle="Cross-tenant operational visibility for scheduled jobs." />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2} alignItems="stretch">
        {metricCards.map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, sm: 6, lg: 2.4 }}>
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
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Runs (24h)
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.runsLast24h}</Typography>
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
                <Typography variant="h6">Tasks Needing Attention</Typography>
                {!loading ? <Chip size="small" color={attentionTasks.length > 0 ? 'error' : 'success'} label={attentionTasks.length} /> : null}
              </Stack>
              {loading ? (
                <Stack spacing={1}>
                  <Skeleton height={32} />
                  <Skeleton height={32} />
                  <Skeleton height={32} />
                </Stack>
              ) : attentionTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tasks currently in error state.
                </Typography>
              ) : (
                <List disablePadding sx={{ maxHeight: 318, overflowY: 'auto' }}>
                  {attentionTasks.slice(0, 6).map((task) => (
                    <ListItem key={task.id} divider>
                      <ListItemText
                        primary={`${task.name} (${task.createdBy})`}
                        secondary={`Updated ${new Date(task.updatedAt).toLocaleString()}`}
                      />
                      <StatusChip status={task.status} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Stack>
  );
};
