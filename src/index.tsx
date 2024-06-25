import React from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';

// Create a theme for Material-UI components
const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Get the container element by id 'root'
const container = document.getElementById('root');

// Check if container is not null before rendering
if (container) {
  // Create a root for React rendering
  const root = createRoot(container);

  // Render the app within the root
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
} else {
  console.error("Element with id 'root' not found in the document.");
}
