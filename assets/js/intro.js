/**
 * intro.js
 * Opening sequence: a black screen with the name and a hairline progress bar
 * that tracks the Earth textures, then the overlay fades while the Earth rises.
 *
 * Loaded right after three.min.js and before earth.js, so it can hook
 * THREE.DefaultLoadingManager before any texture starts loading.
 * The <html> classes are set by the inline script in <head>:
 *   intro-pending  intro is running (hero waits, page scroll is locked)
 *   intro-quick    intro already seen this session: short fade only
 */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  const quick = root.classList.contains('intro-quick');
  const MIN_MS = quick ? 250 : 1900;  // let the name animation breathe
  const MAX_MS = 6000;                // never block the page longer than this
  const start = performance.now();
  let assetsReady = false;
  let fontsReady = false;
  let finished = false;

  const setProgress = (value) => {
    const bar = document.getElementById('intro-bar-fill');
    if (bar) bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, value))})`;
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    setProgress(1);
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* private mode */ }

    // Fade the overlay and release the hero at the same moment
    root.classList.add('intro-leaving');
    root.classList.remove('intro-pending');

    const overlay = document.getElementById('intro');
    const cleanup = () => {
      root.classList.remove('intro-leaving', 'intro-quick');
      if (overlay) overlay.remove();
    };
    if (overlay) {
      overlay.addEventListener('transitionend', (e) => { if (e.target === overlay) cleanup(); });
    }
    setTimeout(cleanup, 1600); // fallback if transitionend never fires
  };

  const tryFinish = () => {
    if (!assetsReady || !fontsReady || finished) return;
    const wait = Math.max(0, MIN_MS - (performance.now() - start));
    setTimeout(finish, wait);
  };

  // 1. Earth textures (the moon is lazy and loads later, after the intro)
  if (typeof THREE !== 'undefined' && THREE.DefaultLoadingManager) {
    const manager = THREE.DefaultLoadingManager;
    manager.onProgress = (url, loaded, total) => { if (!finished) setProgress(loaded / total); };
    let started = false;
    manager.onStart = () => { started = true; };
    manager.onLoad = () => { assetsReady = true; tryFinish(); };
    manager.onError = () => { /* a missing texture should not hold the intro */ };
    // If nothing starts loading shortly after the DOM is ready (e.g. no WebGL), don't wait
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (!started) { assetsReady = true; tryFinish(); }
      }, 400);
    });
  } else {
    assetsReady = true;
  }

  // 2. Web fonts, so the hero headline never swaps fonts mid-animation
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { fontsReady = true; tryFinish(); });
  } else {
    fontsReady = true;
  }

  setProgress(0.08);
  setTimeout(finish, MAX_MS);
})();
