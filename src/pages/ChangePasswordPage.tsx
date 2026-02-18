import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { useSnackbar } from '@/app/SnackbarContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';

const passwordRules = {
  minLength: (value: string) => value.length >= 8,
  upper: (value: string) => /[A-Z]/.test(value),
  lower: (value: string) => /[a-z]/.test(value),
  number: (value: string) => /\d/.test(value),
  special: (value: string) => /[^A-Za-z0-9]/.test(value),
};

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useSnackbar();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(
    () => ({
      minLength: passwordRules.minLength(newPassword),
      upper: passwordRules.upper(newPassword),
      lower: passwordRules.lower(newPassword),
      number: passwordRules.number(newPassword),
      special: passwordRules.special(newPassword),
    }),
    [newPassword],
  );

  const canSubmit =
    Boolean(user?.username) &&
    Boolean(currentPassword.trim()) &&
    Object.values(checks).every(Boolean) &&
    newPassword === confirmNewPassword &&
    currentPassword !== newPassword;
  const passwordsMismatch = Boolean(confirmNewPassword) && newPassword !== confirmNewPassword;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const backPath = location.pathname.startsWith('/admin') ? '/admin/overview' : '/app/dashboard';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError('Passwords not matching.');
      return;
    }

    if (!canSubmit) {
      setError('Please complete all requirements.');
      return;
    }

    setSubmitting(true);
    try {
      await tasksApi.changePassword(user.username, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Password changed successfully.', 'success');
      navigate(backPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', p: { xs: 1, md: 2 } }}>
      <Card
        sx={{
          width: '100%',
          maxWidth: 540,
          borderColor: 'rgba(148, 163, 184, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2.6} component="form" onSubmit={submit}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Chip size="small" label="Security" variant="outlined" />
                <Chip size="small" color="primary" label="Password Update" />
              </Stack>
              <Typography variant="h5">Change Password</Typography>
              <Typography variant="body2" color="text.secondary">
                Update your account password securely.
              </Typography>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField label="Email" value={user.username} InputProps={{ readOnly: true }} />

            <TextField
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => setShowCurrentPassword((prev) => !prev)}>
                      {showCurrentPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => setShowNewPassword((prev) => !prev)}>
                      {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
              error={passwordsMismatch}
              helperText={passwordsMismatch ? 'Passwords not matching.' : ' '}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => setShowConfirmPassword((prev) => !prev)}>
                      {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" component="div">
                Use at least 8 characters with upper, lower, number, and special character.
              </Typography>
              <Typography variant="caption" component="div" color={checks.minLength ? 'success.main' : 'text.secondary'}>
                • At least 8 characters
              </Typography>
              <Typography variant="caption" component="div" color={checks.upper ? 'success.main' : 'text.secondary'}>
                • One uppercase letter
              </Typography>
              <Typography variant="caption" component="div" color={checks.lower ? 'success.main' : 'text.secondary'}>
                • One lowercase letter
              </Typography>
              <Typography variant="caption" component="div" color={checks.number ? 'success.main' : 'text.secondary'}>
                • One number
              </Typography>
              <Typography variant="caption" component="div" color={checks.special ? 'success.main' : 'text.secondary'}>
                • One special character
              </Typography>
            </Alert>

            <Divider />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate(backPath)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={submitting || !canSubmit}>
                {submitting ? 'Updating...' : 'Update Password'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
