/*
 * Arctik Spike — playful cursor layer.
 *
 * Three things, all opt-in and all skipped cleanly when they shouldn't run:
 *   1. The mouse cursor becomes the penguin logo, with a light tilt as it moves.
 *   2. A trail of tiny fading penguins follows while the cursor is moving.
 *   3. Clicking any link/button scatters a few mini penguins + mini (yellow)
 *      balls from the click point.
 *   4. A subtle "magnetic" pull on .btn / .btn--outline toward the cursor.
 *
 * Safety: skipped entirely on touch devices and reduced-motion, and only
 * ever turns on once GSAP is confirmed loaded — if anything throws, the
 * native cursor is restored immediately. Nothing here can leave a visitor
 * stuck without a visible cursor.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (reduce || !finePointer) return;

  var attempts = 0;
  (function waitForGsap() {
    if (typeof window.gsap !== 'undefined') {
      setup();
      return;
    }
    attempts += 1;
    if (attempts > 40) return; // ~4s, nothing loaded: leave the native cursor alone
    window.setTimeout(waitForGsap, 100);
  })();

  function setup() {
    var gsap = window.gsap;
    var root = document.documentElement;

    try {
      root.classList.add('has-custom-cursor');

      /* ---------- the penguin cursor itself ---------- */
      var cursor = document.createElement('img');
      cursor.src = 'assets/penguin.png';
      cursor.alt = '';
      cursor.setAttribute('aria-hidden', 'true');
      cursor.className = 'cursor-penguin';
      document.body.appendChild(cursor);
      gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -100, y: -100 });

      var setX = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
      var setY = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
      var setRot = gsap.quickTo(cursor, 'rotation', { duration: 0.45, ease: 'power3.out' });

      var lastX = null;
      var lastY = null;
      var lastTrailX = null;
      var lastTrailY = null;
      var shown = false;
      // Unwrapped (not clamped to ±180°) so the rotation always takes the
      // shortest path to the new heading instead of snapping the long way
      // round when movement direction crosses the ±180° seam.
      var currentAngle = 0;

      window.addEventListener(
        'mousemove',
        function (e) {
          setX(e.clientX);
          setY(e.clientY);
          if (!shown) {
            shown = true;
            cursor.classList.add('is-visible');
          }

          if (lastX !== null) {
            var dx = e.clientX - lastX;
            var dy = e.clientY - lastY;
            // Full heading (every direction, not just a left/right tilt) —
            // the penguin now actually turns to face where it's moving.
            if (Math.hypot(dx, dy) > 1.5) {
              var target = Math.atan2(dy, dx) * (180 / Math.PI);
              var delta = ((target - currentAngle + 540) % 360) - 180;
              currentAngle += delta;
              setRot(currentAngle);
            }
          }
          lastX = e.clientX;
          lastY = e.clientY;

          if (lastTrailX === null || Math.hypot(e.clientX - lastTrailX, e.clientY - lastTrailY) > 28) {
            lastTrailX = e.clientX;
            lastTrailY = e.clientY;
            spawnTrail(e.clientX, e.clientY);
          }
        },
        { passive: true }
      );

      document.addEventListener('mouseleave', function () {
        shown = false;
        cursor.classList.remove('is-visible');
      });

      /* ---------- trail: tiny fading penguins ---------- */
      function spawnTrail(x, y) {
        var el = document.createElement('img');
        el.src = 'assets/penguin.png';
        el.alt = '';
        el.setAttribute('aria-hidden', 'true');
        el.className = 'cursor-trail-item';
        document.body.appendChild(el);
        gsap.set(el, { x: x, y: y, xPercent: -50, yPercent: -50, opacity: 0.5, scale: 0.55 });
        gsap.to(el, {
          opacity: 0,
          scale: 0.12,
          y: y + 16,
          duration: 0.75,
          ease: 'power1.out',
          onComplete: function () {
            el.remove();
          },
        });
      }

      /* ---------- click burst: mini penguins + mini yellow balls ---------- */
      document.addEventListener('click', function (e) {
        var target = e.target.closest('a, button');
        if (!target) return;
        burst(e.clientX, e.clientY);
      });

      function burst(x, y) {
        var count = 5;
        for (var i = 0; i < count; i++) {
          (function () {
            var isBall = Math.random() > 0.55;
            var el = document.createElement(isBall ? 'span' : 'img');
            el.setAttribute('aria-hidden', 'true');
            if (isBall) {
              el.className = 'cursor-burst-item cursor-burst-item--ball';
            } else {
              el.src = 'assets/penguin.png';
              el.alt = '';
              el.className = 'cursor-burst-item cursor-burst-item--penguin';
            }
            document.body.appendChild(el);

            var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
            var dist = 36 + Math.random() * 34;
            var dx = Math.cos(angle) * dist;
            var dy = Math.sin(angle) * dist * 0.6 - 16;

            gsap.set(el, { x: x, y: y, xPercent: -50, yPercent: -50, opacity: 1, scale: 0.4, rotation: 0 });
            gsap.to(el, {
              x: x + dx,
              y: y + dy + 55,
              rotation: (Math.random() - 0.5) * 140,
              opacity: 0,
              scale: 0.25,
              duration: 0.6 + Math.random() * 0.15,
              ease: 'power2.out',
              onComplete: function () {
                el.remove();
              },
            });
          })();
        }
      }

      /* ---------- magnetic pull on buttons ----------
         GSAP's inline transform takes over from the CSS :hover translateY
         once it runs, so the usual "-2px lift" on hover is folded in here
         as the magnet's resting offset instead of being lost. */
      var magnets = document.querySelectorAll('.btn, .btn--outline');
      magnets.forEach(function (btn) {
        var mx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
        var my = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
        btn.addEventListener('mousemove', function (e) {
          var r = btn.getBoundingClientRect();
          mx((e.clientX - (r.left + r.width / 2)) * 0.25);
          my((e.clientY - (r.top + r.height / 2)) * 0.2 - 2);
        });
        btn.addEventListener('mouseleave', function () {
          mx(0);
          my(0);
        });
      });
    } catch (err) {
      // Something failed: strip the class so the native cursor comes straight
      // back rather than leaving the visitor without any visible cursor.
      root.classList.remove('has-custom-cursor');
    }
  }
})();
