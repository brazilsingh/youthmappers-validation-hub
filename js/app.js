/* Configuration lives in config.js; translations in i18n.js */

/* ================= STATE ================= */
let projects = [];
let lastSync = null;
const $ = s => document.querySelector(s);

/* ================= i18n ENGINE ================= */
let LANG = "en";
function t(key){
  const dict = (typeof I18N !== "undefined" && I18N[LANG]) || (typeof I18N !== "undefined" && I18N.en) || {};
  return dict[key] ?? ((typeof I18N !== "undefined" && I18N.en && I18N.en[key]) || key);
}
function safeStore2(k, v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v);}catch(_){return null;} }

function applyLanguage(lang){
  if (typeof I18N === "undefined" || !I18N[lang]) lang = "en";
  LANG = lang;
  safeStore2("ymhub_lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = (typeof RTL_LANGS !== "undefined" && RTL_LANGS.includes(lang)) ? "rtl" : "ltr";
  // text content
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    const val = t(k);
    if (val) el.textContent = val;
  });
  // placeholders
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const val = t(el.getAttribute("data-i18n-ph"));
    if (val) el.setAttribute("placeholder", val);
  });
  // "All" options that share the generic key
  document.querySelectorAll('#fDiff option[value=""], #fCountry option[value=""], #fVal option[value=""], #fStatus option[value=""], #fSource option[value=""]').forEach(o => {
    if (o.parentElement.id === "fSource") return; // has its own key
    o.textContent = t("all");
  });
  // re-render dynamic content in the new language
  if (projects.length){ renderStats(); applyFilters(); }
}

function initLangSelect(){
  const sel = document.getElementById("langSelect");
  if (!sel || typeof LANG_NAMES === "undefined") return;
  sel.innerHTML = Object.entries(LANG_NAMES)
    .map(([code, name]) => `<option value="${code}">${name}</option>`).join("");
  const saved = safeStore2("ymhub_lang") ||
    (navigator.language ? navigator.language.slice(0,2) : "en");
  const start = (typeof I18N !== "undefined" && I18N[saved]) ? saved : "en";
  sel.value = start;
  sel.onchange = () => applyLanguage(sel.value);
  applyLanguage(start);
}

/* ================= STATUS RULES (as specified) =================
   1. Fully Validated : validation === 100
   2. Needs Validation: mapping ≥ 95 AND validation < 90
   3. Almost Completed: mapping ≥ 90 AND validation ≥ 80
   4. Active          : everything else (baseline fallback)      */
function statusOf(p){
  if (p.val >= 100) return "done";
  if (p.map >= 95 && p.val < 90) return "need";
  if (p.map >= 90 && p.val >= 80) return "almost";
  return "active";
}
// Language-aware labels (functions, not static maps)
const STATUS_KEY = {done:"st_done", need:"st_need", almost:"st_almost", active:"st_active"};
const DIFF_KEY = {EASY:"diff_easy", MODERATE:"diff_med", CHALLENGING:"diff_hard"};
const statusLabel = st => t(STATUS_KEY[st] || "st_active");
const diffLabel = d => t(DIFF_KEY[d]) || d;
const STATUS_CLASS = {done:"b-status-done", need:"b-status-need", almost:"b-status-almost", active:"b-status-active"};
const DIFF_CLASS = {EASY:"b-diff-easy", MODERATE:"b-diff-med", CHALLENGING:"b-diff-hard"};

/* ================= FETCH (multi-instance, CORS-proxy aware) =================
   Mirrors the reference server's logic: one plain
   ?organisationName=YouthMappers query per instance, trusting the API's
   own org scoping (no org-ID resolver, no post-filtering). Because GitHub
   Pages runs in the browser, we try the API directly first, then retry
   through CORS proxies if the browser blocks the direct call. */

async function fetchJSONWithFallback(targetUrl, allowProxy){
  const attempts = [ u => u ];  // direct first
  if (allowProxy) attempts.push(...CONFIG.corsProxies);
  let lastErr = new Error("no endpoint responded");
  for (const build of attempts){
    const url = build(targetUrl);
    try {
      // No custom headers → keeps the request "simple" (no CORS preflight)
      const res = await fetch(url);
      if (!res.ok){ lastErr = new Error(`HTTP ${res.status}`); continue; }
      return await res.json();
    } catch(e){
      lastErr = e;  // typically a CORS/network TypeError → try next proxy
    }
  }
  throw lastErr;
}

