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

  // Check if root domain is configured
  if (!CF_CONFIG.dns.rootDomain) {
    logger.error("Root domain not configured in environment");
    return { error: "Root domain not configured in environment" };
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
    // Safely import the Cloudflare package
    let Cloudflare;
    try {
      Cloudflare = require("cloudflare");
      logger.debug("Successfully imported Cloudflare API package");
    } catch (importError) {
      logger.error(
        `Failed to import Cloudflare package: ${importError.message}`
      );
      return {
        success: false,
        error: `Cloudflare package not available: ${importError.message}`,
      };
    }

    // Initialize the Cloudflare API client with detailed error handling
    logger.debug("Initializing Cloudflare API client");

    // Configure authentication options
    let cfConfig;
    if (CF_CONFIG.auth.apiToken) {
      logger.debug("Using API token for Cloudflare authentication");
      cfConfig = { token: CF_CONFIG.auth.apiToken };
    } else if (CF_CONFIG.auth.email && CF_CONFIG.auth.globalApiKey) {
      logger.debug(
        "Using email and global API key for Cloudflare authentication"
      );
      cfConfig = {
        email: CF_CONFIG.auth.email,
        key: CF_CONFIG.auth.globalApiKey,
      };
    } else {
      logger.error("No valid Cloudflare authentication method available");
      return {
        success: false,
        error: "No valid Cloudflare authentication method available",
      };
    }

    // Create the client
    let cf;
    try {
      cf = new Cloudflare(cfConfig);
      logger.debug("Cloudflare API client created successfully");
    } catch (clientError) {
      logger.error(
        `Failed to create Cloudflare client: ${clientError.message}`
      );
      return {
        success: false,
        error: `Failed to create Cloudflare client: ${clientError.message}`,
      };
    }

    // Verify that the zones property exists on the client
    if (!cf.zones) {
      logger.error(
        "Cloudflare client does not have zones property - possible API version mismatch"
      );
      return {
        success: false,
        error: "Cloudflare API version mismatch - missing zones property",
      };
    }

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

    // Validate required properties for each record
    recordsToCreate.forEach((record) => {
      if (!record.content) {
        logger.warn(`Record ${record.name} is missing content property`);
      }
    });

    // Create records using the modern Cloudflare API pattern
    for (const record of recordsToCreate) {
      try {
        logger.debug(`Creating ${record.type} record: ${record.name}`);

        // Check if zones.dns property exists (newer API pattern)
        if (cf.zones && cf.zones.dns && cf.zones.dns.records) {
          logger.debug(`Using Cloudflare zones.dns.records API pattern`);
          const result = await cf.zones.dns.records.add(zoneId, record);

          results.push({
            id: result.id,
            name: result.name,
            type: result.type,
            status: "created",
          });

          logger.info(`Successfully created record: ${record.name}`);
        }
        // If the old API pattern is available
        else if (cf.dnsRecords) {
          logger.debug(`Using legacy Cloudflare dnsRecords API pattern`);
          const result = await cf.dnsRecords.add(zoneId, record);

          results.push({
            id: result.id,
            name: result.name,
            type: result.type,
            status: "created",
          });

          logger.info(`Successfully created record: ${record.name}`);
        }
        // Manual API call if neither API pattern works
        else {
          logger.debug(`Falling back to manual API call pattern`);

          // Import the simple https module for direct API calls
          const https = require("https");

          // Create a promise-based request
          const makeRequest = () => {
            return new Promise((resolve, reject) => {
              // Prepare the request options
              const options = {
                hostname: "api.cloudflare.com",
                path: `/client/v4/zones/${zoneId}/dns_records`,
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: CF_CONFIG.auth.apiToken
                    ? `Bearer ${CF_CONFIG.auth.apiToken}`
                    : `X-Auth-Email: ${CF_CONFIG.auth.email}\nX-Auth-Key: ${CF_CONFIG.auth.globalApiKey}`,
                },
              };

              // Create the request
              const req = https.request(options, (res) => {
                let data = "";

                res.on("data", (chunk) => {
                  data += chunk;
                });

                res.on("end", () => {
                  if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                      const result = JSON.parse(data);
                      if (result.success) {
                        resolve(result.result);
                      } else {
                        reject(
                          new Error(
                            result.errors[0].message || "API request failed"
                          )
                        );
                      }
                    } catch (e) {
                      reject(
                        new Error(`Failed to parse API response: ${e.message}`)
                      );
                    }
                  } else {
                    reject(
                      new Error(
                        `API request failed with status ${res.statusCode}`
                      )
                    );
                  }
                });
              });

              req.on("error", (error) => {
                reject(error);
              });

              // Send the request data
              req.write(JSON.stringify(record));
              req.end();
            });
          };

          // Make the API call
          const result = await makeRequest();

          results.push({
            id: result.id,
            name: result.name,
            type: result.type,
            status: "created",
          });

          logger.info(`Successfully created record: ${record.name}`);
        }
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
    const rootDomain = CF_CONFIG.dns.rootDomain;

    if (!rootDomain) {
      logger.error(
        "Root domain not configured in CLOUDFLARE_ROOT_DOMAIN environment variable"
      );
      throw new Error("Root domain not configured");
    }

    logger.info(`Using root domain: ${rootDomain}`);
    return rootDomain;
  } catch (err) {
    logger.error("Error getting root domain:", err.message);
    throw new Error("Root domain not configured properly");
  }
}

module.exports = {
  createDnsRecords,
  getRootDomain,
};
