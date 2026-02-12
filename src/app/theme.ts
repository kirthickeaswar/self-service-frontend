import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6f8fb4',
    },
    secondary: {
      main: '#8eb1d8',
    },
    text: {
      primary: '#e8edf6',
      secondary: '#9ca8bb',
    },
    background: {
      default: '#0f141c',
      paper: '#161d28',
    },
    divider: 'rgba(148, 163, 184, 0.18)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(1000px 600px at 0% 0%, rgba(111, 143, 180, 0.14) 0%, rgba(15, 20, 28, 1) 55%), radial-gradient(800px 500px at 100% 0%, rgba(142, 177, 216, 0.10) 0%, rgba(15, 20, 28, 1) 60%), #0f141c',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.12) 100%)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#121925',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(18, 25, 37, 0.72)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#c5d2e2',
        },
      },
    },
  },
});
