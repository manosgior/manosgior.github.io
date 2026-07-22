(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = ["light", "dark"];

  var btnLight = document.getElementById("qt-light");
  var btnDark = document.getElementById("qt-dark");

  function currentTheme() {
    var t = root.getAttribute("data-theme");
    return THEMES.indexOf(t) >= 0 ? t : "light";
  }

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("site-theme", t); } catch (e) {}
    updateButtons();
  }

  function updateButtons() {
    if (!btnLight) return;
    var t = currentTheme();
    btnLight.classList.toggle("active", t === "light");
    btnDark.classList.toggle("active", t === "dark");
  }

  if (btnLight) {
    btnLight.addEventListener("click", function () { applyTheme("light"); });
    btnDark.addEventListener("click", function () { applyTheme("dark"); });
    updateButtons();
  }
})();
