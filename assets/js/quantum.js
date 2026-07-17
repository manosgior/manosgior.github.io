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
        if (last) measuring = false;
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
  /* Name superposition: (|Emmanouil> + |Manos>)/sqrt(2), always         */
  /* collapses to |Manos> on observation.                                */
  /* ------------------------------------------------------------------ */

  var nameLink = document.getElementById("q-name-link");
  var hint = document.getElementById("q-hint");
  var collapsing = false;

  function nameDone() {
    return root.classList.contains("q-name-done");
  }

  function collapseName() {
    if (nameDone() || collapsing) return;
    collapsing = true;
    nameLink.classList.add("q-collapsing");

    setTimeout(function () {
      if (hint) {
        hint.classList.add("q-hint-live");
        hint.innerHTML = "measured: |Manos⟩ &middot; p = 1.00";
      }
      root.classList.add("q-name-done");
      nameLink.classList.remove("q-collapsing");
      nameLink.classList.add("q-flash");
      try { sessionStorage.setItem("q-name-collapsed", "1"); } catch (e) {}
      collapsing = false;

      if (hint) {
        setTimeout(function () { hint.classList.add("q-hint-fade"); }, 2600);
        setTimeout(function () { hint.hidden = true; }, 3400);
      }
    }, 650);
  }

  if (nameLink) {
    if (nameDone() && hint) hint.hidden = true;

    nameLink.addEventListener("mouseenter", collapseName);
    nameLink.addEventListener("focus", collapseName);
    nameLink.addEventListener("click", function (e) {
      // On touch devices the first tap measures; the next one navigates.
      if (!nameDone()) {
        e.preventDefault();
        collapseName();
      }
    });
  }
})();
