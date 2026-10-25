const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { createServer } = require('./serve.cjs');

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = path.resolve(__dirname, '../test-results');
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
    const page = await context.newPage();
    const errors = [],
      external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) errors.push(message.text());
    });
    page.on('request', (request) => {
      if (!request.url().startsWith(base)) external.push(request.url());
    });
    const visible = async (selector) =>
      assert(await page.locator(selector).isVisible(), `Expected visible: ${selector}`);
    const screenshot = (name) =>
      page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    const canvasHash = async () =>
      crypto
        .createHash('sha256')
        .update(await page.locator('#playground').screenshot())
        .digest('hex');
    await page.goto(base);
    await visible('#home');
    await screenshot('home-390');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await visible('#library');
    assert.equal(await page.locator('[data-toy]').count(), 4);
    await screenshot('collection-390');
    await page.locator('[data-toy="particles"]').click();
    await visible('#player');
    const session = await context.newCDPSession(page);
    const points = [
      { x: 125, y: 330, id: 1 },
      { x: 265, y: 390, id: 2 },
      { x: 195, y: 450, id: 3 },
      { x: 270, y: 470, id: 4 },
    ];
    for (let count = 1; count <= 4; count++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: points.slice(0, count),
      });
      assert.equal(
        await page.locator('#gesture-status').textContent(),
        ['Gather', 'Orbit', 'Vortex', 'Bloom'][count - 1]
      );
      await page.waitForTimeout(180);
      if (count === 2) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            { x: 90, y: 300, id: 1 },
            { x: 300, y: 430, id: 2 },
          ],
        });
        await screenshot('stardust-orbit-390');
      }
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal(await page.locator('#gesture-status').textContent(), 'Drift');
    await page.getByRole('button', { name: 'Ember', exact: true }).click();
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    const paused = await canvasHash();
    await page.waitForTimeout(180);
    assert.equal(await canvasHash(), paused, 'Pause must freeze simulation');
    await page.getByRole('button', { name: 'Reset toy', exact: true }).click();
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await page.waitForTimeout(180);
    assert.notEqual(await canvasHash(), paused);
    await page
      .getByRole('button', { name: 'Open sensory settings', exact: true })
      .filter({ visible: true })
      .click();
    await page.locator('#music').check();
    await page.locator('#gentle').check();
    await page.locator('#haptics').uncheck();
    await page.locator('#volume').fill('20');
    await page.locator('#brightness').fill('75');
    await screenshot('settings-390');
    await page.getByRole('button', { name: 'Close sensory settings', exact: true }).click();
    await page.waitForFunction(() => {
      const audio = document.querySelector('#bgm');
      return !audio.paused && audio.currentTime > 0;
    });
    assert(
      (await page.locator('#bgm').evaluate((audio) => audio.duration)) > 180,
      'Bundled music should decode'
    );
    await page
      .getByRole('button', { name: 'Close toy and return to collection', exact: true })
      .click();
    assert(
      await page.locator('#bgm').evaluate((audio) => audio.paused),
      'Music stops outside the toy'
    );
    for (const id of ['pond', 'bubbles', 'dial']) {
      await page.locator(`[data-toy="${id}"]`).scrollIntoViewIfNeeded();
      const scrollBefore = await page.evaluate(() => scrollY);
      await page.locator(`[data-toy="${id}"]`).click();
      await page.waitForTimeout(120);
      if (id === 'bubbles') {
        const beforePop = await canvasHash();
        await page.touchscreen.tap(195, 354);
        await page.waitForTimeout(220);
        assert.notEqual(await canvasHash(), beforePop, 'Pressing a bubble changes its surface');
      } else await page.touchscreen.tap(195, 350);
      if (id === 'dial') {
        await page.mouse.move(290, 370);
        await page.mouse.down();
        for (let i = 0; i <= 12; i++)
          await page.mouse.move(195 + Math.cos(i * 0.2) * 95, 370 + Math.sin(i * 0.2) * 95);
        await page.mouse.up();
      }
      await screenshot(`${id}-390`);
      await page
        .getByRole('button', { name: 'Close toy and return to collection', exact: true })
        .click();
      await visible('#library');
      assert(
        Math.abs((await page.evaluate(() => scrollY)) - scrollBefore) < 2,
        'Collection scroll position is restored'
      );
    }
    await page.reload();
    await page
      .getByRole('button', { name: 'Open sensory settings', exact: true })
      .filter({ visible: true })
      .click();
    assert(await page.locator('#music').isChecked());
    assert(await page.locator('#gentle').isChecked());
    assert(!(await page.locator('#haptics').isChecked()));
    assert.equal(await page.locator('#volume').inputValue(), '20');
    assert.equal(await page.locator('#brightness').inputValue(), '75');
    await page.getByRole('button', { name: 'Close sensory settings', exact: true }).click();
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(120);
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Horizontal overflow at ${width}`
      );
      await screenshot(`home-${width}`);
    }
    await page.setViewportSize({ width: 320, height: 640 });
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.locator('[data-toy="bubbles"]').click();
    await screenshot('bubbles-320');
    // Each full-screen toy must still leave its exit accessible on small screens.
    await page
      .getByRole('button', { name: 'Close toy and return to collection', exact: true })
      .click();
    await page.setViewportSize({ width: 640, height: 280 });
    await page.locator('[data-toy="dial"]').click();
    await page.waitForTimeout(120);
    await page
      .getByRole('button', { name: 'Close toy and return to collection', exact: true })
      .click();
    assert.deepEqual(errors, [], 'No browser errors or warnings');
    assert.deepEqual(external, [], 'No external network requests');
    fs.writeFileSync(
      path.join(out, 'result.json'),
      JSON.stringify(
        {
          passed: true,
          viewports: [320, 390, 768, 1024, 1440],
          errors,
          external,
          checks: [
            'navigation',
            'four toys',
            '1–4 touch gestures',
            'pinch',
            'pointer cancellation',
            'pause/reset/resume',
            'music decode and lifecycle',
            'settings persistence',
            'responsive overflow',
          ],
        },
        null,
        2
      )
    );
    console.log(
      'PASS: browser navigation, all toys, multitouch, audio, pause/reset/resume, settings persistence, and responsive layouts.'
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
