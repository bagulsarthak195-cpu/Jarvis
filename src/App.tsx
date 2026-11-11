import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Message,
  SystemMode,
  VoiceSettings,
  SystemTelemetry,
  DeviceTelemetry,
  ActiveTimer,
  ProtocolLog,
  BiometricSecuritySettings,
  UserMemoryItem,
  ConversationSession,
} from './types/jarvis';
import { ArcReactor } from './components/ArcReactor';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { HolographicRadar } from './components/HolographicRadar';
import { ChatHUD } from './components/ChatHUD';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { TacticalTimerWidget } from './components/TacticalTimerWidget';
import { DeviceControlCenter } from './components/DeviceControlCenter';
import { BiometricSecurityModal } from './components/BiometricSecurityModal';
import { MemoryAndSessionsModal } from './components/MemoryAndSessionsModal';
import { speechEngine } from './utils/speechEngine';
import { sfx } from './utils/audioSynthesizer';
import { deviceController } from './utils/deviceController';
import { WindowsDashboard } from './components/WindowsDashboard';
import { ActionConfirmationModal } from './components/ActionConfirmationModal';
import { windowsAgent } from './utils/windowsAgentClient';
import { AgentStatus, ConfirmationRequest } from './types/windows';
import {
  Shield,
  Zap,
  Volume2,
  Sliders,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
  BatteryCharging,
  Battery,
  Maximize2,
  Minimize2,
  Laptop,
  Monitor,
  Lock,
  Unlock,
  Fingerprint,
  Scan,
  Brain,
  Globe,
} from 'lucide-react';

const INITIAL_MESSAGE: Message = {
  id: 'jarvis-init',
  role: 'assistant',
  text: 'Good day, Sir. All Mark VII systems and host device hardware interfaces are online and operating at full capacity. Power grids, optical sensors, display matrix, and neural engines are at your complete disposal. What are your directives?',
  timestamp: new Date().toISOString(),
  protocol: 'NORMAL',
};

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceUri: '',
  pitch: 1.0,
  rate: 1.02,
  volume: 1.0,
  autoSpeak: true,
  continuousListening: false,
  soundEffects: true,
  wakeWordEnabled: true,
};

const DEFAULT_BIOMETRIC_SETTINGS: BiometricSecuritySettings = {
  enabled: true,
  lockOnStartup: false,
  authMode: 'hybrid',
  voicePassphrase: 'I am Iron Man',
  securityPin: '3000',
  clearanceLevel: 'LEVEL 10 (ALPHA)',
  enrolledFaceSnapshot: null,
  enrolledFaceTimestamp: null,
  autoLockMinutes: 0,
};

