/**
 * Enhanced settings functionality for StreamNet Panels
 * Redesigned as a full page rather than a modal
 */
import { log } from "../utils/logging.js";
import { showStatus } from "./ui-helpers.js";

// Track active tab for persisting between opens
let activeTab = "general";

/**
 * Initialize settings functionality
 */
export function initializeSettings() {
  log.info("Initializing enhanced settings functionality");

  // Settings button in the header
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModalBtn = document.getElementById(
    "closeSettingsModalBtn"
  );

  // Settings panel buttons
  const settingsTestConnectionBtn = document.getElementById(
    "settingsTestConnectionBtn"
  );
  const settingsCheckUpdatesBtn = document.getElementById(
    "settingsCheckUpdatesBtn"
  );
  const settingsOpenDebugBtn = document.getElementById("settingsOpenDebugBtn");

  // Connection indicators (header and settings panel)
  const headerConnectionIndicator = document.getElementById(
    "connectionIndicator"
  );
  const headerConnectionText = document.getElementById("connectionText");
  const settingsConnectionIndicator = document.getElementById(
    "settingsConnectionIndicator"
  );
  const settingsConnectionText = document.getElementById(
    "settingsConnectionText"
  );

  // About section links
  const openGithubLink = document.getElementById("openGithubLink");
  const openReportIssueLink = document.getElementById("openReportIssueLink");

  // Version display in settings
  const settingsVersionTag = document.getElementById("settingsVersionTag");
  const aboutVersionTag = document.getElementById("aboutVersionTag");

  // Sync both version tags
  updateVersionTags(settingsVersionTag, aboutVersionTag);

  // Initialize tab navigation
  initializeTabNavigation();

  // Open settings when gear icon is clicked
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      openSettingsModal();
    });
  }

  // Close settings
  if (closeSettingsModalBtn) {
    closeSettingsModalBtn.addEventListener("click", () => {
      closeSettingsModal();
    });
  }

  // Close settings when clicking escape key
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      settingsModal &&
      settingsModal.style.display !== "none"
    ) {
      closeSettingsModal();
    }
  });

  // Test connection button in settings
  if (settingsTestConnectionBtn) {
    settingsTestConnectionBtn.addEventListener("click", async () => {
      await testConnection();
    });
  }

  // Check updates button in settings
  if (settingsCheckUpdatesBtn) {
    settingsCheckUpdatesBtn.addEventListener("click", async () => {
      await checkForUpdates();
    });
  }

  // Open debug console button in settings
  if (settingsOpenDebugBtn) {
    settingsOpenDebugBtn.addEventListener("click", () => {
      const debugModal = document.getElementById("debugModal");
      if (debugModal) {
        debugModal.style.display = "block";
        closeSettingsModal(); // Close settings when opening debug
      }
    });
  }

  // Setup "Download Now" functionality in about section
  setupDownloadNowButton();

  // Initialize theme selection
  initializeThemeSelection();

  // Initialize interface density selection
  initializeDensitySelection();

  // Initialize by syncing the connection status
  syncConnectionStatus();

  // Initialize log level in settings
  initializeLogLevel();

  setupAboutButtons();

  log.debug("Enhanced settings functionality initialized");
}

/**
 * Set up download now button functionality in the about tab
 */
function setupDownloadNowButton() {
  const downloadNowButton = document.getElementById("aboutDownloadButton");

  if (downloadNowButton) {
    log.debug("Setting up Download Now button in about tab");

    downloadNowButton.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        const downloadUrl = downloadNowButton.getAttribute("data-url");
        const version = downloadNowButton.getAttribute("data-version");

        if (
          !downloadUrl ||
          downloadUrl === "#" ||
          downloadUrl === "javascript:void(0)"
        ) {
          log.warn("Download button clicked but no valid URL is set");
          showStatus("error", "No valid download URL available", "settings");
          return;
        }

        log.info(`Initiating download from about section: ${downloadUrl}`);

        // Use the update-dialog's download progress dialog
        const updateDialog = await import("./update-dialog.js");

        // Generate a filename
        const filename = `rebrand-tool-v${version || "latest"}-setup.exe`;

        // Show the download dialog
        updateDialog.showDownloadProgressDialog(
          downloadUrl,
          version || "latest",
          filename
        );
      } catch (error) {
        log.error(`Error handling download button click: ${error.message}`);

        // Fallback to direct link if there's an error
        const downloadUrl = downloadNowButton.getAttribute("data-url");
        if (
          downloadUrl &&
          downloadUrl !== "#" &&
          downloadUrl !== "javascript:void(0)"
        ) {
          window.open(downloadUrl, "_blank");
        } else {
          showStatus("error", "Download failed: Invalid URL", "settings");
        }
      }
    });
  }
}

