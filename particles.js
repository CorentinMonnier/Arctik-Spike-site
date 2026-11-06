/*
 * Arctik Spike — a light drift of "frost" particles over the hero.
 *
 * Plain 2D canvas, deliberately independent of GSAP/Three.js: it needs
 * neither, so it can't be affected by either failing to load, and it runs
 * the same way across all three hero tiers. Skipped entirely under
 * prefers-reduced-motion, same as everything else drifting/animating here.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var stage = document.querySelector('[data-hero-stage]');
  var veil = stage ? stage.querySelector('.hero__veil') : null;
  if (!stage) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero__snow';
  canvas.setAttribute('aria-hidden', 'true');
  if (veil && veil.parentNode === stage) {
    veil.insertAdjacentElement('afterend', canvas); // paint above the veil, below the text/CTA
  } else {
    stage.appendChild(canvas);
  }

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var particles = [];
  var count = 42;
  var width = 0;
  var height = 0;

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    canvas.width = width;
    canvas.height = height;
  }
  resize();

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  for (var i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: rand(1, 2.6),
      speed: rand(0.12, 0.42),
      sway: rand(0.3, 1.1),
      swaySeed: Math.random() * Math.PI * 2,
      opacity: rand(0.12, 0.4),
    });
  }

  var resizeFrame = null;
  window.addEventListener('resize', function () {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(function () {
      resizeFrame = null;
      resize();
    });
  });

  var t = 0;
  var rafId = null;
  function tick() {
    rafId = requestAnimationFrame(tick);
    t += 0.016;
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.speed;
      if (p.y > height + 6) {
        p.y = -6;
        p.x = Math.random() * width;
      }
      var x = p.x + Math.sin(t * p.sway + p.swaySeed) * 10;
      ctx.beginPath();
      ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(214, 240, 238, ' + p.opacity + ')';
      ctx.fill();
    }
  }
  tick();

  // Stop drawing once the hero has scrolled far out of view — no point
  // spending frames on an invisible canvas.
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(function (entries) {
      var visible = entries[0] && entries[0].isIntersecting;
      if (visible && rafId === null) tick();
      if (!visible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }).observe(stage);
  }
})();
