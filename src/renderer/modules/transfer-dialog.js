/**
 * Transfer dialog module for StreamNet Panels
 * Handles the UI for showing transfer progress and logs
 */
import { log } from "../utils/logging.js";

// Keep track of whether a transfer is in progress and if it was cancelled
let transferInProgress = false;
let transferCancelled = false;
let autoScroll = true;

/**
 * Initialize the transfer dialog
 */
export function initTransferDialog() {
  const transferModal = document.getElementById("transferModal");
  const closeTransferModalBtn = document.getElementById(
    "closeTransferModalBtn"
  );
  const doneTransferBtn = document.getElementById("doneTransferBtn");
  const cancelTransferBtn = document.getElementById("cancelTransferBtn");

  if (!transferModal) return;

  // Set up event handlers
  if (closeTransferModalBtn) {
    closeTransferModalBtn.addEventListener("click", () => {
      if (!transferInProgress) {
        closeTransferDialog();
      }
    });
  }

  if (doneTransferBtn) {
    doneTransferBtn.addEventListener("click", closeTransferDialog);
  }

  if (cancelTransferBtn) {
    cancelTransferBtn.addEventListener("click", () => {
      transferCancelled = true;
      addTransferLog("Transfer cancelled by user", "warning");
      // Keep the dialog open but update UI to show cancelled state
      if (cancelTransferBtn) cancelTransferBtn.disabled = true;

      // Update UI to show cancelled state
      updateTransferStatus("Cancelling transfer...", "warning");
    });
  }

  // Setup autoscroll toggle
  const autoScrollBtn = transferModal.querySelector(".autoscroll");
  if (autoScrollBtn) {
    autoScrollBtn.addEventListener("click", () => {
      autoScroll = !autoScroll;
      autoScrollBtn.textContent = `Auto-scroll: ${autoScroll ? "ON" : "OFF"}`;
    });
  }

  // Close on ESC key
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !transferInProgress &&
      transferModal.style.display === "block"
    ) {
      closeTransferDialog();
    }
  });

  // Close if clicked outside content
  transferModal.addEventListener("click", (event) => {
    if (event.target === transferModal && !transferInProgress) {
      closeTransferDialog();
    }
  });

  log.debug("Transfer dialog initialized");
}

/**
 * Show the transfer dialog
 * @param {string} title Optional custom title for the dialog
 */
export function showTransferDialog(title = "File Transfer Progress") {
  const transferModal = document.getElementById("transferModal");
  const modalTitle = transferModal?.querySelector(".modal-header h3");
  const transferStatusText = document.getElementById("transferStatusText");
  const transferProgressBar = document.getElementById("transferProgressBar");
  const transferPercentage = document.getElementById("transferPercentage");
  const transferLog = document.getElementById("transferLog");
  const transferSummary = document.getElementById("transferSummary");
  const doneTransferBtn = document.getElementById("doneTransferBtn");
  const cancelTransferBtn = document.getElementById("cancelTransferBtn");

  if (!transferModal) return;

  // Reset the dialog state
  transferInProgress = true;
  transferCancelled = false;
  autoScroll = true;

  // Update the title if provided
  if (modalTitle) {
    modalTitle.textContent = title;
  }

  // Reset progress indicators
  if (transferStatusText) {
    transferStatusText.textContent = "Preparing transfer...";
    transferStatusText.className = "status-text status-info";
  }
  if (transferProgressBar) {
    transferProgressBar.style.width = "0%";
    transferProgressBar.className = "progress-bar progress-info";
  }
  if (transferPercentage) transferPercentage.textContent = "0%";

  // Clear the log
  if (transferLog) {
    const logContent = transferLog.querySelector(".log-content");
    if (logContent) logContent.innerHTML = "";

    // Reset autoscroll button
    const autoScrollBtn = transferLog.querySelector(".autoscroll");
    if (autoScrollBtn) {
      autoScrollBtn.textContent = "Auto-scroll: ON";
    }
  }

  // Hide the summary section
  if (transferSummary) transferSummary.style.display = "none";

  // Show cancel button, hide done button
  if (doneTransferBtn) doneTransferBtn.style.display = "none";
  if (cancelTransferBtn) {
    cancelTransferBtn.style.display = "inline-block";
    cancelTransferBtn.disabled = false;
  }

  // Show the modal
  transferModal.style.display = "block";

  log.debug("Transfer dialog shown");
}

