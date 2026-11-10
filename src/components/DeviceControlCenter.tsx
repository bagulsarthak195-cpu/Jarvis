import React, { useRef, useEffect } from 'react';
import { DeviceTelemetry, SystemMode } from '../types/jarvis';
import { deviceController } from '../utils/deviceController';
import { sfx } from '../utils/audioSynthesizer';
import {
  Battery,
  BatteryCharging,
  Maximize2,
  Minimize2,
  Sun,
  Eye,
  EyeOff,
  Camera,
  MapPin,
  Bell,
  Wifi,
  Smartphone,
  Vibrate,
  Copy,
  Shield,
  Compass,
} from 'lucide-react';

interface DeviceControlCenterProps {
  deviceState: DeviceTelemetry;
  mode: SystemMode;
  onRefreshTelemetry: () => void;
}

export const DeviceControlCenter: React.FC<DeviceControlCenterProps> = ({
  deviceState,
  mode,
  onRefreshTelemetry,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mount camera stream to video tag if active
  useEffect(() => {
    if (deviceState.isCameraActive && videoRef.current) {
      deviceController.startCamera().then((stream) => {
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    }
  }, [deviceState.isCameraActive]);

  const handleToggleFullscreen = async () => {
    sfx.playProtocolChirp();
    await deviceController.toggleFullscreen();
  };

  const handleToggleWakeLock = async () => {
    sfx.playProtocolChirp();
    await deviceController.toggleWakeLock();
  };

  const handleToggleCamera = async () => {
    sfx.playProtocolChirp();
    if (deviceState.isCameraActive) {
      deviceController.stopCamera();
    } else {
      const stream = await deviceController.startCamera();
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  const handleTakeSnapshot = () => {
    if (videoRef.current) {
      sfx.playProtocolChirp();
      deviceController.vibrate([80, 40, 80]);
      deviceController.captureSnapshot(videoRef.current);
    }
  };

  const handleTestVibrate = () => {
    sfx.playProtocolChirp();
    deviceController.vibrate([150, 60, 150]);
  };

  const handleRequestNotifications = async () => {
    sfx.playProtocolChirp();
    const granted = await deviceController.requestNotificationPermission();
    if (granted) {
      deviceController.sendNotification(
        'J.A.R.V.I.S. Protocol Engaged',
        'Device notifications linked with Mark VII Defense System.'
      );
    }
  };

  const handleFetchLocation = async () => {
    sfx.playProtocolChirp();
    await deviceController.fetchCoordinates();
  };

  const themeBorder = {
    standard: 'border-cyan-500/30 text-cyan-400',
    alert: 'border-red-500/40 text-red-400',
    stealth: 'border-emerald-500/30 text-emerald-400',
    analysis: 'border-amber-500/30 text-amber-400',
  }[mode];

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg backdrop-blur-md relative overflow-hidden font-rajdhani">
      {/* Corner Bracket Accents */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/60" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/60" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/60" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/60" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="font-orbitron text-xs font-bold tracking-wider text-slate-100">
            DEVICE HARDWARE CONTROL MATRIX
          </span>
        </div>
        <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
          HOST HARDWARE LINKED
        </span>
      </div>

      {/* Grid of Primary Hardware Controls */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech">
        {/* Real Battery Status */}
        <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px]">DEVICE POWER</span>
            {deviceState.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-slate-100">
              {deviceState.batteryLevel !== null ? `${deviceState.batteryLevel}%` : 'AC MAINS'}
            </span>
            <span className="text-[10px] text-slate-400">
              {deviceState.isCharging ? 'CHARGING' : 'BATTERY'}
            </span>
          </div>
          {/* Battery bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (deviceState.batteryLevel ?? 100) < 20
                  ? 'bg-red-500'
                  : deviceState.isCharging
                  ? 'bg-emerald-400'
                  : 'bg-cyan-400'
              }`}
              style={{ width: `${deviceState.batteryLevel ?? 100}%` }}
            />
          </div>
        </div>

        {/* Network Telemetry */}
        <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-[10px]">COMM LINK</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-100 uppercase">
              {deviceState.network.online ? 'ONLINE' : 'OFFLINE'}
            </span>
            <span className="text-[10px] text-cyan-400">
              {deviceState.network.effectiveType?.toUpperCase() || 'BROADBAND'}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 mt-1">
            {deviceState.network.downlink ? `${deviceState.network.downlink} Mbps` : 'FULL CARRIER'}
          </div>
        </div>
      </div>

      {/* Screen & Cockpit Toggles */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Fullscreen Button */}
        <button
          onClick={handleToggleFullscreen}
          className={`p-2 rounded border text-center transition-all flex flex-col items-center justify-center gap-1 ${
            deviceState.isFullscreen
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          {deviceState.isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="text-[9px] font-orbitron font-bold">
            {deviceState.isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}
          </span>
        </button>

        {/* Screen Wake Lock */}
        <button
          onClick={handleToggleWakeLock}
          className={`p-2 rounded border text-center transition-all flex flex-col items-center justify-center gap-1 ${
            deviceState.isWakeLockActive
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
          title="Keep device screen awake"
        >
          {deviceState.isWakeLockActive ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="text-[9px] font-orbitron font-bold">
            {deviceState.isWakeLockActive ? 'WAKE LOCK ON' : 'WAKE LOCK'}
          </span>
        </button>

        {/* Optical Sensor (Camera) */}
        <button
          onClick={handleToggleCamera}
          className={`p-2 rounded border text-center transition-all flex flex-col items-center justify-center gap-1 ${
            deviceState.isCameraActive
              ? 'bg-red-500/20 border-red-400 text-red-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Camera className={`w-3.5 h-3.5 ${deviceState.isCameraActive ? 'text-red-400' : ''}`} />
          <span className="text-[9px] font-orbitron font-bold">
            {deviceState.isCameraActive ? 'CLOSE CAM' : 'OPTIC SCAN'}
          </span>
        </button>
      </div>

      {/* Optical Camera Live HUD Feed Modal / Container */}
      {deviceState.isCameraActive && (
        <div className="relative rounded-lg overflow-hidden border border-cyan-500/50 bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Holographic Wireframe Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none border border-cyan-500/30 m-2 rounded" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-dashed border-cyan-400 rounded-full animate-spin-slow pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-ping pointer-events-none" />

          {/* HUD Vision Text */}
          <div className="absolute top-2 left-2 text-[9px] font-mono-tech text-cyan-400 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/40">
            OPTICAL SCANNER // ACTIVE
          </div>

          {/* Snapshot Button */}
          <button
            onClick={handleTakeSnapshot}
            className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-orbitron font-bold flex items-center gap-1 shadow-md shadow-cyan-500/30"
          >
            <Camera className="w-3 h-3" />
            <span>SNAPSHOT</span>
          </button>
        </div>
      )}

      {/* Hardware Display Brightness Slider */}
      <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono-tech mb-1.5">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>DISPLAY BRIGHTNESS</span>
          </div>
          <span className="text-amber-400 font-bold">{deviceState.brightnessPercent}%</span>
        </div>
        <input
          type="range"
          min="15"
          max="100"
          value={deviceState.brightnessPercent}
          onChange={(e) => deviceController.setBrightness(parseInt(e.target.value, 10))}
          className="w-full accent-amber-400 cursor-pointer"
        />
      </div>

      {/* Secondary Hardware Actions: Vibrate, Location, Notifications */}
      <div className="grid grid-cols-3 gap-1.5 text-xs font-mono-tech">
        {/* Haptic Vibration */}
        <button
          onClick={handleTestVibrate}
          className="p-1.5 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center gap-1 text-[10px] font-orbitron transition-all"
        >
          <Vibrate className="w-3 h-3 text-cyan-400" />
          <span>HAPTICS</span>
        </button>

        {/* Geolocation */}
        <button
          onClick={handleFetchLocation}
          className="p-1.5 rounded bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center gap-1 text-[10px] font-orbitron transition-all"
        >
          <MapPin className="w-3 h-3 text-emerald-400" />
          <span>GEO-LOCATE</span>
        </button>

        {/* OS Notifications */}
        <button
          onClick={handleRequestNotifications}
          className={`p-1.5 rounded border flex items-center justify-center gap-1 text-[10px] font-orbitron transition-all ${
            deviceState.notificationsEnabled
              ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Bell className="w-3 h-3 text-purple-400" />
          <span>ALERTS</span>
        </button>
      </div>

      {/* Real Geolocation Readout if available */}
      {deviceState.coordinates && (
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[10px] font-mono-tech flex justify-between items-center">
          <div>
            <span className="text-slate-400 block">DEVICE GPS FIX:</span>
            <span className="text-emerald-400 font-bold">
              {deviceState.coordinates.latitude}° N, {deviceState.coordinates.longitude}° E
            </span>
          </div>
          <span className="text-slate-500">±{deviceState.coordinates.accuracy}m</span>
        </div>
      )}

      {/* Device Orientation (Gyroscope) if available */}
      {deviceState.orientation && (
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[10px] font-mono-tech flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>ORIENTATION:</span>
          </div>
          <div className="flex gap-2 text-cyan-300 font-bold">
            <span>P: {deviceState.orientation.beta}°</span>
            <span>R: {deviceState.orientation.gamma}°</span>
            <span>H: {deviceState.orientation.alpha}°</span>
          </div>
        </div>
      )}
    </div>
  );
};
