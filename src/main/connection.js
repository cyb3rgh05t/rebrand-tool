/**
 * SSH/SFTP connection management for StreamNet Panels
 */
const ssh2 = require("ssh2");
const { createLogger } = require("./utils/logger");

// Create a connection-specific logger
const logger = createLogger("connection");

// Import server configuration
const CONFIG = require("../config/serverConfig");

/**
 * Test SFTP connection to verify server connectivity
 * @returns {Promise<Object>} Connection test results
 */
async function testSftpConnection() {
  logger.info("Testing SFTP connection...");
  let conn = null;

  try {
    // Create new SSH client
    conn = new ssh2.Client();

    // Create a promise for connection
    const connectionPromise = new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout after 10 seconds"));
      }, 10000);

      conn.on("ready", () => {
        clearTimeout(timeout);
        logger.debug("SSH connection ready");
        resolve();
      });

      conn.on("error", (err) => {
        clearTimeout(timeout);
        logger.error("SSH connection error:", err.message);
        reject(err);
      });

      // Connect with basic options
      logger.debug(
        `Connecting to ${CONFIG.connection.host}:${CONFIG.connection.port}`
      );
      conn.connect({
        host: CONFIG.connection.host,
        port: CONFIG.connection.port,
        username: CONFIG.connection.username,
        password: CONFIG.connection.password,
        readyTimeout: 10000,
      });
    });

    // Wait for connection
    await connectionPromise;

    // Test SFTP subsystem
    const sftpPromise = new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) {
          logger.error("SFTP subsystem error:", err.message);
          return reject(err);
        }

        // Try to read a directory to test SFTP
        logger.debug(
          `Testing SFTP by reading directory: ${CONFIG.paths.basePath}`
        );
        sftp.readdir(CONFIG.paths.basePath, (dirErr, list) => {
          if (dirErr) {
            logger.error("SFTP directory read error:", dirErr.message);
            reject(dirErr);
          } else {
            logger.debug(`SFTP test successful, found ${list.length} items`);
            resolve({
              success: true,
              directoryCount: list.length,
              basePath: CONFIG.paths.basePath,
            });
          }
        });
      });
    });

    // Wait for SFTP test
    const result = await sftpPromise;

    // Clean up connection
    conn.end();
    logger.info("SFTP connection test successful");
    return result;
  } catch (error) {
    logger.error("SFTP connection test failed:", error.message);

    // Clean up connection if it exists
    if (conn) {
      try {
        conn.end();
      } catch (closeErr) {
        logger.error("Error closing connection during test:", closeErr.message);
      }
    }

    throw error;
  }
}

/**
 * Create a Promise-based SFTP connection
 * @returns {Promise<Object>} Connection and SFTP objects
 */
function createSftpConnection() {
  return new Promise((resolve, reject) => {
    logger.info("Creating new SFTP connection");
    const conn = new ssh2.Client();

    // Set a timeout for connection establishment
    const timeout = setTimeout(() => {
      logger.error("Connection timeout after 30 seconds");
      try {
        conn.end();
      } catch (e) {
        logger.error("Error ending timed-out connection:", e.message);
      }
      reject(new Error("Connection timeout after 30 seconds"));
    }, 30000);

    // Connection ready
    conn.on("ready", () => {
      logger.info("SSH connection established");
      clearTimeout(timeout);

      // Initialize SFTP session
      conn.sftp((err, sftp) => {
        if (err) {
          logger.error("Failed to initialize SFTP:", err.message);
          try {
            conn.end();
          } catch (e) {
            logger.error(
              "Error closing connection after SFTP init failure:",
              e.message
            );
          }
          return reject(err);
        }

        logger.info("SFTP connection established");

        // Log any SFTP errors
        sftp.on("error", (sftpErr) => {
          logger.error("SFTP error:", sftpErr.message);
        });

        // Return the connection and SFTP objects
        resolve({ conn, sftp });
      });
    });

    // Handle connection errors
    conn.on("error", (err) => {
      logger.error("SSH connection error:", err.message);
      clearTimeout(timeout);
      reject(err);
    });

    // Connection ended by server
    conn.on("end", () => {
      logger.debug("SSH connection ended");
    });

    // Connection closed
    conn.on("close", (hadError) => {
      logger.debug("SSH connection closed", hadError ? "with error" : "");
    });

    // Connect with basic options
    logger.debug(
      `Connecting to ${CONFIG.connection.host}:${CONFIG.connection.port}`
    );
    conn.connect({
      host: CONFIG.connection.host,
      port: CONFIG.connection.port,
      username: CONFIG.connection.username,
      password: CONFIG.connection.password,
      readyTimeout: 20000,
      tryKeyboard: false,
    });
  });
}

/**
 * Execute SSH command with improved error handling
 * @param {Object} conn SSH connection
 * @param {string} command Command to execute
 * @param {string} description Human-readable description for logging
 * @returns {Promise<string>} Command output
 */
async function execSSHCommand(conn, command, description) {
  logger.debug(`Executing ${description}: ${command}`);

  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        logger.error(`Error executing ${description}: ${err.message}`);
        return reject(err);
      }

      let errorOutput = "";
      let stdOutput = "";

      // Handle standard output
      stream.on("data", (data) => {
        const output = data.toString();
        stdOutput += output;
        logger.debug(`Command output: ${output.trim()}`);
      });

      // Handle error output
      stream.stderr.on("data", (data) => {
        const error = data.toString();
        errorOutput += error;
        logger.error(`Command error: ${error.trim()}`);
      });

      // Set a timeout for commands that might hang
      const timeout = setTimeout(() => {
        logger.error(`Command timed out after 30 seconds: ${command}`);
        reject(new Error(`Command timed out: ${description}`));
      }, 30000);

      // When the command completes
      stream.on("close", (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          logger.error(
            `${description} failed with code ${code}: ${errorOutput}`
          );
          const error = new Error(
            `${description} failed: ${errorOutput || "Unknown error"}`
          );

          // Attach the output strings to the error object
          error.stderr = errorOutput;
          error.stdout = stdOutput;
          error.exitCode = code;

          reject(error);
        } else {
          logger.info(`${description} completed successfully`);
          if (stdOutput) {
            logger.debug(`Full output: ${stdOutput.trim()}`);
          }
          resolve(stdOutput);
        }
      });
    });
  });
}

module.exports = {
  testSftpConnection,
  createSftpConnection,
  execSSHCommand,
};
