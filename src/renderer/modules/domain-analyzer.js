/**
 * Domain structure analyzer for StreamNet Panels
 * This module analyzes the structure of selected domains to show what modules are installed
 */
import { log } from "../utils/logging.js";
import { getSelectedDomainPath } from "./domain-management.js";
import { MODULE_PATHS } from "./module-selection.js";
import {
  getModuleDisplayName,
  getModuleIcon,
} from "../config/module-config.js";

/**
 * Analyze a domain's structure to check for installed modules
 * @param {string} domainName The selected domain name
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeDomainStructure(domainName) {
  if (!domainName) return null;

  // Log start time for performance tracking
  const startTime = performance.now();
  log.info(`Starting analysis for domain: ${domainName}`);

  try {
    const domainPath = getSelectedDomainPath();
    if (!domainPath) {
      log.warn(`No path found for domain ${domainName}`);
      return null;
    }

    // The path to check will be the domain path + /public_html
    const publicHtmlPath = `${domainPath}/public_html`;

    // Check if the API and Panel directories exist
    // Log the scan start time
    const scanStartTime = performance.now();
    log.debug(`Starting domain structure scan for ${publicHtmlPath}`);

    const structure = await window.streamNetAPI.scanDomainStructure(
      publicHtmlPath
    );

    // Log the scan completion time
    const scanDuration = Math.round(performance.now() - scanStartTime);
    log.debug(`Domain structure scan completed in ${scanDuration}ms`);

    if (!structure || structure.error) {
      log.error(
        `Error scanning domain structure: ${
          structure?.error || "Unknown error"
        }`
      );
      return {
        hasPanel: false,
        hasApi: false,
        hasCockpitPanel: false,
        error: structure?.error || "Failed to scan domain structure",
      };
    }

    // Process the structure data
    const result = {
      domainName,
      publicHtmlPath,
      hasPanel: false,
      hasApi: false,
      hasCockpitPanel: false, // Track cockpitpanel installation
      hasBranding: false, // Track branding installation
      hasSupport: false, // Track support installation
      hasPlexWebview: false, // Track Plex Webview installation
      hasRegularWebview: false, // Track regular Webview installation
      panelEmpty: true,
      apiEmpty: true,
      installedModules: [],
      installedApiModules: [],
      installedPanelModules: [], // Panel modules excluding webviews
      webviewModules: [], // New separate array for webview modules
      specialModules: [], // For cockpit panel and support only
    };

    // Check for dashboard.php which indicates cockpitpanel is installed
    const dashboardFile = structure.items.find(
      (item) => item.name === "dashboard.php" && !item.isDirectory
    );

    if (dashboardFile) {
      log.debug(
        `Found dashboard.php in public_html - cockpitpanel is installed`
      );
      result.hasCockpitPanel = true;

      // Add cockpitpanel to installed modules and special modules
      const cockpitModule = {
        name: "cockpitpanel",
        displayName: "Cockpit Panel",
        type: "panel",
        path: "dashboard.php", // Using dashboard.php as the indicator
      };
      result.installedModules.push(cockpitModule);
      result.specialModules.push(cockpitModule);
    }

    // Check for branding.php in assets directory
    const assetsDir = structure.items.find(
      (item) => item.name === "assets" && item.isDirectory
    );

    if (assetsDir && assetsDir.children) {
      const brandingFile = assetsDir.children.find(
        (item) => item.name === "branding.php" && !item.isDirectory
      );

      if (brandingFile) {
        log.debug(
          `Found branding.php in assets directory - branding is installed`
        );
        result.hasBranding = true;

        // Add branding to installed modules and special modules
        const brandingModule = {
          name: "branding",
          displayName: "Branding",
          type: "panel",
          path: "assets/branding.php",
        };
        result.installedModules.push(brandingModule);
        result.specialModules.push(brandingModule);
      }
    }

    // Check for panel directory and its contents
    const panelDir = structure.items.find(
      (item) => item.name === "panel" && item.isDirectory
    );

    if (panelDir && panelDir.children) {
      result.hasPanel = true;

      // Check for regular webview directory in panel
      const webviewDir = panelDir.children.find(
        (item) => item.name === "webview" && item.isDirectory
      );

      if (webviewDir) {
        // First check for plexed.php (Plex Webview indicator)
        if (webviewDir.children) {
          const plexedFile = webviewDir.children.find(
            (item) => item.name === "plexed.php" && !item.isDirectory
          );

          if (plexedFile) {
            log.debug(
              `Found plexed.php in panel/webview - Plex Webview module is installed`
            );
            result.hasPlexWebview = true;

            // Add plexwebview to webview modules list
            const plexWebviewModule = {
              name: "plexwebview",
              displayName: "Plex Webview",
              type: "webview",
              path: "panel/webview/plexed.php",
            };
            result.webviewModules.push(plexWebviewModule);
            result.installedModules.push(plexWebviewModule);
          }
        }

        // Check if webview directory itself contains index.php or other files indicating regular webviews
        if (webviewDir.children && webviewDir.children.length > 0) {
          const hasWebviewFiles = webviewDir.children.some(
            (item) => !item.isDirectory && item.name !== "plexed.php"
          );

          if (hasWebviewFiles) {
            log.debug(`Found regular webview files in panel/webview`);
            result.hasRegularWebview = true;

            // Add regular webview to webview modules list
            const regularWebviewModule = {
              name: "webviews",
              displayName: "WebViews",
              type: "webview",
              path: "panel/webview",
            };
            result.webviewModules.push(regularWebviewModule);
            result.installedModules.push(regularWebviewModule);
          }
        }
      }

      // Check for API directory and its contents
      const apiDir = structure.items.find(
        (item) => item.name === "api" && item.isDirectory
      );

      // Process other panel modules (excluding webview)
      if (panelDir.children.length > 0) {
        // Filter out webview directory for panel module count
        const nonWebviewChildren = panelDir.children.filter(
          (item) => item.name !== "webview"
        );

        result.panelEmpty = nonWebviewChildren.length === 0;

        if (!result.panelEmpty) {
          const panelModules = processPanelModules(nonWebviewChildren);

          // Check for support module in panel directory
          for (const module of panelModules) {
            if (module.name === "support") {
              result.hasSupport = true;
              result.specialModules.push(module);
            } else {
              // Add non-webview, non-support modules to panel modules
              result.installedPanelModules.push(module);
            }
          }

          // Add all modules to the full list
          result.installedModules.push(...panelModules);
        }
      } else {
        result.panelEmpty = true;
      }
    }

    // Check for api directory
    const apiDir = structure.items.find(
      (item) => item.name === "api" && item.isDirectory
    );

    if (apiDir) {
      result.hasApi = true;

      // Check for webview directory in API
      const apiWebviewDir = apiDir.children?.find(
        (item) => item.name === "webview" && item.isDirectory
      );

      // Similar webview detection for API directory if needed
      if (apiWebviewDir && apiWebviewDir.children?.length > 0) {
        // We've already detected the webview module through panel directory
        // But if API has webview directory and panel doesn't, we should count it
        if (!result.hasRegularWebview && !result.hasPlexWebview) {
          result.hasRegularWebview = true;

          // Add regular webview to webview modules list if not already added
          const apiWebviewModule = {
            name: "webviews",
            displayName: "WebViews API",
            type: "webview",
            path: "api/webview",
          };
          result.webviewModules.push(apiWebviewModule);
          result.installedModules.push(apiWebviewModule);
        }
      }

      // Process API modules excluding webview
      if (apiDir.children?.length > 0) {
        // Filter out webview directory for API module count
        const nonWebviewApiChildren = apiDir.children.filter(
          (item) => item.name !== "webview"
        );

        result.apiEmpty = nonWebviewApiChildren.length === 0;

        if (!result.apiEmpty) {
          const apiModules = processApiModules(nonWebviewApiChildren);

          // Check for support module in API directory
          for (const module of apiModules) {
            if (module.name === "support") {
              result.hasSupport = true;
              result.specialModules.push(module);
            } else {
              // Only count non-support, non-webview modules in the API modules count
              result.installedApiModules.push(module);
            }
          }

          // Add all API modules to the full list (including support)
          result.installedModules.push(...apiModules);
        }
      } else {
        result.apiEmpty = true;
      }
    }

    // Log total analysis time
    const totalTime = Math.round(performance.now() - startTime);
    log.debug(`Domain analysis complete for ${domainName} in ${totalTime}ms`);

    return result;
  } catch (error) {
    // Log error and total time even on failure
    const totalTime = Math.round(performance.now() - startTime);
    log.error(
      `Error analyzing domain structure: ${error.message} (took ${totalTime}ms)`
    );

    return {
      hasPanel: false,
      hasApi: false,
      hasCockpitPanel: false,
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

  if (
    !analysis.hasPanel &&
    !analysis.hasApi &&
    !analysis.hasCockpitPanel &&
    !analysis.hasBranding &&
    !analysis.hasPlexWebview &&
    !analysis.hasRegularWebview
  ) {
    return '<div class="empty-section-message warning">No panel installed on this domain</div>';
  }

  let html = '<div class="domain-analysis">';

  // Cockpit Panel status
  if (analysis.hasCockpitPanel) {
    html +=
      '<div class="analysis-status success">Cockpit Panel installed</div>';
  }

  // Branding status
  if (analysis.hasBranding) {
    html += '<div class="analysis-status success">Panel is rebraned</div>';
  }

  // Support status
  if (analysis.hasSupport) {
    html +=
      '<div class="analysis-status success">Support Module installed</div>';
  }

  // WebViews status (combining both types)
  if (analysis.hasPlexWebview || analysis.hasRegularWebview) {
    const webviewCount = analysis.webviewModules?.length || 0;
    html += `<div class="analysis-status success">WebViews installed (${webviewCount})</div>`;
  }

  // Panel status - WebViews is now excluded from regular modules count
  if (analysis.hasPanel) {
    if (analysis.panelEmpty) {
      html +=
        '<div class="analysis-status warning">Panel installed but without modules</div>';
    } else {
      html += `<div class="analysis-status success">Panel installed with ${analysis.installedPanelModules.length} module(s)</div>`;
    }
  } else if (!analysis.hasCockpitPanel) {
    html += '<div class="analysis-status warning">No panel installed</div>';
  }

  // API status - WebViews is now excluded from API modules count
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

  // Function to create module HTML
  const createModuleHtml = (moduleName, displayName) => {
    const iconFileName = getModuleIcon(moduleName);
    const iconPath = `src/icons/${iconFileName}.png`;

    return `
      <div class="installed-module" title="${moduleName} (icon: ${iconFileName}.png)">
        <span class="module-icon">
          <img src="${iconPath}" alt="${displayName}" class="icon-image" 
               onerror="this.onerror=null; this.src='src/icons/module.png'; console.log('Icon not found: ${iconPath}');">
        </span>
        <span class="module-name">${displayName}</span>
      </div>
    `;
  };

  // First, check and display Cockpit Panel separately if installed
  if (analysis.hasCockpitPanel) {
    html += '<h4 class="analysis-title">Main Panel:</h4>';
    html += '<div class="installed-modules main-panel-section">';
    html += createModuleHtml("cockpitpanel", "Cockpit Panel");
    html += "</div>";
  }

  // Create Brandings section for support and branding modules
  const hasBrandingSection = analysis.hasSupport || analysis.hasBranding;

  if (hasBrandingSection) {
    html += '<h4 class="analysis-title">Brandings:</h4>';
    html += '<div class="installed-modules brandings-section">';

    // Add support module if installed
    if (analysis.hasSupport) {
      html += createModuleHtml("support", "Support");
    }

    // Add branding module if installed
    if (analysis.hasBranding) {
      html += createModuleHtml("branding", "Branding");
    }

    html += "</div>";
  }

  // NEW SECTION: WebViews section
  if (analysis.webviewModules && analysis.webviewModules.length > 0) {
    html += '<h4 class="analysis-title">WebViews:</h4>';
    html += '<div class="installed-modules webviews-section">';

    // Map to track which webview modules we've already rendered to avoid duplicates
    const renderedWebviews = new Set();

    for (const module of analysis.webviewModules) {
      // Skip if we've already rendered this module
      if (renderedWebviews.has(module.name)) continue;
      renderedWebviews.add(module.name);

      html += createModuleHtml(module.name, module.displayName);
    }

    html += "</div>";
  }

  // Show other installed modules (excluding cockpitpanel, support, branding, and webviews)
  const excludedModules = [
    "cockpitpanel",
    "support",
    "branding",
    "webviews",
    "plexwebview",
  ];
  const regularModules = analysis.installedModules.filter(
    (module) => !excludedModules.includes(module.name)
  );

  if (regularModules.length > 0) {
    html += '<h4 class="analysis-title">Installed Modules:</h4>';
    html += '<div class="installed-modules regular-modules-section">';

    // Map to track which modules we've already rendered to avoid duplicates
    const renderedModules = new Set();

    for (const module of regularModules) {
      // Skip if we've already rendered this module
      if (renderedModules.has(module.name)) continue;
      renderedModules.add(module.name);

      html += createModuleHtml(module.name, module.displayName);
    }

    html += "</div>";
  }

  html += "</div>";
  return html;
}

export default {
  analyzeDomainStructure,
  renderDomainAnalysis,
};
