/**
 * Application menu configuration for Rebrands Panel Tool
 */
const { app, Menu, BrowserWindow, dialog, shell } = require("electron");
const { createLogger } = require("./utils/logger");
const { testSftpConnection } = require("./connection");

// Create a menu-specific logger
const logger = createLogger("menu");

/**
 * Create the application menu
 * @param {BrowserWindow} mainWindow - The main application window
 */
function createApplicationMenu(mainWindow) {
  logger.debug("Creating application menu");

  // Check if we have a valid main window
  if (!mainWindow || mainWindow.isDestroyed()) {
    logger.error("Cannot create menu: No valid main window");
    return;
  }

  // Detect platform for platform-specific menu items
  const isMac = process.platform === "darwin";

  // Get app version
  const appVersion = app.getVersion();

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "New Domain",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            // Send IPC message to trigger the new domain modal
            mainWindow.webContents.send("menu-action", "open-domain-modal");
            logger.debug("Menu action: open-domain-modal");
          },
        },
        {
          label: "Refresh Domains",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            // Send IPC message to trigger domain list refresh
            mainWindow.webContents.send("menu-action", "refresh-domains");
            logger.debug("Menu action: refresh-domains");
          },
        },
        { type: "separator" },
        {
          label: "Test Connection",
          accelerator: "CmdOrCtrl+T",
          click: async () => {
            try {
              // Show a status indicator in the window
              mainWindow.webContents.send(
                "menu-action",
                "test-connection-start"
              );

              // Test the connection
              logger.debug("Testing connection from menu");
              const result = await testSftpConnection();

              // Send the result to the renderer
              mainWindow.webContents.send(
                "menu-action",
                "test-connection-result",
                {
                  success: true,
                  result,
                }
              );

              logger.debug("Connection test successful");
            } catch (error) {
              logger.error(`Connection test failed: ${error.message}`);
              mainWindow.webContents.send(
                "menu-action",
                "test-connection-result",
                {
                  success: false,
                  error: error.message,
                }
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Check for Updates",
          click: async () => {
            // Send IPC message to trigger update check
            mainWindow.webContents.send("menu-action", "check-updates");
            logger.debug("Menu action: check-updates");
          },
        },
        { type: "separator" },
        ...(isMac ? [] : [{ role: "quit" }]), // Quit item not needed on macOS
      ],
    },

    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
              { type: "separator" },
              {
                label: "Speech",
                submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
              },
            ]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      ],
    },

    // View menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Debug Console",
          accelerator: "CmdOrCtrl+D",
          click: () => {
            // Send IPC message to toggle debug panel
            mainWindow.webContents.send("menu-action", "toggle-debug");
            logger.debug("Menu action: toggle-debug");
          },
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },

    // Help menu
    {
      role: "help",
      submenu: [
        {
          label: "GitHub Repository",
          click: async () => {
            await shell.openExternal(
              "https://github.com/cyb3rgh05t/rebrand-tool"
            );
          },
        },
        {
          label: "Report an Issue",
          click: async () => {
            await shell.openExternal(
              "https://github.com/cyb3rgh05t/rebrand-tool/issues/new"
            );
          },
        },
        { type: "separator" },
        {
          label: "Toggle Developer Tools",
          accelerator: isMac ? "Alt+Command+I" : "Ctrl+Shift+I",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
        { type: "separator" },
        {
          label: "About Rebrands Panel Tool",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: "About Rebrands Panel Tool",
              message: "Rebrands Panel Tool",
              detail: `Version: ${appVersion}\n\nA tool for managing IPTV app panels, domain creation, and file deployment.\n\nCopyright © 2025 cyb3rgh05t`,
              type: "info",
              buttons: ["OK"],
              icon: require("path").join(
                app.getAppPath(),
                "assets/icons/png/64x64.png"
              ),
            });
          },
        },
      ],
    },
  ];

  // Build and set the menu
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  logger.info("Application menu created successfully");

  return menu;
}

/**
 * Create a context menu
 * @param {BrowserWindow} window - The window to attach the context menu to
 */
function createContextMenu(window) {
  // Basic context menu items
  const template = [
    { role: "cut" },
    { role: "copy" },
    { role: "paste" },
    { type: "separator" },
    { role: "selectAll" },
  ];

  const contextMenu = Menu.buildFromTemplate(template);

  // Add context menu event listener
  window.webContents.on("context-menu", (event, params) => {
    contextMenu.popup({ window, x: params.x, y: params.y });
  });

  logger.debug("Context menu created");
}

module.exports = {
  createApplicationMenu,
  createContextMenu,
};
