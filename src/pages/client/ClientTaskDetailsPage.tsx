import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
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
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusChip } from '@/components/common/StatusChip';
import { useSnackbar } from '@/app/SnackbarContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { ScheduleForm } from '@/features/tasks/components/ScheduleForm';
import { useTaskTypes } from '@/features/tasks/hooks/useTaskTypes';
import { parseAccessEmails, stringifyAccessEmails } from '@/features/tasks/utils/access';
import { formatRecurringRule, formatTimeDisplay } from '@/features/tasks/utils/schedule';
import { CreateScheduleInput, Schedule, Task, TaskType } from '@/types/domain';

const defaultSchedule: CreateScheduleInput = {
  mode: 'RECURRING',
  time: '10:00',
  endTime: '18:00',
  interval: 1,
  frequency: 'DAILY',
};

export const ClientTaskDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId } = useParams();
  const taskIdNumber = Number(taskId);
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
  const [taskAdditionalAccessEmails, setTaskAdditionalAccessEmails] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('T1');
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);
  const [editScheduleInput, setEditScheduleInput] = useState<CreateScheduleInput>(defaultSchedule);
  const isAdminView = location.pathname.startsWith('/admin');
  const backPath = isAdminView ? '/admin/tasks' : '/client/tasks';

  const load = async () => {
    if (!taskId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (Number.isNaN(taskIdNumber)) {
        throw new Error('Invalid task id');
      }
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
    const next = schedule.status === 'PAUSED' ? 'SCHEDULED' : 'PAUSED';
    try {
      await tasksApi.updateScheduleStatus(taskIdNumber, schedule.id, next);
      showToast(`Schedule ${next === 'PAUSED' ? 'paused' : 'resumed'}`, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const deleteSchedule = async () => {
    if (Number.isNaN(taskIdNumber) || !scheduleToDelete) return;
    try {
      await tasksApi.deleteSchedule(taskIdNumber, scheduleToDelete.id);
      showToast('Schedule removed. Task remains active.', 'success');
      setScheduleToDelete(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const addSchedule = async () => {
    if (Number.isNaN(taskIdNumber)) return;
    try {
      await tasksApi.addSchedule(taskIdNumber, scheduleInput);
      showToast('Schedule created', 'success');
      setAddOpen(false);
      setScheduleInput(defaultSchedule);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create schedule failed', 'error');
    }
  };

  const openTaskEdit = () => {
    if (!task) return;
    setTaskName(task.name);
    setTaskDescription(task.description);
    setTaskAdditionalAccessEmails(
      stringifyAccessEmails(task.accessEmails.filter((email) => email.trim().toLowerCase() !== task.owner.trim().toLowerCase())),
    );
    setTaskType(task.type);
    setEditTaskOpen(true);
  };

  const saveTaskEdit = async () => {
    if (Number.isNaN(taskIdNumber)) return;
    try {
      const accessEmails = parseAccessEmails(taskAdditionalAccessEmails);
      await tasksApi.update(taskIdNumber, {
        name: taskName.trim(),
        description: taskDescription.trim(),
        accessEmails,
        type: taskType,
      });
      showToast('Task updated successfully', 'success');
      setEditTaskOpen(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Task update failed', 'error');
    }
  };

  const openScheduleEdit = (schedule: Schedule) => {
    setScheduleToEdit(schedule);
    setEditScheduleInput({
      mode: schedule.mode,
      time: schedule.time,
      endTime: schedule.endTime,
      interval: schedule.interval,
      frequency: schedule.frequency,
      date: schedule.date,
    });
  };

  const saveScheduleEdit = async () => {
    if (Number.isNaN(taskIdNumber) || !scheduleToEdit) return;
    try {
      await tasksApi.updateSchedule(taskIdNumber, scheduleToEdit.id, editScheduleInput);
      showToast('Schedule updated successfully', 'success');
      setScheduleToEdit(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Schedule update failed', 'error');
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton height={48} width={320} />
        <Skeleton height={200} />
        <Skeleton height={260} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!task) {
    return <EmptyState title="Task not found" />;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Task Details"
        subtitle="Inspect and control schedules for this task."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openTaskEdit}>
              Edit Task
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
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Created By
              </Typography>
              <Typography variant="subtitle2">{task.owner}</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary">
                Email List
              </Typography>
              <Typography variant="subtitle2">{task.accessEmails.join(', ')}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(task.createdAt).toLocaleString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Updated: {new Date(task.updatedAt).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Schedules</Typography>
            <Button startIcon={<AddCircleOutlineIcon />} variant="contained" onClick={() => setAddOpen(true)}>
              Add Schedule
            </Button>
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
                    <TableCell>{schedule.mode}</TableCell>
                    <TableCell>
                      {schedule.mode === 'RECURRING' && (schedule.frequency === 'MINUTELY' || schedule.frequency === 'HOURLY') && schedule.endTime
                        ? `${formatTimeDisplay(schedule.time)} - ${formatTimeDisplay(schedule.endTime ?? schedule.time)}`
                        : formatTimeDisplay(schedule.time)}
                    </TableCell>
                    <TableCell>
                      {schedule.mode === 'RECURRING'
                        ? formatRecurringRule(schedule.frequency, schedule.interval, schedule.endTime)
                        : new Date(schedule.date ?? '').toLocaleDateString()}
                    </TableCell>
                    <TableCell>{schedule.mode === 'NON_RECURRING' ? 'N/A' : new Date(schedule.nextRunAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusChip status={schedule.status} />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => openScheduleEdit(schedule)}>
                        <EditOutlinedIcon />
                      </IconButton>
                      <IconButton onClick={() => void toggleSchedule(schedule)}>
                        {schedule.status === 'PAUSED' ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />}
                      </IconButton>
                      <IconButton color="error" onClick={() => setScheduleToDelete(schedule)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            <Typography variant="body2" color="text.secondary">
              Update task name, description, and type.
            </Typography>
            <Alert severity="info">Task owner and status are managed separately.</Alert>
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
              value={taskAdditionalAccessEmails}
              onChange={(event) => setTaskAdditionalAccessEmails(event.target.value)}
              helperText="Add emails that should have access to this task."
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
          <Button
            variant="contained"
            disabled={!taskName.trim() || !taskDescription.trim()}
            onClick={() => void saveTaskEdit()}
          >
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
    </Stack>
  );
};
