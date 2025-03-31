/**
 * UI helpers and common UI operations for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import { getSelectedItems } from "./module-selection.js";

/**
 * Show status message to the user
 * @param {string} type Message type (success|error|info|warning)
 * @param {string} message Message content
 */
export function showStatus(type, message) {
  const statusMessage = document.getElementById("statusMessage");
  if (!statusMessage) return;

  statusMessage.className = `status-message ${type}`;
  statusMessage.textContent = message;
  statusMessage.style.display = "block";

  log.info(`Status message (${type}): ${message}`);

  // Auto-hide after 5 seconds for non-error messages
  if (type !== "error") {
    setTimeout(() => {
      if (statusMessage) {
        statusMessage.style.display = "none";
      }
    }, 5000);
  }
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

  if (!connectionIndicator || !connectionText) return;

  // Set to checking state
  connectionIndicator.className = "status-indicator checking";
  connectionText.textContent = "Checking connection...";

  log.info("Checking server connection...");

  try {
    if (window.streamNetAPI && window.streamNetAPI.testConnection) {
      const result = await window.streamNetAPI.testConnection();

      if (result.success) {
        connectionIndicator.className = "status-indicator connected";
        connectionText.textContent = `Connected (Server ready)`;
        log.info("Connection test successful");
      } else {
        connectionIndicator.className = "status-indicator disconnected";
        connectionText.textContent = `Connection failed: ${result.error}`;
        log.error(`Connection test failed: ${result.error}`);
      }
    } else {
      connectionIndicator.className = "status-indicator disconnected";
      connectionText.textContent = "Connection API not available";
      log.error("Connection API not available");
    }
  } catch (error) {
    connectionIndicator.className = "status-indicator disconnected";
    connectionText.textContent = `Connection error: ${error.message}`;
    log.error(`Connection error: ${error.message}`);
  }
}

/**
 * Extract subdomain from domain name
 * @param {string} domain Full domain name
 * @returns {string} Extracted subdomain or empty string
 */
export function extractSubdomainFromDomain(domain) {
  if (!domain || !domain.includes(".")) return "";

  const parts = domain.split(".");
  // If it has at least 3 parts (e.g., test.streamnet.live), the first part is the subdomain
  if (parts.length >= 3) {
    return parts[0];
  }
  return "";
}

export default {
  showStatus,
  updateTransferButton,
  checkConnectionStatus,
  extractSubdomainFromDomain,
};
