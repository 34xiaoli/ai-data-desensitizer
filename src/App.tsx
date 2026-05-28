import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Layout from './components/Layout';

/** 自定义主题 - 专业蓝灰色调 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#334e68',
      light: '#627d98',
      dark: '#243b53',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#829ab1',
      light: '#bcccdc',
      dark: '#486581',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"PingFang SC"',
      '"Microsoft YaHei"',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '0.8rem',
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout />
    </ThemeProvider>
  );
};

export default App;
