import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
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
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { useSnackbar } from '@/app/SnackbarContext';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Task, TaskHistoryEntry } from '@/types/domain';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'N/A');

export const TroubleshootPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useSnackbar();
  const isAdminView = location.pathname.startsWith('/admin');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [latestHistoryByTaskId, setLatestHistoryByTaskId] = useState<Record<number, TaskHistoryEntry | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const canRetry = user?.role !== 'VIEWER';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskData = await tasksApi.list({ status: 'ERROR' });
      const errorTasks = taskData.filter((task) => task.status === 'ERROR');
      setTasks(errorTasks);

      if (errorTasks.length === 0) {
        setLatestHistoryByTaskId({});
        setExpandedTaskId(null);
        return;
      }

      const historyResults = await Promise.allSettled(
        errorTasks.map(async (task) => {
          const entries = await tasksApi.history(task.id);
          return { taskId: task.id, latest: entries[0] ?? null };
        }),
      );

      const nextHistoryByTaskId: Record<number, TaskHistoryEntry | null> = {};
      historyResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          nextHistoryByTaskId[result.value.taskId] = result.value.latest;
        }
      });
      setLatestHistoryByTaskId(nextHistoryByTaskId);
      setExpandedTaskId((current) => (errorTasks.some((task) => task.id === current) ? current : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load error tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const retryTask = async (task: Task) => {
    if (!canRetry) return;
    setRetryingTaskId(task.id);
    try {
      const result = await tasksApi.run(task.id, user?.id);
      showToast(`Task retried (exit code ${result.exitCode})`, result.exitCode === 0 ? 'success' : 'warning');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Retry failed', 'error');
    } finally {
      setRetryingTaskId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Troubleshoot"
        subtitle="Only tasks in error state are shown here."
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <Card>
          <CardContent>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks in error state" subtitle="Everything looks healthy right now." />
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48 }} />
                    <TableCell>Task</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Run</TableCell>
                    <TableCell>Output Snippet</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => {
                    const latestHistory = latestHistoryByTaskId[task.id] ?? null;
                    const hasSnippet = Boolean(latestHistory?.outputSnippet?.trim());
                    const rowExpanded = expandedTaskId === task.id;

                    return (
                      <Fragment key={task.id}>
                        <TableRow
                          hover
                          onClick={() => {
                            if (!hasSnippet) return;
                            setExpandedTaskId((current) => (current === task.id ? null : task.id));
                          }}
                          sx={{
                            cursor: hasSnippet ? 'pointer' : 'default',
                            '& .MuiTableCell-root': {
                              py: 0.5,
                              px: 1,
                            },
                          }}
                        >
                          <TableCell>
                            <IconButton
                              size="small"
                              disabled={!hasSnippet}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!hasSnippet) return;
                                setExpandedTaskId((current) => (current === task.id ? null : task.id));
                              }}
                            >
                              {rowExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{task.name}</TableCell>
                          <TableCell>{task.type}</TableCell>
                          <TableCell>{task.createdBy}</TableCell>
                          <TableCell>
                            <StatusChip status={task.status} />
                          </TableCell>
                          <TableCell>{formatDateTime(latestHistory?.startedAt)}</TableCell>
                          <TableCell>{hasSnippet ? 'View output' : 'N/A'}</TableCell>
                          <TableCell
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              {canRetry ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="warning"
                                  startIcon={<ReplayIcon fontSize="small" />}
                                  disabled={retryingTaskId === task.id}
                                  onClick={() => void retryTask(task)}
                                >
                                  {retryingTaskId === task.id ? 'Retrying...' : 'Retry'}
                                </Button>
                              ) : null}
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon fontSize="small" />}
                                onClick={() => navigate(isAdminView ? `/admin/tasks/${task.id}` : `/app/tasks/${task.id}`)}
                              >
                                Open Task
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            sx={{ py: 0, px: 0, borderBottom: rowExpanded ? '1px solid' : 'none', borderColor: 'divider' }}
                          >
                            <Collapse in={rowExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 2, py: 1.2, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                  Output Snippet
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {latestHistory?.outputSnippet || '-'}
                                </Typography>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1 }}>
              <Chip size="small" color="error" label={tasks.length} />
              <Typography variant="caption" color="text.secondary">
                tasks currently in error state
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};