/**
 * Update version tags throughout the settings page
 */
function updateVersionTags(...versionElements) {
  // Try to get version from Electron app
  if (window.streamNetAPI && window.streamNetAPI.getAppVersion) {
    window.streamNetAPI
      .getAppVersion()
      .then((version) => {
        // Update all version elements provided
        versionElements.forEach((element) => {
          if (element) element.textContent = version;
        });
        log.debug(`Updated version tags to: ${version}`);
      })
      .catch((err) => {
        log.warn(`Failed to get version for settings: ${err.message}`);
        // Set default version on error
        versionElements.forEach((element) => {
          if (element) element.textContent = "unknown";
        });
      });
  } else {
    // Set default version if API not available
    versionElements.forEach((element) => {
      if (element) element.textContent = "unknown";
    });
  }
}

/**
 * Initialize tab navigation for settings page
 */
function initializeTabNavigation() {
  const tabButtons = document.querySelectorAll(".settings-nav-item");
  const tabPanes = document.querySelectorAll(".settings-tab-pane");

  // Set up tab click handlers
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Get the target tab
      const targetTab = button.getAttribute("data-tab");

      // Save active tab for next time
      activeTab = targetTab;

      // Remove active class from all buttons and panes
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      // Add active class to the clicked button
      button.classList.add("active");

      // Find and activate the corresponding pane
      const targetPane = document.getElementById(`${targetTab}Tab`);
      if (targetPane) {
        targetPane.classList.add("active");

        // Special handling for the about tab
        if (targetTab === "about") {
          // Keep the existing update check code
          checkForUpdatesOnAboutTab();
          setupAboutButtons();
        }
      }

      // Log tab switch
      log.debug(`Settings tab switched to: ${targetTab}`);
    });
  });

  log.debug("Settings tab navigation initialized");
}

/**
 * Automatically check for updates when the about tab is activated
 */
function checkForUpdatesOnAboutTab() {
  log.debug("About tab selected, checking for updates");
  const settingsUpdateStatus = document.getElementById("settingsUpdateStatus");

  if (settingsUpdateStatus) {
    // Show checking status
    settingsUpdateStatus.className = "settings-status-message checking";
    settingsUpdateStatus.textContent = "Checking for updates...";
  }

  // Delay slightly to ensure UI updates first
  setTimeout(() => {
    checkForUpdates();
  }, 100);
}

/**
 * Initialize theme selection
 */
function initializeThemeSelection() {
  const themeOptions = document.querySelectorAll('input[name="theme"]');

  // Load saved theme if available
  const savedTheme = localStorage.getItem("streamnet-theme") || "dark";

  // Define allowed themes
  const allowedThemes = [
    "dark",
    "light",
    "nord",
    "dracula",
    "onedark",
    "overseerr",
    "spacegray",
    "hotline",
    "aquamarine",
    "hotpink",
    "maroon",
    "organizr",
    "plex",
  ];

  // Set the saved theme as checked but only if it's a valid theme
  themeOptions.forEach((option) => {
    if (option.value === savedTheme && allowedThemes.includes(option.value)) {
      option.checked = true;
    } else if (!allowedThemes.includes(savedTheme)) {
      // Default to dark theme if saved theme is not valid
      if (option.value === "dark") {
        option.checked = true;
      }
    }

    // Add change handler
    option.addEventListener("change", (e) => {
      if (e.target.checked) {
        // Set theme on HTML element
        document.documentElement.className = `theme-${e.target.value}`;

        // Save theme preference
        localStorage.setItem("streamnet-theme", e.target.value);

        log.info(`Theme changed to: ${e.target.value}`);
        showStatus(
          "info",
          `Theme changed to ${getThemeDisplayName(e.target.value)}`
        );
      }
    });
  });

  // Apply theme on load but only if it's a valid theme
  if (allowedThemes.includes(savedTheme)) {
    document.documentElement.className = `theme-${savedTheme}`;
  } else {
    document.documentElement.className = "theme-dark";
  }

  log.debug(`Theme initialized: ${savedTheme}`);
}

