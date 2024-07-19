// App.tsx
import React, { useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import {
  Button,
  Typography,
  Box,
  CircularProgress,
  IconButton,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { styled } from "@mui/system";
import WaveformViewer from "./components/WaveformViewer";
import { parseVCD } from "./utils/vcdParser";

const StyledBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#121212" : "#f5f5f7",
  color: theme.palette.mode === "dark" ? "#ffffff" : "#1d1d1f",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif",
}));

const App: React.FC = () => {
  const [waveform, setWaveform] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
        },
      }),
    [darkMode],
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const contents = e.target?.result as string;
        const parsedData = await parseVCD(contents);
        console.log("Parsed VCD data:", parsedData);
        setWaveform(parsedData);
        setLoading(false);
      };
      reader.readAsText(file);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StyledBox
        sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            VCD Waveform Viewer
          </Typography>
          <Box>
            <Button
              variant="contained"
              component="label"
              sx={{
                mr: 2,
                textTransform: "none",
                fontWeight: 500,
                bgcolor: theme.palette.mode === "dark" ? "#3a3a3c" : "#007aff",
                "&:hover": {
                  bgcolor:
                    theme.palette.mode === "dark" ? "#4a4a4c" : "#0056b3",
                },
              }}
            >
              Upload VCD File
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
                accept=".vcd"
              />
            </Button>
            <IconButton sx={{ ml: 1 }} onClick={toggleDarkMode} color="inherit">
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
        </Box>
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexGrow: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {!loading && waveform && (
          <Box sx={{ flexGrow: 1 }}>
            <WaveformViewer data={waveform} />
          </Box>
        )}
      </StyledBox>
    </ThemeProvider>
  );
};

export default App;
