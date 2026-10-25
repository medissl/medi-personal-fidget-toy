(() => {
  'use strict';
  const TAU = Math.PI * 2;
  function bubble(c, x, y, r, pressed, hue = 148) {
    c.save();
    c.shadowColor = '#071a174a';
    c.shadowBlur = 10;
    c.shadowOffsetY = pressed ? 1 : 5;
    const g = c.createRadialGradient(x - r * 0.25, y - r * 0.32, 1, x, y, r);
    g.addColorStop(0, `hsl(${hue} 23% ${pressed ? 38 : 78}%)`);
    g.addColorStop(0.68, `hsl(${hue} 26% ${pressed ? 43 : 59}%)`);
    g.addColorStop(1, `hsl(${hue} 24% ${pressed ? 58 : 40}%)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = pressed ? '#d8edda25' : '#dff1df70';
    c.lineWidth = 1.3;
    c.beginPath();
    c.arc(x, y, r * 0.88, Math.PI * 1.12, Math.PI * 1.7);
    c.stroke();
    c.restore();
  }
  class Bubbles {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.cells = Array.from({ length: 30 }, () => ({ pressed: false, bounce: 0 }));
      this.visited = new Map();
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
    }
    layout() {
      const gap = Math.max(28, Math.min((this.w - 48) / 5, (this.h - 320) / 6, 74));
      return { gap, x: this.w / 2 - gap * 2, y: this.h * 0.46 - gap * 2.5 };
    }
    update(dt) {
      for (const cell of this.cells) cell.bounce = Math.max(0, cell.bounce - dt * 5);
    }
    draw() {
      const c = this.ctx,
        { gap, x, y } = this.layout();
      c.fillStyle = '#223a35';
      c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = '#496c5c';
      c.beginPath();
      c.roundRect(x - gap * 0.65, y - gap * 0.65, gap * 5.3, gap * 6.3, gap * 0.5);
      c.fill();
      c.strokeStyle = '#9cbf9c22';
      c.lineWidth = 2;
      c.stroke();
      for (let i = 0; i < 30; i++) {
        const cell = this.cells[i];
        bubble(
          c,
          x + (i % 5) * gap,
          y + Math.floor(i / 5) * gap,
          gap * (0.37 - cell.bounce * 0.025),
          cell.pressed,
          135 + Math.floor(i / 5) * 5
        );
      }
    }
    press(p) {
      const { gap, x, y } = this.layout();
      const col = Math.round((p.x - x) / gap),
        row = Math.round((p.y - y) / gap);
      if (col < 0 || col > 4 || row < 0 || row > 5) {
        this.visited.delete(p.id);
        return;
      }
      const index = row * 5 + col;
      if (
        Math.hypot(p.x - (x + col * gap), p.y - (y + row * gap)) > gap * 0.41 ||
        this.visited.get(p.id) === index
      )
        return;
      this.visited.set(p.id, index);
      const cell = this.cells[index];
      cell.pressed = !cell.pressed;
      cell.bounce = 1;
      this.sound.pop(cell.pressed);
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
    key(event) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const cell =
          this.cells[
            this.cells.findIndex((c) => !c.pressed) < 0
              ? 0
              : this.cells.findIndex((c) => !c.pressed)
          ];
        cell.pressed = !cell.pressed;
        cell.bounce = 1;
        this.sound.pop(cell.pressed);
      }
    }
  }
  function drawDial(c, x, y, r, angle, active) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = '#d8c5a246';
    c.lineWidth = 1.3;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      const inner = r * (i % 4 === 0 ? 1.13 : 1.18);
      c.beginPath();
      c.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      c.lineTo(Math.cos(a) * r * 1.23, Math.sin(a) * r * 1.23);
      c.stroke();
    }
    c.shadowColor = '#0007';
    c.shadowBlur = 25;
    c.shadowOffsetY = 12;
    const g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#d2b898');
    g.addColorStop(0.45, '#9b8166');
    g.addColorStop(1, '#594c42');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.shadowColor = 'transparent';
    c.rotate(angle);
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU;
      c.strokeStyle = i % 2 ? '#e9d4b340' : '#2d241d66';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.89, Math.sin(a) * r * 0.89);
      c.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98);
      c.stroke();
    }
    const face = c.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r * 0.85);
    face.addColorStop(0, '#bca387');
    face.addColorStop(1, '#806b56');
    c.fillStyle = face;
    c.beginPath();
    c.arc(0, 0, r * 0.85, 0, TAU);
    c.fill();
    c.strokeStyle = active ? '#f4e7ce' : '#ded0b7';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, -r * 0.58);
    c.lineTo(0, -r * 0.73);
    c.stroke();
    c.restore();
  }
  class Dial {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.angle = 0;
      this.previous = null;
      this.pointer = null;
      this.active = false;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.previous = null;
      this.pointer = null;
    }
    geometry() {
      return {
        x: this.w / 2,
        y: this.h * 0.44,
        r: Math.max(12, Math.min(this.w * 0.31, (this.h - 300) * 0.35, 170)),
      };
    }
    update() {}
    draw() {
      const c = this.ctx,
        { x, y, r } = this.geometry();
      c.fillStyle = '#282a2b';
      c.fillRect(0, 0, this.w, this.h);
      drawDial(c, x, y, r, this.angle, this.active);
      c.fillStyle = '#bab5ab';
      c.font = 'italic 15px Georgia';
      c.textAlign = 'center';
      c.fillText('one little click at a time', x, y + r * 1.68);
    }
    down(p) {
      const { x, y, r } = this.geometry();
      if (this.pointer !== null || Math.hypot(p.x - x, p.y - y) > r * 1.3) return;
      this.pointer = p.id;
      this.previous = Math.atan2(p.y - y, p.x - x);
      this.active = true;
      this.sound.pulse(1);
    }
    move(p) {
      if (this.previous === null || p.id !== this.pointer) return;
      const { x, y } = this.geometry();
      const angle = Math.atan2(p.y - y, p.x - x);
      const delta = Math.atan2(Math.sin(angle - this.previous), Math.cos(angle - this.previous));
      const oldTick = Math.floor((this.angle / TAU) * 48);
      this.angle += delta;
      this.previous = angle;
      if (Math.floor((this.angle / TAU) * 48) !== oldTick) this.sound.click();
    }
    up(p) {
      if (p.id === this.pointer) {
        this.previous = null;
        this.pointer = null;
        this.active = false;
      }
    }
    key(event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.angle += ((event.key === 'ArrowLeft' ? -1 : 1) * TAU) / 48;
        this.sound.click();
      }
    }
  }
  function bubblePreview(c, w, h) {
    c.fillStyle = '#496c5c';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 6; x++)
        bubble(
          c,
          w / 2 + (x - 2.5) * 51,
          h / 2 + (y - 1) * 51 + 12,
          19,
          (x + y * 3) % 5 === 0,
          139 + y * 6
        );
  }
  function dialPreview(c, w, h) {
    c.fillStyle = '#333332';
    c.fillRect(0, 0, w, h);
    drawDial(c, w / 2, h * 0.62, h * 0.37, 0.6, false);
  }
  Object.assign(window.StillToys, { Bubbles, Dial, bubblePreview, dialPreview });
})();
