import { z } from "zod";
import { existsSync } from "fs";
import { isPathWithinRoots } from "./roots.js";

export { log } from "./logger.js";

// ============================================================================
// Platform Detection (computed once at startup)
// ============================================================================

const IS_WINDOWS = process.platform === "win32";
const IS_MACOS = process.platform === "darwin";

/** Binary name: "memvid.exe" on Windows, "memvid" elsewhere */
export const MEMVID_BINARY = IS_WINDOWS ? "memvid.exe" : "memvid";

// ============================================================================
// CLI Execution Types
// ============================================================================

export interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
  exitCode: number;
  stderr?: string;
  isSpawnError?: boolean;
  spawnErrorCode?: string;
}

export interface ExecuteOptions {
  timeout?: number;
  skipJson?: boolean;
}

// ============================================================================
// Security: Path Validation (platform-aware)
// ============================================================================

const BLOCKED_PATHS_UNIX = ["/etc/", "/proc/", "/sys/", "/var/log/", "/root/", "/.ssh/"];
const BLOCKED_PATHS_WINDOWS = ["\\windows\\", "\\system32\\", "/windows/", "/system32/"];

function isWindowsAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(path);
}

function isPathSafe(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");

  if (normalized.includes("..")) return false;

  const lowerPath = normalized.toLowerCase();
  if (IS_WINDOWS) {
    if (BLOCKED_PATHS_WINDOWS.some((p) => lowerPath.includes(p))) return false;
  } else {
    if (BLOCKED_PATHS_UNIX.some((p) => lowerPath.includes(p))) return false;
  }

  if (!isPathWithinRoots(path)) return false;

  return true;
}

// ============================================================================
// Path Examples (platform-aware, for schema descriptions)
// ============================================================================

function exampleMv2Path(): string {
  if (IS_WINDOWS) return "C:\\Tools\\memvid-data\\knowledge.mv2";
  if (IS_MACOS) return "/Users/you/memvid-data/knowledge.mv2";
  return "/home/you/memvid-data/knowledge.mv2";
}

function exampleInputPath(): string {
  if (IS_WINDOWS) return "C:\\Tools\\data\\readme.md";
  if (IS_MACOS) return "/Users/you/data/readme.md";
  return "/home/you/data/readme.md";
}

// ============================================================================
// Common Zod Schemas (cross-platform)
// ============================================================================

const pathDescription = (purpose: string) =>
  `${purpose}. Use an absolute path appropriate for your OS (e.g., ${exampleMv2Path()}).`;

export const filePathSchema = z
  .string()
  .min(1, "File path is required")
  .refine(isPathSafe, {
    message: "Path contains unsafe patterns (path traversal or system paths not allowed)",
  })
  .describe(pathDescription("Path to the .mv2 memory file"));

export const outputPathSchema = z
  .string()
  .min(1, "Output path is required")
  .refine(isPathSafe, {
    message: "Output path contains unsafe patterns",
  })
  .describe(pathDescription("Output file path"));

export const inputPathSchema = z
  .string()
  .min(1, "Input path is required")
  .refine(isPathSafe, {
    message: "Input path contains unsafe patterns",
  })
  .describe(pathDescription("Input file or directory path"));

// ============================================================================
// File Existence Helpers (cross-platform pre-validation)
// ============================================================================

export function fileExists(path: string): boolean {
  if (existsSync(path)) return true;
  // WSL compatibility: Windows path like C:\... may live at /mnt/c/... in WSL
  if (!IS_WINDOWS && isWindowsAbsolutePath(path)) {
    const drive = path[0].toLowerCase();
    const rest = path.slice(2).replace(/\\/g, "/");
    return existsSync(`/mnt/${drive}${rest}`);
  }
  return false;
}

export function validateMv2Exists(filePath: string): { content: { type: "text"; text: string }[]; isError: true } | null {
  if (!fileExists(filePath)) {
    return {
      content: [{
        type: "text" as const,
        text:
          `Error: Memory file not found: "${filePath}". ` +
          `Make sure the .mv2 file exists at this path. ` +
          `To create a new memory file, use memvid_create first. ` +
          `Example path: ${exampleMv2Path()}`,
      }],
      isError: true,
    };
  }
  return null;
}

export function validateInputExists(inputPath: string): { content: { type: "text"; text: string }[]; isError: true } | null {
  if (!fileExists(inputPath)) {
    return {
      content: [{
        type: "text" as const,
        text:
          `Error: Input path not found: "${inputPath}". ` +
          `The file or directory does not exist. ` +
          `Verify the path is correct and accessible. ` +
          `Example: ${exampleInputPath()}`,
      }],
      isError: true,
    };
  }
  return null;
}

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
// Response Size Limits (MCP Best Practice)
// ============================================================================

/**
 * Maximum response size in characters.
 * Large responses are truncated to prevent overwhelming LLM context windows.
 */
export const CHARACTER_LIMIT = 50000;

// ============================================================================
// Tool Result Helper (MCP Best Practice: isError flag)
// ============================================================================

export function formatToolResult(result: CliResult) {
  if (result.success) {
    let text =
      typeof result.data === "string"
        ? result.data
        : JSON.stringify(result.data, null, 2);

    if (!text || text === "null" || text === "undefined" || text.trim() === "") {
      return {
        content: [{
          type: "text" as const,
          text:
            "Warning: memvid returned no output. This usually means:\n" +
            "1. The input file/path was not found (verify the path exists)\n" +
            "2. The .mv2 file is empty or corrupted (try memvid_verify)\n" +
            "3. The query returned no results\n\n" +
            `Tip: Use absolute paths for your OS (e.g., ${exampleMv2Path()}).`,
        }],
        isError: true,
      };
    }

    if (text.length > CHARACTER_LIMIT) {
      const truncated = text.slice(0, CHARACTER_LIMIT);
      text =
        truncated +
        `\n\n[TRUNCATED: Response exceeded ${CHARACTER_LIMIT} characters. ` +
        `Use more specific queries or filters to reduce result size.]`;
    }

    return {
      content: [{ type: "text" as const, text }],
      isError: false,
    };
  } else {
    const errorMsg = result.stderr || result.error || "Unknown error";
    const actionableHint = getActionableHint(errorMsg);
    return {
      content: [{ type: "text" as const, text: `Error: ${errorMsg}${actionableHint}` }],
      isError: true,
    };
  }
}

function getActionableHint(errorMsg: string): string {
  const lower = errorMsg.toLowerCase();

  if (lower.includes("not found") || lower.includes("no such file")) {
    return "\n\nHint: Check that the file path exists. Use memvid_create to create a new .mv2 file.";
  }
  if (lower.includes("permission") || lower.includes("access denied")) {
    return "\n\nHint: Check file permissions. The file may be locked by another process.";
  }
  if (lower.includes("corrupt") || lower.includes("integrity")) {
    return "\n\nHint: Try memvid_doctor to diagnose and repair the file.";
  }
  if (lower.includes("timeout")) {
    return "\n\nHint: The operation timed out. Try with a smaller dataset or fewer files.";
  }
  return "";
}
