/**
 * Module version management for StreamNet Panels - All versions set to 2.5.0
 */
import { log } from "../utils/logging.js";

// Define version information for all modules - all set to 2.5.0
const MODULE_VERSIONS = {
  // Panels
  cockpitpanel: "2.5.1",
  branding: "1.0.0",
  support: "1.0.0",
  multiproxy: "2.5.1",
  webviews: "2.5.1",

  // OTT Applications
  xciptv: "2.5.1",
  tivimate: "2.5.1",
  smarterspro: "2.5.1",
  ibo: "2.5.1",
  nextv: "2.5.0",
  neutro: "2.5.1",
  neu: "2.5.0",
  easy: "2.5.0",
  sparkle: "2.5.1",
  "1stream": "2.5.0",
  "9xtream": "2.5.0",

  // VOD Applications
  flixvision: "2.5.1",
  smarttube: "2.5.0",
  stremio: "2.5.0",

  // VPN Applications
  orvpn: "2.5.1",
  ipvanish: "2.5.0",
  pia: "2.5.0",

  // STORE Applications
  downloader: "2.5.0",
  sh9store: "2.5.0",
};

/**
 * Initialize module version display for all elements
 */
export function initModuleVersions() {
  log.debug("Initializing module version display");

  // First, add the version CSS
  addVersionStyles();

  // Then add version numbers to module selection items
  addVersionsToModuleSelectionItems();

  // Set up mutation observer to handle dynamically added content
  setupMutationObserver();
}

/**
 * Add the version styles to the document - fixed for CSS compatibility
 */
function addVersionStyles() {
  // Check if styles are already added
  if (document.getElementById("module-version-styles")) return;

  // Create and add style element
  const styleElement = document.createElement("style");
  styleElement.id = "module-version-styles";
  styleElement.textContent = `
    /* Module Version Display Styles - Fixed for compatibility */
    .module-version {
      display: block;
      font-size: 0.7rem;
      color: var(--text-muted, #888);
      margin-top: 2px;
      font-weight: normal;
      line-height: 1;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Position the module name for version */
    .module-name {
      /* Keep original properties but add: */
      padding-bottom: 16px !important;
      position: relative !important;
    }
    
    /* Position the version span */
    .module-name .module-version {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
    
    /* Remove versions for domain analysis items */
    .domain-analysis .installed-module .module-name {
      /* Reset padding so there's no empty space */
      padding-bottom: 0 !important;
    }
    
    .domain-analysis .installed-module .module-version {
      display: none !important;
    }
    
    /* Handle transfer dialog items */
    .transfer-item .item-name {
      padding-bottom: 16px !important;
      position: relative !important;
    }
    
    .transfer-item .module-version {
      font-size: 0.65rem;
      position: absolute;
      bottom: 0;
      left: 0;
    }
    
    /* Handle selected items */
    .selected-item .selected-item-name {
      padding-bottom: 14px !important;
      position: relative !important;
    }
    
    .selected-item .module-version {
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      text-align: center;
    }
  `;

  document.head.appendChild(styleElement);
  log.debug("Module version styles added to document");
}

/**
 * Add version numbers to module selection items
 */
function addVersionsToModuleSelectionItems() {
  // Get all module labels
  const moduleLabels = document.querySelectorAll(".module-name");

  moduleLabels.forEach((label) => {
    // Skip if version span already exists
    if (label.querySelector(".module-version")) return;

    // Skip domain analysis items
    if (label.closest(".domain-analysis")) return;

    // Find the associated checkbox to get the module name
    const forAttr = label.getAttribute("for");
    if (!forAttr) return;

    const checkbox = document.getElementById(forAttr);
    if (!checkbox) return;

    const moduleName = checkbox.dataset.name;
    if (!moduleName) return;

    // Get the version for this module
    const version = MODULE_VERSIONS[moduleName] || "2.5.0";

    // Create version element
    const versionSpan = document.createElement("span");
    versionSpan.className = "module-version";
    versionSpan.textContent = version;

    // Add to label
    label.appendChild(versionSpan);
  });

  log.debug("Added version numbers to module selection items");

  // Add versions to transfer items but NOT domain analysis
  addVersionsToTransferItems();
}

/**
 * Set up a mutation observer to handle dynamically added content
 */
function setupMutationObserver() {
  // Check if observer already exists
  if (window.moduleVersionObserver) return;

  // Create a new observer
  const observer = new MutationObserver((mutations) => {
    let shouldUpdateVersions = false;

    // Check if any mutations added elements that might need versions
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Check if any added nodes might contain module elements
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            // Look for selectors that might contain module elements
            if (
              node.classList?.contains("selection-items") ||
              node.classList?.contains("transfer-item") ||
              node.querySelector?.(
                ".module-name:not(.domain-analysis .module-name)"
              ) ||
              node.querySelector?.(".transfer-item")
            ) {
              shouldUpdateVersions = true;
            }
          }
        });
      }
    });

    // Update versions if needed
    if (shouldUpdateVersions) {
      addVersionsToModuleSelectionItems();
      addVersionsToTransferItems();
    }
  });

  // Observe the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.moduleVersionObserver = observer;
  log.debug("Module version mutation observer set up");
}

