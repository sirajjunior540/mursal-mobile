/**
 * Centralized logging service with environment-based conditional logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorDetails = error ? ` | Error: ${error.message}` : '';
      console.error(this.formatMessage('ERROR', message + errorDetails, context));
      
      if (error && this.isDevelopment) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  // API specific logging
  apiRequest(method: string, url: string, data?: any): void {
    this.debug(`API ${method.toUpperCase()} ${url}`, { data });
  }

  apiResponse(method: string, url: string, status: number, data?: any): void {
    this.debug(`API ${method.toUpperCase()} ${url} - ${status}`, { data });
  }

  apiError(method: string, url: string, error: Error): void {
    this.error(`API ${method.toUpperCase()} ${url} failed`, error);
  }

  // Order specific logging
  orderReceived(orderId: string, status: string): void {
    this.info(`Order received: ${orderId}`, { status });
  }

  orderStatusChanged(orderId: string, oldStatus: string, newStatus: string): void {
    this.info(`Order status changed: ${orderId}`, { oldStatus, newStatus });
  }

  // Driver location logging
  locationUpdate(latitude: number, longitude: number): void {
    this.debug('Driver location updated', { latitude, longitude });
  }

  // WebSocket logging
  websocketConnected(url: string): void {
    this.info(`WebSocket connected: ${url}`);
  }

  websocketDisconnected(url: string, reason?: string): void {
    this.warn(`WebSocket disconnected: ${url}`, { reason });
  }

  websocketError(url: string, error: Error): void {
    this.error(`WebSocket error: ${url}`, error);
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions for backwards compatibility
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context),
};