/**
 * Get a user-friendly display name for a theme
 * @param {string} themeValue - The theme value/id
 * @return {string} The display name of the theme
 */
function getThemeDisplayName(themeValue) {
  const themeNames = {
    dark: "Dark",
    light: "Light",
    nord: "Nord",
    dracula: "Dracula",
    onedark: "One Dark",
    overseerr: "Overseerr",
    spacegray: "Space Gray",
    hotline: "Hotline",
    aquamarine: "Aquamarine",
    hotpink: "Hot Pink",
    maroon: "Maroon",
    organizr: "Organizr",
    plex: "Plex",
  };

  return themeNames[themeValue] || themeValue;
}

/**
 * Initialize interface density selection
 */
function initializeDensitySelection() {
  const densityOptions = document.querySelectorAll('input[name="density"]');

  // Load saved density if available
  const savedDensity =
    localStorage.getItem("streamnet-density") || "comfortable";

  // Set the saved density as checked
  densityOptions.forEach((option) => {
    if (option.value === savedDensity) {
      option.checked = true;
    }

    // Add change handler
    option.addEventListener("change", (e) => {
      if (e.target.checked) {
        // Apply density class to body
        document.body.classList.remove(
          "density-comfortable",
          "density-compact"
        );
        document.body.classList.add(`density-${e.target.value}`);

        // Save density preference
        localStorage.setItem("streamnet-density", e.target.value);

        log.info(`Interface density changed to: ${e.target.value}`);
        showStatus("info", `Interface density changed to ${e.target.value}`);
      }
    });
  });

  // Apply saved density on load
  document.body.classList.add(`density-${savedDensity}`);

  log.debug(`Interface density initialized: ${savedDensity}`);
}

/**
 * Initialize log level in settings
 */
function initializeLogLevel() {
  const logLevelSelect = document.getElementById("settingsLogLevel");
  const mainLogLevelSelect = document.getElementById("logLevelSelect");

  if (logLevelSelect && mainLogLevelSelect) {
    // Get current log level from the main log level select
    logLevelSelect.value = mainLogLevelSelect.value;

    // Add change handler
    logLevelSelect.addEventListener("change", function () {
      const level = parseInt(this.value, 10);

      // Sync with main log level select
      mainLogLevelSelect.value = level;

      // Update app log level
      if (window.app && window.app.log) {
        window.app.log.setLogLevel(level);
        log.info(`Log level set to: ${level}`);
      }
    });
  }
}

/**
 * Open the settings page
 */
export function openSettingsModal() {
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    // Show with smooth animation
    settingsModal.style.display = "flex";

    // Add class for animation if needed
    settingsModal.classList.add("active");

    log.debug("Settings page opened");

    // Sync connection status when opening
    syncConnectionStatus();

    // Activate the previously active tab
    activateTab(activeTab);
  }
}

/**
 * Activate a specific settings tab
 * @param {string} tabName The name of the tab to activate
 */
function activateTab(tabName) {
  const tabButton = document.querySelector(
    `.settings-nav-item[data-tab="${tabName}"]`
  );
  const tabPane = document.getElementById(`${tabName}Tab`);

  if (tabButton && tabPane) {
    // Deactivate all tabs
    document.querySelectorAll(".settings-nav-item").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelectorAll(".settings-tab-pane").forEach((pane) => {
      pane.classList.remove("active");
    });

    // Activate the desired tab
    tabButton.classList.add("active");
    tabPane.classList.add("active");

    // If it's the about tab, trigger update check
    if (tabName === "about") {
      checkForUpdatesOnAboutTab();
    }

    log.debug(`Activated settings tab: ${tabName}`);
  }
}

/**
 * Close the settings page
 */
export function closeSettingsModal() {
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    // Remove active class first (for animation)
    settingsModal.classList.remove("active");

    // Then hide element
    settingsModal.style.display = "none";

    log.debug("Settings page closed");
  }
}

/**
 * Save connection settings
 */
