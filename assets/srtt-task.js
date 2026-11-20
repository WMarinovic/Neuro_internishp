/* A browser version of srtt.py, so interns can do the task before they build it.
   Same design, same columns in the CSV. Timing is approximate in a browser. */
(function () {
  "use strict";
  var root = document.getElementById("srtt-play");
  if (!root) return;

  var SEQUENCE = [2, 3, 1, 4, 3, 2, 4, 1, 3, 4, 2, 1];
  var N_BLOCKS = 7, RANDOM_BLOCK = 6, RESP_KEYS = ["d", "f", "j", "k"];
  var RSI = 0.25, MAX_RT = 2.0;
  var COLS = ["participant", "session", "date", "block", "block_type", "trial_in_block", "trial_overall",
              "position", "correct_key", "response_key", "correct", "rt", "rsi"];

  var screen = document.getElementById("srtt-screen");
  var circles = Array.prototype.slice.call(screen.querySelectorAll(".srtt-c"));
  var msg = document.getElementById("srtt-msg");
  var status = document.getElementById("srtt-status");
  var results = document.getElementById("srtt-results");
  var startBtn = document.getElementById("srtt-start");

  var S = null;   // the running session

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = "0" + n; return n; }
  function dateStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "_" +
      pad(d.getHours()) + "h" + pad(d.getMinutes()) + "." + pad(d.getSeconds()) + "." + pad(d.getMilliseconds(), 3);
  }
  function makeBlockPositions(isRandom, reps) {
    if (!isRandom) { var out = []; for (var r = 0; r < reps; r++) out = out.concat(SEQUENCE); return out; }
    var seq = [], prev = null;
    for (var i = 0; i < SEQUENCE.length * reps; i++) {
      var c = 1 + Math.floor(Math.random() * 4);
      while (c === prev) c = 1 + Math.floor(Math.random() * 4);
      seq.push(c); prev = c;
    }
    return seq;
  }
  function showMessage(text, then) {
    circles.forEach(function (c) { c.style.visibility = "hidden"; });
    msg.innerHTML = "<div>" + text + "</div>";
    msg.hidden = false;
    S.waitingSpace = then;
  }
  function hideMessage() {
    msg.hidden = true;
    circles.forEach(function (c) { c.style.visibility = "visible"; c.classList.remove("on"); });
  }
  function setStatus() {
    status.textContent = S ? "Block " + S.block + " of " + N_BLOCKS + (S.block === RANDOM_BLOCK ? "" : "") + ", trial " + S.trialInBlock + " of " + S.positions.length : "";
  }

  function start() {
    var code = (document.getElementById("srtt-pid").value || "ME").trim().replace(/[^A-Za-z0-9_-]/g, "") || "ME";
    var reps = +document.getElementById("srtt-reps").value;
    S = { pid: code, reps: reps, date: dateStr(), rows: [], block: 0, trialOverall: 0, timers: [] };
    results.innerHTML = "";
    startBtn.disabled = true;
    screen.focus({ preventScroll: true });
    showMessage("When a circle fills white, press its key as fast as you can:<br><b>D F J K</b>, from left to right.<br><small>On a touch screen, tap the circle. Esc stops at any time.</small><br><br>Press SPACE, or tap here, to begin.", nextBlock);
  }

  function later(fn, ms) { var t = setTimeout(fn, ms); S.timers.push(t); }

  function nextBlock() {
    S.block += 1;
    if (S.block > N_BLOCKS) {
      showMessage("That is the end of the task. Thank you!<br><small>Your results are below.</small>", null);
      finish(false);
      return;
    }
    S.isRandom = S.block === RANDOM_BLOCK;
    S.positions = makeBlockPositions(S.isRandom, S.reps);
    S.trialInBlock = 0;
    hideMessage();
    later(nextTrial, 500);      // settle the display before the block
  }

  function nextTrial() {
    if (S.trialInBlock >= S.positions.length) {
      if (S.block < N_BLOCKS) showMessage("End of block " + S.block + " of " + N_BLOCKS + ".<br>Take a short break. Press SPACE, or tap, to continue.", nextBlock);
      else nextBlock();
      return;
    }
    S.trialInBlock += 1; S.trialOverall += 1;
    S.pos = S.positions[S.trialInBlock - 1];
    S.responded = false; S.t0 = null;
    setStatus();
    circles[S.pos - 1].classList.add("on");
    requestAnimationFrame(function (t) {          // time from the frame that shows the target
      S.t0 = t;
      S.deadline = setTimeout(function () { endTrial(null, null); }, MAX_RT * 1000);
    });
  }

  function endTrial(key, rt) {
    if (S.responded) return;
    S.responded = true;
    clearTimeout(S.deadline);
    var correctKey = RESP_KEYS[S.pos - 1];
    S.rows.push([S.pid, "001", S.date, S.block, S.isRandom ? "random" : "sequence", S.trialInBlock, S.trialOverall,
                 S.pos, correctKey, key === null ? "" : key, key === correctKey ? 1 : 0, rt === null ? "" : rt.toFixed(4), RSI]);
    circles[S.pos - 1].classList.remove("on");
    later(nextTrial, RSI * 1000);
  }

  function respond(key, when) {
    if (!S || S.done) return;
    if (S.t0 === null || S.responded || msg.hidden === false) return;
    endTrial(key, (when - S.t0) / 1000);
  }

  function stopEarly() {
    if (!S || S.done) return;
    S.timers.forEach(clearTimeout); clearTimeout(S.deadline);
    showMessage("Stopped. Every trial you finished has been kept.", null);
    finish(true);
  }

  function csvText() {
    return [COLS.join(",")].concat(S.rows.map(function (r) { return r.join(","); })).join("\n") + "\n";
  }
  function fileName() { return S.pid + "_SRTT_" + S.date + ".csv"; }

  function finish(early) {
    S.done = true;
    startBtn.disabled = false;
    startBtn.textContent = "Run it again";
    status.textContent = "";
    var n = S.rows.length;
    // mean correct RT per block, using the same cleaning rules as the R script
    var means = [];
    for (var b = 1; b <= N_BLOCKS; b++) {
      var v = S.rows.filter(function (r) { return r[3] === b && r[10] === 1 && r[11] !== "" && +r[11] > 0.1 && +r[11] < 2; }).map(function (r) { return +r[11]; });
      means.push(v.length ? v.reduce(function (a, x) { return a + x; }, 0) / v.length : null);
    }
    var plot = plotCurve(means);
    var costLine = "";
    if (means[4] !== null && means[5] !== null && means[6] !== null) {
      var cost = (means[5] - (means[4] + means[6]) / 2) * 1000;
      costLine = "<p>Your sequence cost: <b>" + Math.round(cost) + " ms</b>. " +
        (cost > 0 ? "The random block was slower than the sequence blocks around it, so the sequence was helping you." : "The random block was no slower than its neighbours, so this run shows little sequence-specific learning.") + "</p>";
    } else {
      costLine = "<p>The sequence cost needs correct responses (between 0.1 and 2 s) in blocks 5, 6 and 7" + (early ? ", so it is missing from a run that stopped early." : ", and this run does not have enough of them.") + "</p>";
    }
    results.innerHTML =
      "<p><b>" + n + " trials saved" + (early ? " before you stopped" : "") + ".</b> Mean correct reaction time per block, with the random block in red:</p>" +
      plot + costLine +
      '<div class="demo-controls"><button type="button" class="btn primary" id="srtt-dl">Download ' + fileName() + "</button>" +
      '<button type="button" class="btn" id="srtt-add">Add my session to the R data</button></div>' +
      '<p class="demo-note-line" id="srtt-added" aria-live="polite"></p>';
    document.getElementById("srtt-dl").addEventListener("click", function () {
      var blob = new Blob([csvText()], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    document.getElementById("srtt-add").addEventListener("click", function () {
      window.CEP_USER_FILES = window.CEP_USER_FILES || [];
      var name = fileName();
      if (!window.CEP_USER_FILES.some(function (f) { return f.name === name; })) window.CEP_USER_FILES.push({ name: name, text: csvText() });
      document.getElementById("srtt-added").textContent = "Added as data/" + name + ". Run the R cells in 4.11 to 4.13 again, from the top, and your session is analysed with the others.";
    });
  }

  function plotCurve(means) {
    var w = 420, h = 230, m = { l: 50, r: 12, t: 12, b: 38 }, pw = w - m.l - m.r, ph = h - m.t - m.b;
    var vals = means.filter(function (v) { return v !== null; });
    if (!vals.length) return "";
    var lo = Math.floor((Math.min.apply(null, vals) - 0.02) * 20) / 20, hi = Math.ceil((Math.max.apply(null, vals) + 0.02) * 20) / 20;
    function X(b) { return m.l + (b - 0.6) / 6.8 * pw; }
    function Y(v) { return m.t + ph - (v - lo) / (hi - lo) * ph; }
    var s = '<rect width="' + w + '" height="' + h + '" fill="#fff"/><rect x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="#ebebeb"/>';
    for (var v = lo; v <= hi + 1e-9; v += 0.05) {
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#fff"/>';
      s += '<text x="' + (m.l - 5) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="#4d4d4d" font-size="11">' + v.toFixed(2) + "</text>";
    }
    for (var b = 1; b <= 7; b++) {
      s += '<line y1="' + m.t + '" y2="' + (m.t + ph) + '" x1="' + X(b) + '" x2="' + X(b) + '" stroke="#fff"/>';
      s += '<text x="' + X(b) + '" y="' + (m.t + ph + 14) + '" text-anchor="middle" fill="#4d4d4d" font-size="11">' + b + "</text>";
    }
    var pts = [];
    means.forEach(function (v, i) { if (v !== null) pts.push(X(i + 1) + "," + Y(v)); });
    s += '<polyline fill="none" stroke="#000" stroke-width="1.4" points="' + pts.join(" ") + '"/>';
    means.forEach(function (v, i) { if (v !== null) s += '<circle cx="' + X(i + 1) + '" cy="' + Y(v) + '" r="' + (i + 1 === RANDOM_BLOCK ? 4.5 : 3.2) + '" fill="' + (i + 1 === RANDOM_BLOCK ? "red" : "#000") + '"/>'; });
    s += '<text x="' + (m.l + pw / 2) + '" y="' + (h - 6) + '" text-anchor="middle" fill="#1a1a1a" font-size="12">Block</text>';
    s += '<text transform="translate(13 ' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#1a1a1a" font-size="12">Mean correct RT (s)</text>';
    return '<div style="max-width:420px"><svg class="plot" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Your mean correct reaction time per block" style="font-family:Arial,Helvetica,sans-serif">' + s + "</svg></div>";
  }

  startBtn.addEventListener("click", start);
  document.addEventListener("keydown", function (e) {
    if (!S || S.done) return;
    var k = e.key.toLowerCase();
    if (k === "escape") { e.preventDefault(); stopEarly(); return; }
    if (e.repeat) return;
    if (k === " " || e.code === "Space") {
      e.preventDefault();
      if (!msg.hidden && S.waitingSpace) { var f = S.waitingSpace; S.waitingSpace = null; f(); }
      return;
    }
    if (RESP_KEYS.indexOf(k) > -1) { e.preventDefault(); respond(k, e.timeStamp); }
  });
  screen.addEventListener("pointerdown", function (e) {
    if (!S || S.done) return;
    e.preventDefault();
    if (!msg.hidden) { if (S.waitingSpace) { var f = S.waitingSpace; S.waitingSpace = null; f(); } return; }
    var c = e.target.closest(".srtt-c");
    if (c) respond(RESP_KEYS[+c.getAttribute("data-pos") - 1], e.timeStamp);
  });
})();
