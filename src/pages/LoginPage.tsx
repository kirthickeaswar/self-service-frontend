import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';

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
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/overview' : '/app/dashboard'} replace />;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/redirect', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (shouldRedirectToCreatePassword(message)) {
        navigate(`/create-password?email=${encodeURIComponent(email)}`, { replace: true });
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack spacing={2.5} component="form" onSubmit={submit}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Spectrum Login</Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in with email and password.
              </Typography>
            </Stack>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
            <Button variant="text" onClick={() => navigate(`/create-password?email=${encodeURIComponent(email)}`)}>
              First time user? Create password
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