async function saveConnectionSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Get form values
    const host = getFieldValue("configServerHost");
    const username = getFieldValue("configServerUser");
    const password = getFieldValue("configServerPassword");
    const port = getFieldValue("configServerPort", true);

    // Simple validation
    if (!host) {
      showStatus("error", "Server host is required", "settings");
      return;
    }

    // Prepare config object
    const connectionConfig = {
      host,
      username,
      password,
      port: port || 22,
    };

    // Save through the API
    const result = await window.streamNetAPI.updateConfig(
      "connection",
      connectionConfig
    );

    if (result.success) {
      log.info("Connection settings saved successfully");
      showStatus("success", "Connection settings saved", "settings");
    } else {
      log.error(`Failed to save connection settings: ${result.error}`);
      showStatus(
        "error",
        `Failed to save connection settings: ${result.error}`,
        "settings"
      );
    }
  } catch (error) {
    log.error(`Error saving connection settings: ${error.message}`);
    showStatus(
      "error",
      `Error saving connection settings: ${error.message}`,
      "settings"
    );
  }
}

/**
 * Save Cloudflare settings
 */
async function saveCloudflareSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Get form values
    const rootDomain = getFieldValue("configRootDomain");
    const apiToken = getFieldValue("configCloudflareToken");
    const zoneId = getFieldValue("configCloudflareZoneId");
    const ipv4Address = getFieldValue("configIpv4");

    // Simple validation
    if (!rootDomain) {
      showStatus("error", "Root domain is required", "settings");
      return;
    }

    // Prepare config object - only update what's provided
    const cloudflareConfig = {
      rootDomain,
    };

    if (apiToken) cloudflareConfig.apiToken = apiToken;
    if (zoneId) cloudflareConfig.zoneId = zoneId;
    if (ipv4Address) cloudflareConfig.ipv4Address = ipv4Address;

    // Save through the API
    const result = await window.streamNetAPI.updateConfig(
      "cloudflare",
      cloudflareConfig
    );

    if (result.success) {
      log.info("Cloudflare settings saved successfully");
      showStatus("success", "Cloudflare settings saved", "settings");

      // Update global state for the root domain
      window.appState.rootDomain = rootDomain;
    } else {
      log.error(`Failed to save Cloudflare settings: ${result.error}`);
      showStatus(
        "error",
        `Failed to save Cloudflare settings: ${result.error}`,
        "settings"
      );
    }
  } catch (error) {
    log.error(`Error saving Cloudflare settings: ${error.message}`);
    showStatus(
      "error",
      `Error saving Cloudflare settings: ${error.message}`,
      "settings"
    );
  }
}

/**
 * Save path settings
 */
async function savePathSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Get form values
    const basePath = getFieldValue("configBasePath");
    const localDestination = getFieldValue("configDestPath");

    // Simple validation
    if (!basePath || !localDestination) {
      showStatus(
        "error",
        "Both source and destination paths are required",
        "settings"
      );
      return;
    }

    // Prepare config object
    const pathsConfig = {
      basePath,
      localDestination,
    };

    // Save through the API
    const result = await window.streamNetAPI.updateConfig("paths", pathsConfig);

    if (result.success) {
      log.info("Path settings saved successfully");
      showStatus("success", "Path settings saved successfully", "settings");
    } else {
      log.error(`Failed to save path settings: ${result.error}`);
      showStatus(
        "error",
        `Failed to save path settings: ${result.error}`,
        "settings"
      );
    }
  } catch (error) {
    log.error(`Error saving path settings: ${error.message}`);
    showStatus(
      "error",
      `Error saving path settings: ${error.message}`,
      "settings"
    );
  }
}

/**
 * Save GitHub settings
 */
async function saveGithubSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Get form values
    const apiToken = getFieldValue("configGithubToken");
    const owner = getFieldValue("configGithubOwner");
    const repo = getFieldValue("configGithubRepo");

    // Prepare config object - only update what's provided
    const githubConfig = {};

    if (apiToken) githubConfig.apiToken = apiToken;
    if (owner) githubConfig.owner = owner;
    if (repo) githubConfig.repo = repo;

    // Save through the API
    const result = await window.streamNetAPI.updateConfig(
      "github",
      githubConfig
    );

    if (result.success) {
      log.info("GitHub settings saved successfully");
      showStatus("success", "GitHub settings saved successfully", "settings");

      // If we just updated the GitHub token, we should check for updates
      if (apiToken) {
        try {
          // Try to check for updates with the new token
          if (window.streamNetAPI && window.streamNetAPI.checkForUpdates) {
            setTimeout(async () => {
              await window.streamNetAPI.checkForUpdates();
              log.info("Triggered update check with new GitHub token");
            }, 1000); // Small delay to ensure settings are saved
          }
        } catch (updateError) {
          log.warn(
            `Update check after token update failed: ${updateError.message}`
          );
        }
      }
    } else {
      log.error(`Failed to save GitHub settings: ${result.error}`);
      showStatus(
        "error",
        `Failed to save GitHub settings: ${result.error}`,
        "settings"
      );
    }
  } catch (error) {
    log.error(`Error saving GitHub settings: ${error.message}`);
    showStatus(
      "error",
      `Error saving GitHub settings: ${error.message}`,
      "settings"
    );
  }
}

