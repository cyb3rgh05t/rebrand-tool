/**
 * Centralized module configuration for StreamNet Panels
 * This file contains all module-related constants in one place
 */

/**
 * Module configuration object contains all module definitions including:
 * - name: Internal identifier
 * - displayName: User-friendly name for display
 * - version: Current version of the module
 * - icon: Icon filename (without extension) in src/icons/
 * - paths: Object containing source path information
 *   - sourcePath: Direct source path if needed
 *   - api: API component path
 *   - panel: Panel component path
 */
export const MODULES = {
  // Panels
  cockpitpanel: {
    name: "cockpitpanel",
    displayName: "Cockpit Panel",
    version: "2.5.1",
    icon: "rebrands",
    paths: {
      sourcePath: "cockpitpanel",
    },
  },
  branding: {
    name: "branding",
    displayName: "Branding",
    version: "1.0.0",
    icon: "branding",
    paths: {
      api: "assets",
      panel: "includes/db",
    },
  },
  support: {
    name: "support",
    displayName: "Support",
    version: "1.0.0",
    icon: "telegram",
    paths: {
      api: "api/support",
      panel: "panel/support",
    },
  },
  multiproxy: {
    name: "multiproxy",
    displayName: "MultiProxy",
    version: "2.5.1",
    icon: "multi",
    paths: {
      api: "api/proxy",
      panel: "panel/proxy",
    },
  },
  webviews: {
    name: "webviews",
    displayName: "Webviews",
    version: "2.5.1",
    icon: "android",
    paths: {
      api: "api/webview",
      panel: "panel/webview",
    },
  },
  plexwebview: {
    name: "plexwebview",
    displayName: "Plex Webview",
    version: "1.0.0",
    icon: "plex",
    paths: {
      //path: "plex",
      api: "plex/api/webview",
      panel: "plex/panel/webview",
    },
  },

  // OTT Applications
  xciptv: {
    name: "xciptv",
    displayName: "XCIPTV",
    version: "2.5.1",
    icon: "xciptv",
    paths: {
      api: "api/xciptv",
      panel: "panel/xciptv",
    },
  },
  tivimate: {
    name: "tivimate",
    displayName: "TiviMate",
    version: "2.5.1",
    icon: "tivimate",
    paths: {
      api: "api/tivimate",
      panel: "panel/tivimate",
    },
  },
  smarterspro: {
    name: "smarterspro",
    displayName: "Smarters Pro",
    version: "2.5.1",
    icon: "smarters",
    paths: {
      api: "api/smarterspro",
      panel: "panel/smarterspro",
    },
  },
  ibo: {
    name: "ibo",
    displayName: "IBO Solutions",
    version: "2.5.1",
    icon: "ibosol",
    paths: {
      api: "api/ibosol",
      panel: "panel/ibosol",
    },
  },
  nextv: {
    name: "nextv",
    displayName: "NexTV",
    version: "2.5.0",
    icon: "nextv",
    paths: {
      api: "api/nextv",
      panel: "panel/nextv",
    },
  },
  neutro: {
    name: "neutro",
    displayName: "Neutro",
    version: "2.5.1",
    icon: "neutro",
    paths: {
      api: "api/neutro",
      panel: "panel/neutro",
    },
  },
  neu: {
    name: "neu",
    displayName: "Purple Neu",
    version: "2.5.0",
    icon: "pneu",
    paths: {
      api: "api/neu",
      panel: "panel/neu",
    },
  },
  easy: {
    name: "easy",
    displayName: "Purple Easy",
    version: "2.5.0",
    icon: "peasy",
    paths: {
      api: "api/easy",
      panel: "panel/easy",
    },
  },
  sparkle: {
    name: "sparkle",
    displayName: "Sparkle",
    version: "2.5.1",
    icon: "sparkle",
    paths: {
      api: "api/sparkle",
      panel: "panel/sparkle",
    },
  },
  "1stream": {
    name: "1stream",
    displayName: "1Stream",
    version: "2.5.0",
    icon: "1stream",
    paths: {
      api: "api/1stream",
      panel: "panel/1stream",
    },
  },
  "9xtream": {
    name: "9xtream",
    displayName: "9Xtream",
    version: "2.5.0",
    icon: "9xtream",
    paths: {
      api: "api/9xtream",
      panel: "panel/9xtream",
    },
  },

  // VOD Applications
  flixvision: {
    name: "flixvision",
    displayName: "FlixVision",
    version: "2.5.1",
    icon: "flixvision",
    paths: {
      api: "api/flixvision",
      panel: "panel/flixvision",
    },
  },
  smarttube: {
    name: "smarttube",
    displayName: "SmartTube",
    version: "2.5.0",
    icon: "smarttube",
    paths: {
      api: "api/smarttube",
      panel: "panel/smarttube",
    },
  },
  stremio: {
    name: "stremio",
    displayName: "Stremio",
    version: "2.5.0",
    icon: "stremio",
    paths: {
      api: "api/stremio",
      panel: "panel/stremio",
    },
  },

  // VPN Applications
  orvpn: {
    name: "orvpn",
    displayName: "ORVPN",
    version: "2.5.1",
    icon: "orvpn",
    paths: {
      api: "api/orvpn",
      panel: "panel/orvpn",
    },
  },
  ipvanish: {
    name: "ipvanish",
    displayName: "IPVanish",
    version: "2.5.0",
    icon: "ipvanish",
    paths: {
      api: "api/ipvanish",
      panel: "panel/ipvanish",
    },
  },
  pia: {
    name: "pia",
    displayName: "PIA",
    version: "2.5.0",
    icon: "pia",
    paths: {
      api: "api/pia",
      panel: "panel/pia",
    },
  },

  // STORE Applications
  downloader: {
    name: "downloader",
    displayName: "Downloader",
    version: "2.5.0",
    icon: "downloader",
    paths: {
      api: "api/downloader",
      panel: "panel/downloader",
    },
  },
  sh9store: {
    name: "sh9store",
    displayName: "SH9 Store",
    version: "2.5.0",
    icon: "sh9",
    paths: {
      api: "api/s9hstore",
      panel: "panel/s9hstore",
    },
  },
};

