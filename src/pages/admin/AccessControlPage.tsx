import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { PageHeader } from '@/components/common/PageHeader';

const modules = [
  { module: 'Dashboard', admin: true, client: true },
  { module: 'Tasks List', admin: true, client: true },
  { module: 'Create Task', admin: false, client: true },
  { module: 'Troubleshoot', admin: false, client: true },
  { module: 'Admin Overview', admin: true, client: false },
  { module: 'All Tasks', admin: true, client: false },
  { module: 'Admin Logs', admin: true, client: false },
  { module: 'Access Control', admin: true, client: false },
];

const renderAccess = (enabled: boolean) =>
  enabled ? <Chip icon={<CheckCircleOutlineIcon />} label="Allowed" color="success" size="small" /> : <Chip label="Restricted" size="small" />;

export const AccessControlPage = () => {
  return (
    <Stack spacing={3}>
      <PageHeader title="Access Control" subtitle="Week-1 static role/module visibility matrix." />

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Roles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Admin and Client roles are controlled by mock role switcher in the top bar.
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Module</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Client</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((item) => (
                <TableRow key={item.module} hover>
                  <TableCell>{item.module}</TableCell>
                  <TableCell>{renderAccess(item.admin)}</TableCell>
                  <TableCell>{renderAccess(item.client)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
};
