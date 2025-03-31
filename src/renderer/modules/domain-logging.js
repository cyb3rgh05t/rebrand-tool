/**
 * Domain creation logging functionality
 * Handles displaying logs in the domain creation modal
 */
import { log } from "../utils/logging.js";

// Keep track of autoscroll state
let autoScroll = true;

/**
 * Initialize the domain creation log box
 */
export function initDomainCreationLog() {
  const logBox = document.getElementById("domainCreationLog");

  if (!logBox) return;

  // Clear the log content
  const logContent = logBox.querySelector(".log-content");
  if (logContent) {
    logContent.innerHTML = "";
  }

  // Add autoscroll button if it doesn't exist
  if (!logBox.querySelector(".autoscroll")) {
    const autoScrollBtn = document.createElement("button");
    autoScrollBtn.className = "autoscroll";
    autoScrollBtn.textContent = "Auto-scroll: ON";
    autoScrollBtn.addEventListener("click", () => {
      autoScroll = !autoScroll;
      autoScrollBtn.textContent = `Auto-scroll: ${autoScroll ? "ON" : "OFF"}`;
    });
    logBox.appendChild(autoScrollBtn);
  }

  log.debug("Domain creation log initialized");
}

/**
 * Add a log message to the domain creation log box
 * @param {string} message Log message text
 * @param {string} [level='info'] Log level (info, error, warning, success, debug)
 * @param {string} [type='text'] Message type (text, command, output)
 */
export function addDomainLog(message, level = "info", type = "text") {
  const logBox = document.getElementById("domainCreationLog");
  const logContent = logBox?.querySelector(".log-content");

  if (!logContent) return;

  // Format timestamp
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Create log message element
  const logMessage = document.createElement("div");
  logMessage.className = `log-message log-${type}`;

  // Add timestamp
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
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Also log to console for debugging
  switch (level) {
    case "error":
      log.error(message);
      break;
    case "warning":
      log.warn(message);
      break;
    case "debug":
      log.debug(message);
      break;
    case "success":
    case "info":
    default:
      log.info(message);
      break;
  }
}

/**
 * Show a command being executed
 * @param {string} command The command being run
 */
export function addCommandLog(command) {
  addDomainLog(`$ ${command}`, "debug", "command");
}

/**
 * Show command output
 * @param {string} output Command output text
 */
export function addOutputLog(output) {
  addDomainLog(output, "info", "output");
}

/**
 * Show a loading/processing message
 * @param {string} message Loading message text
 * @returns {Function} Function to call when loading completes
 */
export function showLoading(message) {
  const logBox = document.getElementById("domainCreationLog");
  const logContent = logBox?.querySelector(".log-content");

  if (!logContent) return () => {};

  // Create loading message element
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "log-message log-loading";
  loadingMessage.textContent = `${message}...`;

  // Add to log content
  logContent.appendChild(loadingMessage);

  // Auto-scroll to bottom if enabled
  if (autoScroll) {
    logBox.scrollTop = logBox.scrollHeight;
  }

  // Make the log box taller during processing
  logBox.classList.add("active");

  // Return a function to complete the loading
  return (result, success = true) => {
    // Remove the loading message
    logContent.removeChild(loadingMessage);

    // Add completion message
    const level = success ? "success" : "error";
    addDomainLog(result, level);

    // Return the log box to normal size after a delay
    setTimeout(() => {
      logBox.classList.remove("active");
    }, 1500);
  };
}

/**
 * Clear the domain creation log
 */
export function clearDomainLog() {
  const logContent = document.querySelector("#domainCreationLog .log-content");
  if (logContent) {
    logContent.innerHTML = "";
  }
}

export default {
  initDomainCreationLog,
  addDomainLog,
  addCommandLog,
  addOutputLog,
  showLoading,
  clearDomainLog,
};
