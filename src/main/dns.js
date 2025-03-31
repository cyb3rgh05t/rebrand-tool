/**
 * Cloudflare DNS operations module for StreamNet Panels
 */
const { createLogger } = require("./utils/logger");

// Create a DNS-specific logger
const logger = createLogger("dns");

// Import configuration
const CF_CONFIG = require("../config/cloudflareConfig");

/**
 * Create DNS records for a subdomain
 * @param {Object} options Configuration options
 * @param {string} options.subdomain Subdomain to create records for
 * @returns {Promise<Object>} Operation result
 */
async function createDnsRecords({ subdomain }) {
  logger.info(`Creating DNS records for subdomain: ${subdomain}`);

  if (!subdomain) {
    logger.error("Subdomain is required");
    return { error: "Subdomain is required" };
  }

  // Check for API credentials
  if (!CF_CONFIG.auth.apiToken && !CF_CONFIG.auth.globalApiKey) {
    logger.error("Cloudflare API credentials not configured");
    return { error: "Cloudflare API credentials not configured" };
  }

  // For simulation mode or when Cloudflare module is not ready
  if (require("../config/serverConfig").settings.useSimulatedMode) {
    logger.debug(`Simulating DNS record creation for: ${subdomain}`);

    // Delay to simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Prepare record templates
    const aRecords = CF_CONFIG.recordTemplates.aRecords.map((record) => {
      return {
        ...record,
        name: record.name.replace("{{subdomain}}", subdomain),
      };
    });

    const aaaaRecords = CF_CONFIG.recordTemplates.aaaaRecords.map((record) => {
      return {
        ...record,
        name: record.name.replace("{{subdomain}}", subdomain),
      };
    });

    logger.info(
      `Simulated creation of ${
        aRecords.length + aaaaRecords.length
      } DNS records`
    );
    return {
      success: true,
      message: `Created DNS records for ${subdomain}.${CF_CONFIG.dns.rootDomain}`,
      records: [...aRecords, ...aaaaRecords],
    };
  }

  try {
    // Initialize the Cloudflare API client
    const Cloudflare = require("cloudflare");
    logger.debug("Initializing Cloudflare API client");

    // Configure authentication - prefer API token if available, fall back to global API key
    const cfConfig = CF_CONFIG.auth.apiToken
      ? { token: CF_CONFIG.auth.apiToken }
      : { email: CF_CONFIG.auth.email, key: CF_CONFIG.auth.globalApiKey };

    const cf = new Cloudflare(cfConfig);

    // Prepare records based on templates
    const recordsToCreate = [];

    // Add A records
    for (const template of CF_CONFIG.recordTemplates.aRecords) {
      const recordName = template.name.replace("{{subdomain}}", subdomain);
      recordsToCreate.push({
        type: "A",
        name: recordName,
        content: template.content,
        ttl: template.ttl,
        proxied: template.proxied,
      });
    }

    // Add AAAA records
    for (const template of CF_CONFIG.recordTemplates.aaaaRecords) {
      const recordName = template.name.replace("{{subdomain}}", subdomain);
      recordsToCreate.push({
        type: "AAAA",
        name: recordName,
        content: template.content,
        ttl: template.ttl,
        proxied: template.proxied,
      });
    }

    logger.debug(`Prepared ${recordsToCreate.length} DNS records to create`);

    // Actually create the records in Cloudflare
    const results = [];
    const zoneId = CF_CONFIG.dns.zoneId;
    logger.debug(`Using zone ID: ${zoneId}`);

    for (const record of recordsToCreate) {
      try {
        logger.debug(`Creating ${record.type} record: ${record.name}`);

        // API call to create the DNS record
        const result = await cf.dnsRecords.add(zoneId, record);

        results.push({
          id: result.id,
          name: result.name,
          type: result.type,
          status: "created",
        });

        logger.info(`Successfully created record: ${record.name}`);
      } catch (recordError) {
        logger.error(
          `Error creating record ${record.name}:`,
          recordError.message
        );

        results.push({
          name: record.name,
          type: record.type,
          status: "error",
          error: recordError.message,
        });
      }
    }

    // Check if any records were successfully created
    const successCount = results.filter((r) => r.status === "created").length;

    if (successCount === 0) {
      logger.error("Failed to create any DNS records");
      return {
        success: false,
        error: "Failed to create any DNS records",
        results,
      };
    }

    logger.info(
      `Successfully created ${successCount} of ${recordsToCreate.length} DNS records`
    );
    return {
      success: true,
      message: `Successfully created ${successCount} of ${recordsToCreate.length} DNS records for ${subdomain}.${CF_CONFIG.dns.rootDomain}`,
      results,
    };
  } catch (error) {
    logger.error("Error creating DNS records:", error.message);
    return {
      success: false,
      error: error.message || "Unknown error during DNS creation",
    };
  }
}

/**
 * Get the root domain from configuration
 * @returns {Promise<string>} Root domain
 */
async function getRootDomain() {
  try {
    logger.debug("Getting root domain from configuration");
    return CF_CONFIG.dns.rootDomain || "streamnet.live";
  } catch (err) {
    logger.error("Error getting root domain:", err.message);
    return "streamnet.live";
  }
}

module.exports = {
  createDnsRecords,
  getRootDomain,
};
