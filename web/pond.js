(() => {
  'use strict';
  const TAU = Math.PI * 2;
  function leaf(c, x, y, size, angle, hue = 95) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.shadowColor = '#071e2280';
    c.shadowBlur = 9;
    c.shadowOffsetY = 6;
    const g = c.createLinearGradient(-size, 0, size, 0);
    g.addColorStop(0, `hsl(${hue} 28% 40%)`);
    g.addColorStop(0.5, `hsl(${hue} 30% 61%)`);
    g.addColorStop(1, `hsl(${hue} 30% 36%)`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-size, 0);
    c.bezierCurveTo(-size * 0.1, -size * 0.9, size * 0.7, -size * 0.7, size, 0);
    c.bezierCurveTo(size * 0.2, size * 0.9, -size * 0.7, size * 0.6, -size, 0);
    c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = '#dce4a478';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-size * 0.9, 0);
    c.lineTo(size * 0.8, 0);
    for (let i = -2; i <= 2; i++) {
      const p = i * size * 0.22;
      c.moveTo(p, 0);
      c.lineTo(p + size * 0.2, -size * 0.32);
      c.moveTo(p, 0);
      c.lineTo(p - size * 0.12, size * 0.28);
    }
    c.stroke();
    c.restore();
  }
  function waterBackground(c, w, h, time) {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#173c43');
    g.addColorStop(0.55, '#255457');
    g.addColorStop(1, '#152f37');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.lineWidth = 0.7;
    for (let i = 0; i < 22; i++) {
      const y = ((i / 22) * h + time * 1.3) % h;
      c.strokeStyle = i % 3 === 0 ? '#b0d7bf18' : '#b0d7bf0a';
      c.beginPath();
      c.moveTo(-30, y);
      c.bezierCurveTo(
        w * 0.25,
        y - 25 + Math.sin(time * 0.3 + i) * 15,
        w * 0.7,
        y + 25,
        w + 30,
        y - 5
      );
      c.stroke();
    }
  }
  class Pond {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.time = 0;
      this.lastRipple = 0;
      this.reset();
    }
    reset() {
      this.ripples = [];
      this.leaves = Array.from({ length: 9 }, (_, i) => ({
        x: this.w * (0.15 + Math.random() * 0.7),
        y: this.h * (0.18 + Math.random() * 0.5),
        vx: 0,
        vy: 0,
        angle: i * 2.4,
        size: 19 + Math.random() * 13,
        hue: 79 + i * 3,
      }));
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches) {
      dt *= this.settings.gentle ? 0.5 : 1;
      this.time += dt;
      this.ripples = this.ripples.filter((r) => r.age < 2.8);
      for (const r of this.ripples) r.age += dt;
      for (let i = 0; i < this.leaves.length; i++) {
        const l = this.leaves[i];
        l.vx += Math.sin(this.time * 0.3 + i) * dt * 1.4;
        l.vy += Math.cos(this.time * 0.2 + i) * dt;
        for (const p of touches) {
          const dx = l.x - p.x,
            dy = l.y - p.y,
            d = Math.max(10, Math.hypot(dx, dy));
          if (d < 150) {
            l.vx += (dx / d) * (150 - d) * dt * 1.7;
            l.vy += (dy / d) * (150 - d) * dt * 1.7;
          }
        }
        l.vx *= Math.pow(0.97, dt * 60);
        l.vy *= Math.pow(0.97, dt * 60);
        l.x += (l.vx + Math.sin(i + this.time * 0.2) * 1.3) * dt;
        l.y += (l.vy + Math.cos(i + this.time * 0.15)) * dt;
        l.angle += (l.vx * 0.006 + Math.sin(this.time * 0.3 + i) * 0.035) * dt;
        if (l.x < -40) l.x = this.w + 35;
        if (l.x > this.w + 40) l.x = -35;
        if (l.y < 60) {
          l.y = 60;
          l.vy = Math.abs(l.vy);
        }
        if (l.y > this.h - 180) {
          l.y = this.h - 180;
          l.vy = -Math.abs(l.vy);
        }
      }
    }
    draw() {
      const c = this.ctx;
      waterBackground(c, this.w, this.h, this.time);
      for (const r of this.ripples) {
        for (let n = 0; n < 3; n++) {
          const radius = r.age * 55 - n * 11;
          if (radius < 1) continue;
          c.globalAlpha = Math.max(0, 1 - r.age / 2.8) * (0.25 - n * 0.05);
          c.strokeStyle = '#c4e3d4';
          c.lineWidth = 1;
          c.beginPath();
          c.ellipse(r.x, r.y, radius, radius * 0.78, -0.1, 0, TAU);
          c.stroke();
        }
      }
      c.globalAlpha = 1;
      for (const l of this.leaves) leaf(c, l.x, l.y, l.size, l.angle, l.hue);
    }
    ripple(p) {
      if (performance.now() - this.lastRipple < 45) return;
      this.lastRipple = performance.now();
      this.ripples.push({ x: p.x, y: p.y, age: 0 });
      if (this.ripples.length > 70) this.ripples.shift();
      this.sound.water();
    }
    down(p) {
      this.ripple(p);
      this.sound.pulse(1);
    }
    move(p) {
      this.ripple(p);
    }
  }
  function pondPreview(c, w, h) {
    waterBackground(c, w, h, 0);
    for (let i = 0; i < 5; i++)
      leaf(
        c,
        w * (0.2 + ((i * 0.173) % 0.65)),
        h * (0.35 + ((i * 0.211) % 0.5)),
        22 + i * 2,
        i * 1.7,
        85 + i * 5
      );
    c.strokeStyle = '#bad9ca45';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(w * 0.58, h * 0.6, 25 + i * 14, 14 + i * 8, -0.2, 0, TAU);
      c.stroke();
    }
  }
  Object.assign(window.StillToys, { Pond, pondPreview });
})();
