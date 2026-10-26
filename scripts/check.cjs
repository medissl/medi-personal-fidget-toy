const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
const root = path.resolve(__dirname, '..'),
  read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
for (const f of fs.readdirSync(path.join(root, 'web')).filter((f) => f.endsWith('.js')))
  new vm.Script(read('web/' + f), { filename: f });
const manifest = read('android/src/main/AndroidManifest.xml');
assert(!manifest.includes('android.permission.INTERNET'));
assert(manifest.includes('android:versionCode="6"'));
assert(manifest.includes('android:label="No-No Stress"'));
const gradient = { addColorStop() {} },
  drawing = new Proxy(
    {},
    {
      get: (_, key) =>
        key.includes('Gradient')
          ? () => gradient
          : key === 'createImageData'
            ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
            : key === 'arc'
              ? (x, y, r) => assert(r >= 0)
              : () => {},
    }
  );
const box = {
  window: {},
  Math,
  performance,
  document: { createElement: () => ({ getContext: () => drawing }) },
};
vm.createContext(box);
for (const f of [
  'particles.js',
  'tactile.js',
  'extra-toys.js',
  'wood-lathe.js',
  'physics-toys.js',
  'everyday-toys.js',
  'fluid-toys.js',
  'pond.js',
])
  vm.runInContext(read('web/' + f), box);
const settings = { density: 3000, gentle: false },
  sound = new Proxy({}, { get: () => () => {} }),
  classes = box.window.StillToys;
const particle = new classes.Particles(drawing, 390, 844, settings, sound),
  radius = () =>
    particle.points.reduce((s, p) => s + Math.hypot(p.x - 195, p.y - 422), 0) /
    particle.points.length;
const initial = radius();
for (let i = 0; i < 180; i++) particle.update(1 / 60, [{ x: 195, y: 422 }]);
assert(radius() < initial * 0.4, 'hold gathers');

particle.up({}, 0, false);
assert(
  particle.points.reduce((s, p) => s + Math.hypot(p.vx, p.vy), 0) / 3000 > 10,
  'energetic burst'
);
for (let i = 0; i < 90; i++) particle.update(1 / 60, []);
assert(radius() > 100, 'burst crosses screen');
particle.up({}, 0, true);
assert.equal(particle.burstTime, Math.max(0, particle.burstTime), 'cancel keeps finite state');
const touches = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: 65 + (i % 5) * 65,
  y: 300 + Math.floor(i / 5) * 200,
}));
for (let n = 1; n <= 10; n++) {
  for (let i = 0; i < 80; i++) particle.update(1 / 60, touches.slice(0, n));
  for (const p of particle.points) {
    assert(Number.isFinite(p.x + p.y + p.vx + p.vy), 'finite ' + n);
    if (n === 7)
      for (const t of touches.slice(0, n))
        assert(Math.hypot(p.x - t.x, p.y - t.y) >= 27.9, 'seven-finger obstacle exclusion');
  }
  particle.draw();
}
// The same seeded swarm must respond to relocating a checkpoint, not stay on an outline.
const fieldA = new classes.Particles(drawing, 390, 844, { density: 600, gentle: false }, sound);
const fieldB = new classes.Particles(drawing, 390, 844, { density: 600, gentle: false }, sound);
fieldB.points = fieldA.points.map((p) => ({ ...p }));
const triangle = [
  { id: 1, x: 75, y: 530 },
  { id: 2, x: 315, y: 530 },
  { id: 3, x: 195, y: 280 },
];
for (let i = 0; i < 150; i++) {
  fieldA.update(1 / 60, triangle);
  fieldB.update(1 / 60, triangle);
}
const moved = triangle.map((p) => ({ ...p }));
moved[2].x = 55;
moved[2].y = 390;
for (let i = 0; i < 120; i++) {
  fieldA.update(1 / 60, triangle);
  fieldB.update(1 / 60, moved);
}
assert(
  fieldA.points.reduce(
    (sum, p, i) => sum + Math.hypot(p.x - fieldB.points[i].x, p.y - fieldB.points[i].y),
    0
  ) /
    600 >
    20,
  'moving a checkpoint materially reshapes the flow'
);
// Sustained holds keep moving, retain a real band of energies, and preserve
// the same population through changes of contact geometry.
const held = new classes.Particles(drawing, 390, 844, { density: 800, gentle: false }, sound);
const pair = [
  { id: 1, x: 105, y: 400 },
  { id: 2, x: 285, y: 445 },
];
const population = held.points;
for (let i = 0; i < 3600; i++) held.update(1 / 60, pair);
assert.equal(held.points, population, 'long holds do not replace the population');
const meanSpeed =
  held.points.reduce((sum, p) => sum + Math.hypot(p.vx, p.vy), 0) / held.points.length;
