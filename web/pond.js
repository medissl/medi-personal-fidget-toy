(() => {
  'use strict';
  const TAU = Math.PI * 2;
  function leaf(c, x, y, size, angle, hue = 95) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.shadowColor = '#071c1d88';
    c.shadowBlur = 8;
    c.shadowOffsetY = 5;
    const g = c.createLinearGradient(-size, -size * 0.4, size, size * 0.4);
    g.addColorStop(0, 'hsl(' + hue + ' 43% 26%)');
    g.addColorStop(0.43, 'hsl(' + hue + ' 49% 47%)');
    g.addColorStop(0.55, 'hsl(' + hue + ' 55% 59%)');
    g.addColorStop(1, 'hsl(' + hue + ' 50% 30%)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-size, 0);
    c.bezierCurveTo(-size * 0.65, -size * 0.55, size * 0.25, -size * 0.67, size, 0);
    c.bezierCurveTo(size * 0.35, size * 0.64, -size * 0.62, size * 0.65, -size, 0);
    c.fill();
    c.shadowColor = 'transparent';
    c.shadowOffsetY = 0;
    c.strokeStyle = '#273c1670';
    c.lineWidth = 1;
    c.stroke();
    c.strokeStyle = '#e7e6a0a0';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(-size * 0.97, 0);
    c.bezierCurveTo(-size * 0.35, -size * 0.07, size * 0.5, size * 0.03, size * 0.95, 0);
    c.stroke();
    for (let i = -3; i <= 4; i++) {
      const xx = i * size * 0.18,
        extent = size * 0.4 * Math.sqrt(Math.max(0, 1 - (xx / size) ** 2));
      c.strokeStyle = '#d8db8c78';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(xx, 0);
      c.quadraticCurveTo(xx + size * 0.14, -extent * 0.55, xx + size * 0.1, -extent);
      c.moveTo(xx, 0);
      c.quadraticCurveTo(xx - size * 0.1, extent * 0.65, xx + size * 0.04, extent);
      c.stroke();
    }
    c.strokeStyle = '#6d5e2e';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-size, 0);
    c.quadraticCurveTo(-size * 1.16, size * 0.03, -size * 1.28, size * 0.19);
    c.stroke();
    c.fillStyle = '#aab05750';
    for (let i = 0; i < 5; i++) {
      const xx = (((i * 0.43) % 1) - 0.5) * size * 1.3,
        yy = Math.sin(i * 3.7) * size * 0.2;
      c.beginPath();
      c.ellipse(xx, yy, 2.5, 1, 0.3, 0, TAU);
      c.fill();
    }
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
      this.droplets = [];
      this.drags = new Map();
      this.leaves = Array.from({ length: 9 }, (_, i) => ({
        x: this.w * (0.15 + Math.random() * 0.7),
        y: this.h * (0.05 + Math.random() * 0.9),
        vx: 0,
        vy: 0,
        angle: i * 2.4,
        size: 26 + Math.random() * 16,
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
      for (const p of this.droplets) {
        p.vy += 520 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      this.droplets = this.droplets.filter((p) => p.life > 0 && p.y < p.startY + 15);
      for (let i = 0; i < this.leaves.length; i++) {
        const l = this.leaves[i];
        const held = Array.from(this.drags.values()).find((d) => d.leaf === l);
        if (held) {
          l.vx = (held.x - l.x) * 12;
          l.vy = (held.y - l.y) * 12;
          l.x += l.vx * Math.min(dt, 0.05);
          l.y += l.vy * Math.min(dt, 0.05);
          l.angle += l.vx * dt * 0.002;
          continue;
        }
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
        if (l.y < 25) {
          l.y = 25;
          l.vy = Math.abs(l.vy);
        }
        if (l.y > this.h - 25) {
          l.y = this.h - 25;
          l.vy = -Math.abs(l.vy);
        }
      }
    }
    draw() {
      const c = this.ctx;
      waterBackground(c, this.w, this.h, this.time);
      for (const r of this.ripples) {
        for (let n = 0; n < 4; n++) {
          const radius = r.age * 65 - n * 10;
          if (radius < 2) continue;
          const alpha = Math.max(0, 1 - r.age / 2.1) * (1 - n * 0.16);
          c.globalAlpha = alpha * 0.35;
          c.strokeStyle = '#082e39';
          c.lineWidth = 3.5;
          c.beginPath();
          c.ellipse(r.x, r.y + 2, radius, radius * 0.68, -0.12, 0, TAU);
          c.stroke();
          c.globalAlpha = alpha * 0.45;
          c.strokeStyle = '#d0e9df';
          c.lineWidth = 1.4;
          c.beginPath();
          c.ellipse(r.x, r.y - 1, radius, radius * 0.68, -0.12, Math.PI * 0.94, Math.PI * 1.94);
          c.stroke();
        }
        if (r.age < 0.24) {
          c.globalAlpha = (1 - r.age / 0.24) * 0.5;
          const lip = 4 + r.age * 45;
          c.strokeStyle = '#daf8ec';
          c.lineWidth = 2;
          c.beginPath();
          c.ellipse(r.x, r.y, lip, lip * 0.4, 0, 0, TAU);
          c.stroke();
        }
      }
      for (const p of this.droplets) {
        c.globalAlpha = Math.min(0.85, p.life * 3);
        const g = c.createRadialGradient(p.x - 1, p.y - 1, 0, p.x, p.y, 3);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, '#c6f3e8');
        g.addColorStop(1, '#508e9b44');
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(p.x, p.y, 1.8, 3.3, Math.atan2(p.vy, p.vx), 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
      for (const l of this.leaves) leaf(c, l.x, l.y, l.size, l.angle, l.hue);
    }
    ripple(p) {
      if (performance.now() - this.lastRipple < 45) return;
      this.lastRipple = performance.now();
      this.ripples.push({ x: p.x, y: p.y, age: 0 });
      if (this.droplets.length < 100)
        for (let i = 0; i < 5; i++)
          this.droplets.push({
            x: p.x,
            y: p.y,
            startY: p.y,
            vx: (i - 2) * 24 + (Math.random() - 0.5) * 15,
            vy: -70 - Math.random() * 80,
            life: 0.5,
          });
      if (this.ripples.length > 70) this.ripples.shift();
      this.sound.water();
    }
    down(p) {
      const picked = [...this.leaves].reverse().find((l) => {
        if (Array.from(this.drags.values()).some((d) => d.leaf === l)) return false;
        const dx = p.x - l.x,
          dy = p.y - l.y,
          x = dx * Math.cos(l.angle) + dy * Math.sin(l.angle),
          y = -dx * Math.sin(l.angle) + dy * Math.cos(l.angle);
        return (x / (l.size + 8)) ** 2 + (y / (l.size * 0.6 + 8)) ** 2 < 1;
      });
      if (picked)
        this.drags.set(p.id, {
          leaf: picked,
          x: picked.x,
          y: picked.y,
          dx: picked.x - p.x,
          dy: picked.y - p.y,
        });
      this.ripple(p);
      this.sound.pulse(1);
    }
    move(p) {
      const drag = this.drags.get(p.id);
      if (drag) {
        drag.x = Math.max(8, Math.min(this.w - 8, p.x + drag.dx));
        drag.y = Math.max(20, Math.min(this.h - 20, p.y + drag.dy));
      }
      this.ripple(p);
    }
    up(p, remaining, cancelled) {
      const drag = this.drags.get(p.id);
      if (drag && cancelled) drag.leaf.vx = drag.leaf.vy = 0;
      this.drags.delete(p.id);
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
