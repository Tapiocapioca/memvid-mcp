import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import {
  filePathSchema,
  frameIdSchema,
  inputPathSchema,
  formatToolResult,
  validateMv2Exists,
  validateInputExists,
  TIMEOUTS,
  ANNOTATIONS,
} from "../types.js";

export function registerWriteTools(server: McpServer) {
  server.registerTool(
    "memvid_put",
    {
      title: "Add Content",
      description: `Add content to a memory file from a file or directory.

IMPORTANT: memvid.exe runs on Windows. All paths MUST be Windows-style.
Linux paths (e.g., /tmp/file.md) will fail silently.

Supports: text, markdown, code, PDF, images (OCR).
Use embed=true for vector embeddings (semantic search).

Args:
  file: Windows path to .mv2 file (e.g., C:\\Tools\\memvid-data\\knowledge.mv2)
  input: Windows path to file/directory to ingest (e.g., C:\\Tools\\data\\readme.md)
  recursive: Include subdirectories when input is a directory
  parallel: Process files in parallel for faster ingestion
  embed: Generate vector embeddings (requires embedder.toml configuration)
  log: Path to log file for detailed operation logging

Returns:
  {
    "files_added": number,
    "frames_created": number,
    "embeddings_generated": number (if embed=true)
  }

Examples:
  - Add single file: file="C:\\Tools\\memvid-data\\kb.mv2", input="C:\\Tools\\data\\readme.md"
  - Add directory: input="C:\\Tools\\docs", recursive=true
  - With embeddings: input="C:\\Tools\\docs", embed=true

Common errors:
  - Empty response: input path does not exist on Windows filesystem
  - Use memvid_create first if the .mv2 file doesn't exist yet`,
      inputSchema: z.object({
        file: filePathSchema,
        input: inputPathSchema,
        recursive: z.boolean().optional().describe("Include subdirectories recursively"),
        parallel: z.boolean().optional().describe("Enable parallel processing"),
        embed: z.boolean().optional().describe("Generate embeddings for vector search (requires embedder.toml config)"),
        log: z.string().optional().describe("Log file path for detailed operation logging")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, input, recursive, parallel, embed, log }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;
      const inputError = validateInputExists(input);
      if (inputError) return inputError;

      const args = buildArgs(["put", "--input", input, file], { recursive, parallel, embed, log });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY });
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_put_many",
    {
      title: "Batch Add Content",
      description: `Batch add multiple files from a directory with progress tracking.

Optimized for large directories with commit batching.

Args:
  file: Path to the .mv2 memory file
  input: Path to input directory
  recursive: Include subdirectories
  parallel: Process files in parallel
  batch_size: Number of files per commit batch (default: 100)

Returns:
  JSON with batch processing statistics`,
      inputSchema: z.object({
        file: filePathSchema,
        input: inputPathSchema.describe("Input directory path"),
        recursive: z.boolean().optional().describe("Include subdirectories recursively"),
        parallel: z.boolean().optional().describe("Enable parallel processing"),
        batch_size: z.number().int().positive().optional().describe("Batch size for commits")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, input, recursive, parallel, batch_size }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;
      const inputError = validateInputExists(input);
      if (inputError) return inputError;

      const args = buildArgs(["put-many", "--input", input, file], { recursive, parallel, batch_size });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY });
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_view",
    {
      title: "View Frame",
      description: `View content of a specific frame by ID.

Args:
  file: Path to the .mv2 memory file
  frame_id: Frame ID (non-negative integer)
  raw: Show raw content without formatting/highlighting

Returns:
  {
    "frame_id": number,
    "content": string,
    "uri": string,
    "created_at": string,
    "metadata": object
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        frame_id: frameIdSchema,
        raw: z.boolean().optional().describe("Show raw content without formatting")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, frame_id, raw }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["view", file, String(frame_id)], { raw });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_update",
    {
      title: "Update Frame",
      description: `Update content of a specific frame.

Replaces the entire content of the frame. For partial corrections, use memvid_correct instead.

Args:
  file: Path to the .mv2 memory file
  frame_id: Frame ID to update
  content: New content for the frame

Returns:
  JSON with update confirmation`,
      inputSchema: z.object({
        file: filePathSchema,
        frame_id: frameIdSchema,
        content: z.string().min(1).describe("New content for the frame")
      }).strict(),
      annotations: ANNOTATIONS.DESTRUCTIVE
    },
    async ({ file, frame_id, content }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = ["update", file, String(frame_id), "--content", content];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_delete",
    {
      title: "Delete Frame",
      description: `Delete a specific frame from memory.

This operation is destructive and cannot be undone.

Args:
  file: Path to the .mv2 memory file
  frame_id: Frame ID to delete
  force: Skip confirmation prompt

Returns:
  JSON with deletion confirmation`,
      inputSchema: z.object({
        file: filePathSchema,
        frame_id: frameIdSchema,
        force: z.boolean().optional().describe("Force deletion without confirmation")
      }).strict(),
      annotations: { ...ANNOTATIONS.DESTRUCTIVE, idempotentHint: true }
    },
    async ({ file, frame_id, force }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["delete", file, String(frame_id)], { force });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_correct",
    {
      title: "Correct Frame",
      description: `Correct/amend content of a frame.

Creates a correction record preserving the original content for audit purposes.
Use this instead of update when you want to maintain history.

Args:
  file: Path to the .mv2 memory file
  frame_id: Frame ID to correct
  content: Corrected content

Returns:
  JSON with correction record ID`,
      inputSchema: z.object({
        file: filePathSchema,
        frame_id: frameIdSchema,
        content: z.string().min(1).describe("Corrected content")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, frame_id, content }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = ["correct", file, String(frame_id), "--content", content];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_api_fetch",
    {
      title: "Fetch from URL",
      description: `Fetch content from a URL and add to memory.

Supports web pages, APIs, and document URLs.

Args:
  file: Path to the .mv2 memory file
  url: URL to fetch content from
  title: Custom title for the fetched content (optional)

Returns:
  JSON with fetch status and created frame ID`,
      inputSchema: z.object({
        file: filePathSchema,
        url: z.string().url().describe("URL to fetch content from"),
        title: z.string().optional().describe("Custom title for the fetched content")
      }).strict(),
      annotations: ANNOTATIONS.NETWORK
    },
    async ({ file, url, title }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["api-fetch", file, url], { title });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
