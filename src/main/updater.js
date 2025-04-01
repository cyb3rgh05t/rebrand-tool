/**
 * Update checking functionality for StreamNet Panels
 */
const { app, dialog, shell } = require("electron");
const { createLogger } = require("./utils/logger");
const https = require("https");
const path = require("path");
const fs = require("fs");
const configManager = require("./config-manager");

// Create update-specific logger
const logger = createLogger("updater");

// Current app version from package.json
const currentVersion = app.getVersion();

/**
 * Extract release notes for a specific version from CHANGELOG.md
 * @param {string} version - Version to extract (e.g., "2.4.2")
 * @returns {string} The extracted release notes or a default message if not found
 */
function extractChangelogForVersion(version) {
  try {
    const fs = require("fs");
    const path = require("path");

    // Try multiple locations for CHANGELOG.md
    const possiblePaths = [
      path.join(app.getAppPath(), "CHANGELOG.md"),
      path.join(process.cwd(), "CHANGELOG.md"),
      path.join(__dirname, "../../CHANGELOG.md"),
      path.join(process.resourcesPath || "", "app/CHANGELOG.md"),
      path.join(process.resourcesPath || "", "app.asar/CHANGELOG.md"),
    ];

    let changelogContent = null;
    let usedPath = null;

    // Try each path until we find a valid CHANGELOG.md
    for (const changelogPath of possiblePaths) {
      if (fs.existsSync(changelogPath)) {
        logger.debug(`Reading CHANGELOG.md from: ${changelogPath}`);
        changelogContent = fs.readFileSync(changelogPath, "utf8");
        usedPath = changelogPath;
        break;
      }
    }

    if (!changelogContent) {
      logger.warn("CHANGELOG.md not found in any of the expected locations");
      return "Release notes not available";
    }

    // Extract release notes using line-by-line approach (most reliable)
    // Split into lines, handling both CRLF and LF
    const lines = changelogContent.split(/\r?\n/);

    // Find the starting line with our version
    let startLine = -1;
    const versionHeaderPattern = `## [${version}]`;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(versionHeaderPattern)) {
        startLine = i;
        break;
      }
    }

    if (startLine === -1) {
      logger.warn(`Version ${version} not found in changelog at ${usedPath}`);
      return "Release notes not available for this version";
    }

    // Find the next version header or end of file
    let endLine = lines.length;

    for (let i = startLine + 1; i < lines.length; i++) {
      if (lines[i].match(/^## \[\d+\.\d+\.\d+\]/)) {
        endLine = i;
        break;
      }
    }

    // Extract the relevant lines (skip the header line itself)
    const releaseNotes = lines
      .slice(startLine + 1, endLine)
      .join("\n")
      .trim();

    logger.debug(
      `Successfully extracted ${releaseNotes.length} chars of release notes for v${version}`
    );
    return releaseNotes;
  } catch (error) {
    logger.error(`Error extracting changelog: ${error.message}`);
    return "Error reading release notes";
  }
}

/**
 * Check for updates by comparing with GitHub releases
 * @returns {Promise<Object>} Update information
 */
