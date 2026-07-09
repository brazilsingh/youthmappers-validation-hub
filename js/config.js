/* =========================================================
   YouthMappers Validation Hub — configuration
   Edit this file to add/remove Tasking Manager instances.
   ========================================================= */
const CONFIG = {
  organisationName: "YouthMappers",
  refreshMs: 5 * 60 * 1000,   // auto-refresh interval
  maxPages: 20,               // safety cap on pagination per instance

  /* -------------------------------------------------------
     CORS proxies.
     GitHub Pages runs no server, so browser calls to the HOT
     API (which doesn't send CORS headers) are blocked. We try
     each instance's API directly first; if the browser blocks
     it, we retry through these public proxies in order.
     Each entry is a function: given a target URL, it returns
     the proxied URL to fetch instead.
     ------------------------------------------------------- */
  corsProxies: [
    url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://thingproxy.freeboard.io/fetch/${url}`
  ],

  instances: [
    {
      key: "hot",
      label: "HOT",
      frontend: "https://tasks.hotosm.org",
      // Verified working endpoint (from the reference server.ts)
      api: "https://tasking-manager-production-api.hotosm.org/api/v2",
      // HOT's browser CORS is unreliable → allow proxy fallback
      allowProxy: true
    },
    {
      key: "teachosm",
      label: "TeachOSM",
      frontend: "https://tasks.teachosm.org",
      // TeachOSM/OSM-US fork API lives under /backend/
      api: "https://tasks.teachosm.org/backend/api/v2",
      allowProxy: true
    }
  ]
};