/**
 * Helper functions for module data access
 */

/**
 * Get module path mappings object
 * @returns {Object} Module path mappings
 */
export function getModulePaths() {
  const result = {};

  Object.values(MODULES).forEach((module) => {
    result[module.name] = module.paths;
  });

  return result;
}

/**
 * Get module versions
 * @returns {Object} Module versions
 */
export function getModuleVersions() {
  const result = {};

  Object.values(MODULES).forEach((module) => {
    result[module.name] = module.version;
  });

  return result;
}

/**
 * Get icon mappings for modules
 * @returns {Object} Icon mappings
 */
export function getIconMappings() {
  const result = {};

  Object.values(MODULES).forEach((module) => {
    result[module.name] = module.icon;
  });

  return result;
}

/**
 * Get display name for a module
 * @param {string} moduleName - Module name to look up
 * @returns {string} Display name or original name if not found
 */
export function getModuleDisplayName(moduleName) {
  // Handle case sensitivity
  const normalizedName = moduleName.toLowerCase();
  return MODULES[normalizedName]?.displayName || moduleName;
}

/**
 * Get module version
 * @param {string} moduleName - Module name to look up
 * @returns {string} Module version or default version
 */
export function getModuleVersion(moduleName) {
  if (!moduleName) return "2.5.1";

  // Normalize module name by removing API, Panel suffixes and converting to lowercase
  const normalizedName = moduleName
    .replace(/\s*(API|Panel)$/i, "")
    .toLowerCase();

  return MODULES[normalizedName]?.version || "2.5.1";
}

/**
 * Get module icon
 * @param {string} moduleName - Module name to look up
 * @returns {string} Icon name
 */
export function getModuleIcon(moduleName) {
  if (!moduleName) return "module";

  const normalizedName = moduleName.toLowerCase();
  return MODULES[normalizedName]?.icon || "module";
}

/**
 * Find module name from display name
 * @param {string} displayName - Display name to look up
 * @returns {string|null} Module name or null if not found
 */
export function findModuleNameFromDisplayName(displayName) {
  for (const [key, module] of Object.entries(MODULES)) {
    if (module.displayName === displayName) {
      return key;
    }
  }
  return null;
}

/**
 * Get module categories
 * @returns {Object} Modules grouped by category
 */
export function getModuleCategories() {
  // Category definitions could be expanded here
  return {
    panels: [
      "cockpitpanel",
      "branding",
      "support",
      "multiproxy",
      "webviews",
      "plexwebview",
    ],
    ottApps: [
      "xciptv",
      "tivimate",
      "smarterspro",
      "ibo",
      "nextv",
      "neutro",
      "neu",
      "easy",
      "sparkle",
      "1stream",
      "9xtream",
    ],
    vodApps: ["flixvision", "smarttube", "stremio"],
    vpnApps: ["orvpn", "ipvanish", "pia"],
    storeApps: ["downloader", "sh9store"],
  };
}

export default {
  MODULES,
  getModulePaths,
  getModuleVersions,
  getIconMappings,
  getModuleDisplayName,
  getModuleVersion,
  getModuleIcon,
  findModuleNameFromDisplayName,
  getModuleCategories,
};
