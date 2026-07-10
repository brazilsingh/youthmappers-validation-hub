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
