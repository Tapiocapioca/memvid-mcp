import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, formatToolResult, ANNOTATIONS } from "../types.js";

export function registerLifecycleTools(server: McpServer) {
  server.tool(
    "memvid_create",
    "Create a new .mv2 memory file",
    { file: filePathSchema },
    { ...ANNOTATIONS.WRITE, title: "Create Memory File" },
    async ({ file }) => {
      const result = await executeMemvid(["create", file]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_open",
    "Open and display information about a memory file",
    { file: filePathSchema },
    { ...ANNOTATIONS.READ_ONLY, title: "Open Memory File" },
    async ({ file }) => {
      const result = await executeMemvid(["open", file]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_stats",
    "Show statistics for a memory file",
    { file: filePathSchema },
    { ...ANNOTATIONS.READ_ONLY, title: "Memory Statistics" },
    async ({ file }) => {
      const result = await executeMemvid(["stats", file]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_verify",
    "Verify integrity of a memory file",
    {
      file: filePathSchema,
      deep: z.boolean().optional().describe("Perform deep verification (slower, more thorough)"),
    },
    { ...ANNOTATIONS.READ_ONLY, title: "Verify Integrity" },
    async ({ file, deep }) => {
      const args = buildArgs(["verify", file], { deep });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_doctor",
    "Diagnose and repair a memory file",
    {
      file: filePathSchema,
      rebuild_time_index: z.boolean().optional().describe("Rebuild the time index"),
      rebuild_lex_index: z.boolean().optional().describe("Rebuild the lexical (full-text) index"),
      rebuild_vec_index: z.boolean().optional().describe("Rebuild the vector index"),
      dry_run: z.boolean().optional().describe("Preview changes without applying them"),
    },
    { ...ANNOTATIONS.DESTRUCTIVE, title: "Diagnose & Repair" },
    async ({ file, rebuild_time_index, rebuild_lex_index, rebuild_vec_index, dry_run }) => {
      const args = buildArgs(["doctor", file], {
        rebuild_time_index,
        rebuild_lex_index,
        rebuild_vec_index,
        dry_run,
      });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
