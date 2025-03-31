/**
 * Improved DNS preview module for StreamNet Panels
 * Handles domain dropdown selection and DNS toggle
 */

import { log } from "../utils/logging.js";

/**
 * Initialize the DNS records preview
 */
export function initDnsPreview() {
  // Find the target elements
  const dnsForm = document.getElementById("dnsForm");
  const subdomainInput = document.getElementById("subdomainInput");
  const dnsToggle = document.getElementById("dnsToggle");
  const domainSelect = document.getElementById("domainSelect");

  // If essential elements don't exist, don't proceed
  if (!dnsForm || !subdomainInput) return;

  // Create the DNS records preview container if it doesn't exist
  let previewContainer = document.getElementById("dnsRecordsPreviewContainer");
  if (!previewContainer) {
    // Find the dns-info div
    const dnsInfo = dnsForm.querySelector(".dns-info");
    if (!dnsInfo) return;

    // Create and insert the container
    previewContainer = document.createElement("div");
    previewContainer.id = "dnsRecordsPreviewContainer";
    dnsInfo.parentNode.insertBefore(previewContainer, dnsInfo.nextSibling);

    log.debug("DNS records preview container created");
  }

  // Add input event to update the preview
  subdomainInput.addEventListener("input", updateDnsRecordsPreview);

  // Listen for domain selection changes
  if (domainSelect) {
    domainSelect.addEventListener("change", () => {
      // Wait a short time for the subdomain to be auto-populated
      setTimeout(updateDnsRecordsPreview, 100);
    });
  }

  // Listen for DNS toggle changes
  if (dnsToggle) {
    dnsToggle.addEventListener("change", () => {
      if (dnsToggle.checked) {
        // Wait a short time for the subdomain to be auto-populated
        setTimeout(updateDnsRecordsPreview, 100);
      }
    });
  }

  // Listen for visibility changes on the form
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.attributeName === "style" &&
        dnsForm.style.display !== "none" &&
        subdomainInput.value.trim() !== ""
      ) {
        updateDnsRecordsPreview();
      }
    });
  });

  observer.observe(dnsForm, { attributes: true });

  // Initial update
  updateDnsRecordsPreview();

  log.debug("DNS records preview initialized");
}

/**
 * Update the DNS records preview
 */
function updateDnsRecordsPreview() {
  const previewContainer = document.getElementById(
    "dnsRecordsPreviewContainer"
  );
  const subdomainInput = document.getElementById("subdomainInput");

  if (!previewContainer || !subdomainInput) return;

  const subdomain = subdomainInput.value.trim();

  // Get root domain from app state
  let rootDomain = window.appState?.rootDomain;

  if (!rootDomain) {
    log.error("Root domain not available in app state");
    return;
  }

  // Get root domain from the existing DNS preview element if possible
  const dnsPreview = document.getElementById("dnsPreview");
  if (dnsPreview && dnsPreview.textContent) {
    // Update the preview element text
    if (subdomain) {
      dnsPreview.textContent = `${subdomain}.${rootDomain}`;
    } else {
      dnsPreview.textContent = rootDomain;
    }
  }

  log.debug(
    `Updating DNS preview for: ${subdomain ? subdomain + "." : ""}${rootDomain}`
  );

  // Generate and update the preview
  previewContainer.innerHTML = generateDnsRecordsPreview(subdomain, rootDomain);
}

/**
 * title attributes for tooltips on long domain names
 */
function generateDnsRecordsPreview(subdomain, rootDomain) {
  if (!subdomain) {
    return '<div class="record-preview-empty">Enter a subdomain to see DNS records</div>';
  }

  // Record templates
  const recordTemplates = {
    aRecords: [
      {
        name: `admin.{{subdomain}}`,
        type: "A",
        proxied: true,
      },
      {
        name: `localhost.{{subdomain}}`,
        content: "127.0.0.1",
        type: "A",
        proxied: false,
      },
      {
        name: `{{subdomain}}`,
        type: "A",
        proxied: true,
      },
      {
        name: `www.{{subdomain}}`,
        type: "A",
        proxied: true,
      },
    ],
    aaaaRecords: [
      {
        name: `{{subdomain}}`,
        type: "AAAA",
        proxied: true,
      },
      {
        name: `www.{{subdomain}}`,
        type: "AAAA",
        proxied: true,
      },
    ],
  };

  // Generate HTML
  let html = '<div class="dns-records-preview">';
  html += '<h4 class="records-preview-title">DNS Records Preview:</h4>';
  html += '<div class="records-list">';

  // Process A records
  recordTemplates.aRecords.forEach((record) => {
    const name = record.name.replace("{{subdomain}}", subdomain);
    const fullDomain = `${name}.${rootDomain}`;
    const content = record.content || "SERVER_IPV4";
    const proxyStatus = record.proxied
      ? '<span class="proxy-status proxied">Proxied</span>'
      : '<span class="proxy-status not-proxied">DNS Only</span>';

    html += `
        <div class="dns-record-item">
          <div class="record-type">A</div>
          <div class="record-details">
            <span class="record-name" title="${fullDomain}">${fullDomain}</span>
            <div class="record-content">
              <span class="record-ip">${content}</span>
              ${proxyStatus}
            </div>
          </div>
        </div>
      `;
  });

  // Process AAAA records
  recordTemplates.aaaaRecords.forEach((record) => {
    const name = record.name.replace("{{subdomain}}", subdomain);
    const fullDomain = `${name}.${rootDomain}`;
    const proxyStatus = record.proxied
      ? '<span class="proxy-status proxied">Proxied</span>'
      : '<span class="proxy-status not-proxied">DNS Only</span>';

    html += `
        <div class="dns-record-item">
          <div class="record-type aaaa">AAAA</div>
          <div class="record-details">
            <span class="record-name" title="${fullDomain}">${fullDomain}</span>
            <div class="record-content">
              <span class="record-ip">SERVER_IPV6</span>
              ${proxyStatus}
            </div>
          </div>
        </div>
      `;
  });

  html += "</div></div>";
  return html;
}

// Expose the function to allow manual updates if needed
export function updatePreview() {
  updateDnsRecordsPreview();
}

// Export what's needed
export default {
  initDnsPreview,
  updatePreview,
};
