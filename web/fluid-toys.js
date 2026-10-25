(() => {
  'use strict';
  const colors = {
    ember: [
      [1, 0.05, 0.015],
      [1, 0.3, 0.02],
      [1, 0.75, 0.08],
      [0.9, 0.06, 0.2],
    ],
    rainbow: [
      [0.1, 0.35, 1],
      [1, 0.04, 0.2],
      [0.05, 0.9, 0.7],
      [1, 0.6, 0.04],
    ],
    moon: [
      [0.04, 0.5, 0.9],
      [0.15, 0.9, 0.8],
      [0.3, 0.3, 1],
      [0.45, 0.7, 1],
    ],
  };
  class Lava {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.palette = 'ember';
      this.time = 0;
      this.reset();
    }
    reset() {
      this.cols = 84;
      this.rows = Math.max(24, Math.min(190, Math.round((this.cols * this.h) / this.w)));
      const n = this.cols * this.rows;
      this.u = new Float32Array(n);
      this.v = new Float32Array(n);
      this.nextU = new Float32Array(n);
      this.nextV = new Float32Array(n);
      this.div = new Float32Array(n);
      this.pressure = new Float32Array(n);
      this.nextPressure = new Float32Array(n);
      this.curl = new Float32Array(n);
      this.dye = Array.from({ length: 3 }, () => new Float32Array(n));
      this.nextDye = Array.from({ length: 3 }, () => new Float32Array(n));
      this.previous = new Map();
      this.surface = document.createElement('canvas');
      this.surface.width = this.cols;
      this.surface.height = this.rows;
      this.surfaceContext = this.surface.getContext('2d');
      this.image = this.surfaceContext.createImageData(this.cols, this.rows);
      for (let y = 0; y < this.rows; y++)
        for (let x = 0; x < this.cols; x++) {
          const i = y * this.cols + x,
            a = Math.exp(
              -(
                ((x - this.cols * 0.35) / (this.cols * 0.24)) ** 2 +
                ((y - this.rows * 0.7) / (this.rows * 0.23)) ** 2
              )
            ),
            b = Math.exp(
              -(
                ((x - this.cols * 0.68) / (this.cols * 0.2)) ** 2 +
                ((y - this.rows * 0.3) / (this.rows * 0.2)) ** 2
              )
            );
          this.dye[0][i] = a * 2.7 + b * 1.4;
          this.dye[1][i] = a * 0.38 + b * 0.07;
          this.dye[2][i] = a * 0.02 + b * 0.3;
          this.u[i] = Math.sin(y * 0.06) * 0.09;
          this.v[i] = Math.cos(x * 0.07) * 0.06;
        }
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    advect(source, target, step, fade) {
      const w = this.cols,
        h = this.rows,
        u = this.u,
        v = this.v;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x,
            xx = Math.max(0.01, Math.min(w - 1.01, x - u[i] * step)),
            yy = Math.max(0.01, Math.min(h - 1.01, y - v[i] * step)),
            a = Math.floor(xx),
            b = Math.floor(yy),
            fx = xx - a,
            fy = yy - b,
            j = b * w + a;
          target[i] =
            ((source[j] * (1 - fx) + source[j + 1] * fx) * (1 - fy) +
              (source[j + w] * (1 - fx) + source[j + w + 1] * fx) * fy) *
            fade;
        }
    }
    update(dt, touches = []) {
      const w = this.cols,
        h = this.rows,
        step = Math.min(1.5, dt * 60) * (this.settings.gentle ? 0.55 : 1);
      this.time += dt;
      const palette = colors[this.palette],
        active = new Set();
      for (const p of touches) {
        active.add(p.id);
        const old = this.previous.get(p.id) || p,
          cx = (p.x / this.w) * (w - 1),
          cy = (p.y / this.h) * (h - 1),
          dx = ((p.x - old.x) / this.w) * w,
          dy = ((p.y - old.y) / this.h) * h,
          distance = (old.distance || 0) + Math.hypot(p.x - old.x, p.y - old.y),
          tint =
            palette[(Math.floor(distance / 65) + Math.floor(this.time * 0.16) + (p.id || 0)) % 4];
        for (let y = Math.max(1, Math.floor(cy - 9)); y < Math.min(h - 1, cy + 9); y++)
          for (let x = Math.max(1, Math.floor(cx - 9)); x < Math.min(w - 1, cx + 9); x++) {
            const i = y * w + x,
              xx = x - cx,
              yy = y - cy,
              f = Math.exp(-(xx * xx + yy * yy) / 22);
            this.u[i] += Math.max(-4, Math.min(4, dx * 0.3)) * f - yy * f * 0.012;
            this.v[i] += Math.max(-4, Math.min(4, dy * 0.3)) * f + xx * f * 0.012;
            for (let c = 0; c < 3; c++)
              this.dye[c][i] = Math.min(5, this.dye[c][i] + tint[c] * f * 0.22 * step);
          }
        this.previous.set(p.id, { x: p.x, y: p.y, distance });
      }
      for (const id of this.previous.keys()) if (!active.has(id)) this.previous.delete(id);
      this.advect(this.u, this.nextU, step, 0.993);
      this.advect(this.v, this.nextV, step, 0.993);
      [this.u, this.nextU] = [this.nextU, this.u];
      [this.v, this.nextV] = [this.nextV, this.v];
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          this.curl[i] = 0.5 * (this.v[i + 1] - this.v[i - 1] - this.u[i + w] + this.u[i - w]);
        }
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x,
            dx = Math.abs(this.curl[i + 1]) - Math.abs(this.curl[i - 1]),
            dy = Math.abs(this.curl[i + w]) - Math.abs(this.curl[i - w]),
            len = Math.hypot(dx, dy) + 0.0001,
            force = this.curl[i] * 0.18 * step;
          this.u[i] += (dy / len) * force;
          this.v[i] -= (dx / len) * force + (this.dye[0][i] + this.dye[1][i]) * 0.001 * step;
        }
      this.pressure.fill(0);
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          this.div[i] = -0.5 * (this.u[i + 1] - this.u[i - 1] + this.v[i + w] - this.v[i - w]);
        }
      for (let pass = 0; pass < 8; pass++) {
        for (let y = 1; y < h - 1; y++)
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            this.nextPressure[i] =
              (this.div[i] +
                this.pressure[i - 1] +
                this.pressure[i + 1] +
                this.pressure[i - w] +
                this.pressure[i + w]) *
              0.25;
          }
        [this.pressure, this.nextPressure] = [this.nextPressure, this.pressure];
      }
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          this.u[i] = Math.max(
            -5,
            Math.min(5, this.u[i] - 0.5 * (this.pressure[i + 1] - this.pressure[i - 1]))
          );
          this.v[i] = Math.max(
            -5,
            Math.min(5, this.v[i] - 0.5 * (this.pressure[i + w] - this.pressure[i - w]))
          );
        }
      for (let x = 0; x < w; x++) {
        this.v[x] = 0;
        this.v[(h - 1) * w + x] = 0;
      }
      for (let y = 0; y < h; y++) {
        this.u[y * w] = 0;
        this.u[y * w + w - 1] = 0;
      }
      for (let channel = 0; channel < 3; channel++) {
        this.advect(this.dye[channel], this.nextDye[channel], step, 0.999);
        [this.dye[channel], this.nextDye[channel]] = [this.nextDye[channel], this.dye[channel]];
      }
    }
    draw() {
      const data = this.image.data,
        w = this.cols,
        total = this.u.length,
        field = this.dye;
      const densityAt = (i) => field[0][i] + field[1][i] + field[2][i];
      for (let i = 0; i < total; i++) {
        const density = densityAt(i),
          x = i % w,
          inside = x > 0 && x < w - 1 && i >= w && i < total - w;
        const gx = inside ? (densityAt(i + 1) - densityAt(i - 1)) * 5 : 0,
          gy = inside ? (densityAt(i + w) - densityAt(i - w)) * 5 : 0,
          normal = Math.sqrt(1 + gx * gx + gy * gy);
        const light = Math.max(0, (0.78 - gx * 0.3 - gy * 0.4) / normal),
          edge = Math.hypot(gx, gy),
          shine = Math.pow(light, 12) * Math.min(0.7, edge) * Math.min(1, density),
          wave = 0.9 + 0.1 * Math.cos(density * 4 + field[1][i] * 3);
        for (let c = 0; c < 3; c++)
          data[i * 4 + c] = Math.min(
            255,
            ((1 - Math.exp(-field[c][i] * 1.15)) * (0.83 + light * 0.23) * wave + shine) * 255
          );
        data[i * 4 + 3] = 255;
      }
      this.surfaceContext.putImageData(this.image, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.drawImage(this.surface, 0, 0, this.w, this.h);
    }
    down(p) {
      this.previous.set(p.id, { x: p.x, y: p.y });
      this.sound.slime();
      this.sound.pulse(1);
    }
    move(p) {
      const old = this.previous.get(p.id);
      if (old && Math.hypot(p.x - old.x, p.y - old.y) > 8) this.sound.slime();
    }
    up(p) {
      this.previous.delete(p.id);
    }
  }
  function lavaPreview(c, w, h) {
    const t = new Lava(c, w, h, {}, {});
    for (let i = 0; i < 3; i++) t.update(1 / 60);
    t.draw();
  }
  Object.assign(window.StillToys, { Lava, lavaPreview });
})();
