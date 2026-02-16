import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/AuthContext';
import { useSnackbar } from '@/app/SnackbarContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { tasksApi } from '@/features/tasks/api/tasksApi';
import { Role, User } from '@/types/domain';

const roleOptions: Role[] = ['VIEWER', 'EDITOR', 'ADMIN'];
const roleLabelMap: Record<Role, string> = {
  VIEWER: 'Viewer',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type PendingUserInput = {
  name: string;
  email: string;
  role: Role;
};

export const AdminUsersPage = () => {
  const { user } = useAuth();
  const { showToast } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [pendingAddUser, setPendingAddUser] = useState<PendingUserInput | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = emailRegex.test(normalizedEmail);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.users();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openAddUserConfirm = () => {
    if (!isEmailValid) {
      showToast('Please enter a valid email address (example: user@domain.com).', 'error');
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setPendingAddUser({
      name: trimmedName,
      email: normalizedEmail,
      role,
    });
  };

  const addUser = async () => {
    if (!pendingAddUser) return;
    setCreatingUser(true);
    try {
      await tasksApi.createUser(pendingAddUser);
      setName('');
      setEmail('');
      setRole('VIEWER');
      setPendingAddUser(null);
      await load();
      showToast('User created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to create user', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await tasksApi.deleteUser(deleteTarget.id, user?.id);
      setDeleteTarget(null);
      await load();
      showToast('User deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete user', 'error');
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Manage Users" subtitle="Create or delete users. New users will create their password at first login." />
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Grid container spacing={1.5} alignItems="flex-start">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label="Name" value={name} onChange={(event) => setName(event.target.value)} helperText=" " />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@domain.com"
                error={Boolean(email) && !isEmailValid}
                helperText={Boolean(email) && !isEmailValid ? 'Enter a valid email format: user@domain.com' : ' '}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Role"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                helperText=" "
              >
                {roleOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {roleLabelMap[option]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PersonAddAlt1Icon />}
                onClick={openAddUserConfirm}
                disabled={!name.trim() || !normalizedEmail || !isEmailValid}
                sx={{
                  height: 56,
                  mt: { xs: 0, md: '1px' },
                }}
              >
                Add User
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Existing Users
          </Typography>
          <DataTable
            rows={users}
            rowKey={(user) => user.id}
            columns={[
              { id: 'name', label: 'Name', render: (user: User) => user.name },
              { id: 'email', label: 'Email', render: (user: User) => user.email },
              {
                id: 'role',
                label: 'Role',
                render: (user: User) => roleLabelMap[user.role],
              },
              {
                id: 'actions',
                label: 'Actions',
                render: (user: User) => (
                  <IconButton color="error" onClick={() => setDeleteTarget(user)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        description={`Delete ${deleteTarget?.email ?? ''}?`}
        confirmText="Delete"
        confirmColor="error"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void deleteUser()}
      />

      <Dialog open={Boolean(pendingAddUser)} onClose={() => (creatingUser ? null : setPendingAddUser(null))} fullWidth maxWidth="xs">
        <DialogTitle>Confirm New User</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Please review the details before adding this user.
          </Typography>
          <Stack divider={<Divider flexItem />} spacing={1.2}>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography variant="caption" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body2">{pendingAddUser?.name ?? '-'}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body2">{pendingAddUser?.email ?? '-'}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography variant="caption" color="text.secondary">
                Role
              </Typography>
              <Typography variant="body2">{pendingAddUser ? roleLabelMap[pendingAddUser.role] : '-'}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAddUser(null)} disabled={creatingUser}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void addUser()} disabled={creatingUser}>
            {creatingUser ? 'Adding...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
