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
  private queue: QueueItem[] = [];
  private isSpeaking = false;
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
    }
  }

  private initVoice() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getAvailableVoices(): VoiceOption[] {
    if (!this.synth) return [];
    const all = this.synth.getVoices();
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
    const available = this.synth.getVoices();
    if (available.length === 0) return null;

    // Filter Vietnamese voices first
    const viVoices = available.filter(
      (v) => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('vietnamese')
    );

    if (viVoices.length > 0) {
      // Alternating between Google voice and device voice if requested
      const googleVi = viVoices.find((v) => v.name.toLowerCase().includes('google'));
      const deviceVi = viVoices.find((v) => !v.name.toLowerCase().includes('google'));

      if (this.useGoogleVoice && googleVi) {
        return googleVi;
      } else if (!this.useGoogleVoice && deviceVi) {
        return deviceVi;
      }
      return viVoices[this.voiceToggleCount % viVoices.length];
    }

    // Fallback to any Google Voice or standard voice
    const googleVoice = available.find((v) => v.name.toLowerCase().includes('google'));
    if (googleVoice && this.useGoogleVoice) {
      return googleVoice;
    }

    return available[0] || null;
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

    // Avoid pushing duplicate items if identical to last queued item or currently playing item
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

          utterance.onend = () => {
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          };

          utterance.onerror = () => {
            currentIndex++;
            if (currentIndex < parts.length) {
              handlePartTransition();
            } else {
              finishCurrentItem();
            }
          };

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
    this.sequenceTimeouts.forEach((t) => clearTimeout(t));
    this.sequenceTimeouts = [];
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const narrator = new NarratorEngine();

