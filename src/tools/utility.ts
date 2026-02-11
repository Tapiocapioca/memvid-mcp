import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid } from "../executor.js";
import { filePathSchema, frameIdSchema, formatToolResult, validateMv2Exists, ANNOTATIONS } from "../types.js";

export function registerUtilityTools(server: McpServer) {
  server.registerTool(
    "memvid_process_queue",
    {
      title: "Process Queue",
      description: `Process pending operations queue.

Executes any queued operations such as:
- Deferred index updates
- Batch embedding generation
- Scheduled enrichments

Args:
  file: Path to the .mv2 memory file

Returns:
  {
    "operations_processed": number,
    "errors": number
  }`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["process-queue", file]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_verify_single_file",
    {
      title: "Verify Frame",
      description: `Verify integrity of a single frame.

Checks:
- Content checksum
- Metadata integrity
- Index consistency

Args:
  file: Path to the .mv2 memory file
  frame_id: Frame ID to verify

Returns:
  {
    "frame_id": number,
    "valid": boolean,
    "issues": []
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        frame_id: frameIdSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, frame_id }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["verify-single-file", file, String(frame_id)]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_config",
    {
      title: "Show Config",
      description: `Show current configuration.

Displays configuration from:
- embedder.toml (embedding model settings)
- llm.toml (LLM settings for RAG)
- Environment variables

Returns:
  {
    "memvid_path": string,
    "config_dir": string,
    "embedder": {...},
    "llm": {...}
  }`,
      inputSchema: z.object({}).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async () => {
      const result = await executeMemvid(["config"]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_version",
    {
      title: "Version Info",
      description: `Print memvid version information.

Returns:
  Version string (e.g., "memvid 0.1.0")`,
      inputSchema: z.object({}).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async () => {
      const result = await executeMemvid(["version"], { skipJson: true });
      return formatToolResult(result);
    }
  );
}
