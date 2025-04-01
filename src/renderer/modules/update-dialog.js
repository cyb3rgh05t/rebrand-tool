/**
 * Update Dialog Handler for StreamNet Panels
 * Handles both the update notification dialog and download progress
 */
import { log } from "../utils/logging.js";

// Track whether dialog has been created
let dialogCreated = false;

/**
 * Inject the CSS for the update dialog directly into the document
 */
function injectDialogStyles() {
  try {
    log.debug("Injecting update dialog styles");

    // Check if styles already exist
    if (document.getElementById("update-dialog-styles")) {
      log.debug("Update dialog styles already exist");
      return;
    }

    // Create a style element
    const styleElement = document.createElement("style");
    styleElement.id = "update-dialog-styles";

    // Define the CSS - styled according to the provided template
    styleElement.textContent = `
      /* Update Dialog Styles */
      .update-dialog-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .update-dialog-backdrop.visible {
        opacity: 1;
      }
      
      .update-dialog {
        background-color: var(--bg-surface, #2d2d2d);
        color: var(--text-primary, #ffffff);
        width: 550px;
        max-width: 90vw;
        max-height: 85vh;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: translateY(20px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        border: 1px solid var(--border-color, #444);
      }
      
      .update-dialog-backdrop.visible .update-dialog {
        transform: translateY(0);
        opacity: 1;
      }
      
      .update-dialog-header {
        display: flex;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-subtle, #333);
        position: relative;
      }
      
      .update-dialog-header .icon {
        color: var(--primary, #3498db);
        margin-right: 12px;
      }
      
      .update-dialog-header h2 {
        flex-grow: 1;
        margin: 0;
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--text-primary, #fff);
      }
      
      .update-dialog-close {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary, #999);
        border-radius: 50%;
        transition: background-color 0.2s ease, color 0.2s ease;
      }
      
      .update-dialog-close:hover {
        background-color: var(--bg-hover, #444);
        color: var(--text-primary, #fff);
      }
      
      .update-dialog-content {
        padding: 20px;
        overflow-y: auto;
      }
      
      .update-dialog-message {
        font-size: 1.1rem;
        margin-top: 0;
        margin-bottom: 20px;
      }
      
      .update-dialog-message .version {
        font-weight: 600;
        color: var(--primary, #3498db);
      }
      
      .update-dialog-info {
        background-color: var(--bg-surface-variant, #333);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
        border: 1px solid var(--border-subtle, #333);
      }
      
      .update-dialog-version-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .update-dialog-version-row:last-child {
        margin-bottom: 0;
      }
      
      .update-dialog-version-label {
        color: var(--text-secondary, #aaa);
      }
      
      .update-dialog-version-value {
        font-weight: 500;
      }
      
      .update-dialog-version-value.latest {
        color: var(--success, #4caf50);
        font-weight: 600;
      }
      
      .update-dialog-notes-title {
        font-size: 1.1rem;
        margin-top: 0;
        margin-bottom: 12px;
        font-weight: 600;
      }
      
      .update-dialog-notes {
        background-color: var(--bg-surface-variant, #333);
        border-radius: 8px;
        padding: 15px;
        font-size: 0.95rem;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 20px;
        border: 1px solid var(--border-subtle, #333);
      }
      
      .update-dialog-notes p {
        margin-top: 0;
        margin-bottom: 10px;
      }
      
      .update-dialog-notes p:last-child {
        margin-bottom: 0;
      }
      
      .update-dialog-notes a {
        color: var(--primary, #3498db);
        text-decoration: none;
      }
      
      .update-dialog-notes a:hover {
        text-decoration: underline;
      }
      
      .update-dialog-notes .release-version {
        font-weight: 600;
        color: var(--text-accent, #3498db);
        font-size: 1.05em;
        margin-bottom: 12px;
      }
      
      .update-dialog-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 15px;
      }
      
      .update-dialog-button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      
      .update-dialog-button .icon {
        margin-right: 8px;
      }
      
      .update-dialog-button-secondary {
        background-color: var(--bg-button-secondary, #444);
        color: var(--text-primary, #fff);
        border: 1px solid var(--border-color, #555);
      }
      
      .update-dialog-button-secondary:hover {
        background-color: var(--bg-button-secondary-hover, #555);
      }
      
      .update-dialog-button-primary {
        background-color: var(--primary, #3498db);
        color: white;
      }
      
      .update-dialog-button-primary:hover {
        background-color: var(--primary-hover, #2980b9);
      }
      
      .update-dialog-checkbox {
        display: flex;
        align-items: center;
        color: var(--text-secondary, #aaa);
        font-size: 0.9rem;
      }
      
      .update-dialog-checkbox input {
        margin-right: 8px;
      }
      
      .update-dialog-checkbox label {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      /* Download Progress Dialog Styles */
      .download-progress-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .download-progress-backdrop.visible {
        opacity: 1;
      }
      
      .download-progress-dialog {
        background-color: var(--bg-surface, #2d2d2d);
        color: var(--text-primary, #ffffff);
        width: 450px;
        max-width: 90vw;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: translateY(20px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        border: 1px solid var(--border-color, #444);
      }
      
      .download-progress-backdrop.visible .download-progress-dialog {
        transform: translateY(0);
        opacity: 1;
      }
      
      .download-progress-header {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-subtle, #333);
      }
      
      .download-progress-header .icon {
        color: var(--primary, #3498db);
        margin-right: 12px;
      }
      
      .download-progress-header h3 {
        flex-grow: 1;
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--text-primary, #fff);
      }
      
      .download-progress-content {
        padding: 20px;
      }
      
      .download-progress-status {
        margin-bottom: 15px;
        font-size: 0.95rem;
      }
      
      .download-progress-filename {
        font-weight: 500;
        word-break: break-all;
      }
      
      .download-progress-info {
        margin-top: 5px;
        color: var(--text-secondary, #aaa);
        font-size: 0.9rem;
        display: flex;
        justify-content: space-between;
      }
      
      .download-progress-bar-container {
        background-color: var(--bg-surface-variant, #333);
        height: 10px;
        border-radius: 5px;
        overflow: hidden;
        margin: 15px 0;
        border: 1px solid var(--border-subtle, #444);
      }
      
      .download-progress-bar {
        height: 100%;
        width: 0;
        background-color: var(--primary, #3498db);
        transition: width 0.3s ease;
      }
      
      .download-progress-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
      
      .download-progress-button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      
      .download-progress-button.secondary {
        background-color: var(--bg-button-secondary, #444);
        color: var(--text-primary, #fff);
        border: 1px solid var(--border-color, #555);
      }
      
      .download-progress-button.secondary:hover {
        background-color: var(--bg-button-secondary-hover, #555);
      }
      
      .download-progress-button.primary {
        background-color: var(--primary, #3498db);
        color: white;
      }
      
      .download-progress-button.primary:hover {
        background-color: var(--primary-hover, #2980b9);
      }
      
      .download-progress-button .icon {
        margin-right: 8px;
      }
      
      /* When download is complete */
      .download-progress-complete .download-progress-bar {
        background-color: var(--success, #4caf50);
      }
    `;

    // Append the style element to the head
    document.head.appendChild(styleElement);
    log.debug("Update dialog styles injected successfully");
  } catch (error) {
    log.error(`Failed to inject dialog styles: ${error.message}`);
  }
}

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
    injectDialogStyles();

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
            <h3 class="update-dialog-notes-title">What's new:</h3>
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

            <!-- Don't show again checkbox -->
            <div class="update-dialog-checkbox">
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

    // "Don't show again" checkbox
    const dontShowCheckbox = document.getElementById(
      "updateDialogDontShowAgain"
    );
    if (dontShowCheckbox) {
      dontShowCheckbox.addEventListener("change", () => {
        if (dontShowCheckbox.checked) {
          const versionElement = document.getElementById("latestVersionLabel");
          const version = versionElement
            ? versionElement.textContent.replace("v", "")
            : "";

          if (
            version &&
            window.streamNetAPI &&
            window.streamNetAPI.skipUpdateVersion
          ) {
            log.info(`User chose to skip notifications for version ${version}`);
            window.streamNetAPI.skipUpdateVersion(version);
          }
        }
      });
      log.debug("Checkbox event listener attached");
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
    const dontShowCheckbox = document.getElementById(
      "updateDialogDontShowAgain"
    );

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

    if (dontShowCheckbox) {
      dontShowCheckbox.checked = false;
    } else {
      log.warn("Don't show checkbox not found");
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

// Track active download ID
let activeDownloadId = null;

/**
 * Create and show the download progress dialog
 * @param {string} url The URL to download from
 * @param {string} version The version being downloaded
 * @param {string} filename The filename to save as
 */
function showDownloadProgressDialog(url, version, filename) {
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

    // Show the open folder button
    if (openFolderButton) {
      openFolderButton.style.display = "flex";

      // Set up click handler to open the folder containing the file
      openFolderButton.onclick = () => {
        try {
          if (window.streamNetAPI && window.streamNetAPI.openExternalLink) {
            // Extract directory from filePath - need to handle both Windows and Unix paths
            const lastSlashIndex = Math.max(
              filePath.lastIndexOf("\\"),
              filePath.lastIndexOf("/")
            );
            const dirPath = filePath.substring(0, lastSlashIndex);

            // Open the directory
            window.streamNetAPI.openExternalLink(`file://${dirPath}`);
          }
          hideDownloadProgressDialog();
        } catch (error) {
          log.error(`Error opening folder: ${error.message}`);
        }
      };
    }
  } catch (error) {
    log.error(`Error handling download completion: ${error.message}`);
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
};
