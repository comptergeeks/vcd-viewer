import React, { useEffect, useRef } from 'react';
import WaveDrom from 'wavedrom';

interface WaveDromProps {
  input: any;
}

const WaveDromComponent: React.FC<WaveDromProps> = ({ input }) => {
  const waveformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (waveformRef.current) {
      WaveDrom.renderWaveForm(waveformRef.current, input, 'wavedrom');
    }
  }, [input]);

  return <div ref={waveformRef}></div>;
};

export default WaveDromComponent;