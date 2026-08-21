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

// Clean and sanitize Vietnamese text for optimal speech
function cleanVietnameseTextForTTS(text: string): string {
  if (!text) return '';
  return text
    // Remove emojis & symbols
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
    // Replace common symbols with words or spaces
    .replace(/&/g, ' và ')
    .replace(/[➔➜➝➡]/g, ' ')
    .replace(/[*_#`~[\]()]/g, ' ')
    // Remove markdown formatting
    .replace(/\bN(\d+)\b/gi, 'Đêm $1')
    .replace(/\bD(\d+)\b/gi, 'Ngày $1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split long text into speakable segments for online TTS (max ~150 chars per chunk)
function splitIntoAudioChunks(text: string, maxLen: number = 140): string[] {
  const cleaned = cleanVietnameseTextForTTS(text);
  if (!cleaned) return [];

  // Split by sentence punctuation first
  const sentences = cleaned.split(/(?<=[.!?;:\n])\s+/);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      // Split by commas
      const subParts = trimmed.split(/(?<=[,])\s+/);
      let current = '';
      for (const part of subParts) {
        if (!current) {
          current = part;
        } else if ((current + ' ' + part).length <= maxLen) {
          current += ' ' + part;
        } else {
          chunks.push(current.trim());
          current = part;
        }
      }
      if (current.trim()) {
        if (current.length <= maxLen) {
          chunks.push(current.trim());
        } else {
          // Hard split by words
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
  // Crucial for iOS Safari & Android Chrome: Prevent GC from killing active utterance mid-speech
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  public speechEnabled = true;
  public soundEffectsEnabled = true;
  // Force high-quality Vietnamese audio mode or auto-fallback
  public preferOnlineVietnamese = true;
  public useGoogleVoice = false;
  public voiceToggleCount = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.initVoice();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.initVoice();
        }
      }

      // Auto-unlock on first mobile touch/click
      const handleUserGesture = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', handleUserGesture, { passive: true });
      window.addEventListener('touchstart', handleUserGesture, { passive: true });
      window.addEventListener('click', handleUserGesture, { passive: true });
    }
  }

  public unlock() {
    soundEffects.unlock();
    if (this.synth) {
      try {
        this.initVoice();
        if (this.synth.paused) {
          this.synth.resume();
        }
        if (!this.isUnlocked) {
          // Play a silent utterance to unlock iOS Safari Web Speech audio stream
          const dummyUtterance = new SpeechSynthesisUtterance('');
          dummyUtterance.volume = 0;
          this.synth.speak(dummyUtterance);
          this.isUnlocked = true;
        }
      } catch (e) {
        // Ignore unlock errors
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    try {
      const v = this.synth.getVoices();
      if (v && v.length > 0) {
        this.voices = v;
      }
    } catch (e) {}
  }

  public getAvailableVoices(): VoiceOption[] {
    if (!this.synth) return [];
    this.initVoice();
    const all = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    return all.map((v, i) => ({
      id: `${v.name}-${v.lang}-${i}`,
      name: v.name,
      lang: v.lang,
      isGoogle: v.name.toLowerCase().includes('google'),
      voice: v,
    }));
  }

  // Detect genuine Vietnamese voice from device
  public getSelectedVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    this.initVoice();
    const available = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    if (available.length === 0) return null;

    // Comprehensive list of Vietnamese voice indicators on iOS, Android, Windows, Mac
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
      const googleVi = viVoices.find((v) => v.name.toLowerCase().includes('google'));
      const deviceVi = viVoices.find((v) => !v.name.toLowerCase().includes('google'));

      if (this.useGoogleVoice && googleVi) {
        return googleVi;
      } else if (!this.useGoogleVoice && deviceVi) {
        return deviceVi;
      }
      return viVoices[this.voiceToggleCount % viVoices.length];
    }

    // Do NOT return non-Vietnamese voice when speaking Vietnamese, return null so system uses native default TTS lang pack
    return null;
  }

  public toggleVoiceType() {
    this.preferOnlineVietnamese = !this.preferOnlineVietnamese;
    this.voiceToggleCount++;
  }

  public speak(
    text: string | string[],
    effectType?: 'wind' | 'howl' | 'gavel' | 'rooster' | 'chime' | 'death' | 'victory',
    pauseBetweenMs: number = 2000,
    betweenPartsEffect?: 'teleport' | 'wind' | 'chime' | 'mystic',
    onPartChange?: (partIndex: number | null) => void,
    interrupt: boolean = false
  ) {
    if (!this.speechEnabled && !this.soundEffectsEnabled) return;

    if (interrupt) {
      this.stop();
    }

    // Avoid pushing duplicate items if identical to last queued item
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

  // Play Vietnamese audio through standard high-quality online stream
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
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;

      try {
        const audio = new Audio(url);
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          chunkIdx++;
          playNextChunk();
        };

        audio.onerror = () => {
          this.currentAudio = null;
          onError();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.currentAudio = null;
            onError();
          });
        }
      } catch (err) {
        this.currentAudio = null;
        onError();
      }
    };

    playNextChunk();
  }

  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;
    if (!this.speechEnabled && !this.soundEffectsEnabled) {
      this.queue = [];
      return;
    }

    // Try resuming if iOS Safari suspended synth
    if (this.synth && this.synth.paused) {
      try {
        this.synth.resume();
      } catch (e) {}
    }

    const item = this.queue.shift()!;
    this.isSpeaking = true;

    // 1. Play associated initial sound effect
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
          soundEffects.playVictoryChime();
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
      }, 400);
      this.sequenceTimeouts.push(timeout);
    };

    // 2. Speak Vietnamese via Audio Stream or Web Speech
    if (this.speechEnabled) {
      const parts = Array.isArray(item.text) ? item.text : [item.text];
      const chosenVoice = this.getSelectedVoice();
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
            }, 700);
          }, 950);
        }, 350);
      };

      const speakNextPart = () => {
        if (currentIndex >= parts.length || !this.speechEnabled) {
          finishCurrentItem();
          return;
        }

        const partText = parts[currentIndex].trim();
        if (!partText) {
          currentIndex++;
          speakNextPart();
          return;
        }

        item.onPartChange?.(currentIndex);

        // Fallback or Primary: If device has NO Vietnamese voice installed, use high-definition Online Vietnamese Audio
        const mustUseOnlineAudio = this.preferOnlineVietnamese || !chosenVoice;

        if (mustUseOnlineAudio) {
          this.playOnlineVietnameseTTS(
            partText,
            () => {
              currentIndex++;
              if (currentIndex < parts.length) {
                handlePartTransition();
              } else {
                finishCurrentItem();
              }
            },
            () => {
              // If online audio failed, try Web Speech fallback
              this.speakViaWebSpeech(partText, chosenVoice, () => {
                currentIndex++;
                if (currentIndex < parts.length) {
                  handlePartTransition();
                } else {
                  finishCurrentItem();
                }
              });
            }
          );
        } else {
          this.speakViaWebSpeech(partText, chosenVoice, () => {
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          });
        }
      };

      speakNextPart();
    } else {
      finishCurrentItem();
    }
  }

  // Web Speech synthesis implementation with memory leak protection
  private speakViaWebSpeech(partText: string, chosenVoice: SpeechSynthesisVoice | null, onComplete: () => void) {
    if (!this.synth) {
      onComplete();
      return;
    }

    try {
      const cleanText = cleanVietnameseTextForTTS(partText);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
      utterance.rate = 0.95;
      utterance.pitch = 0.95;

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

      // Watchdog timeout to prevent frozen state on mobile WebKit
      if (this.watchdogTimeout) clearTimeout(this.watchdogTimeout);
      const estDuration = Math.max(4000, cleanText.length * 150);
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
}

export const narrator = new NarratorEngine();


