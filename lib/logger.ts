/**
 * Lightweight structured logger for ReelTime Media.
 *
 * Usage:
 *   import { createLogger } from "@/lib/logger";
 *   const log = createLogger("upload");
 *   log.info("Starting upload", { file: "video.mp4" });
 *
 * Levels  (lowest → highest priority):
 *   debug < info < warn < error
 *
 * In production:
 *   - Client: only warn + error are shown (no debug/info noise in user browsers)
 *   - Server: all levels shown so ops logs stay detailed
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: " INFO",
  warn: " WARN",
  error: "ERROR",
};

// ANSI colors (server / Node.js terminal only — ignored in browsers)
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function isServer(): boolean {
  return typeof window === "undefined";
}

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function minLevel(): LogLevel {
  // Server always logs everything; client hides debug/info in production
  if (isServer()) return "debug";
  return isDev() ? "debug" : "warn";
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

function formatServer(
  level: LogLevel,
  namespace: string,
  message: string,
  extra?: unknown
): string {
  const label = LEVEL_LABEL[level];
  const color2 = COLORS[level];
  const ts = `${DIM}${timestamp()}${RESET}`;
  const lvl = `${color2}${BOLD}${label}${RESET}`;
  const ns = `${DIM}[${namespace}]${RESET}`;
  const msg = message;
  const tail =
    extra !== undefined
      ? ` ${DIM}${JSON.stringify(extra)}${RESET}`
      : "";
  return `${ts} ${lvl} ${ns} ${msg}${tail}`;
}

function emit(
  level: LogLevel,
  namespace: string,
  message: string,
  extra?: unknown
): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel()]) return;

  if (isServer()) {
    const line = formatServer(level, namespace, message, extra);
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
    return;
  }

  // Browser — use the native console method that matches the level
  // so DevTools collapsing, filtering, and stack traces all work naturally
  const prefix = `[${namespace}]`;
  const args = extra !== undefined ? [prefix, message, extra] : [prefix, message];
  if (level === "error") console.error(...args);
  else if (level === "warn") console.warn(...args);
  else if (level === "debug") console.debug(...args);
  else console.info(...args);
}

export interface Logger {
  debug(message: string, extra?: unknown): void;
  info(message: string, extra?: unknown): void;
  warn(message: string, extra?: unknown): void;
  error(message: string, extra?: unknown): void;
  /** Create a child logger with an extended namespace */
  child(subNamespace: string): Logger;
}

export function createLogger(namespace: string): Logger {
  return {
    debug: (msg, extra) => emit("debug", namespace, msg, extra),
    info: (msg, extra) => emit("info", namespace, msg, extra),
    warn: (msg, extra) => emit("warn", namespace, msg, extra),
    error: (msg, extra) => emit("error", namespace, msg, extra),
    child: (sub) => createLogger(`${namespace}:${sub}`),
  };
}

/** Convenience default logger — use createLogger for scoped namespaces */
export const logger = createLogger("app");
