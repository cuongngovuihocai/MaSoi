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

class NarratorEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private sequenceTimeouts: ReturnType<typeof setTimeout>[] = [];
  private watchdogTimeout: ReturnType<typeof setTimeout> | null = null;
  private queue: QueueItem[] = [];
  private isSpeaking = false;
  private isUnlocked = false;
  // Crucial for iOS Safari & Android Chrome: Prevent GC from killing active utterance mid-speech
  private activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  public speechEnabled = true;
  public soundEffectsEnabled = true;
  public useGoogleVoice = false; // Default to standard device/system voice
  public voiceToggleCount = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
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
    if (!this.synth) return;
    try {
      this.initVoice();
      if (this.synth.paused) {
        this.synth.resume();
      }
      if (!this.isUnlocked) {
        // Play a silent, empty utterance to unlock iOS Safari Web Speech audio stream
        const dummyUtterance = new SpeechSynthesisUtterance('');
        dummyUtterance.volume = 0;
        this.synth.speak(dummyUtterance);
        this.isUnlocked = true;
      }
    } catch (e) {
      // Ignore unlock errors
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

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    this.initVoice();
    const available = this.voices.length > 0 ? this.voices : this.synth.getVoices();
    if (available.length === 0) return null;

    // Filter Vietnamese voices first (iOS names: Linh, An, etc.; Android names: Google Tiếng Việt, vi-vn, etc.)
    const viVoices = available.filter((v) => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      const n = (v.name || '').toLowerCase();
      return (
        l.startsWith('vi') ||
        l.includes('vi-vn') ||
        n.includes('vietnam') ||
        n.includes('tiếng việt') ||
        n.includes('linh') ||
        n.includes('an') ||
        n.includes('vi-vn')
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
    this.useGoogleVoice = !this.useGoogleVoice;
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

    // 2. Speak via Web Speech TTS if enabled
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
            }, 700);
          }, 950);
        }, 350);
      };

      const speakNextPart = () => {
        if (currentIndex >= parts.length || !this.synth || !this.speechEnabled) {
          finishCurrentItem();
          return;
        }

        const partText = parts[currentIndex].trim();
        if (!partText) {
          currentIndex++;
          speakNextPart();
          return;
        }

        try {
          item.onPartChange?.(currentIndex);

          const utterance = new SpeechSynthesisUtterance(partText);
          utterance.lang = 'vi-VN';
          if (chosenVoice) {
            utterance.voice = chosenVoice;
          }
          utterance.rate = 0.95; // Dramatic pace
          utterance.pitch = 0.95; // Mysterious tone

          // Retain reference in Set to prevent GC in iOS WebKit / Chrome
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
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          };

          utterance.onerror = (e) => {
            cleanup();
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          };

          // Watchdog: In case mobile browser stalls or onend never fires
          if (this.watchdogTimeout) clearTimeout(this.watchdogTimeout);
          const estDuration = Math.max(4000, partText.length * 150);
          this.watchdogTimeout = setTimeout(() => {
            cleanup();
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          }, estDuration);

          if (this.synth.paused) {
            this.synth.resume();
          }
          this.synth.speak(utterance);
        } catch (e) {
          finishCurrentItem();
        }
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
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }
}

export const narrator = new NarratorEngine();

