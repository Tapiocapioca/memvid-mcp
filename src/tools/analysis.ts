import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import {
  filePathSchema,
  segmentTypeSchema,
  exportFormatSchema,
  modelTypeSchema,
  formatToolResult,
  TIMEOUTS,
} from "../types.js";

export function registerAnalysisTools(server: McpServer) {
  server.tool(
    "memvid_audit",
    "Generate an audit report with sources and citations",
    {
      file: filePathSchema,
      query: z.string().min(1).describe("Query for the audit"),
      top_k: z.number().int().positive().optional().describe("Number of sources to include"),
      include_snippets: z.boolean().optional().describe("Include text snippets from sources"),
    },
    async ({ file, query, top_k, include_snippets }) => {
      const args = buildArgs(["audit", file, query], { top_k, include_snippets });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.RAG });
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_debug_segment",
    "Debug segment information (internal structure)",
    {
      file: filePathSchema,
      segment_type: segmentTypeSchema,
    },
    async ({ file, segment_type }) => {
      const args = ["debug-segment", file, segment_type];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_export",
    "Export memory data to JSON, CSV, or JSONL format",
    {
      file: filePathSchema,
      output: z.string().min(1).describe("Output file path"),
      format: exportFormatSchema,
      frame_ids: z.array(z.number().int().nonnegative()).optional().describe("Export only specific frame IDs"),
    },
    async ({ file, output, format, frame_ids }) => {
      const args = buildArgs(["export", "--output", output, file], { format, frame_ids });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_tables",
    "List internal tables and structures",
    {
      file: filePathSchema,
    },
    async ({ file }) => {
      const result = await executeMemvid(["tables", file]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_schema",
    "Schema operations - infer or show schema summary",
    {
      file: filePathSchema,
      infer: z.boolean().optional().describe("Infer schemas from data"),
      summary: z.boolean().optional().describe("Show schema summary"),
    },
    async ({ file, infer, summary }) => {
      const args = buildArgs(["schema", file], { infer, summary });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_models",
    "List available embedding models",
    {
      model_type: modelTypeSchema,
    },
    async ({ model_type }) => {
      const args = buildArgs(["models"], { model_type });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
