/* global localStorage, window, document */
// Applies the saved dashboard theme before first paint (no flash). Default: follow the computer.
(function () {
  try {
    var pref = localStorage.getItem("wp-theme") || "system";
    var dark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    /* storage blocked: stay light */
  }
})();
