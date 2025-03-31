/**
 * Domain management functionality for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import {
  showStatus,
  updateTransferButton,
  extractSubdomainFromDomain,
} from "./ui-helpers.js";
import {
  initDomainCreationLog,
  addDomainLog,
  addCommandLog,
  addOutputLog,
  showLoading,
  clearDomainLog,
} from "./domain-logging.js";

/**
 * Load domain folders from the server
 */
export async function loadDomainFolders() {
  const domainSelect = document.getElementById("domainSelect");
  if (!domainSelect) return;

  try {
    // Show a loading state
    domainSelect.innerHTML = '<option value="">Loading domains...</option>';
    domainSelect.disabled = true;

    log.info("Loading domain folders");

    // Fetch domains from Virtualmin
    if (window.streamNetAPI && window.streamNetAPI.listVirtualminDomains) {
      const response = await window.streamNetAPI.listVirtualminDomains();

      if (!response.success) {
        log.error(`Error loading domains: ${response.error}`);
        domainSelect.innerHTML =
          '<option value="">Failed to load domains</option>';
        showStatus("error", `Failed to load domains: ${response.error}`);
        domainSelect.disabled = false;
        return;
      }

      // Reset the select
      domainSelect.innerHTML = '<option value="">Select a domain...</option>';

      // Add domains to the select
      if (Array.isArray(response.domains) && response.domains.length > 0) {
        log.debug(`Found ${response.domains.length} domains`);

        response.domains.forEach((domain) => {
          const option = document.createElement("option");
          option.value = domain.name;
          option.textContent = domain.name;
          // Add the path as a data attribute
          option.dataset.path = domain.path;
          domainSelect.appendChild(option);
        });

        showStatus("info", `Loaded ${response.domains.length} domains`);

        // Set domains loaded flag to avoid redundant calls
        window.appState.domainsLoaded = true;
      } else {
        log.warn("No domains found");
        domainSelect.innerHTML +=
          '<option value="" disabled>No domains available</option>';
        showStatus(
          "warning",
          "No domains found. Create a new domain to get started."
        );
      }
    } else {
      // Fallback to directory-based domain list if API not available
      log.warn(
        "Virtualmin API not available, falling back to directory listing"
      );

      if (window.streamNetAPI && window.streamNetAPI.listDestinationFolders) {
        const domains = await window.streamNetAPI.listDestinationFolders();

        if (domains.error) {
          log.error(`Error loading domains: ${domains.error}`);
          showStatus("error", `Failed to load domains: ${domains.error}`);
          domainSelect.innerHTML =
            '<option value="">Failed to load domains</option>';
          domainSelect.disabled = false;
          return;
        }

        domainSelect.innerHTML =
          '<option value="">Select a domain folder...</option>';

        // Check if domains is an array
        if (Array.isArray(domains)) {
          log.debug(`Found ${domains.length} domain folders`);

          domains.forEach((domain) => {
            const option = document.createElement("option");
            option.value = domain.name;
            option.textContent = domain.name;
            option.dataset.path = domain.path;
            domainSelect.appendChild(option);
          });

          // Set domains loaded flag
          window.appState.domainsLoaded = true;
        } else {
          log.error("Domains is not an array:", domains);
          showStatus(
            "error",
            "Failed to load domains: Invalid response format"
          );
        }
      }
    }
  } catch (error) {
    log.error(`Error loading domains: ${error.message}`);
    showStatus(
      "error",
      `Failed to load domains: ${error.message || "Unknown error"}`
    );

    domainSelect.innerHTML = '<option value="">Error loading domains</option>';
  } finally {
    domainSelect.disabled = false;
  }
}

/**
 * Handle domain selection change and analyze domain structure
 */
