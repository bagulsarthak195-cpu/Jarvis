import React from 'react';
import { ActiveTimer } from '../types/jarvis';
import { Timer, X, Play, Pause, Bell } from 'lucide-react';

interface TacticalTimerWidgetProps {
  timers: ActiveTimer[];
  onRemoveTimer: (id: string) => void;
  onToggleTimer: (id: string) => void;
}

export const TacticalTimerWidget: React.FC<TacticalTimerWidgetProps> = ({
  timers,
  onRemoveTimer,
  onToggleTimer,
}) => {
  if (timers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-950/80 border border-cyan-500/30 rounded-lg backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-orbitron text-[11px] font-bold tracking-wider text-slate-200">
            ACTIVE COUNTDOWN TIMERS
          </span>
        </div>
        <span className="text-[10px] font-mono-tech text-cyan-400">
          {timers.length} ENGAGED
        </span>
      </div>

      <div className="space-y-2">
        {timers.map((t) => {
          const progress = Math.min(100, Math.max(0, ((t.totalSeconds - t.remainingSeconds) / t.totalSeconds) * 100));
          const mins = Math.floor(t.remainingSeconds / 60);
          const secs = t.remainingSeconds % 60;
          const isFinished = t.remainingSeconds <= 0;

          return (
            <div
              key={t.id}
              className={`p-2.5 rounded border transition-all ${
                isFinished
                  ? 'bg-red-950/40 border-red-500/60 animate-pulse'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Bell className={`w-3 h-3 ${isFinished ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} />
                  <span className="text-xs font-rajdhani text-slate-200 font-bold truncate max-w-[140px]">
                    {t.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono-tech font-bold ${isFinished ? 'text-red-400' : 'text-cyan-300'}`}>
                    {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => onToggleTimer(t.id)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                    title={t.isRunning ? 'Pause' : 'Resume'}
                  >
                    {t.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => onRemoveTimer(t.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isFinished ? 'bg-red-500' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
