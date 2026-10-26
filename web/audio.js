(() => {
  'use strict';
  const files = {
    water: 'water.wav',
    water2: 'water2.wav',
    pop: 'pop.wav',
    pop2: 'pop2.wav',
    slime: 'slime.wav',
    slime2: 'slime2.wav',
    click: 'click.wav',
    switch: 'switch.wav',
    toggle: 'toggle.wav',
    metal: 'metal.wav',
    zipper: 'zipper.wav',
    carve: 'carve.wav',
    sand: 'sand.wav',
    dial: 'dial.wav',
    chop: 'chop.wav',
    glass: 'glass.wav',
    clink: 'clink.wav',
    wrap: 'wrap.wav',
    space: 'space.wav',
  };
  const tracks = {
    floating: 'floating-cities.mp3',
    carefree: 'carefree.mp3',
    dream: 'dream-culture.mp3',
  };
  class Soundscape {
    constructor(settings, notify) {
      Object.assign(this, { settings, notify });
      this.music = document.getElementById('bgm');
      this.native =
        typeof window.StillNative?.configureAudio === 'function' ? window.StillNative : null;
      this.context = null;
      this.active = false;
      this.buffers = new Map();
      this.pending = new Map();
      this.voices = new Set();
      this.times = new Map();
      this.lastPulse = 0;
      this.epoch = 0;
      this.music.addEventListener('error', () => this.notify('Music could not load.'));
    }
    unlock() {
      if (this.native) {
        this.sync();
        return;
      }
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.sfxGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.limiter = this.context.createDynamicsCompressor();
        Object.assign(this.limiter.threshold, { value: -4 });
        this.limiter.knee.value = 8;
        this.limiter.ratio.value = 12;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.1;
        this.sfxGain.connect(this.limiter);
        this.musicGain.connect(this.limiter);
        this.limiter.connect(this.context.destination);
        this.musicSource = this.context.createMediaElementSource(this.music);
        this.musicSource.connect(this.musicGain);
        for (const name of Object.keys(files)) this.load(name);
      }
      if (this.active && this.context.state === 'suspended') this.context.resume().catch(() => {});
      this.sync();
    }
    load(name) {
      if (this.pending.has(name)) return this.pending.get(name);
      const promise = fetch('audio/' + files[name])
        .then((r) => {
          if (!r.ok) throw Error(name);
          return r.arrayBuffer();
        })
        .then((b) => this.context.decodeAudioData(b))
        .then((buffer) => {
          this.buffers.set(name, buffer);
          return buffer;
        })
        .catch(() => {
          this.notify('A sound could not load.');
          return null;
        });
      this.pending.set(name, promise);
      return promise;
    }
    sync() {
      if (this.native) {
        const s = this.settings;
        this.native.configureAudio(
          this.active,
          s.sounds,
          s.music,
          s.volume / 100,
          s.sfxVolume / 100,
          s.musicVolume / 100,
          s.track
        );
        return;
      }
      const s = this.settings,
        enabled = this.active,
        volume = s.volume / 100;
      if (this.context) {
        this.sfxGain.gain.value = enabled && s.sounds ? (volume * s.sfxVolume) / 100 : 0;
        this.musicGain.gain.value = enabled && s.music ? (volume * s.musicVolume) / 100 : 0;
      }
      if (!enabled || !s.sounds) this.silence();
      const track = tracks[s.track] || tracks.floating;
      if (this.track !== track) {
        this.track = track;
        this.music.src = 'audio/' + track;
      }
      this.music.volume = 1;
      if (enabled && s.music && this.context) {
        if (this.music.paused) this.music.play().catch(() => {});
      } else this.music.pause();
    }
    silence() {
      this.epoch++;
      this.stopTexture();
      for (const voice of this.voices) {
        voice.source.stop();
        voice.source.disconnect();
        voice.gain.disconnect();
      }
      this.voices.clear();
    }
    setActive(active) {
      this.active = active;
      this.sync();
      if (this.context) {
        if (active) this.context.resume().catch(() => {});
        else this.context.suspend().catch(() => {});
      }
    }
    sample(name, { volume = 1, rate = 1, duration = 0.5, interval = 60, group = name } = {}) {
      if (!this.active || !this.settings.sounds || (!this.context && !this.native)) return;
      const stamp = performance.now(),
        epoch = this.epoch;
      if (stamp - (this.times.get(group) || -1000) < interval) return;
      this.times.set(group, stamp);
      if (this.native) {
        this.native.playSound(name, volume, rate);
        return;
      }
      const play = (buffer) => {
        if (
          !buffer ||
          epoch !== this.epoch ||
          !this.active ||
          !this.settings.sounds ||
          performance.now() - stamp > 180
        )
          return;
        if (this.voices.size >= 8) {
          const oldest = this.voices.values().next().value;
          oldest.source.stop();
          this.voices.delete(oldest);
        }
        const c = this.context,
          source = c.createBufferSource(),
          gain = c.createGain(),
          now = c.currentTime,
          len = Math.max(0.018, Math.min(duration, buffer.duration / rate));
        source.buffer = buffer;
        source.playbackRate.value = rate;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.004);
        gain.gain.setValueAtTime(volume, now + Math.max(0.005, len - 0.02));
        gain.gain.linearRampToValueAtTime(0.0001, now + len);
        source.connect(gain);
        gain.connect(this.sfxGain);
        const voice = { source, gain };
        this.voices.add(voice);
        source.onended = () => {
          this.voices.delete(voice);
          source.disconnect();
          gain.disconnect();
        };
        source.start(now);
        source.stop(now + len);
      };
      if (this.buffers.has(name)) play(this.buffers.get(name));
      else this.load(name).then(play);
    }
    pop(pressed) {
      this.sample(pressed ? 'pop' : 'pop2', {
        duration: 0.3,
        interval: 65,
        group: 'pop',
        rate: 0.98 + Math.random() * 0.04,
      });
      this.pulse(2);
    }
    click() {
      this.sample('click', { duration: 0.045, interval: 60, group: 'click' });
      this.pulse(1);
    }
    dial() {
      this.sample('dial', { duration: 0.11, interval: 52, volume: 0.9, group: 'dial' });
      this.pulse(1);
    }
    water() {
      this.sample(Math.random() < 0.5 ? 'water' : 'water2', {
        duration: 0.42,
        volume: 0.9,
        interval: 180,
        group: 'water',
      });
    }
    slime() {
      this.sample(Math.random() < 0.5 ? 'slime' : 'slime2', {
        duration: 0.8,
        interval: 420,
        group: 'slime',
        volume: 1,
      });
    }
    switch(on) {
      this.sample('switch', { duration: 0.18, interval: 45, group: 'switch' });
      this.pulse(2);
    }
    clack() {
      this.sample('metal', { duration: 0.15, interval: 160, group: 'clack', volume: 0.75 });
      this.pulse(1);
    }
    carve() {
      this.texture('carve');
    }
    sand() {
      this.texture('sand');
    }
    texture(name, rate = 1) {
      if (!this.active || !this.settings.sounds || (!this.context && !this.native)) return;
      if (this.native?.setTexture) {
        this.native.setTexture(name, 1, rate);
        return;
      }
      if (this.native) {
        this.sample(name, { duration: 2, interval: 1800 });
        return;
      }
      clearTimeout(this.textureTimer);
      this.textureTimer = setTimeout(() => this.stopTexture(), 140);
      if (this.textureVoice?.name === name) {
        this.textureVoice.source.playbackRate.value = rate;
        return;
      }
      this.stopTextureVoice();
      const buffer = this.buffers.get(name);
      if (!buffer) {
        this.load(name);
        return;
      }
      const source = this.context.createBufferSource(),
        gain = this.context.createGain(),
        now = this.context.currentTime;
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value = rate;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + 0.025);
      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
      this.textureVoice = { name, source, gain };
    }
    stopTextureVoice() {
      const voice = this.textureVoice;
      if (!voice) return;
      this.textureVoice = null;
      const now = this.context.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.012);
      voice.source.stop(now + 0.06);
      voice.source.onended = () => {
        voice.source.disconnect();
        voice.gain.disconnect();
      };
    }
    stopTexture() {
      clearTimeout(this.textureTimer);
      this.native?.stopTexture?.();
      this.stopTextureVoice();
    }
    metal(strength = 0.5) {
      this.sample('clink', {
        duration: 0.38,
        interval: 65,
        volume: 0.25 + strength * 0.75,
        rate: 0.97 + Math.random() * 0.06,
        group: 'metal',
      });
    }
    glass() {
      this.sample('glass', {
        duration: 1.5,
        interval: 220,
        volume: 1,
        rate: 0.9 + Math.random() * 0.16,
        group: 'glass',
      });
    }
    zip() {
      this.texture('zipper');
    }
    packaging() {
      this.sample('wrap', {
        duration: 0.3,
        interval: 55,
        volume: 1,
        rate: 0.95 + Math.random() * 0.1,
        group: 'wrap',
      });
      this.pulse(1);
    }
    woodBreak() {
      this.sample('chop', { duration: 0.18, interval: 180, volume: 0.9, group: 'wood-break' });
      this.pulse(2);
    }
    space(count = 1) {
      this.sample('space', {
        duration: 1.1,
        interval: 240,
        volume: 0.55,
        rate: [0.5, 0.667, 0.75, 1, 1.25][(count - 1) % 5],
        group: 'space',
      });
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
