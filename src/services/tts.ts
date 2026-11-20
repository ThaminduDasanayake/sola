export interface TTSState {
  isPlaying: boolean;
  currentText: string | null;
}

type TTSListener = (state: TTSState) => void;

class TTSService {
  private listeners: Set<TTSListener> = new Set();
  private isPlaying = false;
  private currentText: string | null = null;

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

  speak(text: string, rate = 1.05) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Prefer high-quality macOS voices like Samantha, Daniel, or Ava
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes('Ava') ||
        v.name.includes('Samantha') ||
        v.name.includes('Daniel') ||
        v.name.includes('Serena')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = rate;

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
    if ('speechSynthesis' in window) {
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
