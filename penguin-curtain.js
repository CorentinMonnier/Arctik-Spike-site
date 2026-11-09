/*
 * Arctik Spike — the sunglasses penguin struts across the screen at three
 * points as the visitor scrolls down: hero→produit, histoire→règles, and
 * contact→footer (Corentin asked for it to show up "plus souvent" after
 * the first round — this spreads it across the page rather than just the
 * one appearance it had before). Purely decorative (aria-hidden,
 * pointer-events: none); each crossing rides alongside a section that's
 * already seamless on its own (see styles.css) — this never gates or
 * blocks anything, it's just a character moment layered on top.
 *
 * index.html now has 3 `.penguin-curtain` elements (one per crossing)
 * instead of reusing a single one across 3 ScrollTriggers — deliberately:
 * GSAP's default tween overwrite management is keyed on target+property,
 * so 3 scrub tweens all animating `x` on the *same* element risked one
 * crossing's tween clobbering another's in-flight value. Three separate
 * (but visually identical) elements sidesteps that entirely — each one is
 * fully independent, and since every resting position is off-screen
 * (see styles.css), having 3 of them idle at once costs nothing visible.
 *
 * The walk cycle is a 15-frame sprite sheet (see styles.css for why —
 * video-with-alpha was tried and dropped), so each crossing does two
 * things together, both driven off the same ScrollTrigger progress: slides
 * its element across the screen (the `x` tween), and steps its sprite
 * through the 15 frames (background-position-x, set directly rather than
 * via a CSS transition, so frames change crisply instead of blending).
 *
 * Tied to GSAP ScrollTrigger like the hero's own scroll-dolly, so it
 * shares the same honest caveat: the scrub animation itself can't be
 * rendered/checked in a sandbox without the CDN libs. The sprite-sheet
 * mechanics (frame content, alpha, background-size math) are fully
 * static/CSS and were checked instead via a forced position + screenshot.
 *
 * Defensive like everything else here: skipped under prefers-reduced-
 * motion, and if GSAP/ScrollTrigger never load, every element just stays
 * at its CSS resting position (off-screen, see styles.css) — never
 * visible, never blocking anything.
 */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var elements = Array.prototype.slice.call(document.querySelectorAll('[data-penguin-curtain]'));
  // One crossing per element, in document order, paired by index with the
  // section whose arrival should trigger it.
  var TRIGGER_IDS = ['produit', 'histoire', 'contact'];

  if (!elements.length) return;

  var FRAME_COUNT = 15;

  var attempts = 0;
  (function waitForLibs() {
    var ready = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (ready) {
      setup();
      return;
    }
    attempts += 1;
    if (attempts > 40) return; // ~4s, nothing loaded: leave every element at its off-screen CSS resting spot.
    window.setTimeout(waitForLibs, 100);
  })();

  function setup() {
    try {
      var gsap = window.gsap;
      var ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      elements.forEach(function (el, i) {
        var sectionId = TRIGGER_IDS[i];
        var section = sectionId ? document.getElementById(sectionId) : null;
        if (!section) return; // no matching section for this element: leave it off-screen, do nothing.

        // One frame's on-screen width, in px — background-size is 1500%
        // (15 frames) of this element's own box, so each frame slot in
        // background-position space is exactly one element-width wide.
        // Measured once per element at setup; decorative, so a later
        // window resize nudging the frame boundaries slightly is an
        // acceptable trade against the complexity of a resize observer.
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
            trigger: section,
            start: 'top 85%',
            end: 'top 15%',
            scrub: 0.6,
            onUpdate: function (self) {
              setFrame(self.progress);
            },
          },
        });
      });
    } catch (err) {
      // Never let this block the page — it's decoration, nothing downstream
      // depends on it.
    }
  }
})();
