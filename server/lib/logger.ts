type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${base} ${JSON.stringify(entry.context)}`;
  }
  return base;
}

function createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.debug(formatLog(createLogEntry("debug", message, context)));
    }
  },
  
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.info(formatLog(createLogEntry("info", message, context)));
    }
  },
  
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(formatLog(createLogEntry("warn", message, context)));
    }
  },
  
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog("error")) {
      console.error(formatLog(createLogEntry("error", message, context)));
    }
  },
  
  child(baseContext: Record<string, unknown>) {
    return {
      debug: (message: string, context?: Record<string, unknown>) => 
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: Record<string, unknown>) => 
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: Record<string, unknown>) => 
        logger.warn(message, { ...baseContext, ...context }),
      error: (message: string, context?: Record<string, unknown>) => 
        logger.error(message, { ...baseContext, ...context }),
    };
  },
};

export function trackError(error: Error | unknown, context?: Record<string, unknown>) {
  const errorInfo = error instanceof Error 
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error) };
  
  logger.error("Tracked error", { ...errorInfo, ...context });
}
