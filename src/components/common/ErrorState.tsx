import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button, Paper, Stack, Typography } from '@mui/material';

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
  return (
    <Paper sx={{ p: 4, borderStyle: 'dashed', borderWidth: 1, borderColor: 'error.light' }}>
      <Stack spacing={1.5} alignItems="center">
        <ErrorOutlineIcon color="error" fontSize="large" />
        <Typography variant="subtitle1">Something went wrong</Typography>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        <Button variant="outlined" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Paper>
  );
};
