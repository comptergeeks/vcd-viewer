import React, { useState } from 'react';
import { Button, Typography, Box, CircularProgress } from '@mui/material';
import WaveformViewer from './components/WaveformViewer';
import { parseVCD } from './utils/vcdParser';

const App: React.FC = () => {
  const [waveform, setWaveform] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const contents = e.target?.result as string;
        const parsedData = await parseVCD(contents);
        console.log('Parsed VCD data:', parsedData);
        setWaveform(parsedData);
        setLoading(false);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, backgroundColor: '#1e1e1e', color: 'white' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          VCD Waveform Viewer
        </Typography>
        <Button variant="contained" component="label" sx={{ mb: 2 }}>
          Upload VCD File
          <input type="file" hidden onChange={handleFileUpload} accept=".vcd" />
        </Button>
      </Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      )}
      {!loading && waveform && (
        <Box sx={{ flexGrow: 1 }}>
          <WaveformViewer data={waveform} />
        </Box>
      )}
    </Box>
  );
};

export default App;