/**
 * Close the transfer dialog
 */
export function closeTransferDialog() {
  const transferModal = document.getElementById("transferModal");

  if (transferModal) {
    transferModal.style.display = "none";
    transferInProgress = false;
    log.debug("Transfer dialog closed");
  }
}

/**
 * Update the transfer progress
 * @param {number} percent Percentage complete (0-100)
 * @param {string} status Status message
 * @param {string} type Status type (info, success, warning, error)
 */
export function updateTransferProgress(percent, status, type = "info") {
  const transferStatusText = document.getElementById("transferStatusText");
  const transferProgressBar = document.getElementById("transferProgressBar");
  const transferPercentage = document.getElementById("transferPercentage");

  // Update progress bar
  if (transferProgressBar) {
    transferProgressBar.style.width = `${percent}%`;

    // Clear existing classes and add the new type
    transferProgressBar.className = `progress-bar progress-${type}`;
  }

  // Update percentage text
  if (transferPercentage) {
    transferPercentage.textContent = `${Math.round(percent)}%`;
  }

  // Update status text
  if (transferStatusText) {
    transferStatusText.textContent = status;
    transferStatusText.className = `status-text status-${type}`;
  }
}

/**
 * Update just the transfer status text
 * @param {string} status Status message
 * @param {string} type Status type (info, success, warning, error)
 */
export function updateTransferStatus(status, type = "info") {
  const transferStatusText = document.getElementById("transferStatusText");

  if (transferStatusText) {
    transferStatusText.textContent = status;
    transferStatusText.className = `status-text status-${type}`;
  }
}

/**
 * Add a log entry to the transfer log
 * @param {string} message Log message
 * @param {string} level Log level (info, success, warning, error, debug)
 * @param {string} type Message type (text, command, output)
 */
export function addTransferLog(message, level = "info", type = "text") {
  const transferLog = document.getElementById("transferLog");

  if (!transferLog) return;

  const logContent = transferLog.querySelector(".log-content");
  if (!logContent) return;

  // Create log message element
  const logMessage = document.createElement("div");
  logMessage.className = `log-message log-${type}`;

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const timestampSpan = document.createElement("span");
  timestampSpan.className = "log-timestamp";
  timestampSpan.textContent = timestamp;
  logMessage.appendChild(timestampSpan);

  // Add level badge
  const levelSpan = document.createElement("span");
  levelSpan.className = `log-level log-level-${level}`;
  levelSpan.textContent = level.toUpperCase();
  logMessage.appendChild(levelSpan);

  // Add message text
  const textSpan = document.createElement("span");
  textSpan.className = `log-text`;
  textSpan.textContent = message;
  logMessage.appendChild(textSpan);

  // Add to log content
  logContent.appendChild(logMessage);

  // Auto-scroll to bottom if enabled
  if (autoScroll) {
    transferLog.scrollTop = transferLog.scrollHeight;
  }

  // Also log to console for debugging (use the correct level method)
  if (level === "success") {
    log.info(message); // Success maps to info in the logger
  } else if (log[level]) {
    log[level](message);
  } else {
    log.info(message);
  }
}

/**
 * Show a command being executed in the log
 * @param {string} command The command being run
 */
export function addCommandLog(command) {
  addTransferLog(`$ ${command}`, "debug", "command");
}

/**
 * Show command output in the log
 * @param {string} output Command output text
 */
export function addOutputLog(output) {
  addTransferLog(output, "info", "output");
}

