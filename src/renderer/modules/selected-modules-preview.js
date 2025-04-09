import { MODULES } from "../config/module-config.js";

import { log } from "../utils/logging.js";

/**
 * Update the selected modules preview in the destination panel
 * Styled to match the domain analysis section
 *
 * @param {Map} selectedItems - Map of selected items from module-selection.js
 */
export function updateSelectedModulesPreview(selectedItems) {
  const previewContainer = document.getElementById("selectedModulesPreview");
  if (!previewContainer) return;

  // Clear current preview
  previewContainer.innerHTML = "";

  // Return early with empty message if no items selected
  if (selectedItems.size === 0) {
    previewContainer.innerHTML =
      '<div class="empty-section-message">No modules selected for transfer</div>';
    return;
  }

  // Mapping to handle module name variations and categorization
  const MODULE_CATEGORIES = {
    mainPanel: ["cockpitpanel"],
    brandings: ["support", "branding"],
    webviews: ["webviews", "plexwebview"],
    regularModules: [],
  };

  // Mapping to handle module name variations
  const MODULE_NAME_MAP = {
    cockpitpanel: "cockpitpanel",
    "cockpit panel": "cockpitpanel",
    support: "support",
    branding: "branding",
    webviews: "webviews",
    webview: "webviews",
    plexwebview: "plexwebview",
    "plex webview": "plexwebview",
  };

  // Function to resolve module name and version
  const resolveModule = (name, path) => {
    // Normalize name
    const normalizedName = name.toLowerCase().replace(/\s+api|\s+panel/gi, "");

    // Try direct mapping first
    if (MODULE_NAME_MAP[normalizedName]) {
      const moduleName = MODULE_NAME_MAP[normalizedName];
      const moduleConfig = MODULES[moduleName];

      return {
        name: moduleName,
        displayName: moduleConfig?.displayName || name,
        version: moduleConfig?.version || null,
        category: findModuleCategory(moduleName),
        icon: moduleConfig?.icon,
      };
    }

    // Fallback for other modules
    const moduleConfig = MODULES[normalizedName];
    return {
      name: normalizedName,
      displayName: moduleConfig?.displayName || name,
      version: moduleConfig?.version || null,
      category: findModuleCategory(normalizedName),
      icon: moduleConfig?.icon,
    };
  };

  // Find module category
  const findModuleCategory = (moduleName) => {
    for (const [category, modules] of Object.entries(MODULE_CATEGORIES)) {
      if (modules.includes(moduleName)) return category;
    }
    return "regularModules";
  };

  // Collect unique modules by category
  const categorizedModules = {
    mainPanel: new Map(),
    brandings: new Map(),
    webviews: new Map(),
    regularModules: new Map(),
  };

  // Process selected items
  selectedItems.forEach((item) => {
    const moduleName = item.name || "";
    const modulePath = item.path || "";

    const resolvedModule = resolveModule(moduleName, modulePath);

    // Use the resolved name as the key to prevent duplicates
    if (!categorizedModules[resolvedModule.category].has(resolvedModule.name)) {
      categorizedModules[resolvedModule.category].set(
        resolvedModule.name,
        resolvedModule
      );
    }
  });

  // Start rendering
  let html = '<div class="domain-analysis">';

  // Total items calculation
  const totalItems = Object.values(categorizedModules).reduce(
    (total, category) => total + category.size,
    0
  );

  html += `<div class="analysis-status success">Selected ${totalItems} item${
    totalItems !== 1 ? "s" : ""
  } for transfer</div>`;

  // Render each category
  const categoryTitles = {
    mainPanel: "Main Panel",
    brandings: "Brandings",
    webviews: "WebViews",
    regularModules: "Selected Modules",
  };

  Object.entries(categorizedModules).forEach(([category, modules]) => {
    if (modules.size > 0) {
      html += `<h4 class="analysis-title">${categoryTitles[category]}:</h4>`;
      html += `<div class="selected-items-grid installed-modules ${category}-section">`;

      modules.forEach((module) => {
        // Debug log
        log.debug(
          `Rendering module: ${module.name}, Version: ${module.version}`
        );

        html += `
          <div class="selected-item installed-module" style="position: relative; padding-bottom: 20px;">
            <span class="selected-item-icon module-icon">
              <img src="src/icons/${module.icon}.png" 
                   alt="${module.displayName}" 
                   class="icon-image" 
                   onerror="this.onerror=null; this.src='src/icons/module.png';">
            </span>
            <span class="selected-item-name module-name" style="display: block; text-align: center;">
              ${module.displayName}
            </span>
            ${
              module.version
                ? `
              <div style="
                position: absolute;
                bottom: 2px;
                left: 0;
                right: 0;
                text-align: center;
                color: var(--text-secondary, #888);
                font-size: 10px;
                padding: 3px; 
                margin: 0 2px;
              ">
                v${module.version}
              </div>
            `
                : ""
            }
          </div>
        `;
      });

      html += "</div>";
    }
  });

  html += "</div>";

  // Update the preview container
  previewContainer.innerHTML = html;
}

export default {
  updateSelectedModulesPreview,
};
