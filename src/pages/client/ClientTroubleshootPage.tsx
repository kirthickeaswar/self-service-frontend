import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useSnackbar } from '@/app/SnackbarContext';
import { logsApi } from '@/features/logs/api/logsApi';
import { LogsTable } from '@/features/logs/components/LogsTable';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { LogEntry, LogLevel, Task } from '@/types/domain';
import { useSearchParams } from 'react-router-dom';

const clientOwner = 'alice@mock.com';

export const ClientTroubleshootPage = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useSnackbar();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | ''>('');
  const [level, setLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);

  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      try {
        const items = await tasksApi.list({ owner: clientOwner });
        setTasks(items);
        const presetTaskId = searchParams.get('taskId');
        if (presetTaskId) {
          const parsed = Number(presetTaskId);
          if (!Number.isNaN(parsed)) {
            setSelectedTaskId(parsed);
          }
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
        scheduleId: selectedScheduleId || undefined,
        level,
        search,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setLogs(data);
      showToast(`Fetched ${data.length} logs`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Log fetch failed');
      showToast('Unable to fetch logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initLoading && selectedTaskId !== '') {
      void fetchLogs();
    }
  }, [initLoading, selectedTaskId]);

  return (
    <Stack spacing={3}>
      <PageHeader title="Logs" subtitle="Fetch and inspect task/schedule logs." />

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
                  value={selectedTaskId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedTaskId(value === '' ? '' : Number(value));
                    setSelectedScheduleId('');
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
                  value={selectedScheduleId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedScheduleId(value === '' ? '' : Number(value));
                  }}
                  disabled={!selectedTask}
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
        <Typography variant="h6">Logs Viewer</Typography>
        {loading ? (
          <Card>
            <CardContent>
              <Skeleton height={36} />
              <Skeleton height={36} />
              <Skeleton height={36} />
            </CardContent>
          </Card>
        ) : logs.length === 0 ? (
          <EmptyState title="No logs found" subtitle="Choose filters and fetch logs to inspect run details." />
        ) : (
          <LogsTable logs={logs} />
        )}
      </Stack>
    </Stack>
  );
};