/**
 * Add versions to transfer dialog items
 */
function addVersionsToTransferItems() {
  // Find all item name spans in the transfer dialog
  const itemNameSpans = document.querySelectorAll(".transfer-item .item-name");

  itemNameSpans.forEach((span) => {
    // Skip if already has version
    if (span.querySelector(".module-version")) return;

    // Get the module name from the text content
    const displayName = span.textContent.trim();

    // Find the corresponding module by looking up the display name
    const moduleName = findModuleNameFromDisplayName(displayName);

    if (moduleName) {
      // Get the version for this module
      const version = MODULE_VERSIONS[moduleName] || "2.5.0";

      // Create version element
      const versionSpan = document.createElement("span");
      versionSpan.className = "module-version";
      versionSpan.textContent = version;

      // Add to the item name span
      span.appendChild(versionSpan);
    }
  });
}

/**
 * Get the version for a specific module
 * @param {string} moduleName - The name of the module
 * @returns {string} The version of the module
 */
export function getModuleVersion(moduleName) {
  if (!moduleName) return "2.5.0";

  // Normalize module name by removing API, Panel suffixes and converting to lowercase
  const normalizedName = moduleName
    .replace(/\s*(API|Panel)$/i, "")
    .toLowerCase();

  return MODULE_VERSIONS[normalizedName] || "2.5.0";
}

/**
 * Find module name from its display name
 * @param {string} displayName - The display name of the module
 * @returns {string|null} The module name or null if not found
 */
function findModuleNameFromDisplayName(displayName) {
  // Define mapping of display names to module names
  const displayNameToModule = {
    "Cockpit Panel": "cockpitpanel",
    Branding: "branding",
    Support: "support",
    MultiProxy: "multiproxy",
    WebViews: "webviews",
    XCIPTV: "xciptv",
    TiviMate: "tivimate",
    "Smarters Pro": "smarterspro",
    IBO: "ibo",
    NexTV: "nextv",
    Neutro: "neutro",
    "Purple Neu": "neu",
    "Purple Easy": "easy",
    Sparkle: "sparkle",
    "1Stream": "1stream",
    "9Xtream": "9xtream",
    FlixVision: "flixvision",
    SmartTube: "smarttube",
    Stremio: "stremio",
    ORVPN: "orvpn",
    IPVanish: "ipvanish",
    PIA: "pia",
    Downloader: "downloader",
    "SH9 Store": "sh9store",
  };

  return displayNameToModule[displayName] || null;
}

/**
 * Enhance domain analyzer with versions - modified to NOT add versions
 * @param {Object} domainAnalyzer - The domain analyzer module
 */
export function enhanceDomainAnalyzer(domainAnalyzer) {
  // Since we now explicitly DON'T want versions in domain analysis,
  // we don't need to enhance the domain analyzer renderer.
  log.debug("Domain analyzer version display disabled as requested");
}

/**
 * Enhance transfer dialog with versions
 * @param {Object} transferDialog - The transfer dialog module
 */
export function enhanceTransferDialog(transferDialog) {
  // Enhance completeTransfer function
  if (transferDialog.completeTransfer) {
    const originalCompleteTransfer = transferDialog.completeTransfer;

    transferDialog.completeTransfer = function (...args) {
      // Call original function
      originalCompleteTransfer.apply(this, args);

      // Refresh versions after completion
      setTimeout(() => {
        addVersionsToTransferItems();
      }, 100);
    };
  }

  log.debug("Enhanced transfer dialog with version display");
}

/**
 * Update module versions in the selected modules preview
 * @param {Object} previewModule - The selected modules preview module
 */
export function enhanceSelectedModulesPreview(previewModule) {
  // Store reference to original update function
  const originalUpdate = previewModule.updateSelectedModulesPreview;

  // Replace with enhanced version
  previewModule.updateSelectedModulesPreview = function (selectedItems) {
    // Call original update function
    originalUpdate(selectedItems);

    // Add versions to the preview elements
    setTimeout(() => {
      const moduleNames = document.querySelectorAll(
        "#selectedModulesPreview .module-name"
      );

      moduleNames.forEach((span) => {
        // Skip if already has version
        if (span.querySelector(".module-version")) return;

        // Get module name
        const displayName = span.textContent.trim();
        const moduleName = findModuleNameFromDisplayName(displayName);

        if (moduleName) {
          // Add version span
          const version = MODULE_VERSIONS[moduleName] || "2.5.0";
          const versionSpan = document.createElement("span");
          versionSpan.className = "module-version";
          versionSpan.textContent = version;
          span.appendChild(versionSpan);
        }
      });
    }, 50);
  };

  log.debug("Enhanced selected modules preview with version display");
}

// Export the module
export default {
  initModuleVersions,
  getModuleVersion,
  enhanceDomainAnalyzer,
  enhanceTransferDialog,
  enhanceSelectedModulesPreview,
  MODULE_VERSIONS,
};