async function fetchInstance(inst){
  const target = `${inst.api}/projects/?organisationName=${encodeURIComponent(CONFIG.organisationName)}`;
  const data = await fetchJSONWithFallback(target, inst.allowProxy);
  const results = Array.isArray(data.results) ? data.results : [];

  // Build a projectId → [lng,lat] lookup from the GeoJSON mapResults, so we
  // can place each project on the map / heat layer.
  const geo = {};
  const feats = data.mapResults?.features;
  if (Array.isArray(feats)){
    feats.forEach(f => {
      const pid = f.properties?.projectId;
      const c = f.geometry?.coordinates;
      if (pid != null && Array.isArray(c) && c.length >= 2) geo[pid] = c;
    });
  }

  return results.map(r => {
    const p = normalize(r);
    const c = geo[p.id];
    if (c){ p.lng = c[0]; p.lat = c[1]; }
    return { ...p, src: inst.key, srcLabel: inst.label, frontend: inst.frontend };
  });
}

async function fetchAll(){
  setSync("syncing…");
  const settled = await Promise.allSettled(CONFIG.instances.map(fetchInstance));
  const all = [], failed = [], summary = [];
  settled.forEach((s, i) => {
    const label = CONFIG.instances[i].label;
    if (s.status === "fulfilled"){
      all.push(...s.value);
      summary.push(`${label}: ${s.value.length}`);
    } else {
      failed.push(label);
      summary.push(`${label}: failed`);
      console.warn(label, "failed:", s.reason?.message);
    }
  });
  window.__syncSummary = summary.join(" · ");
  if (!all.length){
    throw new Error(settled.map((s,i) => `${CONFIG.instances[i].label}: ${s.reason?.message || "0 projects"}`).join("  |  "));
  }
  if (failed.length){
    const reason = settled.find(s => s.status === "rejected")?.reason?.message || "";
    toast(`${failed.join(" & ")} unreachable — showing the rest. ${reason}`);
  }
  return all;
}

function normalize(r){
  const map = Math.round(Number(r.percentMapped ?? 0));
  const val = Math.round(Number(r.percentValidated ?? 0));
  return {
    id: r.projectId ?? r.id,
    name: r.name || `Project ${r.projectId}`,
    orgName: r.organisationName || "",
    author: r.author || "",
    diff: (r.difficulty || "").toUpperCase(),
    priority: (r.priority || "").toUpperCase(),
    country: Array.isArray(r.country) ? (r.country[0] || "") : (r.country || ""),
    archived: (r.status || "").toUpperCase() === "ARCHIVED",
    map, val,
    gap: Math.max(0, map - val),
    contributors: r.totalContributors ?? null,
    active: r.activeMappers ?? 0,
    updated: r.lastUpdated ? new Date(r.lastUpdated) : null
  };
}

/* ================= RENDER ================= */
function applyFilters(){
  const q = $("#fSearch").value.trim().toLowerCase();
  const d = $("#fDiff").value, c = $("#fCountry").value,
        v = $("#fVal").value, s = $("#fStatus").value, sort = $("#fSort").value,
        src = $("#fSource").value;

  let list = projects.filter(p => {
    if (q && !(p.name.toLowerCase().includes(q) || String(p.id).includes(q.replace("#","")))) return false;
    if (src && p.src !== src) return false;
    if (d && p.diff !== d) return false;
    if (c && p.country !== c) return false;
    if (v === "lt25"   && !(p.val < 25)) return false;
    if (v === "25to75" && !(p.val >= 25 && p.val <= 75)) return false;
    if (v === "gt75"   && !(p.val > 75)) return false;
    if (s === "archived" && !p.archived) return false;
    if (s === "live" && p.archived) return false;
    if (s && s !== "archived" && s !== "live" && statusOf(p) !== s) return false;
    return true;
  });

  const by = {
    need:    (a,b)=> b.gap - a.gap || b.map - a.map,
    updated: (a,b)=> (b.updated?.getTime()||0) - (a.updated?.getTime()||0),
    valAsc:  (a,b)=> a.val - b.val,
    valDesc: (a,b)=> b.val - a.val,
    idDesc:  (a,b)=> b.id - a.id
  };
  list.sort(by[sort] || by.need);

  window.__filtered = list;   // for Export CSV (all filtered)
  renderChips({q,d,c,v,s,src}, list.length);
  renderBoard(list);
  renderMap(list);
}

