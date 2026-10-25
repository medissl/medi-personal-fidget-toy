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
      this.nextDesign();
    }
    makeDesigns() {
      const shapes = [0, 1, 2].sort(() => Math.random() - 0.5);
      return shapes.map((kind) => ({
        kind,
        neck: 0.33 + Math.random() * 0.12,
        bulge: 0.78 + Math.random() * 0.12,
        shift: 0.45 + Math.random() * 0.1,
      }));
    }
    geometry() {
      return {
        left: this.w * 0.07,
        right: this.w * 0.93,
        cy: this.h * 0.46,
        r: Math.min(this.h * 0.105, this.w * 0.21),
        length: this.w * 0.86,
      };
    }
    nextDesign() {
      this.designIndex++;
      if (this.designIndex >= 3) {
        this.designs = this.makeDesigns();
        this.designIndex = 0;
      }
      this.goal = Float32Array.from({ length: 100 }, (_, i) => {
        const t = i / 99,
          s = this.designs[this.designIndex];
        let value;
        if (s.kind === 0)
          value =
            s.neck +
            (s.bulge - s.neck) * Math.exp(-Math.pow((t - s.shift) / 0.24, 2)) +
            0.12 * Math.exp(-Math.pow((t - 0.06) / 0.05, 2));
        if (s.kind === 1)
          value =
            0.26 +
            0.53 * Math.pow(Math.sin(Math.PI * t), 2) +
            0.16 * Math.exp(-Math.pow((t - 0.12) / 0.065, 2));
        if (s.kind === 2)
          value = 0.4 + 0.26 * Math.sin(Math.PI * t * 3) ** 2 + 0.12 * Math.sin(Math.PI * t);
        return Math.min(0.94, Math.max(0.25, value));
      });
      this.shape = Float32Array.from({ length: 100 }, () => 1);
      this.chips = [];
      this.pointer = null;
      this.complete = 0;
      this.done = false;
    }
    reset() {
      this.nextDesign();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.pointer = null;
      this.chips = [];
    }
    update(dt) {
      this.time += dt * (this.settings.gentle ? 0.5 : 1);
      for (const p of this.chips) {
        p.vy += 520 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += p.spin * dt;
        p.life -= dt;
      }
      this.chips = this.chips.filter((p) => p.life > 0 && p.y < this.h + 30);
      if (this.pointer) this.carve(this.pointer, dt);
      if (this.done) {
        this.complete += dt;
        if (this.complete > 1.2) this.nextDesign();
      }
    }
    carve(p, dt) {
      if (this.done) return;
      const { left, right, cy, r, length } = this.geometry(),
        size = Math.max(12, this.w * 0.044),
        distance = Math.abs(p.y - cy);
      if (p.x < left - size || p.x > right + size || distance > r + size) return;
      let removed = 0;
      for (let i = 0; i < 100; i++) {
        const x = left + (i / 99) * length,
          dx = Math.abs(x - p.x);
        if (dx > size) continue;
        const bite =
          this.tip === 'square'
            ? size
            : this.tip === 'triangle'
              ? size - dx
              : Math.sqrt(Math.max(0, size * size - dx * dx));
        const desired = Math.max(this.goal[i], (distance - bite) / r),
          old = this.shape[i];
        this.shape[i] = Math.min(old, Math.max(desired, old - Math.max(0.01, dt * 1.8)));
        const amount = old - this.shape[i];
        if (amount > 0.001) {
          removed += amount;
          if (this.chips.length < 180 && Math.random() < 0.6)
            this.chips.push({
              x,
              y: cy + (p.y >= cy ? 1 : -1) * old * r,
              vx: (Math.random() - 0.5) * 180,
              vy: 40 + Math.random() * 100,
              a: Math.random() * TAU,
              spin: (Math.random() - 0.5) * 15,
              size: 3 + Math.random() * 6,
              life: 2,
            });
        }
      }
      if (removed > 0) {
        this.sound.carve();
        this.sound.pulse(1);
      }
      if (this.shape.reduce((sum, v, i) => sum + v - this.goal[i], 0) / 100 < 0.045)
        this.done = true;
    }
    outline(c, radii, sign = 1) {
      const { left, cy, r, length } = this.geometry();
      c.moveTo(left, cy + sign * radii[0] * r);
      for (let i = 1; i < 100; i++) c.lineTo(left + (i / 99) * length, cy + sign * radii[i] * r);
    }
    draw() {
      const c = this.ctx,
        { left, right, cy, r, length } = this.geometry();
      c.fillStyle = '#e8d8b8';
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#bda27b30';
      c.lineWidth = 1;
      for (let i = 0; i < 18; i++) {
        const y = (i / 18) * this.h;
        c.beginPath();
        c.moveTo(0, y);
        c.bezierCurveTo(this.w * 0.3, y - 14, this.w * 0.7, y + 14, this.w, y);
        c.stroke();
      }
      c.fillStyle = '#65716f';
      c.beginPath();
      c.roundRect(left - 12, cy - r * 0.55, 24, r * 1.7, 6);
      c.roundRect(right - 12, cy - r * 0.55, 24, r * 1.7, 6);
      c.fill();
      c.fillStyle = '#8f9c98';
      c.fillRect(left - 12, cy + r * 0.65, 24, r * 0.45);
      c.fillRect(right - 12, cy + r * 0.65, 24, r * 0.45);
      const wood = c.createLinearGradient(0, cy - r, 0, cy + r);
      wood.addColorStop(0, '#8e4e26');
      wood.addColorStop(0.25, '#e8b978');
      wood.addColorStop(0.48, '#f7d69a');
      wood.addColorStop(0.75, '#c18b49');
      wood.addColorStop(1, '#754221');
      c.fillStyle = wood;
      c.beginPath();
      this.outline(c, this.shape, -1);
      for (let i = 99; i >= 0; i--) c.lineTo(left + (i / 99) * length, cy + this.shape[i] * r);
      c.closePath();
      c.fill();
      c.save();
      c.clip();
      for (let line = 0; line < 18; line++) {
        const phase = (line / 18) * TAU + this.time * 3.5;
        c.globalAlpha = 0.12 + Math.max(0, Math.cos(phase)) * 0.16;
        c.strokeStyle = line % 2 ? '#5f341e' : '#ffe9be';
        c.lineWidth = line % 3 ? 1 : 2;
        c.beginPath();
        for (let i = 0; i < 100; i++) {
          const x = left + (i / 99) * length,
            y = cy + Math.sin(phase + i * 0.015) * r * this.shape[i];
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
      c.restore();
      c.globalAlpha = 1;
      c.setLineDash([5, 5]);
      c.strokeStyle = this.done ? '#efffe9' : '#fff5da';
      c.lineWidth = 2;
      c.beginPath();
      this.outline(c, this.goal, -1);
      this.outline(c, this.goal, 1);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = '#87552d88';
      c.lineWidth = 1;
      c.beginPath();
      this.outline(c, this.shape, -1);
      this.outline(c, this.shape, 1);
      c.stroke();
      for (const p of this.chips) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.a);
        c.fillStyle = p.size > 6 ? '#bd8247' : '#e7b578';
        c.beginPath();
        c.moveTo(-p.size, 0);
        c.lineTo(p.size, -p.size * 0.35);
        c.lineTo(p.size * 0.3, p.size * 0.8);
        c.closePath();
        c.fill();
        c.restore();
      }
      if (this.pointer) {
        const p = this.pointer,
          size = Math.max(12, this.w * 0.044);
        c.save();
        c.translate(p.x, p.y);
        c.fillStyle = '#946046';
        c.beginPath();
        c.roundRect(-9, size + 17, 18, 68, 7);
        c.fill();
        c.fillStyle = '#a9b8b7';
        c.fillRect(-7, 4, 14, size + 20);
        c.fillStyle = '#d9e5df';
        c.strokeStyle = '#5d6f6e';
        c.lineWidth = 2;
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
    }
    down(p) {
      this.pointer = p;
      this.carve(p, 1 / 60);
    }
    move(p) {
      if (this.pointer?.id === p.id) this.pointer = p;
    }
    up(p) {
      if (this.pointer?.id === p.id) this.pointer = null;
    }
  }
  const silent = { carve() {}, pulse() {} };
  function woodPreview(c, w, h) {
    const toy = new WoodLathe(c, w, h, { gentle: true }, silent);
    for (let i = 0; i < 100; i++) toy.shape[i] = Math.min(1, toy.goal[i] + 0.12);
    toy.draw();
  }
  Object.assign(window.StillToys, { WoodLathe, woodPreview });
})();
