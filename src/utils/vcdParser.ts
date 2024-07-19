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

const parseTimescale = (str: string): number => {
  const m = str.trim().match(/^(\d+)\s*(\w+)$/);
  if (!m) return 0;
  const res1 = { "1": 0, "10": 1, "100": 2 }[m[1] as "1" | "10" | "100"] || 0;
  const res2 =
    { s: 0, ms: -3, us: -6, ns: -9, ps: -12, fs: -15 }[
      m[2] as "s" | "ms" | "us" | "ns" | "ps" | "fs"
    ] || 0;
  return res1 + res2;
};

export const parseVCD = async (vcdContent: string): Promise<VCDData> => {
  return new Promise((resolve) => {
    const lines = vcdContent.split("\n");
    const signals: { [key: string]: Signal } = {};
    let currentTime = 0;
    let timescale = 0;
    let maxTime = 0;
    let currentScope: string[] = [];

    const processChunk = (start: number) => {
      const end = Math.min(start + 10000, lines.length);
      for (let i = start; i < end; i++) {
        const line = lines[i].trim();
        if (line.startsWith("$var")) {
          const parts = line.split(/\s+/);
          const id = parts[3];
          signals[id] = {
            name: parts[4],
            width: parseInt(parts[2]),
            wave: [],
            hierarchy: [...currentScope],
          };
        } else if (line.startsWith("$timescale")) {
          const timescaleParts = line.split(/\s+/);
          if (timescaleParts.length > 1) {
            timescale = parseTimescale(timescaleParts[1]);
          }
        } else if (line.startsWith("$scope")) {
          const parts = line.split(/\s+/);
          currentScope.push(parts[2]);
        } else if (line.startsWith("$upscope")) {
          currentScope.pop();
        } else if (line.startsWith("#")) {
          currentTime = parseInt(line.substring(1));
          maxTime = Math.max(maxTime, currentTime);
        } else if (line.match(/^[01zx]\S+/i)) {
          const value = line[0];
          const id = line.substring(1);
          if (signals[id]) {
            signals[id].wave.push([currentTime, value]);
          }
        } else if (line.startsWith("b")) {
          const [value, id] = line.substring(1).split(/\s+/);
          if (signals[id]) {
            signals[id].wave.push([currentTime, value]);
          }
        }
      }
      if (end < lines.length) {
        setTimeout(() => processChunk(end), 0);
      } else {
        const maxCycles = Math.ceil(maxTime / Math.pow(10, -timescale));

        // Post-processing to handle multi-bit signals
        Object.values(signals).forEach((signal) => {
          if (signal.width > 1 && signal.name.includes("[")) {
            const baseName = signal.name.split("[")[0];
            const range = signal.name.match(/\[(.+)\]/)?.[1];
            if (range) {
              const [high, low] = range.split(":").map(Number);
              for (let i = low; i <= high; i++) {
                const bitSignal: Signal = {
                  name: `${baseName}[${i}]`,
                  width: 1,
                  wave: signal.wave.map(([time, value]) => [
                    time,
                    value[high - i],
                  ]),
                  hierarchy: signal.hierarchy,
                };
                signals[`${baseName}[${i}]`] = bitSignal;
              }
            }
          }
        });

        resolve({
          signals: Object.values(signals),
          timescale: Math.pow(10, -timescale),
          maxCycles,
        });
      }
    };
    processChunk(0);
  });
};
