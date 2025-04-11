/**
 * Transfer Success Dialog for StreamNet Panels
 * Displays a summary of transferred modules, domain info, and DNS status
 */
import { log } from "../utils/logging.js";
import {
  MODULES,
  getModuleIcon,
  getModuleDisplayName,
  getModuleVersion,
} from "../config/module-config.js";

// Track whether dialog has been created
let dialogCreated = false;

/**
 * Initialize the transfer success dialog
 */
export function initTransferSuccessDialog() {
  // Only create dialog once
  if (dialogCreated) return;

  log.debug("Initializing transfer success dialog");

  // Create the dialog element
  createDialogElement();

  // Set up event listeners
  setupEventListeners();

  dialogCreated = true;
}

/**
 * Create the transfer success dialog DOM element
 */
function createDialogElement() {
  // Create dialog container
  const dialogHTML = `
    <div id="transferSuccessDialog" class="modal transfer-success-modal">
      <div class="modal-content transfer-success-content">
        <div class="success-banner">
          <div class="success-icon">✓</div>
          <h2>Transfer Completed Successfully!</h2>
        </div>
        
        <div class="domain-section">
          <h3>Your domain is ready</h3>
          <div class="domain-card">
            <div class="domain-name" id="transferSuccessDomainName">example.streamnet.live</div>
            <button class="domain-button" id="openDomainButton">
              <span class="domain-button-icon">🌐</span>
              Open Domain
            </button>
          </div>
          
          <div class="dns-badge" id="dnsSuccessBadge" style="display: none;">
            <span class="dns-badge-icon">✓</span>
            DNS records created successfully
          </div>
        </div>
        
        <div class="modules-section">
          <h3>Transferred Items</h3>
          <div id="transferredModulesContainer" class="transferred-modules-container">
            <!-- Module categories will be inserted here dynamically -->
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="action-button primary" id="transferSuccessDoneButton">Done</button>
        </div>
      </div>
    </div>
  `;

  // Create container element
  const container = document.createElement("div");
  container.innerHTML = dialogHTML.trim();

  // Append to body
  document.body.appendChild(container.firstChild);

  log.debug("Transfer success dialog element created");
}

/**
 * Set up event listeners for the dialog
 */
function setupEventListeners() {
  // Done button handler
  const doneButton = document.getElementById("transferSuccessDoneButton");
  if (doneButton) {
    doneButton.addEventListener("click", hideTransferSuccessDialog);
  }

  // Open domain button - will be set up when the dialog is shown with specific domain data

  // Close on escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const dialog = document.getElementById("transferSuccessDialog");
      if (dialog && dialog.style.display === "block") {
        hideTransferSuccessDialog();
      }
    }
  });

  // Close when clicking outside of content
  const dialog = document.getElementById("transferSuccessDialog");
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        hideTransferSuccessDialog();
      }
    });
  }

  log.debug("Transfer success dialog event listeners initialized");
}

/**
 * Show the transfer success dialog with domain and module data
 * @param {Object} domainInfo Domain information and transferred items
 */
export function showTransferSuccessDialog(domainInfo) {
  // Initialize dialog if not already created
  if (!dialogCreated) {
    initTransferSuccessDialog();
  }

  const dialog = document.getElementById("transferSuccessDialog");
  const domainNameElement = document.getElementById(
    "transferSuccessDomainName"
  );
  const dnsSuccessBadge = document.getElementById("dnsSuccessBadge");
  const transferredModulesContainer = document.getElementById(
    "transferredModulesContainer"
  );
  const openDomainButton = document.getElementById("openDomainButton");

  if (
    !dialog ||
    !domainNameElement ||
    !transferredModulesContainer ||
    !openDomainButton
  ) {
    log.error("Required dialog elements not found");
    return;
  }

  log.info("Showing transfer success dialog");

  // Update domain name
  const domain =
    domainInfo.domain ||
    (domainInfo.subdomain && domainInfo.rootDomain
      ? `${domainInfo.subdomain}.${domainInfo.rootDomain}`
      : "your domain");
  domainNameElement.textContent = domain;

  // Show DNS badge if DNS records were created
  if (dnsSuccessBadge) {
    dnsSuccessBadge.style.display = domainInfo.dnsCreated ? "flex" : "none";
  }

  // Set up domain open button
  if (openDomainButton) {
    // Clear previous event listeners
    const newOpenButton = openDomainButton.cloneNode(true);
    openDomainButton.parentNode.replaceChild(newOpenButton, openDomainButton);

    // Add new event listener
    newOpenButton.addEventListener("click", () => {
      log.info(`Opening domain in browser: ${domain}`);
      const url = `http://${domain}`;

      if (window.streamNetAPI && window.streamNetAPI.openDomainUrl) {
        window.streamNetAPI
          .openDomainUrl(url)
          .then((result) => {
            if (!result || !result.success) {
              log.warn(
                `Error opening domain: ${result?.error || "Unknown error"}`
              );
              window.open(url, "_blank");
            }
          })
          .catch((err) => {
            log.error(`Error opening domain: ${err.message}`);
            window.open(url, "_blank");
          });
      } else {
        // Fallback
        window.open(url, "_blank");
      }
    });
  }

  // Process and categorize transferred items
  if (
    transferredModulesContainer &&
    domainInfo.transferredItems &&
    domainInfo.transferredItems.length > 0
  ) {
    transferredModulesContainer.innerHTML = renderTransferredModules(
      domainInfo.transferredItems
    );
  } else {
    transferredModulesContainer.innerHTML =
      '<div class="empty-modules-message">No modules were transferred</div>';
  }

  // Show the dialog
  dialog.style.display = "block";
}

