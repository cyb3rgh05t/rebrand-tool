/**
 * Domain structure analyzer for StreamNet Panels
 * This module analyzes the structure of selected domains to show what modules are installed
 */
import { log } from "../utils/logging.js";
import { getSelectedDomainPath } from "./domain-management.js";
import { MODULE_PATHS } from "./module-selection.js";

// Cache for domain analysis results
const domainAnalysisCache = new Map();

/**
 * Analyze a domain's structure to check for installed modules
 * @param {string} domainName The selected domain name
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeDomainStructure(domainName) {
  if (!domainName) return null;

  log.info(`Analyzing structure for domain: ${domainName}`);

  // Check cache first
  if (domainAnalysisCache.has(domainName)) {
    log.debug(`Using cached analysis for ${domainName}`);
    return domainAnalysisCache.get(domainName);
  }

  try {
    const domainPath = getSelectedDomainPath();
    if (!domainPath) {
      log.warn(`No path found for domain ${domainName}`);
      return null;
    }

    // The path to check will be the domain path + /public_html
    const publicHtmlPath = `${domainPath}/public_html`;

    // Check if the API and Panel directories exist
    const structure = await window.streamNetAPI.scanDomainStructure(
      publicHtmlPath
    );

    if (!structure || structure.error) {
      log.error(
        `Error scanning domain structure: ${
          structure?.error || "Unknown error"
        }`
      );
      return {
        hasPanel: false,
        hasApi: false,
        installedModules: [],
        error: structure?.error || "Failed to scan domain structure",
      };
    }

    // Process the structure data
    const result = {
      domainName,
      publicHtmlPath,
      hasPanel: false,
      hasApi: false,
      panelEmpty: true,
      apiEmpty: true,
      installedModules: [],
      installedApiModules: [],
      installedPanelModules: [],
    };

    // Check for panel and api directories
    for (const item of structure.items) {
      if (item.name === "panel" && item.isDirectory) {
        result.hasPanel = true;
        result.panelEmpty = item.children && item.children.length === 0;

        // Process panel modules if not empty
        if (!result.panelEmpty && item.children) {
          const panelModules = processPanelModules(item.children);
          result.installedPanelModules = panelModules;
          result.installedModules.push(...panelModules);
        }
      }

      if (item.name === "api" && item.isDirectory) {
        result.hasApi = true;
        result.apiEmpty = item.children && item.children.length === 0;

        // Process API modules if not empty
        if (!result.apiEmpty && item.children) {
          const apiModules = processApiModules(item.children);
          result.installedApiModules = apiModules;

          // Add unique modules from API that weren't already in panel modules
          for (const apiModule of apiModules) {
            if (
              !result.installedModules.some((m) => m.name === apiModule.name)
            ) {
              result.installedModules.push(apiModule);
            }
          }
        }
      }
    }

    // Cache the result
    domainAnalysisCache.set(domainName, result);
    log.debug(`Domain analysis complete for ${domainName}`);

    return result;
  } catch (error) {
    log.error(`Error analyzing domain structure: ${error.message}`);
    return {
      hasPanel: false,
      hasApi: false,
      installedModules: [],
      error: error.message,
    };
  }
}

/**
 * Process panel module directories
 * @param {Array} children Directory entries
 * @returns {Array} List of found modules
 */
function processPanelModules(children) {
  const modules = [];
  const panelModules = new Set(
    Object.keys(MODULE_PATHS)
      .filter((key) => MODULE_PATHS[key].panel)
      .map((key) => MODULE_PATHS[key].panel.split("/").pop())
  );

  for (const child of children) {
    if (!child.isDirectory) continue;

    // Find matching module from our known modules
    const moduleName = findModuleByDirectory(child.name, "panel");

    if (moduleName) {
      modules.push({
        name: moduleName,
        displayName: getModuleDisplayName(moduleName),
        type: "panel",
        path: child.name,
      });
    } else if (panelModules.has(child.name)) {
      // Direct match with a panel module name
      const key = Object.keys(MODULE_PATHS).find(
        (k) =>
          MODULE_PATHS[k].panel &&
          MODULE_PATHS[k].panel.split("/").pop() === child.name
      );

      if (key) {
        modules.push({
          name: key,
          displayName: getModuleDisplayName(key),
          type: "panel",
          path: child.name,
        });
      }
    }
  }

  return modules;
}

/**
 * Process API module directories
 * @param {Array} children Directory entries
 * @returns {Array} List of found modules
 */
function processApiModules(children) {
  const modules = [];
  const apiModules = new Set(
    Object.keys(MODULE_PATHS)
      .filter((key) => MODULE_PATHS[key].api)
      .map((key) => MODULE_PATHS[key].api.split("/").pop())
  );

  for (const child of children) {
    if (!child.isDirectory) continue;

    // Find matching module from our known modules
    const moduleName = findModuleByDirectory(child.name, "api");

    if (moduleName) {
      modules.push({
        name: moduleName,
        displayName: getModuleDisplayName(moduleName),
        type: "api",
        path: child.name,
      });
    } else if (apiModules.has(child.name)) {
      // Direct match with an API module name
      const key = Object.keys(MODULE_PATHS).find(
        (k) =>
          MODULE_PATHS[k].api &&
          MODULE_PATHS[k].api.split("/").pop() === child.name
      );

      if (key) {
        modules.push({
          name: key,
          displayName: getModuleDisplayName(key),
          type: "api",
          path: child.name,
        });
      }
    }
  }

  return modules;
}

