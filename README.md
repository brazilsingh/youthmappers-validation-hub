# YouthMappers Validation Hub

**Live:** https://brazilsingh.github.io/youthmappers-validation-hub/

A live, zero-backend validation operations dashboard for YouthMappers mapping
campaigns across the **HOT** and **TeachOSM** Tasking Managers. Every visitor's
browser fetches data directly from the public Tasking Manager REST APIs, so the
board is always live with no server to run or pay for.

![version](https://img.shields.io/badge/version-1.1.0-blue)
![status](https://img.shields.io/badge/data-live-brightgreen)
![host](https://img.shields.io/badge/hosting-GitHub%20Pages-black)

---

## What it is

The Validation Hub monitors YouthMappers OpenStreetMap campaigns in real time and
answers one question at a glance: **which projects need validators right now?**
It pulls published and archived projects from two Tasking Manager instances,
computes each project's validation status, and surfaces the ones lagging behind.

### Features
- **Live data** from HOT + TeachOSM, auto-refreshing every 5 minutes.
- **Status logic** — Active, Needs Validation, Almost Completed, Fully Validated.
- **Validator-need indicators** — amber-ringed cards + a "validators needed" line.
- **Filters** — difficulty, country, validation %, status, source; with removable
  chips and live result counts.
- **Activity map + heatmap** — Leaflet map with a Markers ⇄ Heatmap toggle.
- **CSV export** — per project (⬇ on each card) or all filtered projects at once.
- **Live timestamps** — relative "2 hours ago" that ticks every 30s, plus the
  exact localized date/time on hover.
- **Onboarding tour**, YouthMappers site header/footer, SEO + GEO metadata.

---

## How the status is decided

| Status            | Rule                                        |
|-------------------|---------------------------------------------|
| Fully validated   | validation = 100%                           |
| Needs validation  | mapping ≥ 95% **and** validation < 90%      |
| Almost completed  | mapping ≥ 90% **and** validation ≥ 80%      |
| Active            | baseline fallback (anything else)           |

---

## Project structure

```
index.html        Markup: YouthMappers header/footer, filters, stats, map, board
css/styles.css    All styling (dark ops theme + YouthMappers site chrome + map)
js/config.js      ← Edit this: version, instances, CORS proxies, refresh interval
js/app.js         Fetch layer, status rules, filtering, map, CSV export, tour
robots.txt        Search-engine crawl directives
sitemap.xml       Search-engine sitemap
CHANGELOG.md      Version history (semantic versioning)
README.md         This file
```

> **Note on file paths.** `index.html` links to `css/styles.css`, `js/config.js`,
> and `js/app.js`. Keep the `css/` and `js/` folders intact when uploading. If you
> prefer flat files in the repo root, change the three references in `index.html`
> to `style.css`, `config.js`, `app.js` accordingly.

---

## Deploy (browser only, no terminal)

1. Create a public GitHub repo (e.g. `youthmappers-validation-hub`).
2. Upload `index.html`, the `css/` and `js/` folders, plus `robots.txt`,
   `sitemap.xml`, `README.md`, `CHANGELOG.md`. Keep the folder structure.
3. **Settings → Pages → Source:** *Deploy from a branch* → `main` → **Save**.
4. Open `https://<you>.github.io/<repo>/` and hard-refresh (Ctrl+Shift+R).

---

## How it fetches data (important)

GitHub Pages serves static files only — there is no server. The browser calls the
Tasking Manager APIs directly. HOT's production API does not send browser CORS
headers, so a direct call is blocked. To keep the "no hosting" setup, each
instance is fetched **directly first**, and if the browser blocks it, the request
is retried through the public CORS proxies listed in `js/config.js`
(`corsProxies`). TeachOSM's `/backend/` API usually allows direct calls; HOT
usually needs a proxy.

The fetch mirrors a single `?organisationName=YouthMappers` query per instance,
trusting the API's own org scoping — no org-ID resolver, no client re-filtering.

> Public proxies can rate-limit or go offline. If HOT stops loading, reorder the
> proxies in `config.js`, or deploy the included server (see the original Vite
> project) to a free host (Vercel/Render) and point `api` at it.

### Endpoints
- **HOT:** `https://tasking-manager-production-api.hotosm.org/api/v2`
- **TeachOSM:** `https://tasks.teachosm.org/backend/api/v2`

---

## Releases & versioning

This project uses **semantic versioning** (`MAJOR.MINOR.PATCH`). The current
version lives in one place: `CONFIG.version` in `js/config.js`, and it is shown
in the footer.

### How to cut a release (all in the browser)
1. Make your changes and bump `CONFIG.version` in `js/config.js`
   (e.g. `1.1.0` → `1.2.0` for a new feature, `1.1.1` for a fix).
2. Add a matching entry at the top of `CHANGELOG.md` describing what changed.
3. Commit both files.
4. On GitHub: **Releases → Draft a new release → Create new tag** → type
   `v1.2.0` → title it the same → paste the changelog entry as the description →
   **Publish release**.

The footer's version tag links straight to your Releases page, so anyone can see
what changed and when. Tags also give you restore points: every release is a
snapshot you can download or roll back to.

**When to bump which number**
- `PATCH` (1.1.**x**) — bug fix, wording, styling nudge. No new capability.
- `MINOR` (1.**x**.0) — new feature that doesn't break existing use.
- `MAJOR` (**x**.0.0) — a breaking change (e.g. removing a data source).

---

## SEO & GEO

- **SEO:** title, description, keywords, canonical URL, Open Graph and Twitter
  cards, `robots.txt`, and `sitemap.xml`. To help Google index it, submit the
  site to [Google Search Console](https://search.google.com/search-console) and
  add the `sitemap.xml` URL there.
- **GEO (Generative Engine Optimization):** Schema.org `WebApplication` and
  `FAQPage` structured data (JSON-LD) so search engines and AI assistants can
  describe and answer questions about the hub accurately.

---

## Languages / localization

The interface ships in **English, Bengali, Spanish, French, Portuguese, Hindi,
Arabic (RTL), and Swahili**. A language switcher sits in the header; the choice
is remembered per visitor, and the site also auto-detects the browser language
on first visit.

### Add your own language (via GitHub — anyone can contribute!)
1. Open `i18n.js`.
2. Copy the whole `en: { … }` block.
3. Change the key `en` to your language code (e.g. `de`, `ur`, `sw`).
4. Add your language to `LANG_NAMES` with its native name.
5. Translate the values on the right of each colon — **don't** change the keys
   on the left, and keep `{placeholders}` intact. For right-to-left scripts,
   add your code to `RTL_LANGS`.
6. Commit and open a **Pull Request** at
   <https://github.com/brazilsingh/youthmappers-validation-hub> — that's it.

There's a **"Contribute on GitHub"** button in the About section inviting the
community to star, fork, and submit PRs (new languages, features, fixes).

## Roadmap
- Validator contribution tracking via `/projects/{id}/contributions/`.
- Optional self-hosted API proxy for rock-solid HOT access.

---

Built by **Brazil Singh** — YouthMappers Regional Ambassador · Director,
OpenStreetMap Foundation · bsrittik@gmail.com ·
[LinkedIn](https://www.linkedin.com/in/brazil-singh-rittik/)
