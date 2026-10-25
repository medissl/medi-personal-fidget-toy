const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'web')).filter((f) => f.endsWith('.js'));
for (const file of files)
  new vm.Script(fs.readFileSync(path.join(root, 'web', file), 'utf8'), { filename: file });
const manifest = fs.readFileSync(path.join(root, 'android/src/main/AndroidManifest.xml'), 'utf8');
assert(!manifest.includes('android.permission.INTERNET'), 'App must remain offline');
assert(!manifest.includes('android:debuggable="true"'));
assert(manifest.includes('android.permission.VIBRATE'));
assert(fs.statSync(path.join(root, 'web/audio/dream-culture.mp3')).size > 1000000);
// Exercise particle stability at all finger counts, including coincident contacts.
const sandbox = { window: {}, Math, performance };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'web/particles.js'), 'utf8'), sandbox);
const drawing = new Proxy({}, { get: () => () => {} });
const particles = new sandbox.window.StillToys.Particles(
  drawing,
  390,
  844,
  { density: 1500, gentle: false },
  {}
);
for (let fingers = 0; fingers <= 5; fingers++) {
  const touches = Array.from({ length: fingers }, () => ({ x: 195, y: 350 }));
  for (let frame = 0; frame < 300; frame++) particles.update(1 / 60, touches);
  for (const p of particles.points)
    assert(Number.isFinite(p.x + p.y + p.vx + p.vy), `Non-finite particle with ${fingers} touches`);
}
// A short split-screen must not pass negative radii into Canvas.
vm.runInContext(fs.readFileSync(path.join(root, 'web/tactile.js'), 'utf8'), sandbox);
const gradient = { addColorStop() {} };
const canvas = new Proxy(
  {},
  {
    get: (_, key) =>
      key === 'createLinearGradient' || key === 'createRadialGradient'
        ? () => gradient
        : key === 'arc'
          ? (x, y, radius) => assert(radius > 0, 'Dial radius must remain positive')
          : () => {},
  }
);
new sandbox.window.StillToys.Dial(canvas, 640, 280, {}, {}).draw();

// Interrupt a long tone before its scheduled ending; it must not survive suspension.
const music = { paused: true, addEventListener() {}, pause() {}, play: () => Promise.resolve() };
const audioSandbox = {
  window: {},
  document: { getElementById: () => music },
  performance,
  navigator: {},
};
vm.createContext(audioSandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'web/audio.js'), 'utf8'), audioSandbox);
const audioSettings = { sounds: true, music: false, volume: 35 };
const audio = new audioSandbox.window.Soundscape(audioSettings, () => {});
const stops = [];
const parameter = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
audio.gain = { gain: { value: 0 } };
audio.context = {
  currentTime: 0,
  resume: () => Promise.resolve(),
  suspend: () => Promise.resolve(),
  createOscillator: () => ({
    frequency: parameter,
    connect() {},
    start() {},
    stop: (time) => stops.push(time),
    disconnect() {},
  }),
  createGain: () => ({ gain: parameter, connect() {}, disconnect() {} }),
};
audio.setActive(true);
audio.tone(220, 0.8);
audio.setActive(false);
assert.equal(stops.length, 2);
assert.equal(stops[1], undefined, 'Tone must be stopped immediately on interruption');
audio.setActive(true);
audio.tone(220, 0.8);
audioSettings.sounds = false;
audio.sync();
assert.equal(audio.gain.gain.value, 0, 'Muted touch sounds must silence the master gain');
assert.equal(stops[stops.length - 1], undefined, 'Muting must stop any existing tone');
console.log(
  `PASS: ${files.length} JavaScript files parse; offline manifest; bundled audio; particles at 0–5 touches; compact dial; interrupted and muted audio.`
);
