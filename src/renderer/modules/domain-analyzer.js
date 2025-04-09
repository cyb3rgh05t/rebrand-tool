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
  getModuleVersion,
  MODULES,
} from "../config/module-config.js";

// Cache for panel_info.json data to avoid repeatedly reading the same files
const panelInfoCache = new Map();

/**
 * Clear the domain analysis cache
 */
export function clearDomainAnalysisCache() {
  panelInfoCache.clear();
  log.debug("Domain analysis cache cleared");
}

/**
 * Compare semantic versions
 * @param {string} version1 First version to compare
 * @param {string} version2 Second version to compare
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1, version2) {
  if (!version1 || !version2) return 0;

  // Handle cases where versions might not be well-formed
  if (typeof version1 !== "string" || typeof version2 !== "string") {
    return 0;
  }

  // Split versions into components and remove any 'v' prefix
  const v1 = version1.replace(/^v/i, "").split(".").map(Number);
  const v2 = version2.replace(/^v/i, "").split(".").map(Number);

  // Compare each component
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = i < v1.length ? v1[i] : 0;
    const num2 = i < v2.length ? v2[i] : 0;

    if (num1 !== num2) {
      return num1 < num2 ? -1 : 1;
    }
  }

  return 0; // Versions are equal
}

/**
 * Check if a module has a newer version available
 * @param {string} moduleName Module name
 * @param {string} currentVersion Current installed version
 * @returns {boolean} True if update is available
 */
function hasUpdateAvailable(moduleName, currentVersion) {
  if (!moduleName || !currentVersion) return false;

  // Get latest version from module config
  const latestVersion = MODULES[moduleName.toLowerCase()]?.version;
  if (!latestVersion) return false;

  // Compare versions
  return compareVersions(currentVersion, latestVersion) < 0;
}

/**
 * Get update icon HTML for version display
 * @returns {string} HTML for update icon
 */
