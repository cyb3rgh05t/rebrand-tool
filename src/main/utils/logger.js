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

class Logger {
  constructor(options = {}) {
    this.level = options.level || LOG_LEVELS.DEBUG;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.category = options.category || "app";

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
   * Debug level log
   */
  debug(...args) {
    if (this.level > LOG_LEVELS.DEBUG) return;

    const message = this.formatMessage("DEBUG", ...args);
    if (this.enableConsole) console.log(message);
    this.writeToFile(message);
  }

  /**
   * Info level log
   */
  info(...args) {
    if (this.level > LOG_LEVELS.INFO) return;

    const message = this.formatMessage("INFO", ...args);
    if (this.enableConsole) console.log(message);
    this.writeToFile(message);
  }

  /**
   * Warning level log
   */
  warn(...args) {
    if (this.level > LOG_LEVELS.WARN) return;

    const message = this.formatMessage("WARN", ...args);
    if (this.enableConsole) console.warn(message);
    this.writeToFile(message);
  }

  /**
   * Error level log
   */
  error(...args) {
    if (this.level > LOG_LEVELS.ERROR) return;

    const message = this.formatMessage("ERROR", ...args);
    if (this.enableConsole) console.error(message);
    this.writeToFile(message);
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
}

// Export a default logger instance
const defaultLogger = new Logger();

// Export factory function for creating category-specific loggers
const createLogger = (category) => defaultLogger.child(category);

module.exports = {
  Logger,
  createLogger,
  LOG_LEVELS,
};
