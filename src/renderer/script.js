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

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  log.info("Application initializing");

  // Load domain folders
  domainManagement.loadDomainFolders();

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

  // Initialize DNS form
  dnsHandling.initDnsForm();

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

  // Initial call to set the button state
  uiHelpers.updateTransferButton();

  // Add domain refresh button handler
  const refreshDomainsBtn = document.getElementById("refreshDomainsBtn");
  if (refreshDomainsBtn) {
    refreshDomainsBtn.addEventListener(
      "click",
      domainManagement.refreshDomainsList
    );
  }

  // Initialize debug panel toggle
  initializeDebugPanel();

  log.info("Application initialized");
});

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

  log.debug("Module selection handlers initialized");
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
 * Initialize the debug panel
 */
function initializeDebugPanel() {
  // Add debug panel toggle
  const toggleDebugPanelBtn = document.getElementById("toggleDebugPanelBtn");
  const debugPanel = document.getElementById("debugPanel");
  const logLevelSelect = document.getElementById("logLevelSelect");
  const clearLogsBtn = document.getElementById("clearLogsBtn");

  // Add keyboard shortcut to toggle debug panel (Ctrl+D)
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "d") {
      event.preventDefault();
      if (debugPanel) {
        debugPanel.style.display =
          debugPanel.style.display === "none" ? "block" : "none";
      }
    }
  });

  // Button to toggle debug panel
  if (toggleDebugPanelBtn && debugPanel) {
    toggleDebugPanelBtn.addEventListener("click", function () {
      debugPanel.style.display = "none";
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

  // Initialize log display
  const logOutput = document.getElementById("logOutput");
  if (logOutput) {
    // Add initial message
    logOutput.innerHTML =
      "<div class='log-entry'>Debug panel initialized</div>";

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
      displayLog("LOG", args.join(" "));
    };

    console.info = function (...args) {
      originalConsole.info(...args);
      displayLog("INFO", args.join(" "));
    };

    console.warn = function (...args) {
      originalConsole.warn(...args);
      displayLog("WARN", args.join(" "));
    };

    console.error = function (...args) {
      originalConsole.error(...args);
      displayLog("ERROR", args.join(" "));
    };

    console.debug = function (...args) {
      originalConsole.debug(...args);
      displayLog("DEBUG", args.join(" "));
    };
  }

  log.debug("Debug panel initialized");
}

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
  transfer,
  uiHelpers,
  domainLogging,
};
