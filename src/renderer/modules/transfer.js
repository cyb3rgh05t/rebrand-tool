/**
 * File transfer operations for StreamNet Panels
 */
import { log } from "../utils/logging.js";
import { showStatus } from "./ui-helpers.js";
import { getSelectedItems, clearAllSelections } from "./module-selection.js";
import { createDnsRecords } from "./dns-handling.js";

/**
 * Handle file/folder transfer and/or DNS creation
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

  // Show appropriate status message
  if (hasDnsOnly) {
    showStatus("info", `Creating DNS records for ${domain}...`);
    log.info(`Creating DNS records for ${domain}`);
  } else {
    showStatus("info", `Starting transfer to ${domain}/public_html...`);
    log.info(
      `Starting transfer of ${selectedItems.size} items to ${domain}/public_html`
    );
  }

  try {
    // If we have items to transfer, do that first
    let transferSuccess = true;
    if (selectedItems.size > 0) {
      // Convert Map to array for API
      const itemsArray = Array.from(selectedItems.values());

      // Call the API to transfer files
      if (!window.streamNetAPI || !window.streamNetAPI.transferItems) {
        throw new Error("Transfer API not available");
      }

      const result = await window.streamNetAPI.transferItems(
        itemsArray,
        `${domain}/public_html`
      );

      transferSuccess = result.success;

      if (result.success) {
        log.info(
          `Transfer complete: ${result.successCount}/${result.totalCount} items transferred`
        );
      } else {
        log.error(`Transfer failed: ${result.error}`);
        if (!isDnsEnabled) {
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
      if (transferButton) {
        transferButton.textContent = "Creating DNS...";
      }

      showStatus("info", "Creating DNS records...");
      try {
        const dnsResult = await createDnsRecords();

        if (dnsResult.success) {
          dnsSuccess = true;
          log.info("DNS records created successfully");
          showStatus("success", `DNS records created successfully`);
        } else {
          log.error(`DNS creation failed: ${dnsResult.error}`);
          showStatus(
            "warning",
            `DNS creation failed: ${dnsResult.error || "Unknown error"}`
          );
        }
      } catch (dnsError) {
        log.error(`Error during DNS creation: ${dnsError.message}`);
        showStatus(
          "warning",
          `DNS creation failed: ${dnsError.message || "Unknown error"}`
        );
      }
    }

    // Show final success/status message
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
  } catch (error) {
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

export default {
  handleTransfer,
};
