import React, { useEffect, useState } from 'react';
import { SystemMode } from '../types/jarvis';
import { Compass, Navigation, Crosshair } from 'lucide-react';

interface HolographicRadarProps {
  mode: SystemMode;
  audioLevel: number;
}

export const HolographicRadar: React.FC<HolographicRadarProps> = ({ mode, audioLevel }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const themeColor = {
    standard: '#00f0ff',
    alert: '#ef4444',
    stealth: '#10b981',
    analysis: '#f59e0b',
  }[mode];

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg backdrop-blur-md relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-orbitron text-xs font-bold tracking-wider text-slate-200">
            TACTICAL SENSOR ARRAY
          </span>
        </div>
        <span className="text-[10px] font-mono-tech text-cyan-400">
          {currentTime.toTimeString().split(' ')[0]} EST
        </span>
      </div>

      {/* Radar Scope */}
      <div className="relative w-full aspect-square max-h-48 mx-auto flex items-center justify-center my-1">
        {/* Outer Grid Circle */}
        <div
          className="absolute inset-0 rounded-full border border-dashed transition-colors duration-500 opacity-40"
          style={{ borderColor: themeColor }}
        />
        <div
          className="absolute inset-4 rounded-full border border-slate-700/60 transition-colors duration-500"
          style={{ borderColor: `${themeColor}33` }}
        />
        <div
          className="absolute inset-10 rounded-full border border-slate-800 transition-colors duration-500"
          style={{ borderColor: `${themeColor}22` }}
        />

        {/* Crosshair Axes */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800" />

        {/* Radar Rotating Sweep Line */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden pointer-events-none animate-radar"
          style={{
            background: `conic-gradient(from 0deg, ${themeColor}40 0deg, ${themeColor}10 40deg, transparent 60deg)`,
          }}
        />

        {/* Target Blips */}
        <div
          className="absolute w-2 h-2 rounded-full animate-ping"
          style={{
            top: '30%',
            left: '68%',
            backgroundColor: themeColor,
          }}
        />
        <div
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            top: '30%',
            left: '68%',
            backgroundColor: themeColor,
          }}
        />

        <div
          className="absolute w-1.5 h-1.5 rounded-full opacity-70"
          style={{
            top: '65%',
            left: '35%',
            backgroundColor: themeColor,
          }}
        />

        {/* Center Target Point */}
        <div
          className="w-2.5 h-2.5 rounded-full z-10 border border-white"
          style={{ backgroundColor: themeColor }}
        />

        {/* Radar Labels */}
        <span className="absolute top-1 text-[8px] font-mono-tech text-slate-500">N 000°</span>
        <span className="absolute bottom-1 text-[8px] font-mono-tech text-slate-500">S 180°</span>
        <span className="absolute left-1 text-[8px] font-mono-tech text-slate-500">W 270°</span>
        <span className="absolute right-1 text-[8px] font-mono-tech text-slate-500">E 090°</span>
      </div>

      {/* Target Telemetry Coordinates */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-tech pt-1 border-t border-slate-800/80">
        <div>
          <span className="text-slate-500 block">SECTOR COORDINATES</span>
          <span className="text-cyan-300 font-bold">40.7580° N, 73.9855° W</span>
        </div>
        <div>
          <span className="text-slate-500 block">ELEVATION / ORBIT</span>
          <span className="text-cyan-300 font-bold">380m // ORB-7 SECURE</span>
        </div>
      </div>

      {/* Dynamic Audio Visualizer Spectrum Bars */}
      <div className="mt-1">
        <div className="flex justify-between items-center text-[9px] font-mono-tech text-slate-400 mb-1">
          <span>ACOUSTIC SPECTRUM</span>
          <span className="text-cyan-400">{audioLevel}%</span>
        </div>
        <div className="h-5 flex items-end gap-1 px-1 bg-slate-900/60 rounded border border-slate-800/80">
          {Array.from({ length: 16 }).map((_, idx) => {
            const seed = Math.sin(idx * 0.8 + Date.now() / 300);
            const height = Math.max(
              12,
              Math.min(100, Math.round(audioLevel * 0.9 * Math.abs(seed) + (audioLevel > 5 ? 15 : 8)))
            );
            return (
              <div
                key={idx}
                className="flex-1 rounded-t transition-all duration-75"
                style={{
                  height: `${height}%`,
                  backgroundColor:
                    idx > 12 && mode === 'alert'
                      ? '#ef4444'
                      : idx > 10
                      ? '#38bdf8'
                      : themeColor,
                  opacity: 0.85,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
