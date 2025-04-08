/**
 * IPC handlers for StreamNet Panels
 * This module registers all the IPC handlers that the renderer process uses
 */
const { ipcMain, BrowserWindow, app, dialog, shell } = require("electron");
const { createLogger } = require("./utils/logger");
const connection = require("./connection");
const filesystem = require("./filesystem");
const dns = require("./dns");
const virtualmin = require("./virtualmin");
const path = require("path");
const fs = require("fs");
const configManager = require("./config-manager");

// Create a logger for IPC handlers
const logger = createLogger("ipc");

/**
 * Get the application version from multiple sources
 * @returns {string} Application version
 */
function getApplicationVersion() {
  // First try to get version from Electron app
  let version = app.getVersion();

  // If we got a valid version, return it
  if (version && version !== "0.0.0") {
    logger.debug(`Using version from Electron app: ${version}`);
    return version;
  }

  // If app version is not available or is default, try package.json
  try {
    // Try multiple paths for package.json (development vs production)
    const possiblePaths = [
      path.join(app.getAppPath(), "package.json"),
      path.join(process.cwd(), "package.json"),
      path.join(__dirname, "../../package.json"),
      path.join(process.resourcesPath || "", "app/package.json"),
      path.join(process.resourcesPath || "", "app.asar/package.json"),
    ];

    // Try each path until we find a valid package.json
    for (const packagePath of possiblePaths) {
      if (fs.existsSync(packagePath)) {
        logger.debug(`Reading package.json from: ${packagePath}`);
        const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        if (packageJson.version) {
          logger.debug(
            `Using version from package.json: ${packageJson.version}`
          );
          return packageJson.version;
        }
      }
    }
  } catch (error) {
    logger.error(`Error reading version from package.json: ${error.message}`);
  }

  // If all else fails, return a default version
  logger.warn("Could not determine version, using default");
  return "1.0.0";
}

/**
 * Register all IPC handlers for the application
 */
