export interface TTSState {
  isPlaying: boolean;
  currentText: string | null;
}

type TTSListener = (state: TTSState) => void;

/**
 * Strips out emojis, image metadata, URLs, markdown formatting,
 * and email boilerplate to produce clear, human-like speech.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove markdown images and newsletter image metadata lines
  // e.g. View image: (https://...)
  // e.g. Follow image link: (https://...)
  // e.g. Caption: ...
  cleaned = cleaned.replace(/^(?:view\s+image|follow\s+image\s+link|caption|image|photo)\s*:\s*.*$/gim, '');
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // 2. Extract anchor text from markdown links: [Anchor Text](https://...) -> Anchor Text
  cleaned = cleaned.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi, '$1');

  // 3. Remove raw URLs and email links
  cleaned = cleaned.replace(/https?:\/\/[^\s)\]>]+/gi, '');
  cleaned = cleaned.replace(/www\.[^\s)\]>]+/gi, '');
  cleaned = cleaned.replace(/mailto:[^\s)\]>]+/gi, '');

  // 4. Remove all emojis and special pictographs
  cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, ' ');
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, ' ');

  // 5. Remove newsletter navigation and boilerplate headers/footers
  cleaned = cleaned.replace(/^(?:unsubscribe|manage\s+preferences|update\s+preferences|view\s+in\s+browser|read\s+online|read\s+on\s+.*|read\s+in\s+app|share\s+this\s+post|forwarded\s+this\s+email\?).*$/gim, '');
  cleaned = cleaned.replace(/^(?:click\s+here\s+to\s+unsubscribe|to\s+unsubscribe\s+or\s+change\s+your\s+email\s+settings|sponsored\s+by.*).*$/gim, '');

  // 6. Clean markdown formatting
  // Headers: ### Header -> Header
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');
  // Bold, italic, strikethrough: **text**, *text*, __text__, _text_, ~~text~~
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');
  // Code blocks: ```code``` -> removed
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  // Blockquotes: > quote -> quote
  cleaned = cleaned.replace(/^>\s*/gm, '');
  // List bullets: - item, * item, • item
  cleaned = cleaned.replace(/^[\s*•\-–—]+\s*/gm, '');

  // 7. Natural phrasing adjustments for spoken speech
  cleaned = cleaned.replace(/\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*(?:mo|month)\b/gi, '$1 dollars a month');
  cleaned = cleaned.replace(/\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*(?:yr|year)\b/gi, '$1 dollars a year');
  cleaned = cleaned.replace(/\$([0-9]+(?:\.[0-9]+)?)\b/g, '$1 dollars');
  cleaned = cleaned.replace(/&amp;/gi, ' and ');
  cleaned = cleaned.replace(/&nbsp;/gi, ' ');
  cleaned = cleaned.replace(/&lt;/gi, ' less than ');
  cleaned = cleaned.replace(/&gt;/gi, ' greater than ');
  cleaned = cleaned.replace(/&#39;|&apos;/gi, "'");
  cleaned = cleaned.replace(/&quot;/gi, '"');

  // 8. Remove leftover HTML tags if any
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // 9. Format lines and ensure proper sentence cadences
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const formattedLines: string[] = [];
  for (const line of lines) {
    let l = line;
    // If line doesn't end with a punctuation mark, add a period for natural breathing pause
    if (!/[.!?:]$/.test(l)) {
      l = `${l}.`;
    }
    formattedLines.push(l);
  }

  // 10. Clean up excessive whitespace and duplicate punctuation
  return formattedLines
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

/**
 * Splits clean text into short, natural sentence/paragraph chunks
 * to avoid WebKit SpeechSynthesis utterance pauses/timeouts.
 */
function splitIntoSpokenChunks(text: string): string[] {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= 160) {
      chunks.push(para);
    } else {
      const sentences = para.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [para];
      let current = '';
      for (const s of sentences) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        if (current && (current.length + trimmed.length) > 140) {
          chunks.push(current);
          current = trimmed;
        } else {
          current = current ? `${current} ${trimmed}` : trimmed;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks.filter(Boolean);
}

class TTSService {
  private listeners: Set<TTSListener> = new Set();
  private isPlaying = false;
  private currentText: string | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoiceName: string | null = null;
  // Default to 0.90x for a calm, clear, deliberate narrator cadence
  private speechRate: number = 0.9;
  private sessionId = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.selectedVoiceName = localStorage.getItem('sola_tts_voice');
      const savedRate = localStorage.getItem('sola_tts_rate');
      if (savedRate) {
        this.speechRate = parseFloat(savedRate) || 0.9;
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

  /**
   * Automatically picks the best, most natural voice available.
   * Prioritizes enhanced / premium Siri and neural voices on macOS.
   */
  getBestVoice(overrideName?: string): SpeechSynthesisVoice | undefined {
    const available = this.getVoices();
    if (available.length === 0) return undefined;

    const targetName = overrideName || this.selectedVoiceName;
    if (targetName) {
      const match = available.find((v) => v.name === targetName);
      if (match) return match;
    }

    const en = available.filter((v) => v.lang.startsWith('en'));
    const pool = en.length > 0 ? en : available;

    // 1. Enhanced or Premium Siri / Neural voices (highest quality on macOS)
    const enhanced = pool.find((v) => {
      const n = v.name.toLowerCase();
      const isHighQuality = n.includes('enhanced') || n.includes('premium') || n.includes('natural');
      return (
        isHighQuality &&
        (n.includes('ava') ||
          n.includes('samantha') ||
          n.includes('zoe') ||
          n.includes('daniel') ||
          n.includes('oliver') ||
          n.includes('serena') ||
          n.includes('siri'))
      );
    });
    if (enhanced) return enhanced;

    // 2. Any enhanced or premium voice
    const anyEnhanced = pool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('enhanced') || n.includes('premium') || n.includes('natural');
    });
    if (anyEnhanced) return anyEnhanced;

    // 3. Siri or standard top voices (Ava, Samantha, Zoe, Daniel)
    const topStandard = pool.find((v) => {
      const n = v.name.toLowerCase();
      return (
        n.includes('siri') ||
        n.includes('ava') ||
        n.includes('samantha') ||
        n.includes('zoe') ||
        n.includes('daniel')
      );
    });
    if (topStandard) return topStandard;

    // 4. Fallback to en-US or first available
    return pool.find((v) => v.lang === 'en-US') || pool[0];
  }

  speak(rawText: string, options?: { voiceName?: string; rate?: number }) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this environment');
      return;
    }

    this.stop();

    const cleanText = cleanTextForSpeech(rawText);
    if (!cleanText) {
      this.isPlaying = false;
      this.currentText = null;
      this.notify();
      return;
    }

    const chunks = splitIntoSpokenChunks(cleanText);
    if (chunks.length === 0) return;

    const voice = this.getBestVoice(options?.voiceName);
    const rate = options?.rate ?? this.speechRate;

    const currentSession = ++this.sessionId;
    this.isPlaying = true;
    this.currentText = rawText;
    this.notify();

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = 1.0;

      if (index === chunks.length - 1) {
        utterance.onend = () => {
          if (this.sessionId === currentSession) {
            this.isPlaying = false;
            this.currentText = null;
            this.notify();
          }
        };
      }

      utterance.onerror = (e) => {
        // Ignore errors caused by manual cancellation
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        console.warn('TTS chunk error:', e);
        if (this.sessionId === currentSession) {
          this.isPlaying = false;
          this.currentText = null;
          this.notify();
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    this.sessionId++;
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
