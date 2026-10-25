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
      this.next = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    geometry() {
      const gap = Math.min((this.w - 24) / 6, (this.h - 80) / 10);
      return { gap, x: this.w / 2 - gap * 2.5, y: this.h / 2 - gap * 4.5 };
    }
    update(dt) {
      if (this.cells.every(Boolean)) {
        this.next += dt;
        if (this.next > 0.6) this.reset();
      }
    }
    draw() {
      const c = this.ctx,
        { gap, x, y } = this.geometry();
      c.fillStyle = '#d7ded6';
      c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = '#edf1e9';
      c.beginPath();
      c.roundRect(7, 20, this.w - 14, this.h - 40, 14);
      c.fill();
      c.strokeStyle = '#9aaea53b';
      c.lineWidth = 0.7;
      for (let i = 0; i < 28; i++) {
        const yy = (i / 28) * this.h;
        c.beginPath();
        c.moveTo(8, yy);
        c.lineTo(this.w - 8, yy + 14);
        c.stroke();
      }
      for (let i = 0; i < 60; i++) {
        const bx = x + (i % 6) * gap,
          by = y + Math.floor(i / 6) * gap,
          r = gap * 0.41;
        const g = c.createRadialGradient(bx - r * 0.25, by - r * 0.3, 1, bx, by, r);
        g.addColorStop(0, this.cells[i] ? '#bccac5' : '#ffffff');
        g.addColorStop(0.65, this.cells[i] ? '#d9e1dc' : '#dce8e3');
        g.addColorStop(1, '#92aaa5');
        c.fillStyle = g;
        c.beginPath();
        c.arc(bx, by, r, 0, TAU);
        c.fill();
        c.strokeStyle = '#ffffffd0';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(bx, by, r * 0.85, 3.5, 5.2);
        c.stroke();
        if (this.cells[i]) {
          c.strokeStyle = '#839b9777';
          c.beginPath();
          c.moveTo(bx - r * 0.5, by - r * 0.2);
          c.lineTo(bx + r * 0.4, by + r * 0.3);
          c.moveTo(bx - r * 0.2, by + r * 0.5);
          c.lineTo(bx + r * 0.2, by - r * 0.4);
          c.stroke();
        }
      }
    }
    press(p) {
      const { gap, x, y } = this.geometry(),
        col = Math.round((p.x - x) / gap),
        row = Math.round((p.y - y) / gap);
      if (col < 0 || col > 5 || row < 0 || row > 9) return;
      const i = row * 6 + col;
      if (Math.hypot(p.x - (x + col * gap), p.y - (y + row * gap)) > gap * 0.45 || this.cells[i])
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
      this.count = 0;
      this.color = 0;
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
      const top = this.h * 0.16,
        bottom = this.h * 0.84;
      return { top, bottom, y: bottom - this.progress * (bottom - top), cx: this.w / 2 };
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
        { top, bottom, y, cx } = this.geometry(),
        colors = [
          ['#927eab', '#c0accd'],
          ['#769d91', '#b1c5ad'],
          ['#bd8b82', '#e1b8a0'],
        ],
        palette = colors[this.color];
      c.fillStyle = palette[0];
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#ffffff12';
      c.lineWidth = 1;
      for (let i = 0; i < this.w; i += 6) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, this.h);
        c.stroke();
      }
      c.fillStyle = '#23393b';
      c.beginPath();
      c.moveTo(cx - 4, bottom);
      c.lineTo(cx - 4, y);
      c.lineTo(cx - this.w * 0.21, top);
      c.lineTo(cx + this.w * 0.21, top);
      c.lineTo(cx + 4, y);
      c.lineTo(cx + 4, bottom);
      c.closePath();
      c.fill();
      for (let yy = top; yy < bottom; yy += 10) {
        const open = yy < y ? ((y - yy) / Math.max(1, y - top)) * this.w * 0.21 : 0;
        c.fillStyle = '#d9d6bc';
        c.fillRect(cx - open - 13, yy, 12, 6);
        c.fillRect(cx + open + 1, yy + 4, 12, 6);
        c.fillStyle = palette[1];
        c.fillRect(cx - open - 24, yy, 8, 8);
        c.fillRect(cx + open + 16, yy, 8, 8);
      }
      c.fillStyle = '#e0ded0';
      c.strokeStyle = '#64706c';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(cx - 17, y - 16, 34, 34, 7);
      c.fill();
      c.stroke();
      c.fillStyle = '#adb9b0';
      c.beginPath();
      c.roundRect(cx - 10, y + 5, 20, 54, 8);
      c.fill();
      c.stroke();
      c.fillStyle = '#586e68';
      c.beginPath();
      c.roundRect(cx - 4, y + 36, 8, 12, 3);
      c.fill();
      if (this.flash > 0) {
        c.globalAlpha = Math.min(1, this.flash * 2);
        c.font = '600 52px Fredoka, sans-serif';
        c.textAlign = 'center';
        c.fillStyle = '#fff6df';
        c.fillText(String(this.count), cx, this.h * 0.4);
        c.globalAlpha = 1;
      }
    }
    down(p) {
      const g = this.geometry();
      if (!this.complete && Math.hypot(p.x - g.cx, p.y - g.y - 20) < 58) this.pointer = p.id;
    }
    move(p) {
      if (p.id !== this.pointer || this.complete) return;
      const g = this.geometry(),
        value = Math.max(0, Math.min(1, (g.bottom - (p.y - 20)) / (g.bottom - g.top)));
      if (Math.abs(value - this.progress) > 0.006) this.sound.zip();
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
  class Carrots {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.slices = [];
      this.phase = 1;
      this.cut = false;
      this.feed = 0;
      this.cuts = 0;
      this.lastX = null;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt) {
      if (this.phase < 1) {
        const before = this.phase;
        this.phase = Math.min(1, this.phase + dt * 4.5);
        if (before < 0.45 && this.phase >= 0.45) {
          this.cut = true;
          this.cuts++;
          this.feed += 18;
          this.slices.push({
            x: this.w * 0.59,
            y: this.h * 0.5,
            vx: 65 + Math.random() * 90,
            vy: -100,
            a: 0,
            spin: Math.random() * 7,
          });
          this.sound.chop();
        }
        if (this.phase === 1 && this.cuts >= 10) {
          this.feed = 0;
          this.cuts = 0;
        }
      }
      for (const s of this.slices) {
        s.vy += 650 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.a += s.spin * dt;
      }
      this.slices = this.slices.filter((s) => s.y < this.h + 40);
    }
    draw() {
      const c = this.ctx,
        y = this.h * 0.5,
        scale = Math.min(this.w * 0.12, this.h * 0.07),
        x = this.w * 0.58;
      c.fillStyle = '#d5b78b';
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#8b653928';
      c.lineWidth = 1;
      for (let i = 0; i < 22; i++) {
        const yy = (i / 22) * this.h;
        c.beginPath();
        c.moveTo(0, yy);
        c.bezierCurveTo(this.w * 0.35, yy + 17, this.w * 0.7, yy - 12, this.w, yy + 4);
        c.stroke();
      }
      c.fillStyle = '#b89464';
      c.beginPath();
      c.roundRect(this.w * 0.06, this.h * 0.23, this.w * 0.88, this.h * 0.55, 24);
      c.fill();
      c.fillStyle = '#d9bb8d';
      c.beginPath();
      c.roundRect(this.w * 0.085, this.h * 0.245, this.w * 0.83, this.h * 0.51, 20);
      c.fill();
      const left = this.w * 0.13 + this.feed * 0.22,
        right = x + 25,
        g = c.createLinearGradient(0, y - scale, 0, y + scale);
      g.addColorStop(0, '#ffb244');
      g.addColorStop(0.45, '#f87a24');
      g.addColorStop(1, '#bd4719');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(left, y);
      c.bezierCurveTo(left + 30, y - scale, right - 20, y - scale, right, y - scale * 0.72);
      c.lineTo(right, y + scale * 0.72);
      c.bezierCurveTo(right - 20, y + scale, left + 30, y + scale, left, y);
      c.fill();
      c.strokeStyle = '#b9531f99';
      c.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const xx = left + ((right - left) * i) / 7;
        c.beginPath();
        c.moveTo(xx, y - scale * 0.5);
        c.lineTo(xx + 4, y - scale * 0.1);
        c.stroke();
      }
      for (const s of this.slices) {
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.a);
        c.fillStyle = '#e76d22';
        c.beginPath();
        c.ellipse(0, 0, 10, scale * 0.76, 0, 0, TAU);
        c.fill();
        c.strokeStyle = '#ffba4b';
        c.lineWidth = 4;
        c.beginPath();
        c.ellipse(0, 0, 6, scale * 0.55, 0, 0, TAU);
        c.stroke();
        c.restore();
      }
      const travel = this.phase < 1 ? Math.sin(this.phase * Math.PI) * 90 : 0,
        bladeY = y - scale - 105 + travel,
        steel = c.createLinearGradient(x - 32, 0, x + 12, 0);
      steel.addColorStop(0, '#b6c6c7');
      steel.addColorStop(0.65, '#f5ffff');
      steel.addColorStop(1, '#6b858b');
      c.fillStyle = steel;
      c.beginPath();
      c.moveTo(x - 27, bladeY);
      c.lineTo(x + 13, bladeY + 12);
      c.lineTo(x + 13, bladeY + 118);
      c.lineTo(x - 27, bladeY + 118);
      c.closePath();
      c.fill();
      c.strokeStyle = '#617d80';
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = '#79513c';
      c.beginPath();
      c.roundRect(x - 29, bladeY - 62, 40, 65, 9);
      c.fill();
      c.fillStyle = '#c8a170';
      c.beginPath();
      c.arc(x - 10, bladeY - 40, 3, 0, TAU);
      c.arc(x - 10, bladeY - 15, 3, 0, TAU);
      c.fill();
    }
    down(p) {
      if (this.phase === 1) {
        this.phase = 0;
        this.cut = false;
      }
      this.lastX = p.x;
    }
    move(p) {
      if (this.lastX !== null && Math.abs(p.x - this.lastX) > 28 && this.phase === 1) this.down(p);
    }
    up(p, remaining, cancelled) {
      this.lastX = null;
      if (cancelled) this.phase = 1;
    }
  }
  const silent = { packaging() {}, zip() {}, pulse() {}, chop() {} };
  function wrapPreview(c, w, h) {
    const t = new Packaging(c, w, h, {}, silent);
    t.cells[25] = true;
    t.cells[32] = true;
    t.draw();
  }
  function zipperPreview(c, w, h) {
    const t = new Zipper(c, w, h, {}, silent);
    t.progress = 0.5;
    t.draw();
  }
  function carrotPreview(c, w, h) {
    new Carrots(c, w, h, {}, silent).draw();
  }
  Object.assign(window.StillToys, {
    Packaging,
    Zipper,
    Carrots,
    wrapPreview,
    zipperPreview,
    carrotPreview,
  });
})();
