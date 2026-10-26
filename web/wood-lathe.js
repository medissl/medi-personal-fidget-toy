(() => {
  'use strict';
  const TAU = Math.PI * 2;
  class WoodLathe {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.tip = 'round';
      this.designs = this.makeDesigns();
      this.designIndex = -1;
      this.time = 0;
      this.score = 0;
      this.scoreFlash = 0;
      this.nextDesign();
    }
    makeDesigns() {
      return [0, 1, 2]
        .sort(() => Math.random() - 0.5)
        .map((kind) => ({
          kind,
          neck: 0.33 + Math.random() * 0.12,
          bulge: 0.78 + Math.random() * 0.12,
          shift: 0.45 + Math.random() * 0.1,
        }));
    }
    geometry() {
      return {
        left: this.w * 0.13,
        right: this.w * 0.87,
        cy: this.h * 0.46,
        r: Math.min(this.h * 0.105, this.w * 0.2),
        length: this.w * 0.74,
      };
    }
    nextDesign() {
      this.sound.stopTexture?.();
      this.lastCutTime = -Infinity;
      this.designIndex = (this.designIndex + 1) % 3;
      this.goal = Float32Array.from({ length: 100 }, (_, i) => {
        const t = i / 99,
          s = this.designs[this.designIndex];
        return s.kind === 0
          ? s.neck + (s.bulge - s.neck) * Math.exp(-(((t - s.shift) / 0.24) ** 2))
          : s.kind === 1
            ? 0.27 + 0.57 * Math.sin(Math.PI * t) ** 2
            : 0.38 + 0.28 * Math.sin(Math.PI * t * 3) ** 2;
      });
      this.shape = new Float32Array(100).fill(1);
      this.chips = [];
      this.pieces = [];
      this.start = 0;
      this.end = 99;
      this.pointer = null;
      this.done = false;
      this.spawn = 0;
    }
    reset() {
      this.nextDesign();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.pointer = null;
    }
    update(dt) {
      this.time += dt * (this.settings.gentle ? 0.5 : 1);
      this.spawn = Math.min(1, this.spawn + dt / 0.42);
      this.scoreFlash = Math.max(0, this.scoreFlash - dt);
      for (const p of [...this.chips, ...this.pieces]) {
        p.vy += 550 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += p.spin * dt;
        p.life -= dt;
      }
      this.chips = this.chips.filter((p) => p.life > 0 && p.y < this.h + 60);
      this.pieces = this.pieces.filter((p) => p.life > 0 && p.y < this.h + 180);
      if (this.pointer && this.spawn === 1) this.carve(this.toolPoint(this.pointer), dt);
      const error = this.shape.reduce((sum, v, i) => sum + Math.abs(v - this.goal[i]), 0);
      this.accuracy = Math.max(0, 1 - error / this.goal.reduce((sum, v) => sum + v, 0));
      if (this.accuracy >= 0.85) {
        this.score++;
        this.scoreFlash = 1.5;
        this.sound.pulse(2);
        this.nextDesign();
      } else if (this.shape.reduce((sum, v) => sum + v * v, 0) < 0.4) this.nextDesign();
    }
    toolPoint(p) {
      return { ...p, y: p.y - Math.min(96, this.h * 0.13) };
    }
    sever(index) {
      if (index <= this.start + 1 || index >= this.end - 1) return;
      let left = 0,
        right = 0;
      for (let i = this.start; i < index; i++) left += this.shape[i] ** 2;
      for (let i = index + 1; i <= this.end; i++) right += this.shape[i] ** 2;
      const a = left < right ? this.start : index + 1,
        b = left < right ? index - 1 : this.end,
        g = this.geometry();
      if (b < a) return;
      this.pieces.push({
        shape: Float32Array.from(this.shape),
        start: a,
        end: b,
        x: g.left + ((a + b) / 198) * g.length,
        y: g.cy,
        vx: left < right ? -25 : 25,
        vy: 25,
        a: 0,
        spin: left < right ? -1.4 : 1.4,
        life: 3,
      });
      for (let i = a; i <= b; i++) this.shape[i] = 0;
      this.sound.woodBreak?.();
      if (left < right) this.start = index + 1;
      else this.end = index - 1;
    }
    carve(p, dt) {
      const { left, cy, r, length } = this.geometry(),
        size = Math.max(12, this.w * 0.044),
        distance = Math.abs(p.y - cy);
      if (
        p.x < left + (this.start / 99) * length - size ||
        p.x > left + (this.end / 99) * length + size ||
        distance > r + size
      )
        return;
      let removed = 0,
        cut = -1;
      for (let i = this.start; i <= this.end; i++) {
        const x = left + (i / 99) * length,
          dx = Math.abs(x - p.x);
        if (dx > size) continue;
        const bite =
            this.tip === 'square'
              ? size
              : this.tip === 'triangle'
                ? size - dx
                : Math.sqrt(Math.max(0, size * size - dx * dx)),
          desired = Math.max(0, (distance - bite) / r),
          old = this.shape[i];
        this.shape[i] = Math.min(old, Math.max(desired, old - Math.max(0.012, dt * 2)));
        const amount = old - this.shape[i];
        if (amount > 0.001) {
          removed += amount;
          if (this.chips.length < 180 && Math.random() < 0.5)
            this.chips.push({
              x,
              y: cy + (p.y >= cy ? 1 : -1) * old * r,
              vx: (Math.random() - 0.5) * 170,
              vy: 35 + Math.random() * 90,
              a: Math.random() * TAU,
              spin: (Math.random() - 0.5) * 12,
              size: 3 + Math.random() * 5,
              life: 2,
            });
        }
        if (this.shape[i] < 0.008 && i > this.start + 1 && i < this.end - 1) cut = i;
      }
      if (removed) {
        this.sound.carve(this.time - this.lastCutTime > 0.18);
        this.lastCutTime = this.time;
        this.sound.pulse(1);
      }
      if (cut >= 0) this.sever(cut);
      this.done = this.shape
        .slice(this.start, this.end + 1)
        .every((v, j) => Math.abs(v - this.goal[this.start + j]) < 0.055);
    }
    profile(shape, start, end) {
      const c = this.ctx,
        { left, cy, r, length } = this.geometry();
      c.beginPath();
      c.moveTo(left + (start / 99) * length, cy - shape[start] * r);
      for (let i = start + 1; i <= end; i++) c.lineTo(left + (i / 99) * length, cy - shape[i] * r);
      for (let i = end; i >= start; i--) c.lineTo(left + (i / 99) * length, cy + shape[i] * r);
      c.closePath();
    }
    log(shape, start, end) {
      const c = this.ctx,
        { left, cy, r, length } = this.geometry(),
        g = c.createLinearGradient(0, cy - r, 0, cy + r);
      g.addColorStop(0, '#7e4824');
      g.addColorStop(0.2, '#e9bf7d');
      g.addColorStop(0.45, '#ffdfa3');
      g.addColorStop(0.7, '#bc7d3f');
      g.addColorStop(1, '#60361e');
      this.profile(shape, start, end);
      c.fillStyle = g;
      c.fill();
      c.save();
      c.clip();
      for (let i = start; i <= end; i++)
        if (shape[i] > 0.87) {
          const x = left + (i / 99) * length;
          c.fillStyle = i % 3 ? '#62422e' : '#79563a';
          c.fillRect(x - 1, cy - r, length / 99 + 2, 2 * r);
        }
      for (let line = 0; line < 26; line++) {
        const phase = (line / 26) * TAU + this.time * 3.3;
        c.strokeStyle = line % 3 ? '#3320166b' : '#ffe7ae5c';
        c.lineWidth = line % 3 ? 1.7 : 0.8;
        c.beginPath();
        for (let i = start; i <= end; i++) {
          const x = left + (i / 99) * length,
            y = cy + Math.sin(phase + Math.sin(i * 0.53) * 0.035) * shape[i] * r;
          if (i === start) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
      c.restore();
    }
    chuck(x, direction) {
      const c = this.ctx,
        { cy, r } = this.geometry(),
        g = c.createLinearGradient(x - 24, 0, x + 24, 0);
      g.addColorStop(0, '#24282a');
      g.addColorStop(0.25, '#bfc6c5');
      g.addColorStop(0.48, '#f4f2e7');
      g.addColorStop(0.7, '#555d60');
      g.addColorStop(1, '#161c20');
      c.fillStyle = '#455250';
      c.beginPath();
      c.roundRect(x - 22, cy - r * 0.72, 44, r * 2.05, 7);
      c.fill();
      c.fillStyle = g;
      c.fillRect(x - 21, cy - r * 0.7, 42, r * 1.4);
      c.fillStyle = '#42494a';
      c.beginPath();
      c.ellipse(x + direction * 16, cy, 12, r * 0.74, 0, 0, TAU);
      c.fill();
      c.strokeStyle = '#d7d9cf';
      c.lineWidth = 3;
      c.stroke();
      for (let i = 0; i < 3; i++) {
        const a = this.time * 3.3 + (i * TAU) / 3,
          y = cy + Math.sin(a) * r * 0.52;
        c.fillStyle = '#a1aaa9';
        c.fillRect(x + direction * 9 - 8, y - 5, 16, 10);
      }
      c.fillStyle = '#abb1ad';
      c.beginPath();
      c.arc(x, cy + r * 1.12, 4, 0, TAU);
      c.fill();
    }
    draw() {
      const c = this.ctx,
        g = this.geometry();
      c.fillStyle = '#d8c8ab';
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#967c5420';
      for (let i = 0; i < 22; i++) {
        const y = (i / 22) * this.h;
        c.beginPath();
        c.moveTo(0, y);
        c.bezierCurveTo(this.w * 0.3, y - 14, this.w * 0.7, y + 14, this.w, y);
        c.stroke();
      }
      const bed = c.createLinearGradient(0, g.cy + g.r, 0, g.cy + g.r + 70);
      bed.addColorStop(0, '#657370');
      bed.addColorStop(0.3, '#b9c0b6');
      bed.addColorStop(1, '#35413f');
      c.fillStyle = bed;
      c.beginPath();
      c.roundRect(6, g.cy + g.r + 10, this.w - 12, 42, 8);
      c.fill();
      this.chuck(g.left - 20, 1);
      this.chuck(g.right + 20, -1);
      c.save();
      const pop = 1 - (1 - this.spawn) ** 3,
        scale = pop + Math.sin(this.spawn * Math.PI) * 0.1;
      c.translate(this.w / 2, g.cy);
      c.scale(scale, scale);
      c.translate(-this.w / 2, -g.cy);
      this.log(this.shape, this.start, this.end);
      c.setLineDash([5, 5]);
      c.strokeStyle = this.done ? '#c5ffc6' : '#fff2c6';
      c.lineWidth = 1.7;
      this.profile(this.goal, this.start, this.end);
      c.stroke();
      c.setLineDash([]);
      c.restore();
      for (const p of this.pieces) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.a);
        const origin = g.left + ((p.start + p.end) / 198) * g.length;
        c.translate(-origin, -g.cy);
        this.log(p.shape, p.start, p.end);
        c.restore();
      }
      for (const p of this.chips) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.a);
        c.fillStyle = p.size > 6 ? '#69472e' : '#e8bd7a';
        c.fillRect(-p.size * 0.5, -2, p.size, 4);
        c.restore();
      }
      if (this.pointer) {
        const p = this.toolPoint(this.pointer),
          size = Math.max(12, this.w * 0.044);
        c.save();
        c.translate(p.x, p.y);
        c.fillStyle = '#6b3e28';
        c.beginPath();
        c.roundRect(-8, size + 14, 16, 77, 6);
        c.fill();
        c.fillStyle = '#b9c5c5';
        c.fillRect(-6, 0, 12, size + 22);
        c.strokeStyle = '#415151';
        c.lineWidth = 2;
        c.fillStyle = '#e3e9e3';
        c.beginPath();
        if (this.tip === 'round') c.arc(0, 0, size, 0, TAU);
        else if (this.tip === 'square') c.rect(-size, -size, size * 2, size * 2);
        else {
          c.moveTo(0, -size);
          c.lineTo(size, size);
          c.lineTo(-size, size);
          c.closePath();
        }
        c.fill();
        c.stroke();
        c.restore();
      }
      if (this.scoreFlash > 0) {
        c.globalAlpha = Math.min(1, this.scoreFlash * 2);
        c.font = '600 44px Fredoka,sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#513d2c';
        c.fillText(String(this.score), this.w / 2, this.h * 0.24);
        c.globalAlpha = 1;
      }
    }
    down(p) {
      this.pointer = { ...p };
    }
    move(p) {
      if (this.pointer?.id === p.id) this.pointer = { ...p };
    }
    up(p) {
      if (this.pointer?.id === p.id) {
        this.pointer = null;
        this.sound.stopTexture?.();
      }
    }
  }
  const silent = { carve() {}, pulse() {} };
  function woodPreview(c, w, h) {
    const t = new WoodLathe(c, w, h, { gentle: true }, silent);
    t.spawn = 1;
    for (let i = 35; i < 70; i++) t.shape[i] = 0.6;
    t.draw();
  }
  Object.assign(window.StillToys, { WoodLathe, woodPreview });
})();
