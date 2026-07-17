(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = ["light", "super", "dark"];

  /* ------------------------------------------------------------------ */
  /* Theme qubit: |0> = light, |1> = dark, |+> = gray superposition      */
  /* ------------------------------------------------------------------ */

  var btnZero = document.getElementById("qt-zero");
  var btnPlus = document.getElementById("qt-plus");
  var btnOne = document.getElementById("qt-one");
  var btnMeasure = document.getElementById("qt-measure");
  var measuring = false;
  var fieldCollapse = null; // set by the quantum field module below

  function currentTheme() {
    var t = root.getAttribute("data-theme");
    return THEMES.indexOf(t) >= 0 ? t : "super";
  }

  function applyTheme(t, persist) {
    root.setAttribute("data-theme", t);
    if (persist) {
      try { localStorage.setItem("qubit-theme", t); } catch (e) {}
    }
    updateButtons();
  }

  function updateButtons() {
    if (!btnZero) return;
    var t = currentTheme();
    btnZero.classList.toggle("active", t === "light");
    btnPlus.classList.toggle("active", t === "super");
    btnOne.classList.toggle("active", t === "dark");
    btnMeasure.classList.toggle("armed", t === "super");
    btnMeasure.setAttribute("aria-disabled", t === "super" ? "false" : "true");
  }

  function measure() {
    if (measuring) return;

    if (currentTheme() !== "super") {
      // Classical state: measuring |0> or |1> returns the same state.
      btnMeasure.classList.remove("q-shake");
      void btnMeasure.offsetWidth; /* restart the animation */
      btnMeasure.classList.add("q-shake");
      return;
    }

    measuring = true;
    var outcome = Math.random() < 0.5 ? "light" : "dark";
    var other = outcome === "light" ? "dark" : "light";
    // Damped oscillation between the two basis states before settling.
    var steps = [
      { theme: other, delay: 0 },
      { theme: outcome, delay: 300 },
      { theme: other, delay: 600 },
      { theme: outcome, delay: 900 }
    ];
    steps.forEach(function (step, i) {
      setTimeout(function () {
        var last = i === steps.length - 1;
        applyTheme(step.theme, last);
        if (last) {
          measuring = false;
          if (fieldCollapse) fieldCollapse(outcome === "light" ? 0 : 1);
        }
      }, step.delay);
    });
  }

  if (btnZero) {
    btnZero.addEventListener("click", function () { if (!measuring) applyTheme("light", true); });
    btnPlus.addEventListener("click", function () { if (!measuring) applyTheme("super", true); });
    btnOne.addEventListener("click", function () { if (!measuring) applyTheme("dark", true); });
    btnMeasure.addEventListener("click", measure);
    updateButtons();
  }

  /* ------------------------------------------------------------------ */
  /* Quantum field: drifting atoms behind the page. Unobserved atoms     */
  /* move as fuzzy electron clouds (momentum known, position not).       */
  /* The cursor is a detector: observed atoms freeze and collapse into   */
  /* the classic Bohr picture — nucleus, orbit rings, circling           */
  /* electrons — then leave in a new random direction, since             */
  /* observation scrambled their momentum. In the |+> theme half the     */
  /* atoms are light and half dark until you measure.                    */
  /* ------------------------------------------------------------------ */

  (function () {
    if (!window.requestAnimationFrame || !document.body) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var canvas = document.createElement("canvas");
    canvas.id = "q-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    // dots: [rgb, maxAlpha] per basis state
    var COLORS = {
      light: { dots: [["23,58,112", 0.46], ["23,58,112", 0.46]] },
      dark:  { dots: [["150,190,240", 0.38], ["150,190,240", 0.38]] },
      super: { dots: [["250,250,255", 0.72], ["20,22,28", 0.48]] }
    };
    var DETECT = 80;
    var DETECT2 = DETECT * DETECT;

    // Pre-rendered fuzzy "probability cloud" sprites, one per dot color.
    var sprites = {};
    function cloudSprite(rgb) {
      var s = sprites[rgb];
      if (!s) {
        s = document.createElement("canvas");
        s.width = 64;
        s.height = 64;
        var g = s.getContext("2d");
        // A bright nucleus core glowing through a soft electron cloud.
        var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(" + rgb + ",1)");
        grad.addColorStop(0.14, "rgba(" + rgb + ",0.9)");
        grad.addColorStop(0.3, "rgba(" + rgb + ",0.35)");
        grad.addColorStop(0.65, "rgba(" + rgb + ",0.15)");
        grad.addColorStop(1, "rgba(" + rgb + ",0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        sprites[rgb] = s;
      }
      return s;
    }

    // The cursor acts as a detector: nearby wavefunctions collapse.
    var mx = -1e4;
    var my = -1e4;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });
    document.addEventListener("mouseleave", function () { mx = -1e4; my = -1e4; });
    window.addEventListener("touchmove", function (e) {
      if (e.touches.length) { mx = e.touches[0].clientX; my = e.touches[0].clientY; }
    }, { passive: true });
    window.addEventListener("touchend", function () { mx = -1e4; my = -1e4; });

    var parts = [];
    var W = 0;
    var H = 0;

    function spawn() {
      var tilt = Math.random() * Math.PI;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
        r: 3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        basis: Math.random() < 0.5 ? 0 : 1,
        c: 0,       // coherence: 0 = delocalized wave, 1 = collapsed particle
        obs: false,  // whether the cursor-detector is currently observing it
        flash: 0,   // brief glow after a measurement collapse
        tilt: tilt,        // orbit ring orientations (Bohr picture)
        tilt2: tilt + 1.15,
        e1: Math.random() * 6.2832, // electron phases and angular speeds
        e2: Math.random() * 6.2832,
        w1: 1.6 + Math.random() * 1.2,
        w2: -(1.3 + Math.random() * 1.0)
      };
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.min(35, Math.max(12, Math.round(W * H / 52000)));
      while (parts.length < target) parts.push(spawn());
      parts.length = target;
    }

    function drawElectron(p, rgb, A, B, tilt, ang, er, vis) {
      var ex = Math.cos(ang) * A;
      var ey = Math.sin(ang) * B;
      var ct = Math.cos(tilt);
      var st = Math.sin(tilt);
      ctx.fillStyle = "rgba(" + rgb + "," + Math.min(1, vis * 1.2).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x + ex * ct - ey * st, p.y + ex * st + ey * ct, er, 0, 6.2832);
      ctx.fill();
    }

    var last = 0;
    function tick(now) {
      if (!last) last = now;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      var theme = currentTheme();
      var pal = COLORS[theme] || COLORS.super;
      ctx.clearRect(0, 0, W, H);

      var i, p;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        // Heisenberg: coherence gates motion. A collapsed particle has a
        // definite position, so it freezes; a delocalized cloud drifts.
        p.x += p.vx * dt * (1 - p.c);
        p.y += p.vy * dt * (1 - p.c);
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;

        // Observation collapses the wavefunction fast; it delocalizes slowly.
        var ddx = p.x - mx;
        var ddy = p.y - my;
        var observed = ddx * ddx + ddy * ddy < DETECT2;
        if (p.obs && !observed) {
          // Observation scrambled its momentum: it departs on a new course.
          p.vx = (Math.random() - 0.5) * 14;
          p.vy = (Math.random() - 0.5) * 14;
        }
        p.obs = observed;
        var rate = observed ? 8 : 0.35;
        p.c += ((observed ? 1 : 0) - p.c) * Math.min(1, rate * dt);
        p.flash = Math.max(0, p.flash - 2.5 * dt * p.flash);

        // In superposition the ensemble slowly re-mixes (thermal flips).
        if (theme === "super" && Math.random() < 0.08 * dt) p.basis = 1 - p.basis;
      }

      var tsec = now / 1000;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        var dot = pal.dots[p.basis];
        var breathe = 0.65 + 0.35 * Math.sin(tsec * 0.8 + p.phase);
        var alpha = dot[1] * breathe * (1 + 1.5 * p.flash);

        // Wave part: a fuzzy electron cloud around a glowing nucleus core.
        var wave = alpha * (1 - p.c);
        if (wave > 0.01) {
          var cr = p.r * (2.2 + 0.5 * Math.sin(tsec * 0.6 + p.phase));
          ctx.globalAlpha = Math.min(1, wave);
          ctx.drawImage(cloudSprite(dot[0]), p.x - cr, p.y - cr, cr * 2, cr * 2);
          ctx.globalAlpha = 1;
        }

        // Collapsed part: the classic Bohr atom — nucleus, two tilted orbit
        // rings, and circling electrons — fading in with coherence.
        if (p.c > 0.02) {
          var vis = Math.min(1, alpha * 2 * p.c);
          var A = p.r * 2.3;   // orbit semi-major axis
          var B = A * 0.38;    // flattened for a 3D look

          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(" + dot[0] + "," + (vis * 0.55).toFixed(3) + ")";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, A, B, p.tilt, 0, 6.2832);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, A, B, p.tilt2, 0, 6.2832);
          ctx.stroke();

          ctx.fillStyle = "rgba(" + dot[0] + "," + vis.toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.55, 0, 6.2832);
          ctx.fill();

          // The electrons keep orbiting even while the atom is frozen:
          // its position is pinned, their momentum is anyone's guess.
          var er = Math.max(1.2, p.r * 0.3);
          drawElectron(p, dot[0], A, B, p.tilt, p.e1 + tsec * p.w1, er, vis);
          drawElectron(p, dot[0], A, B, p.tilt2, p.e2 + tsec * p.w2, er, vis);
        }
      }

      window.requestAnimationFrame(tick);
    }

    // Measuring the theme qubit collapses the whole field to the outcome
    // basis: everything freezes sharp for a moment, then delocalizes and
    // drifts off with fresh (scrambled) momenta.
    fieldCollapse = function (basis) {
      for (var k = 0; k < parts.length; k++) {
        var q = parts[k];
        q.basis = basis;
        q.c = 1;
        q.flash = 1;
        q.vx = (Math.random() - 0.5) * 14;
        q.vy = (Math.random() - 0.5) * 14;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.requestAnimationFrame(tick);
  })();
})();
