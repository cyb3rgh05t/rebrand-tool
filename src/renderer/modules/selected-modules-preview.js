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

  // Get module icons mapping - same as in domain-analyzer.js
  const iconMap = {
    // Panels
    cockpitpanel: "rebrands",
    support: "telegram",
    multiproxy: "multi",
    webviews: "android",

    // OTT Applications
    xciptv: "xciptv",
    tivimate: "tivimate",
    smarterspro: "smarters",
    ibo: "ibosol",
    neutro: "neutro",
    neu: "pneu",
    easy: "peasy",
    sparkle: "sparkle",
    "1stream": "1stream",
    "9xtream": "9xtream",

    // VOD Applications
    flixvision: "flixvision",
    smarttube: "smarttube",
    stremio: "stremio",

    // VPN Applications
    orvpn: "orvpn",
    ipvanish: "ipvanish",
    pia: "pia",

    // STORE Applications
    downloader: "downloader",
    sh9store: "sh9",
  };

  // Return early with empty message if no items selected
  if (selectedItems.size === 0) {
    previewContainer.innerHTML =
      '<div class="empty-section-message">No modules selected for transfer</div>';
    return;
  }

  // Group items by type for better organization
  const groupedItems = {
    panels: [],
    apis: [],
    modules: [],
  };

  // Process all selected items
  selectedItems.forEach((item) => {
    if (item.isCockpitPanel || item.type === "panel") {
      groupedItems.panels.push(item);
    } else if (item.type === "module-api") {
      groupedItems.apis.push(item);
    } else if (item.type === "module-panel") {
      groupedItems.modules.push(item);
    }
  });

  // Start the domain analysis HTML structure
  let html = '<div class="domain-analysis">';

  // Calculate a more intuitive count (treat both API and Panel of same module as 1 item)
  // First count unique panels
  const panelsCount = groupedItems.panels.length;

  // Then count unique modules (without counting API and Panel separately)
  const uniqueModulesCount = new Set(
    [...groupedItems.apis, ...groupedItems.modules].map((item) => {
      // Extract base name from "xciptv API" or "xciptv Panel"
      let baseName = item.name;
      if (baseName.includes(" API")) {
        baseName = baseName.replace(" API", "");
      } else if (baseName.includes(" Panel")) {
        baseName = baseName.replace(" Panel", "");
      }
      return baseName;
    })
  ).size;

  // Sum for total logical items
  const totalLogicalItems = panelsCount + uniqueModulesCount;

  // Add count status message
  html += `<div class="analysis-status success">Selected ${totalLogicalItems} item${
    totalLogicalItems !== 1 ? "s" : ""
  } for transfer</div>`;

  // Create preview content for panels
  if (groupedItems.panels.length > 0) {
    html += '<h4 class="analysis-title">Selected Panels:</h4>';
    html += '<div class="selected-items-grid installed-modules">';

    // Display panel modules
    groupedItems.panels.forEach((item) => {
      const moduleName = item.name;
      const iconFileName = iconMap[moduleName] || "module";
      const iconPath = `src/icons/${iconFileName}.png`;
      const displayName = item.isCockpitPanel
        ? "Cockpit Panel"
        : getModuleDisplayName(moduleName);

      html += `
          <div class="selected-item installed-module" title="${moduleName}">
            <span class="selected-item-icon module-icon">
              <img src="${iconPath}" alt="${displayName}" class="icon-image" 
                   onerror="this.onerror=null; this.src='src/icons/module.png';">
            </span>
            <span class="selected-item-name module-name">${displayName}</span>
          </div>
        `;
    });

    html += "</div>";
  }

  // Add modules section if any modules selected
  const allModules = [...groupedItems.apis, ...groupedItems.modules];
  if (allModules.length > 0) {
    // Get unique module names (without -api or -panel suffix)
    const uniqueModules = new Map(); // Use Map to track names and deduplicate

    allModules.forEach((item) => {
      // Extract base name from "xciptv API" or "xciptv Panel"
      let baseName = item.name;
      if (baseName.includes(" API")) {
        baseName = baseName.replace(" API", "");
      } else if (baseName.includes(" Panel")) {
        baseName = baseName.replace(" Panel", "");
      }

      // Only add each module once
      if (!uniqueModules.has(baseName)) {
        uniqueModules.set(baseName, true);
      }
    });

    html += '<h4 class="analysis-title">Selected Modules:</h4>';
    html += '<div class="selected-items-grid installed-modules">';

    uniqueModules.forEach((_, moduleName) => {
      const iconFileName = iconMap[moduleName.toLowerCase()] || "module";
      const iconPath = `src/icons/${iconFileName}.png`;
      const displayName = getModuleDisplayName(moduleName);

      html += `
          <div class="selected-item installed-module" title="${moduleName}">
            <span class="selected-item-icon module-icon">
              <img src="${iconPath}" alt="${displayName}" class="icon-image" 
                   onerror="this.onerror=null; this.src='src/icons/module.png';">
            </span>
            <span class="selected-item-name module-name">${displayName}</span>
          </div>
        `;
    });

    html += "</div>";
  }

  html += "</div>";

  // Update the preview container
  previewContainer.innerHTML = html;
}

/**
 * Helper function to get a friendly display name for a module
 * @param {string} moduleName Module name
 * @returns {string} Display name
 */
function getModuleDisplayName(moduleName) {
  // Map of module names to display names - same as in domain-analyzer.js
  const displayNames = {
    cockpitpanel: "Cockpit Panel",
    support: "Support",
    multiproxy: "MultiProxy",
    webviews: "WebViews",
    xciptv: "XCIPTV",
    tivimate: "TiviMate",
    smarterspro: "Smarters Pro",
    ibo: "IBO",
    neutro: "Neutro",
    neu: "Purple Neu",
    easy: "Purple Easy",
    sparkle: "Sparkle",
    "1stream": "1Stream",
    "9xtream": "9Xtream",
    flixvision: "FlixVision",
    smarttube: "SmartTube",
    stremio: "Stremio",
    orvpn: "ORVPN",
    ipvanish: "IPVanish",
    pia: "PIA",
    downloader: "Downloader",
    sh9store: "SH9 Store",
  };

  return displayNames[moduleName] || moduleName;
}

export default {
  updateSelectedModulesPreview,
};
