/* Runnable R in the browser, using webR (R compiled to WebAssembly).
   R and the packages are downloaded the first time someone presses Run. */
const WEBR_URL = "https://webr.r-wasm.org/v0.6.0/webr.mjs";

let webRPromise = null;
const installed = new Set();

function setStatus(cell, text, kind) {
  const el = cell.querySelector(".rcell-status");
  el.textContent = text;
  el.className = "rcell-status" + (kind ? " " + kind : "");
}

async function getWebR(cell) {
  if (!webRPromise) {
    webRPromise = (async () => {
      setStatus(cell, "Starting R in your browser. The first time takes a little while…", "busy");
      const { WebR } = await import(WEBR_URL);
      const webR = new WebR();
      await webR.init();
      return webR;
    })();
  }
  return webRPromise;
}

async function ensurePackages(webR, cell) {
  const wanted = (cell.getAttribute("data-packages") || "").split(",").map(s => s.trim()).filter(Boolean);
  const missing = wanted.filter(p => !installed.has(p));
  if (!missing.length) return;
  setStatus(cell, "Downloading " + missing.join(" and ") + " (first run only)…", "busy");
  await webR.installPackages(missing, { quiet: true });
  missing.forEach(p => installed.add(p));
}

const loadedSets = new Set();
const writtenUser = new Set();

/* Copy example data (listed in an index.json) and any session the visitor played
   into R's own file system, under data/, so read_csv("data/...") works. */
async function ensureData(webR, cell) {
  const src = cell.getAttribute("data-files");
  try { await webR.FS.mkdir("/home/web_user/data"); } catch (_) {}
  if (src && !loadedSets.has(src)) {
    setStatus(cell, "Copying the example data files into R…", "busy");
    const base = src.replace(/[^/]*$/, "");
    const listing = await fetch(src);
    if (!listing.ok) throw new Error("the example data list " + src + " is missing (" + listing.status + ")");
    const names = await listing.json();
    for (const n of names) {
      // a plain name goes into data/; {src, dest} goes to dest, beside data/ (an items file, say)
      const src = typeof n === "string" ? n : n.src;
      const dest = typeof n === "string" ? "/home/web_user/data/" + n : "/home/web_user/" + n.dest;
      const res = await fetch(base + src);
      if (!res.ok) throw new Error("could not download " + src + " (" + res.status + ")");
      await webR.FS.writeFile(dest, new Uint8Array(await res.arrayBuffer()));
    }
    loadedSets.add(src);
  }
  const extra = window.CEP_USER_FILES || [];
  for (const f of extra) {
    if (writtenUser.has(f.name)) continue;
    await webR.FS.writeFile("/home/web_user/data/" + f.name, new TextEncoder().encode(f.text));
    writtenUser.add(f.name);
  }
}

const ranOK = new Set();

/* A cell can name earlier cells it depends on (data-needs="id1 id2").
   Any that have not run yet are run first, quietly. */
async function runNeeds(webR, cell) {
  const needs = (cell.getAttribute("data-needs") || "").split(/\s+/).filter(Boolean);
  for (const id of needs) {
    const dep = document.getElementById(id);
    if (!dep || ranOK.has(id)) continue;
    await runNeeds(webR, dep);
    await ensurePackages(webR, dep);
    setStatus(cell, "First running the earlier cell it depends on…", "busy");
    await webR.evalRVoid(dep.querySelector(".rcell-code").value);
    ranOK.add(id);
  }
}

async function run(cell) {
  const btn = cell.querySelector(".rcell-run");
  const text = cell.querySelector(".rcell-text");
  const plots = cell.querySelector(".rcell-plots");
  const code = cell.querySelector(".rcell-code").value;
  btn.disabled = true;
  text.textContent = "";
  plots.innerHTML = "";
  let shelter = null;
  try {
    const webR = await getWebR(cell);
    await ensurePackages(webR, cell);
    await ensureData(webR, cell);
    // cells in different groups reuse the same object names (resp, items, scored),
    // so running one group means the other group's cells must run again before reuse
    const g = cell.getAttribute("data-group");
    if (g) Array.from(ranOK).forEach(id => {
      const other = document.getElementById(id);
      if (other && other.getAttribute("data-group") !== g) ranOK.delete(id);
    });
    await runNeeds(webR, cell);
    setStatus(cell, "Running…", "busy");
    shelter = await new webR.Shelter();
    const width = 700, height = 440;
    const res = await shelter.captureR(code, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: false,
      captureGraphics: { width, height }
    });
    const lines = res.output
      .filter(o => o.type === "stdout" || o.type === "stderr")
      .map(o => (o.type === "stderr" ? "\u0000" : "") + o.data);
    text.innerHTML = lines.map(l => l.startsWith("\u0000")
      ? '<span class="err">' + escapeHTML(l.slice(1)) + "</span>"
      : escapeHTML(l)).join("\n");
    res.images.forEach(img => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Plot drawn by your R code");
      canvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height);
      plots.appendChild(canvas);
    });
    if (!lines.length && !res.images.length) text.innerHTML = '<span class="dim"># the code ran, and printed nothing</span>';
    if (cell.id) ranOK.add(cell.id);
    setStatus(cell, "Done. Edit the code and press Run again.", "ok");
  } catch (e) {
    text.innerHTML = '<span class="err">Error: ' + escapeHTML(e && e.message ? e.message : String(e)) + "</span>";
    setStatus(cell, "R reported an error. Read the message, fix the code and run it again.", "bad");
    if (String(e).indexOf("import") > -1 || String(e).indexOf("fetch") > -1) {
      setStatus(cell, "R could not be loaded. Check your internet connection and reload the page.", "bad");
      webRPromise = null;
    }
  } finally {
    if (shelter) { try { await shelter.purge(); } catch (_) {} }
    btn.disabled = false;
  }
}

function escapeHTML(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.querySelectorAll(".rcell").forEach(cell => {
  const area = cell.querySelector(".rcell-code");
  const original = area.value;
  const st = cell.querySelector(".rcell-status");
  if (!st.textContent.trim()) st.textContent = "Press Run. The first run on this page downloads R, so it takes a little while.";
  const fit = () => { area.rows = Math.max(4, area.value.split("\n").length); };
  fit();
  area.addEventListener("input", fit);
  area.addEventListener("keydown", e => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const s = area.selectionStart, en = area.selectionEnd;
      area.value = area.value.slice(0, s) + "  " + area.value.slice(en);
      area.selectionStart = area.selectionEnd = s + 2;
    }
    if (e.key === "Escape") { area.blur(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); run(cell); }
  });
  cell.querySelector(".rcell-run").addEventListener("click", () => run(cell));
  cell.querySelector(".rcell-reset").addEventListener("click", () => {
    area.value = original; fit();
    cell.querySelector(".rcell-text").textContent = "";
    cell.querySelector(".rcell-plots").innerHTML = "";
    setStatus(cell, "Code reset to the original.", "");
  });
});
