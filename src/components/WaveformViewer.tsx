import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Box,
  Slider,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
} from "@mui/material";

interface Signal {
  name: string;
  width: number;
  wave: [number, string][];
  hierarchy?: string[];
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [showHoverInfo, setShowHoverInfo] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{
    name: string;
    value: string;
    y: number;
  } | null>(null);
  const [expandedSignals, setExpandedSignals] = useState<
    Record<string, boolean>
  >({
    SW: false,
    LEDR: false,
  });

  const signalHeight = 30;
  const signalPadding = 5; // Vertical padding between signals
  const sidebarWidth = 250;
  const timeScaleHeight = 30;

  // Update the groupedSignals logic to separate SW[0] and SW[1]
  const groupedSignals = useMemo(() => {
    const groups: Record<string, Signal[]> = {};
    data.signals.forEach((signal) => {
      if (signal.name === "SW" || signal.name === "LEDR") {
        groups[signal.name] = [];
        for (let i = 0; i < signal.width; i++) {
          const bitSignal: Signal = {
            name: `${signal.name}[${i}]`,
            width: 1,
            wave: signal.wave.map(([time, value]) => [
              time,
              value[signal.width - 1 - i],
            ]),
          };
          groups[signal.name].push(bitSignal);
        }
      } else {
        const baseName = signal.name.split("[")[0];
        if (!groups[baseName]) {
          groups[baseName] = [];
        }
        groups[baseName].push(signal);
      }
    });
    return groups;
  }, [data.signals]);

  const { maxTime, minTime } = useMemo(() => {
    let max = -Infinity;
    let min = Infinity;
    data.signals?.forEach((signal) => {
      signal.wave?.forEach(([time]) => {
        max = Math.max(max, time);
        min = Math.min(min, time);
      });
    });
    return {
      maxTime: max === -Infinity ? 0 : max,
      minTime: min === Infinity ? 0 : min,
    };
  }, [data.signals]);

