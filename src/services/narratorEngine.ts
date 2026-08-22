import { soundEffects } from './audioSynthesizer';

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  isGoogle: boolean;
  voice: SpeechSynthesisVoice;
}

export interface QueueItem {
  text: string | string[];
  effectType?: 'wind' | 'howl' | 'gavel' | 'rooster' | 'chime' | 'death' | 'victory';
  pauseBetweenMs?: number;
  betweenPartsEffect?: 'teleport' | 'wind' | 'chime' | 'mystic';
  onPartChange?: (partIndex: number | null) => void;
}

// Clean and sanitize Vietnamese text for optimal TTS output
export function cleanVietnameseTextForTTS(text: string): string {
  if (!text) return '';
  return text
    // Remove emojis & icons
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
    // Replace common symbols with natural Vietnamese words or pauses
    .replace(/&/g, ' và ')
    .replace(/[➔➜➝➡]/g, ', ')
    .replace(/[*_#`~[\]()]/g, ' ')
    // Remove game notation abbreviations
    .replace(/\bN(\d+)\b/gi, 'Đêm $1')
    .replace(/\bD(\d+)\b/gi, 'Ngày $1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split text into audio chunks suitable for TTS (max ~140 chars per chunk for fast streaming)
export function splitIntoAudioChunks(text: string, maxLen: number = 130): string[] {
  const cleaned = cleanVietnameseTextForTTS(text);
  if (!cleaned) return [];

  const sentences = cleaned.split(/(?<=[.!?;:\n])\s+/);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      // Split by commas or conjunctions
      const subParts = trimmed.split(/(?<=[,])\s+/);
      let current = '';
      for (const part of subParts) {
        if (!current) {
          current = part;
        } else if ((current + ', ' + part).length <= maxLen) {
          current += ', ' + part;
        } else {
          chunks.push(current.trim());
          current = part;
        }
      }
      if (current.trim()) {
        if (current.length <= maxLen) {
          chunks.push(current.trim());
        } else {
          // Fallback word split
          const words = current.split(/\s+/);
          let wordChunk = '';
          for (const w of words) {
            if (!wordChunk) {
              wordChunk = w;
            } else if ((wordChunk + ' ' + w).length <= maxLen) {
              wordChunk += ' ' + w;
            } else {
              chunks.push(wordChunk.trim());
              wordChunk = w;
            }
          }
          if (wordChunk.trim()) chunks.push(wordChunk.trim());
        }
      }
    }
  }

  return chunks.filter((c) => c.length > 0);
}

class NarratorEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private sequenceTimeouts: ReturnType<typeof setTimeout>[] = [];
  private watchdogTimeout: ReturnType<typeof setTimeout> | null = null;
  private queue: QueueItem[] = [];
  private isSpeaking = false;
  private isUnlocked = false;
  private currentAudio: HTMLAudioElement | null = null;
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  public speechEnabled = true;
  public soundEffectsEnabled = true;
  public preferOnlineVietnamese = true;
  public speechRate: number = 1.25; // Snappy, lively, articulate rate (default 1.25x)

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();

        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }

      // Auto-unlock on first user interaction across mobile touch & desktop click/key
      const handleUserGesture = () => {
        this.unlock();
      };
      window.addEventListener('touchstart', handleUserGesture, { passive: true });
      window.addEventListener('touchend', handleUserGesture, { passive: true });
      window.addEventListener('pointerdown', handleUserGesture, { passive: true });
      window.addEventListener('click', handleUserGesture, { passive: true });
      window.addEventListener('keydown', handleUserGesture, { passive: true });
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    try {
      const v = this.synth.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
      }
    } catch (e) {}
  }

  public unlock() {
    soundEffects.unlock();

    // Unlock HTML5 Audio context for mobile browsers
    if (!this.isUnlocked) {
      try {
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        silentAudio.volume = 0.01;
        const p = silentAudio.play();
        if (p !== undefined) {
          p.then(() => {
            silentAudio.pause();
            silentAudio.currentTime = 0;
          }).catch(() => {});
        }
      } catch (e) {}

      // Unlock SpeechSynthesis
      if (this.synth) {
        try {
          this.loadVoices();
          if (this.synth.paused) {
            this.synth.resume();
          }
          const dummy = new SpeechSynthesisUtterance(' ');
          dummy.lang = 'vi-VN';
          dummy.volume = 0.01;
          dummy.rate = 2.0;
          this.synth.speak(dummy);
        } catch (e) {}
      }

      this.isUnlocked = true;
    }
  }

  public getAvailableVoices(): VoiceOption[] {
    if (!this.synth) return [];
    this.loadVoices();
    const all = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    return all.map((v, i) => ({
      id: `${v.name}-${v.lang}-${i}`,
      name: v.name,
      lang: v.lang,
      isGoogle: v.name.toLowerCase().includes('google'),
      voice: v,
    }));
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    this.loadVoices();
    const available = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    if (available.length === 0) return null;

    const viVoices = available.filter((v) => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      const n = (v.name || '').toLowerCase();
      const u = (v.voiceURI || '').toLowerCase();
      return (
        l.startsWith('vi') ||
        l.includes('vi-vn') ||
        l.includes('vie') ||
        n.includes('vietnam') ||
        n.includes('tiếng việt') ||
        n.includes('tieng viet') ||
        n.includes('linh') ||
        n.includes('an') ||
        n.includes('mai') ||
        n.includes('nam') ||
        n.includes('ngoc') ||
        n.includes('phuong') ||
        n.includes('quang') ||
        n.includes('khoi') ||
        n.includes('hoaimy') ||
        n.includes('namminh') ||
        n.includes('csk_vi_vn') ||
        u.includes('vi_vn') ||
        u.includes('vi-vn')
      );
    });

    if (viVoices.length > 0) {
      const naturalVi = viVoices.find(
        (v) =>
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('linh') ||
          v.name.toLowerCase().includes('google')
      );
      if (naturalVi) return naturalVi;
      return viVoices[0];
    }

    return null;
  }

  public speak(
    text: string | string[],
    effectType?: 'wind' | 'howl' | 'gavel' | 'rooster' | 'chime' | 'death' | 'victory',
    pauseBetweenMs: number = 1600,
    betweenPartsEffect?: 'teleport' | 'wind' | 'chime' | 'mystic',
    onPartChange?: (partIndex: number | null) => void,
    interrupt: boolean = false
  ) {
    if (!this.speechEnabled && !this.soundEffectsEnabled) return;

    if (interrupt) {
      this.stop();
    }

    const textStr = Array.isArray(text) ? text.join(' ') : text;
    if (this.queue.length > 0) {
      const lastItem = this.queue[this.queue.length - 1];
      const lastTextStr = Array.isArray(lastItem.text) ? lastItem.text.join(' ') : lastItem.text;
      if (lastTextStr === textStr) return;
    }

    this.queue.push({
      text,
      effectType,
      pauseBetweenMs,
      betweenPartsEffect,
      onPartChange,
    });

    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  // Play Vietnamese audio through high-quality /api/tts endpoint with direct Google TTS fallback for GitHub Pages
  private playOnlineVietnameseTTS(text: string, onEnd: () => void, onError: () => void) {
    const chunks = splitIntoAudioChunks(text);
    if (chunks.length === 0) {
      onEnd();
      return;
    }

    let chunkIdx = 0;

    const playNextChunk = () => {
      if (chunkIdx >= chunks.length || !this.isSpeaking || !this.speechEnabled) {
        onEnd();
        return;
      }

      const chunk = chunks[chunkIdx];
      // Candidate audio URLs: 1. Server API endpoint (Express backend) -> 2. Direct Google Translate TTS endpoint (GitHub Pages / static hosts)
      const candidateUrls = [
        `/api/tts?text=${encodeURIComponent(chunk)}`,
        `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`,
      ];

      let candidateIdx = 0;

      const tryPlayCandidate = () => {
        if (candidateIdx >= candidateUrls.length) {
          onError();
          return;
        }

        const url = candidateUrls[candidateIdx];

        try {
          const audio = new Audio();
          this.currentAudio = audio;
          audio.preload = 'auto';
          audio.playbackRate = this.speechRate;
          audio.defaultPlaybackRate = this.speechRate;
          audio.src = url;

          audio.onloadedmetadata = () => {
            try {
              audio.playbackRate = this.speechRate;
            } catch (e) {}
          };
          audio.onplay = () => {
            try {
              audio.playbackRate = this.speechRate;
            } catch (e) {}
          };

          let finished = false;
          const handleDone = () => {
            if (finished) return;
            finished = true;
            this.currentAudio = null;
            chunkIdx++;
            playNextChunk();
          };

          const handleFail = () => {
            if (finished) return;
            finished = true;
            this.currentAudio = null;
            // Try next candidate URL (e.g. from /api/tts to direct Google TTS on GitHub Pages)
            candidateIdx++;
            tryPlayCandidate();
          };

          audio.onended = handleDone;
          audio.onerror = handleFail;

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn(`Online TTS candidate ${candidateIdx} failed:`, err);
              handleFail();
            });
          }
        } catch (err) {
          this.currentAudio = null;
          candidateIdx++;
          tryPlayCandidate();
        }
      };

      tryPlayCandidate();
    };

    playNextChunk();
  }

  // Fallback to Web Speech API when offline or if server TTS unavailable
  private speakViaWebSpeech(partText: string, onComplete: () => void) {
    if (!this.synth) {
      onComplete();
      return;
    }

    try {
      const cleanText = cleanVietnameseTextForTTS(partText);
      const chosenVoice = this.getSelectedVoice();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
      utterance.rate = this.speechRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      this.activeUtterances.add(utterance);

      const cleanup = () => {
        if (this.watchdogTimeout) {
          clearTimeout(this.watchdogTimeout);
          this.watchdogTimeout = null;
        }
        this.activeUtterances.delete(utterance);
      };

      utterance.onend = () => {
        cleanup();
        onComplete();
      };

      utterance.onerror = () => {
        cleanup();
        onComplete();
      };

      if (this.watchdogTimeout) clearTimeout(this.watchdogTimeout);
      const estDuration = Math.max(3000, (cleanText.length * 150) / this.speechRate);
      this.watchdogTimeout = setTimeout(() => {
        cleanup();
        onComplete();
      }, estDuration);

      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
    } catch (e) {
      onComplete();
    }
  }

  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;
    if (!this.speechEnabled && !this.soundEffectsEnabled) {
      this.queue = [];
      return;
    }

    const item = this.queue.shift()!;
    this.isSpeaking = true;

    // 1. Play sound effect if requested
    if (this.soundEffectsEnabled && item.effectType) {
      switch (item.effectType) {
        case 'wind':
          soundEffects.playNightWind();
          break;
        case 'howl':
          soundEffects.playWolfHowl();
          break;
        case 'gavel':
          soundEffects.playGavelStrike();
          break;
        case 'rooster':
          soundEffects.playRooster();
          break;
        case 'chime':
          soundEffects.playChimeBell();
          break;
        case 'death':
          soundEffects.playDeathBell();
          break;
        case 'victory':
          soundEffects.playVictoryFanfare();
          break;
      }
    }

    const finishCurrentItem = () => {
      if (this.watchdogTimeout) {
        clearTimeout(this.watchdogTimeout);
        this.watchdogTimeout = null;
      }
      item.onPartChange?.(null);
      this.isSpeaking = false;
      const timeout = setTimeout(() => {
        this.processQueue();
      }, 150);
      this.sequenceTimeouts.push(timeout);
    };

    // 2. Speak Vietnamese using Online High-Fidelity Audio with Web Speech fallback
    if (this.speechEnabled) {
      const parts = Array.isArray(item.text) ? item.text : [item.text];
      let currentIndex = 0;

      const scheduleSequence = (fn: () => void, delayMs: number) => {
        const timeout = setTimeout(fn, delayMs);
        this.sequenceTimeouts.push(timeout);
      };

      const handlePartTransition = () => {
        if (currentIndex >= parts.length) {
          finishCurrentItem();
          return;
        }

        item.onPartChange?.(null);

        scheduleSequence(() => {
          if (this.soundEffectsEnabled) {
            soundEffects.playTeleportDepart();
          }

          scheduleSequence(() => {
            if (this.soundEffectsEnabled) {
              soundEffects.playTeleportArrive();
            }

            scheduleSequence(() => {
              speakNextPart();
            }, 180);
          }, 240);
        }, 120);
      };

      const speakNextPart = () => {
        if (currentIndex >= parts.length || !this.speechEnabled) {
          finishCurrentItem();
          return;
        }

        const rawPartText = parts[currentIndex]?.trim() || '';
        if (!rawPartText) {
          currentIndex++;
          speakNextPart();
          return;
        }

        item.onPartChange?.(currentIndex);

        // Try high quality server-side TTS stream first (Standard Vietnamese across PC & Mobile)
        this.playOnlineVietnameseTTS(
          rawPartText,
          () => {
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          },
          () => {
            // If server audio fails, fallback to local Web Speech synthesis
            this.speakViaWebSpeech(rawPartText, () => {
              currentIndex++;
              if (currentIndex < parts.length) {
                handlePartTransition();
              } else {
                finishCurrentItem();
              }
            });
          }
        );
      };

      speakNextPart();
    } else {
      finishCurrentItem();
    }
  }

  public stop() {
    this.queue = [];
    this.isSpeaking = false;
    if (this.watchdogTimeout) {
      clearTimeout(this.watchdogTimeout);
      this.watchdogTimeout = null;
    }
    this.sequenceTimeouts.forEach((t) => clearTimeout(t));
    this.sequenceTimeouts = [];
    this.activeUtterances.clear();

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }

  public setSpeed(rate: number) {
    this.speechRate = Math.max(0.75, Math.min(2.0, rate));
    if (this.currentAudio) {
      try {
        this.currentAudio.playbackRate = this.speechRate;
        this.currentAudio.defaultPlaybackRate = this.speechRate;
      } catch (e) {}
    }
  }
}

export const narrator = new NarratorEngine();
