/*
 * Arctik Spike — smooth/inertia scroll (Lenis), synced with GSAP
 * ScrollTrigger. This is the one piece the site was actually missing to
 * feel like the "fou" reference sites Corentin pointed at: everything else
 * (kinetic type, hover distortion, choreographed reveals) is a matter of
 * detailed direction on top of GSAP + ScrollTrigger + Three.js, which the
 * site already has — but *none* of that reads as premium without this,
 * because the hero's pinned camera dolly and every [data-reveal] already
 * depend on ScrollTrigger reading scroll position, and raw native scroll
 * never has that weighted, eased feel no matter what plays on top of it.
 *
 * Purely additive and defensive:
 *   - Skipped entirely under prefers-reduced-motion — inertia/eased
 *     scrolling is exactly the kind of motion that setting exists to turn
 *     off, and the page already works perfectly on native scroll.
 *   - If Lenis (or GSAP/ScrollTrigger) never load — CDN blocked, slow
 *     network, whatever — this file gives up quietly after ~4s and the
 *     page keeps the native scroll it already had. Nothing downstream
 *     depends on Lenis existing.
 */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var attempts = 0;
  (function waitForLibs() {
    var ready =
      typeof window.gsap !== 'undefined' &&
      typeof window.ScrollTrigger !== 'undefined' &&
      typeof window.Lenis !== 'undefined';
    if (ready) {
      setup();
      return;
    }
    attempts += 1;
    if (attempts > 40) return; // ~4s and still nothing: leave native scroll alone.
    window.setTimeout(waitForLibs, 100);
  })();

  function setup() {
    try {
      var gsap = window.gsap;
      var ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      var lenis = new window.Lenis({
        duration: 1.1,
        smoothWheel: true,
      });

      // Keep every existing ScrollTrigger (the hero dolly, all the
      // [data-reveal] fades) in sync with Lenis's eased scroll position
      // instead of the raw native one.
      lenis.on('scroll', ScrollTrigger.update);

      // Drive Lenis from GSAP's own ticker rather than a separate rAF loop,
      // and disable GSAP's lag smoothing — both are the officially
      // documented way to pair the two without stutter.
      gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);

      // In-page nav links (#produit, #histoire, ...) used the browser's
      // native `scroll-behavior: smooth` before Lenis existed. Hand those
      // same links to Lenis instead so the jump and the inertia scroll
      // never fight over who owns the scroll position mid-animation.
      var links = document.querySelectorAll('a[href^="#"]');
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', handleAnchorClick);
      }

      function handleAnchorClick(e) {
        var hash = this.getAttribute('href');
        if (!hash || hash.length < 2) return; // ignore bare "#"
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target);
      }
    } catch (err) {
      // Never let an unexpected Lenis/GSAP API mismatch break the page —
      // it already works on native scroll without any of this.
    }
  }
})();