/**
 * Render the transferred modules by category
 * @param {Array} items Transferred items
 * @returns {string} HTML for transferred modules sections
 */
function renderTransferredModules(items) {
  // Categorize items
  const categories = {
    mainPanel: [], // Cockpit Panel
    brandings: [], // Support and Branding
    webviews: [], // WebViews and Plex WebView
    proxyApps: [],
    ottApps: [], // XCIPTV, TiviMate, etc.
    vodApps: [], // FlixVision, SmartTube, etc.
    vpnApps: [], // ORVPN, IPVanish, etc.
    storeApps: [], // Downloader, SH9 Store, etc.
    other: [], // Anything else
  };

  // Track processed module names to avoid duplicates
  const processedModules = {
    mainPanel: new Set(),
    brandings: new Set(),
    webviews: new Set(),
    proxyApps: new Set(),
    ottApps: new Set(),
    vodApps: new Set(),
    vpnApps: new Set(),
    storeApps: new Set(),
    other: new Set(),
  };

  // Category mapping for item names
  const categoryMapping = {
    cockpitpanel: "mainPanel",
    branding: "brandings",
    support: "brandings",
    webviews: "webviews",
    plexwebview: "webviews",
    multiproxy: "proxyApps",
    xciptv: "ottApps",
    tivimate: "ottApps",
    smarterspro: "ottApps",
    ibo: "ottApps",
    nextv: "ottApps",
    neutro: "ottApps",
    neu: "ottApps",
    easy: "ottApps",
    sparkle: "ottApps",
    "1stream": "ottApps",
    "9xtream": "ottApps",
    flixvision: "vodApps",
    smarttube: "vodApps",
    stremio: "vodApps",
    orvpn: "vpnApps",
    ipvanish: "vpnApps",
    pia: "vpnApps",
    downloader: "storeApps",
    sh9store: "storeApps",
  };

  // Category display names
  const categoryDisplayNames = {
    mainPanel: "Main Panel",
    brandings: "Branding Modules",
    webviews: "WebView Modules",
    proxyApps: "PROXY Modules",
    ottApps: "OTT Modules",
    vodApps: "VOD Modules",
    vpnApps: "VPN Modules",
    storeApps: "Store Modules",
    other: "Other Modules",
  };

  // Process each item and categorize it
  items.forEach((item) => {
    // Special handling for Cockpit Panel which may have different naming
    if (
      item.name?.toLowerCase().includes("cockpit") ||
      item.path?.toLowerCase().includes("cockpitpanel") ||
      item.path?.includes("dashboard.php")
    ) {
      // Always categorize Cockpit Panel in mainPanel
      if (!processedModules["mainPanel"].has("cockpitpanel")) {
        processedModules["mainPanel"].add("cockpitpanel");
        categories["mainPanel"].push(item);
      }
      return;
    }

    // Normal processing for other modules
    // Normalize the item name
    const normalizedName = (item.name || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/panel$|api$/i, "");

    // Skip if we've already processed this module name
    const category = categoryMapping[normalizedName] || "other";

    // Check if this module has already been processed in this category
    if (processedModules[category].has(normalizedName)) {
      return; // Skip this item
    }

    // Mark as processed
    processedModules[category].add(normalizedName);

    // Add to the appropriate category
    categories[category].push(item);
  });

  // Build HTML for each category
  let html = "";

  Object.keys(categories).forEach((category) => {
    const categoryItems = categories[category];

    if (categoryItems.length > 0) {
      html += `
        <div class="module-category">
          <h4>${categoryDisplayNames[category]}</h4>
          <div class="module-grid">
            ${renderModuleItems(categoryItems)}
          </div>
        </div>
      `;
    }
  });

  return html;
}

/**
 * Render individual module items
 * @param {Array} items Items in a category
 * @returns {string} HTML for module items
 */
function renderModuleItems(items) {
  return items
    .map((item) => {
      // Special handling for Cockpit Panel which might appear with different names
      if (
        item.name?.toLowerCase().includes("cockpit") ||
        item.path?.toLowerCase().includes("cockpitpanel") ||
        item.path?.includes("dashboard.php")
      ) {
        const displayName = "Cockpit Panel";
        const icon = "rocket";
        const name = "cockpitpanel";
        const version = MODULES[name.toLowerCase()]?.version || "1.0.0";

        return `
        <div class="module-item">
          <div class="module-icon">
            <img src="src/icons/${icon}.png" alt="${displayName}" onerror="this.onerror=null; this.src='src/icons/module.png';">
          </div>
          <div class="module-name">${displayName}</div>
          <div class="module-version">v${version}</div>
        </div>
      `;
      }

      // Normal handling for other modules
      const normalizedName = (item.name || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/panel$|api$/i, "");
      const displayName =
        getModuleDisplayName(normalizedName) || item.name || "Unknown Module";
      const icon = getModuleIcon(normalizedName) || "module";
      const version = getModuleVersion(normalizedName) || "1.0.0";

      return `
      <div class="module-item">
        <div class="module-icon">
          <img src="src/icons/${icon}.png" alt="${displayName}" onerror="this.onerror=null; this.src='src/icons/module.png';">
        </div>
        <div class="module-name">${displayName}</div>
        <div class="module-version">v${version}</div>
      </div>
    `;
    })
    .join("");
}

/**
 * Hide the transfer success dialog
 */
export function hideTransferSuccessDialog() {
  const dialog = document.getElementById("transferSuccessDialog");
  if (!dialog) return;

  log.debug("Hiding transfer success dialog");
  dialog.style.display = "none";
}

export default {
  initTransferSuccessDialog,
  showTransferSuccessDialog,
  hideTransferSuccessDialog,
};