export function handleDomainChange() {
  const domainSelect = document.getElementById("domainSelect");
  const dnsToggle = document.getElementById("dnsToggle");
  const subdomainInput = document.getElementById("subdomainInput");
  const domainAnalysisContent = document.getElementById(
    "domainAnalysisContent"
  );

  // Extract domain name from selected value
  const selectedDomain = domainSelect ? domainSelect.value : "";
  log.debug(`Domain selection changed to: ${selectedDomain}`);

  // Update transfer button state first
  updateTransferButton();

  // If no domain is selected, return early
  if (!selectedDomain) {
    if (domainAnalysisContent) {
      domainAnalysisContent.innerHTML =
        '<div class="empty-section-message">No domain selected</div>';
    }
    return;
  }

  // Show loading message in the analysis section
  if (domainAnalysisContent) {
    domainAnalysisContent.innerHTML =
      '<div class="analysis-loading">Analyzing domain structure</div>';
  }

  // Auto-fill subdomain field based on selected domain if DNS toggle is on
  if (dnsToggle && dnsToggle.checked && subdomainInput) {
    // Extract subdomain from the selected domain
    const subdomain = extractSubdomainFromDomain(selectedDomain);
    log.debug(`Extracted subdomain: ${subdomain}`);

    if (subdomain) {
      subdomainInput.value = subdomain;
      updateDnsPreview();
    }
  }

  // Analyze domain structure if analysis module is available
  // Show loading message with debugging info
  if (domainAnalysisContent) {
    domainAnalysisContent.innerHTML =
      '<div class="analysis-loading">Attempting to load analyzer...</div>';
  }

  // Analyze domain structure if analysis module is available
  import("./domain-analyzer.js")
    .then(async (analyzer) => {
      if (domainAnalysisContent) {
        domainAnalysisContent.innerHTML =
          '<div class="analysis-loading">Import successful, analyzing domain...</div>';
      }

      try {
        // Perform domain analysis
        const analysis = await analyzer.analyzeDomainStructure(selectedDomain);

        // Update UI with analysis results
        if (domainAnalysisContent) {
          domainAnalysisContent.innerHTML =
            analyzer.renderDomainAnalysis(analysis);
        }
      } catch (error) {
        // Show error in UI instead of console
        if (domainAnalysisContent) {
          domainAnalysisContent.innerHTML = `
            <div class="empty-section-message error">
              Error analyzing domain: ${error.message}<br>
              <small>Stack: ${error.stack || "No stack available"}</small>
            </div>`;
        }
      }
    })
    .catch((err) => {
      // Show detailed import error in UI
      if (domainAnalysisContent) {
        domainAnalysisContent.innerHTML = `
          <div class="empty-section-message error">
            Failed to load domain analyzer<br>
            <small>Error: ${err.message}</small><br>
            <small>Type: ${err.constructor.name}</small><br>
            <small>Stack: ${err.stack || "No stack available"}</small>
          </div>`;
      }
    });
}

/**
 * Update DNS preview based on the current subdomain
 */
export function updateDnsPreview() {
  const dnsPreview = document.getElementById("dnsPreview");
  const subdomainInput = document.getElementById("subdomainInput");

  if (!dnsPreview || !subdomainInput) return;

  const subdomain = subdomainInput.value.trim();

  // Get root domain from app state
  const rootDomain = window.appState?.rootDomain;

  if (!rootDomain) {
    log.error("Root domain not available in app state");
    return;
  }

  if (subdomain) {
    dnsPreview.textContent = `${subdomain}.${rootDomain}`;
  } else {
    dnsPreview.textContent = rootDomain;
  }

  log.debug(`Updated DNS preview: ${dnsPreview.textContent}`);
}

/**
 * Refresh the list of domains
 */
