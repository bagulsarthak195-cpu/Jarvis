import React from 'react';
import { SystemMode, SystemTelemetry } from '../types/jarvis';
import { Activity, ShieldAlert, Cpu, Radio, Zap, Flame, RefreshCw, Lock } from 'lucide-react';
import { sfx } from '../utils/audioSynthesizer';

interface DiagnosticsPanelProps {
  mode: SystemMode;
  onSetMode: (mode: SystemMode) => void;
  telemetry: SystemTelemetry;
  onRunDiagnostics: () => void;
  onSecurityLockdown: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  mode,
  onSetMode,
  telemetry,
  onRunDiagnostics,
  onSecurityLockdown,
}) => {
  const modeColors = {
    standard: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20',
    alert: 'text-red-400 border-red-500/50 bg-red-950/30',
    stealth: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20',
    analysis: 'text-amber-400 border-amber-500/40 bg-amber-950/20',
  }[mode];

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg backdrop-blur-md relative overflow-hidden">
      {/* Corner Bracket Accents */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/60" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/60" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/60" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/60" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-orbitron text-xs font-bold tracking-wider text-slate-200">
            SYSTEM TELEMETRY
          </span>
        </div>
        <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
          MARK VII // V4.8
        </span>
      </div>

      {/* Protocol Mode Switcher */}
      <div>
        <div className="text-[10px] font-mono-tech text-slate-400 mb-1.5 flex justify-between">
          <span>OPERATIONAL PROTOCOL</span>
          <span className="text-cyan-400 font-bold uppercase">{mode}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              { key: 'standard', label: 'STD MK VII', color: 'border-cyan-500/40 text-cyan-300' },
              { key: 'alert', label: 'COMBAT', color: 'border-red-500/40 text-red-300' },
              { key: 'stealth', label: 'STEALTH', color: 'border-emerald-500/40 text-emerald-300' },
              { key: 'analysis', label: 'ANALYSIS', color: 'border-amber-500/40 text-amber-300' },
            ] as const
          ).map((p) => {
            const isActive = mode === p.key;
            return (
              <button
                key={p.key}
                onClick={() => {
                  if (p.key === 'alert') sfx.playAlertKlaxon();
                  else sfx.playProtocolChirp();
                  onSetMode(p.key);
                }}
                className={`py-1 px-1.5 text-[9px] font-orbitron rounded border text-center transition-all ${
                  isActive
                    ? `${p.color} bg-slate-800/90 shadow-sm font-bold scale-[1.02]`
                    : 'border-slate-800 text-slate-400 hover:border-slate-700 bg-slate-900/40'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Vitals Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
        {/* Core Temperature */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px]">CORE TEMP</span>
          </div>
          <span className="text-amber-300 font-bold">{telemetry.coreTempCelsius.toFixed(1)}°C</span>
        </div>

        {/* Repulsor Charge */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px]">REPULSORS</span>
          </div>
          <span className="text-cyan-300 font-bold">{telemetry.repulsorChargePercent}%</span>
        </div>

        {/* Neural Uplink Ping */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">UPLINK PING</span>
          </div>
          <span className="text-emerald-300 font-bold">{telemetry.satelliteUplinkPingMs}ms</span>
        </div>

        {/* CPU Neural Sync */}
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px]">NEURAL SYNC</span>
          </div>
          <span className="text-purple-300 font-bold">{telemetry.neuralSyncPercent}%</span>
        </div>
      </div>

      {/* Threat Status Badge */}
      <div className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800/60 text-[11px] font-mono-tech">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${mode === 'alert' ? 'text-red-400 animate-bounce' : 'text-slate-400'}`} />
          <span className="text-slate-400">DEFENSE POSTURE:</span>
        </div>
        <span
          className={`font-bold ${
            mode === 'alert'
              ? 'text-red-400 animate-pulse'
              : mode === 'stealth'
              ? 'text-emerald-400'
              : 'text-cyan-400'
          }`}
        >
          {mode === 'alert' ? 'DEFCON 1 (HOSTILE)' : 'DEFCON 5 (SECURE)'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <button
          onClick={() => {
            sfx.playProtocolChirp();
            onRunDiagnostics();
          }}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 text-cyan-300 text-[10px] font-orbitron transition-all active:scale-95"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" />
          RUN DIAGNOSTIC
        </button>

        <button
          onClick={() => {
            sfx.playAlertKlaxon();
            onSecurityLockdown();
          }}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-red-300 text-[10px] font-orbitron transition-all active:scale-95"
        >
          <Lock className="w-3 h-3 text-red-400" />
          LOCKDOWN
        </button>
      </div>
    </div>
  );
};
