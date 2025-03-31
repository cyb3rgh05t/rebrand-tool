/**
 * Client-side logging utility for StreamNet Panels
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Current log level
let currentLogLevel = LOG_LEVELS.DEBUG;

// Enable console output
let consoleOutput = true;

// Maximum log history
const MAX_HISTORY = 100;

// Log history array
const logHistory = [];

/**
 * Format a log message with timestamp
 * @param {string} level Log level
 * @param {Array} args Log arguments
 * @returns {string} Formatted log message
 */
function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
    .join(" ");

  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Add entry to log history
 * @param {string} level Log level
 * @param {string} message Formatted message
 */
function addToHistory(level, message) {
  logHistory.push({
    level,
    message,
    timestamp: new Date(),
  });

  // Trim history if needed
  if (logHistory.length > MAX_HISTORY) {
    logHistory.shift();
  }
}

/**
 * Debug level log
 * @param {...any} args Objects to log
 */
function debug(...args) {
  if (currentLogLevel > LOG_LEVELS.DEBUG) return;

  const message = formatMessage("DEBUG", ...args);
  addToHistory("DEBUG", message);

  if (consoleOutput) {
    console.log("%c" + message, "color: #888;");
  }
}

/**
 * Info level log
 * @param {...any} args Objects to log
 */
function info(...args) {
  if (currentLogLevel > LOG_LEVELS.INFO) return;

  const message = formatMessage("INFO", ...args);
  addToHistory("INFO", message);

  if (consoleOutput) {
    console.log("%c" + message, "color: #2196F3;");
  }
}

/**
 * Warning level log
 * @param {...any} args Objects to log
 */
function warn(...args) {
  if (currentLogLevel > LOG_LEVELS.WARN) return;

  const message = formatMessage("WARN", ...args);
  addToHistory("WARN", message);

  if (consoleOutput) {
    console.warn("%c" + message, "color: #FFC107; font-weight: bold;");
  }
}

/**
 * Error level log
 * @param {...any} args Objects to log
 */
function error(...args) {
  if (currentLogLevel > LOG_LEVELS.ERROR) return;

  const message = formatMessage("ERROR", ...args);
  addToHistory("ERROR", message);

  if (consoleOutput) {
    console.error("%c" + message, "color: #F44336; font-weight: bold;");
  }
}

/**
 * Get all log history
 * @returns {Array} Log history
 */
function getHistory() {
  return [...logHistory];
}

/**
 * Clear log history
 */
function clearHistory() {
  logHistory.length = 0;
}

/**
 * Set the current log level
 * @param {number} level Log level from LOG_LEVELS
 */
function setLogLevel(level) {
  if (level >= LOG_LEVELS.DEBUG && level <= LOG_LEVELS.NONE) {
    currentLogLevel = level;
  }
}

/**
 * Enable or disable console output
 * @param {boolean} enabled Whether to output to console
 */
function setConsoleOutput(enabled) {
  consoleOutput = !!enabled;
}

/**
 * Get the current log level
 * @returns {number} Current log level
 */
function getLogLevel() {
  return currentLogLevel;
}

// Initialize a handler for uncaught errors
window.addEventListener("error", (event) => {
  error("Uncaught error:", event.error?.message || event.message);
});

// Create a single export object
export const log = {
  debug,
  info,
  warn,
  error,
  getHistory,
  clearHistory,
  setLogLevel,
  getLogLevel,
  setConsoleOutput,
  LOG_LEVELS,
};

// Default export
export default log;
