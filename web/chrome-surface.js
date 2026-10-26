(() => {
  'use strict';
  // Orthographic sphere impostors: normals, reflected room rays and moving
  // surface roughness are evaluated per pixel, rather than painted on a sprite.
  class ChromeSurface {
    constructor() {
      this.canvas = document.createElement('canvas');
      const g = (this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
      }));
      if (!g) return;
      try {
        const shader = (type, source) => {
          const s = g.createShader(type);
          g.shaderSource(s, source);
          g.compileShader(s);
          if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw Error(g.getShaderInfoLog(s));
          return s;
        };
        const v = shader(
          g.VERTEX_SHADER,
          `attribute vec2 vertex;uniform vec2 resolution;uniform vec4 ball;varying vec2 local;varying vec2 screen;
          void main(){local=vertex;screen=ball.xy+vertex*ball.z*1.18;gl_Position=vec4(screen/resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);}`
        );
        const f = shader(
          g.FRAGMENT_SHADER,
          `precision highp float;varying vec2 local;varying vec2 screen;uniform vec2 resolution;uniform vec4 ball;uniform vec2 tilt;
          float box(vec2 p,vec2 b,float softness){vec2 q=abs(p)-b;return 1.-smoothstep(-softness,softness,max(q.x,q.y));}
          vec3 room(vec3 origin,vec3 ray){
            vec3 extent=vec3(resolution*.85,300.);
            vec3 side=step(vec3(0.),ray)*2.-1.;vec3 safeRay=side*max(abs(ray),vec3(.0001));
            vec3 distance=(side*extent-origin)/safeRay;
            float t=min(distance.x,min(distance.y,distance.z));
            vec3 hit=origin+ray*t;
            float front=step(distance.z,t+.01)*step(0.,ray.z);
            float softbox=box((hit.xy-vec2(-resolution.x*.4,-resolution.y*.3))/resolution,vec2(.8,.35),.045)*front;
            float strip=box((hit.xy-vec2(resolution.x*.9,0.))/resolution,vec2(.1,.7),.025)*front;
            float wall=.47+.18*ray.z-.23*(2./(1.+exp(-ray.y*14.))-1.);
            float lower=exp(-pow((ray.y-.65)*8.,2.))*.35;
            return vec3(wall+lower+softbox*.9+strip*.8)*vec3(.96,.985,1.);
          }
          void main(){
            vec2 p=local*1.18;float d=dot(p,p);
            if(ball.w<0.){ // tray, drawn with the same viewport coordinates
              float edge=min(min(screen.x,resolution.x-screen.x),min(screen.y,resolution.y-screen.y));
              float light=.69+.035*(1.-screen.y/resolution.y);
              vec3 col=vec3(light*.92,light,light*.96);
              if(edge<10.)col=vec3(.22,.32,.31);if(edge<4.)col=vec3(.66,.72,.68);
              gl_FragColor=vec4(col,1.);return;
            }
            if(d>1.){float shadow=(1.-smoothstep(.92,1.2,length(p-vec2(.02,.045))))*.18;if(shadow<.001)discard;gl_FragColor=vec4(vec3(.09,.14,.14),shadow);return;}
            vec3 n=vec3(p,sqrt(1.-d));
            float a=ball.w;vec3 surface=vec3(n.x*cos(a)+n.z*sin(a),n.y,-n.x*sin(a)+n.z*cos(a));
            float grain=sin(surface.y*430.+sin(surface.x*75.)*.5)*.0018;
            n=normalize(n+vec3(grain,-grain,0.));
            vec3 ray=reflect(vec3(0.,0.,-1.),n);
            float rot=tilt.x*.035;ray.xz=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*ray.xz;
            float pitch=tilt.y*.025;ray.yz=mat2(cos(pitch),-sin(pitch),sin(pitch),cos(pitch))*ray.yz;
            vec3 origin=vec3(screen-resolution*.5,n.z*ball.z);
            vec3 reflection=room(origin,ray);
            float fresnel=.84+.16*pow(1.-n.z,5.);
            float rim=pow(1.-n.z,6.)*.15;
            vec3 col=reflection*fresnel+rim;
            gl_FragColor=vec4(clamp(col,0.,1.),(1.-smoothstep(.985,1.,sqrt(d))));
          }`
        );
        this.program = g.createProgram();
        g.attachShader(this.program, v);
        g.attachShader(this.program, f);
        g.linkProgram(this.program);
        if (!g.getProgramParameter(this.program, g.LINK_STATUS))
          throw Error(g.getProgramInfoLog(this.program));
        g.deleteShader(v);
        g.deleteShader(f);
        g.useProgram(this.program);
        this.buffer = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
        g.bufferData(
          g.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          g.STATIC_DRAW
        );
        const a = g.getAttribLocation(this.program, 'vertex');
        g.enableVertexAttribArray(a);
        g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
        this.resolution = g.getUniformLocation(this.program, 'resolution');
        this.ball = g.getUniformLocation(this.program, 'ball');
        this.tilt = g.getUniformLocation(this.program, 'tilt');
        g.enable(g.BLEND);
        g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      } catch (error) {
        this.error = error.message;
        this.dispose();
        this.gl = null;
      }
    }
    draw(ctx, w, h, balls, gx, gy) {
      const g = this.gl;
      if (!g || g.isContextLost()) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        g.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
      g.uniform2f(this.resolution, w, h);
      g.uniform2f(this.tilt, gx, gy);
      g.uniform4f(this.ball, w * 0.5, h * 0.5, Math.max(w, h), -1);
      g.drawArrays(g.TRIANGLES, 0, 6);
      for (const b of balls) {
        g.uniform4f(this.ball, b.x, b.y, b.r, b.rotation % (Math.PI * 2));
        g.drawArrays(g.TRIANGLES, 0, 6);
      }
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
  window.ChromeSurface = ChromeSurface;
})();
