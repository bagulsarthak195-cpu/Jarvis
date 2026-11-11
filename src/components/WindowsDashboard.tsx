import React, { useState, useEffect } from 'react';
import {
  AgentStatus,
  ApprovedApp,
  SystemMetrics,
  FileListResult,
  FileItem,
  ConfirmationRequest,
} from '../types/windows';
import { windowsAgent } from '../utils/windowsAgentClient';
import { sfx } from '../utils/audioSynthesizer';
import {
  Monitor,
  Rocket,
  FolderOpen,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Search,
  Plus,
  RefreshCw,
  FolderPlus,
  FileText,
  Folder,
  Trash2,
  ExternalLink,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sliders,
  Terminal,
  Globe,
} from 'lucide-react';

interface WindowsDashboardProps {
  onTriggerConfirmation: (request: ConfirmationRequest) => void;
  onAssistantVocalize?: (text: string) => void;
}

export const WindowsDashboard: React.FC<WindowsDashboardProps> = ({
  onTriggerConfirmation,
  onAssistantVocalize,
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'apps' | 'files' | 'automation'>('metrics');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(windowsAgent.status);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [apps, setApps] = useState<ApprovedApp[]>([]);
  const [fileList, setFileList] = useState<FileListResult | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Custom App Form State
  const [customAppName, setCustomAppName] = useState('');
  const [customAppCmd, setCustomAppCmd] = useState('');
  const [customAppAliases, setCustomAppAliases] = useState('');

  // Agent Config State
  const [configUrl, setConfigUrl] = useState(windowsAgent.getUrl());
  const [configToken, setConfigToken] = useState(windowsAgent.getToken());

  // URL launcher input
  const [customUrl, setCustomUrl] = useState('');

  // Listen to agent status updates
  useEffect(() => {
    windowsAgent.onStatusChange = (st) => {
      setAgentStatus(st);
    };
  }, []);

  // Poll system metrics periodically when connected and metrics tab active
  useEffect(() => {
    let timer: any;
    const fetchMetrics = async () => {
      if (windowsAgent.isConnected()) {
        const m = await windowsAgent.getSystemMetrics();
        if (m) setMetrics(m);
      }
    };

    fetchMetrics();
    if (activeTab === 'metrics') {
      timer = setInterval(fetchMetrics, 2500);
    }
    return () => clearInterval(timer);
  }, [activeTab, agentStatus.connected]);

  // Load apps and files when agent connects or tab changes
  useEffect(() => {
    if (windowsAgent.isConnected()) {
      if (activeTab === 'apps') {
        windowsAgent.getApprovedApps().then(setApps);
      } else if (activeTab === 'files') {
        loadDirectory(currentPath);
      }
    }
  }, [activeTab, agentStatus.connected]);

  const loadDirectory = async (folderPath?: string) => {
    const res = await windowsAgent.listFiles(folderPath);
    if (res) {
      setFileList(res);
      setCurrentPath(res.currentPath);
      setSearchResults([]);
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    sfx.playProtocolChirp();
    await windowsAgent.checkHealth();
    if (windowsAgent.isConnected()) {
      const [m, a, f] = await Promise.all([
        windowsAgent.getSystemMetrics(),
        windowsAgent.getApprovedApps(),
        windowsAgent.listFiles(currentPath),
      ]);
      if (m) setMetrics(m);
      if (a) setApps(a);
      if (f) {
        setFileList(f);
        setCurrentPath(f.currentPath);
      }
    }
    setIsRefreshing(false);
  };

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Launch App Handler
  const handleLaunchApp = async (app: ApprovedApp) => {
    sfx.playProtocolChirp();
    const res = await windowsAgent.launchApp(app.id);
    if (res.success) {
      showFeedback(`Launched ${app.name} successfully.`);
      if (onAssistantVocalize) onAssistantVocalize(`Launched ${app.name}, Sir.`);
    } else {
      showFeedback(`Launch failed: ${res.message}`);
    }
  };

  // Open File Handler
  const handleOpenFile = async (file: FileItem) => {
    sfx.playProtocolChirp();
    const res = await windowsAgent.openFile(file.path);
    if (res.success) {
      showFeedback(`Opened: ${file.name}`);
    } else {
      showFeedback(`Error: ${res.message}`);
    }
  };

  // Delete File Handler (requires confirmation)
  const handleDeleteItem = (file: FileItem) => {
    onTriggerConfirmation({
      id: `del-${Date.now()}`,
      actionType: 'DELETE_FILE',
      title: `Delete ${file.isDirectory ? 'Folder' : 'File'}`,
      description: `Are you sure you want J.A.R.V.I.S. to permanently delete "${file.name}" from your workstation storage?`,
      target: file.path,
      dangerLevel: 'high',
      confirmedCallback: async () => {
        const res = await windowsAgent.deleteFile(file.path, true);
        if (res.success) {
          showFeedback(`Deleted: ${file.name}`);
          loadDirectory(currentPath);
        } else {
          showFeedback(`Delete failed: ${res.message}`);
        }
      },
    });
  };

  // Search Files
  const handleSearchFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    sfx.playProtocolChirp();
    const matches = await windowsAgent.searchFiles(searchQuery.trim(), currentPath);
    setSearchResults(matches);
    setIsSearching(false);
  };

  // Create Folder Handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentPath) return;

    sfx.playProtocolChirp();
    const res = await windowsAgent.createFolder(currentPath, newFolderName.trim());
    if (res.success) {
      showFeedback(`Folder "${newFolderName}" created.`);
      setNewFolderName('');
      setShowNewFolderModal(false);
      loadDirectory(currentPath);
    } else {
      showFeedback(`Failed: ${res.message}`);
    }
  };

  // Add Custom Application
  const handleAddCustomApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAppName.trim() || !customAppCmd.trim()) return;

    const aliases = customAppAliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const res = await windowsAgent.addCustomApp({
      name: customAppName.trim(),
      command: customAppCmd.trim(),
      aliases,
    });

    if (res.success) {
      showFeedback(`Registered custom app: ${customAppName}`);
      setCustomAppName('');
      setCustomAppCmd('');
      setCustomAppAliases('');
      setShowAddAppModal(false);
      windowsAgent.getApprovedApps().then(setApps);
    } else {
      showFeedback(`Registration failed: ${res.message}`);
    }
  };

  // Desktop Actions
  const handleLockWorkstation = () => {
    onTriggerConfirmation({
      id: `lock-${Date.now()}`,
      actionType: 'LOCK_WORKSTATION',
      title: 'Lock Windows Workstation',
      description: 'Engage security lock on your host Windows PC session immediately?',
      dangerLevel: 'medium',
      confirmedCallback: async () => {
        const res = await windowsAgent.executeDesktopAction('lock_workstation');
        showFeedback(res.message);
      },
    });
  };

  const handleOpenUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    sfx.playProtocolChirp();
    const target = customUrl.startsWith('http') ? customUrl : `https://${customUrl}`;
    const res = await windowsAgent.executeDesktopAction('open_url', { url: target });
    showFeedback(res.message);
    setCustomUrl('');
  };

  const handleScreenshot = async () => {
    sfx.playProtocolChirp();
    const res = await windowsAgent.executeDesktopAction('screenshot');
    showFeedback(res.message);
  };

  const handleEmptyRecycleBin = () => {
    onTriggerConfirmation({
      id: `bin-${Date.now()}`,
      actionType: 'EMPTY_RECYCLE_BIN',
      title: 'Purge Windows Recycle Bin',
      description: 'Permanently empty all discarded items from the host Windows Recycle Bin?',
      dangerLevel: 'high',
      confirmedCallback: async () => {
        const res = await windowsAgent.executeDesktopAction('empty_recycle_bin', {}, true);
        showFeedback(res.message);
      },
    });
  };

  const filteredApps = apps.filter((a) => {
    if (!appSearchQuery.trim()) return true;
    const q = appSearchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.aliases.some((alias) => alias.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-950/85 border border-cyan-500/30 rounded-xl backdrop-blur-md relative overflow-hidden shadow-2xl font-rajdhani">
      {/* Background Holographic Grid */}
      <div className="absolute inset-0 hud-grid-pattern opacity-10 pointer-events-none" />

      {/* Action Notification Toast Banner */}
      {actionNotice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-mono-tech shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Header & Agent Connection Status Banner */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/95 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron text-xs sm:text-sm font-bold tracking-wider text-slate-100">
                WINDOWS DESKTOP INTEGRATION MATRIX
              </span>
              {agentStatus.connected ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[10px] font-mono-tech font-bold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE // 127.0.0.1:{agentStatus.url.split(':')[2] || '4141'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[10px] font-mono-tech font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  WEB MODE ONLY (AGENT OFFLINE)
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono-tech text-slate-400 block -mt-0.5">
              SECURE WORKSTATION BRIDGE // STRICT SANDBOX ALLOWLIST ENFORCED
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {agentStatus.connected && agentStatus.latencyMs !== undefined && (
            <span className="text-[10px] font-mono-tech text-slate-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
              PING: <span className="text-emerald-400 font-bold">{agentStatus.latencyMs}ms</span>
            </span>
          )}

          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Refresh Windows Agent Connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono-tech text-slate-300 hover:text-cyan-300 transition-colors"
            title="Configure Windows Local Agent Bridge"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>SETUP</span>
          </button>
        </div>
      </div>

      {/* Offline Agent Help Banner if disconnected */}
      {!agentStatus.connected && (
        <div className="p-3 bg-amber-950/30 border-b border-amber-500/30 text-xs text-amber-200 font-mono-tech flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              To control your Windows PC, start the local agent on your machine:{' '}
              <code className="bg-black/60 px-2 py-0.5 rounded text-cyan-300 border border-amber-500/30 font-bold">
                npm run agent
              </code>
            </span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="text-[10px] font-orbitron underline text-cyan-300 hover:text-cyan-200"
          >
            VIEW INSTRUCTIONS
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/90 font-orbitron text-xs z-10">
        {[
          { id: 'metrics', label: 'LIVE SYSTEM MONITOR', icon: Cpu },
          { id: 'apps', label: 'APP LAUNCHER', icon: Rocket },
          { id: 'files', label: 'FILE ASSISTANT', icon: FolderOpen },
          { id: 'automation', label: 'DESKTOP AUTOMATION', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sfx.playProtocolChirp();
                setActiveTab(tab.id as any);
              }}
              className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30 font-bold shadow-[0_2px_10px_rgba(0,240,255,0.2)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels Container */}
      <div className="flex-1 overflow-y-auto p-4 z-10 space-y-4">
        {/* ======================================================== */}
        {/* TAB 1: REAL SYSTEM MONITOR */}
        {/* ======================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Real Hardware Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-xs font-mono-tech">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200">
                  REAL HARDWARE TELEMETRY // HOST: <strong className="text-cyan-300">{metrics?.hostname || 'LOCAL PC'}</strong> ({metrics?.platform || 'WINDOWS'})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                DISTINCT FROM HUD VISUALS
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Actual CPU Usage */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono-tech mb-2">
                  <span>ACTUAL CPU LOAD</span>
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-orbitron text-2xl font-bold text-cyan-300">
                    {metrics ? `${metrics.cpuPercent}%` : '--%'}
                  </span>
                  <span className="text-[11px] font-mono-tech text-slate-400">
                    {metrics ? `${metrics.cpuCores} CORES` : 'ONLINE'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${metrics?.cpuPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* Actual RAM Usage */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono-tech mb-2">
                  <span>RAM USAGE</span>
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-orbitron text-2xl font-bold text-purple-300">
                    {metrics ? `${metrics.ramPercent}%` : '--%'}
                  </span>
                  <span className="text-[11px] font-mono-tech text-slate-400">
                    {metrics
                      ? `${(metrics.ramUsedBytes / (1024 ** 3)).toFixed(1)} / ${(metrics.ramTotalBytes / (1024 ** 3)).toFixed(1)} GB`
                      : 'STANDBY'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-purple-400 transition-all duration-500"
                    style={{ width: `${metrics?.ramPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* Actual Primary Disk */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono-tech mb-2">
                  <span>STORAGE ({metrics?.disks[0]?.drive || 'C:'})</span>
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-orbitron text-2xl font-bold text-emerald-300">
                    {metrics?.disks[0] ? `${metrics.disks[0].usedPercent}%` : '--%'}
                  </span>
                  <span className="text-[11px] font-mono-tech text-slate-400">
                    {metrics?.disks[0]
                      ? `${(metrics.disks[0].freeBytes / (1024 ** 3)).toFixed(0)} GB FREE`
                      : 'ONLINE'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${metrics?.disks[0]?.usedPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* System Uptime */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono-tech mb-2">
                  <span>SYSTEM UPTIME</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-orbitron text-xl font-bold text-amber-300">
                    {metrics
                      ? `${Math.floor(metrics.uptimeSeconds / 3600)}h ${Math.floor((metrics.uptimeSeconds % 3600) / 60)}m`
                      : '--'}
                  </span>
                  <span className="text-[10px] font-mono-tech text-slate-400">
                    SINCE BOOT
                  </span>
                </div>
                <div className="text-[10px] font-mono-tech text-slate-500 mt-2 truncate">
                  {metrics?.cpuModel || 'Intel / AMD Architecture'}
                </div>
              </div>
            </div>

            {/* Top Running Processes */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-orbitron text-xs font-bold text-slate-200">
                    TOP WORKSTATION PROCESSES (REAL MEMORY CONSUMPTION)
                  </span>
                </div>
                <span className="text-[10px] font-mono-tech text-slate-400">
                  ACTIVE TASKLIST
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono-tech text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[10px] text-slate-400">
                      <th className="py-1.5 px-2">PID</th>
                      <th className="py-1.5 px-2">PROCESS NAME</th>
                      <th className="py-1.5 px-2 text-right">MEMORY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.topProcesses && metrics.topProcesses.length > 0 ? (
                      metrics.topProcesses.map((proc, idx) => (
                        <tr
                          key={`${proc.pid}-${idx}`}
                          className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-1.5 px-2 text-slate-500">{proc.pid}</td>
                          <td className="py-1.5 px-2 text-slate-200 font-bold">{proc.name}</td>
                          <td className="py-1.5 px-2 text-right text-cyan-300 font-bold">
                            {proc.memoryMb} MB
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-slate-500">
                          {agentStatus.connected ? 'Querying process metrics...' : 'Local Windows Agent offline.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: APPLICATION LAUNCHER */}
        {/* ======================================================== */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            {/* Search and Add Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={appSearchQuery}
                  onChange={(e) => setAppSearchQuery(e.target.value)}
                  placeholder="Filter approved applications or aliases (e.g. 'code', 'calc')..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 font-mono-tech focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                onClick={() => setShowAddAppModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/60 text-xs font-orbitron text-cyan-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>REGISTER APPLICATION</span>
              </button>
            </div>

            {/* Approved Apps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800 uppercase">
                        {app.category}
                      </span>
                      {app.isCustom && (
                        <span className="text-[9px] font-mono-tech text-amber-400">CUSTOM</span>
                      )}
                    </div>
                    <h4 className="font-orbitron text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {app.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {app.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.aliases.slice(0, 3).map((al) => (
                        <span
                          key={al}
                          className="text-[9px] font-mono-tech px-1.5 py-0.5 rounded bg-black/60 text-slate-400 border border-slate-800/80"
                        >
                          "{al}"
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchApp(app)}
                    disabled={!agentStatus.connected}
                    className="mt-3 w-full py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 text-xs font-orbitron font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>LAUNCH</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FILE ASSISTANT */}
        {/* ======================================================== */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            {/* Search Bar & Shortcuts */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <form onSubmit={handleSearchFiles} className="relative flex-1 max-w-md flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search approved directories (e.g. 'budget.xlsx')..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 font-mono-tech focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-700/60 text-xs font-orbitron text-cyan-300"
                >
                  {isSearching ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </form>

              <button
                onClick={() => setShowNewFolderModal(true)}
                disabled={!agentStatus.connected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-orbitron text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>NEW FOLDER</span>
              </button>
            </div>

            {/* Approved Root Directories Shortcuts */}
            {fileList?.allowedRoots && fileList.allowedRoots.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono-tech py-1">
                <span className="text-slate-500 uppercase">APPROVED ROOTS:</span>
                {fileList.allowedRoots.map((root) => (
                  <button
                    key={root}
                    onClick={() => loadDirectory(root)}
                    className={`px-2 py-0.5 rounded border transition-colors shrink-0 ${
                      currentPath === root
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {root.split(/[/\\]/).pop() || root}
                  </button>
                ))}
              </div>
            )}

            {/* Current Path Breadcrumbs */}
            {currentPath && (
              <div className="flex items-center gap-2 p-2 rounded bg-black/60 border border-slate-800 text-xs font-mono-tech text-slate-300">
                <span className="text-slate-500 text-[10px]">DIRECTORY:</span>
                <span className="text-cyan-300 truncate">{currentPath}</span>
                {fileList?.parentPath && (
                  <button
                    onClick={() => loadDirectory(fileList.parentPath!)}
                    className="ml-auto text-[10px] text-cyan-400 hover:underline shrink-0"
                  >
                    [UP ONE LEVEL]
                  </button>
                )}
              </div>
            )}

            {/* File List / Search Results View */}
            <div className="border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden">
              <table className="w-full text-left font-mono-tech text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-[10px] text-slate-400">
                    <th className="py-2 px-3">ITEM NAME</th>
                    <th className="py-2 px-3 hidden sm:table-cell">TYPE</th>
                    <th className="py-2 px-3 hidden md:table-cell">SIZE</th>
                    <th className="py-2 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchResults.length > 0 ? searchResults : fileList?.items || []).map((file) => (
                    <tr
                      key={file.path}
                      className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2 px-3 flex items-center gap-2">
                        {file.isDirectory ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        )}
                        <span
                          onClick={() => (file.isDirectory ? loadDirectory(file.path) : handleOpenFile(file))}
                          className={`truncate cursor-pointer hover:underline ${
                            file.isDirectory ? 'text-amber-200 font-bold' : 'text-slate-200'
                          }`}
                        >
                          {file.name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 hidden sm:table-cell uppercase">
                        {file.extension}
                      </td>
                      <td className="py-2 px-3 text-slate-400 hidden md:table-cell">
                        {file.isDirectory ? '--' : `${(file.sizeBytes / 1024).toFixed(1)} KB`}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => (file.isDirectory ? loadDirectory(file.path) : handleOpenFile(file))}
                            className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                            title={file.isDirectory ? 'Browse folder' : 'Open in default Windows app'}
                          >
                            {file.isDirectory ? <ChevronRight className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteItem(file)}
                            className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete file (Requires confirmation)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!fileList?.items || fileList.items.length === 0) && searchResults.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        {agentStatus.connected
                          ? 'No items found in approved directory.'
                          : 'Connect J.A.R.V.I.S. Local Windows Agent to browse workstation files.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DESKTOP AUTOMATION */}
        {/* ======================================================== */}
        {activeTab === 'automation' && (
          <div className="space-y-4">
            {/* Quick Automation Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Lock Workstation */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono-tech text-amber-400">SECURITY</span>
                    <Lock className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-orbitron text-xs font-bold text-slate-100">
                    LOCK WORKSTATION
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Immediately locks current Windows user session.
                  </p>
                </div>
                <button
                  onClick={handleLockWorkstation}
                  disabled={!agentStatus.connected}
                  className="mt-3 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 text-xs font-orbitron font-bold transition-all"
                >
                  LOCK PC
                </button>
              </div>

              {/* Windows Screen Snip */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono-tech text-cyan-400">OPTICAL</span>
                    <Camera className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h4 className="font-orbitron text-xs font-bold text-slate-100">
                    SCREEN SNIPPING TOOL
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Triggers native Windows Screen Snipping utility.
                  </p>
                </div>
                <button
                  onClick={handleScreenshot}
                  disabled={!agentStatus.connected}
                  className="mt-3 py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/60 text-cyan-300 text-xs font-orbitron font-bold transition-all"
                >
                  TAKE SNIP
                </button>
              </div>

              {/* Purge Recycle Bin */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono-tech text-red-400">STORAGE</span>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </div>
                  <h4 className="font-orbitron text-xs font-bold text-slate-100">
                    EMPTY RECYCLE BIN
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Purges discarded items (requires confirmation).
                  </p>
                </div>
                <button
                  onClick={handleEmptyRecycleBin}
                  disabled={!agentStatus.connected}
                  className="mt-3 py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/60 text-red-300 text-xs font-orbitron font-bold transition-all"
                >
                  PURGE BIN
                </button>
              </div>

              {/* Safe URL Launcher */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono-tech text-purple-400">NAVIGATION</span>
                    <Globe className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="font-orbitron text-xs font-bold text-slate-100">
                    OPEN APPROVED URL
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Launch validated web address in default browser.
                  </p>
                </div>
                <form onSubmit={handleOpenUrl} className="mt-2 flex gap-1">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="github.com..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono-tech focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!agentStatus.connected || !customUrl.trim()}
                    className="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-orbitron font-bold disabled:opacity-40"
                  >
                    OPEN
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: LOCAL AGENT CONFIG & SETUP INSTRUCTIONS */}
      {/* ======================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-950 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron text-sm font-bold text-slate-100">
                  WINDOWS LOCAL AGENT SETUP
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 font-mono-tech">
              <div className="p-3 bg-slate-900/90 rounded border border-slate-800 space-y-2">
                <span className="font-orbitron text-cyan-300 block font-bold">
                  HOW TO RUN ON YOUR WINDOWS WORKSTATION:
                </span>
                <p className="text-slate-400 leading-relaxed">
                  1. Open VS Code or PowerShell in your downloaded project folder.
                  <br />
                  2. Run the secure local agent command:
                </p>
                <div className="p-2 bg-black rounded border border-cyan-500/40 text-cyan-300 font-bold flex justify-between items-center">
                  <code>npm run agent</code>
                  <span className="text-[10px] text-slate-500">BOUND TO 127.0.0.1:4141</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  This binds exclusively to your local machine loopback for rock-solid security.
                </p>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">LOCAL AGENT URL</label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">BEARER AUTH TOKEN</label>
                <input
                  type="password"
                  value={configToken}
                  onChange={(e) => setConfigToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-orbitron text-slate-300"
              >
                CLOSE
              </button>
              <button
                onClick={() => {
                  windowsAgent.setConfig(configUrl, configToken);
                  setShowConfigModal(false);
                }}
                className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold"
              >
                SAVE & RECONNECT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTER CUSTOM APPLICATION */}
      {/* ======================================================== */}
      {showAddAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <form
            onSubmit={handleAddCustomApp}
            className="relative w-full max-w-md bg-slate-950 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-3 font-mono-tech text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-orbitron text-sm font-bold text-slate-100">
                REGISTER APPROVED APPLICATION
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAppModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">APPLICATION NAME</label>
              <input
                type="text"
                required
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="e.g. Blender, Discord, Slack"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">EXECUTABLE COMMAND OR FULL PATH</label>
              <input
                type="text"
                required
                value={customAppCmd}
                onChange={(e) => setCustomAppCmd(e.target.value)}
                placeholder="e.g. blender.exe or C:\Path\To\App.exe"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">VOICE ALIASES (COMMA-SEPARATED)</label>
              <input
                type="text"
                value={customAppAliases}
                onChange={(e) => setCustomAppAliases(e.target.value)}
                placeholder="e.g. 3d modeler, blender app"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddAppModal(false)}
                className="px-4 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-orbitron text-slate-300"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold"
              >
                CONFIRM
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW FOLDER */}
      {/* ======================================================== */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <form
            onSubmit={handleCreateFolder}
            className="relative w-full max-w-sm bg-slate-950 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-3 font-mono-tech text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-orbitron text-sm font-bold text-slate-100">
                CREATE DIRECTORY
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">FOLDER NAME</label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Stark_Projects"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-orbitron text-slate-300"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold"
              >
                CREATE
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