export async function refreshDomainsList() {
  const refreshDomainsBtn = document.getElementById("refreshDomainsBtn");
  const domainSelect = document.getElementById("domainSelect");

  if (!refreshDomainsBtn || !domainSelect) return;

  // Store the currently selected domain
  const previouslySelected = domainSelect.value;
  log.debug(
    `Refreshing domains list (previous selection: ${previouslySelected})`
  );

  // Show loading state
  refreshDomainsBtn.disabled = true;
  const refreshIcon = refreshDomainsBtn.querySelector(".refresh-icon");
  if (refreshIcon) {
    refreshIcon.classList.add("spinning");
  }

  domainSelect.disabled = true;
  domainSelect.innerHTML = '<option value="">Loading domains...</option>';

  // Show status
  showStatus("info", "Refreshing domain list...");

  try {
    // Call the function to load domains
    await loadDomainFolders();

    // Try to restore the previously selected value
    if (previouslySelected) {
      for (let i = 0; i < domainSelect.options.length; i++) {
        if (domainSelect.options[i].value === previouslySelected) {
          domainSelect.selectedIndex = i;
          log.debug(
            `Restored previous domain selection: ${previouslySelected}`
          );
          break;
        }
      }
    }

    // Make sure to trigger change events
    const event = new Event("change");
    domainSelect.dispatchEvent(event);

    // Show success message
    showStatus("success", "Domain list refreshed successfully");
  } catch (error) {
    log.error(`Error refreshing domains: ${error.message}`);
    showStatus("error", `Failed to refresh domains: ${error.message}`);
  } finally {
    // Reset loading state
    refreshDomainsBtn.disabled = false;
    if (refreshIcon) {
      refreshIcon.classList.remove("spinning");
    }
    domainSelect.disabled = false;

    // Update button state
    updateTransferButton();
  }
}

/**
 * Create a new Virtualmin domain
 */
export async function handleCreateDomain() {
  const createDomainBtn = document.getElementById("createDomainBtn");
  const newSubdomainInput = document.getElementById("newSubdomainInput");
  const newDescriptionInput = document.getElementById("newDescriptionInput");
  const phpModeSelect = document.getElementById("phpModeSelect");
  const phpVersionSelect = document.getElementById("phpVersionSelect");
  const domainSelect = document.getElementById("domainSelect");

  if (!createDomainBtn) return;

  // Get form values
  const subdomain = newSubdomainInput ? newSubdomainInput.value.trim() : "";
  const description = newDescriptionInput
    ? newDescriptionInput.value.trim()
    : "";

  // Get PHP configuration
  const phpMode = phpModeSelect ? phpModeSelect.value : "fpm";
  const phpVersion = phpVersionSelect ? phpVersionSelect.value : "8.1";

  // Validate inputs
  if (!subdomain) {
    showStatus("error", "Please enter a subdomain name");
    addDomainLog("Missing subdomain name", "error");
    return;
  }

  // Validate subdomain format (alphanumeric and hyphens only)
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]+)?[a-z0-9]$/i;
  if (!subdomainRegex.test(subdomain)) {
    showStatus(
      "error",
      "Subdomain must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen"
    );
    addDomainLog("Invalid subdomain format", "error");
    return;
  }

  // Initialize the log box
  initDomainCreationLog();
  clearDomainLog();

  // Get root domain from app state
  const rootDomain = window.appState?.rootDomain;
  if (!rootDomain) {
    log.error("Root domain not available in app state");
    addDomainLog("Root domain not configured", "error");
    showStatus("error", "Root domain not configured");
    return;
  }

  // Add initial log messages
  addDomainLog(`Starting domain creation: ${subdomain}.${rootDomain}`, "info");
  addDomainLog(`PHP Configuration: ${phpMode} ${phpVersion}`, "debug");

  // Show loading indicator
  const completeLoading = showLoading("Creating domain");

  log.info(
    `Creating new domain: ${subdomain}.${rootDomain} with PHP ${phpVersion} (${phpMode})`
  );

  // Disable button and show loading state
  createDomainBtn.disabled = true;
  createDomainBtn.textContent = "Creating Subdomain...";
  showStatus("info", `Creating subdomain... (this may take a minute)`);

  try {
    if (window.streamNetAPI && window.streamNetAPI.createVirtualminDomain) {
      addCommandLog(
        `virtualmin create-domain --domain ${subdomain}.${rootDomain} --parent ${rootDomain} --desc "${
          description || "Created by StreamNet Panels"
        }" --web --dir`
      );

      const result = await window.streamNetAPI.createVirtualminDomain({
        subdomain,
        description,
        phpMode,
        phpVersion,
      });

      if (result.success) {
        // Show command output
        if (result.details) {
          addOutputLog(result.details);
        }

        // Show PHP configuration output
        addCommandLog(
          `virtualmin modify-web --domain ${result.domain.name} --php-mode ${phpMode} --php-version ${phpVersion}`
        );

        // Check if result contains a specific note about PHP configuration
        if (result.phpNote) {
          log.warn(
            `Domain created but PHP configuration failed: ${result.phpNote}`
          );
          addDomainLog(`PHP configuration note: ${result.phpNote}`, "warning");
          showStatus(
            "warning",
            `Domain created successfully, but ${result.phpNote}`
          );
          completeLoading(
            `Domain created, but PHP configuration had issues`,
            true
          );
        } else {
          log.info(`Successfully created subdomain: ${result.domain.name}`);
          addDomainLog(`Domain path: ${result.domain.path}`, "success");
          showStatus(
            "success",
            `Successfully created subdomain: ${result.domain.name}`
          );
          completeLoading(
            `Domain created successfully: ${result.domain.name}`,
            true
          );
        }

        // Close the modal
        setTimeout(() => {
          closeDomainModal();
        }, 3000);

        // Refresh the domains list
        await loadDomainFolders();

        // Select the newly created domain
        if (domainSelect) {
          const options = domainSelect.options;
          for (let i = 0; i < options.length; i++) {
            if (options[i].value === result.domain.name) {
              domainSelect.selectedIndex = i;
              // Trigger change event
              const event = new Event("change");
              domainSelect.dispatchEvent(event);
              log.debug(`Selected newly created domain: ${result.domain.name}`);
              break;
            }
          }
        }
      } else {
        // Parse the error to provide a more helpful message
        let errorMsg = result.error;

        // Check for specific error patterns
        if (errorMsg && errorMsg.includes("already exists")) {
          errorMsg = `The subdomain '${subdomain}' already exists. Please choose a different name.`;
        } else if (errorMsg && errorMsg.includes("permission denied")) {
          errorMsg = `Permission denied. The server doesn't have the rights to create this subdomain.`;
        }

        log.error(`Failed to create subdomain: ${errorMsg}`);
        addDomainLog(`Error: ${errorMsg}`, "error");
        showStatus("error", `Failed to create subdomain: ${errorMsg}`);
        completeLoading(`Domain creation failed`, false);
      }
    } else {
      log.error("Subdomain creation API not available");
      addDomainLog("Subdomain creation API not available", "error");
      showStatus("error", "Subdomain creation API not available");
      completeLoading(`API unavailable`, false);
    }
  } catch (error) {
    log.error(`Error creating subdomain: ${error.message}`);
    addDomainLog(`Exception: ${error.message}`, "error");
    showStatus("error", `Error creating subdomain: ${error.message}`);
    completeLoading(`Exception occurred`, false);
  } finally {
    // Reset button state
    createDomainBtn.disabled = false;
    createDomainBtn.textContent = "Create Subdomain";
  }
}

