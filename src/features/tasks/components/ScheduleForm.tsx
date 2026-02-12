import { MenuItem, Stack, TextField } from '@mui/material';
import { CreateScheduleInput } from '@/types/domain';
import { dateOnlyFromIsoOrDate, toIsoDateStart, toLocalDateInput } from '@/features/tasks/utils/schedule';

interface ScheduleFormProps {
  value: CreateScheduleInput;
  onChange: (value: CreateScheduleInput) => void;
}

export const ScheduleForm = ({ value, onChange }: ScheduleFormProps) => {
  const today = toLocalDateInput();

  return (
    <Stack spacing={2}>
      <TextField
        select
        label="Mode"
        value={value.mode}
        onChange={(event) =>
          onChange({
            ...value,
            mode: event.target.value as CreateScheduleInput['mode'],
            endTime: event.target.value === 'NON_RECURRING' ? undefined : value.endTime ?? '18:00',
            frequency: event.target.value === 'NON_RECURRING' ? undefined : value.frequency,
            date: event.target.value === 'RECURRING' ? undefined : value.date ?? toIsoDateStart(today),
          })
        }
      >
        <MenuItem value="RECURRING">Recurring</MenuItem>
        <MenuItem value="NON_RECURRING">Non-Recurring</MenuItem>
      </TextField>

      {value.mode === 'RECURRING' ? (
        <>
          <TextField
            label="Start Time"
            type="time"
            value={value.time}
            onChange={(event) => onChange({ ...value, time: event.target.value })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 60 }}
            helperText="Recurring start time"
          />
          <TextField
            label="End Time"
            type="time"
            value={value.endTime ?? '18:00'}
            onChange={(event) => onChange({ ...value, endTime: event.target.value })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 60 }}
            helperText="Recurring end time"
          />
          <TextField
            select
            label="Frequency"
            value={value.frequency ?? 'DAILY'}
            onChange={(event) => onChange({ ...value, frequency: event.target.value as CreateScheduleInput['frequency'] })}
          >
            <MenuItem value="DAILY">Daily</MenuItem>
            <MenuItem value="WEEKLY">Weekly</MenuItem>
            <MenuItem value="MONTHLY">Monthly</MenuItem>
          </TextField>
        </>
      ) : (
        <>
          <TextField
            label="Time"
            type="time"
            value={value.time}
            onChange={(event) => onChange({ ...value, time: event.target.value })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 60 }}
            helperText="One-time execution time"
          />
          <TextField
            label="Date"
            type="date"
            value={dateOnlyFromIsoOrDate(value.date) || today}
            onChange={(event) => onChange({ ...value, date: toIsoDateStart(event.target.value) })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: today }}
            helperText={`Today: ${today}`}
          />
        </>
      )}
    </Stack>
  );
};
