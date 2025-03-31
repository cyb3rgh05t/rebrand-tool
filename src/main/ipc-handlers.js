/**
 * IPC handlers for StreamNet Panels
 * This module registers all the IPC handlers that the renderer process uses
 */
const { ipcMain } = require("electron");
const { createLogger } = require("./utils/logger");
const connection = require("./connection");
const filesystem = require("./filesystem");
const dns = require("./dns");
const virtualmin = require("./virtualmin");

// Create logger for IPC handlers
const logger = createLogger("ipc");

/**
 * Register all IPC handlers for the application
 */
function registerIpcHandlers() {
  logger.info("Registering IPC handlers");

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

  // Root domain getter
  ipcMain.handle("get-root-domain", async (event) => {
    logger.debug("IPC: get-root-domain called");
    return await dns.getRootDomain();
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
          const remoteSrcPath = `${CONFIG.paths.basePath}${item.path}`
            .replace(/\\/g, "/")
            .replace(/\/\//g, "/");
          const remoteDestPath = `${remoteTargetRoot}/${item.path}`.replace(
            /\/\//g,
            "/"
          );

          logger.debug(`Processing item: ${item.path}`);
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
          const path = require("path");
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

              // Then copy the contents (with visible feedback from verbose option)
              await connection.execSSHCommand(
                conn,
                `cp -rv "${remoteSrcPath}/"* "${remoteDestPath}/" 2>/dev/null || true`,
                "Copying directory contents"
              );

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
