/*
 * Arctik Spike — scroll reveals for everything below the hero:
 * the product callouts, the "Notre histoire" paragraphs, the rules list
 * and the contact cards. Simple fade/slide-up on scroll, nothing pinned.
 *
 * Same safety net as the hero: if GSAP/ScrollTrigger never show up (or
 * the visitor asked for reduced motion), every element is just shown at
 * rest immediately — nothing here can leave the page half-hidden.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var callouts = Array.prototype.slice.call(document.querySelectorAll('[data-callout]'));
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var targets = callouts.concat(reveals);

  if (!targets.length) return;

  if (reduce) {
    showAll();
    return;
  }

  var attempts = 0;
  (function waitForGsap() {
    if (typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined') {
      setup();
      return;
    }
    attempts += 1;
    if (attempts > 40) {
      showAll(); // ~4s and still nothing: don't leave content invisible
      return;
    }
    window.setTimeout(waitForGsap, 100);
  })();

  function showAll() {
    targets.forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  function setup() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    try {
      callouts.forEach(function (el, i) {
        gsap.set(el, { opacity: 0, y: 14 });
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: i * 0.12,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 82%' },
        });
      });

      reveals.forEach(function (el) {
        gsap.set(el, { opacity: 0, y: 22 });
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
    } catch (err) {
      showAll();
    }
  }
})();
