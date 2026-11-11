import React, { useRef, useEffect, useState } from 'react';
import { Message, SystemMode } from '../types/jarvis';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Terminal,
  Shield,
  Bot,
  User as UserIcon,
  Laptop,
  Globe,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { sfx } from '../utils/audioSynthesizer';

interface ChatHUDProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListening: () => void;
  interimTranscript: string;
  onReplayAudio: (text: string) => void;
  onStopSpeaking?: () => void;
  onRepeatLastResponse?: () => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  mode: SystemMode;
  enableWebSearch: boolean;
  onToggleWebSearch: () => void;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  isListening,
  isSpeaking,
  onToggleListening,
  interimTranscript,
  onReplayAudio,
  onStopSpeaking,
  onRepeatLastResponse,
  onOpenSettings,
  onClearChat,
  autoSpeak,
  onToggleAutoSpeak,
  mode,
  enableWebSearch,
  onToggleWebSearch,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    sfx.playMicStart();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    "Let's just chat, how's your day?",
    'Tell me a witty joke',
    'Search latest tech news',
    'Explain quantum entanglement simply',
    'Lock console (Biometric Gate)',
    'Launch VS Code',
    'Open Calculator',
    'Real CPU & RAM metrics',
    'Search workstation files',
    'Check battery status',
    'Toggle full screen mode',
    'Run full diagnostic scan',
  ];

  // Render markdown-like blocks cleanly
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].includes(' ') ? '' : lines[0];
        const code = (lang ? lines.slice(1) : lines).join('\n');

        return (
          <div key={index} className="my-2 rounded bg-black/80 border border-cyan-500/30 overflow-hidden font-mono-tech text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-cyan-900/50 text-[10px] text-cyan-400">
              <span>{lang ? lang.toUpperCase() : 'CODE SNIPPET'}</span>
              <button
                onClick={() => handleCopy(`code-${index}`, code)}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedId === `code-${index}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === `code-${index}` ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-cyan-200 leading-relaxed">{code}</pre>
          </div>
        );
      }

      // Format bold text, protocol tags, action tags, windows tags, and line breaks
      const paragraphs = part.split('\n\n');
      return (
        <div key={index} className="space-y-1.5">
          {paragraphs.map((p, pIdx) => {
            const protocolMatch = p.match(/\[PROTOCOL:([A-Z_]+)(?:\s+([^\]]+))?\]/);
            const actionMatch = p.match(/\[ACTION:([A-Z_]+)(?:\s+([^\]]+))?\]/);
            const windowsMatch = p.match(/\[WINDOWS:([A-Z_]+)(?:\s+([^\]]+))?\]/);
            const cleanParagraph = p
              .replace(/\[(PROTOCOL|ACTION|WINDOWS):[^\]]+\]/g, '')
              .trim();

            return (
              <div key={pIdx}>
                {cleanParagraph && (
                  <p className="leading-relaxed whitespace-pre-wrap">{cleanParagraph}</p>
                )}
                {protocolMatch && (
                  <div className="inline-flex items-center gap-1.5 my-1 mr-2 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-orbitron text-cyan-300">
                    <Shield className="w-3 h-3 text-cyan-400" />
                    <span>SYSTEM PROTOCOL: {protocolMatch[1]}</span>
                  </div>
                )}
                {actionMatch && (
                  <div className="inline-flex items-center gap-1.5 my-1 mr-2 px-2.5 py-1 rounded bg-purple-950/80 border border-purple-500/50 text-[10px] font-orbitron text-purple-300">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <span>DEVICE ACTION: {actionMatch[1]}</span>
                  </div>
                )}
                {windowsMatch && (
                  <div className="inline-flex items-center gap-1.5 my-1 px-2.5 py-1 rounded bg-indigo-950/90 border border-indigo-400/60 text-[10px] font-orbitron text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.25)]">
                    <Laptop className="w-3 h-3 text-indigo-400" />
                    <span>WINDOWS AGENT: {windowsMatch[1]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  };

  const themeBorder = {
    standard: 'border-cyan-500/30',
    alert: 'border-red-500/40',
    stealth: 'border-emerald-500/30',
    analysis: 'border-amber-500/30',
  }[mode];

  return (
    <div className={`flex flex-col h-full bg-slate-950/85 border ${themeBorder} rounded-xl backdrop-blur-md relative overflow-hidden shadow-2xl`}>
      {/* Background Holographic Grid Accent */}
      <div className="absolute inset-0 hud-grid-pattern opacity-10 pointer-events-none" />

      {/* Terminal Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90 z-10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-orbitron text-xs font-bold tracking-wider text-slate-100">
            J.A.R.V.I.S. COMMUNICATIONS CONSOLE
          </span>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
            QUANTUM UPLINK
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Web Search Grounding Pill */}
          <button
            type="button"
            onClick={onToggleWebSearch}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono-tech border transition-all ${
              enableWebSearch
                ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Live Web Grounding for current information"
          >
            <Globe className="w-3 h-3 text-cyan-400" />
            <span>SEARCH: {enableWebSearch ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={onToggleAutoSpeak}
            className={`p-1.5 rounded border transition-colors ${
              autoSpeak
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                : 'border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
            title={autoSpeak ? 'Mute vocal responses' : 'Enable voice responses'}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-colors"
            title="Voice & System Configuration"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearChat}
            className="p-1.5 rounded border border-slate-800 text-slate-400 hover:text-red-400 hover:border-slate-700 transition-colors"
            title="Clear Chat Memory"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice Playback Interrupt Bar (Active when J.A.R.V.I.S. speaks) */}
      {isSpeaking && (
        <div className="bg-cyan-950/90 border-b border-cyan-500/60 px-4 py-2 flex items-center justify-between text-xs font-mono-tech animate-fade-in shadow-[0_0_15px_rgba(6,182,212,0.3)] z-20">
          <div className="flex items-center gap-2.5 text-cyan-300">
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 bg-cyan-400 animate-pulse" />
              <span className="w-1 h-4 bg-cyan-400 animate-pulse delay-75" />
              <span className="w-1 h-2 bg-cyan-400 animate-pulse delay-150" />
              <span className="w-1 h-5 bg-cyan-400 animate-pulse delay-100" />
            </div>
            <span className="tracking-wide">J.A.R.V.I.S. VOCAL SYNTHESIS TRANSMITTING...</span>
          </div>

          <div className="flex items-center gap-2">
            {onStopSpeaking && (
              <button
                onClick={onStopSpeaking}
                className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500 text-red-300 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                title="Interrupt and stop voice playback"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>STOP SPEAKING</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message History Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 font-rajdhani z-10"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                  isUser
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                    : 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                }`}
              >
                {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-lg p-3 text-sm relative border ${
                  isUser
                    ? 'bg-blue-950/30 border-blue-600/40 text-slate-100 rounded-tr-none'
                    : 'bg-slate-900/80 border-cyan-500/30 text-slate-200 rounded-tl-none shadow-lg'
                }`}
              >
                {/* Header line inside bubble */}
                <div className="flex items-center justify-between text-[10px] font-mono-tech text-slate-400 mb-1.5 gap-4">
                  <span className="font-bold text-cyan-400/90 uppercase">
                    {isUser ? 'USER // COMMAND' : 'J.A.R.V.I.S. // RESPONSE'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>

                {/* Content */}
                <div className="text-slate-100 font-sans text-sm leading-relaxed">
                  {renderMessageContent(msg.text)}
                </div>

                {/* Grounding Source Citations (Web Search Results) */}
                {!isUser && msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] font-mono-tech text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <Globe className="w-3 h-3 text-emerald-400" />
                      <span>VERIFIED WEB SOURCES:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.groundingSources.map((source, sIdx) => (
                        <a
                          key={sIdx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-200 text-[10px] font-mono-tech flex items-center gap-1 transition-colors hover:text-emerald-100"
                        >
                          <span className="truncate max-w-[180px]">{source.title || 'Web Citation'}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bubble action toolbar (for assistant messages) */}
                {!isUser && (
                  <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono-tech">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === msg.id ? 'COPIED' : 'COPY'}</span>
                    </button>
                    <button
                      onClick={() => onReplayAudio(msg.text)}
                      className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Vocalize response"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>SPEAK</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Interim Speech-to-Text Live Transcript */}
        {isListening && interimTranscript && (
          <div className="flex items-start gap-3 flex-row-reverse animate-pulse">
            <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center shrink-0 text-red-400">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%] rounded-lg p-2.5 bg-red-950/30 border border-red-500/40 text-red-200 text-xs font-mono-tech">
              <span className="text-[10px] text-red-400 block font-bold">LIVE TRANSCRIBING...</span>
              "{interimTranscript}"
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3 text-cyan-400 text-xs font-mono-tech">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Analyzing inputs & accessing quantum neural core...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar z-10">
        <span className="text-[9px] font-mono-tech text-slate-500 uppercase shrink-0">DIRECTIVES:</span>
        {onRepeatLastResponse && (
          <button
            onClick={onRepeatLastResponse}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-full bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-500/50 text-[10px] font-mono-tech text-cyan-300 shrink-0 transition-all active:scale-95 flex items-center gap-1"
            title="Repeat last assistant response aloud"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>REPEAT LAST</span>
          </button>
        )}
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(p)}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-[10px] font-mono-tech text-slate-300 hover:text-cyan-300 shrink-0 transition-all active:scale-95"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Push-to-Talk / Continuous Mic Button */}
          <button
            type="button"
            onClick={onToggleListening}
            className={`p-2.5 rounded-lg border transition-all ${
              isListening
                ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-300'
            }`}
            title={isListening ? 'Stop Listening' : 'Start Voice Input (Space)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Listening to speech... (or type your directive)'
                : 'Speak with microphone or type command for J.A.R.V.I.S...'
            }
            disabled={isProcessing}
            className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-400 transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
          >
            <span>TRANSMIT</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
