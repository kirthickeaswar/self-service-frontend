import MenuIcon from '@mui/icons-material/Menu';
import TimelineIcon from '@mui/icons-material/Timeline';
import DescriptionIcon from '@mui/icons-material/Description';
import AddTaskIcon from '@mui/icons-material/AddTask';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CategoryIcon from '@mui/icons-material/Category';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const drawerWidth = 260;

interface MenuLink {
  label: string;
  path: string;
  icon: ReactNode;
}

const clientLinks: MenuLink[] = [
  { label: 'Dashboard', path: '/client/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Tasks', path: '/client/tasks', icon: <AssignmentIcon fontSize="small" /> },
  { label: 'Create Task', path: '/client/create-task', icon: <AddTaskIcon fontSize="small" /> },
  { label: 'Logs', path: '/client/logs', icon: <DescriptionIcon fontSize="small" /> },
];

const adminLinks: MenuLink[] = [
  { label: 'Admin Overview', path: '/admin/overview', icon: <DashboardIcon fontSize="small" /> },
  { label: 'All Tasks', path: '/admin/tasks', icon: <AssignmentIcon fontSize="small" /> },
  { label: 'Create Task', path: '/admin/create-task', icon: <AddTaskIcon fontSize="small" /> },
  { label: 'Task Types', path: '/admin/task-types', icon: <CategoryIcon fontSize="small" /> },
  { label: 'Logs', path: '/admin/logs', icon: <DescriptionIcon fontSize="small" /> },
];

export const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const links = useMemo(() => (isAdminRoute ? adminLinks : clientLinks), [isAdminRoute]);

  const drawerContent = (
    <Box sx={{ px: 2, py: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1, py: 1.5 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <TimelineIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Spectrum
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Self-Service Utility
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
        {isAdminRoute ? 'Admin Modules' : 'Client Modules'}
      </Typography>
      <List disablePadding>
        {links.map((link) => {
          const selected = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
          return (
            <ListItemButton
              key={link.path}
              selected={selected}
              onClick={() => {
                navigate(link.path);
                setMobileOpen(false);
              }}
              sx={{ mb: 0.5, borderRadius: 2 }}
            >
              <ListItemIcon>{link.icon}</ListItemIcon>
              <ListItemText primary={link.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        color="transparent"
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton sx={{ display: { md: 'none' } }} onClick={() => setMobileOpen((prev) => !prev)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              {isAdminRoute ? 'Admin Dashboard' : 'Client Dashboard'}
            </Typography>
          </Stack>

          <MenuItem
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 0.75 }}
            onClick={() => navigate(isAdminRoute ? '/client/dashboard' : '/admin/overview')}
          >
            {isAdminRoute ? 'Open Client Portal' : 'Open Admin Portal'}
          </MenuItem>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #e5e7eb' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
