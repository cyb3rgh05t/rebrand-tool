/**
 * Enhanced Debug Panel for StreamNet Panels
 * Properly formats console messages with color styling
 */
// Import the log module
import { log } from "../utils/logging.js";

/**
 * Initialize the debug panel as a modal with improved styling and log handling
 */
function initializeDebugPanel() {
  // Get debug modal elements
  const debugModal = document.getElementById("debugModal");
  const closeDebugModalBtn = document.getElementById("closeDebugModalBtn");
  const logLevelSelect = document.getElementById("logLevelSelect");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const downloadLogsBtn = document.getElementById("downloadLogsBtn");
  const fetchMainLogsBtn = document.getElementById("fetchMainLogsBtn");
  const logFilterInput = document.getElementById("logFilterInput");
  const logFilterCategory = document.getElementById("logFilterCategory");

  // Add keyboard shortcut (Ctrl+D) to toggle debug modal
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "d") {
      event.preventDefault();
      if (debugModal) {
        debugModal.style.display =
          debugModal.style.display === "none" ? "block" : "none";
      }
    }
  });

  // Close button event
  if (closeDebugModalBtn) {
    closeDebugModalBtn.addEventListener("click", () => {
      if (debugModal) debugModal.style.display = "none";
    });
  }

  // Click outside to close
  if (debugModal) {
    debugModal.addEventListener("click", (event) => {
      if (event.target === debugModal) {
        debugModal.style.display = "none";
      }
    });
  }

  // Log level selector
  if (logLevelSelect) {
    // Set initial value from current log level
    logLevelSelect.value = log.getLogLevel();

    logLevelSelect.addEventListener("change", function () {
      const level = parseInt(this.value, 10);
      log.setLogLevel(level);
      log.info(`Log level set to: ${level}`);
    });
  }

  // Log filtering
  if (logFilterInput && logFilterCategory) {
    setupLogFiltering(logFilterInput, logFilterCategory);
  }

  // Clear logs button
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", function () {
      const logOutput = document.getElementById("logOutput");
      if (logOutput) {
        logOutput.innerHTML = "";
      }
      log.clearHistory();
      log.info("All logs cleared");
    });
  }

  // Download logs button
  if (downloadLogsBtn) {
    downloadLogsBtn.addEventListener("click", function () {
      const logOutput = document.getElementById("logOutput");
      if (!logOutput) return;

      // Get all log entries
      const logEntries = logOutput.querySelectorAll(".log-entry");
      if (logEntries.length === 0) {
        log.warn("No logs to download");
        return;
      }

      // Create log content
      const logContent = Array.from(logEntries)
        .map((entry) => entry.textContent)
        .join("\n");

      // Create download link
      const blob = new Blob([logContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      // Set download filename with date/time
      const date = new Date();
      const dateStr = date
        .toISOString()
        .replace(/[^0-9]/g, "_")
        .slice(0, 19);
      a.download = `streamnet_logs_${dateStr}.txt`;

      a.href = url;
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      log.info("Logs downloaded");
    });
  }

  // Fetch main logs button
  if (fetchMainLogsBtn) {
    fetchMainLogsBtn.addEventListener("click", async function () {
      // Save the original button state
      const originalText = this.innerHTML;
      const originalDisabled = this.disabled;

      try {
        // Update button to loading state
        this.innerHTML =
          '<span class="button-icon spinning">↻</span> Loading...';
        this.disabled = true;

        // Fetch logs from main process
        const mainLogs = await log.fetchMainLogs();

        // Safety check - in case something changed during async operation
        if (!document.body.contains(this)) {
          console.warn("Button removed from DOM during fetch operation");
          return;
        }

        const logOutput = document.getElementById("logOutput");
        if (!logOutput) {
          console.warn("Log output element not found");
          return;
        }

        if (mainLogs && Array.isArray(mainLogs) && mainLogs.length > 0) {
          // Process each log entry
          mainLogs.forEach((logEntry) => {
            // Handle potentially missing properties safely
            const level = logEntry.level || "INFO";
            const category = logEntry.category || "main";
            const message = logEntry.message || "(No message)";

            // Create log element with proper styling
            addStyledLogEntry(
              logOutput,
              level,
              `[MAIN:${category}] ${message}`,
              true
            );
          });

          log.info(`Loaded ${mainLogs.length} main process logs`);
        } else {
          log.info("No main process logs available");
        }
      } catch (error) {
        log.error(`Error fetching main logs: ${error.message}`);
      } finally {
        // Always restore the button state, even if there's an error
        // Make sure we check if the button is still in the DOM
        if (document.body.contains(this)) {
          this.innerHTML = originalText;
          this.disabled = originalDisabled;
        }
      }
    });
  }

  // Initialize log display in the debug panel
  const logOutput = document.getElementById("logOutput");
  if (logOutput) {
    // Add initial message
    logOutput.innerHTML = "";
    addStyledLogEntry(logOutput, "INFO", "Debug console initialized");

    // Initialize auto-refresh functionality
    const autoRefreshToggle = document.getElementById("autoRefreshToggle");
    const refreshTimer = document.getElementById("refreshTimer");
    if (autoRefreshToggle && refreshTimer) {
      setupAutoRefresh(logOutput, autoRefreshToggle, refreshTimer);
    }

    // Create a function to display new logs with proper styling
    const displayLog = (level, message, isMainProcess = false) => {
      // Add log entry with proper styling
      addStyledLogEntry(logOutput, level, message, isMainProcess);
    };

    // Override console methods to capture logs
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    console.log = function (...args) {
      originalConsole.log(...args);
      try {
        // Check if this is a styled log message (%c)
        const firstArg = args[0] || "";
        if (typeof firstArg === "string" && firstArg.includes("%c")) {
          // Extract the timestamp, level, and message
          const match = firstArg.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
          if (match) {
            const level = match[2];
            const message = match[3];
            displayLog(level, message);
            return;
          }
        }
        // Default handling if not formatted
        displayLog("LOG", args.join(" "));
      } catch (e) {
        originalConsole.error("Error in log capture:", e);
      }
    };

    console.info = function (...args) {
      originalConsole.info(...args);
      try {
        // Same pattern as above, extract formatted log if present
        const firstArg = args[0] || "";
        if (typeof firstArg === "string" && firstArg.includes("%c")) {
          const match = firstArg.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
          if (match) {
            const level = match[2];
            const message = match[3];
            displayLog(level, message);
            return;
          }
        }
        displayLog("INFO", args.join(" "));
      } catch (e) {}
    };

    console.warn = function (...args) {
      originalConsole.warn(...args);
      try {
        // Same pattern as above, extract formatted log if present
        const firstArg = args[0] || "";
        if (typeof firstArg === "string" && firstArg.includes("%c")) {
          const match = firstArg.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
          if (match) {
            const level = match[2];
            const message = match[3];
            displayLog(level, message);
            return;
          }
        }
        displayLog("WARN", args.join(" "));
      } catch (e) {}
    };

    console.error = function (...args) {
      originalConsole.error(...args);
      try {
        // Same pattern as above, extract formatted log if present
        const firstArg = args[0] || "";
        if (typeof firstArg === "string" && firstArg.includes("%c")) {
          const match = firstArg.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
          if (match) {
            const level = match[2];
            const message = match[3];
            displayLog(level, message);
            return;
          }
        }
        displayLog("ERROR", args.join(" "));
      } catch (e) {}
    };

    console.debug = function (...args) {
      originalConsole.debug(...args);
      try {
        // Same pattern as above, extract formatted log if present
        const firstArg = args[0] || "";
        if (typeof firstArg === "string" && firstArg.includes("%c")) {
          const match = firstArg.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
          if (match) {
            const level = match[2];
            const message = match[3];
            displayLog(level, message);
            return;
          }
        }
        displayLog("DEBUG", args.join(" "));
      } catch (e) {}
    };
  }

  log.debug("Debug panel initialized with improved styling");
}

/**
 * Add a styled log entry to the log output
 * @param {HTMLElement} logOutput The log output element
 * @param {string} level Log level
 * @param {string} message Log message
 * @param {boolean} isMainProcess Whether this is a main process log
 */
function addStyledLogEntry(logOutput, level, message, isMainProcess = false) {
  if (!logOutput) return;

  // Create log message element
  const entry = document.createElement("div");

  // Format the timestamp
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Save timestamp as data attribute
  entry.setAttribute("data-time", timestamp);

  // Normalize level naming
  let normalizedLevel = level.toLowerCase();
  if (normalizedLevel === "warning") normalizedLevel = "warn";
  if (normalizedLevel === "log") normalizedLevel = "log";

  // Add appropriate classes
  entry.className = `log-entry log-level-${normalizedLevel}`;

  // Add main process class if applicable
  if (isMainProcess) {
    entry.classList.add("main-process");
  }

  // Set textContent to preserve formatting but avoid HTML injection
  if (isMainProcess) {
    entry.textContent = `[${timestamp}] ${message}`;
  } else {
    entry.textContent = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  // Add to log output and scroll to bottom
  logOutput.appendChild(entry);
  logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * Set up log filtering
 * @param {HTMLElement} filterInput Text filter input
 * @param {HTMLElement} categorySelect Category filter select
 */
function setupLogFiltering(filterInput, categorySelect) {
  if (!filterInput || !categorySelect) return;

  const filterLogs = () => {
    const filterText = (filterInput.value || "").toLowerCase();
    const filterCategory = categorySelect.value;
    const logEntries = document.querySelectorAll(".log-entry");
    let visibleCount = 0;

    logEntries.forEach((entry) => {
      // Apply text filter
      const text = entry.textContent.toLowerCase();
      const matchesText = !filterText || text.includes(filterText);

      // Apply level filter
      const matchesLevel =
        filterCategory === "all" ||
        (filterCategory === "main" &&
          entry.classList.contains("main-process")) ||
        entry.classList.contains(`log-level-${filterCategory}`);

      // Show/hide based on filters
      if (matchesText && matchesLevel) {
        entry.style.display = "";
        visibleCount++;
      } else {
        entry.style.display = "none";
      }
    });

    // Update filter status
    const statusElem = document.getElementById("filterStatus");
    if (statusElem) {
      statusElem.textContent = `Showing ${visibleCount} of ${logEntries.length} logs`;
    }
  };

  // Add event listeners
  filterInput.addEventListener("input", filterLogs);
  categorySelect.addEventListener("change", filterLogs);
}

/**
 * Set up auto-refresh functionality
 * @param {HTMLElement} logOutput Log output element
 * @param {HTMLElement} autoRefreshToggle Toggle button element
 * @param {HTMLElement} refreshTimer Timer display element
 */
function setupAutoRefresh(logOutput, autoRefreshToggle, refreshTimer) {
  if (!logOutput || !autoRefreshToggle || !refreshTimer) return;

  let isAutoRefreshEnabled = true;
  let refreshInterval = null;
  let secondsLeft = 0;

  const updateRefreshTimer = () => {
    refreshTimer.textContent = secondsLeft;
  };

  const startAutoRefresh = () => {
    secondsLeft = 10; // Refresh every 10 seconds
    updateRefreshTimer();

    refreshInterval = setInterval(() => {
      secondsLeft--;
      updateRefreshTimer();

      if (secondsLeft <= 0) {
        // Refresh logs here
        refreshLogs();
        secondsLeft = 10;
      }
    }, 1000);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    refreshTimer.textContent = "off";
  };

  const refreshLogs = () => {
    // Show existing logs from log history
    const history = log.getHistory();
    if (history.length > 0) {
      // Get last 10 logs that aren't already shown
      const existingCount = logOutput.children.length;
      const newLogs = history.slice(Math.max(0, existingCount - 10));

      newLogs.forEach((logEntry) => {
        addStyledLogEntry(logOutput, logEntry.level, logEntry.message);
      });
    }
  };

  // Initialize auto-refresh
  if (isAutoRefreshEnabled) {
    startAutoRefresh();
  }

  // Toggle auto-refresh when clicked
  autoRefreshToggle.addEventListener("click", () => {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;

    if (isAutoRefreshEnabled) {
      autoRefreshToggle.textContent = "Auto-refresh: ON";
      startAutoRefresh();
    } else {
      autoRefreshToggle.textContent = "Auto-refresh: OFF";
      stopAutoRefresh();
    }
  });
}

export { initializeDebugPanel };
