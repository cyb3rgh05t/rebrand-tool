/**
 * Enhanced Update Dialog Module for StreamNet Panels
 * Handles the display and interactions of the update notification dialog
 */
import { log } from "../utils/logging.js";

// Cache for the dialog element
let dialogElement = null;
let cssLoaded = false;

/**
 * Initialize the update dialog system
 */
export function initUpdateDialog() {
  log.debug("Initializing update dialog system");

  // Explicitly load the CSS file
  loadDialogStyles();

  // Remove any existing dialog element
  removeExistingDialog();

  // Listen for keypress events (Ctrl+U for testing)
  setupTestingKeyboardShortcut();

  log.debug("Update dialog system initialized");
}

/**
 * Explicitly load the CSS styles for the dialog
 */
function loadDialogStyles() {
  if (cssLoaded) return;

  // Create a link element
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.id = "update-dialog-styles";

  // The path needs to be correct relative to where the page is loaded
  // Try multiple potential paths
  link.href = "./src/styles/update-dialog.css";

  // Add a load event to detect success
  link.onload = () => {
    log.info("Update dialog styles loaded successfully!");
    cssLoaded = true;
  };

  // Add an error event to handle failures
  link.onerror = (e) => {
    log.error(
      "Failed to load update dialog styles from ./src/styles/update-dialog.css!"
    );
    // Try alternate path
    link.href = "../styles/update-dialog.css";

    link.onerror = (e) => {
      log.error("Failed to load update dialog styles from alternate path!");
      // Fall back to inline styles as a last resort
      applyInlineStyles();
    };
  };

  // Add to the document head
  document.head.appendChild(link);
}

/**
 * Fall back to inline styles if the CSS file can't be loaded
 */
function applyInlineStyles() {
  log.warn("Applying inline styles as fallback");
  const styleElement = document.createElement("style");
  styleElement.id = "update-dialog-inline-styles";
  styleElement.textContent = `
    #update-dialog-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    
    #update-dialog-container.visible {
      opacity: 1;
    }
    
    .update-dialog {
      background-color: var(--bg-surface, #1e2130);
      color: var(--text-primary, #fff);
      border-radius: 8px;
      width: 450px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .update-dialog-header {
      background-color: var(--primary, #2650d8);
      color: var(--text-primary, white);
      padding: 16px;
      display: flex;
      align-items: center;
      position: relative;
      font-weight: 500;
    }
    
    .update-dialog-header .icon {
      margin-right: 12px;
      color: var(--text-on-primary, white);
    }
    
    .update-dialog-header h2 {
      margin: 0;
      font-size: 18px;
      flex-grow: 1;
      font-weight: 500;
    }
    
    .update-dialog-close {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }
    
    .update-dialog-close:hover {
      color: white;
    }
    
    .update-dialog-content {
      padding: 20px;
    }
    
    .update-dialog-message {
      margin: 0 0 16px 0;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .update-dialog-info {
      background-color: var(--bg-surface-light, rgba(0, 0, 0, 0.2));
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
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
      color: var(--text-secondary, rgba(255, 255, 255, 0.7));
    }
    
    .update-dialog-version-value {
      font-weight: 500;
    }
    
    .update-dialog-version-value.latest {
      color: var(--primary-light, #3e97ff);
    }
    
    .update-dialog-notes-title {
      font-size: 14px;
      margin: 0 0 8px 0;
      color: var(--text-secondary, rgba(255, 255, 255, 0.7));
      font-weight: 500;
    }
    
    .update-dialog-notes {
      background-color: var(--bg-surface-light, rgba(0, 0, 0, 0.2));
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
      font-size: 14px;
      line-height: 1.6;
      max-height: 200px;
      overflow-y: auto;
      color: var(--text-primary, rgba(255, 255, 255, 0.9));
    }
    
    .update-dialog-notes p {
      margin: 0 0 12px 0;
    }
    
    .update-dialog-notes p:last-child {
      margin-bottom: 0;
    }
    
    .update-dialog-notes a {
      color: var(--primary-light, #3e97ff);
      text-decoration: none;
    }
    
    .update-dialog-notes a:hover {
      text-decoration: underline;
    }
    
    .version-tag {
      display: inline-block;
      background-color: var(--primary, #2650d8);
      color: var(--text-on-primary, white);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    
    .release-version {
      color: var(--primary, #3e97ff);
      font-weight: 500;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
    }
    
    .update-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .update-dialog-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border: none;
    }
    
    .update-dialog-button .icon {
      width: 16px;
      height: 16px;
    }
    
    .update-dialog-button-secondary {
      background-color: var(--bg-button-secondary, rgba(255, 255, 255, 0.1));
      color: var(--text-primary, white);
    }
    
    .update-dialog-button-secondary:hover {
      background-color: var(--bg-button-secondary-hover, rgba(255, 255, 255, 0.15));
    }
    
    .update-dialog-button-primary {
      background-color: var(--primary, #2650d8);
      color: var(--text-on-primary, white);
    }
    
    .update-dialog-button-primary:hover {
      background-color: var(--primary-hover, #3060e8);
    }
    
    .update-dialog-checkbox {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: var(--text-secondary, rgba(255, 255, 255, 0.7));
    }
    
    .update-dialog-checkbox input {
      margin-right: 8px;
    }
  `;

  document.head.appendChild(styleElement);
  cssLoaded = true;
}

