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

export const ClientTroubleshootPage = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userNameById, setUserNameById] = useState<Record<number, string>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      try {
        const [items, users] = await Promise.all([tasksApi.list(), tasksApi.users()]);
        setTasks(items);
        setUserNameById(Object.fromEntries(users.map((user) => [user.id, user.name])));
        const presetTaskId = searchParams.get('taskId');
        if (presetTaskId) {
          const parsed = Number(presetTaskId);
          if (!Number.isNaN(parsed)) setSelectedTaskId(parsed);
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
      const data = await logsApi.list({
        taskId: selectedTaskId || undefined,
        search,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setLogs(data);
      showToast(`Fetched ${data.length} audit entries`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit fetch failed');
      showToast('Unable to fetch audit entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initLoading && selectedTaskId !== '') void fetchLogs();
  }, [initLoading, selectedTaskId]);

  return (
    <Stack spacing={3}>
      <PageHeader title="Audit" subtitle="Fetch and inspect audit entries for tasks." />
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
                  value={selectedTaskId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedTaskId(value === '' ? '' : Number(value));
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
          <EmptyState title="No audit entries found" subtitle="Choose filters and fetch audit data." />
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
