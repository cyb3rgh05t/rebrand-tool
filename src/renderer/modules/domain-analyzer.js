/**
 * Optimized Domain Structure Analyzer for StreamNet Panels
 * This module analyzes the structure of selected domains to show what modules are installed
 * with significant performance improvements and detailed debugging
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

// Enhanced cache with TTL for panel_info.json data
const panelInfoCache = new Map();
// Set cache TTL to 0 to effectively disable caching between analyses
const CACHE_TTL = 0; // Disable caching

// Connection limits to prevent overwhelming the server
const CONNECTION_LIMITS = {
  maxConcurrent: 5, // Maximum number of concurrent connections
  retryCount: 2, // Number of retries for failed operations
  retryDelay: 500, // Delay between retries in milliseconds
  batchSize: 5, // How many files to process in each batch
};

// Semaphore for limiting concurrent connections
let activeConnections = 0;
const connectionQueue = [];

// Track performance for debugging
const perfMetrics = {
  lastAnalysis: null,
  steps: [],
  connectionStats: {
    successful: 0,
    failed: 0,
    retried: 0,
  },
};

/**
 * Log a performance step with timing information
 * @param {string} stepName - Name of the step
 * @param {number} startTime - Start time in milliseconds
 */
function logPerformanceStep(stepName, startTime) {
  const duration = performance.now() - startTime;
  const step = { name: stepName, duration };
  perfMetrics.steps.push(step);
  log.debug(`PERF: ${stepName} - ${Math.round(duration)}ms`);
  return performance.now(); // Return current time for chaining
}

/**
 * Reset performance metrics and start tracking a new analysis
 */
function startPerfTracking(domainName) {
  perfMetrics.lastAnalysis = domainName;
  perfMetrics.steps = [];
  return performance.now();
}

/**
 * Finish performance tracking and log summary
 * @param {number} startTime - Start time from startPerfTracking
 */
function finishPerfTracking(startTime) {
  const totalDuration = performance.now() - startTime;

  // Calculate percentages and sort steps by duration
  const sortedSteps = [...perfMetrics.steps].sort(
    (a, b) => b.duration - a.duration
  );

  let summary = `PERFORMANCE SUMMARY for ${perfMetrics.lastAnalysis}:\n`;
  summary += `Total Duration: ${Math.round(totalDuration)}ms\n`;
  summary += `Top 5 most expensive operations:\n`;

  // List top 5 most expensive operations
  sortedSteps.slice(0, 5).forEach((step, index) => {
    const percentage = Math.round((step.duration / totalDuration) * 100);
    summary += `  ${index + 1}. ${step.name}: ${Math.round(
      step.duration
    )}ms (${percentage}%)\n`;
  });

  // Add connection statistics
  summary += "\nConnection Statistics:\n";
  summary += `  Successful: ${perfMetrics.connectionStats.successful}\n`;
  summary += `  Failed: ${perfMetrics.connectionStats.failed}\n`;
  summary += `  Retried: ${perfMetrics.connectionStats.retried}\n`;

  log.info(summary);
  return {
    totalDuration,
    steps: perfMetrics.steps,
    connectionStats: perfMetrics.connectionStats,
  };
}

/**
 * Clear the domain analysis cache
 */
export function clearDomainAnalysisCache() {
  panelInfoCache.clear();
  // Reset performance metrics
  perfMetrics.steps = [];
  perfMetrics.connectionStats = {
    successful: 0,
    failed: 0,
    retried: 0,
  };
  log.debug("Domain analysis cache and metrics cleared");
}

/**
 * Acquire a connection slot with throttling
 * @returns {Promise<void>} Resolves when a connection slot is available
 */
async function acquireConnectionSlot() {
  if (activeConnections < CONNECTION_LIMITS.maxConcurrent) {
    activeConnections++;
    return Promise.resolve();
  }

  // Create a promise that will resolve when a connection slot becomes available
  return new Promise((resolve) => {
    connectionQueue.push(resolve);
  });
}

/**
 * Release a connection slot
 */
function releaseConnectionSlot() {
  activeConnections--;

  // If there are pending requests in the queue, resolve the next one
  if (connectionQueue.length > 0) {
    const nextResolve = connectionQueue.shift();
    activeConnections++;
    nextResolve();
  }
}

/**
 * Get a cached panel_info.json or read it if not cached
 * @param {string} filePath - Path to the panel_info.json file
 * @returns {Promise<Object|null>} - Parsed JSON or null if error
 */
