/**
 * File transfer operations for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import { showStatus } from "./ui-helpers.js";
import { getSelectedItems, clearAllSelections } from "./module-selection.js";
import { createDnsRecords } from "./dns-handling.js";
import * as transferDialog from "./transfer-dialog.js";

/**
 * Enhanced handleTransfer function with progress dialog
 */
export async function handleTransfer() {
  const domainSelect = document.getElementById("domainSelect");
  const transferButton = document.getElementById("transferButton");
  const dnsToggle = document.getElementById("dnsToggle");
  const selectedItems = getSelectedItems();

  if (!domainSelect) return;

  const domain = domainSelect.value;
  const isDnsEnabled = dnsToggle && dnsToggle.checked;
  const hasDnsOnly = isDnsEnabled && selectedItems.size === 0;

  if (!domain) {
    log.warn("Transfer attempted without domain");
    return;
  }

  if (!isDnsEnabled && selectedItems.size === 0) {
    log.warn("Transfer attempted without DNS or selected items");
    return;
  }

  // Disable button during operation
  if (transferButton) {
    transferButton.disabled = true;
    transferButton.textContent = hasDnsOnly
      ? "Creating DNS..."
      : "Transferring...";
  }

  // Show the transfer dialog - different title based on operation
  const dialogTitle = hasDnsOnly
    ? "DNS Record Creation"
    : isDnsEnabled
    ? "File Transfer & DNS Setup"
    : "File Transfer";

  transferDialog.showTransferDialog(dialogTitle);

  // Show appropriate initial status
  if (hasDnsOnly) {
    transferDialog.updateTransferStatus(
      `Creating DNS records for ${domain}...`
    );
    transferDialog.addTransferLog(
      `Starting DNS creation for ${domain}`,
      "info"
    );
  } else {
    transferDialog.updateTransferStatus(
      `Preparing transfer to ${domain}/public_html...`
    );
    transferDialog.addTransferLog(
      `Starting transfer of ${selectedItems.size} items to ${domain}/public_html`,
      "info"
    );
  }

  try {
    // If we have items to transfer, do that first
    let transferSuccess = true;
    if (selectedItems.size > 0) {
      // Validate items before proceeding
      const validItems = new Map();
      let invalidCount = 0;

      // Check each item for valid path
      transferDialog.addTransferLog("Validating selected items...", "info");
      for (const [key, item] of selectedItems.entries()) {
        if (!item.path) {
          transferDialog.addTransferLog(
            `Item ${key} (${item.name}) has no path defined`,
            "error"
          );
          invalidCount++;
        } else {
          validItems.set(key, item);
          transferDialog.addTransferLog(
            `Validated item: ${item.name}`,
            "debug"
          );
        }
      }

      if (invalidCount > 0) {
        transferDialog.addTransferLog(
          `Found ${invalidCount} items with missing paths`,
          "error"
        );
        transferDialog.updateTransferStatus(
          `Cannot transfer: ${invalidCount} items have missing paths`,
          "error"
        );
        transferDialog.completeTransfer({
          success: false,
          error: `${invalidCount} items have missing paths`,
          successCount: 0,
          totalCount: selectedItems.size,
        });
        return;
      }

      // Convert Map to array for API
      const itemsArray = Array.from(validItems.values());
      transferDialog.updateTransferProgress(
        10,
        `Preparing to transfer ${itemsArray.length} items...`
      );

      // Call the API to transfer files
      if (!window.streamNetAPI || !window.streamNetAPI.transferItems) {
        throw new Error("Transfer API not available");
      }

      transferDialog.addTransferLog(
        `Starting transfer to ${domain}/public_html`,
        "info"
      );
      transferDialog.updateTransferProgress(20, "Transfer in progress...");

      // We can't easily get real-time progress updates from the backend, so we'll
      // simulate progress updates while waiting for the transfer to complete
      let progressInterval = setInterval(() => {
        // Don't increase past 90% since we don't know when it will finish
        const currentWidth =
          document.getElementById("transferProgressBar")?.style.width || "20%";
        const currentPercent = parseInt(currentWidth, 10);

        if (currentPercent < 90) {
          const newPercent = Math.min(currentPercent + 5, 90);
          transferDialog.updateTransferProgress(
            newPercent,
            "Transfer in progress..."
          );
        }

        // Check if the transfer was cancelled
        if (transferDialog.isTransferCancelled()) {
          clearInterval(progressInterval);
        }
      }, 1000);

      // Perform the actual transfer
      const result = await window.streamNetAPI.transferItems(
        itemsArray,
        `${domain}/public_html`
      );

      // Clear progress update interval
      clearInterval(progressInterval);

      transferSuccess = result.success;

      if (result.success) {
        transferDialog.updateTransferProgress(
          95,
          `Transfer complete: ${result.successCount}/${result.totalCount} items transferred`,
          result.successCount === result.totalCount ? "success" : "warning"
        );

        // Log each result from the operation
        if (result.results) {
          result.results.forEach((item) => {
            if (item.status === "success") {
              transferDialog.addTransferLog(
                `Successfully transferred: ${item.name}`,
                "success"
              );
            } else {
              transferDialog.addTransferLog(
                `Failed to transfer: ${item.name} - ${item.error}`,
                "error"
              );
            }
          });
        }
      } else {
        transferDialog.updateTransferProgress(
          30,
          `Transfer failed: ${result.error}`,
          "error"
        );
        transferDialog.addTransferLog(
          `Transfer failed: ${result.error}`,
          "error"
        );

        if (!isDnsEnabled) {
          transferDialog.completeTransfer({
            success: false,
            error: result.error || "Unknown error",
            successCount: 0,
            totalCount: itemsArray.length,
          });

          showStatus(
            "error",
            `Transfer failed: ${result.error || "Unknown error"}`
          );
          return;
        }
      }
    }

    // Create DNS records if enabled
    let dnsSuccess = false;
    if (isDnsEnabled) {
      transferDialog.updateTransferStatus("Creating DNS records...");
      transferDialog.addTransferLog("Starting DNS record creation", "info");

      try {
        transferDialog.updateTransferProgress(
          hasDnsOnly ? 50 : 96,
          "Creating DNS records..."
        );
        const dnsResult = await createDnsRecords();

        if (dnsResult.success) {
          dnsSuccess = true;
          transferDialog.addTransferLog(
            "DNS records created successfully",
            "success"
          );

          // Log individual records if available
          if (dnsResult.results) {
            dnsResult.results.forEach((record) => {
              if (record.status === "created") {
                transferDialog.addTransferLog(
                  `Created DNS record: ${record.name} (${record.type})`,
                  "success"
                );
              } else {
                transferDialog.addTransferLog(
                  `Failed to create DNS record: ${record.name} - ${record.error}`,
                  "error"
                );
              }
            });
          }

          transferDialog.updateTransferProgress(
            100,
            "DNS records created successfully",
            "success"
          );
        } else {
          transferDialog.addTransferLog(
            `DNS creation failed: ${dnsResult.error}`,
            "error"
          );
          transferDialog.updateTransferProgress(
            hasDnsOnly ? 20 : 97,
            `DNS creation failed: ${dnsResult.error}`,
            "error"
          );
        }
      } catch (dnsError) {
        transferDialog.addTransferLog(
          `Error during DNS creation: ${dnsError.message}`,
          "error"
        );
        transferDialog.updateTransferProgress(
          hasDnsOnly ? 20 : 97,
          `DNS creation error: ${dnsError.message}`,
          "error"
        );
      }
    }

    // Complete the transfer process and update dialog
    const finalResult = {
      success: hasDnsOnly
        ? dnsSuccess
        : transferSuccess && (!isDnsEnabled || dnsSuccess),
      successCount:
        selectedItems.size > 0
          ? transferSuccess
            ? selectedItems.size
            : 0
          : dnsSuccess
          ? 1
          : 0,
      totalCount: selectedItems.size > 0 ? selectedItems.size : 1,
      error: null,
    };

    transferDialog.completeTransfer(finalResult);

    // Show final status message in the main UI
    if (hasDnsOnly) {
      // DNS only mode
      if (dnsSuccess) {
        showStatus("success", `DNS records created successfully for ${domain}`);
      } else {
        showStatus("error", `Failed to create DNS records for ${domain}`);
      }
    } else {
      // File transfer (with or without DNS)
      if (transferSuccess) {
        if (isDnsEnabled) {
          if (dnsSuccess) {
            showStatus(
              "success",
              `Transfer complete and DNS records created successfully. All selections have been cleared.`
            );
          } else {
            showStatus(
              "warning",
              `Transfer complete but DNS creation failed. All selections have been cleared.`
            );
          }
        } else {
          showStatus(
            "success",
            `Transfer complete. All selections have been cleared.`
          );
        }

        // Clear all selections after successful transfer
        clearAllSelections();
      } else {
        showStatus("error", `File transfer failed.`);
      }
    }

    // Reset all states after a successful transfer or DNS creation
    if (transferSuccess || dnsSuccess) {
      // Reset domain selection and analysis
      resetStatesAfterTransfer();
    }
  } catch (error) {
    transferDialog.addTransferLog(
      `Error during operation: ${error.message}`,
      "error"
    );
    transferDialog.updateTransferProgress(
      0,
      `Operation failed: ${error.message}`,
      "error"
    );
    transferDialog.completeTransfer({
      success: false,
      error: error.message,
      successCount: 0,
      totalCount: selectedItems.size || 1,
    });

    log.error(`Error during operation: ${error.message}`);
    showStatus("error", `Operation failed: ${error.message}`);
  } finally {
    if (transferButton) {
      transferButton.disabled = false;
      transferButton.textContent = hasDnsOnly
        ? "Create DNS Records Only"
        : "Transfer Files";
    }
    updateTransferButton();
  }
}

