import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid } from "../executor.js";
import { filePathSchema, frameIdSchema, formatToolResult } from "../types.js";

export function registerUtilityTools(server: McpServer) {
  server.tool(
    "memvid_process_queue",
    "Process pending operations queue",
    {
      file: filePathSchema,
    },
    async ({ file }) => {
      const result = await executeMemvid(["process-queue", file]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_verify_single_file",
    "Verify integrity of a single frame",
    {
      file: filePathSchema,
      frame_id: frameIdSchema,
    },
    async ({ file, frame_id }) => {
      const result = await executeMemvid(["verify-single-file", file, String(frame_id)]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_config",
    "Show current configuration (embedder settings, paths)",
    {},
    async () => {
      const result = await executeMemvid(["config"]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_version",
    "Print memvid version information",
    {},
    async () => {
      const result = await executeMemvid(["version"], { skipJson: true });
      return formatToolResult(result);
    }
  );
}
