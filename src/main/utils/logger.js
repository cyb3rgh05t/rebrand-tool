/**
 * Enhanced logging utility for StreamNet Panels
 */
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Maximum entries in global history
const MAX_GLOBAL_HISTORY = 5000;

// Global log history shared across all logger instances
const globalLogHistory = [];

class Logger {
  constructor(options = {}) {
    this.level = options.level || LOG_LEVELS.DEBUG;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.category = options.category || "app";

    // Log history for this logger instance
    this.logHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;

    // Set up log file if enabled
    if (this.enableFile) {
      const userDataPath = app ? app.getPath("userData") : ".";
      this.logDir = path.join(userDataPath, "logs");

      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      const date = new Date().toISOString().split("T")[0];
      this.logFile = path.join(this.logDir, `streamnet-${date}.log`);
    }
  }

  /**
   * Format a log message with timestamp and category
   */
  formatMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
      )
      .join(" ");

    return `[${timestamp}] [${level}] [${this.category}] ${message}`;
  }

  /**
   * Write to log file
   */
  writeToFile(formattedMessage) {
    if (!this.enableFile) return;

    try {
      fs.appendFileSync(this.logFile, formattedMessage + "\n");
    } catch (err) {
      console.error("Failed to write to log file:", err);
    }
  }

  /**
   * Add log entry to history
   * @private
   */
  _addToHistory(level, ...args) {
    const timestamp = new Date();
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
      )
      .join(" ");

    // Create log entry
    const entry = {
      timestamp,
      level,
      category: this.category,
      message,
    };

    // Add to instance history
    this.logHistory.push(entry);

    // Trim if needed
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Add to global history
    globalLogHistory.push(entry);

    // Trim global history if needed
    while (globalLogHistory.length > MAX_GLOBAL_HISTORY) {
      globalLogHistory.shift();
    }
  }

  /**
   * Debug level log
   */
  debug(...args) {
    if (this.level > LOG_LEVELS.DEBUG) return;

    const message = this.formatMessage("DEBUG", ...args);
    if (this.enableConsole) console.log(message);
    this.writeToFile(message);

    // Add to history
    this._addToHistory("DEBUG", ...args);
  }

  /**
   * Info level log
   */
  info(...args) {
    if (this.level > LOG_LEVELS.INFO) return;

    const message = this.formatMessage("INFO", ...args);
    if (this.enableConsole) console.log(message);
    this.writeToFile(message);

    // Add to history
    this._addToHistory("INFO", ...args);
  }

  /**
   * Warning level log
   */
  warn(...args) {
    if (this.level > LOG_LEVELS.WARN) return;

    const message = this.formatMessage("WARN", ...args);
    if (this.enableConsole) console.warn(message);
    this.writeToFile(message);

    // Add to history
    this._addToHistory("WARN", ...args);
  }

  /**
   * Error level log
   */
  error(...args) {
    if (this.level > LOG_LEVELS.ERROR) return;

    const message = this.formatMessage("ERROR", ...args);
    if (this.enableConsole) console.error(message);
    this.writeToFile(message);

    // Add to history
    this._addToHistory("ERROR", ...args);
  }

  /**
   * Get log history for this instance
   * @returns {Array} Log history
   */
  getHistory() {
    return [...this.logHistory];
  }

  /**
   * Create a child logger with a specific category
   */
  child(category) {
    return new Logger({
      level: this.level,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      category: `${this.category}:${category}`,
    });
  }

  /**
   * Set the log level for this logger
   * @param {number} level - Log level from LOG_LEVELS
   */
  setLevel(level) {
    if (level >= LOG_LEVELS.DEBUG && level <= LOG_LEVELS.NONE) {
      this.level = level;
    }
  }
}

// Export a default logger instance
const defaultLogger = new Logger();

// Export factory function for creating category-specific loggers
const createLogger = (category) => defaultLogger.child(category);

/**
 * Get global log history across all logger instances
 * @returns {Array} Log history
 */
function getGlobalLogHistory() {
  return [...globalLogHistory];
}

/**
 * Set log level for a specific category
 * @param {string} category - Logger category
 * @param {number} level - Log level to set
 * @returns {boolean} Success
 */
function setCategoryLevel(category, level) {
  // This is a simple implementation - for a more robust solution,
  // you would need to track all logger instances by category
  // For now, we just set the level on the default logger
  if (defaultLogger.category === category) {
    defaultLogger.setLevel(level);
    return true;
  }
  return false;
}

/**
 * Clear global log history
 */
function clearGlobalHistory() {
  globalLogHistory.length = 0;
}

module.exports = {
  Logger,
  createLogger,
  LOG_LEVELS,
  getGlobalLogHistory,
  setCategoryLevel,
  clearGlobalHistory,
};
