/**
 * DNS form handling for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import { showStatus, updateTransferButton } from "./ui-helpers.js";
import { updateDnsPreview } from "./domain-management.js";

/**
 * Initialize DNS form
 */
export function initDnsForm() {
  const dnsToggle = document.getElementById("dnsToggle");
  const dnsForm = document.getElementById("dnsForm");
  const subdomainInput = document.getElementById("subdomainInput");
  const domainSelect = document.getElementById("domainSelect");

  log.debug("Initializing DNS form");

  if (dnsToggle) {
    dnsToggle.addEventListener("change", () => {
      if (dnsForm) {
        dnsForm.style.display = dnsToggle.checked ? "block" : "none";
        log.debug(
          `DNS form display: ${dnsToggle.checked ? "shown" : "hidden"}`
        );
      }

      // Auto-populate subdomain when toggle is turned on
      if (dnsToggle.checked && domainSelect && domainSelect.value) {
        const subdomain = extractSubdomainFromDomain(domainSelect.value);
        if (subdomain && subdomainInput) {
          subdomainInput.value = subdomain;
          updateDnsPreview();
          log.debug(`Auto-populated subdomain: ${subdomain}`);
        }
      }

      updateTransferButton();
    });
  }

  if (subdomainInput) {
    subdomainInput.addEventListener("input", () => {
      updateDnsPreview();
      updateTransferButton();
    });
  }

  updateDnsPreview();
}

/**
 * Extract subdomain from domain name
 * @param {string} domain Full domain name
 * @returns {string} Extracted subdomain or empty string
 */
function extractSubdomainFromDomain(domain) {
  if (!domain || !domain.includes(".")) return "";

  const parts = domain.split(".");
  // If it has at least 3 parts (e.g., test.streamnet.live), the first part is the subdomain
  if (parts.length >= 3) {
    return parts[0];
  }
  return "";
}

/**
 * Create DNS records for the current subdomain
 * @returns {Promise<Object>} Creation result
 */
export async function createDnsRecords() {
  const subdomainInput = document.getElementById("subdomainInput");

  if (!subdomainInput) {
    log.error("Subdomain input not found");
    return { success: false, error: "Subdomain input not found" };
  }

  const subdomain = subdomainInput.value.trim();

  if (!subdomain) {
    log.error("Subdomain is required");
    return { success: false, error: "Subdomain is required" };
  }

  log.info(`Creating DNS records for ${subdomain}`);

  try {
    if (!window.streamNetAPI || !window.streamNetAPI.createDnsRecords) {
      log.error("DNS API not available");
      return { success: false, error: "DNS API not available" };
    }

    const result = await window.streamNetAPI.createDnsRecords({
      subdomain: subdomain,
    });

    if (result.success) {
      log.info(`DNS records created successfully: ${result.message}`);
    } else {
      log.error(`DNS record creation failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    log.error(`Error creating DNS records: ${error.message}`);
    return {
      success: false,
      error: error.message || "Unknown error during DNS creation",
    };
  }
}

export default {
  initDnsForm,
  createDnsRecords,
};
