import { Alert, Button, Card, CardContent, LinearProgress, List, ListItem, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task } from '@/types/domain';

export const AdminOverviewPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tasksApi.list();
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load admin overview');
      } finally {
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
                Metrics Placeholder
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Week-1 chart mockup for upcoming telemetry integration.
              </Typography>
              <LinearProgress variant="determinate" value={Math.min(100, metrics.failedSchedules * 10)} sx={{ height: 10, borderRadius: 10, mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Failed schedules currently: {metrics.failedSchedules}
              </Typography>
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
