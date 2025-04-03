/**
 * UI helpers and common UI operations for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import { getSelectedItems } from "./module-selection.js";
import { extractSubdomainFromDomain as utilExtractSubdomain } from "../utils/domain-utils.js";

/**
 * Show status message to the user with improved layout
 * @param {string} type Message type (success|error|info|warning)
 * @param {string} message Message content
 * @param {string} [target="main"] Target area ("main" or "settings")
 * @param {Object} [options] Additional options
 * @param {Object} [options.link] Optional link to display with the message
 */
export function showStatus(type, message, target = "main", options = {}) {
  // Determine which status message element to use
  const statusMessage = document.getElementById(
    target === "settings" ? "settingsStatusMessage" : "statusMessage"
  );

  if (!statusMessage) return;

  // Clear previous content
  statusMessage.innerHTML = "";

  // Reset classes
  statusMessage.className = `status-message ${type}`;

  // Create icon
  const icon = document.createElement("span");
  icon.className = "status-icon";

  // Create text container
  const textContainer = document.createElement("span");
  textContainer.className = "status-text";
  textContainer.textContent = message;

  // Add optional link
  if (options.link) {
    const linkElement = document.createElement("a");
    linkElement.href = options.link.url;
    linkElement.textContent = options.link.text;
    textContainer.appendChild(document.createTextNode(" "));
    textContainer.appendChild(linkElement);
  }

  // Assemble the message
  statusMessage.appendChild(icon);
  statusMessage.appendChild(textContainer);

  // For settings status, use a different animation approach
  if (target === "settings") {
    // Reset animation by removing classes
    statusMessage.classList.remove("visible");
    statusMessage.classList.remove("hiding");

    // Show the message
    statusMessage.style.display = "flex";

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      statusMessage.classList.add("visible");
    });

    // Auto-hide after 5 seconds for non-error messages
    if (type !== "error") {
      setTimeout(() => {
        if (statusMessage) {
          // Add hiding animation
          statusMessage.classList.remove("visible");
          statusMessage.classList.add("hiding");

          // Hide after animation completes
          setTimeout(() => {
            statusMessage.style.display = "none";
            statusMessage.classList.remove("hiding");
          }, 300); // Match animation duration
        }
      }, 5000);
    }
  } else {
    // Original behavior for main status message
    statusMessage.style.display = "flex";

    // Auto-hide after 5 seconds for non-error messages
    if (type !== "error") {
      setTimeout(() => {
        if (statusMessage) {
          statusMessage.style.display = "none";
        }
      }, 5000);
    }
  }

  log.info(`Status message (${type}): ${message}`);
}

/**
 * Update the transfer button state based on current selection
 */
export function updateTransferButton() {
  const transferButton = document.getElementById("transferButton");
  if (!transferButton) return;

  const domainSelect = document.getElementById("domainSelect");
  const dnsToggle = document.getElementById("dnsToggle");
  const subdomainInput = document.getElementById("subdomainInput");

  // Check if we have modules selected
  const hasSelections = getSelectedItems().size > 0;

  // Check if a domain is selected
  const hasDomain =
    domainSelect && domainSelect.value && domainSelect.value.trim() !== "";

  // Check DNS toggle state
  const dnsEnabled = dnsToggle && dnsToggle.checked;

  // Check if subdomain is provided when DNS is enabled
  const dnsSubdomainProvided =
    !dnsEnabled || (subdomainInput && subdomainInput.value.trim() !== "");

  // DNS-only mode: When DNS is enabled with valid domain and subdomain
  const isDnsOnlyMode = dnsEnabled && hasDomain && dnsSubdomainProvided;

  // Button should be enabled if we have selections OR we're in DNS-only mode
  const shouldEnable = (hasSelections && hasDomain) || isDnsOnlyMode;

  // Set the button state
  transferButton.disabled = !shouldEnable;

  // Update button text for better user feedback
  if (!shouldEnable) {
    if (!hasDomain) {
      transferButton.textContent = "Select a Domain";
    } else if (dnsEnabled && !dnsSubdomainProvided) {
      transferButton.textContent = "Enter Subdomain for DNS";
    } else if (!hasSelections && !isDnsOnlyMode) {
      transferButton.textContent = "Select Modules or Enable DNS";
    } else {
      transferButton.textContent = "Transfer Files";
    }
  } else {
    // Different text based on whether we're doing DNS only or file transfer
    if (hasSelections) {
      transferButton.textContent = dnsEnabled
        ? "Transfer Files & Create DNS"
        : "Transfer Files";
    } else {
      transferButton.textContent = "Create DNS Records Only";
    }
  }

  log.debug(
    `Button state updated: enabled=${shouldEnable} (selections=${hasSelections}, domain=${hasDomain}, dnsEnabled=${dnsEnabled}, dnsOk=${dnsSubdomainProvided})`
  );
}

/**
 * Check connection status and update UI
 */
export async function checkConnectionStatus() {
  const connectionIndicator = document.getElementById("connectionIndicator");
  const connectionText = document.getElementById("connectionText");
  const testConnectionButton = document.getElementById("testConnectionButton");

  if (!connectionIndicator || !connectionText || !testConnectionButton) return;

  // If we've already checked connection and there's no forced refresh,
  // use the cached state to avoid redundant calls
  if (window.appState?.connectionStatus && event?.type !== "click") {
    if (window.appState.connectionStatus === "connected") {
      connectionIndicator.className = "status-indicator connected";
      connectionText.textContent = "Connected";
      return;
    } else if (window.appState.connectionStatus === "disconnected") {
      connectionIndicator.className = "status-indicator disconnected";
      connectionText.textContent = "Connection failed";
      return;
    }
  }

  // Store original button content to restore later
  const originalButtonContent = testConnectionButton.innerHTML;

  // Set to checking state
  connectionIndicator.className = "status-indicator checking";
  connectionText.textContent = "Checking connection...";

  // Update button to show it's processing
  testConnectionButton.disabled = true;
  testConnectionButton.innerHTML =
    '<span class="button-icon spinning">↻</span>';

  log.info("Checking server connection...");

  try {
    if (window.streamNetAPI && window.streamNetAPI.testConnection) {
      const result = await window.streamNetAPI.testConnection();

      if (result.success) {
        connectionIndicator.className = "status-indicator connected";
        connectionText.textContent = `Connected`;
        window.appState.connectionStatus = "connected";
        log.info("Connection test successful");
      } else {
        connectionIndicator.className = "status-indicator disconnected";
        connectionText.textContent = `Connection failed: ${result.error}`;
        window.appState.connectionStatus = "disconnected";
        log.error(`Connection test failed: ${result.error}`);
      }
    } else {
      connectionIndicator.className = "status-indicator disconnected";
      connectionText.textContent = "Connection API not available";
      window.appState.connectionStatus = "disconnected";
      log.error("Connection API not available");
    }
  } catch (error) {
    connectionIndicator.className = "status-indicator disconnected";
    connectionText.textContent = `Connection error: ${error.message}`;
    window.appState.connectionStatus = "disconnected";
    log.error(`Connection error: ${error.message}`);
  } finally {
    // Restore button state
    testConnectionButton.disabled = false;
    testConnectionButton.innerHTML = originalButtonContent;
  }
}

/**
 * Extract subdomain from domain name
 * @param {string} domain Full domain name
 * @returns {string} Extracted subdomain or empty string
 */
export function extractSubdomainFromDomain(domain) {
  return utilExtractSubdomain(domain);
}

export default {
  showStatus,
  updateTransferButton,
  checkConnectionStatus,
  extractSubdomainFromDomain,
};
