(() => {
  'use strict';
  // Fresh black frames with individual particle heads and short, curved motion histories.
  class ParticlePoints {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      });
      if (!this.gl) return;
      const g = this.gl;
      const shader = (type, source) => {
        const s = g.createShader(type);
        g.shaderSource(s, source);
        g.compileShader(s);
        if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw Error(g.getShaderInfoLog(s));
        return s;
      };
      try {
        const vertex = shader(
          g.VERTEX_SHADER,
          'attribute vec4 point;uniform vec2 resolution;uniform float scale;uniform vec3 colors[4];varying vec3 color;void main(){gl_Position=vec4(point.x/resolution.x*2.0-1.0,1.0-point.y/resolution.y*2.0,0.0,1.0);gl_PointSize=point.w*scale;color=point.z<0.5?colors[0]:point.z<1.5?colors[1]:point.z<2.5?colors[2]:colors[3];}'
        );
        const fragment = shader(
          g.FRAGMENT_SHADER,
          'precision mediump float;varying vec3 color;void main(){float r=length(gl_PointCoord*2.0-1.0);if(r>1.0)discard;gl_FragColor=vec4(color,exp(-r*r*6.)*.3);}'
        );
        this.program = g.createProgram();
        g.attachShader(this.program, vertex);
        g.attachShader(this.program, fragment);
        g.linkProgram(this.program);
        if (!g.getProgramParameter(this.program, g.LINK_STATUS))
          throw Error(g.getProgramInfoLog(this.program));
        g.deleteShader(vertex);
        g.deleteShader(fragment);
        g.useProgram(this.program);
        this.buffer = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
        const attribute = g.getAttribLocation(this.program, 'point');
        g.enableVertexAttribArray(attribute);
        g.vertexAttribPointer(attribute, 4, g.FLOAT, false, 16, 0);
        this.resolution = g.getUniformLocation(this.program, 'resolution');
        this.scale = g.getUniformLocation(this.program, 'scale');
        this.colors = g.getUniformLocation(this.program, 'colors[0]');
        const tv = shader(
            g.VERTEX_SHADER,
            `attribute vec4 vertex;uniform vec2 resolution;uniform vec3 colors[4];varying vec3 color;varying float opacity;
          void main(){gl_Position=vec4(vertex.x/resolution.x*2.-1.,1.-vertex.y/resolution.y*2.,0.,1.);
          color=vertex.z<.5?colors[0]:vertex.z<1.5?colors[1]:vertex.z<2.5?colors[2]:colors[3];opacity=vertex.w;}`
          ),
          tf = shader(
            g.FRAGMENT_SHADER,
            'precision mediump float;varying vec3 color;varying float opacity;void main(){gl_FragColor=vec4(color,opacity*.32);}'
          );
        this.trailProgram = g.createProgram();
        g.attachShader(this.trailProgram, tv);
        g.attachShader(this.trailProgram, tf);
        g.linkProgram(this.trailProgram);
        if (!g.getProgramParameter(this.trailProgram, g.LINK_STATUS))
          throw Error(g.getProgramInfoLog(this.trailProgram));
        g.deleteShader(tv);
        g.deleteShader(tf);
        this.trailBuffer = g.createBuffer();
        this.trailResolution = g.getUniformLocation(this.trailProgram, 'resolution');
        this.trailColors = g.getUniformLocation(this.trailProgram, 'colors[0]');
        this.trailAttribute = g.getAttribLocation(this.trailProgram, 'vertex');
        this.lineWidthRange = g.getParameter(g.ALIASED_LINE_WIDTH_RANGE);
        g.enable(g.BLEND);
        g.blendFunc(g.SRC_ALPHA, g.ONE);
        g.clearColor(0, 0, 0, 1);
      } catch (error) {
        this.error = error.message;
        this.gl = null;
      }
    }
    draw(ctx, w, h, points, palette) {
      const g = this.gl;
      if (!g || g.isContextLost()) return false;
      g.useProgram(this.program);
      g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
      const dpr = Math.min(window.devicePixelRatio || 1, 2),
        width = Math.round(w * dpr),
        height = Math.round(h * dpr);
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        g.viewport(0, 0, width, height);
      }
      if (!this.data || this.data.length !== points.length * 4) {
        this.data = new Float32Array(points.length * 4);
        g.bufferData(g.ARRAY_BUFFER, this.data.byteLength, g.DYNAMIC_DRAW);
      }
      for (let i = 0; i < points.length; i++) {
        const p = points[i],
          j = i * 4;
        this.data[j] = p.x;
        this.data[j + 1] = p.y;
        this.data[j + 2] = p.color;
        this.data[j + 3] = 2.4 + (p.i % 5) * 0.12;
      }
      g.uniform2f(this.resolution, w, h);
      g.uniform1f(this.scale, dpr);
      const colors = new Float32Array(
        palette.flatMap((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255))
      );
      g.uniform3fv(this.colors, colors);
      g.clear(g.COLOR_BUFFER_BIT);
      if (points[0]?.history) this.drawTrails(points, w, h, colors);
      g.useProgram(this.program);
      g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
      const point = g.getAttribLocation(this.program, 'point');
      g.enableVertexAttribArray(point);
      g.vertexAttribPointer(point, 4, g.FLOAT, false, 16, 0);
      g.bufferSubData(g.ARRAY_BUFFER, 0, this.data);
      g.drawArrays(g.POINTS, 0, points.length);
      if (ctx.canvas?.id === 'playground') {
        if (!this.canvas.isConnected) {
          this.canvas.className = 'toy-gpu';
          this.canvas.setAttribute('aria-hidden', 'true');
          ctx.canvas.before(this.canvas);
        }
        this.canvas.style.filter = ctx.canvas.style.filter;
      } else ctx.drawImage(this.canvas, 0, 0, w, h);
      return true;
    }
    drawTrails(points, w, h, colors) {
      const g = this.gl;
      if (!this.trails || this.trails.length !== points.length * 8)
        this.trails = new Float32Array(points.length * 8);
      let at = 0;
      for (const p of points) {
        const dx = p.history[10] - p.x,
          dy = p.history[11] - p.y,
          d = Math.hypot(dx, dy),
          limit = d > 32 ? 32 / d : 1;
        this.trails[at++] = p.x;
        this.trails[at++] = p.y;
        this.trails[at++] = p.color;
        this.trails[at++] = 1;
        this.trails[at++] = p.x + dx * limit;
        this.trails[at++] = p.y + dy * limit;
        this.trails[at++] = p.color;
        this.trails[at++] = 0.12;
      }
      g.useProgram(this.trailProgram);
      g.uniform2f(this.trailResolution, w, h);
      g.uniform3fv(this.trailColors, colors);
      g.bindBuffer(g.ARRAY_BUFFER, this.trailBuffer);
      g.bufferData(g.ARRAY_BUFFER, this.trails, g.DYNAMIC_DRAW);
      g.enableVertexAttribArray(this.trailAttribute);
      g.vertexAttribPointer(this.trailAttribute, 4, g.FLOAT, false, 16, 0);
      g.lineWidth(Math.min(this.lineWidthRange[1], Math.min(window.devicePixelRatio || 1, 2)));
      g.drawArrays(g.LINES, 0, points.length * 2);
      g.disableVertexAttribArray(this.trailAttribute);
    }
    dispose() {
      this.canvas.remove();
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
      this.canvas.width = 1;
      this.canvas.height = 1;
    }
  }
  window.ParticlePoints = ParticlePoints;
})();
