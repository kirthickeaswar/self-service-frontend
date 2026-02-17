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

const atLocalDateTime = (dateOnly: string, time: string) => {
  const { hours, minutes } = parseTime(time);
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const normalizeDaysOfWeek = (days: number[] | undefined) => {
  if (!days || days.length === 0) {
    return undefined;
  }
  return [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
};

const toDateOnlyComparable = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

const dayDiff = (a: Date, b: Date) => {
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((aUtc - bUtc) / 86400000);
};

const monthDiff = (a: Date, b: Date) => (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

const toWeekStart = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day);
  return copy;
};

const toReferenceStartDate = (schedule: CreateScheduleInput, reference: Date) => {
  const dateOnly = toDateOnly(schedule.startDate) || toLocalDateInput(reference);
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
};

const timeMatches = (candidate: Date, time: string) => {
  const { hours, minutes } = parseTime(time);
  return candidate.getHours() === hours && candidate.getMinutes() === minutes;
};

const withinDateRange = (candidate: Date, startDate: Date, endDateOnly: string | undefined) => {
  const candidateOnly = toDateOnlyComparable(candidate);
  if (candidateOnly < toDateOnlyComparable(startDate)) {
    return false;
  }
  if (endDateOnly && candidateOnly > endDateOnly) {
    return false;
  }
  return true;
};

const matchesRecurringRule = (candidate: Date, schedule: CreateScheduleInput, reference: Date) => {
  const frequency = schedule.frequency ?? 'DAILY';
  const interval = Math.max(1, schedule.interval ?? 1);
  const startDate = toReferenceStartDate(schedule, reference);
  const endDateOnly = toDateOnly(schedule.endDate);
  const selectedDays = normalizeDaysOfWeek(schedule.daysOfWeek);

  if (!withinDateRange(candidate, startDate, endDateOnly)) {
    return false;
  }

  if (frequency === 'MINUTELY') {
    const startMinutes = toMinutes(schedule.time);
    const currentMinutes = candidate.getHours() * 60 + candidate.getMinutes();
    const endMinutes = schedule.endTime ? toMinutes(schedule.endTime) : 1439;
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return false;
    }
    if ((currentMinutes - startMinutes) % interval !== 0) {
      return false;
    }
    return !selectedDays || selectedDays.includes(candidate.getDay());
  }

  if (frequency === 'HOURLY') {
    const startMinutes = toMinutes(schedule.time);
    const startHour = Math.floor(startMinutes / 60);
    const startMinute = startMinutes % 60;
    if (candidate.getMinutes() !== startMinute) {
      return false;
    }
    const endHour = schedule.endTime ? Math.floor(toMinutes(schedule.endTime) / 60) : 23;
    if (candidate.getHours() < startHour || candidate.getHours() > endHour) {
      return false;
    }
    if ((candidate.getHours() - startHour) % interval !== 0) {
      return false;
    }
    return !selectedDays || selectedDays.includes(candidate.getDay());
  }

  if (!timeMatches(candidate, schedule.time)) {
    return false;
  }

  if (selectedDays && !selectedDays.includes(candidate.getDay())) {
    return false;
  }

  if (frequency === 'DAILY') {
    const diff = dayDiff(candidate, startDate);
    return diff >= 0 && diff % interval === 0;
  }

  if (frequency === 'WEEKLY') {
    const weekDiff = Math.floor(dayDiff(toWeekStart(candidate), toWeekStart(startDate)) / 7);
    if (weekDiff < 0 || weekDiff % interval !== 0) {
      return false;
    }
    if (selectedDays && selectedDays.length > 0) {
      return selectedDays.includes(candidate.getDay());
    }
    return candidate.getDay() === startDate.getDay();
  }

  if (frequency === 'MONTHLY') {
    const diff = monthDiff(candidate, startDate);
    if (diff < 0 || diff % interval !== 0) {
      return false;
    }
    const targetDay = schedule.dayOfMonth ?? startDate.getDate();
    return candidate.getDate() === targetDay;
  }

  const yearDiff = candidate.getFullYear() - startDate.getFullYear();
  if (yearDiff < 0 || yearDiff % interval !== 0) {
    return false;
  }
  const targetMonth = (schedule.monthOfYear ?? startDate.getMonth() + 1) - 1;
  const targetDay = schedule.dayOfMonth ?? startDate.getDate();
  return candidate.getMonth() === targetMonth && candidate.getDate() === targetDay;
};