/**
 * Open the domain creation modal
 */
export function openDomainModal() {
  const domainModal = document.getElementById("domainModal");

  if (domainModal) {
    domainModal.style.display = "block";
    log.debug("Opened domain creation modal");

    // Focus on the subdomain input
    const newSubdomainInput = document.getElementById("newSubdomainInput");
    if (newSubdomainInput) {
      newSubdomainInput.focus();
    }
  }
}

/**
 * Close the domain creation modal
 */
export function closeDomainModal() {
  const domainModal = document.getElementById("domainModal");

  if (domainModal) {
    domainModal.style.display = "none";
    log.debug("Closed domain creation modal");
  }
}

/**
 * Update domain preview in the creation modal
 */
export function updateNewDomainPreview() {
  const newDomainPreview = document.getElementById("newDomainPreview");
  const newSubdomainInput = document.getElementById("newSubdomainInput");

  if (!newDomainPreview) return;

  const subdomain = newSubdomainInput ? newSubdomainInput.value.trim() : "";

  // Get root domain from app state
  const rootDomain = window.appState?.rootDomain;

  if (!rootDomain) {
    log.error("Root domain not available in app state");
    return;
  }

  if (subdomain) {
    newDomainPreview.textContent = `${subdomain}.${rootDomain}`;
  } else {
    newDomainPreview.textContent = rootDomain;
  }

  log.debug(`Updated domain preview: ${newDomainPreview.textContent}`);
}