/**
 * Helper function to get field value
 * @param {string} id - Field ID
 * @param {boolean} isNumber - Whether to parse as number
 */
function getFieldValue(id, isNumber = false) {
  const field = document.getElementById(id);
  if (!field) return null;

  const value = field.value.trim();
  return isNumber ? (value ? parseInt(value, 10) : null) : value;
}

/**
 * Test server connection and update both header and settings indicators
 */
export async function testConnection() {
  const settingsConnectionIndicator = document.getElementById(
    "settingsConnectionIndicator"
  );
  const settingsConnectionText = document.getElementById(
    "settingsConnectionText"
  );
  const settingsTestConnectionBtn = document.getElementById(
    "settingsTestConnectionBtn"
  );

  // Set to checking state
  if (settingsConnectionIndicator) {
    settingsConnectionIndicator.className = "status-indicator checking";
  }
  if (settingsConnectionText) {
    settingsConnectionText.textContent = "Checking connection...";
  }

  // Update button to show it's processing
  if (settingsTestConnectionBtn) {
    settingsTestConnectionBtn.disabled = true;
    const originalButtonText = settingsTestConnectionBtn.innerHTML;
    settingsTestConnectionBtn.innerHTML =
      '<span class="button-icon spinning">↻</span> Checking...';

    // Function to restore button state
    const restoreButton = () => {
      settingsTestConnectionBtn.disabled = false;
      settingsTestConnectionBtn.innerHTML = originalButtonText;
    };

    try {
      log.info("Testing server connection from settings");

      if (window.streamNetAPI && window.streamNetAPI.testConnection) {
        const result = await window.streamNetAPI.testConnection();

        if (result.success) {
          log.info("Connection test successful");

          // Update settings indicators
          if (settingsConnectionIndicator) {
            settingsConnectionIndicator.className =
              "status-indicator connected";
          }
          if (settingsConnectionText) {
            settingsConnectionText.textContent = "Connected";
          }

          // Update header indicators and global state
          window.appState.connectionStatus = "connected";
          updateHeaderConnectionStatus(true);

          showStatus("success", "Connection test successful", "settings");
        } else {
          log.error(`Connection test failed: ${result.error}`);

          // Update settings indicators
          if (settingsConnectionIndicator) {
            settingsConnectionIndicator.className =
              "status-indicator disconnected";
          }
          if (settingsConnectionText) {
            settingsConnectionText.textContent = `Connection failed: ${result.error}`;
          }

          // Update header indicators and global state
          window.appState.connectionStatus = "disconnected";
          updateHeaderConnectionStatus(false);

          showStatus("error", `Connection failed: ${result.error}`, "settings");
        }
      } else {
        log.error("Connection API not available");

        // Update settings indicators
        if (settingsConnectionIndicator) {
          settingsConnectionIndicator.className =
            "status-indicator disconnected";
        }
        if (settingsConnectionText) {
          settingsConnectionText.textContent = "Connection API not available";
        }

        // Update header
        window.appState.connectionStatus = "disconnected";
        updateHeaderConnectionStatus(false);

        showStatus("error", "Connection API not available", "settings");
      }
    } catch (error) {
      log.error(`Error during connection test: ${error.message}`);

      // Update settings indicators
      if (settingsConnectionIndicator) {
        settingsConnectionIndicator.className = "status-indicator disconnected";
      }
      if (settingsConnectionText) {
        settingsConnectionText.textContent = `Connection error: ${error.message}`;
      }

      // Update header
      window.appState.connectionStatus = "disconnected";
      updateHeaderConnectionStatus(false);

      showStatus("error", `Connection error: ${error.message}`, "settings");
    } finally {
      // Restore button state
      restoreButton();
    }
  }
}

/**
 * Update the connection status in the header
 * @param {boolean} connected Whether the connection was successful
 */
