# YouthMappers Validation Hub

**Live:** https://brazilsingh.github.io/youthmappers-validation-hub/

A live, zero-backend validation operations dashboard for YouthMappers mapping
campaigns across the **HOT** and **TeachOSM** Tasking Managers. Every visitor's
browser fetches data directly from the public Tasking Manager REST APIs, so the
board is always live with no server to run or pay for.

![version](https://img.shields.io/badge/version-1.4.0-blue)
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


## Releases & versioning

This project uses **semantic versioning** (`MAJOR.MINOR.PATCH`). The current
version lives in one place: `CONFIG.version` in `js/config.js`, and it is shown
in the footer.

<!-- changelog-start -->
<!-- changelog-end -->
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
