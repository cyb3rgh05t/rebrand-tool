/**
 * Download handler for StreamNet Panels
 * Manages direct file downloads with progress reporting
 */
const { BrowserWindow, dialog, app } = require("electron");
const { createLogger } = require("./utils/logger");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Create a download-specific logger
const logger = createLogger("download");

// Keep track of active downloads to allow cancellation
const activeDownloads = new Map();

/**
 * Download a file and report progress
 * @param {BrowserWindow} window The window to report progress to
 * @param {string} url URL to download from
 * @param {string} filename Optional filename to save as
 * @param {string|null} userSelectedPath Path already selected by user (for redirects)
 * @returns {Promise<Object>} Result of the download
 */
async function downloadFile(
  window,
  url,
  filename = null,
  userSelectedPath = null
) {
  // Generate a unique ID for this download
  const downloadId = Date.now().toString();

  let currentRequest = null;
  let currentFileStream = null;

  return new Promise(async (resolve, reject) => {
    try {
      logger.info(`Starting download from ${url}`);

      // Parse the URL to determine protocol
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === "https:";

      // Determine the filename if not provided
      if (!filename) {
        filename = path.basename(parsedUrl.pathname);
        // If no filename in URL or it's just a slash, use a generic name
        if (!filename || filename === "/" || filename === "") {
          filename = `rebrand-tool-update.exe`;
        }
      }

      logger.debug(`Determined filename: ${filename}`);

      // Resolve the file path (either from user selection or by showing save dialog)
      let filePath = userSelectedPath;

      if (!filePath) {
        // Show a save dialog to ask where to save the file
        const dialogResult = await dialog.showSaveDialog({
          title: "Save Update File",
          defaultPath: path.join(app.getPath("downloads"), filename),
          buttonLabel: "Save",
          properties: ["createDirectory", "showOverwriteConfirmation"],
        });

        if (dialogResult.canceled || !dialogResult.filePath) {
          logger.info("Download cancelled by user");
          resolve({ success: false, cancelled: true });
          return;
        }

        filePath = dialogResult.filePath;
      }

      // Create the file stream
      currentFileStream = fs.createWriteStream(filePath);

      // Choose the appropriate http/https module
      const httpModule = isHttps ? https : http;

      // Set up cancellation handler
      const cancelHandler = () => {
        if (currentRequest) {
          logger.info(`Cancelling download: ${downloadId}`);
          currentRequest.abort();
          if (currentFileStream) {
            currentFileStream.close();
            // Delete the incomplete file
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(`Error removing incomplete file: ${err.message}`);
            }
          }
          resolve({ success: false, cancelled: true });
        }
      };

      // Store the cancel handler
      activeDownloads.set(downloadId, cancelHandler);

      // Send download ID to renderer
      window.webContents.send("download-started", {
        downloadId,
        filePath,
        url,
      });

      // Make the request
      currentRequest = httpModule.get(url, (response) => {
        // Handle redirects - using the same file path we've already selected
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          logger.debug(`Following redirect to ${response.headers.location}`);

          // Close current file stream without deleting the file
          if (currentFileStream) {
            currentFileStream.close();
          }

          // Follow the redirect with the same file path
          downloadFile(window, response.headers.location, filename, filePath)
            .then(resolve)
            .catch(reject);
          return;
        }

        // Check if the request was successful
        if (response.statusCode !== 200) {
          if (currentFileStream) {
            currentFileStream.close();
          }

          // Delete the incomplete file
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            logger.error(`Error removing incomplete file: ${err.message}`);
          }

          reject(
            new Error(
              `Server responded with status code ${response.statusCode}`
            )
          );
          return;
        }

        // Get the total file size for progress calculation
        const totalSize = parseInt(response.headers["content-length"], 10) || 0;
        let downloadedSize = 0;
        let lastProgressUpdate = 0;

        // Send the initial progress update
        window.webContents.send("download-progress", {
          downloadId,
          progress: 0,
          total: totalSize,
          downloaded: 0,
          filePath,
        });

        // Handle the data streaming
        response.on("data", (chunk) => {
          downloadedSize += chunk.length;

          // Only update progress every 100ms to avoid overwhelming the IPC
          const now = Date.now();
          if (now - lastProgressUpdate > 100) {
            const progress = totalSize ? downloadedSize / totalSize : 0;
            window.webContents.send("download-progress", {
              downloadId,
              progress: progress,
              total: totalSize,
              downloaded: downloadedSize,
              filePath,
            });
            lastProgressUpdate = now;
          }
        });

        // Pipe the response to the file
        response.pipe(currentFileStream);

        // Handle completion
        currentFileStream.on("finish", () => {
          currentFileStream.close();
          currentFileStream = null;

          // Remove from active downloads
          activeDownloads.delete(downloadId);

          logger.info(`Download completed: ${filePath}`);

          // Send final progress update
          window.webContents.send("download-progress", {
            downloadId,
            progress: 1,
            total: totalSize,
            downloaded: downloadedSize,
            filePath,
            complete: true,
          });

          resolve({
            success: true,
            filePath,
            fileSize: downloadedSize,
          });
        });
      });

      // Handle request errors
      currentRequest.on("error", (err) => {
        if (currentFileStream) {
          currentFileStream.close();
          currentFileStream = null;
        }

        // Delete the incomplete file
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          logger.error(`Error removing incomplete file: ${fileErr.message}`);
        }

        // Remove from active downloads
        activeDownloads.delete(downloadId);

        logger.error(`Download request error: ${err.message}`);
        reject(err);
      });

      // Handle file stream errors
      currentFileStream.on("error", (err) => {
        currentFileStream.close();
        currentFileStream = null;

        // Delete the incomplete file
        try {
          fs.unlinkSync(filePath);
        } catch (fileErr) {
          logger.error(`Error removing incomplete file: ${fileErr.message}`);
        }

        // Remove from active downloads
        activeDownloads.delete(downloadId);

        logger.error(`File stream error: ${err.message}`);
        reject(err);
      });
    } catch (error) {
      // Remove from active downloads
      activeDownloads.delete(downloadId);

      logger.error(`Download failed: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Cancel an active download
 * @param {string} downloadId ID of the download to cancel
 * @returns {boolean} Whether the download was successfully cancelled
 */
function cancelDownload(downloadId) {
  if (activeDownloads.has(downloadId)) {
    const cancelHandler = activeDownloads.get(downloadId);
    cancelHandler();
    activeDownloads.delete(downloadId);
    logger.info(`Download cancelled: ${downloadId}`);
    return true;
  }

  logger.warn(`Attempted to cancel unknown download: ${downloadId}`);
  return false;
}

// Make sure downloadFile is properly exported
module.exports = {
  downloadFile,
  cancelDownload,
};
