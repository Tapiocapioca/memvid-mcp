import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import {
  filePathSchema,
  segmentTypeSchema,
  exportFormatSchema,
  modelTypeSchema,
  outputPathSchema,
  formatToolResult,
  TIMEOUTS,
  ANNOTATIONS,
} from "../types.js";

export function registerAnalysisTools(server: McpServer) {
  server.registerTool(
    "memvid_audit",
    {
      title: "Audit Report",
      description: `Generate an audit report with sources and citations.

Creates a detailed report showing which sources support a query.
Useful for fact-checking and citation generation.

Args:
  file: Path to the .mv2 memory file
  query: Query topic for the audit
  top_k: Number of sources to include
  include_snippets: Include text excerpts from sources

Returns:
  {
    "query": string,
    "sources": [
      {
        "frame_id": number,
        "relevance": number,
        "snippet": string,
        "uri": string
      }
    ]
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        query: z.string().min(1).describe("Query for the audit"),
        top_k: z.number().int().positive().optional().describe("Number of sources to include"),
        include_snippets: z.boolean().optional().describe("Include text snippets from sources")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query, top_k, include_snippets }) => {
      const args = buildArgs(["audit", file, query], { top_k, include_snippets });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.RAG });
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_debug_segment",
    {
      title: "Debug Segment",
      description: `Debug segment information (internal structure).

Shows internal index structure for debugging.

Segment types:
- lex: Lexical/full-text index (Tantivy)
- vec: Vector index (embeddings)
- time: Temporal index

Args:
  file: Path to the .mv2 memory file
  segment_type: Type of segment to debug

Returns:
  Internal segment structure and statistics`,
      inputSchema: z.object({
        file: filePathSchema,
        segment_type: segmentTypeSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, segment_type }) => {
      const args = ["debug-segment", file, segment_type];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_export",
    {
      title: "Export Data",
      description: `Export memory data to JSON, CSV, or JSONL format.

Args:
  file: Path to the .mv2 memory file
  output: Output file path
  format: Export format (json, csv, jsonl)
  frame_ids: Export only specific frame IDs (optional)

Returns:
  Export status and output file path`,
      inputSchema: z.object({
        file: filePathSchema,
        output: outputPathSchema,
        format: exportFormatSchema,
        frame_ids: z.array(z.number().int().nonnegative()).optional().describe("Export only specific frame IDs")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, output, format, frame_ids }) => {
      const args = buildArgs(["export", "--output", output, file], { format, frame_ids });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_tables",
    {
      title: "List Tables",
      description: `List internal SQLite tables and structures.

Shows database schema for advanced debugging.

Args:
  file: Path to the .mv2 memory file

Returns:
  List of tables with column definitions`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file }) => {
      const result = await executeMemvid(["tables", file]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_schema",
    {
      title: "Schema Info",
      description: `Schema operations - infer or show schema summary.

Can infer schemas from stored data or show existing schema definitions.

Args:
  file: Path to the .mv2 memory file
  infer: Infer schemas from stored data
  summary: Show schema summary

Returns:
  Schema information or inferred schemas`,
      inputSchema: z.object({
        file: filePathSchema,
        infer: z.boolean().optional().describe("Infer schemas from data"),
        summary: z.boolean().optional().describe("Show schema summary")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, infer, summary }) => {
      const args = buildArgs(["schema", file], { infer, summary });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_models",
    {
      title: "List Models",
      description: `List available embedding models.

Shows models configured in embedder.toml.

Model types:
- text: Text embedding models (e.g., OpenAI text-embedding-3-large)
- clip: Multimodal models for images
- whisper: Audio transcription models

Args:
  model_type: Filter by model type (optional)

Returns:
  List of available models with configuration`,
      inputSchema: z.object({
        model_type: modelTypeSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ model_type }) => {
      const args = buildArgs(["models"], { model_type });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
