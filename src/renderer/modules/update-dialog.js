/**
 * Update Dialog Handler for StreamNet Panels
 * Handles the display and interactions of the update notification dialog
 */
import { log } from "../utils/logging.js";

// Cache for the template
let templateCache = null;

/**
 * Initialize the update dialog
 */
export async function initUpdateDialog() {
  // Load the template if we haven't already
  if (!templateCache) {
    try {
      const response = await fetch("./templates/update-dialog.html");
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      templateCache = await response.text();
    } catch (error) {
      log.error(`Error loading update dialog template: ${error.message}`);
      return;
    }
  }

  // Make sure we only have one instance of the dialog
  const existingDialog = document.getElementById("updateDialogBackdrop");
  if (existingDialog) {
    document.body.removeChild(existingDialog);
  }

  // Insert the template into the DOM
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = templateCache;
  const dialogElement = tempDiv.firstChild;
  document.body.appendChild(dialogElement);

  // Add event listeners
  setupEventListeners();

  log.debug("Update dialog initialized");
}

/**
 * Set up event listeners for the dialog
 */
function setupEventListeners() {
  // Close button
  const closeButton = document.getElementById("updateDialogClose");
  if (closeButton) {
    closeButton.addEventListener("click", hideUpdateDialog);
  }

  // "Remind Later" button
  const laterButton = document.getElementById("updateDialogLater");
  if (laterButton) {
    laterButton.addEventListener("click", () => {
      log.info("User chose to be reminded later about the update");
      hideUpdateDialog();
    });
  }

  // "Update Now" button
  const downloadButton = document.getElementById("updateDialogDownload");
  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      const version = downloadButton.getAttribute("data-version");
      const url = downloadButton.getAttribute("data-url");

      log.info(`User initiated update download for version ${version}`);

      // Use the IPC API to open the download URL
      if (window.streamNetAPI && window.streamNetAPI.openExternalLink) {
        window.streamNetAPI.openExternalLink(url);
      } else {
        // Fallback to window.open
        window.open(url, "_blank");
      }

      hideUpdateDialog();
    });
  }

  // "Don't show again" checkbox
  const dontShowCheckbox = document.getElementById("updateDialogDontShowAgain");
  if (dontShowCheckbox) {
    dontShowCheckbox.addEventListener("change", () => {
      if (dontShowCheckbox.checked) {
        const version =
          document
            .getElementById("latestVersionLabel")
            ?.textContent.replace("v", "") || "";

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
  }

  // Backdrop click to close
  const backdrop = document.getElementById("updateDialogBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        hideUpdateDialog();
      }
    });
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
  // Make sure dialog is initialized
  if (!document.getElementById("updateDialogBackdrop")) {
    initUpdateDialog().then(() => showUpdateDialog(updateInfo));
    return;
  }

  // Update content with the provided information
  const newVersionLabel = document.getElementById("newVersionLabel");
  const currentVersionLabel = document.getElementById("currentVersionLabel");
  const latestVersionLabel = document.getElementById("latestVersionLabel");
  const releaseNotesContent = document.getElementById("releaseNotesContent");
  const downloadButton = document.getElementById("updateDialogDownload");

  if (newVersionLabel) {
    newVersionLabel.textContent = `v${updateInfo.version}`;
  }

  if (currentVersionLabel) {
    currentVersionLabel.textContent = `v${updateInfo.currentVersion}`;
  }

  if (latestVersionLabel) {
    latestVersionLabel.textContent = `v${updateInfo.version}`;
  }

  if (releaseNotesContent) {
    // Simple markdown-like formatting
    let notes = updateInfo.releaseNotes || "";

    // Format the notes in a simple way
    const formattedNotes = formatReleaseNotes(notes, updateInfo.version);
    releaseNotesContent.innerHTML = formattedNotes;
  }

  if (downloadButton) {
    downloadButton.setAttribute("data-version", updateInfo.version);
    downloadButton.setAttribute("data-url", updateInfo.downloadUrl || "");
  }

  // Show the dialog with animation
  const backdrop = document.getElementById("updateDialogBackdrop");
  if (backdrop) {
    backdrop.style.display = "flex";
    // Trigger reflow for the animation to work
    backdrop.offsetHeight;
    backdrop.classList.add("visible");
  }

  log.info(`Showing update dialog for version ${updateInfo.version}`);
}

/**
 * Hide the update dialog
 */
export function hideUpdateDialog() {
  const backdrop = document.getElementById("updateDialogBackdrop");
  if (backdrop) {
    backdrop.classList.remove("visible");

    // Wait for animation to complete before hiding
    setTimeout(() => {
      backdrop.style.display = "none";
    }, 300);
  }
}

/**
 * Format release notes with simple HTML formatting
 * @param {string} notes - Raw release notes
 * @param {string} version - Latest version number
 * @returns {string} Formatted HTML
 */
function formatReleaseNotes(notes, version) {
  if (!notes || notes.trim() === "") {
    return `<p class="release-version">### Release v${version}</p>
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
}

export default {
  initUpdateDialog,
  showUpdateDialog,
  hideUpdateDialog,
};
