export type SystemMode = 'standard' | 'alert' | 'stealth' | 'analysis';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  protocol?: string | null;
  action?: string | null;
  windowsAction?: {
    type: string;
    raw: string;
    params?: Record<string, string>;
  } | null;
  groundingSources?: GroundingSource[];
  isSearchingWeb?: boolean;
  latencyMs?: number;
  isStreaming?: boolean;
}

export interface UserMemoryItem {
  id: string;
  category: 'preference' | 'fact' | 'work' | 'personal' | 'custom' | 'project' | 'general';
  key: string;
  value: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSettings {
  voiceUri: string;
  pitch: number;
  rate: number;
  volume: number;
  autoSpeak: boolean;
  continuousListening: boolean;
  soundEffects: boolean;
  wakeWordEnabled: boolean;
}

export interface SystemTelemetry {
  reactorOutputWatts: number;
  coreTempCelsius: number;
  neuralSyncPercent: number;
  repulsorChargePercent: number;
  satelliteUplinkPingMs: number;
  cpuLoadPercent: number;
  status: 'ONLINE' | 'ENGAGED' | 'STANDBY' | 'LOCKDOWN';
  activeThreatLevel: 'DEFCON 5' | 'DEFCON 3' | 'DEFCON 1 (HOSTILE)';
}

export interface DeviceTelemetry {
  batteryLevel: number | null; // 0 to 100
  isCharging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
  isWakeLockActive: boolean;
  isFullscreen: boolean;
  brightnessPercent: number; // 10 to 100
  isCameraActive: boolean;
  cameraSnapshot: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
  } | null;
  network: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  orientation: {
    alpha: number | null; // 0-360 compass
    beta: number | null;  // front-to-back tilt
    gamma: number | null; // left-to-right tilt
  } | null;
  notificationsEnabled: boolean;
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: string;
}

export interface ProtocolLog {
  id: string;
  title: string;
  category: 'SYSTEM' | 'VOICE' | 'TACTICAL' | 'DEVICE' | 'NEURAL';
  timestamp: string;
  details: string;
}

export interface BiometricSecuritySettings {
  enabled: boolean;
  lockOnStartup: boolean;
  authMode: 'hybrid' | 'face' | 'voice' | 'passcode';
  voicePassphrase: string;
  securityPin: string;
  clearanceLevel: 'LEVEL 10 (ALPHA)' | 'LEVEL 7 (TACTICAL)' | 'DIRECTOR (OVERRIDE)';
  enrolledFaceSnapshot: string | null;
  enrolledFaceTimestamp?: string | null;
  autoLockMinutes: number; // 0 = disabled, 2, 5, 15
}
