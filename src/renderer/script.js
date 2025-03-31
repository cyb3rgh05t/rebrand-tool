/**
 * Main renderer script for StreamNet Panels
 */
import { log } from "./utils/logging.js";
import * as moduleSelection from "./modules/module-selection.js";
import * as domainManagement from "./modules/domain-management.js";
import * as dnsHandling from "./modules/dns-handling.js";
import * as transfer from "./modules/transfer.js";
import * as uiHelpers from "./modules/ui-helpers.js";
import * as domainLogging from "./modules/domain-logging.js";
import * as dnsPreview from "./modules/dns-preview.js";

// Global app state to avoid duplicate API calls
window.appState = {
  rootDomain: null,
  domainsLoaded: false,
  connectionStatus: null,
};

// Initialize the app
document.addEventListener("DOMContentLoaded", async () => {
  log.info("Application initializing");

  // Set version badge
  setVersionBadge();

  // First load root domain to avoid duplicate calls
  try {
    if (window.streamNetAPI && window.streamNetAPI.getRootDomain) {
      window.appState.rootDomain = await window.streamNetAPI.getRootDomain();
      log.info(`Root domain loaded: ${window.appState.rootDomain}`);
    } else {
      log.error("getRootDomain API not available");
      throw new Error("Root domain API unavailable");
    }
  } catch (err) {
    log.error(`Failed to get root domain: ${err.message}`);
    throw new Error(`Root domain required but unavailable: ${err.message}`);
  }

  // Initialize all application components
  initializeComponents();
});

/**
 * Initialize all application components
 */
async function initializeComponents() {
  // Load domain folders
  await domainManagement.loadDomainFolders();

  // Set up event listeners for domain selection
  const domainSelect = document.getElementById("domainSelect");
  if (domainSelect) {
    domainSelect.addEventListener(
      "change",
      domainManagement.handleDomainChange
    );
  }

  // Set up transfer button
  const transferButton = document.getElementById("transferButton");
  if (transferButton) {
    transferButton.addEventListener("click", transfer.handleTransfer);
  }

  // Set up module selection handlers
  initializeModuleHandlers();

  // Initialize Domain
  initializeDomainAnalysis();

  // Initialize DNS form
  dnsHandling.initDnsForm();

  // Initialize DNS Records
  dnsPreview.initDnsPreview();

  // Initialize domain modal
  domainManagement.initDomainModal();

  // Initialize module checkboxes
  moduleSelection.initializeModuleCheckboxes();

  // Initialize domain logging
  initializeDomainLogging();

  // Check connection on startup
  uiHelpers.checkConnectionStatus();

  // Add test connection button handler
  const testConnectionButton = document.getElementById("testConnectionButton");
  if (testConnectionButton) {
    testConnectionButton.addEventListener(
      "click",
      uiHelpers.checkConnectionStatus
    );
  }

  // Add check updates button handler
  const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener("click", checkForUpdates);
  }

  // Initial call to set the button state
  uiHelpers.updateTransferButton();

  // Initialize debug panel toggle
  initializeDebugPanel();

  // Listen for menu actions from the main process
  initializeMenuListeners();

  log.info("Application initialized");
}

// Set version badge to current version
function setVersionBadge() {
  const versionBadge = document.getElementById("versionBadge");
  if (!versionBadge) return;

  // First try to get version from the IPC API (most reliable)
  if (window.streamNetAPI && window.streamNetAPI.getAppVersion) {
    log.debug("Attempting to get version from IPC API");
    window.streamNetAPI
      .getAppVersion()
      .then((version) => {
        log.info(`Got version from IPC API: ${version}`);
        versionBadge.textContent = `v${version}`;
      })
      .catch((err) => {
        log.warn(`Failed to get version from IPC API: ${err.message}`);
        // Fall back to package.json
        fetchPackageVersion();
      });
  } else {
    log.warn("IPC API for version not available");
    // Fall back to package.json
    fetchPackageVersion();
  }

  // Function to fetch version from package.json
  function fetchPackageVersion() {
    log.debug("Attempting to get version from package.json");

    // Try multiple paths for package.json (development vs production)
    const possiblePaths = [
      "./package.json",
      "../package.json",
      "../../package.json",
      "./resources/app/package.json",
      "./resources/app.asar/package.json",
    ];

    // Try each path until one works
    tryNextPath(0);

    function tryNextPath(index) {
      if (index >= possiblePaths.length) {
        log.warn("Could not find package.json in any location");
        // Last resort - show version as unknown
        versionBadge.textContent = "unknown";
        return;
      }

      fetch(possiblePaths[index])
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.version) {
            log.info(`Got version from package.json: ${data.version}`);
            versionBadge.textContent = `v${data.version}`;
          } else {
            throw new Error("No version found in package.json");
          }
        })
        .catch((err) => {
          log.debug(
            `Failed to load from ${possiblePaths[index]}: ${err.message}`
          );
          // Try the next path
          tryNextPath(index + 1);
        });
    }
  }
}

