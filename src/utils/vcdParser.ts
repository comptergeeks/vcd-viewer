interface Signal {
  name: string;
  width: number;
  wave: [number, string][];
}

interface VCDData {
  signals: Signal[];
  timescale: number;
  maxCycles: number;
}

const parseTimescale = (str: string): number => {
  const m = str.trim().match(/^(\d+)\s*(\w+)$/);
  if (!m) return 0;
  const res1 = ({ '1': 0, '10': 1, '100': 2 })[m[1] as '1' | '10' | '100'] || 0;
  const res2 = ({ 's': 0, 'ms': -3, 'us': -6, 'ns': -9, 'ps': -12, 'fs': -15 })[m[2] as 's' | 'ms' | 'us' | 'ns' | 'ps' | 'fs'] || 0;
  return res1 + res2;
};

export const parseVCD = async (vcdContent: string): Promise<VCDData> => {
  return new Promise((resolve) => {
    const lines = vcdContent.split('\n');
    const signals: { [key: string]: Signal } = {};
    let currentTime = 0;
    let timescale = 0;
    let maxTime = 0;

    const processChunk = (start: number) => {
      const end = Math.min(start + 10000, lines.length);
      for (let i = start; i < end; i++) {
        const line = lines[i].trim();
        if (line.startsWith('$var')) {
          const parts = line.split(/\s+/);
          const id = parts[3];
          signals[id] = {
            name: parts[4],
            width: parseInt(parts[2]),
            wave: []
          };
        } else if (line.startsWith('$timescale')) {
          const timescaleParts = line.split(/\s+/);
          if (timescaleParts.length > 1) {
            timescale = parseTimescale(timescaleParts[1]);
          }
        } else if (line.startsWith('#')) {
          currentTime = parseInt(line.substring(1));
          maxTime = Math.max(maxTime, currentTime);
        } else if (line.match(/^[01zx]\S+/i)) {
          const value = line[0];
          const id = line.substring(1);
          if (signals[id]) {
            signals[id].wave.push([currentTime, value]);
          }
        } else if (line.startsWith('b')) {
          const [value, id] = line.substring(1).split(/\s+/);
          if (signals[id]) {
            signals[id].wave.push([currentTime, value]);
          }
        }
      }
      if (end < lines.length) {
        setTimeout(() => processChunk(end), 0);
      } else {
        const maxCycles = Math.ceil(maxTime / timescale);
        resolve({
          signals: Object.values(signals),
          timescale,
          maxCycles
        });
      }
    };

    processChunk(0);
  });
};