/**
 * Remove any existing dialog element
 */
function removeExistingDialog() {
  const existingDialog = document.getElementById("update-dialog-container");
  if (existingDialog) {
    existingDialog.parentNode.removeChild(existingDialog);
    log.debug("Removed existing update dialog");
  }
}

/**
 * Hide any existing toast notifications
 */
function hideExistingToastNotifications() {
  // Hide the update toast notification
  const updateToast = document.getElementById("updateStatus");
  if (updateToast) {
    updateToast.classList.remove("visible");
    updateToast.style.display = "none";
    log.debug("Hidden update toast notification");
  }
}

/**
 * Setup keyboard shortcut for testing (Ctrl+U)
 */
function setupTestingKeyboardShortcut() {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "u") {
      event.preventDefault();
      testUpdateDialog();
    }
  });
}

/**
 * Test function to show the update dialog with sample data
 */
export function testUpdateDialog() {
  log.info("Testing update dialog");
  showUpdateDialog({
    version: "2.5.0",
    currentVersion: "2.4.3",
    downloadUrl:
      "https://github.com/cyb3rgh05t/rebrand-tool/releases/tag/v2.5.0",
    releaseNotes:
      '### Added\n\n- Completely redesigned Update Notification System with modern UI\n- New dark-mode optimized update dialog with animated transitions\n- "Don\'t show again for this version" option for update notifications\n\n### Changed\n\n- Improved user preferences system for update notifications\n- Enhanced styling and layout for all notification dialogs',
  });

  return true;
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
  log.info(`Showing update dialog for version ${updateInfo.version}`);

  // Make sure CSS is loaded
  if (!cssLoaded) {
    loadDialogStyles();
  }

  // Find and hide any existing update toast notifications
  hideExistingToastNotifications();

  // Remove any existing dialog first
  removeExistingDialog();

  // Create the dialog container
  const container = document.createElement("div");
  container.id = "update-dialog-container";

  // Get current theme from document
  let currentTheme = "";
  document.documentElement.classList.forEach((className) => {
    if (className.startsWith("theme-")) {
      currentTheme = className;
    }
  });

  // Add theme class to container if detected
  if (currentTheme) {
    container.classList.add(currentTheme);
    log.debug(`Applied theme class: ${currentTheme}`);
  }

  // Add HTML content with actual version information
  container.innerHTML = `
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
        <button id="update-dialog-close" class="update-dialog-close">
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
          <span class="version" id="update-new-version">v${
            updateInfo.version
          }</span>
        </p>

        <!-- Version information -->
        <div class="update-dialog-info">
          <div class="update-dialog-version-row">
            <span class="update-dialog-version-label">Current version:</span>
            <span class="update-dialog-version-value" id="update-current-version">v${
              updateInfo.currentVersion
            }</span>
          </div>
          <div class="update-dialog-version-row">
            <span class="update-dialog-version-label">Latest version:</span>
            <span class="update-dialog-version-value latest" id="update-latest-version">v${
              updateInfo.version
            }</span>
          </div>
        </div>

        <!-- Release notes with prominent version -->
        <h3 class="update-dialog-notes-title">What's new:</h3>
        <div class="update-dialog-notes" id="update-release-notes">
          <div class="release-version">
            <span class="version-tag">v${
              updateInfo.version
            }</span> Release Notes
          </div>
          ${formatReleaseNotes(updateInfo.releaseNotes, updateInfo.version)}
        </div>

        <!-- Action buttons -->
        <div class="update-dialog-actions">
          <button
            id="update-dialog-later"
            class="update-dialog-button update-dialog-button-secondary"
          >
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
          <button
            id="update-dialog-download"
            class="update-dialog-button update-dialog-button-primary"
            data-version="${updateInfo.version}"
            data-url="${updateInfo.downloadUrl || ""}"
          >
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
            <input type="checkbox" id="update-dont-show-again" />
            Don't show again for this version
          </label>
        </div>
      </div>
    </div>
  `;

  // Ensure the container is added directly to the body element
  // not inside any other container that might affect its positioning
  document.body.appendChild(container);

  // Force a reflow to ensure the dialog is properly positioned
  container.getBoundingClientRect();

  // Set up event listeners
  setupDialogEvents(container, updateInfo);

  // Show with animation
  setTimeout(() => {
    container.classList.add("visible");
  }, 10);

  // Store reference to dialog
  dialogElement = container;

  log.debug(`Update dialog shown for version ${updateInfo.version}`);
}