function attachExternalLinkHandler(button, url) {
  if (!button) return;

  button.addEventListener("click", function (e) {
    e.preventDefault();
    log.info(`Opening domain in external browser: ${url}`);

    // Try multiple methods to ensure opening in external browser

    // Method 1: Use shell.openExternal if available
    if (
      window.streamNetAPI &&
      typeof window.streamNetAPI.openExternalLink === "function"
    ) {
      // Add flag to force external browser
      try {
        window.streamNetAPI.openExternalLink(url, true); // Pass true to force external browser
        addTransferLog(`Opening domain in external browser: ${url}`, "info");
        return;
      } catch (err) {
        console.error("Error using primary method:", err);
      }
    }

    // Method 2: Try direct electron shell access if available
    try {
      if (
        window.electron &&
        window.electron.shell &&
        typeof window.electron.shell.openExternal === "function"
      ) {
        window.electron.shell.openExternal(url);
        addTransferLog(
          `Opening domain with shell.openExternal: ${url}`,
          "info"
        );
        return;
      }
    } catch (err) {
      console.error("Error with direct shell access:", err);
    }

    // Method 3: Create a special URL with intent to open externally
    try {
      // Add a special query parameter that might be intercepted by preload script
      const externalUrl = `${url}?openExternal=true`;
      const newWindow = window.open(externalUrl, "_system");
      if (newWindow) {
        addTransferLog(`Opening domain with _system target: ${url}`, "info");
        return;
      }
    } catch (err) {
      console.error("Error with system target:", err);
    }

    // Method 4: Last resort, try to trigger native browser behavior
    try {
      // Create an invisible anchor with special attributes to hint external opening
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      // Add a special attribute that might be detected by preload script
      a.setAttribute("data-external", "true");
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addTransferLog(`Opening domain with specialized anchor: ${url}`, "info");
    } catch (err) {
      console.error("Error with specialized anchor:", err);
      addTransferLog(`Failed to open domain: ${err.message}`, "error");
    }
  });
}

/**
 * Add a domain link section to the transfer summary
 * @param {Object} domainInfo Domain information
 */
