import SearchIcon from '@mui/icons-material/Search';
import { Alert, Button, Card, CardContent, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useSnackbar } from '@/app/SnackbarContext';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { logsApi } from '@/features/logs/api/logsApi';
import { LogsTable } from '@/features/logs/components/LogsTable';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { LogEntry, LogLevel, Task } from '@/types/domain';

export const AdminLogsPage = () => {
  const { showToast } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<number | ''>('');
  const [scheduleId, setScheduleId] = useState<number | ''>('');
  const [level, setLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setInitLoading(true);
        setTasks(await tasksApi.list());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load tasks');
      } finally {
        setInitLoading(false);
      }
    };

    void init();
  }, []);

  const selectedTask = tasks.find((task) => task.id === taskId);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await logsApi.list({
        taskId: taskId || undefined,
        scheduleId: scheduleId || undefined,
        level,
        search,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setLogs(items);
      showToast(`Fetched ${items.length} logs`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch logs');
      showToast('Log fetch failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Admin Logs" subtitle="Centralized log stream across all tasks and owners." />
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          {initLoading ? (
            <Skeleton height={100} />
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="Task"
                  value={taskId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTaskId(value === '' ? '' : Number(value));
                    setScheduleId('');
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {tasks.map((task) => (
                    <MenuItem key={task.id} value={task.id}>
                      {task.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  select
                  label="Schedule"
                  value={scheduleId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setScheduleId(value === '' ? '' : Number(value));
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  {selectedTask?.schedules.map((schedule) => (
                    <MenuItem key={schedule.id} value={schedule.id}>
                      {schedule.id}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField fullWidth select label="Level" value={level} onChange={(event) => setLevel(event.target.value as LogLevel | 'ALL')}>
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="INFO">INFO</MenuItem>
                  <MenuItem value="WARN">WARN</MenuItem>
                  <MenuItem value="ERROR">ERROR</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField fullWidth label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 1.5 }}>
                <TextField
                  fullWidth
                  label="From"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 1.5 }}>
                <TextField
                  fullWidth
                  label="To"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={() => void fetchLogs()} disabled={loading}>
                  Fetch Logs
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        <Typography variant="h6">Log Stream</Typography>
        {loading ? (
          <Card>
            <CardContent>
              <Skeleton height={36} />
              <Skeleton height={36} />
              <Skeleton height={36} />
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <EmptyState title="No logs loaded" subtitle="Run a log query using the filters above." />
        ) : (
          <LogsTable logs={logs} />
        )}
      </Stack>
    </Stack>
  );
};
