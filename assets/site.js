/* Coding Experiments in PsychoPy: shared behaviour */
(function () {
  "use strict";

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
    return null;
  }


  /* ---------- code blocks: highlight, then dress as a Coder editor ---------- */
  if (window.Prism) { try { window.Prism.highlightAll(); } catch (e) {} }
  document.querySelectorAll("pre.code").forEach(function (pre) {
    if (pre.closest(".editor")) return;
    var lang = pre.getAttribute("data-lang") || "";
    var file = pre.getAttribute("data-file") || (lang === "Shell" ? "Terminal" : lang === "R" ? "Console" : "");
    var code = pre.querySelector("code") || pre;
    var parts = code.innerHTML.replace(/\n$/, "").split("\n");
    var balanced = parts.every(function (p) {
      return (p.match(/<span/g) || []).length === (p.match(/<\/span>/g) || []).length;
    });
    if (balanced) {
      code.innerHTML = parts.map(function (p) { return '<span class="line">' + (p || " ") + "</span>"; }).join("");
    }
    var wrap = document.createElement("div");
    wrap.className = "editor";
    wrap.setAttribute("data-lang", lang);
    var os = pre.getAttribute("data-os");
    if (os) { wrap.setAttribute("data-os", os); pre.removeAttribute("data-os"); }
    var tab = document.createElement("div");
    tab.className = "editor-tab";
    tab.innerHTML = '<span class="file"></span><span class="lang-tag"></span>';
    tab.firstChild.textContent = file || "untitled";
    tab.lastChild.textContent = lang;
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(tab);
    wrap.appendChild(pre);
  });

  /* ---------- operating system chooser ---------- */
  function guessOS() {
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || "";
    p = p.toLowerCase();
    if (p.indexOf("win") > -1) return "windows";
    if (p.indexOf("mac") > -1 || p.indexOf("iphone") > -1 || p.indexOf("ipad") > -1) return "mac";
    if (p.indexOf("linux") > -1 || p.indexOf("x11") > -1) return "linux";
    return "windows";
  }

  function applyOS(os) {
    document.body.setAttribute("data-current-os", os);
    var mod = os === "mac" ? "Cmd" : "Ctrl";
    document.querySelectorAll(".mod").forEach(function (el) { el.textContent = mod; });
    document.querySelectorAll('.os-options input[value="' + os + '"]').forEach(function (el) { el.checked = true; });
  }

  var chooser = document.querySelector(".os-options");
  if (chooser) {
    var saved = store("cep-os");
    var os = saved || guessOS();
    applyOS(os);
    var hint = document.querySelector(".os-hint");
    if (hint && !saved) hint.textContent = "Chosen from your browser. Change it if that is wrong.";
    chooser.addEventListener("change", function (e) {
      if (e.target && e.target.name === "os") {
        applyOS(e.target.value);
        store("cep-os", e.target.value);
        if (hint) hint.textContent = "Saved for your next visit.";
      }
    });
  } else {
    var mod2 = (store("cep-os") || guessOS()) === "mac" ? "Cmd" : "Ctrl";
    document.querySelectorAll(".mod").forEach(function (el) { el.textContent = mod2; });
  }

  /* ---------- table of contents: highlight the section in view ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var targets = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      for (var i = 0; i < targets.length; i++) { if (visible[targets[i].id]) { current = targets[i].id; break; } }
      if (current) {
        tocLinks.forEach(function (a) { a.classList.remove("active"); });
        byId[current].classList.add("active");
      }
    }, { rootMargin: "0px 0px -65% 0px", threshold: 0 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- checklists remember their ticks ---------- */
  document.querySelectorAll(".checklist[data-key]").forEach(function (list) {
    var key = "cep-check-" + list.getAttribute("data-key");
    var state = {};
    try { state = JSON.parse(store(key) || "{}") || {}; } catch (e) { state = {}; }
    var boxes = list.querySelectorAll("input[type=checkbox]");
    var status = document.getElementById(list.getAttribute("data-status"));
    function report() {
      var n = 0;
      boxes.forEach(function (b) { if (b.checked) n++; });
      if (status) {
        status.textContent = n === boxes.length
          ? "All checks done. You are ready for the next module."
          : n + " of " + boxes.length + " checks done.";
      }
    }
    boxes.forEach(function (b) {
      if (state[b.id]) b.checked = true;
      b.addEventListener("change", function () {
        state[b.id] = b.checked;
        store(key, JSON.stringify(state));
        report();
      });
    });
    report();
  });

  /* ---------- home page: a five-trial reaction time demo ---------- */
  var screen = document.getElementById("pp-screen");
  if (!screen) return;

  var csvOut = document.getElementById("csv-out");
  var N_TRIALS = 5;
  var HEADER = "participant,trial,foreperiod_s,rt_s,early";
  var state = "idle";      // idle | fixation | waiting | target | feedback | done
  var trial = 0;
  var rows = [];
  var timer = null;
  var foreperiod = 0;
  var targetFrameTime = 0;

  function render(html) { screen.innerHTML = html; }

  function inView() {
    var r = screen.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
  }

  function showCSV(highlightLast) {
    var lines = [HEADER].concat(rows);
    var out = lines.map(function (l, i) {
      var safe = l.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return (highlightLast && i === lines.length - 1 && i > 0) ? '<span class="row-new">' + safe + "</span>" : safe;
    }).join("\n");
    csvOut.innerHTML = out;
  }

  function idleScreen() {
    state = "idle";
    render('<p class="pp-msg">Press the space bar, or tap here, to begin.<small>Five trials. When the circle fills white, respond as fast as you can. Esc stops at any time.</small></p>');
  }

  function startTrial() {
    trial += 1;
    foreperiod = 0.8 + Math.random() * 1.2;   // planned before the trial, so early presses are logged with it
    state = "fixation";
    render('<span class="pp-fix" aria-hidden="true">+</span>');
    timer = setTimeout(function () {
      state = "waiting";
      render('<div class="pp-target" aria-hidden="true"></div>');
      timer = setTimeout(function () {
        // fill the circle, and take the time from the frame that shows it
        var target = screen.querySelector(".pp-target");
        if (target) target.classList.add("lit");
        requestAnimationFrame(function (t) {
          targetFrameTime = t;
          state = "target";
        });
      }, foreperiod * 1000);
    }, 500);
  }

  function logTrial(rt, early) {
    rows.push(["demo", trial, foreperiod.toFixed(3), rt === null ? "" : rt.toFixed(3), early ? 1 : 0].join(","));
    showCSV(true);
  }

  function afterTrial(message) {
    state = "feedback";
    render('<p class="pp-msg">' + message + "</p>");
    timer = setTimeout(function () {
      if (trial >= N_TRIALS) finish(); else startTrial();
    }, 900);
  }

  function finish() {
    state = "done";
    render('<p class="pp-msg">Done. Your data are below, one row per trial.<small>Press space or tap to run it again.</small></p>');
  }

  function stopEarly() {
    clearTimeout(timer);
    state = "done";
    render('<p class="pp-msg">Stopped. Every trial you finished is already in the file.<small>Press space or tap to start again.</small></p>');
  }

  function respond(eventTime) {
    if (state === "idle" || state === "done") {
      trial = 0; rows = []; showCSV(false); startTrial();
    } else if (state === "fixation" || state === "waiting") {
      clearTimeout(timer);
      logTrial(null, true);
      afterTrial("Too soon. Wait for the circle to fill.");
    } else if (state === "target") {
      var rt = (eventTime - targetFrameTime) / 1000;
      logTrial(rt, false);
      afterTrial(Math.round(rt * 1000) + " ms");
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state !== "idle" && state !== "done") { stopEarly(); return; }
    if (e.code !== "Space" && e.key !== " ") return;
    var active = document.activeElement;
    var running = state !== "idle" && state !== "done";
    // take the space bar only when the window or nothing else has focus, or a run is under way
    if (!running && active !== screen && !(active === document.body && inView())) return;
    if (e.repeat) return;
    e.preventDefault();
    respond(e.timeStamp);
  });
  screen.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    screen.focus({ preventScroll: true });
    respond(e.timeStamp);
  });

  showCSV(false);
  idleScreen();
})();

/* R cells cannot run from a page opened as a local file: browsers block the module
   script and the data downloads. Say so, rather than leaving a Run button that does nothing. */
(function () {
  if (location.protocol !== "file:") return;
  document.querySelectorAll(".rcell, .pycell").forEach(function (cell) {
    var st = cell.querySelector(".rcell-status");
    var btn = cell.querySelector(".rcell-run");
    var lang = cell.classList.contains("pycell") ? "Python" : "R";
    if (st) { st.textContent = lang + " runs only on the live website, not in a page opened from your computer."; st.className = "rcell-status bad"; }
    if (btn) btn.disabled = true;
  });
})();
