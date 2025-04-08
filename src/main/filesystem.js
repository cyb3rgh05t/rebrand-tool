/**
 * File system operations for StreamNet Panels
 */
const path = require("path");
const fs = require("fs");
const { createLogger } = require("./utils/logger");
const { createSftpConnection, execSSHCommand } = require("./connection");

// Import configuration
const CONFIG = require("../config/serverConfig");

// Create a filesystem-specific logger
const logger = createLogger("filesystem");

/**
 * Check if a remote file exists
 * @param {Object} sftp SFTP connection
 * @param {string} remotePath Path to check
 * @returns {Promise<Object>} File information
 */
async function checkRemoteFile(sftp, remotePath) {
  logger.debug(`Checking remote file: ${remotePath}`);

  return new Promise((resolve, reject) => {
    sftp.stat(remotePath, (err, stats) => {
      if (err) {
        if (err.code === 2) {
          // No such file
          logger.debug(`File not found: ${remotePath}`);
          resolve({ exists: false, error: null });
        } else {
          logger.error(`Error checking file: ${remotePath}`, err.message);
          resolve({ exists: false, error: err.message });
        }
        return;
      }

      logger.debug(
        `File exists: ${remotePath} (${stats.isFile() ? "file" : "directory"})`
      );
      resolve({
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mode: stats.mode.toString(8),
        atime: stats.atime,
        mtime: stats.mtime,
      });
    });
  });
}

/**
 * Create a directory on the remote server
 * @param {Object} sftp SFTP connection
 * @param {string} remotePath Path to create
 * @returns {Promise<Object>} Result object
 */
async function createRemoteDirectory(sftp, remotePath) {
  logger.debug(`Creating remote directory: ${remotePath}`);

  return new Promise((resolve, reject) => {
    sftp.mkdir(remotePath, { mode: 0o755, recursive: true }, (err) => {
      if (err) {
        if (err.code === 4) {
          // Already exists
          logger.debug(`Directory already exists: ${remotePath}`);
          resolve({ created: false, existed: true });
        } else {
          logger.error(`Error creating directory: ${remotePath}`, err.message);
          reject(err);
        }
        return;
      }

      logger.info(`Successfully created directory: ${remotePath}`);
      resolve({ created: true, existed: false });
    });
  });
}

/**
 * Download a file via SFTP
 * @param {Object} sftp SFTP connection
 * @param {string} remotePath Source path
 * @param {string} localPath Destination path
 * @returns {Promise<void>}
 */
function downloadFile(sftp, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    try {
      logger.debug(`Downloading file from ${remotePath} to ${localPath}`);

      // Ensure the directory for the local file exists
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        logger.debug(`Creating local directory: ${localDir}`);
        fs.mkdirSync(localDir, { recursive: true });
      }

      // Verify the remote file exists first
      sftp.stat(remotePath, (statErr, stats) => {
        if (statErr) {
          logger.error(
            `Error checking remote file ${remotePath}:`,
            statErr.message
          );
          return reject(statErr);
        }

        if (!stats.isFile()) {
          logger.error(`Remote path is not a file: ${remotePath}`);
          return reject(new Error(`Remote path ${remotePath} is not a file`));
        }

        let fileSize = stats.size || 0;
        let bytesReceived = 0;

        // Create read stream with specific options
        const readStream = sftp.createReadStream(remotePath, {
          autoClose: true,
          emitClose: true,
        });

        // Create write stream
        const writeStream = fs.createWriteStream(localPath);

        // Stream error handlers
        readStream.once("error", (err) => {
          logger.error(`Read stream error from ${remotePath}:`, err.message);
          // Clean up
          writeStream.end();
          reject(err);
        });

        writeStream.once("error", (err) => {
          logger.error(`Write stream error to ${localPath}:`, err.message);
          // Clean up
          readStream.destroy();
          reject(err);
        });

        // Monitor data
        readStream.on("data", (chunk) => {
          bytesReceived += chunk.length;
          // Log progress for large files
          if (fileSize > 1000000 && bytesReceived % 1000000 < chunk.length) {
            logger.debug(
              `Download progress: ${Math.round(
                (bytesReceived / fileSize) * 100
              )}%`
            );
          }
        });

        // Handle end of data (backup for finish)
        readStream.on("end", () => {
          // This is a backup check, writeStream.finish should be the primary event
          if (bytesReceived === fileSize) {
            logger.debug(`Read stream ended for ${remotePath}`);
          }
        });

        // Critical: writeStream finish is what we actually wait for
        writeStream.once("finish", () => {
          logger.info(`Successfully downloaded ${remotePath} to ${localPath}`);

          // Check if we received all data
          const fileStats = fs.statSync(localPath);
          if (fileSize > 0 && fileStats.size !== fileSize) {
            logger.warn(
              `File size mismatch for ${localPath}: expected ${fileSize}, got ${fileStats.size}`
            );
          }

          // Always resolve here since the file was written
          resolve();
        });

        // Connect the streams
        readStream.pipe(writeStream);
      });
    } catch (err) {
      logger.error(
        `Error setting up file download for ${remotePath}:`,
        err.message
      );
      reject(err);
    }
  });
}

