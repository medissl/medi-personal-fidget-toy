(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const icons = {
    settings:
      '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>',
    muted: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m7 4 13 8-13 8z"/>',
    reset: '<path d="M4 9a8 8 0 1 1 0 6m0-12v6h6"/>',
  };
  function icon(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  }
  document.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
  const defaults = {
    sounds: true,
    music: false,
    haptics: true,
    hapticStrength: 1,
    gentle: matchMedia('(prefers-reduced-motion: reduce)').matches,
    volume: 35,
    brightness: 85,
    density: 1500,
  };
  const settings = { ...defaults };
  try {
    const stored = JSON.parse(localStorage.getItem('still-settings') || '{}');
    if (stored && typeof stored === 'object') {
      for (const key of ['sounds', 'music', 'haptics', 'gentle'])
        if (typeof stored[key] === 'boolean') settings[key] = stored[key];
      for (const [key, min, max] of [
        ['volume', 0, 100],
        ['brightness', 25, 100],
        ['density', 500, 3000],
        ['hapticStrength', 1, 3],
      ]) {
        if (Number.isFinite(stored[key]))
          settings[key] = Math.min(max, Math.max(min, Math.round(stored[key])));
      }
      settings.density = Math.round(settings.density / 500) * 500;
    }
  } catch {
    $('storage-note').textContent = 'Settings storage is unavailable. You can still play.';
  }
  let noticeTimer;
  function notify(message) {
    $('notice').textContent = message;
    $('notice').hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      $('notice').hidden = true;
    }, 4000);
  }
  const sound = new window.Soundscape(settings, notify);
  const toys = {
    particles: {
      title: 'Stardust',
      type: 'Particles',
      hint: '1 finger gathers · 2 orbit & pinch · 3 swirl · 4 bloom',
    },
    pond: {
      title: 'Little pond',
      type: 'Pond',
      hint: 'Touch the water. Stir slowly to nudge the leaves.',
    },
    bubbles: {
      title: 'Bubble pad',
      type: 'Bubbles',
      hint: 'Press or sweep across the bubbles. Press again to flip back.',
    },
    dial: {
      title: 'Slow dial',
      type: 'Dial',
      hint: 'Trace a circle around the dial. Find your own rhythm.',
    },
  };
  const canvas = $('playground'),
    ctx = canvas.getContext('2d', { alpha: false });
  let screen = 'home',
    currentId = null,
    toy = null,
    paused = false,
    active = !document.hidden;
  let lastTime = 0,
    frame = 0,
    width = 0,
    height = 0,
    savedScroll = 0;
  const pointers = new Map();
  const screenElements = ['home', 'library', 'player'];
  function canRun() {
    return active && !$('settings').open;
  }
  function clearPointers() {
    for (const [id, p] of pointers) {
      toy?.up?.(p);
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    pointers.clear();
    updateGesture();
  }
  function soundState() {
    sound.setActive(screen === 'player' && !paused && canRun());
  }
  function show(next) {
    screen = next;
    screenElements.forEach((id) => {
      $(id).hidden = id !== next;
    });
    soundState();
    window.scrollTo(0, next === 'library' ? savedScroll : 0);
    if (next === 'library') {
      drawPreviews();
      const target = currentId
        ? document.querySelector(`[data-toy="${currentId}"]`)
        : $('library-title');
      target?.focus({ preventScroll: true });
    }
    if (next === 'home') $('play').focus({ preventScroll: true });
    schedule();
  }
  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearPointers();
    toy?.resize(width, height);
  }
  function openToy(id) {
    if (!ctx) {
      notify('This device could not open the drawing surface.');
      return;
    }
    savedScroll = window.scrollY;
    currentId = id;
    paused = false;
    show('player');
    fitCanvas();
    toy = new window.StillToys[toys[id].type](ctx, width, height, settings, sound);
    $('toy-title').textContent = toys[id].title;
    canvas.setAttribute(
      'aria-label',
      toys[id].title +
        '. ' +
        toys[id].hint +
        (id === 'bubbles'
          ? ' Keyboard: Space to pop a bubble.'
          : id === 'dial'
            ? ' Keyboard: left and right arrows to turn.'
            : '')
    );
    $('toy-hint').textContent = toys[id].hint;
    $('toy-options').replaceChildren();
    if (id === 'particles') {
      for (const [value, label] of [
        ['rainbow', 'Rainbow'],
        ['ember', 'Ember'],
        ['moon', 'Moonlight'],
      ]) {
        const button = document.createElement('button');
        button.textContent = label;
        button.setAttribute('aria-pressed', String(value === 'rainbow'));
        button.addEventListener('click', () => {
          toy.palette = value;
          $('toy-options')
            .querySelectorAll('button')
            .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
          if (paused) toy.draw();
        });
        $('toy-options').append(button);
      }
    }
    updateGesture();
    updateControls();
    applyVisualSettings();
    sound.unlock();
    canvas.focus({ preventScroll: true });
  }
  function closeToy() {
    clearPointers();
    sound.setActive(false);
    toy = null;
    paused = false;
    show('library');
  }
  function updateGesture() {
    $('gesture-status').textContent =
      currentId === 'particles'
        ? ['Drift', 'Gather', 'Orbit', 'Vortex', 'Bloom'][Math.min(pointers.size, 4)]
        : '';
  }
  function updateControls() {
    $('sound-toggle').setAttribute('aria-pressed', String(settings.sounds));
    $('sound-toggle').innerHTML =
      icon(settings.sounds ? 'sound' : 'muted') +
      `<span>${settings.sounds ? 'Sound' : 'Muted'}</span>`;
    $('pause').setAttribute('aria-pressed', String(paused));
    $('pause').setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
    $('pause').innerHTML =
      icon(paused ? 'play' : 'pause') + `<span>${paused ? 'Resume' : 'Pause'}</span>`;
  }
  function applyVisualSettings() {
    canvas.style.filter = `brightness(${settings.brightness / 100})`;
  }
  function saveSettings() {
    try {
      localStorage.setItem('still-settings', JSON.stringify(settings));
    } catch {
      $('storage-note').textContent =
        'Settings could not be saved. Current choices still work for this session.';
    }
    sound.unlock();
    sound.sync();
    applyVisualSettings();
    updateControls();
  }
  function fillSettings() {
    for (const id of ['sounds', 'music', 'haptics', 'gentle']) $(id).checked = settings[id];
    for (const [id, key] of [
      ['volume', 'volume'],
      ['brightness', 'brightness'],
      ['density', 'density'],
      ['haptic-strength', 'hapticStrength'],
    ])
      $(id).value = settings[key];
    $('volume-value').textContent = settings.volume + '%';
    $('brightness-value').textContent = settings.brightness + '%';
    $('density-value').textContent = settings.density.toLocaleString();
    $('haptic-value').textContent = ['Light', 'Medium', 'Firm'][settings.hapticStrength - 1];
    if (!window.StillNative && !navigator.vibrate)
      $('haptics-description').textContent = 'Available in the Android app';
  }
  document.querySelectorAll('.settings-open').forEach((button) =>
    button.addEventListener('click', () => {
      clearPointers();
      fillSettings();
      $('settings').showModal();
      soundState();
      schedule();
    })
  );
  $('settings-close').addEventListener('click', () => $('settings').close());
  $('settings').addEventListener('close', () => {
    clearPointers();
    soundState();
    lastTime = 0;
    schedule();
  });
  $('settings').addEventListener('click', (event) => {
    if (event.target === $('settings') && event.clientY < $('settings').getBoundingClientRect().top)
      $('settings').close();
  });
  for (const id of ['sounds', 'music', 'haptics', 'gentle'])
    $(id).addEventListener('change', () => {
      settings[id] = $(id).checked;
      saveSettings();
    });
  for (const [id, key] of [
    ['volume', 'volume'],
    ['brightness', 'brightness'],
    ['density', 'density'],
    ['haptic-strength', 'hapticStrength'],
  ]) {
    $(id).addEventListener('input', () => {
      settings[key] = Number($(id).value);
      saveSettings();
      fillSettings();
    });
  }
  $('play').addEventListener('click', () => {
    currentId = null;
    savedScroll = 0;
    show('library');
  });
  $('home-back').addEventListener('click', () => show('home'));
  document
    .querySelectorAll('[data-toy]')
    .forEach((button) => button.addEventListener('click', () => openToy(button.dataset.toy)));
  $('close-toy').addEventListener('click', closeToy);
  $('sound-toggle').addEventListener('click', () => {
    settings.sounds = !settings.sounds;
    saveSettings();
  });
  $('pause').addEventListener('click', () => {
    paused = !paused;
    clearPointers();
    soundState();
    updateControls();
    lastTime = 0;
    schedule();
  });
  $('reset').addEventListener('click', () => {
    clearPointers();
    toy?.reset();
    toy?.draw();
  });
  function point(event) {
    const r = canvas.getBoundingClientRect();
    return { id: event.pointerId, x: event.clientX - r.left, y: event.clientY - r.top };
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (paused || !canRun() || !toy || event.button > 0) return;
    event.preventDefault();
    sound.unlock();
    const p = point(event);
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, p);
    toy.down?.(p);
    updateGesture();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId) || paused || !canRun()) return;
    const p = point(event);
    pointers.set(event.pointerId, p);
    toy?.move?.(p);
  });
  function release(event) {
    const p = pointers.get(event.pointerId);
    if (p) toy?.up?.(p);
    pointers.delete(event.pointerId);
    updateGesture();
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
    if (event.key === 'Escape' && !$('settings').open && back()) event.preventDefault();
  });
  function setActive(value) {
    active = value && !document.hidden;
    clearPointers();
    soundState();
    lastTime = 0;
    schedule();
  }
  document.addEventListener('visibilitychange', () => setActive(!document.hidden));
  window.addEventListener('blur', clearPointers);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (screen === 'player') fitCanvas();
      else if (screen === 'library') drawPreviews();
      drawHome(0);
    }, 80);
  });
  function sizedContext(el) {
    const r = el.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    el.width = Math.round(r.width * dpr);
    el.height = Math.round(r.height * dpr);
    const c = el.getContext('2d');
    c?.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w: r.width, h: r.height };
  }
  function drawPreviews() {
    for (const el of document.querySelectorAll('[data-preview]')) {
      const { c, w, h } = sizedContext(el);
      if (!c || !w) continue;
      window.StillToys[
        {
          particles: 'particlePreview',
          pond: 'pondPreview',
          bubbles: 'bubblePreview',
          dial: 'dialPreview',
        }[el.dataset.preview]
      ](c, w, h);
    }
  }
  function drawHome(time) {
    const el = $('home-art');
    if (screen !== 'home') return;
    if (
      el.width !== Math.round(el.clientWidth * Math.min(devicePixelRatio || 1, 2)) ||
      el.height !== Math.round(el.clientHeight * Math.min(devicePixelRatio || 1, 2))
    )
      sizedContext(el);
    const c = el.getContext('2d');
    if (!c) return;
    window.StillToys.particlePreview(
      c,
      el.clientWidth,
      el.clientHeight,
      time,
      '#15191e',
      settings.brightness / 100
    );
    // The home illustration shares the toy's particles; its edges fade into the page.
    const g = c.createRadialGradient(
      el.clientWidth / 2,
      el.clientHeight / 2,
      el.clientHeight * 0.15,
      el.clientWidth / 2,
      el.clientHeight / 2,
      el.clientWidth * 0.62
    );
    g.addColorStop(0, '#15191e00');
    g.addColorStop(1, '#15191e');
    c.fillStyle = g;
    c.fillRect(0, 0, el.clientWidth, el.clientHeight);
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
  applyVisualSettings();
  drawHome(0);
  schedule();
})();
