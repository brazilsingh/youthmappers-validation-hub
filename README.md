# YouthMappers Validation Hub

**Live:** https://brazilsingh.github.io/youthmappers-validation-hub/

A live, zero-backend validation operations dashboard for YouthMappers mapping
campaigns across the **HOT** and **TeachOSM** Tasking Managers. Every visitor's
browser fetches data directly from the public Tasking Manager REST APIs, so the
board is always live with no server to run or pay for.

![version](https://img.shields.io/badge/version-1.4.1-blue)
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

# Changelog

All notable changes to the YouthMappers Validation Hub are documented here.
This project follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — breaking changes (data source removed, layout overhaul)
- **MINOR** — new features, backward compatible (a new panel, a new filter)
- **PATCH** — bug fixes and small tweaks (a wording fix, a styling nudge)

---

## [1.4.1] — 2026-07-10
### Removed
- Light/dark mode switcher — reverted to the original dark-only design.

## [1.4.0] — 2026-07-10
### Added
- **Light / dark mode switcher** (🌙 / ☀️ in the header). Remembers the choice
  per visitor, respects the OS colour-scheme preference on first visit, and
  applies before paint to avoid any flash. The map switches to normal OSM tiles
  in light mode and darkened tiles in dark mode.
### Fixed
- Added spacing between the project overview and the activity map.

## [1.3.0] — 2026-07-10
### Changed
- **Activity map** simplified to **markers only** (heatmap removed) and moved to
  sit after the project overview, just before the About section.
### Added
- Full **validation programme content** in the About section: what validation is
  and why it matters, the three quality checks, a brief history of the Hub, and a
  step-by-step "Learn to validate" resource library (JOSM + validation training).

## [1.2.0] — 2026-07-10
### Added
- **Localization (i18n)** with a header language switcher: English, Bengali,
  Spanish, French, Portuguese, Hindi, Arabic (RTL), and Swahili. Choice is
  remembered per visitor and auto-detected from the browser on first visit.
  New languages can be added via a simple Pull Request to `i18n.js`.
- **Contributor's photo** in the About section (with initials fallback).
- **"Contribute on GitHub"** call-to-action linking to the repo for stars,
  forks, and pull requests.

## [1.1.0] — 2026-07-10
### Added
- **Activity map + heatmap** (Leaflet) showing where YouthMappers projects are
  active, with a Markers ⇄ Heatmap toggle and clickable project popups.
- **Per-project CSV export** (⬇ on every card) and a global **Export CSV**
  button that exports all currently filtered projects.
- **Live activity timestamps** now tick every 30 seconds and expose the exact
  last-modified date/time on hover, alongside the on-screen relative time.
- **Favicon** using the official YouthMappers mark.
- **SEO**: full meta tags, Open Graph / Twitter cards, `robots.txt`, `sitemap.xml`.
- **GEO / structured data**: Schema.org `WebApplication` + `FAQPage` JSON-LD so
  search engines and AI assistants can answer questions about the hub.
- **Version tag** in the footer linking to GitHub Releases.

### Changed
- Heading renamed from "Validation Ops" to **"Validation Hub"** and linked to
  the YouthMappers Validation Hub page.

## [1.0.0] — 2026-07-09
### Added
- Initial public release: live dashboard for YouthMappers projects across the
  **HOT** and **TeachOSM** Tasking Managers.
- Status logic (Active / Needs Validation / Almost Completed / Fully Validated).
- Multi-criteria filters (difficulty, country, validation %, status, source),
  filter chips, live counts, validator-need indicators, and onboarding tour.
- CORS-proxy fallback so the browser-only build can reach the HOT API.
- YouthMappers site header and footer, plus About / credits section.

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
