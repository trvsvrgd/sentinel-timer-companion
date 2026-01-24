// Secure logging utility

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Prevent memory leaks
  private enabled = process.env.NODE_ENV === 'development';

  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      // Don't log sensitive data
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else if (value instanceof Error) {
        sanitized[key] = {
          message: value.message,
          stack: value.stack,
        };
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private addLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: context ? this.sanitizeContext(context) : undefined,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as unknown as Error : undefined,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console logging
    if (this.enabled) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      const prefix = `[${new Date(entry.timestamp).toISOString()}] [${level.toUpperCase()}]`;
      
      if (error) {
        console[consoleMethod](prefix, message, error, context);
      } else {
        console[consoleMethod](prefix, message, context);
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.addLog('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.addLog('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.addLog('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.addLog('error', message, context, error);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