assert(meanSpeed > 2, 'one-minute hold stays alive');
const axis = Math.atan2(45, 180),
  co = Math.cos(axis),
  si = Math.sin(axis);
const band = held.points
  .filter((p) => p.color === 0)
  .map((p) => {
    const x = p.x - 195,
      y = p.y - 422.5;
    return Math.hypot(x * co + y * si, (-x * si + y * co) / 0.2);
  });
assert(
  Math.max(...band) - Math.min(...band) > 25,
  'sustained colored band does not collapse to one trajectory'
);
// Identical free swarms must evolve identically across the old 2.2-second
// timer boundary. Viscosity may change velocity, but that timer cannot do so.
const twin = new classes.Particles(drawing, 390, 844, { density: 800, gentle: false }, sound);
twin.points = held.points.map((p) => ({ ...p, history: p.history.slice() }));
twin.time = held.time;
held.burstTime = 1 / 120;
twin.burstTime = 2.2;
held.update(1 / 60, []);
twin.update(1 / 60, []);
assert(
  held.points.every(
    (p, i) =>
      p.x === twin.points[i].x &&
      p.y === twin.points[i].y &&
      p.vx === twin.points[i].vx &&
      p.vy === twin.points[i].vy
  ),
  'release-to-drift has no timed velocity replacement'
);
const four = [
  { id: 1, x: 65, y: 270 },
  { id: 2, x: 120, y: 300 },
  { id: 3, x: 270, y: 570 },
  { id: 4, x: 325, y: 600 },
];
for (let i = 0; i < 180; i++) held.update(1 / 60, four);
assert(
  new Set(held.points.map((p) => p.owner)).size === 4,
  'new contacts receive particles after a one/two-finger hold'
);
held.up({}, 0, true);
const cancelled = held.points.map((p) => [p.vx, p.vy]);
held.up({}, 0, true);
assert(
  held.points.every((p, i) => p.vx === cancelled[i][0] && p.vy === cancelled[i][1]),
  'cancellation adds no impulse'
);
for (const pose of [
  [
    { id: 1, x: 195, y: 422 },
    { id: 2, x: 195, y: 422 },
    { id: 3, x: 195, y: 422 },
  ],
  [
    { id: 1, x: 194, y: 422 },
    { id: 2, x: 195, y: 422 },
    { id: 3, x: 196, y: 422 },
  ],
  [{ id: 1, x: 3, y: 425 }],
]) {
  const compact = new classes.Particles(drawing, 390, 844, { density: 400, gentle: false }, sound);
  for (let i = 0; i < 1200; i++) compact.update(1 / 60, pose);
  assert(
    compact.points.reduce((sum, p) => sum + Math.hypot(p.vx, p.vy), 0) / 400 > 1,
    'compact/edge holds retain motion'
  );
  assert(
    compact.points.every((p) => p.x >= 0 && p.x <= 390 && p.y >= 0 && p.y <= 844),
    'held currents remain inside continuous screen bounds'
  );
  compact.up({}, 0, false);
  const previous = compact.points.map((p) => ({ x: p.x, y: p.y }));
  compact.update(1 / 60, []);
  assert(
    compact.points.every((p, i) => Math.hypot(p.x - previous[i].x, p.y - previous[i].y) <= 28.01),
    'edge release cannot snap offscreen particles to a wall'
  );
}
const slime = new classes.Slime(drawing, 390, 844, settings, sound);
for (let i = 0; i < 100; i++) slime.update(1 / 60, [{ x: 195, y: 422 }]);
const dent = Math.min(...slime.field);
assert(dent < -8, 'slime indentation');
for (let i = 0; i < 600; i++) slime.update(1 / 60, []);
assert(Math.min(...slime.field) > dent * 0.05, 'slime relaxes');
slime.draw();
for (const [w, h] of [
  [320, 640],
  [390, 844],
  [640, 280],
]) {
  const cradle = new classes.Cradle(drawing, w, h, settings, sound);
  for (let i = 0; i < 300; i++) cradle.update(1 / 60);
  assert(
    cradle.angle.every((a) => a === 0),
    'cradle starts still'
  );
  const positions = cradle.positions();
  cradle.down({ id: 1, ...positions[1] });
  cradle.down({ id: 2, ...positions[3] });
  assert.equal(cradle.drags.size, 2, 'any two balls can be grabbed');
  cradle.move({ id: 1, x: 20, y: h * 0.5 });
  cradle.move({ id: 2, x: w - 20, y: h * 0.5 });
  for (let i = 0; i < 60; i++) cradle.update(1 / 60);
  cradle.up({ id: 1 });
  cradle.up({ id: 2 });
  for (let i = 0; i < 120; i++) {
    cradle.update(1 / 60);
    assert(
      cradle.angle.every((a, i) => i === 0 || a >= cradle.angle[i - 1] - 1e-6),
      'cradle bobs never cross'
    );
    for (const p of cradle.positions())
      assert(Number.isFinite(p.x + p.y) && p.x >= 0 && p.x <= w, 'bounded pendulums');
  }
  cradle.draw();
}
const wood = new classes.WoodLathe(drawing, 390, 844, settings, sound);
for (let n of [1, 2]) {
  const c = new classes.Cradle(drawing, 390, 844, settings, sound);
  for (let i = 0; i < n; i++) c.angle[i] = -0.5;
  const peaks = Array(5).fill(0);
  for (let f = 0; f < 70; f++) {
    c.update(1 / 60);
    c.angle.forEach((a, i) => (peaks[i] = Math.max(peaks[i], a)));
  }
  assert(
    peaks.slice(5 - n).every((a) => a > 0.4),
    'matching number of opposite bobs swings out'
  );
  assert(
    peaks.slice(0, 5 - n).every((a) => a < 0.025),
    'central bobs stay almost still during transfer'
  );
}
const resting = new classes.Cradle(drawing, 390, 844, settings, sound);
resting.angle[0] = -0.5;
for (let f = 0; f < 3000; f++) resting.update(1 / 60);
assert(
  resting.angle.every((a) => a === 0) && resting.velocity.every((v) => v === 0),
  'cradle dissipates to exact rest'
);
const stopped = new classes.Cradle(drawing, 390, 844, settings, sound);
stopped.angle[4] = 0.5;
for (let f = 0; f < 40; f++) stopped.update(1 / 60);
const catchPoint = stopped.positions()[0];
stopped.down({ id: 1, ...catchPoint });
const frame = stopped.layout();
stopped.move({ id: 1, x: frame.start, y: frame.top + frame.length });
for (let f = 0; f < 1200; f++) stopped.update(1 / 60);
assert(
  stopped.velocity.every((v) => Math.abs(v) < 0.001),
  'holding the chain still does not pump collision energy'
);
const scoring = new classes.WoodLathe(drawing, 390, 844, settings, sound);
assert(scoring.toolPoint({ x: 195, y: 500 }).y < 420, 'finger holds the tool body below the tip');
scoring.shape.set(scoring.goal.map((v) => v * 1.14));
scoring.update(1 / 60);
assert.equal(scoring.score, 1, '85% match awards a point');
assert.equal(scoring.spawn, 0, 'next log starts its entrance');
scoring.update(1 / 60);
assert.equal(scoring.score, 1, 'one point per completed log');
scoring.shape.fill(0);
scoring.update(1 / 60);
assert(
  scoring.shape.every((v) => v === 1) && scoring.score === 1,
  'empty wood replaces without a point'
);
let waterCalls = 0;
const pond = new classes.Pond(drawing, 390, 844, settings, {
    water() {
      waterCalls++;
    },
    pulse() {},
  }),
  l = pond.leaves[0],
  lx = 150,
  ly = 400;