/**
 * Recursively download a directory via SFTP
 * @param {Object} sftp SFTP connection
 * @param {string} remotePath Source directory
 * @param {string} localPath Destination directory
 * @returns {Promise<boolean>}
 */
async function downloadDirectory(sftp, remotePath, localPath) {
  logger.info(`Downloading directory from ${remotePath} to ${localPath}`);

  // Create the local directory if it doesn't exist
  if (!fs.existsSync(localPath)) {
    logger.debug(`Creating local directory: ${localPath}`);
    fs.mkdirSync(localPath, { recursive: true });
  }

  // Read the remote directory
  const dirContents = await new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (err, list) => {
      if (err) {
        logger.error(`Error reading directory ${remotePath}:`, err.message);
        return reject(err);
      }
      logger.debug(`Found ${list.length} items in ${remotePath}`);
      resolve(list || []);
    });
  });

  // Process each item in the directory one at a time to prevent overwhelming the connection
  for (const item of dirContents) {
    try {
      const itemRemotePath = path
        .join(remotePath, item.filename)
        .replace(/\\/g, "/");
      const itemLocalPath = path.join(localPath, item.filename);

      if (item.attrs && item.attrs.isDirectory && item.attrs.isDirectory()) {
        // Recursively download subdirectory
        logger.debug(`Processing subdirectory: ${item.filename}`);
        await downloadDirectory(sftp, itemRemotePath, itemLocalPath);
      } else {
        // Download file
        logger.debug(`Downloading file: ${item.filename}`);
        await downloadFile(sftp, itemRemotePath, itemLocalPath);
      }
    } catch (err) {
      logger.error(
        `Error processing item in directory ${remotePath}:`,
        err.message
      );
      // Continue with other items instead of failing the whole directory
    }
  }

  logger.info(`Completed directory download: ${remotePath}`);
  return true;
}

/**
 * List all files and directories in a remote path
 * @param {string} remotePath Path to list
 * @returns {Promise<Array>} List of files and directories
 */
async function listRemoteDirectory(remotePath = "") {
  logger.info(`Listing remote directory: ${remotePath}`);

  // Use simulated data if in simulation mode
  if (CONFIG.settings.useSimulatedMode) {
    logger.debug(`Using simulated data for: ${remotePath}`);
    const now = new Date();

    // Get simulated directory content or return an empty array if path doesn't exist
    const dirContent = CONFIG.simulatedData.fileSystem[remotePath] || [];

    // Add size and modify time to make it more realistic
    return dirContent.map((item) => ({
      ...item,
      size: item.isDirectory ? 0 : Math.floor(Math.random() * 1000000),
      modifyTime: new Date(
        now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
      ),
    }));
  }

  let connection;
  try {
    connection = await createSftpConnection();
    const { conn, sftp } = connection;

    const fullPath = path
      .join(CONFIG.paths.basePath, remotePath)
      .replace(/\\/g, "/");
    logger.debug(`Full path: ${fullPath}`);

    return new Promise((resolve, reject) => {
      sftp.readdir(fullPath, (err, list) => {
        if (err) {
          logger.error(`Error listing directory: ${fullPath}`, err.message);
          conn.end();
          return reject(err);
        }

        // Transform the list to match the format we need
        const formattedList = list.map((item) => {
          return {
            name: item.filename,
            isDirectory: item.attrs.isDirectory(),
            size: item.attrs.size,
            modifyTime: new Date(item.attrs.mtime * 1000),
          };
        });

        logger.debug(`Listed ${formattedList.length} items in ${fullPath}`);
        conn.end();
        resolve(formattedList);
      });
    });
  } catch (err) {
    logger.error(`Error listing directory: ${remotePath}`, err.message);
    if (connection && connection.conn) {
      connection.conn.end();
    }
    return { error: err.message };
  }
}

/**
 * List domains (folders) in the destination directory
 * @returns {Promise<Array>} List of domain folders
 */