/**
 * Reset various states after a successful transfer
 */
function resetStatesAfterTransfer() {
  try {
    // 1. Reset domain selection
    const domainSelect = document.getElementById("domainSelect");
    if (domainSelect) {
      domainSelect.selectedIndex = 0; // Select first option (usually "Select a domain...")
    }

    // 2. Clear domain analysis content
    const domainAnalysisContent = document.getElementById(
      "domainAnalysisContent"
    );
    if (domainAnalysisContent) {
      domainAnalysisContent.innerHTML =
        '<div class="empty-section-message">No domain selected</div>';
    }

    // 3. Reset DNS settings
    const dnsToggle = document.getElementById("dnsToggle");
    const dnsForm = document.getElementById("dnsForm");
    const subdomainInput = document.getElementById("subdomainInput");

    if (dnsToggle) {
      dnsToggle.checked = false;
    }

    if (dnsForm) {
      dnsForm.style.display = "none";
    }

    if (subdomainInput) {
      subdomainInput.value = "";
    }

    // 4. Update DNS preview
    const dnsPreview = document.getElementById("dnsPreview");
    if (dnsPreview) {
      dnsPreview.textContent =
        window.appState?.rootDomain || "subdomain.example.com";
    }

    // 5. Reset DNS records preview if exists
    const dnsRecordsPreviewContainer = document.getElementById(
      "dnsRecordsPreviewContainer"
    );
    if (dnsRecordsPreviewContainer) {
      dnsRecordsPreviewContainer.innerHTML = "";
    }

    log.debug("All states reset after successful transfer");
  } catch (error) {
    log.error(`Error resetting states: ${error.message}`);
  }
}

/**
 * Re-export updateTransferButton to avoid circular dependencies
 */
function updateTransferButton() {
  // Import dynamically to avoid circular dependency
  import("./ui-helpers.js").then((module) => {
    module.updateTransferButton();
  });
}

export default {
  handleTransfer,
};
