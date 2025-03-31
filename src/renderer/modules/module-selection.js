/**
 * Module selection functionality for StreamNet Panels
 */
import { showStatus, updateTransferButton } from "./ui-helpers.js";
import { log } from "../utils/logging.js";

// Selected modules and panels for transfer
const selectedItems = new Map();

// Module path mappings (could be moved to a configuration file)
const MODULE_PATHS = {
  // Panel paths
  cockpitpanel: {
    sourcePath: "cockpitpanel",
  },
  support: {
    api: "api/support",
    panel: "panel/support",
  },
  multiproxy: {
    api: "api/proxy",
    panel: "panel/proxy",
  },
  webviews: {
    api: "api/webview",
    panel: "panel/webview",
  },

  // OTT Applications
  xciptv: {
    api: "api/xciptv",
    panel: "panel/xciptv",
  },
  tivimate: {
    api: "api/tivimate",
    panel: "panel/tivimate",
  },
  smarterspro: {
    api: "api/smarterspro",
    panel: "panel/smarterspro",
  },
  ibo: {
    api: "api/ibo",
    panel: "panel/ibo",
  },
  neutro: {
    api: "api/neutro",
    panel: "panel/neutro",
  },
  neu: {
    api: "api/neu",
    panel: "panel/neu",
  },
  easy: {
    api: "api/easy",
    panel: "panel/easy",
  },
  sparkle: {
    api: "api/sparkle",
    panel: "panel/sparkle",
  },
  "1stream": {
    api: "api/1stream",
    panel: "panel/1stream",
  },
  "9xtream": {
    api: "api/9xtream",
    panel: "panel/9xtream",
  },

  // VOD Applications
  flixvision: {
    api: "api/flixvision",
    panel: "panel/flixvision",
  },
  smartube: {
    api: "api/smartube",
    panel: "panel/smartube",
  },
  stremio: {
    api: "api/stremio",
    panel: "panel/stremio",
  },

  // VPN Applications
  orvpn: {
    api: "api/orvpn",
    panel: "panel/orvpn",
  },
  ipvanish: {
    api: "api/ipvanish",
    panel: "panel/ipvanish",
  },
  pia: {
    api: "api/pia",
    panel: "panel/pia",
  },

  // STORE Applications
  downloader: {
    api: "api/downloader",
    panel: "panel/downloader",
  },
  sh9store: {
    api: "api/sh9store",
    panel: "panel/sh9store",
  },
};

/**
 * Initialize module checkboxes
 */
export function initializeModuleCheckboxes() {
  log.debug("Initializing module checkboxes");
  const checkboxes = document.querySelectorAll(".module-checkbox");

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        // Add to selected items
        const type = this.dataset.type;
        const name = this.dataset.name;

        if (type === "panel") {
          // Handle different panel types based on their structure in MODULE_PATHS
          if (name === "cockpitpanel") {
            // Cockpit panel is still special with just sourcePath
            selectedItems.set(name, {
              type: "panel",
              name: name,
              sourcePath: MODULE_PATHS[name].sourcePath,
            });
          } else if (MODULE_PATHS[name]?.api && MODULE_PATHS[name]?.panel) {
            // Support and MultiProxy panels now have both API and panel components
            selectedItems.set(`${name}-api`, {
              type: "module-api",
              name: `${name} API`,
              sourcePath: MODULE_PATHS[name].api,
            });

            selectedItems.set(`${name}-panel`, {
              type: "module-panel",
              name: `${name} Panel`,
              sourcePath: MODULE_PATHS[name].panel,
            });
          }
        } else if (type === "module") {
          // For modules that have both API and panel components
          if (MODULE_PATHS[name]) {
            selectedItems.set(`${name}-api`, {
              type: "module-api",
              name: `${name} API`,
              sourcePath: MODULE_PATHS[name].api,
            });

            selectedItems.set(`${name}-panel`, {
              type: "module-panel",
              name: `${name} Panel`,
              sourcePath: MODULE_PATHS[name].panel,
            });
          }
        }
      } else {
        // Remove from selected items
        const name = this.dataset.name;
        const type = this.dataset.type;

        if (type === "panel") {
          if (name === "cockpitpanel") {
            selectedItems.delete(name);
          } else {
            // Support and MultiProxy panels now have both API and panel components
            selectedItems.delete(`${name}-api`);
            selectedItems.delete(`${name}-panel`);
          }
        } else if (type === "module") {
          selectedItems.delete(`${name}-api`);
          selectedItems.delete(`${name}-panel`);
        }
      }

      updateSelectedCount();
      updateTransferButton();
    });
  });
}

