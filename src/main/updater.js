/**
 * Update checking functionality for StreamNet Panels
 */
const { app, dialog, shell } = require("electron");
const { createLogger } = require("./utils/logger");
const https = require("https");
const { getEnvVar } = require("./utils/env-loader");

// Create update-specific logger
const logger = createLogger("updater");

// Current app version from package.json
const currentVersion = app.getVersion();

// Get GitHub token from environment if available
const githubToken = getEnvVar("GITHUB_API_TOKEN", "");

// GitHub repository information
const REPO_OWNER = "cyb3rgh05t";
const REPO_NAME = "rebrand-tool";

/**
 * Check for updates by comparing with GitHub releases
 * @returns {Promise<Object>} Update information
 */
async function checkForUpdates() {
  logger.info(`Checking for updates (current version: ${currentVersion})`);

  try {
    // Get the latest release from GitHub API
    const latestRelease = await getLatestRelease();

    if (!latestRelease) {
      logger.warn("Could not fetch latest release information");
      return {
        updateAvailable: false,
        currentVersion,
        message: "Could not fetch latest release information",
      };
    }

    logger.debug(`Latest release: ${latestRelease.tag_name}`);

    // Extract version numbers for comparison
    const latestVersion = latestRelease.tag_name.replace(/^v/, "");
    const current = currentVersion.split(".").map(Number);
    const latest = latestVersion.split(".").map(Number);

    // Compare versions
    let updateAvailable = false;
    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
      const currentPart = current[i] || 0;
      const latestPart = latest[i] || 0;

      if (latestPart > currentPart) {
        updateAvailable = true;
        break;
      } else if (latestPart < currentPart) {
        break;
      }
    }

    logger.info(`Update available: ${updateAvailable}`);

    // Find the correct download URL for the user's platform
    let downloadUrl = "";
    if (
      updateAvailable &&
      latestRelease.assets &&
      latestRelease.assets.length > 0
    ) {
      const platform = process.platform;
      const arch = process.arch;

      logger.debug(
        `Finding appropriate asset for platform: ${platform}, architecture: ${arch}`
      );

      // Look for the appropriate asset for the current platform
      for (const asset of latestRelease.assets) {
        const assetName = asset.name.toLowerCase();

        if (platform === "win32") {
          // For Windows, prioritize .exe installers
          if (
            assetName.includes("win") &&
            assetName.includes("setup") &&
            assetName.endsWith(".exe")
          ) {
            downloadUrl = asset.browser_download_url;
            logger.debug(`Found Windows installer: ${assetName}`);
            break;
          } else if (
            assetName.includes("win") &&
            assetName.includes("portable") &&
            assetName.endsWith(".exe")
          ) {
            // Portable version as fallback
            downloadUrl = asset.browser_download_url;
            logger.debug(`Found Windows portable: ${assetName}`);
            // Don't break here, keep looking for setup if available
          }
        } else if (
          platform === "darwin" &&
          assetName.includes("mac") &&
          assetName.endsWith(".dmg")
        ) {
          downloadUrl = asset.browser_download_url;
          logger.debug(`Found macOS installer: ${assetName}`);
          break;
        } else if (platform === "linux") {
          if (assetName.includes("linux") && assetName.endsWith(".appimage")) {
            downloadUrl = asset.browser_download_url;
            logger.debug(`Found Linux AppImage: ${assetName}`);
            break;
          } else if (
            assetName.includes("linux") &&
            assetName.endsWith(".deb")
          ) {
            downloadUrl = asset.browser_download_url;
            logger.debug(`Found Linux .deb package: ${assetName}`);
            // Don't break in case an AppImage is available
          }
        }
      }

      // If we couldn't find a platform-specific asset, use the release page
      if (!downloadUrl) {
        logger.debug(
          `No specific asset found for platform ${platform}, using release page URL`
        );
        downloadUrl = latestRelease.html_url;
      }
    }

    return {
      updateAvailable,
      currentVersion,
      version: latestVersion,
      downloadUrl,
      releaseNotes: latestRelease.body || "",
      message: updateAvailable
        ? `Update available: v${latestVersion}`
        : "You're using the latest version",
    };
  } catch (error) {
    logger.error(`Error checking for updates: ${error.message}`);
    return {
      updateAvailable: false,
      currentVersion,
      error: error.message,
      message: `Error checking for updates: ${error.message}`,
    };
  }
}

