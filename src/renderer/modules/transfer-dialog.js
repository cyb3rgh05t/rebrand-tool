/**
 * Transfer dialog module for StreamNet Panels
 * Handles the UI for showing transfer progress and logs
 */
import { log } from "../utils/logging.js";

// Keep track of whether a transfer is in progress and if it was cancelled
let transferInProgress = false;
let transferCancelled = false;
let autoScroll = true;

/**
 * Initialize the transfer dialog
 */
export function initTransferDialog() {
  const transferModal = document.getElementById("transferModal");
  const closeTransferModalBtn = document.getElementById(
    "closeTransferModalBtn"
  );
  const doneTransferBtn = document.getElementById("doneTransferBtn");
  const cancelTransferBtn = document.getElementById("cancelTransferBtn");

  if (!transferModal) return;

  // Set up event handlers
  if (closeTransferModalBtn) {
    closeTransferModalBtn.addEventListener("click", () => {
      if (!transferInProgress) {
        closeTransferDialog();
      }
    });
  }

  if (doneTransferBtn) {
    doneTransferBtn.addEventListener("click", closeTransferDialog);
  }

  if (cancelTransferBtn) {
    cancelTransferBtn.addEventListener("click", () => {
      transferCancelled = true;
      addTransferLog("Transfer cancelled by user", "warning");
      // Keep the dialog open but update UI to show cancelled state
      if (cancelTransferBtn) cancelTransferBtn.disabled = true;

      // Update UI to show cancelled state
      updateTransferStatus("Cancelling transfer...", "warning");
    });
  }

  // Setup autoscroll toggle
  const autoScrollBtn = transferModal.querySelector(".autoscroll");
  if (autoScrollBtn) {
    autoScrollBtn.addEventListener("click", () => {
      autoScroll = !autoScroll;
      autoScrollBtn.textContent = `Auto-scroll: ${autoScroll ? "ON" : "OFF"}`;
    });
  }

  // Close on ESC key
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !transferInProgress &&
      transferModal.style.display === "block"
    ) {
      closeTransferDialog();
    }
  });

  // Close if clicked outside content
  transferModal.addEventListener("click", (event) => {
    if (event.target === transferModal && !transferInProgress) {
      closeTransferDialog();
    }
  });

  log.debug("Transfer dialog initialized");
}

/**
 * Show the transfer dialog
 * @param {string} title Optional custom title for the dialog
 */
export function showTransferDialog(title = "File Transfer Progress") {
  const transferModal = document.getElementById("transferModal");
  const modalTitle = transferModal?.querySelector(".modal-header h3");
  const transferStatusText = document.getElementById("transferStatusText");
  const transferProgressBar = document.getElementById("transferProgressBar");
  const transferPercentage = document.getElementById("transferPercentage");
  const transferLog = document.getElementById("transferLog");
  const transferSummary = document.getElementById("transferSummary");
  const doneTransferBtn = document.getElementById("doneTransferBtn");
  const cancelTransferBtn = document.getElementById("cancelTransferBtn");

  if (!transferModal) return;

  // Reset the dialog state
  transferInProgress = true;
  transferCancelled = false;
  autoScroll = true;

  // Update the title if provided
  if (modalTitle) {
    modalTitle.textContent = title;
  }

  // Reset progress indicators
  if (transferStatusText) {
    transferStatusText.textContent = "Preparing transfer...";
    transferStatusText.className = "status-text status-info";
  }
  if (transferProgressBar) {
    transferProgressBar.style.width = "0%";
    transferProgressBar.className = "progress-bar progress-info";
  }
  if (transferPercentage) transferPercentage.textContent = "0%";

  // Clear the log
  if (transferLog) {
    const logContent = transferLog.querySelector(".log-content");
    if (logContent) logContent.innerHTML = "";

    // Reset autoscroll button
    const autoScrollBtn = transferLog.querySelector(".autoscroll");
    if (autoScrollBtn) {
      autoScrollBtn.textContent = "Auto-scroll: ON";
    }
  }

  // Hide the summary section
  if (transferSummary) transferSummary.style.display = "none";

  // Show cancel button, hide done button
  if (doneTransferBtn) doneTransferBtn.style.display = "none";
  if (cancelTransferBtn) {
    cancelTransferBtn.style.display = "inline-block";
    cancelTransferBtn.disabled = false;
  }

  // Show the modal
  transferModal.style.display = "block";

  log.debug("Transfer dialog shown");
}

/**
 * Close the transfer dialog
 */
export function closeTransferDialog() {
  const transferModal = document.getElementById("transferModal");

  if (transferModal) {
    transferModal.style.display = "none";
    transferInProgress = false;
    log.debug("Transfer dialog closed");
  }
}

/**
 * Update the transfer progress
 * @param {number} percent Percentage complete (0-100)
 * @param {string} status Status message
 * @param {string} type Status type (info, success, warning, error)
 */
export function updateTransferProgress(percent, status, type = "info") {
  const transferStatusText = document.getElementById("transferStatusText");
  const transferProgressBar = document.getElementById("transferProgressBar");
  const transferPercentage = document.getElementById("transferPercentage");

  // Update progress bar
  if (transferProgressBar) {
    transferProgressBar.style.width = `${percent}%`;

    // Clear existing classes and add the new type
    transferProgressBar.className = `progress-bar progress-${type}`;
  }

  // Update percentage text
  if (transferPercentage) {
    transferPercentage.textContent = `${Math.round(percent)}%`;
  }

  // Update status text
  if (transferStatusText) {
    transferStatusText.textContent = status;
    transferStatusText.className = `status-text status-${type}`;
  }
}

/**
 * Update just the transfer status text
 * @param {string} status Status message
 * @param {string} type Status type (info, success, warning, error)
 */
