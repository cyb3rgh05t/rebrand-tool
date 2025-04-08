/**
 * Changelog dialog module for StreamNet Panels
 * Displays formatted CHANGELOG.md content in a modal dialog
 */
import { log } from "../utils/logging.js";

// Track if dialog has been created
let dialogCreated = false;

/**
 * Initialize the changelog dialog
 */
export function initChangelogDialog() {
  // Only create dialog once
  if (dialogCreated) return;

  log.debug("Initializing changelog dialog");

  // Create the dialog element
  createDialogElement();

  // Set up event listeners
  setupEventListeners();

  dialogCreated = true;
}

/**
 * Create the changelog dialog DOM element
 */
function createDialogElement() {
  // Create dialog container
  const dialogHTML = `
    <div id="changelogDialog" class="modal changelog-modal">
      <div class="modal-content changelog-modal-content">
        <div class="modal-header">
          <h3>Changelog</h3>
          <span id="closeChangelogBtn" class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <div id="changelogContent" class="changelog-content">
            <div class="loading-indicator">Loading changelog...</div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="closeChangelogDialogBtn" class="action-button">Close</button>
        </div>
      </div>
    </div>
  `;

  // Create container element
  const container = document.createElement("div");
  container.innerHTML = dialogHTML.trim();

  // Append to body
  document.body.appendChild(container.firstChild);

  log.debug("Changelog dialog element created");
}

/**
 * Set up event listeners for the dialog
 */
function setupEventListeners() {
  // Close button handlers
  const closeBtn = document.getElementById("closeChangelogBtn");
  const closeDialogBtn = document.getElementById("closeChangelogDialogBtn");

  if (closeBtn) {
    closeBtn.addEventListener("click", hideChangelogDialog);
  }

  if (closeDialogBtn) {
    closeDialogBtn.addEventListener("click", hideChangelogDialog);
  }

  // Close on escape key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const dialog = document.getElementById("changelogDialog");
      if (dialog && dialog.style.display === "block") {
        hideChangelogDialog();
      }
    }
  });

  // Close when clicking outside of content
  const dialog = document.getElementById("changelogDialog");
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        hideChangelogDialog();
      }
    });
  }

  log.debug("Changelog dialog event listeners initialized");
}

/**
 * Show the changelog dialog and load content
 */
export function showChangelogDialog() {
  // Initialize dialog if not already created
  if (!dialogCreated) {
    initChangelogDialog();
  }

  const dialog = document.getElementById("changelogDialog");
  if (!dialog) return;

  log.info("Showing changelog dialog");

  // Show the dialog
  dialog.style.display = "block";

  // Load changelog content
  loadChangelogContent();
}

/**
 * Hide the changelog dialog
 */
export function hideChangelogDialog() {
  const dialog = document.getElementById("changelogDialog");
  if (!dialog) return;

  log.debug("Hiding changelog dialog");
  dialog.style.display = "none";
}

/**
 * Load and format the changelog content
 */
async function loadChangelogContent() {
  const contentElement = document.getElementById("changelogContent");
  if (!contentElement) return;

  try {
    log.debug("Loading changelog content");

    // Show loading state
    contentElement.innerHTML =
      '<div class="loading-indicator">Loading changelog...</div>';

    // Option 1: If we can load via API (preferred approach)
    if (window.streamNetAPI && window.streamNetAPI.getChangelog) {
      const changelogText = await window.streamNetAPI.getChangelog();
      displayFormattedChangelog(contentElement, changelogText);
    }
    // Option 2: Use hardcoded changelog content (fallback)
    else {
      // Fetch the changelog from a local file
      try {
        const response = await fetch("./CHANGELOG.md");
        if (response.ok) {
          const changelogText = await response.text();
          displayFormattedChangelog(contentElement, changelogText);
        } else {
          throw new Error(`Failed to load changelog: ${response.status}`);
        }
      } catch (fetchError) {
        log.warn(`Error fetching changelog file: ${fetchError.message}`);
        // Use hardcoded changelog as final fallback
        displayHardcodedChangelog(contentElement);
      }
    }
  } catch (error) {
    log.error(`Error loading changelog: ${error.message}`);
    contentElement.innerHTML = `<div class="error-message">Error loading changelog: ${error.message}</div>`;
  }
}

/**
 * Display formatted changelog content
 * @param {HTMLElement} container - The container element
 * @param {string} markdownText - The raw markdown text
 */
