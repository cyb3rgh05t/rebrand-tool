/**
 * Configuration Service for StreamNet Panels
 * Manages configuration changes and notifies modules
 */
const { BrowserWindow } = require("electron");
const configManager = require("../config-manager");
const { createLogger } = require("../utils/logger");

// Create a logger for the config service
const logger = createLogger("config-service");

// Map of modules that need to be notified of config changes
const configDependentModules = new Map();

/**
 * Initialize the config service
 */
function initialize() {
  logger.info("Initializing configuration service");

  // Add event listener to config manager
  configManager.on("config-changed", (data) => {
    handleConfigChange(data);
  });

  logger.debug("Configuration service initialized");
}

/**
 * Register a module to be notified of config changes
 * @param {string} moduleName - Name of the module
 * @param {Object} handler - Handler object with onConfigChanged method
 */
function registerModule(moduleName, handler) {
  if (typeof handler.onConfigChanged !== "function") {
    throw new Error(`Module ${moduleName} must have an onConfigChanged method`);
  }

  configDependentModules.set(moduleName, handler);
  logger.debug(`Module registered for config changes: ${moduleName}`);
}

/**
 * Handle configuration changes
 * @param {Object} data - Change information
 */
function handleConfigChange(data) {
  try {
    logger.debug(`Configuration changed: ${JSON.stringify(data)}`);

    // Notify all registered modules about the change
    for (const [
      moduleName,
      moduleHandler,
    ] of configDependentModules.entries()) {
      try {
        moduleHandler.onConfigChanged(data);
      } catch (error) {
        logger.error(
          `Error notifying module ${moduleName} of config change: ${error.message}`
        );
      }
    }

    // Broadcast to all renderer processes
    broadcastConfigChange(data);
  } catch (error) {
    logger.error(`Error handling config change: ${error.message}`);
  }
}

/**
 * Broadcast config changes to all renderer processes
 * @param {Object} data - Change information to broadcast
 */
function broadcastConfigChange(data) {
  try {
    // Get all BrowserWindows
    const windows = BrowserWindow.getAllWindows();

    for (const window of windows) {
      if (!window.isDestroyed()) {
        logger.debug(`Broadcasting config change to window ${window.id}`);
        window.webContents.send("config-changed", data);
      }
    }
  } catch (error) {
    logger.error(`Error broadcasting config change: ${error.message}`);
  }
}

// Export the service API
module.exports = {
  initialize,
  registerModule,
};
