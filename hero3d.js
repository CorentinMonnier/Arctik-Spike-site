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
  var ctaEl = document.querySelector('[data-hero-cta]');

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
      if (ctaEl) pull.to(ctaEl, { opacity: 0, y: 20, duration: 0.5, ease: 'power1.inOut' }, 0);
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

    // Lower and further back than before, closer to the real product
    // photos' own 3/4 angle — the previous framing looked down steeply
    // into the net like a hole; this reads more like a table seen from
    // the side, with the rim's oval and the legs underneath both clear.
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.3, 10.2);
    camera.lookAt(0, -0.7, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0c, 1.2));
    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x4dd4ce, 0.85);
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

    // A few low-poly icebergs, well back in the fog — on brand ("Arctik"),
    // but deliberately a background detail: far enough back that the fog
    // (scene.fog above) naturally hazes them out, never competing with the
    // net/letters for attention.
    scene.add(buildIcebergs(THREE));

    var letterGroup = new THREE.Group();
    scene.add(letterGroup);

    var fontReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (resolve) { window.setTimeout(resolve, 600); });

    var netSurfaceY = netGroup.position.y + 0.02; // top face of the woven net, in world space
    var liveItems = null;
    var liveTotalWidth = 0;

    // Shrinks the letters (and tightens their spacing to match) just enough
    // that the full word fits comfortably in view, whatever the window's
    // aspect ratio — this is what keeps every letter visible and the word
    // properly centred instead of spilling off the sides on narrow screens.
    function fitLettersToView() {
      if (!liveItems || !liveTotalWidth) return;
      var dist = camera.position.z; // letters sit near z ≈ 0
      var vFovRad = (camera.fov * Math.PI) / 180;
      var visibleH = 2 * Math.tan(vFovRad / 2) * dist;
      var visibleW = visibleH * camera.aspect;
      var maxW = visibleW * 0.8;
      var s = Math.min(1, maxW / liveTotalWidth);
      liveItems.forEach(function (it) {
        it.mesh.scale.set(s, s, 1);
        it.mesh.position.x = it.finalX * s;
      });
    }

    Promise.race([fontReady, timeout]).then(function () {
      var built = buildLetters(THREE, letterGroup, netSurfaceY);
      liveItems = built.items;
      liveTotalWidth = built.total;
      fitLettersToView();
      buildMascot(THREE, scene, netSurfaceY, function (mascotMesh) {
        playEntrance(gsap, liveItems, mascotMesh);
        setupScrollDolly(gsap, camera, netGroup, liveItems, mascotMesh);
      });
    });

    var clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      netGroup.rotation.y += clock.getDelta() * 0.18;
      camera.lookAt(0, -0.7, netGroup.position.z); // keep the net framed even as the dolly moves
      renderer.render(scene, camera);
    }
    tick();

    var resizeFrame = null;
    window.addEventListener('resize', function () {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = null;
        sizeRenderer();
        fitLettersToView();
      });
    });

    /* ---- the net itself: rim + three legs + woven surface, modelled on
       the real product photos (dark padded rim, teal branded leg sleeves,
       open black diamond mesh) ---- */
    function buildIcebergs(THREE) {
      // Three simple low-poly ice chunks, placed far back and to the
      // sides. flatShading gives the faceted "cut ice" look cheaply,
      // without needing a real iceberg model.
      var group = new THREE.Group();
      var iceMat = new THREE.MeshStandardMaterial({
        color: 0xcfeeec,
        roughness: 0.75,
        metalness: 0.02,
        transparent: true,
        opacity: 0.5,
        flatShading: true,
      });
      var placements = [
        { x: -7.5, y: 0.3, z: -13, scale: 2.2, rotY: 0.4 },
        { x: 8.8, y: 0, z: -16.5, scale: 3, rotY: -0.9 },
        { x: -3, y: -0.3, z: -19, scale: 1.7, rotY: 1.3 },
      ];
      placements.forEach(function (p) {
        var geo = new THREE.IcosahedronGeometry(1, 0);
        var mesh = new THREE.Mesh(geo, iceMat);
        mesh.position.set(p.x, p.y, p.z);
        mesh.scale.set(p.scale, p.scale * 0.8, p.scale);
        mesh.rotation.set(0.15, p.rotY, 0.1);
        group.add(mesh);
      });
      return group;
    }

    function buildNet(THREE) {
      var group = new THREE.Group();
      var radius = 3.1;

      // Dark padded foam rim — matte, not shiny metal.
      var rimGeo = new THREE.TorusGeometry(radius, 0.15, 14, 56);
      var rimMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.85, metalness: 0.04 });
      var rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      group.add(rimMesh);

      // Open diamond-weave net — mostly transparent so it reads as real mesh.
      var netTex = buildNetTexture(THREE);
      var netGeo = new THREE.CircleGeometry(radius - 0.24, 48);
      var netMat = new THREE.MeshBasicMaterial({
        map: netTex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      var netMesh = new THREE.Mesh(netGeo, netMat);
      netMesh.rotation.x = -Math.PI / 2;
      netMesh.position.y = 0.02;
      group.add(netMesh);

      // Five flat, tapered teal legs — one continuous moulded blade per
      // leg (a single flat shape, not stacked box segments). The 3-block
      // version (foot/neck/body stacked) read as "scattered pieces"
      // instead of one part, because real legs taper *continuously*: narrow
      // where they clip onto the rim, widening into the branded panel,
      // pinching at a narrow waist, then flaring to their widest at the
      // foot — traced from the macro product photo. Each leg is oriented
      // with an explicit basis matrix (tangent/up/outward) rather than
      // Euler rotation, so the branded face points straight outward with
      // no mirroring. Flat (no real extrusion depth) + DoubleSide reads
      // correctly from every angle as the net rotates, since every leg's
      // outward face is what the camera sees from outside the table —
      // true depth would need a custom UV generator for ExtrudeGeometry
      // that isn't worth the risk when it can't be rendered to check here.
      var legTex = buildLegTexture(THREE);
      var legFrontMat = new THREE.MeshStandardMaterial({
        map: legTex,
        roughness: 0.5,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      var legShape = buildLegShape(THREE);
      var legGeo = new THREE.ShapeGeometry(legShape);
      var legCount = 5;
      var legRadius = radius * 0.78;

      for (var i = 0; i < legCount; i++) {
        var angle = (i / legCount) * Math.PI * 2;
        var outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        var up = new THREE.Vector3(0, 1, 0);
        var tangent = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle)); // tangent × up = outward (right-handed)
        var basis = new THREE.Matrix4().makeBasis(tangent, up, outward);
        var legQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
        var lx = Math.cos(angle) * legRadius;
        var lz = Math.sin(angle) * legRadius;

        var leg = new THREE.Mesh(legGeo, legFrontMat);
        leg.position.set(lx, 0, lz);
        leg.quaternion.copy(legQuat);
        group.add(leg);
      }

      // The real ball is bright yellow — rests just off-centre on the net.
      var ballGeo = new THREE.SphereGeometry(0.42, 24, 24);
      var ballMat = new THREE.MeshStandardMaterial({ color: 0xf4d035, roughness: 0.65, metalness: 0.02 });
      var ball = new THREE.Mesh(ballGeo, ballMat);
      ball.position.set(radius * 0.32, 0.46, radius * 0.1);
      group.add(ball);

      return group;
    }

    function buildNetTexture(THREE) {
      var size = 512;
      var cnv = document.createElement('canvas');
      cnv.width = size;
      cnv.height = size;
      var ctx = cnv.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      // Lighter than before: pure near-black lines barely read against the
      // already-dark hero background, so the weave all but disappeared.
      ctx.strokeStyle = 'rgba(72, 78, 77, 0.95)';
      ctx.lineWidth = 2.2;
      var step = 30;
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

    function buildLegShape(THREE) {
      // Local 2D profile: X = width, Y = height, origin (0,0) at the top
      // where the leg clips onto the rim, tracing down to the ground.
      // Symmetric about X=0. See the comment above where this is used for
      // why this replaced three stacked boxes.
      var s = new THREE.Shape();
      s.moveTo(-0.095, 0);
      s.quadraticCurveTo(-0.14, -0.08, -0.155, -0.32); // clip point widening into the branded panel
      s.lineTo(-0.16, -1.2); // branded panel, roughly constant width
      s.quadraticCurveTo(-0.16, -1.4, -0.1, -1.55); // pinch in to the waist
      s.lineTo(-0.095, -1.85); // waist, narrowest point
      s.quadraticCurveTo(-0.21, -1.95, -0.225, -2.2); // flare out toward the foot
      s.quadraticCurveTo(-0.23, -2.34, -0.1, -2.36); // rounded bottom-left corner
      s.lineTo(0.1, -2.36); // flat foot base, touches the ground
      s.quadraticCurveTo(0.23, -2.34, 0.225, -2.2); // rounded bottom-right corner
      s.quadraticCurveTo(0.21, -1.95, 0.095, -1.85); // flare back in
      s.lineTo(0.1, -1.55); // waist, right side
      s.quadraticCurveTo(0.16, -1.4, 0.16, -1.2); // widen back out
      s.lineTo(0.155, -0.32); // branded panel, right edge
      s.quadraticCurveTo(0.14, -0.08, 0.095, 0); // narrow back to the rim clip
      s.lineTo(-0.095, 0);
      return s;
    }

    function buildLegTexture(THREE) {
      // Flat panel now (no more cylinder-wrap), so the text is drawn
      // upright, no rotate trick needed — same straight canvas-to-plane
      // mapping already used successfully for the falling letters below.
      var w = 200;
      var h = 860;
      var cnv = document.createElement('canvas');
      cnv.width = w;
      cnv.height = h;
      var ctx = cnv.getContext('2d');
      ctx.fillStyle = '#20a39e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#111';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      function fitSize(text, maxWidth) {
        var size = 160;
        while (size > 20) {
          ctx.font = '700 ' + size + 'px Archivo, sans-serif';
          if (ctx.measureText(text).width <= maxWidth) break;
          size -= 2;
        }
        return size;
      }

      var maxW = w * 0.8;
      // Real leg sleeves print the wordmark upright, on two lines. This
      // texture maps onto the whole leg's bounding box now (one continuous
      // shape, not just a "body" box segment) — the branded panel in that
      // shape sits roughly 14%-51% of the way down from the rim, so both
      // lines are placed inside that band with margin, instead of at
      // whatever fraction looked right for the old, separate body segment.
      ctx.font = '700 ' + fitSize('Arctik', maxW) + 'px Archivo, sans-serif';
      ctx.fillText('Arctik', w / 2, h * 0.24);
      ctx.font = '700 ' + fitSize('Spike', maxW) + 'px Archivo, sans-serif';
      ctx.fillText('Spike', w / 2, h * 0.4);

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
      return { items: items, total: total }; // …only the fall (y) and the settle (rotation) animate in.
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
      // Gentler dolly than before — the old target (y:3.2, z:5.6) raised the
      // camera so much relative to its distance that the net ended up
      // looking straight down into, like a hole, instead of staying
      // readable as a table seen from the side throughout the scroll.
      tl.to(camera.position, { y: 1.9, z: 7.0, duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(netGroup.rotation, { y: '+=1.6', duration: 1, ease: 'power1.inOut' }, 0);
      tl.to(netGroup.position, { z: -2.4, duration: 1, ease: 'power1.inOut' }, 0);
      if (mats.length) tl.to(mats, { opacity: 0, duration: 0.4 }, 0.5);
      if (mascotMesh) tl.to(mascotMesh.material, { opacity: 0, duration: 0.4 }, 0.5);
      if (hintEl) tl.to(hintEl, { opacity: 0, duration: 0.25 }, 0);
      // The tagline/CTA sit in their own fixed band (see styles.css), clear
      // of the 3D content at rest — fade them out early in the scroll too,
      // so they're gone well before the camera dolly and net rotation could
      // sweep anything across that same screen area.
      if (ctaEl) tl.to(ctaEl, { opacity: 0, y: 16, duration: 0.3 }, 0);
    }
  }
})();
