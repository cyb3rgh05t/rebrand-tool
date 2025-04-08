/**
 * Preload script for Electron
 * Exposes a secure bridge between renderer process and main process
 */
const { contextBridge, ipcRenderer, shell } = require("electron");

/**
 * Define which APIs will be exposed to the renderer process
 */
contextBridge.exposeInMainWorld("streamNetAPI", {
  // App version
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Connection testing
  testConnection: () => ipcRenderer.invoke("test-connection"),

  // Domain operations
  getRootDomain: () => ipcRenderer.invoke("get-root-domain"),

  listDestinationFolders: () => ipcRenderer.invoke("list-destination-folders"),

  listVirtualminDomains: () => ipcRenderer.invoke("list-virtualmin-domains"),

  createVirtualminDomain: (options) =>
    ipcRenderer.invoke("create-virtualmin-domain", options),

  // File operations
  listRemoteDirectory: (remotePath) =>
    ipcRenderer.invoke("list-remote-directory", remotePath),

  listSubfolders: (domain) => ipcRenderer.invoke("list-subfolders", domain),

  checkRemoteFile: (remotePath) =>
    ipcRenderer.invoke("check-remote-file", remotePath),

  copyFolderContents: (sourcePath, targetPath) =>
    ipcRenderer.invoke("copy-folder-contents", sourcePath, targetPath),

  transferItems: (items, targetPath) =>
    ipcRenderer.invoke("transfer-items", items, targetPath),

  // DNS operations
  createDnsRecords: (options) =>
    ipcRenderer.invoke("create-dns-records", options),

  // Utility functions
  generatePassword: (length) => ipcRenderer.invoke("generate-password", length),

  // External links and file operations
  openExternalLink: (url) => {
    // Use Electron's shell module to safely open external URLs
    shell.openExternal(url);
  },

  // Dedicated method for opening domain URLs in external browser
  openDomainUrl: (url) => {
    return ipcRenderer.invoke("open-domain-url", url);
  },

  // New method: Show an item in its folder with proper highlighting
  showItemInFolder: (filePath) => {
    return ipcRenderer.invoke("show-item-in-folder", filePath);
  },

  // New method: Open a path (file or folder) directly
  openPath: (path) => {
    return ipcRenderer.invoke("open-path", path);
  },

  // Add these to the streamNetAPI object in contextBridge.exposeInMainWorld
  openGitHubRepo: () => ipcRenderer.invoke("open-github-repo"),
  openIssuePage: () => ipcRenderer.invoke("open-issue-page"),

  // Debug and logging
  setLogLevel: (level) => ipcRenderer.invoke("set-log-level", level),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  skipUpdateVersion: (version) =>
    ipcRenderer.invoke("skip-update-version", version),
  downloadUpdate: (url, filename) =>
    ipcRenderer.invoke("download-update", url, filename),
  cancelDownload: (downloadId) =>
    ipcRenderer.invoke("cancel-download", downloadId),

  // Update dialog handlers
  showUpdateNotification: (updateInfo) => {
    // Create an event to notify the renderer process
    document.dispatchEvent(
      new CustomEvent("show-update-notification", {
        detail: updateInfo,
      })
    );
  },

  // Handle download started events
  onDownloadStarted: (callback) => {
    // Set up listener for download-started events
    ipcRenderer.on("download-started", (event, data) => {
      callback(data);
    });
  },

  onDownloadProgress: (callback) => {
    // Set up listener for download-progress events
    ipcRenderer.on("download-progress", (event, data) => {
      callback(data);
    });
  },

  // Domain Structure
  scanDomainStructure: (dirPath) =>
    ipcRenderer.invoke("scan-domain-structure", dirPath),

  // Add this new method for menu actions
  onMenuAction: (callback) => {
    // Set up listener for menu-action events
    ipcRenderer.on("menu-action", (event, action, data) => {
      callback(action, data);
    });
  },

  // Configuration API
  getConfig: (section) => ipcRenderer.invoke("get-config", section),

  updateConfig: (section, values) =>
    ipcRenderer.invoke("update-config", section, values),

  getConfigValue: (path, defaultValue) =>
    ipcRenderer.invoke("get-config-value", path, defaultValue),

  setConfigValue: (path, value) =>
    ipcRenderer.invoke("set-config-value", path, value),

  exportConfigEnv: () => ipcRenderer.invoke("export-config-env"),

  importConfigEnv: (content) =>
    ipcRenderer.invoke("import-config-env", content),

  // NEW: Configuration change events
  onConfigChanged: (callback) => {
    // Set up listener for config-changed events
    ipcRenderer.on("config-changed", (event, data) => {
      callback(data);
    });
  },

  // Logging APIs
  getMainLogs: () => ipcRenderer.invoke("get-main-logs"),
  setLogLevel: (category, level) =>
    ipcRenderer.invoke("set-log-level", category, level),
  clearMainLogs: () => ipcRenderer.invoke("clear-main-logs"),
});

// Log preload script execution
console.log("Rebrands Panel preload script executed");
