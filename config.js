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
      // TeachOSM runs the OSM-US fork; the API host is probed at
      // runtime — first candidate that answers is used. If you learn
      // the exact API URL (site → F12 → Network tab), put it first.
      apiCandidates: [
        "https://tasks.teachosm.org/api/v2",
        "https://tasking-manager-teachosm-api.hotosm.org/api/v2",
        "https://teachosm-tm4-production-api.hotosm.org/api/v2"
      ]
    }
  ]
};
