/* Runnable plain Python in the browser, using Pyodide (Python compiled to WebAssembly).
   PsychoPy itself cannot run in a browser, so these cells are for ordinary Python only. */
const PYODIDE_BASE = "https://cdn.jsdelivr.net/npm/pyodide@0.29.5/";

let pyPromise = null;

function status(cell, text, kind) {
  const el = cell.querySelector(".rcell-status");
  el.textContent = text;
  el.className = "rcell-status" + (kind ? " " + kind : "");
}
function escapeHTML(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

async function getPy(cell) {
  if (!pyPromise) {
    pyPromise = (async () => {
      status(cell, "Starting Python in your browser. The first time takes a few seconds…", "busy");
      const { loadPyodide } = await import(PYODIDE_BASE + "pyodide.mjs");
      return await loadPyodide({ indexURL: PYODIDE_BASE });
    })();
  }
  return pyPromise;
}

async function run(cell) {
  const btn = cell.querySelector(".rcell-run");
  const out = cell.querySelector(".rcell-text");
  const code = cell.querySelector(".rcell-code").value;
  btn.disabled = true;
  out.textContent = "";
  const lines = [];
  try {
    const py = await getPy(cell);
    status(cell, "Running…", "busy");
    py.setStdout({ batched: s => lines.push(escapeHTML(s)) });
    py.setStderr({ batched: s => lines.push('<span class="err">' + escapeHTML(s) + "</span>") });
    await py.runPythonAsync(code);
    out.innerHTML = lines.length ? lines.join("\n") : '<span class="dim"># the code ran, and printed nothing</span>';
    status(cell, "Done. Edit the code and press Run again.", "ok");
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (/import|fetch|Failed to load/i.test(msg) && !/Traceback/.test(msg)) {
      out.innerHTML = '<span class="err">' + escapeHTML(msg) + "</span>";
      status(cell, "Python could not be loaded. Check your internet connection and reload the page.", "bad");
      pyPromise = null;
    } else {
      // keep the traceback from the line that ran your code onwards, as Python would show it
      const tb = msg.split("\n");
      const start = tb.findIndex(l => l.includes('File "<exec>"'));
      const shown = (start > -1 ? ["Traceback (most recent call last):"].concat(tb.slice(start)) : tb).join("\n").trim();
      out.innerHTML = (lines.length ? lines.join("\n") + "\n" : "") + '<span class="err">' + escapeHTML(shown) + "</span>";
      status(cell, "Python reported an error. Read the last line first, fix the code and run it again.", "bad");
    }
  } finally {
    btn.disabled = false;
  }
}

document.querySelectorAll(".pycell").forEach(cell => {
  const area = cell.querySelector(".rcell-code");
  const original = area.value;
  const st = cell.querySelector(".rcell-status");
  if (!st.textContent.trim()) st.textContent = "Press Run. The first run on this page downloads Python, which takes a few seconds.";
  const fit = () => { area.rows = Math.max(3, area.value.split("\n").length); };
  fit();
  area.addEventListener("input", fit);
  area.addEventListener("keydown", e => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const s = area.selectionStart, en = area.selectionEnd;
      area.value = area.value.slice(0, s) + "    " + area.value.slice(en);
      area.selectionStart = area.selectionEnd = s + 4;
    }
    if (e.key === "Escape") area.blur();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(cell); }
  });
  cell.querySelector(".rcell-run").addEventListener("click", () => run(cell));
  cell.querySelector(".rcell-reset").addEventListener("click", () => {
    area.value = original; fit();
    cell.querySelector(".rcell-text").textContent = "";
    status(cell, "Code reset to the original.", "");
  });
});
