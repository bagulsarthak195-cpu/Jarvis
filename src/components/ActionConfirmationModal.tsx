import React from 'react';
import { ConfirmationRequest } from '../types/windows';
import { AlertTriangle, ShieldAlert, Check, X } from 'lucide-react';
import { sfx } from '../utils/audioSynthesizer';

interface ActionConfirmationModalProps {
  request: ConfirmationRequest | null;
  onClose: () => void;
}

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
  request,
  onClose,
}) => {
  if (!request) return null;

  const isHighDanger = request.dangerLevel === 'high';

  const handleConfirm = async () => {
    sfx.playProtocolChirp();
    await request.confirmedCallback();
    onClose();
  };

  const handleCancel = () => {
    sfx.playMicStop();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        className={`relative w-full max-w-md bg-slate-950 border rounded-xl p-5 shadow-2xl overflow-hidden font-rajdhani ${
          isHighDanger ? 'border-red-500/70 glow-red' : 'border-amber-500/60 glow-amber'
        }`}
      >
        {/* Holographic background pattern */}
        <div className="absolute inset-0 hud-grid-pattern opacity-10 pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              isHighDanger
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-amber-500/20 border-amber-500 text-amber-400'
            }`}
          >
            {isHighDanger ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-900 border border-slate-700 uppercase font-bold text-slate-300">
              SECURITY CONFIRMATION REQUIRED
            </span>
            <h3 className="font-orbitron text-sm font-bold tracking-wide text-slate-100 mt-0.5">
              {request.title}
            </h3>
          </div>
        </div>

        {/* Body content */}
        <div className="space-y-3 text-sm text-slate-300">
          <p className="leading-relaxed">{request.description}</p>

          {request.target && (
            <div className="p-2.5 rounded bg-black/70 border border-slate-800 font-mono-tech text-xs break-all">
              <span className="text-[10px] text-slate-500 block mb-0.5">TARGET RESOURCE:</span>
              <span className="text-cyan-300">{request.target}</span>
            </div>
          )}

          {isHighDanger && (
            <div className="p-2 rounded bg-red-950/40 border border-red-500/40 text-[11px] text-red-300 font-mono-tech">
              ⚠️ WARNING: This operation cannot be automatically reversed.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-orbitron transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>ABORT</span>
          </button>

          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded text-slate-950 text-xs font-orbitron font-bold transition-all flex items-center gap-1.5 shadow-lg ${
              isHighDanger
                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/30'
                : 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/30'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>CONFIRM & EXECUTE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
