/* =========================================================
   YouthMappers Validation Hub — configuration
   Edit this file to add/remove Tasking Manager instances.
   ========================================================= */
const CONFIG = {
  organisationName: "YouthMappers",
  refreshMs: 5 * 60 * 1000,   // auto-refresh interval
  maxPages: 20,               // safety cap on pagination per instance

  instances: [
    {
      key: "hot",
      label: "HOT",
      frontend: "https://tasks.hotosm.org",
      // Verified working endpoint
      apiCandidates: ["https://tasking-manager-production-api.hotosm.org/api/v2"]
    },
    {
      key: "teachosm",
      label: "TeachOSM",
      frontend: "https://tasks.teachosm.org",
      // TeachOSM runs the OSM-US fork, whose API lives under /backend/
      // (confirmed via status.openstreetmap.us heartbeat endpoint).
      apiCandidates: [
        "https://tasks.teachosm.org/backend/api/v2",
        "https://tasks.openstreetmap.us/backend/api/v2"
      ]
    }
  ]
};
