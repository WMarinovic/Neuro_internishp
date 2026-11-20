/* Demos of how PsychoPy works under the hood: flips, clocks and the ExperimentHandler. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* =====================================================================
     Draw, then flip: the back buffer (Module 1, and the rule in 2.1)
     ===================================================================== */
  (function () {
    var root = $("demo-flip");
    if (!root) return;
    var STIM = {
      message: { label: "message", html: '<div class="fb-stim fb-msg">Welcome.<br><br>Press SPACE to continue, or ESC to quit.</div>' },
      title: { label: "title", html: '<div class="fb-stim fb-title">Hello</div>' }
    };
    var back = [], screen = [], log = [], flips = 0;
    function paint(list) { return list.map(function (k) { return STIM[k].html; }).join(""); }
    function render(note) {
      $("fb-back").innerHTML = paint(back) || '<span class="fb-empty">nothing drawn since the last flip</span>';
      $("fb-screen").innerHTML = paint(screen);
      $("fb-log").innerHTML = log.length ? log.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("") : '<span class="fb-none"># press a button to run a line</span>';
      $("fb-log").scrollTop = $("fb-log").scrollHeight;
      $("fb-note").textContent = note || "";
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (act === "reset") { back = []; screen = []; log = []; flips = 0; render("Start again: draw something, then flip."); return; }
      if (act === "flip") {
        flips++;
        log.push("win.flip()");
        var had = back.length;
        screen = back.slice();
        back = [];
        render(had
          ? "The flip showed everything drawn since the last flip, all at once, and then cleared the back buffer. To keep it on screen, draw it again before the next flip."
          : (flips > 1 ? "Nothing had been drawn since the last flip, so this flip showed an empty window. Every visible frame has to be drawn again from scratch." : "A flip with nothing drawn shows an empty window."));
        return;
      }
      log.push(act + ".draw()");
      if (back.indexOf(act) < 0) back.push(act);
      render("Drawn to the hidden back buffer. The participant still sees the old screen until you call win.flip().");
    });
    render("");
  })();

  /* =====================================================================
     When to reset the keyboard clock (Module 2, 3.3)
     ===================================================================== */
  (function () {
    var root = $("demo-clock");
    if (!root) return;
    var FRAME = 1000 / 60;
    var trials = [];
    var seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    function runTrial() {
      var order = root.querySelector('input[name="clock-order"]:checked').value;
      // the previous flip happened at t = 0; drawing the target takes a few ms
      var drawn = 1 + rand() * 4;
      var visible = FRAME;                       // the next refresh after drawing
      var trueRT = 300 + rand() * 120;           // time from target visible to key press
      var press = visible + trueRT;
      var reset = order === "before" ? drawn + 0.2 : visible + 0.3;
      var measured = press - reset;
      var t = { order: order, drawn: drawn, visible: visible, reset: reset, press: press, trueRT: trueRT, measured: measured };
      trials.push(t);
      render(t);
    }

    function render(t) {
      var w = 640, h = 150, x0 = 30, x1 = 610, tmax = 48;
      function X(ms) { return x0 + Math.min(ms, tmax) / tmax * (x1 - x0); }
      var s = '<rect x="0" y="0" width="' + w + '" height="' + h + '" style="fill:var(--surface)"/>';
      for (var f = 0; f * FRAME <= tmax; f++) {
        var x = X(f * FRAME);
        s += '<line x1="' + x + '" x2="' + x + '" y1="30" y2="100" style="stroke:var(--rule)" stroke-width="2"/>';
        s += '<text x="' + x + '" y="118" text-anchor="middle">refresh ' + f + "</text>";
      }
      s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="100" y2="100" class="axis"/>';
      s += '<text x="' + x1 + '" y="140" text-anchor="end">time (ms) after the previous flip; the key press comes about 300 to 420 ms later, off to the right</text>';
      if (t) {
        s += '<rect x="' + X(t.drawn) + '" y="56" width="' + (X(t.visible) - X(t.drawn)) + '" height="18" style="fill:var(--warn-tint);stroke:var(--warn)"/>';
        s += '<text x="' + ((X(t.drawn) + X(t.visible)) / 2) + '" y="69" text-anchor="middle" style="fill:var(--warn);font-size:11px">flip waits</text>';
        s += '<circle cx="' + X(t.visible) + '" cy="40" r="7" style="fill:var(--ink)"/>';
        s += '<text x="' + (X(t.visible) + 10) + '" y="44" style="fill:var(--ink);font-weight:700">target visible</text>';
        s += '<path d="M' + X(t.reset) + ' 84 l-6 12 h12 z" style="fill:var(--r)"/>';
        s += '<text x="' + X(t.reset) + '" y="92" text-anchor="' + (t.order === "before" ? "start" : "start") + '" dx="9" style="fill:var(--r);font-weight:700">kb.clock.reset()</text>';
      }
      $("clock-svg").innerHTML = '<svg class="plot" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Timeline of one trial">' + s + "</svg>";

      var rows = trials.slice(-6).map(function (q, i) {
        var n = trials.length - Math.min(trials.length, 6) + i + 1;
        return "<tr><td>" + n + "</td><td>" + (q.order === "before" ? "before flip" : "after flip") + "</td><td>" + q.trueRT.toFixed(1) + "</td><td>" + q.measured.toFixed(1) + '</td><td class="' + (q.measured - q.trueRT > 2 ? "bad" : "") + '">' + (q.measured - q.trueRT >= 0 ? "+" : "") + (q.measured - q.trueRT).toFixed(1) + "</td></tr>";
      }).join("");
      $("clock-table").innerHTML = trials.length
        ? '<table class="simple"><thead><tr><th>Trial</th><th>Reset</th><th>True RT (ms)</th><th>Recorded RT (ms)</th><th>Error (ms)</th></tr></thead><tbody>' + rows + "</tbody></table>"
        : "";
      if (t) {
        var err = t.measured - t.trueRT;
        $("clock-note").textContent = t.order === "before"
          ? "The clock started while the flip was still waiting for the next refresh, so this reaction time includes " + err.toFixed(1) + " ms during which the target was not yet on screen. The error is up to a whole frame, and it varies from trial to trial."
          : "The clock started just after the flip returned, as the target appeared, so the recorded time matches the participant’s reaction time to within a fraction of a millisecond.";
      }
    }
    $("clock-run").addEventListener("click", runTrial);
    $("clock-clear").addEventListener("click", function () { trials = []; render(null); $("clock-note").textContent = ""; });
    render(null);
  })();

  /* =====================================================================
     The ExperimentHandler writes the file at close() (Module 2, 3.5)
     ===================================================================== */
  (function () {
    var root = $("demo-handler");
    if (!root) return;
    var INFO = { participant: "P01", session: "001", date: "2026-11-20_14h05.32.118" };
    var FILE = "data/P01_demo_" + INFO.date + ".csv";
    var prog = [];
    prog.push({ code: "thisExp = data.ExperimentHandler(name='demo', extraInfo=info, dataFileName=filename)", kind: "open" });
    for (var n = 1; n <= 5; n++) {
      var rt = (0.5 + n * 0.01).toFixed(2);
      prog.push({ code: "thisExp.addData('trial', " + n + ")", kind: "add", key: "trial", val: n, loop: n });
      prog.push({ code: "thisExp.addData('rt', " + rt + ")", kind: "add", key: "rt", val: rt, loop: n });
      prog.push({ code: "thisExp.nextEntry()", kind: "next", loop: n });
    }
    prog.push({ code: "thisExp.close()", kind: "close" });

    var pc, rows, cur, written, crashed;
    function reset() { pc = 0; rows = []; cur = {}; written = false; crashed = false; }
    function stepOnce() {
      if (pc >= prog.length || crashed) return;
      var p = prog[pc++];
      if (p.kind === "add") cur[p.key] = p.val;
      if (p.kind === "next") { rows.push(cur); cur = {}; }
      if (p.kind === "close") written = true;
    }
    function rowCells(r) { return [r.trial, r.rt, INFO.participant, INFO.session, INFO.date]; }
    function render() {
      var listing = prog.map(function (p, i) {
        var cls = "l";
        if (i === pc - 1) cls += " on"; else if (i < pc - 1) cls += " done";
        var pre = p.loop ? "    " : "";
        var comment = p.kind === "next" ? "   # trial " + p.loop + " row closed" : "";
        return '<span class="' + cls + '">' + esc(pre + p.code + comment) + "</span>";
      });
      $("hd-code").innerHTML = '<span class="l c"># the for loop, written out pass by pass so you can step through it</span>' + listing.join("");
      var head = "<tr><th>trial</th><th>rt</th><th>participant</th><th>session</th><th>date</th></tr>";
      var body = rows.map(function (r) { return "<tr><td>" + rowCells(r).join("</td><td>") + "</td></tr>"; }).join("");
      if (Object.keys(cur).length) {
        body += '<tr class="building"><td>' + (cur.trial || "") + "</td><td>" + (cur.rt || "") + "</td><td>" + INFO.participant + "</td><td>" + INFO.session + "</td><td>" + INFO.date + "</td></tr>";
      }
      $("hd-mem").innerHTML = pc === 0 ? '<p class="hd-empty">The handler has not been created yet.</p>' :
        '<table class="simple"><thead>' + head + "</thead><tbody>" + (body || '<tr><td colspan="5" class="hd-empty">no rows yet</td></tr>') + "</tbody></table>";
      var disk;
      if (written) {
        var csv = ["trial,rt,participant,session,date"].concat(rows.map(function (r) { return rowCells(r).join(","); })).join("\n");
        disk = '<p class="hd-file">' + esc(FILE) + '</p><pre class="hd-csv">' + esc(csv) + "</pre>";
      } else if (crashed) {
        disk = '<p class="hd-lost">The script stopped before <code>thisExp.close()</code>. No file was written, and the ' + rows.length + " trial" + (rows.length === 1 ? "" : "s") + " in memory are gone.</p>";
      } else {
        disk = '<p class="hd-empty">Empty. Nothing is written until <code>thisExp.close()</code> runs.</p>';
      }
      $("hd-disk").innerHTML = disk;
      $("hd-step").disabled = $("hd-all").disabled = $("hd-crash").disabled = pc >= prog.length || crashed;
      var note = "";
      if (crashed) note = "This is why every exit, including the Escape key, should go through a quit_cleanly() that calls thisExp.close() first.";
      else if (written) note = "close() wrote the whole file in one go. participant, session and date appear on every row although you added them only once, through extraInfo. PsychoPy also adds a few housekeeping columns of its own, which you can ignore for now.";
      else if (pc > 0 && prog[pc - 1].kind === "next") note = "nextEntry() closed the row. It now sits in memory, not on disk.";
      else if (pc > 0 && prog[pc - 1].kind === "add") note = "addData() fills one column of the current row.";
      $("hd-note").textContent = note;
    }
    $("hd-step").addEventListener("click", function () { stepOnce(); render(); });
    $("hd-all").addEventListener("click", function () { while (pc < prog.length) stepOnce(); render(); });
    $("hd-crash").addEventListener("click", function () { crashed = true; render(); });
    $("hd-reset").addEventListener("click", function () { reset(); render(); });
    reset(); render();
  })();
})();
