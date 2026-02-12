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

  const { hours, minutes } = parseTime(schedule.time);
  const candidate = new Date(reference);
  candidate.setHours(hours, minutes, 0, 0);

  const frequency = schedule.frequency ?? 'DAILY';
  if (candidate <= reference) {
    if (frequency === 'WEEKLY') {
      candidate.setDate(candidate.getDate() + 7);
    } else if (frequency === 'MONTHLY') {
      candidate.setMonth(candidate.getMonth() + 1);
    } else {
      candidate.setDate(candidate.getDate() + 1);
    }
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
