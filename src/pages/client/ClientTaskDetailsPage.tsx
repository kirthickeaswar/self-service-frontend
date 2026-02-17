import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { useSnackbar } from '@/app/SnackbarContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { ScheduleForm } from '@/features/tasks/components/ScheduleForm';
import { useTaskTypes } from '@/features/tasks/hooks/useTaskTypes';
import { parseAccessEmails, stringifyAccessEmails } from '@/features/tasks/utils/access';
import { formatDateDisplay, formatTimeDisplay } from '@/features/tasks/utils/schedule';
import { CreateScheduleInput, Schedule, Task, TaskType } from '@/types/domain';

const defaultSchedule: CreateScheduleInput = {
  mode: 'CRON',
  time: '00:00',
  cronExpression: '0 0 * * * *',
};

export const ClientTaskDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { taskId } = useParams();
  const taskIdNumber = Number(taskId);
  const isAdminView = location.pathname.startsWith('/admin');
  const canEdit = isAdminView || user?.role !== 'VIEWER';
  const backPath = isAdminView ? '/admin/tasks' : '/app/tasks';
  const historyPath = isAdminView ? `/admin/tasks/${taskIdNumber}/history` : `/app/tasks/${taskIdNumber}/history`;
  const { showToast } = useSnackbar();
  const { taskTypes } = useTaskTypes();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleInput, setScheduleInput] = useState<CreateScheduleInput>(defaultSchedule);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAccessEmails, setTaskAccessEmails] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('T1');
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
  const [editScheduleInput, setEditScheduleInput] = useState<CreateScheduleInput>(defaultSchedule);
  const [runningTask, setRunningTask] = useState(false);
  const [updatingTaskPause, setUpdatingTaskPause] = useState(false);

  const load = async () => {
    if (!taskId || Number.isNaN(taskIdNumber)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.getById(taskIdNumber);
      setTask(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load task');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [taskId]);

  const toggleSchedule = async (schedule: Schedule) => {
    if (Number.isNaN(taskIdNumber)) return;
    try {
      const next = schedule.status === 'PAUSED' ? 'SCHEDULED' : 'PAUSED';
      await tasksApi.updateScheduleStatus(taskIdNumber, schedule.id, next, user?.id);
      showToast(`Schedule ${next === 'PAUSED' ? 'paused' : 'resumed'}`, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const deleteSchedule = async () => {
    if (Number.isNaN(taskIdNumber) || !scheduleToDelete) return;
    try {
      await tasksApi.deleteSchedule(taskIdNumber, scheduleToDelete.id, user?.id);
      setScheduleToDelete(null);
      showToast('Schedule removed', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const addSchedule = async () => {
    if (Number.isNaN(taskIdNumber)) return;
    try {
      await tasksApi.addSchedule(taskIdNumber, scheduleInput, user?.id);
      setAddOpen(false);
      setScheduleInput(defaultSchedule);
      showToast('Schedule created', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create schedule failed', 'error');
    }
  };

  const openTaskEdit = () => {
    if (!task) return;
    setTaskName(task.name);
    setTaskDescription(task.description);
    setTaskAccessEmails(stringifyAccessEmails(task.accessEmails));
    setTaskType(task.type);
    setEditTaskOpen(true);
  };

  const saveTaskEdit = async () => {
    if (Number.isNaN(taskIdNumber)) return;
    try {
      await tasksApi.update(taskIdNumber, {
        name: taskName.trim(),
        description: taskDescription.trim(),
        accessEmails: parseAccessEmails(taskAccessEmails),
        type: taskType,
      });
      setEditTaskOpen(false);
      showToast('Task updated', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Task update failed', 'error');
    }
  };

  const openScheduleEdit = (schedule: Schedule) => {
    setScheduleToEdit(schedule);
    setEditScheduleInput({
      mode: schedule.mode === 'RECURRING' ? 'CRON' : schedule.mode,
      time: schedule.time,
      cronExpression: schedule.mode === 'CRON' ? schedule.cronExpression : '0 0 * * * *',
      date: schedule.date,
    });
  };

  const saveScheduleEdit = async () => {
    if (Number.isNaN(taskIdNumber) || !scheduleToEdit) return;
    try {
      await tasksApi.updateSchedule(taskIdNumber, scheduleToEdit.id, editScheduleInput, user?.id);
      setScheduleToEdit(null);
      showToast('Schedule updated', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Schedule update failed', 'error');
    }
  };

  const runTaskNow = async () => {
    if (!task) return;
    setRunningTask(true);
    try {
      const result = await tasksApi.run(task.id, user?.id);
      showToast(`Task ran (exit code ${result.exitCode})`, result.exitCode === 0 ? 'success' : 'warning');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Run failed', 'error');
    } finally {
      setRunningTask(false);
    }
  };

  const toggleTaskPause = async () => {
    if (!task) return;
    const schedules = task.schedules.filter((schedule) => schedule.status !== 'DELETED');
    if (schedules.length === 0) {
      showToast('Not Scheduled', 'info');
      return;
    }

    const shouldResume = schedules.every((schedule) => schedule.status === 'PAUSED');
    const targetStatus = shouldResume ? 'SCHEDULED' : 'PAUSED';
    const toUpdate = shouldResume
      ? schedules.filter((schedule) => schedule.status === 'PAUSED')
      : schedules.filter((schedule) => schedule.status === 'SCHEDULED');

    if (toUpdate.length === 0) {
      showToast(shouldResume ? 'Nothing to resume' : 'Nothing to pause', 'info');
      return;
    }

    setUpdatingTaskPause(true);
    try {
      await Promise.all(toUpdate.map((schedule) => tasksApi.updateScheduleStatus(task.id, schedule.id, targetStatus, user?.id)));
      showToast(shouldResume ? 'Task resumed' : 'Task paused', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update task schedules', 'error');
    } finally {
      setUpdatingTaskPause(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton height={48} />
        <Skeleton height={200} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!task) return <EmptyState title="Task not found" />;
  const activeSchedules = task.schedules.filter((schedule) => schedule.status !== 'DELETED');
  const isTaskPaused = activeSchedules.length > 0 && activeSchedules.every((schedule) => schedule.status === 'PAUSED');

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Task Details"
        subtitle="Inspect and control schedules for this task."
        actions={
          <Stack direction="row" spacing={1}>
            {canEdit ? (
              <Button variant="contained" startIcon={<BoltIcon />} disabled={runningTask} onClick={() => void runTaskNow()}>
                {runningTask ? 'Running...' : 'Run Now'}
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                variant="outlined"
                startIcon={isTaskPaused ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />}
                disabled={updatingTaskPause}
                onClick={() => void toggleTaskPause()}
              >
                {updatingTaskPause ? 'Updating...' : isTaskPaused ? 'Resume Task' : 'Pause Task'}
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openTaskEdit}>
                Edit Task
              </Button>
            ) : null}
            <Button variant="outlined" onClick={() => navigate(historyPath)}>
              History
            </Button>
            <Button variant="outlined" onClick={() => navigate(backPath)}>
              Back to Tasks
            </Button>
          </Stack>
        }
      />

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="subtitle1">{task.name}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="subtitle1">{task.description}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Type
              </Typography>
              <Chip label={task.type} size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <StatusChip status={task.status} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Created By
              </Typography>
              <Typography variant="subtitle2">{task.createdBy}</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Email List
              </Typography>
              <Typography variant="subtitle2">{task.accessEmails.join(', ') || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Schedules</Typography>
            {canEdit ? (
              <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setAddOpen(true)}>
                Add Schedule
              </Button>
            ) : null}
          </Stack>

          {task.schedules.length === 0 ? (
            <EmptyState title="No schedules yet" subtitle="Add a schedule to start execution." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mode</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Frequency / Date</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {task.schedules.map((schedule) => (
                  <TableRow key={schedule.id} hover>
                    <TableCell>{schedule.mode === 'NON_RECURRING' ? 'NON_RECURRING' : 'RECURRING'}</TableCell>
                    <TableCell>{schedule.mode === 'NON_RECURRING' ? formatTimeDisplay(schedule.time) : 'From expression'}</TableCell>
                    <TableCell>{schedule.mode === 'NON_RECURRING' ? formatDateDisplay(schedule.date) : schedule.cronExpression ?? 'N/A'}</TableCell>
                    <TableCell>{schedule.mode === 'NON_RECURRING' ? 'N/A' : new Date(schedule.nextRunAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusChip status={schedule.status} />
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <>
                          <IconButton onClick={() => openScheduleEdit(schedule)}>
                            <EditOutlinedIcon />
                          </IconButton>
                          <IconButton onClick={() => void toggleSchedule(schedule)}>
                            {schedule.status === 'PAUSED' ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />}
                          </IconButton>
                          <IconButton color="error" onClick={() => setScheduleToDelete(schedule)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <>
          <ConfirmDialog
            open={Boolean(scheduleToDelete)}
            title="Delete Schedule"
            description="This removes only the schedule; the parent task remains."
            confirmText="Delete"
            confirmColor="error"
            onClose={() => setScheduleToDelete(null)}
            onConfirm={() => void deleteSchedule()}
          />
          <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogContent>
              <Stack sx={{ mt: 1 }}>
                <ScheduleForm value={scheduleInput} onChange={setScheduleInput} />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => void addSchedule()}>
                Add
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog open={editTaskOpen} onClose={() => setEditTaskOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Edit Task</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Task Name" value={taskName} onChange={(event) => setTaskName(event.target.value)} />
                <TextField
                  label="Description"
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Email List (comma separated)"
                  value={taskAccessEmails}
                  onChange={(event) => setTaskAccessEmails(event.target.value)}
                />
                <TextField select label="Task Type" value={taskType} onChange={(event) => setTaskType(event.target.value as TaskType)}>
                  {[...new Set([...taskTypes, taskType])].map((typeOption) => (
                    <MenuItem key={typeOption} value={typeOption}>
                      {typeOption}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditTaskOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => void saveTaskEdit()}>
                Save
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog open={Boolean(scheduleToEdit)} onClose={() => setScheduleToEdit(null)} fullWidth maxWidth="sm">
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogContent>
              <Stack sx={{ mt: 1 }}>
                <ScheduleForm value={editScheduleInput} onChange={setEditScheduleInput} />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setScheduleToEdit(null)}>Cancel</Button>
              <Button variant="contained" onClick={() => void saveScheduleEdit()}>
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : null}
    </Stack>
  );
};
