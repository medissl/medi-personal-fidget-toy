/* All touch sounds are synthesized locally. No audio service or network calls. */
(() => {
  'use strict';
  class Soundscape {
    constructor(settings, notify) {
      this.settings = settings;
      this.notify = notify;
      this.music = document.getElementById('bgm');
      this.context = null;
      this.gain = null;
      this.voices = new Set();
      this.active = false;
      this.lastNote = 0;
      this.lastPulse = 0;
      this.musicFailed = false;
      this.music.addEventListener('error', () => {
        if (this.settings.music && !this.musicFailed) {
          this.musicFailed = true;
          this.notify('The music could not load. Touch sounds still work.');
        }
      });
    }
    unlock() {
      if (!this.context && this.settings.sounds) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.context = new AudioContext();
          this.gain = this.context.createGain();
          this.gain.connect(this.context.destination);
        }
      }
      if (this.context?.state === 'suspended' && this.active) this.context.resume().catch(() => {});
      this.sync();
    }
    sync() {
      if (this.gain) {
        this.gain.gain.value =
          this.active && this.settings.sounds ? (this.settings.volume / 100) * 0.24 : 0;
      }
      if (!this.active || !this.settings.sounds) {
        for (const voice of this.voices) voice.stop();
        this.voices.clear();
      }
      this.music.volume = (this.settings.volume / 100) * 0.4;
      if (this.active && this.settings.music) {
        if (this.music.paused) this.music.play().catch(() => {});
      } else this.music.pause();
    }
    setActive(active) {
      this.active = active;
      this.sync();
      if (this.context) {
        if (active) this.context.resume().catch(() => {});
        else this.context.suspend().catch(() => {});
      }
    }
    tone(frequency, duration = 0.25, shape = 'sine', strength = 0.5, endFrequency = frequency) {
      if (!this.active || !this.settings.sounds || !this.context || !this.gain) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, strength), now + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope);
      envelope.connect(this.gain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        envelope.disconnect();
      };
    }
    note(x, width) {
      if (performance.now() - this.lastNote < 180) return;
      this.lastNote = performance.now();
      const notes = [196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25];
      this.tone(notes[Math.min(7, Math.floor(Math.max(0, x / width) * 8))], 0.8, 'sine', 0.19);
    }
    pop(pressed) {
      this.tone(pressed ? 460 : 330, 0.09, 'sine', 0.65, pressed ? 110 : 150);
      this.pulse(2);
    }
    click() {
      this.tone(740, 0.027, 'triangle', 0.17, 180);
      this.pulse(1);
    }
    water() {
      if (performance.now() - this.lastNote < 160) return;
      this.lastNote = performance.now();
      this.tone(440 + Math.random() * 220, 0.18, 'sine', 0.15, 160);
    }
    pulse(kind = 1) {
      if (!this.active || !this.settings.haptics || performance.now() - this.lastPulse < 45) return;
      this.lastPulse = performance.now();
      if (window.StillNative?.pulse) window.StillNative.pulse(kind, this.settings.hapticStrength);
      else if (navigator.vibrate) navigator.vibrate(this.settings.hapticStrength * 5 + kind * 2);
    }
  }
  window.Soundscape = Soundscape;
})();
