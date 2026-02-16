import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/app/AuthContext';
import { Role } from '@/types/domain';
import { LoginPage } from '@/pages/LoginPage';
import { CreatePasswordPage } from '@/pages/CreatePasswordPage';
import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage';
import { ClientTasksPage } from '@/pages/client/ClientTasksPage';
import { ClientTaskDetailsPage } from '@/pages/client/ClientTaskDetailsPage';
import { ClientCreateTaskPage } from '@/pages/client/ClientCreateTaskPage';
import { ClientTroubleshootPage } from '@/pages/client/ClientTroubleshootPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminTasksPage } from '@/pages/admin/AdminTasksPage';
import { AdminCreateTaskPage } from '@/pages/admin/AdminCreateTaskPage';
import { AdminTaskTypesPage } from '@/pages/admin/AdminTaskTypesPage';
import { AdminLogsPage } from '@/pages/admin/AdminLogsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';

const RequireAuth = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const RequireRole = ({ allow }: { allow: Role[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/overview' : '/app/dashboard'} replace />;
  }
  return <Outlet />;
};

const RedirectByRole = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin/overview' : '/app/dashboard'} replace />;
};

export const router = createBrowserRouter([
  { path: '/', element: <RedirectByRole /> },
  { path: '/redirect', element: <RedirectByRole /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/create-password', element: <CreatePasswordPage /> },
  { path: '/client/dashboard', element: <Navigate to="/app/dashboard" replace /> },
  { path: '/client/tasks', element: <Navigate to="/app/tasks" replace /> },
  { path: '/client/create-task', element: <Navigate to="/app/create-task" replace /> },
  { path: '/client/logs', element: <Navigate to="/app/logs" replace /> },
  { path: '/client/troubleshoot', element: <Navigate to="/app/logs" replace /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole allow={['EDITOR', 'VIEWER']} />,
        children: [
          {
            path: '/app',
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <ClientDashboardPage /> },
              { path: 'tasks', element: <ClientTasksPage /> },
              { path: 'tasks/:taskId', element: <ClientTaskDetailsPage /> },
              { path: 'create-task', element: <ClientCreateTaskPage /> },
              { path: 'logs', element: <ClientTroubleshootPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole allow={['ADMIN']} />,
        children: [
          {
            path: '/admin',
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: 'overview', element: <AdminOverviewPage /> },
              { path: 'tasks', element: <AdminTasksPage /> },
              { path: 'tasks/:taskId', element: <ClientTaskDetailsPage /> },
              { path: 'create-task', element: <AdminCreateTaskPage /> },
              { path: 'task-types', element: <AdminTaskTypesPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'logs', element: <AdminLogsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