l.x = lx;
l.y = ly;
pond.leaves = [l];
pond.down({ id: 1, x: lx, y: ly });
pond.move({ id: 1, x: lx + 70, y: ly + 70 });
for (let i = 0; i < 30; i++) pond.update(1 / 60, []);
assert(l.x > lx + 50 && l.y > ly + 50, 'leaf follows a held drag');
assert.equal(pond.ripples.length, 0, 'grabbing and dragging a leaf does not splash');
assert.equal(pond.droplets.length, 0, 'leaf drag creates no droplets');
assert.equal(waterCalls, 0, 'leaf drag does not play a water drop');
pond.up({ id: 1 });
pond.lastRipple = -Infinity;
pond.down({ id: 2, x: 20, y: 150 });
assert.equal(waterCalls, 1, 'touching open water still splashes');
pond.up({ id: 2 });
assert.equal(pond.drags.size, 0);
assert.equal(new Set(wood.designs.map((s) => s.kind)).size, 3);
const geo = wood.geometry();
wood.carve({ x: 195, y: geo.cy }, 1 / 60);
const carved = Array.from(wood.shape);
wood.carve({ x: 195, y: geo.cy + geo.r + 10 }, 1 / 60);
assert(
  wood.shape.every((v, i) => v <= carved[i]),
  'wood never grows back'
);
assert(wood.chips.length > 0, 'falling chips');
const zipper = new classes.Zipper(drawing, 390, 844, settings, sound),
  zip = zipper.geometry();
