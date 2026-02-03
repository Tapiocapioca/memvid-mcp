import { z } from "zod";

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
// Common Zod Schemas
// ============================================================================

export const filePathSchema = z
  .string()
  .min(1)
  .describe("Path to the .mv2 memory file");

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
// Timeout Configuration
// ============================================================================

export const TIMEOUTS = {
  DEFAULT: 120000,      // 2 minutes
  HEAVY: 300000,        // 5 minutes (put, put-many, enrich)
  RAG: 180000,          // 3 minutes (ask, audit)
} as const;

// ============================================================================
// Tool Result Helper
// ============================================================================

export function formatToolResult(result: CliResult): { content: Array<{ type: "text"; text: string }> } {
  if (result.success) {
    const text = typeof result.data === "string" 
      ? result.data 
      : JSON.stringify(result.data, null, 2);
    return {
      content: [{ type: "text", text }]
    };
  } else {
    const errorMsg = result.stderr || result.error || "Unknown error";
    return {
      content: [{ type: "text", text: `Error: ${errorMsg}` }]
    };
  }
}
