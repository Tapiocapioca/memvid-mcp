import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import {
  filePathSchema,
  limitSchema,
  searchModeSchema,
  askModeSchema,
  formatToolResult,
  TIMEOUTS,
  ANNOTATIONS,
} from "../types.js";

export function registerSearchTools(server: McpServer) {
  server.tool(
    "memvid_find",
    "Search in a memory file using hybrid, lexical, or vector search",
    {
      file: filePathSchema,
      query: z.string().min(1).describe("Search query text"),
      mode: searchModeSchema,
      limit: limitSchema,
      uri: z.string().optional().describe("Filter results by exact URI match"),
      scope: z.string().optional().describe("Filter results by URI prefix (scope)"),
    },
    { ...ANNOTATIONS.READ_ONLY, title: "Search Memory" },
    async ({ file, query, mode, limit, uri, scope }) => {
      const args = buildArgs(["find", file, query], { mode, limit, uri, scope });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_vec_search",
    "Vector-only similarity search (semantic search)",
    {
      file: filePathSchema,
      query: z.string().min(1).describe("Search query text"),
      limit: limitSchema,
    },
    { ...ANNOTATIONS.READ_ONLY, title: "Semantic Search" },
    async ({ file, query, limit }) => {
      const args = buildArgs(["vec-search", file, query], { limit });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_ask",
    "Ask a question using RAG (Retrieval-Augmented Generation)",
    {
      file: filePathSchema,
      question: z.string().min(1).describe("Question to ask"),
      top_k: z.number().int().positive().optional().describe("Number of context documents to retrieve"),
      context_only: z.boolean().optional().describe("Return only the retrieved context without synthesis"),
      mode: askModeSchema,
    },
    { ...ANNOTATIONS.READ_ONLY, title: "Ask Question (RAG)" },
    async ({ file, question, top_k, context_only, mode }) => {
      const args = buildArgs(["ask", file, question], { top_k, context_only, mode });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.RAG });
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_timeline",
    "Show chronological timeline of frames",
    {
      file: filePathSchema,
      limit: z.number().int().positive().optional().describe("Maximum entries to show"),
      reverse: z.boolean().optional().describe("Show in reverse order (newest first)"),
      since: z.number().optional().describe("Filter from timestamp (Unix milliseconds)"),
      until: z.number().optional().describe("Filter until timestamp (Unix milliseconds)"),
    },
    { ...ANNOTATIONS.READ_ONLY, title: "View Timeline" },
    async ({ file, limit, reverse, since, until }) => {
      const args = buildArgs(["timeline", file], { limit, reverse, since, until });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_when",
    "Temporal search - find when something was mentioned",
    {
      file: filePathSchema,
      query: z.string().min(1).describe("Time-related query"),
      limit: limitSchema,
    },
    { ...ANNOTATIONS.READ_ONLY, title: "Temporal Search" },
    async ({ file, query, limit }) => {
      const args = buildArgs(["when", file, query], { limit });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