function initializeDomainAnalysis() {
  const refreshAnalysisBtn = document.getElementById("refreshAnalysisBtn");

  if (refreshAnalysisBtn) {
    refreshAnalysisBtn.addEventListener("click", async () => {
      // Import module dynamically
      const domainAnalyzer = await import("./modules/domain-analyzer.js");

      // Clear cache
      domainAnalyzer.clearDomainAnalysisCache();

      // Re-run domain change handler to refresh the analysis
      domainManagement.handleDomainChange();
    });
  }

  log.debug("Domain analysis initialized");
}

/**
 * Initialize module selection handlers
 */
function initializeModuleHandlers() {
  const selectAllModules = document.getElementById("selectAllModules");
  const unselectAllModules = document.getElementById("unselectAllModules");
  const selectAllPanels = document.getElementById("selectAllPanels");
  const unselectAllPanels = document.getElementById("unselectAllPanels");

  // Add listeners for modules select/deselect buttons
  if (selectAllModules) {
    selectAllModules.addEventListener(
      "click",
      moduleSelection.selectAllModulesHandler
    );
  }

  if (unselectAllModules) {
    unselectAllModules.addEventListener(
      "click",
      moduleSelection.unselectAllModulesHandler
    );
  }

  // Add listeners for panels select/deselect buttons
  if (selectAllPanels) {
    selectAllPanels.addEventListener(
      "click",
      moduleSelection.selectAllPanelsHandler
    );
  }

  if (unselectAllPanels) {
    unselectAllPanels.addEventListener(
      "click",
      moduleSelection.unselectAllPanelsHandler
    );
  }

  // Add DNS form input listeners
  const subdomainInput = document.getElementById("subdomainInput");
  if (subdomainInput) {
    subdomainInput.addEventListener("input", function () {
      domainManagement.updateDnsPreview();
      uiHelpers.updateTransferButton();
    });
  }

  // Add DNS toggle listener
  const dnsToggle = document.getElementById("dnsToggle");
  if (dnsToggle) {
    dnsToggle.addEventListener("change", uiHelpers.updateTransferButton);
  }

  // Update the button state when a module is checked/unchecked
  const checkboxes = document.querySelectorAll(".module-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", uiHelpers.updateTransferButton);
  });

  // Add domain refresh button handler
  const refreshDomainsBtn = document.getElementById("refreshDomainsBtn");
  if (refreshDomainsBtn) {
    refreshDomainsBtn.addEventListener(
      "click",
      domainManagement.refreshDomainsList
    );
  }

  log.debug("Module selection handlers initialized");
}

/**
 * Listen for menu actions from the main process
 */
function initializeMenuListeners() {
  if (window.streamNetAPI && window.streamNetAPI.onMenuAction) {
    window.streamNetAPI.onMenuAction((action, data) => {
      log.debug(`Received menu action: ${action}`);

      switch (action) {
        case "open-domain-modal":
          // Open the domain creation modal
          domainManagement.openDomainModal();
          break;

        case "refresh-domains":
          // Refresh the domains list
          domainManagement.refreshDomainsList();
          break;

        case "test-connection-start":
          // Show a "testing connection" status
          uiHelpers.showStatus("info", "Testing connection...");
          break;

        case "test-connection-result":
          // Handle connection test result
          if (data && data.success) {
            uiHelpers.showStatus("success", "Connection successful");
            window.appState.connectionStatus = "connected";
          } else {
            uiHelpers.showStatus(
              "error",
              `Connection failed: ${data?.error || "Unknown error"}`
            );
            window.appState.connectionStatus = "disconnected";
          }

          // Also update the connection indicator
          updateConnectionIndicator(data?.success);
          break;

        case "check-updates":
          // Trigger update check
          checkForUpdates();
          break;

        case "toggle-debug":
          // Toggle debug panel
          const debugModal = document.getElementById("debugModal");
          if (debugModal) {
            debugModal.style.display =
              debugModal.style.display === "none" ? "block" : "none";
          }
          break;
      }
    });
  }
}

