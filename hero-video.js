/*
 * Arctik Spike — hero video background.
 *
 * Replaces the old 3D net/icebergs hero entirely: the real product, shot
 * on the beach, grayscale, full-bleed behind a transparent header — the
 * Medici Studio treatment Corentin asked for. Deliberately dependency-
 * free (no GSAP/ScrollTrigger) even though this site already loads them
 * for other things: this is the very first thing a visitor sees, so it
 * shouldn't be able to fail if a CDN script is slow or blocked. Every
 * other script here follows the same "critical path stays vanilla" rule
 * (particles.js did before it was retired, sticky-bar.js, cursor.js's
 * rotation math).
 *
 * What it does, in order:
 *   1. Marks <html class="js"> immediately — gates the CSS fallback in
 *      styles.css (see the .js rules there) so a no-JS page shows a
 *      plain, fully legible hero instead of one stuck mid-transition.
 *   2. Decides video vs. poster by screen width (not just CSS display:
 *      the video only ever gets a `src` on wider screens, so phones never
 *      fetch the clip at all).
 *   3. Pin mechanics are plain CSS (`position: sticky` on .hero__sticky,
 *      inside a tall .hero — see styles.css); this script only computes
 *      *how far* into that pinned range we've scrolled, each frame, and
 *      writes that progress into --hero-blur and .hero__overlay's
 *      opacity, plus toggles the header's transparent/solid state.
 *   4. Fades the wordmark in once, shortly after load.
 *
 * Reduced motion: skips the scroll-driven blur/overlay scrub entirely —
 * styles.css already pins the video sharp with a fixed legible scrim via
 * its own reduced-motion block, so this script only needs to handle the
 * header toggle and the (instant, no-transition) wordmark visibility.
 */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var heroStage = document.querySelector('[data-hero-stage]');
  var heroSticky = document.querySelector('[data-hero-sticky]');
  var video = document.querySelector('[data-hero-video]');
  var header = document.querySelector('[data-site-header]');
  var wordEl = document.querySelector('.hero__word');
  var overlayEl = document.querySelector('[data-hero-overlay]');

  if (!heroStage || !heroSticky) return; // markup missing, nothing to do

  /* ---------- video vs. poster, by width ---------- */
  var DESKTOP_QUERY = '(min-width: 761px)';
  if (video) {
    try {
      if (window.matchMedia(DESKTOP_QUERY).matches) {
        video.src = 'assets/product-video.mp4';
        video.load();
        video.play().catch(function () {
          // Autoplay can still be refused in some contexts even when
          // muted+playsinline — the poster frame (set as the video's own
          // `poster` attribute) keeps showing either way, so this is a
          // silent, harmless no-op rather than a broken-looking hero.
        });
      }
    } catch (err) {
      // Never let this block the rest of the page.
    }
  }

  /* ---------- wordmark fade-in ---------- */
  if (wordEl) {
    if (reduceMotion) {
      wordEl.classList.add('is-visible'); // CSS already makes this instant, no transition, under reduced motion
    } else {
      window.setTimeout(function () {
        wordEl.classList.add('is-visible');
      }, 400);
    }
  }

  /* ---------- scroll-driven blur/overlay + header state ---------- */
  var BLUR_START_PX = 14;
  var BLUR_DONE_AT = 0.4; // blur finishes clearing by 40% through the pin
  var DARKEN_FROM = 0.4; // overlay starts darkening right where blur finishes — sequential, not simultaneous
  var ticking = false;

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function update() {
    ticking = false;

    var pinnable = heroStage.offsetHeight - window.innerHeight;
    var scrolledInto = -heroStage.getBoundingClientRect().top;
    var progress = pinnable > 0 ? clamp01(scrolledInto / pinnable) : 0;

    if (!reduceMotion) {
      var blurProgress = clamp01(progress / BLUR_DONE_AT);
      var blurPx = BLUR_START_PX * (1 - blurProgress);
      heroSticky.style.setProperty('--hero-blur', blurPx.toFixed(2) + 'px');

      if (overlayEl) {
        var darkenProgress = clamp01((progress - DARKEN_FROM) / (1 - DARKEN_FROM));
        overlayEl.style.opacity = darkenProgress.toFixed(3);
      }
    }

    // Header stays transparent for as long as the hero is still pinned
    // (progress < 1 means .hero__sticky hasn't released yet) — there's
    // always a video frame or the darkening overlay behind it, never
    // nothing, so transparent is always safe here.
    if (header) {
      header.classList.toggle('site-header--on-hero', progress < 1);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  update(); // set the correct initial state before the first scroll event
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
