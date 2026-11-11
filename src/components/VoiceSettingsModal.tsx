import React, { useEffect, useState } from 'react';
import { VoiceSettings } from '../types/jarvis';
import { speechEngine, VoiceOption } from '../utils/speechEngine';
import { sfx } from '../utils/audioSynthesizer';
import { X, Volume2, Mic, Sliders, Check, User, Sparkles, Fingerprint } from 'lucide-react';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
  userMoniker: string;
  onUpdateUserMoniker: (name: string) => void;
  onOpenBiometrics?: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  userMoniker,
  onUpdateUserMoniker,
  onOpenBiometrics,
}) => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [testPlaying, setTestPlaying] = useState(false);

  useEffect(() => {
    const list = speechEngine.getAvailableVoices();
    setVoices(list);

    speechEngine.onVoicesLoaded = (loadedVoices) => {
      setVoices(loadedVoices);
    };
  }, []);

  if (!isOpen) return null;

  const handleTestVoice = async () => {
    setTestPlaying(true);
    sfx.playProtocolChirp();
    await speechEngine.speak(
      `Systems fully operational, ${userMoniker}. J.A.R.V.I.S. neural speech synthesis calibrated at your command.`,
      settings
    );
    setTestPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-950 border border-cyan-500/40 rounded-xl p-5 shadow-2xl overflow-hidden font-rajdhani">
        {/* Holographic grid background */}
        <div className="absolute inset-0 hud-grid-pattern opacity-15 pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-orbitron text-sm font-bold tracking-wider text-slate-100">
              VOICE & COGNITIVE PROTOCOLS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* User Moniker (Callsign) */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-cyan-400" />
              <label className="text-xs font-orbitron text-slate-200">
                USER IDENTIFIER / CALLSIGN
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={userMoniker}
                onChange={(e) => onUpdateUserMoniker(e.target.value)}
                placeholder="Sir"
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-cyan-300 font-mono-tech focus:outline-none focus:border-cyan-400"
              />
              {['Sir', 'Tony', 'Mr. Stark', 'Boss', 'Ma\'am'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onUpdateUserMoniker(preset)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    userMoniker === preset
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Model Selector */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <label className="text-xs font-orbitron text-slate-200">
                  NEURAL SPEECH SYNTHESIS ENGINE
                </label>
              </div>
              <span className="text-[10px] text-cyan-400/80 font-mono-tech">
                {voices.length} VOICES DETECTED
              </span>
            </div>

            <select
              value={settings.voiceUri}
              onChange={(e) => onUpdateSettings({ ...settings, voiceUri: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 font-mono-tech focus:outline-none focus:border-cyan-400 mb-2"
            >
              <option value="">Default UK / British Jarvis Engine (Recommended)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.isBritish ? '🇬🇧 [BRITISH BUTLER] ' : ''}
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>

            <button
              onClick={handleTestVoice}
              disabled={testPlaying}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/50 text-cyan-300 text-xs font-orbitron transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {testPlaying ? 'VOCALIZING...' : 'TEST JARVIS CADENCE'}
            </button>
          </div>

          {/* Audio Sliders: Speed & Pitch */}
          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-mono-tech">SPEECH RATE (SPEED)</span>
                <span className="text-cyan-400 font-mono-tech">{settings.rate}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.35"
                step="0.05"
                value={settings.rate}
                onChange={(e) => onUpdateSettings({ ...settings, rate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-mono-tech">VOCAL PITCH (FREQUENCY)</span>
                <span className="text-cyan-400 font-mono-tech">{settings.pitch}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={settings.pitch}
                onChange={(e) => onUpdateSettings({ ...settings, pitch: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Speech & Listening Automation Toggles */}
          <div className="space-y-2">
            {/* Auto Speak */}
            <div
              onClick={() => onUpdateSettings({ ...settings, autoSpeak: !settings.autoSpeak })}
              className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-orbitron text-slate-200">AUTO-VOCALIZE RESPONSES</div>
                  <div className="text-[11px] text-slate-400 font-mono-tech">
                    Jarvis automatically speaks out all AI answers
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                  settings.autoSpeak
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                    : 'border-slate-700 bg-slate-950'
                }`}
              >
                {settings.autoSpeak && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Continuous Listening */}
            <div
              onClick={() =>
                onUpdateSettings({ ...settings, continuousListening: !settings.continuousListening })
              }
              className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-orbitron text-slate-200">CONTINUOUS LISTENING LOOP</div>
                  <div className="text-[11px] text-slate-400 font-mono-tech">
                    Keeps microphone open continuously without manual reactivation
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                  settings.continuousListening
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                    : 'border-slate-700 bg-slate-950'
                }`}
              >
                {settings.continuousListening && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Sound Effects */}
            <div
              onClick={() => onUpdateSettings({ ...settings, soundEffects: !settings.soundEffects })}
              className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-orbitron text-slate-200">TACTICAL HUD SOUND EFFECTS</div>
                  <div className="text-[11px] text-slate-400 font-mono-tech">
                    Play sci-fi tones, mic alerts, and combat sirens
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                  settings.soundEffects
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                    : 'border-slate-700 bg-slate-950'
                }`}
              >
                {settings.soundEffects && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Biometric Security Protocol Link */}
            <div className="flex items-center justify-between p-3 bg-cyan-950/20 rounded-lg border border-cyan-500/30">
              <div className="flex items-center gap-2.5">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-orbitron text-slate-200">
                    BIOMETRIC SECURITY CLEARANCE
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-tech">
                    Facial recognition, voice print passphrase & PIN gateway
                  </div>
                </div>
              </div>
              {onOpenBiometrics && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBiometrics();
                  }}
                  className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-orbitron text-xs font-bold transition-all"
                >
                  CALIBRATE
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            CONFIRM PROTOCOLS
          </button>
        </div>
      </div>
    </div>
  );
};
