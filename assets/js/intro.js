/**
 * intro.js
 * Opening sequence: a black screen with a sun spinning clockwise while the
 * Earth textures load. When ready, a silver disc grows out of the sun to fill
 * the screen, then a soft circular hole opens from the centre onto the page
 * while the Earth rises.
 *
 * three.js is injected after first paint by the loader at the end of index.html.
 * window.threeReady resolves as soon as it has run, before earth.js, so this file can
 * hook THREE.DefaultLoadingManager before any texture starts loading.
 * The <html> classes are set by the inline script in <head>:
 *   intro-pending  intro is running (hero waits, page scroll is locked)
 *   intro-quick    intro already seen this session: circular reveal only
 * Classes added here during the exit:
 *   intro-closing    phase 1, the warm disc expands over the sun
 *   intro-revealing  phase 2, the overlay opens onto the page
 */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  const quick = root.classList.contains('intro-quick');
  const MIN_MS = quick ? 200 : 1800;   // let the sun turn for a moment
  const MAX_MS = 6000;                 // never block the page longer than this
  const CLOSE_MS = quick ? 0 : 680;    // phase 1 length (matches the CSS clip-path transition)
  const REVEAL_MS = quick ? 600 : 800;  // phase 2 length (matches the CSS mask transition)
  const start = performance.now();
  let assetsReady = false;
  let fontsReady = false;
  let finished = false;

  const reveal = () => {
    // Release the hero at the same moment the hole starts opening
    root.classList.add('intro-revealing');
    root.classList.remove('intro-pending');

    setTimeout(() => {
      root.classList.remove('intro-closing', 'intro-revealing', 'intro-quick');
      const overlay = document.getElementById('intro');
      if (overlay) overlay.remove();
    }, REVEAL_MS + 100);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* private mode */ }

    if (quick) { reveal(); return; }
    root.classList.add('intro-closing');
    setTimeout(reveal, CLOSE_MS);
  };

  const tryFinish = () => {
    if (!assetsReady || !fontsReady || finished) return;
    const wait = Math.max(0, MIN_MS - (performance.now() - start));
    setTimeout(finish, wait);
  };

  // 1. Earth textures (the moon is lazy and loads later, after the intro).
  // three.js is injected after first paint, so hook its loading manager once it arrives;
  // earth.js runs right after and starts its texture loads through this manager.
  const hookManager = () => {
    if (typeof THREE === 'undefined' || !THREE.DefaultLoadingManager) { assetsReady = true; tryFinish(); return; }
    const manager = THREE.DefaultLoadingManager;
    let started = false;
    manager.onStart = () => { started = true; };
    manager.onLoad = () => { assetsReady = true; tryFinish(); };
    manager.onError = () => { /* a missing texture should not hold the intro */ };
    // If nothing starts loading shortly after (e.g. no WebGL), don't wait
    setTimeout(() => {
      if (!started) { assetsReady = true; tryFinish(); }
    }, 1500);
  };
  if (window.threeReady) {
    window.threeReady.then(hookManager, () => { assetsReady = true; tryFinish(); });
  } else {
    assetsReady = true;
  }

  // 2. Web fonts, so the hero headline never swaps fonts mid-animation
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { fontsReady = true; tryFinish(); });
  } else {
    fontsReady = true;
  }

  setTimeout(finish, MAX_MS);
})();