  const timeRange = maxTime - minTime;

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, width, height);

    // Calculate scales
    const xScale = ((width - sidebarWidth) * zoom) / timeRange;
    const visibleTimeRange = timeRange / zoom;
    const visibleStartTime = minTime + offset.x / xScale;
    const visibleEndTime = visibleStartTime + visibleTimeRange;

    // Draw time scale
    ctx.fillStyle = "#ffd700";
    ctx.font = "12px Arial";

    const timeStep = Math.pow(10, Math.floor(Math.log10(visibleTimeRange / 5)));
    const startTime = Math.floor(visibleStartTime / timeStep) * timeStep;

    for (
      let t = startTime;
      t <= Math.min(maxTime, visibleEndTime);
      t += timeStep
    ) {
      const x = (t - visibleStartTime) * xScale + sidebarWidth;
      if (x >= sidebarWidth && x <= width) {
        ctx.fillText(`${t} ps`, x, timeScaleHeight - 5);

        // Draw vertical grid line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.moveTo(x, timeScaleHeight);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Draw cycle count
    ctx.fillStyle = "white";
    ctx.fillText(
      `Cycle: ${Math.floor(visibleStartTime / data.timescale)}/${data.maxCycles}`,
      sidebarWidth + 10,
      15,
    );

    // Draw signals
    let yOffset = timeScaleHeight - offset.y;
    Object.entries(groupedSignals).forEach(([groupName, signals]) => {
      if (
        (groupName === "SW" || groupName === "LEDR") &&
        !expandedSignals[groupName]
      ) {
        // Draw grouped signal
        drawSignal(
          ctx,
          signals[0],
          yOffset,
          width,
          height,
          xScale,
          visibleStartTime,
          visibleEndTime,
          true,
        );
        yOffset += signalHeight;
      } else {
        // Draw individual signals
        signals.forEach((signal, index) => {
          drawSignal(
            ctx,
            signal,
            yOffset,
            width,
            height,
            xScale,
            visibleStartTime,
            visibleEndTime,
            false,
            index,
          );
          yOffset += signalHeight;
        });
      }
    });

    // Draw cursor and hover info
    if (cursorPosition !== null) {
      const cursorX =
        (cursorPosition - visibleStartTime) * xScale + sidebarWidth;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(cursorX, timeScaleHeight);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw hover info
      if (showHoverInfo && hoverInfo) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(cursorX + 5, hoverInfo.y - 20, 100, 40);
        ctx.fillStyle = "white";
        ctx.fillText(
          `${hoverInfo.name}: ${hoverInfo.value}`,
          cursorX + 10,
          hoverInfo.y,
        );
      }
    }
  };

  const drawSignal = (
    ctx: CanvasRenderingContext2D,
    signal: Signal,
    yOffset: number,
    width: number,
    height: number,
    xScale: number,
    visibleStartTime: number,
    visibleEndTime: number,
    isGrouped: boolean = false,
    indexInGroup: number = 0,
  ) => {
    const effectiveYOffset = yOffset + signalPadding / 2;
    const effectiveSignalHeight = signalHeight - signalPadding;

    if (
      effectiveYOffset + effectiveSignalHeight < timeScaleHeight ||
      effectiveYOffset > height
    )
      return;

    ctx.lineWidth = 2;

    let lastX = sidebarWidth;
    let lastY = effectiveYOffset + effectiveSignalHeight / 2;
    let lastValue: string | null = null;

    const drawWaveLine = (
      startX: number,
      endX: number,
      startY: number,
      endY: number,
      color: string,
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    };

    const drawHollowBox = (
      startX: number,
      endX: number,
      y: number,
      isError: boolean,
    ) => {
      const boxHeight = effectiveSignalHeight - 10;
      ctx.beginPath();
      ctx.strokeStyle = isError ? "red" : "#00ffff";
      ctx.rect(startX, y - boxHeight / 2, endX - startX, boxHeight);
      ctx.stroke();
      if (isError) {
        ctx.fillStyle = "red";
        ctx.font = "12px Arial";
        ctx.fillText("x", (startX + endX) / 2 - 3, y + 4);
      }
    };

    const maxEndX = Math.min(
      (visibleEndTime - visibleStartTime) * xScale + sidebarWidth,
      width,
    );

    signal.wave.forEach(([time, value], index) => {
      const x = Math.min(
        (time - visibleStartTime) * xScale + sidebarWidth,
        maxEndX,
      );
      let y = effectiveYOffset + effectiveSignalHeight / 2;

      const nextTime = signal.wave[index + 1]
        ? signal.wave[index + 1][0]
        : visibleEndTime;
      const nextX = Math.min(
        (nextTime - visibleStartTime) * xScale + sidebarWidth,
        maxEndX,
      );

      if (x >= sidebarWidth - 1 && x <= maxEndX) {
        if (value === "x" || value === "z") {
          if (lastValue !== "x" && lastValue !== "z" && lastValue !== null) {
            drawWaveLine(lastX, x, lastY, lastY, "#00ffff");
            drawWaveLine(x, x, lastY, y, "#00ffff");
          }
          drawHollowBox(x, nextX, y, true);
        } else {
          const binaryValue = parseInt(value, 2);
          y =
            effectiveYOffset +
            (binaryValue === 0
              ? (3 * effectiveSignalHeight) / 4
              : effectiveSignalHeight / 4);

          if (lastValue === "x" || lastValue === "z") {
            drawWaveLine(
              x,
              x,
              effectiveYOffset + effectiveSignalHeight / 4,
              effectiveYOffset + (3 * effectiveSignalHeight) / 4,
              "#00ffff",
            );
          } else if (lastValue !== null && lastValue !== value) {
            drawWaveLine(lastX, x, lastY, lastY, "#00ffff");
            drawWaveLine(x, x, lastY, y, "#00ffff");
          }

          if (signal.width > 1) {
            drawHexagon(
              ctx,
              x,
              y,
              nextX - x,
              effectiveSignalHeight - 10,
              false,
            );
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(value, x + 5, y + 5);
          } else {
            drawWaveLine(x, nextX, y, y, "#00ffff");
          }
        }

        lastX = x;
        lastY = y;
        lastValue = value;
      }
    });

    // Draw signal name
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    let signalName = signal.name;
    if (
      (signalName.startsWith("SW") || signalName.startsWith("LEDR")) &&
      !isGrouped
    ) {
      signalName += `[${indexInGroup}]`;
    }
    ctx.fillText(
      signalName,
      5,
      effectiveYOffset + effectiveSignalHeight / 2 + 5,
    );
  };

  const drawHexagon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    isError: boolean,
  ) => {
    const sideLength = height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sideLength / 2, y - height / 2);
    ctx.lineTo(x + width - sideLength / 2, y - height / 2);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - sideLength / 2, y + height / 2);
    ctx.lineTo(x + sideLength / 2, y + height / 2);
    ctx.closePath();
    ctx.strokeStyle = isError ? "red" : "#00ffff";
    ctx.stroke();
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawWaveform();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [
    data.signals,
    zoom,
    offset,
    maxTime,
    minTime,
    timeRange,
    data.maxCycles,
    cursorPosition,
    showHoverInfo,
    hoverInfo,
    expandedSignals,
  ]);

  const handleZoom = (_event: Event, newValue: number | number[]) => {
    setZoom(Array.isArray(newValue) ? newValue[0] : newValue);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setOffset({
      x: e.currentTarget.scrollLeft,
      y: e.currentTarget.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - sidebarWidth;
    const y = e.clientY - rect.top;
    const xScale = ((canvas.width - sidebarWidth) * zoom) / timeRange;
    const time = x / xScale + minTime + offset.x / xScale;
    setCursorPosition(time);

    // Find the signal and value at the cursor position
    const signalIndex = Math.floor(
      (y - timeScaleHeight + offset.y) / signalHeight,
    );
    if (signalIndex >= 0 && signalIndex < data.signals.length) {
      const signal = data.signals[signalIndex];
      const wavePoint = signal.wave.find(([t]) => t > time);
      const waveValue = wavePoint
        ? wavePoint[1]
        : signal.wave[signal.wave.length - 1]?.[1] ?? "Unknown";
      setHoverInfo({
        name: signal.name,
        value: waveValue,
        y: y,
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

  const renderSignalNames = () => {
    return Object.entries(groupedSignals).map(([groupName, signals]) => {
      if (signals.length > 1 && (groupName === "SW" || groupName === "LEDR")) {
        return (
          <Box key={groupName} sx={{ height: signalHeight, paddingLeft: 10 }}>
            <Select
              value={expandedSignals[groupName] ? "expanded" : "collapsed"}
              onChange={(e) =>
                setExpandedSignals({
                  ...expandedSignals,
                  [groupName]: e.target.value === "expanded",
                })
              }
              size="small"
            >
              <MenuItem value="collapsed">
                {groupName} [{signals.length - 1}:0]
              </MenuItem>
              <MenuItem value="expanded">{groupName} (Expanded)</MenuItem>
            </Select>
          </Box>
        );
      } else {
        const signal = signals[0];
        return (
          <div
            key={signal.name}
            style={{
              height: signalHeight,
              paddingLeft: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {signal.name}
          </div>
        );
      }
    });
  };

  if (!data || !data.signals || data.signals.length === 0) {
    return <Box sx={{ padding: 2 }}>No signal data available</Box>;
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e1e",
        color: "white",
      }}
    >
      <Box
        sx={{
          padding: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
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
          control={
            <Switch checked={showHoverInfo} onChange={toggleHoverInfo} />
          }
          label="Show Hover Info"
        />
      </Box>
      <Box sx={{ flexGrow: 1, display: "flex", overflow: "hidden" }}>
        <Box
          ref={sidebarRef}
          sx={{
            width: sidebarWidth,
            overflowY: "auto",
            borderRight: "1px solid #333",
            "& > div:nth-of-type(even)": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
          }}
        >
          {renderSignalNames()}
        </Box>
        <Box
          sx={{
            flexGrow: 1,
            overflow: "auto",
          }}
          onScroll={handleScroll}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </Box>
      </Box>
    </Box>
  );
};
export default WaveformViewer;
