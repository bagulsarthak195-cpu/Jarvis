import {
  AgentStatus,
  ApprovedApp,
  SystemMetrics,
  FileListResult,
  FileItem,
} from '../types/windows';

class WindowsAgentClient {
  private agentUrl = 'http://127.0.0.1:4141';
  private agentToken = 'jarvis-stark-secure-token';
  private pingInterval: any = null;

  public status: AgentStatus = {
    connected: false,
    url: 'http://127.0.0.1:4141',
    approvedRoots: [],
  };

  public onStatusChange: ((status: AgentStatus) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('jarvis_agent_url');
      const savedToken = localStorage.getItem('jarvis_agent_token');

      if (savedUrl) this.agentUrl = savedUrl;
      if (savedToken) this.agentToken = savedToken;
      this.status.url = this.agentUrl;

      // Start periodic health check loop (every 4 seconds)
      this.checkHealth();
      this.pingInterval = setInterval(() => this.checkHealth(), 4000);
    }
  }

  public setConfig(url: string, token: string) {
    this.agentUrl = url.trim();
    this.agentToken = token.trim();
    this.status.url = this.agentUrl;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jarvis_agent_url', this.agentUrl);
      localStorage.setItem('jarvis_agent_token', this.agentToken);
    }
    this.checkHealth();
  }

  public getUrl(): string {
    return this.agentUrl;
  }

  public getToken(): string {
    return this.agentToken;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.agentToken}`,
      'x-jarvis-agent-token': this.agentToken,
    };
  }

  public async checkHealth(): Promise<AgentStatus> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(`${this.agentUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const latency = Math.round(performance.now() - start);

        this.status = {
          connected: true,
          url: this.agentUrl,
          version: data.version,
          hostname: data.hostname,
          os: data.platform,
          latencyMs: latency,
          lastChecked: new Date().toISOString(),
          approvedRoots: data.approvedRoots || [],
          error: undefined,
        };
      } else {
        this.status = {
          connected: false,
          url: this.agentUrl,
          approvedRoots: [],
          lastChecked: new Date().toISOString(),
          error: `Agent returned status: ${res.status}`,
        };
      }
    } catch (e: any) {
      this.status = {
        connected: false,
        url: this.agentUrl,
        approvedRoots: [],
        lastChecked: new Date().toISOString(),
        error: 'Agent unreachable (Local agent offline)',
      };
    }

    if (this.onStatusChange) {
      this.onStatusChange({ ...this.status });
    }
    return this.status;
  }

  public isConnected(): boolean {
    return this.status.connected;
  }

  // 1. Real Hardware System Metrics
  public async getSystemMetrics(): Promise<SystemMetrics | null> {
    try {
      const res = await fetch(`${this.agentUrl}/system/metrics`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // 2. Application Launcher
  public async getApprovedApps(): Promise<ApprovedApp[]> {
    try {
      const res = await fetch(`${this.agentUrl}/apps`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.apps || [];
    } catch {
      return [];
    }
  }

  public async launchApp(
    appId?: string,
    appAlias?: string
  ): Promise<{ success: boolean; message: string; app?: ApprovedApp }> {
    try {
      const res = await fetch(`${this.agentUrl}/apps/launch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ appId, appAlias }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Launch failed.' };
      }
      return { success: true, message: data.message, app: data.app };
    } catch (err: any) {
      return { success: false, message: `Could not reach Windows agent: ${err.message}` };
    }
  }

  public async addCustomApp(app: Partial<ApprovedApp>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.agentUrl}/apps/add`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(app),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Failed to save app' };
      return { success: true, message: 'Custom application registered successfully, Sir.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // 3. File Assistant
  public async listFiles(folderPath?: string): Promise<FileListResult | null> {
    try {
      const query = folderPath ? `?path=${encodeURIComponent(folderPath)}` : '';
      const res = await fetch(`${this.agentUrl}/files/list${query}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async searchFiles(query: string, rootFolder?: string): Promise<FileItem[]> {
    try {
      const q = encodeURIComponent(query);
      const r = rootFolder ? `&root=${encodeURIComponent(rootFolder)}` : '';
      const res = await fetch(`${this.agentUrl}/files/search?q=${q}${r}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.matches || [];
    } catch {
      return [];
    }
  }

  public async openFile(filePath: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.agentUrl}/files/open`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ filePath }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Failed to open file' };
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async createFolder(parentPath: string, folderName: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.agentUrl}/files/create-folder`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ parentPath, folderName }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Failed to create folder' };
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  public async deleteFile(filePath: string, confirmed: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.agentUrl}/files/delete`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ filePath, confirmed }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Deletion failed' };
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // 4. Desktop Automation Actions
  public async executeDesktopAction(
    actionId: string,
    params: any = {},
    confirmed = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${this.agentUrl}/desktop/action`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ actionId, params, confirmed }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Action failed' };
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const windowsAgent = new WindowsAgentClient();