const DEFAULT_MEMORIES: UserMemoryItem[] = [
  {
    id: 'mem-1',
    category: 'preference',
    key: 'Communication Style',
    value: 'Friendly, articulate, subtle dry British wit, never robotic.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem-2',
    category: 'project',
    key: 'System Architecture',
    value: 'Mark VII J.A.R.V.I.S. neural dashboard with device control and Windows Agent integration.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function App() {
  // Long-Term Memory Bank
  const [userMemories, setUserMemories] = useState<UserMemoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_user_memories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_MEMORIES;
  });

  // Conversation Sessions
  const [sessions, setSessions] = useState<ConversationSession[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'session-main',
        title: 'Tactical Uplink (Primary)',
        messages: [INITIAL_MESSAGE],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('jarvis_active_session_id') || 'session-main';
  });

  // Chat history with persistence synced with active session
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
      if (currentSession && currentSession.messages.length > 0) {
        return currentSession.messages;
      }
    } catch (e) {}
    return [INITIAL_MESSAGE];
  });

  // User moniker / preferred address
  const [userMoniker, setUserMoniker] = useState<string>(() => {
    return localStorage.getItem('jarvis_user_moniker') || 'Sir';
  });

  // Voice settings with persistence
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('jarvis_voice_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // System mode & modals
  const [mode, setMode] = useState<SystemMode>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'windows' | 'device' | 'terminal'>('cockpit');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(windowsAgent.status);
  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);

  // Sync messages into active session and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_chat_history', JSON.stringify(messages));
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages, updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch (e) {}
  }, [messages, activeSessionId]);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_sessions', JSON.stringify(sessions));
      localStorage.setItem('jarvis_active_session_id', activeSessionId);
    } catch (e) {}
  }, [sessions, activeSessionId]);

  // Persist user memories
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_user_memories', JSON.stringify(userMemories));
    } catch (e) {}
  }, [userMemories]);

  // Session Management Handlers
  const handleSelectSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (target) {
      setActiveSessionId(id);
      setMessages(target.messages.length > 0 ? target.messages : [INITIAL_MESSAGE]);
      sfx.playSuccess();
    }
  };

  const handleCreateSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ConversationSession = {
      id: newId,
      title: `Directive Session #${sessions.length + 1}`,
      messages: [
        {
          id: `jarvis-${Date.now()}`,
          role: 'assistant',
          text: `New conversation session initialized, ${userMoniker}. All historical memories and hardware systems remain synchronized. What are your instructions?`,
          timestamp: new Date().toISOString(),
          protocol: 'NORMAL',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMessages(newSession.messages);
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s))
    );
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
      setMessages(remaining[0].messages);
    }
    sfx.playBeep();
  };

  // User Memory Handlers
  const handleAddMemory = (category: UserMemoryItem['category'], key: string, value: string): boolean => {
    const newMem: UserMemoryItem = {
      id: `mem-${Date.now()}`,
      category,
      key,
      value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUserMemories((prev) => [newMem, ...prev]);
    return true;
  };

  const handleDeleteMemory = (id: string) => {
    setUserMemories((prev) => prev.filter((m) => m.id !== id));
    sfx.playBeep();
  };

  const handleClearAllMemories = () => {
    setUserMemories([]);
    sfx.playMicStop();
  };

  // Interrupt Speech Vocalization
  const handleStopSpeaking = () => {
    speechEngine.stopSpeaking();
    setIsSpeaking(false);
    sfx.playBeep();
  };

  // Repeat Last Response
  const handleRepeatLastResponse = () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      sfx.playChirp();
      speechEngine.speak(lastAssistant.text, voiceSettings);
    }
  };

  // Biometric Security Settings with persistence
  const [biometricSettings, setBiometricSettings] = useState<BiometricSecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('jarvis_biometric_settings');
      if (saved) return { ...DEFAULT_BIOMETRIC_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_BIOMETRIC_SETTINGS;
  });

  // Biometric Lock status (Locked on startup if configured)
  const [isSecurityLocked, setIsSecurityLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jarvis_biometric_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.lockOnStartup);
      }
    } catch (e) {}
    return false;
  });

  // Save biometric settings
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_biometric_settings', JSON.stringify(biometricSettings));
    } catch (e) {}
  }, [biometricSettings]);

  // Auto-lock on inactivity
  useEffect(() => {
    if (!biometricSettings.autoLockMinutes || biometricSettings.autoLockMinutes <= 0) return;
    let timeout: any;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsSecurityLocked(true);
      }, biometricSettings.autoLockMinutes * 60 * 1000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [biometricSettings.autoLockMinutes]);

  // Timers
  const [timers, setTimers] = useState<ActiveTimer[]>([]);

  // Real Host Device Telemetry
  const [deviceState, setDeviceState] = useState<DeviceTelemetry>(deviceController.state);

  // Subscribe to Windows Agent status updates
  useEffect(() => {
    windowsAgent.onStatusChange = (status) => {
      setAgentStatus({ ...status });
    };
  }, []);

  // Simulated live telemetry
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    reactorOutputWatts: 3.2,
    coreTempCelsius: 41.8,
    neuralSyncPercent: 99.4,
    repulsorChargePercent: 98,
    satelliteUplinkPingMs: 24,
    cpuLoadPercent: 12,
    status: 'ONLINE',
    activeThreatLevel: 'DEFCON 5',
  });

  // Audio level
  const [liveAudioLevel, setLiveAudioLevel] = useState(0);

  // Subscribe to device controller state updates
  useEffect(() => {
    deviceController.onStateChange = (updated) => {
      setDeviceState({ ...updated });
    };
  }, []);

  // Save chat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_chat_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_voice_settings', JSON.stringify(voiceSettings));
      localStorage.setItem('jarvis_user_moniker', userMoniker);
    } catch (e) {}
  }, [voiceSettings, userMoniker]);

  // Play boot sound on first user interaction
  useEffect(() => {
    const handleFirstClick = () => {
      sfx.playBoot(voiceSettings.soundEffects);
      window.removeEventListener('click', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);
    return () => window.removeEventListener('click', handleFirstClick);
  }, [voiceSettings.soundEffects]);

  // Telemetry updates simulation and server ping
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const start = performance.now();
        const res = await fetch('/api/status');
        const latency = Math.round(performance.now() - start);

        if (res.ok) {
          setTelemetry((prev) => ({
            ...prev,
            satelliteUplinkPingMs: latency,
            coreTempCelsius: 41 + Math.sin(Date.now() / 4000) * 1.5,
            cpuLoadPercent: Math.min(95, Math.max(8, Math.round(15 + Math.random() * 12))),
          }));
        }
      } catch (err) {
        setTelemetry((prev) => ({
          ...prev,
          coreTempCelsius: 41 + Math.sin(Date.now() / 4000) * 1.5,
          cpuLoadPercent: Math.min(95, Math.max(8, Math.round(15 + Math.random() * 12))),
        }));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Timer countdown ticker
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers((prev) =>
        prev
          .map((t) => {
            if (!t.isRunning || t.remainingSeconds <= 0) return t;
            const updated = t.remainingSeconds - 1;
            if (updated === 0) {
              sfx.playTimerAlert(voiceSettings.soundEffects);
              deviceController.vibrate([200, 100, 200, 100, 400]);
              deviceController.sendNotification(
                'J.A.R.V.I.S. Countdown Completed',
                `Timer "${t.label}" has elapsed.`
              );
              speechEngine.speak(
                `Attention, ${userMoniker}: timer for "${t.label}" has reached zero.`,
                voiceSettings
              );
            }
            return { ...t, remainingSeconds: updated };
          })
      );
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [voiceSettings, userMoniker]);

  // Handle Speech Engine Events
  useEffect(() => {
    speechEngine.onSpeakingStart = () => setIsSpeaking(true);
    speechEngine.onSpeakingEnd = () => setIsSpeaking(false);

    speechEngine.onSpeechStart = () => {
      setIsListening(true);
      sfx.playMicStart(voiceSettings.soundEffects);
      deviceController.vibrate(60);
    };

    speechEngine.onSpeechEnd = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    speechEngine.onTranscriptChange = (transcript, isFinal) => {
      setInterimTranscript(transcript);

      if (isFinal && transcript.trim().length > 1) {
        let cleanedQuery = transcript.trim();
        if (voiceSettings.wakeWordEnabled) {
          cleanedQuery = cleanedQuery.replace(/^(hey\s+)?jarvis[,.]?\s*/i, '');
        }

        if (cleanedQuery) {
          handleSendMessage(cleanedQuery);
        }
      }
    };

    speechEngine.onError = (err) => {
      console.warn('Speech engine report:', err);
    };
  }, [voiceSettings, userMoniker]);

  // Poll audio level for radar/reactors
  useEffect(() => {
    const audioInterval = setInterval(() => {
      setLiveAudioLevel(speechEngine.getAudioLevel());
    }, 80);
    return () => clearInterval(audioInterval);
  }, []);

  // Keyboard shortcut: Spacebar to toggle voice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleListening();
      } else if (e.code === 'Escape') {
        speechEngine.stopSpeaking();
        speechEngine.stopListening();
        setIsListening(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, voiceSettings]);

  // Toggle voice listening
  const toggleListening = useCallback(() => {
    if (speechEngine.isListening()) {
      speechEngine.stopListening();
      setIsListening(false);
      sfx.playMicStop(voiceSettings.soundEffects);
    } else {
      speechEngine.stopSpeaking();
      const started = speechEngine.startListening(
        voiceSettings.continuousListening,
        voiceSettings.wakeWordEnabled
      );
      if (started) {
        setIsListening(true);
      }
    }
  }, [voiceSettings]);

  // Execute Real Device Control Actions triggered by conversational AI
  const handleDeviceAction = (action: string | null, rawText: string) => {
    if (!action) return;

    if (action === 'BATTERY') {
      deviceController.initBattery();
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'FULLSCREEN') {
      if (rawText.includes('state="exit"')) {
        deviceController.toggleFullscreen(false);
      } else if (rawText.includes('state="enter"')) {
        deviceController.toggleFullscreen(true);
      } else {
        deviceController.toggleFullscreen();
      }
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'WAKELOCK') {
      if (rawText.includes('state="off"')) {
        deviceController.toggleWakeLock(false);
      } else {
        deviceController.toggleWakeLock(true);
      }
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'BRIGHTNESS') {
      const match = rawText.match(/level="?(\d+)"?/);
      if (match) {
        deviceController.setBrightness(parseInt(match[1], 10));
      }
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'CAMERA') {
      if (rawText.includes('state="close"')) {
        deviceController.stopCamera();
      } else if (rawText.includes('state="snapshot"')) {
        const videoEl = document.querySelector('video');
        if (videoEl) deviceController.captureSnapshot(videoEl);
      } else {
        deviceController.startCamera();
      }
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'GEOLOCATION') {
      deviceController.fetchCoordinates();
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'VIBRATE') {
      deviceController.vibrate([150, 60, 150]);
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'NOTIFICATION') {
      const titleMatch = rawText.match(/title="?([^"]+)"?/);
      const bodyMatch = rawText.match(/body="?([^"]+)"?/);
      const title = titleMatch ? titleMatch[1] : 'J.A.R.V.I.S.';
      const body = bodyMatch ? bodyMatch[1] : 'Device directive executed.';
      deviceController.requestNotificationPermission().then(() => {
        deviceController.sendNotification(title, body);
      });
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'CLIPBOARD') {
      const textMatch = rawText.match(/text="?([^"]+)"?/);
      if (textMatch) {
        deviceController.copyToClipboard(textMatch[1]);
      }
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (action === 'BIOMETRIC_LOCK' || action === 'LOCK_CONSOLE') {
      setIsSecurityLocked(true);
      sfx.playMicStop();
    }
  };

  // Execute Windows Agent Actions triggered by conversational AI or HUD buttons
  const handleWindowsAgentAction = async (
    windowsAction: { type: string; raw: string; params?: Record<string, string> } | null,
    rawText: string
  ) => {
    if (!windowsAction) return;
    const isConnected = windowsAgent.isConnected();

    if (windowsAction.type === 'LAUNCH') {
      const app = windowsAction.params?.app;
      if (isConnected) {
        sfx.playProtocolChirp(voiceSettings.soundEffects);
        const res = await windowsAgent.launchApp(undefined, app);
        if (res.success) {
          deviceController.sendNotification('J.A.R.V.I.S. Windows Agent', res.message);
        }
      } else {
        // Direct user to Windows OS tab for agent setup / manual trigger
        setActiveTab('windows');
      }
    } else if (windowsAction.type === 'METRICS') {
      setActiveTab('windows');
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (windowsAction.type === 'LOCK') {
      if (isConnected) {
        setConfirmationRequest({
          id: `lock-${Date.now()}`,
          actionType: 'lock_workstation',
          title: 'Lock Windows Workstation',
          description: 'Engage Windows workstation lock immediately. Requires user password or PIN to resume.',
          dangerLevel: 'medium',
          confirmedCallback: async () => {
            await windowsAgent.executeDesktopAction('lock_workstation', {}, true);
            deviceController.sendNotification('J.A.R.V.I.S. Windows Agent', 'Workstation locked successfully.');
          },
        });
      } else {
        setActiveTab('windows');
      }
    } else if (windowsAction.type === 'SCREENSHOT') {
      if (isConnected) {
        sfx.playProtocolChirp(voiceSettings.soundEffects);
        await windowsAgent.executeDesktopAction('screenshot', {});
      } else {
        setActiveTab('windows');
      }
    } else if (windowsAction.type === 'FILE_SEARCH') {
      setActiveTab('windows');
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (windowsAction.type === 'OPEN_URL') {
      const url = windowsAction.params?.url;
      if (url) {
        if (isConnected) {
          await windowsAgent.executeDesktopAction('open_url', { url });
        } else {
          window.open(url, '_blank');
        }
      }
    }
  };

  // Send message to backend Gemini API
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    speechEngine.stopSpeaking();

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsProcessing(true);
    setInterimTranscript('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.slice(-12).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          userMoniker: userMoniker,
          currentMode: mode,
          enableWebSearch: enableWebSearch,
          userMemories: userMemories,
          deviceState: {
            batteryLevel: deviceState.batteryLevel,
            isCharging: deviceState.isCharging,
            isWakeLockActive: deviceState.isWakeLockActive,
            isFullscreen: deviceState.isFullscreen,
            brightnessPercent: deviceState.brightnessPercent,
            isCameraActive: deviceState.isCameraActive,
            coordinates: deviceState.coordinates,
            network: deviceState.network,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Neural uplink disruption: ${response.statusText}`);
      }

      const data = await response.json();
      const replyText = data.text || 'Directive acknowledged, Sir.';

      const assistantMessage: Message = {
        id: `jarvis-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
        protocol: data.protocol,
        action: data.action,
        windowsAction: data.windowsAction,
        groundingSources: data.groundingSources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Execute hardware device action if triggered
      if (data.action || data.rawAction) {
        handleDeviceAction(data.action, data.rawAction || replyText);
      }

      // Execute Windows desktop integration action if triggered
      if (data.windowsAction || data.rawWindowsAction) {
        handleWindowsAgentAction(data.windowsAction, data.rawWindowsAction || replyText);
      }

      // Handle any tactical protocols
      handleProtocolAction(data.protocol, replyText);

      // Auto-vocalize response if enabled
      if (voiceSettings.autoSpeak) {
        speechEngine.speak(replyText, voiceSettings);
      }
    } catch (err: any) {
      console.error('Error contacting Jarvis:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `My apologies, ${userMoniker}. An internal neural processing fault has occurred: ${err.message || 'Connection timeout'}. Auxiliary systems remain operational.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Protocol action handler
  const handleProtocolAction = (protocol: string | null, rawText: string) => {
    if (!protocol) return;

    if (protocol === 'ALERT') {
      setMode('alert');
      sfx.playAlertKlaxon(voiceSettings.soundEffects);
      deviceController.vibrate([200, 100, 200]);
    } else if (protocol === 'STEALTH') {
      setMode('stealth');
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (protocol === 'ANALYSIS') {
      setMode('analysis');
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (protocol === 'NORMAL') {
      setMode('standard');
      sfx.playProtocolChirp(voiceSettings.soundEffects);
    } else if (protocol === 'LOCKDOWN') {
      setMode('alert');
      sfx.playAlertKlaxon(voiceSettings.soundEffects);
      deviceController.vibrate([300, 100, 300, 100, 500]);
      setIsSecurityLocked(true);
    } else if (protocol === 'DIAGNOSTIC') {
      triggerDiagnosticsRoutine();
    } else if (protocol === 'TIMER') {
      const secMatch = rawText.match(/seconds="?(\d+)"?/);
      const labelMatch = rawText.match(/label="?([^"]+)"?/);
      const secs = secMatch ? parseInt(secMatch[1], 10) : 60;
      const label = labelMatch ? labelMatch[1] : 'Protocol Timer';
      addTimer(label, secs);
    }
  };

  const triggerDiagnosticsRoutine = () => {
    sfx.playProtocolChirp(voiceSettings.soundEffects);
    deviceController.initBattery();
    deviceController.fetchCoordinates();
    setTelemetry((prev) => ({
      ...prev,
      coreTempCelsius: 38.5,
      neuralSyncPercent: 100,
      repulsorChargePercent: 100,
    }));
  };

  const handleSecurityLockdown = () => {
    setMode('alert');
    sfx.playAlertKlaxon(voiceSettings.soundEffects);
    deviceController.vibrate([400, 150, 400]);
    setIsSecurityLocked(true);
    const lockdownMsg: Message = {
      id: `lockdown-${Date.now()}`,
      role: 'assistant',
      text: `[PROTOCOL:LOCKDOWN] SECURITY LOCKDOWN PROTOCOL INITIATED, ${userMoniker}. All perimeter blast doors sealed. Defense grid operating at maximum voltage.`,
      timestamp: new Date().toISOString(),
      protocol: 'LOCKDOWN',
    };
    setMessages((prev) => [...prev, lockdownMsg]);
    if (voiceSettings.autoSpeak) {
      speechEngine.speak(lockdownMsg.text, voiceSettings);
    }
  };

  const addTimer = (label: string, seconds: number) => {
    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}`,
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
      createdAt: new Date().toISOString(),
    };
    setTimers((prev) => [...prev, newTimer]);
    sfx.playProtocolChirp(voiceSettings.soundEffects);
  };

  const handleRemoveTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleClearChat = () => {
    sfx.playProtocolChirp(voiceSettings.soundEffects);
    setMessages([INITIAL_MESSAGE]);
    localStorage.removeItem('jarvis_chat_history');
  };

  const handleReplayAudio = (text: string) => {
    sfx.playProtocolChirp(voiceSettings.soundEffects);
    speechEngine.speak(text, voiceSettings);
  };

  const theme = {
    standard: {
      border: 'border-cyan-500/30',
      badge: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40',
      accent: 'text-cyan-400',
    },
    alert: {
      border: 'border-red-500/40',
      badge: 'bg-red-950/60 text-red-400 border-red-500/50',
      accent: 'text-red-400',
    },
    stealth: {
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40',
      accent: 'text-emerald-400',
    },
    analysis: {
      border: 'border-amber-500/30',
      badge: 'bg-amber-950/60 text-amber-400 border-amber-500/40',
      accent: 'text-amber-400',
    },
  }[mode];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Real Hardware Display Brightness Tint Filter */}
      {deviceState.brightnessPercent < 100 && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${((100 - deviceState.brightnessPercent) / 100) * 0.85})`,
          }}
        />
      )}

      {/* Background Holographic Scanlines & Grids */}
      <div className="fixed inset-0 hud-grid-pattern opacity-15 pointer-events-none z-0" />
      <div className="fixed inset-0 hud-scanline pointer-events-none z-0 opacity-40" />

      {/* Top HUD Status Bar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Stark Arc Reactor Mini Badge */}
          <div className="relative w-8 h-8 rounded-full flex items-center justify-center bg-cyan-950/80 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.4)]">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
            <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                J.A.R.V.I.S.
              </span>
              <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                MARK VII // DEVICE OVERLORD
              </span>
            </div>
            <span className="text-[10px] font-mono-tech text-slate-400 block -mt-0.5">
              HOST HARDWARE AUTONOMOUS CONTROL & TACTICAL NEURAL INTERFACE
            </span>
          </div>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Windows Agent Status Pill */}
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tech border transition-all ${
              agentStatus.connected
                ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:bg-indigo-900/60'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
            title={
              agentStatus.connected
                ? `Windows Agent Connected (${agentStatus.latencyMs ?? 1}ms)`
                : 'Windows Agent Offline (Running in Web Mode - Click for Setup)'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                agentStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Laptop className={`w-3.5 h-3.5 ${agentStatus.connected ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline font-bold">WIN AGENT</span>
            <span className={`text-[10px] ${agentStatus.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {agentStatus.connected ? 'ONLINE' : 'WEB MODE'}
            </span>
          </button>

          {/* Real Device Battery Badge in Header */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono-tech">
            {deviceState.isCharging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="text-slate-200 font-bold">
              {deviceState.batteryLevel !== null ? `${deviceState.batteryLevel}%` : 'AC PWR'}
            </span>
          </div>

          {/* Fullscreen Quick Toggle */}
          <button
            onClick={() => deviceController.toggleFullscreen()}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 text-slate-400 hover:text-cyan-300 transition-colors"
            title={deviceState.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {deviceState.isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Protocol Badge */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tech border ${theme.badge}`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="font-bold uppercase tracking-wider">{mode} PROTOCOL</span>
          </div>

          {/* Memory & Sessions Button */}
          <button
            onClick={() => setIsMemoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-xs font-mono-tech text-slate-300 hover:text-cyan-300 transition-colors shadow-sm"
            title="Manage Conversation Sessions and Long-Term Memory Bank"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">MEMORY</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 text-[10px] border border-cyan-800/60 font-bold">
              {userMemories.length}
            </span>
          </button>

          {/* Voice Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-xs font-mono-tech text-slate-300 hover:text-cyan-300 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CONFIG</span>
          </button>

          {/* Biometric Security Lock Button */}
          <button
            onClick={() => {
              setIsSecurityLocked(true);
              sfx.playMicStop();
              speechEngine.speak(
                `Console locked, ${userMoniker}. Biometric verification required to resume.`,
                voiceSettings
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-cyan-800/60 hover:border-cyan-400 text-xs font-mono-tech text-slate-300 hover:text-cyan-300 transition-colors shadow-sm"
            title="Lock Console & Engage Biometric Clearance"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">LOCK</span>
          </button>
        </div>
      </header>

      {/* Main Tactical Mode & Tab Switcher Bar */}
      <div className="flex border-b border-slate-800 bg-slate-950/90 z-10 font-orbitron text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('cockpit')}
          className={`flex-1 min-w-[120px] py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'cockpit'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>HUD COCKPIT</span>
        </button>

        <button
          onClick={() => setActiveTab('windows')}
          className={`flex-1 min-w-[140px] py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'windows'
              ? 'border-indigo-400 text-indigo-300 bg-indigo-950/30 font-bold shadow-[0_0_12px_rgba(99,102,241,0.25)]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-indigo-400" />
          <span>WINDOWS OS</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono-tech ${
              agentStatus.connected
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {agentStatus.connected ? 'LIVE' : 'AGENT'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('device')}
          className={`flex-1 min-w-[130px] py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'device'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>DEVICE MATRIX</span>
        </button>

        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 min-w-[130px] py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'terminal'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>COMM CONSOLE</span>
        </button>
      </div>

      {/* Main Content Dashboard */}
      <main className="relative flex-1 p-3 sm:p-4 z-10 max-w-[1750px] w-full mx-auto flex flex-col">
        {activeTab === 'windows' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <WindowsDashboard
              onTriggerConfirmation={(req) => setConfirmationRequest(req)}
              onAssistantVocalize={(txt) => speechEngine.speak(txt, voiceSettings)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* LEFT COLUMN: Holographic Radar, Device Hardware Matrix & Telemetry */}
            <div
              className={`lg:col-span-4 flex flex-col gap-4 ${
                activeTab === 'terminal' ? 'hidden lg:flex' : activeTab === 'device' ? 'flex' : 'flex'
              }`}
            >
              {/* Real Device Hardware Control Matrix */}
              <DeviceControlCenter
                deviceState={deviceState}
                mode={mode}
                onRefreshTelemetry={() => deviceController.initBattery()}
              />

              {/* Tactical Radar & Sensor Scope */}
              <HolographicRadar mode={mode} audioLevel={liveAudioLevel} />

              {/* System Vitals & Diagnostics */}
              <DiagnosticsPanel
                mode={mode}
                onSetMode={setMode}
                telemetry={telemetry}
                onRunDiagnostics={triggerDiagnosticsRoutine}
                onSecurityLockdown={handleSecurityLockdown}
              />

              {/* Active Timers */}
              <TacticalTimerWidget
                timers={timers}
                onRemoveTimer={handleRemoveTimer}
                onToggleTimer={handleToggleTimer}
              />
            </div>

            {/* CENTER COLUMN: Arc Reactor Centerpiece & Audio Visualizer */}
            <div
              className={`lg:col-span-3 flex flex-col items-center justify-between p-4 bg-slate-950/70 border ${theme.border} rounded-xl backdrop-blur-md relative overflow-hidden ${
                activeTab !== 'cockpit' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/70" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/70" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/70" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/70" />

              <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="font-orbitron text-xs font-bold text-slate-300">
                  ARC REACTOR CORE UNIT
                </span>
                <span className="text-[10px] font-mono-tech text-cyan-400">
                  PALLADIUM // VIBRANIUM MATRIX
                </span>
              </div>

              <div className="my-auto py-4">
                <ArcReactor
                  mode={mode}
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  isProcessing={isProcessing}
                  onToggleListening={toggleListening}
                  outputPowerPercent={Math.round(telemetry.reactorOutputWatts * 30)}
                />
              </div>

              <div className="w-full pt-3 border-t border-slate-800/80 text-[11px] font-mono-tech space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>DEVICE HARDWARE LINK:</span>
                  <span className="text-emerald-400 font-bold">ARMED & BOUND</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>WINDOWS AGENT:</span>
                  <span
                    className={`font-bold ${
                      agentStatus.connected ? 'text-indigo-400' : 'text-amber-400'
                    }`}
                  >
                    {agentStatus.connected ? 'ONLINE (127.0.0.1:4141)' : 'WEB MODE (OFFLINE)'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>WAKE LOCK STATUS:</span>
                  <span className="text-cyan-400 font-bold">
                    {deviceState.isWakeLockActive ? 'SUPPRESSING SLEEP' : 'STANDBY'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>OPTICAL SENSOR:</span>
                  <span className="text-cyan-400 font-bold">
                    {deviceState.isCameraActive ? 'LIVE HUD WIREFRAME' : 'CLOSED'}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Communications Console (Chat Terminal) */}
            <div
              className={`lg:col-span-5 flex flex-col h-[650px] lg:h-auto ${
                activeTab === 'cockpit' || activeTab === 'device' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <ChatHUD
                messages={messages}
                onSendMessage={handleSendMessage}
                isProcessing={isProcessing}
                isListening={isListening}
                isSpeaking={isSpeaking}
                onToggleListening={toggleListening}
                interimTranscript={interimTranscript}
                onReplayAudio={handleReplayAudio}
                onStopSpeaking={handleStopSpeaking}
                onRepeatLastResponse={handleRepeatLastResponse}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onClearChat={handleClearChat}
                autoSpeak={voiceSettings.autoSpeak}
                onToggleAutoSpeak={() =>
                  setVoiceSettings((prev) => ({ ...prev, autoSpeak: !prev.autoSpeak }))
                }
                mode={mode}
                enableWebSearch={enableWebSearch}
                onToggleWebSearch={() => setEnableWebSearch((prev) => !prev)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Action Confirmation Modal for Sensitive/Destructive Windows Operations */}
      <ActionConfirmationModal
        request={confirmationRequest}
        onClose={() => setConfirmationRequest(null)}
      />

      {/* Voice & System Configuration Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={voiceSettings}
        onUpdateSettings={setVoiceSettings}
        userMoniker={userMoniker}
        onUpdateUserMoniker={setUserMoniker}
        onOpenBiometrics={() => setIsSecurityLocked(true)}
      />

      {/* Long-Term Memory Bank & Conversation Sessions Modal */}
      <MemoryAndSessionsModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        memories={userMemories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onClearAllMemories={handleClearAllMemories}
      />

      {/* Biometric Face & Voice Authentication Security Clearance Layer */}
      <BiometricSecurityModal
        isOpen={isSecurityLocked}
        onAuthenticated={() => setIsSecurityLocked(false)}
        settings={biometricSettings}
        onUpdateSettings={setBiometricSettings}
        userMoniker={userMoniker}
      />
    </div>
  );
}