/**
 * Update the selected count display
 */
export function updateSelectedCount() {
  const selectedCount = document.getElementById("selectedCount");
  if (!selectedCount) return;

  const count = selectedItems.size;
  log.debug(`Selected items count: ${count}`);
  selectedCount.textContent = `${count} item${count !== 1 ? "s" : ""} selected`;
}

/**
 * Select all modules
 */
export function selectAllModulesHandler() {
  log.info("Selecting all modules");
  const moduleCheckboxes = document.querySelectorAll(
    '.module-checkbox[data-type="module"]'
  );

  moduleCheckboxes.forEach((checkbox) => {
    if (!checkbox.checked) {
      checkbox.checked = true;

      // Trigger the change event manually
      const event = new Event("change");
      checkbox.dispatchEvent(event);
    }
  });

  showStatus("info", "All modules selected");
}

/**
 * Select all panels
 */
export function selectAllPanelsHandler() {
  log.info("Selecting all panels");
  const panelCheckboxes = document.querySelectorAll(
    '.module-checkbox[data-type="panel"]'
  );

  panelCheckboxes.forEach((checkbox) => {
    if (!checkbox.checked) {
      checkbox.checked = true;

      // Trigger the change event manually
      const event = new Event("change");
      checkbox.dispatchEvent(event);
    }
  });

  showStatus("info", "All panels selected");
}

/**
 * Unselect all panels
 */
export function unselectAllPanelsHandler() {
  log.info("Unselecting all panels");
  const panelCheckboxes = document.querySelectorAll(
    '.module-checkbox[data-type="panel"]'
  );

  panelCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      checkbox.checked = false;

      // Trigger the change event manually
      const event = new Event("change");
      checkbox.dispatchEvent(event);
    }
  });

  showStatus("info", "All panels unselected");
}

/**
 * Unselect all modules and panels
 */
export function unselectAllModulesHandler() {
  log.info("Unselecting all modules");
  const allCheckboxes = document.querySelectorAll(".module-checkbox");

  allCheckboxes.forEach((checkbox) => {
    if (checkbox.checked) {
      checkbox.checked = false;

      // Trigger the change event manually
      const event = new Event("change");
      checkbox.dispatchEvent(event);
    }
  });

  selectedItems.clear();
  updateSelectedCount();
  updateTransferButton();

  showStatus("info", "All selections cleared");
}

/**
 * Clear all selections
 */
export function clearAllSelections() {
  log.info("Clearing all selections");
  // Uncheck all checkboxes
  const checkboxes = document.querySelectorAll(".module-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Clear the selectedItems map
  selectedItems.clear();

  // Update the selected count display
  updateSelectedCount();

  // Update transfer button state
  updateTransferButton();

  log.debug("All selections cleared");
}

/**
 * Get the currently selected items for transfer
 * @returns {Map} Map of selected items
 */
export function getSelectedItems() {
  return selectedItems;
}

// Export default module or specific functions
export default {
  initializeModuleCheckboxes,
  updateSelectedCount,
  selectAllModulesHandler,
  unselectAllModulesHandler,
  clearAllSelections,
  getSelectedItems,
  MODULE_PATHS,
};
