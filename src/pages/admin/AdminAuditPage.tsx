import SearchIcon from '@mui/icons-material/Search';
import { Alert, Button, Card, CardContent, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSnackbar } from '@/app/SnackbarContext';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { logsApi } from '@/features/logs/api/logsApi';
import { LogsTable } from '@/features/logs/components/LogsTable';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { LogEntry, Task } from '@/types/domain';

export const AdminAuditPage = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userNameById, setUserNameById] = useState<Record<number, string>>({});
  const [taskId, setTaskId] = useState<number | ''>('');
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
        const [allTasks, users] = await Promise.all([tasksApi.list(), tasksApi.users()]);
        setTasks(allTasks);
        setUserNameById(Object.fromEntries(users.map((user) => [user.id, user.name])));
        const presetTaskId = searchParams.get('taskId');
        if (presetTaskId) {
          const parsed = Number(presetTaskId);
          if (!Number.isNaN(parsed)) setTaskId(parsed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load tasks');
      } finally {
        setInitLoading(false);
      }
    };
    void init();
  }, [searchParams]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await logsApi.list({
        taskId: taskId || undefined,
        search,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setLogs(items);
      showToast(`Fetched ${items.length} audit entries`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch audit entries');
      showToast('Audit fetch failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initLoading && taskId !== '') void fetchLogs();
  }, [initLoading, taskId]);

  return (
    <Stack spacing={3}>
      <PageHeader title="Admin Audit" subtitle="Centralized audit stream across all tasks." />
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          {initLoading ? (
            <Skeleton height={100} />
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  select
                  label="Task"
                  value={taskId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTaskId(value === '' ? '' : Number(value));
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
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Search in audit details" value={search} onChange={(event) => setSearch(event.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, md: 2.5 }}>
                <TextField
                  fullWidth
                  label="From"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2.5 }}>
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
                  Fetch Audit
                </Button>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        <Typography variant="h6">Audit Stream</Typography>
        {loading ? (
          <Card>
            <CardContent>
              <Skeleton height={36} />
              <Skeleton height={36} />
              <Skeleton height={36} />
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <EmptyState title="No audit entries loaded" subtitle="Run an audit query using the filters above." />
        ) : (
          <LogsTable
            logs={logs}
            userNameById={userNameById}
            taskNameById={Object.fromEntries(tasks.map((task) => [task.id, task.name]))}
            taskTypeByTaskId={Object.fromEntries(tasks.map((task) => [task.id, task.type]))}
          />
        )}
      </Stack>
    </Stack>
  );
};
