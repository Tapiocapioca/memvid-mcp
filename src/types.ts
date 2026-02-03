import { z } from "zod";
import { isPathWithinRoots } from "./roots.js";

export { log } from "./logger.js";

// ============================================================================
// CLI Execution Types
// ============================================================================

export interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
  exitCode: number;
  stderr?: string;
}

export interface ExecuteOptions {
  timeout?: number;
  skipJson?: boolean;
}

// ============================================================================
// Security: Path Validation
// ============================================================================

const BLOCKED_LINUX_PATHS = ["/etc/", "/proc/", "/sys/", "/var/log/", "/root/", "/.ssh/"];
const BLOCKED_WINDOWS_PATHS = ["\\windows\\", "\\system32\\", "/windows/", "/system32/"];

function isPathSafe(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");

  if (normalized.includes("..")) return false;

  const lowerPath = normalized.toLowerCase();
  if (BLOCKED_LINUX_PATHS.some((p) => lowerPath.includes(p))) return false;
  if (BLOCKED_WINDOWS_PATHS.some((p) => lowerPath.includes(p))) return false;

  if (!isPathWithinRoots(path)) return false;

  return true;
}

// ============================================================================
// Common Zod Schemas
// ============================================================================

export const filePathSchema = z
  .string()
  .min(1)
  .refine(isPathSafe, {
    message: "Path contains unsafe patterns (path traversal or system paths not allowed)",
  })
  .describe("Path to the .mv2 memory file");

export const outputPathSchema = z
  .string()
  .min(1)
  .refine(isPathSafe, {
    message: "Output path contains unsafe patterns",
  })
  .describe("Output file path");

export const inputPathSchema = z
  .string()
  .min(1)
  .refine(isPathSafe, {
    message: "Input path contains unsafe patterns",
  })
  .describe("Input file or directory path");

export const frameIdSchema = z
  .number()
  .int()
  .nonnegative()
  .describe("Frame ID (non-negative integer)");

export const limitSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .default(10)
  .describe("Maximum number of results to return");

export const searchModeSchema = z
  .enum(["hybrid", "lex", "vec"])
  .optional()
  .default("hybrid")
  .describe("Search mode: hybrid (default), lex (lexical), vec (vector)");

export const askModeSchema = z
  .enum(["hybrid", "lex", "sem"])
  .optional()
  .default("hybrid")
  .describe("Search mode: hybrid (default), lex (lexical), sem (semantic)");

export const segmentTypeSchema = z
  .enum(["lex", "vec", "time"])
  .describe("Segment type: lex (lexical), vec (vector), time (temporal)");

export const exportFormatSchema = z
  .enum(["json", "csv", "jsonl"])
  .optional()
  .default("json")
  .describe("Export format: json (default), csv, jsonl");

export const modelTypeSchema = z
  .enum(["text", "clip", "whisper"])
  .optional()
  .describe("Model type filter: text, clip, whisper");

export const sketchVariantSchema = z
  .enum(["small", "medium", "large"])
  .optional()
  .describe("Sketch variant size");

// ============================================================================
// Tool Annotations (MCP Best Practice)
// ============================================================================

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export const ANNOTATIONS = {
  READ_ONLY: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  } as ToolAnnotations,

  WRITE: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  } as ToolAnnotations,

  DESTRUCTIVE: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  } as ToolAnnotations,

  NETWORK: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  } as ToolAnnotations,
} as const;

// ============================================================================
// Timeout Configuration
// ============================================================================

export const TIMEOUTS = {
  DEFAULT: 120000,
  HEAVY: 300000,
  RAG: 180000,
} as const;

// ============================================================================
// Tool Result Helper (MCP Best Practice: isError flag)
// ============================================================================

export function formatToolResult(result: CliResult) {
  if (result.success) {
    const text =
      typeof result.data === "string"
        ? result.data
        : JSON.stringify(result.data, null, 2);
    return {
      content: [{ type: "text" as const, text }],
      isError: false,
    };
  } else {
    const errorMsg = result.stderr || result.error || "Unknown error";
    return {
      content: [{ type: "text" as const, text: `Error: ${errorMsg}` }],
      isError: true,
    };
  }
}
