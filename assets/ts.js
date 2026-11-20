/* Troubleshooting search: show only the entries that contain every word typed. */
(function () {
  "use strict";
  var input = document.getElementById("ts-q");
  if (!input) return;
  var entries = Array.prototype.slice.call(document.querySelectorAll("details.qa"));
  var groups = Array.prototype.slice.call(document.querySelectorAll(".ts-group"));
  var count = document.getElementById("ts-count");
  var none = document.getElementById("ts-none");
  function norm(s) { return s.toLowerCase().replace(/[’']/g, "'"); }
  function filter() {
    var words = norm(input.value).split(/\s+/).filter(Boolean);
    var shown = 0;
    entries.forEach(function (d) {
      var text = norm(d.textContent);
      var ok = words.every(function (w) { return text.indexOf(w) > -1; });
      d.hidden = !ok;
      if (ok) shown++;
      if (words.length && ok && shown <= 3) d.open = true;
      if (!words.length) d.open = false;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector("details.qa:not([hidden])"); });
    count.textContent = words.length ? shown + " of " + entries.length + " entries match." : entries.length + " entries. Click a question to see the answer.";
    none.hidden = shown > 0;
  }
  input.addEventListener("input", filter);
  filter();
})();