function updateHeaderConnectionStatus(connected) {
  const headerConnectionIndicator = document.getElementById(
    "connectionIndicator"
  );
  const headerConnectionText = document.getElementById("connectionText");

  if (!headerConnectionIndicator || !headerConnectionText) return;

  if (connected) {
    headerConnectionIndicator.className = "status-indicator connected";
    headerConnectionText.textContent = "Connected";
  } else {
    headerConnectionIndicator.className = "status-indicator disconnected";
    headerConnectionText.textContent = "Connection failed";
  }
}

/**
 * Sync connection status between header and settings
 */
function syncConnectionStatus() {
  const settingsConnectionIndicator = document.getElementById(
    "settingsConnectionIndicator"
  );
  const settingsConnectionText = document.getElementById(
    "settingsConnectionText"
  );

  if (!settingsConnectionIndicator || !settingsConnectionText) return;

  // If we have a cached connection status, use it
  if (window.appState?.connectionStatus) {
    if (window.appState.connectionStatus === "connected") {
      settingsConnectionIndicator.className = "status-indicator connected";
      settingsConnectionText.textContent = "Connected";
    } else if (window.appState.connectionStatus === "disconnected") {
      settingsConnectionIndicator.className = "status-indicator disconnected";
      settingsConnectionText.textContent = "Connection failed";
    } else {
      settingsConnectionIndicator.className = "status-indicator checking";
      settingsConnectionText.textContent = "Checking connection...";
    }
  } else {
    // No cached status, set to unknown
    settingsConnectionIndicator.className = "status-indicator";
    settingsConnectionText.textContent = "Status unknown";
  }
}

/**
 * Check for application updates
 */
export async function checkForUpdates() {
  const settingsUpdateStatus = document.getElementById("settingsUpdateStatus");
  const settingsCheckUpdatesBtn = document.getElementById(
    "settingsCheckUpdatesBtn"
  );

  if (!settingsUpdateStatus || !settingsCheckUpdatesBtn) return;

  // Store original button text to restore later
  const originalButtonText = settingsCheckUpdatesBtn.innerHTML;

  // Show loading state
  settingsCheckUpdatesBtn.disabled = true;
  settingsCheckUpdatesBtn.innerHTML =
    '<span class="button-icon spinning">↻</span> Checking...';

  // Display checking status
  settingsUpdateStatus.className = "settings-status-message checking";
  settingsUpdateStatus.textContent = "Checking for updates...";

  try {
    if (window.streamNetAPI && window.streamNetAPI.checkForUpdates) {
      const result = await window.streamNetAPI.checkForUpdates();

      if (result.updateAvailable) {
        // Update status message with download link
        settingsUpdateStatus.className =
          "settings-status-message update-available";

        // Add the "Download now" link directly in the status message if we have a valid URL
        if (result.downloadUrl && result.downloadUrl !== "#") {
          settingsUpdateStatus.innerHTML = `Update available: v${result.version} <a href="javascript:void(0)" data-url="${result.downloadUrl}" data-version="${result.version}">Download now</a>`;

          // Set up event listener for the download link
          setTimeout(() => {
            const downloadLink = settingsUpdateStatus.querySelector("a");
            if (downloadLink) {
              downloadLink.addEventListener("click", async (e) => {
                e.preventDefault();
                const url = downloadLink.getAttribute("data-url");
                const version = downloadLink.getAttribute("data-version");

                if (url && url !== "#" && url !== "javascript:void(0)") {
                  // Use the update-dialog's download functionality
                  try {
                    const updateDialog = await import("./update-dialog.js");
                    const filename = `rebrand-tool-v${
                      version || "latest"
                    }-setup.exe`;
                    updateDialog.showDownloadProgressDialog(
                      url,
                      version,
                      filename
                    );
                  } catch (err) {
                    log.error(`Error showing download dialog: ${err.message}`);
                    window.open(url, "_blank");
                  }
                } else {
                  showStatus("error", "Invalid download URL", "settings");
                }
              });
            }
          }, 100);
        } else {
          settingsUpdateStatus.innerHTML = `Update available: v${result.version}`;
        }

        log.info(`Update available: v${result.version}`);

        // Also update the toast notification
        const updateStatus = document.getElementById("updateStatus");
        if (updateStatus) {
          // Make sure we don't use "#" as href
          updateStatus.className = "update-toast update-available visible";
          // Create a proper download link with valid attributes
          if (result.downloadUrl && result.downloadUrl !== "#") {
            updateStatus.innerHTML = `Update available: v${result.version} <a href="javascript:void(0)" data-url="${result.downloadUrl}" data-version="${result.version}">Download now</a>`;
          } else {
            updateStatus.innerHTML = `Update available: v${result.version}`;
          }
        }

        showStatus("info", `Update available: v${result.version}`);
      } else {
        // No update available
        settingsUpdateStatus.className =
          "settings-status-message update-not-available";
        settingsUpdateStatus.textContent = `You're using the latest version (v${result.currentVersion})`;
        log.info("No updates available");
      }
    } else {
      // API not available
      settingsUpdateStatus.className = "settings-status-message error";
      settingsUpdateStatus.textContent = "Update checking is not available";
      log.error("Update API not available");
    }
  } catch (error) {
    // Error occurred
    settingsUpdateStatus.className = "settings-status-message error";
    settingsUpdateStatus.textContent = `Error checking for updates: ${error.message}`;
    log.error(`Error checking for updates: ${error.message}`);
  } finally {
    // Reset button state with original content
    settingsCheckUpdatesBtn.disabled = false;
    settingsCheckUpdatesBtn.innerHTML = originalButtonText;
  }
}

