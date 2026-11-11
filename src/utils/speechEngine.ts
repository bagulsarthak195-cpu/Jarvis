// Web Speech API and Audio Analyzer Engine for J.A.R.V.I.S.
import { VoiceSettings } from '../types/jarvis';

// Types for SpeechRecognition API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  isBritish: boolean;
}

// Strip markdown and protocol brackets so spoken voice is 100% natural
export function cleanTextForSpeech(rawText: string): string {
  return rawText
    .replace(/\[(PROTOCOL|ACTION|WINDOWS):[^\]]+\]/g, '') // remove protocol, action, and windows tags
    .replace(/```[\s\S]*?```/g, 'Code block omitted for brevity.') // replace code blocks
    .replace(/`([^`]+)`/g, '$1') // unwrap inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // unwrap bold
    .replace(/\*([^*]+)\*/g, '$1') // unwrap italic
    .replace(/#+\s+/g, '') // remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove markdown links
    .replace(/[•*\-]\s+/g, '') // remove list bullets
    .trim();
}

export class JarvisSpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isListeningActive = false;
  private continuousMode = false;
  private wakeWordMode = true;
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array | null = null;

  // Callbacks
  public onTranscriptChange: ((transcript: string, isFinal: boolean) => void) | null = null;
  public onSpeechStart: (() => void) | null = null;
  public onSpeechEnd: (() => void) | null = null;
  public onSpeakingStart: (() => void) | null = null;
  public onSpeakingEnd: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;
  public onVoicesLoaded: ((voices: VoiceOption[]) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
      this.initRecognition();
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.onVoicesLoaded && this.voices.length > 0) {
      const formatted: VoiceOption[] = this.voices.map((v) => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
        isBritish: v.lang.toLowerCase().includes('en-gb') || v.name.toLowerCase().includes('uk') || v.name.toLowerCase().includes('british') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('oliver'),
      }));
      this.onVoicesLoaded(formatted);
    }
  }

  public getAvailableVoices(): VoiceOption[] {
    return this.voices.map((v) => ({
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
      isBritish: v.lang.toLowerCase().includes('en-gb') || v.name.toLowerCase().includes('uk') || v.name.toLowerCase().includes('british') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('oliver'),
    }));
  }

  public getBestJarvisVoice(preferredUri?: string): SpeechSynthesisVoice | null {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }

    if (preferredUri) {
      const match = this.voices.find((v) => v.voiceURI === preferredUri);
      if (match) return match;
    }

    // Preferred UK/British voices for authentic Paul Bettany Butler J.A.R.V.I.S. tone
    const britishCandidates = this.voices.filter(
      (v) =>
        v.lang.toLowerCase().includes('en-gb') ||
        v.name.toLowerCase().includes('uk english') ||
        v.name.toLowerCase().includes('daniel') ||
        v.name.toLowerCase().includes('george') ||
        v.name.toLowerCase().includes('oliver') ||
        v.name.toLowerCase().includes('arthur')
    );

    if (britishCandidates.length > 0) {
      // Prioritize natural or male British voice if tagged
      const maleUk = britishCandidates.find(
        (v) => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('daniel')
      );
      return maleUk || britishCandidates[0];
    }

    // Fallback: any English voice
    const englishVoice = this.voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return englishVoice || this.voices[0] || null;
  }

  // Speak text using SpeechSynthesis
  public speak(text: string, settings: VoiceSettings): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      this.stopSpeaking();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voice = this.getBestJarvisVoice(settings.voiceUri);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.pitch = settings.pitch;
      utterance.rate = settings.rate;
      utterance.volume = settings.volume;

      utterance.onstart = () => {
        this.currentUtterance = utterance;
        if (this.onSpeakingStart) this.onSpeakingStart();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (this.onSpeakingEnd) this.onSpeakingEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        if (this.onSpeakingEnd) this.onSpeakingEnd();
        console.warn('Speech synthesis error or interrupted:', e);
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      if (this.onSpeakingEnd) this.onSpeakingEnd();
    }
  }

  public isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }

  // Web Speech Recognition
  private initRecognition() {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        if (this.onSpeechStart) this.onSpeechStart();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript.trim() && this.onTranscriptChange) {
          this.onTranscriptChange(finalTranscript.trim(), true);
        } else if (interimTranscript.trim() && this.onTranscriptChange) {
          this.onTranscriptChange(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning/error:', event.error);
        if (event.error === 'not-allowed') {
          if (this.onError) this.onError('Microphone access denied. Please allow microphone permission.');
          this.isListeningActive = false;
        }
      };

      this.recognition.onend = () => {
        // Auto-restart if continuous mode is enabled
        if (this.continuousMode && this.isListeningActive) {
          try {
            this.recognition.start();
          } catch (e) {
            // Already active or temporarily unavailable
          }
        } else {
          this.isListeningActive = false;
          if (this.onSpeechEnd) this.onSpeechEnd();
        }
      };
    } catch (e) {
      console.error('Failed to initialize Speech Recognition:', e);
    }
  }

  public startListening(continuous = false, wakeWord = false): boolean {
    this.continuousMode = continuous;
    this.wakeWordMode = wakeWord;

    if (!this.recognition) {
      if (this.onError) this.onError('Speech recognition not supported in this browser environment. Chrome or Edge recommended.');
      return false;
    }

    try {
      this.isListeningActive = true;
      this.initMicStream();
      this.recognition.start();
      return true;
    } catch (e) {
      // If already started
      return true;
    }
  }

  public stopListening() {
    this.continuousMode = false;
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.stopMicStream();
    if (this.onSpeechEnd) this.onSpeechEnd();
  }

  public isListening(): boolean {
    return this.isListeningActive;
  }

  // Microphone audio analyzer for Arc Reactor pulse & HUD Audio Visualizer
  private async initMicStream() {
    if (this.micStream) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micStream = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext && AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;
        source.connect(this.analyser);
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      }
    } catch (err) {
      console.warn('Could not initialize microphone visualizer stream:', err);
    }
  }

  private stopMicStream() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  // Returns live audio energy level (0 - 100)
  public getAudioLevel(): number {
    if (this.isSpeaking()) {
      // Simulates speech rhythm when Jarvis is speaking
      return Math.sin(Date.now() / 90) * 20 + 55 + Math.random() * 15;
    }

    if (!this.analyser || !this.freqData) {
      return this.isListeningActive ? 15 + Math.random() * 10 : 0;
    }

    this.analyser.getByteFrequencyData(this.freqData as any);
    let sum = 0;
    for (let i = 0; i < this.freqData.length; i++) {
      sum += this.freqData[i];
    }
    const avg = sum / this.freqData.length;
    return Math.min(100, Math.round((avg / 255) * 100));
  }
}

export const speechEngine = new JarvisSpeechEngine();
