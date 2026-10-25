(() => {
  'use strict';
  const TAU = Math.PI * 2;
  function sphere(c, x, y, r) {
    const g = c.createRadialGradient(x - r * 0.32, y - r * 0.42, r * 0.02, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.16, '#eef5f2');
    g.addColorStop(0.35, '#a9bcc0');
    g.addColorStop(0.6, '#576f78');
    g.addColorStop(0.85, '#253f49');
    g.addColorStop(1, '#b6c3bf');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.strokeStyle = '#e9f1e455';
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x, y, r * 0.9, 0.1, 2.2);
    c.stroke();
  }
  class MetalBalls {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.gx = 0;
      this.gy = 8;
      this.reset();
    }
    reset() {
      this.dragged = new Map();
      const count = Math.min(72, Math.max(24, Math.floor((this.w * this.h) / 5000)));
      this.balls = Array.from({ length: count }, (_, i) => ({
        x: 25 + Math.random() * Math.max(1, this.w - 50),
        y: 60 + Math.random() * Math.max(1, this.h - 120),
        r: Math.min(22, Math.max(11, this.w / 24)) + (i % 3) * 2,
        vx: (Math.random() - 0.5) * 35,
        vy: (Math.random() - 0.5) * 35,
        held: false,
      }));
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    setTilt(x, y) {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        this.gx = Math.max(-10, Math.min(10, x));
        this.gy = Math.max(-10, Math.min(10, y));
      }
    }
    update(dt) {
      const steps = Math.max(1, Math.ceil(dt * 120)),
        step = Math.min(dt, 0.04) / steps;
      let strongest = 0;
      for (let n = 0; n < steps; n++) {
        for (const b of this.balls) {
          if (b.held) {
            const drag = Array.from(this.dragged.values()).find((d) => d.ball === b);
            if (drag) {
              b.vx = Math.max(-900, Math.min(900, (drag.x - b.x) * 20));
              b.vy = Math.max(-900, Math.min(900, (drag.y - b.y) * 20));
              b.x += b.vx * step;
              b.y += b.vy * step;
            }
          } else {
            b.vx = (b.vx + this.gx * 65 * step) * Math.pow(0.994, step * 60);
            b.vy = (b.vy + this.gy * 65 * step) * Math.pow(0.994, step * 60);
            b.x += b.vx * step;
            b.y += b.vy * step;
          }
          if (b.x < b.r) {
            strongest = Math.max(strongest, Math.abs(b.vx));
            b.x = b.r;
            b.vx = Math.abs(b.vx) * 0.7;
          }
          if (b.x > this.w - b.r) {
            strongest = Math.max(strongest, Math.abs(b.vx));
            b.x = this.w - b.r;
            b.vx = -Math.abs(b.vx) * 0.7;
          }
          if (b.y < b.r) {
            b.y = b.r;
            b.vy = Math.abs(b.vy) * 0.7;
          }
          if (b.y > this.h - b.r) {
            strongest = Math.max(strongest, Math.abs(b.vy));
            b.y = this.h - b.r;
            b.vy = -Math.abs(b.vy) * 0.68;
            b.vx *= 0.97;
          }
        }
        for (let i = 0; i < this.balls.length; i++)
          for (let j = i + 1; j < this.balls.length; j++) {
            const a = this.balls[i],
              b = this.balls[j],
              dx = b.x - a.x,
              dy = b.y - a.y,
              sum = a.r + b.r,
              d = Math.max(0.001, Math.hypot(dx, dy));
            if (d >= sum) continue;
            const nx = d < 0.01 ? 1 : dx / d,
              ny = d < 0.01 ? 0 : dy / d,
              ia = a.held ? 0 : 1,
              ib = b.held ? 0 : 1,
              total = ia + ib;
            if (!total) continue;
            const overlap = (sum - d) * 0.85;
            a.x -= (nx * overlap * ia) / total;
            a.y -= (ny * overlap * ia) / total;
            b.x += (nx * overlap * ib) / total;
            b.y += (ny * overlap * ib) / total;
            const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (speed < 0) {
              strongest = Math.max(strongest, -speed);
              const impulse = (-(1 + 0.72) * speed) / total;
              a.vx -= impulse * nx * ia;
              a.vy -= impulse * ny * ia;
              b.vx += impulse * nx * ib;
              b.vy += impulse * ny * ib;
            }
          }
      }
      for (const b of this.balls) {
        b.x = Math.max(b.r, Math.min(this.w - b.r, b.x));
        b.y = Math.max(b.r, Math.min(this.h - b.r, b.y));
        b.vx = Math.max(-1200, Math.min(1200, b.vx));
        b.vy = Math.max(-1200, Math.min(1200, b.vy));
      }
      if (strongest > 75) this.sound.metal(Math.min(1, strongest / 500));
    }
    draw() {
      const c = this.ctx,
        g = c.createLinearGradient(0, 0, this.w, this.h);
      g.addColorStop(0, '#d9dfd6');
      g.addColorStop(1, '#aabdb5');
      c.fillStyle = g;
      c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = '#435e5a';
      c.beginPath();
      c.roundRect(4, 4, this.w - 8, this.h - 8, 24);
      c.fill();
      c.fillStyle = '#b9c9bd';
      c.beginPath();
      c.roundRect(11, 11, this.w - 22, this.h - 22, 19);
      c.fill();
      for (const b of this.balls) {
        c.shadowColor = '#243c3c66';
        c.shadowBlur = 7;
        c.shadowOffsetY = 4;
        sphere(c, b.x, b.y, b.r);
        c.shadowColor = 'transparent';
        c.shadowOffsetY = 0;
      }
    }
    down(p) {
      let nearest = null,
        distance = 45;
      for (const b of this.balls) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < Math.max(32, b.r + 14) && d < distance && !b.held) {
          nearest = b;
          distance = d;
        }
      }
      if (nearest) {
        nearest.held = true;
        this.dragged.set(p.id, { ball: nearest, x: p.x, y: p.y });
        this.sound.pulse(1);
      }
    }
    move(p) {
      const drag = this.dragged.get(p.id);
      if (drag) {
        drag.x = p.x;
        drag.y = p.y;
      }
    }
    up(p) {
      const drag = this.dragged.get(p.id);
      if (drag) drag.ball.held = false;
      this.dragged.delete(p.id);
    }
  }
  class GlassBreak {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    geometry() {
      return { x: this.w * 0.1, y: this.h * 0.2, w: this.w * 0.8, h: this.h * 0.43 };
    }
    reset() {
      this.balls = [];
      this.shards = [];
      this.broken = false;
      this.age = 0;
      this.time = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    breakAt(x, y) {
      if (this.broken) return;
      this.broken = true;
      this.age = 0;
      const g = this.geometry(),
        edge = [];
      for (let i = 0; i < 8; i++) {
        edge.push({ x: g.x + (i / 8) * g.w, y: g.y });
        edge.push({ x: g.x + g.w, y: g.y + (i / 8) * g.h });
        edge.push({ x: g.x + (1 - i / 8) * g.w, y: g.y + g.h });
        edge.push({ x: g.x, y: g.y + (1 - i / 8) * g.h });
      }
      edge.sort((a, b) => Math.atan2(a.y - y, a.x - x) - Math.atan2(b.y - y, b.x - x));
      this.shards = edge.map((a, i) => {
        const b = edge[(i + 1) % edge.length],
          cx = (x + a.x + b.x) / 3,
          cy = (y + a.y + b.y) / 3;
        return {
          x: cx,
          y: cy,
          points: [
            { x: x - cx, y: y - cy },
            { x: a.x - cx, y: a.y - cy },
            { x: b.x - cx, y: b.y - cy },
          ],
          vx: (cx - x) * 2 + (Math.random() - 0.5) * 90,
          vy: (cy - y) * 1.2 - 100 - Math.random() * 150,
          a: 0,
          spin: (Math.random() - 0.5) * 5,
        };
      });
      this.sound.glass();
      this.sound.pulse(2);
    }
    update(dt) {
      this.time += dt;
      if (this.broken) this.age += dt;
      const speed = this.broken && this.age < 1.1 ? 0.2 : 1,
        step = dt * speed;
      for (const b of this.balls) {
        if (!b.hit) {
          b.age += dt;
          const f = Math.min(1, b.age / 0.28);
          b.x = b.startX + (b.targetX - b.startX) * f;
          b.y = b.startY + (b.targetY - b.startY) * f;
          b.r = 21 - f * 9;
          if (f === 1) {
            b.hit = true;
            b.vx = (Math.random() - 0.5) * 100;
            b.vy = -100;
            this.breakAt(b.x, b.y);
          }
        } else {
          b.vy += 570 * step;
          b.x += b.vx * step;
          b.y += b.vy * step;
        }
      }
      for (const p of this.shards) {
        p.vy += 650 * step;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.a += p.spin * step;
      }
      this.balls = this.balls.filter((b) => b.y < this.h + 50);
      if (this.broken && this.age > 3.4) this.reset();
    }
    draw() {
      const c = this.ctx,
        g = this.geometry();
      c.fillStyle = '#e3d8c2';
      c.fillRect(0, 0, this.w, this.h);
      c.strokeStyle = '#a47c52';
      c.lineWidth = 12;
      c.lineJoin = 'round';
      c.strokeRect(g.x - 5, g.y - 5, g.w + 10, g.h + 10);
      if (!this.broken) {
        const pane = c.createLinearGradient(g.x, g.y, g.x + g.w, g.y + g.h);
        pane.addColorStop(0, '#c6e5e8c9');
        pane.addColorStop(0.5, '#e9ffff72');
        pane.addColorStop(1, '#8bbcc5ba');
        c.fillStyle = pane;
        c.fillRect(g.x, g.y, g.w, g.h);
        c.save();
        c.beginPath();
        c.rect(g.x, g.y, g.w, g.h);
        c.clip();
        c.strokeStyle = '#ffffff8c';
        c.lineWidth = this.w * 0.07;
        c.beginPath();
        c.moveTo(g.x + g.w * 0.35, g.y - 20);
        c.lineTo(g.x + g.w * 0.05, g.y + g.h + 20);
        c.moveTo(g.x + g.w * 0.75, g.y - 20);
        c.lineTo(g.x + g.w * 0.45, g.y + g.h + 20);
        c.stroke();
        c.restore();
      }
      for (const p of this.shards) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.a);
        c.fillStyle = '#b6dce6b5';
        c.strokeStyle = '#f3ffffdd';
        c.lineWidth = 1;
        c.beginPath();
        p.points.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.closePath();
        c.fill();
        c.stroke();
        c.restore();
      }
      for (const b of this.balls) sphere(c, b.x, b.y, b.r);
      if (!this.balls.length && !this.broken) sphere(c, this.w / 2, this.h * 0.87, 21);
    }
    down(p) {
      const g = this.geometry();
      if (this.balls.length >= 8) return;
      this.balls.push({
        startX: this.w / 2,
        startY: this.h * 0.87,
        x: this.w / 2,
        y: this.h * 0.87,
        targetX: Math.max(g.x + 10, Math.min(g.x + g.w - 10, p.x)),
        targetY: Math.max(g.y + 10, Math.min(g.y + g.h - 10, p.y)),
        age: 0,
        r: 21,
        hit: false,
      });
    }
  }
  const silent = { pulse() {}, metal() {}, glass() {} };
  function metalPreview(c, w, h) {
    const toy = new MetalBalls(c, w, h, {}, silent);
    toy.draw();
  }
  function glassPreview(c, w, h) {
    new GlassBreak(c, w, h, {}, silent).draw();
  }
  Object.assign(window.StillToys, { MetalBalls, GlassBreak, metalPreview, glassPreview });
})();
