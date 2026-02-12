import InboxIcon from '@mui/icons-material/Inbox';
import { Paper, Stack, Typography } from '@mui/material';

export const EmptyState = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <Paper sx={{ p: 4, borderStyle: 'dashed', borderWidth: 1, borderColor: 'divider' }}>
      <Stack spacing={1} alignItems="center">
        <InboxIcon color="disabled" fontSize="large" />
        <Typography variant="subtitle1">{title}</Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
};
