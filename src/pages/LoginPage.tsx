import { Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { isApiError } from '@/features/api/httpClient';
import { tasksApi } from '@/features/tasks/api/tasksApi';

const shouldRedirectToCreatePassword = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('password not set') ||
    normalized.includes('create password') ||
    normalized.includes('set password') ||
    normalized.includes('first login') ||
    normalized.includes('initial password')
  );
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const [username, setUsername] = useState(searchParams.get('email') ?? '');
  const [step, setStep] = useState<'USERNAME' | 'PASSWORD'>('USERNAME');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/overview' : '/app/dashboard'} replace />;
  }

  const goNext = async () => {
    const normalized = username.trim();
    if (!normalized) return;
    setError(null);
    setSubmitting(true);
    try {
      try {
        const exists = await tasksApi.userExistsByEmail(normalized);
        if (!exists) {
          setError('User does not exist. Please contact admin.');
          return;
        }
      } catch {
        // If users endpoint is unavailable before auth, continue with login probe fallback.
      }

      const stage = await tasksApi.probeLogin(normalized);
      if (stage === 'SET_PASSWORD') {
        navigate(`/create-password?email=${encodeURIComponent(normalized)}`, { replace: true });
        return;
      }
      if (stage === 'USER_NOT_FOUND') {
        setError('User does not exist. Please contact admin.');
        return;
      }
      setStep('PASSWORD');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to continue';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 'USERNAME') {
      await goNext();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/redirect', { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 403 && err.data?.requiresPasswordSetup) {
        const emailForSetup = err.data.email || username.trim();
        navigate(`/create-password?email=${encodeURIComponent(emailForSetup)}`, { replace: true });
        return;
      }
      const message = err instanceof Error ? err.message : 'Login failed';
      if (shouldRedirectToCreatePassword(message)) {
        navigate(`/create-password?email=${encodeURIComponent(username.trim())}`, { replace: true });
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card
        sx={{
          width: '100%',
          maxWidth: 460,
          borderColor: 'rgba(148, 163, 184, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2.75} component="form" onSubmit={signIn}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Chip size="small" label="Secure Access" variant="outlined" />
                <Chip size="small" color="primary" label={step === 'USERNAME' ? 'Step 1 of 2' : 'Step 2 of 2'} />
              </Stack>
              <Typography variant="h5">Spectrum Login</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                {step === 'USERNAME' ? 'Enter your email and continue to authentication.' : 'Enter your password to complete sign in.'}
              </Typography>
            </Stack>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Email"
              type="email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              InputProps={{ readOnly: step === 'PASSWORD' }}
              helperText={step === 'PASSWORD' ? 'Use Back to change email.' : 'Use your registered email.'}
            />
            {step === 'PASSWORD' ? (
              <>
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Stack spacing={1.25}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={submitting || !password.trim()}
                  >
                    {submitting ? 'Signing in...' : 'Sign in'}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setStep('USERNAME');
                      setPassword('');
                      setError(null);
                    }}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                </Stack>
              </>
            ) : (
              <Button type="submit" variant="contained" size="large" fullWidth disabled={submitting || !username.trim()}>
                {submitting ? 'Checking...' : 'Next'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
