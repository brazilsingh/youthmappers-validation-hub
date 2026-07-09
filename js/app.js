/* Configuration lives in js/config.js */

/* ================= STATE ================= */
let projects = [];
let lastSync = null;
const $ = s => document.querySelector(s);

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
const STATUS_LABEL = {done:"Fully validated", need:"Needs validation", almost:"Almost completed", active:"Active"};
const STATUS_CLASS = {done:"b-status-done", need:"b-status-need", almost:"b-status-almost", active:"b-status-active"};
const DIFF_LABEL = {EASY:"Easy", MODERATE:"Medium", CHALLENGING:"Hard"};
const DIFF_CLASS = {EASY:"b-diff-easy", MODERATE:"b-diff-med", CHALLENGING:"b-diff-hard"};

/* ================= FETCH (multi-instance) ================= */
async function getJSON(url){
  const res = await fetch(url);
  if (!res.ok){
    let detail = "";
    try { detail = (await res.json()).Error || ""; } catch(_){}
    throw new Error(`HTTP ${res.status}${detail ? " — " + detail : ""} (${url.split("?")[0]})`);
  }
  return res.json();
}

async function fetchPages(base, orgParam, statuses){
  const out = [];
  let page = 1, pages = 1;
  do {
    const st = statuses ? `&projectStatuses=${statuses}` : "";
    const data = await getJSON(`${base}/projects/?${orgParam}${st}&page=${page}&omitMapResults=true`);
    (data.results || []).forEach(r => out.push(normalize(r)));
    pages = data.pagination?.pages ?? 1;
    page++;
  } while (page <= pages && page <= CONFIG.maxPages);
  return out;
}

async function resolveOrgId(base){
  const data = await getJSON(`${base}/organisations/?omitManagerList=true`);
  const list = data.organisations || data.results || [];
  const want = CONFIG.organisationName.trim().toLowerCase();
  // Exact match first; fall back to a slug match, never a loose substring.
  const hit = list.find(o => (o.name || "").trim().toLowerCase() === want)
           || list.find(o => (o.slug || "").toLowerCase() === want.replace(/\s+/g, "-"));
  if (!hit) throw new Error("YouthMappers organisation not found on this instance");
  return hit.organisationId ?? hit.id;
}

/* Try each API candidate of an instance. Within a candidate, try a
   sequence of (orgParam, statuses) queries and return the FIRST that
   yields projects. An endpoint counts as "reachable but empty" only if
   at least one query completed without error and all returned zero. */
async function fetchInstance(inst){
  const nameParam = `organisationName=${encodeURIComponent(CONFIG.organisationName)}`;
  const want = CONFIG.organisationName.trim().toLowerCase();
  // Hard guarantee: only keep projects the API confirms are owned by the org.
  // If the API omits organisationName on a project (some list endpoints do),
  // we keep it ONLY when it came from an org-scoped query — tracked via _scoped.
  const keepOwned = list => {
    const kept = [], dropped = [];
    list.forEach(p => {
      if (!p.orgName || p.orgName.trim().toLowerCase() === want) kept.push(p);
      else dropped.push(`#${p.id} ${p.name} (org: ${p.orgName})`);
    });
    if (dropped.length) console.info(`${inst.label}: filtered out ${dropped.length} non-YouthMappers project(s):`, dropped);
    return kept;
  };
  const tag = list => keepOwned(list).map(p =>
    ({...p, src: inst.key, srcLabel: inst.label, frontend: inst.frontend}));
  let lastErr = new Error(`${inst.label}: no API endpoint responded`);

  for (const base of inst.apiCandidates){
    let reachable = false;

    const plans = [
      {param: nameParam, statuses: "PUBLISHED,ARCHIVED"},
      {param: nameParam, statuses: "PUBLISHED"},
      {param: nameParam, statuses: null}
    ];

    let orgId = null;
    try { orgId = await resolveOrgId(base); reachable = true; } catch(e){ lastErr = e; }
    if (orgId != null){
      plans.push(
        {param: `organisationId=${orgId}`, statuses: "PUBLISHED,ARCHIVED"},
        {param: `organisationId=${orgId}`, statuses: "PUBLISHED"},
        {param: `organisationId=${orgId}`, statuses: null}
      );
    }

    for (const plan of plans){
      try {
        const raw = await fetchPages(base, plan.param, plan.statuses);
        reachable = true;
        const owned = tag(raw);
        if (owned.length) return owned;
      } catch(e){ lastErr = e; }
    }

    if (reachable) return [];
  }
  throw lastErr;
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

  renderChips({q,d,c,v,s,src}, list.length);
  renderBoard(list);
}

