import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { Alert, Button, Card, CardContent, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
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

export const AdminUsersPage = () => {
  const { showToast } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

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

  const addUser = async () => {
    try {
      await tasksApi.createUser({ name, email, role });
      setName('');
      setEmail('');
      setRole('VIEWER');
      await load();
      showToast('User created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to create user', 'error');
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await tasksApi.deleteUser(deleteTarget.id);
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <TextField select label="Role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {roleOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {roleLabelMap[option]}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => void addUser()}
              disabled={!name.trim() || !email.trim()}
            >
              Add User
            </Button>
          </Stack>
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
    </Stack>
  );
};
