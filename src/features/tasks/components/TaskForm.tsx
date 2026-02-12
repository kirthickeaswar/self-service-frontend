import { Alert, Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { CreateScheduleInput, CreateTaskInput, TaskType } from '@/types/domain';
import { parseAccessEmails } from '@/features/tasks/utils/access';
import { useTaskTypes } from '@/features/tasks/hooks/useTaskTypes';
import { ScheduleForm } from './ScheduleForm';

interface TaskFormProps {
  owner: string;
  submitting?: boolean;
  onSubmit: (payload: CreateTaskInput) => Promise<void>;
}

const defaultSchedule: CreateScheduleInput = {
  mode: 'RECURRING',
  time: '09:00',
  endTime: '18:00',
  interval: 1,
  frequency: 'DAILY',
};

export const TaskForm = ({ owner, submitting, onSubmit }: TaskFormProps) => {
  const { taskTypes } = useTaskTypes();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emailList, setEmailList] = useState('');
  const [type, setType] = useState<TaskType>('');
  const [includeSchedule, setIncludeSchedule] = useState(false);
  const [schedule, setSchedule] = useState<CreateScheduleInput>(defaultSchedule);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type && taskTypes.length > 0) {
      setType(taskTypes[0]);
    }
  }, [taskTypes, type]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !description.trim() || !type) {
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        accessEmails: parseAccessEmails(emailList),
        type,
        owner,
        schedule: includeSchedule ? schedule : undefined,
      });

      setName('');
      setDescription('');
      setEmailList('');
      setType(taskTypes[0] ?? '');
      setIncludeSchedule(false);
      setSchedule(defaultSchedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create task');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField label="Task Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            multiline
            minRows={3}
          />
          <TextField
            label="Email List (comma separated)"
            value={emailList}
            onChange={(event) => setEmailList(event.target.value)}
            helperText="Add emails that should have access to this task."
          />
          <TextField select label="Task Type" value={type} onChange={(event) => setType(event.target.value as TaskType)}>
            {taskTypes.map((taskType) => (
              <MenuItem key={taskType} value={taskType}>
                {taskType}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Checkbox checked={includeSchedule} onChange={(event) => setIncludeSchedule(event.target.checked)} />}
            label="Add initial schedule"
          />
          {includeSchedule ? <ScheduleForm value={schedule} onChange={setSchedule} /> : null}
          <Button type="submit" variant="contained" disabled={submitting}>
            Create Task
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
