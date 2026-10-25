(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const colors = {
    rainbow: Array.from({ length: 48 }, (_, i) => 'hsl(' + i * 7.5 + ' 100% 60%)'),
    ember: Array.from({ length: 48 }, (_, i) => 'hsl(' + (5 + i * 1.05) + ' 100% 64%)'),
    moon: Array.from({ length: 48 }, (_, i) => 'hsl(' + (165 + i * 1.3) + ' 85% 75%)'),
  };
  class Particles {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.palette = 'rainbow';
      this.mode = 'flow';
      this.time = 0;
      this.charge = 0;
      this.center = { x: w / 2, y: h / 2 };
      this.reset();
    }
    reset() {
      this.points = Array.from({ length: this.settings.density }, (_, i) => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 2.8,
        vy: (Math.random() - 0.5) * 2.8,
        color: i % 48,
      }));
      this.charge = 0;
      this.burstTime = 0;
      this.ctx.fillStyle = '#070b13';
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches) {
      if (this.points.length !== this.settings.density) this.reset();
      const step = Math.min(dt * 60, 2) * (this.settings.gentle ? 0.48 : 1),
        t = (this.time += dt);
      if (touches.length) {
        this.center = {
          x: touches.reduce((s, p) => s + p.x, 0) / touches.length,
          y: touches.reduce((s, p) => s + p.y, 0) / touches.length,
        };
        this.charge = Math.min(1.7, this.charge + dt * 0.7);
      }
      this.burstTime = Math.max(0, this.burstTime - dt);
      const radius =
        touches.length === 2
          ? Math.max(16, Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y) * 0.5)
          : 70;
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        let ax = 0,
          ay = 0,
          drag = 0.992;
        if (touches.length) {
          const target = touches.length === 4 ? touches[i % 4] : this.center;
          const dx = target.x - p.x,
            dy = target.y - p.y,
            d = Math.max(0.1, Math.hypot(dx, dy)),
            nx = dx / d,
            ny = dy / d;
          if (touches.length === 1 || touches.length === 4) {
            const force = Math.min(1.3, d * 0.018);
            ax = nx * force;
            ay = ny * force;
            drag = d < 28 ? 0.76 : 0.975;
            if (this.mode === 'gravity') {
              ax *= 1.3;
              ay *= 1.3;
            }
          } else if (touches.length === 2) {
            const pull = Math.max(-0.9, Math.min(1, (d - radius) * 0.018));
            ax = nx * pull - ny * 0.63;
            ay = ny * pull + nx * 0.63;
            drag = 0.971;
          } else if (touches.length === 3) {
            const petals = radius + 45 * Math.sin(Math.atan2(dy, dx) * 3 + t);
            const pull = Math.max(-0.3, Math.min(0.8, (d - petals) * 0.01));
            ax = nx * pull - ny * 0.85;
            ay = ny * pull + nx * 0.85;
            drag = 0.97;
          } else {
            const well = touches[i % touches.length],
              wx = p.x - well.x,
              wy = p.y - well.y,
              wd = Math.max(2, Math.hypot(wx, wy));
            ax = (wx / wd) * 0.9;
            ay = (wy / wd) * 0.9;
          }
          if (this.mode === 'wave') {
            ax += Math.sin(p.y * 0.022 + t * 3 + i * 0.001) * 0.35;
            ay += Math.cos(p.x * 0.025 + t * 2) * 0.35;
          }
          if (this.mode === 'ribbons' && touches.length === 2) {
            const f = (i % 127) / 126,
              tx = touches[0].x * (1 - f) + touches[1].x * f,
              ty = touches[0].y * (1 - f) + touches[1].y * f + Math.sin(f * TAU * 3 + t * 3) * 45;
            ax = (tx - p.x) * 0.015;
            ay = (ty - p.y) * 0.015;
            drag = 0.92;
          }
          if (this.mode === 'electric') {
            ax += Math.sin(i * 12.4 + Math.floor(t * 18)) * 0.8;
            ay += Math.cos(i * 7.3 + Math.floor(t * 18)) * 0.8;
          }
        } else if (!this.burstTime) {
          const a = Math.sin(p.y * 0.008 + t * 0.35) * 2 + Math.cos(p.x * 0.007 - t * 0.25) * 2;
          ax = Math.cos(a) * 0.018;
          ay = Math.sin(a) * 0.018;
          if (this.mode === 'wave') {
            ax = Math.sin(p.y * 0.015 + t) * 0.06;
            ay = Math.cos(p.x * 0.012 + t) * 0.05;
          }
          if (this.mode === 'gravity') {
            ax = (this.w / 2 - p.x) * 0.00005;
            ay = (this.h / 2 - p.y) * 0.00005;
          }
        }
        p.vx = (p.vx + ax * step) * Math.pow(drag, step);
        p.vy = (p.vy + ay * step) * Math.pow(drag, step);
        const speed = Math.hypot(p.vx, p.vy),
          limit = this.burstTime ? 30 : 19;
        if (speed > limit) {
          p.vx *= limit / speed;
          p.vy *= limit / speed;
        }
        p.x += p.vx * step;
        p.y += p.vy * step;
        if (p.x < 0) p.x += this.w;
        if (p.x >= this.w) p.x -= this.w;
        if (p.y < 0) p.y += this.h;
        if (p.y >= this.h) p.y -= this.h;
      }
    }
    draw() {
      const c = this.ctx;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.fillStyle = this.settings.gentle ? '#070b1370' : '#070b134a';
      c.fillRect(0, 0, this.w, this.h);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 0.88;
      const palette = colors[this.palette],
        trail = this.mode === 'ribbons' ? 2.8 : this.mode === 'electric' ? 2 : 0.65;
      for (let k = 0; k < 48; k++) {
        c.strokeStyle = palette[k];
        c.fillStyle = palette[k];
        c.lineWidth = this.mode === 'electric' ? 0.75 : 0.9;
        c.beginPath();
        for (let i = k; i < this.points.length; i += 48) {
          const p = this.points[i],
            tx = Math.max(-16, Math.min(16, p.vx * trail)),
            ty = Math.max(-16, Math.min(16, p.vy * trail));
          c.moveTo(p.x - tx, p.y - ty);
          c.lineTo(p.x, p.y);
        }
        c.stroke();
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    down(p) {
      this.center = { x: p.x, y: p.y };
      this.sound.pulse(1);
    }
    up(p, remaining = 0, cancelled = false) {
      if (remaining || cancelled) return;
      const energy = 5 + Math.min(1.7, this.charge) * 12,
        cx = this.center.x,
        cy = this.center.y;
      for (const q of this.points) {
        let dx = q.x - cx,
          dy = q.y - cy,
          d = Math.hypot(dx, dy);
        if (d < 2) {
          const a = Math.random() * TAU;
          dx = Math.cos(a);
          dy = Math.sin(a);
          d = 1;
        }
        const speed = energy * (0.4 + Math.random() * 0.65);
        q.vx = (dx / d) * speed;
        q.vy = (dy / d) * speed;
      }
      this.burstTime = 2.3;
      this.charge = 0;
      this.sound.pulse(2);
    }
  }
  function particlePreview(c, w, h, time = 0, background = '#14202a', intensity = 1) {
    c.fillStyle = background;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2200; i++) {
      const a = i * 2.399963 + time * 0.28,
        r = Math.sqrt((i % 503) / 503) * Math.min(w, h) * 0.44;
      const twist = a + r * 0.022;
      c.globalAlpha = (0.45 + (i % 5) * 0.12) * intensity;
      c.fillStyle = colors.rainbow[i % 48];
      c.fillRect(w / 2 + Math.cos(twist) * r, h * 0.52 + Math.sin(twist) * r * 0.8, 1.3, 1.3);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  window.StillToys = { Particles, particlePreview };
})();
