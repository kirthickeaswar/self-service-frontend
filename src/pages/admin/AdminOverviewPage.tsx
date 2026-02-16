import { Alert, Button, Card, CardContent, LinearProgress, List, ListItem, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task, TaskHistoryEntry } from '@/types/domain';

export const AdminOverviewPage = () => {
  const navigate = useNavigate();
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
    const schedules = tasks.flatMap((task) => task.schedules);
    return {
      tasks: tasks.length,
      activeTasks: tasks.filter((task) => task.status === 'ACTIVE').length,
      pausedTasks: tasks.filter((task) => task.status === 'PAUSED').length,
      errorTasks: tasks.filter((task) => task.status === 'ERROR').length,
      notScheduledTasks: tasks.filter((task) => task.status === 'NOT_SCHEDULED').length,
      failedSchedules: schedules.filter((schedule) => schedule.status === 'FAILED').length,
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

    const durationMs = historyEntries
      .filter((entry) => Boolean(entry.startedAt) && Boolean(entry.finishedAt))
      .map((entry) => +new Date(entry.finishedAt as string) - +new Date(entry.startedAt))
      .filter((value) => value > 0);
    const avgDurationSeconds = durationMs.length > 0 ? Math.round(durationMs.reduce((sum, value) => sum + value, 0) / durationMs.length / 1000) : 0;

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const runsLast24h = historyEntries.filter((entry) => +new Date(entry.startedAt) >= oneDayAgo).length;

    const lastRunAt = historyEntries.length
      ? historyEntries.reduce((latest, entry) => (+new Date(entry.startedAt) > +new Date(latest.startedAt) ? entry : latest), historyEntries[0]).startedAt
      : null;

    return {
      totalRuns,
      successRuns,
      failedRuns,
      canceledRuns,
      runningOrQueuedRuns,
      completedRuns,
      successRate,
      avgDurationSeconds,
      runsLast24h,
      lastRunAt,
    };
  }, [historyEntries]);

  const attentionTasks = tasks.filter(
    (task) => task.status === 'ERROR' || task.schedules.some((schedule) => schedule.status === 'FAILED'),
  );

  return (
    <Stack spacing={3}>
      <PageHeader title="Admin Overview" subtitle="Cross-tenant operational visibility for scheduled jobs." />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        {[
          ['Total Tasks', metrics.tasks],
          ['Active', metrics.activeTasks],
          ['Paused', metrics.pausedTasks],
          ['Errors', metrics.errorTasks],
          ['Not Scheduled', metrics.notScheduledTasks],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                {loading ? <Skeleton width={80} height={36} /> : <Typography variant="h5">{value}</Typography>}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Execution Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Real-time rollup from Task History API across all tasks.
              </Typography>
              {historyLoading ? (
                <Stack spacing={1}>
                  <Skeleton height={24} />
                  <Skeleton height={24} />
                  <Skeleton height={24} />
                </Stack>
              ) : (
                <Stack spacing={1.2}>
                  <LinearProgress variant="determinate" value={executionSummary.successRate} sx={{ height: 10, borderRadius: 10 }} />
                  <Typography variant="caption" color="text.secondary">
                    Success Rate: {executionSummary.successRate}% ({executionSummary.successRuns}/{executionSummary.completedRuns || 0} completed runs)
                  </Typography>

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
                        Canceled
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.canceledRuns}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Duration
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.avgDurationSeconds}s</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Runs (24h)
                      </Typography>
                      <Typography variant="subtitle2">{executionSummary.runsLast24h}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary">
                        Last Run
                      </Typography>
                      <Typography variant="subtitle2">
                        {executionSummary.lastRunAt ? new Date(executionSummary.lastRunAt).toLocaleString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tasks Needing Attention
              </Typography>
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
                <List disablePadding>
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

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manage Users
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure viewer/editor/admin assignments.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/admin/users')}>
            Open User Management
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
};
