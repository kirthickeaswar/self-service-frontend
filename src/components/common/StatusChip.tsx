import { Chip } from '@mui/material';

const palette: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ERROR: 'error',
  NOT_SCHEDULED: 'default',
  DELETED: 'default',
  SCHEDULED: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
};

const labelMap: Record<string, string> = {
  NOT_SCHEDULED: 'Not Scheduled',
  DELETED: 'Deleted',
};

export const StatusChip = ({ status }: { status: string }) => {
  return <Chip size="small" label={labelMap[status] ?? status} color={palette[status] ?? 'default'} />;
};
