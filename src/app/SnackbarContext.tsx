import { Alert, Snackbar } from '@mui/material';
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
}

interface SnackbarContextValue {
  showToast: (message: string, severity?: ToastSeverity) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const value = useMemo(
    () => ({
      showToast: (message: string, severity: ToastSeverity = 'info') => {
        setToast({ open: true, message, severity });
      },
    }),
    [],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={2800}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          elevation={3}
          variant="filled"
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const value = useContext(SnackbarContext);
  if (!value) {
    throw new Error('useSnackbar must be used inside SnackbarProvider');
  }
  return value;
};
