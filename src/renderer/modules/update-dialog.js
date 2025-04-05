/**
 * Update Dialog Handler for StreamNet Panels
 * Handles both the update notification dialog and download progress
 */
import { log } from "../utils/logging.js";

// Track whether dialog has been created
let dialogCreated = false;

// Track active download ID
let activeDownloadId = null;

/**
 * Create the update dialog in the DOM if it doesn't exist
 * @returns {boolean} Whether the dialog was created successfully
 */
function createDialogElement() {
  try {
    log.debug("Creating update dialog element");

    // Check if dialog already exists
    if (document.getElementById("updateDialogBackdrop")) {
      log.debug("Update dialog element already exists");
      return true;
    }

    // Inject CSS styles
    // injectDialogStyles();

    // Create the dialog element structure based on provided template
    const dialogHTML = `
      <div id="updateDialogBackdrop" class="update-dialog-backdrop" style="display: none;">
        <div class="update-dialog">
          <!-- Header -->
          <div class="update-dialog-header">
            <svg
              class="icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2>Update Available</h2>
            <button id="updateDialogClose" class="update-dialog-close">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="update-dialog-content">
            <p class="update-dialog-message">
              A new version of Rebrands Panels is available:
              <span class="version" id="newVersionLabel">v0.0.0</span>
            </p>

            <!-- Version information -->
            <div class="update-dialog-info">
              <div class="update-dialog-version-row">
                <span class="update-dialog-version-label">Current version:</span>
                <span class="update-dialog-version-value" id="currentVersionLabel">v0.0.0</span>
              </div>
              <div class="update-dialog-version-row">
                <span class="update-dialog-version-label">Latest version:</span>
                <span class="update-dialog-version-value latest" id="latestVersionLabel">v0.0.0</span>
              </div>
            </div>

            <!-- Release notes -->
            <h3 class="update-dialog-notes-title" id="releaseNotesTitle">What's new in Release v0.0.0:</h3>
            <div class="update-dialog-notes" id="releaseNotesContent">
              Loading release notes...
            </div>

            <!-- Action buttons -->
            <div class="update-dialog-actions">
              <button id="updateDialogLater" class="update-dialog-button update-dialog-button-secondary">
                <svg
                  class="icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Remind Later
              </button>
              <button id="updateDialogSkip" class="update-dialog-button update-dialog-button-secondary">
                <svg
                  class="icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"></path>
                  <line x1="3" y1="15" x2="7" y2="15"></line>
                  <line x1="3" y1="10" x2="13" y2="10"></line>
                  <line x1="17" y1="10" x2="12" y2="15"></line>
                  <line x1="17" y1="15" x2="12" y2="10"></line>
                  <rect x="17" y="6" width="6" height="11" rx="2"></rect>
                </svg>
                Skip This Version
              </button>
              <button id="updateDialogDownload" class="update-dialog-button update-dialog-button-primary" data-version="" data-url="">
                <svg
                  class="icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Update Now
              </button>
            </div>

            <!-- Don't show again checkbox (now hidden as we have a Skip button) -->
            <div class="update-dialog-checkbox" style="display: none;">
              <label>
                <input type="checkbox" id="updateDialogDontShowAgain" />
                Don't show again for this version
              </label>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create a div to hold our dialog
    const dialogContainer = document.createElement("div");
    dialogContainer.innerHTML = dialogHTML.trim();

    // Get the actual dialog element (first child of the container)
    const dialogElement = dialogContainer.firstChild;

    // Append the dialog element to the body
    document.body.appendChild(dialogElement);

    log.debug("Update dialog element created and added to DOM");

    // Set up event listeners for the dialog
    setupEventListeners();

    // Mark as created
    dialogCreated = true;
    return true;
  } catch (error) {
    log.error(`Failed to create update dialog element: ${error.message}`);
    return false;
  }
}

/**
 * Set up event listeners for the dialog
 */
function setupEventListeners() {
  try {
    log.debug("Setting up update dialog event listeners");

    // Close button
    const closeButton = document.getElementById("updateDialogClose");
    if (closeButton) {
      closeButton.addEventListener("click", hideUpdateDialog);
      log.debug("Close button event listener attached");
    }

    // "Remind Later" button
    const laterButton = document.getElementById("updateDialogLater");
    if (laterButton) {
      laterButton.addEventListener("click", () => {
        log.info("User chose to be reminded later about the update");
        hideUpdateDialog();
      });
      log.debug("Remind Later button event listener attached");
    }

    // "Skip This Version" button (replaces the checkbox functionality)
    const skipButton = document.getElementById("updateDialogSkip");
    if (skipButton) {
      skipButton.addEventListener("click", () => {
        try {
          // Get the version from the labeled element
          const versionElement = document.getElementById("latestVersionLabel");
          if (versionElement) {
            // Extract version without the "v" prefix
            const version = versionElement.textContent.replace(/^v/, "");

            log.info(`User chose to skip updates for version ${version}`);

            // Call the main process to save this preference
            if (window.streamNetAPI && window.streamNetAPI.skipUpdateVersion) {
              window.streamNetAPI
                .skipUpdateVersion(version)
                .then((result) => {
                  if (result.success) {
                    log.info(
                      `Successfully set version ${version} to be skipped`
                    );
                  } else {
                    log.error(`Failed to set version skip: ${result.error}`);
                  }
                })
                .catch((err) => {
                  log.error(`Error in skipUpdateVersion: ${err.message}`);
                });
            } else {
              log.error("skipUpdateVersion API not available");
            }
          } else {
            log.error("Version element not found, cannot skip version");
          }

          // Close the dialog regardless
          hideUpdateDialog();
        } catch (error) {
          log.error(`Error in skip version handler: ${error.message}`);
          hideUpdateDialog();
        }
      });
      log.debug("Skip This Version button event listener attached");
    }

    // "Update Now" button
    const downloadButton = document.getElementById("updateDialogDownload");
    if (downloadButton) {
      downloadButton.addEventListener("click", (e) => {
        try {
          // Log the click for debugging
          log.debug("Update Now button clicked");

          // Prevent default behavior just in case
          e.preventDefault();

          // Get attributes
          const version = downloadButton.getAttribute("data-version");
          const url = downloadButton.getAttribute("data-url");

          // Log values for debugging
          log.debug(`Version attribute: "${version}", URL attribute: "${url}"`);

          if (!url) {
            log.error("Download URL is empty or not set");
            return;
          }

          log.info(
            `User initiated update download for version ${version}, URL: ${url}`
          );

          // Call our downloadUpdate method
          if (
            window.streamNetAPI &&
            typeof window.streamNetAPI.downloadUpdate === "function"
          ) {
            log.debug("Using streamNetAPI.downloadUpdate");
            try {
              // Generate a filename based on the version
              const filename = `rebrand-tool-v${version}-setup.exe`;

              // Hide the update dialog
              hideUpdateDialog();

              // Show download progress dialog
              showDownloadProgressDialog(url, version, filename);
            } catch (err) {
              log.error(`Error starting download: ${err.message}`);
              // Fallback on error to just opening the URL
              window.open(url, "_blank");
            }
          } else {
            // Fallback to window.open
            log.debug(
              "Fallback to window.open, downloadUpdate API not available"
            );
            window.open(url, "_blank");

            // Hide the dialog
            hideUpdateDialog();
          }
        } catch (error) {
          log.error(`Error in download button click handler: ${error.message}`);
        }
      });
      log.debug("Download button event listener attached");
    } else {
      log.error("Download button element not found");
    }

    // Backdrop click to close
    const backdrop = document.getElementById("updateDialogBackdrop");
    if (backdrop) {
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) {
          hideUpdateDialog();
        }
      });
      log.debug("Backdrop click event listener attached");
    }

    // ESC key to close
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const backdrop = document.getElementById("updateDialogBackdrop");
        if (backdrop && backdrop.style.display === "flex") {
          hideUpdateDialog();
        }
      }
    });

    log.debug("All update dialog event listeners attached successfully");
  } catch (error) {
    log.error(
      `Error setting up update dialog event listeners: ${error.message}`
    );
  }
}

/**
 * Initialize the update dialog
 */
export function initUpdateDialog() {
  try {
    log.debug("Initializing update dialog");

    // Create the dialog element if it doesn't exist
    if (!dialogCreated) {
      if (!createDialogElement()) {
        throw new Error("Failed to create update dialog element");
      }
    }

    log.debug("Update dialog initialized successfully");
  } catch (error) {
    log.error(`Error initializing update dialog: ${error.message}`);
  }
}

/**
 * Show the update dialog with specified update information
 * @param {Object} updateInfo - Information about the available update
 * @param {string} updateInfo.version - Latest version number
 * @param {string} updateInfo.currentVersion - Current installed version
 * @param {string} updateInfo.downloadUrl - URL to download the update
 * @param {string} updateInfo.releaseNotes - Release notes in markdown format
 */
export function showUpdateDialog(updateInfo) {
  try {
    log.debug("Showing update dialog");

    // Create the dialog element if it doesn't exist yet
    if (!dialogCreated && !createDialogElement()) {
      throw new Error("Failed to create dialog element");
    }

    // Get dialog element
    const dialogBackdrop = document.getElementById("updateDialogBackdrop");
    if (!dialogBackdrop) {
      throw new Error("Dialog element not found in the DOM");
    }

    // Update dialog content
    updateDialogContent(updateInfo);

    // Show the dialog
    log.debug("Setting dialog display to flex");
    dialogBackdrop.style.display = "flex";

    // Force a reflow to ensure the transition works
    void dialogBackdrop.offsetWidth;

    // Add the visible class to trigger the transition
    dialogBackdrop.classList.add("visible");

    log.info(
      `Update dialog shown successfully for version ${updateInfo.version}`
    );
  } catch (error) {
    log.error(`Error showing update dialog: ${error.message}`);
  }
}

/**
 * Update the content of the dialog with update information
 * @param {Object} updateInfo - Update information
 */
function updateDialogContent(updateInfo) {
  try {
    log.debug("Updating dialog content with version information");

    const newVersionLabel = document.getElementById("newVersionLabel");
    const currentVersionLabel = document.getElementById("currentVersionLabel");
    const latestVersionLabel = document.getElementById("latestVersionLabel");
    const releaseNotesElement = document.getElementById("releaseNotesContent");
    const downloadButton = document.getElementById("updateDialogDownload");
    const skipButton = document.getElementById("updateDialogSkip");

    if (newVersionLabel) {
      newVersionLabel.textContent = `v${updateInfo.version || "0.0.0"}`;
    } else {
      log.warn("New version label element not found");
    }

    if (currentVersionLabel) {
      currentVersionLabel.textContent = `v${
        updateInfo.currentVersion || "0.0.0"
      }`;
    } else {
      log.warn("Current version element not found");
    }

    if (latestVersionLabel) {
      latestVersionLabel.textContent = `v${updateInfo.version || "0.0.0"}`;
    } else {
      log.warn("Latest version element not found");
    }

    // Update the release notes title to include the version
    const releaseNotesTitle = document.getElementById("releaseNotesTitle");
    if (releaseNotesTitle) {
      releaseNotesTitle.textContent = `What's new in Release v${
        updateInfo.version || "0.0.0"
      }:`;
    } else {
      log.warn("Release notes title element not found");
    }

    if (releaseNotesElement) {
      // Format release notes with simple HTML
      const formattedNotes = formatReleaseNotes(
        updateInfo.releaseNotes || "",
        updateInfo.version || "0.0.0"
      );
      releaseNotesElement.innerHTML = formattedNotes;
    } else {
      log.warn("Release notes element not found");
    }

    if (downloadButton) {
      // Log before setting attributes
      log.debug(
        `Setting download URL to: ${updateInfo.downloadUrl || "empty"}`
      );

      // Set the attributes
      downloadButton.setAttribute(
        "data-version",
        updateInfo.version || "0.0.0"
      );
      downloadButton.setAttribute("data-url", updateInfo.downloadUrl || "");

      // Verify the attributes were set correctly
      const verifyUrl = downloadButton.getAttribute("data-url");
      const verifyVersion = downloadButton.getAttribute("data-version");
      log.debug(
        `Verification - URL attribute: "${verifyUrl}", Version attribute: "${verifyVersion}"`
      );
    } else {
      log.error("Download button not found when updating content");
    }

    // Update skip button version - this ensures the correct version is used when skipping
    if (skipButton) {
      skipButton.setAttribute("data-version", updateInfo.version || "0.0.0");
      log.debug(
        `Set skip button version attribute to: ${updateInfo.version || "0.0.0"}`
      );
    }

    log.debug("Dialog content updated successfully");
  } catch (error) {
    log.error(`Error updating dialog content: ${error.message}`);
  }
}

/**
 * Hide the update dialog with animation
 */
export function hideUpdateDialog() {
  try {
    log.debug("Hiding update dialog");

    const backdrop = document.getElementById("updateDialogBackdrop");
    if (!backdrop) {
      log.warn("Cannot hide dialog: element not found");
      return;
    }

    // Remove the visible class to start the fade-out transition
    backdrop.classList.remove("visible");

    // Wait for the transition to complete before hiding
    setTimeout(() => {
      if (backdrop) {
        backdrop.style.display = "none";
        log.debug("Dialog hidden");
      }
    }, 300); // Match transition duration in CSS
  } catch (error) {
    log.error(`Error hiding update dialog: ${error.message}`);
  }
}

/**
 * Format release notes with simple HTML formatting
 * @param {string} notes - Raw release notes
 * @param {string} version - Latest version number
 * @returns {string} Formatted HTML
 */
function formatReleaseNotes(notes, version) {
  try {
    // If notes are empty, return a default message
    if (!notes || notes.trim() === "") {
      return `<p class="release-version">Release v${version}</p>
              <p>This release includes various improvements and bug fixes.</p>
              <p>For detailed information, please check the <a href="https://github.com/cyb3rgh05t/rebrand-tool/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">CHANGELOG.md</a> file.</p>`;
    }

    // Simple markdown-like formatting
    notes = notes
      // Replace Markdown headers
      .replace(/^### (.*?)$/gm, '<p class="release-version">### $1</p>')
      .replace(/^## (.*?)$/gm, '<p class="release-version">## $1</p>')
      .replace(/^# (.*?)$/gm, '<p class="release-version"># $1</p>')

      // Replace links [text](url)
      .replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      )

      // Replace plain URLs with links
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      )

      // Replace line breaks with paragraph tags
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    // Wrap in paragraph if needed
    if (!notes.startsWith("<p")) {
      notes = `<p>${notes}</p>`;
    }

    return notes;
  } catch (error) {
    log.error(`Error formatting release notes: ${error.message}`);
    return `<p>Error formatting release notes: ${error.message}</p>`;
  }
}

/**
 * Create and show the download progress dialog
 * @param {string} url The URL to download from
 * @param {string} version The version being downloaded
 * @param {string} filename The filename to save as
 */
export function showDownloadProgressDialog(url, version, filename) {
  try {
    log.debug(`Showing download progress dialog for version ${version}`);

    // Create the download progress dialog if it doesn't exist
    if (!document.getElementById("downloadProgressBackdrop")) {
      createDownloadProgressDialog();
    }

    // Get the dialog elements
    const backdrop = document.getElementById("downloadProgressBackdrop");
    const filenameElement = document.getElementById("downloadProgressFilename");
    const progressBar = document.getElementById("downloadProgressBar");
    const progressPercent = document.getElementById("downloadProgressPercent");
    const downloadedSize = document.getElementById(
      "downloadProgressDownloaded"
    );
    const totalSize = document.getElementById("downloadProgressTotal");
    const cancelButton = document.getElementById("downloadProgressCancel");
    const openFolderButton = document.getElementById(
      "downloadProgressOpenFolder"
    );

    // Update the UI with initial values
    if (filenameElement) filenameElement.textContent = filename;
    if (progressBar) progressBar.style.width = "0%";
    if (progressPercent) progressPercent.textContent = "0%";
    if (downloadedSize) downloadedSize.textContent = "0 KB";
    if (totalSize) totalSize.textContent = "0 B";

    // Remove complete class if present
    const dialog = document.getElementById("downloadProgressDialog");
    if (dialog) dialog.classList.remove("download-progress-complete");

    // Hide the open folder button initially
    if (openFolderButton) openFolderButton.style.display = "none";

    // Reset any previous download ID
    activeDownloadId = null;

    // Set up the cancel button
    if (cancelButton) {
      cancelButton.onclick = () => {
        if (activeDownloadId) {
          log.info(`Cancelling download: ${activeDownloadId}`);
          // Call the cancel API
          if (
            window.streamNetAPI &&
            typeof window.streamNetAPI.cancelDownload === "function"
          ) {
            window.streamNetAPI
              .cancelDownload(activeDownloadId)
              .then(() => {
                log.debug("Download cancelled successfully");
                hideDownloadProgressDialog();
              })
              .catch((err) => {
                log.error(`Error cancelling download: ${err.message}`);
                hideDownloadProgressDialog();
              });
          } else {
            log.warn("Cancel download API not available");
            hideDownloadProgressDialog();
          }
        } else {
          // No active download, just hide the dialog
          hideDownloadProgressDialog();
        }
      };
    }

    // Display the dialog
    if (backdrop) {
      backdrop.style.display = "flex";
      void backdrop.offsetWidth; // Force reflow
      backdrop.classList.add("visible");
    }

    // Set up download started listener
    if (window.streamNetAPI && window.streamNetAPI.onDownloadStarted) {
      // Register handler for download started events
      window.streamNetAPI.onDownloadStarted((data) => {
        // Set the active download ID
        activeDownloadId = data.downloadId;
        log.debug(`Download started with ID: ${activeDownloadId}`);
      });
    }

    // Start the download
    if (
      window.streamNetAPI &&
      typeof window.streamNetAPI.downloadUpdate === "function"
    ) {
      // Set up progress handler
      if (window.streamNetAPI.onDownloadProgress) {
        window.streamNetAPI.onDownloadProgress((data) => {
          updateDownloadProgress(data);
        });
      }

      // Start the download
      window.streamNetAPI
        .downloadUpdate(url, filename)
        .then((result) => {
          log.debug(`Download completed: ${JSON.stringify(result)}`);
          if (result.success) {
            completeDownloadProgress(result.filePath);
          } else if (result.cancelled) {
            hideDownloadProgressDialog();
          } else {
            showDownloadError(result.error || "Unknown error");
          }
        })
        .catch((error) => {
          log.error(`Download error: ${error.message}`);
          showDownloadError(error.message);
        });
    } else {
      log.error("downloadUpdate API not available");
      hideDownloadProgressDialog();
      // Fallback to opening the URL in browser
      window.open(url, "_blank");
    }
  } catch (error) {
    log.error(`Error showing download progress dialog: ${error.message}`);
    // Fallback to opening the URL in browser
    window.open(url, "_blank");
  }
}

/**
 * Create the download progress dialog elements
 */
function createDownloadProgressDialog() {
  try {
    log.debug("Creating download progress dialog");

    // Create the dialog HTML
    const dialogHTML = `
      <div id="downloadProgressBackdrop" class="download-progress-backdrop">
        <div id="downloadProgressDialog" class="download-progress-dialog">
          <div class="download-progress-header">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <h3>Downloading Update</h3>
          </div>
          <div class="download-progress-content">
            <div class="download-progress-status">
              <div class="download-progress-filename" id="downloadProgressFilename">update-file.exe</div>
              <div class="download-progress-info">
                <span id="downloadProgressDownloaded">0 KB</span>
                <span>of  <span id="downloadProgressTotal">0 B</span> (<span id="downloadProgressPercent">0%</span>)</span>
              </div>
            </div>
            <div class="download-progress-bar-container">
              <div class="download-progress-bar" id="downloadProgressBar"></div>
            </div>
            <div class="download-progress-actions">
              <button id="downloadProgressCancel" class="download-progress-button secondary">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Cancel
              </button>
              <button id="downloadProgressOpenFolder" class="download-progress-button primary" style="display: none;">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                Open Folder
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create a container and add the dialog HTML
    const container = document.createElement("div");
    container.innerHTML = dialogHTML.trim();

    // Add to the document
    document.body.appendChild(container.firstChild);

    log.debug("Download progress dialog created");
  } catch (error) {
    log.error(`Error creating download progress dialog: ${error.message}`);
  }
}