/**
 * Format release notes with simple HTML formatting
 * @param {string} notes - Raw release notes
 * @param {string} version - Latest version number
 * @returns {string} Formatted HTML
 */
function formatReleaseNotes(notes, version) {
  if (!notes || notes.trim() === "") {
    return `<p>This release includes various improvements and bug fixes.</p>
            <p>For detailed information, please check the <a href="https://github.com/cyb3rgh05t/rebrand-tool/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">CHANGELOG.md</a> file.</p>`;
  }

  // Simple markdown-like formatting
  notes = notes
    // Replace Markdown headers (skipping the first one as we've already added it with a tag)
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
}

/**
 * Set up events for the dialog
 * @param {HTMLElement} container - Dialog container element
 * @param {Object} updateInfo - Update information
 */
function setupDialogEvents(container, updateInfo) {
  // Close button
  const closeButton = container.querySelector("#update-dialog-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      hideDialog(container);
    });
  }

  // Later button
  const laterButton = container.querySelector("#update-dialog-later");
  if (laterButton) {
    laterButton.addEventListener("click", () => {
      log.info("User chose to be reminded later");
      hideDialog(container);
    });
  }

  // Download button
  const downloadButton = container.querySelector("#update-dialog-download");
  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      const url = downloadButton.getAttribute("data-url");
      log.info(`User initiated update download from: ${url}`);

      if (window.streamNetAPI && window.streamNetAPI.openExternalLink) {
        window.streamNetAPI.openExternalLink(url);
      } else {
        window.open(url, "_blank");
      }

      hideDialog(container);
    });
  }

  // Skip version checkbox
  const skipCheckbox = container.querySelector("#update-dont-show-again");
  if (skipCheckbox) {
    skipCheckbox.addEventListener("change", () => {
      if (skipCheckbox.checked) {
        log.info(
          `User chose to skip notifications for version ${updateInfo.version}`
        );

        if (window.streamNetAPI && window.streamNetAPI.skipUpdateVersion) {
          window.streamNetAPI.skipUpdateVersion(updateInfo.version);
        }
      }
    });
  }

  // Click outside to close
  container.addEventListener("click", (event) => {
    if (event.target === container) {
      hideDialog(container);
    }
  });
}

/**
 * Hide and remove the dialog
 * @param {HTMLElement} container - Dialog container element
 */
export function hideDialog(container) {
  container.classList.remove("visible");

  // Remove after animation completes
  setTimeout(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);

      // Clear reference
      if (dialogElement === container) {
        dialogElement = null;
      }
    }
  }, 300);
}

// Export a test function for the global scope
window.testUpdateDialog = testUpdateDialog;

// Add module to window object for debugging
window.updateDialog = {
  init: initUpdateDialog,
  show: showUpdateDialog,
  hide: hideDialog,
  test: testUpdateDialog,
};

export default {
  initUpdateDialog,
  showUpdateDialog,
  hideDialog,
  testUpdateDialog,
};