export function updateTransferStatus(status, type = "info") {
  const transferStatusText = document.getElementById("transferStatusText");

  if (transferStatusText) {
    transferStatusText.textContent = status;
    transferStatusText.className = `status-text status-${type}`;
  }
}

/**
 * Add a log entry to the transfer log
 * @param {string} message Log message
 * @param {string} level Log level (info, success, warning, error, debug)
 * @param {string} type Message type (text, command, output)
 */
export function addTransferLog(message, level = "info", type = "text") {
  const transferLog = document.getElementById("transferLog");

  if (!transferLog) return;

  const logContent = transferLog.querySelector(".log-content");
  if (!logContent) return;

  // Create log message element
  const logMessage = document.createElement("div");
  logMessage.className = `log-message log-${type}`;

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const timestampSpan = document.createElement("span");
  timestampSpan.className = "log-timestamp";
  timestampSpan.textContent = timestamp;
  logMessage.appendChild(timestampSpan);

  // Add level badge
  const levelSpan = document.createElement("span");
  levelSpan.className = `log-level log-level-${level}`;
  levelSpan.textContent = level.toUpperCase();
  logMessage.appendChild(levelSpan);

  // Add message text
  const textSpan = document.createElement("span");
  textSpan.className = `log-text`;
  textSpan.textContent = message;
  logMessage.appendChild(textSpan);

  // Add to log content
  logContent.appendChild(logMessage);

  // Auto-scroll to bottom if enabled
  if (autoScroll) {
    transferLog.scrollTop = transferLog.scrollHeight;
  }

  // Also log to console for debugging (use the correct level method)
  if (level === "success") {
    log.info(message); // Success maps to info in the logger
  } else if (log[level]) {
    log[level](message);
  } else {
    log.info(message);
  }
}

/**
 * Show a command being executed in the log
 * @param {string} command The command being run
 */
export function addCommandLog(command) {
  addTransferLog(`$ ${command}`, "debug", "command");
}

/**
 * Show command output in the log
 * @param {string} output Command output text
 */
export function addOutputLog(output) {
  addTransferLog(output, "info", "output");
}

/**
 * Complete the transfer process and update the dialog
 * @param {Object} result Transfer result object
 */
export function completeTransfer(result) {
  const transferSummary = document.getElementById("transferSummary");
  const transferSuccessCount = document.getElementById("transferSuccessCount");
  const transferErrorsList = document.getElementById("transferErrorsList");
  const doneTransferBtn = document.getElementById("doneTransferBtn");
  const cancelTransferBtn = document.getElementById("cancelTransferBtn");

  transferInProgress = false;

  // Show the summary section
  if (transferSummary) {
    transferSummary.style.display = "block";
  }

  // Update success count
  if (
    transferSuccessCount &&
    result.successCount !== undefined &&
    result.totalCount !== undefined
  ) {
    transferSuccessCount.textContent = `${result.successCount} of ${result.totalCount} items transferred successfully`;

    // Add appropriate class based on success rate
    if (result.successCount === result.totalCount) {
      transferSuccessCount.className = "success-count success";
    } else if (result.successCount > 0) {
      transferSuccessCount.className = "success-count partial";
    } else {
      transferSuccessCount.className = "success-count failure";
    }
  }

  // Display any errors
  if (transferErrorsList) {
    transferErrorsList.innerHTML = "";

    if (result.error) {
      // Single error message
      const errorItem = document.createElement("div");
      errorItem.className = "error-item";
      errorItem.textContent = result.error;
      transferErrorsList.appendChild(errorItem);
    } else if (result.results) {
      // Multiple item results with potential errors
      const errors = result.results.filter((r) => r.status === "error");

      if (errors.length > 0) {
        errors.forEach((error) => {
          const errorItem = document.createElement("div");
          errorItem.className = "error-item";
          errorItem.textContent = `${error.name || "Unknown"}: ${
            error.error || "Unknown error"
          }`;
          transferErrorsList.appendChild(errorItem);
        });
      }
    }
  }

  // Update progress to 100% for success or appropriate value for partial success
  if (result.success) {
    updateTransferProgress(100, "Transfer completed successfully", "success");
  } else if (result.successCount && result.totalCount) {
    const percent = Math.round((result.successCount / result.totalCount) * 100);
    updateTransferProgress(
      percent,
      "Transfer completed with some errors",
      "warning"
    );
  } else {
    updateTransferProgress(0, "Transfer failed", "error");
  }

  // Show done button, hide cancel button
  if (doneTransferBtn) doneTransferBtn.style.display = "inline-block";
  if (cancelTransferBtn) cancelTransferBtn.style.display = "none";

  // Add final log message
  if (result.success) {
    addTransferLog("Transfer completed successfully", "success");
  } else if (result.successCount > 0) {
    addTransferLog(
      `Transfer completed with ${
        result.totalCount - result.successCount
      } errors`,
      "warning"
    );
  } else {
    addTransferLog("Transfer failed", "error");
  }

  log.info("Transfer process completed");
}

/**
 * Check if a transfer is currently in progress
 * @returns {boolean} Whether a transfer is in progress
 */
export function isTransferInProgress() {
  return transferInProgress;
}

/**
 * Check if the transfer was cancelled
 * @returns {boolean} Whether the transfer was cancelled
 */
export function isTransferCancelled() {
  return transferCancelled;
}

export default {
  initTransferDialog,
  showTransferDialog,
  closeTransferDialog,
  updateTransferProgress,
  updateTransferStatus,
  addTransferLog,
  addCommandLog,
  addOutputLog,
  completeTransfer,
  isTransferInProgress,
  isTransferCancelled,
};
