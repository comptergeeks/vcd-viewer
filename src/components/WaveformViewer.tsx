import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Box, Slider, Typography, Switch, FormControlLabel } from '@mui/material';

interface Signal {
  name: string;
  width: number;
  wave: [number, string | number][];
}

interface VCDData {
  signals: Signal[];
  timescale: number;
  maxCycles: number;
}

interface WaveformViewerProps {
  data: VCDData;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [showHoverInfo, setShowHoverInfo] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{ name: string; value: string | number; y: number } | null>(null);

  const signalHeight = 30;
  const sidebarWidth = 150;
  const timeScaleHeight = 30;

  const { maxTime, minTime } = useMemo(() => {
    let max = -Infinity;
    let min = Infinity;
    data.signals.forEach(signal => {
      signal.wave.forEach(([time]) => {
        max = Math.max(max, time);
        min = Math.min(min, time);
      });
    });
    return { maxTime: max, minTime: min };
  }, [data.signals]);

  const timeRange = maxTime - minTime;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWaveform = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Draw background
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, width, height);

      // Calculate scales
      const xScale = ((width - sidebarWidth) * zoom) / timeRange;
      const visibleTimeRange = timeRange / zoom;
      const visibleStartTime = minTime + offset.x / xScale;
      const visibleEndTime = visibleStartTime + visibleTimeRange;

      // Draw time scale
      ctx.fillStyle = '#ffd700';
      ctx.font = '12px Arial';
      
      const timeStep = Math.pow(10, Math.floor(Math.log10(visibleTimeRange / 5)));
      const startTime = Math.floor(visibleStartTime / timeStep) * timeStep;
      
      for (let t = startTime; t <= Math.min(maxTime, visibleEndTime); t += timeStep) {
        const x = (t - visibleStartTime) * xScale + sidebarWidth;
        if (x >= sidebarWidth && x <= width) {
          ctx.fillText(`${t} ns`, x, timeScaleHeight - 5);
          
          // Draw vertical grid line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.beginPath();
          ctx.moveTo(x, timeScaleHeight);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      // Draw cycle count
      ctx.fillStyle = 'white';
      ctx.fillText(`Cycle: ${Math.floor(visibleStartTime)}/${data.maxCycles}`, sidebarWidth + 10, 15);

      // Draw signals
      data.signals.forEach((signal, index) => {
        const yOffset = index * signalHeight + timeScaleHeight - offset.y;
        
        // Draw signal name
        ctx.fillStyle = 'white';
        ctx.fillText(`${signal.name} [${signal.width - 1}:0]`, 5, yOffset + 20);

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;

        let lastX = sidebarWidth;
        let lastY = yOffset + signalHeight / 2;
        let lastValue: string | number | null = null;

        signal.wave.forEach(([time, value]) => {
          const x = (time - visibleStartTime) * xScale + sidebarWidth;
          const y = yOffset + (value === '1' || value === 1 ? signalHeight / 4 : 3 * signalHeight / 4);

          if (x >= sidebarWidth - 1) {
            if (lastValue !== null && lastValue !== value) {
              ctx.moveTo(lastX, lastY);
              ctx.lineTo(x, lastY);
              ctx.lineTo(x, y);
            } else {
              ctx.moveTo(lastX, y);
              ctx.lineTo(x, y);
            }
            lastX = x;
            lastY = y;
            lastValue = value;
          }
        });

        // Extend the last value to the end of the canvas
        if (lastValue !== null) {
          ctx.lineTo(width, lastY);
        }

        ctx.stroke();
      });

      // Draw cursor and hover info
      if (cursorPosition !== null) {
        const cursorX = (cursorPosition - visibleStartTime) * xScale + sidebarWidth;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cursorX, timeScaleHeight);
        ctx.lineTo(cursorX, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw hover info
        if (showHoverInfo && hoverInfo) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(cursorX + 5, hoverInfo.y - 20, 100, 40);
          ctx.fillStyle = 'white';
          ctx.fillText(`${hoverInfo.name}: ${hoverInfo.value}`, cursorX + 10, hoverInfo.y);
        }
      }
    };

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawWaveform();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [data.signals, zoom, offset, maxTime, minTime, timeRange, data.maxCycles, cursorPosition, showHoverInfo, hoverInfo]);

  const handleZoom = (_event: Event, newValue: number | number[]) => {
    setZoom(Array.isArray(newValue) ? newValue[0] : newValue);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setOffset({
      x: e.currentTarget.scrollLeft,
      y: e.currentTarget.scrollTop
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - sidebarWidth;
    const y = e.clientY - rect.top;
    const xScale = ((canvas.width - sidebarWidth) * zoom) / timeRange;
    const time = (x / xScale) + minTime + (offset.x / xScale);
    setCursorPosition(time);

    // Find the signal and value at the cursor position
    const signalIndex = Math.floor((y - timeScaleHeight + offset.y) / signalHeight);
    if (signalIndex >= 0 && signalIndex < data.signals.length) {
      const signal = data.signals[signalIndex];
      const waveValue = signal.wave.find(([t]) => t > time)?.[1] ?? signal.wave[signal.wave.length - 1][1];
      setHoverInfo({
        name: signal.name,
        value: waveValue,
        y: y
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseLeave = () => {
    setCursorPosition(null);
    setHoverInfo(null);
  };

  const toggleHoverInfo = () => {
    setShowHoverInfo(!showHoverInfo);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', color: 'white' }}>
      <Box sx={{ padding: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1, marginRight: 2 }}>
          <Typography gutterBottom>Zoom</Typography>
          <Slider
            value={zoom}
            onChange={handleZoom}
            min={0.1}
            max={10}
            step={0.1}
            aria-labelledby="zoom-slider"
          />
        </Box>
        <FormControlLabel
          control={<Switch checked={showHoverInfo} onChange={toggleHoverInfo} />}
          label="Show Hover Info"
        />
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
        }}
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </Box>
    </Box>
  );
};

export default WaveformViewer;