async function listDestinationFolders() {
  logger.info("Listing destination folders");

  // Use simulated data if in simulation mode
  if (CONFIG.settings.useSimulatedMode) {
    logger.debug("Using simulated domain data");
    return CONFIG.simulatedData.domains;
  }

  let connection;
  try {
    connection = await createSftpConnection();
    const { conn, sftp } = connection;

    return new Promise((resolve, reject) => {
      sftp.readdir(CONFIG.paths.localDestination, (err, list) => {
        if (err) {
          logger.error(`Error listing destination folders:`, err.message);
          conn.end();
          return reject(err);
        }

        // Filter for directories only and format the response
        const folders = list
          .filter((item) => item.attrs.isDirectory())
          .map((item) => ({
            name: item.filename,
            path: path
              .join(CONFIG.paths.localDestination, item.filename)
              .replace(/\\/g, "/"),
          }));

        logger.debug(`Found ${folders.length} destination folders`);
        conn.end();
        resolve(folders);
      });
    });
  } catch (err) {
    logger.error(`Error listing destination folders:`, err.message);
    if (connection && connection.conn) {
      connection.conn.end();
    }

    // Fallback to local filesystem
    try {
      if (fs.existsSync(CONFIG.paths.localDestination)) {
        logger.debug(
          "Falling back to local filesystem for destination folders"
        );
        const items = fs
          .readdirSync(CONFIG.paths.localDestination, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => ({
            name: dirent.name,
            path: path.join(CONFIG.paths.localDestination, dirent.name),
          }));

        logger.debug(
          `Found ${items.length} destination folders using fallback`
        );
        return items;
      }
    } catch (localErr) {
      logger.error(`Error with local filesystem fallback:`, localErr.message);
    }

    return { error: err.message };
  }
}

/**
 * Copy folder contents from source to target
 * @param {string} sourcePath Source folder path
 * @param {string} targetPath Target folder path
 * @returns {Promise<Object>} Operation result
 */
async function copyFolderContents(sourcePath, targetPath) {
  logger.info(`Copying folder contents from ${sourcePath} to ${targetPath}`);

  let connection;
  try {
    connection = await createSftpConnection();
    const { conn, sftp } = connection;

    // Convert paths to absolute
    const fullSourcePath = path
      .join(CONFIG.paths.basePath, sourcePath)
      .replace(/\\/g, "/");
    const fullTargetPath = path
      .join(CONFIG.paths.localDestination, targetPath)
      .replace(/\\/g, "/");

    logger.debug(`Full source path: ${fullSourcePath}`);
    logger.debug(`Full target path: ${fullTargetPath}`);

    // Create target directory if it doesn't exist
    await execSSHCommand(
      conn,
      `mkdir -p "${fullTargetPath}" && chmod 755 "${fullTargetPath}"`,
      "Creating target directory"
    );

    // Copy contents directly using cp command with wildcard
    await execSSHCommand(
      conn,
      `cp -rvf "${fullSourcePath}"/* "${fullTargetPath}/" && chown -R 1000:1000 "${fullTargetPath}"`,
      "Copying folder contents"
    );

    // Close connection
    conn.end();
    logger.info(
      `Successfully copied contents from ${sourcePath} to ${targetPath}`
    );

    return { success: true, message: "Contents copied successfully" };
  } catch (err) {
    logger.error(`Error copying folder contents:`, err.message);

    // Clean up connection
    if (connection && connection.conn) {
      try {
        connection.conn.end();
      } catch (e) {
        logger.error(`Error closing connection:`, e.message);
      }
    }

    return { success: false, error: err.message };
  }
}

/**
 * Scan a domain's directory structure
 * @param {string} dirPath Directory path to scan
 * @param {number} [depth=1] Scan depth (how many levels of subdirectories to scan)
 * @returns {Promise<Object>} Directory structure data
 */
