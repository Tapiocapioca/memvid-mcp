import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import {
  filePathSchema,
  exportFormatSchema,
  modelTypeSchema,
  formatToolResult,
  validateMv2Exists,
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
        mode: z.enum(["lex", "sem", "hybrid"]).optional().describe("Retrieval mode")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query, top_k, mode }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["audit", file, query], { top_k, mode, format: "json" });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.RAG, skipJson: true });
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
        segment_id: z.number().int().nonnegative().describe("Vector segment ID to inspect"),
        max_bytes: z.number().int().positive().optional().describe("Maximum bytes to dump (default: 256)"),
        hex_dump: z.boolean().optional().describe("Output hex dump")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, segment_id, max_bytes, hex_dump }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["debug-segment", file], { segment_id, max_bytes, hex_dump });
      const result = await executeMemvid(args, { skipJson: true });
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
        format: exportFormatSchema,
        entity: z.string().optional().describe("Filter by entity"),
        predicate: z.string().optional().describe("Filter by predicate/slot"),
        with_provenance: z.boolean().optional().describe("Include provenance metadata")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, format, entity, predicate, with_provenance }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["export", file], { format, entity, predicate, with_provenance });
      const result = await executeMemvid(args, { skipJson: true });
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
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["tables", "list", file]);
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
    async ({ file, infer }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = infer ? ["schema", "infer", file] : ["schema", "list", file];
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
      const cliType = model_type === "text" ? "embedding" : model_type;
      const args = buildArgs(["models", "list"], { model_type: cliType });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
