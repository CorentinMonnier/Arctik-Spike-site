/*
 * Arctik Spike — the sunglasses penguin struts across the screen once,
 * right as the hero hands off to the product section. Purely decorative
 * (aria-hidden, pointer-events: none); the actual hero→produit colour
 * transition it rides alongside is already seamless on its own (see
 * styles.css) — this never gates or blocks that, it's just a character
 * moment layered on top of it.
 *
 * The walk cycle is a 15-frame sprite sheet (see styles.css for why —
 * video-with-alpha was tried and dropped), so this script does two things
 * together, both driven off the same ScrollTrigger progress: slides the
 * element across the screen (the `x` tween), and steps the sprite through
 * its 15 frames (background-position-x, set directly rather than via a
 * CSS transition, so frames change crisply instead of blending into each
 * other).
 *
 * Tied to GSAP ScrollTrigger like the hero's own scroll-dolly, so it
 * shares the same honest caveat: the scrub animation itself can't be
 * rendered/checked in a sandbox without the CDN libs. The sprite-sheet
 * mechanics (frame content, alpha, background-size math) are fully
 * static/CSS and were checked instead via a forced position + screenshot.
 *
 * Defensive like everything else here: skipped under prefers-reduced-
 * motion, and if GSAP/ScrollTrigger never load, the element just stays at
 * its CSS resting position (off-screen, see styles.css) — never visible,
 * never blocking anything.
 */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var el = document.querySelector('[data-penguin-curtain]');
  var produit = document.getElementById('produit');
  if (!el || !produit) return;

  var FRAME_COUNT = 15;

  var attempts = 0;
  (function waitForLibs() {
    var ready = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (ready) {
      setup();
      return;
    }
    attempts += 1;
    if (attempts > 40) return; // ~4s, nothing loaded: leave it at its off-screen CSS resting spot.
    window.setTimeout(waitForLibs, 100);
  })();

  function setup() {
    try {
      var gsap = window.gsap;
      var ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      // One frame's on-screen width, in px — background-size is 1500%
      // (15 frames) of this element's own box, so each frame slot in
      // background-position space is exactly one element-width wide.
      // Measured once at setup; this is a decorative element, so a later
      // window resize nudging the frame boundaries slightly is an
      // acceptable trade against the complexity of a resize observer here.
      var frameWidth = el.getBoundingClientRect().width || 190;

      function setFrame(progress) {
        var idx = Math.floor(progress * FRAME_COUNT);
        if (idx < 0) idx = 0;
        if (idx > FRAME_COUNT - 1) idx = FRAME_COUNT - 1;
        el.style.backgroundPositionX = -(idx * frameWidth) + 'px';
      }

      gsap.set(el, { xPercent: -50, yPercent: -50, x: '-140vw' });
      setFrame(0);

      gsap.to(el, {
        x: '140vw',
        ease: 'none',
        scrollTrigger: {
          trigger: produit,
          start: 'top 85%',
          end: 'top 15%',
          scrub: 0.6,
          onUpdate: function (self) {
            setFrame(self.progress);
          },
        },
      });
    } catch (err) {
      // Never let this block the page — it's decoration, nothing downstream
      // depends on it.
    }
  }
})();
