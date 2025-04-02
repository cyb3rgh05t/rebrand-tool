/**
 * Configuration manager for StreamNet Panels
 * Handles reading, writing, and migrating user configuration
 */
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const { createLogger } = require("./utils/logger");
const EventEmitter = require("events"); // Add this import

// Create a config-specific logger
const logger = createLogger("config-manager");

// Default config structure
const DEFAULT_CONFIG = {
  // Server connection details
  connection: {
    host: "",
    username: "",
    password: "",
    port: 22,
  },

  // Cloudflare API credentials
  cloudflare: {
    apiToken: "",
    email: "",
    apiKey: "",
    zoneId: "",
    rootDomain: "",
    ipv4Address: "",
    ipv6Address: "",
    defaultTTL: 3600,
    autoCreateDns: true,
    autoCreateSubdomainDns: true,
    logDnsOperations: true,
  },

  // File paths on the remote Linux server
  paths: {
    basePath: "/home/",
    localDestination: "/home/",
  },

  // Application settings
  settings: {
    useSimulatedMode: false,
    logSftpCommands: false,
    logLevel: "debug",
    theme: "dark",
  },

  // Virtualmin configuration
  virtualmin: {
    port: 10000,
    template: "default",
    plan: "Default",
    diskQuota: 500,
    bandwidthQuota: 1000,
  },

  // GitHub settings
  github: {
    apiToken: "",
    owner: "cyb3rgh05t",
    repo: "rebrand-tool",
    updateInterval: 86400000, // 24 hours in milliseconds
    checkUpdatesOnStartup: true,
  },
};

/**
 * Configuration manager class
 */
class ConfigManager extends EventEmitter {
  // Extend EventEmitter
  constructor() {
    super(); // Call EventEmitter constructor

    // User config file path in user data directory
    this.userDataPath = app ? app.getPath("userData") : ".";
    this.configFilePath = path.join(this.userDataPath, "config.json");

    // Legacy .env file paths to try migrating from
    this.envFilePaths = [
      // First check in user data directory (in case it was already migrated)
      path.join(this.userDataPath, ".env"),
      // Then in app directory
      path.join(app ? app.getAppPath() : ".", ".env"),
      // Then in resources directory
      path.join(process.resourcesPath || "", ".env"),
      // Then parent of app.asar
      path.join(path.dirname(app ? app.getAppPath() : "."), ".env"),
      // Then development path
      path.join(process.cwd(), ".env"),
    ];

    // Initialize config
    this.config = this.loadConfig();

    // Log initialization
    logger.info("Configuration manager initialized");
  }

