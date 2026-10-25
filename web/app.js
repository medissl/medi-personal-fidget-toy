(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const icons = {
    play: '<path d="M8 5 20 12 8 19Z"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    settings:
      '<path d="' +
      Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2,
          r = [8, 10, 10, 8][i % 4];
        return (
          (i ? 'L' : 'M') +
          (12 + Math.cos(a) * r).toFixed(2) +
          ' ' +
          (12 + Math.sin(a) * r).toFixed(2)
        );
      }).join('') +
      'Z"/><circle cx="12" cy="12" r="3"/>',
    shuffle:
      '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c5 0 7-12 12-12h3m-4-4 4 4-4 4"/>',
    github:
      '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77 5.44 5.44 0 0 0 2.5 8.55c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22"/>',
  };
  const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
  document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
  const settings = {
    schema: 4,
    sounds: true,
    music: false,
    haptics: true,
    hapticStrength: 1,
    gentle: matchMedia('(prefers-reduced-motion: reduce)').matches,
    volume: 85,
    sfxVolume: 100,
    musicVolume: 70,
    brightness: 100,
    density: 14400,
    track: 'floating',
  };
  try {
    const stored = JSON.parse(localStorage.getItem('still-settings') || '{}');
    if (stored && typeof stored === 'object') {
      for (const key of ['sounds', 'music', 'haptics', 'gentle'])
        if (typeof stored[key] === 'boolean') settings[key] = stored[key];
      for (const [key, min, max] of [
        ['volume', 0, 100],
        ['sfxVolume', 0, 100],
        ['musicVolume', 0, 100],
        ['brightness', 25, 100],
        ['hapticStrength', 1, 3],
        ['density', 4800, 24000],
      ]) {
        if (Number.isFinite(stored[key]))
          settings[key] = Math.min(max, Math.max(min, Math.round(stored[key])));
      }
      if (stored.schema !== 4)
        settings.density = (Number.isFinite(stored.density) ? stored.density : 7200) * 2;
      settings.density = Math.max(
        4800,
        Math.min(24000, Math.round(settings.density / 2400) * 2400)
      );
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
    wood: { title: 'Wood carving', type: 'WoodLathe', preview: 'woodPreview' },
    metal: { title: 'Metal balls', type: 'MetalBalls', preview: 'metalPreview' },
    slime: { title: 'Slime', type: 'Slime', preview: 'slimePreview' },
    wrap: { title: 'Packaging pop', type: 'Packaging', preview: 'wrapPreview' },
    zipper: { title: 'Zipper', type: 'Zipper', preview: 'zipperPreview' },
    lava: { title: 'Liquid lava', type: 'Lava', preview: 'lavaPreview' },
    switches: { title: 'On / off', type: 'Switches', preview: 'switchPreview' },
    glass: { title: 'Glass break', type: 'GlassBreak', preview: 'glassPreview' },
    particles: { title: 'Stardust', type: 'Particles', preview: 'particlePreview' },
    pond: { title: 'Little pond', type: 'Pond', preview: 'pondPreview' },
    bubbles: { title: 'Bubble pad', type: 'Bubbles', preview: 'bubblePreview' },
    dial: { title: 'Slow dial', type: 'Dial', preview: 'dialPreview' },
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
      clearTimeout(p.wakeTimer);
      if (p.playing) toy?.up?.(p, 0, true);
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    pointers.clear();
  }
  function audioState() {
    sound.setActive(screen === 'player' && canRun());
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
    if (screen === 'player' && canRun()) chromeTimer = setTimeout(hideChrome, 5000);
  }
  function show(next) {
    screen = next;
    for (const id of ['home', 'library', 'player']) $(id).hidden = id !== next;
    window.StillNative?.setImmersive?.(next === 'player');
    window.StillNative?.setMotionEnabled?.(next === 'player' && currentId === 'metal');
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
    if (currentId === 'wood') {
      const group = document.createElement('div');
      group.className = 'option-group';
      for (const [tip, label, shape] of [
        ['round', 'Round tool', '<circle cx="12" cy="12" r="6"/>'],
        ['square', 'Square tool', '<rect x="6" y="6" width="12" height="12" rx="1"/>'],
        ['triangle', 'Triangle tool', '<path d="m12 4 8 15H4Z"/>'],
      ]) {
        const b = optionButton(
          label,
          '<svg viewBox="0 0 24 24" aria-hidden="true">' + shape + '</svg>',
          tip === 'round',
          () => {
            toy.tip = tip;
            group
              .querySelectorAll('button[data-tip]')
              .forEach((el) => el.setAttribute('aria-pressed', String(el === b)));
          }
        );
        b.dataset.tip = tip;
        group.append(b);
      }
      group.append(optionButton('Next silhouette', icon('shuffle'), false, () => toy.nextDesign()));
      options.append(group);
      return;
    }
    if (currentId !== 'particles' && currentId !== 'lava') return;
    const palettes = document.createElement('div');
    palettes.className = 'option-group';
    for (const palette of ['rainbow', 'ember', 'moon']) {
      const b = optionButton(
        palette + ' colors',
        '<span class="swatch ' + palette + '"></span>',
        palette === toy.palette,
        () => {
          toy.palette = palette;
          palettes
            .querySelectorAll('button')
            .forEach((el) => el.setAttribute('aria-pressed', String(el === b)));
        }
      );
      b.dataset.palette = palette;
      palettes.append(b);
    }
    options.append(palettes);
  }
  function openToy(id) {
    if (!ctx) {
      notify('The drawing surface is unavailable.');
      return;
    }
    savedScroll = window.scrollY;
    currentId = id;
    show('player');
    fitCanvas();
    toy = new window.StillToys[toys[id].type](ctx, width, height, settings, sound);
    toy.draw();
    canvas.setAttribute('aria-label', toys[id].title);
    toyOptions();
    applyVisuals();
    showChrome();
    sound.unlock();
    canvas.focus({ preventScroll: true });
  }
  function closeToy() {
    clearPointers();
    toy?.dispose?.();
    toy = null;
    sound.setActive(false);
    show('library');
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
  $('github-link').addEventListener('click', (event) => {
    if (window.StillNative?.openGitHub) {
      event.preventDefault();
      window.StillNative.openGitHub();
    }
  });
  $('home-back').addEventListener('click', () => show('home'));
  $('close-toy').addEventListener('click', closeToy);
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
  let armedControl = null;
  document.addEventListener(
    'pointerdown',
    (event) => {
      armedControl = !$('player').classList.contains('controls-hidden')
        ? event.target.closest?.('#game-controls button,#toy-options button')
        : null;
    },
    true
  );
  document.addEventListener(
    'click',
    (event) => {
      const control = event.target.closest?.('#game-controls button,#toy-options button');
      if (control && event.detail !== 0 && control !== armedControl) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      armedControl = null;
    },
    true
  );
  canvas.addEventListener('pointerdown', (event) => {
    if (!canRun() || !toy || event.button > 0) return;
    event.preventDefault();
    const p = {
      ...point(event),
      started: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      wake: $('player').classList.contains('controls-hidden') && event.clientY < 100,
      playing: false,
    };
    canvas.setPointerCapture(p.id);
    pointers.set(p.id, p);
    sound.unlock();
    if (!p.wake) {
      toy.down?.(p);
      p.playing = true;
    } else
      p.wakeTimer = setTimeout(() => {
        if (pointers.get(p.id) === p && p.wake && canRun()) {
          p.wake = false;
          p.playing = true;
          toy?.down?.(p);
        }
      }, 250);
    if (pointers.size > 1)
      for (const other of pointers.values()) {
        other.moved = true;
        if (!other.playing) {
          clearTimeout(other.wakeTimer);
          toy.down?.(other);
          other.playing = true;
          other.wake = false;
        }
      }
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = pointers.get(event.pointerId);
    if (!p || !canRun()) return;
    Object.assign(p, point(event));
    if (Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > 12) p.moved = true;
    if (p.wake && p.moved) {
      clearTimeout(p.wakeTimer);
      p.wake = false;
      toy?.down?.(p);
      p.playing = true;
    }
    if (p.playing) toy?.move?.(p);
  });
  function release(event) {
    const p = pointers.get(event.pointerId);
    if (!p) return;
    clearTimeout(p.wakeTimer);
    pointers.delete(p.id);
    const cancelled = event.type !== 'pointerup';
    if (p.playing)
      toy?.up?.(p, Array.from(pointers.values()).filter((q) => q.playing).length, cancelled);
    if (!cancelled && p.wake && !p.moved && pointers.size === 0) {
      armedControl = null;
      showChrome();
    }
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(type, release);
  canvas.addEventListener('keydown', (event) => {
    if (canRun()) {
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
  function animate(time) {
    frame = 0;
    const dt = lastTime ? Math.min(0.033, (time - lastTime) / 1000) : 1 / 60;
    lastTime = time;
    if (!canRun()) return;
    if (screen === 'player' && toy) {
      toy.update(
        dt,
        Array.from(pointers.values()).filter((p) => p.playing)
      );
      toy.draw();
    }

    schedule();
  }
  function schedule() {
    if (!frame && canRun() && screen === 'player') frame = requestAnimationFrame(animate);
  }
  window.StillApp = {
    back,
    setActive,
    audioError: notify,
    setTilt(x, y) {
      if (active && canRun() && currentId === 'metal' && Number.isFinite(x) && Number.isFinite(y))
        toy?.setTilt?.(Math.max(-10, Math.min(10, x)), Math.max(-10, Math.min(10, y)));
    },
  };
  fillSettings();
  applyVisuals();

  schedule();
})();