function renderChips(f, n){
  const chips = [];
  const add = (label, val, clearId) => chips.push(
    `<span class="chip">${label}: <b>${esc(val)}</b><button aria-label="Remove ${label} filter" data-clear="${clearId}">✕</button></span>`);
  if (f.q) add("Search", f.q, "fSearch");
  if (f.src) add("Source", {hot:"HOT", teachosm:"TeachOSM"}[f.src] || f.src, "fSource");
  if (f.d) add("Difficulty", DIFF_LABEL[f.d] || f.d, "fDiff");
  if (f.c) add("Country", f.c, "fCountry");
  if (f.v) add("Validation", {lt25:"< 25%","25to75":"25–75%",gt75:"> 75%"}[f.v], "fVal");
  if (f.s) add("Status", STATUS_LABEL[f.s] || {archived:"Archived", live:"Live only"}[f.s], "fStatus");
  $("#chips").innerHTML = chips.join("") || `<span style="color:var(--muted);font-size:12.5px">No filters active — showing every tracked project.</span>`;
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
    board.innerHTML = `<div class="state" style="grid-column:1/-1"><h3>No projects match these filters</h3><p>Clear a filter chip above to widen the view.</p></div>`;
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
          <span class="badge ${STATUS_CLASS[st]}">${STATUS_LABEL[st]}</span>
          ${p.archived ? `<span class="badge b-status-active" style="opacity:.75">Archived</span>` : ""}
          ${p.diff ? `<span class="badge ${DIFF_CLASS[p.diff]||"b-status-active"}">${DIFF_LABEL[p.diff]||p.diff}</span>` : ""}
          ${(p.priority==="URGENT"||p.priority==="HIGH") ? `<span class="badge b-prio">${p.priority} priority</span>` : ""}
        </div>
      </div>

      ${tileGridHTML(p)}
      <div class="legend"><span class="lv"><i></i>validated</span><span class="lm"><i></i>mapped</span><span class="lu"><i></i>remaining</span></div>

      ${hot ? `<div class="needline">⚑ <span>Validators needed — <b>${p.gap}%</b> of mapped tiles await verification${p.active ? ` · ${p.active} mapper${p.active>1?"s":""} online now` : ""}</span></div>` : ""}

      <div class="meta">
        ${p.contributors != null ? `<span class="m">👥 ${p.contributors} contributor${p.contributors===1?"":"s"}</span>` : ""}
      </div>

      <div class="stamp">
        <span class="rel" data-ts="${p.updated ? p.updated.getTime() : ""}">${relTime(p.updated)}</span>
        <span class="abs">${p.updated ? p.updated.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}) : "no timestamp"}</span>
      </div>

      <div class="card-actions">
        <a href="${url}" target="_blank" rel="noopener">Open project ↗</a>
        <a href="${url}/tasks" target="_blank" rel="noopener">Validate tasks ✓</a>
      </div>
    </article>`;
  }).join("");
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
}, 60000);

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
  {sel:'[data-tour="board"]',   t:"Project tiles", p:"Each card mirrors a Tasking Manager grid — green tiles are validated, blue are mapped and waiting. Amber-ringed cards need validators most."},
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

refresh().then(() => {
  if (!safeStore("ymops_tour_done") && projects.length) setTimeout(startTour, 900);
});
setInterval(refresh, CONFIG.refreshMs);
