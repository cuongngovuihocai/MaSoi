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
function cleanVietnameseTextForTTS(text: string): string {
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

// Split long sentences into digestible pieces so mobile browsers never drop audio
function splitTextIntoSentences(text: string): string[] {
  const cleaned = cleanVietnameseTextForTTS(text);
  if (!cleaned) return [];

  const rawSentences = cleaned.split(/(?<=[.!?:;\n])\s+/);
  const result: string[] = [];

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 150) {
      result.push(trimmed);
    } else {
      // Split by commas
      const commaParts = trimmed.split(/(?<=[,])\s+/);
      let current = '';
      for (const p of commaParts) {
        if (!current) {
          current = p;
        } else if ((current + ', ' + p).length <= 150) {
          current += ', ' + p;
        } else {
          result.push(current.trim());
          current = p;
        }
      }
      if (current.trim()) result.push(current.trim());
    }
  }

  return result.length > 0 ? result : [cleaned];
}

class NarratorEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private sequenceTimeouts: ReturnType<typeof setTimeout>[] = [];
  private watchdogTimeout: ReturnType<typeof setTimeout> | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private queue: QueueItem[] = [];
  private isSpeaking = false;
  private isUnlocked = false;
  // Strong reference set to prevent garbage collection on mobile Safari/WebKit
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  public speechEnabled = true;
  public soundEffectsEnabled = true;
  public voiceToggleCount = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();

      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }

      // Auto-unlock on first mobile interaction (touch/click/pointer)
      const handleUserGesture = () => {
        this.unlock();
      };
      window.addEventListener('touchstart', handleUserGesture, { passive: true, once: false });
      window.addEventListener('touchend', handleUserGesture, { passive: true, once: false });
      window.addEventListener('pointerdown', handleUserGesture, { passive: true, once: false });
      window.addEventListener('click', handleUserGesture, { passive: true, once: false });
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
    if (this.synth) {
      try {
        this.loadVoices();
        if (this.synth.paused) {
          this.synth.resume();
        }
        if (!this.isUnlocked) {
          // Play an ultra-short blank utterance to awaken iOS Safari audio session
          const dummy = new SpeechSynthesisUtterance(' ');
          dummy.lang = 'vi-VN';
          dummy.volume = 0.01;
          dummy.rate = 2.0;
          this.synth.speak(dummy);
          this.isUnlocked = true;
        }
      } catch (e) {
        // Ignore unlock errors
      }
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

  // Find genuine Vietnamese voice installed on device (iOS Siri Linh/An, Android Google Tiếng Việt, Windows Mai/Nam)
  public getSelectedVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    this.loadVoices();
    const available = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    if (available.length === 0) return null;

    // Filter by Vietnamese language codes and Vietnamese voice names
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
      // Prioritize natural Vietnamese voices
      const naturalVi = viVoices.find((v) => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('linh') || v.name.toLowerCase().includes('google'));
      if (naturalVi) return naturalVi;
      return viVoices[0];
    }

    return null;
  }

  public speak(
    text: string | string[],
    effectType?: 'wind' | 'howl' | 'gavel' | 'rooster' | 'chime' | 'death' | 'victory',
    pauseBetweenMs: number = 1800,
    betweenPartsEffect?: 'teleport' | 'wind' | 'chime' | 'mystic',
    onPartChange?: (partIndex: number | null) => void,
    interrupt: boolean = false
  ) {
    if (!this.speechEnabled && !this.soundEffectsEnabled) return;

    if (interrupt) {
      this.stop();
    }

    // Deduplicate consecutive identical items
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

  private startKeepAlive() {
    this.stopKeepAlive();
    if (!this.synth) return;
    // iOS Safari bugfix: Resume speech synthesis periodically so it does not freeze
    this.keepAliveInterval = setInterval(() => {
      if (this.synth && this.isSpeaking) {
        if (this.synth.paused) {
          try {
            this.synth.resume();
          } catch (e) {}
        }
      }
    }, 2500);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;
    if (!this.speechEnabled && !this.soundEffectsEnabled) {
      this.queue = [];
      return;
    }

    if (this.synth && this.synth.paused) {
      try {
        this.synth.resume();
      } catch (e) {}
    }

    const item = this.queue.shift()!;
    this.isSpeaking = true;
    this.startKeepAlive();

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
      this.stopKeepAlive();
      if (this.watchdogTimeout) {
        clearTimeout(this.watchdogTimeout);
        this.watchdogTimeout = null;
      }
      item.onPartChange?.(null);
      this.isSpeaking = false;
      const timeout = setTimeout(() => {
        this.processQueue();
      }, 300);
      this.sequenceTimeouts.push(timeout);
    };

    // 2. Speak Vietnamese via Native Web Speech API
    if (this.speechEnabled && this.synth) {
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
            }, 600);
          }, 850);
        }, 300);
      };

      const speakNextPart = () => {
        if (currentIndex >= parts.length || !this.speechEnabled || !this.synth) {
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

        const subSentences = splitTextIntoSentences(rawPartText);
        let subIndex = 0;

        const speakNextSubSentence = () => {
          if (subIndex >= subSentences.length || !this.speechEnabled || !this.synth) {
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
            return;
          }

          const sentenceText = subSentences[subIndex].trim();
          if (!sentenceText) {
            subIndex++;
            speakNextSubSentence();
            return;
          }

          try {
            const utterance = new SpeechSynthesisUtterance(sentenceText);
            utterance.lang = 'vi-VN';
            if (chosenVoice) {
              utterance.voice = chosenVoice;
            }
            utterance.rate = 1.0;
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
              subIndex++;
              speakNextSubSentence();
            };

            utterance.onerror = (err) => {
              cleanup();
              subIndex++;
              speakNextSubSentence();
            };

            // Watchdog in case mobile browser hangs on speech
            if (this.watchdogTimeout) clearTimeout(this.watchdogTimeout);
            const estDuration = Math.max(3500, sentenceText.length * 160);
            this.watchdogTimeout = setTimeout(() => {
              cleanup();
              subIndex++;
              speakNextSubSentence();
            }, estDuration);

            if (this.synth.paused) {
              this.synth.resume();
            }
            this.synth.speak(utterance);
          } catch (err) {
            subIndex++;
            speakNextSubSentence();
          }
        };

        speakNextSubSentence();
      };

      speakNextPart();
    } else {
      finishCurrentItem();
    }
  }

  public stop() {
    this.stopKeepAlive();
    this.queue = [];
    this.isSpeaking = false;
    if (this.watchdogTimeout) {
      clearTimeout(this.watchdogTimeout);
      this.watchdogTimeout = null;
    }
    this.sequenceTimeouts.forEach((t) => clearTimeout(t));
    this.sequenceTimeouts = [];
    this.activeUtterances.clear();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }
}

export const narrator = new NarratorEngine();



