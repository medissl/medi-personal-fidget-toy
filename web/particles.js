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
  // JavaScript adaptation of starparticle::getAVG / getCircleFingers, StarEngine.
  // Copyright (c) 2010-2017 Sung Woo Choi. MIT; see licenses/StarEngine-MIT.txt.
  // https://github.com/sunglab/StarEngine/blob/46ef40a9051efd95265386282a06cbfb6ee39186/effect/StarParticle.h
  function getCircleFingers(points) {
    const center = average(points),
      ordered = points.slice();
    ordered.sort(
      (a, b) =>
        Math.atan2(center.y - b.y, center.x - b.x) - Math.atan2(center.y - a.y, center.x - a.x)
    );
    const circumference = ordered.reduce((sum, p, i) => {
      const q = ordered[(i + 1) % ordered.length];
      return sum + Math.hypot(p.x - q.x, p.y - q.y);
    }, 0);
    return { center, ordered, circumference };
  }
  class Particles {
    constructor(ctx, w, h, settings, sound) {
      Object.assign(this, { ctx, w, h, settings, sound });
      this.palette = 'rainbow';
      this.time = 0;
      this.reset();
    }
    reset() {
      this.points = Array.from({ length: this.settings.density }, (_, i) => {
        const x = Math.random() * this.w,
          y = Math.random() * this.h;
        return {
          x,
          y,
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
          phase: Math.random() * TAU,
          spread: Math.random(),
          history: Float32Array.from({ length: 12 }, (_, j) => (j % 2 ? y : x)),
        };
      });
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
        const { center: mean, ordered, circumference: perimeter } = getCircleFingers(points);
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
          points: ordered,
          perimeter,
          span,
          axis,
          energy: points.length === 1 ? 10 : Math.max(6, Math.min(30, span * span * 0.0004)),
          center: mean,
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
          const retained = route.findIndex((q) => q.id === p.goalId);
          if (retained >= 0) p.checkpoint = retained;
          else if (changed || !Number.isFinite(p.checkpoint)) {
            p.checkpoint = p.i % routeCount;
            p.previousDistance = Infinity;
          }
          const spread = 3 + p.spread * (routeCount === 1 ? 5 : 11);
          let goal = route[p.checkpoint % routeCount],
            dx = goal.x + Math.cos(p.phase) * spread - p.x,
            dy = goal.y + Math.sin(p.phase) * spread - p.y,
            d = Math.hypot(dx, dy);
          // Fingers are moving checkpoints, not vertices of a prescribed orbit.
          // Keep momentum through each checkpoint; a close fly-by advances too.
          const reach = Math.max(7, Math.min(16, field.span * 0.06)),
            passed = d > p.previousDistance + 0.2 && p.previousDistance < reach * 1.2;
          if (routeCount > 1 && (d < reach || passed)) {
            p.checkpoint = (p.checkpoint + (p.color % 2 ? routeCount - 1 : 1)) % routeCount;
            goal = route[p.checkpoint];
            dx = goal.x + Math.cos(p.phase) * spread - p.x;
            dy = goal.y + Math.sin(p.phase) * spread - p.y;
            d = Math.hypot(dx, dy);
            p.previousDistance = Infinity;
          } else p.previousDistance = d;
          p.goalId = goal.id;
          if (routeCount > 2) {
            const previous = route[(p.checkpoint + routeCount - 1) % routeCount],
              next = route[(p.checkpoint + 1) % routeCount],
              tx = next.x - previous.x,
              ty = next.y - previous.y,
              len = Math.max(1, Math.hypot(tx, ty)),
              lane = (p.color - 1.5) * 6 + (p.spread - 0.5) * 5;
            dx = goal.x - (ty / len) * lane - p.x;
            dy = goal.y + (tx / len) * lane - p.y;
            d = Math.hypot(dx, dy);
            // Steering to successive live checkpoints keeps an open interior.
            // Inertia rounds and distorts the flow as the boundary moves.
            const speed =
                Math.max(2.4, Math.min(7, field.perimeter * 0.007)) * (0.88 + p.spread * 0.24),
              desiredX = (dx / Math.max(1, d)) * speed,
              desiredY = (dy / Math.max(1, d)) * speed,
              turn = 0.045 + p.spread * 0.025;
            p.vx += (desiredX - p.vx) * turn * step + goal.vx * 0.00035 * step;
            p.vy += (desiredY - p.vy) * turn * step + goal.vy * 0.00035 * step;
          } else {
            const orientation = field.axis + (p.color * Math.PI) / 4,
              cos = Math.cos(orientation),
              sin = Math.sin(orientation),
              u = dx * cos + dy * sin,
              v = -dx * sin + dy * cos;
            const stiffness = 0.0012 * (0.88 + p.spread * 0.24),
              squeeze = routeCount === 1 ? 7 : 2.5,
              fu = u * stiffness,
              fv = v * stiffness * squeeze;
            p.vx += (fu * cos - fv * sin) * step;
            p.vy += (fu * sin + fv * cos) * step;
            // Maintain orbital momentum, rather than damping a whole color into one line.
            // These are local forces around live contacts, never positions on a drawn path.
            const handed = p.color % 2 ? 1 : -1,
              momentum = dx * p.vy - dy * p.vx,
              desiredMomentum = handed * field.energy * (14 + p.spread * 13),
              torque = Math.max(-0.3, Math.min(0.3, (desiredMomentum - momentum) * 0.0007));
            p.vx += ((-dy / (d + 16)) * torque + goal.vx * 0.0007) * step;
            p.vy += ((dx / (d + 16)) * torque + goal.vy * 0.0007) * step;
            const energy =
                (p.vx * p.vx + p.vy * p.vy + stiffness * (u * u + v * v * squeeze)) * 0.5,
              targetEnergy = field.energy * (0.72 + p.spread * 0.56) * (p.drift ? 1.8 : 1);
            const feedback = Math.max(-0.035, Math.min(0.018, (targetEnergy - energy) * 0.004));
            const damping = Math.pow(0.998 + feedback, step);
            p.vx *= damping;
            p.vy *= damping;
          }
          for (const q of contacts) if ((p.x - q.x) ** 2 + (p.y - q.y) ** 2 < 20 * 20) q.near++;
        } else if (!this.burstTime) {
          // Incompressible curl flow keeps the idle field spread across the screen.
          p.vx = Math.sin(p.y * 0.009 + this.time * 0.17 + p.phase) * 1.2 + Math.cos(p.phase) * 0.3;
          p.vy = Math.cos(p.x * 0.009 - this.time * 0.13 + p.phase) * 1.2 + Math.sin(p.phase) * 0.3;
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
        const wrapped =
          (!count || count === 7) && (p.x < 0 || p.x >= this.w || p.y < 0 || p.y >= this.h);
        // Held currents can leave the viewport and curve back; teleporting them
        // across an edge destroyed the shape during wide pinches.
        if (!count || count === 7) {
          p.x = ((p.x % this.w) + this.w) % this.w;
          p.y = ((p.y % this.h) + this.h) % this.h;
        }
        if (p.history) {
          if (wrapped)
            for (let j = 0; j < 12; j += 2) {
              p.history[j] = p.x;
              p.history[j + 1] = p.y;
            }
          else {
            p.history.copyWithin(2, 0, 10);
            p.history[0] = p.x;
            p.history[1] = p.y;
          }
        }
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
      if (this.renderer?.draw(c, this.w, this.h, this.points, colors)) {
        if (c.canvas?.id === 'playground') c.clearRect(0, 0, this.w, this.h);
        return;
      }
      c.globalCompositeOperation = 'lighter';
      for (let lane = 0; lane < 4; lane++) {
        c.strokeStyle = colors[lane];
        c.globalAlpha = 0.4;
        c.lineWidth = 0.9;
        c.beginPath();
        for (const p of this.points)
          if (p.color === lane && p.history) {
            const dx = p.history[10] - p.x,
              dy = p.history[11] - p.y,
              d = Math.hypot(dx, dy),
              limit = d > 32 ? 32 / d : 1;
            c.moveTo(p.x, p.y);
            c.lineTo(p.x + dx * limit, p.y + dy * limit);
          }
        c.stroke();
        c.fillStyle = colors[lane];
        c.globalAlpha = 0.4;
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
