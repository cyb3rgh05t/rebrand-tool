/**
 * Enhanced settings functionality for StreamNet Panels
 * Redesigned as a full page rather than a modal
 */
import { log } from "../utils/logging.js";
import { showStatus } from "./ui-helpers.js";

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

  // GitHub repository link
  if (openGithubLink) {
    openGithubLink.addEventListener("click", (e) => {
      e.preventDefault();
      // Use Electron shell to open link in default browser if available
      if (window.streamNetAPI && window.streamNetAPI.openExternalLink) {
        window.streamNetAPI.openExternalLink(
          "https://github.com/cyb3rgh05t/rebrand-tool"
        );
      } else {
        // Fallback to window.open
        window.open("https://github.com/cyb3rgh05t/rebrand-tool", "_blank");
      }
    });
  }

  // Report issue link
  if (openReportIssueLink) {
    openReportIssueLink.addEventListener("click", (e) => {
      e.preventDefault();
      // Use Electron shell to open link in default browser if available
      if (window.streamNetAPI && window.streamNetAPI.openExternalLink) {
        window.streamNetAPI.openExternalLink(
          "https://github.com/cyb3rgh05t/rebrand-tool/issues/new"
        );
      } else {
        // Fallback to window.open
        window.open(
          "https://github.com/cyb3rgh05t/rebrand-tool/issues/new",
          "_blank"
        );
      }
    });
  }

  // Initialize theme selection
  initializeThemeSelection();

  // Initialize interface density selection
  initializeDensitySelection();

  // Initialize by syncing the connection status
  syncConnectionStatus();

  // Initialize log level in settings
  initializeLogLevel();

  log.debug("Enhanced settings functionality initialized");
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

      // Remove active class from all buttons and panes
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanes.forEach((pane) => pane.classList.remove("active"));

      // Add active class to the clicked button
      button.classList.add("active");

      // Find and activate the corresponding pane
      const targetPane = document.getElementById(`${targetTab}Tab`);
      if (targetPane) {
        targetPane.classList.add("active");
      }

      // Log tab switch
      log.debug(`Settings tab switched to: ${targetTab}`);
    });
  });

  log.debug("Settings tab navigation initialized");
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
      showStatus("success", "Path settings saved", "settings");
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
      showStatus("success", "GitHub settings saved", "settings");

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
        // Update available
        settingsUpdateStatus.className =
          "settings-status-message update-available";
        settingsUpdateStatus.innerHTML = `Update available: v${result.version} <a href="${result.downloadUrl}" target="_blank">Download now</a>`;
        log.info(`Update available: v${result.version}`);

        // Also update the toast notification
        const updateStatus = document.getElementById("updateStatus");
        if (updateStatus) {
          updateStatus.className = "update-toast update-available visible";
          updateStatus.innerHTML = `Update available: v${result.version} <a href="${result.downloadUrl}" target="_blank">Download now</a>`;
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

export default {
  initializeSettings,
  openSettingsModal,
  closeSettingsModal,
  testConnection,
  checkForUpdates,
};