function addDomainLinkSection(domainInfo) {
  const transferSummary = document.getElementById("transferSummary");
  if (!transferSummary) return;

  // Create domain link section if it doesn't exist
  let domainLinkSection = document.getElementById("transferDomainLink");
  if (!domainLinkSection) {
    domainLinkSection = document.createElement("div");
    domainLinkSection.id = "transferDomainLink";
    domainLinkSection.className = "domain-link-section";
    transferSummary.appendChild(domainLinkSection);
  }

  // Build the domain URL - improved logic
  let fullDomain;

  // First try using the subdomain with root domain if available
  if (domainInfo.subdomain && domainInfo.rootDomain) {
    fullDomain = `${domainInfo.subdomain}.${domainInfo.rootDomain}`;
  }
  // Fall back to using the selected domain directly
  else if (domainInfo.domain) {
    fullDomain = domainInfo.domain;
  }
  // Last resort, use just the root domain
  else if (domainInfo.rootDomain) {
    fullDomain = domainInfo.rootDomain;
  }
  // If nothing else is available
  else {
    fullDomain = "your-domain";
  }

  const domainUrl = `http://${fullDomain}`;

  // Create content without any event handlers initially
  domainLinkSection.innerHTML = `
        <div class="domain-link-header">Your domain is ready:</div>
        <div class="domain-link-container">
          <button class="domain-link-button" id="openDomainBtn">
            <span class="domain-link-icon">🌐</span>
            <span class="domain-link-text">Open ${fullDomain}</span>
          </button>
        </div>
        <div class="domain-link-info">
          Click the button above to open your domain in your default web browser.
        </div>
      `;

  setTimeout(() => {
    const openButton = document.getElementById("openDomainBtn");
    if (openButton) {
      // Replace the button to clear any existing listeners
      const newButton = openButton.cloneNode(true);
      openButton.parentNode.replaceChild(newButton, openButton);

      // Add the click handler to the new button
      newButton.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling

        try {
          log.info(`Attempting to open domain: ${domainUrl}`);
          addTransferLog(`Opening domain in browser: ${domainUrl}`, "info");

          // Use our dedicated domain URL handler
          if (window.streamNetAPI && window.streamNetAPI.openDomainUrl) {
            const result = await window.streamNetAPI.openDomainUrl(domainUrl);

            if (result && result.success) {
              log.info(`Successfully opened domain: ${domainUrl}`);
            } else if (result && result.error) {
              log.error(`Error from openDomainUrl: ${result.error}`);
              // Try fallback method
              window.streamNetAPI.openExternalLink(domainUrl);
            }
          }
          // First fallback - use regular openExternalLink
          else if (
            window.streamNetAPI &&
            window.streamNetAPI.openExternalLink
          ) {
            log.debug("Using openExternalLink as fallback");
            window.streamNetAPI.openExternalLink(domainUrl);
          }
          // Last resort fallback
          else {
            log.warn("API methods not available, using window.open fallback");
            window.open(domainUrl, "_system");
          }
        } catch (error) {
          log.error(`Error handling domain link click: ${error.message}`);
          // Last resort fallback
          try {
            window.open(domainUrl, "_blank");
          } catch (e) {
            log.error(`Final fallback also failed: ${e.message}`);
          }
        }
      });

      log.debug(
        `Attached click handler to domain button for URL: ${domainUrl}`
      );
    } else {
      log.error("Open domain button not found in DOM");
    }
  }, 100);

  // IMPROVED DISPLAY OF TRANSFERRED ITEMS WITH ORGANIZED SECTIONS
  if (domainInfo.transferredItems && domainInfo.transferredItems.length > 0) {
    // Icon mapping for modules
    const iconMap = {
      // Panels
      cockpitpanel: "rebrands",
      branding: "branding",
      support: "telegram",
      multiproxy: "multi",
      webviews: "android",
      plexwebview: "plex",

      // OTT Applications
      xciptv: "xciptv",
      tivimate: "tivimate",
      smarterspro: "smarters",
      ibo: "ibosol",
      nextv: "nextv",
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

    // Helper function to get icon HTML
    const getIconHtml = (item) => {
      // Normalize the name to remove spaces, be case insensitive, and remove "Panel" or "API" suffixes
      let normalizedName = item.name.toLowerCase().replace(/\s+/g, "");
      normalizedName = normalizedName.replace(/panel$|api$/i, "");

      // Check for special case "cockpitpanel"
      if (normalizedName === "cockpit") normalizedName = "cockpitpanel";

      // Get icon name from map or use default
      const iconName = iconMap[normalizedName] || "module";
      const iconPath = `src/icons/${iconName}.png`;

      return `<img src="${iconPath}" alt="${item.name}" class="item-icon" onerror="this.onerror=null; this.src='src/icons/module.png';">`;
    };

    // Categorize items into sections to match the domain analysis structure
    const cockpitPanel = []; // Main Panel section
    const brandingModules = []; // Brandings section (Support and Branding)
    const otherPanelModules = []; // Regular panel modules
    const apiModules = []; // API modules
    const otherItems = []; // Anything else

    domainInfo.transferredItems.forEach((item) => {
      const itemName = item.name ? item.name.toLowerCase() : "";
      const itemPath = item.path ? item.path.toLowerCase() : "";

      // Main Panel (Cockpit Panel)
      if (
        itemName.includes("cockpitpanel") ||
        itemPath.includes("cockpitpanel") ||
        itemPath.includes("dashboard.php")
      ) {
        cockpitPanel.push(item);
      }
      // Brandings (Support and Branding)
      else if (
        itemName.includes("support") ||
        itemPath.includes("support") ||
        itemName.includes("branding") ||
        itemPath.includes("branding") ||
        itemPath.includes("assets/branding.php")
      ) {
        brandingModules.push(item);
      }
      // API Modules
      else if (itemName.includes("api") || itemPath.includes("api/")) {
        apiModules.push(item);
      }
      // Panel Modules
      else if (itemName.includes("panel") || itemPath.includes("panel/")) {
        otherPanelModules.push(item);
      }
      // Other items
      else {
        otherItems.push(item);
      }
    });

    // Create the transferred items HTML starting with the header
    let itemsHtml = `
          <div class="transferred-items-header">Transferred Items:</div>
          <div class="transferred-items-content">
        `;

    // Main Panel section
    if (cockpitPanel.length > 0) {
      itemsHtml += `
            <div class="transfer-category">
              <div class="category-title">MAIN PANEL:</div>
              <div class="item-list">
          `;

      cockpitPanel.forEach((item) => {
        const displayName = "Cockpit Panel";
        itemsHtml += `
              <div class="transfer-item">
                ${getIconHtml(item)}
                <span class="item-name">${displayName}</span>
              </div>
            `;
      });

      itemsHtml += `
              </div>
            </div>
          `;
    }

    // Brandings section
    if (brandingModules.length > 0) {
      itemsHtml += `
            <div class="transfer-category">
              <div class="category-title">BRANDINGS:</div>
              <div class="item-list">
          `;

      // Use a set to prevent duplicates
      const processedModules = new Set();

      brandingModules.forEach((item) => {
        // Extract the module name without suffixes
        let displayName = item.name || item.path.split("/").pop() || "Unknown";
        displayName = displayName.replace(/panel|api/i, "").trim();
        // Capitalize first letter
        displayName =
          displayName.charAt(0).toUpperCase() + displayName.slice(1);

        // Get a consistent key for deduplication
        const moduleKey = displayName.toLowerCase();

        if (!processedModules.has(moduleKey)) {
          processedModules.add(moduleKey);

          itemsHtml += `
                <div class="transfer-item">
                  ${getIconHtml(item)}
                  <span class="item-name">${displayName}</span>
                </div>
              `;
        }
      });

      itemsHtml += `
              </div>
            </div>
          `;
    }

    // Panel Modules section
    if (otherPanelModules.length > 0) {
      itemsHtml += `
            <div class="transfer-category">
              <div class="category-title">PANEL MODULES:</div>
              <div class="item-list">
          `;

      otherPanelModules.forEach((item) => {
        // Clean up the display name
        let displayName = item.name || item.path.split("/").pop() || "Unknown";
        displayName = displayName.replace(/panel/i, "").trim();
        // Capitalize first letter
        displayName =
          displayName.charAt(0).toUpperCase() + displayName.slice(1);

        itemsHtml += `
              <div class="transfer-item">
                ${getIconHtml(item)}
                <span class="item-name">${displayName}</span>
              </div>
            `;
      });

      itemsHtml += `
              </div>
            </div>
          `;
    }

    // API Modules section
    if (apiModules.length > 0) {
      itemsHtml += `
            <div class="transfer-category">
              <div class="category-title">API MODULES:</div>
              <div class="item-list">
          `;

      apiModules.forEach((item) => {
        // Clean up the display name
        let displayName = item.name || item.path.split("/").pop() || "Unknown";
        displayName = displayName.replace(/api/i, "").trim();
        // Capitalize first letter
        displayName =
          displayName.charAt(0).toUpperCase() + displayName.slice(1);

        itemsHtml += `
              <div class="transfer-item">
                ${getIconHtml(item)}
                <span class="item-name">${displayName}</span>
              </div>
            `;
      });

      itemsHtml += `
              </div>
            </div>
          `;
    }

    // Other items (if any)
    if (otherItems.length > 0) {
      itemsHtml += `
            <div class="transfer-category">
              <div class="category-title">OTHER:</div>
              <div class="item-list">
          `;

      otherItems.forEach((item) => {
        const displayName = item.name || item.path || "Unknown";

        itemsHtml += `
              <div class="transfer-item">
                ${getIconHtml(item)}
                <span class="item-name">${displayName}</span>
              </div>
            `;
      });

      itemsHtml += `
              </div>
            </div>
          `;
    }

    itemsHtml += `</div>`;

    // Add items section after link
    const itemsSection = document.createElement("div");
    itemsSection.className = "transferred-items-section";
    itemsSection.innerHTML = itemsHtml;
    domainLinkSection.appendChild(itemsSection);
  }

  // If DNS records were created, add a section for them with improved styling
  if (domainInfo.dnsCreated) {
    const dnsSection = document.createElement("div");
    dnsSection.className = "dns-created-section";

    // Build domain name for DNS records
    let dnsFullDomain = fullDomain;

    dnsSection.innerHTML = `
          <div class="dns-created-header">DNS Records created:</div>
          <div class="dns-records-container">
            <div class="dns-info">DNS records for <span class="domain-highlight">${dnsFullDomain}</span> were successfully created.</div>
            <div class="dns-records-list">
              <div class="dns-record-item">
                <span class="dns-record-type">A Records:</span>
                <span class="dns-record-domain">${dnsFullDomain}</span>
              </div>
              <div class="dns-record-item">
                <span class="dns-record-type">AAAA Records:</span>
                <span class="dns-record-domain">${dnsFullDomain}</span>
              </div>
            </div>
          </div>
        `;

    domainLinkSection.appendChild(dnsSection);
  }
}