async function scanDomainStructure(dirPath, depth = 1) {
  const logger = require("./utils/logger").createLogger("filesystem");
  logger.info(`Scanning domain structure at ${dirPath} with depth ${depth}`);

  // For simulation mode, return some dummy data
  if (require("../config/serverConfig").settings.useSimulatedMode) {
    logger.debug(`Using simulated domain structure for ${dirPath}`);

    // Create a simulated directory structure based on the path
    const simulatedStructure = createSimulatedStructure(dirPath);
    return simulatedStructure;
  }

  let connection;
  try {
    connection = await require("./connection").createSftpConnection();
    const { conn, sftp } = connection;

    // First check if the directory exists
    try {
      const stats = await new Promise((resolve, reject) => {
        sftp.stat(dirPath, (err, stats) => {
          if (err) {
            if (err.code === 2) {
              // No such file
              reject(new Error(`Directory not found: ${dirPath}`));
            } else {
              reject(err);
            }
            return;
          }
          resolve(stats);
        });
      });

      if (!stats.isDirectory()) {
        conn.end();
        logger.error(`Path is not a directory: ${dirPath}`);
        return { error: `Path is not a directory: ${dirPath}`, items: [] };
      }
    } catch (statErr) {
      conn.end();
      logger.error(`Error checking directory: ${statErr.message}`);
      return { error: statErr.message, items: [] };
    }

    // Start scanning from the root directory
    const items = await scanDirectory(sftp, dirPath, depth);

    // Close connection
    conn.end();

    logger.info(`Domain structure scan complete for ${dirPath}`);
    return { items };
  } catch (err) {
    logger.error(`Error scanning domain structure: ${err.message}`);

    // Clean up connection
    if (connection && connection.conn) {
      try {
        connection.conn.end();
      } catch (e) {
        logger.error(`Error closing connection: ${e.message}`);
      }
    }

    return { error: err.message, items: [] };
  }
}

/**
 * Recursively scan a directory and its subdirectories
 * @param {Object} sftp SFTP connection
 * @param {string} dirPath Directory path
 * @param {number} depthRemaining How many more levels to scan
 * @returns {Promise<Array>} Directory listing
 */
async function scanDirectory(sftp, dirPath, depthRemaining) {
  const logger = require("./utils/logger").createLogger("filesystem");

  return new Promise((resolve, reject) => {
    sftp.readdir(dirPath, async (err, list) => {
      if (err) {
        logger.error(`Error reading directory ${dirPath}: ${err.message}`);
        return reject(err);
      }

      const items = [];

      for (const item of list) {
        const itemPath = `${dirPath}/${item.filename}`;
        const isDirectory = item.attrs.isDirectory();

        const itemInfo = {
          name: item.filename,
          path: itemPath,
          isDirectory,
          size: item.attrs.size,
          modifyTime: new Date(item.attrs.mtime * 1000),
        };

        // If it's a directory and we haven't reached max depth, scan it too
        if (isDirectory && depthRemaining > 0) {
          try {
            const children = await scanDirectory(
              sftp,
              itemPath,
              depthRemaining - 1
            );
            itemInfo.children = children;
          } catch (subDirErr) {
            logger.error(
              `Error scanning subdirectory ${itemPath}: ${subDirErr.message}`
            );
            itemInfo.error = subDirErr.message;
          }
        }

        items.push(itemInfo);
      }

      resolve(items);
    });
  });
}

/**
 * Create a simulated directory structure for testing
 * @param {string} dirPath Directory path
 * @returns {Object} Simulated structure data
 */
function createSimulatedStructure(dirPath) {
  // Extract domain name from path
  const domainParts = dirPath.split("/");
  const domainIndex = domainParts.findIndex((part) => part.includes("."));

  // Default structure with nothing installed
  const structure = { items: [] };

  if (domainIndex === -1 || !dirPath.includes("public_html")) {
    return structure;
  }

  const domainName = domainParts[domainIndex];

  // Different simulations based on domain name
  if (domainName.includes("client")) {
    // Simulate a domain with panel and modules
    structure.items = [
      {
        name: "panel",
        path: `${dirPath}/panel`,
        isDirectory: true,
        children: [
          {
            name: "xciptv",
            path: `${dirPath}/panel/xciptv`,
            isDirectory: true,
          },
          {
            name: "tivimate",
            path: `${dirPath}/panel/tivimate`,
            isDirectory: true,
          },
        ],
      },
      {
        name: "api",
        path: `${dirPath}/api`,
        isDirectory: true,
        children: [
          {
            name: "xciptv",
            path: `${dirPath}/api/xciptv`,
            isDirectory: true,
          },
          {
            name: "tivimate",
            path: `${dirPath}/api/tivimate`,
            isDirectory: true,
          },
        ],
      },
    ];
  } else if (domainName.includes("demo")) {
    // Simulate a domain with panel but no modules
    structure.items = [
      {
        name: "panel",
        path: `${dirPath}/panel`,
        isDirectory: true,
        children: [],
      },
      {
        name: "api",
        path: `${dirPath}/api`,
        isDirectory: true,
        children: [],
      },
    ];
  } else if (domainName.includes("test")) {
    // Simulate a domain with no panel
    structure.items = [];
  }

  return structure;
}

module.exports = {
  checkRemoteFile,
  createRemoteDirectory,
  downloadFile,
  downloadDirectory,
  listRemoteDirectory,
  listDestinationFolders,
  copyFolderContents,
  scanDomainStructure,
};
