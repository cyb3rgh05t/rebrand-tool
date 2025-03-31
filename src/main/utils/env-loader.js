/**
 * Environment variables loader for StreamNet Panels
 * Loads variables from .env file and makes them available in process.env
 */
const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { createLogger } = require("./logger");

const logger = createLogger("env-loader");

/**
 * Load environment variables from .env file
 * @param {string} [envPath] Path to .env file (optional)
 */
function loadEnvVars(envPath) {
  // If no path is provided, try multiple locations
  if (!envPath) {
    const possiblePaths = [
      // Development path - project root
      path.join(process.cwd(), ".env"),

      // Production path - extraResources folder
      path.join(app?.getAppPath() || "", ".env"),

      // Production path - resources folder
      path.join(process.resourcesPath || "", ".env"),

      // Production path - app.asar parent folder
      path.join(path.dirname(app?.getAppPath() || ""), ".env"),
    ];

    // Try each path until we find one that exists
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        logger.info(`Found .env file at: ${possiblePath}`);
        envPath = possiblePath;
        break;
      }
    }

    if (!envPath) {
      logger.warn(".env file not found in any of the expected locations");
      return false;
    }
  }

  logger.debug(`Attempting to load environment variables from: ${envPath}`);

  // Check if file exists
  if (!fs.existsSync(envPath)) {
    logger.warn(`.env file not found at: ${envPath}`);
    return false;
  }

  try {
    // Read and parse .env file
    const envData = fs.readFileSync(envPath, "utf8");
    const envLines = envData.split("\n");

    // Process each line
    for (const line of envLines) {
      // Skip comments and empty lines
      if (line.trim().startsWith("#") || line.trim() === "") continue;

      // Split key and value
      const match = line.match(
        /^\s*([\w.-]+)\s*=\s*["']?([^"'\r\n]+)["']?\s*$/
      );
      if (match) {
        const key = match[1];
        const value = match[2].trim();

        // Add to process.env if not already set
        if (!process.env[key]) {
          process.env[key] = value;
          logger.debug(`Loaded env var: ${key}`);
        } else {
          logger.debug(`Skipped env var (already set): ${key}`);
        }
      }
    }

    logger.info("Environment variables loaded successfully");
    return true;
  } catch (error) {
    logger.error(`Failed to load environment variables: ${error.message}`);
    return false;
  }
}

/**
 * Get environment variable with fallback
 * @param {string} key Environment variable name
 * @param {*} defaultValue Default value if not found
 * @returns {string} Environment variable value or default
 */
function getEnvVar(key, defaultValue) {
  return process.env[key] || defaultValue;
}

/**
 * Get boolean environment variable
 * @param {string} key Environment variable name
 * @param {boolean} defaultValue Default value if not found
 * @returns {boolean} Environment variable as boolean
 */
function getBoolEnvVar(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return ["true", "yes", "1", "y"].includes(value.toLowerCase());
}

/**
 * Get numeric environment variable
 * @param {string} key Environment variable name
 * @param {number} defaultValue Default value if not found
 * @returns {number} Environment variable as number
 */
function getNumEnvVar(key, defaultValue = 0) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

module.exports = {
  loadEnvVars,
  getEnvVar,
  getBoolEnvVar,
  getNumEnvVar,
};