/**
 * Complete the transfer process and update the dialog
 * @param {Object} result Transfer result object
 */
export function completeTransfer(result, domainInfo = null) {
  const transferSummary = document.getElementById("transferSummary");
  const transferSuccessCount = document.getElementById("transferSuccessCount");
  const transferErrorsList = document.getElementById("transferErrorsList");
  const doneTransferBtn = document.getElementById("doneTransferBtn");
  const cancelTransferBtn = document.getElementById("cancelTransferBtn");

  transferInProgress = false;

  // Show the summary section
  if (transferSummary) {
    transferSummary.style.display = "block";
  }

  // Update success count
  if (
    transferSuccessCount &&
    result.successCount !== undefined &&
    result.totalCount !== undefined
  ) {
    transferSuccessCount.textContent = `${result.successCount} of ${result.totalCount} items transferred successfully`;

    // Add appropriate class based on success rate
    if (result.successCount === result.totalCount) {
      transferSuccessCount.className = "success-count success";
    } else if (result.successCount > 0) {
      transferSuccessCount.className = "success-count partial";
    } else {
      transferSuccessCount.className = "success-count failure";
    }
  }

  // Display any errors
  if (transferErrorsList) {
    transferErrorsList.innerHTML = "";

    if (result.error) {
      // Single error message
      const errorItem = document.createElement("div");
      errorItem.className = "error-item";
      errorItem.textContent = result.error;
      transferErrorsList.appendChild(errorItem);
    } else if (result.results) {
      // Multiple item results with potential errors
      const errors = result.results.filter((r) => r.status === "error");

      if (errors.length > 0) {
        errors.forEach((error) => {
          const errorItem = document.createElement("div");
          errorItem.className = "error-item";
          errorItem.textContent = `${error.name || "Unknown"}: ${
            error.error || "Unknown error"
          }`;
          transferErrorsList.appendChild(errorItem);
        });
      }
    }
  }

  // Update progress to 100% for success or appropriate value for partial success
  if (result.success) {
    updateTransferProgress(100, "Transfer completed successfully", "success");
  } else if (result.successCount && result.totalCount) {
    const percent = Math.round((result.successCount / result.totalCount) * 100);
    updateTransferProgress(
      percent,
      "Transfer completed with some errors",
      "warning"
    );
  } else {
    updateTransferProgress(0, "Transfer failed", "error");
  }

  // Show done button, hide cancel button
  if (doneTransferBtn) doneTransferBtn.style.display = "inline-block";
  if (cancelTransferBtn) cancelTransferBtn.style.display = "none";

  // Add final log message
  if (result.success) {
    addTransferLog("Transfer completed successfully", "success");
  } else if (result.successCount > 0) {
    addTransferLog(
      `Transfer completed with ${
        result.totalCount - result.successCount
      } errors`,
      "warning"
    );
  } else {
    addTransferLog("Transfer failed", "error");
  }

  // NEW CODE: If successful and we have domain info, show domain link section
  if (result.success && domainInfo) {
    addDomainLinkSection(domainInfo);
  }

  log.info("Transfer process completed");
}

/**
 * Check if a transfer is currently in progress
 * @returns {boolean} Whether a transfer is in progress
 */
export function isTransferInProgress() {
  return transferInProgress;
}

/**
 * Check if the transfer was cancelled
 * @returns {boolean} Whether the transfer was cancelled
 */
export function isTransferCancelled() {
  return transferCancelled;
}

export default {
  initTransferDialog,
  showTransferDialog,
  closeTransferDialog,
  updateTransferProgress,
  updateTransferStatus,
  addTransferLog,
  addCommandLog,
  addOutputLog,
  completeTransfer,
  isTransferInProgress,
  isTransferCancelled,
};
