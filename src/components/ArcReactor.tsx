import React, { useEffect, useState, useRef } from 'react';
import { SystemMode } from '../types/jarvis';
import { speechEngine } from '../utils/speechEngine';
import { sfx } from '../utils/audioSynthesizer';

interface ArcReactorProps {
  mode: SystemMode;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onToggleListening: () => void;
  outputPowerPercent: number;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  mode,
  isListening,
  isSpeaking,
  isProcessing,
  onToggleListening,
  outputPowerPercent,
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [rotationDegree, setRotationDegree] = useState(0);
  const requestRef = useRef<number | null>(null);

  // Mode color configuration
  const theme = {
    standard: {
      primary: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.5)',
      deep: 'rgba(2, 132, 199, 0.4)',
      bg: 'rgba(6, 182, 212, 0.1)',
      border: 'border-cyan-500/40',
      text: 'text-cyan-400',
    },
    alert: {
      primary: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.6)',
      deep: 'rgba(185, 28, 28, 0.5)',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'border-red-500/50',
      text: 'text-red-400',
    },
    stealth: {
      primary: '#10b981',
      glow: 'rgba(16, 185, 129, 0.5)',
      deep: 'rgba(5, 150, 105, 0.4)',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
    },
    analysis: {
      primary: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.5)',
      deep: 'rgba(217, 119, 6, 0.4)',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
    },
  }[mode];

  // Dynamic animation loop for audio visualizer pulse & rotation
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Update audio level from speech engine
      const lvl = speechEngine.getAudioLevel();
      setAudioLevel(lvl);

      // Speed up rotation when processing or speaking
      const speed = isProcessing ? 60 : isSpeaking ? 40 : isListening ? 25 : 10;
      setRotationDegree((prev) => (prev + speed * delta) % 360);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isProcessing, isSpeaking, isListening]);

  // Dynamic pulse scale based on audio energy
  const dynamicScale = 1 + (audioLevel / 100) * 0.15 + (isProcessing ? 0.05 : 0);
  const coilCount = 10;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 select-none">
      {/* Outer Holographic Projection HUD Ring */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Background Ambient Glow */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700 blur-2xl opacity-40 pointer-events-none"
          style={{
            backgroundColor: theme.primary,
            transform: `scale(${dynamicScale * 1.1})`,
          }}
        />

        {/* Concentric Decorative Metric Rings */}
        <div
          className="absolute inset-[-14px] rounded-full border border-dashed opacity-30 transition-all duration-500 pointer-events-none"
          style={{
            borderColor: theme.primary,
            transform: `rotate(-${rotationDegree * 0.4}deg)`,
          }}
        />

        {/* Outer Ring with Cardinal Ticks */}
        <div
          className="absolute inset-[-6px] rounded-full border border-cyan-500/20 pointer-events-none"
          style={{ borderColor: theme.glow }}
        >
          {/* Degree Markers */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-[9px] font-mono-tech text-cyan-400/60">
            000°
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-[9px] font-mono-tech text-cyan-400/60">
            180°
          </div>
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 text-[9px] font-mono-tech text-cyan-400/60">
            270°
          </div>
          <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 text-[9px] font-mono-tech text-cyan-400/60">
            090°
          </div>
        </div>

        {/* SVG Detailed Mechanical Arc Reactor */}
        <svg
          viewBox="0 0 300 300"
          className="w-full h-full drop-shadow-[0_0_20px_var(--glow)] transition-transform duration-150 cursor-pointer"
          style={
            {
              '--glow': theme.glow,
              transform: `scale(${dynamicScale})`,
            } as React.CSSProperties
          }
          onClick={() => {
            sfx.playReactorPulse();
            onToggleListening();
          }}
        >
          <title>{isListening ? 'Click to stop listening' : 'Click to activate voice input'}</title>
          <defs>
            {/* Plasma Radial Gradients */}
            <radialGradient id="reactorCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor={theme.primary} stopOpacity="0.9" />
              <stop offset="70%" stopColor={theme.deep} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="metalRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Titanium Housing Rim */}
          <circle
            cx="150"
            cy="150"
            r="142"
            fill="url(#metalRim)"
            stroke={theme.primary}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* Segmented Ring Tracks */}
          <circle
            cx="150"
            cy="150"
            r="128"
            fill="none"
            stroke="#0f172a"
            strokeWidth="16"
          />

          {/* Outer Rotating Gear & Segment Notch Ring */}
          <g transform={`rotate(${rotationDegree}, 150, 150)`}>
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              return (
                <line
                  key={i}
                  x1="150"
                  y1="10"
                  x2="150"
                  y2={i % 2 === 0 ? '18' : '14'}
                  stroke={theme.primary}
                  strokeWidth={i % 2 === 0 ? '2' : '1'}
                  strokeOpacity={i % 2 === 0 ? '0.8' : '0.4'}
                  transform={`rotate(${angle}, 150, 150)`}
                />
              );
            })}
          </g>

          {/* 10 Electromagnetic Copper Solenoids (Coils) */}
          <g transform={`rotate(${rotationDegree * 0.5}, 150, 150)`}>
            {Array.from({ length: coilCount }).map((_, i) => {
              const angle = (i * 360) / coilCount;
              return (
                <g key={i} transform={`rotate(${angle}, 150, 150)`}>
                  {/* Solenoid Base Mount */}
                  <rect
                    x="138"
                    y="22"
                    width="24"
                    height="18"
                    rx="3"
                    fill="#1e293b"
                    stroke={theme.primary}
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                  {/* Copper Wire Windings */}
                  <rect
                    x="142"
                    y="24"
                    width="16"
                    height="14"
                    rx="2"
                    fill="#b45309"
                    opacity="0.8"
                  />
                  {/* Energy discharge filament */}
                  <line
                    x1="150"
                    y1="25"
                    x2="150"
                    y2="37"
                    stroke={theme.primary}
                    strokeWidth="2"
                    filter="url(#glowFilter)"
                  />
                </g>
              );
            })}
          </g>

          {/* Inner Counter-Rotating Mechanical Ring */}
          <g transform={`rotate(-${rotationDegree * 0.8}, 150, 150)`}>
            <circle
              cx="150"
              cy="150"
              r="94"
              fill="none"
              stroke={theme.primary}
              strokeWidth="2.5"
              strokeDasharray="14 10"
              strokeOpacity="0.7"
            />
            {/* Triangular Vent Guide Marks */}
            {Array.from({ length: 6 }).map((_, i) => (
              <polygon
                key={i}
                points="150,60 145,70 155,70"
                fill={theme.primary}
                opacity="0.75"
                transform={`rotate(${i * 60}, 150, 150)`}
              />
            ))}
          </g>

          {/* Mid Energy Conduit Ring */}
          <circle
            cx="150"
            cy="150"
            r="68"
            fill="#030712"
            stroke={theme.primary}
            strokeWidth="3"
            strokeOpacity="0.9"
            filter="url(#glowFilter)"
          />

          {/* Triangular Palladium Core Aperture */}
          <g transform={`rotate(${rotationDegree * 1.2}, 150, 150)`}>
            <polygon
              points="150,96 198,178 102,178"
              fill="none"
              stroke={theme.primary}
              strokeWidth="3.5"
              strokeOpacity="0.85"
              strokeLinejoin="round"
              filter="url(#glowFilter)"
            />
          </g>

          {/* Central Pulsing Plasma Core */}
          <circle
            cx="150"
            cy="150"
            r={38 + (audioLevel / 100) * 16}
            fill="url(#reactorCoreGlow)"
            className="transition-all duration-75"
          />

          {/* High Energy Center Node */}
          <circle
            cx="150"
            cy="150"
            r="18"
            fill="#ffffff"
            filter="url(#glowFilter)"
            opacity="0.95"
          />
        </svg>

        {/* Central Click Interaction Label Overlay */}
        <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
          <span className={`text-[10px] font-orbitron font-bold tracking-widest ${theme.text} drop-shadow`}>
            {isListening ? 'LISTENING' : isSpeaking ? 'VOCALIZING' : isProcessing ? 'THINKING' : 'MARK VII'}
          </span>
          <span className="text-[8px] font-mono-tech text-slate-400">
            {outputPowerPercent}% PWR
          </span>
        </div>
      </div>

      {/* Under-Reactor Telemetry Readout */}
      <div className="mt-3 flex items-center gap-4 text-xs font-mono-tech">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full animate-ping ${
              isListening
                ? 'bg-red-400'
                : isSpeaking
                ? 'bg-cyan-400'
                : isProcessing
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-slate-400 uppercase">
            STATUS: <span className={theme.text}>{mode.toUpperCase()}</span>
          </span>
        </div>
        <div className="text-slate-500">|</div>
        <div className="text-slate-400">
          OUTPUT: <span className="text-cyan-300 font-bold">{(outputPowerPercent * 0.032).toFixed(2)} GW</span>
        </div>
        <div className="text-slate-500">|</div>
        <button
          onClick={onToggleListening}
          className={`px-2.5 py-0.5 rounded text-[11px] font-mono-tech border transition-all ${
            isListening
              ? 'bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
          }`}
        >
          {isListening ? 'STOP MIC' : 'TALK (SPACE)'}
        </button>
      </div>
    </div>
  );
};