const nextRecurringRunAt = (schedule: CreateScheduleInput, reference: Date) => {
  const candidate = new Date(reference);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  const maxChecks = 60 * 24 * 366 * 3;
  for (let i = 0; i < maxChecks; i += 1) {
    if (matchesRecurringRule(candidate, schedule, reference)) {
      return candidate.toISOString();
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  throw new Error('Unable to determine next run for recurring schedule');
};

interface CronParts {
  seconds: Set<number>;
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>;
  domWildcard: boolean;
  dowWildcard: boolean;
}

const monthAliases: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const dayAliases: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const normalizeCronNumber = (value: number, kind: 'month' | 'day' | 'generic') => {
  if (kind === 'day' && value === 7) {
    return 0;
  }
  return value;
};

const parseCronValue = (
  token: string,
  min: number,
  max: number,
  aliases: Record<string, number> | undefined,
  kind: 'month' | 'day' | 'generic',
) => {
  const upper = token.trim().toUpperCase();
  if (!upper) {
    throw new Error('Empty cron token');
  }
  const aliasValue = aliases?.[upper];
  const numeric = aliasValue ?? Number(upper);
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid cron token "${token}"`);
  }
  const normalized = normalizeCronNumber(numeric, kind);
  if (normalized < min || normalized > max) {
    throw new Error(`Cron token out of range "${token}"`);
  }
  return normalized;
};

const addRangeWithStep = (target: Set<number>, start: number, end: number, step: number) => {
  if (step <= 0) {
    throw new Error('Cron step must be greater than 0');
  }
  if (start > end) {
    throw new Error('Cron range start must be <= end');
  }
  for (let value = start; value <= end; value += step) {
    target.add(value);
  }
};

const parseCronField = (
  field: string,
  min: number,
  max: number,
  aliases: Record<string, number> | undefined,
  kind: 'month' | 'day' | 'generic',
) => {
  const set = new Set<number>();
  const trimmed = field.trim();
  if (!trimmed) {
    throw new Error('Empty cron field');
  }

  const parts = trimmed.split(',');
  parts.forEach((part) => {
    const partTrimmed = part.trim();
    if (!partTrimmed) {
      throw new Error('Invalid cron list part');
    }

    const [left, stepRaw] = partTrimmed.split('/');
    const step = stepRaw ? Number(stepRaw) : 1;
    if (Number.isNaN(step) || step < 1) {
      throw new Error(`Invalid cron step "${stepRaw}"`);
    }

    const wildcard = left === '*' || left === '?';
    if (wildcard) {
      addRangeWithStep(set, min, max, step);
      return;
    }

    if (left.includes('-')) {
      const [startRaw, endRaw] = left.split('-');
      const start = parseCronValue(startRaw, min, max, aliases, kind);
      const end = parseCronValue(endRaw, min, max, aliases, kind);
      addRangeWithStep(set, start, end, step);
      return;
    }

    const single = parseCronValue(left, min, max, aliases, kind);
    set.add(single);
  });

  if (set.size === 0) {
    throw new Error('Cron field produced no values');
  }

  return set;
};

const parseCronExpression = (expression: string): CronParts => {
  const fields = expression
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (fields.length !== 5 && fields.length !== 6) {
    throw new Error('Cron expression must have 6 fields: second minute hour day-of-month month day-of-week (legacy 5-field also accepted)');
  }

  const [secondField, minuteField, hourField, domField, monthField, dowField] =
    fields.length === 6 ? fields : ['0', fields[0], fields[1], fields[2], fields[3], fields[4]];

  return {
    seconds: parseCronField(secondField, 0, 59, undefined, 'generic'),
    minutes: parseCronField(minuteField, 0, 59, undefined, 'generic'),
    hours: parseCronField(hourField, 0, 23, undefined, 'generic'),
    daysOfMonth: parseCronField(domField, 1, 31, undefined, 'generic'),
    months: parseCronField(monthField, 1, 12, monthAliases, 'month'),
    daysOfWeek: parseCronField(dowField, 0, 6, dayAliases, 'day'),
    domWildcard: domField === '*' || domField === '?',
    dowWildcard: dowField === '*' || dowField === '?',
  };
};

const matchesCron = (date: Date, parts: CronParts) => {
  const second = date.getSeconds();
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  if (!parts.seconds.has(second) || !parts.minutes.has(minute) || !parts.hours.has(hour) || !parts.months.has(month)) {
    return false;
  }

  const domMatches = parts.daysOfMonth.has(dayOfMonth);
  const dowMatches = parts.daysOfWeek.has(dayOfWeek);

  if (parts.domWildcard && parts.dowWildcard) {
    return true;
  }
  if (parts.domWildcard) {
    return dowMatches;
  }
  if (parts.dowWildcard) {
    return domMatches;
  }
  return domMatches || dowMatches;
};

const nextCronRunAt = (expression: string, reference: Date) => {
  const parts = parseCronExpression(expression);
  const candidate = new Date(reference);
  candidate.setMilliseconds(0);
  candidate.setSeconds(candidate.getSeconds() + 1);
  const sortedSeconds = [...parts.seconds].sort((a, b) => a - b);

  const maxMinuteChecks = 60 * 24 * 365 * 3;
  for (let i = 0; i < maxMinuteChecks; i += 1) {
    const minSecond = candidate.getSeconds();
    const nextSecond = sortedSeconds.find((value) => value >= minSecond);
    if (nextSecond !== undefined) {
      const withSecond = new Date(candidate);
      withSecond.setSeconds(nextSecond, 0);
      if (matchesCron(withSecond, parts)) {
        return withSecond.toISOString();
      }
    }
    candidate.setMinutes(candidate.getMinutes() + 1, 0, 0);
  }
  throw new Error('Unable to determine next run for cron expression');
};

export const toLocalDateInput = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toIsoDateStart = (dateOnly: string) => `${dateOnly}T00:00:00.000Z`;

export const calculateNextRunAt = (schedule: CreateScheduleInput, reference = new Date()) => {
  if (schedule.mode === 'CRON') {
    if (!schedule.cronExpression?.trim()) {
      throw new Error('Cron schedules require a cron expression');
    }
    try {
      return nextCronRunAt(schedule.cronExpression, reference);
    } catch {
      const fallback = new Date(reference);
      fallback.setMinutes(fallback.getMinutes() + 1, 0, 0);
      return fallback.toISOString();
    }
  }

  if (schedule.mode === 'NON_RECURRING') {
    const dateOnly = toDateOnly(schedule.date) || toLocalDateInput(reference);
    return atLocalDateTime(dateOnly, schedule.time).toISOString();
  }

  return nextRecurringRunAt(schedule, reference);
};

export const dateOnlyFromIsoOrDate = toDateOnly;

export const formatDateDisplay = (value: string | undefined) => {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return 'N/A';
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString();
};

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
  daysOfWeek?: number[],
  dayOfMonth?: number,
  monthOfYear?: number,
  startDate?: string,
  endDate?: string,
  endTime?: string,
) => {
  const safeFrequency = frequency ?? 'DAILY';
  const safeInterval = Math.max(1, interval ?? 1);
  const label = recurringLabels[safeFrequency];
  const parts: string[] = [];
  const every = safeInterval === 1 ? `Every ${label}` : `Every ${safeInterval} ${label}s`;
  parts.push(every);

  const normalizedDays = normalizeDaysOfWeek(daysOfWeek);
  if (normalizedDays && normalizedDays.length > 0) {
    parts.push(`on ${normalizedDays.map((day) => weekDayLabels[day]).join(', ')}`);
  }
  if (dayOfMonth && (safeFrequency === 'MONTHLY' || safeFrequency === 'YEARLY')) {
    parts.push(`day ${dayOfMonth}`);
  }
  if (monthOfYear && safeFrequency === 'YEARLY') {
    const monthDate = new Date(2000, monthOfYear - 1, 1);
    parts.push(`in ${monthDate.toLocaleString(undefined, { month: 'short' })}`);
  }
  if (startDate) {
    parts.push(`from ${formatDateDisplay(startDate)}`);
  }
  if (endDate) {
    parts.push(`until ${formatDateDisplay(endDate)}`);
  }
  if (endTime && (safeFrequency === 'MINUTELY' || safeFrequency === 'HOURLY')) {
    parts.push(`until ${formatTimeDisplay(endTime)}`);
  }
  return parts.join(' • ');
};

export const validateCronExpression = (expression: string) => {
  try {
    parseCronExpression(expression);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid cron expression';
  }
};
