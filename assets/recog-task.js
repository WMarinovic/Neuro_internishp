/* A browser version of recog_memory.py: study a list, then judge old or new.
   Same design and the same CSV columns. Timing is approximate in a browser. */
(function () {
  "use strict";
  var root = document.getElementById("recog-play");
  if (!root) return;

  var POOL = ("anchor apple basket blanket bottle bridge bucket butter candle carpet castle chair cherry clock cloud " +
    "coffee collar copper cotton desert diamond dragon engine feather finger forest garden ginger guitar hammer " +
    "harbour helmet island jacket kettle ladder lemon magnet meadow mirror needle orange paddle pencil pepper " +
    "pillow planet pocket rabbit river saddle silver spider stable summer table ticket").split(" ");
  var STUDY_DUR = 1.5, STUDY_ISI = 0.6, ITI = 0.5, KEY_OLD = "o", KEY_NEW = "n";
  var COLS = ["participant", "session", "date", "trial", "word", "status", "response", "correct", "rt"];

  var screen = document.getElementById("recog-screen");
  var wordEl = document.getElementById("recog-word");
  var promptEl = document.getElementById("recog-prompt");
  var msg = document.getElementById("recog-msg");
  var status = document.getElementById("recog-status");
  var results = document.getElementById("recog-results");
  var startBtn = document.getElementById("recog-start");
  var answerBtns = root.querySelector(".recog-answers");
  var S = null;

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = "0" + n; return n; }
  function dateStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "_" + pad(d.getHours()) + "h" +
      pad(d.getMinutes()) + "." + pad(d.getSeconds()) + "." + pad(d.getMilliseconds(), 3);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function later(fn, ms) { var t = setTimeout(fn, ms); S.timers.push(t); }
  function show(word, withPrompt) { msg.hidden = true; wordEl.textContent = word || ""; promptEl.hidden = !withPrompt; }
  function message(html, then) { wordEl.textContent = ""; promptEl.hidden = true; msg.innerHTML = "<div>" + html + "</div>"; msg.hidden = false; S.onSpace = then; }

  // the inverse normal, for d-prime and criterion (Acklam's approximation)
  function qnorm(p) {
    var a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    var b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    var c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    var d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    var q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function start() {
    var code = (document.getElementById("recog-pid").value || "ME").trim().replace(/[^A-Za-z0-9_-]/g, "") || "ME";
    var n = +document.getElementById("recog-size").value;
    var pool = shuffle(POOL.slice());
    var targets = pool.slice(0, n), lures = pool.slice(n, 2 * n);
    S = { pid: code, date: dateStr(), timers: [], rows: [], study: shuffle(targets.slice()),
          test: shuffle(targets.map(function (w) { return { word: w, status: "old" }; })
                 .concat(lures.map(function (w) { return { word: w, status: "new" }; }))), i: 0 };
    results.innerHTML = ""; startBtn.disabled = true;
    screen.focus({ preventScroll: true });
    message("You will see " + n + " words, one at a time. Try to remember them.<br><br>Press SPACE, or tap here, to begin.", studyNext);
  }

  function studyNext() {
    if (S.i >= S.study.length) {
      S.i = 0;
      message("Now you will see more words. Some you studied, some are new.<br><br>Press <b>O</b> if you saw the word before, <b>N</b> if it is new.<br><small>On a touch screen, use the buttons under the window.</small><br><br>Press SPACE, or tap here, to begin.", testNext);
      return;
    }
    status.textContent = "Study: word " + (S.i + 1) + " of " + S.study.length;
    show(S.study[S.i], false);
    later(function () { show("", false); S.i++; later(studyNext, STUDY_ISI * 1000); }, STUDY_DUR * 1000);
  }

  function testNext() {
    if (S.i >= S.test.length) { message("That is the end of the task. Thank you!<br><small>Your results are below.</small>", null); finish(false); return; }
    var e = S.test[S.i];
    status.textContent = "Test: word " + (S.i + 1) + " of " + S.test.length;
    show(e.word, true);
    answerBtns.hidden = false;
    S.t0 = null; S.answered = false;
    requestAnimationFrame(function (t) { S.t0 = t; });   // time the decision from word onset
  }

  function answer(resp, when) {
    if (!S || S.done || S.t0 === null || S.answered || !msg.hidden || promptEl.hidden) return;
    S.answered = true;
    var e = S.test[S.i];
    S.rows.push([S.pid, "001", S.date, S.i + 1, e.word, e.status, resp, resp === e.status ? 1 : 0, ((when - S.t0) / 1000).toFixed(4)]);
    S.i++;
    show("", false);
    later(testNext, ITI * 1000);
  }

  function stopEarly() {
    if (!S || S.done) return;
    S.timers.forEach(clearTimeout);
    message("Stopped. Every test trial you finished has been kept.", null);
    finish(true);
  }

  function csvText() { return [COLS.join(",")].concat(S.rows.map(function (r) { return r.join(","); })).join("\n") + "\n"; }
  function fileName() { return S.pid + "_RECOG_" + S.date + ".csv"; }

  function finish(early) {
    S.done = true; startBtn.disabled = false; startBtn.textContent = "Run it again"; status.textContent = "";
    answerBtns.hidden = true;
    var nOld = 0, nNew = 0, hits = 0, fa = 0;
    S.rows.forEach(function (r) {
      if (r[5] === "old") { nOld++; if (r[6] === "old") hits++; } else { nNew++; if (r[6] === "old") fa++; }
    });
    var html = "<p><b>" + S.rows.length + " test trials saved" + (early ? " before you stopped" : "") + ".</b></p>";
    if (nOld && nNew) {
      var hr = (hits + 0.5) / (nOld + 1), fr = (fa + 0.5) / (nNew + 1);
      var d = qnorm(hr) - qnorm(fr), c = -0.5 * (qnorm(hr) + qnorm(fr));
      html += '<div class="tablewrap"><table class="simple"><thead><tr><th></th><th>Said “old”</th><th>Said “new”</th></tr></thead><tbody>' +
        "<tr><th>Old word</th><td>" + hits + " hits</td><td>" + (nOld - hits) + " misses</td></tr>" +
        "<tr><th>New word</th><td>" + fa + " false alarms</td><td>" + (nNew - fa) + " correct rejections</td></tr></tbody></table></div>" +
        '<div class="readout"><div>Hit rate<b>' + hr.toFixed(3) + "</b></div><div>False-alarm rate<b>" + fr.toFixed(3) + "</b></div>" +
        "<div>d′<b>" + d.toFixed(2) + "</b></div><div>Criterion<b>" + (c > 0 ? "+" : "") + c.toFixed(2) + "</b></div></div>" +
        "<p>These use the same loglinear correction as the R script. " +
        (c > 0.15 ? "A positive criterion means you were cautious, saying “new” when unsure." : c < -0.15 ? "A negative criterion means you were liberal, saying “old” when unsure." : "Your criterion is close to zero, so you leaned neither way.") +
        (hits === nOld && fa === nNew
          ? " You said “old” to every word: every old word counts as a hit and every new word as a false alarm, so the two rates are equal and d′ is zero. That is pure bias, with no sign of memory.</p>"
          : " Run it again and answer “old” to every word: every old word becomes a hit, but every new word becomes a false alarm, and d′ falls to zero.</p>");
    } else {
      html += "<p>d′ needs at least one old and one new test word.</p>";
    }
    html += '<div class="demo-controls"><button type="button" class="btn primary" id="recog-dl">Download ' + fileName() + "</button>" +
      '<button type="button" class="btn" id="recog-add">Add my session to the R data</button></div><p class="demo-note-line" id="recog-added" aria-live="polite"></p>';
    results.innerHTML = html;
    document.getElementById("recog-dl").addEventListener("click", function () {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csvText()], { type: "text/csv" })); a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
    document.getElementById("recog-add").addEventListener("click", function () {
      window.CEP_USER_FILES = window.CEP_USER_FILES || [];
      var name = fileName();
      if (!window.CEP_USER_FILES.some(function (f) { return f.name === name; })) window.CEP_USER_FILES.push({ name: name, text: csvText() });
      document.getElementById("recog-added").textContent = "Added as data/" + name + ". Run the R cells in 5.8 to 5.10 again, from the top, and your session is analysed with the others.";
    });
  }

  startBtn.addEventListener("click", start);
  document.addEventListener("keydown", function (e) {
    if (!S || S.done) return;
    var k = e.key.toLowerCase();
    if (k === "escape") { e.preventDefault(); stopEarly(); return; }
    if (e.repeat) return;
    if (k === " " || e.code === "Space") {
      e.preventDefault();
      if (!msg.hidden && S.onSpace) { var f = S.onSpace; S.onSpace = null; f(); }
      return;
    }
    if (k === KEY_OLD) { e.preventDefault(); answer("old", e.timeStamp); }
    if (k === KEY_NEW) { e.preventDefault(); answer("new", e.timeStamp); }
  });
  screen.addEventListener("pointerdown", function (e) {
    if (!S || S.done || msg.hidden || !S.onSpace) return;
    e.preventDefault(); var f = S.onSpace; S.onSpace = null; f();
  });
  answerBtns.addEventListener("pointerdown", function (e) {
    var b = e.target.closest("button[data-resp]");
    if (!b) return;
    e.preventDefault(); answer(b.getAttribute("data-resp"), e.timeStamp);
  });
  answerBtns.addEventListener("click", function (e) {      // keyboard activation of the buttons
    var b = e.target.closest("button[data-resp]");
    if (b && e.detail === 0) answer(b.getAttribute("data-resp"), e.timeStamp);
  });
})();