async function getCachedPanelInfo(filePath) {
  // Since caching is disabled (TTL=0), we always fetch fresh data
  // This ensures we always get the latest version of module files
  return await readFileWithRetry(filePath);
}

/**
 * Read a file with retry logic and connection throttling
 * @param {string} filePath - Path to the file to read
 * @returns {Promise<Object|null>} - Parsed JSON or null if error
 */
async function readFileWithRetry(filePath, attempt = 0) {
  try {
    // Wait for a connection slot
    await acquireConnectionSlot();

    const startTime = performance.now();
    log.debug(`Reading panel_info from ${filePath} (attempt ${attempt + 1})`);

    try {
      const result = await window.streamNetAPI.readFileContent(filePath);

      logPerformanceStep(`Read panel_info.json from ${filePath}`, startTime);

      // Connection successful - parse the result
      if (result.success) {
        try {
          const parsedData = JSON.parse(result.content);

          // Cache the result (though with TTL=0 it won't be used)
          panelInfoCache.set(filePath, {
            data: parsedData,
            timestamp: Date.now(),
          });

          perfMetrics.connectionStats.successful++;
          return parsedData;
        } catch (parseErr) {
          log.warn(
            `Error parsing panel_info.json at ${filePath}: ${parseErr.message}`
          );
          return null;
        }
      } else {
        throw new Error(result.error || "Failed to read file");
      }
    } catch (error) {
      log.debug(
        `Error reading panel_info.json at ${filePath}: ${error.message}`
      );

      // Handle retry logic
      if (attempt < CONNECTION_LIMITS.retryCount) {
        perfMetrics.connectionStats.retried++;

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, CONNECTION_LIMITS.retryDelay)
        );

        // Release the connection slot before retrying
        releaseConnectionSlot();

        // Retry
        return readFileWithRetry(filePath, attempt + 1);
      } else {
        perfMetrics.connectionStats.failed++;
        return null;
      }
    }
  } finally {
    // Make sure to release the connection slot
    releaseConnectionSlot();
  }
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
 * Process panel_info.json files in batches to avoid overwhelming the server
 * @param {Array} items - Items to process
 * @returns {Promise<Array>} - Processed results
 */