function displayFormattedChangelog(container, markdownText) {
  log.debug("Formatting changelog content");

  // Simple markdown parsing for the changelog
  let html = "";

  // Split into lines
  const lines = markdownText.split("\n");

  // Track if we're in a list
  let inList = false;

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip the first line if it's "# Full Changelog" or similar
    if (i === 0 && line.startsWith("# Full Changelog")) {
      continue;
    }

    // Headers
    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }

      // Extract version and date
      const versionMatch = line.match(/## \[(.*?)\](.*)/);
      if (versionMatch) {
        const version = versionMatch[1];
        const datePart = versionMatch[2].trim();

        html += `<div class="changelog-version">
          <h3>Version ${version}</h3>
          <span class="changelog-date">${datePart}</span>
        </div>`;
      } else {
        html += `<h3>${line.substring(3)}</h3>`;
      }
    }
    // Subheaders
    else if (line.startsWith("### ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h4 class="changelog-section">${line.substring(4)}</h4>`;
    }
    // List items
    else if (line.trim().startsWith("- ")) {
      if (!inList) {
        html += '<ul class="changelog-list">';
        inList = true;
      }
      html += `<li>${line.substring(line.indexOf("-") + 1).trim()}</li>`;
    }
    // Regular text
    else if (line.trim() !== "") {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${line}</p>`;
    }
    // Empty line
    else if (line.trim() === "" && inList) {
      html += "</ul>";
      inList = false;
    }
  }

  // Close any open list
  if (inList) {
    html += "</ul>";
  }

  // Add to container
  container.innerHTML = `<div class="changelog-wrapper">${html}</div>`;

  // Scroll to top
  container.scrollTop = 0;
}

/**
 * Display hardcoded changelog as fallback
 * @param {HTMLElement} container - The container element
 */
function displayHardcodedChangelog(container) {
  log.debug("Using hardcoded changelog as fallback");

  // Get the latest few versions from our hardcoded content
  const changelogContent = `
    <div class="changelog-wrapper">
      <div class="changelog-version">
        <h3>Version 2.5.3</h3>
        <span class="changelog-date">2025-04-07</span>
      </div>
      
      <h4 class="changelog-section">Added</h4>
      <ul class="changelog-list">
        <li>IBO Solutions Module 2.5.2</li>
        <li>Enhanced logging system that unifies main and renderer process logs</li>
        <li>Advanced log filtering with source, level, category, and text search capabilities</li>
        <li>Auto-refresh feature for main process logs</li>
        <li>Improved log structure with rich metadata</li>
        <li>Module version display throughout application UI</li>
        <li>DNS records preview in domain creation form</li>
        <li>Support for Plex WebView module installation</li>
      </ul>
      
      <h4 class="changelog-section">Changed</h4>
      <ul class="changelog-list">
        <li>Improved domain analysis with better categorization of installed modules</li>
        <li>Enhanced debug console with more intuitive UI and additional functionality</li>
        <li>Optimized file transfer process with better error handling</li>
        <li>Refined configuration management system</li>
        <li>Updated transfer dialog with more detailed status information</li>
      </ul>
      
      <h4 class="changelog-section">Fixed</h4>
      <ul class="changelog-list">
        <li>Path handling issues in file transfers for special modules</li>
        <li>Connection status synchronization between settings and main UI</li>
        <li>DNS record creation error handling</li>
        <li>Module selection inconsistencies</li>
        <li>Cache issues with domain analysis</li>
        <li>Configuration persistence across app restarts</li>
      </ul>
      
      <div class="changelog-version">
        <h3>Version 2.5.2</h3>
        <span class="changelog-date">2025-04-05</span>
      </div>
      
      <h4 class="changelog-section">Added</h4>
      <ul class="changelog-list">
        <li>Cockpit Base Panel 2.5.1</li>
        <li>XCIPTV Module 2.5.1</li>
        <li>Smarters Pro Module 2.5.1</li>
        <li>IBO Solutions Module 2.5.1</li>
        <li>ORVPN Module 2.5.1</li>
        <li>TiviMate Module 2.5.1</li>
        <li>Sparkle TV Module 2.5.1</li>
        <li>Neutro Player Module 2.5.1</li>
        <li>Module version display with subtitles to all modules and panels</li>
        <li>Enhanced CSS for version display that maintains text ellipsis behavior</li>
        <li>Dynamic version updates through MutationObserver</li>
      </ul>
    </div>
  `;

  container.innerHTML = changelogContent;
}

export default {
  initChangelogDialog,
  showChangelogDialog,
  hideChangelogDialog,
};
