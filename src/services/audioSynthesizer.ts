class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
    }
  }

  public unlock() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!this.isUnlocked && ctx) {
        // Play a very short, silent buffer to wake up iOS Safari / Mobile audio engine
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        this.isUnlocked = true;
      }
    } catch (e) {
      // Ignored
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Eerie night wind
  playNightWind() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(250, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 1.5);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 3);
      filter.Q.value = 5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (e) {
      // Audio fallback
    }
  }

  // Wolf howl
  playWolfHowl() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.8);
      osc.frequency.exponentialRampToValueAtTime(400, now + 2.2);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
      gain.gain.linearRampToValueAtTime(0, now + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.5);
    } catch (e) {}
  }

  // Wooden clock tick
  playClockTick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Gavel strike (voting / execution)
  playGavelStrike() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  // Morning rooster
  playRooster() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(750, now + 0.2);
      osc.frequency.linearRampToValueAtTime(850, now + 0.6);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch (e) {}
  }

  // Bell chime
  playChimeBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = f;

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.3);
      });
    } catch (e) {}
  }

  // Tolling death bell
  playDeathBell() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now); // Low A2

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.6);
    } catch (e) {}
  }

  // Card swish / flip sound
  playCardFlip() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Mystic magic reveal sound
  playMysticSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [300, 450, 600, 900];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = f;

        const startTime = now + i * 0.06;
        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch (e) {}
  }

  // Teleport / Portkey departure sound effect (Ascending sweep)
  playTeleportDepart() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Ascending sweep oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(1440, now + 0.8);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.95);

      // 2. Sparkling magic chimes ascending
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
      freqs.forEach((f, i) => {
        const hOsc = ctx.createOscillator();
        const hGain = ctx.createGain();

        hOsc.type = 'triangle';
        hOsc.frequency.value = f;

        const startTime = now + 0.1 + i * 0.1;
        hGain.gain.setValueAtTime(0.08, startTime);
        hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

        hOsc.connect(hGain);
        hGain.connect(ctx.destination);

        hOsc.start(startTime);
        hOsc.stop(startTime + 0.55);
      });
    } catch (e) {}
  }

  // Teleport / Portkey arrival sound effect (Descending landing sweep)
  playTeleportArrive() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Descending arrival sweep oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.75);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.9);

      // 2. Warm landing resonance chimes
      const freqs = [1046.5, 783.99, 659.25, 523.25, 392.0]; // C6, G5, E5, C5, G4
      freqs.forEach((f, i) => {
        const hOsc = ctx.createOscillator();
        const hGain = ctx.createGain();

        hOsc.type = 'triangle';
        hOsc.frequency.value = f;

        const startTime = now + 0.1 + i * 0.1;
        hGain.gain.setValueAtTime(0.07, startTime);
        hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

        hOsc.connect(hGain);
        hGain.connect(ctx.destination);

        hOsc.start(startTime);
        hOsc.stop(startTime + 0.65);
      });
    } catch (e) {}
  }

  // Combined full teleport transition sound (Departure + Arrival)
  playTeleportSound() {
    this.playTeleportDepart();
    setTimeout(() => {
      this.playTeleportArrive();
    }, 750);
  }

  // Alias for wolf howl
  playHowl() {
    this.playWolfHowl();
  }

  // Fanfare victory (backward compatible alias)
  playVictoryChime() {
    this.playVictoryFanfare();
  }

  // Majestic & Celebratory Victory Fanfare (Trumpets herald + Timpani punch + Shimmering Fireworks/Chimes)
  playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Deep Timpani / Victory Bass Impact
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(120, now);
      bassOsc.frequency.exponentialRampToValueAtTime(35, now + 0.6);
      bassGain.gain.setValueAtTime(0.35, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.85);

      // 2. Triumphant Brass Fanfare Sequence (Herald: C4 -> E4 -> G4 -> C5, then triplet G4 G4 G4 -> High C5 + E5 + G5 sustain)
      const fanfareMotif = [
        { freq: 392.0, start: 0.0, dur: 0.16, vol: 0.18 }, // G4
        { freq: 523.25, start: 0.18, dur: 0.16, vol: 0.2 }, // C5
        { freq: 659.25, start: 0.36, dur: 0.16, vol: 0.22 }, // E5
        { freq: 783.99, start: 0.54, dur: 0.38, vol: 0.26 }, // G5 (held)

        // Triplet fanfare strike
        { freq: 783.99, start: 0.96, dur: 0.1, vol: 0.22 }, // G5
        { freq: 783.99, start: 1.08, dur: 0.1, vol: 0.22 }, // G5
        { freq: 783.99, start: 1.2, dur: 0.1, vol: 0.24 }, // G5

        // Grand Triumphant Chord Hold (C5 + E5 + G5 + C6)
        { freq: 523.25, start: 1.34, dur: 1.8, vol: 0.2 }, // C5
        { freq: 659.25, start: 1.34, dur: 1.8, vol: 0.2 }, // E5
        { freq: 783.99, start: 1.34, dur: 1.8, vol: 0.24 }, // G5
        { freq: 1046.5, start: 1.34, dur: 2.0, vol: 0.26 }, // C6
      ];

      fanfareMotif.forEach(({ freq, start, dur, vol }) => {
        const startTime = now + start;

        // Rich brass combo: Sawtooth with low-pass filter + slight triangle body
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, startTime);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.002, startTime); // Slight chorus detune

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3.5, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.03); // Quick crisp brass attack
        gain.gain.setValueAtTime(vol * 0.85, startTime + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + dur + 0.05);
        osc2.stop(startTime + dur + 0.05);
      });

      // 3. Sparkling Celebration Magic Bells / Fireworks Chimes (Cascade around 1.34s)
      const sparkleFreqs = [1046.5, 1318.5, 1567.98, 1760.0, 2093.0, 2637.0]; // C6, E6, G6, A6, C7, E7
      sparkleFreqs.forEach((freq, idx) => {
        const sparkleTime = now + 1.4 + idx * 0.08;
        const sOsc = ctx.createOscillator();
        const sGain = ctx.createGain();

        sOsc.type = 'sine';
        sOsc.frequency.setValueAtTime(freq, sparkleTime);

        sGain.gain.setValueAtTime(0.09, sparkleTime);
        sGain.gain.exponentialRampToValueAtTime(0.0001, sparkleTime + 0.6);

        sOsc.connect(sGain);
        sGain.connect(ctx.destination);

        sOsc.start(sparkleTime);
        sOsc.stop(sparkleTime + 0.65);
      });
    } catch (e) {
      // Audio fallback
    }
  }
}

export const soundEffects = new SoundSynthesizer();
