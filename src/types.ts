import { z } from "zod";
import { existsSync } from "fs";
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
  isSpawnError?: boolean;
  spawnErrorCode?: string;
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

function isLinuxPath(path: string): boolean {
  if (path.startsWith("/")) {
    if (/^\/[A-Za-z]:/.test(path)) return false;
    return true;
  }
  return false;
}

function isWindowsAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(path);
}

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
// Path Format Validation (actionable errors for LLMs)
// ============================================================================

function validatePathFormat(path: string, label: string): string | null {
  if (isLinuxPath(path)) {
    const filename = path.split("/").pop() || path;
    return (
      `Error: "${path}" appears to be a Linux/Unix path, but memvid.exe runs on Windows. ` +
      `Use a Windows path instead (e.g., C:\\Users\\...\\${filename} or C:\\Tools\\memvid-data\\${filename}). ` +
      `If calling from WSL, convert paths using: $(wslpath -w /your/linux/path)`
    );
  }

  if (!isPathSafe(path)) {
    return (
      `Error: ${label} "${path}" is not allowed. Possible reasons: ` +
      `path traversal (".."), system directory, or path outside allowed roots. ` +
      `Use a path within your project directories.`
    );
  }

  return null;
}

// ============================================================================
// Common Zod Schemas
// ============================================================================

const pathDescription = (purpose: string) =>
  `${purpose}. IMPORTANT: memvid.exe runs on Windows — use Windows-style paths ` +
  `(e.g., C:\\Tools\\memvid-data\\knowledge.mv2). Linux paths like /tmp/... will fail silently.`;

export const filePathSchema = z
  .string()
  .min(1, "File path is required")
  .refine((p) => !isLinuxPath(p), {
    message:
      "This looks like a Linux path but memvid.exe runs on Windows. " +
      "Use Windows paths like C:\\Tools\\memvid-data\\file.mv2",
  })
  .refine(isPathSafe, {
    message: "Path contains unsafe patterns (path traversal or system paths not allowed)",
  })
  .describe(pathDescription("Path to the .mv2 memory file"));

export const outputPathSchema = z
  .string()
  .min(1, "Output path is required")
  .refine((p) => !isLinuxPath(p), {
    message:
      "This looks like a Linux path but memvid.exe runs on Windows. " +
      "Use Windows paths like C:\\Tools\\output\\file.json",
  })
  .refine(isPathSafe, {
    message: "Output path contains unsafe patterns",
  })
  .describe(pathDescription("Output file path"));

export const inputPathSchema = z
  .string()
  .min(1, "Input path is required")
  .refine((p) => !isLinuxPath(p), {
    message:
      "This looks like a Linux path but memvid.exe runs on Windows. " +
      "Use Windows paths like C:\\Tools\\data\\input.md",
  })
  .refine(isPathSafe, {
    message: "Input path contains unsafe patterns",
  })
  .describe(pathDescription("Input file or directory path"));

// ============================================================================
// File Existence Helpers (pre-validation before calling memvid.exe)
// ============================================================================

/** Converts C:\path to /mnt/c/path for WSL filesystem access */
function toWslPath(winPath: string): string {
  if (isWindowsAbsolutePath(winPath)) {
    const drive = winPath[0].toLowerCase();
    const rest = winPath.slice(2).replace(/\\/g, "/");
    return `/mnt/${drive}${rest}`;
  }
  return winPath;
}

export function fileExists(path: string): boolean {
  if (existsSync(path)) return true;
  if (isWindowsAbsolutePath(path)) {
    return existsSync(toWslPath(path));
  }
  return false;
}

/** Pre-validates .mv2 file existence, returns actionable error or null */
export function validateMv2Exists(filePath: string): { content: { type: "text"; text: string }[]; isError: true } | null {
  if (!fileExists(filePath)) {
    return {
      content: [{
        type: "text" as const,
        text:
          `Error: Memory file not found: "${filePath}". ` +
          `Make sure the .mv2 file exists at this path. ` +
          `To create a new memory file, use memvid_create first. ` +
          (isWindowsAbsolutePath(filePath)
            ? `The path looks correct (Windows format).`
            : `Hint: memvid.exe runs on Windows — use Windows paths like C:\\Tools\\memvid-data\\file.mv2`),
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
          (isWindowsAbsolutePath(inputPath)
            ? `Verify the path exists on the Windows filesystem.`
            : `Hint: memvid.exe runs on Windows — use Windows paths like C:\\Tools\\data\\input.md. ` +
              `Linux paths like /tmp/... are not accessible to memvid.exe.`),
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
            "Warning: memvid.exe returned no output. This usually means:\n" +
            "1. The input file/path was not found (check that the path exists on Windows)\n" +
            "2. The .mv2 file is empty or corrupted (try memvid_verify)\n" +
            "3. The query returned no results\n\n" +
            "Tip: memvid.exe runs on Windows — all paths must be Windows-style (e.g., C:\\Tools\\memvid-data\\file.mv2).",
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
    return "\n\nHint: Check that the file path exists on Windows. Use memvid_create to create a new .mv2 file.";
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
