const assert = require('node:assert/strict'),
  path = require('node:path'),
  fs = require('node:fs'),
  crypto = require('node:crypto');
const { chromium } = require('playwright'),
  { createServer } = require('./serve.cjs');
(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port,
    out = path.resolve(__dirname, '../test-results/v2');
  fs.mkdirSync(out, { recursive: true });
  let browser;
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
    await context.addInitScript(() => {
      window.__immersive = [];
      window.StillNative = { setImmersive: (value) => window.__immersive.push(value), pulse() {} };
      const Native = window.AudioContext;
      window.__gains = [];
      window.__samples = [];
      window.AudioContext = class extends Native {
        createGain() {
          const gain = super.createGain();
          window.__gains.push(gain);
          return gain;
        }
        createBufferSource() {
          const source = super.createBufferSource(),
            start = source.start.bind(source);
          source.start = (...a) => {
            window.__samples.push(source.buffer?.duration);
            start(...a);
          };
          return source;
        }
      };
    });
    const page = await context.newPage(),
      errors = [],
      external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (['error', 'warning'].includes(m.type())) errors.push(m.text());
    });
    page.on('request', (r) => {
      if (!r.url().startsWith(base)) external.push(r.url());
    });
    const shot = (name) => page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    const hash = async () =>
      crypto
        .createHash('sha256')
        .update(await page.locator('#playground').screenshot())
        .digest('hex');
    const reveal = async () => {
      await page.touchscreen.tap(195, 84);
      await page.waitForTimeout(330);
      assert(!(await page.locator('#game-controls').evaluate((el) => el.inert)));
    };
    const close = async () => {
      await reveal();
      await page.getByRole('button', { name: 'Back to toy selection', exact: true }).click();
    };
    await page.goto(base);
    assert.equal(
      (await page.locator('#home').innerText()).trim().replace(/\s+/g, ' '),
      'Medi Personal Fidget Toy'
    );
    await shot('menu');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    assert.equal(await page.locator('[data-toy]').count(), 8);
    const boxes = await page.locator('[data-toy]').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width };
      })
    );
    assert(
      Math.abs(boxes[0].y - boxes[1].y) < 1 && boxes[1].x > boxes[0].x && boxes[2].y > boxes[0].y,
      'Selection must have two columns'
    );
    assert.equal(await page.locator('#library p,#library small').count(), 0);
    await shot('selection');
    await page.locator('[data-toy="particles"]').click();
    assert.equal((await page.locator('#player').innerText()).trim(), '');
    await page.waitForTimeout(2400);
    assert(await page.locator('#game-controls').evaluate((el) => el.inert));
    await shot('stardust-clear');
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 200, y: 450, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 200, y: 40, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert(
      await page.locator('#player').evaluate((el) => el.classList.contains('controls-hidden')),
      'Upward swipe must not reveal controls'
    );
    await reveal();
    assert(!(await page.locator('#game-controls').evaluate((el) => el.inert)));
    await shot('stardust-controls');
    for (const mode of ['Wave', 'Gravity', 'Ribbons', 'Electric', 'Flow']) {
      await reveal();
      await page.getByRole('button', { name: mode + ' mode', exact: true }).click();
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 195, y: 422, id: 1 }],
      });
      await page.waitForTimeout(300);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    const points = Array.from({ length: 10 }, (_, i) => ({
      x: 65 + (i % 5) * 60,
      y: 260 + Math.floor(i / 5) * 180,
      id: i + 1,
    }));
    for (const count of [2, 3, 4, 5, 10]) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: points.slice(0, count),
      });
      await page.waitForTimeout(80);
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 195, y: 422, id: 1 }],
    });
    await page.waitForTimeout(1800);
    await shot('gather');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(180);
    await shot('release-burst');
    await reveal();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const frozen = await hash();
    await page.waitForTimeout(120);
    assert.equal(await hash(), frozen);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await reveal();
    await page.locator('#player .settings-open').click();
    await page.locator('#music').check();
    await page.locator('#volume').fill('100');
    await page.locator('#sfx-volume').fill('100');
    await page.locator('#music-volume').fill('100');
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('#bgm').paused && document.querySelector('#bgm').currentTime > 0.1
    );
    assert(
      await page.evaluate(() => window.__gains.some((g) => g.gain.value >= 1.39)),
      'Audio gains must reach the new amplified level'
    );
    await close();
    assert(await page.locator('#bgm').evaluate((a) => a.paused));
    assert.equal(await page.evaluate(() => window.__immersive.at(-1)), false);
    for (const id of ['pond', 'bubbles', 'dial', 'slime', 'switches', 'sand', 'cradle']) {
      await page.locator('[data-toy="' + id + '"]').scrollIntoViewIfNeeded();
      const scroll = await page.evaluate(() => scrollY);
      await page.locator('[data-toy="' + id + '"]').click();
      assert.equal((await page.locator('#player').innerText()).trim(), '');
      if (id === 'bubbles') {
        const before = await hash();
        await page.touchscreen.tap(151, 378);
        await page.waitForTimeout(220);
        assert.notEqual(await hash(), before);
      }
      if (id === 'pond' || id === 'slime' || id === 'switches') {
        await page.touchscreen.tap(id === 'switches' ? 110 : 195, id === 'switches' ? 422 : 400);
        await page.waitForTimeout(200);
      }
      if (id === 'sand') {
        await page.mouse.move(80, 340);
        await page.mouse.down();
        for (let i = 0; i < 30; i++)
          await page.mouse.move(80 + i * 8, 340 + Math.sin(i * 0.2) * 70);
        await page.mouse.up();
      }
      if (id === 'dial') {
        await page.mouse.move(305, 422);
        await page.mouse.down();
        for (let i = 0; i < 60; i++)
          await page.mouse.move(195 + Math.cos(i * 0.3) * 110, 422 + Math.sin(i * 0.3) * 110);
        await page.mouse.up();
      }
      await page.waitForTimeout(2400);
      await shot(id);
      await close();
      assert(
        Math.abs((await page.evaluate(() => scrollY)) - scroll) < 2,
        'Selection scroll restoration'
      );
    }
    assert(
      (await page.evaluate(() => window.__samples.length)) > 3,
      'Recorded effects must actually play'
    );
    await page.reload();
    await page.locator('#home .settings-open').click();
    assert.equal(await page.locator('#volume').inputValue(), '100');
    assert(await page.locator('#music').isChecked());
    await shot('settings');
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(120);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await shot('menu-' + width);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    fs.writeFileSync(
      path.join(out, 'result.json'),
      JSON.stringify(
        {
          passed: true,
          checks: [
            'minimal menu',
            'two-column eight-toy selection',
            'no gameplay text',
            'two-second fade',
            'tap-only reveal',
            'swipe stays hidden',
            '1–10 touches',
            'five particle modes',
            'pause/reset',
            'recorded audio playback',
            'amplified gains',
            'music lifecycle',
            'settings persistence',
            'scroll restoration',
            'immersive bridge calls',
          ],
          errors,
          external,
        },
        null,
        2
      )
    );
    console.log(
      'PASS: v0.2 menus, eight toys, hidden controls, swipe/tap distinction, ten-touch input, recorded audio, amplified gains, lifecycle, and persistence.'
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
