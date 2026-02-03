import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, frameIdSchema, inputPathSchema, formatToolResult, TIMEOUTS, ANNOTATIONS } from "../types.js";

export function registerWriteTools(server: McpServer) {
  server.tool(
    "memvid_put",
    "Add content to a memory file from a file or directory",
    {
      file: filePathSchema,
      input: inputPathSchema,
      recursive: z.boolean().optional().describe("Include subdirectories recursively"),
      parallel: z.boolean().optional().describe("Enable parallel processing"),
      log: z.string().optional().describe("Log file path for detailed operation logging"),
    },
    { ...ANNOTATIONS.WRITE, title: "Add Content" },
    async ({ file, input, recursive, parallel, log }) => {
      const args = buildArgs(["put", "--input", input, file], { recursive, parallel, log });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY });
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_put_many",
    "Batch add multiple files from a directory with progress tracking",
    {
      file: filePathSchema,
      input: inputPathSchema.describe("Input directory path"),
      recursive: z.boolean().optional().describe("Include subdirectories recursively"),
      parallel: z.boolean().optional().describe("Enable parallel processing"),
      batch_size: z.number().int().positive().optional().describe("Batch size for commits"),
    },
    { ...ANNOTATIONS.WRITE, title: "Batch Add Content" },
    async ({ file, input, recursive, parallel, batch_size }) => {
      const args = buildArgs(["put-many", "--input", input, file], { recursive, parallel, batch_size });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY });
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_view",
    "View content of a specific frame",
    {
      file: filePathSchema,
      frame_id: frameIdSchema,
      raw: z.boolean().optional().describe("Show raw content without formatting"),
    },
    { ...ANNOTATIONS.READ_ONLY, title: "View Frame" },
    async ({ file, frame_id, raw }) => {
      const args = buildArgs(["view", file, String(frame_id)], { raw });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_update",
    "Update content of a specific frame",
    {
      file: filePathSchema,
      frame_id: frameIdSchema,
      content: z.string().min(1).describe("New content for the frame"),
    },
    { ...ANNOTATIONS.DESTRUCTIVE, title: "Update Frame" },
    async ({ file, frame_id, content }) => {
      const args = ["update", file, String(frame_id), "--content", content];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_delete",
    "Delete a specific frame",
    {
      file: filePathSchema,
      frame_id: frameIdSchema,
      force: z.boolean().optional().describe("Force deletion without confirmation"),
    },
    { ...ANNOTATIONS.DESTRUCTIVE, idempotentHint: true, title: "Delete Frame" },
    async ({ file, frame_id, force }) => {
      const args = buildArgs(["delete", file, String(frame_id)], { force });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_correct",
    "Correct/amend content of a frame (creates correction record)",
    {
      file: filePathSchema,
      frame_id: frameIdSchema,
      content: z.string().min(1).describe("Corrected content"),
    },
    { ...ANNOTATIONS.WRITE, title: "Correct Frame" },
    async ({ file, frame_id, content }) => {
      const args = ["correct", file, String(frame_id), "--content", content];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_api_fetch",
    "Fetch content from a URL and add to memory",
    {
      file: filePathSchema,
      url: z.string().url().describe("URL to fetch content from"),
      title: z.string().optional().describe("Custom title for the fetched content"),
    },
    { ...ANNOTATIONS.NETWORK, title: "Fetch from URL" },
    async ({ file, url, title }) => {
      const args = buildArgs(["api-fetch", file, url], { title });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