function renderChips(f, n){
  const chips = [];
  const add = (label, val, clearId) => chips.push(
    `<span class="chip">${label}: <b>${esc(val)}</b><button aria-label="Remove ${label} filter" data-clear="${clearId}">✕</button></span>`);
  if (f.q) add("Search", f.q, "fSearch");
  if (f.src) add("Source", {hot:"HOT", teachosm:"TeachOSM"}[f.src] || f.src, "fSource");
  if (f.d) add("Difficulty", diffLabel(f.d), "fDiff");
  if (f.c) add("Country", f.c, "fCountry");
  if (f.v) add("Validation", {lt25:"< 25%","25to75":"25–75%",gt75:"> 75%"}[f.v], "fVal");
  if (f.s) add("Status", statusLabel(f.s) || {archived:t("st_archived"), live:t("st_live")}[f.s], "fStatus");
  $("#chips").innerHTML = chips.join("") || `<span style="color:var(--muted);font-size:12.5px">${t("no_filters")}</span>`;
  $("#countNote").innerHTML = `<strong>${n}</strong> / ${projects.length} projects`;
  document.querySelectorAll("[data-clear]").forEach(b => b.onclick = () => { $("#"+b.dataset.clear).value = ""; applyFilters(); });
}

function tileGridHTML(p){
  // 60 tiles = one TM-style task grid; validated first, then mapped-only, then remaining
  const T = 60;
  const vT = Math.round(p.val/100*T);
  const mT = Math.max(vT, Math.round(p.map/100*T));
  let cells = "";
  for (let i=0;i<T;i++) cells += `<span class="tile ${i<vT?"v":(i<mT?"m":"")}"></span>`;
  return `<div class="tilegrid" role="img" aria-label="${p.map}% mapped, ${p.val}% validated">${cells}</div>
    <div class="pcts"><span class="pm">▲ ${p.map}% mapped</span><span class="pv">✓ ${p.val}% validated</span></div>`;
}