/**
 * Get the latest release information from GitHub
 * @returns {Promise<Object>} Release information
 */
function getLatestRelease() {
  return new Promise((resolve, reject) => {
    // Try to get all releases first, as the /latest endpoint might not work in private repos
    const path = `/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
    const options = {
      hostname: "api.github.com",
      path: path,
      method: "GET",
      headers: {
        "User-Agent": "StreamNet-Rebrands-Panels",
        Accept: "application/vnd.github.v3+json",
      },
    };

    // Add authorization header if token is available
    if (githubToken) {
      logger.debug("Using GitHub API token for authentication");
      options.headers["Authorization"] = `token ${githubToken}`;
    }

    logger.debug(`Fetching GitHub releases from: ${path}`);

    const req = https.request(options, (res) => {
      let data = "";

      // Check for rate limit issues
      if (res.statusCode === 403) {
        logger.warn(
          "GitHub API rate limit exceeded. Consider adding a GITHUB_API_TOKEN in your .env file"
        );
      }

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const releases = JSON.parse(data);

            // Check if we have any releases
            if (releases.length === 0) {
              logger.warn("No releases found for the repository");
              reject(new Error("No releases found for the repository"));
              return;
            }

            // Find the latest release (should be the first one, but we'll verify)
            // We're sorting by the created_at date in descending order
            const sortedReleases = releases.sort((a, b) => {
              return new Date(b.created_at) - new Date(a.created_at);
            });

            const latestRelease = sortedReleases[0];
            logger.debug(
              `Found latest release: ${latestRelease.tag_name} (${latestRelease.created_at})`
            );

            // Log available assets for debugging
            if (latestRelease.assets && latestRelease.assets.length > 0) {
              logger.debug(`Available assets for this release:`);
              latestRelease.assets.forEach((asset) => {
                logger.debug(`- ${asset.name} (${asset.browser_download_url})`);
              });
            }

            resolve(latestRelease);
          } catch (error) {
            reject(
              new Error(`Failed to parse GitHub API response: ${error.message}`)
            );
          }
        } else {
          logger.error(
            `GitHub API responded with status code: ${res.statusCode}`
          );
          if (res.statusCode === 404) {
            reject(
              new Error(
                "Releases not found. Repository might be private or not have any releases."
              )
            );
          } else {
            reject(
              new Error(
                `GitHub API responded with status code: ${res.statusCode}`
              )
            );
          }
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Failed to connect to GitHub API: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Show update dialog with options to download or skip
 * @param {Object} updateInfo Update information
 * @param {BrowserWindow} parentWindow Parent window
 */
function showUpdateDialog(updateInfo, parentWindow) {
  logger.info("Showing update dialog");

  const dialogOptions = {
    type: "info",
    buttons: ["Download Now", "Later"],
    title: "Update Available",
    message: `A new version of Rebrands Panels is available: v${updateInfo.version}`,
    detail: updateInfo.releaseNotes || "Would you like to download it now?",
    cancelId: 1,
    defaultId: 0,
  };

  dialog
    .showMessageBox(parentWindow, dialogOptions)
    .then(({ response }) => {
      if (response === 0) {
        // User clicked "Download Now"
        logger.info(`Opening download URL: ${updateInfo.downloadUrl}`);
        shell.openExternal(updateInfo.downloadUrl);
      }
    })
    .catch((err) => {
      logger.error(`Error showing update dialog: ${err.message}`);
    });
}

module.exports = {
  checkForUpdates,
  showUpdateDialog,
};
