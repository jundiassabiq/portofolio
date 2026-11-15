/**
 * cursor-trail.js
 * A thin, luminous trail that follows the mouse and fades within half a second.
 * Drawn on one fixed canvas with pointer-events disabled, so it never blocks clicks.
 * Only on devices with a real mouse; disabled for prefers-reduced-motion.
 */
(() => {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;

  const LIFE_MS = 460;     // how long a point stays in the trail
  const MAX_WIDTH = 2.4;   // px at the head of the trail
  const MAX_POINTS = 60;

  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const points = [];
  let frame = null;

  const draw = (now) => {
    while (points.length && now - points[0].t > LIFE_MS) points.shift();
    ctx.clearRect(0, 0, width, height);

    if (points.length < 2) {
      frame = null; // idle: stop the loop until the mouse moves again
      return;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(130, 175, 255, 0.85)';
    ctx.shadowBlur = 10;

    // Smooth curve through midpoints; each segment tapers and fades toward the tail
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const before = points[i - 2] || prev;
      const startX = (before.x + prev.x) / 2;
      const startY = (before.y + prev.y) / 2;
      const endX = (prev.x + curr.x) / 2;
      const endY = (prev.y + curr.y) / 2;

      const freshness = 1 - (now - curr.t) / LIFE_MS; // 1 = just drawn
      const along = i / (points.length - 1);           // 0 = tail, 1 = head
      const k = Math.max(0, freshness) * along;

      ctx.strokeStyle = `rgba(238, 244, 255, ${(0.7 * k).toFixed(3)})`;
      ctx.lineWidth = 0.4 + MAX_WIDTH * k;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(prev.x, prev.y, endX, endY);
      ctx.stroke();
    }

    frame = requestAnimationFrame(draw);
  };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (points.length > MAX_POINTS) points.shift();
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });

  // Let the trail die out naturally when the mouse leaves the window
  document.addEventListener('mouseleave', () => { points.length = Math.min(points.length, 8); });
})();