function renderBoard(list){
  const board = $("#board");
  if (!list.length){
    board.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>${t("no_match_h")}</h3><p>${t("no_match_p")}</p></div>`;
    return;
  }
  board.innerHTML = list.map(p => {
    const st = statusOf(p);
    const hot = st === "need";
    const url = `${p.frontend}/projects/${p.id}`;
    return `
    <article class="card ${hot ? "hot-need":""}">
      <div class="card-top">
        <div>
          <div class="pid"><span class="src src-${p.src}">${esc(p.srcLabel)}</span> #${p.id}${p.country ? " · " + esc(p.country) : ""}</div>
          <div class="pname"><a href="${url}" target="_blank" rel="noopener">${esc(p.name)}</a></div>
        </div>
        <div class="badges">
          <span class="badge ${STATUS_CLASS[st]}">${statusLabel(st)}</span>
          ${p.archived ? `<span class="badge b-status-active" style="opacity:.75">${t("st_archived")}</span>` : ""}
          ${p.diff ? `<span class="badge ${DIFF_CLASS[p.diff]||"b-status-active"}">${diffLabel(p.diff)}</span>` : ""}
          ${(p.priority==="URGENT"||p.priority==="HIGH") ? `<span class="badge b-prio">${p.priority} priority</span>` : ""}
        </div>
      </div>

      ${tileGridHTML(p)}
      <div class="legend"><span class="lv"><i></i>${t("validated")}</span><span class="lm"><i></i>${t("mapped")}</span><span class="lu"><i></i>${t("remaining")}</span></div>

      ${hot ? `<div class="needline">⚑ <span>${t("needs_line")} — <b>${p.gap}%</b> ${t("tiles_await")}${p.active ? ` · ${p.active} mapper${p.active>1?"s":""}` : ""}</span></div>` : ""}

      <div class="meta">
        ${p.contributors != null ? `<span class="m">👥 ${p.contributors} ${t("contributors")}</span>` : ""}
      </div>

      <div class="stamp">
        <span class="rel" data-ts="${p.updated ? p.updated.getTime() : ""}" title="${p.updated ? "Last modified: " + p.updated.toLocaleString(undefined,{dateStyle:"full",timeStyle:"long"}) : ""}">${relTime(p.updated)}</span>
        <span class="abs">${p.updated ? p.updated.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}) : "no timestamp"}</span>
      </div>

      <div class="card-actions">
        <a href="${url}" target="_blank" rel="noopener">${t("open_project")}</a>
        <a href="${url}/tasks" target="_blank" rel="noopener">${t("validate_tasks")}</a>
        <button class="card-export" data-export="${p.src}-${p.id}" title="Download this project's details as CSV" aria-label="Export project #${p.id} as CSV">⬇</button>
      </div>
    </article>`;
  }).join("");

  // wire per-card export
  document.querySelectorAll("[data-export]").forEach(b => {
    b.onclick = () => {
      const [src, id] = b.dataset.export.split("-");
      const proj = projects.find(p => p.src === src && String(p.id) === id);
      if (proj) exportProjectsCSV([proj], `youthmappers-${src}-project-${id}.csv`);
    };
  });
}

/* ================= TIMESTAMPS ================= */
function relTime(d){
  if (!d) return "—";
  const s = Math.floor((Date.now() - d.getTime())/1000);
  if (s < 60) return "just now";
  const m = Math.floor(s/60);   if (m < 60)  return `${m} min ago`;
  const h = Math.floor(m/60);   if (h < 24)  return `${h} hour${h>1?"s":""} ago`;
  const dd = Math.floor(h/24);  if (dd < 30) return `${dd} day${dd>1?"s":""} ago`;
  const mo = Math.floor(dd/30); if (mo < 12) return `${mo} month${mo>1?"s":""} ago`;
  return `${Math.floor(mo/12)} year${mo>=24?"s":""} ago`;
}
function freshnessClass(d){
  if (!d) return "stale";
  const h = (Date.now()-d.getTime())/36e5;
  return h < 24 ? "fresh" : h < 24*7 ? "warm" : "stale";
}
setInterval(() => {
  document.querySelectorAll(".rel[data-ts]").forEach(el => {
    const ts = Number(el.dataset.ts);
    if (!ts) return;
    const d = new Date(ts);
    el.textContent = relTime(d);
    el.className = "rel " + freshnessClass(d);
  });
}, 30000);

/* ================= CSV EXPORT ================= */
function csvCell(v){
  const s = (v == null ? "" : String(v));
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function exportProjectsCSV(list, filename){
  const cols = [
    ["Source", p => p.srcLabel],
    ["Project ID", p => p.id],
    ["Name", p => p.name],
    ["Organisation", p => p.orgName || "YouthMappers"],
    ["Author", p => p.author || ""],
    ["Country", p => p.country || ""],
    ["Latitude", p => p.lat ?? ""],
    ["Longitude", p => p.lng ?? ""],
    ["Difficulty", p => diffLabel(p.diff) || ""],
    ["Priority", p => p.priority || ""],
    ["Status", p => statusLabel(statusOf(p))],
    ["Archived", p => p.archived ? "Yes" : "No"],
    ["% Mapped", p => p.map],
    ["% Validated", p => p.val],
    ["Validation gap %", p => p.gap],
    ["Contributors", p => p.contributors ?? ""],
    ["Active mappers", p => p.active ?? 0],
    ["Last updated (ISO)", p => p.updated ? p.updated.toISOString() : ""],
    ["Last updated (local)", p => p.updated ? p.updated.toLocaleString() : ""],
    ["Project URL", p => `${p.frontend}/projects/${p.id}`]
  ];
  const header = cols.map(c => csvCell(c[0])).join(",");
  const rows = list.map(p => cols.map(c => csvCell(c[1](p))).join(","));
  const csv = "\uFEFF" + [header, ...rows].join("\r\n"); // BOM for Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= ACTIVITY MAP + HEATMAP ================= */
let mapObj = null, markerLayer = null;
const STATUS_COLOR = { need:"#f2a83b", almost:"#3aa9ea", done:"#8f7df0", active:"#9fb6d2" };

function initMap(){
  if (mapObj || typeof L === "undefined") return;
  mapObj = L.map("map", { worldCopyJump:true, scrollWheelZoom:false }).setView([10, 10], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
  }).addTo(mapObj);
  markerLayer = L.layerGroup().addTo(mapObj);
  mapObj.on("click", () => mapObj.scrollWheelZoom.enable());
}

function renderMap(list){
  if (typeof L === "undefined") return;
  initMap();
  const pts = list.filter(p => typeof p.lat === "number" && typeof p.lng === "number");
  const note = $("#mapNote");

  markerLayer.clearLayers();
  const bounds = [];
  pts.forEach(p => {
    const st = statusOf(p);
    const color = STATUS_COLOR[st] || "#9fb6d2";
    const icon = L.divIcon({ className:"", html:`<div class="ym-marker" style="color:${color}"></div>`, iconSize:[14,14], iconAnchor:[7,7] });
    const m = L.marker([p.lat, p.lng], { icon });
    m.bindPopup(
      `<b>${esc(p.name)}</b><br>${esc(p.srcLabel)} #${p.id}${p.country ? " · " + esc(p.country) : ""}<br>`+
      `${statusLabel(st)} · ${p.map}% ${t("mapped")} · ${p.val}% ${t("validated")}<br>`+
      `<a href="${p.frontend}/projects/${p.id}" target="_blank" rel="noopener">${t("open_project")}</a>`
    );
    markerLayer.addLayer(m);
    bounds.push([p.lat, p.lng]);
  });

  if (bounds.length){ try { mapObj.fitBounds(bounds, { padding:[40,40], maxZoom:6 }); } catch(_){} }
  note.textContent = pts.length
    ? `${pts.length} ${t("map_note_have")} ${list.length}`
    : t("map_note_none");
}

