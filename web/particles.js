(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const colors = {
    rainbow: Array.from({ length: 32 }, (_, i) => `hsl(${(i / 32) * 360} 94% 64%)`),
    ember: Array.from({ length: 32 }, (_, i) => `hsl(${12 + i * 1.7} 83% ${61 + i * 0.4}%)`),
    moon: Array.from({ length: 32 }, (_, i) => `hsl(${176 + i * 1.4} 45% ${67 + i * 0.65}%)`),
  };
  class Particles {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.palette = 'rainbow';
      this.time = 0;
      this.reset();
    }
    reset() {
      this.points = Array.from({ length: this.settings.density }, (_, i) => {
        const angle = Math.random() * TAU,
          radius = Math.sqrt(Math.random()) * Math.min(this.w, this.h) * 0.42;
        return {
          x: this.w / 2 + Math.cos(angle) * radius,
          y: this.h * 0.46 + Math.sin(angle) * radius,
          vx: Math.cos(angle + Math.PI / 2) * 0.7,
          vy: Math.sin(angle + Math.PI / 2) * 0.7,
          color: i % 32,
        };
      });
      this.ctx.fillStyle = '#0a0e16';
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches) {
      if (this.points.length !== this.settings.density) this.reset();
      const speed = this.settings.gentle ? 0.45 : 1;
      const step = Math.min(dt * 60, 2) * speed;
      this.time += dt * speed;
      const t = this.time;
      let cx = this.w / 2,
        cy = this.h * 0.46;
      if (touches.length) {
        cx = touches.reduce((sum, p) => sum + p.x, 0) / touches.length;
        cy = touches.reduce((sum, p) => sum + p.y, 0) / touches.length;
      }
      const radius =
        touches.length === 2
          ? Math.max(25, Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y) * 0.5)
          : Math.min(this.w, this.h) * 0.25;
      for (const p of this.points) {
        const dx = cx - p.x,
          dy = cy - p.y;
        const d = Math.max(12, Math.hypot(dx, dy));
        let ax, ay;
        if (touches.length === 1) {
          ax = (dx / d) * 0.24 - (dy / d) * 0.035;
          ay = (dy / d) * 0.24 + (dx / d) * 0.035;
        } else if (touches.length === 2) {
          const pull = Math.max(-0.18, Math.min(0.25, (d - radius) * 0.003));
          ax = (dx / d) * pull - (dy / d) * 0.19;
          ay = (dy / d) * pull + (dx / d) * 0.19;
        } else if (touches.length === 3) {
          ax = (dx / d) * 0.13 - (dy / d) * 0.32;
          ay = (dy / d) * 0.13 + (dx / d) * 0.32;
        } else if (touches.length >= 4) {
          ax = (-dx / d) * 0.3;
          ay = (-dy / d) * 0.3;
        } else {
          const pull = (d - radius * (1 + 0.25 * Math.sin(t * 0.2 + p.color))) * 0.00018;
          ax = (dx / d) * pull - (dy / d) * 0.012 + Math.sin(p.y * 0.009 + t * 0.2) * 0.014;
          ay = (dy / d) * pull + (dx / d) * 0.012 + Math.cos(p.x * 0.008 + t * 0.2) * 0.014;
        }
        p.vx = (p.vx + ax * step) * Math.pow(0.975, step);
        p.vy = (p.vy + ay * step) * Math.pow(0.975, step);
        const v = Math.hypot(p.vx, p.vy);
        if (v > 6) {
          p.vx *= 6 / v;
          p.vy *= 6 / v;
        }
        p.x += p.vx * step;
        p.y += p.vy * step;
        if (p.x < -12) p.x = this.w + 10;
        if (p.x > this.w + 12) p.x = -10;
        if (p.y < -12) p.y = this.h + 10;
        if (p.y > this.h + 12) p.y = -10;
      }
    }
    draw() {
      const c = this.ctx;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.fillStyle = this.settings.gentle ? '#0a0e1644' : '#0a0e1628';
      c.fillRect(0, 0, this.w, this.h);
      c.globalCompositeOperation = 'lighter';
      const palette = colors[this.palette];
      c.globalAlpha = 0.73;
      for (let color = 0; color < 32; color++) {
        c.fillStyle = palette[color];
        c.beginPath();
        for (let i = color; i < this.points.length; i += 32) {
          const p = this.points[i];
          c.rect(p.x, p.y, i % 7 === 0 ? 1.7 : 1.05, i % 7 === 0 ? 1.7 : 1.05);
        }
        c.fill();
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    down(p) {
      this.sound.note(p.x, this.w);
      this.sound.pulse(1);
    }
    move(p) {
      this.sound.note(p.x, this.w);
    }
  }
  function particlePreview(ctx, w, h, time = 0, background = '#10151e', intensity = 1) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5,
      cy = h * 0.51,
      scale = Math.min(w * 0.45, h * 0.64);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 1900; i++) {
      const phase = i * 2.399963 + time * 0.06;
      const r = Math.sqrt((i % 337) / 337) * scale;
      const a = phase + r * 0.017;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.6 + Math.sin(i * 0.17) * 6;
      ctx.globalAlpha = (0.35 + (i % 5) * 0.13) * intensity;
      ctx.fillStyle = colors.rainbow[Math.floor(((a * 5 + i * 0.002) % 32) + 32) % 32];
      ctx.fillRect(x, y, i % 5 === 0 ? 1.6 : 1, i % 5 === 0 ? 1.6 : 1);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  window.StillToys = { Particles, particlePreview };
})();
