import { DeviceTelemetry } from '../types/jarvis';

class DeviceController {
  private wakeLockSentinel: any = null;
  private cameraStream: MediaStream | null = null;
  private batteryInstance: any = null;
  private orientationListener: ((e: DeviceOrientationEvent) => void) | null = null;

  public state: DeviceTelemetry = {
    batteryLevel: null,
    isCharging: null,
    chargingTime: null,
    dischargingTime: null,
    isWakeLockActive: false,
    isFullscreen: false,
    brightnessPercent: 100,
    isCameraActive: false,
    cameraSnapshot: null,
    coordinates: null,
    network: {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
    orientation: null,
    notificationsEnabled: false,
  };

  public onStateChange: ((state: DeviceTelemetry) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initBattery();
      this.initNetwork();
      this.initFullscreenListener();
      this.initOrientation();
      this.checkNotificationStatus();
    }
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  // 1. BATTERY CONTROLS & MONITORING
  public async initBattery() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryInstance = battery;

        const updateBattery = () => {
          this.state.batteryLevel = Math.round(battery.level * 100);
          this.state.isCharging = battery.charging;
          this.state.chargingTime = battery.chargingTime;
          this.state.dischargingTime = battery.dischargingTime;
          this.notify();
        };

        updateBattery();

        battery.addEventListener('chargingchange', updateBattery);
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingtimechange', updateBattery);
        battery.addEventListener('dischargingtimechange', updateBattery);
      } catch (e) {
        console.warn('Battery API not permitted or supported:', e);
      }
    }
  }

  // 2. SCREEN WAKE LOCK (Prevents display from sleeping)
  public async toggleWakeLock(enable?: boolean): Promise<boolean> {
    const shouldEnable = enable !== undefined ? enable : !this.state.isWakeLockActive;

    if (shouldEnable) {
      if ('wakeLock' in navigator) {
        try {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          this.state.isWakeLockActive = true;
          this.wakeLockSentinel.addEventListener('release', () => {
            this.state.isWakeLockActive = false;
            this.notify();
          });
          this.notify();
          return true;
        } catch (err) {
          console.warn('Wake Lock request error:', err);
          return false;
        }
      }
      return false;
    } else {
      if (this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
      this.state.isWakeLockActive = false;
      this.notify();
      return true;
    }
  }

  // 3. FULLSCREEN CONTROLS
  public async toggleFullscreen(enable?: boolean): Promise<boolean> {
    const doc = document as any;
    const isFull = Boolean(
      doc.fullscreenElement ||
      doc.mozFullScreenElement ||
      doc.webkitFullscreenElement ||
      doc.msFullscreenElement
    );

    const shouldFull = enable !== undefined ? enable : !isFull;

    try {
      if (shouldFull) {
        const el = document.documentElement as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
        this.state.isFullscreen = true;
      } else {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
        this.state.isFullscreen = false;
      }
      this.notify();
      return true;
    } catch (e) {
      console.warn('Fullscreen toggle prevented or unsupported:', e);
      return false;
    }
  }

  private initFullscreenListener() {
    const handleFsChange = () => {
      const doc = document as any;
      this.state.isFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.mozFullScreenElement ||
        doc.webkitFullscreenElement ||
        doc.msFullscreenElement
      );
      this.notify();
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
  }

  // 4. SOFTWARE DISPLAY BRIGHTNESS CONTROL (10% to 100%)
  public setBrightness(percent: number) {
    const clamped = Math.max(10, Math.min(100, Math.round(percent)));
    this.state.brightnessPercent = clamped;
    this.notify();
  }

  // 5. HAPTIC VIBRATION
  public vibrate(pattern: number | number[] = [120, 60, 120]): boolean {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        return navigator.vibrate(pattern);
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // 6. OPTICAL CAMERA SCANNER SENSOR
  public async startCamera(): Promise<MediaStream | null> {
    if (this.cameraStream) return this.cameraStream;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.cameraStream = stream;
      this.state.isCameraActive = true;
      this.notify();
      return stream;
    } catch (e) {
      console.warn('Camera access denied or unavailable:', e);
      this.state.isCameraActive = false;
      this.notify();
      return null;
    }
  }

  public stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
    this.state.isCameraActive = false;
    this.notify();
  }

  public captureSnapshot(videoElement: HTMLVideoElement): string | null {
    if (!videoElement || videoElement.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoElement, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.state.cameraSnapshot = dataUrl;
      this.notify();
      return dataUrl;
    } catch (e) {
      return null;
    }
  }

  // 7. GEOLOCATION POSITIONING
  public async fetchCoordinates(): Promise<DeviceTelemetry['coordinates']> {
    if (!('geolocation' in navigator)) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: parseFloat(pos.coords.latitude.toFixed(5)),
            longitude: parseFloat(pos.coords.longitude.toFixed(5)),
            altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
            accuracy: Math.round(pos.coords.accuracy),
          };
          this.state.coordinates = coords;
          this.notify();
          resolve(coords);
        },
        (err) => {
          console.warn('Geolocation warning:', err.message);
          resolve(null);
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  // 8. SYSTEM OS NOTIFICATIONS
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      this.state.notificationsEnabled = true;
      this.notify();
      return true;
    }

    try {
      const perm = await Notification.requestPermission();
      this.state.notificationsEnabled = perm === 'granted';
      this.notify();
      return perm === 'granted';
    } catch (e) {
      return false;
    }
  }

  private checkNotificationStatus() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.state.notificationsEnabled = Notification.permission === 'granted';
    }
  }

  public sendNotification(title: string, body: string): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // 9. NETWORK CONNECTIVITY
  private initNetwork() {
    const updateNet = () => {
      const conn = (navigator as any).connection;
      this.state.network = {
        online: navigator.onLine,
        effectiveType: conn?.effectiveType,
        downlink: conn?.downlink,
        rtt: conn?.rtt,
      };
      this.notify();
    };

    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateNet);
    }
    updateNet();
  }

  // 10. CLIPBOARD CONTROL
  public async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  public async readFromClipboard(): Promise<string | null> {
    try {
      return await navigator.clipboard.readText();
    } catch (e) {
      return null;
    }
  }

  // 11. ORIENTATION & GYROSCOPE
  private initOrientation() {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      this.orientationListener = (e: DeviceOrientationEvent) => {
        if (e.alpha !== null || e.beta !== null || e.gamma !== null) {
          this.state.orientation = {
            alpha: e.alpha !== null ? Math.round(e.alpha) : null,
            beta: e.beta !== null ? Math.round(e.beta) : null,
            gamma: e.gamma !== null ? Math.round(e.gamma) : null,
          };
          this.notify();
        }
      };
      window.addEventListener('deviceorientation', this.orientationListener, { passive: true });
    }
  }
}

export const deviceController = new DeviceController();