  /**
   * Load configuration from file or initialize defaults
   */
  loadConfig() {
    try {
      // Check if config file exists
      if (fs.existsSync(this.configFilePath)) {
        logger.info(`Loading configuration from ${this.configFilePath}`);
        const configData = fs.readFileSync(this.configFilePath, "utf8");
        return JSON.parse(configData);
      }

      logger.info(
        "No existing config file found, checking for .env to migrate"
      );

      // Try to migrate from .env if config doesn't exist
      const migratedConfig = this.migrateFromEnv();
      if (migratedConfig) {
        logger.info("Successfully migrated configuration from .env file");
        return migratedConfig;
      }

      // Return default config if all else fails
      logger.info("Using default configuration");
      return { ...DEFAULT_CONFIG };
    } catch (error) {
      logger.error(`Error loading configuration: ${error.message}`);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save configuration to disk
   */
  saveConfig() {
    try {
      // Ensure user data directory exists
      if (!fs.existsSync(this.userDataPath)) {
        fs.mkdirSync(this.userDataPath, { recursive: true });
      }

      // Write config file
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(this.config, null, 2),
        "utf8"
      );

      logger.info(`Configuration saved to ${this.configFilePath}`);
      return true;
    } catch (error) {
      logger.error(`Error saving configuration: ${error.message}`);
      return false;
    }
  }

  /**
   * Migrate configuration from .env file
   */
  migrateFromEnv() {
    // Try each possible .env location
    for (const envPath of this.envFilePaths) {
      try {
        if (fs.existsSync(envPath)) {
          logger.info(`Found .env file at ${envPath}, attempting migration`);

          // Read .env file
          const envData = fs.readFileSync(envPath, "utf8");
          const envLines = envData.split("\n");

          // Create new config object starting with defaults
          const newConfig = { ...DEFAULT_CONFIG };

          // Process each line in .env
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
              this.mapEnvVarToConfig(newConfig, key, value);
            }
          }

          // Save the migrated config
          this.config = newConfig;
          this.saveConfig();

          // Make a backup of the .env file
          const backupPath = path.join(this.userDataPath, ".env.bak");
          fs.copyFileSync(envPath, backupPath);
          logger.info(`Made backup of .env file at ${backupPath}`);

          return newConfig;
        }
      } catch (error) {
        logger.error(`Error migrating from ${envPath}: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Map an environment variable to the config structure
   */
  mapEnvVarToConfig(config, key, value) {
    // Convert string "true"/"false" to boolean
    const processValue = (val) => {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
      if (!isNaN(val) && val.trim() !== "") return Number(val);
      return val;
    };

    const processedValue = processValue(value);

    // Map each known .env variable to config structure
    switch (key) {
      // Connection settings
      case "STREAMNET_SERVER_HOST":
        config.connection.host = value;
        break;
      case "STREAMNET_SERVER_USER":
        config.connection.username = value;
        break;
      case "STREAMNET_SERVER_PASSWORD":
        config.connection.password = value;
        break;
      case "STREAMNET_SERVER_PORT":
        config.connection.port = parseInt(value) || 22;
        break;

      // Cloudflare settings
      case "CLOUDFLARE_ROOT_DOMAIN":
        config.cloudflare.rootDomain = value;
        break;
      case "CLOUDFLARE_API_TOKEN":
        config.cloudflare.apiToken = value;
        break;
      case "CLOUDFLARE_EMAIL":
        config.cloudflare.email = value;
        break;
      case "CLOUDFLARE_API_KEY":
        config.cloudflare.apiKey = value;
        break;
      case "CLOUDFLARE_ZONE_ID":
        config.cloudflare.zoneId = value;
        break;
      case "CLOUDFLARE_DEFAULT_TTL":
        config.cloudflare.defaultTTL = parseInt(value) || 3600;
        break;
      case "CLOUDFLARE_IPV4_ADDRESS":
        config.cloudflare.ipv4Address = value;
        break;
      case "CLOUDFLARE_IPV6_ADDRESS":
        config.cloudflare.ipv6Address = value;
        break;
      case "CLOUDFLARE_AUTO_CREATE_DNS":
        config.cloudflare.autoCreateDns = processedValue;
        break;
      case "CLOUDFLARE_AUTO_CREATE_SUBDOMAIN_DNS":
        config.cloudflare.autoCreateSubdomainDns = processedValue;
        break;
      case "CLOUDFLARE_LOG_DNS_OPERATIONS":
        config.cloudflare.logDnsOperations = processedValue;
        break;

      // Path settings
      case "SOURCE_BASE_PATH":
        config.paths.basePath = value;
        break;
      case "DESTINATION_BASE_PATH":
        config.paths.localDestination = value;
        break;

      // Application settings
      case "APP_LOG_LEVEL":
        config.settings.logLevel = value;
        break;
      case "USE_SIMULATED_MODE":
        config.settings.useSimulatedMode = processedValue;
        break;
      case "DEBUG_MODE":
        config.settings.logSftpCommands = processedValue;
        break;

      // Virtualmin settings
      case "VIRTUALMIN_PORT":
        config.virtualmin.port = parseInt(value) || 10000;
        break;
      case "VIRTUALMIN_TEMPLATE":
        config.virtualmin.template = value;
        break;
      case "VIRTUALMIN_PLAN":
        config.virtualmin.plan = value;
        break;
      case "VIRTUALMIN_DISK_QUOTA":
        config.virtualmin.diskQuota = parseInt(value) || 500;
        break;
      case "VIRTUALMIN_BANDWIDTH_QUOTA":
        config.virtualmin.bandwidthQuota = parseInt(value) || 1000;
        break;

      // GitHub settings
      case "GITHUB_API_TOKEN":
        config.github.apiToken = value;
        break;
      case "GITHUB_OWNER":
        config.github.owner = value;
        break;
      case "GITHUB_REPO":
        config.github.repo = value;
        break;
      case "GITHUB_UPDATE_INTERVAL":
        config.github.updateInterval = parseInt(value) || 86400000;
        break;
      case "GITHUB_CHECK_UPDATES_ON_STARTUP":
        config.github.checkUpdatesOnStartup = processedValue;
        break;
    }
  }

  /**
   * Get a configuration value by path
   * @param {string} path - Dot-notation path (e.g., "connection.host")
   * @param {any} defaultValue - Default value if path not found
   */
  get(path, defaultValue) {
    const parts = path.split(".");
    let result = this.config;

    for (const part of parts) {
      if (result === undefined || result === null) {
        return defaultValue;
      }
      result = result[part];
    }

    return result !== undefined ? result : defaultValue;
  }

  /**
   * Set a configuration value by path
   * @param {string} path - Dot-notation path (e.g., "connection.host")
   * @param {any} value - Value to set
   */
  set(path, value) {
    const parts = path.split(".");
    let current = this.config;

    // Navigate to the right nested object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // Set the value
    current[parts[parts.length - 1]] = value;

    // Save the config
    this.saveConfig();

    // Emit change event
    this.emit("config-changed", {
      path: path,
      value: value,
      section: parts[0],
    });

    return true;
  }

  /**
   * Get configuration for a specific section
   * @param {string} section - Section name (e.g., "connection")
   */
  getSection(section) {
    return this.config[section] || {};
  }

  /**
   * Update an entire section of the configuration
   * @param {string} section - Section name
   * @param {object} values - Values to set
   */
  updateSection(section, values) {
    if (!this.config[section]) {
      this.config[section] = {};
    }

    this.config[section] = {
      ...this.config[section],
      ...values,
    };

    this.saveConfig();

    // Emit change event
    this.emit("config-changed", {
      section: section,
      values: values,
    });

    return true;
  }

  /**
   * Export configuration as environment variables format
   * Useful for backward compatibility
   */
  exportAsEnvFormat() {
    const envVars = [];

    // Connection settings
    envVars.push(`STREAMNET_SERVER_HOST="${this.config.connection.host}"`);
    envVars.push(`STREAMNET_SERVER_USER="${this.config.connection.username}"`);
    envVars.push(
      `STREAMNET_SERVER_PASSWORD="${this.config.connection.password}"`
    );
    envVars.push(`STREAMNET_SERVER_PORT="${this.config.connection.port}"`);

    // Cloudflare settings
    envVars.push(
      `CLOUDFLARE_ROOT_DOMAIN="${this.config.cloudflare.rootDomain}"`
    );
    envVars.push(`CLOUDFLARE_API_TOKEN="${this.config.cloudflare.apiToken}"`);
    envVars.push(`CLOUDFLARE_EMAIL="${this.config.cloudflare.email}"`);
    envVars.push(`CLOUDFLARE_API_KEY="${this.config.cloudflare.apiKey}"`);
    envVars.push(`CLOUDFLARE_ZONE_ID="${this.config.cloudflare.zoneId}"`);
    envVars.push(
      `CLOUDFLARE_DEFAULT_TTL="${this.config.cloudflare.defaultTTL}"`
    );
    envVars.push(
      `CLOUDFLARE_IPV4_ADDRESS="${this.config.cloudflare.ipv4Address}"`
    );
    envVars.push(
      `CLOUDFLARE_IPV6_ADDRESS="${this.config.cloudflare.ipv6Address}"`
    );
    envVars.push(
      `CLOUDFLARE_AUTO_CREATE_DNS="${this.config.cloudflare.autoCreateDns}"`
    );
    envVars.push(
      `CLOUDFLARE_AUTO_CREATE_SUBDOMAIN_DNS="${this.config.cloudflare.autoCreateSubdomainDns}"`
    );
    envVars.push(
      `CLOUDFLARE_LOG_DNS_OPERATIONS="${this.config.cloudflare.logDnsOperations}"`
    );

    // Path settings
    envVars.push(`SOURCE_BASE_PATH="${this.config.paths.basePath}"`);
    envVars.push(
      `DESTINATION_BASE_PATH="${this.config.paths.localDestination}"`
    );

    // Application settings
    envVars.push(`APP_LOG_LEVEL="${this.config.settings.logLevel}"`);
    envVars.push(
      `USE_SIMULATED_MODE="${this.config.settings.useSimulatedMode}"`
    );
    envVars.push(`DEBUG_MODE="${this.config.settings.logSftpCommands}"`);

    // Virtualmin settings
    envVars.push(`VIRTUALMIN_PORT="${this.config.virtualmin.port}"`);
    envVars.push(`VIRTUALMIN_TEMPLATE="${this.config.virtualmin.template}"`);
    envVars.push(`VIRTUALMIN_PLAN="${this.config.virtualmin.plan}"`);
    envVars.push(`VIRTUALMIN_DISK_QUOTA="${this.config.virtualmin.diskQuota}"`);
    envVars.push(
      `VIRTUALMIN_BANDWIDTH_QUOTA="${this.config.virtualmin.bandwidthQuota}"`
    );

    // GitHub settings
    envVars.push(`GITHUB_API_TOKEN="${this.config.github.apiToken}"`);
    envVars.push(`GITHUB_OWNER="${this.config.github.owner}"`);
    envVars.push(`GITHUB_REPO="${this.config.github.repo}"`);
    envVars.push(
      `GITHUB_UPDATE_INTERVAL="${this.config.github.updateInterval}"`
    );
    envVars.push(
      `GITHUB_CHECK_UPDATES_ON_STARTUP="${this.config.github.checkUpdatesOnStartup}"`
    );

    return envVars.join("\n");
  }

  /**
   * Save config in .env format for compatibility with components that need it
   */
  saveAsEnvFile() {
    try {
      // Generate .env format content
      const envContent = this.exportAsEnvFormat();

      // Save to user data directory
      const envPath = path.join(this.userDataPath, ".env");
      fs.writeFileSync(envPath, envContent, "utf8");

      logger.info(`Saved configuration in .env format to ${envPath}`);
      return true;
    } catch (error) {
      logger.error(`Error saving .env format: ${error.message}`);
      return false;
    }
  }
}

// Create a singleton instance
const configManager = new ConfigManager();

module.exports = configManager;
