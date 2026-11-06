/*
 * Arctik Spike — sticky "Acheter" bar.
 *
 * Shows once the visitor has scrolled down to (or past) the product
 * section, stays visible through the rest of the page, and hides again if
 * they scroll back above it. Dismissible for the rest of the browser tab
 * session. Pure IntersectionObserver + CSS transitions — no GSAP/Three.js
 * dependency, so it isn't affected by either failing to load.
 */
(function () {
  'use strict';

  var bar = document.querySelector('[data-sticky-bar]');
  var trigger = document.getElementById('produit');
  if (!bar || !trigger || typeof IntersectionObserver === 'undefined') return;

  var closeBtn = bar.querySelector('[data-sticky-close]');
  var dismissed = false;
  try {
    dismissed = window.sessionStorage.getItem('arctikSpikeStickyDismissed') === '1';
  } catch (e) {
    dismissed = false;
  }
  if (dismissed) return;

  var observer = new IntersectionObserver(
    function (entries) {
      if (dismissed) return;
      var top = entries[0].boundingClientRect.top;
      if (top <= 0) {
        bar.classList.add('is-visible');
      } else {
        bar.classList.remove('is-visible');
      }
    },
    { threshold: [0, 1] }
  );
  observer.observe(trigger);

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      dismissed = true;
      bar.classList.remove('is-visible');
      try {
        window.sessionStorage.setItem('arctikSpikeStickyDismissed', '1');
      } catch (e) {
        // sessionStorage unavailable (private mode, etc.) — it just won't
        // remember the dismissal across reloads, nothing else breaks.
      }
    });
  }
})();
