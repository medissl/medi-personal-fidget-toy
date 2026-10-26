(() => {
  'use strict';
  const TAU = Math.PI * 2;
  class Slime {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.reset();
    }
    reset() {
      this.cols = Math.min(80, Math.ceil(this.w / 6));
      this.rows = Math.min(160, Math.ceil((this.cols * this.h) / this.w));
      this.field = new Float32Array(this.cols * this.rows);
      this.velocity = new Float32Array(this.field.length);
      this.pressure = new Float32Array(this.field.length);
      this.surface = document.createElement('canvas');
      this.surface.width = this.cols;
      this.surface.height = this.rows;
      this.surfaceContext = this.surface.getContext('2d');
      this.image = this.surfaceContext.createImageData(this.cols, this.rows);
      this.previous = new Map();
      this.time = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches) {
      this.time += dt;
      this.pressure.fill(0);
      const sx = this.w / (this.cols - 1),
        sy = this.h / (this.rows - 1);
      for (const touch of touches) {
        const cx = touch.x / sx,
          cy = touch.y / sy,
          rx = 65 / sx,
          ry = 65 / sy;
        for (
          let y = Math.max(0, Math.floor(cy - ry * 2));
          y < Math.min(this.rows, cy + ry * 2);
          y++
        )
          for (
            let x = Math.max(0, Math.floor(cx - rx * 2));
            x < Math.min(this.cols, cx + rx * 2);
            x++
          ) {
            const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
            this.pressure[y * this.cols + x] -= 26 * Math.exp(-d * 2);
          }
      }
      const steps = Math.max(1, Math.ceil(dt * 60)),
        step = Math.min(1, (dt * 60) / steps) * (this.settings.gentle ? 0.7 : 1);
      for (let sub = 0; sub < steps; sub++) {
        for (let y = 0; y < this.rows; y++)
          for (let x = 0; x < this.cols; x++) {
            const i = y * this.cols + x,
              h = this.field[i],
              left = this.field[y * this.cols + Math.max(0, x - 1)],
              right = this.field[y * this.cols + Math.min(this.cols - 1, x + 1)],
              up = this.field[Math.max(0, y - 1) * this.cols + x],
              down = this.field[Math.min(this.rows - 1, y + 1) * this.cols + x];
            this.velocity[i] +=
              (0.12 * (left + right + up + down - 4 * h) + (this.pressure[i] - h) * 0.035) * step;
            this.velocity[i] *= Math.pow(0.87, step);
          }
        for (let i = 0; i < this.field.length; i++)
          this.field[i] = Math.max(-45, Math.min(15, this.field[i] + this.velocity[i] * step));
      }
    }
    draw() {
      const data = this.image.data;
      for (let y = 0; y < this.rows; y++)
        for (let x = 0; x < this.cols; x++) {
          const i = y * this.cols + x,
            h = this.field[i],
            dx =
              (this.field[y * this.cols + Math.min(this.cols - 1, x + 1)] -
                this.field[y * this.cols + Math.max(0, x - 1)]) *
              0.45,
            dy =
              (this.field[Math.min(this.rows - 1, y + 1) * this.cols + x] -
                this.field[Math.max(0, y - 1) * this.cols + x]) *
              0.45;
          const normal = Math.sqrt(dx * dx + dy * dy + 1),
            light = Math.max(0, (dx * 0.42 + dy * 0.53 + 0.74) / normal),
            shine = Math.pow(Math.max(0, (dx * 0.2 + dy * 0.25 + 0.95) / normal), 28) * 100;
          const shade =
            0.58 +
            light * 0.48 +
            h * 0.002 +
            Math.sin(x * 0.12 + y * 0.06 + this.time * 0.1) * 0.016;
          data[i * 4] = Math.min(255, 82 * shade + shine);
          data[i * 4 + 1] = Math.min(255, 184 * shade + shine);
          data[i * 4 + 2] = Math.min(255, 146 * shade + shine);
          data[i * 4 + 3] = 255;
        }
      this.surfaceContext.putImageData(this.image, 0, 0);
      const c = this.ctx;
      c.imageSmoothingEnabled = true;
      c.drawImage(this.surface, 0, 0, this.w, this.h);
      c.strokeStyle = '#e6ffe626';
      c.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const x = (i * 137.508) % this.w,
          y = (i * 247.31) % this.h,
          ix = Math.min(this.cols - 1, Math.floor((x / this.w) * this.cols)),
          iy = Math.min(this.rows - 1, Math.floor((y / this.h) * this.rows)),
          offset = this.field[iy * this.cols + ix] * 0.5;
        c.beginPath();
        c.ellipse(x, y + offset, 2 + (i % 3), 1.5 + (i % 2), 0.4, 0, TAU);
        c.stroke();
      }
    }
    down(p) {
      this.previous.set(p.id, { x: p.x, y: p.y });
      this.sound.slime(0.6);
    }
    move(p) {
      const before = this.previous.get(p.id);
      if (before && Math.hypot(before.x - p.x, before.y - p.y) > 9) {
        this.sound.slime(0.7);
        this.previous.set(p.id, { x: p.x, y: p.y });
      }
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
      this.previous.set(p.id, { x: p.x, y: p.y });
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
      this.previous.set(p.id, { x: p.x, y: p.y });
      this.sound.sand?.();
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
      this.angle = Array(5).fill(0);
      this.velocity = Array(5).fill(0);
      this.drags = new Map();
      this.restTime = 0;
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.drags.clear();
      for (let i = 0; i < 5; i++) this.angle[i] = this.limit(i, this.angle[i]);
    }
    layout() {
      const r = Math.min(this.w / 20, this.h / 18, 30),
        length = Math.min(this.w * 0.4, this.h * 0.35),
        start = this.w / 2 - r * 4;
      return {
        r,
        length,
        top: this.h * 0.32,
        start,
        maxAngle: Math.asin(Math.max(0.05, Math.min(0.95, (start - r - 8) / length))),
      };
    }
    limit(i, a) {
      const limit = Math.min(0.68, this.layout().maxAngle);
      return Math.max(-limit, Math.min(limit, a));
    }
    constrain() {
      // Weighted monotone projection keeps bob order without swapping identities.
      const held = new Set(Array.from(this.drags.values()).map((d) => d.index)),
        blocks = [];
      for (let i = 0; i < 5; i++) {
        const weight = held.has(i) ? 12 : 1;
        blocks.push({ start: i, end: i, weight, angle: this.angle[i] * weight });
        while (blocks.length > 1) {
          const b = blocks[blocks.length - 1],
            a = blocks[blocks.length - 2];
          if (a.angle / a.weight <= b.angle / b.weight) break;
          blocks.splice(-2, 2, {
            start: a.start,
            end: b.end,
            weight: a.weight + b.weight,
            angle: a.angle + b.angle,
          });
        }
      }
      for (const block of blocks)
        for (let i = block.start; i <= block.end; i++) {
          this.angle[i] = block.angle / block.weight;
        }
    }
    positions() {
      const { r, start, length, top } = this.layout();
      return this.angle.map((a, i) => ({
        x: start + i * r * 2 + Math.sin(a) * length,
        y: top + Math.cos(a) * length,
        tx: Math.cos(a),
        ty: -Math.sin(a),
      }));
    }
    update(dt) {
      dt = Math.min(dt, 0.033) * (this.settings.gentle ? 0.6 : 1);
      const { r, length, start, top } = this.layout(),
        steps = Math.ceil(dt * 240),
        step = dt / Math.max(1, steps),
        held = new Map(Array.from(this.drags.values()).map((d) => [d.index, d]));
      let strongest = 0;
      for (let sub = 0; sub < steps; sub++) {
        for (let i = 0; i < 5; i++) {
          if (held.has(i)) {
            const delta = Math.max(
              -2.2 * step,
              Math.min(2.2 * step, held.get(i).angle - this.angle[i])
            );
            this.velocity[i] = delta / step;
            this.angle[i] += delta;
          } else {
            this.velocity[i] += -Math.sin(this.angle[i]) * 11 * step;
            this.velocity[i] *= Math.exp(-0.22 * step);
            this.angle[i] += this.velocity[i] * step;
          }
        }
        for (let iteration = 0; iteration < 10; iteration++) {
          const p = this.positions();
          for (let a = 0; a < 5; a++)
            for (let b = a + 1; b < 5; b++) {
              const dx = p[b].x - p[a].x,
                dy = p[b].y - p[a].y,
                d = Math.hypot(dx, dy);
              if (d > r * 2 + 0.02 || d < 0.001) continue;
              const nx = dx / d,
                ny = dy / d,
                ja = p[a].tx * nx + p[a].ty * ny,
                jb = p[b].tx * nx + p[b].ty * ny,
                ia = held.has(a) ? 0 : 1,
                ib = held.has(b) ? 0 : 1,
                denom = ia * ja * ja + ib * jb * jb;
              if (denom < 0.001) continue;
              const relative = (this.velocity[b] * jb - this.velocity[a] * ja) * length;
              if (relative < -0.01) {
                // A held bob absorbs an incoming impact instead of returning energy
                // to a trapped chain. Free bobs retain the familiar clean transfer.
                const restitution = held.has(a) || held.has(b) ? 0 : 0.985;
                const impulse = (-(1 + restitution) * relative) / denom;
                this.velocity[a] -= (impulse * ia * ja) / length;
                this.velocity[b] += (impulse * ib * jb) / length;
                strongest = Math.max(strongest, -relative);
              }
              const correction = (Math.max(0, r * 2 - d - 1e-7) * 0.8) / denom;
              this.angle[a] -= (correction * ia * ja) / length;
              this.angle[b] += (correction * ib * jb) / length;
              if (correction > 0)
                for (const index of [a, b]) {
                  const angle = this.angle[index],
                    bob = p[index];
                  bob.x = start + index * r * 2 + Math.sin(angle) * length;
                  bob.y = top + Math.cos(angle) * length;
                  bob.tx = Math.cos(angle);
                  bob.ty = -Math.sin(angle);
                }
            }
        }
        for (let i = 0; i < 5; i++) {
          const limit = this.limit(i, this.angle[i]);
          if (limit !== this.angle[i]) this.velocity[i] = 0;
          this.angle[i] = limit;
          this.velocity[i] = Math.max(-2.8, Math.min(2.8, this.velocity[i]));
        }
      }
      const before = this.angle.slice();
      this.constrain();
      for (const drag of this.drags.values()) {
        if (Math.abs(before[drag.index] - this.angle[drag.index]) > 1e-6) {
          // A blocked, stationary finger must not drive into the same constraint
          // on every frame. Another pointer move supplies a new command.
          drag.angle = this.angle[drag.index];
          this.velocity[drag.index] = 0;
        }
      }
      const quiet = this.angle.every(
        (a, i) => Math.abs(a) < 0.012 && Math.abs(this.velocity[i]) < 0.045
      );
      this.restTime = quiet ? this.restTime + dt : 0;
      if (this.restTime > 0.25) {
        this.angle.fill(0);
        this.velocity.fill(0);
        for (const drag of this.drags.values()) drag.angle = 0;
        strongest = 0;
      }
      if (strongest > 25) {
        if (this.sound.metal) this.sound.metal(Math.min(1, strongest / 250));
        else this.sound.clack();
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
        const pivot = start + i * r * 2,
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
      const positions = this.positions(),
        { r } = this.layout();
      let index = -1,
        best = Math.max(44, r * 2);
      for (let i = 0; i < 5; i++) {
        if (Array.from(this.drags.values()).some((d) => d.index === i)) continue;
        const d = Math.hypot(p.x - positions[i].x, p.y - positions[i].y);
        if (d < best) {
          best = d;
          index = i;
        }
      }
      if (index >= 0) {
        this.drags.set(p.id, { index, angle: this.angle[index] });
        this.velocity[index] = 0;
        this.move(p);
      }
    }
    move(p) {
      const drag = this.drags.get(p.id);
      if (!drag) return;
      const { start, r, top } = this.layout(),
        pivot = start + drag.index * r * 2;
      drag.angle = this.limit(drag.index, Math.atan2(p.x - pivot, Math.max(10, p.y - top)));
    }
    up(p, remaining, cancelled) {
      const drag = this.drags.get(p.id);
      if (drag)
        this.velocity[drag.index] = cancelled
          ? 0
          : Math.max(-1.6, Math.min(1.6, this.velocity[drag.index]));
      this.drags.delete(p.id);
    }
  }
  const silent = { pulse() {}, slime() {}, switch() {}, clack() {} };
  function preview(Class, c, w, h) {
    const toy = new Class(c, w, h, { gentle: true }, silent);
    if (Class === Slime)
      for (let i = 0; i < 20; i++) toy.update(1 / 60, [{ x: w * 0.55, y: h * 0.58 }]);
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