async function processBatches(items) {
  const results = [];
  const batchCount = Math.ceil(items.length / CONNECTION_LIMITS.batchSize);

  log.debug(
    `Processing ${items.length} items in ${batchCount} batches (size: ${CONNECTION_LIMITS.batchSize})`
  );

  // Process batches sequentially to avoid overwhelming the server
  for (let i = 0; i < batchCount; i++) {
    const start = i * CONNECTION_LIMITS.batchSize;
    const end = Math.min(start + CONNECTION_LIMITS.batchSize, items.length);
    const batch = items.slice(start, end);

    log.debug(
      `Processing batch ${i + 1}/${batchCount} with ${batch.length} items`
    );

    // Process the current batch in parallel
    const batchPromises = batch.map(async (item) => {
      const panelInfo = await getCachedPanelInfo(item.path);
      return {
        ...item,
        info: panelInfo,
      };
    });

    // Wait for the current batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Handle all panel_info.json reads with optimized parallel processing
 * @param {Object} structure - Domain structure from scan
 * @param {string} publicHtmlPath - Base path to public_html
 * @returns {Promise<Object>} - Object containing all found panel_info data
 */
async function batchReadPanelInfo(structure, publicHtmlPath) {
  const batchStartTime = performance.now();
  log.debug(`Starting batch read of panel_info.json files`);

  // Define all possible panel_info paths to check
  const pathsToCheck = [];

  // High priority items - read these first
  const priorityItems = [];

  // Root panel_info (cockpit panel)
  priorityItems.push({
    type: "cockpit",
    path: `${publicHtmlPath}/panel_info.json`,
  });

  // Branding panel_info
  priorityItems.push({
    type: "branding",
    path: `${publicHtmlPath}/assets/img/panel_info.json`,
  });

  // Look for panel directory
  const panelDir = structure.items.find(
    (item) => item.name === "panel" && item.isDirectory
  );

  if (panelDir && panelDir.children) {
    // Check for webview
    const webviewDir = panelDir.children.find(
      (item) => item.name === "webview" && item.isDirectory
    );

    if (webviewDir) {
      priorityItems.push({
        type: "webview",
        path: `${publicHtmlPath}/panel/webview/panel_info.json`,
      });
    }

    // Check for support
    const supportDir = panelDir.children.find(
      (item) => item.name === "support" && item.isDirectory
    );

    if (supportDir) {
      priorityItems.push({
        type: "support",
        path: `${publicHtmlPath}/panel/support/panel_info.json`,
      });
    }

    // Add all other panel modules
    const regularModuleDirs = panelDir.children.filter(
      (item) =>
        item.isDirectory &&
        item.name !== "webview" &&
        item.name !== "support" &&
        item.name !== "assets"
    );

    regularModuleDirs.forEach((moduleDir) => {
      pathsToCheck.push({
        type: "panel-module",
        name: moduleDir.name,
        path: `${publicHtmlPath}/panel/${moduleDir.name}/panel_info.json`,
      });
    });
  }

  // Process all files in batches
  log.debug(
    `Reading ${priorityItems.length} priority and ${pathsToCheck.length} regular panel_info.json files`
  );

  // Process priority items first (usually fewer and more important)
  const priorityStartTime = performance.now();
  const priorityResults = await processBatches(priorityItems);
  logPerformanceStep(
    `Processed ${priorityItems.length} priority items`,
    priorityStartTime
  );

  // Process regular items next
  const regularStartTime = performance.now();
  const regularResults = await processBatches(pathsToCheck);
  logPerformanceStep(
    `Processed ${pathsToCheck.length} regular items`,
    regularStartTime
  );

  // Combine the results
  const results = [...priorityResults, ...regularResults];

  // Process the results into a usable format
  const panelInfoData = {
    cockpit: null,
    branding: null,
    webview: null,
    support: null,
    modules: {},
  };

  results.forEach((result) => {
    if (!result.info) return; // Skip if no data

    switch (result.type) {
      case "cockpit":
        panelInfoData.cockpit = result.info;
        break;
      case "branding":
        panelInfoData.branding = result.info;
        break;
      case "webview":
        panelInfoData.webview = result.info;
        break;
      case "support":
        panelInfoData.support = result.info;
        break;
      case "panel-module":
        panelInfoData.modules[result.name] = result.info;
        break;
    }
  });

  logPerformanceStep(
    `Batch read ${
      priorityItems.length + pathsToCheck.length
    } panel_info.json files`,
    batchStartTime
  );
  return panelInfoData;
}

/**
 * Check for Plex in webview configuration
 * @param {Object} webviewInfo - Webview panel_info
 * @returns {boolean} - True if Plex is present
 */
function detectPlexInWebview(webviewInfo) {
  if (!webviewInfo) return false;

  // Log detailed information for debugging
  log.debug(
    `Checking for Plex in webview: ${JSON.stringify(
      webviewInfo,
      null,
      2
    ).substring(0, 500)}...`
  );

  let hasPlexLayout = false;

  // Method 1: Check for plexed.php file in files array
  if (webviewInfo.files && Array.isArray(webviewInfo.files)) {
    log.debug(`Checking ${webviewInfo.files.length} files for plexed.php`);
    if (
      webviewInfo.files.some((file) => {
        const hasMatch =
          typeof file === "string" && file.includes("plexed.php");
        if (hasMatch) log.debug(`Found plexed.php in files: ${file}`);
        return hasMatch;
      })
    ) {
      log.debug(`Detected Plex Webview from files array`);
      return true;
    }
  }

  // Method 2: Look for 'plex' in any file names
  if (webviewInfo.files && Array.isArray(webviewInfo.files)) {
    if (
      webviewInfo.files.some((file) => {
        const hasMatch =
          typeof file === "string" && file.toLowerCase().includes("plex");
        if (hasMatch) log.debug(`Found plex in filename: ${file}`);
        return hasMatch;
      })
    ) {
      log.debug(`Detected Plex Webview from filename containing 'plex'`);
      return true;
    }
  }

  // Method 3: Check pages array for Plex references
  if (webviewInfo.pages && Array.isArray(webviewInfo.pages)) {
    log.debug(`Checking ${webviewInfo.pages.length} pages for Plex references`);

    // Look through each page
    for (const page of webviewInfo.pages) {
      // Check page name/title for Plex
      if (
        page.title &&
        typeof page.title === "string" &&
        page.title.toLowerCase().includes("plex")
      ) {
        log.debug(`Detected Plex Webview from page title: ${page.title}`);
        return true;
      }

      // Check if this page has options
      if (page.option && Array.isArray(page.option)) {
        // Look through each option
        for (const option of page.option) {
          // Method 3a: Check if this option has an inner value containing "Plex"
          if (option.inner && option.inner.includes("Plex")) {
            hasPlexLayout = true;
            log.debug(
              `Detected Plex Webview from nested option inner: ${option.inner}`
            );
            break;
          }

          // Method 3b: Check if option title/name contains Plex
          if (
            option.title &&
            typeof option.title === "string" &&
            option.title.toLowerCase().includes("plex")
          ) {
            hasPlexLayout = true;
            log.debug(
              `Detected Plex Webview from option title: ${option.title}`
            );
            break;
          }
        }
        if (hasPlexLayout) break;
      }
    }
  }

  // Method 4: Direct check for 'plex' anywhere in the object keys/values
  const jsonString = JSON.stringify(webviewInfo).toLowerCase();
  if (jsonString.includes("plex")) {
    log.debug(`Detected Plex Webview from JSON string search`);
    return true;
  }

  // Method 5: Check if there's a direct plex property
  if (webviewInfo.plex || (webviewInfo.config && webviewInfo.config.plex)) {
    log.debug(`Detected Plex Webview from direct plex property`);
    return true;
  }

  return hasPlexLayout;
}

/**
 * Find module name by directory name
 * @param {string} dirName Directory name
 * @param {string} type Type (panel or api)
 * @returns {string|null} Module name or null
 */
function findModuleByDirectory(dirName, type) {
  const startTime = performance.now();

  // First attempt an exact match to avoid confusion between similar module names
  // like "neu" and "neutro"
  for (const [key, paths] of Object.entries(MODULE_PATHS)) {
    if (
      paths[type] &&
      (paths[type] === dirName || paths[type].endsWith(`/${dirName}`))
    ) {
      logPerformanceStep(`Found exact module match for ${dirName}`, startTime);
      return key;
    }
  }

  // If no exact match, fall back to includes
  for (const [key, paths] of Object.entries(MODULE_PATHS)) {
    if (paths[type] && paths[type].includes(dirName)) {
      // Special case for "neu" vs "neutro" to ensure they don't get confused
      if (dirName === "neu" && key !== "neu") continue;
      if (dirName === "neutro" && key !== "neutro") continue;

      logPerformanceStep(
        `Found partial module match for ${dirName}`,
        startTime
      );
      return key;
    }
  }

  logPerformanceStep(`No module match found for ${dirName}`, startTime);
  return null;
}

/**
 * Analyze a domain's structure to check for installed modules
 * @param {string} domainName The selected domain name
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeDomainStructure(domainName) {
  if (!domainName) return null;

  // Start performance tracking
  const analysisStartTime = startPerfTracking(domainName);
  log.info(`Starting optimized analysis for domain: ${domainName}`);

  try {
    // Get domain path
    const domainPathStartTime = performance.now();
    const domainPath = getSelectedDomainPath();
    logPerformanceStep("Get domain path", domainPathStartTime);

    if (!domainPath) {
      log.warn(`No path found for domain ${domainName}`);
      return null;
    }

    // The path to check will be the domain path + /public_html
    const publicHtmlPath = `${domainPath}/public_html`;

    // Scan domain structure with timeout
    const scanStartTime = performance.now();
    log.debug(`Starting domain structure scan for ${publicHtmlPath}`);

    const structure = await window.streamNetAPI.scanDomainStructure(
      publicHtmlPath
    );

    // Log the scan completion time
    logPerformanceStep("Domain structure scan", scanStartTime);

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
    const processStartTime = performance.now();
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
    logPerformanceStep("Initialize result object", processStartTime);

    // Fetch all panel_info.json data in batch for efficiency
    const batchReadTime = performance.now();
    const panelInfoData = await batchReadPanelInfo(structure, publicHtmlPath);
    logPerformanceStep("Batch read all panel_info.json files", batchReadTime);

    // Process the cockpit panel (in public_html root)
    if (panelInfoData.cockpit) {
      const cockpitStartTime = performance.now();
      const cockpitVersion = panelInfoData.cockpit.version;
      log.debug(
        `Found cockpit panel version in root panel_info.json: ${cockpitVersion}`
      );

      // Mark cockpit panel as installed
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
      logPerformanceStep("Process cockpit panel", cockpitStartTime);
    }

    // Process branding (assets/img directory)
    if (panelInfoData.branding) {
      const brandingStartTime = performance.now();
      const brandingVersion = panelInfoData.branding.version;

      // Mark branding as installed
      result.hasBranding = true;
      log.debug(`Found branding with version: ${brandingVersion}`);

      // Create branding module with version
      const brandingModule = {
        name: "branding",
        displayName: "Branding",
        type: "panel",
        path: "assets/img/panel_info.json",
        version: brandingVersion,
        hasUpdate: hasUpdateAvailable("branding", brandingVersion),
      };

      // Add to modules lists
      result.installedModules.push(brandingModule);
      result.specialModules.push(brandingModule);
      logPerformanceStep("Process branding", brandingStartTime);
    }

    // Check for panel directory and its contents
    const panelDirStartTime = performance.now();
    const panelDir = structure.items.find(
      (item) => item.name === "panel" && item.isDirectory
    );

    if (panelDir && panelDir.children) {
      result.hasPanel = true;

      // Process webview
      if (panelInfoData.webview) {
        const webviewStartTime = performance.now();
        const webviewVersion = panelInfoData.webview.version;

        log.debug(
          `Processing webview panel_info.json with version: ${webviewVersion}`
        );

        // Check for Plex in the webview
        const hasPlexLayout = detectPlexInWebview(panelInfoData.webview);

        // If we found Plex in the structure, mark it as installed
        if (hasPlexLayout) {
          result.hasPlexWebview = true;
          log.debug(`PlexWebview detected - adding to result modules list`);

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
        } else {
          log.debug(`No PlexWebview detected in panel_info.json`);
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
        logPerformanceStep("Process webview", webviewStartTime);
      }

      // Process support module
      if (panelInfoData.support) {
        const supportStartTime = performance.now();
        const supportVersion = panelInfoData.support.version;

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

        log.debug(`Found support module with version: ${supportVersion}`);
        logPerformanceStep("Process support module", supportStartTime);
      }

      // Process regular modules
      const modulesStartTime = performance.now();
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
            const moduleStartTime = performance.now();
            const moduleInfo = panelInfoData.modules[moduleDir.name];

            if (moduleInfo) {
              // Be more specific with module name detection for similarly named modules
              let moduleName;

              // Handle special case for neu vs neutro to prevent confusion
              if (moduleDir.name === "neu") {
                moduleName = "neu"; // Force exact match for Purple Neu
                log.debug(`Explicitly identified module 'neu' (Purple Neu)`);
              } else if (moduleDir.name === "neutro") {
                moduleName = "neutro"; // Force exact match for Neutro
                log.debug(`Explicitly identified module 'neutro' (Neutro)`);
              } else {
                moduleName = findModuleByDirectory(moduleDir.name, "panel");
              }

              // Create module object with update status
              const version = moduleInfo.version;
              const moduleObj = {
                name: moduleName || moduleDir.name,
                displayName: getModuleDisplayName(moduleName || moduleDir.name),
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
              logPerformanceStep(
                `Process module ${moduleDir.name}`,
                moduleStartTime
              );
            }
          }
        }
      } else {
        result.panelEmpty = true;
      }
      logPerformanceStep("Process all regular modules", modulesStartTime);
    }
    logPerformanceStep("Process panel directory", panelDirStartTime);

    // Check for API directory
    const apiDirStartTime = performance.now();
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
    logPerformanceStep("Process API directory", apiDirStartTime);

    // Finish performance tracking
    const perfResults = finishPerfTracking(analysisStartTime);

    // Add performance data to the result
    result.performance = {
      totalDuration: perfResults.totalDuration,
      steps: perfMetrics.steps,
      connectionStats: perfMetrics.connectionStats,
    };

    return result;
  } catch (error) {
    // Log error and total time even on failure
    const totalTime = Math.round(performance.now() - analysisStartTime);
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
 * Render the domain analysis to HTML
 * @param {Object} analysis Analysis result
 * @returns {string} HTML content
 */
export function renderDomainAnalysis(analysis) {
  const renderStartTime = performance.now();

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

  logPerformanceStep("Render domain analysis HTML", renderStartTime);
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
      const postProcessStartTime = performance.now();
      log.debug("Post-processing domain analysis to add versions");

      // Get all installed modules
      const moduleElements = document.querySelectorAll(".installed-module");
      if (!moduleElements || moduleElements.length === 0) {
        log.debug("No module elements found in DOM");
        return;
      }

      log.debug(`Found ${moduleElements.length} module elements in DOM`);

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
          }
        }
      });

      logPerformanceStep(
        "Post-process domain analysis DOM",
        postProcessStartTime
      );
    } catch (error) {
      log.error("Error in post-processing domain analysis:", error);
    }
  }, 100);
}

// No additional styling needed
document.addEventListener("DOMContentLoaded", () => {
  // No CSS needed anymore since performance display is removed
});

export default {
  analyzeDomainStructure,
  renderDomainAnalysis,
  clearDomainAnalysisCache,
  postProcessDomainAnalysis,
  getPerfMetrics: () => ({ ...perfMetrics }), // Expose performance metrics for debugging
};
