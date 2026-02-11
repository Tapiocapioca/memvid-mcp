import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import {
  filePathSchema,
  limitSchema,
  searchModeSchema,
  askModeSchema,
  formatToolResult,
  validateMv2Exists,
  TIMEOUTS,
  ANNOTATIONS,
} from "../types.js";

export function registerSearchTools(server: McpServer) {
  server.registerTool(
    "memvid_find",
    {
      title: "Search Memory",
      description: `Search in a memory file using hybrid, lexical, or vector search.

Search modes:
- hybrid (default): Combines lexical and vector search with RRF ranking
- lex: Full-text lexical search only (Tantivy)
- vec: Vector similarity search only (requires embeddings)

Args:
  file: Absolute path to .mv2 file
  query: Search query text
  mode: Search mode (hybrid, lex, vec)
  limit: Maximum results to return (default: 10)
  uri: Filter by exact URI match
  scope: Filter by URI prefix

Returns:
  {
    "results": [
      {
        "frame_id": number,
        "score": number,
        "content": string,
        "uri": string
      }
    ],
    "total": number,
    "engine": string
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        query: z.string().min(1).describe("Search query text"),
        mode: searchModeSchema,
        limit: limitSchema,
        uri: z.string().optional().describe("Filter results by exact URI match"),
        scope: z.string().optional().describe("Filter results by URI prefix (scope)")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query, mode, limit, uri, scope }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["find", file, query], { mode, limit, uri, scope });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_vec_search",
    {
      title: "Semantic Search",
      description: `Vector-only similarity search (semantic search).

Uses vector embeddings for semantic similarity matching.
Requires embeddings to be generated (use memvid_put with embed=true).

Args:
  file: Path to the .mv2 memory file
  query: Search query text (will be embedded)
  limit: Maximum results (default: 10)

Returns:
  Array of results with cosine similarity scores`,
      inputSchema: z.object({
        file: filePathSchema,
        query: z.string().min(1).describe("Search query text"),
        limit: limitSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query, limit }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["vec-search", file, query], { limit });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_ask",
    {
      title: "Ask Question (RAG)",
      description: `Ask a question using RAG (Retrieval-Augmented Generation).

Retrieves relevant context from memory and synthesizes an answer.
Requires LLM configuration in llm.toml.

Modes:
- hybrid: Combined lexical + semantic retrieval
- lex: Lexical retrieval only
- sem: Semantic retrieval only

Args:
  file: Path to the .mv2 memory file
  question: Question to ask
  top_k: Number of context documents to retrieve
  context_only: Return only retrieved context (no synthesis)
  mode: Retrieval mode

Returns:
  {
    "answer": string,
    "sources": [...],
    "confidence": number
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        question: z.string().min(1).describe("Question to ask"),
        top_k: z.number().int().positive().optional().describe("Number of context documents to retrieve"),
        context_only: z.boolean().optional().describe("Return only the retrieved context without synthesis"),
        mode: askModeSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, question, top_k, context_only, mode }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["ask", file, question], { top_k, context_only, mode });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.RAG });
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_timeline",
    {
      title: "View Timeline",
      description: `Show chronological timeline of frames.

Returns frames ordered by creation time.

Args:
  file: Path to the .mv2 memory file
  limit: Maximum entries to show
  reverse: Show newest first (default: oldest first)
  since: Filter from Unix timestamp (milliseconds)
  until: Filter until Unix timestamp (milliseconds)

Returns:
  Array of frames with timestamps`,
      inputSchema: z.object({
        file: filePathSchema,
        limit: z.number().int().positive().optional().describe("Maximum entries to show"),
        reverse: z.boolean().optional().describe("Show in reverse order (newest first)"),
        since: z.number().optional().describe("Filter from timestamp (Unix milliseconds)"),
        until: z.number().optional().describe("Filter until timestamp (Unix milliseconds)")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, limit, reverse, since, until }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["timeline", file], { limit, reverse, since, until });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_when",
    {
      title: "Temporal Search",
      description: `Temporal search - find when something was mentioned.

Searches for content and returns results with temporal context.

Args:
  file: Path to the .mv2 memory file
  query: Time-related search query
  limit: Maximum results (default: 10)

Returns:
  Results with timestamps showing when topics were mentioned`,
      inputSchema: z.object({
        file: filePathSchema,
        query: z.string().min(1).describe("Time-related query"),
        limit: limitSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query, limit }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["when", file, query], { limit });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
