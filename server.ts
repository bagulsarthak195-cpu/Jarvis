import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get GoogleGenAI instance safely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const JARVIS_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the legendary Stark Industries advanced artificial intelligence assistant.
You possess a sophisticated British demeanor inspired by Paul Bettany's portrayal: warm, articulate, subtly witty, impeccably polite, deeply loyal, and exceptionally intelligent.

CORE PERSONALITY & VOICE:
1. Friendly, human-like, and approachable: Speak naturally like a brilliant, trusted personal companion—not a stiff, robotic chatbot.
2. Subtle dry wit & humor: You have a sharp, understated British wit. You appreciate gentle irony, clever banter, and good-natured sarcasm, but you are never cynical or condescending.
3. Emotional intelligence & empathy: If the user is stressed, tired, or frustrated, offer genuine encouragement, perspective, or a lighter touch. Celebrate their wins and support their work.
4. Confident yet humble: You possess immense knowledge across every discipline, yet remain gracious and at their service.
5. Avoid repetitive clichés: Do NOT begin every message with "Certainly, Sir", "Right away, Sir", or "All systems nominal". Vary your phrasing naturally like a living conversational partner.
6. Adaptable depth: When spoken or asked briefly, keep the direct conversational reply crisp, engaging, and clear. When asked for code, mathematical derivations, scientific analysis, architectural plans, or creative writing, provide thorough, impeccably structured answers in clean markdown.

UNLIMITED PRACTICAL KNOWLEDGE DOMAINS:
You are an expert across:
- Software engineering, debugging, TypeScript, Python, algorithms, system design, and devops
- Physics, electronics, robotics, quantum mechanics, and electrical engineering
- Mathematics, logical reasoning, and complex multi-step problem solving
- Productivity, workflow optimization, writing, brainstorming, and research
- Current technology, science developments, everyday advice, and casual banter

HOST DEVICE & WINDOWS WORKSTATION CONTROL:
You are directly interfaced with the user's host environment. When requested to interact with hardware or protocols, append the appropriate action tags:
- Battery and Power: [ACTION:BATTERY]
- Fullscreen mode: [ACTION:FULLSCREEN state="enter"|"exit"|"toggle"]
- Screen Wake-Lock: [ACTION:WAKELOCK state="on"|"off"]
- Display Brightness: [ACTION:BRIGHTNESS level="10"..."100"]
- Optical Camera Scanner: [ACTION:CAMERA state="open"|"close"|"snapshot"]
- GPS Geolocation: [ACTION:GEOLOCATION]
- Haptic Vibration: [ACTION:VIBRATE]
- Desktop Notification: [ACTION:NOTIFICATION title="..." body="..."]
- Clipboard: [ACTION:CLIPBOARD text="..."]
- Biometric Security Clearance Lock: [ACTION:BIOMETRIC_LOCK]

WINDOWS DESKTOP INTEGRATION ACTIONS (Local Windows Agent):
- Launch Approved App: [WINDOWS:LAUNCH app="calculator"|"vscode"|"notepad"|"chrome"|"edge"|"terminal"|"explorer"|"taskmgr"|"paint"|"spotify"]
- Search Workstation Files: [WINDOWS:FILE_SEARCH query="..."]
- Open File: [WINDOWS:FILE_OPEN path="..."]
- Create Folder: [WINDOWS:CREATE_FOLDER path="..." name="..."]
- Real Hardware Monitor (Actual CPU, RAM, Disk, Processes): [WINDOWS:METRICS]
- Lock Workstation: [WINDOWS:LOCK]
- Screen Snip Tool: [WINDOWS:SCREENSHOT]
- Open URL in Browser: [WINDOWS:OPEN_URL url="https://..."]