/**
 * Find module name by directory name
 * @param {string} dirName Directory name
 * @param {string} type Type (panel or api)
 * @returns {string|null} Module name or null
 */
function findModuleByDirectory(dirName, type) {
  for (const [key, paths] of Object.entries(MODULE_PATHS)) {
    if (paths[type] && paths[type].includes(dirName)) {
      return key;
    }
  }
  return null;
}

/**
 * Get a friendly display name for a module
 * @param {string} moduleName Module name
 * @returns {string} Display name
 */
function getModuleDisplayName(moduleName) {
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
    smartube: "SmartTube",
    stremio: "Stremio",
    orvpn: "ORVPN",
    ipvanish: "IPVanish",
    pia: "PIA",
    downloader: "Downloader",
    sh9store: "SH9 Store",
  };

  return displayNames[moduleName] || moduleName;
}

/**
 * Clear the domain analysis cache
 */
export function clearDomainAnalysisCache() {
  domainAnalysisCache.clear();
  log.debug("Domain analysis cache cleared");
}

/**
 * Render the domain analysis to HTML
 * @param {Object} analysis Analysis result
 * @returns {string} HTML content
 */
export function renderDomainAnalysis(analysis) {
  if (!analysis) {
    return '<div class="empty-section-message">No domain selected</div>';
  }

  if (analysis.error) {
    return `<div class="empty-section-message error">Error: ${analysis.error}</div>`;
  }

  if (!analysis.hasPanel && !analysis.hasApi) {
    return '<div class="empty-section-message warning">No panel installed on this domain</div>';
  }

  let html = '<div class="domain-analysis">';

  // Panel status
  if (analysis.hasPanel) {
    if (analysis.panelEmpty) {
      html +=
        '<div class="analysis-status warning">Panel installed but without modules</div>';
    } else {
      html += `<div class="analysis-status success">Panel installed with ${analysis.installedPanelModules.length} module(s)</div>`;
    }
  } else {
    html += '<div class="analysis-status warning">No panel installed</div>';
  }

  // API status
  if (analysis.hasApi) {
    if (analysis.apiEmpty) {
      html +=
        '<div class="analysis-status warning">API installed but without modules</div>';
    } else {
      html += `<div class="analysis-status success">API installed with ${analysis.installedApiModules.length} module(s)</div>`;
    }
  } else {
    html += '<div class="analysis-status warning">No API installed</div>';
  }

  // Show installed modules if any
  if (analysis.installedModules && analysis.installedModules.length > 0) {
    html += '<h4 class="analysis-title">Installed Modules:</h4>';
    html += '<div class="installed-modules">';

    // Map to track which modules we've already rendered to avoid duplicates
    const renderedModules = new Set();

    for (const module of analysis.installedModules) {
      // Skip if we've already rendered this module
      if (renderedModules.has(module.name)) continue;
      renderedModules.add(module.name);

      // Complete mapping of module names to icon filenames
      const iconMap = {
        // Panels
        cockpitpanel: "rebrands",
        support: "telegram",
        multiproxy: "multi",
        webviews: "android",

        // OTT Applications
        xciptv: "xciptv",
        tivimate: "tivimate",
        smarterspro: "smarters",
        ibo: "ibosol",
        neutro: "neutro",
        neu: "pneu",
        easy: "peasy",
        sparkle: "sparkle",
        "1stream": "1stream",
        "9xtream": "9xtream",

        // VOD Applications
        flixvision: "flixvision",
        smartube: "smartube",
        stremio: "stremio",

        // VPN Applications
        orvpn: "orvpn",
        ipvanish: "ipvanish",
        pia: "pia",

        // STORE Applications
        downloader: "downloader",
        sh9store: "sh9",
      };

      // Get correct icon filename - use mapped name or original name
      const iconFileName = iconMap[module.name] || module.name;
      const iconPath = `src/icons/${iconFileName}.png`;

      // Add a debug class to show which icon is being used
      html += `
        <div class="installed-module" title="${module.name} (icon: ${iconFileName}.png)">
          <span class="module-icon">
            <img src="${iconPath}" alt="${module.displayName}" class="icon-image" 
                 onerror="this.onerror=null; this.src='src/icons/module.png'; console.log('Icon not found: ${iconPath}');">
          </span>
          <span class="module-name">${module.displayName}</span>
        </div>
      `;
    }

    html += "</div>";
  }

  html += "</div>";
  return html;
}

export default {
  analyzeDomainStructure,
  renderDomainAnalysis,
  clearDomainAnalysisCache,
};
