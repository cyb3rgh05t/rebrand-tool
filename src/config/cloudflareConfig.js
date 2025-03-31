/**
 * Cloudflare API configuration file for DNS operations
 *
 */
const {
  getEnvVar,
  getBoolEnvVar,
  getNumEnvVar,
} = require("../main/utils/env-loader");

module.exports = {
  // API Authentication
  auth: {
    // Your Cloudflare API token (preferred authentication method)
    apiToken: getEnvVar("CLOUDFLARE_API_TOKEN"),

    // Alternative authentication (if not using API token)
    email: getEnvVar("CLOUDFLARE_EMAIL"),
    globalApiKey: getEnvVar("CLOUDFLARE_API_KEY"),
  },

  // DNS Settings
  dns: {
    // Your zone ID (found in the Cloudflare dashboard)
    zoneId: getEnvVar("CLOUDFLARE_ZONE_ID"),

    // Root domain (e.g., streamnet.live)
    rootDomain: getEnvVar("CLOUDFLARE_ROOT_DOMAIN"),

    // Default TTL for DNS records (in seconds)
    defaultTTL: getNumEnvVar("CLOUDFLARE_DEFAULT_TTL"),
  },

  // DNS Record Templates
  recordTemplates: {
    // A records
    aRecords: [
      {
        name: "admin.{{subdomain}}", // e.g., admin.blabla.streamnet.live
        content: getEnvVar("CLOUDFLARE_IPV4_ADDRESS"),
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
        content: getEnvVar("CLOUDFLARE_IPV4_ADDRESS"),
        type: "A",
        ttl: 1, // Auto TTL
        proxied: true,
      },
      {
        name: "www.{{subdomain}}", // e.g., www.blabla.streamnet.live
        content: getEnvVar("CLOUDFLARE_IPV4_ADDRESS"),
        type: "A",
        ttl: 1, // Auto TTL
        proxied: true,
      },
    ],

    // AAAA records
    aaaaRecords: [
      {
        name: "{{subdomain}}", // e.g., blabla.streamnet.live
        content: getEnvVar("CLOUDFLARE_IPV6_ADDRESS"),
        type: "AAAA",
        ttl: 1, // Auto TTL
        proxied: true,
      },
      {
        name: "www.{{subdomain}}", // e.g., www.blabla.streamnet.live
        content: getEnvVar("CLOUDFLARE_IPV6_ADDRESS"),
        type: "AAAA",
        ttl: 1, // Auto TTL
        proxied: true,
      },
    ],
  },

  // Application Settings
  settings: {
    // Whether to automatically create DNS records when setting up a new domain
    autoCreateDns: getBoolEnvVar("CLOUDFLARE_AUTO_CREATE_DNS"),

    // Whether to create DNS records for subdomains automatically
    autoCreateSubdomainDns: getBoolEnvVar(
      "CLOUDFLARE_AUTO_CREATE_SUBDOMAIN_DNS"
    ),

    // Whether to log DNS operations for debugging
    logDnsOperations: getBoolEnvVar("CLOUDFLARE_LOG_DNS_OPERATIONS"),
  },
};
