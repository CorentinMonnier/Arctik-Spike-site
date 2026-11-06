/*
 * Arctik Spike — carrousel "showcase" du produit (section #produit).
 *
 * Le défilement lui-même est du CSS pur (scroll-snap) : ça marche au doigt,
 * au trackpad et à la molette sans une ligne de JS. Ce script ajoute
 * seulement ce que le CSS ne peut pas faire tout seul :
 *   - les points de navigation, générés depuis les slides réelles du DOM
 *     (jamais codés en dur) pour ne jamais se désynchroniser si une slide
 *     est ajoutée/retirée plus tard ;
 *   - les flèches précédent/suivant ;
 *   - la synchronisation du point actif avec la position de scroll ;
 *   - la vidéo (2 Mo) qui ne se charge/joue que quand sa slide est
 *     effectivement visible, et se met en pause sinon.
 *
 * Aucune dépendance GSAP/Three.js — fonctionne même si les deux échouent
 * à charger.
 */
(function () {
  'use strict';

  var showcase = document.querySelector('[data-showcase]');
  if (!showcase) return;

  var viewport = showcase.querySelector('[data-showcase-viewport]');
  var slides = Array.prototype.slice.call(showcase.querySelectorAll('.showcase__slide'));
  var dotsContainer = showcase.querySelector('[data-showcase-dots]');
  var prevBtn = showcase.querySelector('[data-showcase-prev]');
  var nextBtn = showcase.querySelector('[data-showcase-next]');

  if (!viewport || !slides.length || !dotsContainer) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var currentIndex = 0;

  var dots = slides.map(function (slide, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'showcase__dot';
    dot.setAttribute('aria-label', 'Aller à la photo ' + (i + 1) + ' sur ' + slides.length);
    dot.addEventListener('click', function () {
      scrollToSlide(i);
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  function setActive(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
  }

  function scrollToSlide(index) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    var slide = slides[index];
    if (!slide) return;
    var target = slide.offsetLeft - (viewport.clientWidth - slide.clientWidth) / 2;
    viewport.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      scrollToSlide(currentIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      scrollToSlide(currentIndex + 1);
    });
  }

  if (typeof IntersectionObserver !== 'undefined') {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var slide = entry.target;
          var isCurrent = entry.isIntersecting && entry.intersectionRatio > 0.6;
          slide.classList.toggle('is-current', isCurrent);
          if (isCurrent) setActive(slides.indexOf(slide));

          var video = slide.querySelector('[data-showcase-video]');
          if (video) {
            if (isCurrent) {
              video.play().catch(function () {
                // Autoplay blocked (shouldn't happen — it's muted — but
                // never let a rejected promise surface as an error).
              });
            } else {
              video.pause();
            }
          }
        });
      },
      { root: viewport, threshold: [0, 0.6, 1] }
    );
    slides.forEach(function (slide) {
      observer.observe(slide);
    });
  }

  setActive(0);
  dots[0].classList.add('is-active');
})();
