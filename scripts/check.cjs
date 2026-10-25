const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const root = path.resolve(__dirname, '..');
for (const file of fs.readdirSync(path.join(root, 'web')).filter((f) => f.endsWith('.js')))
  new vm.Script(fs.readFileSync(path.join(root, 'web', file), 'utf8'), { filename: file });
const manifest = fs.readFileSync(path.join(root, 'android/src/main/AndroidManifest.xml'), 'utf8');
assert(!manifest.includes('android.permission.INTERNET'));
assert(manifest.includes('android:versionCode="2"'));
assert(manifest.includes('android:label="Medi Personal Fidget Toy"'));
for (const file of [
  'floating-cities.mp3',
  'carefree.mp3',
  'water.ogg',
  'pop.ogg',
  'click.ogg',
  'slime.ogg',
])
  assert(fs.statSync(path.join(root, 'web/audio', file)).size > 1000);
const gradient = { addColorStop() {} };
const drawing = new Proxy(
  {},
  {
    get: (_, key) =>
      key === 'createLinearGradient' || key === 'createRadialGradient'
        ? () => gradient
        : key === 'arc'
          ? (x, y, r) => assert(r >= 0)
          : () => {},
  }
);
const sandbox = {
  window: {},
  Math,
  performance,
  document: { createElement: () => ({ getContext: () => drawing }) },
};
vm.createContext(sandbox);
for (const file of ['particles.js', 'tactile.js', 'extra-toys.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'web', file), 'utf8'), sandbox);
const settings = { density: 12000, gentle: false },
  silent = { pulse() {}, slime() {}, switch() {}, clack() {} };
const toy = new sandbox.window.StillToys.Particles(drawing, 390, 844, settings, silent);
const meanRadius = () =>
  toy.points.reduce((sum, p) => sum + Math.hypot(p.x - 195, p.y - 422), 0) / toy.points.length;
const initial = meanRadius();
for (let i = 0; i < 180; i++) toy.update(1 / 60, [{ x: 195, y: 422 }]);
assert(meanRadius() < initial * 0.25, 'Holding must actually gather the cloud');
toy.up({ x: 195, y: 422 }, 0, false);
const energy = toy.points.reduce((sum, p) => sum + Math.hypot(p.vx, p.vy), 0) / toy.points.length;
assert(energy > 10, 'Release must create a substantial burst');
for (let i = 0; i < 90; i++) toy.update(1 / 60, []);
assert(meanRadius() > 100, 'Release must spread particles across the screen');
toy.charge = 1;
toy.up({}, 0, true);
assert.equal(toy.charge, 1, 'Cancellation must not burst');
for (const mode of ['flow', 'wave', 'gravity', 'ribbons', 'electric'])
  for (let n = 0; n <= 10; n++) {
    toy.mode = mode;
    const touches = Array.from({ length: n }, () => ({ x: 195, y: 422 }));
    for (let i = 0; i < 20; i++) toy.update(1 / 60, touches);
    for (const p of toy.points) assert(Number.isFinite(p.x + p.y + p.vx + p.vy), mode + ' ' + n);
  }
for (const Class of ['Bubbles', 'Dial', 'Slime', 'Switches', 'Sand', 'Cradle']) {
  const obj = new sandbox.window.StillToys[Class](drawing, 640, 280, settings, silent);
  obj.draw();
  obj.update(0.016, []);
}
const bubbles = new sandbox.window.StillToys.Bubbles(drawing, 390, 844, settings, { pop() {} });
const layout = bubbles.layout();
bubbles.down({ id: 1, x: layout.x, y: layout.y });
assert.equal(bubbles.cells[0].pressed, true);
console.log(
  'PASS: syntax, offline manifest, asset presence, 12,000-particle gather/release, five modes with 0–10 contacts, cancellation, compact toy layouts, and bubble presses.'
);

// Keep cradle end balls inside the screen, both initially and at maximum drag.
for (const [w, h] of [
  [320, 640],
  [390, 844],
  [640, 280],
]) {
  const cradle = new sandbox.window.StillToys.Cradle(drawing, w, h, settings, silent),
    g = cradle.layout();
  for (const [index, angle] of [
    [0, cradle.angle[0]],
    [0, -g.maxAngle],
    [4, g.maxAngle],
  ]) {
    const x = g.start + index * g.r * 2.05 + Math.sin(angle) * g.length;
    assert(x - g.r >= 0 && x + g.r <= w, 'Cradle swing must stay in bounds');
  }
}
// Audio interruption and fast repeated recorded clicks stay bounded.
const music = {
  paused: true,
  addEventListener() {},
  pause() {
    this.paused = true;
  },
  play() {
    this.paused = false;
    return Promise.resolve();
  },
};
let clock = 1000,
  stopped = 0;
const audioBox = {
  window: {},
  document: { getElementById: () => music },
  navigator: {},
  performance: { now: () => clock },
};
vm.createContext(audioBox);
vm.runInContext(fs.readFileSync(path.join(root, 'web/audio.js'), 'utf8'), audioBox);
const sound = new audioBox.window.Soundscape(
  { sounds: true, music: false, muted: false, volume: 100, sfxVolume: 100, musicVolume: 100 },
  () => {}
);
const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} });
sound.context = {
  currentTime: 0,
  resume: () => Promise.resolve(),
  suspend: () => Promise.resolve(),
  createGain: () => ({ gain: param(), connect() {}, disconnect() {} }),
  createBufferSource: () => ({
    playbackRate: { value: 1 },
    connect() {},
    disconnect() {},
    start() {},
    stop() {
      stopped++;
    },
  }),
};
sound.sfxGain = { gain: { value: 0 } };
sound.musicGain = { gain: { value: 0 } };
sound.buffers.set('click', { duration: 0.04 });
sound.setActive(true);
for (let i = 0; i < 100; i++) {
  clock += 61;
  sound.click();
}
assert(sound.voices.size <= 8);
assert(stopped > 0);
assert.equal(sound.sfxGain.gain.value, 1.6);
sound.setActive(false);
assert.equal(sound.voices.size, 0);
assert.equal(sound.sfxGain.gain.value, 0);
console.log(
  'PASS: cradle bounds, amplified gain, bounded recorded voices, and interruption cleanup.'
);
