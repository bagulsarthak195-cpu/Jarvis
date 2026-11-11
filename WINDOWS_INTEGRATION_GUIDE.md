# J.A.R.V.I.S. — Windows Desktop Integration Architecture & Guide

## 1. System Overview
J.A.R.V.I.S. features a dual-mode hybrid architecture:
- **Web Mode (Cloud / Hosted)**: The frontend and Express backend run hosted in the cloud or browser. Web Speech API, Audio Visualizers, Host Device Sensor controls (Battery, Wake Lock, Geolocation, Optical Camera), Arc Reactor, and Gemini cognitive engine operate out of the box. Any Windows-specific requests gracefully indicate the status of the local agent bridge.
- **Local Windows Agent Mode (`127.0.0.1:4141`)**: A local Node.js daemon running directly on your Windows PC. It listens exclusively on `127.0.0.1` and executes allowlisted desktop commands, launches approved software, searches sandbox files, streams real hardware vitals (actual CPU, RAM, Disk, Tasklist), and runs desktop automation routines.

---

## 2. Quick Start: Running the Windows Agent

### Prerequisites
- Node.js 18+ installed on your Windows machine.
- Git or cloned J.A.R.V.I.S. repository.

### Step 1: Open VS Code on Windows
Open your project folder in VS Code:
```bash
code .
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` if not already present:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
WINDOWS_AGENT_HOST="127.0.0.1"
WINDOWS_AGENT_PORT="4141"
WINDOWS_AGENT_TOKEN="jarvis-stark-secure-token"
```

### Step 3: Launch the Windows Agent
In a dedicated VS Code terminal tab, start the agent:
```bash
npm run agent
```
*Expected terminal output:*
```
[J.A.R.V.I.S. Windows Agent] Initializing secure workstation bridge...
[J.A.R.V.I.S. Windows Agent] Listening exclusively on http://127.0.0.1:4141
[J.A.R.V.I.S. Windows Agent] Approved directories:
  - C:\Users\<Username>\Documents
  - C:\Users\<Username>\Desktop
  - C:\Users\<Username>\Downloads
[J.A.R.V.I.S. Windows Agent] Status: ACTIVE & SECURED
```

### Step 4: Open the Web Application
In another terminal tab, start the web application (or visit your hosted URL):
```bash
npm run dev
```
Open `http://localhost:3000` (or your hosted deployment URL).

The top status header will automatically detect the local agent and switch from `WEB MODE` to:
`WIN AGENT: ONLINE` (with real-time latency ping).

---

## 3. Approved Features & Capabilities

### 1. Application Launcher
- Pre-approved applications:
  - **VS Code**: `code`
  - **Notepad**: `notepad.exe`
  - **Calculator**: `calc.exe`
  - **Google Chrome**: `chrome.exe`
  - **Microsoft Edge**: `msedge.exe`
  - **Windows Terminal**: `wt.exe` / `cmd.exe`
  - **File Explorer**: `explorer.exe`
  - **Task Manager**: `taskmgr.exe`
  - **MS Paint**: `mspaint.exe`
  - **Spotify**: `spotify.exe`
- **Natural Language & Aliases**: "Open calculator", "Launch VS Code", "Open my notes".
- **Custom Application Registration**: Register custom binaries or paths through the **WINDOWS OS > APP LAUNCHER > REGISTER CUSTOM APP** dialog.

### 2. File Assistant (Secure Sandbox)
- **Approved Roots**: Bounded strictly to user directories (`Documents`, `Desktop`, `Downloads`, `Projects`).
- **Path Traversal Protection**: Any path containing `..`, system directories (`C:\Windows`, `C:\Program Files`), or paths outside approved roots are blocked with `403 Forbidden`.
- **Operations**:
  - List files and folders.
  - Search filenames recursively across approved directories.
  - Open approved files with default Windows shell association.
  - Create new subdirectories.
  - Delete files with mandatory **Action Confirmation Modal**.

### 3. Real-Time Hardware Performance Monitor
- **Actual Hardware Metrics** (distinct from fictional HUD animations):
  - **CPU**: Real processor model, core count, and dynamic utilization % calculated via high-resolution OS CPU tick deltas.
  - **RAM**: Real total RAM, used RAM, and free RAM in Gigabytes and %.
  - **Disk Drives**: Actual drive letters (e.g. `C:`, `D:`), total volume capacity, free space, and usage percent.
  - **Uptime**: Actual Windows system uptime in hours and minutes.
  - **Top Processes**: Active processes sorted by memory consumption.

### 4. Desktop Automation & Security
- **Lock Workstation**: Triggers Windows `rundll32.exe user32.dll,LockWorkStation` with user confirmation.
- **Screen Snip Tool**: Launches Windows Screen Snipping Tool (`SnippingTool.exe`).
- **Open URL**: Opens verified web URLs in default browser without command injection risks.
- **Empty Recycle Bin**: Cleans workstation recycle bin with high-danger confirmation dialog.

### 5. Stark Biometric Security & Authentication Layer
- **Optical Facial Recognition Scanner**: Live webcam targeting reticle with cranial geometry mesh, laser scanlines, landmark crosshairs, confidence meter, and reference face enrollment stored encrypted in `localStorage`.
- **Bio-Acoustic Voice Print Recognition**: Live audio spectrum visualizer matching the user's spoken voice passphrase (e.g. *"I am Iron Man"*).
- **Stark Clearance Passcode (PIN)**: Cyberpunk keypad with custom PIN code (default: `3000`).
- **Emergency Executive Override**: One-touch Stark Master Override for environments without active cameras or microphones.
- **Auto-Lock on Inactivity**: Configurable timeout (off, 2 min, 5 min, 15 min) and lock-on-startup.

---

## 4. Security Architecture & Threat Prevention

1. **Local Loopback Binding**: The agent binds strictly to `127.0.0.1`. It refuses to bind to `0.0.0.0` or public network adapters.
2. **Bearer Token Authentication**: Every request to the agent requires the `x-jarvis-agent-token` or `Authorization: Bearer <token>` header matching your configured secret.
3. **No Arbitrary Command Execution**: The AI and frontend never send raw bash/PowerShell strings to the agent. Commands are strictly mapped to allowlisted action identifiers and verified executable binaries.
4. **Action Confirmation Modal**: Destructive operations (such as file deletion, empty recycle bin, or workstation lock) trigger a futuristic HUD confirmation modal that must be manually approved by the user.

---

## 5. Verification Checklist

- [x] Windows Local Agent runs on `http://127.0.0.1:4141`
- [x] Bearer Token authentication verified
- [x] Application Launcher launches Calculator, VS Code, Notepad, Edge, Chrome
- [x] Custom app registry saves to `agent/config.json`
- [x] File assistant enforces sandbox boundaries (blocks path traversal)
- [x] Real-time CPU, RAM, Disk, and Process metrics display on Windows OS tab
- [x] Action Confirmation Modal prevents accidental destructive commands
- [x] J.A.R.V.I.S. Conversational AI detects natural language triggers like "Launch VS Code", "Real CPU metrics", "Lock computer"
- [x] Web deployment gracefully operates in Web Mode when local agent is disconnected