/**
 * Update the download progress UI
 * @param {Object} data Progress data from the main process
 */
function updateDownloadProgress(data) {
  try {
    // Get UI elements
    const progressBar = document.getElementById("downloadProgressBar");
    const progressPercent = document.getElementById("downloadProgressPercent");
    const downloadedSize = document.getElementById(
      "downloadProgressDownloaded"
    );
    const totalSize = document.getElementById("downloadProgressTotal");

    // Calculate percentage
    const percent = Math.round(data.progress * 100);

    // Format sizes
    const downloadedFormatted = formatFileSize(data.downloaded);
    const totalFormatted = formatFileSize(data.total);

    // Update UI
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (downloadedSize) downloadedSize.textContent = downloadedFormatted;
    if (totalSize) totalSize.textContent = totalFormatted;

    // If complete, update the UI further
    if (data.complete) {
      completeDownloadProgress(data.filePath);
    }
  } catch (error) {
    log.error(`Error updating download progress: ${error.message}`);
  }
}

/**
 * Format file size to human-readable format
 * @param {number} size Size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(size) {
  if (!size || size === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let fileSize = size;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }

  return `${fileSize.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Handle download completion
 * @param {string} filePath Path to the downloaded file
 */
function completeDownloadProgress(filePath) {
  try {
    log.debug(`Download complete: ${filePath}`);

    // Get UI elements
    const dialog = document.getElementById("downloadProgressDialog");
    const progressBar = document.getElementById("downloadProgressBar");
    const progressPercent = document.getElementById("downloadProgressPercent");
    const cancelButton = document.getElementById("downloadProgressCancel");
    const openFolderButton = document.getElementById(
      "downloadProgressOpenFolder"
    );

    // Update UI for completion
    if (dialog) dialog.classList.add("download-progress-complete");
    if (progressBar) progressBar.style.width = "100%";
    if (progressPercent) progressPercent.textContent = "100%";

    // Change cancel button to Close
    if (cancelButton) {
      cancelButton.textContent = "Close";
      cancelButton.innerHTML = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Close
      `;
    }

    // Store the file path as a data attribute on the button
    // This avoids closure issues and allows us to debug the exact path later
    if (openFolderButton && filePath) {
      // Show the button
      openFolderButton.style.display = "flex";

      // Store the file path for logging
      openFolderButton.setAttribute("data-filepath", filePath);

      // Remove any existing event listeners to avoid duplicates
      openFolderButton.onclick = null;

      // Add a direct click handler
      openFolderButton.addEventListener("click", handleOpenFolderClick);
    }
  } catch (error) {
    log.error(`Error handling download completion: ${error.message}`);
  }
}

/**
 * Dedicated handler function for opening the folder
 * This is separate to make debugging easier
 */
function handleOpenFolderClick(e) {
  try {
    // Get the file path from the data attribute
    const filePath = e.currentTarget.getAttribute("data-filepath");
    log.info(`Open folder clicked for path: ${filePath}`);

    if (!filePath) {
      log.error("No file path found on button");
      alert("Could not locate the downloaded file.");
      return;
    }

    // Try all available methods to open the folder
    openDownloadFolder(filePath);
  } catch (error) {
    log.error(`Error in open folder click handler: ${error.message}`);
    alert(`Failed to open folder: ${error.message}`);
  }
}

/**
 * Try multiple approaches to open the folder containing the downloaded file
 * @param {string} filePath The path to the downloaded file
 */
async function openDownloadFolder(filePath) {
  if (!filePath) {
    log.error("No file path provided to openDownloadFolder");
    return;
  }

  // Log the exact file path for debugging
  log.debug(`Attempting to open folder for: ${filePath}`);

  // Method 1: Use our IPC method (most reliable)
  if (window.streamNetAPI && window.streamNetAPI.showItemInFolder) {
    try {
      log.debug("Trying showItemInFolder method");
      const result = await window.streamNetAPI.showItemInFolder(filePath);

      if (result && result.success) {
        log.info("Successfully opened folder with showItemInFolder");
        return;
      } else if (result && result.error) {
        log.warn(`showItemInFolder failed: ${result.error}`);
      }
    } catch (err) {
      log.warn(`Error using showItemInFolder: ${err.message}`);
    }
  }

  // Method 2: Try to open the directory directly
  if (window.streamNetAPI && window.streamNetAPI.openPath) {
    try {
      log.debug("Trying openPath method for directory");

      // Extract the directory path
      const dirPath = filePath.substring(
        0,
        Math.max(filePath.lastIndexOf("\\"), filePath.lastIndexOf("/"))
      );

      log.debug(`Opening directory: ${dirPath}`);
      const result = await window.streamNetAPI.openPath(dirPath);

      if (result && result.success) {
        log.info("Successfully opened folder with openPath");
        return;
      } else if (result && result.error) {
        log.warn(`openPath failed: ${result.error}`);
      }
    } catch (err) {
      log.warn(`Error using openPath: ${err.message}`);
    }
  }

  // Method 3: Fall back to opening an external link with file:// protocol
  if (window.streamNetAPI && window.streamNetAPI.openExternalLink) {
    try {
      log.debug("Falling back to openExternalLink method");

      // Extract the directory path
      const dirPath = filePath.substring(
        0,
        Math.max(filePath.lastIndexOf("\\"), filePath.lastIndexOf("/"))
      );

      // Format the path according to the file:// URL protocol
      let formattedPath = dirPath.replace(/\\/g, "/");
      if (!formattedPath.startsWith("file:///")) {
        // Ensure the path has the correct format
        formattedPath = `file:///${formattedPath}`;
      }

      log.debug(`Opening URL: ${formattedPath}`);
      window.streamNetAPI.openExternalLink(formattedPath);
      log.info("Opened folder with openExternalLink");
      return;
    } catch (err) {
      log.warn(`Error using openExternalLink: ${err.message}`);
    }
  }

  // Method 4: Last resort, use window.open
  try {
    log.debug("Attempting last resort with window.open");

    // Extract directory path
    const dirPath = filePath.substring(
      0,
      Math.max(filePath.lastIndexOf("\\"), filePath.lastIndexOf("/"))
    );

    // Format for file:// protocol
    let formattedPath = dirPath.replace(/\\/g, "/");
    if (!formattedPath.startsWith("file:///")) {
      formattedPath = `file:///${formattedPath}`;
    }

    window.open(formattedPath);
    log.info("Opened folder with window.open");
  } catch (err) {
    log.error(`All folder opening methods failed: ${err.message}`);
    alert(
      "Could not open the download folder. Please locate the file manually."
    );
  }
}

