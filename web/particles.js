(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const palettes = {
    rainbow: ['#267dff', '#ff3b68', '#46dfce', '#ffd966'],
    ember: ['#ff543e', '#ff9147', '#ffd66a', '#f76f88'],
    moon: ['#4bc7df', '#70a8ff', '#a9d7ff', '#8ce8dc'],
  };
  const average = (points) => ({
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  });
  class Particles {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.palette = 'rainbow';
      this.time = 0;
      this.reset();
    }
    reset() {
      this.points = Array.from({ length: this.settings.density }, (_, i) => ({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        u: (i + 0.5) / this.settings.density,
        i,
        color: i % 4,
        band:
          Math.sqrt(-2 * Math.log(0.001 + ((i * 0.754877666) % 0.999))) *
          Math.cos(i * 2.399963) *
          0.65,
        drift: i % 9 === 0,
        checkpoint: i,
        previousDistance: Infinity,
      }));
      if (!this.renderer && window.ParticlePoints) this.renderer = new window.ParticlePoints();
      this.charge = 0;
      this.burstTime = 0;
      this.lastTouches = [];
      this.touchCount = 0;
      this.previousCount = 0;
      this.previousContacts = new Map();
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches) {
      if (this.points.length !== this.settings.density) this.reset();
      const step = Math.min(2, dt * 60) * (this.settings.gentle ? 0.55 : 1),
        count = Math.min(10, touches.length);
      this.time += dt;
      this.touchCount = count;
      touches = touches.slice(0, 10);
      const contacts = touches.map((p, i) => {
        const id = p.id ?? i,
          old = this.previousContacts?.get(id),
          scale = 1 / Math.max(0.001, dt);
        return {
          ...p,
          id,
          vx: old ? Math.max(-700, Math.min(700, (p.x - old.x) * scale)) : 0,
          vy: old ? Math.max(-700, Math.min(700, (p.y - old.y) * scale)) : 0,
          near: 0,
        };
      });
      this.previousContacts = new Map(contacts.map((p) => [p.id, { x: p.x, y: p.y }]));
      let center = { x: this.w / 2, y: this.h / 2 };
      if (count) {
        center = average(contacts);
        this.center = center;
        this.lastTouches = contacts.map((p) => ({ x: p.x, y: p.y }));
        this.charge = Math.min(1.7, this.charge + dt * 0.7);
      }
      // Nearby contacts form one flow; separated clusters form separate swarms.
      // Grouping follows proximity, so moving fingers can split or join the currents.
      let groups = contacts.length ? [contacts] : [];
      if (count >= 4 && count !== 7) {
        const nearest = contacts
          .map((q, i) =>
            Math.min(
              ...contacts.filter((_, j) => j !== i).map((p) => Math.hypot(p.x - q.x, p.y - q.y))
            )
          )
          .sort((a, b) => a - b);
        const threshold = Math.max(
            32,
            Math.min(105, nearest[Math.floor(nearest.length / 2)] * 1.6)
          ),
          remaining = new Set(contacts);
        groups = [];
        while (remaining.size) {
          const group = [remaining.values().next().value];
          remaining.delete(group[0]);
          for (let i = 0; i < group.length; i++)
            for (const q of remaining)
              if (Math.hypot(q.x - group[i].x, q.y - group[i].y) < threshold) {
                group.push(q);
                remaining.delete(q);
              }
          groups.push(group);
        }
      }
      const groupKey = groups.map((g) => g.map((q) => q.id).join(',')).join(';'),
        changed = groupKey !== this.groupKey;
      const fields = groups.map((points) => {
        let distance = 0,
          pairs = 0;
        for (let i = 0; i < points.length; i++)
          for (let j = i + 1; j < points.length; j++) {
            distance += Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            pairs++;
          }
        const span = distance / Math.max(1, pairs);
        const mean = average(points);
        let xx = 0,
          xy = 0,
          yy = 0;
        for (const q of points) {
          const x = q.x - mean.x,
            y = q.y - mean.y;
          xx += x * x;
          xy += x * y;
          yy += y * y;
        }
        const axis = 0.5 * Math.atan2(2 * xy, xx - yy);
        return {
          points,
          span,
          axis,
          energy: points.length === 1 ? 5 : Math.max(0.25, Math.min(12, span * span * 0.00025)),
        };
      });
      this.burstTime = Math.max(0, this.burstTime - dt);
      for (const p of this.points) {
        if (count === 7) {
          const desiredX = 2.3 + Math.sin(p.y * 0.007 + this.time * 0.17) * 0.3;
          p.vx += (desiredX - p.vx) * 0.045 * step;
          p.vy += (Math.sin(p.x * 0.008 - this.time * 0.2) * 0.65 - p.vy) * 0.045 * step;
          for (const q of contacts) {
            const dx = p.x - q.x,
              dy = p.y - q.y,
              d = Math.max(0.01, Math.hypot(dx, dy)),
              f = Math.max(0, 1 - d / 75);
            p.vx += ((dx / d) * f * 0.21 - (dy / d) * f * 0.08) * step;
            p.vy += ((dy / d) * f * 0.21 + (dx / d) * f * 0.08) * step;
          }
        } else if (count) {
          p.drawColor = p.color;
          const field = fields[Math.floor(p.i / 4) % fields.length],
            route = field.points,
            routeCount = route.length;
          if (changed) {
            p.checkpoint = p.i % routeCount;
            p.previousDistance = Infinity;
          }
          let goal = route[p.checkpoint % routeCount],
            dx = goal.x - p.x,
            dy = goal.y - p.y,
            d = Math.hypot(dx, dy);
          // Fingers are moving checkpoints, not vertices of a prescribed orbit.
          // Keep momentum through each checkpoint; a close fly-by advances too.
          const reach = Math.max(7, Math.min(27, field.span * 0.12)),
            passed =
              d > p.previousDistance + 0.2 &&
              p.previousDistance < Math.max(reach, field.span * 0.32);
          if (routeCount > 1 && (d < reach || passed)) {
            p.checkpoint = (p.checkpoint + (p.color % 2 ? routeCount - 1 : 1)) % routeCount;
            goal = route[p.checkpoint];
            dx = goal.x - p.x;
            dy = goal.y - p.y;
            d = Math.hypot(dx, dy);
            p.previousDistance = Infinity;
          } else p.previousDistance = d;
          const orientation = field.axis + (p.color * Math.PI) / 4,
            cos = Math.cos(orientation),
            sin = Math.sin(orientation),
            u = dx * cos + dy * sin,
            v = -dx * sin + dy * cos;
          const stiffness = 0.0016,
            squeeze = routeCount === 1 ? 4 : 2.6,
            fu = u * stiffness,
            fv = v * stiffness * squeeze;
          p.vx += (fu * cos - fv * sin) * step;
          p.vy += (fu * sin + fv * cos) * step;
          const curl = (p.color % 2 ? 1 : -1) * 0.018;
          p.vx += ((-dy / (d + 25)) * curl + goal.vx * 0.00005) * step;
          p.vy += ((dx / (d + 25)) * curl + goal.vy * 0.00005) * step;
          const energy = (p.vx * p.vx + p.vy * p.vy + stiffness * (u * u + v * v * squeeze)) * 0.5,
            targetEnergy = field.energy * Math.max(0.35, 1 + p.band * 0.22) * (p.drift ? 1.8 : 1);
          const feedback = Math.max(-0.035, Math.min(0.018, (targetEnergy - energy) * 0.004));
          const damping = Math.pow(0.998 + feedback, step);
          p.vx *= damping;
          p.vy *= damping;
          for (const q of contacts) if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 < 20 * 20) q.near++;
        } else if (!this.burstTime) {
          const a =
            Math.sin(p.y * 0.007 + this.time * 0.2) + Math.cos(p.x * 0.009 - this.time * 0.15);
          p.vx += Math.cos(a) * 0.014 * step;
          p.vy += Math.sin(a) * 0.014 * step;
          p.vx *= Math.pow(0.996, step);
          p.vy *= Math.pow(0.996, step);
        } else {
          p.vx *= Math.pow(0.99, step);
          p.vy *= Math.pow(0.99, step);
        }
        const speed = Math.hypot(p.vx, p.vy),
          limit = this.burstTime ? 28 : 16;
        if (speed > limit) {
          p.vx *= limit / speed;
          p.vy *= limit / speed;
        }
        p.x += p.vx * step;
        p.y += p.vy * step;
        if (count === 7)
          for (const q of contacts) {
            const dx = p.x - q.x,
              dy = p.y - q.y,
              d = Math.hypot(dx, dy);
            if (d < 28) {
              const nx = d < 0.01 ? 1 : dx / d,
                ny = d < 0.01 ? 0 : dy / d;
              p.x = q.x + nx * 28;
              p.y = q.y + ny * 28;
              const normal = p.vx * nx + p.vy * ny;
              if (normal < 0) {
                p.vx -= normal * nx;
                p.vy -= normal * ny;
              }
            }
          }
        p.x = ((p.x % this.w) + this.w) % this.w;
        p.y = ((p.y % this.h) + this.h) % this.h;
      }
      this.previousCount = count;
      this.groupKey = groupKey;
    }
    draw() {
      const c = this.ctx,
        colors = palettes[this.palette];
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000000';
      c.fillRect(0, 0, this.w, this.h);
      if (this.renderer?.draw(c, this.w, this.h, this.points, colors)) return;
      c.globalCompositeOperation = 'lighter';
      for (let lane = 0; lane < 4; lane++) {
        c.fillStyle = colors[lane];
        c.globalAlpha = 0.78;
        c.beginPath();
        for (const p of this.points)
          if (p.color === lane) {
            const radius = 0.6 + (p.i % 5) * 0.12;
            c.moveTo(p.x + radius, p.y);
            c.arc(p.x, p.y, radius, 0, TAU);
          }
        c.fill();
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    dispose() {
      this.renderer?.dispose();
    }
    down() {
      this.sound.pulse(1);
      this.sound.space?.(Math.max(1, this.touchCount + 1));
    }
    up(p, remaining = 0, cancelled = false) {
      if (remaining) return;
      if (cancelled) {
        this.charge = 0;
        return;
      }
      const center = this.center || { x: this.w / 2, y: this.h / 2 },
        energy = 7 + this.charge * 9,
        origins = this.lastTouches.length ? this.lastTouches : [center];
      for (const q of this.points) {
        const origin =
          origins.reduce(
            (best, p) =>
              Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(q.x - best.x, q.y - best.y) ? p : best,
            origins[0]
          ) || center;
        let dx = q.x - origin.x,
          dy = q.y - origin.y,
          d = Math.hypot(dx, dy);
        if (d < 1) {
          const a = q.u * TAU * 23;
          dx = Math.cos(a);
          dy = Math.sin(a);
          d = 1;
        }
        const speed = energy * (0.6 + (q.i % 17) / 34);
        q.vx = (dx / d) * speed;
        q.vy = (dy / d) * speed;
      }
      this.burstTime = 2.2;
      this.charge = 0;
      this.sound.pulse(2);
    }
  }
  function particlePreview(c, w, h) {
    const toy = new Particles(c, w, h, { density: 1800, gentle: false }, {});
    for (let i = 0; i < 70; i++) toy.update(1 / 60, [{ x: w * 0.5, y: h * 0.59 }]);
    toy.draw();
    toy.dispose();
  }
  window.StillToys = { Particles, particlePreview };
})();
