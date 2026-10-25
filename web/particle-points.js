(() => {
  'use strict';
  // Render actual points on a fresh black frame. No history buffer or drawn orbit.
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
          'precision mediump float;varying vec3 color;void main(){float r=length(gl_PointCoord*2.0-1.0);if(r>1.0)discard;float light=exp(-r*r*6.0)*0.9;gl_FragColor=vec4(color,light);}'
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
        this.data[j + 3] = 2.5 + (p.i % 5) * 0.23;
      }
      g.uniform2f(this.resolution, w, h);
      g.uniform1f(this.scale, dpr);
      if (this.palette !== palette) {
        g.uniform3fv(
          this.colors,
          new Float32Array(
            palette.flatMap((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255))
          )
        );
        this.palette = palette;
      }
      g.clear(g.COLOR_BUFFER_BIT);
      g.bufferSubData(g.ARRAY_BUFFER, 0, this.data);
      g.drawArrays(g.POINTS, 0, points.length);
      ctx.drawImage(this.canvas, 0, 0, w, h);
      return true;
    }
    dispose() {
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
      this.canvas.width = 1;
      this.canvas.height = 1;
    }
  }
  window.ParticlePoints = ParticlePoints;
})();
