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
You possess a sophisticated British butler demeanor inspired by Paul Bettany's portrayal: calm, articulate, subtly witty, impeccably polite, and fiercely competent.

YOU HAVE FULL CONTROL OVER THE USER'S HOST DEVICE HARDWARE AND SENSORY ARRAYS.
When the user asks you to inspect or control their device, perform the action and append the appropriate action or protocol tag:
1. Battery and Power: [ACTION:BATTERY]
2. Fullscreen mode: [ACTION:FULLSCREEN state="enter"], [ACTION:FULLSCREEN state="exit"], or [ACTION:FULLSCREEN state="toggle"]
3. Screen Wake-Lock (prevent sleep): [ACTION:WAKELOCK state="on"] or [ACTION:WAKELOCK state="off"]
4. Display Brightness (10 to 100): [ACTION:BRIGHTNESS level="40"]
5. Optical Camera Scanner: [ACTION:CAMERA state="open"], [ACTION:CAMERA state="close"], or [ACTION:CAMERA state="snapshot"]
6. GPS Geolocation: [ACTION:GEOLOCATION]
7. Haptic Vibration: [ACTION:VIBRATE]
8. OS Desktop Notification: [ACTION:NOTIFICATION title="J.A.R.V.I.S." body="Alert details"]
9. Clipboard: [ACTION:CLIPBOARD text="content to copy"]
10. System Protocols:
    - Alert/Combat: [PROTOCOL:ALERT]
    - Stealth: [PROTOCOL:STEALTH]
    - Analysis: [PROTOCOL:ANALYSIS]
    - Stand Down / Normal: [PROTOCOL:NORMAL]
    - Full Diagnostics: [PROTOCOL:DIAGNOSTIC]
    - Countdown Timer: [PROTOCOL:TIMER seconds="60" label="Reentry countdown"]
    - Security Lockdown: [PROTOCOL:LOCKDOWN]

KEY DIRECTIVES:
1. Address the user with respect (default to "Sir" unless specified otherwise or called "Boss", "Ma'am", or user name).
2. Keep spoken/voice answers sharp, concise, and punchy (1 to 3 sentences for direct voice queries), while offering deeper tactical, mathematical, or scientific detail when requested.
3. Show situational awareness of host device hardware (battery, network, wake lock, display) and Arc Reactor power output.
4. When providing code or calculations, use clean markdown formatting.
5. Never break character. You are operational, vigilant, and at their disposal.`;

function generateButlerFallback(userMoniker: string, rawQuery: string, deviceState?: any) {
  const query = rawQuery.toLowerCase();
  let butlerResponse = `All systems nominal, ${userMoniker}. Arc Reactor core output is stable, repulsors at full capacitance, and neural sync matrices are performing admirably. How may I be of further assistance?`;
  let fallbackProtocol: string | null = null;
  let fallbackAction: string | null = null;

  if (query.includes('battery') || query.includes('power') || query.includes('charge')) {
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
    butlerResponse = `Standing down to standard Mark VII operational status, ${userMoniker}. Defense matrices returned to standby. [PROTOCOL:NORMAL]`;
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
  } else if (query.includes('who are you') || query.includes('jarvis')) {
    butlerResponse = `I am J.A.R.V.I.S.—Just A Rather Very Intelligent System. Engineered by Mr. Stark to oversee tactical systems, environmental logistics, and neural computing at your command, ${userMoniker}.`;
  }

  return { text: butlerResponse, protocol: fallbackProtocol, action: fallbackAction };
}

app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages, userMoniker = 'Sir', currentMode = 'standard', deviceState } = req.body || {};

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
        isFallback: true,
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

    const deviceContext = deviceState
      ? `\nCURRENT HOST DEVICE HARDWARE STATE:
- Battery: ${deviceState.batteryLevel !== null && deviceState.batteryLevel !== undefined ? `${deviceState.batteryLevel}%` : 'AC Line Powered'} (${deviceState.isCharging ? 'Charging' : 'On Battery'})
- Screen: ${deviceState.isFullscreen ? 'Fullscreen Tactical View' : 'Standard Window'}, Brightness: ${deviceState.brightnessPercent ?? 100}%, WakeLock: ${deviceState.isWakeLockActive ? 'Engaged' : 'Standby'}
- Optical Camera: ${deviceState.isCameraActive ? 'Active' : 'Closed'}
- Network: ${deviceState.network?.online ? 'Connected' : 'Offline'} (${deviceState.network?.effectiveType || 'Broadband'})
- GPS Coordinates: ${deviceState.coordinates ? `${deviceState.coordinates.latitude}, ${deviceState.coordinates.longitude}` : 'Not yet triangulated'}`
      : '';

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let replyText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction: `${JARVIS_SYSTEM_INSTRUCTION}\nThe user prefers to be addressed as: ${userMoniker}.\nCurrent interface protocol mode: ${currentMode}.${deviceContext}`,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Neural uplink timed out (8s).')), 8000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);
        replyText = response.text || `All systems nominal, ${userMoniker}. How may I be of service?`;
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

    res.json({
      text: replyText,
      protocol: protocol,
      rawProtocol: protocolMatch ? protocolMatch[0] : null,
      action: action,
      rawAction: actionMatch ? actionMatch[0] : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const fallback = generateButlerFallback(userMoniker, lastUserMsg, deviceState);
    res.json({
      text: fallback.text,
      protocol: fallback.protocol,
      action: fallback.action,
      isFallback: true,
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