/**
 * Helper function to update connection indicator
 * @param {boolean} connected Whether the connection was successful
 */
function updateConnectionIndicator(connected) {
  const connectionIndicator = document.getElementById("connectionIndicator");
  const connectionText = document.getElementById("connectionText");

  if (!connectionIndicator || !connectionText) return;

  if (connected) {
    connectionIndicator.className = "status-indicator connected";
    connectionText.textContent = "Connected";
  } else {
    connectionIndicator.className = "status-indicator disconnected";
    connectionText.textContent = "Connection failed";
  }
}

/**
 * Check for application updates and show toast notification
 */
async function checkForUpdates() {
  const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");
  const updateStatus = document.getElementById("updateStatus");

  if (!checkUpdatesBtn || !updateStatus) return;

  // Store original button text to restore later
  const originalButtonText = checkUpdatesBtn.innerHTML;

  // Show loading state
  checkUpdatesBtn.disabled = true;
  checkUpdatesBtn.innerHTML = '<span class="button-icon spinning">↻</span>';

  // Display checking toast notification
  updateStatus.className = "update-toast checking visible";
  updateStatus.textContent = "Checking for updates...";

  try {
    if (window.streamNetAPI && window.streamNetAPI.checkForUpdates) {
      const result = await window.streamNetAPI.checkForUpdates();

      if (result.updateAvailable) {
        // Update available
        updateStatus.className = "update-toast update-available visible";
        updateStatus.innerHTML = `Update available: v${result.version} <a href="${result.downloadUrl}" target="_blank">Download now</a>`;
        log.info(`Update available: v${result.version}`);

        // Keep notification visible for download option
      } else {
        // No update available
        updateStatus.className = "update-toast update-not-available visible";
        updateStatus.textContent = `You're using the latest version (v${result.currentVersion})`;
        log.info("No updates available");

        // Auto-hide the "latest version" message after 3 seconds
        setTimeout(() => {
          updateStatus.classList.remove("visible");
        }, 3000);
      }
    } else {
      // API not available
      updateStatus.className = "update-toast error visible";
      updateStatus.textContent = "Update checking is not available";
      log.error("Update API not available");

      // Auto-hide after 3 seconds
      setTimeout(() => {
        updateStatus.classList.remove("visible");
      }, 3000);
    }
  } catch (error) {
    // Error occurred
    updateStatus.className = "update-toast error visible";
    updateStatus.textContent = `Error checking for updates: ${error.message}`;
    log.error(`Error checking for updates: ${error.message}`);

    // Auto-hide error after 5 seconds
    setTimeout(() => {
      updateStatus.classList.remove("visible");
    }, 5000);
  } finally {
    // Reset button state with original content
    checkUpdatesBtn.disabled = false;
    checkUpdatesBtn.innerHTML = originalButtonText;
  }
}

/**
 * Initialize domain logging functionality
 */
function initializeDomainLogging() {
  // Initialize the domain creation log when the modal is opened
  const newDomainBtn = document.getElementById("newDomainBtn");
  if (newDomainBtn) {
    newDomainBtn.addEventListener("click", function () {
      // Initialize the log box with a slight delay to ensure DOM is ready
      setTimeout(() => {
        domainLogging.initDomainCreationLog();
        domainLogging.clearDomainLog();
        domainLogging.addDomainLog("Domain creation log initialized", "info");
        domainLogging.addDomainLog(
          "Ready to create a new Virtualmin domain",
          "debug"
        );
      }, 100);
    });
  }

  // Add listeners for PHP configuration changes
  const phpModeSelect = document.getElementById("phpModeSelect");
  const phpVersionSelect = document.getElementById("phpVersionSelect");

  if (phpModeSelect) {
    phpModeSelect.addEventListener("change", function () {
      domainLogging.addDomainLog(`PHP mode changed to: ${this.value}`, "debug");
    });
  }

  if (phpVersionSelect) {
    phpVersionSelect.addEventListener("change", function () {
      domainLogging.addDomainLog(
        `PHP version changed to: ${this.value}`,
        "debug"
      );
    });
  }

  log.debug("Domain logging initialized");
}

/**
 * Initialize the debug panel as a modal
 */
