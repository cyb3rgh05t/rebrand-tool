/**
 * Module version management for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import {
  MODULES, // Add direct import of MODULES
  getModuleVersions,
  getModuleVersion as getVersion,
} from "../config/module-config.js";

// Get version information for all modules from central config
const MODULE_VERSIONS = getModuleVersions();

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
    /* padding-bottom: 16px !important; */
    /* position: relative !important; */

    .transfer-item .item-name {
      padding-bottom: 0 !important;
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

  console.log("MODULE_VERSIONS:", MODULE_VERSIONS);

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

    // Get the version for this module - try both direct lookup and getter
    let version;
    // Try direct MODULES lookup first (most reliable)
    if (MODULES[moduleName.toLowerCase()]?.version) {
      version = MODULES[moduleName.toLowerCase()].version;
    } else {
      // Fall back to getter function
      version = getVersion(moduleName);
    }

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
      const version = getVersion(moduleName);

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
  return getVersion(moduleName);
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
          const version = getVersion(moduleName);
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
