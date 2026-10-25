(() => {
  'use strict';
  const TAU = Math.PI * 2;
  class Packaging {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.cells = Array(60).fill(false);
      this.depth = new Float32Array(60);
      this.next = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    geometry() {
      const gap = Math.min((this.w - 16) / 6, (this.h - 20) / 10);
      return { gap, x: this.w / 2 - gap * 2.5, y: this.h / 2 - gap * 4.5 };
    }
    update(dt) {
      for (let i = 0; i < 60; i++)
        this.depth[i] += (Number(this.cells[i]) - this.depth[i]) * Math.min(1, dt * 18);
      if (this.cells.every(Boolean)) {
        this.next += dt;
        if (this.next > 1) this.reset();
      }
    }
    draw() {
      const c = this.ctx,
        { gap, x, y } = this.geometry(),
        bg = c.createLinearGradient(0, 0, this.w, this.h);
      bg.addColorStop(0, '#c2d1d5');
      bg.addColorStop(0.45, '#edf1e9');
      bg.addColorStop(1, '#acbec5');
      c.fillStyle = bg;
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#faffff37';
      c.lineWidth = 1;
      for (let i = 0; i < 35; i++) {
        c.beginPath();
        c.moveTo(i * 19 - 120, 0);
        c.lineTo(i * 19 + this.h * 0.3, this.h);
        c.stroke();
      }
      for (let i = 0; i < 60; i++) {
        const bx = x + (i % 6) * gap,
          by = y + Math.floor(i / 6) * gap,
          r = gap * 0.44,
          depth = this.depth[i],
          ry = r * (1 - depth * 0.19);
        c.save();
        c.translate(bx, by);
        c.scale(1, ry / r);
        c.shadowColor = '#546e784b';
        c.shadowBlur = depth ? 2 : 6;
        c.shadowOffsetY = depth ? 1 : 4;
        const g = c.createRadialGradient(-r * 0.25, -r * 0.32, r * 0.02, 0, 0, r);
        g.addColorStop(0, depth ? '#c6d4d2' : '#ffffff');
        g.addColorStop(0.48, depth ? '#c4d0cc' : '#e8f2ed');
        g.addColorStop(0.8, depth ? '#d7e0da' : '#c2d4d5');
        g.addColorStop(1, '#758f9b');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, r, 0, TAU);
        c.fill();
        c.shadowColor = 'transparent';
        c.shadowOffsetY = 0;
        c.lineWidth = 1;
        c.strokeStyle = '#ffffffc4';
        c.beginPath();
        c.arc(0, 0, r * 0.9, 3.4, 5.45);
        c.stroke();
        c.strokeStyle = '#536f7b66';
        c.beginPath();
        c.arc(0, 0, r * 0.96, 0.45, 2.8);
        c.stroke();
        if (depth < 0.8) {
          c.globalAlpha = (1 - depth) * 0.75;
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.ellipse(-r * 0.25, -r * 0.34, r * 0.25, r * 0.1, -0.55, 0, TAU);
          c.fill();
          c.globalAlpha = 1;
        }
        if (depth > 0.05) {
          c.globalAlpha = depth * 0.65;
          c.strokeStyle = '#70888a';
          c.lineWidth = 0.9;
          for (let j = 0; j < 7; j++) {
            const a = (j / 7) * TAU + i * 0.37,
              rr = r * (0.38 + (j % 3) * 0.13);
            c.beginPath();
            c.moveTo(Math.cos(a) * rr * 0.4, Math.sin(a) * rr * 0.4);
            c.bezierCurveTo(
              Math.cos(a + 0.35) * rr * 0.65,
              Math.sin(a + 0.35) * rr * 0.65,
              Math.cos(a - 0.12) * r * 0.75,
              Math.sin(a - 0.12) * r * 0.75,
              Math.cos(a) * r * 0.92,
              Math.sin(a) * r * 0.92
            );
            c.stroke();
          }
          c.globalAlpha = 1;
          c.strokeStyle = '#f7ffffa0';
          c.beginPath();
          c.ellipse(0, 2, r * 0.54, r * 0.38, 0.2, 0, TAU);
          c.stroke();
        }
        c.restore();
      }
    }
    press(p) {
      const { gap, x, y } = this.geometry(),
        col = Math.round((p.x - x) / gap),
        row = Math.round((p.y - y) / gap);
      if (col < 0 || col > 5 || row < 0 || row > 9) return;
      const i = row * 6 + col;
      if (this.cells[i] || Math.hypot(p.x - x - col * gap, p.y - y - row * gap) > gap * 0.45)
        return;
      this.cells[i] = true;
      this.sound.packaging();
    }
    down(p) {
      this.press(p);
    }
    move(p) {
      this.press(p);
    }
    up() {}
  }
  class Zipper {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.color = 0;
      this.count = 0;
      this.reset();
    }
    reset() {
      this.progress = 0;
      this.pointer = null;
      this.complete = false;
      this.flash = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.pointer = null;
    }
    geometry() {
      const top = -Math.min(70, this.h * 0.12),
        bottom = this.h - Math.min(140, this.h * 0.21);
      return {
        top,
        bottom,
        y: bottom - this.progress * (bottom - top),
        cx: this.w / 2,
        scale: Math.max(0.6, Math.min(1.4, this.w / 330)),
      };
    }
    update(dt) {
      if (this.complete) {
        this.flash -= dt;
        if (this.flash <= 0) {
          this.color = (this.color + 1) % 3;
          this.reset();
        }
      }
    }
    draw() {
      const c = this.ctx,
        { top, y, cx, scale: z } = this.geometry(),
        colors = [
          ['#77678f', '#b5a0bd'],
          ['#557b70', '#97b0a0'],
          ['#a66e68', '#d2a38d'],
        ],
        palette = colors[this.color],
        light = c.createLinearGradient(0, 0, this.w, 0);
      light.addColorStop(0, palette[0]);
      light.addColorStop(0.38, palette[1]);
      light.addColorStop(0.5, palette[0]);
      light.addColorStop(0.62, palette[1]);
      light.addColorStop(1, palette[0]);
      c.fillStyle = light;
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#ffffff14';
      c.lineWidth = 1;
      for (let i = 0; i < this.w; i += 4) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, this.h);
        c.stroke();
      }
      c.strokeStyle = '#111a1a14';
      for (let yy = 0; yy < this.h; yy += 5) {
        c.beginPath();
        c.moveTo(0, yy);
        c.lineTo(this.w, yy);
        c.stroke();
      }
      const opening = (yy) => (yy < y ? Math.min(this.w * 0.47, (y - yy) * 0.35) : 0);
      c.fillStyle = '#162122';
      c.beginPath();
      c.moveTo(cx - this.w * 0.5, top);
      c.lineTo(cx - opening(y), y);
      c.lineTo(cx + this.w * 0.5, top);
      c.closePath();
      c.fill();
      for (let yy = top; yy < this.h + 25; yy += 16 * z) {
        const open = opening(yy),
          metal = c.createLinearGradient(cx - 40 * z - open, 0, cx + 40 * z + open, 0);
        metal.addColorStop(0, '#444c4d');
        metal.addColorStop(0.25, '#ece8d6');
        metal.addColorStop(0.5, '#8c9692');
        metal.addColorStop(0.8, '#ffffee');
        metal.addColorStop(1, '#3e494b');
        c.fillStyle = palette[0];
        c.fillRect(cx - open - 56 * z, yy, 20 * z, 16 * z);
        c.fillRect(cx + open + 36 * z, yy, 20 * z, 16 * z);
        c.strokeStyle = '#eadfc696';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx - open - 47 * z, yy + 2);
        c.lineTo(cx - open - 47 * z, yy + 9 * z);
        c.moveTo(cx + open + 47 * z, yy + 2);
        c.lineTo(cx + open + 47 * z, yy + 9 * z);
        c.stroke();
        c.fillStyle = metal;
        c.beginPath();
        c.roundRect(cx - open - 35 * z, yy, 34 * z, 10 * z, 3 * z);
        c.roundRect(cx + open + 1 * z, yy + 7 * z, 34 * z, 10 * z, 3 * z);
        c.fill();
      }
      c.save();
      c.translate(cx, y);
      c.scale(z, z);
      const steel = c.createLinearGradient(-28, 0, 28, 0);
      steel.addColorStop(0, '#626d6b');
      steel.addColorStop(0.3, '#f2f0dc');
      steel.addColorStop(0.55, '#bdc8bd');
      steel.addColorStop(1, '#424e50');
      c.shadowColor = '#16252377';
      c.shadowBlur = 8;
      c.shadowOffsetY = 4;
      c.fillStyle = steel;
      c.strokeStyle = '#455250';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(-30, -26, 60, 60, 12);
      c.fill();
      c.stroke();
      c.shadowColor = 'transparent';
      c.beginPath();
      c.roundRect(-18, 12, 36, 91, 13);
      c.fill();
      c.stroke();
      c.fillStyle = '#4c625d';
      c.beginPath();
      c.roundRect(-8, 65, 16, 25, 7);
      c.fill();
      c.strokeStyle = '#ffffffaa';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-11, 32);
      c.lineTo(-11, 56);
      c.stroke();
      c.restore();
      if (this.flash > 0) {
        c.globalAlpha = Math.min(1, this.flash * 2);
        c.font = '600 52px Fredoka,sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#fff6df';
        c.fillText(String(this.count), cx, this.h * 0.4);
        c.globalAlpha = 1;
      }
    }
    down(p) {
      const g = this.geometry();
      if (!this.complete && Math.hypot(p.x - g.cx, p.y - g.y - 35 * g.scale) < 85 * g.scale) {
        this.pointer = p.id;
        this.dragOffset = p.y - g.y;
      }
    }
    move(p) {
      if (p.id !== this.pointer || this.complete) return;
      const g = this.geometry(),
        value =
          p.y < 35
            ? 1
            : Math.max(0, Math.min(1, (g.bottom - p.y + this.dragOffset) / (g.bottom - g.top)));
      if (Math.abs(value - this.progress) > 0.004) this.sound.zip();
      this.progress = value;
      if (value > 0.98) {
        this.count++;
        this.complete = true;
        this.flash = 1.1;
        this.pointer = null;
        this.sound.pulse(2);
      }
    }
    up(p) {
      if (p.id === this.pointer) this.pointer = null;
    }
  }
  const silent = { packaging() {}, zip() {}, pulse() {}, chop() {} };
  function wrapPreview(c, w, h) {
    const t = new Packaging(c, w, h, {}, silent);
    t.cells[25] = true;
    t.cells[32] = true;
    t.depth[25] = 1;
    t.depth[32] = 1;
    t.draw();
  }
  function zipperPreview(c, w, h) {
    const t = new Zipper(c, w, h, {}, silent);
    t.progress = 0.5;
    t.draw();
  }
  Object.assign(window.StillToys, {
    Packaging,
    Zipper,
    wrapPreview,
    zipperPreview,
  });
})();
