/* R analysis demos: each one mirrors a script from the modules, step by step. */
(function () {
  "use strict";

  /* ---------- small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function sig(x, d) { if (x === null || x === undefined || isNaN(x)) return "NA"; return String(Number(x.toPrecision(d || 3))); }
  function mean(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); var n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function rnorm(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function pnorm(x) {
    // Abramowitz and Stegun 7.1.26
    var t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  function qnorm(p) {
    // Acklam's rational approximation
    var a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    var b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    var c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    var q, r, pl = 0.02425;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /* A tibble printed the way R prints it in the Console */
  function tibble(opt) {
    var h = '<div class="meta">' + esc(opt.title) + (opt.groups ? "\n" + esc(opt.groups) : "") + "</div><table><thead><tr><th></th>";
    opt.cols.forEach(function (c) { h += "<th>" + esc(c[0]) + "</th>"; });
    if (opt.why) h += "<th></th>";
    h += '</tr><tr class="types"><th></th>';
    opt.cols.forEach(function (c) { h += "<th>&lt;" + c[1] + "&gt;</th>"; });
    if (opt.why) h += "<th></th>";
    h += "</tr></thead><tbody>";
    var shown = 0;
    opt.rows.forEach(function (row, i) {
      var cls = opt.rowClass ? opt.rowClass(row, i) : "";
      var isDrop = cls.indexOf("drop") > -1;
      if (!isDrop) shown++;
      h += '<tr class="' + cls + '"><td class="idx">' + (isDrop ? "" : shown) + "</td>";
      row.forEach(function (v) {
        h += v === null ? '<td class="na">NA</td>' : "<td>" + esc(v) + "</td>";
      });
      if (opt.why) h += '<td class="why">' + esc(opt.why(row, i) || "") + "</td>";
      h += "</tr>";
    });
    return h + "</tbody></table>";
  }

  function listing(lines, onTags, doneTags) {
    return lines.map(function (l) {
      var cls = "l";
      if (l.tag && onTags.indexOf(l.tag) > -1) cls += " on";
      else if (l.tag && doneTags.indexOf(l.tag) > -1) cls += " done";
      var t = esc(l.text).replace(/(#.*)$/, '<span class="c">$1</span>');
      return '<span class="' + cls + '">' + (t || " ") + "</span>";
    }).join("");
  }

  function stepperHTML(labels, at) {
    return labels.map(function (lab, i) {
      return '<button type="button" data-step="' + i + '"' + (i === at ? ' aria-current="step"' : "") + ">" + (i + 1) + ". " + esc(lab) + "</button>";
    }).join("");
  }

  /* ggplot2's default look (theme_grey), so the plots match what RStudio shows */
  var GG = { panel: "#ebebeb", grid: "#ffffff", ink: "#4d4d4d", title: "#1a1a1a" };
  function ggFrame(o) {
    // o: w, h, x0, x1, y0, y1, xticks, yticks, xlab, ylab, title, fmtY
    var m = { l: 56, r: 14, t: o.title ? 30 : 12, b: 44 };
    var pw = o.w - m.l - m.r, ph = o.h - m.t - m.b;
    function X(v) { return m.l + (v - o.x0) / (o.x1 - o.x0) * pw; }
    function Y(v) { return m.t + ph - (v - o.y0) / (o.y1 - o.y0) * ph; }
    var s = '<rect x="0" y="0" width="' + o.w + '" height="' + o.h + '" fill="#ffffff"/>';
    s += '<rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="' + GG.panel + '"/>';
    o.yticks.forEach(function (v) {
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + GG.grid + '" stroke-width="1.1"/>';
      s += '<text x="' + (m.l - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="' + GG.ink + '" font-size="11">' + (o.fmtY ? o.fmtY(v) : v) + "</text>";
    });
    o.xticks.forEach(function (v) {
      s += '<line y1="' + m.t + '" y2="' + (m.t + ph) + '" x1="' + X(v) + '" x2="' + X(v) + '" stroke="' + GG.grid + '" stroke-width="1.1"/>';
      s += '<text x="' + X(v) + '" y="' + (m.t + ph + 15) + '" text-anchor="middle" fill="' + GG.ink + '" font-size="11">' + (o.fmtX ? o.fmtX(v) : v) + "</text>";
    });
    s += '<text x="' + (m.l + pw / 2) + '" y="' + (o.h - 8) + '" text-anchor="middle" fill="' + GG.title + '" font-size="12">' + esc(o.xlab) + "</text>";
    s += '<text transform="translate(14 ' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="' + GG.title + '" font-size="12">' + esc(o.ylab) + "</text>";
    if (o.title) s += '<text x="' + m.l + '" y="18" fill="' + GG.title + '" font-size="13">' + esc(o.title) + "</text>";
    return { svg: s, X: X, Y: Y, m: m, pw: pw, ph: ph };
  }
  function svgWrap(w, h, inner, label) {
    return '<svg class="plot" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + esc(label) + '" style="font-family:Arial,Helvetica,sans-serif">' + inner + "</svg>";
  }

  /* =====================================================================
     Demo 1: the pipe, one step at a time (Module 3, first_script.R)
     ===================================================================== */
  (function () {
    var root = $("demo-pipe");
    if (!root) return;
    var RT = [0.62, 0.58, 0.60, 0.55, 0.50, 0.48, 0.52, 0.49, 0.44, 0.46, 0.43, 0.45];
    var trials = RT.map(function (rt, i) { return { block: Math.floor(i / 4) + 1, rt: rt }; });
    var at = 0;

    function opts() {
      return { fn: root.querySelector('input[name="pipe-fn"]:checked').value, filter: $("pipe-filter").checked };
    }
    function steps(o) {
      var s = [{ key: "data", label: "tibble()" }];
      if (o.filter) s.push({ key: "filter", label: "filter()" });
      s.push({ key: "group", label: "group_by()" }, { key: "sum", label: "summarise()" }, { key: "plot", label: "ggplot()" });
      return s;
    }
    function codeLines(o) {
      var L = [
        { text: "# 1. A tiny dataset (twelve pretend trials, three blocks of four)" },
        { text: "trials <- tibble(", tag: "data" },
        { text: "  block = rep(1:3, each = 4),", tag: "data" },
        { text: "  rt    = c(0.62, 0.58, 0.60, 0.55,", tag: "data" },
        { text: "            0.50, 0.48, 0.52, 0.49,", tag: "data" },
        { text: "            0.44, 0.46, 0.43, 0.45)", tag: "data" },
        { text: ")", tag: "data" },
        { text: "" },
        { text: "# 2. Transform: one " + o.fn + " per block" },
        { text: "by_block <- trials |>", tag: "pipe" }
      ];
      if (o.filter) L.push({ text: "  filter(rt < 0.55) |>", tag: "filter" });
      L.push(
        { text: "  group_by(block) |>", tag: "group" },
        { text: "  summarise(mean_rt = " + o.fn + "(rt))", tag: "sum" },
        { text: "" },
        { text: "# 4. Look at the shape" },
        { text: "ggplot(by_block, aes(block, mean_rt)) +", tag: "plot" },
        { text: "  geom_line() +", tag: "plot" },
        { text: "  geom_point(size = 2)", tag: "plot" }
      );
      return L;
    }
    function kept(o) { return trials.filter(function (t) { return !o.filter || t.rt < 0.55; }); }
    function summary(o) {
      var k = kept(o), out = [];
      [1, 2, 3].forEach(function (b) {
        var v = k.filter(function (t) { return t.block === b; }).map(function (t) { return t.rt; });
        if (v.length) out.push({ block: b, mean_rt: o.fn === "mean" ? mean(v) : median(v) });
      });
      return out;
    }

    function render() {
      var o = opts(), S = steps(o);
      if (at >= S.length) at = S.length - 1;
      var step = S[at];
      var onTags = [step.key];
      if (step.key !== "data" && step.key !== "plot") onTags.push("pipe");
      var done = S.slice(0, at).map(function (x) { return x.key; });
      $("pipe-steps").innerHTML = stepperHTML(S.map(function (x) { return x.label; }), at);
      $("pipe-code").innerHTML = listing(codeLines(o), onTags, done.concat(at > 0 && step.key === "plot" ? ["pipe"] : []));
      $("pipe-prev").disabled = at === 0;
      $("pipe-next").disabled = at === S.length - 1;

      var out = "", ex = "";
      if (step.key === "data") {
        out = tibble({ title: "# A tibble: 12 × 2", cols: [["block", "int"], ["rt", "dbl"]],
          rows: trials.map(function (t) { return [t.block, sig(t.rt)]; }) });
        ex = "<p><code>tibble()</code> builds a table: one row per trial, one column per variable. This is the same shape as the CSV files your PsychoPy scripts will write.</p>";
      } else if (step.key === "filter") {
        out = tibble({ title: "# A tibble: " + kept(o).length + " × 2", cols: [["block", "int"], ["rt", "dbl"]],
          rows: trials.map(function (t) { return [t.block, sig(t.rt)]; }),
          rowClass: function (r, i) { return trials[i].rt < 0.55 ? "" : "drop"; },
          why: function (r, i) { return trials[i].rt < 0.55 ? "" : "rt is not below 0.55"; } });
        ex = "<p><code>filter()</code> keeps the rows where the condition is true and drops the rest. Every trial in block 1 is 0.55 or slower, so block 1 disappears entirely, and it will be missing from the summary and the plot too.</p>";
      } else if (step.key === "group") {
        var k = kept(o);
        var nb = summary(o).length;
        out = tibble({ title: "# A tibble: " + k.length + " × 2", groups: "# Groups:   block [" + nb + "]", cols: [["block", "int"], ["rt", "dbl"]],
          rows: k.map(function (t) { return [t.block, sig(t.rt)]; }),
          rowClass: function (r) { return "g" + r[0]; } });
        ex = "<p><code>group_by(block)</code> changes nothing you can see in the numbers. It labels each row with its group, shown here by colour, and R notes the grouping under the title. The next step works within each group separately.</p>";
      } else if (step.key === "sum") {
        var sm = summary(o);
        out = tibble({ title: "# A tibble: " + sm.length + " × 2", cols: [["block", "int"], ["mean_rt", "dbl"]],
          rows: sm.map(function (r) { return [r.block, sig(r.mean_rt)]; }),
          rowClass: function (r) { return "fresh g" + r[0]; } });
        ex = "<p><code>summarise()</code> collapses each group to a single row. The result has one row per block, not one row per trial" +
          (o.fn === "median" ? ". With four trials per block the median and the mean barely differ here." : ". The column is still called <code>mean_rt</code> because that is the name we gave it.") +
          " Notice that the grouping line has gone: summarise removed it as it collapsed the data.</p>";
      } else {
        var sm2 = summary(o);
        var f = ggFrame({ w: 420, h: 290, x0: 0.9, x1: 3.1, y0: 0.42, y1: 0.62, xticks: [1, 1.5, 2, 2.5, 3], fmtX: function (v) { return v; },
          yticks: [0.45, 0.50, 0.55, 0.60], fmtY: function (v) { return v.toFixed(2); }, xlab: "block", ylab: "mean_rt" });
        var inner = f.svg;
        if (sm2.length > 1) {
          inner += '<polyline fill="none" stroke="#000" stroke-width="1.2" points="' + sm2.map(function (r) { return f.X(r.block) + "," + f.Y(r.mean_rt); }).join(" ") + '"/>';
        }
        sm2.forEach(function (r) { inner += '<circle cx="' + f.X(r.block) + '" cy="' + f.Y(r.mean_rt) + '" r="3.6" fill="#000"/>'; });
        out = svgWrap(420, 290, inner, "Line plot of " + o.fn + " reaction time by block");
        ex = "<p><code>aes(block, mean_rt)</code> maps the columns to the axes. Each <code>geom_</code> layer then draws something: <code>geom_line()</code> joins the points and <code>geom_point()</code> marks each block." +
          (o.filter ? " Block 1 is missing because the filter removed every one of its trials." : "") + "</p>";
      }
      $("pipe-out").innerHTML = step.key === "plot" ? out : '<div class="console">' + out + "</div>";
      $("pipe-explain").innerHTML = ex;
    }

    root.addEventListener("change", function (e) { if (e.target.closest(".demo-controls")) render(); });
    $("pipe-prev").addEventListener("click", function () { at = Math.max(0, at - 1); render(); });
    $("pipe-next").addEventListener("click", function () { at += 1; render(); });
    $("pipe-steps").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { at = +b.getAttribute("data-step"); render(); } });
    render();
  })();

  /* =====================================================================
     Demo 2: stacking participant files and cleaning trials (Module 4, 9.1)
     ===================================================================== */
  (function () {
    var root = $("demo-stack");
    if (!root) return;
    var FILES = [
      { name: "data/P01_SRTT_2026-03-02_0915.csv", p: "P01", rows: [[1, 1, 0.512], [2, 1, 0.468], [3, 0, 0.390], [4, 1, 0.455]] },
      { name: "data/P02_SRTT_2026-03-02_1040.csv", p: "P02", rows: [[1, 1, 0.601], [2, 0, null], [3, 1, 0.087], [4, 1, 0.553]] },
      { name: "data/P03_SRTT_2026-03-03_1400.csv", p: "P03", rows: [[1, 1, 0.498], [2, 1, 2.310], [3, 1, 0.472], [4, 1, 0.441]] }
    ];
    var LINES = [
      { text: 'files <- list.files("data", pattern = "_SRTT_.*\\\\.csv$",', tag: "list" },
      { text: "                    full.names = TRUE)", tag: "list" },
      { text: "" },
      { text: "dat <- files |>", tag: "pipe" },
      { text: "  set_names() |>", tag: "read" },
      { text: "  map(read_csv, show_col_types = FALSE) |>", tag: "read" },
      { text: '  list_rbind(names_to = "file")', tag: "bind" },
      { text: "" },
      { text: "clean <- dat |>", tag: "filter" },
      { text: "  filter(correct == 1, !is.na(rt), rt > 0.10, rt < 2.0)", tag: "filter" }
    ];
    var S = [{ key: "list", label: "list.files()" }, { key: "read", label: "map(read_csv)" }, { key: "bind", label: "list_rbind()" }, { key: "filter", label: "filter()" }];
    var at = 0;
    var all = [];
    FILES.forEach(function (f) { f.rows.forEach(function (r) { all.push({ file: f.name, p: f.p, trial: r[0], correct: r[1], rt: r[2] }); }); });
    function why(t) {
      if (t.correct !== 1) return t.rt === null ? "error: no response" : "error trial";
      if (t.rt === null) return "missing rt";
      if (t.rt <= 0.10) return "too fast (≤ 0.10 s)";
      if (t.rt >= 2.0) return "too slow (≥ 2.0 s)";
      return "";
    }
    function short(n) { return n.replace("data/", "").replace(/_SRTT_.*/, "_SRTT_…"); }

    function render() {
      var step = S[at];
      $("stack-steps").innerHTML = stepperHTML(S.map(function (x) { return x.label; }), at);
      var on = [step.key]; if (step.key === "read" || step.key === "bind") on.push("pipe");
      $("stack-code").innerHTML = listing(LINES, on, S.slice(0, at).map(function (x) { return x.key; }).concat(at > 1 ? ["pipe"] : []));
      $("stack-prev").disabled = at === 0; $("stack-next").disabled = at === S.length - 1;
      var out = "", ex = "";
      if (step.key === "list") {
        out = '<div class="console"><div class="meta">&gt; files</div>' + FILES.map(function (f, i) { return "[" + (i + 1) + '] "' + esc(f.name) + '"'; }).join("<br>") + "</div>";
        ex = "<p><code>list.files()</code> returns the names of every file in <code>data/</code> whose name matches the pattern. It reads nothing yet. Because each filename carries the participant code and a timestamp, no two sessions ever overwrite each other.</p>";
      } else if (step.key === "read") {
        out = '<div class="files-row">' + FILES.map(function (f) {
          return '<div class="console"><div class="meta">$`' + esc(short(f.name)) + "`</div>" +
            tibble({ title: "# A tibble: 4 × 4", cols: [["participant", "chr"], ["trial", "dbl"], ["correct", "dbl"], ["rt", "dbl"]],
              rows: f.rows.map(function (r) { return [f.p, r[0], r[1], r[2] === null ? null : sig(r[2])]; }) }).replace('<div class="meta"># A tibble: 4 × 4</div>', "") + "</div>";
        }).join("") + "</div>";
        ex = "<p><code>map(read_csv)</code> runs <code>read_csv()</code> once per file and hands back a list of tables, one per participant. <code>set_names()</code> first names each list element after its file, which the next step uses. Missing reaction times arrive as <code>NA</code>, not zero.</p>";
      } else if (step.key === "bind") {
        out = '<div class="console">' + tibble({ title: "# A tibble: 12 × 5", cols: [["file", "chr"], ["participant", "chr"], ["trial", "dbl"], ["correct", "dbl"], ["rt", "dbl"]],
          rows: all.map(function (t) { return [short(t.file), t.p, t.trial, t.correct, t.rt === null ? null : sig(t.rt)]; }),
          rowClass: function (r, i) { return "fresh g" + (FILES.map(function (f) { return f.p; }).indexOf(all[i].p) + 1); } }) + "</div>";
        ex = "<p><code>list_rbind()</code> stacks the tables on top of each other into one long table, still one row per trial. <code>names_to = \"file\"</code> keeps the list names as a new column, so every row remembers which file it came from.</p>";
      } else {
        var keptN = all.filter(function (t) { return !why(t); }).length;
        out = '<div class="console">' + tibble({ title: "# A tibble: " + keptN + " × 5", cols: [["file", "chr"], ["participant", "chr"], ["trial", "dbl"], ["correct", "dbl"], ["rt", "dbl"]],
          rows: all.map(function (t) { return [short(t.file), t.p, t.trial, t.correct, t.rt === null ? null : sig(t.rt)]; }),
          rowClass: function (r, i) { return why(all[i]) ? "drop" : ""; },
          why: function (r, i) { return why(all[i]); } }) + "</div>";
        ex = "<p><code>filter()</code> keeps a row only if every condition is true. Error trials go, so does the missed response with no rt, the 87 ms anticipation and the 2.3 s lapse. " + keptN + " of 12 trials remain. Keeping error trials in a reaction-time mean is one of the commonest ways to blur a real effect.</p>";
      }
      $("stack-out").innerHTML = out;
      $("stack-explain").innerHTML = ex;
    }
    $("stack-prev").addEventListener("click", function () { at = Math.max(0, at - 1); render(); });
    $("stack-next").addEventListener("click", function () { at = Math.min(S.length - 1, at + 1); render(); });
    $("stack-steps").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { at = +b.getAttribute("data-step"); render(); } });
    render();
  })();

  /* =====================================================================
     Demo 3: the learning curve and the sequence cost (Module 4, 9.2 and 9.3)
     ===================================================================== */
  (function () {
    var root = $("demo-srt");
    if (!root) return;
    var NP = 8, NB = 7, PROBE = 6;
    var r = rng(20261120);
    var people = [];
    for (var i = 0; i < NP; i++) {
      var noise = [];
      for (var b = 0; b < NB; b++) noise.push(rnorm(r) * 0.012);
      people.push({ id: "P0" + (i + 1), base: 0.50 + rnorm(r) * 0.04, z: rnorm(r), noise: noise });
    }
    function simulate(learnMs, spreadMs) {
      return people.map(function (p) {
        var S = Math.max(0, learnMs + p.z * spreadMs) / 1000;
        var rts = [];
        for (var b = 1; b <= NB; b++) {
          var practice = 0.035 * (1 - Math.exp(-(b - 1) / 3));
          var seq = S * (1 - Math.exp(-(b - 1) / 2.2));
          rts.push(p.base - practice - (b === PROBE ? 0 : seq) + p.noise[b - 1]);
        }
        var cost = rts[PROBE - 1] - (rts[PROBE - 2] + rts[PROBE]) / 2;
        return { id: p.id, rts: rts, cost: cost, random: rts[PROBE - 1], sequence: (rts[PROBE - 2] + rts[PROBE]) / 2 };
      });
    }
    function render() {
      var L = +$("srt-learn").value, Sd = +$("srt-spread").value;
      $("srt-learn-out").textContent = L + " ms";
      $("srt-spread-out").textContent = Sd + " ms";
      var d = simulate(L, Sd);
      var all = []; d.forEach(function (p) { all = all.concat(p.rts); });
      var lo = Math.floor((Math.min.apply(null, all) - 0.01) * 20) / 20, hi = Math.ceil((Math.max.apply(null, all) + 0.01) * 20) / 20;
      var yt = []; for (var v = lo; v <= hi + 1e-9; v += 0.05) yt.push(+v.toFixed(2));
      var f = ggFrame({ w: 460, h: 310, x0: 0.6, x1: 7.4, y0: lo, y1: hi, xticks: [1, 2, 3, 4, 5, 6, 7], yticks: yt, fmtY: function (v) { return v.toFixed(2); },
        xlab: "Block", ylab: "Mean correct RT (s)", title: "Serial RT: learning across blocks" });
      var s = f.svg;
      d.forEach(function (p) {
        s += '<polyline fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="1" points="' + p.rts.map(function (y, k) { return f.X(k + 1) + "," + f.Y(y); }).join(" ") + '"/>';
      });
      var m = []; for (var k = 0; k < NB; k++) m.push(mean(d.map(function (p) { return p.rts[k]; })));
      s += '<polyline fill="none" stroke="#000" stroke-width="2.6" points="' + m.map(function (y, k) { return f.X(k + 1) + "," + f.Y(y); }).join(" ") + '"/>';
      d.forEach(function (p) { s += '<circle cx="' + f.X(PROBE) + '" cy="' + f.Y(p.random) + '" r="3.4" fill="red"/>'; });
      $("srt-plot").innerHTML = svgWrap(460, 310, s, "Learning curves for eight simulated participants, with the random block in red");

      // cost dot plot
      var cs = d.map(function (p) { return p.cost * 1000; });
      var cmin = Math.min(-20, Math.floor(Math.min.apply(null, cs) / 20) * 20), cmax = Math.max(40, Math.ceil(Math.max.apply(null, cs) / 20) * 20);
      var xt = []; for (var t = cmin; t <= cmax; t += (cmax - cmin > 160 ? 40 : 20)) xt.push(t);
      var g = ggFrame({ w: 460, h: 150, x0: cmin, x1: cmax, y0: 0, y1: 1, xticks: xt, yticks: [], xlab: "sequence_cost (ms): random minus neighbouring sequence blocks", ylab: "" });
      var s2 = g.svg + '<line x1="' + g.X(0) + '" x2="' + g.X(0) + '" y1="' + g.m.t + '" y2="' + (g.m.t + g.ph) + '" stroke="#555" stroke-dasharray="4 3"/>';
      cs.forEach(function (c, i) { s2 += '<circle cx="' + g.X(c) + '" cy="' + g.Y(0.2 + 0.6 * ((i * 0.37) % 1)) + '" r="4.2" fill="steelblue" fill-opacity="0.85"/>'; });
      $("srt-cost").innerHTML = svgWrap(460, 150, s2, "Dot plot of each participant's sequence cost");

      $("srt-table").innerHTML = '<div class="console">' + tibble({ title: "# A tibble: 8 × 4", cols: [["participant", "chr"], ["random", "dbl"], ["sequence", "dbl"], ["sequence_cost", "dbl"]],
        rows: d.map(function (p) { return [p.id, sig(p.random), sig(p.sequence), sig(p.cost)]; }) }) + "</div>";
      var pos = cs.filter(function (c) { return c > 0; }).length;
      $("srt-explain").innerHTML = "<p>" + (L === 0
        ? "With no sequence learning, the red points sit on the trend: the random block is no slower than its neighbours, and the costs scatter around zero. Everyone is still getting faster with practice, which is why the curve falls anyway."
        : "The red points sit above the trend because the random block takes away what people had learnt about the sequence. " + pos + " of 8 participants have a positive cost.") +
        " General practice speeds every block, sequence or random alike, so the cost compares the random block with its own neighbours rather than with block 1.</p>";
    }
    root.addEventListener("input", function (e) { if (e.target.type === "range") render(); });
    render();
  })();

  /* =====================================================================
     Demo 4: signal detection from rates to d-prime and criterion (Module 5)
     ===================================================================== */
  (function () {
    var root = $("demo-sdt");
    if (!root) return;
    var N_OLD = 24, N_NEW = 24;
    function render() {
      var d = +$("sdt-d").value, c = +$("sdt-c").value;
      $("sdt-d-out").textContent = d.toFixed(2);
      $("sdt-c-out").textContent = (c > 0 ? "+" : "") + c.toFixed(2);
      var H = 1 - pnorm(c - d / 2), F = 1 - pnorm(c + d / 2);

      // distributions
      var w = 460, h = 270, m = { l: 20, r: 20, t: 46, b: 34 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
      function X(v) { return m.l + (v + 4.2) / 8.4 * pw; }
      function Y(v) { return m.t + ph - v / 0.42 * ph; }
      function dens(x, mu) { return Math.exp(-0.5 * (x - mu) * (x - mu)) / Math.sqrt(2 * Math.PI); }
      function curve(mu, from, to, close) {
        var p = "", n = 80;
        for (var i = 0; i <= n; i++) { var x = from + (to - from) * i / n; p += (i ? "L" : "M") + X(x).toFixed(1) + " " + Y(dens(x, mu)).toFixed(1); }
        if (close) p += "L" + X(to).toFixed(1) + " " + Y(0) + "L" + X(from).toFixed(1) + " " + Y(0) + "Z";
        return p;
      }
      var s = '<rect x="0" y="0" width="' + w + '" height="' + h + '" style="fill:var(--surface)"/>';
      s += '<path d="' + curve(d / 2, c, 4.2, true) + '" style="fill:var(--r);opacity:.3"/>';
      s += '<path d="' + curve(-d / 2, c, 4.2, true) + '" style="fill:var(--warn);opacity:.55"/>';
      s += '<path d="' + curve(-d / 2, -4.2, 4.2) + '" fill="none" style="stroke:var(--muted)" stroke-width="2.2"/>';
      s += '<path d="' + curve(d / 2, -4.2, 4.2) + '" fill="none" style="stroke:var(--r)" stroke-width="2.6"/>';
      s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" class="axis"/>';
      s += '<line x1="' + X(c) + '" x2="' + X(c) + '" y1="22" y2="' + Y(0) + '" style="stroke:var(--ink)" stroke-width="2" stroke-dasharray="5 4"/>';
      s += '<text x="' + (X(c) + 6) + '" y="18" style="fill:var(--ink)">say “old” →</text>';
      s += '<text x="' + (X(c) - 6) + '" y="18" text-anchor="end" style="fill:var(--ink)">← say “new”</text>';
      s += '<text x="' + X(-d / 2 - 1.25) + '" y="' + Y(0.27) + '" text-anchor="end">new items</text>';
      s += '<text x="' + X(d / 2 + 1.25) + '" y="' + Y(0.27) + '" text-anchor="start" style="fill:var(--r);font-weight:700">old items</text>';
      s += '<text x="' + (w / 2) + '" y="' + (h - 8) + '" text-anchor="middle">memory strength (in standard deviations)</text>';
      $("sdt-dist").innerHTML = '<svg class="plot" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Two normal distributions for new and old items, with the criterion line">' + s + "</svg>";

      // hit rate against false-alarm rate, as in 13.3
      var g = ggFrame({ w: 300, h: 300, x0: 0, x1: 1, y0: 0, y1: 1, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.25, 0.5, 0.75, 1], xlab: "False-alarm rate", ylab: "Hit rate" });
      var s2 = g.svg + '<line x1="' + g.X(0) + '" y1="' + g.Y(0) + '" x2="' + g.X(1) + '" y2="' + g.Y(1) + '" stroke="#999" stroke-dasharray="5 4"/>';
      var iso = ""; for (var i = 1; i < 100; i++) { var fa = i / 100, hr = pnorm(qnorm(fa) + d); iso += (i > 1 ? "L" : "M") + g.X(fa).toFixed(1) + " " + g.Y(hr).toFixed(1); }
      s2 += '<path d="' + iso + '" fill="none" stroke="steelblue" stroke-opacity="0.45" stroke-width="1.5"/>';
      s2 += '<circle cx="' + g.X(F) + '" cy="' + g.Y(H) + '" r="5.5" fill="steelblue"/>';
      $("sdt-roc").innerHTML = svgWrap(300, 300, s2, "Hit rate against false-alarm rate");

      // what the R script would compute from counts
      var hits = Math.round(H * N_OLD), fas = Math.round(F * N_NEW);
      var hr2 = (hits + 0.5) / (N_OLD + 1), fr2 = (fas + 0.5) / (N_NEW + 1);
      var d2 = qnorm(hr2) - qnorm(fr2), c2 = -0.5 * (qnorm(hr2) + qnorm(fr2));
      $("sdt-read").innerHTML =
        "<div>Hit rate<b>" + H.toFixed(2) + "</b></div><div>False-alarm rate<b>" + F.toFixed(2) + "</b></div>" +
        "<div>Hits, of 24 old<b>" + hits + "</b></div><div>False alarms, of 24 new<b>" + fas + "</b></div>";
      $("sdt-code").innerHTML = listing([
        { text: "hit_rate  = (" + hits + " + 0.5) / (24 + 1)   # " + hr2.toFixed(3), tag: "x" },
        { text: "fa_rate   = (" + fas + " + 0.5) / (24 + 1)   # " + fr2.toFixed(3), tag: "x" },
        { text: "d_prime   = qnorm(hit_rate) - qnorm(fa_rate)   # " + d2.toFixed(2), tag: "y" },
        { text: "criterion = -0.5 * (qnorm(hit_rate) + qnorm(fa_rate))   # " + c2.toFixed(2), tag: "y" }
      ], ["y"], ["x"]);
      var style = c > 0.15 ? "a cautious respondent, who says “new” when unsure" : c < -0.15 ? "a liberal respondent, who says “old” when unsure" : "a respondent with no strong lean either way";
      $("sdt-explain").innerHTML = "<p>The green area under the old-item curve is the hit rate: old items strong enough to pass the criterion. The orange area under the new-item curve is the false-alarm rate: new items that pass it anyway. Moving the criterion changes both rates together but leaves d′ where it is. This is " + style + ".</p>" +
        "<p>The R script never sees these curves, only counts. Rounding to whole counts out of 24, plus the loglinear correction that keeps rates away from 0 and 1, is why its d′ (" + d2.toFixed(2) + ") differs a little from the " + d.toFixed(2) + " set by the slider. Try pushing the criterion to an extreme: without the correction, a hit rate of 1 would make d′ infinite.</p>";
    }
    root.addEventListener("input", function (e) { if (e.target.type === "range") render(); });
    render();
  })();

  /* =====================================================================
     Demo 5: reverse scoring a subscale (Module 6)
     ===================================================================== */
  (function () {
    var root = $("demo-rev");
    if (!root) return;
    var KEYS = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    var LABELS = ["1 Very inaccurate", "2 Moderately inaccurate", "3 Neither", "4 Moderately accurate", "5 Very accurate"];
    var PRESETS = {
      outgoing: [5, 1, 4, 2, 5, 1, 4, 2, 4, 2],
      quiet: [2, 4, 1, 5, 2, 4, 1, 4, 2, 5],
      agree: [5, 4, 5, 5, 4, 5, 5, 4, 5, 5]
    };
    var resp = PRESETS.outgoing.slice();
    // the ten IPIP-50 Extraversion items, in questionnaire order (public domain, ipip.ori.org)
    var NUMS = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46];
    var TEXTS = ["Am the life of the party.", "Don't talk a lot.", "Feel comfortable around people.", "Keep in the background.",
      "Start conversations.", "Have little to say.", "Talk to a lot of different people at parties.",
      "Don't like to draw attention to myself.", "Don't mind being the centre of attention.", "Am quiet around strangers."];
    var grid = $("rev-items");
    grid.innerHTML = KEYS.map(function (k, i) {
      return '<div class="item"><span class="k ' + (k > 0 ? "pos" : "neg") + '">Item ' + NUMS[i] + " (" + (k > 0 ? "+" : "−") + "keyed)</span>" +
        '<span class="t">' + esc(TEXTS[i]) + "</span>" +
        '<select id="rev-i' + i + '" aria-label="Response to item ' + NUMS[i] + '">' +
        LABELS.map(function (l, v) { return '<option value="' + (v + 1) + '">' + l + "</option>"; }).join("") +
        '</select><span class="sc" id="rev-s' + i + '"></span></div>';
    }).join("");

    function render() {
      var rev = $("rev-apply").checked;
      var total = 0;
      KEYS.forEach(function (k, i) {
        $("rev-i" + i).value = String(resp[i]);
        var scored = rev && k < 0 ? 6 - resp[i] : resp[i];
        total += scored;
        $("rev-s" + i).innerHTML = "scored = <b>" + scored + "</b>" + (rev && k < 0 ? " (6 − " + resp[i] + ")" : "");
      });
      // bar on the 10 to 50 range
      var w = 460, h = 86, x0 = 40, x1 = 440;
      function X(v) { return x0 + (v - 10) / 40 * (x1 - x0); }
      var s = '<rect x="0" y="0" width="' + w + '" height="' + h + '" style="fill:var(--surface)"/>';
      s += '<rect x="' + x0 + '" y="20" width="' + (x1 - x0) + '" height="22" rx="3" style="fill:var(--code-bg);stroke:var(--rule)"/>';
      s += '<rect x="' + x0 + '" y="20" width="' + (X(total) - x0) + '" height="22" rx="3" style="fill:' + (rev ? "var(--r)" : "var(--warn)") + '"/>';
      s += '<line x1="' + X(30) + '" x2="' + X(30) + '" y1="14" y2="48" style="stroke:var(--ink)" stroke-dasharray="3 3"/>';
      [10, 20, 30, 40, 50].forEach(function (v) { s += '<text x="' + X(v) + '" y="64" text-anchor="middle">' + v + "</text>"; });
      s += '<text x="' + X(30) + '" y="80" text-anchor="middle">midpoint</text>';
      s += '<text x="' + Math.min(X(total) + 6, x1 - 4) + '" y="13" text-anchor="' + (X(total) > x1 - 40 ? "end" : "start") + '" style="fill:var(--ink);font-weight:700">' + total + "</text>";
      $("rev-bar").innerHTML = '<svg class="plot" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Subscale score ' + total + ' on a scale from 10 to 50">' + s + "</svg>";
      $("rev-code").innerHTML = listing([
        { text: "SCALE_MAX <- 5", tag: "a" },
        { text: "scored <- resp |>", tag: "a" },
        { text: '  left_join(items, by = "item_no") |>', tag: "a" },
        { text: rev ? "  mutate(scored = if_else(reverse == 1, (SCALE_MAX + 1) - response, response))" : "  mutate(scored = response)   # reverse flag ignored", tag: "b" }
      ], ["b"], ["a"]);
      var which = resp.join() === PRESETS.agree.join() ? "agree" : resp.join() === PRESETS.quiet.join() ? "quiet" : resp.join() === PRESETS.outgoing.join() ? "outgoing" : "";
      var msg;
      if (!rev) msg = "Without reversing, agreeing with a +keyed item and disagreeing with a −keyed one pull the sum in opposite directions, so a clearly outgoing or clearly quiet respondent lands near the midpoint and looks average. No error message warns you.";
      else if (which === "agree") msg = "This respondent agrees with almost everything. Once the −keyed items are reversed, that yes-saying cancels itself out and the score sits near the midpoint, which is one reason questionnaires mix their keying.";
      else msg = "With reversal on, a high score means the same thing for every item, so the ten scored values add up to a sensible subscale score between 10 and 50.";
      $("rev-explain").innerHTML = "<p>" + msg + "</p>";
    }
    grid.addEventListener("change", function (e) {
      var m = e.target.id.match(/^rev-i(\d+)$/); if (m) { resp[+m[1]] = +e.target.value; render(); }
    });
    $("rev-apply").addEventListener("change", render);
    root.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () { resp = PRESETS[b.getAttribute("data-preset")].slice(); render(); });
    });
    render();
  })();
  /* =====================================================================
     Demo 6: the ASRS shaded-box rule (Module 6), item numbers only
     ===================================================================== */
  (function () {
    var root = $("demo-asrs");
    if (!root) return;
    var LAB = ["Never", "Rarely", "Sometimes", "Often", "Very Often"];
    var SHADED_FROM = [2, 2, 2, 3, 3, 3];
    var resp = [2, 1, 3, 2, 3, 1];
    function render() {
      var h = '<table class="asrs-grid"><thead><tr><th scope="col">Item</th>' + LAB.map(function (l, v) { return '<th scope="col">' + l + "<span>" + v + "</span></th>"; }).join("") +
        '<th scope="col">shaded_from</th><th scope="col">shaded</th></tr></thead><tbody>';
      var count = 0, total = 0;
      resp.forEach(function (r, i) {
        var sh = r >= SHADED_FROM[i];
        if (sh) count++;
        total += r;
        h += "<tr><th scope=\"row\">" + (i + 1) + "</th>" + LAB.map(function (l, v) {
          var cls = (v >= SHADED_FROM[i] ? "zone" : "") + (v === r ? " pick" : "");
          return '<td class="' + cls + '"><button type="button" data-i="' + i + '" data-v="' + v + '" aria-pressed="' + (v === r) + '" aria-label="Item ' + (i + 1) + ": " + l + '"></button></td>';
        }).join("") + "<td>" + SHADED_FROM[i] + '</td><td class="' + (sh ? "yes" : "") + '">' + (sh ? "TRUE" : "FALSE") + "</td></tr>";
      });
      h += "</tbody></table>";
      $("asrs-grid").innerHTML = h;
      $("asrs-read").innerHTML = "<div>shaded_count<b>" + count + " of 6</b></div><div>point_total<b>" + total + " of 24</b></div>" +
        "<div>screen_positive<b>" + (count >= 4 ? "TRUE" : "FALSE") + "</b></div><div>point_positive<b>" + (total >= 14 ? "TRUE" : "FALSE") + "</b></div>";
      $("asrs-note").textContent = count >= 4 && total < 14
        ? "The two rules disagree here: four answers reach their shaded zone, but the point total is under 14."
        : count < 4 && total >= 14
          ? "The two rules disagree here: the point total reaches 14, but fewer than four answers are in their shaded zone."
          : "Click any answer. The shaded zone starts at Sometimes for items 1 to 3 and at Often for items 4 to 6, so the same answer can count for one item and not another.";
    }
    $("asrs-grid").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (!b) return;
      resp[+b.getAttribute("data-i")] = +b.getAttribute("data-v");
      render();
      var again = $("asrs-grid").querySelector('button[data-i="' + b.getAttribute("data-i") + '"][data-v="' + b.getAttribute("data-v") + '"]');
      if (again) again.focus();
    });
    render();
  })();
})();
