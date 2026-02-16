import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Navigate, Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from '@/app/SnackbarContext';
import { useAuth } from '@/app/AuthContext';
import { tasksApi } from '@/features/tasks/api/tasksApi';

const passwordRules = {
  minLength: (value: string) => value.length >= 8,
  upper: (value: string) => /[A-Z]/.test(value),
  lower: (value: string) => /[a-z]/.test(value),
  number: (value: string) => /\d/.test(value),
  special: (value: string) => /[^A-Za-z0-9]/.test(value),
};

export const CreatePasswordPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useSnackbar();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(
    () => ({
      minLength: passwordRules.minLength(password),
      upper: passwordRules.upper(password),
      lower: passwordRules.lower(password),
      number: passwordRules.number(password),
      special: passwordRules.special(password),
    }),
    [password],
  );

  const canSubmit = Object.values(checks).every(Boolean) && password === confirmPassword && Boolean(email.trim());

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/overview' : '/app/dashboard'} replace />;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError('Please complete all password requirements and ensure both passwords match.');
      return;
    }
    setSubmitting(true);
    try {
      await tasksApi.createPassword(email.trim(), password);
      showToast('Password created successfully. Please sign in.', 'success');
      navigate(`/login?email=${encodeURIComponent(email.trim())}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent>
          <Stack spacing={2.5} component="form" onSubmit={submit}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Create Password</Typography>
              <Typography variant="body2" color="text.secondary">
                First-time sign in: set a secure password for your account.
              </Typography>
            </Stack>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <TextField
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
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

            <Button type="submit" variant="contained" disabled={submitting || !canSubmit}>
              {submitting ? 'Creating...' : 'Create Password'}
            </Button>
            <Button component={RouterLink} to="/login" variant="text">
              Back to Sign In
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
