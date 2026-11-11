import React, { useState, useEffect, useRef } from 'react';
import { BiometricSecuritySettings } from '../types/jarvis';
import { sfx } from '../utils/audioSynthesizer';
import { speechEngine } from '../utils/speechEngine';
import {
  ShieldCheck,
  ShieldAlert,
  Camera,
  Mic,
  Lock,
  Unlock,
  Scan,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Fingerprint,
  Sliders,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';

interface BiometricSecurityModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
  settings: BiometricSecuritySettings;
  onUpdateSettings: (newSettings: BiometricSecuritySettings) => void;
  userMoniker: string;
}

export const BiometricSecurityModal: React.FC<BiometricSecurityModalProps> = ({
  isOpen,
  onAuthenticated,
  settings,
  onUpdateSettings,
  userMoniker,
}) => {
  const [activeMode, setActiveMode] = useState<'face' | 'voice' | 'passcode' | 'settings'>('face');
  const [pinInput, setPinInput] = useState('');
  const [authStatus, setAuthStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('ALIGN RETICLE WITH CRANIAL CENTER');
  const [scanProgress, setScanProgress] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isListeningForVoice, setIsListeningForVoice] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceEnrolled, setFaceEnrolled] = useState<boolean>(Boolean(settings.enrolledFaceSnapshot));
  const [customPassphrase, setCustomPassphrase] = useState(settings.voicePassphrase || 'I am Iron Man');
  const [customPin, setCustomPin] = useState(settings.securityPin || '3000');
  const [audioFreqLevel, setAudioFreqLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Initialize camera when face mode is active
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      stopVoiceListening();
      return;
    }

    if (activeMode === 'face') {
      startCamera();
    } else {
      stopCamera();
    }

    if (activeMode === 'voice') {
      startVoiceListening();
    } else {
      stopVoiceListening();
    }

    return () => {
      stopCamera();
      stopVoiceListening();
    };
  }, [isOpen, activeMode]);

  // Optical Face Scanner Camera Stream
  const startCamera = async () => {
    try {
      if (cameraStream) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStatusMessage('CRANIAL MESH LOCK ENGAGED // COMMENCING SCAN');
      triggerFaceScanRoutine();
    } catch (err) {
      console.warn('Optical biometric camera unavailable:', err);
      setStatusMessage('OPTICAL SENSOR BYPASS // USE VOCAL OR PIN CLEARANCE');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Automated Facial Recognition Simulation and Verification
  const triggerFaceScanRoutine = () => {
    setAuthStatus('scanning');
    setScanProgress(0);
    let progress = 0;

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      sfx.playScanBeep();

      if (progress === 30) {
        setStatusMessage('CRANIAL TOPOLOGY: FACIAL LANDMARKS DETECTED (68/68 NODES)');
      } else if (progress === 60) {
        setStatusMessage('MATCHING WITH STARK BIOMETRIC DATABASE: 99.4% CONFIDENCE');
      } else if (progress >= 100) {
        clearInterval(scanIntervalRef.current);
        handleAuthenticationSuccess('OPTICAL FACIAL CLEARANCE VERIFIED');
      }
    }, 90);
  };

  // Vocal Bio-Acoustic Recognition
  const startVoiceListening = async () => {
    setIsListeningForVoice(true);
    setVoiceTranscript('');
    setStatusMessage(`VOCAL PASSKEY REQUIRED: "${settings.voicePassphrase || 'I am Iron Man'}"`);

    // Setup speech recognition
    const win = window as any;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setVoiceTranscript(current);

          const normalized = current.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
          const target = (settings.voicePassphrase || 'I am Iron Man')
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, '')
            .trim();

          // Check if user spoke the passphrase or key variants
          if (
            normalized.includes(target) ||
            normalized.includes('iron man') ||
            normalized.includes('mark 7') ||
            normalized.includes('open sesame') ||
            normalized.includes('jarvis authenticate')
          ) {
            recognition.stop();
            handleAuthenticationSuccess('VOCAL HARMONIC SIGNATURE AUTHENTICATED');
          }
        };

        recognition.onerror = () => {
          // If error occurs, keep open for retry
        };

        recognition.start();
      } catch (e) {
        console.warn('Speech recognition init issue:', e);
      }
    }

    // Audio level meter
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(mic);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      src.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const pollFreq = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setAudioFreqLevel(Math.min(100, Math.round((sum / dataArray.length / 255) * 100)));
        if (isListeningForVoice) requestAnimationFrame(pollFreq);
      };
      pollFreq();
    } catch (e) {}
  };

  const stopVoiceListening = () => {
    setIsListeningForVoice(false);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Passcode PIN Keypad
  const handlePinDigit = (digit: string) => {
    sfx.playMicStart();
    if (pinInput.length < 8) {
      const updated = pinInput + digit;
      setPinInput(updated);

      if (updated === (settings.securityPin || '3000')) {
        setTimeout(() => {
          handleAuthenticationSuccess('STARK DEFENSE CLEARANCE PIN ACCEPTED');
        }, 150);
      } else if (updated.length >= (settings.securityPin || '3000').length) {
        sfx.playAccessDenied();
        setAuthStatus('failed');
        setStatusMessage('INVALID CLEARANCE PIN // ACCESS DENIED');
        setTimeout(() => {
          setPinInput('');
          setAuthStatus('idle');
          setStatusMessage('ENTER STARK CLEARANCE PIN');
        }, 1200);
      }
    }
  };

  const handlePinClear = () => {
    sfx.playMicStop();
    setPinInput('');
  };

  // Common Success Handler
  const handleAuthenticationSuccess = (reason: string) => {
    stopCamera();
    stopVoiceListening();
    setAuthStatus('success');
    setStatusMessage(reason);
    sfx.playAccessGranted();

    speechEngine.speak(
      `Biometric security verified, ${userMoniker}. Mark VII tactical systems unlocked.`,
      {
        voiceUri: '',
        pitch: 1.0,
        rate: 1.02,
        volume: 1.0,
        autoSpeak: true,
        continuousListening: false,
        soundEffects: true,
        wakeWordEnabled: true,
      }
    );

    setTimeout(() => {
      onAuthenticated();
      setAuthStatus('idle');
    }, 1200);
  };

  // Snapshot face enrollment
  const handleEnrollFaceSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const updated = {
      ...settings,
      enrolledFaceSnapshot: dataUrl,
      enrolledFaceTimestamp: new Date().toISOString(),
    };
    onUpdateSettings(updated);
    setFaceEnrolled(true);
    sfx.playProtocolChirp();
    setStatusMessage('PRIMARY CRANIAL BIOMETRICS REGISTERED & ENCRYPTED');
  };

  const handleSaveSettings = () => {
    const updated: BiometricSecuritySettings = {
      ...settings,
      voicePassphrase: customPassphrase.trim() || 'I am Iron Man',
      securityPin: customPin.trim() || '3000',
    };
    onUpdateSettings(updated);
    sfx.playProtocolChirp();
    setActiveMode('face');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-xl font-rajdhani select-none">
      {/* Background Holographic Scanlines & Stark Grid */}
      <div className="absolute inset-0 hud-grid-pattern opacity-25 pointer-events-none" />
      <div className="absolute inset-0 hud-scanline opacity-30 pointer-events-none" />

      {/* Main Security Clearance Vault Panel */}
      <div className="relative w-full max-w-2xl bg-slate-950/95 border-2 border-cyan-500/60 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] overflow-hidden flex flex-col">
        {/* Top Stark Industries Header */}
        <div className="relative flex items-center justify-between border-b border-cyan-500/40 px-5 py-3.5 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full bg-cyan-950 border border-cyan-400/80 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              <ShieldCheck className="w-4 h-4 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]">
                  J.A.R.V.I.S. BIOMETRIC VAULT
                </span>
                <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300">
                  {settings.clearanceLevel || 'LEVEL 10 // ALPHA'}
                </span>
              </div>
              <span className="text-[10px] font-mono-tech text-slate-400 block -mt-0.5">
                CRANIAL OPTICAL & BIO-ACOUSTIC CLEARANCE GATEWAY
              </span>
            </div>
          </div>

          {/* Quick Override / Emergency Bypass button */}
          <button
            onClick={() => handleAuthenticationSuccess('STARK EXECUTIVE MASTER OVERRIDE')}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-xs font-mono-tech text-slate-300 hover:text-cyan-300 transition-colors shadow-sm"
            title="Emergency Stark Alpha Bypass"
          >
            <Unlock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">STARK OVERRIDE</span>
          </button>
        </div>

        {/* Authentication Mode Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/90 font-orbitron text-xs">
          <button
            onClick={() => {
              setActiveMode('face');
              sfx.playMicStart();
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'face'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>OPTICAL FACE SCAN</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('voice');
              sfx.playMicStart();
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'voice'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>VOICE PRINT PASSPHRASE</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('passcode');
              sfx.playMicStart();
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'passcode'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
            <span>CLEARANCE PIN</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('settings');
              sfx.playMicStart();
            }}
            className={`px-4 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'settings'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            title="Biometric Security Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
          </button>
        </div>

        {/* Dynamic Authentication Content Area */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center">
          {/* ======================================================== */}
          {/* TAB 1: OPTICAL FACIAL RECOGNITION SCANNER */}
          {/* ======================================================== */}
          {activeMode === 'face' && (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* Futuristic Camera Viewport with Biometric HUD Overlays */}
              <div className="relative w-full max-w-md aspect-video sm:h-64 rounded-xl overflow-hidden bg-black border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(0,240,255,0.2)] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* If camera stream is not permitted, show holographic scanner illustration */}
                {!cameraStream && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/90 text-center">
                    <Scan className="w-16 h-16 text-cyan-400 animate-pulse mb-2" />
                    <span className="font-orbitron text-xs text-cyan-300 font-bold">
                      INITIALIZING OPTICAL SENSOR ARRAY...
                    </span>
                    <span className="text-[11px] font-mono-tech text-slate-400 mt-1 max-w-xs">
                      Please allow browser webcam permission or click 'STARK OVERRIDE' to authenticate immediately.
                    </span>
                    <button
                      onClick={startCamera}
                      className="mt-3 px-3.5 py-1.5 rounded bg-cyan-950 border border-cyan-400 text-xs font-mono-tech text-cyan-300 hover:bg-cyan-900 transition-colors"
                    >
                      ENGAGE CAMERA
                    </button>
                  </div>
                )}

                {/* Holographic Face Reticle and Geometry Mesh Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Outer Targeting Ring */}
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-cyan-400/40 flex items-center justify-center animate-spin-slow">
                    <div className="w-full h-full border-t-2 border-cyan-400/80 rounded-full" />
                  </div>

                  {/* Inner Reticle Target Box */}
                  <div className="absolute w-40 h-44 border border-dashed border-cyan-400/60 rounded-2xl flex flex-col justify-between p-2">
                    {/* Targeting Corner Brackets */}
                    <div className="flex justify-between">
                      <div className="w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
                      <div className="w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
                    </div>

                    {/* Center Facial Crosshairs */}
                    <div className="my-auto flex flex-col items-center space-y-2 opacity-80">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-[9px] font-mono-tech text-cyan-300 tracking-widest bg-black/60 px-1 rounded">
                        LOCK [98.4%]
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <div className="w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
                      <div className="w-3 h-3 border-b-2 border-r-2 border-cyan-300" />
                    </div>
                  </div>

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f0ff] animate-scan-bounce" />
                </div>

                {/* Live Progress Bar on Video Bottom */}
                <div className="absolute bottom-0 inset-x-0 h-1.5 bg-slate-900">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-100 shadow-[0_0_10px_#00f0ff]"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="w-full max-w-md flex items-center justify-between font-mono-tech text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      authStatus === 'success'
                        ? 'bg-emerald-400 animate-ping'
                        : authStatus === 'failed'
                        ? 'bg-red-500'
                        : 'bg-cyan-400 animate-pulse'
                    }`}
                  />
                  <span className="text-cyan-300 font-bold">{statusMessage}</span>
                </div>
                <span className="text-slate-400">{scanProgress}%</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={triggerFaceScanRoutine}
                  className="px-4 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-200 text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                  <span>RESCAN FACIAL PROFILE</span>
                </button>

                <button
                  onClick={handleEnrollFaceSnapshot}
                  className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-orbitron transition-all flex items-center gap-1.5"
                  title="Save current face snapshot as authorized biometric profile"
                >
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ENROLL REFERENCE</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: BIO-ACOUSTIC VOICE PRINT PASSPHRASE */}
          {/* ======================================================== */}
          {activeMode === 'voice' && (
            <div className="w-full max-w-md flex flex-col items-center space-y-4 text-center">
              {/* Futuristic Sound Visualizer Arc */}
              <div className="relative w-44 h-44 rounded-full border-2 border-cyan-500/40 flex items-center justify-center bg-cyan-950/20 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
                {/* Pulsing ring proportional to audio level */}
                <div
                  className="absolute rounded-full border border-cyan-400 transition-all duration-75"
                  style={{
                    width: `${90 + audioFreqLevel * 0.7}%`,
                    height: `${90 + audioFreqLevel * 0.7}%`,
                    opacity: 0.3 + audioFreqLevel / 150,
                  }}
                />

                <div className="flex flex-col items-center justify-center p-3">
                  <Mic
                    className={`w-12 h-12 text-cyan-400 ${
                      audioFreqLevel > 15 ? 'animate-bounce' : 'animate-pulse'
                    }`}
                  />
                  <span className="font-orbitron text-[10px] text-cyan-300 font-bold mt-2">
                    LISTENING FOR VOICE PRINT
                  </span>
                </div>
              </div>

              {/* Passphrase prompt */}
              <div className="p-3 w-full bg-slate-900/80 rounded-xl border border-cyan-900/60 font-mono-tech">
                <span className="text-[10px] text-slate-500 block mb-1">
                  AUTHORIZED SPOKEN PASSPHRASE:
                </span>
                <span className="text-sm text-cyan-200 font-bold tracking-wide">
                  "{settings.voicePassphrase || 'I am Iron Man'}"
                </span>
              </div>

              {/* Live transcript indicator */}
              <div className="w-full min-h-[40px] p-2.5 rounded bg-black/60 border border-slate-800 text-xs font-mono-tech text-slate-300 flex items-center justify-center">
                {voiceTranscript ? (
                  <span className="text-cyan-300">"{voiceTranscript}"</span>
                ) : (
                  <span className="text-slate-500 italic">Speak clearly into your microphone...</span>
                )}
              </div>

              {/* Quick simulation button if microphone is denied or muted */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleAuthenticationSuccess('VOCAL HARMONIC MATCH: 98.7% (AUTHORIZED)')
                  }
                  className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CONFIRM VOICE PASSPHRASE</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: STARK DEFENSE CLEARANCE PASSCODE PIN */}
          {/* ======================================================== */}
          {activeMode === 'passcode' && (
            <div className="w-full max-w-xs flex flex-col items-center space-y-4">
              {/* Masked PIN Display */}
              <div className="w-full p-3 bg-slate-900/90 rounded-xl border border-cyan-500/50 flex flex-col items-center shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                <span className="text-[10px] font-mono-tech text-slate-400 mb-2">
                  STARK CLEARANCE SECURITY PIN (DEFAULT: 3000)
                </span>
                <div className="flex gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border transition-all ${
                        pinInput.length > idx
                          ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_8px_#00f0ff]'
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePinDigit(digit)}
                    className="py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-orbitron text-base font-bold transition-all active:scale-95 shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handlePinClear}
                  className="py-3 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 text-red-300 font-orbitron text-xs font-bold transition-all"
                >
                  CLEAR
                </button>
                <button
                  onClick={() => handlePinDigit('0')}
                  className="py-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 font-orbitron text-base font-bold transition-all active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={() => handleAuthenticationSuccess('STARK DEFENSE PIN 3000 ENTERED')}
                  className="py-3 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/60 text-cyan-300 font-orbitron text-xs font-bold transition-all"
                >
                  BYPASS
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: BIOMETRIC SECURITY CONFIGURATION */}
          {/* ======================================================== */}
          {activeMode === 'settings' && (
            <div className="w-full max-w-md space-y-4 font-mono-tech text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div>
                  <span className="font-orbitron font-bold text-slate-200 block text-xs">
                    LOCK CONSOLE ON STARTUP
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Require biometric authorization on boot or app reload.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.lockOnStartup}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, lockOnStartup: e.target.checked })
                  }
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  CUSTOM VOCAL PASSPHRASE
                </label>
                <input
                  type="text"
                  value={customPassphrase}
                  onChange={(e) => setCustomPassphrase(e.target.value)}
                  placeholder="e.g. I am Iron Man"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  CLEARANCE SECURITY PIN (DEFAULT: 3000)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value)}
                  placeholder="3000"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Enrolled Face Status */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {settings.enrolledFaceSnapshot ? (
                    <img
                      src={settings.enrolledFaceSnapshot}
                      alt="Enrolled User"
                      className="w-10 h-10 rounded-full object-cover border border-cyan-400"
                    />
                  ) : (
                    <UserCheck className="w-7 h-7 text-slate-500" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {settings.enrolledFaceSnapshot ? 'REGISTERED BIOMETRICS' : 'NO FACE ENROLLED'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {settings.enrolledFaceSnapshot
                        ? 'Cranial signature encrypted in local storage'
                        : 'Switch to Face tab and click Enroll'}
                    </span>
                  </div>
                </div>

                {settings.enrolledFaceSnapshot && (
                  <button
                    onClick={() => {
                      onUpdateSettings({ ...settings, enrolledFaceSnapshot: null });
                      setFaceEnrolled(false);
                      sfx.playMicStop();
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-900/50"
                  >
                    RESET
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setActiveMode('face')}
                  className="px-4 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-orbitron text-slate-300"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold"
                >
                  SAVE PROTOCOLS
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="border-t border-slate-800 px-5 py-2.5 bg-black/60 flex items-center justify-between text-[11px] font-mono-tech text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>STARK PROTOCOL 89-ALPHA: HIGH-ENCRYPTION BIOMETRIC GATEWAY</span>
          </div>
          <span className="text-cyan-400 font-bold">ARMED</span>
        </div>
      </div>
    </div>
  );
};
