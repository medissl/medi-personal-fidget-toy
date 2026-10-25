const assert = require('node:assert/strict'),
  path = require('node:path'),
  fs = require('node:fs'),
  crypto = require('node:crypto');
const { chromium } = require('playwright'),
  { createServer } = require('./serve.cjs');
(async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port,
    out = path.resolve(__dirname, '../test-results/v4');
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
      window.__samples = [];
      window.StillNative = {
        setImmersive: (v) => window.__immersive.push(v),
        setMotionEnabled() {},
        pulse() {},
      };
      const Native = window.AudioContext;
      window.AudioContext = class extends Native {
        createBufferSource() {
          const s = super.createBufferSource(),
            start = s.start.bind(s);
          s.start = (...a) => {
            window.__samples.push(s.buffer?.duration);
            start(...a);
          };
          return s;
        }
      };
    });
    const page = await context.newPage(),
      errors = [],
      external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (r) => {
      if (!r.url().startsWith(base)) external.push(r.url());
    });
    const shot = (n) => page.screenshot({ path: path.join(out, n + '.png'), fullPage: true }),
      hash = async () =>
        crypto
          .createHash('sha256')
          .update(await page.locator('#playground').screenshot())
          .digest('hex');
    const reveal = async () => {
      if (await page.locator('#game-controls').evaluate((e) => e.inert)) {
        await page.touchscreen.tap(195, 36);
        await page.waitForTimeout(350);
      }
    };
    const close = async () => {
      await reveal();
      await page.locator('#close-toy').click();
    };
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.title(), 'No-No Stress');
    assert(await page.locator('#home-mark').evaluate((e) => e.complete && e.naturalWidth > 0));
    assert(await page.evaluate(() => document.fonts.check('600 40px Fredoka')));
    const alignment = await page.locator('#play').evaluate((e) => {
      const a = e.getBoundingClientRect(),
        b = e.querySelector('svg').getBoundingClientRect();
      return (
        Math.abs(a.x + a.width / 2 - b.x - b.width / 2) +
        Math.abs(a.y + a.height / 2 - b.y - b.height / 2)
      );
    });
    assert(alignment < 1, 'centered play glyph');
    assert.equal(await page.locator('#home-title').innerText(), 'No-No Stress');
    assert.equal(
      await page.locator('#github-link').getAttribute('href'),
      'https://github.com/medissl'
    );
    assert.equal(await page.locator('#random-play').count(), 0);
    await shot('menu');
    await page.locator('#play').click();
    assert.equal(await page.locator('[data-toy]').count(), 14);
    const boxes = await page.locator('[data-toy]').evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y };
      })
    );
    assert(
      Math.abs(boxes[0].y - boxes[1].y) < 1 && boxes[1].x > boxes[0].x && boxes[2].y > boxes[0].y
    );
    await shot('selection');
    await page.locator('[data-toy="particles"]').click();
    assert.equal(await page.locator('#game-controls button').count(), 2);
    assert.equal(await page.locator('#toy-options button').count(), 3);
    await page.waitForTimeout(2600);
    assert(
      !(await page.locator('#game-controls').evaluate((e) => e.inert)),
      'controls survive two seconds'
    );
    await page.waitForTimeout(2850);
    assert(await page.locator('#game-controls').evaluate((e) => e.inert), 'five-second fade');
    const session = await context.newCDPSession(page),
      touch = (type, points) =>
        session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    await touch('touchStart', [{ x: 195, y: 450, id: 1 }]);
    await touch('touchMove', [{ x: 195, y: 35, id: 1 }]);
    await touch('touchEnd', []);
    assert(await page.locator('#game-controls').evaluate((e) => e.inert), 'swipe does not reveal');
    await page.touchscreen.tap(354, 36);
    await page.waitForTimeout(350);
    assert(
      !(await page.locator('#settings').evaluate((e) => e.open)),
      'wake tap over hidden gear does not open settings'
    );
    assert(!(await page.locator('#game-controls').evaluate((e) => e.inert)));
    await page.locator('#player .settings-open').click();
    assert(await page.locator('#settings').evaluate((e) => e.open), 'second tap opens options');
    const frozen = await hash();
    await page.waitForTimeout(150);
    assert.equal(await hash(), frozen, 'settings pauses gameplay');
    await page.locator('#music').check();
    for (const id of ['volume', 'sfx-volume', 'music-volume'])
      await page.locator('#' + id).fill('100');
    await page.locator('#settings-close').click();
    await page.waitForFunction(
      () =>
        !document.querySelector('#bgm').paused && document.querySelector('#bgm').currentTime > 0.1
    );
    await page.waitForTimeout(5450);
    const points = Array.from({ length: 10 }, (_, i) => ({
      x: 65 + (i % 5) * 65,
      y: 300 + Math.floor(i / 5) * 210,
      id: i + 1,
    }));
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      await touch('touchStart', n === 1 ? [{ x: 195, y: 422, id: 1 }] : points.slice(0, n));
      await page.waitForTimeout(n === 1 ? 1800 : 800);
      if ([1, 2, 6, 7, 8, 9, 10].includes(n)) await shot('particles-' + n);
      await touch('touchEnd', []);
      await page.waitForTimeout(160);
    }
    await shot('burst');
    assert(
      await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 200;
        const c = canvas.getContext('2d');
        const t = new StillToys.Particles(c, 200, 200, { density: 100, gentle: false }, {});
        t.lastTouches = [{ x: 100, y: 100 }];
        t.touchCount = 1;
        for (const p of t.points) {
          p.x = 30;
          p.y = 30;
        }
        t.draw();
        const black = Array.from(c.getImageData(100, 100, 1, 1).data)
          .slice(0, 3)
          .every((v) => v === 0);
        t.dispose();
        return black;
      }),
      'no painted white fingertip or background residue'
    );

    await close();
    assert(await page.locator('#bgm').evaluate((e) => e.paused));
    for (const id of [
      'wood',
      'metal',
      'slime',
      'wrap',
      'zipper',
      'lava',
      'switches',
      'glass',
      'pond',
      'bubbles',
      'dial',
      'sand',
      'cradle',
    ]) {
      await page.locator('[data-toy="' + id + '"]').scrollIntoViewIfNeeded();
      const scroll = await page.evaluate(() => scrollY);
      await page.locator('[data-toy="' + id + '"]').click();
      assert.equal(
        (await page.locator('#player').innerText()).trim(),
        '',
        'no gameplay text ' + id
      );
      if (id === 'wood') {
        await page.mouse.move(180, 420);
        await page.mouse.down();
        for (let x = 100; x < 300; x += 5) await page.mouse.move(x, 430);
        await page.mouse.up();
      } else if (id === 'lava') {
        await page.mouse.move(100, 440);
        await page.mouse.down();
        for (let i = 0; i < 35; i++)
          await page.mouse.move(100 + i * 5, 440 + Math.sin(i * 0.14) * 90);
        await page.mouse.up();
      } else if (id === 'slime') {
        await touch('touchStart', [{ x: 195, y: 422, id: 1 }]);
        await page.waitForTimeout(650);
        await shot('slime-indent');
        await touch('touchMove', [{ x: 260, y: 460, id: 1 }]);
        await page.waitForTimeout(200);
        await touch('touchEnd', []);
      } else if (id === 'zipper') {
        await page.mouse.move(195, 729);
        await page.mouse.down();
        await page.mouse.move(195, 20, { steps: 35 });
        await page.mouse.up();
      } else if (id === 'cradle') {
        await touch('touchStart', [
          { x: 155, y: 426, id: 1 },
          { x: 235, y: 426, id: 2 },
        ]);
        await touch('touchMove', [
          { x: 60, y: 400, id: 1 },
          { x: 330, y: 400, id: 2 },
        ]);
        await page.waitForTimeout(300);
        await shot('cradle-two-fingers');
        await touch('touchEnd', []);
      } else if (id === 'sand') {
        const before = await hash();
        await page.mouse.move(80, 340);
        await page.mouse.down();
        for (let i = 0; i < 25; i++)
          await page.mouse.move(80 + i * 9, 340 + Math.sin(i * 0.17) * 60);
        await page.mouse.up();
        await page.waitForTimeout(100);
        assert.notEqual(await hash(), before, 'sand rake must leave marks');
      } else if (id === 'dial') {
        await page.mouse.move(305, 422);
        await page.mouse.down();
        for (let i = 0; i < 40; i++)
          await page.mouse.move(195 + Math.cos(i * 0.3) * 110, 422 + Math.sin(i * 0.3) * 110);
        await page.mouse.up();
      } else {
        await page.touchscreen.tap(
          id === 'switches' ? 110 : id === 'wrap' ? 164 : id === 'glass' ? 55 : 195,
          id === 'glass' ? 330 : id === 'wrap' ? 391 : 422
        );
      }
      await page.waitForTimeout(id === 'glass' ? 400 : 150);
      await shot(id);
      await close();
      assert(
        Math.abs((await page.evaluate(() => scrollY)) - scroll) < 3,
        'scroll restoration ' + id
      );
    }
    assert((await page.evaluate(() => window.__samples.length)) > 12, 'recorded samples played');
    assert.equal(await page.evaluate(() => window.__immersive.at(-1)), false);
    await page.reload();
    await page.locator('#home .settings-open').click();
    assert.equal(await page.locator('#volume').inputValue(), '100');
    assert(await page.locator('#music').isChecked());
    await shot('settings');
    await page.locator('#settings-close').click();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await shot('menu-' + width);
    }
    const native = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await native.addInitScript(() => {
      if (location.protocol === 'http:')
        localStorage.setItem(
          'still-settings',
          JSON.stringify({
            schema: 2,
            muted: true,
            sounds: true,
            music: true,
            volume: 100,
            sfxVolume: 100,
            musicVolume: 100,
          })
        );

      window.__audio = [];
      window.StillNative = {
        configureAudio: (...a) => window.__audio.push(['config', ...a]),
        playSound: (...a) => window.__audio.push(['play', ...a]),
        pulse() {},
        setImmersive() {},
        setMotionEnabled() {},
      };
      window.AudioContext = class {
        constructor() {
          throw Error('Native must bypass WebAudio');
        }
      };
    });
    const p = await native.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base);
    await p.locator('#play').click();
    await p.locator('[data-toy="wrap"]').click();
    await p.mouse.click(42, 200);
    await p.mouse.click(47, 150);
    assert(
      await p.evaluate(() => window.__audio.some((c) => c[0] === 'play')),
      'native bridge effects'
    );
    assert.equal(
      await p.locator('#bgm').getAttribute('src'),
      null,
      'native never assigns WebView music URL'
    );
    assert(
      await p.evaluate(() =>
        window.__audio.some(
          (c) => c[0] === 'config' && c[1] === true && c[2] === true && c[3] === true
        )
      ),
      'legacy mute cannot silence an upgrade'
    );
    await native.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    fs.writeFileSync(
      path.join(out, 'result.json'),
      JSON.stringify(
        { passed: true, toys: 14, gestures: '1–10', fadeSeconds: 5, errors, external },
        null,
        2
      )
    );
    console.log(
      'PASS: v4 branding, two columns, 14 toys, centered Play, 5-second fade, reveal-before-activate, swipe suppression, 1–10 touches, real WAV/music playback, native bridge bypass, persistence and scroll restoration.'
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
