import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { CreateScheduleInput } from '@/types/domain';
import { dateOnlyFromIsoOrDate, toIsoDateStart, toLocalDateInput } from '@/features/tasks/utils/schedule';

interface ScheduleFormProps {
  value: CreateScheduleInput;
  onChange: (value: CreateScheduleInput) => void;
}

export const ScheduleForm = ({ value, onChange }: ScheduleFormProps) => {
  const today = toLocalDateInput();
  const cronError = value.mode === 'CRON' && !value.cronExpression?.trim() ? 'Cron expression is required' : null;
  const cronParts = (() => {
    const parts = (value.cronExpression ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 5) {
      return parts;
    }
    return ['0', '*', '*', '*', '*'];
  })();

  const updateCronPart = (index: number, nextValue: string) => {
    const nextParts = [...cronParts];
    nextParts[index] = nextValue;
    onChange({ ...value, cronExpression: nextParts.join(' ') });
  };

  return (
    <Stack spacing={2}>
      <TextField
        select
        label="Mode"
        value={value.mode === 'RECURRING' ? 'CRON' : value.mode}
        onChange={(event) =>
          onChange({
            ...value,
            mode: event.target.value as CreateScheduleInput['mode'],
            time: event.target.value === 'CRON' ? '00:00' : value.time,
            cronExpression: event.target.value === 'CRON' ? value.cronExpression ?? '0 * * * *' : undefined,
            date: event.target.value === 'NON_RECURRING' ? value.date ?? toIsoDateStart(today) : undefined,
            endTime: undefined,
            interval: undefined,
            frequency: undefined,
            startDate: undefined,
            endDate: undefined,
            daysOfWeek: undefined,
            dayOfMonth: undefined,
            monthOfYear: undefined,
          })
        }
      >
        <MenuItem value="CRON">Recurring</MenuItem>
        <MenuItem value="NON_RECURRING">Non-Recurring</MenuItem>
      </TextField>

      {value.mode === 'NON_RECURRING' ? (
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
      ) : (
        <Stack spacing={1.5}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Minute" value={cronParts[0]} onChange={(event) => updateCronPart(0, event.target.value)}>
                <MenuItem value="*">Every minute (*)</MenuItem>
                <MenuItem value="*/5">Every 5 minutes</MenuItem>
                <MenuItem value="*/10">Every 10 minutes</MenuItem>
                <MenuItem value="*/15">Every 15 minutes</MenuItem>
                <MenuItem value="0">At minute 0</MenuItem>
                <MenuItem value="30">At minute 30</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label="Hour" value={cronParts[1]} onChange={(event) => updateCronPart(1, event.target.value)}>
                <MenuItem value="*">Every hour (*)</MenuItem>
                <MenuItem value="*/2">Every 2 hours</MenuItem>
                <MenuItem value="*/3">Every 3 hours</MenuItem>
                <MenuItem value="9">09:00</MenuItem>
                <MenuItem value="18">18:00</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Day of Month"
                value={cronParts[2]}
                onChange={(event) => updateCronPart(2, event.target.value)}
              >
                <MenuItem value="*">Every day (*)</MenuItem>
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="15">15</MenuItem>
                <MenuItem value="28">28</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="Month" value={cronParts[3]} onChange={(event) => updateCronPart(3, event.target.value)}>
                <MenuItem value="*">Every month (*)</MenuItem>
                <MenuItem value="1">January</MenuItem>
                <MenuItem value="4">April</MenuItem>
                <MenuItem value="7">July</MenuItem>
                <MenuItem value="10">October</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Day of Week"
                value={cronParts[4]}
                onChange={(event) => updateCronPart(4, event.target.value)}
              >
                <MenuItem value="*">Any day (*)</MenuItem>
                <MenuItem value="1-5">Mon-Fri</MenuItem>
                <MenuItem value="1">Monday</MenuItem>
                <MenuItem value="6">Saturday</MenuItem>
                <MenuItem value="0">Sunday</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Typography variant="caption" color={cronError ? 'error.main' : 'text.secondary'}>
            {cronError ? cronError : `Generated Cron: ${cronParts.join(' ')}`}
          </Typography>
          <TextField
            label="Cron Expression (manual edit)"
            value={value.cronExpression ?? ''}
            onChange={(event) => onChange({ ...value, cronExpression: event.target.value })}
            error={Boolean(cronError)}
            helperText="You can also edit the generated cron directly."
            placeholder="e.g., */15 9-18 * * 1-5"
          />
        </Stack>
      )}
    </Stack>
  );
};