function getUpdateIconHTML() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--update-available, #ffbb00)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="update-available-icon" style="margin-left: 2px; vertical-align: middle;">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`;
}

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

    // Check for cockpit panel (panel_info.json in public_html root)
    let cockpitVersion = null;
    try {
      const cockpitInfoPath = `${publicHtmlPath}/panel_info.json`;
      const cockpitInfoResult = await window.streamNetAPI.readFileContent(
        cockpitInfoPath
      );

      if (cockpitInfoResult.success) {
        try {
          const panelInfo = JSON.parse(cockpitInfoResult.content);
          if (panelInfo.version) {
            cockpitVersion = panelInfo.version;
            panelInfoCache.set(cockpitInfoPath, panelInfo);
            log.debug(
              `Found cockpit panel version in root panel_info.json: ${cockpitVersion}`
            );

            // Mark cockpit panel as installed if panel_info.json exists
            result.hasCockpitPanel = true;

            // Add cockpitpanel to installed modules
            const cockpitModule = {
              name: "cockpitpanel",
              displayName: "Cockpit Panel",
              type: "panel",
              path: "panel_info.json",
              version: cockpitVersion,
              hasUpdate: hasUpdateAvailable("cockpitpanel", cockpitVersion),
            };
            result.installedModules.push(cockpitModule);
            result.specialModules.push(cockpitModule);
          }
        } catch (parseErr) {
          log.warn(
            `Error parsing cockpit panel_info.json: ${parseErr.message}`
          );
        }
      }
    } catch (error) {
      log.debug(
        `No panel_info.json found in public_html root: ${error?.message}`
      );
    }

    // Check for branding using panel_info.json in assets/img directory
    try {
      const brandingInfoPath = `${publicHtmlPath}/assets/img/panel_info.json`;
      const brandingInfoResult = await window.streamNetAPI.readFileContent(
        brandingInfoPath
      );

      if (brandingInfoResult.success) {
        try {
          const panelInfo = JSON.parse(brandingInfoResult.content);

          // Mark branding as installed since panel_info.json exists
          result.hasBranding = true;
          log.debug(
            `Found panel_info.json in assets/img directory - branding is installed`
          );

          // Create branding module with version
          const brandingModule = {
            name: "branding",
            displayName: "Branding",
            type: "panel",
            path: "assets/img/panel_info.json",
            version: panelInfo.version,
            hasUpdate: hasUpdateAvailable("branding", panelInfo.version),
          };

          // Add to modules lists
          result.installedModules.push(brandingModule);
          result.specialModules.push(brandingModule);
        } catch (parseErr) {
          log.warn(
            `Error parsing branding panel_info.json: ${parseErr.message}`
          );

          // Still mark branding as installed but without version
          result.hasBranding = true;

          // Add branding without version
          const brandingModule = {
            name: "branding",
            displayName: "Branding",
            type: "panel",
            path: "assets/img/panel_info.json",
          };
          result.installedModules.push(brandingModule);
          result.specialModules.push(brandingModule);
        }
      }
    } catch (error) {
      log.debug(`No panel_info.json found for branding: ${error?.message}`);
      // Branding not installed
    }

    // Check for panel directory and its contents
    const panelDir = structure.items.find(
      (item) => item.name === "panel" && item.isDirectory
    );

    if (panelDir && panelDir.children) {
      result.hasPanel = true;

      // Check for webview directory in panel
      const webviewDir = panelDir.children.find(
        (item) => item.name === "webview" && item.isDirectory
      );

      if (webviewDir) {
        // Check for panel_info.json in the webview directory
        try {
          const webviewInfoPath = `${publicHtmlPath}/panel/webview/panel_info.json`;
          const webviewInfoResult = await window.streamNetAPI.readFileContent(
            webviewInfoPath
          );

          if (webviewInfoResult.success) {
            try {
              const webviewInfo = JSON.parse(webviewInfoResult.content);
              const webviewVersion = webviewInfo.version;

              // Check for Plex in the nested structure
              // Look through the pages array, then their option arrays for "inner" values
              let hasPlexLayout = false;

              if (webviewInfo.pages && Array.isArray(webviewInfo.pages)) {
                // Look through each page
                for (const page of webviewInfo.pages) {
                  // Check if this page has options
                  if (page.option && Array.isArray(page.option)) {
                    // Look through each option
                    for (const option of page.option) {
                      // Check if this option has an inner value containing "Plex"
                      if (option.inner && option.inner.includes("Plex")) {
                        hasPlexLayout = true;
                        log.debug(
                          `Detected Plex Webview from nested option: ${option.inner}`
                        );
                        break;
                      }
                    }
                    if (hasPlexLayout) break; // Stop checking if we found Plex
                  }
                }
              }

              // If we found Plex in the nested structure, mark it as installed
              if (hasPlexLayout) {
                result.hasPlexWebview = true;

                // Add Plex webview module
                const plexWebviewModule = {
                  name: "plexwebview",
                  displayName: "Plex Webview",
                  type: "webview",
                  path: "panel/webview",
                  version: webviewVersion,
                  hasUpdate: hasUpdateAvailable("plexwebview", webviewVersion),
                };
                result.webviewModules.push(plexWebviewModule);
                result.installedModules.push(plexWebviewModule);
              }

              // Regular WebView is always considered installed if panel_info.json exists
              log.debug(`Detected WebView with version: ${webviewVersion}`);
              result.hasRegularWebview = true;

              // Add regular webview module
              const regularWebviewModule = {
                name: "webviews",
                displayName: "WebViews",
                type: "webview",
                path: "panel/webview",
                version: webviewVersion,
                hasUpdate: hasUpdateAvailable("webviews", webviewVersion),
              };
              result.webviewModules.push(regularWebviewModule);
              result.installedModules.push(regularWebviewModule);
            } catch (parseErr) {
              log.warn(
                `Error parsing webview panel_info.json: ${parseErr.message}`
              );
            }
          }
        } catch (error) {
          log.debug(`No panel_info.json found for webview: ${error?.message}`);
        }
      }

      // Process panel modules - EXCLUDING support, webview, and other special modules
      if (panelDir.children.length > 0) {
        // Filter out webview, support, and other special directories
        const regularModuleDirs = panelDir.children.filter(
          (item) =>
            item.isDirectory &&
            item.name !== "webview" &&
            item.name !== "support" &&
            item.name !== "assets" // Exclude assets directory
        );

        // Check if there are regular modules
        result.panelEmpty = regularModuleDirs.length === 0;

        if (!result.panelEmpty) {
          // Process each regular module folder
          for (const moduleDir of regularModuleDirs) {
            // Check for panel_info.json in this module directory
            try {
              const moduleInfoPath = `${publicHtmlPath}/panel/${moduleDir.name}/panel_info.json`;
              const moduleInfoResult =
                await window.streamNetAPI.readFileContent(moduleInfoPath);

              if (moduleInfoResult.success) {
                try {
                  const moduleInfo = JSON.parse(moduleInfoResult.content);

                  // Be more specific with module name detection for similarly named modules
                  let moduleName;

                  // Handle special case for neu vs neutro to prevent confusion
                  if (moduleDir.name === "neu") {
                    moduleName = "neu"; // Force exact match for Purple Neu
                    log.debug(
                      `Explicitly identified module 'neu' (Purple Neu)`
                    );
                  } else if (moduleDir.name === "neutro") {
                    moduleName = "neutro"; // Force exact match for Neutro
                    log.debug(`Explicitly identified module 'neutro' (Neutro)`);
                  } else {
                    moduleName = findModuleByDirectory(moduleDir.name, "panel");
                  }

                  // Log detailed module identification info for debugging
                  log.debug(
                    `Module directory '${
                      moduleDir.name
                    }' identified as module '${moduleName || moduleDir.name}'`
                  );

                  // Create module object with update status
                  const version = moduleInfo.version;
                  const moduleObj = {
                    name: moduleName || moduleDir.name,
                    displayName: getModuleDisplayName(
                      moduleName || moduleDir.name
                    ),
                    type: "panel",
                    path: `panel/${moduleDir.name}`,
                    version: version,
                    hasUpdate: hasUpdateAvailable(
                      moduleName || moduleDir.name,
                      version
                    ),
                  };

                  log.debug(
                    `Added version ${version} to module ${moduleObj.name} (update: ${moduleObj.hasUpdate})`
                  );

                  // Add to panel modules and full modules list
                  result.installedPanelModules.push(moduleObj);
                  result.installedModules.push(moduleObj);
                } catch (parseErr) {
                  log.warn(
                    `Error parsing panel_info.json for ${moduleDir.name}: ${parseErr.message}`
                  );
                }
              }
            } catch (error) {
              log.debug(
                `No panel_info.json found for ${moduleDir.name}: ${error?.message}`
              );
            }
          }
        }
      } else {
        result.panelEmpty = true;
      }

      // Look for support module separately
      const supportDir = panelDir.children.find(
        (item) => item.name === "support" && item.isDirectory
      );

      if (supportDir) {
        try {
          const supportInfoPath = `${publicHtmlPath}/panel/support/panel_info.json`;
          const supportInfoResult = await window.streamNetAPI.readFileContent(
            supportInfoPath
          );

          if (supportInfoResult.success) {
            try {
              const supportInfo = JSON.parse(supportInfoResult.content);
              const supportVersion = supportInfo.version;

              // Create support module object
              const supportModule = {
                name: "support",
                displayName: "Support",
                type: "panel",
                path: `panel/support`,
                version: supportVersion,
                hasUpdate: hasUpdateAvailable("support", supportVersion),
              };

              // Mark support as installed
              result.hasSupport = true;

              // Add to special modules and installed modules, but NOT to panel modules
              result.specialModules.push(supportModule);
              result.installedModules.push(supportModule);

              log.debug(
                `Found support module with version: ${supportInfo.version}`
              );
            } catch (parseErr) {
              log.warn(
                `Error parsing support panel_info.json: ${parseErr.message}`
              );

              // Still mark support as installed even if can't parse version
              result.hasSupport = true;
            }
          }
        } catch (error) {
          log.debug(`No panel_info.json found for support: ${error?.message}`);
        }
      }
    }

    // Check for API directory
    const apiDir = structure.items.find(
      (item) => item.name === "api" && item.isDirectory
    );

    if (apiDir) {
      result.hasApi = true;

      // Check if API directory has any subdirectories
      if (apiDir.children && apiDir.children.length > 0) {
        // Filter out webview, support, and other special directories
        const regularApiDirs = apiDir.children.filter(
          (item) =>
            item.isDirectory &&
            item.name !== "webview" &&
            item.name !== "support"
        );

        result.apiEmpty = regularApiDirs.length === 0;

        // Process regular API modules but don't try to read their panel_info.json files
        if (!result.apiEmpty) {
          for (const moduleDir of regularApiDirs) {
            const moduleName = findModuleByDirectory(moduleDir.name, "api");

            // Create API module object (we don't need versions for API modules)
            const moduleObj = {
              name: moduleName || moduleDir.name,
              displayName: getModuleDisplayName(moduleName || moduleDir.name),
              type: "api",
              path: `api/${moduleDir.name}`,
            };

            // Add to API modules list
            result.installedApiModules.push(moduleObj);

            // Add to the overall modules list
            result.installedModules.push(moduleObj);
          }
        }

        // Check for support in API directory (if not already found in panel)
        if (!result.hasSupport) {
          const apiSupportDir = apiDir.children.find(
            (item) => item.name === "support" && item.isDirectory
          );

          if (apiSupportDir) {
            result.hasSupport = true;

            // Create API support module object
            const apiSupportModule = {
              name: "support",
              displayName: "Support API",
              type: "api",
              path: `api/support`,
            };

            // Add to special modules and installed modules
            result.specialModules.push(apiSupportModule);
            result.installedModules.push(apiSupportModule);

            log.debug(`Found support module in API directory`);
          }
        }
      } else {
        result.apiEmpty = true;
      }
    } else {
      result.apiEmpty = true;
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
 * Find module name by directory name
 * @param {string} dirName Directory name
 * @param {string} type Type (panel or api)
 * @returns {string|null} Module name or null
 */
function findModuleByDirectory(dirName, type) {
  // First attempt an exact match to avoid confusion between similar module names
  // like "neu" and "neutro"
  for (const [key, paths] of Object.entries(MODULE_PATHS)) {
    if (
      paths[type] &&
      (paths[type] === dirName || paths[type].endsWith(`/${dirName}`))
    ) {
      return key;
    }
  }

  // If no exact match, fall back to includes
  for (const [key, paths] of Object.entries(MODULE_PATHS)) {
    if (paths[type] && paths[type].includes(dirName)) {
      // Special case for "neu" vs "neutro" to ensure they don't get confused
      if (dirName === "neu" && key !== "neu") continue;
      if (dirName === "neutro" && key !== "neutro") continue;

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
  const createModuleHtml = (moduleName, displayName, version, hasUpdate) => {
    const iconFileName = getModuleIcon(moduleName);
    const iconPath = `src/icons/${iconFileName}.png`;

    // Update styling for modules with available updates
    const updateStyles = hasUpdate
      ? `style="position: relative; 
               background: linear-gradient(135deg, 
                 rgba(255, 187, 0, 0.1), 
                 rgba(255, 187, 0, 0.05)) !important; 
               border: 1px solid rgba(255, 187, 0, 0.3) !important;
               box-shadow: 0 2px 5px rgba(255, 187, 0, 0.1) !important;"`
      : "";

    // Version display with update icon and background
    const versionDisplay = version
      ? `<div style="position: absolute; 
                     bottom: 2px; 
                     left: 0; 
                     right: 0; 
                     color: var(${
                       hasUpdate ? "--update-available" : "--text-secondary"
                     }, ${hasUpdate ? "#ffbb00" : "#aaa"}); 
                     font-size: 10px; 
                     text-align: center; 
                     padding: 3px; 
                     margin: 0 2px;
                     background: ${
                       hasUpdate ? "rgba(255, 187, 0, 0.1)" : "transparent"
                     };
                     border-radius: 4px;">
           v${version}${hasUpdate ? getUpdateIconHTML() : ""}
         </div>`
      : "";

    return `
      <div class="installed-module" ${updateStyles} title="${moduleName} (icon: ${iconFileName}.png)">
        <span class="module-icon">
          <img src="${iconPath}" alt="${displayName}" class="icon-image" 
               onerror="this.onerror=null; this.src='src/icons/module.png';">
        </span>
        <span class="module-name">${displayName}</span>
        ${versionDisplay}
      </div>
    `;
  };

  // First, check and display Cockpit Panel separately if installed
  if (analysis.hasCockpitPanel) {
    html += '<h4 class="analysis-title">Main Panel:</h4>';
    html += '<div class="installed-modules main-panel-section">';

    // Find the cockpit panel module with version
    const cockpitModule = analysis.specialModules.find(
      (m) => m.name === "cockpitpanel"
    );
    const cockpitVersion = cockpitModule?.version;
    const hasUpdate = cockpitModule?.hasUpdate;

    // Generate update icon if needed
    const updateIcon = hasUpdate ? getUpdateIconHTML() : "";

    // Use modified HTML with update icon for version display
    html += `
      <div class="installed-module" title="cockpitpanel">
        <span class="module-icon">
          <img src="src/icons/rocket.png" alt="Cockpit Panel" class="icon-image" 
               onerror="this.onerror=null; this.src='src/icons/module.png';">
        </span>
        <span class="module-name">Cockpit Panel</span>
        ${
          cockpitVersion
            ? `<div style="position: absolute; bottom: 2px; left: 0; right: 0; color: var(--text-secondary, #aaa); 
                      font-size: 10px; text-align: center; padding: 3px; margin: 0 2px;">
            v${cockpitVersion}${updateIcon}
          </div>`
            : ""
        }
      </div>
    `;

    html += "</div>";
  }

  // Create Brandings section for support and branding modules
  const hasBrandingSection = analysis.hasSupport || analysis.hasBranding;

  if (hasBrandingSection) {
    html += '<h4 class="analysis-title">Brandings:</h4>';
    html += '<div class="installed-modules brandings-section">';

    // Add support module if installed
    if (analysis.hasSupport) {
      // Find the support module with version
      const supportModule = analysis.specialModules.find(
        (m) => m.name === "support"
      );
      html += createModuleHtml(
        "support",
        "Support",
        supportModule?.version,
        supportModule?.hasUpdate
      );
    }

    // Add branding module if installed
    if (analysis.hasBranding) {
      // Find the branding module with version
      const brandingModule = analysis.specialModules.find(
        (m) => m.name === "branding"
      );
      html += createModuleHtml(
        "branding",
        "Branding",
        brandingModule?.version,
        brandingModule?.hasUpdate
      );
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

      html += createModuleHtml(
        module.name,
        module.displayName,
        module.version,
        module.hasUpdate
      );
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

    // Module name to priority map to handle special cases
    const modulePriority = {
      neutro: 1,
      neu: 2,
    };

    // Group modules by name to handle duplicates with priority
    const moduleGroups = new Map();
    for (const module of regularModules) {
      // Skip excluded modules
      if (excludedModules.includes(module.name)) continue;

      if (!moduleGroups.has(module.name)) {
        moduleGroups.set(module.name, module);
      } else {
        // If there's a conflict, use priority or keep the newer version
        const existingModule = moduleGroups.get(module.name);

        // Check if this is a special case
        if (
          modulePriority[module.name] &&
          modulePriority[existingModule.name]
        ) {
          // Use the one with the highest priority
          if (
            modulePriority[module.name] < modulePriority[existingModule.name]
          ) {
            moduleGroups.set(module.name, module);
          }
        } else if (
          compareVersions(module.version, existingModule.version) > 0
        ) {
          // Otherwise keep the module with the newer version
          moduleGroups.set(module.name, module);
        }
      }
    }

    // Sort modules alphabetically by display name
    const sortedModules = Array.from(moduleGroups.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );

    // Render each module
    for (const module of sortedModules) {
      html += createModuleHtml(
        module.name,
        module.displayName,
        module.version,
        module.hasUpdate
      );
    }

    html += "</div>";
  }

  html += "</div>";
  return html;
}

/**
 * Post-process the domain analysis to add version information directly to DOM
 * @param {Object} analysis Analysis result
 */
export function postProcessDomainAnalysis(analysis) {
  if (!analysis) return;

  // Wait for the DOM to update
  setTimeout(() => {
    try {
      console.log("Post-processing domain analysis to add versions");

      // Get all installed modules
      const moduleElements = document.querySelectorAll(".installed-module");
      if (!moduleElements || moduleElements.length === 0) {
        console.log("No module elements found in DOM");
        return;
      }

      console.log(`Found ${moduleElements.length} module elements in DOM`);

      // Map of all modules with their versions and update status
      const moduleVersions = new Map();

      // Add special modules, webview modules, and regular modules to the map
      const moduleArrays = [
        analysis.specialModules,
        analysis.webviewModules,
        analysis.installedModules,
      ];

      moduleArrays.forEach((moduleArray) => {
        if (moduleArray) {
          moduleArray.forEach((module) => {
            if (module.version) {
              moduleVersions.set(module.name, {
                version: module.version,
                hasUpdate: module.hasUpdate,
              });
            }
          });
        }
      });

      console.log("Module versions map:", moduleVersions);

      // Process each module element
      moduleElements.forEach((element) => {
        // Get module name from title attribute
        const titleAttr = element.getAttribute("title");
        if (!titleAttr) return;

        // Extract module name from title
        const moduleNameMatch = titleAttr.match(/^([^(]+)/);
        if (!moduleNameMatch) return;

        const moduleName = moduleNameMatch[1].trim();

        // Check if we have a version for this module
        if (moduleVersions.has(moduleName)) {
          const moduleInfo = moduleVersions.get(moduleName);
          const version = moduleInfo.version;
          const hasUpdate = moduleInfo.hasUpdate;

          // Apply update styles
          if (hasUpdate) {
            element.style.background =
              "linear-gradient(135deg, rgba(255, 187, 0, 0.1), rgba(255, 187, 0, 0.05))";
            element.style.border = "1px solid rgba(255, 187, 0, 0.3)";
            element.style.boxShadow = "0 2px 5px rgba(255, 187, 0, 0.1)";
          }

          // Check if version display already exists
          let versionEl = element.querySelector(".module-version-direct");
          if (!versionEl) {
            versionEl = document.createElement("div");
            versionEl.className = "module-version-direct";

            // Style the version element
            versionEl.style.position = "absolute";
            versionEl.style.bottom = "2px";
            versionEl.style.left = "0";
            versionEl.style.right = "0";
            versionEl.style.color = hasUpdate
              ? "var(--update-available, #ffbb00)"
              : "var(--text-secondary, #aaa)";
            versionEl.style.fontSize = "10px";
            versionEl.style.textAlign = "center";
            versionEl.style.padding = "3px";
            versionEl.style.margin = "0 2px";

            // Add background for updates
            if (hasUpdate) {
              versionEl.style.background = "rgba(255, 187, 0, 0.1)";
              versionEl.style.borderRadius = "4px";
            }

            // Add version with update icon if needed
            if (hasUpdate) {
              versionEl.innerHTML = `v${version}${getUpdateIconHTML()}`;
            } else {
              versionEl.textContent = `v${version}`;
            }

            // Add to module element
            element.style.position = "relative";
            element.appendChild(versionEl);

            console.log(
              `Added version ${version} to module ${moduleName} (update: ${hasUpdate})`
            );
          }
        }
      });
    } catch (error) {
      console.error("Error in post-processing domain analysis:", error);
    }
  }, 100);
}

export default {
  analyzeDomainStructure,
  renderDomainAnalysis,
  clearDomainAnalysisCache,
  postProcessDomainAnalysis,
};
