export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string | null;
  currentChunkIndex: number;
  totalChunks: number;
  currentChunkText: string | null;
  speedRate: number;
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
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/^>\s*/gm, '');
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
export function splitIntoSpokenChunks(text: string): string[] {
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
  private isPaused = false;
  private currentText: string | null = null;
  private chunks: string[] = [];
  private currentChunkIndex = 0;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoiceName: string | null = null;
  // Default to 1.0x (standard speed)
  private speechRate: number = 1.0;
  private sessionId = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.selectedVoiceName = localStorage.getItem('sola_tts_voice');
      const hasInit1x = localStorage.getItem('sola_tts_rate_default_1x');
      const savedRate = localStorage.getItem('sola_tts_rate');

      if (!hasInit1x) {
        this.speechRate = 1.0;
        localStorage.setItem('sola_tts_rate', '1.0');
        localStorage.setItem('sola_tts_rate_default_1x', 'true');
      } else if (savedRate) {
        this.speechRate = parseFloat(savedRate) || 1.0;
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
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
    if (typeof window !== 'undefined') {
      localStorage.setItem('sola_tts_rate', this.speechRate.toString());
    }
    this.notify();
    if (this.isPlaying) {
      this.playCurrentChunk();
    }
  }

  cycleRate(): number {
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5];
    const current = this.speechRate;
    let nextIdx = rates.findIndex((r) => Math.abs(r - current) < 0.04);
    if (nextIdx === -1) {
      nextIdx = 2; // 1.0x
    } else {
      nextIdx = (nextIdx + 1) % rates.length;
    }
    const nextRate = rates[nextIdx];
    this.setRate(nextRate);
    return nextRate;
  }

  getState(): TTSState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentText: this.currentText,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      currentChunkText: this.chunks[this.currentChunkIndex] || null,
      speedRate: this.speechRate,
    };
  }

  subscribe(listener: TTSListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

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

    const anyEnhanced = pool.find((v) => {
      const n = v.name.toLowerCase();
      return n.includes('enhanced') || n.includes('premium') || n.includes('natural');
    });
    if (anyEnhanced) return anyEnhanced;

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

    return pool.find((v) => v.lang === 'en-US') || pool[0];
  }

  speak(rawText: string, startIndex = 0) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    this.stopPlaybackOnly();

    const clean = cleanTextForSpeech(rawText);
    if (!clean) {
      this.resetState();
      return;
    }

    this.chunks = splitIntoSpokenChunks(clean);
    if (this.chunks.length === 0) {
      this.resetState();
      return;
    }

    this.currentText = rawText;
    this.currentChunkIndex = Math.max(0, Math.min(this.chunks.length - 1, startIndex));
    this.isPlaying = true;
    this.isPaused = false;
    this.sessionId++;

    this.playCurrentChunk();
  }

  private stopPlaybackOnly() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private resetState() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentText = null;
    this.chunks = [];
    this.currentChunkIndex = 0;
    this.notify();
  }

  private playCurrentChunk() {
    this.stopPlaybackOnly();

    if (this.currentChunkIndex >= this.chunks.length) {
      this.resetState();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    const session = this.sessionId;
    const utterance = new SpeechSynthesisUtterance(chunk);
    const voice = this.getBestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (this.sessionId === session && this.isPlaying && !this.isPaused) {
        if (this.currentChunkIndex + 1 < this.chunks.length) {
          this.currentChunkIndex++;
          this.notify();
          // Small natural breath pause between chunks (120ms)
          setTimeout(() => {
            if (this.sessionId === session && this.isPlaying && !this.isPaused) {
              this.playCurrentChunk();
            }
          }, 120);
        } else {
          this.resetState();
        }
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('TTS playback error on chunk:', e);
      if (this.sessionId === session && this.isPlaying && !this.isPaused) {
        if (this.currentChunkIndex + 1 < this.chunks.length) {
          this.currentChunkIndex++;
          this.playCurrentChunk();
        } else {
          this.resetState();
        }
      }
    };

    this.isPlaying = true;
    this.isPaused = false;
    this.notify();

    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;
    this.stopPlaybackOnly();
    this.isPaused = true;
    this.isPlaying = false;
    this.notify();
  }

  resume() {
    if (!this.isPaused || !this.currentText) return;
    this.isPaused = false;
    this.isPlaying = true;
    this.sessionId++;
    this.playCurrentChunk();
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    }
  }

  toggle(rawText: string) {
    if (this.currentText === rawText) {
      if (this.isPlaying) {
        this.pause();
      } else if (this.isPaused) {
        this.resume();
      } else {
        this.speak(rawText, 0);
      }
    } else {
      this.speak(rawText, 0);
    }
  }

  next() {
    if (this.chunks.length === 0) return;
    const nextIdx = Math.min(this.chunks.length - 1, this.currentChunkIndex + 1);
    this.jumpTo(nextIdx);
  }

  previous() {
    if (this.chunks.length === 0) return;
    const prevIdx = Math.max(0, this.currentChunkIndex - 1);
    this.jumpTo(prevIdx);
  }

  jumpTo(index: number) {
    if (this.chunks.length === 0) return;
    this.currentChunkIndex = Math.max(0, Math.min(this.chunks.length - 1, index));
    this.sessionId++;
    this.isPlaying = true;
    this.isPaused = false;
    this.playCurrentChunk();
  }

  /**
   * Finds the chunk closest to a clicked paragraph or selected text
   * and immediately jumps to it.
   */
  playFromText(textSnippet: string, fallbackRawText?: string) {
    const cleanSnippet = cleanTextForSpeech(textSnippet).toLowerCase();
    if (!cleanSnippet) return;

    // If currently not loaded or loaded with different text, initialize with fallback
    if (!this.currentText && fallbackRawText) {
      const cleanFull = cleanTextForSpeech(fallbackRawText);
      this.chunks = splitIntoSpokenChunks(cleanFull);
      this.currentText = fallbackRawText;
    }

    if (this.chunks.length === 0) {
      if (fallbackRawText) this.speak(fallbackRawText, 0);
      return;
    }

    // Find best matching chunk
    const words = cleanSnippet.split(/\s+/).filter((w) => w.length > 3);
    let bestIndex = -1;
    let maxMatch = 0;

    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i].toLowerCase();
      if (c.includes(cleanSnippet) || cleanSnippet.includes(c)) {
        bestIndex = i;
        break;
      }
      let matches = 0;
      for (const w of words) {
        if (c.includes(w)) matches++;
      }
      if (matches > maxMatch) {
        maxMatch = matches;
        bestIndex = i;
      }
    }

    if (bestIndex !== -1) {
      this.jumpTo(bestIndex);
    } else {
      // Default to starting if not found
      this.jumpTo(0);
    }
  }

  stop() {
    this.sessionId++;
    this.stopPlaybackOnly();
    this.resetState();
  }
}

export const ttsService = new TTSService();