zipper.down({ id: 1, x: zip.cx, y: zip.y + 20 });
zipper.move({ id: 1, x: zip.cx, y: 20 });
assert.equal(zipper.count, 1);
assert(zipper.complete && zipper.flash > 0);
zipper.move({ id: 1, x: zip.cx, y: 20 });
assert.equal(zipper.count, 1);
zipper.update(1.2);
assert(!zipper.complete && zipper.progress === 0 && zipper.flash === 0);
const wrap = new classes.Packaging(drawing, 390, 844, settings, sound),
  g = wrap.geometry();
wrap.down({ x: g.x, y: g.y });
wrap.down({ x: g.x, y: g.y });
assert(wrap.cells[0], 'wrap stays popped');
const glass = new classes.GlassBreak(drawing, 390, 844, settings, sound);
assert(
  glass.objects.every((p) => p.offset < 0),
  'glass enters from above'
);
for (let i = 0; i < 90; i++) glass.update(1 / 60);
assert(
  glass.objects.every((p) => p.offset === 0),
  'glass settles on the table'
);
assert.equal(glass.objects.length, 8);
assert.equal(new Set(glass.objects.map((p) => p.kind)).size, 8, 'eight different vessels');
let object = glass.objects[0];
glass.down({ x: object.x, y: object.y - object.h * 0.3 });
for (let i = 0; i < 25; i++) glass.update(1 / 60);
assert.equal(glass.objects.filter((p) => p.broken).length, 1);
assert(glass.shards.length >= 12);
for (let i = 0; i < 240; i++) glass.update(1 / 60);
assert.equal(
  glass.objects.filter((p) => p.broken).length,
  1,
  'one broken vessel does not reset the table'
);
for (let n = 1; n < 8; n++) {
  object = glass.objects[n];
  glass.down({ x: object.x, y: object.y - object.h * 0.3 });
  for (let i = 0; i < 25; i++) glass.update(1 / 60);
}
assert(
  glass.objects.every((p) => p.broken),
  'all eight vessels can break'
);
for (let i = 0; i < 150; i++) glass.update(1 / 60);
assert(
  glass.objects.every((p) => !p.broken),
  'fresh table after all eight'
);
const fluid = new classes.Lava(drawing, 390, 844, settings, sound),
  idleFluid = new classes.Lava(drawing, 390, 844, settings, sound);
for (let i = 0; i < 30; i++) {
  fluid.update(1 / 60, [{ id: 1, x: 100 + i * 4, y: 430 + Math.sin(i * 0.2) * 50 }]);
  idleFluid.update(1 / 60, []);
}
assert(
  fluid.dye[0].reduce((a, b) => a + b, 0) > idleFluid.dye[0].reduce((a, b) => a + b, 0),
  'touch feeds the liquid relative to its unperturbed state'
);
assert(
  fluid.u.some((v) => Math.abs(v) > 0.15),
  'drag stirs the liquid'
);
assert(
  fluid.u.every(Number.isFinite) && fluid.dye.every((channel) => channel.every(Number.isFinite)),
  'stable liquid state'
);
const cutter = new classes.WoodLathe(drawing, 390, 844, settings, sound),
  cg = cutter.geometry();
