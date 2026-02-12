import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import { Alert, Button, Card, CardContent, List, ListItem, ListItemText, Skeleton, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/app/AuthContext';
import { formatTimeDisplay } from '@/features/tasks/utils/schedule';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task } from '@/types/domain';

export const ClientDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskData = await tasksApi.list();
      setTasks(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
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
      paused: tasks.filter((task) => task.status === 'PAUSED').length,
      error: tasks.filter((task) => task.status === 'ERROR').length,
    };
  }, [tasks]);

  const nextRuns = useMemo(() => {
    return tasks
      .filter((task) => task.status === 'ACTIVE')
      .flatMap((task) =>
        task.schedules
          .filter((schedule) => schedule.status === 'SCHEDULED')
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

  return (
    <Stack spacing={3}>
      <PageHeader title="User Overview" subtitle="Monitor and operate scheduled tasks." />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        {['Total Tasks', 'Active', 'Paused', 'Errors'].map((title, index) => (
          <Grid key={title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {title}
                </Typography>
                {loading ? (
                  <Skeleton width={80} height={36} />
                ) : (
                  <Typography variant="h5">{[summary.total, summary.active, summary.paused, summary.error][index]}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
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
            <Button startIcon={<DescriptionIcon />} variant="outlined" onClick={() => navigate('/app/logs')}>
              Logs
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Next Runs
          </Typography>
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
            <List disablePadding>
              {nextRuns.map((run) => (
                <ListItem key={run.scheduleId} divider>
                  <ListItemText
                    primary={`${run.taskName} (${run.scheduleId})`}
                    secondary={`${new Date(run.runAt).toLocaleString()} | ${run.mode} at ${formatTimeDisplay(run.time)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};