async function checkForUpdates() {
  logger.info(`Checking for updates (current version: ${currentVersion})`);

  try {
    // Get GitHub configuration from config manager
    const githubToken = configManager.get("github.apiToken", "");
    const REPO_OWNER = configManager.get("github.owner", "cyb3rgh05t");
    const REPO_NAME = configManager.get("github.repo", "rebrand-tool");

    // Log the GitHub settings being used (without the full token for security)
    logger.debug(`Using GitHub repository: ${REPO_OWNER}/${REPO_NAME}`);
    logger.debug(`GitHub token available: ${githubToken ? "Yes" : "No"}`);

    if (!REPO_OWNER || !REPO_NAME) {
      logger.error("GitHub repository owner or name is not configured");
      return {
        updateAvailable: false,
        currentVersion,
        error: "GitHub repository not properly configured",
        message: "GitHub repository not properly configured",
      };
    }

    // Get the latest release from GitHub API
    const latestRelease = await getLatestRelease(
      REPO_OWNER,
      REPO_NAME,
      githubToken
    );

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
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} token - GitHub API token
 * @returns {Promise<Object>} Release information
 */
function getLatestRelease(owner, repo, token) {
  return new Promise((resolve, reject) => {
    // First try to get the latest release directly
    const path = `/repos/${owner}/${repo}/releases/latest`;
    let retryWithAllReleases = false;

    const makeRequest = (requestPath) => {
      logger.debug(`Fetching GitHub releases from: ${requestPath}`);

      const options = {
        hostname: "api.github.com",
        path: requestPath,
        method: "GET",
        headers: {
          "User-Agent": "StreamNet-Rebrands-Panels",
          Accept: "application/vnd.github.v3+json",
        },
      };

      // Add authorization header if token is available
      if (token) {
        logger.debug("Using GitHub API token for authentication");
        options.headers["Authorization"] = `Bearer ${token}`;
      }

      const req = https.request(options, (res) => {
        let data = "";

        // Check for rate limit issues
        if (res.statusCode === 403) {
          logger.warn(
            "GitHub API rate limit exceeded. Consider adding a GITHUB_API_TOKEN in your configuration"
          );
        }

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          // Log status code to help debug
          logger.debug(`GitHub API response status: ${res.statusCode}`);

          if (res.statusCode === 200) {
            try {
              const responseData = JSON.parse(data);

              // If we requested /latest and got a successful response
              if (requestPath.includes("/latest")) {
                logger.debug(`Found latest release: ${responseData.tag_name}`);
                resolve(responseData);
              }
              // If we requested all releases
              else {
                // Check if we have any releases
                if (!Array.isArray(responseData) || responseData.length === 0) {
                  logger.warn("No releases found for the repository");
                  reject(new Error("No releases found for the repository"));
                  return;
                }

                // Get the latest release from the array
                const sortedReleases = responseData.sort((a, b) => {
                  return new Date(b.created_at) - new Date(a.created_at);
                });

                const latestRelease = sortedReleases[0];
                logger.debug(
                  `Found latest release from list: ${latestRelease.tag_name} (${latestRelease.created_at})`
                );

                resolve(latestRelease);
              }
            } catch (error) {
              reject(
                new Error(
                  `Failed to parse GitHub API response: ${error.message}`
                )
              );
            }
          } else {
            logger.error(
              `GitHub API responded with status code: ${res.statusCode}`
            );

            // If we got a 404 from /latest, try getting all releases instead
            if (
              res.statusCode === 404 &&
              requestPath.includes("/latest") &&
              !retryWithAllReleases
            ) {
              retryWithAllReleases = true;
              logger.debug(
                "No latest release found, trying to get all releases"
              );
              makeRequest(`/repos/${owner}/${repo}/releases`);
            } else {
              if (res.statusCode === 404) {
                reject(
                  new Error(
                    "Releases not found. Repository might be private, not have any releases, or doesn't exist."
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
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Failed to connect to GitHub API: ${error.message}`));
      });

      req.end();
    };

    // Start with the /latest endpoint
    makeRequest(path);
  });
}

/**
 * Check for updates, but respect user preferences for skipped versions
 * @returns {Promise<Object>} Update check result
 */
async function checkForUpdatesRespectingPreferences() {
  try {
    // Check if we have user preferences
    const configPath = path.join(app.getPath("userData"), "update-config.json");
    let updateConfig = {};

    if (fs.existsSync(configPath)) {
      updateConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    // Get update information
    const updateInfo = await checkForUpdates();

    // Respect user preferences for ignored versions
    if (updateInfo.updateAvailable) {
      // Skip if this version is in the ignored list
      if (
        updateConfig.ignoredVersions &&
        updateConfig.ignoredVersions.includes(updateInfo.version)
      ) {
        logger.info(
          `Skipping notification for ignored version ${updateInfo.version}`
        );
        return { ...updateInfo, notifyUser: false };
      }

      // Skip if user chose to skip this specific version
      if (updateConfig.skippedVersion === updateInfo.version) {
        logger.info(
          `Skipping notification for user-skipped version ${updateInfo.version}`
        );
        return { ...updateInfo, notifyUser: false };
      }

      // Otherwise, notify the user
      return { ...updateInfo, notifyUser: true };
    }

    return updateInfo;
  } catch (error) {
    logger.error(
      `Error in checkForUpdatesRespectingPreferences: ${error.message}`
    );
    throw error;
  }
}

/**
 * Show update dialog using the renderer process's custom HTML dialog
 * @param {Object} updateInfo Update information
 * @param {BrowserWindow} parentWindow Parent window
 */
function showUpdateDialog(updateInfo, parentWindow) {
  logger.info("Showing update dialog via renderer process");

  if (!parentWindow || parentWindow.isDestroyed()) {
    logger.error("Cannot show update dialog: Window is not available");
    return;
  }

  try {
    // Extract release notes from CHANGELOG if not already included
    if (!updateInfo.releaseNotes || updateInfo.releaseNotes.trim() === "") {
      updateInfo.releaseNotes =
        extractChangelogForVersion(updateInfo.version) || "";
      logger.debug(
        `Extracted ${updateInfo.releaseNotes.length} chars of release notes`
      );
    }

    // Send the update info to the renderer process via menu-action channel
    parentWindow.webContents.send("menu-action", "show-update", updateInfo);
    logger.debug(
      `Sent show-update message to renderer for version ${updateInfo.version}`
    );

    // Store the fact that user has been notified about this version
    try {
      const configPath = path.join(
        app.getPath("userData"),
        "update-config.json"
      );
      let updateConfig = {};

      if (fs.existsSync(configPath)) {
        updateConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      updateConfig.lastNotifiedVersion = updateInfo.version;
      updateConfig.lastNotifiedTime = new Date().toISOString();

      fs.writeFileSync(configPath, JSON.stringify(updateConfig, null, 2));
    } catch (err) {
      logger.error(`Error storing notification status: ${err.message}`);
    }
  } catch (error) {
    logger.error(`Error showing update dialog: ${error.message}`);

    // Fall back to native dialog if IPC fails
    try {
      // Use the existing showNativeUpdateDialog function
      if (typeof showNativeUpdateDialog === "function") {
        showNativeUpdateDialog(updateInfo, parentWindow);
      } else {
        // Simple fallback if the function doesn't exist
        dialog
          .showMessageBox(parentWindow, {
            type: "info",
            title: "Update Available",
            message: `A new version (${updateInfo.version}) is available`,
            detail: `You're currently using version ${updateInfo.currentVersion}`,
            buttons: ["Download", "Later"],
            defaultId: 0,
          })
          .then(({ response }) => {
            if (response === 0) {
              shell.openExternal(updateInfo.downloadUrl);
            }
          })
          .catch((err) => {
            logger.error(`Error showing fallback dialog: ${err.message}`);
          });
      }
    } catch (dialogError) {
      logger.error(`Error showing fallback dialog: ${dialogError.message}`);
    }
  }
}

module.exports = {
  checkForUpdates,
  showUpdateDialog,
  checkForUpdatesRespectingPreferences,
};
