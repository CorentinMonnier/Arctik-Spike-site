/*
 * Arctik Spike — hero 3D scene controller.
 *
 * Concept: a stylised 3D Arctik Spike net sits centre-stage, turning
 * slowly on its own. The letters of "ARCTIK SPIKE" drop in one by one
 * from above and bounce on the net like a real trampoline before
 * settling; the penguin drops in last and gives one bounce of its own.
 *
 * Three safety tiers, chosen automatically so the hero is never broken:
 *   1. hero--3d-active  : the real WebGL scene described above.
 *   2. hero--2d-fallback: no WebGL (or Three.js/GSAP failed to load) but
 *      GSAP is available — same fall-and-bounce idea, done with plain
 *      DOM letters/mascot instead of 3D meshes.
 *   3. hero--static     : reduced motion, or nothing loaded in time —
 *      everything just sits in its resting, fully visible position.
 */
(function () {
  'use strict';

  var WORD = 'ARCTIK SPIKE';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stage = document.querySelector('[data-hero-stage]');
  var inner = document.querySelector('[data-hero-inner]');
  var canvasEl = document.querySelector('[data-hero-canvas]');
  var wordEl = document.querySelector('[data-hero-word]');
  var mascotImg = document.querySelector('[data-hero-mascot]');
  var hintEl = document.querySelector('[data-hero-hint]');

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
  }

  /* ============================== TIER 2 ============================== */

  function setup2DFallback() {
    stage.classList.add('hero--2d-fallback');
    var gsap = window.gsap;
    var hasScroll = typeof window.ScrollTrigger !== 'undefined';
    if (hasScroll) gsap.registerPlugin(window.ScrollTrigger);

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

    gsap.set(letters, { y: -220, opacity: 0 });
    gsap.set(mascotImg, { y: -220, opacity: 0 });

    var tl = gsap.timeline();
    tl.to(letters, { y: 0, opacity: 1, duration: 1, ease: 'bounce.out', stagger: 0.1 }, 0.1);
    tl.to(mascotImg, { y: 0, opacity: 1, duration: 0.8, ease: 'bounce.out' }, '>-0.1');

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
      if (hintEl) pull.to(hintEl, { opacity: 0, duration: 0.3 }, 0);
    }
  }

  /* ============================== TIER 1 ============================== */

  function setup3D() {
    var THREE = window.THREE;
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    stage.classList.add('hero--3d-active');

    var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070707, 0.045);

    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.9, 9.5);
    camera.lookAt(0, -0.4, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0c, 1.2));
    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x4dd4ce, 0.6);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    function sizeRenderer() {
      var w = stage.clientWidth;
      var h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    sizeRenderer();

    var netGroup = buildNet(THREE);
    netGroup.position.set(0, -1.1, -0.6);
    scene.add(netGroup);

    var letterGroup = new THREE.Group();
    scene.add(letterGroup);

    var fontReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (resolve) { window.setTimeout(resolve, 600); });

    var netSurfaceY = netGroup.position.y + 0.02; // top face of the woven net, in world space

    Promise.race([fontReady, timeout]).then(function () {
      var items = buildLetters(THREE, letterGroup, netSurfaceY);
      buildMascot(THREE, scene, netSurfaceY, function (mascotMesh) {
        playEntrance(gsap, items, mascotMesh);
        setupScrollDolly(gsap, camera, netGroup, items, mascotMesh);
      });
    });

    var clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      netGroup.rotation.y += clock.getDelta() * 0.18;
      camera.lookAt(0, -0.3, netGroup.position.z); // keep the net framed even as the dolly moves
      renderer.render(scene, camera);
    }
    tick();

    var resizeFrame = null;
    window.addEventListener('resize', function () {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = null;
        sizeRenderer();
      });
    });

    /* ---- the net itself: rim + three legs + woven surface, all procedural ---- */
    function buildNet(THREE) {
      var group = new THREE.Group();
      var radius = 3.1;

      var rimGeo = new THREE.TorusGeometry(radius, 0.14, 14, 56);
      var rimMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.4 });
      var rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      group.add(rimMesh);

      var netTex = buildNetTexture(THREE);
      var netGeo = new THREE.CircleGeometry(radius - 0.22, 48);
      var netMat = new THREE.MeshBasicMaterial({
        map: netTex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
      var netMesh = new THREE.Mesh(netGeo, netMat);
      netMesh.rotation.x = -Math.PI / 2;
      netMesh.position.y = 0.02;
      group.add(netMesh);

      var legMat = new THREE.MeshStandardMaterial({ color: 0x20a39e, roughness: 0.4, metalness: 0.1 });
      var legCount = 3;
      for (var i = 0; i < legCount; i++) {
        var angle = (i / legCount) * Math.PI * 2;
        var legGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.5, 10);
        var leg = new THREE.Mesh(legGeo, legMat);
        var legRadius = radius * 0.78;
        leg.position.set(Math.cos(angle) * legRadius, -1.25, Math.sin(angle) * legRadius);
        leg.rotation.z = Math.cos(angle) * 0.22;
        leg.rotation.x = -Math.sin(angle) * 0.22;
        group.add(leg);
      }

      return group;
    }

    function buildNetTexture(THREE) {
      var size = 512;
      var cnv = document.createElement('canvas');
      cnv.width = size;
      cnv.height = size;
      var ctx = cnv.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(8,9,10,0.55)';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1.4;
      var step = 22;
      for (var x = -size; x < size * 2; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + size, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, size);
        ctx.lineTo(x + size, 0);
        ctx.stroke();
      }
      var tex = new THREE.CanvasTexture(cnv);
      tex.minFilter = THREE.LinearFilter;
      return tex;
    }

    /* ---- letters: one canvas-textured plane per glyph ---- */
    function buildLetters(THREE, group, netSurfaceY) {
      var cursor = 0;
      var spacing = 0.18;
      var planeHeight = 1.55;
      var restY = netSurfaceY + planeHeight / 2 - 0.08; // bottom edge sinks slightly into the netting
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

        var startY = 7 + Math.random() * 2.5;
        var tiltZ = (Math.random() - 0.5) * 0.5;
        mesh.position.set(0, startY, Math.random() * 0.4);
        mesh.rotation.z = tiltZ;
        group.add(mesh);
        items.push({
          mesh: mesh,
          finalX: finalX,
          startY: startY,
          restY: restY + Math.random() * 0.06,
          tiltZ: tiltZ,
        });
      });

      var total = cursor - spacing;
      items.forEach(function (it) {
        it.finalX -= total / 2;
        it.mesh.position.x = it.finalX; // horizontal position is set immediately…
      });
      group.userData.letters = items;
      return items; // …only the fall (y) and the settle (rotation) animate in.
    }

    function buildMascot(THREE, scene, netSurfaceY, cb) {
      var loader = new THREE.TextureLoader();
      loader.load(
        'assets/penguin.png',
        function (tex) {
          tex.minFilter = THREE.LinearFilter;
          var img = tex.image;
          var h = 1.9;
          var w = h * (img.width / img.height);
          var geo = new THREE.PlaneGeometry(w, h);
          var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
          var mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(-3.6, 7, 1.6);
          mesh.userData.restY = netSurfaceY + h / 2 - 0.1;
          scene.add(mesh);
          cb(mesh);
        },
        undefined,
        function () { cb(null); }
      );
    }

    function playEntrance(gsap, items, mascotMesh) {
      var tl = gsap.timeline({ delay: 0.2 });
      items.forEach(function (it, i) {
        tl.to(it.mesh.position, { y: it.restY, duration: 1.1, ease: 'bounce.out' }, i * 0.1);
        tl.to(it.mesh.rotation, { z: 0, duration: 0.6, ease: 'power2.out' }, i * 0.1);
      });
      if (mascotMesh) {
        var dropAt = items.length * 0.1 + 0.3;
        tl.to(mascotMesh.position, { x: -2.6, y: mascotMesh.userData.restY, duration: 1, ease: 'bounce.out' }, dropAt);
      }
    }

    function setupScrollDolly(gsap, camera, netGroup, items, mascotMesh) {
      var mats = items.map(function (it) { return it.mesh.material; });

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
      tl.to(camera.position, { y: 3.2, z: 5.6, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(netGroup.rotation, { y: '+=1.6', duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(netGroup.position, { z: -2.4, duration: 1, ease: 'power1.inOut' }, 0);
      if (mats.length) tl.to(mats, { opacity: 0, duration: 0.4 }, 0.5);
      if (mascotMesh) tl.to(mascotMesh.material, { opacity: 0, duration: 0.4 }, 0.5);
      if (hintEl) tl.to(hintEl, { opacity: 0, duration: 0.25 }, 0);
    }
  }
})();
