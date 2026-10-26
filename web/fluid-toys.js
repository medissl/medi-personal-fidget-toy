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
  // Shade interpolated dye at display resolution, rather than enlarging lit grid pixels.
  class LiquidSurface {
    constructor() {
      this.canvas = document.createElement('canvas');
      const g = (this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      }));
      if (!g) return;
      try {
        this.floatTexture = !!(
          g.getExtension('OES_texture_float') && g.getExtension('OES_texture_float_linear')
        );
        const shader = (type, source) => {
          const s = g.createShader(type);
          g.shaderSource(s, source);
          g.compileShader(s);
          if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw Error(g.getShaderInfoLog(s));
          return s;
        };
        this.program = g.createProgram();
        const vs = shader(
            g.VERTEX_SHADER,
            'attribute vec2 position;varying vec2 uv;void main(){gl_Position=vec4(position,0.,1.);uv=vec2(position.x*.5+.5,.5-position.y*.5);}'
          ),
          fs = shader(
            g.FRAGMENT_SHADER,
            `precision mediump float;uniform sampler2D dye;uniform vec2 texel;uniform float range;varying vec2 uv;
          vec3 ink(vec2 p){return texture2D(dye,clamp(p,texel*.5,1.-texel*.5)).rgb*range;}
          float density(vec2 p){vec3 d=ink(p);return d.r+d.g+d.b;}
          void main(){vec3 d=ink(uv);float gx=(density(uv+vec2(texel.x,0.))-density(uv-vec2(texel.x,0.)))*2.;
          float gy=(density(uv+vec2(0.,texel.y))-density(uv-vec2(0.,texel.y)))*2.;
          vec3 n=normalize(vec3(-gx,-gy,1.));float diffuse=max(0.,dot(n,normalize(vec3(-.35,-.45,1.))));
          float spec=pow(max(0.,dot(n,normalize(vec3(-.2,-.3,1.)))),32.)*min(1.,length(vec2(gx,gy)))*.32;
          vec3 color=(1.-exp(-d*1.15))*(.83+diffuse*.25)+spec;gl_FragColor=vec4(color,1.);}`
          );
        g.attachShader(this.program, vs);
        g.attachShader(this.program, fs);
        g.linkProgram(this.program);
        if (!g.getProgramParameter(this.program, g.LINK_STATUS))
          throw Error(g.getProgramInfoLog(this.program));
        g.deleteShader(vs);
        g.deleteShader(fs);
        g.useProgram(this.program);
        this.buffer = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
        g.bufferData(
          g.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          g.STATIC_DRAW
        );
        const a = g.getAttribLocation(this.program, 'position');
        g.enableVertexAttribArray(a);
        g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
        this.texture = g.createTexture();
        g.bindTexture(g.TEXTURE_2D, this.texture);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        this.texel = g.getUniformLocation(this.program, 'texel');
        g.uniform1f(g.getUniformLocation(this.program, 'range'), this.floatTexture ? 1 : 5);
      } catch (error) {
        this.dispose();
        this.gl = null;
      }
    }
    draw(ctx, w, h, cols, rows, dye) {
      const g = this.gl;
      if (!g || g.isContextLost()) return false;
      // One shaded pixel per CSS pixel: four times the old fluid grid resolution,
      // without fourfold fragment work on high-density phone displays.
      const dpr = 1,
        width = Math.round(w * dpr),
        height = Math.round(h * dpr);
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        g.viewport(0, 0, width, height);
      }
      if (!this.data || this.data.length !== cols * rows * 4)
        this.data = this.floatTexture
          ? new Float32Array(cols * rows * 4)
          : new Uint8Array(cols * rows * 4);
      for (let i = 0; i < cols * rows; i++) {
        for (let k = 0; k < 3; k++)
          this.data[i * 4 + k] = this.floatTexture ? dye[k][i] : Math.min(255, dye[k][i] * 51);
        this.data[i * 4 + 3] = this.floatTexture ? 1 : 255;
      }
      g.texImage2D(
        g.TEXTURE_2D,
        0,
        g.RGBA,
        cols,
        rows,
        0,
        g.RGBA,
        this.floatTexture ? g.FLOAT : g.UNSIGNED_BYTE,
        this.data
      );
      g.uniform2f(this.texel, 1 / cols, 1 / rows);
      g.drawArrays(g.TRIANGLES, 0, 6);
      if (ctx.canvas?.id === 'playground') {
        if (!this.canvas.isConnected) {
          this.canvas.className = 'toy-gpu';
          this.canvas.setAttribute('aria-hidden', 'true');
          ctx.canvas.before(this.canvas);
        }
        this.canvas.style.filter = ctx.canvas.style.filter;
        ctx.clearRect(0, 0, w, h);
      } else ctx.drawImage(this.canvas, 0, 0, w, h);
      return true;
    }
    dispose() {
      this.canvas.remove();
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
  class Lava {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.palette = 'ember';
      this.time = 0;
      this.reset();
    }
    reset() {
      this.cols = 112;
      this.rows = Math.max(24, Math.min(270, Math.round((this.cols * this.h) / this.w)));
      if (!this.renderer && window.WebGLRenderingContext) this.renderer = new LiquidSurface();
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
      if (this.renderer?.draw(this.ctx, this.w, this.h, this.cols, this.rows, this.dye)) return;
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
    }
    move(p) {}
    up(p) {
      this.previous.delete(p.id);
    }
    dispose() {
      this.renderer?.dispose();
    }
  }
  function lavaPreview(c, w, h) {
    const t = new Lava(c, w, h, {}, {});
    for (let i = 0; i < 3; i++) t.update(1 / 60);
    t.draw();
    t.dispose();
  }
  Object.assign(window.StillToys, { Lava, lavaPreview });
})();