/**
 * Initialize domain modal functionality
 */
export function initDomainModal() {
  const newDomainBtn = document.getElementById("newDomainBtn");
  const closeModal = document.querySelector(".close-modal");
  const cancelDomainBtn = document.getElementById("cancelDomainBtn");
  const createDomainBtn = document.getElementById("createDomainBtn");
  const newSubdomainInput = document.getElementById("newSubdomainInput");
  const domainModal = document.getElementById("domainModal");

  log.debug("Initializing domain modal");

  if (newDomainBtn) {
    newDomainBtn.addEventListener("click", () => {
      openDomainModal();
      // Initialize the log box when opening the modal
      initDomainCreationLog();

      // Add welcome message
      addDomainLog("Ready to create a new domain", "info");
      addDomainLog("Complete the form and click 'Create Subdomain'", "debug");
    });
  }

  if (closeModal) {
    closeModal.addEventListener("click", closeDomainModal);
  }

  if (cancelDomainBtn) {
    cancelDomainBtn.addEventListener("click", closeDomainModal);
  }

  if (createDomainBtn) {
    createDomainBtn.addEventListener("click", handleCreateDomain);
  }

  if (newSubdomainInput) {
    newSubdomainInput.addEventListener("input", updateNewDomainPreview);

    // Add validation feedback on input
    newSubdomainInput.addEventListener("input", function () {
      const subdomain = this.value.trim();
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]+)?[a-z0-9]$/i;

      if (subdomain) {
        if (subdomainRegex.test(subdomain)) {
          this.classList.remove("invalid-input");
          this.classList.add("valid-input");
          addDomainLog(`Subdomain format valid: ${subdomain}`, "success");
        } else {
          this.classList.remove("valid-input");
          this.classList.add("invalid-input");
          addDomainLog(
            "Invalid subdomain format - use only letters, numbers, and hyphens",
            "warning"
          );
        }
      } else {
        this.classList.remove("valid-input", "invalid-input");
      }
    });
  }

  // Initialize PHP configuration badge updates
  const phpModeSelect = document.getElementById("phpModeSelect");
  const phpVersionSelect = document.getElementById("phpVersionSelect");

  if (phpModeSelect && phpVersionSelect) {
    const updatePhpConfig = () => {
      const mode = phpModeSelect.value;
      const version = phpVersionSelect.value;
      addDomainLog(`PHP configuration set to: ${mode} ${version}`, "debug");
    };

    phpModeSelect.addEventListener("change", updatePhpConfig);
    phpVersionSelect.addEventListener("change", updatePhpConfig);
  }

  // Initialize with root domain in preview
  updateNewDomainPreview();

  // Close modal when clicking outside of it
  if (domainModal) {
    window.addEventListener("click", (event) => {
      if (event.target === domainModal) {
        closeDomainModal();
      }
    });
  }
}

/**
 * Helper function to get path from selected domain
 * @returns {string|null} Selected domain path or null
 */
export function getSelectedDomainPath() {
  const domainSelect = document.getElementById("domainSelect");
  if (!domainSelect) return null;

  const selectedOption = domainSelect.options[domainSelect.selectedIndex];
  if (selectedOption && selectedOption.dataset.path) {
    return selectedOption.dataset.path;
  }

  // Get root domain from app state
  const rootDomain = window.appState?.rootDomain;
  if (!rootDomain) {
    log.error("Root domain not available in app state");
    return null;
  }

  // If no path in dataset, construct a default path
  const domain = domainSelect.value;
  if (domain) {
    // Use proper path format based on domain structure
    return `/home/streamnet/domains/${domain}`;
  }

  return null;
}

export default {
  loadDomainFolders,
  handleDomainChange,
  refreshDomainsList,
  handleCreateDomain,
  initDomainModal,
  getSelectedDomainPath,
  updateDnsPreview,
  updateNewDomainPreview,
};
