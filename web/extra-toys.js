(() => {
  'use strict';
  const TAU = Math.PI * 2;
  class Slime {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.hue = 155;
      this.reset();
    }
    reset() {
      this.rim = Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * TAU;
        return {
          x: this.w / 2 + Math.cos(a) * this.w * 0.4,
          y: this.h / 2 + Math.sin(a) * Math.min(this.h * 0.34, this.w * 0.65),
          vx: 0,
          vy: 0,
          a,
        };
      });
      this.previous = new Map();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches) {
      const step = Math.min(2, dt * 60) * (this.settings.gentle ? 0.5 : 1);
      for (const p of this.rim) {
        const tx = this.w / 2 + Math.cos(p.a) * this.w * 0.4,
          ty = this.h / 2 + Math.sin(p.a) * Math.min(this.h * 0.34, this.w * 0.65);
        p.vx += (tx - p.x) * 0.018 * step;
        p.vy += (ty - p.y) * 0.018 * step;
        for (const touch of touches) {
          const d = Math.hypot(touch.x - p.x, touch.y - p.y),
            weight = Math.max(0, 1 - d / 170);
          p.vx += (touch.x - p.x) * weight * 0.003 * step;
          p.vy += (touch.y - p.y) * weight * 0.003 * step;
        }
        p.vx *= Math.pow(0.89, step);
        p.vy *= Math.pow(0.89, step);
        p.x += p.vx * step;
        p.y += p.vy * step;
      }
    }
    draw() {
      const c = this.ctx;
      c.fillStyle = '#142a2b';
      c.fillRect(0, 0, this.w, this.h);
      const gradient = c.createLinearGradient(
        this.w * 0.15,
        this.h * 0.2,
        this.w * 0.8,
        this.h * 0.8
      );
      gradient.addColorStop(0, 'hsl(' + this.hue + ' 80% 74%)');
      gradient.addColorStop(0.45, 'hsl(' + this.hue + ' 65% 49%)');
      gradient.addColorStop(1, 'hsl(' + this.hue + ' 75% 26%)');
      c.shadowColor = '#001b1b99';
      c.shadowBlur = 30;
      c.shadowOffsetY = 16;
      c.fillStyle = gradient;
      c.beginPath();
      const points = this.rim;
      const first = points[0],
        last = points[points.length - 1];
      c.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
      for (let i = 0; i < points.length; i++) {
        const p = points[i],
          next = points[(i + 1) % points.length];
        c.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      c.closePath();
      c.fill();
      c.shadowColor = 'transparent';
      c.shadowOffsetY = 0;
      c.save();
      c.clip();
      c.lineWidth = 2;
      for (let layer = 0; layer < 9; layer++) {
        const scale = 0.25 + layer * 0.095;
        c.strokeStyle = 'hsla(' + this.hue + ' 95% 88% / ' + (0.11 + (layer % 3) * 0.04) + ')';
        c.beginPath();
        for (let i = 0; i <= points.length; i++) {
          const p = points[i % points.length],
            x = this.w / 2 + (p.x - this.w / 2) * scale,
            y = this.h / 2 + (p.y - this.h / 2) * scale;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
      const shine = c.createRadialGradient(
        this.w * 0.35,
        this.h * 0.34,
        0,
        this.w * 0.4,
        this.h * 0.4,
        this.w * 0.4
      );
      shine.addColorStop(0, '#ffffff60');
      shine.addColorStop(0.6, '#ffffff00');
      c.fillStyle = shine;
      c.fillRect(0, 0, this.w, this.h);
      c.restore();
    }
    down(p) {
      this.previous.set(p.id, p);
      this.sound.slime();
      this.sound.pulse(1);
    }
    move(p) {
      const old = this.previous.get(p.id);
      if (!old) return;
      const dx = p.x - old.x,
        dy = p.y - old.y;
      for (const node of this.rim) {
        const weight = Math.max(0, 1 - Math.hypot(node.x - old.x, node.y - old.y) / 210);
        node.x += dx * weight * 0.85;
        node.y += dy * weight * 0.85;
      }
      this.previous.set(p.id, p);
      if (Math.hypot(dx, dy) > 2) this.sound.slime();
    }
    up(p) {
      this.previous.delete(p.id);
    }
  }
  class Switches {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.on = Array(6).fill(false);
      this.visited = new Map();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
    }
    layout() {
      return {
        size: Math.min(this.w * 0.34, this.h * 0.21, 140),
        gap: Math.min(this.w * 0.44, this.h * 0.26, 180),
      };
    }
    update() {}
    draw() {
      const c = this.ctx,
        { size, gap } = this.layout();
      c.fillStyle = '#1c2631';
      c.fillRect(0, 0, this.w, this.h);
      for (let i = 0; i < 6; i++) {
        const x = this.w / 2 + ((i % 2) - 0.5) * gap,
          y = this.h / 2 + (Math.floor(i / 2) - 1) * gap,
          pressed = this.on[i];
        c.fillStyle = '#101923';
        c.beginPath();
        c.roundRect(x - size * 0.54, y - size * 0.54, size * 1.08, size * 1.08, 18);
        c.fill();
        c.shadowColor = '#0007';
        c.shadowBlur = 12;
        c.shadowOffsetY = pressed ? 2 : 7;
        const g = c.createLinearGradient(x - size / 2, y - size / 2, x + size / 2, y + size / 2);
        g.addColorStop(0, pressed ? '#e8b661' : '#698ba5');
        g.addColorStop(1, pressed ? '#936131' : '#344f68');
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(
          x - size * 0.46,
          y - size * 0.46 + (pressed ? 4 : 0),
          size * 0.92,
          size * 0.92,
          14
        );
        c.fill();
        c.shadowColor = 'transparent';
        c.shadowOffsetY = 0;
        c.fillStyle = pressed ? '#fff1b4' : '#1c3143';
        c.beginPath();
        c.roundRect(x - size * 0.2, y - size * 0.3, size * 0.4, 5, 3);
        c.fill();
        c.strokeStyle = pressed ? '#f7d796' : '#aec7d2';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, y - size * 0.02);
        c.lineTo(x, y + size * 0.16);
        c.stroke();
      }
    }
    press(p) {
      const { size, gap } = this.layout();
      for (let i = 0; i < 6; i++) {
        const x = this.w / 2 + ((i % 2) - 0.5) * gap,
          y = this.h / 2 + (Math.floor(i / 2) - 1) * gap;
        if (Math.abs(p.x - x) < size * 0.47 && Math.abs(p.y - y) < size * 0.47) {
          if (this.visited.get(p.id) !== i) {
            this.visited.set(p.id, i);
            this.on[i] = !this.on[i];
            this.sound.switch(this.on[i]);
          }
          return;
        }
      }
      this.visited.delete(p.id);
    }
    down(p) {
      this.visited.delete(p.id);
      this.press(p);
    }
    move(p) {
      this.press(p);
    }
    up(p) {
      this.visited.delete(p.id);
    }
  }
  class Sand {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.previous = new Map();
      this.reset();
    }
    reset() {
      this.surface = document.createElement('canvas');
      this.surface.width = Math.max(1, Math.round(this.w));
      this.surface.height = Math.max(1, Math.round(this.h));
      const c = this.surface.getContext('2d');
      c.fillStyle = '#bca67c';
      c.fillRect(0, 0, this.w, this.h);
      for (let i = 0; i < 3500; i++) {
        const x = (i * 97.31) % this.w,
          y = (i * 73.73) % this.h;
        c.fillStyle = i % 2 ? '#f8e1b23d' : '#5a493729';
        c.fillRect(x, y, 1, 1);
      }
      this.previous.clear();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update() {}
    draw() {
      this.ctx.drawImage(this.surface, 0, 0, this.w, this.h);
    }
    down(p) {
      this.previous.set(p.id, p);
      this.move({ ...p, x: p.x + 0.1 });
      this.sound.pulse(1);
    }
    move(p) {
      const old = this.previous.get(p.id);
      if (!old) return;
      const c = this.surface.getContext('2d'),
        dx = p.x - old.x,
        dy = p.y - old.y,
        d = Math.max(0.01, Math.hypot(dx, dy)),
        nx = -dy / d,
        ny = dx / d;
      if (d < 0.08) return;
      c.lineCap = 'round';
      for (let n = -2; n <= 2; n++) {
        const off = n * 6;
        c.strokeStyle = '#766343b0';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(old.x + nx * off, old.y + ny * off);
        c.lineTo(p.x + nx * off, p.y + ny * off);
        c.stroke();
        c.strokeStyle = '#f2deb291';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(old.x + nx * (off + 2), old.y + ny * (off + 2));
        c.lineTo(p.x + nx * (off + 2), p.y + ny * (off + 2));
        c.stroke();
      }
      this.previous.set(p.id, p);
    }
    up(p) {
      this.previous.delete(p.id);
    }
  }
  class Cradle {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.angle = [-Math.min(0.45, this.layout().maxAngle), 0, 0, 0, 0];
      this.velocity = Array(5).fill(0);
      this.drag = null;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.drag = null;
      const limit = this.layout().maxAngle;
      this.angle[0] = Math.max(-limit, this.angle[0]);
      this.angle[4] = Math.min(limit, this.angle[4]);
    }
    layout() {
      const r = Math.min(this.w / 20, this.h / 18, 30);
      const length = Math.min(this.w * 0.4, this.h * 0.35);
      const start = this.w / 2 - r * 4.1;
      return {
        r,
        length,
        top: this.h * 0.32,
        start,
        maxAngle: Math.asin(Math.max(0.05, Math.min(0.95, (start - r - 8) / length))),
      };
    }
    update(dt) {
      dt = Math.min(dt, 0.033) * (this.settings.gentle ? 0.6 : 1);
      for (const i of [0, 4]) {
        if (this.drag?.index === i) continue;
        const before = this.angle[i];
        this.velocity[i] += -Math.sin(before) * 11 * dt;
        this.velocity[i] *= Math.pow(0.997, dt * 60);
        this.angle[i] += this.velocity[i] * dt;
        if (
          (i === 0 && before < 0 && this.angle[i] >= 0 && this.velocity[i] > 0.08) ||
          (i === 4 && before > 0 && this.angle[i] <= 0 && this.velocity[i] < -0.08)
        ) {
          const other = i === 0 ? 4 : 0;
          if (this.drag?.index !== other) {
            this.velocity[other] = this.velocity[i] * 0.98;
            this.angle[other] = this.velocity[i] * dt;
          }
          this.velocity[i] = 0;
          this.angle[i] = 0;
          this.sound.clack();
        }
      }
    }
    draw() {
      const c = this.ctx,
        { r, length, top, start } = this.layout();
      c.fillStyle = '#242833';
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#697987';
      c.lineWidth = 8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(this.w * 0.08, top - 16);
      c.lineTo(this.w * 0.92, top - 16);
      c.moveTo(this.w * 0.09, top - 16);
      c.lineTo(this.w * 0.09, Math.max(top + length + r * 2, this.h * 0.72));
      c.lineTo(this.w * 0.91, Math.max(top + length + r * 2, this.h * 0.72));
      c.lineTo(this.w * 0.91, top - 16);
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const pivot = start + i * r * 2.05,
          a = this.angle[i],
          x = pivot + Math.sin(a) * length,
          y = top + Math.cos(a) * length;
        c.strokeStyle = '#a2b4be';
        c.lineWidth = 1.5;
        for (const shift of [-r * 0.45, r * 0.45]) {
          c.beginPath();
          c.moveTo(pivot + shift, top - 14);
          c.lineTo(x + shift * 0.25, y - r * 0.8);
          c.stroke();
        }
        const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
        g.addColorStop(0, '#fbffff');
        g.addColorStop(0.22, '#bdced9');
        g.addColorStop(0.55, '#607687');
        g.addColorStop(1, '#162c3e');
        c.fillStyle = g;
        c.shadowColor = '#0008';
        c.shadowBlur = 12;
        c.shadowOffsetY = 7;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
        c.shadowColor = 'transparent';
        c.shadowOffsetY = 0;
      }
    }
    down(p) {
      const { r, length, top, start } = this.layout(),
        index = p.x < this.w / 2 ? 0 : 4,
        pivot = start + index * r * 2.05;
      if (
        Math.hypot(
          p.x - (pivot + Math.sin(this.angle[index]) * length),
          p.y - (top + Math.cos(this.angle[index]) * length)
        ) > Math.max(r * 2.2, 50)
      )
        return;
      this.drag = { id: p.id, index };
      this.velocity[index] = 0;
      this.move(p);
    }
    move(p) {
      if (this.drag?.id !== p.id) return;
      const { r, top, start, maxAngle } = this.layout(),
        i = this.drag.index,
        pivot = start + i * r * 2.05,
        a = Math.atan2(p.x - pivot, Math.max(10, p.y - top));
      this.angle[i] =
        i === 0 ? Math.max(-maxAngle, Math.min(0, a)) : Math.min(maxAngle, Math.max(0, a));
    }
    up(p) {
      if (this.drag?.id === p.id) this.drag = null;
    }
  }
  const silent = { pulse() {}, slime() {}, switch() {}, clack() {} };
  function preview(Class, c, w, h) {
    const toy = new Class(c, w, h, { gentle: true }, silent);
    if (Class === Cradle) toy.angle = [-0.35, 0, 0, 0, 0.2];
    if (Class === Sand) {
      toy.down({ id: 1, x: w * 0.2, y: h * 0.5 });
      for (let i = 0; i < 40; i++)
        toy.move({ id: 1, x: w * 0.2 + i * w * 0.015, y: h * 0.5 + Math.sin(i * 0.18) * h * 0.15 });
    }
    if (Class === Switches) toy.on[2] = true;
    toy.draw();
  }
  Object.assign(window.StillToys, {
    Slime,
    Switches,
    Sand,
    Cradle,
    slimePreview: (c, w, h) => preview(Slime, c, w, h),
    switchPreview: (c, w, h) => preview(Switches, c, w, h),
    sandPreview: (c, w, h) => preview(Sand, c, w, h),
    cradlePreview: (c, w, h) => preview(Cradle, c, w, h),
  });
})();
