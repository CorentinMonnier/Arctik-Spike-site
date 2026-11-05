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

  /* ---------- product panel reveal + growing depth shadow ---------- */
  var productCard = document.querySelector('[data-product-card]');
  if (!productCard) return;

  if (reduce) {
    productCard.style.opacity = '1';
    productCard.style.transform = 'none';
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
      productCard.style.opacity = '1';
      productCard.style.transform = 'none';
      return;
    }
    window.setTimeout(waitForGsap, 100);
  })();

  function setup() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

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

    // Depth cue: the shadow grows and deepens the further the card has
    // travelled into view, instead of popping in at full strength.
    gsap.to(
      { t: 0 },
      {
        t: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: productCard,
          start: 'top bottom',
          end: 'top 40%',
          scrub: 0.6,
        },
        onUpdate: function () {
          var t = this.targets()[0].t;
          productCard.style.setProperty('--shadow-y', 16 + t * 30 + 'px');
          productCard.style.setProperty('--shadow-blur', 30 + t * 70 + 'px');
          productCard.style.setProperty('--shadow-alpha', (0.18 + t * 0.32).toFixed(2));
        },
      }
    );
  }
})();
