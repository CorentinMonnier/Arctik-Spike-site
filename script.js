(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile nav toggle ---------- */
  var header = document.querySelector('[data-site-header]');
  if (header) {
    var toggle = header.querySelector('[data-site-header-toggle]');
    var panel = header.querySelector('[data-site-header-mobile-nav]');
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('is-open', !open);
      });
      panel.addEventListener('click', function (event) {
        if (event.target.closest('a')) {
          toggle.setAttribute('aria-expanded', 'false');
          panel.classList.remove('is-open');
        }
      });
    }
  }

  /* ---------- hero word ---------- */
  var word = 'ARCTIK SPIKE';
  var wordEl = document.querySelector('[data-hero-word]');
  var letters = [];
  if (wordEl) {
    word.split('').forEach(function (ch) {
      var span = document.createElement('span');
      if (ch === ' ') {
        span.className = 'sp';
        span.textContent = ' ';
      } else {
        span.textContent = ch;
        letters.push(span);
      }
      wordEl.appendChild(span);
    });
  }

  var stage = document.querySelector('[data-hero-stage]');
  var inner = document.querySelector('[data-hero-inner]');
  var grid = document.querySelector('[data-hero-grid]');
  var hint = document.querySelector('[data-hero-hint]');
  var mascot = document.querySelector('[data-hero-mascot]');
  var productCard = document.querySelector('[data-product-card]');

  if (reduce || !letters.length || !mascot || !stage || !inner) {
    // Static fallback: everything just sits in its resting position.
    if (productCard) {
      productCard.style.opacity = '1';
      productCard.style.transform = 'none';
    }
    return;
  }

  var attempts = 0;
  (function waitForGsap() {
    if (typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined') {
      setup();
      return;
    }
    attempts += 1;
    // GSAP loads from a CDN with `defer`, so it's normally ready almost
    // immediately. If it never shows up (CDN blocked, offline, …) give up
    // quietly after ~4s and leave everything in its static resting state.
    if (attempts > 40) {
      if (productCard) {
        productCard.style.opacity = '1';
        productCard.style.transform = 'none';
      }
      return;
    }
    window.setTimeout(waitForGsap, 100);
  })();

  function setup() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    /* ---- Phase A: one-shot entrance, plays immediately on load ---- */
    letters.forEach(function (letter) {
      var rx = (Math.random() * 260 - 130).toFixed(1);
      var ry = (Math.random() * 160 - 100).toFixed(1);
      var rr = (Math.random() * 70 - 35).toFixed(1);
      gsap.set(letter, { x: rx, y: ry, rotate: rr, opacity: 0 });
    });
    gsap.set(mascot, { opacity: 0 });

    var entrance = gsap.timeline();
    entrance
      .to(mascot, { opacity: 1, duration: 0.2 })
      .to(letters, { x: 0, y: 0, rotate: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.1)
      .to(mascot, { left: '100%', duration: 0.7, ease: 'power1.inOut' }, 0.1)
      .to(mascot, { opacity: 0, duration: 0.25 }, '>-0.15');

    /* ---- Phase B: scroll-scrubbed pull-back, pins the hero ---- */
    var pull = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: '+=100%',
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
      },
    });
    pull.to(inner, { scale: 0.74, y: -40, opacity: 0.55, duration: 1, ease: 'power1.inOut' }, 0);
    if (grid) pull.to(grid, { scale: 1.15, opacity: 0.4, duration: 1, ease: 'power1.inOut' }, 0);
    if (hint) pull.to(hint, { opacity: 0, duration: 0.3 }, 0);

    /* ---- product panel slides up and overlaps as it enters ---- */
    if (productCard) {
      gsap.set(productCard, { y: 60, opacity: 0 });
      gsap.to(productCard, {
        y: 0,
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: productCard,
          start: 'top bottom',
          end: 'top center',
          scrub: 0.6,
        },
      });
    }
  }
})();
