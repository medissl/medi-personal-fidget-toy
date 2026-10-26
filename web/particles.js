(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const palettes = {
    rainbow: ['#125bff', '#ff3828', '#24dfc9', '#ffd23a'],
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
          i,
          color: i % 4,
          band:
            Math.sqrt(-2 * Math.log(0.001 + ((i * 0.754877666) % 0.999))) *
            Math.cos(i * 2.399963) *
            0.65,
          drift: i % 9 === 0,
          emission: 1,
          previousDistance: Infinity,
          phase: Math.random() * TAU,
          spread: Math.random(),
          history: Float32Array.from({ length: 22 }, (_, j) => (j % 2 ? y : x)),
        };
      });
      if (!this.renderer && window.ParticlePoints) this.renderer = new window.ParticlePoints();
      this.charge = 0;
      this.burstTime = 0;
      this.lastTouches = [];
      this.touchCount = 0;
      this.touchKey = '';
      this.previousContacts = new Map();
      this.flowCols = Math.ceil(this.w / 48);
      this.flowRows = Math.ceil(this.h / 48);
      this.flowGrid = new Float32Array(this.flowCols * this.flowRows * 16);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    resize(w, h) {
      this.w = w;
      this.h = h;
      this.reset();
    }
    update(dt, touches = []) {
      if (this.points.length !== this.settings.density) this.reset();
      const step = Math.min(2, dt * 60) * (this.settings.gentle ? 0.55 : 1);
      this.time += dt;
      const contacts = touches.slice(0, 10).map((q, i) => {
        const id = q.id ?? i,
          old = this.previousContacts.get(id),
          x = Math.max(0, Math.min(this.w, q.x)),
          y = Math.max(0, Math.min(this.h, q.y));
        return {
          x,
          y,
          id,
          vx: old ? Math.max(-12, Math.min(12, (x - old.x) / Math.max(step, 0.01))) : 0,
          vy: old ? Math.max(-12, Math.min(12, (y - old.y) / Math.max(step, 0.01))) : 0,
        };
      });
      this.previousContacts = new Map(contacts.map((q) => [q.id, { x: q.x, y: q.y }]));
      const count = contacts.length;
      this.touchCount = count;
      if (count) {
        this.center = average(contacts);
        this.lastTouches = contacts.map((q) => ({ x: q.x, y: q.y }));
        this.charge = Math.min(1.7, this.charge + dt * 0.7);
      }
      let groups = count ? [contacts] : [];
      if (count >= 4 && count !== 7) {
        // Connected touch neighborhoods can merge and separate as hands move.
        // There is no finger-count table of predefined effects or outlines.
        const nearest = contacts
          .map((q, i) =>
            Math.min(
              ...contacts.filter((_, j) => i !== j).map((p) => Math.hypot(q.x - p.x, q.y - p.y))
            )
          )
          .sort((a, b) => a - b);
        const distance = Math.max(38, Math.min(108, nearest[Math.floor(count / 2)] * 1.45));
        const remaining = new Set(contacts);
        groups = [];
        while (remaining.size) {
          const group = [remaining.values().next().value];
          remaining.delete(group[0]);
          for (let i = 0; i < group.length; i++)
            for (const q of remaining)
              if (Math.hypot(q.x - group[i].x, q.y - group[i].y) < distance) {
                group.push(q);
                remaining.delete(q);
              }
          groups.push(group);
        }
      }
      const fields = groups.map((group) => {
        const geometry = getCircleFingers(group),
          route = geometry.ordered;
        let xx = 0,
          xy = 0,
          yy = 0;
        for (const q of route) {
          const x = q.x - geometry.center.x,
            y = q.y - geometry.center.y;
          xx += x * x;
          xy += x * y;
          yy += y * y;
        }
        xx /= route.length;
        xy /= route.length;
        yy /= route.length;
        const delta = Math.sqrt((xx - yy) ** 2 + 4 * xy * xy);
        const major = (xx + yy + delta) * 0.5,
          minor = Math.max(0, (xx + yy - delta) * 0.5);
        const axis = 0.5 * Math.atan2(2 * xy, xx - yy),
          span = 2 * Math.sqrt(major);
        // Coincident or nearly collinear checkpoints cannot define a stable
        // closed circulation. Their live covariance supplies a compact or
        // stretched spring field instead, without discarding particle velocity.
        const orbitKind = major < 400 ? 1 : route.length <= 2 || minor < major * 0.04 ? 2 : 0;
        return {
          ...geometry,
          route,
          axis,
          span,
          orbitKind,
          motion: average(group.map((q) => ({ x: q.vx, y: q.vy }))),
        };
      });
      const touchKey = contacts
        .map((q) => q.id)
        .sort((a, b) => a - b)
        .join(',');
      const contactsChanged = touchKey !== this.touchKey;
      this.touchKey = touchKey;
      const owners = new Map();
      fields.forEach((field) => field.route.forEach((q) => owners.set(q.id, field)));
      this.burstTime = Math.max(0, this.burstTime - dt);
      if (!count) {
        this.flowGrid.fill(0);
        for (const p of this.points) {
          const cell =
            ((Math.min(this.flowRows - 1, Math.floor(p.y / 48)) * this.flowCols +
              Math.min(this.flowCols - 1, Math.floor(p.x / 48))) *
              4 +
              p.color) *
            4;
          p.flowCell = cell;
          this.flowGrid[cell] += p.vx;
          this.flowGrid[cell + 1] += p.vy;
          this.flowGrid[cell + 2] += Math.hypot(p.vx, p.vy);
          this.flowGrid[cell + 3]++;
        }
      }
      const freeTurn = 0.004 * step,
        freeCos = Math.cos(freeTurn),
        freeSin = Math.sin(freeTurn);
      for (const p of this.points) {
        if (count && (contactsChanged || !owners.has(p.owner)))
          p.owner = contacts[Math.floor(p.i / 4) % count].id;
        const field = owners.get(p.owner);
        const route = field?.route,
          center = field?.center,
          span = field?.span,
          axis = field?.axis,
          motion = field?.motion;
        const localCount = route?.length || 0;
        const targetLight = count
          ? 1
          : 1 + Math.min(1.25, 6 / Math.sqrt(this.flowGrid[p.flowCell + 3] + 1));
        p.emission += (targetLight - p.emission) * Math.min(1, 0.035 * step);
        if (count === 7) {
          p.vx += (2.8 + Math.sin(p.y * 0.007 + this.time * 0.17) * 0.4 - p.vx) * 0.045 * step;
          p.vy += (Math.sin(p.x * 0.008 - this.time * 0.2) * 0.65 - p.vy) * 0.045 * step;
          for (const q of contacts) {
            const dx = p.x - q.x,
              dy = p.y - q.y,
              d = Math.max(0.01, Math.hypot(dx, dy));
            const f = Math.max(0, 1 - d / 80);
            p.vx += ((dx / d) * f * 0.28 - (dy / d) * f * 0.12) * step;
            p.vy += ((dy / d) * f * 0.28 + (dx / d) * f * 0.12) * step;
          }
        } else if (count && field.orbitKind) {
          // A live anisotropic spring field with angular momentum feedback.
          // Independent energy bands prevent the held population from losing
          // its width. Positions are integrated; no points are placed on paths.
          const angle = axis + (p.color * Math.PI) / 4;
          const co = Math.cos(angle),
            si = Math.sin(angle);
          const squash = field.orbitKind === 1 ? 0.18 : 0.14 + Math.min(0.06, span / 2500);
          const dx = p.x - center.x,
            dy = p.y - center.y;
          const u = dx * co + dy * si,
            v = (-dx * si + dy * co) / squash;
          const vu = (p.vx - motion.x * 0.35) * co + (p.vy - motion.y * 0.35) * si;
          const vv = (-(p.vx - motion.x * 0.35) * si + (p.vy - motion.y * 0.35) * co) / squash;
          const radius =
            (field.orbitKind === 1 ? 43 : 20 + span * 0.58) *
            Math.max(0.65, Math.min(1.4, 1 + p.band * (p.drift ? 0.32 : 0.065)));
          const omega = (field.orbitKind === 1 ? 0.085 : 0.055) * (0.9 + p.spread * 0.2);
          const r = Math.max(8, Math.hypot(u, v));
          const handed = p.color % 2 ? -1 : 1;
          const angular = u * vv - v * vu;
          const torque = Math.max(
            -2.5,
            Math.min(2.5, ((handed * radius * radius * omega - angular) * 0.075) / r)
          );
          const energy = (vu * vu + vv * vv + omega * omega * (u * u + v * v)) * 0.5;
          const desired = omega * omega * radius * radius;
          const friction = Math.max(
            -0.13,
            Math.min(0.035, ((desired - energy) / Math.max(10, desired)) * 0.07)
          );
          const au = -u * omega * omega - (v / r) * torque + vu * friction;
          const av = -v * omega * omega + (u / r) * torque + vv * friction;
          p.vx += (au * co - av * si * squash + motion.x * 0.012) * step;
          p.vy += (au * si + av * co * squash + motion.y * 0.012) * step;
          if (field.orbitKind === 2)
            for (const q of route) {
              const x = q.x - p.x,
                y = q.y - p.y,
                d = Math.hypot(x, y) + 35;
              p.vx += (x / d) * 0.022 * step;
              p.vy += (y / d) * 0.022 * step;
            }
        } else if (count) {
          // Contacts are live checkpoints. Different fly-by distances and speeds
          // make a broad swarm, rather than collapsing everyone onto one rail.
          let index = route.findIndex((q) => q.id === p.goalId);
          if (index < 0) index = p.i % localCount;
          let goal = route[index];
          let dx = goal.x - p.x,
            dy = goal.y - p.y;
          let d = Math.hypot(dx, dy);
          const reach = 22 + p.spread * 35;
          const passed = d > p.previousDistance && p.previousDistance < reach * 1.7;
          if (d < reach || passed) {
            index = (index + (p.color % 2 ? localCount - 1 : 1)) % localCount;
            goal = route[index];
            p.previousDistance = Infinity;
          } else p.previousDistance = d;
          p.goalId = goal.id;
          const before = route[(index + localCount - 1) % localCount];
          const after = route[(index + 1) % localCount];
          const tx = after.x - before.x,
            ty = after.y - before.y;
          const length = Math.max(1, Math.hypot(tx, ty));
          const lane = (p.color - 1.5) * 12 + p.band * 6 + Math.sin(p.phase + this.time * 0.45) * 2;
          dx = goal.x - (ty / length) * lane - p.x;
          dy = goal.y + (tx / length) * lane - p.y;
          d = Math.max(1, Math.hypot(dx, dy));
          const speed =
            Math.max(3.4, Math.min(10, field.circumference * 0.011)) * (0.72 + p.spread * 0.6);
          const steering = 0.027 + p.spread * 0.023;
          p.vx += ((dx / d) * speed - p.vx) * steering * step + goal.vx * 0.01 * step;
          p.vy += ((dy / d) * speed - p.vy) * steering * step + goal.vy * 0.01 * step;
        } else {
          // The same persistent velocity evolves from release into drift. There
          // is no timer that overwrites the population with a second animation.
          const flowX =
            Math.sin(p.y * 0.009 + this.time * 0.17 + p.phase) * 1.2 + Math.cos(p.phase) * 0.3;
          const flowY =
            Math.cos(p.x * 0.009 - this.time * 0.13 + p.phase) * 1.2 + Math.sin(p.phase) * 0.3;
          // Local velocity diffusion retains coherent colored currents without
          // attracting particles to a new outline. Counter-flowing currents mix
          // weakly; a moving sheet keeps its common momentum through release.
          const cell = p.flowCell,
            n = this.flowGrid[cell + 3];
          const mx = this.flowGrid[cell] / n,
            my = this.flowGrid[cell + 1] / n;
          const coherence = Math.hypot(mx, my) / (this.flowGrid[cell + 2] / n + 0.001);
          const viscosity = 0.08 * coherence * coherence * step;
          p.vx += (mx - p.vx) * viscosity;
          p.vy += (my - p.vy) * viscosity;
          const sin = freeSin * (p.color % 2 ? -1 : 1),
            vx = p.vx;
          p.vx = vx * freeCos - p.vy * sin;
          p.vy = vx * sin + p.vy * freeCos;
          p.vx += (flowX - p.vx) * 0.002 * step;
          p.vy += (flowY - p.vy) * 0.002 * step;
        }
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 28) {
          p.vx *= 28 / speed;
          p.vy *= 28 / speed;
        }
        p.x += p.vx * step;
        p.y += p.vy * step;
        if (count === 7)
          for (const q of contacts) {
            const dx = p.x - q.x,
              dy = p.y - q.y,
              d = Math.hypot(dx, dy);
            if (d < 28) {
              let nx = d < 0.01 ? 1 : dx / d,
                ny = d < 0.01 ? 0 : dy / d;
              if (q.x + nx * 28 < 0 || q.x + nx * 28 > this.w) nx = -nx;
              if (q.y + ny * 28 < 0 || q.y + ny * 28 > this.h) ny = -ny;
              p.x = q.x + nx * 28;
              p.y = q.y + ny * 28;
              const normal = p.vx * nx + p.vy * ny;
              if (normal < 0) {
                p.vx -= normal * nx;
                p.vy -= normal * ny;
              }
            }
          }
        // Elastic screen boundaries keep released energy visible instead of
        // teleporting the whole swarm or replacing its state.
        let bounced = false;
        // The same walls apply while holding and after release. Enabling them
        // only on release snapped offscreen held particles into a wall of light.
        if (p.x < 0 || p.x > this.w) {
          p.x = Math.max(0, Math.min(this.w, p.x));
          p.vx *= -0.92;
          bounced = true;
        }
        if (p.y < 0 || p.y > this.h) {
          p.y = Math.max(0, Math.min(this.h, p.y));
          p.vy *= -0.92;
          bounced = true;
        }
        if (bounced)
          for (let j = 0; j < p.history.length; j += 2) {
            p.history[j] = p.x;
            p.history[j + 1] = p.y;
          }
        else {
          p.history.copyWithin(2, 0, p.history.length - 2);
          p.history[0] = p.x;
          p.history[1] = p.y;
        }
      }
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
      const center = this.center || { x: this.w / 2, y: this.h / 2 };
      const energy = 7 + this.charge * 7;
      const origins = this.lastTouches.length ? this.lastTouches : [center];
      for (const q of this.points) {
        const origin = origins.reduce(
          (best, p) =>
            Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(q.x - best.x, q.y - best.y) ? p : best,
          origins[0]
        );
        const dx = q.x - origin.x,
          dy = q.y - origin.y;
        const d = Math.hypot(dx, dy);
        const nx = d > 1 ? dx / d : Math.cos(q.phase),
          ny = d > 1 ? dy / d : Math.sin(q.phase);
        const impulse = energy * (0.6 + q.spread * 0.4);
        // Add an outward impulse; retain the colored swarm's existing momentum.
        q.vx += nx * impulse;
        q.vy += ny * impulse;
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