/**
 * Show a download error in the progress dialog
 * @param {string} errorMessage Error message to display
 */
function showDownloadError(errorMessage) {
  try {
    // Get UI elements
    const openFolderButton = document.getElementById(
      "downloadProgressOpenFolder"
    );
    const cancelButton = document.getElementById("downloadProgressCancel");
    const filenameElement = document.getElementById("downloadProgressFilename");

    // Hide open folder button
    if (openFolderButton) openFolderButton.style.display = "none";

    // Change cancel button to Close
    if (cancelButton) {
      cancelButton.textContent = "Close";
      cancelButton.innerHTML = `
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Close
      `;
    }

    // Show error message
    if (filenameElement) {
      filenameElement.innerHTML = `<span style="color:var(--error, #f44336);">Error: ${errorMessage}</span>`;
    }
  } catch (error) {
    log.error(`Error showing download error: ${error.message}`);
  }
}

/**
 * Hide the download progress dialog
 */
function hideDownloadProgressDialog() {
  try {
    log.debug("Hiding download progress dialog");

    const backdrop = document.getElementById("downloadProgressBackdrop");
    if (!backdrop) return;

    // Start the hide animation
    backdrop.classList.remove("visible");

    // After animation completes, hide the element
    setTimeout(() => {
      backdrop.style.display = "none";
    }, 300);
  } catch (error) {
    log.error(`Error hiding download progress dialog: ${error.message}`);
  }
}

// Export the public API
export default {
  initUpdateDialog,
  showUpdateDialog,
  hideUpdateDialog,
  showDownloadProgressDialog,
};
