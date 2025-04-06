import {
  getModuleDisplayName,
  getModuleIcon,
  findModuleNameFromDisplayName,
} from "../config/module-config.js";

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

  // Function to create module HTML
  const createModuleHtml = (moduleName, displayName) => {
    const iconFileName = getModuleIcon(moduleName);
    const iconPath = `src/icons/${iconFileName}.png`;

    return `
      <div class="selected-item installed-module" title="${moduleName}">
        <span class="selected-item-icon module-icon">
          <img src="${iconPath}" alt="${displayName}" class="icon-image" 
               onerror="this.onerror=null; this.src='src/icons/module.png';">
        </span>
        <span class="selected-item-name module-name">${displayName}</span>
      </div>
    `;
  };

  // Create sets to track unique modules
  const mainPanelSet = new Set(); // Cockpit panel
  const brandingSet = new Set(); // Support, Branding
  const regularModulesSet = new Set(); // All other modules

  // Arrays to hold the actual items for rendering
  const mainPanel = [];
  const brandingModules = [];
  const regularModules = [];

  // Process all selected items
  selectedItems.forEach((item) => {
    const moduleName = item.name?.toLowerCase() || "";
    const modulePath = item.path?.toLowerCase() || "";

    // Extract base module name (remove API/Panel suffixes)
    let baseModuleName = moduleName.replace(/\s+api|\s+panel/gi, "");

    // Check for cockpitpanel
    if (
      item.isCockpitPanel ||
      moduleName === "cockpitpanel" ||
      modulePath.includes("cockpitpanel")
    ) {
      if (!mainPanelSet.has("cockpitpanel")) {
        mainPanelSet.add("cockpitpanel");
        mainPanel.push(item);
      }
    }
    // Check for support or branding modules
    else if (moduleName === "support" || moduleName.includes("support")) {
      if (!brandingSet.has("support")) {
        brandingSet.add("support");
        brandingModules.push(item);
      }
    } else if (moduleName === "branding" || moduleName.includes("branding")) {
      if (!brandingSet.has("branding")) {
        brandingSet.add("branding");
        brandingModules.push(item);
      }
    }
    // All other modules
    else {
      if (!regularModulesSet.has(baseModuleName)) {
        regularModulesSet.add(baseModuleName);
        regularModules.push(item);
      }
    }
  });

  // Start the domain analysis HTML structure
  let html = '<div class="domain-analysis">';

  // Calculate total logical items - using set sizes to ensure unique counting
  const totalLogicalItems =
    mainPanelSet.size + brandingSet.size + regularModulesSet.size;

  // Add count status message
  html += `<div class="analysis-status success">Selected ${totalLogicalItems} item${
    totalLogicalItems !== 1 ? "s" : ""
  } for transfer</div>`;

  // Create Main Panel section if applicable
  if (mainPanel.length > 0) {
    html += '<h4 class="analysis-title">Main Panel:</h4>';
    html +=
      '<div class="selected-items-grid installed-modules main-panel-section">';

    mainPanel.forEach((item) => {
      html += createModuleHtml("cockpitpanel", "Cockpit Panel");
    });

    html += "</div>";
  }

  // Create Brandings section if applicable
  if (brandingModules.length > 0) {
    html += '<h4 class="analysis-title">Brandings:</h4>';
    html +=
      '<div class="selected-items-grid installed-modules brandings-section">';

    // Display unique branding modules
    const renderedBrandings = new Set();
    brandingModules.forEach((item) => {
      const moduleName = item.name
        .toLowerCase()
        .replace(/\s+panel|\s+api/gi, "");
      if (!renderedBrandings.has(moduleName)) {
        renderedBrandings.add(moduleName);
        html += createModuleHtml(moduleName, getModuleDisplayName(moduleName));
      }
    });

    html += "</div>";
  }

  // Create Installed Modules section if applicable
  if (regularModules.length > 0) {
    html += '<h4 class="analysis-title">Selected Modules:</h4>';
    html +=
      '<div class="selected-items-grid installed-modules regular-modules-section">';

    // Group modules by their base name to avoid duplicates (e.g., "xciptv API" and "xciptv Panel")
    const uniqueModules = new Map();

    regularModules.forEach((item) => {
      let baseName = item.name;
      if (baseName.includes(" API")) {
        baseName = baseName.replace(" API", "");
      } else if (baseName.includes(" Panel")) {
        baseName = baseName.replace(" Panel", "");
      }

      if (!uniqueModules.has(baseName)) {
        uniqueModules.set(baseName, true);
        html += createModuleHtml(
          baseName.toLowerCase(),
          getModuleDisplayName(baseName)
        );
      }
    });

    html += "</div>";
  }

  html += "</div>";

  // Update the preview container
  previewContainer.innerHTML = html;
}

export default {
  updateSelectedModulesPreview,
};
