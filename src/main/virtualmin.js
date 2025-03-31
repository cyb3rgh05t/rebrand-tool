/**
 * Virtualmin domain management for StreamNet Panels
 */
const { createLogger } = require("./utils/logger");
const { createSftpConnection, execSSHCommand } = require("./connection");

// Create a virtualmin-specific logger
const logger = createLogger("virtualmin");

// Import configuration
const CONFIG = require("../config/serverConfig");

/**
 * Create a new Virtualmin subdomain
 * @param {Object} options Subdomain options
 * @param {string} options.subdomain Subdomain name
 * @param {string} options.description Domain description
 * @param {string} options.phpMode PHP mode (fpm/cgi/mod_php)
 * @param {string} options.phpVersion PHP version
 * @returns {Promise<Object>} Operation result
 */
async function createVirtualminDomain(options) {
  const {
    subdomain,
    description,
    phpMode = "fpm",
    phpVersion = "8.1",
  } = options;

  logger.info(
    `Creating Virtualmin subdomain: ${subdomain}.${CONFIG.virtualmin.domain.parentDomain}`
  );

  // For simulation mode, just return success after a delay
  if (CONFIG.settings.useSimulatedMode) {
    logger.debug(`Simulation mode: Pretending to create Virtualmin subdomain`);

    // Delay to simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return a simulated domain object
    const fullDomain = `${subdomain}.${CONFIG.virtualmin.domain.parentDomain}`;
    return {
      success: true,
      message: `Successfully created subdomain ${fullDomain} in simulation mode`,
      domain: {
        name: fullDomain,
        path: `/home/streamnet/domains/${fullDomain}/public_html`,
      },
    };
  }

  let connection;
  try {
    connection = await createSftpConnection();
    const { conn } = connection;

    // Build the Virtualmin sub-server command
    const fullDomain = `${subdomain}.${CONFIG.virtualmin.domain.parentDomain}`;
    const parentDomain = CONFIG.virtualmin.domain.parentDomain;

    // Create the Virtualmin command WITHOUT php-mode and php-version parameters
    // These are not supported as shown by the error output
    const createDomainCmd = [
      `virtualmin create-domain`,
      `--domain ${fullDomain}`,
      `--parent ${parentDomain}`,
      `--desc "${description || "Created by StreamNet Panels"}"`,
      `--web`, // Only enable web hosting
      `--dir`, // Create the web directory
    ].join(" ");

    logger.debug(`Executing Virtualmin command: ${createDomainCmd}`);

    // Execute the command via SSH
    const result = await execSSHCommand(
      conn,
      createDomainCmd,
      "Creating Virtualmin subdomain"
    );

    logger.debug(`Domain creation result: ${result}`);

    // Now set the PHP version using a separate command or direct configuration
    // First check if we can use the modify-web command
    try {
      // Try using the modify-web command to set PHP version
      const phpSetupCmd = [
        `virtualmin modify-web`,
        `--domain ${fullDomain}`,
        `--php-mode ${phpMode}`,
        `--php-version ${phpVersion}`,
      ].join(" ");

      logger.debug(`Attempting to set PHP version: ${phpSetupCmd}`);

      await execSSHCommand(conn, phpSetupCmd, "Setting PHP version");

      logger.info(
        `PHP version successfully set to ${phpVersion} with mode ${phpMode}`
      );
    } catch (phpError) {
      // If that fails, try a different approach using modify-domain
      logger.warn(`First PHP setup method failed: ${phpError.message}`);

      try {
        // Alternative approach
        const altPhpSetupCmd = [
          `virtualmin modify-domain`,
          `--domain ${fullDomain}`,
          `--set-php-version ${phpVersion}`,
        ].join(" ");

        logger.debug(`Trying alternative PHP setup: ${altPhpSetupCmd}`);

        await execSSHCommand(
          conn,
          altPhpSetupCmd,
          "Setting PHP version (alternative method)"
        );

        logger.info(`PHP version set using alternative method`);
      } catch (altPhpError) {
        // If both methods fail, just log the error but continue
        // The domain should still be created successfully
        logger.warn(`Failed to set PHP version: ${altPhpError.message}`);
        logger.warn(
          `Failed to set PHP version for ${fullDomain}, but domain was created`
        );
      }
    }

    // Get the path where the subdomain will be hosted
    const homeDirPath = `/home/streamnet/domains/${fullDomain}/public_html`;

    // Clean up connection
    conn.end();

    logger.info(`Successfully created subdomain ${fullDomain}`);
    return {
      success: true,
      message: `Successfully created subdomain ${fullDomain}`,
      domain: {
        name: fullDomain,
        path: homeDirPath,
      },
      details: result.trim(),
    };
  } catch (error) {
    logger.error("Error creating Virtualmin subdomain:", error.message);

    // Add detailed error information
    let errorMessage =
      error.message || "Unknown error creating Virtualmin subdomain";

    // Include command output if available
    if (error.stdout) {
      errorMessage += `\nCommand output: ${error.stdout}`;
      logger.error(`Command output: ${error.stdout}`);
    }

    // Clean up connection if it exists
    if (connection && connection.conn) {
      try {
        connection.conn.end();
      } catch (e) {
        logger.error("Error closing connection:", e.message);
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * List all domains in Virtualmin
 * @returns {Promise<Object>} Operation result with domains list
 */
async function listVirtualminDomains() {
  logger.info("Listing Virtualmin domains");

  // For simulation mode, generate some example domains
  if (CONFIG.settings.useSimulatedMode) {
    logger.debug("Using simulated Virtualmin domain data");

    // Return simulated domains after a delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate random example domains
    const exampleDomains = [];
    const prefixes = [
      "client",
      "test",
      "dev",
      "stage",
      "prod",
      "app",
      "api",
      "demo",
    ];
    for (let i = 1; i <= 5; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const name = `${prefix}${i}.streamnet.live`;
      exampleDomains.push({
        name: name,
        path: `/home/streamnet/domains/${name}`,
      });
    }

    logger.debug(`Generated ${exampleDomains.length} simulated domains`);
    return {
      success: true,
      domains: exampleDomains,
    };
  }

  let connection;
  try {
    connection = await createSftpConnection();
    const { conn } = connection;

    logger.debug("Fetching domains list");

    // Try multiple approaches to get domain directories

    // Approach 1: Direct domain listing from the domains directory
    logger.debug("Approach 1: Listing domain directories");
    const domainsResult = await execSSHCommand(
      conn,
      "find /home/streamnet/domains -maxdepth 1 -type d -not -path '/home/streamnet/domains'",
      "Listing domain directories"
    );

    // Approach 2: Parse Apache virtual host configurations
    logger.debug("Approach 2: Checking Apache vhosts");
    const apacheResult = await execSSHCommand(
      conn,
      "grep -r 'ServerName' /etc/apache2/sites-enabled/ 2>/dev/null | awk '{print $2}'",
      "Checking Apache vhosts"
    );

    // Approach 3: Parse nginx virtual host configurations (if nginx is used)
    logger.debug("Approach 3: Checking Nginx vhosts");
    const nginxResult = await execSSHCommand(
      conn,
      "grep -r 'server_name' /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/server_name//g' | sed 's/;//g' | tr -d ' '",
      "Checking Nginx vhosts"
    );

    // Approach 4: List domains from Virtualmin directly
    logger.debug("Approach 4: Using Virtualmin list-domains command");
    const virtualminResult = await execSSHCommand(
      conn,
      "virtualmin list-domains --name-only 2>/dev/null || echo ''",
      "Listing Virtualmin domains"
    );

    // Approach 5: Try to find domain directories by inspecting home directories
    logger.debug("Approach 5: Searching for domain directories");
    const homeResult = await execSSHCommand(
      conn,
      "find /home -name 'public_html' -type d 2>/dev/null | grep -v '/home/streamnet/public_html'",
      "Finding domain directories"
    );

    // Collect all found domains
    const domainSet = new Set();
    const domainPaths = {};

    // Process domains directory results
    if (domainsResult && domainsResult.trim()) {
      const paths = domainsResult.trim().split("\n");
      logger.debug(`Found ${paths.length} domains in domain directories`);
      paths.forEach((path) => {
        if (path && path.includes("/home/streamnet/domains/")) {
          const parts = path.split("/");
          const name = parts[parts.length - 1];
          if (name && name !== ".." && name !== ".") {
            domainSet.add(name);
            domainPaths[name] = path;
          }
        }
      });
    }

    // Process Apache results
    if (apacheResult && apacheResult.trim()) {
      const serverNames = apacheResult.trim().split("\n");
      logger.debug(`Found ${serverNames.length} domains in Apache config`);
      serverNames.forEach((name) => {
        if (name && name.includes(".")) {
          domainSet.add(name);
          // Create a path if we don't have one already
          if (!domainPaths[name]) {
            domainPaths[name] = `/home/streamnet/domains/${name}`;
          }
        }
      });
    }

    // Process Nginx results
    if (nginxResult && nginxResult.trim()) {
      const serverNames = nginxResult.trim().split("\n");
      logger.debug(`Found ${serverNames.length} domains in Nginx config`);
      serverNames.forEach((name) => {
        if (name && name.includes(".")) {
          domainSet.add(name);
          // Create a path if we don't have one already
          if (!domainPaths[name]) {
            domainPaths[name] = `/home/streamnet/domains/${name}`;
          }
        }
      });
    }

    // Process Virtualmin results
    if (virtualminResult && virtualminResult.trim()) {
      const domains = virtualminResult.trim().split("\n");
      logger.debug(`Found ${domains.length} domains in Virtualmin`);
      domains.forEach((name) => {
        if (name && name.includes(".")) {
          domainSet.add(name);
          // Create a path if we don't have one already
          if (!domainPaths[name]) {
            domainPaths[name] = `/home/streamnet/domains/${name}`;
          }
        }
      });
    }

    // Process public_html directory results
    if (homeResult && homeResult.trim()) {
      const publicHtmlPaths = homeResult.trim().split("\n");
      logger.debug(`Found ${publicHtmlPaths.length} public_html directories`);
      publicHtmlPaths.forEach((path) => {
        // Extract domain name from path like /home/username/domains/domain.com/public_html
        const match = path.match(
          /\/home\/[^\/]+\/domains\/([^\/]+)\/public_html/
        );
        if (match && match[1]) {
          const name = match[1];
          domainSet.add(name);
          domainPaths[name] = path.replace("/public_html", "");
        }
      });
    }

    // Try one more approach - list the domains directory directly
    if (domainSet.size === 0) {
      logger.debug("No domains found yet, trying directory listing approach");
      const lsResult = await execSSHCommand(
        conn,
        "ls -la /home/streamnet/domains/ | grep '^d' | grep -v '\\.$'",
        "Listing domains with ls"
      );

      if (lsResult && lsResult.trim()) {
        const lines = lsResult.trim().split("\n");
        logger.debug(`Found ${lines.length} potential domains with ls`);

        for (const line of lines) {
          // Directory entries typically have format like: drwxr-xr-x 5 user group size date name
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 9) {
            const dirName = parts[8]; // Directory name should be in the 9th column
            if (dirName && dirName !== "." && dirName !== "..") {
              domainSet.add(dirName);
              domainPaths[dirName] = `/home/streamnet/domains/${dirName}`;
            }
          }
        }
      }
    }

    // Convert to the final domain list
    const domains = Array.from(domainSet).map((name) => ({
      name: name,
      path: domainPaths[name] || `/home/streamnet/domains/${name}`,
    }));

    // Clean up connection
    conn.end();

    logger.info(`Found ${domains.length} domains`);
    return {
      success: true,
      domains: domains,
    };
  } catch (error) {
    logger.error("Error listing domains:", error.message);

    // Clean up connection if it exists
    if (connection && connection.conn) {
      try {
        connection.conn.end();
      } catch (e) {
        logger.error("Error closing connection:", e.message);
      }
    }

    // Return with error
    return {
      success: false,
      error: error.message || "Unknown error listing domains",
      domains: [], // Return empty array instead of hardcoded values
    };
  }
}

module.exports = {
  createVirtualminDomain,
  listVirtualminDomains,
};
