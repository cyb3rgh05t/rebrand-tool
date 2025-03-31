/**
 * Server connection configuration file for StreamNet Panels
 */
const {
  getEnvVar,
  getBoolEnvVar,
  getNumEnvVar,
} = require("../main/utils/env-loader");

module.exports = {
  // Server connection details
  connection: {
    host: getEnvVar("STREAMNET_SERVER_HOST"),
    username: getEnvVar("STREAMNET_SERVER_USER"),
    password: getEnvVar("STREAMNET_SERVER_PASSWORD"),
    port: getNumEnvVar("STREAMNET_SERVER_PORT"),
  },

  // File paths on the remote Linux server
  paths: {
    basePath: getEnvVar("SOURCE_BASE_PATH"),
    localDestination: getEnvVar("DESTINATION_BASE_PATH"),
  },

  // Application settings
  settings: {
    useSimulatedMode: getBoolEnvVar("USE_SIMULATED_MODE"),
    logSftpCommands: getBoolEnvVar("DEBUG_MODE"),
    logLevel: getEnvVar("APP_LOG_LEVEL"),
  },

  // Virtualmin configuration
  virtualmin: {
    // Virtualmin server information
    server: {
      host: getEnvVar("STREAMNET_SERVER_HOST"),
      port: getNumEnvVar("VIRTUALMIN_PORT"),
      username: getEnvVar("STREAMNET_SERVER_USER"),
      password: getEnvVar("STREAMNET_SERVER_PASSWORD"),
    },

    // Virtualmin domain settings
    domain: {
      parentDomain: getEnvVar("CLOUDFLARE_ROOT_DOMAIN"),
      template: getEnvVar("VIRTUALMIN_TEMPLATE"),
      plan: getEnvVar("VIRTUALMIN_PLAN"),

      // Default features to enable
      features: [
        "web", // Web hosting
        "dns", // DNS records
        "ssl", // SSL certificates
        "logrotate", // Log rotation
      ],

      // Default quotas and limits
      quota: {
        diskSpace: getNumEnvVar("VIRTUALMIN_DISK_QUOTA"), // MB
        bandwidth: getNumEnvVar("VIRTUALMIN_BANDWIDTH_QUOTA"), // MB
      },
    },
  },

  // Optional simulated data for testing mode
  simulatedData: {
    domains: [
      {
        name: "client1.streamnet.live",
        path: "/home/streamnet/domains/client1.streamnet.live",
      },
      {
        name: "demo.streamnet.live",
        path: "/home/streamnet/domains/demo.streamnet.live",
      },
      {
        name: "test.streamnet.live",
        path: "/home/streamnet/domains/test.streamnet.live",
      },
    ],
    subfolders: {
      "client1.streamnet.live": [
        {
          name: "public_html",
          path: "/home/streamnet/domains/client1.streamnet.live/public_html",
        },
      ],
      "demo.streamnet.live": [
        {
          name: "public_html",
          path: "/home/streamnet/domains/demo.streamnet.live/public_html",
        },
      ],
      "test.streamnet.live": [
        {
          name: "public_html",
          path: "/home/streamnet/domains/test.streamnet.live/public_html",
        },
      ],
    },
    fileSystem: {
      // Simulated file structure for testing
      "": [
        { name: "cockpitpanel", isDirectory: true },
        { name: "api", isDirectory: true },
        { name: "panel", isDirectory: true },
      ],
      api: [
        { name: "support", isDirectory: true },
        { name: "proxy", isDirectory: true },
        { name: "xciptv", isDirectory: true },
        { name: "tivimate", isDirectory: true },
      ],
      panel: [
        { name: "support", isDirectory: true },
        { name: "proxy", isDirectory: true },
        { name: "xciptv", isDirectory: true },
        { name: "tivimate", isDirectory: true },
      ],
    },
  },
};
