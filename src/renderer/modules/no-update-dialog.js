/**
 * Function to show a "No Updates Available" dialog
 * This is a companion to the existing update dialog
 */

import { log } from "../utils/logging.js";

export function showNoUpdateDialog(currentVersion) {
  try {
    log.debug("Showing no update available dialog");

    // Get the dialog element or create it if it doesn't exist
    let noUpdateDialog = document.getElementById("noUpdateDialogBackdrop");
    if (!noUpdateDialog) {
      noUpdateDialog = createNoUpdateDialogElement();
    }

    // Update version text
    const versionElement = document.getElementById("currentVersionDisplay");
    if (versionElement) {
      versionElement.textContent = `Release v${currentVersion}`;
    }

    // Show the dialog
    noUpdateDialog.style.display = "flex";
    setTimeout(() => {
      noUpdateDialog.classList.add("visible");
    }, 10);

    log.info(`Displayed no update dialog for version ${currentVersion}`);
  } catch (error) {
    log.error(`Error showing no update dialog: ${error.message}`);
    // Fall back to a simple alert in case of error
    alert(
      `You're using the latest version (v${currentVersion}). No updates available.`
    );
  }
}

/**
 * Create the dialog element for "No Updates Available"
 */
function createNoUpdateDialogElement() {
  // Create the dialog HTML
  const dialogHTML = `
    <div id="noUpdateDialogBackdrop" class="update-dialog-backdrop">
      <div class="update-dialog no-update-dialog">
        <!-- Header -->
        <div class="update-dialog-header">
          <div class="header-left">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <h2>No Updates Available</h2>
          </div>
          <button id="noUpdateDialogClose" class="update-dialog-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="update-dialog-content">
          <p class="update-dialog-message">
            Good news! You're already using the latest version of Rebrands Panels:
          </p>
          <div class="version-display">
            <span class="version" id="currentVersionDisplay">v0.0.0</span>
          </div>
          
          <div class="update-dialog-info">
            <div class="update-dialog-message-success">
              Your software is up to date. No action is required.
            </div>
          </div>

          <!-- Action buttons - now right-aligned via CSS -->
          <div class="update-dialog-actions">
            <button id="noUpdateDialogOk" class="update-dialog-button update-dialog-button-primary">
              OK
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

  // Set up event listeners for closing the dialog
  setupNoUpdateDialogListeners();

  return document.getElementById("noUpdateDialogBackdrop");
}

/**
 * Set up event listeners for the "No Updates Available" dialog
 */
function setupNoUpdateDialogListeners() {
  const backdrop = document.getElementById("noUpdateDialogBackdrop");
  const closeButton = document.getElementById("noUpdateDialogClose");
  const okButton = document.getElementById("noUpdateDialogOk");

  // Function to hide the dialog
  const hideDialog = () => {
    if (backdrop) {
      backdrop.classList.remove("visible");
      setTimeout(() => {
        backdrop.style.display = "none";
      }, 300);
    }
  };

  // Close button
  if (closeButton) {
    closeButton.addEventListener("click", hideDialog);
  }

  // OK button
  if (okButton) {
    okButton.addEventListener("click", hideDialog);
  }

  // Click outside to close
  if (backdrop) {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        hideDialog();
      }
    });
  }

  // ESC key to close
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const backdrop = document.getElementById("noUpdateDialogBackdrop");
      if (backdrop && backdrop.style.display === "flex") {
        hideDialog();
      }
    }
  });
}

export default {
  showNoUpdateDialog,
};