/**
 * Set up the GitHub and Issue buttons in the About tab
 */
function setupAboutButtons() {
  log.debug("Setting up About tab buttons");

  const githubButton = document.getElementById("openGithubLink");
  const issueButton = document.getElementById("openReportIssueLink");

  if (githubButton) {
    // Remove any existing listeners to avoid duplicates
    githubButton.replaceWith(githubButton.cloneNode(true));

    // Get the fresh reference after replacement
    const freshGithubButton = document.getElementById("openGithubLink");

    if (freshGithubButton) {
      freshGithubButton.addEventListener("click", function () {
        log.info("GitHub button clicked");
        if (window.streamNetAPI && window.streamNetAPI.openGitHubRepo) {
          window.streamNetAPI
            .openGitHubRepo()
            .then((result) => {
              if (!result.success) {
                log.error(`Failed to open GitHub repo: ${result.error}`);
              }
            })
            .catch((err) => {
              log.error(`Error calling openGitHubRepo: ${err.message}`);
            });
        } else {
          log.warn("openGitHubRepo API not available, using fallback");
          window.open("https://github.com/cyb3rgh05t/rebrand-tool", "_blank");
        }
      });
      log.debug("GitHub button handler attached");
    }
  } else {
    log.warn("GitHub button not found");
  }

  if (issueButton) {
    // Remove any existing listeners to avoid duplicates
    issueButton.replaceWith(issueButton.cloneNode(true));

    // Get the fresh reference after replacement
    const freshIssueButton = document.getElementById("openReportIssueLink");

    if (freshIssueButton) {
      freshIssueButton.addEventListener("click", function () {
        log.info("Issue button clicked");
        if (window.streamNetAPI && window.streamNetAPI.openIssuePage) {
          window.streamNetAPI
            .openIssuePage()
            .then((result) => {
              if (!result.success) {
                log.error(`Failed to open issue page: ${result.error}`);
              }
            })
            .catch((err) => {
              log.error(`Error calling openIssuePage: ${err.message}`);
            });
        } else {
          log.warn("openIssuePage API not available, using fallback");
          window.open(
            "https://github.com/cyb3rgh05t/rebrand-tool/issues/new",
            "_blank"
          );
        }
      });
      log.debug("Issue button handler attached");
    }
  } else {
    log.warn("Issue button not found");
  }
}

/**
 * Register save button event handlers for configuration panels
 * This is used to set up the save handlers for all configuration sections
 */
function registerSaveHandlers() {
  const saveConnectionBtn = document.getElementById("saveConnectionBtn");
  const saveCloudflareBtn = document.getElementById("saveCloudflareBtn");
  const savePathsBtn = document.getElementById("savePathsBtn");
  const saveGithubBtn = document.getElementById("saveGithubBtn");

  if (saveConnectionBtn) {
    saveConnectionBtn.addEventListener("click", saveConnectionSettings);
  }

  if (saveCloudflareBtn) {
    saveCloudflareBtn.addEventListener("click", saveCloudflareSettings);
  }

  if (savePathsBtn) {
    savePathsBtn.addEventListener("click", savePathSettings);
  }

  if (saveGithubBtn) {
    saveGithubBtn.addEventListener("click", saveGithubSettings);
  }
}

export default {
  initializeSettings,
  openSettingsModal,
  closeSettingsModal,
  testConnection,
  checkForUpdates,
};
