/*
 * Arctik Spike — hero 3D scene controller.
 *
 * Three safety tiers, chosen automatically:
 *   1. hero--3d-active  : real WebGL scene (Three.js) — video-textured
 *      background plane + letters assembled from scattered 3D planes +
 *      a flying penguin plane, with a scroll-scrubbed camera dolly.
 *   2. hero--2d-fallback: no WebGL (or Three.js/GSAP failed to load) but
 *      GSAP is available — reuses the proven 2D DOM letter/mascot
 *      animation (same mechanic validated earlier in this project).
 *   3. hero--static     : reduced motion, or nothing loaded in time —
 *      everything just sits in its resting, fully visible position.
 *
 * Whatever happens, the hero is NEVER left blank or half-built.
 */
(function () {
  'use strict';

  var WORD = 'ARCTIK SPIKE';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stage = document.querySelector('[data-hero-stage]');
  var inner = document.querySelector('[data-hero-inner]');
  var canvasEl = document.querySelector('[data-hero-canvas]');
  var videoEl = document.querySelector('[data-hero-video]');
  var wordEl = document.querySelector('[data-hero-word]');
  var mascotImg = document.querySelector('[data-hero-mascot]');
  var hintEl = document.querySelector('[data-hero-hint]');
  var gridEl = document.querySelector('[data-hero-grid]');

  if (!stage || !inner || !wordEl || !mascotImg) return; // markup missing, nothing to do

  if (reduceMotion) {
    setStatic();
    return;
  }

  var attempts = 0;
  (function waitForLibs() {
    var ready = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (ready) {
      start(typeof window.THREE !== 'undefined' && supportsWebGL());
      return;
    }
    attempts += 1;
    if (attempts > 40) {
      setStatic(); // ~4s and still nothing: give up cleanly
      return;
    }
    window.setTimeout(waitForLibs, 100);
  })();

  function supportsWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  function start(canDo3D) {
    if (canDo3D) {
      try {
        setup3D();
        return;
      } catch (err) {
        // Any runtime failure in the 3D path falls straight back to the
        // 2D DOM animation rather than leaving a broken canvas on screen.
        stage.classList.remove('hero--3d-active');
      }
    }
    setup2DFallback();
  }

  /* ============================== TIER 3 ============================== */

  function setStatic() {
    stage.classList.add('hero--static');
    wordEl.textContent = WORD;
    mascotImg.style.opacity = '1';
    if (videoEl) {
      videoEl.play && videoEl.play().catch(function () {});
    }
  }

  /* ============================== TIER 2 ============================== */

  function setup2DFallback() {
    stage.classList.add('hero--2d-fallback');
    var gsap = window.gsap;
    var hasScroll = typeof window.ScrollTrigger !== 'undefined';
    if (hasScroll) gsap.registerPlugin(window.ScrollTrigger);

    if (videoEl) videoEl.play && videoEl.play().catch(function () {});

    var letters = [];
    WORD.split('').forEach(function (ch) {
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

    if (!letters.length) {
      setStatic();
      return;
    }

    letters.forEach(function (letter) {
      var rx = (Math.random() * 260 - 130).toFixed(1);
      var ry = (Math.random() * 160 - 100).toFixed(1);
      var rr = (Math.random() * 70 - 35).toFixed(1);
      gsap.set(letter, { x: rx, y: ry, rotate: rr, opacity: 0 });
    });
    gsap.set(mascotImg, { opacity: 0 });

    var entrance = gsap.timeline();
    entrance
      .to(mascotImg, { opacity: 1, duration: 0.2 })
      .to(letters, { x: 0, y: 0, rotate: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.1)
      .to(mascotImg, { left: '100%', duration: 0.7, ease: 'power1.inOut' }, 0.1)
      .to(mascotImg, { opacity: 0, duration: 0.25 }, '>-0.15');

    if (hasScroll) {
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
      if (gridEl) pull.to(gridEl, { scale: 1.15, opacity: 0.4, duration: 1, ease: 'power1.inOut' }, 0);
      if (hintEl) pull.to(hintEl, { opacity: 0, duration: 0.3 }, 0);
    }
  }

  /* ============================== TIER 1 ============================== */

  function setup3D() {
    var THREE = window.THREE;
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    stage.classList.add('hero--3d-active');
    if (videoEl) videoEl.play && videoEl.play().catch(function () {});

    var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070707, 0.05);

    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    function sizeRenderer() {
      var w = stage.clientWidth;
      var h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      return { w: w, h: h };
    }
    sizeRenderer();

    /* ---- background video plane ---- */
    var videoMesh = null;
    if (videoEl && window.THREE.VideoTexture) {
      var videoTex = new THREE.VideoTexture(videoEl);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      var videoMat = new THREE.MeshBasicMaterial({ map: videoTex, toneMapped: false, transparent: true, opacity: 0.85 });
      var videoGeo = new THREE.PlaneGeometry(1, 1);
      videoMesh = new THREE.Mesh(videoGeo, videoMat);
      videoMesh.position.z = -14;
      fitPlaneToFrustum(videoMesh, -14, 1.35);
      scene.add(videoMesh);
    }

    /* ---- letters, built once the brand font is actually ready ---- */
    var letterGroup = new THREE.Group();
    scene.add(letterGroup);

    var fontReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (resolve) { window.setTimeout(resolve, 600); });

    Promise.race([fontReady, timeout]).then(function () {
      buildLetters(letterGroup);
      buildMascot(scene, function (mascotMesh) {
        playEntrance(letterGroup, mascotMesh);
        setupScrollDolly(camera, letterGroup, videoMesh, mascotMesh);
      });
    });

    function tick() {
      requestAnimationFrame(tick);
      renderer.render(scene, camera);
    }
    tick();

    var resizeFrame = null;
    window.addEventListener('resize', function () {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = null;
        sizeRenderer();
        if (videoMesh) fitPlaneToFrustum(videoMesh, videoMesh.position.z, 1.35);
      });
    });

    function fitPlaneToFrustum(mesh, z, margin) {
      var dist = Math.abs(camera.position.z - z);
      var visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
      var visibleW = visibleH * camera.aspect;
      mesh.scale.set(visibleW * margin, visibleH * margin, 1);
    }

    function buildLetters(group) {
      var cursor = 0;
      var spacing = 0.18;
      var planeHeight = 1.7;
      var items = [];

      WORD.split('').forEach(function (ch) {
        if (ch === ' ') {
          cursor += spacing * 2.4;
          return;
        }
        var cnv = document.createElement('canvas');
        var ctx = cnv.getContext('2d');
        var fontPx = 260;
        ctx.font = fontPx + 'px Shrikhand, cursive';
        var measured = ctx.measureText(ch).width;
        cnv.width = Math.ceil(measured + fontPx * 0.5);
        cnv.height = Math.ceil(fontPx * 1.35);
        ctx.font = fontPx + 'px Shrikhand, cursive';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ch, cnv.width / 2, cnv.height / 2 + fontPx * 0.06);

        var tex = new THREE.CanvasTexture(cnv);
        tex.minFilter = THREE.LinearFilter;
        var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
        var ratio = cnv.width / cnv.height;
        var planeWidth = planeHeight * ratio;
        var geo = new THREE.PlaneGeometry(planeWidth, planeHeight);
        var mesh = new THREE.Mesh(geo, mat);

        var finalX = cursor + planeWidth / 2;
        cursor += planeWidth + spacing;

        mesh.position.set((Math.random() * 10 - 5), (Math.random() * 6 - 3), (Math.random() * 6 - 2));
        mesh.rotation.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4);
        group.add(mesh);
        items.push({ mesh: mesh, finalX: finalX, mat: mat });
      });

      var total = cursor - spacing;
      items.forEach(function (it) { it.finalX -= total / 2; });
      group.userData.letters = items;
    }

    function buildMascot(scene, cb) {
      var loader = new THREE.TextureLoader();
      loader.load(
        'assets/penguin.png',
        function (tex) {
          tex.minFilter = THREE.LinearFilter;
          var img = tex.image;
          var h = 2.1;
          var w = h * (img.width / img.height);
          var geo = new THREE.PlaneGeometry(w, h);
          var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 });
          var mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(-5, 0, 1);
          scene.add(mesh);
          cb(mesh);
        },
        undefined,
        function () { cb(null); }
      );
    }

    function playEntrance(group, mascotMesh) {
      var items = group.userData.letters || [];
      var tl = gsap.timeline();
      if (mascotMesh) {
        tl.to(mascotMesh.material, { opacity: 1, duration: 0.25 }, 0);
        tl.to(mascotMesh.position, { x: 0.2, duration: 0.8, ease: 'power2.out' }, 0.05);
      }
      items.forEach(function (it, i) {
        tl.to(it.mesh.position, { x: it.finalX, y: 0, z: 0, duration: 0.8, ease: 'power3.out' }, 0.2 + i * 0.045);
        tl.to(it.mesh.rotation, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'power3.out' }, 0.2 + i * 0.045);
      });
      if (mascotMesh) {
        tl.to(mascotMesh.position, { x: 6, duration: 0.7, ease: 'power1.inOut' }, '>-0.2');
        tl.to(mascotMesh.material, { opacity: 0, duration: 0.3 }, '<');
      }
    }

    function setupScrollDolly(camera, group, videoMesh, mascotMesh) {
      var items = group.userData.letters || [];
      var mats = items.map(function (it) { return it.mat; });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: '+=130%',
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
      });
      tl.to(camera.position, { z: 3.4, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(camera.rotation, { x: -0.035, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(group.rotation, { y: 0.22, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(group.position, { z: 1.6, duration: 1, ease: 'power1.inOut' }, 0);
      if (mats.length) tl.to(mats, { opacity: 0, duration: 0.35 }, 0.5);
      if (videoMesh) {
        tl.to(videoMesh.position, { z: -9.5, duration: 1, ease: 'power1.inOut' }, 0);
        tl.to(videoMesh.material, { opacity: 0.35, duration: 1, ease: 'power1.inOut' }, 0);
      }
      if (hintEl) tl.to(hintEl, { opacity: 0, duration: 0.25 }, 0);
    }
  }
})();
