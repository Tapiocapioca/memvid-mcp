type LogLevel = "debug" | "info" | "warning" | "error";

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warning: 2, error: 3 };
const currentLevel = (process.env.MEMVID_LOG_LEVEL as LogLevel) || "warning";

export function log(level: LogLevel, message: string, data?: unknown): void {
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]) {
    const timestamp = new Date().toISOString();
    const entry = data
      ? `[${timestamp}] [memvid-mcp] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}`
      : `[${timestamp}] [memvid-mcp] [${level.toUpperCase()}] ${message}`;
    console.error(entry);
  }
}