/* ================= STATS + SYNC ================= */
function renderStats(){
  const n = projects.length;
  const need = projects.filter(p => statusOf(p)==="need").length;
  const done = projects.filter(p => statusOf(p)==="done").length;
  const avg = n ? Math.round(projects.reduce((a,p)=>a+p.val,0)/n) : 0;
  $("#stTotal").textContent = n;
  $("#stNeed").textContent = need;
  $("#stDone").textContent = done;
  $("#stAvgVal").textContent = avg + "%";
  // per-instance breakdown under the total
  const bySrc = CONFIG.instances.map(inst => {
    const c = projects.filter(p => p.src === inst.key).length;
    return `${inst.label} ${c}`;
  }).join(" · ");
  const el = document.getElementById("stTotalBreak");
  if (el) el.textContent = bySrc;
}
function setSync(text, ok){
  $("#syncText").textContent = text;
  $("#syncDot").classList.toggle("err", ok === false);
}
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.style.display = "block";
  setTimeout(()=> t.style.display = "none", 6000);
}

async function refresh(){
  try{
    setSync("syncing…");
    projects = await fetchAll();
    lastSync = new Date();
    // populate country filter (keep selection)
    const sel = $("#fCountry"), keep = sel.value;
    const countries = [...new Set(projects.map(p=>p.country).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">All</option>` + countries.map(c=>`<option ${c===keep?"selected":""}>${esc(c)}</option>`).join("");
    renderStats();
    applyFilters();
    // colorize freshness immediately
    document.querySelectorAll(".rel[data-ts]").forEach(el=>{
      const ts = Number(el.dataset.ts); if (ts) el.classList.add(freshnessClass(new Date(ts)));
    });
    const when = lastSync.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
    setSync(`synced ${when}${window.__syncSummary ? " · " + window.__syncSummary : ""}`, true);
  }catch(e){
    console.error("Validation Hub sync error:", e);
    setSync("sync failed", false);
    toast("Sync failed: " + e.message);
    if (!projects.length){
      $("#board").innerHTML = `<div class="state" style="grid-column:1/-1">
        <h3>Live data unavailable</h3>
        <p style="margin-bottom:10px">The Tasking Manager API request did not succeed.</p>
        <p style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--need);word-break:break-word">${esc(e.message)}</p>
        <p style="margin-top:14px"><button class="btn primary" onclick="refresh()">Try again</button></p>
      </div>`;
    }
  }
}

/* ================= ONBOARDING TOUR ================= */
const TOUR = [
  {sel:'[data-tour="stats"]',   t:"Mission control", p:"A live pulse of every YouthMappers campaign: how many projects are tracked, how many are starving for validators, and how far validation has come overall."},
  {sel:'[data-tour="filters"]', t:"Slice the workload", p:"Filter by difficulty, country, validation completion band, or status. Active filters appear as removable chips with a live result count."},
  {sel:'[data-tour="board"]',   t:"Project tiles", p:"Each card mirrors a Tasking Manager grid — green tiles are validated, blue are mapped and waiting. Amber-ringed cards need validators most. Use the ⬇ button to export any project as CSV."},
  {sel:'[data-tour="map"]',     t:"Activity map", p:"See where YouthMappers is mapping worldwide. Markers are coloured by status — click any point for project details and a link to open it."},
  {sel:'[data-tour="sync"]',    t:"Always live", p:"Data streams straight from the HOT and TeachOSM Tasking Manager APIs and refreshes itself every five minutes. Timestamps on every card tick in real time."}
];
let tourIdx = 0, tourEls = null;
function safeStore(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v);}catch(_){return null} }
function startTour(){
  tourIdx = 0;
  if (!tourEls){
    const veil = document.createElement("div"); veil.className = "tour-veil";
    const hole = document.createElement("div"); hole.className = "tour-hole"; veil.appendChild(hole);
    const card = document.createElement("div"); card.className = "tour-card";
    document.body.append(veil, card);
    tourEls = {veil, hole, card};
    veil.addEventListener("click", e => { if (e.target === veil) endTour(); });
  }
  tourEls.veil.style.display = "block"; tourEls.card.style.display = "block";
  showStep();
}
function showStep(){
  const step = TOUR[tourIdx];
  const el = document.querySelector(step.sel);
  if (!el) return endTour();
  el.scrollIntoView({block:"center", behavior:"smooth"});
  setTimeout(()=>{
    const r = el.getBoundingClientRect();
    Object.assign(tourEls.hole.style, {top:(r.top-8)+"px", left:(r.left-8)+"px", width:(r.width+16)+"px", height:(r.height+16)+"px", position:"fixed"});
    const below = r.bottom + 190 < innerHeight;
    Object.assign(tourEls.card.style, {top: below ? (r.bottom+14)+"px" : Math.max(14, r.top-190)+"px", left: Math.min(Math.max(14, r.left), innerWidth-370)+"px"});
    tourEls.card.innerHTML = `
      <div class="step">Step ${tourIdx+1} of ${TOUR.length}</div>
      <h4>${step.t}</h4><p>${step.p}</p>
      <div class="tour-nav">
        <button class="btn ghost" id="tSkip">Skip tour</button><span class="spacer"></span>
        ${tourIdx>0 ? '<button class="btn" id="tPrev">Back</button>' : ""}
        <button class="btn primary" id="tNext">${tourIdx===TOUR.length-1 ? "Start validating" : "Next"}</button>
      </div>`;
    $("#tSkip").onclick = endTour;
    const prev = $("#tPrev"); if (prev) prev.onclick = () => { tourIdx--; showStep(); };
    $("#tNext").onclick = () => { tourIdx++; tourIdx >= TOUR.length ? endTour() : showStep(); };
  }, 320);
}
function endTour(){
  if (tourEls){ tourEls.veil.style.display = "none"; tourEls.card.style.display = "none"; }
  safeStore("ymops_tour_done","1");
}

