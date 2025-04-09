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
                  const moduleName = findModuleByDirectory(
                    moduleDir.name,
                    "panel"
                  );

                  // Create module object
                  const moduleObj = {
                    name: moduleName || moduleDir.name,
                    displayName: getModuleDisplayName(
                      moduleName || moduleDir.name
                    ),
                    type: "panel",
                    path: `panel/${moduleDir.name}`,
                    version: moduleInfo.version,
                  };

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

              // Create support module object
              const supportModule = {
                name: "support",
                displayName: "Support",
                type: "panel",
                path: `panel/support`,
                version: supportInfo.version,
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
  const createModuleHtml = (moduleName, displayName, version) => {
    const iconFileName = getModuleIcon(moduleName);
    const iconPath = `src/icons/${iconFileName}.png`;

    // Version display without background
    return `
      <div class="installed-module" title="${moduleName} (icon: ${iconFileName}.png)">
        <span class="module-icon">
          <img src="${iconPath}" alt="${displayName}" class="icon-image" 
               onerror="this.onerror=null; this.src='src/icons/module.png';">
        </span>
        <span class="module-name">${displayName}</span>
        ${
          version
            ? `<div style="position: absolute; bottom: 2px; left: 0; right: 0; color: var(--text-secondary, #aaa); 
                       font-size: 10px; text-align: center; padding: 3px; margin: 0 2px;">
             v${version}
           </div>`
            : ""
        }
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

    // Use modified HTML without background for version display
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
            v${cockpitVersion}
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
      html += createModuleHtml("support", "Support", supportModule?.version);
    }

    // Add branding module if installed
    if (analysis.hasBranding) {
      // Find the branding module with version
      const brandingModule = analysis.specialModules.find(
        (m) => m.name === "branding"
      );
      html += createModuleHtml("branding", "Branding", brandingModule?.version);
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

      html += createModuleHtml(module.name, module.displayName, module.version);
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

      html += createModuleHtml(module.name, module.displayName, module.version);
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

      // Map of all modules with their versions
      const moduleVersions = new Map();

      // Add special modules
      if (analysis.specialModules) {
        analysis.specialModules.forEach((module) => {
          if (module.version) {
            moduleVersions.set(module.name, module.version);
          }
        });
      }

      // Add webview modules
      if (analysis.webviewModules) {
        analysis.webviewModules.forEach((module) => {
          if (module.version) {
            moduleVersions.set(module.name, module.version);
          }
        });
      }

      // Add regular modules
      if (analysis.installedModules) {
        analysis.installedModules.forEach((module) => {
          if (module.version) {
            moduleVersions.set(module.name, module.version);
          }
        });
      }

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
          const version = moduleVersions.get(moduleName);

          // Check if version display already exists
          if (!element.querySelector(".module-version-direct")) {
            // Create version display element
            const versionEl = document.createElement("div");
            versionEl.className = "module-version-direct";
            versionEl.textContent = `v${version}`;
            versionEl.style.position = "absolute";
            versionEl.style.bottom = "2px";
            versionEl.style.left = "0";
            versionEl.style.right = "0";
            versionEl.style.color = "var(--text-secondary, #aaa)";
            versionEl.style.fontSize = "10px";
            versionEl.style.textAlign = "center";
            versionEl.style.padding = "3px";
            versionEl.style.margin = "0 2px";

            // Add to module element
            element.style.position = "relative";
            element.appendChild(versionEl);

            console.log(`Added version ${version} to module ${moduleName}`);
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
