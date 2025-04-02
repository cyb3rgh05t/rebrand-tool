/**
 * Config settings module for the renderer process
 * Handles loading, saving and displaying application configuration
 */
import { log } from "../utils/logging.js";
import { showStatus } from "./ui-helpers.js";

/**
 * Initialize configuration settings UI
 */
export function initConfigSettings() {
  log.info("Initializing configuration settings UI");

  // Load initial settings
  loadSettings();

  // Set up event listeners for save buttons
  setupSaveHandlers();
}

/**
 * Load settings from the main process and populate form
 */
async function loadSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.getConfig) {
      log.error("Config API not available");
      showStatus("error", "Config API not available", "settings");
      return;
    }

    // Show a loading message
    showStatus("info", "Loading configuration settings...", "settings");

    // Load all config sections
    const connectionConfig = await window.streamNetAPI.getConfig("connection");
    const cloudflareConfig = await window.streamNetAPI.getConfig("cloudflare");
    const pathsConfig = await window.streamNetAPI.getConfig("paths");
    const githubConfig = await window.streamNetAPI.getConfig("github");

    // Populate connection settings
    populateFormField("configServerHost", connectionConfig.host);
    populateFormField("configServerUser", connectionConfig.username);
    populateFormField("configServerPassword", connectionConfig.password);
    populateFormField("configServerPort", connectionConfig.port);

    // Populate Cloudflare settings
    populateFormField("configRootDomain", cloudflareConfig.rootDomain);
    populateFormField("configCloudflareToken", cloudflareConfig.apiToken);
    populateFormField("configCloudflareZoneId", cloudflareConfig.zoneId);
    populateFormField("configIpv4", cloudflareConfig.ipv4Address);

    // Populate path settings
    populateFormField("configBasePath", pathsConfig.basePath);
    populateFormField("configDestPath", pathsConfig.localDestination);

    // Populate GitHub settings
    populateFormField("configGithubToken", githubConfig.apiToken);
    populateFormField("configGithubOwner", githubConfig.owner);
    populateFormField("configGithubRepo", githubConfig.repo);

    log.info("Configuration settings loaded successfully");
    showStatus(
      "success",
      "Configuration settings loaded successfully",
      "settings"
    );
  } catch (error) {
    log.error(`Error loading configuration settings: ${error.message}`);
    showStatus(
      "error",
      `Failed to load configuration: ${error.message}`,
      "settings"
    );
  }
}

/**
 * Helper function to populate a form field
 */
function populateFormField(id, value) {
  const field = document.getElementById(id);
  if (field) {
    field.value = value || "";
  }
}

/**
 * Set up event handlers for save buttons
 */
function setupSaveHandlers() {
  // Connection settings
  const saveConnectionBtn = document.getElementById("saveConnectionConfig");
  if (saveConnectionBtn) {
    saveConnectionBtn.addEventListener("click", async () => {
      showStatus("info", "Saving connection settings...", "settings");
      await saveConnectionSettings();
    });
  }

  // Cloudflare settings
  const saveCloudflareBtn = document.getElementById("saveCloudflareConfig");
  if (saveCloudflareBtn) {
    saveCloudflareBtn.addEventListener("click", async () => {
      showStatus("info", "Saving Cloudflare settings...", "settings");
      await saveCloudflareSettings();
    });
  }

  // Paths settings
  const savePathsBtn = document.getElementById("savePathsConfig");
  if (savePathsBtn) {
    savePathsBtn.addEventListener("click", async () => {
      showStatus("info", "Saving path settings...", "settings");
      await savePathSettings();
    });
  }

  // GitHub settings
  const saveGithubBtn = document.getElementById("saveGithubConfig");
  if (saveGithubBtn) {
    saveGithubBtn.addEventListener("click", async () => {
      showStatus("info", "Saving GitHub settings...", "settings");
      await saveGithubSettings();
    });
  }
}

/**
 * Save connection settings with improved feedback
 */
async function saveConnectionSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Show saving status
    showStatus("info", "Saving connection settings...", "settings");

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
      showStatus(
        "success",
        "Connection settings saved and applied - no restart needed",
        "settings"
      );
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
 * Save Cloudflare settings with improved feedback
 */
async function saveCloudflareSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Show saving status
    showStatus("info", "Saving Cloudflare settings...", "settings");

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
      showStatus(
        "success",
        "Cloudflare settings saved and applied - no restart needed",
        "settings"
      );

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
 * Save path settings with improved feedback
 */
async function savePathSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Show saving status
    showStatus("info", "Saving path settings...", "settings");

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
      showStatus(
        "success",
        "Path settings saved and applied - no restart needed",
        "settings"
      );
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
 * Save GitHub settings with improved feedback
 */
async function saveGithubSettings() {
  try {
    // Don't proceed if the API is not available
    if (!window.streamNetAPI || !window.streamNetAPI.updateConfig) {
      log.error("Config API not available");
      showStatus("error", "Configuration API not available", "settings");
      return;
    }

    // Show saving status
    showStatus("info", "Saving GitHub settings...", "settings");

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
      showStatus(
        "success",
        "GitHub settings saved and applied - no restart needed",
        "settings"
      );

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

export default {
  initConfigSettings,
};
