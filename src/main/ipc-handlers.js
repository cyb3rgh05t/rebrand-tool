/**
 * IPC handlers for StreamNet Panels
 * This module registers all the IPC handlers that the renderer process uses
 */
const { ipcMain, BrowserWindow, app } = require("electron");
const { createLogger } = require("./utils/logger");
const connection = require("./connection");
const filesystem = require("./filesystem");
const dns = require("./dns");
const virtualmin = require("./virtualmin");
const path = require("path");
const fs = require("fs");

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

  // Update checking handler
  ipcMain.handle("check-for-updates", async (event) => {
    logger.debug("IPC: check-for-updates called");
    try {
      // Import the updater module
      const updater = require("./updater");
      const result = await updater.checkForUpdates();

      // If an update is available, show a dialog
      if (result.updateAvailable) {
        // Get the BrowserWindow that sent the request
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
          updater.showUpdateDialog(result, win);
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

  // Root domain getter
  ipcMain.handle("get-root-domain", async (event) => {
    logger.debug("IPC: get-root-domain called");
    return await dns.getRootDomain();
  });

  // Scan Domain structure
  ipcMain.handle("scan-domain-structure", async (event, dirPath) => {
    logger.debug("IPC: scan-domain-structure called for", dirPath);

    try {
      return await filesystem.scanDomainStructure(dirPath);
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

          // Check if this is a cockpitpanel item (look at flag, type, name, and path)
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
                  `cp -rv "${remoteSrcPath}/"* "${remoteDestPath}/" 2>/dev/null || true`,
                  "Copying cockpitpanel files to public_html root"
                );

                logger.info(
                  `Copied cockpitpanel directory directly to ${remoteDestPath}`
                );
              } else {
                // For normal modules, preserve directory structure
                await connection.execSSHCommand(
                  conn,
                  `cp -rv "${remoteSrcPath}/"* "${remoteDestPath}/" 2>/dev/null || true`,
                  "Copying directory contents"
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
              await connection.execSSHCommand(
                conn,
                `cp -v "${remoteSrcPath}" "${remoteDestPath}" && chown 1000:1000 "${remoteDestPath}" && chmod 644 "${remoteDestPath}"`,
                "Copying file"
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

  logger.info("All IPC handlers registered");
}

module.exports = {
  registerIpcHandlers,
};
