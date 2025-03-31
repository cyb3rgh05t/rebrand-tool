/**
 * Cloudflare API configuration file for DNS operations
 */
const configManager = require("../main/config-manager");

module.exports = {
  // API Authentication
  auth: {
    // Your Cloudflare API token (preferred authentication method)
    apiToken: configManager.get("cloudflare.apiToken", ""),

    // Alternative authentication (if not using API token)
    email: configManager.get("cloudflare.email", ""),
    globalApiKey: configManager.get("cloudflare.apiKey", ""),
  },

  // DNS Settings
  dns: {
    // Your zone ID (found in the Cloudflare dashboard)
    zoneId: configManager.get("cloudflare.zoneId", ""),

    // Root domain (e.g., streamnet.live)
    rootDomain: configManager.get("cloudflare.rootDomain", ""),

    // Default TTL for DNS records (in seconds)
    defaultTTL: configManager.get("cloudflare.defaultTTL", 3600),
  },

  // DNS Record Templates
  recordTemplates: {
    // A records
    aRecords: [
      {
        name: "admin.{{subdomain}}", // e.g., admin.blabla.streamnet.live
        content: configManager.get("cloudflare.ipv4Address", ""),
        type: "A",
        ttl: 1, // Auto TTL
        proxied: true,
      },
      {
        name: "localhost.{{subdomain}}", // e.g., localhost.blabla.streamnet.live
        content: "127.0.0.1",
        type: "A",
        ttl: 1, // Auto TTL
        proxied: false,
      },
      {
        name: "{{subdomain}}", // e.g., blabla.streamnet.live
        content: configManager.get("cloudflare.ipv4Address", ""),
        type: "A",
        ttl: 1, // Auto TTL
        proxied: true,
      },
      {
        name: "www.{{subdomain}}", // e.g., www.blabla.streamnet.live
        content: configManager.get("cloudflare.ipv4Address", ""),
        type: "A",
        ttl: 1, // Auto TTL
        proxied: true,
      },
    ],

    // AAAA records
    aaaaRecords: [
      {
        name: "{{subdomain}}", // e.g., blabla.streamnet.live
        content: configManager.get("cloudflare.ipv6Address", ""),
        type: "AAAA",
        ttl: 1, // Auto TTL
        proxied: true,
      },
      {
        name: "www.{{subdomain}}", // e.g., www.blabla.streamnet.live
        content: configManager.get("cloudflare.ipv6Address", ""),
        type: "AAAA",
        ttl: 1, // Auto TTL
        proxied: true,
      },
    ],
  },

  // Application Settings
  settings: {
    // Whether to automatically create DNS records when setting up a new domain
    autoCreateDns: configManager.get("cloudflare.autoCreateDns", true),

    // Whether to create DNS records for subdomains automatically
    autoCreateSubdomainDns: configManager.get(
      "cloudflare.autoCreateSubdomainDns",
      true
    ),

    // Whether to log DNS operations for debugging
    logDnsOperations: configManager.get("cloudflare.logDnsOperations", true),
  },
};