for (let i = 0; i < 100 && !cutter.pieces.length; i++) cutter.carve({ x: 195, y: cg.cy }, 1 / 60);
assert(cutter.pieces.length > 0, 'cutting across the axis detaches a piece');
assert(
  cutter.shape.some((v, i) => v < cutter.goal[i] - 0.1),
  'cutting below the guide is allowed'
);
const metal = new classes.MetalBalls(drawing, 390, 844, settings, sound);
assert.equal(metal.balls.length, 9, 'exactly nine large metal balls');
metal.setTilt(10, -10);
for (let i = 0; i < 300; i++) metal.update(1 / 60);
for (const b of metal.balls)
  assert(
    Number.isFinite(b.x + b.y + b.vx + b.vy) &&
      b.x >= b.r &&
      b.x <= 390 - b.r &&
      b.y >= b.r &&
      b.y <= 844 - b.r
  );
for (const Class of [
  'Bubbles',
  'Dial',
  'Slime',
  'Switches',
  'Sand',
  'Cradle',
  'WoodLathe',
  'MetalBalls',
  'GlassBreak',
  'Packaging',
  'Zipper',
  'Lava',
]) {
  const toy = new classes[Class](drawing, 640, 280, settings, sound);
  toy.draw();
  toy.update(1 / 60, []);
}
for (const name of [
  'water',
  'water2',
  'pop',
  'pop2',
  'slime',
  'slime2',
  'click',
  'switch',
  'toggle',
  'metal',
  'zipper',
  'carve',
  'sand',
  'dial',
  'chop',
  'glass',
  'clink',
  'wrap',
  'space',
]) {
  const b = fs.readFileSync(path.join(root, 'web/audio', name + '.wav'));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WAVE');
  let cursor = 12,
    pcm = null;
  while (cursor + 8 <= b.length) {
    const id = b.toString('ascii', cursor, cursor + 4),
      length = b.readUInt32LE(cursor + 4);
    if (id === 'data') {
      pcm = b.subarray(cursor + 8, cursor + 8 + length);
      break;
    }
    cursor += 8 + length + (length % 2);
  }
  assert(
    pcm && pcm.length > 100 && pcm.length < 1048576,
    'valid SoundPool-sized PCM payload ' + name
  );
  let square = 0,
    peak = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const value = pcm.readInt16LE(i) / 32768;
    peak = Math.max(peak, Math.abs(value));
    square += value * value;
  }
  assert(peak > 0.05 && peak < 0.86, 'audible, unclipped peak ' + name);
  assert(Math.sqrt(square / (pcm.length / 2)) > 0.03, 'no near-silent effect ' + name);
}
const calls = [],
  audioBox = {
    window: {
      StillNative: {
        configureAudio: (...a) => calls.push(['configure', ...a]),
        playSound: (...a) => calls.push(['play', ...a]),
        setTexture: (...a) => calls.push(['texture', ...a]),
      },
    },
    document: { getElementById: () => ({ addEventListener() {} }) },
    navigator: {},
    performance: { now: () => 1000 },
  };
vm.createContext(audioBox);
vm.runInContext(read('web/audio.js'), audioBox);
const audio = new audioBox.window.Soundscape(
  {
    ...settings,
    sounds: true,
    music: true,
    volume: 100,
    sfxVolume: 100,
    musicVolume: 100,
    track: 'floating',
  },
  () => {}
);
audio.setActive(true);
audio.unlock();
audio.click();
audio.carve();
audio.sand();
audio.zip();
assert.deepEqual(
  calls.filter((c) => c[0] === 'texture').map((c) => c[1]),
  ['carve', 'sand', 'zipper'],
  'movement textures have their own native path'
);
audio.switch(false);
assert(
  calls.some((c) => c[0] === 'play' && c[1] === 'switch'),
  'switch-off uses the same physical switch recording'
);
assert.equal(audio.context, null, 'native never needs WebAudio');
assert(
  calls.some((c) => c[0] === 'play' && c[1] === 'click'),
  'native effect is routed'
);
audio.setActive(false);
assert.equal(calls.at(-1)[1], false, 'native pauses on inactive');
console.log(
  'PASS: offline v6, 1–10 fingers, gather/burst, seven-finger obstacles, slime recovery, stationary multi-drag cradle, carving, zipper, wrap, eight glass vessels, fluid flow, metal bounds, WAV headers, native audio routing.'
);
