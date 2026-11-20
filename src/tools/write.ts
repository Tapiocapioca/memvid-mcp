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
      description: `Add content to a memory file from inline text (content) or a file path (input).

Provide either 'content' (inline text sent via stdin) or 'input' (absolute path to a file).
Supports: text, markdown, code, PDF, images.
Use embed=true for vector embeddings (semantic search).

Args:
  file: Absolute path to .mv2 file
  content: Inline text content to store (optional if input is provided)
  input: Absolute path to file to ingest (optional if content is provided)
  title: Title for the frame
  uri: Override the derived URI for the document
  tags: Array of key=value tags
  labels: Array of free-form labels
  track: Track name for the frame
  kind: Kind metadata for the frame
  embed: Generate vector embeddings (--embedding)
  update_existing: Replace any existing frame with the same URI
  dedup: Skip ingestion if identical content already exists`,
      inputSchema: z.object({
        file: filePathSchema,
        content: z.string().min(1).optional().describe("Inline text content to store (sent via stdin)"),
        input: inputPathSchema.optional().describe("Absolute path to a file to ingest"),
        title: z.string().optional().describe("Title for the stored document/frame"),
        uri: z.string().optional().describe("Override the derived URI for the document"),
        tags: z.array(z.string()).optional().describe("Tags in key=value form"),
        labels: z.array(z.string()).optional().describe("Free-form labels to attach"),
        track: z.string().optional().describe("Track name for the frame"),
        kind: z.string().optional().describe("Kind metadata for the frame"),
        embed: z.boolean().optional().describe("Generate embeddings for vector search (--embedding)"),
        update_existing: z.boolean().optional().describe("Replace any existing frame with the same URI"),
        dedup: z.boolean().optional().describe("Skip ingestion if identical content already exists")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, content, input, title, uri, tags, labels, track, kind, embed, update_existing, dedup }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;
      if (!content && !input) {
        return {
          content: [{ type: "text" as const, text: "Error: Provide either 'content' (inline text) or 'input' (file path)." }],
          isError: true,
        };
      }
      if (input) {
        const inputError = validateInputExists(input);
        if (inputError) return inputError;
      }

      const args = buildArgs(["put", file], {
        input,
        title,
        uri,
        track,
        kind,
        embedding: embed,
        update_existing,
        dedup,
      });
      if (tags) {
        for (const tag of tags) {
          args.push("--tag", tag);
        }
      }
      if (labels) {
        for (const label of labels) {
          args.push("--label", label);
        }
      }
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY, stdin: content });
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
        input: inputPathSchema.describe("Path to JSON file containing batch requests"),
        dedup: z.boolean().optional().describe("Skip duplicate content by BLAKE3 hash"),
        raw: z.boolean().optional().describe("Store raw binary content alongside extracted text")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, input, dedup, raw }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;
      const inputError = validateInputExists(input);
      if (inputError) return inputError;

      const args = buildArgs(["put-many", "--input", input, file], { dedup, raw });
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
        frame_id: frameIdSchema.optional(),
        uri: z.string().optional().describe("Frame URI to view (alternative to frame_id)"),
        raw: z.boolean().optional().describe("Show binary/raw output")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, frame_id, uri, raw }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["view", file], { frame_id, uri, binary: raw });
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
        input: inputPathSchema.optional().describe("Path to file with new payload"),
        title: z.string().optional().describe("Updated title for the frame"),
        set_uri: z.string().optional().describe("New URI for the frame")
      }).strict(),
      annotations: ANNOTATIONS.DESTRUCTIVE
    },
    async ({ file, frame_id, input, title, set_uri }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;
      if (input) {
        const inputError = validateInputExists(input);
        if (inputError) return inputError;
      }

      const args = buildArgs(["update", file], { frame_id, input, title, set_uri });
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

      const args = buildArgs(["delete", file], { frame_id, yes: true, force });
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
        statement: z.string().min(1).optional().describe("Correction statement to store with retrieval priority boost"),
        content: z.string().min(1).optional().describe("Alias for statement"),
        topics: z.string().optional().describe("Comma-separated topics for retrieval matching"),
        source: z.string().optional().describe("Source attribution for the correction"),
        boost: z.number().optional().describe("Retrieval boost factor (default: 2.0)")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, statement, content, topics, source, boost }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const text = statement ?? content;
      if (!text) {
        return {
          content: [{ type: "text" as const, text: "Error: Provide 'statement' (or 'content') for the correction." }],
          isError: true,
        };
      }
      const args = buildArgs(["correct", file, text], { topics, source, boost });
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
        config: inputPathSchema.describe("Path to the fetch configuration JSON file"),
        dry_run: z.boolean().optional().describe("Perform a dry run without writing to memory"),
        uri: z.string().optional().describe("Override base URI")
      }).strict(),
      annotations: ANNOTATIONS.NETWORK
    },
    async ({ file, config, dry_run, uri }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;
      const cfgError = validateInputExists(config);
      if (cfgError) return cfgError;

      const args = buildArgs(["api-fetch", file, config], { dry_run, uri });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
