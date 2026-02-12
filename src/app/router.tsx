import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage';
import { ClientTasksPage } from '@/pages/client/ClientTasksPage';
import { ClientTaskDetailsPage } from '@/pages/client/ClientTaskDetailsPage';
import { ClientCreateTaskPage } from '@/pages/client/ClientCreateTaskPage';
import { ClientTroubleshootPage } from '@/pages/client/ClientTroubleshootPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminTasksPage } from '@/pages/admin/AdminTasksPage';
import { AdminLogsPage } from '@/pages/admin/AdminLogsPage';
import { AccessControlPage } from '@/pages/admin/AccessControlPage';
import { AdminCreateTaskPage } from '@/pages/admin/AdminCreateTaskPage';

const LandingPage = () => (
  <Stack sx={{ minHeight: '100vh', px: 2, py: 6 }} alignItems="center" justifyContent="center">
    <Stack spacing={3} sx={{ width: '100%', maxWidth: 860 }}>
      <Stack spacing={1} textAlign="center">
        <Typography variant="h4">Spectrum Self-Service</Typography>
        <Typography color="text.secondary">Choose a portal to continue.</Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Client Portal</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your own tasks, schedules, troubleshooting, and logs.
                </Typography>
                <Button variant="contained" href="/client/dashboard">
                  Open Client Portal
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Admin Portal</Typography>
                <Typography variant="body2" color="text.secondary">
                  Operate all users' tasks, logs, and access controls.
                </Typography>
                <Button variant="contained" href="/admin/overview">
                  Open Admin Portal
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  </Stack>
);

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    path: '/client',
    element: <AppShell />,
    children: [
      { path: 'dashboard', element: <ClientDashboardPage /> },
      { path: 'tasks', element: <ClientTasksPage /> },
      { path: 'tasks/:taskId', element: <ClientTaskDetailsPage /> },
      { path: 'create-task', element: <ClientCreateTaskPage /> },
      { path: 'troubleshoot', element: <ClientTroubleshootPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AppShell />,
    children: [
      { path: 'overview', element: <AdminOverviewPage /> },
      { path: 'tasks', element: <AdminTasksPage /> },
      { path: 'create-task', element: <AdminCreateTaskPage /> },
      { path: 'tasks/:taskId', element: <ClientTaskDetailsPage /> },
      { path: 'logs', element: <AdminLogsPage /> },
    ],
  },
]);
