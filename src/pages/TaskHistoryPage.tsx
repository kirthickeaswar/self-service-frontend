import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
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
  if (normalized === 'failed' || normalized === 'canceled' || normalized === 'cancelled') return 'error';
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

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

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      const startedAtMs = new Date(entry.startedAt).getTime();
      if (Number.isNaN(startedAtMs)) return false;

      if (fromDate) {
        const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
        if (startedAtMs < fromMs) return false;
      }

      if (toDate) {
        const toMs = new Date(`${toDate}T23:59:59.999`).getTime();
        if (startedAtMs > toMs) return false;
      }

      return true;
    });
  }, [history, fromDate, toDate]);

  useEffect(() => {
    setExpandedHistoryId((current) => (filteredHistory.some((item) => item.id === current) ? current : null));
  }, [filteredHistory]);

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
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              type="date"
              label="From"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              type="date"
              label="To"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Button
              variant="text"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setExpandedHistoryId(null);
              }}
              disabled={!fromDate && !toDate}
            >
              Clear Filter
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 'auto' } }}>
              Showing {filteredHistory.length} of {history.length} runs
            </Typography>
          </Stack>
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
          ) : filteredHistory.length === 0 ? (
            <Stack sx={{ p: 2 }}>
              <EmptyState
                title={history.length === 0 ? 'No history yet' : 'No matching runs'}
                subtitle={history.length === 0 ? 'Run this task to generate execution history.' : 'Try adjusting the date filters.'}
              />
            </Stack>
          ) : (
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48 }} />
                    <TableCell>Status</TableCell>
                    <TableCell>Started At</TableCell>
                    <TableCell>Finished At</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Exit Code</TableCell>
                    <TableCell>Output Snippet</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <Fragment key={item.id}>
                      <TableRow
                        hover
                        onClick={() => setExpandedHistoryId((current) => (current === item.id ? null : item.id))}
                        sx={{
                          cursor: 'pointer',
                          '& .MuiTableCell-root': {
                            py: 0.5,
                            px: 1,
                          },
                        }}
                      >
                        <TableCell>
                          <IconButton size="small">
                            {expandedHistoryId === item.id ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={historyStatusColor(item.status)} label={item.status} />
                        </TableCell>
                        <TableCell>{formatDateTime(item.startedAt)}</TableCell>
                        <TableCell>{formatDateTime(item.finishedAt)}</TableCell>
                        <TableCell>{formatDuration(item.startedAt, item.finishedAt)}</TableCell>
                        <TableCell>{item.exitCode ?? 'N/A'}</TableCell>
                        <TableCell>{item.outputSnippet ? 'View output' : 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{ py: 0, px: 0, borderBottom: expandedHistoryId === item.id ? '1px solid' : 'none', borderColor: 'divider' }}
                        >
                          <Collapse in={expandedHistoryId === item.id} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 2, py: 1.2, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Output Snippet
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {item.outputSnippet || '-'}
                              </Typography>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
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