function registerIpcHandlers() {
  logger.info("Registering IPC handlers");

  // Get app version
  ipcMain.handle("get-app-version", async (event) => {
    logger.debug("IPC: get-app-version called");
    return getApplicationVersion();
  });

  // Connection testing
  ipcMain.handle("test-connection", async (event) => {
    try {
      logger.debug("IPC: test-connection called");
      const result = await connection.testSftpConnection();
      return { success: true, ...result };
    } catch (error) {
      logger.error("IPC: test-connection failed:", error.message);
      return {
        success: false,
        error: error.message || "Unknown connection error",
      };
    }
  });

  // Updated "check-for-updates"
  ipcMain.handle("check-for-updates", async (event) => {
    logger.debug("IPC: check-for-updates called");
    try {
      // Import the updater module
      const updater = require("./updater");
      const result = await updater.checkForUpdates();

      // Get the BrowserWindow that sent the request
      const win = BrowserWindow.fromWebContents(event.sender);

      if (result.updateAvailable) {
        // If an update is available, show the update dialog
        if (win) {
          updater.showUpdateDialog(result, win);
        }
      } else {
        // If no update is available, send a message to the renderer
        // to show the "no update available" dialog
        if (win) {
          win.webContents.send("menu-action", "show-no-update", {
            currentVersion: result.currentVersion,
          });
        }
      }

      return result;
    } catch (error) {
      logger.error(`Error checking for updates: ${error.message}`);
      return {
        updateAvailable: false,
        error: error.message,
        currentVersion: getApplicationVersion(),
      };
    }
  });

  // Skip update version handler
  ipcMain.handle("skip-update-version", async (event, version) => {
    logger.debug(`IPC: skip-update-version called for ${version}`);
    try {
      // Import the updater module
      const updater = require("./updater");
      return await updater.skipUpdateVersion(version);
    } catch (error) {
      logger.error(`Error skipping update version: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Register download-related IPC handlers
  ipcMain.handle("download-update", async (event, url, filename) => {
    logger.debug(`IPC: download-update called for URL: ${url}`);
    try {
      // Import the download handler with explicit path
      const downloadHandler = require(path.join(
        __dirname,
        "./download-handler.js"
      ));

      // Check if downloadFile function exists
      if (typeof downloadHandler.downloadFile !== "function") {
        logger.error(
          "downloadFile function not found in download-handler module"
        );
        throw new Error("Download function not available");
      }

      // Get the browser window that sent the request
      const win = BrowserWindow.fromWebContents(event.sender);

      // Start the download
      const result = await downloadHandler.downloadFile(win, url, filename);
      return result;
    } catch (error) {
      logger.error(`Error downloading update: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Handle download cancellation
  ipcMain.handle("cancel-download", async (event, downloadId) => {
    logger.debug(`IPC: cancel-download called for ID: ${downloadId}`);
    try {
      // Import the download handler
      const downloadHandler = require(path.join(
        __dirname,
        "./download-handler.js"
      ));

      // Call the cancel function
      const result = downloadHandler.cancelDownload(downloadId);
      return { success: result };
    } catch (error) {
      logger.error(`Error cancelling download: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Root domain getter
  ipcMain.handle("get-root-domain", async (event) => {
    logger.debug("IPC: get-root-domain called");
    // Use config manager now instead of directly calling DNS module
    const rootDomain = configManager.get("cloudflare.rootDomain", "");
    if (!rootDomain) {
      logger.warn("Root domain not configured in config manager");
    } else {
      logger.info(`Using root domain from config: ${rootDomain}`);
    }
    return rootDomain;
  });

  // Scan Domain structure
  ipcMain.handle("scan-domain-structure", async (event, dirPath) => {
    logger.debug("IPC: scan-domain-structure called for", dirPath);

    try {
      // Increase depth to 2 to be able to see panel/webview/plexed.php
      return await filesystem.scanDomainStructure(dirPath, 2);
    } catch (err) {
      logger.error(`Error scanning domain structure: ${err.message}`);
      return { error: err.message, items: [] };
    }
  });

  // DNS operations
  ipcMain.handle("create-dns-records", async (event, options) => {
    logger.debug("IPC: create-dns-records called with", options);
    return await dns.createDnsRecords(options);
  });

  // File operations
  ipcMain.handle("list-remote-directory", async (event, remotePath) => {
    logger.debug(
      "IPC: list-remote-directory called with path:",
      remotePath || "(root)"
    );
    return await filesystem.listRemoteDirectory(remotePath);
  });

  ipcMain.handle("list-destination-folders", async (event) => {
    logger.debug("IPC: list-destination-folders called");
    return await filesystem.listDestinationFolders();
  });

  ipcMain.handle("check-remote-file", async (event, remotePath) => {
    logger.debug("IPC: check-remote-file called for", remotePath);

    let connection;
    try {
      connection = await require("./connection").createSftpConnection();
      const { conn, sftp } = connection;

      const result = await filesystem.checkRemoteFile(sftp, remotePath);

      // Close connection
      conn.end();

      return result;
    } catch (err) {
      logger.error(`Error checking remote file ${remotePath}:`, err.message);

      // Clean up connection
      if (connection && connection.conn) {
        try {
          connection.conn.end();
        } catch (e) {
          logger.error("Error closing connection:", e.message);
        }
      }

      return { exists: false, error: err.message };
    }
  });

  ipcMain.handle(
    "copy-folder-contents",
    async (event, sourcePath, targetPath) => {
      logger.debug(
        "IPC: copy-folder-contents called from",
        sourcePath,
        "to",
        targetPath
      );
      return await filesystem.copyFolderContents(sourcePath, targetPath);
    }
  );

  // Virtualmin operations
  ipcMain.handle("list-virtualmin-domains", async (event) => {
    logger.debug("IPC: list-virtualmin-domains called");
    return await virtualmin.listVirtualminDomains();
  });

  ipcMain.handle("create-virtualmin-domain", async (event, options) => {
    logger.debug("IPC: create-virtualmin-domain called with", options);
    return await virtualmin.createVirtualminDomain(options);
  });

  // Transfer items (files/folders)
  ipcMain.handle("transfer-items", async (event, items, targetPath) => {
    logger.debug(
      `IPC: transfer-items called with ${items.length} items to ${targetPath}`
    );

    // For simulation mode, just pretend the transfer was successful
    if (require("../config/serverConfig").settings.useSimulatedMode) {
      logger.debug(
        `Simulating transfer of ${items.length} items to ${targetPath}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        results: items.map((item) => ({
          name: item.path.split("/").pop(),
          status: "success",
        })),
      };
    }

    logger.info(`Starting transfer of ${items.length} items to ${targetPath}`);

    // Important: Both source and destination are on the remote Linux server
    // Format all paths with forward slashes for Linux
    const CONFIG = require("../config/serverConfig");
    const remoteTargetRoot = `${CONFIG.paths.localDestination}${targetPath}`
      .replace(/\\/g, "/")
      .replace(/\/\//g, "/");
    logger.debug(`Remote target directory: ${remoteTargetRoot}`);

    let conn;
    try {
      // Establish a single connection for all operations
      const { conn: sshConn } = await connection.createSftpConnection();
      conn = sshConn;

      // Create the base target directory first
      try {
        await connection.execSSHCommand(
          conn,
          `mkdir -p "${remoteTargetRoot}" && chmod 755 "${remoteTargetRoot}"`,
          "Creating base target directory"
        );
      } catch (mkdirErr) {
        logger.error(`Error creating base directory: ${mkdirErr.message}`);
        throw mkdirErr;
      }

      // Process all items
      const results = [];

      for (const item of items) {
        try {
          // Skip if item.path is undefined
          if (!item.path) {
            logger.error(`Item has no path defined: ${JSON.stringify(item)}`);
            results.push({
              name: item.name || "unknown",
              status: "error",
              error: "No path defined for this item",
            });
            continue;
          }

          const remoteSrcPath = `${CONFIG.paths.basePath}${item.path}`
            .replace(/\\/g, "/")
            .replace(/\/\//g, "/");

          // Determine proper destination path based on item type
          let remoteDestPath;

          // Check if this is a cockpitpanel item (special case 1)
          if (
            item.isCockpitPanel ||
            (item.type === "panel" &&
              (item.name === "cockpitpanel" ||
                item.path.includes("cockpitpanel")))
          ) {
            // For cockpitpanel, copy directly to the public_html folder root
            remoteDestPath = remoteTargetRoot;
            logger.debug(
              `Special handling for cockpitpanel item: copying directly to public_html root`
            );
          }
          // Check if this is the Plex Webview module (special case 2)
          else if (
            item.name === "plexwebview API" ||
            (item.name &&
              item.name.toLowerCase().includes("plex") &&
              item.path &&
              item.path.includes("plex"))
          ) {
            // For Plex Webview, determine the correct destination path
            if (item.name === "plexwebview API" || item.type === "module-api") {
              // This is the API component - copy to /public_html/api/webview
              remoteDestPath = `${remoteTargetRoot}/api/webview`;
              logger.debug(
                `Special handling for Plex Webview API: copying to api/webview directory`
              );
            } else {
              // This is the panel component - copy to /public_html/panel/webview
              remoteDestPath = `${remoteTargetRoot}/panel/webview`;
              logger.debug(
                `Special handling for Plex Webview Panel: copying to panel/webview directory`
              );
            }

            // Create the destination directory if it doesn't exist
            try {
              await connection.execSSHCommand(
                conn,
                `mkdir -p "${remoteDestPath}" && chmod 755 "${remoteDestPath}"`,
                "Creating directory for Plex component"
              );
            } catch (dirErr) {
              logger.error(`Error creating directory: ${dirErr.message}`);
              // Continue anyway, the main directory might already exist
            }
          } else {
            // Regular module or panel - preserve the FULL directory structure
            // Don't modify the item.path structure for regular modules and panels
            remoteDestPath = `${remoteTargetRoot}/${item.path}`.replace(
              /\/\//g,
              "/"
            );
            logger.debug(
              `Preserving full directory structure for module: ${item.path}`
            );
          }

          logger.debug(`Processing item: ${item.name || item.path}`);
          logger.debug(`Source: ${remoteSrcPath}`);
          logger.debug(`Destination: ${remoteDestPath}`);

          // First check if the source exists
          let sourceExists = false;
          let isDirectory = false;

          try {
            // Use ls command to check if source exists
            const checkCommand = `ls -la "${remoteSrcPath}" 2>/dev/null || echo "NOT_FOUND"`;
            const checkResult = await connection.execSSHCommand(
              conn,
              checkCommand,
              "Checking source path"
            );

            if (!checkResult.includes("NOT_FOUND")) {
              sourceExists = true;
              // Check if it's a directory
              isDirectory = checkResult.includes("d");
              logger.debug(
                `Source exists: ${sourceExists}, is directory: ${isDirectory}`
              );
            } else {
              logger.error(`Source path not found: ${remoteSrcPath}`);
              results.push({
                name: item.path,
                status: "error",
                error: "Source path not found",
              });
              continue;
            }
          } catch (checkErr) {
            logger.error(`Error checking source: ${checkErr.message}`);
            results.push({
              name: item.path,
              status: "error",
              error: `Error checking source: ${checkErr.message}`,
            });
            continue;
          }

          // Create parent directory
          const parentDir = path.dirname(remoteDestPath).replace(/\\/g, "/");

          try {
            await connection.execSSHCommand(
              conn,
              `mkdir -p "${parentDir}" && chmod 755 "${parentDir}"`,
              "Creating parent directory"
            );
          } catch (parentErr) {
            logger.error(
              `Error creating parent directory: ${parentErr.message}`
            );
            results.push({
              name: item.path,
              status: "error",
              error: `Error creating parent directory: ${parentErr.message}`,
            });
            continue;
          }

          if (isDirectory) {
            // Handle directory transfer
            try {
              // First create the destination directory
              await connection.execSSHCommand(
                conn,
                `mkdir -p "${remoteDestPath}" && chmod 755 "${remoteDestPath}"`,
                "Creating destination directory"
              );

              // Special handling for cockpitpanel - copy content from source to public_html
              if (
                item.isCockpitPanel ||
                (item.type === "panel" &&
                  (item.name === "cockpitpanel" ||
                    item.path.includes("cockpitpanel")))
              ) {
                // Copy all files from the cockpitpanel directory directly to public_html
                await connection.execSSHCommand(
                  conn,
                  `cp -rvf "${remoteSrcPath}/"* "${remoteDestPath}/" 2>/dev/null || true`,
                  "Copying cockpitpanel files to public_html root"
                );

                logger.info(
                  `Copied cockpitpanel directory directly to ${remoteDestPath}`
                );
              }
              // Special handling for Plex Webview
              else if (
                item.name === "plexwebview API" ||
                (item.name &&
                  item.name.toLowerCase().includes("plex") &&
                  item.path &&
                  item.path.includes("plex"))
              ) {
                // Copy all files from the plex directory to appropriate destination
                // Using -f flag to force overwrite existing files
                await connection.execSSHCommand(
                  conn,
                  `cp -rvf "${remoteSrcPath}/"* "${remoteDestPath}/" 2>/dev/null || true`,
                  "Copying Plex component files with overwrite"
                );

                logger.info(
                  `Copied Plex files from ${remoteSrcPath} to ${remoteDestPath} with overwrite`
                );
              } else {
                // For normal modules, preserve directory structure
                // Adding -f flag to force overwrite existing files
                await connection.execSSHCommand(
                  conn,
                  `cp -rvf "${remoteSrcPath}/"* "${remoteDestPath}/" 2>/dev/null || true`,
                  "Copying directory contents with overwrite"
                );
              }

              // Change ownership
              await connection.execSSHCommand(
                conn,
                `chown -R 1000:1000 "${remoteDestPath}"`,
                "Setting ownership for directory"
              );

              results.push({
                name: item.path,
                status: "success",
                path: remoteDestPath,
                type: "directory",
              });
            } catch (dirErr) {
              logger.error(`Error copying directory: ${dirErr.message}`);
              results.push({
                name: item.path,
                status: "error",
                error: `Error copying directory: ${dirErr.message}`,
              });
            }
          } else {
            // Handle file transfer
            try {
              // Using cp -f to force overwrite existing files
              await connection.execSSHCommand(
                conn,
                `cp -vf "${remoteSrcPath}" "${remoteDestPath}" && chown 1000:1000 "${remoteDestPath}" && chmod 644 "${remoteDestPath}"`,
                "Copying file with overwrite"
              );

              results.push({
                name: item.path,
                status: "success",
                path: remoteDestPath,
                type: "file",
              });
            } catch (fileErr) {
              logger.error(`Error copying file: ${fileErr.message}`);
              results.push({
                name: item.path,
                status: "error",
                error: `Error copying file: ${fileErr.message}`,
              });
            }
          }
        } catch (itemErr) {
          logger.error(
            `Error processing item ${item.path}: ${itemErr.message}`
          );
          results.push({
            name: item.path,
            status: "error",
            error: itemErr.message,
          });
        }
      }

      // Final ownership change
      try {
        await connection.execSSHCommand(
          conn,
          `chown -R 1000:1000 "${remoteTargetRoot}"`,
          "Setting final ownership"
        );
      } catch (ownerErr) {
        logger.error(`Error setting final ownership: ${ownerErr.message}`);
        // Don't fail the entire operation for this
      }

      // Close the connection
      if (conn) {
        conn.end();
      }

      // Calculate success rate
      const successCount = results.filter((r) => r.status === "success").length;

      return {
        success: successCount > 0,
        results,
        successCount,
        totalCount: items.length,
        targetRoot: remoteTargetRoot,
      };
    } catch (err) {
      logger.error(`Transfer operation failed: ${err.message}`);

      // Clean up connection
      if (conn) {
        try {
          conn.end();
        } catch (e) {
          logger.error("Error closing connection:", e.message);
        }
      }

      return {
        success: false,
        error: err.message,
        results: [],
      };
    }
  });

  // Shell operations for opening files/folders
  ipcMain.handle("show-item-in-folder", async (event, filePath) => {
    logger.debug(`IPC: show-item-in-folder called for path: ${filePath}`);
    try {
      if (!filePath) {
        throw new Error("No file path provided");
      }

      // Normalize path for the platform
      const normalizedPath = path.normalize(filePath);
      logger.debug(`Showing item in folder: ${normalizedPath}`);

      // Verify the file exists before attempting to show it
      if (!fs.existsSync(normalizedPath)) {
        logger.warn(`File does not exist: ${normalizedPath}`);
        // If file doesn't exist, try to open the directory instead
        const dirPath = path.dirname(normalizedPath);
        if (fs.existsSync(dirPath)) {
          logger.debug(`Opening directory instead: ${dirPath}`);
          shell.openPath(dirPath);
          return { success: true, message: "Opened parent directory" };
        } else {
          throw new Error(
            `Neither file nor directory exists: ${normalizedPath}`
          );
        }
      }

      // Show the item in folder
      shell.showItemInFolder(normalizedPath);
      return { success: true };
    } catch (error) {
      logger.error(`Error showing item in folder: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("open-path", async (event, pathToOpen) => {
    logger.debug(`IPC: open-path called for: ${pathToOpen}`);
    try {
      if (!pathToOpen) {
        throw new Error("No path provided");
      }

      // Normalize the path for the platform
      const normalizedPath = path.normalize(pathToOpen);

      // Check if it exists
      if (!fs.existsSync(normalizedPath)) {
        throw new Error(`Path does not exist: ${normalizedPath}`);
      }

      // Open the path using shell.openPath
      const result = await shell.openPath(normalizedPath);

      if (result !== "") {
        throw new Error(`Failed to open path: ${result}`);
      }

      return { success: true };
    } catch (error) {
      logger.error(`Error opening path: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Special handler for opening domain URLs
  ipcMain.handle("open-domain-url", async (event, url) => {
    logger.debug(`IPC: open-domain-url called for: ${url}`);
    try {
      if (!url) {
        throw new Error("No URL provided");
      }

      // Ensure URL has proper protocol
      let formattedUrl = url;
      if (
        !formattedUrl.startsWith("http://") &&
        !formattedUrl.startsWith("https://")
      ) {
        formattedUrl = "http://" + formattedUrl;
        logger.debug(`Added http:// prefix to URL: ${formattedUrl}`);
      }

      logger.info(`Opening URL in external browser: ${formattedUrl}`);

      // Using Electron's shell.openExternal with force external option
      await shell.openExternal(formattedUrl, {
        activate: true,
        workingDirectory: process.cwd(),
      });

      return { success: true, message: `URL opened: ${formattedUrl}` };
    } catch (error) {
      logger.error(`Error opening URL: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Add these handlers
  ipcMain.handle("open-github-repo", async (event) => {
    logger.debug("IPC: open-github-repo called");
    try {
      await shell.openExternal("https://github.com/cyb3rgh05t/rebrand-tool");
      return { success: true };
    } catch (error) {
      logger.error(`Error opening GitHub repo: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("open-issue-page", async (event) => {
    logger.debug("IPC: open-issue-page called");
    try {
      await shell.openExternal(
        "https://github.com/cyb3rgh05t/rebrand-tool/issues/new"
      );
      return { success: true };
    } catch (error) {
      logger.error(`Error opening issue page: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Register config manager handlers
  registerConfigHandlers();

  // Add changelog handler
  ipcMain.handle("get-changelog", async (event) => {
    logger.debug("IPC: get-changelog called");
    try {
      // Look for CHANGELOG.md in various locations
      const possiblePaths = [
        path.join(app.getAppPath(), "CHANGELOG.md"),
        path.join(process.cwd(), "CHANGELOG.md"),
        path.join(__dirname, "../../CHANGELOG.md"),
        path.join(process.resourcesPath || "", "app/CHANGELOG.md"),
        path.join(process.resourcesPath || "", "app.asar/CHANGELOG.md"),
      ];

      // Try each path until we find the changelog
      for (const changelogPath of possiblePaths) {
        if (fs.existsSync(changelogPath)) {
          logger.debug(`Found CHANGELOG.md at: ${changelogPath}`);
          const changelogContent = fs.readFileSync(changelogPath, "utf8");
          return changelogContent;
        }
      }

      // If no changelog file found, return default message
      logger.warn("CHANGELOG.md not found in any expected location");
      return "# Changelog\n\nNo changelog file found in the application.";
    } catch (error) {
      logger.error(`Error reading changelog: ${error.message}`);
      return `# Error Reading Changelog\n\n${error.message}`;
    }
  });

  logger.info("All IPC handlers registered");
}

/**
 * Register handlers for config manager operations
 */
function registerConfigHandlers() {
  // Get configuration for a specific section
  ipcMain.handle("get-config", async (event, section) => {
    logger.debug(`IPC: get-config called for section: ${section}`);
    try {
      if (!section) {
        return { error: "Section name is required" };
      }

      return configManager.getSection(section);
    } catch (error) {
      logger.error(`Error getting config section ${section}: ${error.message}`);
      return { error: error.message };
    }
  });

  // Update configuration for a specific section
  ipcMain.handle("update-config", async (event, section, values) => {
    logger.debug(`IPC: update-config called for section: ${section}`);
    try {
      if (!section) {
        return { success: false, error: "Section name is required" };
      }

      if (!values || typeof values !== "object") {
        return { success: false, error: "Values must be an object" };
      }

      configManager.updateSection(section, values);

      // Save in .env format for backward compatibility
      configManager.saveAsEnvFile();

      return { success: true };
    } catch (error) {
      logger.error(
        `Error updating config section ${section}: ${error.message}`
      );
      return { success: false, error: error.message };
    }
  });

  // Get a specific config value
  ipcMain.handle("get-config-value", async (event, path, defaultValue) => {
    logger.debug(`IPC: get-config-value called for path: ${path}`);
    try {
      if (!path) {
        return { error: "Path is required" };
      }

      const value = configManager.get(path, defaultValue);
      return { value };
    } catch (error) {
      logger.error(`Error getting config value ${path}: ${error.message}`);
      return { error: error.message };
    }
  });

  // Set a specific config value
  ipcMain.handle("set-config-value", async (event, path, value) => {
    logger.debug(`IPC: set-config-value called for path: ${path}`);
    try {
      if (!path) {
        return { success: false, error: "Path is required" };
      }

      configManager.set(path, value);

      // Save in .env format for backward compatibility
      configManager.saveAsEnvFile();

      return { success: true };
    } catch (error) {
      logger.error(`Error setting config value ${path}: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Export configuration as .env format
  ipcMain.handle("export-config-env", async (event) => {
    logger.debug(`IPC: export-config-env called`);
    try {
      const envContent = configManager.exportAsEnvFormat();
      return { success: true, content: envContent };
    } catch (error) {
      logger.error(`Error exporting config as ENV: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  // Import configuration from .env format
  ipcMain.handle("import-config-env", async (event, envContent) => {
    logger.debug(`IPC: import-config-env called`);
    try {
      if (!envContent) {
        return { success: false, error: "No content provided" };
      }

      // Write to temporary file
      const tempPath = path.join(app.getPath("temp"), ".env.import");
      fs.writeFileSync(tempPath, envContent, "utf8");

      // Create a new config manager instance to parse it
      const newConfig = { ...configManager.config };

      // Read .env content and process each line
      const envLines = envContent.split("\n");
      for (const line of envLines) {
        // Skip comments and empty lines
        if (line.trim().startsWith("#") || line.trim() === "") continue;

        // Parse key and value
        const match = line.match(
          /^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n]+)["']?\s*$/
        );
        if (match) {
          const key = match[1];
          const value = match[2].trim();

          // Map .env variables to config structure
          configManager.mapEnvVarToConfig(newConfig, key, value);
        }
      }

      // Update all sections
      Object.keys(newConfig).forEach((section) => {
        configManager.updateSection(section, newConfig[section]);
      });

      // Clean up
      try {
        fs.unlinkSync(tempPath);
      } catch (e) {
        logger.warn(`Failed to delete temp file: ${e.message}`);
      }

      // Save in .env format for backward compatibility
      configManager.saveAsEnvFile();

      return { success: true };
    } catch (error) {
      logger.error(`Error importing config from ENV: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  registerLoggerHandlers();
}

/**
 * Register logging-related IPC handlers
 */
function registerLoggerHandlers() {
  // Get logs from main process
  ipcMain.handle("get-main-logs", async (event) => {
    logger.debug("IPC: get-main-logs called");
    return require("./utils/logger").getGlobalLogHistory();
  });

  // Set log level for a category
  ipcMain.handle("set-log-level", async (event, category, level) => {
    logger.debug(
      `IPC: set-log-level called for ${category} with level ${level}`
    );
    return require("./utils/logger").setCategoryLevel(category, level);
  });

  // Clear main process logs
  ipcMain.handle("clear-main-logs", async (event) => {
    logger.debug("IPC: clear-main-logs called");
    require("./utils/logger").clearGlobalHistory();
    return { success: true };
  });
}

module.exports = {
  registerIpcHandlers,
};
