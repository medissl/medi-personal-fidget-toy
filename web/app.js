(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const icons = {
    play: '<path d="m8 5 11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    settings:
      '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    menu: '<path d="M5 6h14M5 12h14M5 18h14"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>',
    muted: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
    reset: '<path d="M4 9a8 8 0 1 1 0 6m0-12v6h6"/>',
    shuffle:
      '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c5 0 7-12 12-12h3m-4-4 4 4-4 4"/>',
    flow: '<path d="M3 8c6-8 12 8 18 0M3 16c6-8 12 8 18 0"/>',
    wave: '<path d="M2 12c4-13 6 13 10 0s6 13 10 0"/>',
    gravity:
      '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/>',
    ribbons: '<path d="M5 3c18 4-8 14 10 18M10 3c18 4-8 14 10 18"/>',
    electric: '<path d="m14 2-9 12h7l-2 8 9-12h-7z"/>',
  };
  const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
  document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  const settings = {
    schema: 2,
    sounds: true,
    music: false,
    muted: false,
    haptics: true,
    hapticStrength: 1,
    gentle: matchMedia('(prefers-reduced-motion: reduce)').matches,
    volume: 70,
    sfxVolume: 100,
    musicVolume: 80,
    brightness: 100,
    density: 12000,
    track: 'floating',
  };
  try {
    const stored = JSON.parse(localStorage.getItem('still-settings') || '{}');
    if (stored && typeof stored === 'object') {
      for (const key of ['sounds', 'music', 'muted', 'haptics', 'gentle'])
        if (typeof stored[key] === 'boolean') settings[key] = stored[key];
      for (const [key, min, max] of [
        ['volume', 0, 100],
        ['sfxVolume', 0, 100],
        ['musicVolume', 0, 100],
        ['brightness', 25, 100],
        ['hapticStrength', 1, 3],
        ['density', 3000, 18000],
      ]) {
        if (Number.isFinite(stored[key]))
          settings[key] = Math.min(max, Math.max(min, Math.round(stored[key])));
      }
      if (stored.schema !== 2)
        settings.density = Math.min(18000, Math.max(12000, (stored.density || 1500) * 4));
      settings.density = Math.round(settings.density / 3000) * 3000;
      if (['floating', 'carefree', 'dream'].includes(stored.track)) settings.track = stored.track;
    }
  } catch {
    $('storage-note').textContent = 'Settings cannot be saved on this device.';
  }
  let noticeTimer;
  function notify(message) {
    $('notice').textContent = message;
    $('notice').hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => ($('notice').hidden = true), 3500);
  }
  const sound = new window.Soundscape(settings, notify);
  const toys = {
    particles: { title: 'Stardust', type: 'Particles', preview: 'particlePreview' },
    pond: { title: 'Little pond', type: 'Pond', preview: 'pondPreview' },
    bubbles: { title: 'Bubble pad', type: 'Bubbles', preview: 'bubblePreview' },
    dial: { title: 'Slow dial', type: 'Dial', preview: 'dialPreview' },
    slime: { title: 'Slime', type: 'Slime', preview: 'slimePreview' },
    switches: { title: 'Buttons', type: 'Switches', preview: 'switchPreview' },
    sand: { title: 'Sand', type: 'Sand', preview: 'sandPreview' },
    cradle: { title: "Newton's cradle", type: 'Cradle', preview: 'cradlePreview' },
  };
  for (const [id, meta] of Object.entries(toys)) {
    const button = document.createElement('button');
    button.className = 'toy-card';
    button.dataset.toy = id;
    button.setAttribute('aria-label', meta.title);
    const art = document.createElement('canvas');
    art.dataset.preview = id;
    art.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong');
    name.textContent = meta.title;
    button.append(art, name);
    button.addEventListener('click', () => openToy(id));
    $('toy-list').append(button);
  }
  const canvas = $('playground'),
    ctx = canvas.getContext('2d', { alpha: false });
  let screen = 'home',
    currentId = null,
    toy = null,
    paused = false,
    active = !document.hidden;
  let width = 0,
    height = 0,
    frame = 0,
    lastTime = 0,
    savedScroll = 0,
    chromeTimer,
    resizeTimer;
  const pointers = new Map();
  const canRun = () => active && !$('settings').open;
  function clearPointers() {
    for (const [id, p] of pointers) {
      toy?.up?.(p, 0, true);
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    pointers.clear();
  }
  function audioState() {
    sound.setActive(screen === 'player' && !paused && canRun());
  }
  function hideChrome() {
    if (screen !== 'player' || $('settings').open) return;
    $('player').classList.add('controls-hidden');
    $('game-controls').inert = true;
    $('toy-options').inert = true;
  }
  function showChrome() {
    $('player').classList.remove('controls-hidden');
    $('game-controls').inert = false;
    $('toy-options').inert = false;
    clearTimeout(chromeTimer);
    if (screen === 'player' && canRun()) chromeTimer = setTimeout(hideChrome, 2000);
  }
  function show(next) {
    screen = next;
    for (const id of ['home', 'library', 'player']) $(id).hidden = id !== next;
    window.StillNative?.setImmersive?.(next === 'player');
    audioState();
    window.scrollTo(0, next === 'library' ? savedScroll : 0);
    if (next === 'library') {
      drawPreviews();
      (document.querySelector('[data-toy="' + currentId + '"]') || $('home-back')).focus({
        preventScroll: true,
      });
    }
    if (next === 'home') $('play').focus({ preventScroll: true });
    if (next !== 'player') clearTimeout(chromeTimer);
    schedule();
  }
  function fitCanvas() {
    clearPointers();
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    width = r.width;
    height = r.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    toy?.resize(width, height);
    if (toy) toy.draw();
  }
  function optionButton(label, html, pressed, action) {
    const b = document.createElement('button');
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', String(pressed));
    b.innerHTML = html;
    b.addEventListener('click', () => {
      action();
      showChrome();
    });
    return b;
  }
  function toyOptions() {
    const options = $('toy-options');
    options.replaceChildren();
    if (currentId !== 'particles') return;
    const modes = document.createElement('div');
    modes.className = 'option-group';
    for (const mode of ['flow', 'wave', 'gravity', 'ribbons', 'electric']) {
      const b = optionButton(
        mode[0].toUpperCase() + mode.slice(1) + ' mode',
        icon(mode),
        mode === 'flow',
        () => {
          toy.mode = mode;
          modes
            .querySelectorAll('button')
            .forEach((el) => el.setAttribute('aria-pressed', String(el === b)));
          if (paused) toy.draw();
        }
      );
      modes.append(b);
    }
    const palettes = document.createElement('div');
    palettes.className = 'option-group';
    for (const palette of ['rainbow', 'ember', 'moon']) {
      const b = optionButton(
        palette + ' colors',
        '<span class="swatch ' + palette + '"></span>',
        palette === 'rainbow',
        () => {
          toy.palette = palette;
          palettes
            .querySelectorAll('button')
            .forEach((el) => el.setAttribute('aria-pressed', String(el === b)));
          if (paused) toy.draw();
        }
      );
      b.dataset.palette = palette;
      palettes.append(b);
    }
    options.append(modes, palettes);
  }
  function openToy(id) {
    if (!ctx) {
      notify('The drawing surface is unavailable.');
      return;
    }
    savedScroll = window.scrollY;
    currentId = id;
    paused = false;
    show('player');
    fitCanvas();
    toy = new window.StillToys[toys[id].type](ctx, width, height, settings, sound);
    toy.draw();
    canvas.setAttribute('aria-label', toys[id].title);
    toyOptions();
    updateControls();
    applyVisuals();
    showChrome();
    sound.unlock();
    canvas.focus({ preventScroll: true });
  }
  function closeToy() {
    clearPointers();
    toy = null;
    paused = false;
    sound.setActive(false);
    show('library');
  }
  function updateControls() {
    $('pause').innerHTML = icon(paused ? 'play' : 'pause');
    $('pause').setAttribute('aria-label', paused ? 'Resume' : 'Pause');
    $('pause').setAttribute('aria-pressed', String(paused));
    $('sound-toggle').innerHTML = icon(settings.muted ? 'muted' : 'sound');
    $('sound-toggle').setAttribute('aria-label', settings.muted ? 'Unmute audio' : 'Mute audio');
    $('sound-toggle').setAttribute('aria-pressed', String(settings.muted));
  }
  function applyVisuals() {
    canvas.style.filter = 'brightness(' + settings.brightness / 100 + ')';
  }
  const ranges = [
    ['volume', 'volume', 'volume-value'],
    ['sfx-volume', 'sfxVolume', 'sfx-value'],
    ['music-volume', 'musicVolume', 'music-value'],
    ['brightness', 'brightness', 'brightness-value'],
    ['density', 'density', 'density-value'],
    ['haptic-strength', 'hapticStrength', 'haptic-value'],
  ];
  function fillSettings() {
    for (const id of ['sounds', 'music', 'haptics', 'gentle']) $(id).checked = settings[id];
    for (const [id, key, output] of ranges) {
      $(id).value = settings[key];
      $(output).textContent =
        key === 'density'
          ? settings[key].toLocaleString()
          : key === 'hapticStrength'
            ? ['Light', 'Medium', 'Firm'][settings[key] - 1]
            : settings[key] + '%';
    }
    $('music-track').value = settings.track;
  }
  function saveSettings() {
    try {
      localStorage.setItem('still-settings', JSON.stringify(settings));
    } catch {
      $('storage-note').textContent = 'Settings work for this session, but could not be saved.';
    }
    sound.unlock();
    sound.sync();
    applyVisuals();
    updateControls();
  }
  document.querySelectorAll('.settings-open').forEach((b) =>
    b.addEventListener('click', () => {
      clearPointers();
      clearTimeout(chromeTimer);
      fillSettings();
      $('settings').showModal();
      audioState();
    })
  );
  $('settings-close').addEventListener('click', () => $('settings').close());
  $('settings').addEventListener('close', () => {
    clearPointers();
    audioState();
    lastTime = 0;
    showChrome();
    schedule();
  });
  for (const id of ['sounds', 'music', 'haptics', 'gentle'])
    $(id).addEventListener('change', () => {
      settings[id] = $(id).checked;
      saveSettings();
    });
  for (const [id, key] of ranges)
    $(id).addEventListener('input', () => {
      settings[key] = Number($(id).value);
      saveSettings();
      fillSettings();
    });
  $('music-track').addEventListener('change', () => {
    settings.track = $('music-track').value;
    saveSettings();
  });
  $('play').addEventListener('click', () => {
    currentId = null;
    savedScroll = 0;
    show('library');
  });
  $('random-play').addEventListener('click', () =>
    openToy(Object.keys(toys)[Math.floor(Math.random() * Object.keys(toys).length)])
  );
  $('home-back').addEventListener('click', () => show('home'));
  $('close-toy').addEventListener('click', closeToy);
  $('sound-toggle').addEventListener('click', () => {
    settings.muted = !settings.muted;
    saveSettings();
  });
  $('pause').addEventListener('click', () => {
    paused = !paused;
    clearPointers();
    audioState();
    updateControls();
    lastTime = 0;
    schedule();
  });
  $('reset').addEventListener('click', () => {
    clearPointers();
    toy?.reset();
    toy?.draw();
  });
  $('game-controls').addEventListener('click', () => {
    if (screen === 'player') showChrome();
  });
  for (const id of ['game-controls', 'toy-options']) {
    $(id).addEventListener('pointerdown', showChrome);
  }
  function point(event) {
    const r = canvas.getBoundingClientRect();
    return { id: event.pointerId, x: event.clientX - r.left, y: event.clientY - r.top };
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (!canRun() || !toy || event.button > 0) return;
    event.preventDefault();
    const p = {
      ...point(event),
      started: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    canvas.setPointerCapture(p.id);
    pointers.set(p.id, p);
    if (pointers.size > 1) for (const other of pointers.values()) other.moved = true;
    sound.unlock();
    if (!paused) toy.down?.(p);
  });
  canvas.addEventListener('pointermove', (event) => {
    const old = pointers.get(event.pointerId);
    if (!old || !canRun()) return;
    const p = { ...old, ...point(event) };
    if (Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > 12) p.moved = true;
    pointers.set(p.id, p);
    if (!paused) toy?.move?.(p);
  });
  function release(event) {
    const p = pointers.get(event.pointerId);
    if (!p) return;
    pointers.delete(p.id);
    const cancelled = event.type !== 'pointerup';
    if (!paused) toy?.up?.(p, pointers.size, cancelled);
    if (
      !cancelled &&
      !p.moved &&
      p.startY < 100 &&
      performance.now() - p.started < 500 &&
      pointers.size === 0
    )
      showChrome();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(type, release);
  canvas.addEventListener('keydown', (event) => {
    if (!paused && canRun()) {
      sound.unlock();
      toy?.key?.(event);
    }
  });
  function back() {
    if ($('settings').open) {
      $('settings').close();
      return true;
    }
    if (screen === 'player') {
      closeToy();
      return true;
    }
    if (screen === 'library') {
      show('home');
      return true;
    }
    return false;
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && screen === 'player') showChrome();
    if (event.key === 'Escape' && !$('settings').open && back()) event.preventDefault();
  });
  function setActive(value) {
    active = value && !document.hidden;
    clearPointers();
    audioState();
    lastTime = 0;
    if (!active) clearTimeout(chromeTimer);
    else if (screen === 'player') showChrome();
    schedule();
  }
  document.addEventListener('visibilitychange', () => setActive(!document.hidden));
  window.addEventListener('blur', clearPointers);
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (screen === 'player') fitCanvas();
      else if (screen === 'library') drawPreviews();
      drawHome(0);
    }, 90);
  });
  function sized(el) {
    const r = el.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    el.width = Math.round(r.width * dpr);
    el.height = Math.round(r.height * dpr);
    const c = el.getContext('2d');
    c?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w: r.width, h: r.height };
  }
  function drawPreviews() {
    for (const el of document.querySelectorAll('[data-preview]')) {
      const { c, w, h } = sized(el);
      if (c && w) window.StillToys[toys[el.dataset.preview].preview](c, w, h);
    }
  }
  function drawHome(time) {
    if (screen !== 'home') return;
    const el = $('home-art'),
      dpr = Math.min(devicePixelRatio || 1, 2);
    if (
      el.width !== Math.round(el.clientWidth * dpr) ||
      el.height !== Math.round(el.clientHeight * dpr)
    )
      sized(el);
    const c = el.getContext('2d');
    if (c)
      window.StillToys.particlePreview(
        c,
        el.clientWidth,
        el.clientHeight,
        time,
        '#14202a',
        settings.brightness / 100
      );
  }
  function animate(time) {
    frame = 0;
    const dt = lastTime ? Math.min(0.033, (time - lastTime) / 1000) : 1 / 60;
    lastTime = time;
    if (!canRun()) return;
    if (screen === 'player' && toy && !paused) {
      toy.update(dt, Array.from(pointers.values()));
      toy.draw();
    }
    if (screen === 'home') drawHome(settings.gentle ? 0 : time / 1000);
    schedule();
  }
  function schedule() {
    if (
      !frame &&
      canRun() &&
      ((screen === 'home' && !settings.gentle) || (screen === 'player' && !paused))
    )
      frame = requestAnimationFrame(animate);
  }
  window.StillApp = { back, setActive };
  fillSettings();
  applyVisuals();
  drawHome(0);
  schedule();
})();
