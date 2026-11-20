/* Small drawings of what each module produces. Injected into any element with data-thumb. */
(function () {
  "use strict";
  var W = 'fill="#808080"';                 // PsychoPy window grey
  function win(x, y, w, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" ' + W + '/>'; }
  function gauss(cx, sd, base, height, x0, x1) {
    var d = "", n = 40;
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n;
      var y = base - height * Math.exp(-0.5 * Math.pow((x - cx) / sd, 2));
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  }

  var T = {};
  T["0"] =
    win(18, 16, 70, 46) +
    '<circle cx="53" cy="39" r="8" fill="#fff"/>' +
    '<rect x="62" y="44" width="72" height="42" rx="5" style="fill:var(--code-bg);stroke:var(--rule)"/>' +
    '<text x="70" y="61" style="fill:var(--muted);font:600 9px var(--font-code)">&gt; R 4.6</text>' +
    '<path d="M104 70 l7 7 l13 -15" fill="none" style="stroke:var(--r)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  T["1"] =
    win(15, 14, 120, 72) +
    '<text x="75" y="48" text-anchor="middle" fill="#fff" style="font:700 15px var(--font-text)">Welcome.</text>' +
    '<text x="75" y="66" text-anchor="middle" fill="#fff" style="font:9px var(--font-text);opacity:.85">Press SPACE to continue</text>';
  T["2"] =
    win(10, 22, 66, 56) +
    '<circle cx="43" cy="50" r="12" fill="#fff"/>' +
    '<path d="M82 50 h12 m-5 -5 l5 5 l-5 5" fill="none" style="stroke:var(--muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    [0, 1, 2, 3, 4].map(function (i) {
      var w = [44, 38, 41, 36, 40][i];
      return '<rect x="100" y="' + (27 + i * 10) + '" width="' + w + '" height="5" rx="2" style="fill:var(--py);opacity:' + (i === 0 ? 1 : 0.5) + '"/>';
    }).join("");
  T["3"] =
    '<line x1="22" y1="82" x2="132" y2="82" style="stroke:var(--muted)" stroke-width="1.5"/>' +
    '<line x1="22" y1="82" x2="22" y2="16" style="stroke:var(--muted)" stroke-width="1.5"/>' +
    '<polyline points="40,28 77,50 114,66" fill="none" style="stroke:var(--r)" stroke-width="3"/>' +
    [[40, 28], [77, 50], [114, 66]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" style="fill:var(--r)"/>'; }).join("");
  T["4"] =
    win(12, 12, 126, 40) +
    [0, 1, 2, 3].map(function (i) {
      return '<circle cx="' + (38 + i * 25) + '" cy="32" r="8" stroke="#fff" stroke-width="2.2" fill="' + (i === 2 ? "#fff" : "none") + '"/>';
    }).join("") +
    '<polyline points="20,64 38,72 56,78 74,82 92,84 110,70 128,86" fill="none" style="stroke:var(--r)" stroke-width="2.5"/>' +
    '<circle cx="110" cy="70" r="4" fill="#d43c3c"/>';
  T["5"] =
    '<path d="' + gauss(58, 14, 82, 56, 14, 136) + '" fill="none" style="stroke:var(--muted)" stroke-width="2.5"/>' +
    '<path d="' + gauss(92, 14, 82, 56, 14, 136) + '" fill="none" style="stroke:var(--r)" stroke-width="3"/>' +
    '<line x1="76" y1="16" x2="76" y2="86" style="stroke:var(--ink)" stroke-width="1.8" stroke-dasharray="4 3"/>' +
    '<line x1="14" y1="82" x2="136" y2="82" style="stroke:var(--muted)" stroke-width="1"/>';
  T["6"] =
    [0.78, 0.46, 0.66, 0.34, 0.58].map(function (v, i) {
      return '<rect x="36" y="' + (16 + i * 14) + '" width="' + (96 * v).toFixed(0) + '" height="9" rx="2" style="fill:var(--r);opacity:' + (0.55 + 0.09 * i) + '"/>' +
        '<text x="30" y="' + (24 + i * 14) + '" text-anchor="end" style="fill:var(--muted);font:700 9px var(--font-text)">' + "EACSI"[i] + "</text>";
    }).join("") +
    '<line x1="84" y1="12" x2="84" y2="88" style="stroke:var(--ink)" stroke-width="1" stroke-dasharray="3 3"/>';

  document.querySelectorAll("[data-thumb]").forEach(function (el) {
    var k = el.getAttribute("data-thumb");
    if (!T[k]) return;
    el.innerHTML = '<svg viewBox="0 0 150 100" role="img" aria-hidden="true" focusable="false">' + T[k] + "</svg>";
  });
})();
