/**
 * Logging utilities for MCP client
 */

/**
 * Log levels
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

/**
 * Logger for MCP client
 */
export class MCPLogger {
    private level: LogLevel;
    private prefix: string;

    /**
     * Create a new logger
     *
     * @param options Logger options
     */
    constructor(
        options: {
            level?: LogLevel;
            prefix?: string;
        } = {},
    ) {
        this.level = options.level || LogLevel.INFO;
        this.prefix = options.prefix || 'MCP';
    }

    /**
     * Log a debug message
     *
     * @param message Message to log
     * @param args Additional arguments
     */
    debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(`[${this.prefix}] ${message}`, ...args);
        }
    }

    /**
     * Log an info message
     *
     * @param message Message to log
     * @param args Additional arguments
     */
    info(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(`[${this.prefix}] ${message}`, ...args);
        }
    }

    /**
     * Log a warning message
     *
     * @param message Message to log
     * @param args Additional arguments
     */
    warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[${this.prefix}] ${message}`, ...args);
        }
    }

    /**
     * Log an error message
     *
     * @param message Message to log
     * @param args Additional arguments
     */
    error(message: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(`[${this.prefix}] ${message}`, ...args);
        }
    }

    /**
     * Set the log level
     *
     * @param level Log level
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Set the prefix
     *
     * @param prefix Prefix
     */
    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    /**
     * Check if a message should be logged
     *
     * @param level Log level
     * @returns Whether the message should be logged
     */
    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
}

/**
 * Create a new logger
 *
 * @param options Logger options
 * @returns Logger
 */
export function createLogger(
    options: {
        level?: LogLevel;
        prefix?: string;
    } = {},
): MCPLogger {
    return new MCPLogger(options);
}
