/**
 * Get a friendly display name for a module
 * @param {string} moduleName Module name
 * @returns {string} Display name
 */
export function getModuleDisplayName(moduleName) {
  // Map of module names to display names
  const displayNames = {
    cockpitpanel: "Cockpit Panel",
    support: "Support",
    multiproxy: "MultiProxy",
    webviews: "WebViews",
    xciptv: "XCIPTV",
    tivimate: "TiviMate",
    smarterspro: "Smarters Pro",
    ibo: "IBO",
    neutro: "Neutro",
    neu: "Purple Neu",
    easy: "Purple Easy",
    sparkle: "Sparkle",
    "1stream": "1Stream",
    "9xtream": "9Xtream",
    flixvision: "FlixVision",
    smarttube: "SmartTube",
    stremio: "Stremio",
    orvpn: "ORVPN",
    ipvanish: "IPVanish",
    pia: "PIA",
    downloader: "Downloader",
    sh9store: "SH9 Store",
  };

  return displayNames[moduleName] || moduleName;
}
