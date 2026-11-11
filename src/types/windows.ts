export interface ApprovedApp {
  id: string;
  name: string;
  command: string;
  aliases: string[];
  category: 'development' | 'productivity' | 'system' | 'utilities' | 'custom';
  isCustom?: boolean;
  path?: string;
  description: string;
}

export interface DiskMetric {
  drive: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

export interface ProcessMetric {
  pid: number;
  name: string;
  memoryBytes: number;
  memoryMb: number;
  cpuPercent?: number;
}

export interface SystemMetrics {
  cpuPercent: number;
  cpuCores: number;
  cpuModel: string;
  ramTotalBytes: number;
  ramUsedBytes: number;
  ramFreeBytes: number;
  ramPercent: number;
  disks: DiskMetric[];
  battery: {
    level: number;
    isCharging: boolean;
  } | null;
  uptimeSeconds: number;
  topProcesses: ProcessMetric[];
  platform: string;
  hostname: string;
  timestamp: string;
  isRealWindowsMetrics: boolean;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  extension: string;
  modifiedAt: string;
}

export interface FileListResult {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
  allowedRoots: string[];
}

export interface DesktopAction {
  id: 'lock_workstation' | 'mute_audio' | 'empty_recycle_bin' | 'screenshot' | 'open_url';
  title: string;
  requiresConfirmation: boolean;
  dangerLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface AgentStatus {
  connected: boolean;
  url: string;
  version?: string;
  hostname?: string;
  os?: string;
  latencyMs?: number;
  lastChecked?: string;
  approvedRoots: string[];
  error?: string;
}

export interface ConfirmationRequest {
  id: string;
  actionType: string;
  title: string;
  description: string;
  target?: string;
  dangerLevel: 'low' | 'medium' | 'high';
  confirmedCallback: () => Promise<void> | void;
}
