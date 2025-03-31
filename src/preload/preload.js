/**
 * Preload script for Electron
 * Exposes a secure bridge between renderer process and main process
 */
const { contextBridge, ipcRenderer } = require("electron");

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

  // Debug and logging
  setLogLevel: (level) => ipcRenderer.invoke("set-log-level", level),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

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
});

// Log preload script execution
console.log("Rebrands Panel preload script executed");
