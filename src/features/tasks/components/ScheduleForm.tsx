import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { CreateScheduleInput } from '@/types/domain';
import {
  cronExpressionToNaturalLanguage,
  dateOnlyFromIsoOrDate,
  toIsoDateStart,
  toLocalDateInput,
  validateCronExpression,
} from '@/features/tasks/utils/schedule';

interface ScheduleFormProps {
  value: CreateScheduleInput;
  onChange: (value: CreateScheduleInput) => void;
}

export const ScheduleForm = ({ value, onChange }: ScheduleFormProps) => {
  const today = toLocalDateInput();
  const cronError =
    value.mode === 'CRON'
      ? !value.cronExpression?.trim()
        ? 'Cron expression is required'
        : validateCronExpression(value.cronExpression)
      : null;
  const cronParts = (() => {
    const raw = (value.cronExpression ?? '').replace(/[\t\r\n]/g, ' ');
    const hasExplicitEmptyField = raw.startsWith(' ') || raw.endsWith(' ') || raw.includes('  ');
    const parsed =
      hasExplicitEmptyField ? raw.split(' ') : raw.trim() ? raw.trim().split(/\s+/) : [];
    const normalized = (parsed.length === 6 ? parsed.slice(1, 6) : parsed.slice(0, 5)).map((part) => part ?? '');
    while (normalized.length < 5) {
      normalized.push('');
    }
    return normalized;
  })();

  const updateCronPart = (index: number, nextValue: string) => {
    const nextParts = [...cronParts];
    nextParts[index] = nextValue.replace(/\s+/g, '');
    onChange({ ...value, cronExpression: nextParts.join(' ') });
  };

  const cronNaturalLanguage =
    value.mode === 'CRON' && value.cronExpression?.trim() && !cronError
      ? cronExpressionToNaturalLanguage(value.cronExpression)
      : null;

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
              <TextField
                fullWidth
                label="Minute"
                value={cronParts[0]}
                onChange={(event) => updateCronPart(0, event.target.value)}
                placeholder="* | */5 | 0,15,30,45 | 0-59"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Hour"
                value={cronParts[1]}
                onChange={(event) => updateCronPart(1, event.target.value)}
                placeholder="* | */2 | 9-18 | 0-23"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Day of Month"
                value={cronParts[2]}
                onChange={(event) => updateCronPart(2, event.target.value)}
                placeholder="* | 1,15 | 1-31"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Month"
                value={cronParts[3]}
                onChange={(event) => updateCronPart(3, event.target.value)}
                placeholder="* | 1,4,7,10 | JAN,APR"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Day of Week"
                value={cronParts[4]}
                onChange={(event) => updateCronPart(4, event.target.value)}
                placeholder="* | 1-5 | MON-FRI | 0,6"
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Format: minute hour day-of-month month day-of-week. Supports lists (,), ranges (-), steps (/), and aliases (JAN-DEC, MON-SUN).
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ranges: minute (0-59), hour (0-23), day-of-month (1-31), month (1-12), day-of-week (0-6).
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Examples: * * * * * (every minute), 0 * * * * (hourly), 0 0 * * FRI (Friday midnight).
          </Typography>
          <Typography variant="caption" color={cronError ? 'error.main' : 'text.secondary'}>
            {cronError ? cronError : `Generated Cron: ${cronParts.join(' ')}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cronNaturalLanguage ? `Natural Language: ${cronNaturalLanguage}` : 'Natural Language: N/A'}
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
