export interface TTSState {
  isPlaying: boolean;
  currentText: string | null;
}

type TTSListener = (state: TTSState) => void;

class TTSService {
  private listeners: Set<TTSListener> = new Set();
  private isPlaying = false;
  private currentText: string | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoiceName: string | null = null;
  private speechRate: number = 1.05;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.selectedVoiceName = localStorage.getItem('sola_tts_voice');
      const savedRate = localStorage.getItem('sola_tts_rate');
      if (savedRate) {
        this.speechRate = parseFloat(savedRate) || 1.05;
      }

      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
    }
    return this.voices;
  }

  getSelectedVoiceName(): string | null {
    return this.selectedVoiceName;
  }

  setSelectedVoiceName(name: string) {
    this.selectedVoiceName = name;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sola_tts_voice', name);
    }
  }

  getRate(): number {
    return this.speechRate;
  }

  setRate(rate: number) {
    this.speechRate = rate;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sola_tts_rate', rate.toString());
    }
  }

  subscribe(listener: TTSListener) {
    this.listeners.add(listener);
    listener({ isPlaying: this.isPlaying, currentText: this.currentText });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ isPlaying: this.isPlaying, currentText: this.currentText });
    }
  }

  speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const available = this.getVoices();

    // 1. Check user-configured voice preference
    let voice: SpeechSynthesisVoice | undefined;
    if (this.selectedVoiceName) {
      voice = available.find((v) => v.name === this.selectedVoiceName);
    }

    // 2. Fallback to Siri / Neural / Samantha
    if (!voice) {
      voice =
        available.find((v) => v.name.toLowerCase().includes('siri')) ||
        available.find((v) => v.name.includes('Ava')) ||
        available.find((v) => v.name.includes('Samantha')) ||
        available.find((v) => v.name.includes('Daniel')) ||
        available[0];
    }

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = this.speechRate;

    utterance.onstart = () => {
      this.isPlaying = true;
      this.currentText = text;
      this.notify();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentText = null;
      this.notify();
    };

    utterance.onerror = (e) => {
      console.error('TTS error:', e);
      this.isPlaying = false;
      this.currentText = null;
      this.notify();
    };

    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentText = null;
      this.notify();
    }
  }

  toggle(text: string) {
    if (this.isPlaying && this.currentText === text) {
      this.stop();
    } else {
      this.speak(text);
    }
  }
}

export const ttsService = new TTSService();
