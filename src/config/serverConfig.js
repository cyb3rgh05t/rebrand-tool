/**
 * Server connection configuration file for StreamNet Panels
 */
const configManager = require("../main/config-manager");

module.exports = {
  // Server connection details
  connection: {
    host: configManager.get("connection.host", ""),
    username: configManager.get("connection.username", ""),
    password: configManager.get("connection.password", ""),
    port: configManager.get("connection.port", 22),
  },

  // File paths on the remote Linux server
  paths: {
    basePath: configManager.get("paths.basePath", "/home/"),
    localDestination: configManager.get("paths.localDestination", "/home/"),
  },

  // Application settings
  settings: {
    useSimulatedMode: configManager.get("settings.useSimulatedMode", false),
    logSftpCommands: configManager.get("settings.logSftpCommands", false),
    logLevel: configManager.get("settings.logLevel", "debug"),
  },

  // Virtualmin configuration
  virtualmin: {
    // Virtualmin server information
    server: {
      host: configManager.get("connection.host", ""),
      port: configManager.get("virtualmin.port", 10000),
      username: configManager.get("connection.username", ""),
      password: configManager.get("connection.password", ""),
    },

    // Virtualmin domain settings
    domain: {
      parentDomain: configManager.get("cloudflare.rootDomain", ""),
      template: configManager.get("virtualmin.template", "default"),
      plan: configManager.get("virtualmin.plan", "Default"),

      // Default features to enable
      features: [
        "web", // Web hosting
        "dns", // DNS records
        "ssl", // SSL certificates
        "logrotate", // Log rotation
      ],

      // Default quotas and limits
      quota: {
        diskSpace: configManager.get("virtualmin.diskQuota", 500), // MB
        bandwidth: configManager.get("virtualmin.bandwidthQuota", 1000), // MB
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
