import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  confirmColor?: 'error' | 'primary';
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  confirmLoadingText?: string;
  disableClose?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText = 'Confirm',
  confirmColor = 'primary',
  confirmDisabled = false,
  confirmLoading = false,
  confirmLoadingText,
  disableClose = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={disableClose ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={disableClose || confirmLoading}>
          Cancel
        </Button>
        <Button color={confirmColor} variant="contained" onClick={onConfirm} disabled={confirmDisabled || confirmLoading}>
          {confirmLoading ? confirmLoadingText ?? `${confirmText}...` : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