/* ================= UTIL + BOOT ================= */
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

["fSearch","fDiff","fCountry","fVal","fStatus","fSort","fSource"].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener(el.tagName === "INPUT" ? "input" : "change", applyFilters);
});
$("#refreshBtn").onclick = refresh;
$("#tourBtn").onclick = startTour;

/* Export all filtered projects */
$("#exportAllBtn").onclick = () => {
  const list = window.__filtered || projects;
  if (!list.length) return toast("No projects to export.");
  const stamp = new Date().toISOString().slice(0,10);
  exportProjectsCSV(list, `youthmappers-validation-hub-${stamp}.csv`);
};

/* YouthMappers header: mobile burger + tap-to-open dropdowns */
const burger = $("#ymBurger"), ymNav = $("#ymNav");
burger.onclick = () => {
  const open = ymNav.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
};
document.querySelectorAll(".ym-nav .nav-item > button.nav-top").forEach(b => {
  b.addEventListener("click", () => b.parentElement.classList.toggle("open"));
});
document.addEventListener("click", e => {
  if (!e.target.closest(".ym-header")){
    ymNav.classList.remove("open");
    document.querySelectorAll(".nav-item.open").forEach(n => n.classList.remove("open"));
  }
});

/* ================= THEME (light / dark) ================= */
function applyTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  safeStore2("ymhub_theme", t);
  const btn = document.getElementById("themeBtn");
  if (btn){
    btn.textContent = t === "light" ? "☀️" : "🌙";
    btn.title = t === "light" ? "Switch to dark mode" : "Switch to light mode";
  }
}
function initTheme(){
  const saved = safeStore2("ymhub_theme");
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(saved || (prefersLight ? "light" : "dark"));
  const btn = document.getElementById("themeBtn");
  if (btn) btn.onclick = () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
}
initTheme();

/* version tag in footer */
(() => { const v = document.getElementById("versionTag"); if (v && CONFIG.version) v.textContent = "v" + CONFIG.version; })();

/* language: build selector and apply saved/browser language */
initLangSelect();

refresh().then(() => {
  if (!safeStore("ymops_tour_done") && projects.length) setTimeout(startTour, 900);
});
setInterval(refresh, CONFIG.refreshMs);
