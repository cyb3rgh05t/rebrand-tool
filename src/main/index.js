/**
 * Main Electron process for Rebrands Panels
 */
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Load environment variables first
const { loadEnvVars } = require("./utils/env-loader");
const envLoaded = loadEnvVars();
console.log("Environment variables loaded:", envLoaded);

// Now load other modules that may depend on environment variables
const { createLogger } = require("./utils/logger");
const { registerIpcHandlers } = require("./ipc-handlers");

// Import configuration (will now use env variables)
const CONFIG = require("../config/serverConfig");

// Import menu after configuration is loaded
const { createApplicationMenu, createContextMenu } = require("./menu");

// Create the main application logger
const logger = createLogger("main");

// Global reference to the main window
let mainWindow;

/**
 * Create the main application window
 */
function createWindow() {
  logger.info("Creating application window");

  // Check if dev tools should be enabled
  const enableDevTools = process.env.ENABLE_DEV_TOOLS === "true";

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: enableDevTools || process.env.NODE_ENV === "development",
    },
  });

  // Register all IPC handlers first
  registerIpcHandlers();

  // Load main HTML file
  mainWindow.loadFile(path.join(__dirname, "../../index.html"));

  // Create application menu and context menu after everything else
  createApplicationMenu(mainWindow);
  createContextMenu(mainWindow);

  // Open DevTools automatically if enabled
  if (enableDevTools || process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
    logger.debug("DevTools opened automatically");
  }

  // Log window creation
  logger.debug("Application window created and loaded");
}

/**
 * Ensure required directories exist
 */
function ensureDirectories() {
  logger.info("Checking application directories");

  // Validate configuration
  if (!CONFIG.paths || !CONFIG.paths.localDestination) {
    logger.error("Invalid configuration: localDestination path is undefined");

    // Add emergency fallback path
    CONFIG.paths = CONFIG.paths || {};
    CONFIG.paths.localDestination = CONFIG.paths.localDestination || "./temp";

    logger.info(
      `Using emergency fallback path: ${CONFIG.paths.localDestination}`
    );
  }

  // Check if localDestination exists and is writable
  logger.debug(
    `Checking if destination directory exists: ${CONFIG.paths.localDestination}`
  );

  try {
    if (!fs.existsSync(CONFIG.paths.localDestination)) {
      logger.info(
        `Creating destination directory: ${CONFIG.paths.localDestination}`
      );
      fs.mkdirSync(CONFIG.paths.localDestination, { recursive: true });
    }

    // Test write capability
    const testFile = path.join(CONFIG.paths.localDestination, "test-write.txt");
    fs.writeFileSync(testFile, "Test write permission");
    fs.unlinkSync(testFile); // Clean up test file

    logger.info(
      `Destination directory verified: ${CONFIG.paths.localDestination}`
    );
  } catch (err) {
    logger.error(
      `ERROR: Could not access or write to destination directory: ${CONFIG.paths.localDestination}`
    );
    logger.error(`Error details: ${err.message}`);

    // Show error dialog to user
    dialog.showErrorBox(
      "Directory Error",
      `Could not access or write to the destination directory: ${CONFIG.paths.localDestination}\n\n` +
        `Error: ${err.message}\n\n` +
        `Please check the configuration and ensure the directory exists and is writable.`
    );
  }
}

// Initialize the app when ready
app.whenReady().then(() => {
  logger.info("Application starting");

  // Ensure required directories exist
  ensureDirectories();

  // Create the main window
  createWindow();

  // Check for updates silently on startup (after a short delay)
  setTimeout(async () => {
    try {
      const updater = require("./updater");
      const updateResult = await updater.checkForUpdates();

      // If update is available, show it
      if (updateResult.updateAvailable && mainWindow) {
        updater.showUpdateDialog(updateResult, mainWindow);
      }
    } catch (error) {
      logger.error(`Silent update check failed: ${error.message}`);
    }
  }, 5000); // 5 second delay to allow app to finish loading

  // Re-create the window on macOS when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logger.info("All windows closed, quitting application");
    app.quit();
  }
});

// Log uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
});
