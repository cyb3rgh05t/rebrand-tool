/**
 * Module selection functionality for StreamNet Panels
 */
import { showStatus, updateTransferButton } from "./ui-helpers.js";
import { log } from "../utils/logging.js";
import { updateSelectedModulesPreview } from "./selected-modules-preview.js";
import { MODULES, getModulePaths } from "../config/module-config.js";

// Selected modules and panels for transfer
const selectedItems = new Map();

// Module path mappings (imported from centralized config)
const MODULE_PATHS = getModulePaths();

export { MODULE_PATHS };

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
            // Cockpit panel is special - it's placed directly in public_html root
            const path = this.dataset.source || "cockpitpanel";
            selectedItems.set(name, {
              type: "panel",
              name: name,
              path: path, // Ensure path is explicitly set
              isCockpitPanel: true, // Special flag for cockpit panel
            });
            log.debug(
              `Added cockpit panel with path ${path} - will be placed directly in public_html`
            );
          } else if (MODULE_PATHS[name]) {
            // Support and MultiProxy panels have both API and panel components
            const apiPath = MODULE_PATHS[name].api;
            const panelPath = MODULE_PATHS[name].panel;

            if (apiPath) {
              selectedItems.set(`${name}-api`, {
                type: "module-api",
                name: `${name} API`,
                path: apiPath, // Explicit path
              });
              log.debug(`Added panel API ${name} with path ${apiPath}`);
            }

            if (panelPath) {
              selectedItems.set(`${name}-panel`, {
                type: "module-panel",
                name: `${name} Panel`,
                path: panelPath, // Explicit path
              });
              log.debug(`Added panel UI ${name} with path ${panelPath}`);
            }
          } else {
            // Fallback for unknown panel type
            log.warn(`Unknown panel type: ${name}, no path mapping found`);
          }
        } else if (type === "module") {
          // For modules that have both API and panel components
          if (MODULE_PATHS[name]) {
            const apiPath = MODULE_PATHS[name].api;
            const panelPath = MODULE_PATHS[name].panel;

            if (apiPath) {
              selectedItems.set(`${name}-api`, {
                type: "module-api",
                name: `${name} API`,
                path: apiPath, // Explicit path
              });
              log.debug(`Added module API ${name} with path ${apiPath}`);
            }

            if (panelPath) {
              selectedItems.set(`${name}-panel`, {
                type: "module-panel",
                name: `${name} Panel`,
                path: panelPath, // Explicit path
              });
              log.debug(`Added module UI ${name} with path ${panelPath}`);
            }
          } else {
            // Log warning for unknown module
            log.warn(`Unknown module: ${name}, no path mapping found`);
          }
        }
      } else {
        // Remove from selected items
        const name = this.dataset.name;
        const type = this.dataset.type;

        if (type === "panel") {
          if (name === "cockpitpanel") {
            selectedItems.delete(name);
            log.debug(`Removed panel ${name}`);
          } else {
            // Support and MultiProxy panels now have both API and panel components
            selectedItems.delete(`${name}-api`);
            selectedItems.delete(`${name}-panel`);
            log.debug(`Removed panel components for ${name}`);
          }
        } else if (type === "module") {
          selectedItems.delete(`${name}-api`);
          selectedItems.delete(`${name}-panel`);
          log.debug(`Removed module components for ${name}`);
        }
      }

      updateSelectedCount();
      updateTransferButton();

      // Update the modules preview in the destination panel
      updateSelectedModulesPreview(selectedItems);
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

  // Update the modules preview
  updateSelectedModulesPreview(selectedItems);
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

  // Update the modules preview
  updateSelectedModulesPreview(selectedItems);
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

  // Update the modules preview
  updateSelectedModulesPreview(selectedItems);
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

  // Update the modules preview
  updateSelectedModulesPreview(selectedItems);

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

  // Update the modules preview
  updateSelectedModulesPreview(selectedItems);

  log.debug("All selections cleared");
}

/**
 * Get the currently selected items for transfer
 * @returns {Map} Map of selected items
 */
export function getSelectedItems() {
  // Debug log all selected items to verify paths are properly set
  if (selectedItems.size > 0) {
    log.debug(`Selected items for transfer (${selectedItems.size}):`);
    for (const [key, item] of selectedItems.entries()) {
      if (item.isCockpitPanel) {
        log.debug(
          `- ${key}: ${item.name} (${item.path}) - will be placed in public_html root`
        );
      } else {
        log.debug(`- ${key}: ${item.name} (${item.path})`);
      }
    }
  }

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
