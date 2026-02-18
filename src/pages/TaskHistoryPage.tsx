import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Button, Card, CardContent, Chip, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task, TaskHistoryEntry } from '@/types/domain';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'N/A');

const formatDuration = (startedAt: string, finishedAt?: string | null) => {
  if (!finishedAt) return 'Running';
  const diffMs = +new Date(finishedAt) - +new Date(startedAt);
  if (diffMs <= 0) return '< 1s';
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

const historyStatusColor = (status: string): 'default' | 'success' | 'error' | 'warning' | 'info' => {
  const normalized = status.toLowerCase();
  if (normalized === 'success') return 'success';
  if (normalized === 'failed' || normalized === 'canceled') return 'error';
  if (normalized === 'running') return 'warning';
  if (normalized === 'queued') return 'info';
  return 'default';
};

export const TaskHistoryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId } = useParams();
  const taskIdNumber = Number(taskId);
  const isAdminView = location.pathname.startsWith('/admin');
  const backPath = isAdminView ? '/admin/tasks' : '/app/tasks';

  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!taskId || Number.isNaN(taskIdNumber)) return;
    setLoading(true);
    setError(null);
    try {
      const [taskData, historyData] = await Promise.all([tasksApi.getById(taskIdNumber), tasksApi.history(taskIdNumber)]);
      setTask(taskData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load task history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [taskId]);

  const latestRun = useMemo(() => history[0], [history]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Task History"
        subtitle={task ? `Execution history for ${task.name}` : 'Execution history for this task.'}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outlined" onClick={() => navigate(backPath)}>
              Back to Tasks
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          {loading ? (
            <Stack spacing={1}>
              <Skeleton height={32} />
              <Skeleton height={32} />
              <Skeleton height={32} />
            </Stack>
          ) : latestRun ? (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Last Run: {formatDateTime(latestRun.startedAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Status:{' '}
                <Chip size="small" color={historyStatusColor(latestRun.status)} label={latestRun.status} sx={{ ml: 0.5 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Exit Code: {latestRun.exitCode ?? 'N/A'}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No run records available.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Stack spacing={1} sx={{ p: 2 }}>
              <Skeleton height={34} />
              <Skeleton height={34} />
              <Skeleton height={34} />
            </Stack>
          ) : history.length === 0 ? (
            <Stack sx={{ p: 2 }}>
              <EmptyState title="No history yet" subtitle="Run this task to generate execution history." />
            </Stack>
          ) : (
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Started At</TableCell>
                    <TableCell>Finished At</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Exit Code</TableCell>
                    <TableCell>Output Snippet</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Chip size="small" color={historyStatusColor(item.status)} label={item.status} />
                      </TableCell>
                      <TableCell>{formatDateTime(item.startedAt)}</TableCell>
                      <TableCell>{formatDateTime(item.finishedAt)}</TableCell>
                      <TableCell>{formatDuration(item.startedAt, item.finishedAt)}</TableCell>
                      <TableCell>{item.exitCode ?? 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 520, whiteSpace: 'pre-wrap' }}>
                          {item.outputSnippet || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};