function initializeDebugPanel() {
  // Get debug modal elements
  const debugModal = document.getElementById("debugModal");
  const closeDebugModalBtn = document.getElementById("closeDebugModalBtn");
  const logLevelSelect = document.getElementById("logLevelSelect");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const downloadLogsBtn = document.getElementById("downloadLogsBtn");

  // Add keyboard shortcut (Ctrl+D) to toggle debug modal
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "d") {
      event.preventDefault();
      if (debugModal) {
        debugModal.style.display =
          debugModal.style.display === "none" ? "block" : "none";
      }
    }
  });

  // Close button event
  if (closeDebugModalBtn) {
    closeDebugModalBtn.addEventListener("click", () => {
      if (debugModal) debugModal.style.display = "none";
    });
  }

  // Click outside to close
  if (debugModal) {
    debugModal.addEventListener("click", (event) => {
      if (event.target === debugModal) {
        debugModal.style.display = "none";
      }
    });
  }

  // Log level selector
  if (logLevelSelect) {
    // Set initial value from current log level
    logLevelSelect.value = log.getLogLevel();

    logLevelSelect.addEventListener("change", function () {
      const level = parseInt(this.value, 10);
      log.setLogLevel(level);
      log.info(`Log level set to: ${level}`);
    });
  }

  // Clear logs button
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", function () {
      const logOutput = document.getElementById("logOutput");
      if (logOutput) {
        logOutput.innerHTML = "";
      }
      log.clearHistory();
      log.info("Logs cleared");
    });
  }

  // Download logs button
  if (downloadLogsBtn) {
    downloadLogsBtn.addEventListener("click", function () {
      const logOutput = document.getElementById("logOutput");
      if (!logOutput) return;

      // Get all log entries
      const logEntries = logOutput.querySelectorAll(".log-entry");
      if (logEntries.length === 0) {
        log.warn("No logs to download");
        return;
      }

      // Create log content
      const logContent = Array.from(logEntries)
        .map((entry) => entry.textContent)
        .join("\n");

      // Create download link
      const blob = new Blob([logContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      // Set download filename with date/time
      const date = new Date();
      const dateStr = date
        .toISOString()
        .replace(/[^0-9]/g, "_")
        .slice(0, 19);
      a.download = `streamnet_logs_${dateStr}.txt`;

      a.href = url;
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      log.info("Logs downloaded");
    });
  }

  // Initialize log display in the debug panel
  const logOutput = document.getElementById("logOutput");
  if (logOutput) {
    // Add initial message
    logOutput.innerHTML =
      "<div class='log-entry'>Debug console initialized</div>";

    // Create a function to display new logs
    const displayLog = (level, message) => {
      const entry = document.createElement("div");
      entry.className = `log-entry log-level-${level.toLowerCase()}`;
      entry.textContent = `[${level}] ${message}`;
      logOutput.appendChild(entry);
      logOutput.scrollTop = logOutput.scrollHeight;
    };

    // Override console methods to capture logs
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    console.log = function (...args) {
      originalConsole.log(...args);
      try {
        displayLog("LOG", args.join(" "));
      } catch (e) {}
    };

    console.info = function (...args) {
      originalConsole.info(...args);
      try {
        displayLog("INFO", args.join(" "));
      } catch (e) {}
    };

    console.warn = function (...args) {
      originalConsole.warn(...args);
      try {
        displayLog("WARN", args.join(" "));
      } catch (e) {}
    };

    console.error = function (...args) {
      originalConsole.error(...args);
      try {
        displayLog("ERROR", args.join(" "));
      } catch (e) {}
    };

    console.debug = function (...args) {
      originalConsole.debug(...args);
      try {
        displayLog("DEBUG", args.join(" "));
      } catch (e) {}
    };
  }

  log.debug("Debug panel initialized");
}

// Add click handler to close the toast notification when clicked
document.addEventListener("DOMContentLoaded", () => {
  const updateStatus = document.getElementById("updateStatus");
  if (updateStatus) {
    updateStatus.addEventListener("click", () => {
      updateStatus.classList.remove("visible");
    });
  }
});

// Listen for error events
window.addEventListener("error", (event) => {
  log.error(
    `Global error caught: ${event.error?.message || event.message}`,
    event.error
  );

  // Also add to domain log if modal is open
  const domainModal = document.getElementById("domainModal");
  if (domainModal && domainModal.style.display === "block") {
    domainLogging.addDomainLog(
      `Error: ${event.error?.message || event.message}`,
      "error"
    );
  }
});

// Export key modules for console debugging
window.app = {
  log,
  moduleSelection,
  domainManagement,
  dnsHandling,
  dnsPreview,
  transfer,
  uiHelpers,
  domainLogging,
};
