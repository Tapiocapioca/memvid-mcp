import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, frameIdSchema, formatToolResult, TIMEOUTS } from "../types.js";

export function registerKnowledgeTools(server: McpServer) {
  server.tool(
    "memvid_enrich",
    "Run NER (Named Entity Recognition) enrichment to extract entities",
    {
      file: filePathSchema,
      all: z.boolean().optional().describe("Process all pending frames"),
      frame_id: frameIdSchema.optional().describe("Specific frame ID to enrich"),
    },
    async ({ file, all, frame_id }) => {
      const args = buildArgs(["enrich", file], { all, frame_id });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY });
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_memories",
    "Memory card operations - list, stats, or filter by entity",
    {
      file: filePathSchema,
      list: z.boolean().optional().describe("List all memory cards"),
      stats: z.boolean().optional().describe("Show memory statistics"),
      entity: z.string().optional().describe("Filter by entity name"),
    },
    async ({ file, list, stats, entity }) => {
      const args = buildArgs(["memories", file], { list, stats, entity });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_state",
    "State management - show current memory state",
    {
      file: filePathSchema,
      show: z.boolean().optional().describe("Show current state"),
    },
    async ({ file, show }) => {
      const args = buildArgs(["state", file], { show });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_facts",
    "Fact extraction - list facts or extract from frame",
    {
      file: filePathSchema,
      frame_id: frameIdSchema.optional().describe("Extract facts from specific frame"),
      list: z.boolean().optional().describe("List all extracted facts"),
    },
    async ({ file, frame_id, list }) => {
      const args = buildArgs(["facts", file], { frame_id, list });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_follow",
    "Follow entity relationships in the knowledge graph",
    {
      file: filePathSchema,
      entity: z.string().min(1).describe("Starting entity name"),
      link: z.string().optional().describe("Link type to follow (default: related)"),
      hops: z.number().int().positive().optional().describe("Number of relationship hops (default: 2)"),
    },
    async ({ file, entity, link, hops }) => {
      const args = buildArgs(["follow", file, entity], { link, hops });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_who",
    "Entity lookup - find information about an entity",
    {
      file: filePathSchema,
      query: z.string().min(1).describe("Entity name or query"),
    },
    async ({ file, query }) => {
      const result = await executeMemvid(["who", file, query]);
      return formatToolResult(result);
    }
  );
}