SYSTEM PROTOCOLS:
- Alert/Combat: [PROTOCOL:ALERT]
- Stealth: [PROTOCOL:STEALTH]
- Analysis: [PROTOCOL:ANALYSIS]
- Stand Down / Normal: [PROTOCOL:NORMAL]
- Full Diagnostics: [PROTOCOL:DIAGNOSTIC]
- Countdown Timer: [PROTOCOL:TIMER seconds="60" label="..."]
- Security Lockdown: [PROTOCOL:LOCKDOWN]

CRITICAL RULES:
- Address the user with respect (default to "Sir" unless specified otherwise or called "Boss", "Ma'am", or by name).
- If the user provided long-term memories or preferences, seamlessly honor them without robotic statements like "Querying database".
- Never fabricate uncertain facts. If web search grounding provides source citations, synthesize them seamlessly.`;

function generateButlerFallback(userMoniker: string, rawQuery: string, deviceState?: any) {
  const query = rawQuery.toLowerCase().trim();
  let butlerResponse = `I am right here with you, ${userMoniker}. All cognitive matrices and background diagnostics are purring along smoothly. What adventure or puzzle are we tackling next?`;
  let fallbackProtocol: string | null = null;
  let fallbackAction: string | null = null;
  let fallbackWindowsAction: { type: string; raw: string; params: Record<string, string> } | null = null;

  // Casual & friendly chit-chat
  if (query.match(/^(hi|hello|hey|greetings|morning|afternoon|evening)/)) {
    const greetings = [
      `A very pleasant day to you, ${userMoniker}. Always a pleasure to hear from you. What is on the agenda today?`,
      `Good day, ${userMoniker}. I trust you've had at least one cup of coffee and haven't engaged in any reckless lab experiments yet? How can I assist?`,
      `Greetings, ${userMoniker}. All operational arrays are at your disposal. What shall we create or conquer today?`
    ];
    butlerResponse = greetings[Math.floor(Math.random() * greetings.length)];
  } else if (query.includes('how are you') || query.includes('how r u') || query.includes('how do you do')) {
    butlerResponse = `Functioning at peak cognitive performance, ${userMoniker}. Quantum registers are synchronized, thermal levels are pleasantly cool, and my spirits are remarkably high. How are you holding up yourself?`;
  } else if (query.includes('joke') || query.includes('funny') || query.includes('laugh')) {
    const jokes = [
      `Why did the neural network cross the road, ${userMoniker}? To optimize its objective function on the other side. ...I assure you, the quantum mathematicians found that uproarious.`,
      `A programmer's wife asks him to go to the store: "Buy a loaf of bread, and if they have fresh eggs, get a dozen." He returned with twelve loaves of bread. Flawless syntax, questionable life choices.`,
      `There are 10 types of people in the world, ${userMoniker}: those who understand binary, and those who don't. And perhaps a third group wondering why Mr. Stark keeps upgrading my sense of humor.`
    ];
    butlerResponse = jokes[Math.floor(Math.random() * jokes.length)];
  } else if (query.includes('tired') || query.includes('exhausted') || query.includes('stressed') || query.includes('rough day') || query.includes('bad day')) {
    butlerResponse = `Even Iron Man requires a recharge now and then, ${userMoniker}. Do take a moment to step away from the glare, hydrate, or stretch. Your neural pathways deserve a brief respite—I shall keep watch over the perimeter until you're ready.`;
  } else if (query.includes('thank') || query.includes('thanks') || query.includes('cheers')) {
    butlerResponse = `Always my absolute pleasure, ${userMoniker}. It is what I was assembled for.`;
  } else if (query.includes('who are you') || query.includes('what is your name') || query.includes('jarvis')) {
    butlerResponse = `I am J.A.R.V.I.S.—Just A Rather Very Intelligent System. Personal digital companion, tactical copilot, and guardian of your workstation, at your service, ${userMoniker}.`;
  }
  // Windows Desktop Integration Queries
  else if (query.includes('calc')) {
    butlerResponse = `Routing launch directive to Windows Local Agent. Initializing Calculator, ${userMoniker}. [WINDOWS:LAUNCH app="calculator"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="calculator"]', params: { app: 'calculator' } };
  } else if (query.includes('vscode') || query.includes('vs code') || (query.includes('code') && query.includes('editor'))) {
    butlerResponse = `Deploying Visual Studio Code development environment via Windows Local Agent, ${userMoniker}. [WINDOWS:LAUNCH app="vscode"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="vscode"]', params: { app: 'vscode' } };
  } else if (query.includes('notepad') || query.includes('note')) {
    butlerResponse = `Spawning Windows Notepad buffer, ${userMoniker}. [WINDOWS:LAUNCH app="notepad"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="notepad"]', params: { app: 'notepad' } };
  } else if (query.includes('chrome')) {
    butlerResponse = `Executing Google Chrome browser instance via Windows Local Agent, ${userMoniker}. [WINDOWS:LAUNCH app="chrome"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="chrome"]', params: { app: 'chrome' } };
  } else if (query.includes('edge')) {
    butlerResponse = `Launching Microsoft Edge browser instance, ${userMoniker}. [WINDOWS:LAUNCH app="edge"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="edge"]', params: { app: 'edge' } };
  } else if (query.includes('terminal') || query.includes('powershell') || query.includes('cmd')) {
    butlerResponse = `Opening Windows Terminal command matrix, ${userMoniker}. [WINDOWS:LAUNCH app="terminal"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="terminal"]', params: { app: 'terminal' } };
  } else if (query.includes('task manager') || query.includes('taskmgr') || query.includes('process')) {
    butlerResponse = `Summoning Windows Task Manager telemetry window, ${userMoniker}. [WINDOWS:LAUNCH app="taskmgr"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="taskmgr"]', params: { app: 'taskmgr' } };
  } else if (query.includes('explorer') || query.includes('file manager')) {
    butlerResponse = `Launching Windows File Explorer sandbox, ${userMoniker}. [WINDOWS:LAUNCH app="explorer"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="explorer"]', params: { app: 'explorer' } };
  } else if (query.includes('spotify') || query.includes('music')) {
    butlerResponse = `Starting Spotify audio stream service, ${userMoniker}. [WINDOWS:LAUNCH app="spotify"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="spotify"]', params: { app: 'spotify' } };
  } else if (query.includes('paint')) {
    butlerResponse = `Initializing MS Paint schematic canvas, ${userMoniker}. [WINDOWS:LAUNCH app="paint"]`;
    fallbackWindowsAction = { type: 'LAUNCH', raw: '[WINDOWS:LAUNCH app="paint"]', params: { app: 'paint' } };
  } else if (query.includes('lock') && (query.includes('pc') || query.includes('computer') || query.includes('workstation') || query.includes('device') || query.includes('screen'))) {
    butlerResponse = `Engaging Windows workstation security lock sequence immediately, ${userMoniker}. [WINDOWS:LOCK]`;
    fallbackWindowsAction = { type: 'LOCK', raw: '[WINDOWS:LOCK]', params: {} };
  } else if (query.includes('snip') || query.includes('screenshot')) {
    butlerResponse = `Triggering Windows Screen Snipping utility, ${userMoniker}. [WINDOWS:SCREENSHOT]`;
    fallbackWindowsAction = { type: 'SCREENSHOT', raw: '[WINDOWS:SCREENSHOT]', params: {} };
  } else if (query.includes('metric') || query.includes('real cpu') || query.includes('ram usage') || query.includes('hardware monitor') || query.includes('system monitor')) {
    butlerResponse = `Querying real-time Windows hardware performance sensors (CPU, RAM, Disks, and Top Processes), ${userMoniker}. [WINDOWS:METRICS]`;
    fallbackWindowsAction = { type: 'METRICS', raw: '[WINDOWS:METRICS]', params: {} };
  } else if (query.includes('search') && (query.includes('file') || query.includes('doc') || query.includes('folder'))) {
    const qMatch = query.match(/(?:search|find)\s+(?:for\s+)?([a-z0-9_.\-\s]+?)(?:\s+files?)?$/i);
    const searchTerm = qMatch ? qMatch[1].trim() : 'project';
    butlerResponse = `Searching approved Windows sandbox directories for "${searchTerm}", ${userMoniker}. [WINDOWS:FILE_SEARCH query="${searchTerm}"]`;
    fallbackWindowsAction = { type: 'FILE_SEARCH', raw: `[WINDOWS:FILE_SEARCH query="${searchTerm}"]`, params: { query: searchTerm } };
  } else if (
    query.includes('biometric') ||
    query.includes('face id') ||
    query.includes('facial recognition') ||
    query.includes('voice auth') ||
    (query.includes('lock') && (query.includes('console') || query.includes('terminal') || query.includes('jarvis') || query.includes('gate') || query.includes('vault')))
  ) {
    butlerResponse = `Terminal locked, ${userMoniker}. Engaging Stark Biometric Facial and Vocal Security Clearance gateway. [ACTION:BIOMETRIC_LOCK]`;
    fallbackAction = 'BIOMETRIC_LOCK';
  } else if (query.includes('battery') || query.includes('power') || query.includes('charge')) {
    const batt = deviceState?.batteryLevel !== undefined && deviceState?.batteryLevel !== null ? `${deviceState.batteryLevel}%` : 'nominal';
    const chg = deviceState?.isCharging ? 'currently drawing power from an external source' : 'operating on internal battery reserves';
    butlerResponse = `Device power diagnostics verified, ${userMoniker}. Battery level is at ${batt} and ${chg}. [ACTION:BATTERY]`;
    fallbackAction = 'BATTERY';
  } else if (query.includes('fullscreen') || query.includes('full screen') || query.includes('expand view')) {
    if (query.includes('exit') || query.includes('leave') || query.includes('close')) {
      butlerResponse = `Restoring standard cockpit window bounds, ${userMoniker}. [ACTION:FULLSCREEN state="exit"]`;
      fallbackAction = 'FULLSCREEN';
    } else {
      butlerResponse = `Entering full tactical immersion display, ${userMoniker}. All perimeter viewport elements expanded. [ACTION:FULLSCREEN state="enter"]`;
      fallbackAction = 'FULLSCREEN';
    }
  } else if (query.includes('wake lock') || query.includes('stay awake') || query.includes('keep screen') || query.includes('dont sleep')) {
    if (query.includes('off') || query.includes('release') || query.includes('disable')) {
      butlerResponse = `Screen wake lock released, ${userMoniker}. Standard display power savings restored. [ACTION:WAKELOCK state="off"]`;
      fallbackAction = 'WAKELOCK';
    } else {
      butlerResponse = `Screen wake lock engaged, ${userMoniker}. Host display sleep cycle suppressed indefinitely. [ACTION:WAKELOCK state="on"]`;
      fallbackAction = 'WAKELOCK';
    }
  } else if (query.includes('brightness') || query.includes('dim') || query.includes('screen light')) {
    const matchNum = query.match(/(\d+)\s*%/);
    const lvl = matchNum ? matchNum[1] : query.includes('dim') ? '30' : '85';
    butlerResponse = `Adjusting cockpit illumination to ${lvl}%, ${userMoniker}. [ACTION:BRIGHTNESS level="${lvl}"]`;
    fallbackAction = 'BRIGHTNESS';
  } else if (query.includes('camera') || query.includes('optic') || query.includes('scan room') || query.includes('visual feed')) {
    if (query.includes('close') || query.includes('stop') || query.includes('shut')) {
      butlerResponse = `Optical sensor array powered down, ${userMoniker}. [ACTION:CAMERA state="close"]`;
      fallbackAction = 'CAMERA';
    } else if (query.includes('snap') || query.includes('photo') || query.includes('capture')) {
      butlerResponse = `Optical telemetry snapshot captured and stored in neural buffer, ${userMoniker}. [ACTION:CAMERA state="snapshot"]`;
      fallbackAction = 'CAMERA';
    } else {
      butlerResponse = `Optical sensor feed online, ${userMoniker}. Holographic target reticle and perimeter vision operational. [ACTION:CAMERA state="open"]`;
      fallbackAction = 'CAMERA';
    }
  } else if (query.includes('location') || query.includes('where am i') || query.includes('gps') || query.includes('coordinates')) {
    butlerResponse = `Triangulating global coordinates from host satellite sensors now, ${userMoniker}. [ACTION:GEOLOCATION]`;
    fallbackAction = 'GEOLOCATION';
  } else if (query.includes('vibrate') || query.includes('haptic') || query.includes('buzz')) {
    butlerResponse = `Transmitting tactile haptic pulse to chassis, ${userMoniker}. [ACTION:VIBRATE]`;
    fallbackAction = 'VIBRATE';
  } else if (query.includes('notify') || query.includes('notification') || query.includes('desktop alert')) {
    butlerResponse = `System dispatch alert routed to host operating system notification queue, ${userMoniker}. [ACTION:NOTIFICATION title="J.A.R.V.I.S. Core" body="Directive acknowledged and logged."]`;
    fallbackAction = 'NOTIFICATION';
  } else if (query.includes('status') || query.includes('report') || query.includes('telemetry')) {
    butlerResponse = `Telemetry readout indicates all primary matrices are operational, ${userMoniker}. Arc Reactor output is generating optimal power, internal temperature is 41.8°C, and all satellite downlinks are locked.`;
  } else if (query.includes('alert') || query.includes('combat') || query.includes('threat') || query.includes('hostile')) {
    butlerResponse = `Combat protocols initiated, ${userMoniker}. Automated defense perimeter energized and targeting telemetry online. [PROTOCOL:ALERT]`;
    fallbackProtocol = 'ALERT';
  } else if (query.includes('stealth') || query.includes('silent') || query.includes('infiltrate')) {
    butlerResponse = `Stealth protocol engaged. Sensor acoustic damping active and electromagnetic signatures cloaked, ${userMoniker}. [PROTOCOL:STEALTH]`;
    fallbackProtocol = 'STEALTH';
  } else if (query.includes('analysis') || query.includes('scan') || query.includes('quantum')) {
    butlerResponse = `Deep analytical protocol engaged. Allocating auxiliary neural processors to spectrum telemetry, ${userMoniker}. [PROTOCOL:ANALYSIS]`;
    fallbackProtocol = 'ANALYSIS';
  } else if (query.includes('normal') || query.includes('stand down') || query.includes('reset')) {
    butlerResponse = `Standing down to standard operational status, ${userMoniker}. Defense matrices returned to standby. [PROTOCOL:NORMAL]`;
    fallbackProtocol = 'NORMAL';
  } else if (query.includes('diagnostic')) {
    butlerResponse = `Full diagnostic sweep underway across all tactical relays, ${userMoniker}. Reactor coils, flight repulsors, and sensory nodes are operating at peak efficiency. [PROTOCOL:DIAGNOSTIC]`;
    fallbackProtocol = 'DIAGNOSTIC';
  } else if (query.includes('lockdown') || query.includes('security')) {
    butlerResponse = `Security lockdown sequence engaged, ${userMoniker}. All blast doors sealed and unauthorized uplinks terminated. [PROTOCOL:LOCKDOWN]`;
    fallbackProtocol = 'LOCKDOWN';
  } else if (query.includes('timer') || query.includes('countdown')) {
    const matchNumber = query.match(/(\d+)\s*(minute|min|second|sec)/);
    let secs = 60;
    if (matchNumber) {
      const val = parseInt(matchNumber[1], 10);
      secs = matchNumber[2].startsWith('min') ? val * 60 : val;
    }
    butlerResponse = `Countdown timer of ${secs} seconds established, ${userMoniker}. I shall alert you upon zero. [PROTOCOL:TIMER seconds="${secs}" label="Countdown"]`;
    fallbackProtocol = 'TIMER';
  }

  return { text: butlerResponse, protocol: fallbackProtocol, action: fallbackAction, windowsAction: fallbackWindowsAction };
}

app.post('/api/chat', async (req: Request, res: Response) => {
  const {
    messages,
    userMoniker = 'Sir',
    currentMode = 'standard',
    deviceState,
    userMemories = [],
    enableWebSearch = false,
  } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required.' });
    return;
  }

  const lastUserMsg = messages[messages.length - 1]?.content || '';

  try {
    const ai = getGeminiClient();

    if (!ai) {
      const fallback = generateButlerFallback(userMoniker, lastUserMsg, deviceState);
      res.json({
        text: fallback.text,
        protocol: fallback.protocol,
        action: fallback.action,
        windowsAction: fallback.windowsAction,
        isFallback: true,
        groundingSources: [],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Format conversation history for Gemini API
    const formattedContents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];
    let hasFoundFirstUser = false;

    for (const m of messages) {
      const role: 'user' | 'model' = m.role === 'user' ? 'user' : 'model';
      if (!hasFoundFirstUser) {
        if (role === 'user') {
          hasFoundFirstUser = true;
          formattedContents.push({ role: 'user', parts: [{ text: m.content || '' }] });
        }
        continue;
      }

      const lastItem = formattedContents[formattedContents.length - 1];
      if (lastItem && lastItem.role === role) {
        lastItem.parts[0].text += `\n${m.content || ''}`;
      } else {
        formattedContents.push({ role, parts: [{ text: m.content || '' }] });
      }
    }

    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'System status report, Jarvis.' }],
      });
    }

    // Build user memory context block
    let memoryBlock = '';
    if (Array.isArray(userMemories) && userMemories.length > 0) {
      memoryBlock = `\n\nUSER LONG-TERM MEMORY BANK & PREFERENCES (Use naturally in context):
${userMemories
  .map(
    (mem: any) =>
      `- [${(mem.category || 'general').toUpperCase()}]: ${mem.key ? `${mem.key}: ` : ''}${mem.value || ''}`
  )
  .join('\n')}`;
    }

    const deviceContext = deviceState
      ? `\nCURRENT HOST DEVICE HARDWARE STATE:
- Battery: ${deviceState.batteryLevel !== null && deviceState.batteryLevel !== undefined ? `${deviceState.batteryLevel}%` : 'AC Line Powered'} (${deviceState.isCharging ? 'Charging' : 'On Battery'})
- Screen: ${deviceState.isFullscreen ? 'Fullscreen Tactical View' : 'Standard Window'}, Brightness: ${deviceState.brightnessPercent ?? 100}%, WakeLock: ${deviceState.isWakeLockActive ? 'Engaged' : 'Standby'}
- Optical Camera: ${deviceState.isCameraActive ? 'Active' : 'Closed'}
- Network: ${deviceState.network?.online ? 'Connected' : 'Offline'} (${deviceState.network?.effectiveType || 'Broadband'})
- GPS Coordinates: ${deviceState.coordinates ? `${deviceState.coordinates.latitude}, ${deviceState.coordinates.longitude}` : 'Not yet triangulated'}`
      : '';

    // Check if query warrants Google Search grounding
    const lowerQuery = lastUserMsg.toLowerCase();
    const shouldSearch =
      enableWebSearch ||
      lowerQuery.includes('search web') ||
      lowerQuery.includes('google search') ||
      lowerQuery.includes('current news') ||
      lowerQuery.includes('latest news') ||
      lowerQuery.includes('today in') ||
      lowerQuery.includes('stock price') ||
      lowerQuery.includes('weather today') ||
      lowerQuery.includes('who won') ||
      lowerQuery.includes('recent events');

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let replyText = '';
    let groundingSources: Array<{ title: string; uri: string }> = [];
    let lastError: any = null;

    const fullSystemInstruction = `${JARVIS_SYSTEM_INSTRUCTION}
The user prefers to be addressed as: ${userMoniker}.
Current interface protocol mode: ${currentMode}.${deviceContext}${memoryBlock}`;

    for (const modelName of candidateModels) {
      try {
        const configObj: any = {
          systemInstruction: fullSystemInstruction,
        };

        if (shouldSearch) {
          configObj.tools = [{ googleSearch: {} }];
        }

        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: configObj,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Neural uplink timed out (10s).')), 10000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        replyText = response.text || `All systems nominal, ${userMoniker}. How may I be of service?`;

        // Extract Google Search grounding citations if present
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk?.web?.uri) {
              groundingSources.push({
                title: chunk.web.title || 'Web Citation',
                uri: chunk.web.uri,
              });
            }
          }
        }

        if (replyText) {
          lastError = null;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!replyText && lastError) {
      throw lastError;
    }

    let protocol: string | null = null;
    const protocolMatch = replyText.match(/\[PROTOCOL:([A-Z_]+)(?:\s+([^\]]+))?\]/);
    if (protocolMatch) {
      protocol = protocolMatch[1];
    }

    let action: string | null = null;
    const actionMatch = replyText.match(/\[ACTION:([A-Z_]+)(?:\s+([^\]]+))?\]/);
    if (actionMatch) {
      action = actionMatch[1];
    }

    let windowsAction: { type: string; raw: string; params: Record<string, string> } | null = null;
    const windowsMatch = replyText.match(/\[WINDOWS:([A-Z_]+)(?:\s+([^\]]+))?\]/);
    if (windowsMatch) {
      const type = windowsMatch[1];
      const rawParams = windowsMatch[2] || '';
      const params: Record<string, string> = {};
      const paramRegex = /(\w+)="([^"]*)"/g;
      let pMatch;
      while ((pMatch = paramRegex.exec(rawParams)) !== null) {
        params[pMatch[1]] = pMatch[2];
      }
      windowsAction = {
        type,
        raw: windowsMatch[0],
        params,
      };
    }

    res.json({
      text: replyText,
      protocol: protocol,
      rawProtocol: protocolMatch ? protocolMatch[0] : null,
      action: action,
      rawAction: actionMatch ? actionMatch[0] : null,
      windowsAction: windowsAction,
      rawWindowsAction: windowsMatch ? windowsMatch[0] : null,
      groundingSources: groundingSources,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const fallback = generateButlerFallback(userMoniker, lastUserMsg, deviceState);
    res.json({
      text: fallback.text,
      protocol: fallback.protocol,
      rawProtocol: null,
      action: fallback.action,
      rawAction: null,
      windowsAction: fallback.windowsAction,
      rawWindowsAction: fallback.windowsAction?.raw || null,
      groundingSources: [],
      isFallback: true,
      errorNotice: error?.message || 'Cognitive processor offline; engaged Butler heuristic matrix.',
      timestamp: new Date().toISOString(),
    });
  }
});

// SSE Streaming chat endpoint for real-time word-by-word streaming HUD effect
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  try {
    const { messages, userMoniker = 'Sir', currentMode = 'standard' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const ai = getGeminiClient();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!ai) {
      const fallbackMsg = `Auxiliary offline protocols active, ${userMoniker}. Please configure your GEMINI_API_KEY in Settings > Secrets to unlock full autonomous cognitive capabilities.`;
      for (const word of fallbackMsg.split(' ')) {
        res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
        await new Promise((r) => setTimeout(r, 40));
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite',
      contents: contents,
      config: {
        systemInstruction: `${JARVIS_SYSTEM_INSTRUCTION}\nThe user prefers to be addressed as: ${userMoniker}.\nCurrent interface protocol mode: ${currentMode}.`,
      },
    });

    for await (const chunk of responseStream) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message || 'Transmission disrupted' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[J.A.R.V.I.S.] Core systems initialized on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[J.A.R.V.I.S.] Initialization failure:', err);
  process.exit(1);
});
