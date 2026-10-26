const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { chromium } = require('playwright'),
  { createServer } = require('./serve.cjs');
(async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  let browser;
  const out = path.resolve(__dirname, '../test-results/v6');
  fs.mkdirSync(out, { recursive: true });
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.STILL_CHROMIUM_EXECUTABLE || undefined,
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      for (const Class of Object.values(StillToys))
        if (Class.prototype?.update) {
          const update = Class.prototype.update,
            draw = Class.prototype.draw;
          Class.prototype.update = function (...args) {
            window.__toy = this;
            if (!window.__freeze) return update.apply(this, args);
          };
          Class.prototype.__advance = update;
          Class.prototype.draw = function (...args) {
            window.__toy = this;
            if (!window.__freeze) return draw.apply(this, args);
          };
          Class.prototype.__draw = draw;
        }
    });
    await page.locator('#play').click();
    await page.locator('[data-toy="particles"]').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => (window.__freeze = true));
    const advance = async (frames, contacts) =>
      page.evaluate(
        ({ frames, contacts }) => {
          for (let i = 0; i < frames; i++) __toy.__advance(1 / 60, contacts);
          __toy.__draw();
          return { glError: __toy.renderer.gl.getError(), count: __toy.points.length };
        },
        { frames, contacts }
      );
    const shot = (name) =>
      page.locator('#player').screenshot({ path: path.join(out, name + '.png') });
    const pair = [
      { id: 1, x: 110, y: 400 },
      { id: 2, x: 280, y: 450 },
    ];
    let report = {};
    report.held = await advance(1200, pair);
    assert.equal(report.held.glError, 0);
    assert.equal(report.held.count, 14400);
    await shot('stardust-held-20s');
    const before = await page.evaluate(
      () => __toy.points.reduce((s, p) => s + p.y, 0) / __toy.points.length
    );
    for (let i = 1; i <= 90; i++)
      await advance(
        1,
        pair.map((p) => ({ ...p, x: p.x + (p.id === 1 ? -0.35 : 0.35) * i, y: p.y + i * 0.9 }))
      );
    await advance(
      45,
      pair.map((p) => ({ ...p, x: p.x + (p.id === 1 ? -31.5 : 31.5), y: p.y + 81 }))
    );
    await shot('stardust-dragged');
    const after = await page.evaluate(
      () => __toy.points.reduce((s, p) => s + p.y, 0) / __toy.points.length
    );
    assert(after - before > 45, 'swarm follows live translated fingers');
    report.followY = after - before;
    const triangle = [
      { id: 1, x: 80, y: 540 },
      { id: 2, x: 310, y: 540 },
      { id: 3, x: 195, y: 280 },
    ];
    await advance(480, triangle);
    await shot('stardust-three');
    const folded = [
      { id: 1, x: 70, y: 570 },
      { id: 2, x: 305, y: 520 },
      { id: 3, x: 85, y: 340 },
    ];
    for (let i = 1; i <= 90; i++)
      await advance(
        1,
        triangle.map((p, j) => ({
          ...p,
          x: p.x + ((folded[j].x - p.x) * i) / 90,
          y: p.y + ((folded[j].y - p.y) * i) / 90,
        }))
      );
    await shot('stardust-folded');
    await page.evaluate(() => __toy.up({}, 0, false));
    await advance(90, []);
    await shot('stardust-release-1.5s');
    await advance(54, []);
    await shot('stardust-release-2.4s');
    await advance(180, []);
    await shot('stardust-release-5.4s');
    report.neon = await page.evaluate(() => {
      const r = __toy.renderer,
        g = r.gl,
        w = r.canvas.width,
        h = r.canvas.height,
        data = new Uint8Array(w * h * 4);
      g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, data);
      let lit = 0;
      for (let i = 0; i < data.length; i += 4)
        if (Math.max(data[i], data[i + 1], data[i + 2]) > 35) lit++;
      return {
        litFraction: lit / (w * h),
        glError: g.getError(),
        renderer: 'particle light and connected trails',
      };
    });
    assert.equal(report.neon.glError, 0);

    assert(report.neon.litFraction > 0.02, 'release retains a rich visible population');
    // Exercise actual pointer dispatch and frame presentation, separately from
    // the fixed-step screenshot sequences above. Timing is this Chromium only.
    const cd = await context.newCDPSession(page),
      touch = (type, points) => cd.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await page.evaluate(() => {
      window.__freeze = false;
      window.__frames = [];
      let last;
      const next = (t) => {
        if (last) __frames.push(t - last);
        last = t;
        if (__frames.length < 150) requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    });
    await touch('touchStart', pair);
    for (let i = 1; i <= 60; i++) {
      await touch(
        'touchMove',
        pair.map((p) => ({
          ...p,
          x: p.x + (p.id === 1 ? 1 : -1) * Math.sin(i * 0.06) * 55,
          y: p.y + Math.sin(i * 0.04) * 60,
        }))
      );
      await page.waitForTimeout(16);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(600);
    report.frames = await page.evaluate(() => {
      const a = __frames.slice(10).sort((a, b) => a - b);
      return {
        meanMs: a.reduce((s, v) => s + v, 0) / a.length,
        p95Ms: a[Math.floor(a.length * 0.95)],
        samples: a.length,
      };
    });
    await page.evaluate(() => {
      window.__freeze = true;
      __toy.dispose();
    });
    report.densityLimits = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 300;
      const settings = { density: 24000, gentle: false };
      const t = new StillToys.Particles(canvas.getContext('2d'), 200, 300, settings, {
        pulse() {},
      });
      const results = [];
      for (const density of [24000, 4800]) {
        settings.density = density;
        t.__advance(1 / 60, [{ id: 1, x: 100, y: 150 }]);
        t.__draw();
        results.push({ density, count: t.points.length, error: t.renderer.gl.getError() });
      }
      t.dispose();
      return results;
    });
    assert(
      report.densityLimits.every((x) => x.error === 0 && x.count === x.density),
      'minimum and maximum particle densities render, including indexed batches'
    );
    // Verify actual shader reflections at equivalent local points on a sphere,
    // excluding the changed screen position/background from the comparison.
    report.chrome = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 390;
      c.height = 844;
      const ctx = c.getContext('2d'),
        r = new ChromeSurface();
      if (!r.gl) throw Error(r.error || 'chrome shader unavailable');
      const b = { x: 120, y: 350, r: 45, rotation: 0.1 };
      const sample = () => {
        const g = r.gl,
          data = new Uint8Array(4),
          values = [];
        for (let y = -25; y <= 25; y += 10)
          for (let x = -25; x <= 25; x += 10) {
            g.readPixels(
              Math.round((b.x + x) * 2),
              Math.round((844 - b.y - y) * 2),
              1,
              1,
              g.RGBA,
              g.UNSIGNED_BYTE,
              data
            );
            values.push(...data.slice(0, 3));
          }
        return values;
      };
      r.draw(ctx, 390, 844, [b], 0, 0);
      const a = sample();
      b.x = 265;
      b.y = 570;
      b.rotation = 2.4;
      r.draw(ctx, 390, 844, [b], 6, -5);
      const z = sample();
      const change = z.reduce((sum, v, i) => sum + Math.abs(v - a[i]), 0) / z.length;
      const glError = r.gl.getError();
      r.dispose();
      return { change, glError };
    });
    assert(report.chrome.change > 5, 'metal reflection changes with world position and tilt');
    assert.equal(report.chrome.glError, 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'visual-regressions.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser?.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
