(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const chromeSprites = new Map();
  function sphere(c, x, y, r, rotation = 0) {
    const radius = Math.round(r * 2) / 2,
      key = radius;
    let canvas = chromeSprites.get(key);
    if (!canvas) {
      const size = Math.ceil(radius * 4 + 8);
      canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const cc = canvas.getContext('2d'),
        image = cc.createImageData(size, size),
        data = image.data,
        mid = size / 2;
      for (let yy = 0; yy < size; yy++)
        for (let xx = 0; xx < size; xx++) {
          const nx = (xx + 0.5 - mid) / (radius * 2),
            ny = (yy + 0.5 - mid) / (radius * 2),
            d = nx * nx + ny * ny;
          if (d >= 1) continue;
          const nz = Math.sqrt(1 - d),
            rx = 2 * nx * nz,
            ry = 2 * ny * nz,
            rz = 2 * nz * nz - 1;
          // A curved reflected studio environment, with a broad softbox and dark floor.
          const window = Math.exp(-((rx + 0.42) ** 8 / 0.09 + (ry + 0.45) ** 8 / 0.04)),
            strip = Math.exp(-((rx - 0.6) ** 2 / 0.018 + (ry + 0.1) ** 2 / 0.6)),
            horizon = Math.tanh((ry - 0.14 + rx * 0.08) * 16),
            brushed = 0;
          let light =
            0.18 +
            0.24 * (1 - horizon) +
            window * 0.65 +
            strip * 0.6 +
            Math.exp(-((ry - 0.67) ** 2) / 0.025) * 0.36 +
            brushed;
          light = light * (0.72 + 0.28 * nz) + (1 - nz) ** 4 * 0.25;
          const i = (yy * size + xx) * 4,
            value = Math.max(0, Math.min(255, light * 255));
          data[i] = value;
          data[i + 1] = Math.min(255, value * 1.015);
          data[i + 2] = Math.min(255, value * 1.025);
          data[i + 3] = Math.min(255, (1 - Math.sqrt(d)) * radius * 2 * 255);
        }
      cc.putImageData(image, 0, 0);
      chromeSprites.set(key, canvas);
      if (chromeSprites.size > 180) chromeSprites.delete(chromeSprites.keys().next().value);
    }
    c.drawImage(
      canvas,
      x - canvas.width / 4,
      y - canvas.height / 4,
      canvas.width / 2,
      canvas.height / 2
    );
    if (rotation) {
      // The reflected light stays fixed in the room; small surface scuffs roll.
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      c.strokeStyle = '#9da5a529';
      c.lineWidth = 0.55;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(0, 0, r * (0.4 + i * 0.18), r * (0.1 + i * 0.04), 0.4, 0.3, 1.8);
        c.stroke();
      }
      c.restore();
    }
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
      const count = 9,
        radius = Math.min(this.w * 0.115, this.h * 0.105, 62);
      this.balls = Array.from({ length: count }, (_, i) => ({
        x: this.w / 2 + ((i % 3) - 1) * radius * 2.3,
        y: this.h * 0.35 + Math.floor(i / 3) * radius * 2.3,
        r: radius,
        vx: 0,
        vy: 0,
        rotation: i * 0.37,
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
          b.rotation += (Math.hypot(b.vx, b.vy) * step) / b.r;
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
        sphere(c, b.x, b.y, b.r, b.rotation);
        c.shadowColor = 'transparent';
        c.shadowOffsetY = 0;
      }
    }
    down(p) {
      let nearest = null,
        distance = 90;
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
  const glassTypes = [
    {
      kind: 'tumbler',
      height: 0.67,
      profile: [
        [0, 0.95],
        [0.08, 1],
        [0.93, 0.82],
        [1, 0.74],
      ],
    },
    {
      kind: 'wine',
      height: 1.1,
      profile: [
        [0, 0.7],
        [0.15, 1],
        [0.36, 0.88],
        [0.5, 0.14],
        [0.93, 0.09],
        [0.95, 0.7],
        [1, 0.7],
      ],
    },
    {
      kind: 'round-vase',
      height: 0.93,
      profile: [
        [0, 0.35],
        [0.2, 0.35],
        [0.3, 0.8],
        [0.55, 1],
        [0.8, 0.9],
        [1, 0.45],
      ],
    },
    {
      kind: 'flute',
      height: 1.18,
      profile: [
        [0, 0.42],
        [0.1, 0.46],
        [0.6, 0.3],
        [0.68, 0.08],
        [0.95, 0.06],
        [0.97, 0.5],
        [1, 0.5],
      ],
    },
    {
      kind: 'mug',
      height: 0.7,
      handle: true,
      profile: [
        [0, 0.85],
        [0.05, 0.9],
        [0.9, 0.9],
        [1, 0.7],
      ],
    },
    {
      kind: 'flared-vase',
      height: 1.05,
      profile: [
        [0, 0.8],
        [0.1, 0.72],
        [0.35, 0.4],
        [0.65, 0.55],
        [1, 0.8],
      ],
    },
    {
      kind: 'bowl',
      height: 0.48,
      profile: [
        [0, 1],
        [0.12, 1],
        [0.7, 0.7],
        [1, 0.4],
      ],
    },
    {
      kind: 'decanter',
      height: 0.96,
      stopper: true,
      profile: [
        [0, 0.22],
        [0.25, 0.22],
        [0.35, 0.55],
        [0.5, 0.9],
        [0.9, 0.85],
        [1, 0.65],
      ],
    },
  ];
  class GlassBreak {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.objects = glassTypes.map((type, i) => {
        const scale = i < 4 ? 0.78 : 1.06;
        return {
          ...type,
          x: this.w * (0.14 + (i % 4) * 0.24),
          y: this.h * (i < 4 ? 0.45 : 0.78),
          r: this.w * 0.078 * scale,
          h: Math.min(this.h * 0.2, this.w * 0.44) * type.height * scale,
          broken: false,
          tint: [185, 195, 165, 205, 178, 32, 192, 260][i],
          facet: [true, false, false, true, false, true, false, true][i],
          offset: -this.h,
          landing: i * 0.075,
        };
      });
      this.balls = [];
      this.shards = [];
      this.broken = false;
      this.age = 0;
      this.slow = 0;
      this.spawnAge = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    radiusAt(object, t) {
      const points = object.profile;
      for (let i = 1; i < points.length; i++)
        if (t <= points[i][0]) {
          const a = points[i - 1],
            b = points[i],
            u = (t - a[0]) / (b[0] - a[0]),
            smooth = u * u * (3 - 2 * u);
          return a[1] + (b[1] - a[1]) * smooth;
        }
      return points[points.length - 1][1];
    }
    polygon(object) {
      const c = this.ctx,
        top = object.y - object.h;
      c.beginPath();
      for (let i = 0; i <= 64; i++) {
        const t = i / 64,
          r = this.radiusAt(object, t);
        if (i) c.lineTo(object.x - r * object.r, top + t * object.h);
        else c.moveTo(object.x - r * object.r, top + t * object.h);
      }
      for (let i = 64; i >= 0; i--) {
        const t = i / 64,
          r = this.radiusAt(object, t);
        c.lineTo(object.x + r * object.r, top + t * object.h);
      }
      c.closePath();
    }
    breakAt(x, y, index) {
      const object = this.objects[index];
      if (!object || object.broken) return;
      object.broken = true;
      const top = object.y - object.h;
      const triangle = (points) => {
        const cx = points.reduce((s, p) => s + p.x, 0) / 3,
          cy = points.reduce((s, p) => s + p.y, 0) / 3;
        this.shards.push({
          x: cx,
          y: cy,
          points: points.map((p) => ({ x: p.x - cx, y: p.y - cy })),
          vx: (cx - x) * 1.8 + (Math.random() - 0.5) * 95,
          vy: -70 - Math.random() * 150,
          a: 0,
          spin: (Math.random() - 0.5) * 7,
          floor: object.y + 12 + Math.random() * 45,
          rest: false,
        });
      };
      const rows = 13,
        cols = 4,
        mesh = Array.from({ length: rows + 1 }, (_, row) =>
          Array.from({ length: cols + 1 }, (_, col) => {
            const t =
                row === 0 ? 0 : row === rows ? 1 : (row + (Math.random() - 0.5) * 0.45) / rows,
              u =
                col === 0
                  ? -1
                  : col === cols
                    ? 1
                    : -1 + ((col + (Math.random() - 0.5) * 0.65) * 2) / cols;
            return { x: object.x + this.radiusAt(object, t) * object.r * u, y: top + t * object.h };
          })
        );
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols; col++) {
          const p = mesh[row][col],
            q = mesh[row][col + 1],
            r = mesh[row + 1][col + 1],
            s = mesh[row + 1][col];
          if ((row + col) % 2) {
            triangle([p, q, s]);
            triangle([q, r, s]);
          } else {
            triangle([p, q, r]);
            triangle([p, r, s]);
          }
        }
      this.slow = 0.7;
      this.broken = this.objects.every((p) => p.broken);
      this.sound.glass();
      this.sound.pulse(2);
    }
    update(dt) {
      this.spawnAge += dt;
      for (const object of this.objects) {
        const t = Math.max(0, Math.min(1, (this.spawnAge - object.landing) / 0.7));
        // A staggered fall, soft impact, and small settling bounce onto the table.
        object.offset =
          t < 0.7
            ? -this.h * (1 - (t / 0.7) ** 2)
            : (-Math.sin(((t - 0.7) / 0.3) * Math.PI) * 14 * (1 - t)) / 0.3;
      }
      this.slow = Math.max(0, this.slow - dt);
      const step = dt * (this.slow > 0 ? 0.24 : 1);
      for (const ball of this.balls) {
        if (!ball.hit) {
          ball.age += dt;
          const t = Math.min(1, ball.age / 0.28);
          ball.x = ball.startX + (ball.targetX - ball.startX) * t;
          ball.y = ball.startY + (ball.targetY - ball.startY) * t;
          ball.r = 20 - t * 11;
          if (t === 1) {
            ball.hit = true;
            ball.vx = (Math.random() - 0.5) * 80;
            ball.vy = -80;
            if (ball.object >= 0) this.breakAt(ball.x, ball.y, ball.object);
          }
        } else {
          ball.vy += 650 * step;
          ball.x += ball.vx * step;
          ball.y += ball.vy * step;
        }
      }
      for (const p of this.shards) {
        p.vy += 670 * step;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.a += p.spin * step;
        if (p.y > p.floor) {
          p.y = p.floor;
          p.vy = -Math.abs(p.vy) * 0.22;
          p.vx *= 0.8;
          p.spin *= 0.65;
          if (Math.abs(p.vy) < 14) {
            p.vy = 0;
            p.vx *= 0.8;
            p.spin *= 0.8;
          }
        }
      }
      this.balls = this.balls.filter((p) => p.y < this.h + 40);
      if (this.broken) {
        this.age += dt;
        if (this.age > 2) this.reset();
      }
    }
    drawObject(object) {
      const c = this.ctx,
        top = object.y - object.h;
      c.fillStyle = '#1420254d';
      c.beginPath();
      c.ellipse(object.x + 5, object.y + 4, object.r * 1.2, object.r * 0.19, 0, 0, TAU);
      c.fill();
      if (object.handle) {
        c.strokeStyle = '#b5e4ed88';
        c.lineWidth = 7;
        c.beginPath();
        c.ellipse(
          object.x + object.r * 0.9,
          top + object.h * 0.43,
          object.r * 0.6,
          object.h * 0.31,
          0,
          -Math.PI * 0.65,
          Math.PI * 0.65
        );
        c.stroke();
        c.strokeStyle = '#f5ffffc9';
        c.lineWidth = 1.4;
        c.stroke();
      }
      const glass = c.createLinearGradient(object.x - object.r, 0, object.x + object.r, 0);
      glass.addColorStop(0, '#83cad6b0');
      glass.addColorStop(0.14, '#f1ffff55');
      glass.addColorStop(0.35, '#91b6c116');
      glass.addColorStop(0.64, '#c9f5ff26');
      glass.addColorStop(0.84, '#f6ffff80');
      glass.addColorStop(1, '#78c4d3b0');
      this.polygon(object);
      c.fillStyle = glass;
      c.fill();
      c.fillStyle = 'hsla(' + object.tint + ',65%,65%,.14)';
      c.fill();
      c.strokeStyle = '#dbf9ffc9';
      c.lineWidth = 1.3;
      c.stroke();
      c.save();
      c.clip();
      if (object.facet) {
        for (let i = -4; i <= 4; i++) {
          const xx = object.x + (object.r * i) / 5;
          c.strokeStyle = i % 2 ? '#ffffff45' : '#173e4838';
          c.lineWidth = Math.max(1, object.r * 0.06);
          c.beginPath();
          c.moveTo(xx, top);
          c.lineTo(object.x + (xx - object.x) * 0.8, object.y);
          c.stroke();
        }
        c.strokeStyle = '#d6ffff55';
        c.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
          const y = top + object.h * (0.57 + i * 0.1);
          c.beginPath();
          c.ellipse(object.x, y, object.r, object.r * 0.15, 0, 0, TAU);
          c.stroke();
        }
      }
      c.strokeStyle = '#ffffffa0';
      c.lineWidth = Math.max(2, object.r * 0.09);
      c.beginPath();
      c.moveTo(object.x - object.r * 0.55, top - 4);
      c.bezierCurveTo(
        object.x - object.r * 0.65,
        top + object.h * 0.4,
        object.x - object.r * 0.3,
        top + object.h * 0.7,
        object.x - object.r * 0.45,
        object.y
      );
      c.stroke();
      c.restore();
      const radius = object.profile[0][1] * object.r;
      c.fillStyle = '#183b4c28';
      c.strokeStyle = '#f3ffffe0';
      c.lineWidth = 1.6;
      c.beginPath();
      c.ellipse(object.x, top, radius, radius * 0.22, 0, 0, TAU);
      c.fill();
      c.stroke();
      const base = object.profile[object.profile.length - 1][1] * object.r;
      c.strokeStyle = '#dcf8ff9c';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(object.x, object.y, base, base * 0.12, 0, 0, TAU);
      c.stroke();
      if (object.stopper) {
        c.fillStyle = '#b2e8eab0';
        c.strokeStyle = '#eaffff';
        c.beginPath();
        c.roundRect(object.x - object.r * 0.23, top - 11, object.r * 0.46, 12, 3);
        c.fill();
        c.stroke();
      }
    }
    draw() {
      const c = this.ctx,
        wall = c.createLinearGradient(0, 0, 0, this.h);
      wall.addColorStop(0, '#162832');
      wall.addColorStop(1, '#708987');
      c.fillStyle = wall;
      c.fillRect(0, 0, this.w, this.h);
      const wood = c.createLinearGradient(0, this.h * 0.24, 0, this.h);
      wood.addColorStop(0, '#a88760');
      wood.addColorStop(1, '#d1ad7d');
      c.fillStyle = wood;
      c.beginPath();
      c.moveTo(this.w * 0.16, this.h * 0.24);
      c.lineTo(this.w * 0.84, this.h * 0.24);
      c.lineTo(this.w * 1.3, this.h);
      c.lineTo(-this.w * 0.3, this.h);
      c.closePath();
      c.fill();
      c.strokeStyle = '#6b503523';
      c.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const x = (i / 24) * this.w;
        c.beginPath();
        c.moveTo(this.w * 0.16 + x * 0.68, this.h * 0.24);
        c.bezierCurveTo(
          x,
          this.h * 0.55,
          x + 14,
          this.h * 0.7,
          (x - this.w * 0.5) * 1.6 + this.w * 0.5,
          this.h
        );
        c.stroke();
      }
      for (const object of this.objects)
        if (!object.broken) {
          c.save();
          c.translate(0, object.offset);
          this.drawObject(object);
          c.restore();
        }
      for (const p of this.shards) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.a);
        c.scale(1, 0.4 + Math.abs(Math.cos(p.a * 0.7)) * 0.6);
        c.fillStyle = '#badfe64a';
        c.strokeStyle = '#eaffffd0';
        c.lineWidth = 0.8;
        c.beginPath();
        p.points.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
        c.closePath();
        c.fill();
        c.stroke();
        c.restore();
      }
      for (const ball of this.balls) sphere(c, ball.x, ball.y, ball.r);
      if (!this.balls.length) sphere(c, this.w * 0.5, this.h * 0.93, 20);
    }
    hit(p, object) {
      const t = (p.y - object.y + object.h) / object.h;
      if (
        t >= -0.03 &&
        t <= 1.03 &&
        Math.abs(p.x - object.x) < this.radiusAt(object, Math.max(0, Math.min(1, t))) * object.r + 8
      )
        return true;
      return (
        object.handle &&
        Math.abs(p.x - object.x - object.r * 0.9) < object.r * 0.65 &&
        t > 0.12 &&
        t < 0.8
      );
    }
    down(p) {
      if (this.balls.length >= 8) return;
      let index = -1;
      for (let i = this.objects.length - 1; i >= 0; i--)
        if (
          !this.objects[i].broken &&
          this.objects[i].offset > -1 &&
          this.hit(p, this.objects[i])
        ) {
          index = i;
          break;
        }
      this.balls.push({
        object: index,
        startX: this.w * 0.5,
        startY: this.h * 0.93,
        x: this.w * 0.5,
        y: this.h * 0.93,
        targetX: p.x,
        targetY: p.y,
        age: 0,
        r: 20,
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
    const toy = new GlassBreak(c, w, h, {}, silent);
    for (const object of toy.objects) object.offset = 0;
    toy.draw();
  }
  Object.assign(window.StillToys, { MetalBalls, GlassBreak, metalPreview, glassPreview });
})();
