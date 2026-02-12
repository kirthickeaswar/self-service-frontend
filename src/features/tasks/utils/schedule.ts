import { CreateScheduleInput } from '@/types/domain';

const toDateOnly = (value: string | undefined) => {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
};

const parseTime = (time: string) => {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw ?? '0');
  const minutes = Number(minutesRaw ?? '0');
  return {
    hours: Number.isNaN(hours) ? 0 : hours,
    minutes: Number.isNaN(minutes) ? 0 : minutes,
  };
};

const toMinutes = (time: string) => {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
};

const atDateMinutes = (date: Date, totalMinutes: number) => {
  const candidate = new Date(date);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  candidate.setHours(hours, minutes, 0, 0);
  return candidate;
};

const addByFrequency = (date: Date, frequency: NonNullable<CreateScheduleInput['frequency']>, interval: number) => {
  const next = new Date(date);
  if (frequency === 'MINUTELY') {
    next.setMinutes(next.getMinutes() + interval);
  } else if (frequency === 'HOURLY') {
    next.setHours(next.getHours() + interval);
  } else if (frequency === 'DAILY') {
    next.setDate(next.getDate() + interval);
  } else if (frequency === 'WEEKLY') {
    next.setDate(next.getDate() + interval * 7);
  } else if (frequency === 'MONTHLY') {
    next.setMonth(next.getMonth() + interval);
  } else {
    next.setFullYear(next.getFullYear() + interval);
  }
  return next;
};

const atLocalDateTime = (dateOnly: string, time: string) => {
  const { hours, minutes } = parseTime(time);
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const toLocalDateInput = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toIsoDateStart = (dateOnly: string) => new Date(`${dateOnly}T00:00:00`).toISOString();

export const calculateNextRunAt = (schedule: CreateScheduleInput, reference = new Date()) => {
  if (schedule.mode === 'NON_RECURRING') {
    const dateOnly = toDateOnly(schedule.date) || toLocalDateInput(reference);
    return atLocalDateTime(dateOnly, schedule.time).toISOString();
  }

  const frequency = schedule.frequency ?? 'DAILY';
  const interval = Math.max(1, schedule.interval ?? 1);

  if ((frequency === 'MINUTELY' || frequency === 'HOURLY') && schedule.endTime) {
    const startMinutes = toMinutes(schedule.time);
    const endMinutes = toMinutes(schedule.endTime);
    const intervalMinutes = frequency === 'MINUTELY' ? interval : interval * 60;
    const nowMinutes = reference.getHours() * 60 + reference.getMinutes() + reference.getSeconds() / 60;

    if (nowMinutes < startMinutes) {
      return atDateMinutes(reference, startMinutes).toISOString();
    }

    const elapsed = nowMinutes - startMinutes;
    const step = Math.ceil(elapsed / intervalMinutes) * intervalMinutes;
    const nextMinutes = startMinutes + step;
    if (nextMinutes <= endMinutes) {
      return atDateMinutes(reference, nextMinutes).toISOString();
    }

    const tomorrow = new Date(reference);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return atDateMinutes(tomorrow, startMinutes).toISOString();
  }

  const candidate = atLocalDateTime(toLocalDateInput(reference), schedule.time);
  while (candidate <= reference) {
    const next = addByFrequency(candidate, frequency, interval);
    candidate.setTime(next.getTime());
  }
  return candidate.toISOString();
};

export const dateOnlyFromIsoOrDate = toDateOnly;

export const formatTimeDisplay = (time: string) => {
  if (!time) return '';
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw ?? '0');
  const minutes = Number(minutesRaw ?? '0');
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return time;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${normalizedHours}:${`${minutes}`.padStart(2, '0')} ${period}`;
};

const recurringLabels: Record<NonNullable<CreateScheduleInput['frequency']>, string> = {
  MINUTELY: 'minute',
  HOURLY: 'hour',
  DAILY: 'day',
  WEEKLY: 'week',
  MONTHLY: 'month',
  YEARLY: 'year',
};

export const formatRecurringRule = (
  frequency: CreateScheduleInput['frequency'],
  interval: number | undefined,
  endTime?: string,
) => {
  const safeFrequency = frequency ?? 'DAILY';
  const safeInterval = Math.max(1, interval ?? 1);
  const label = recurringLabels[safeFrequency];
  const every = safeInterval === 1 ? `Every ${label}` : `Every ${safeInterval} ${label}s`;
  if (endTime && (safeFrequency === 'MINUTELY' || safeFrequency === 'HOURLY')) {
    return `${every} until ${formatTimeDisplay(endTime)}`;
  }
  return every;
};
