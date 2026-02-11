import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, frameIdSchema, formatToolResult, validateMv2Exists, TIMEOUTS, ANNOTATIONS } from "../types.js";

export function registerKnowledgeTools(server: McpServer) {
  server.registerTool(
    "memvid_enrich",
    {
      title: "NER Enrichment",
      description: `Run Named Entity Recognition (NER) enrichment to extract entities.

Extracts entities like people, organizations, locations, dates from content.
Requires NER model configuration.

Args:
  file: Path to the .mv2 memory file
  all: Process all frames that haven't been enriched
  frame_id: Process a specific frame only

Returns:
  {
    "frames_processed": number,
    "entities_extracted": number
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        all: z.boolean().optional().describe("Process all pending frames"),
        frame_id: frameIdSchema.optional().describe("Specific frame ID to enrich")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, all, frame_id }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["enrich", file], { all, frame_id });
      const result = await executeMemvid(args, { timeout: TIMEOUTS.HEAVY });
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_memories",
    {
      title: "Memory Cards",
      description: `Memory card operations - list, stats, or filter by entity.

Memory cards are structured summaries of stored content.

Args:
  file: Path to the .mv2 memory file
  list: List all memory cards
  stats: Show memory card statistics
  entity: Filter cards by entity name

Returns:
  Memory cards matching the criteria`,
      inputSchema: z.object({
        file: filePathSchema,
        list: z.boolean().optional().describe("List all memory cards"),
        stats: z.boolean().optional().describe("Show memory statistics"),
        entity: z.string().optional().describe("Filter by entity name")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, list, stats, entity }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["memories", file], { list, stats, entity });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_state",
    {
      title: "Memory State",
      description: `State management - show current memory state.

Shows active session, binding status, and processing queue.

Args:
  file: Path to the .mv2 memory file
  show: Display current state

Returns:
  Current memory state information`,
      inputSchema: z.object({
        file: filePathSchema,
        show: z.boolean().optional().describe("Show current state")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, show }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["state", file], { show });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_facts",
    {
      title: "Extracted Facts",
      description: `Fact extraction - list facts or extract from frame.

Facts are structured assertions extracted from content.

Args:
  file: Path to the .mv2 memory file
  frame_id: Extract facts from a specific frame
  list: List all extracted facts

Returns:
  List of facts with source references`,
      inputSchema: z.object({
        file: filePathSchema,
        frame_id: frameIdSchema.optional().describe("Extract facts from specific frame"),
        list: z.boolean().optional().describe("List all extracted facts")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, frame_id, list }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["facts", file], { frame_id, list });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_follow",
    {
      title: "Follow Entity",
      description: `Follow entity relationships in the knowledge graph.

Traverses the entity graph starting from a given entity.

Args:
  file: Path to the .mv2 memory file
  entity: Starting entity name
  link: Relationship type to follow (default: "related")
  hops: Number of relationship hops to traverse (default: 2)

Returns:
  {
    "entity": string,
    "relationships": [
      {
        "target": string,
        "relation": string,
        "hop": number
      }
    ]
  }`,
      inputSchema: z.object({
        file: filePathSchema,
        entity: z.string().min(1).describe("Starting entity name"),
        link: z.string().optional().describe("Link type to follow (default: related)"),
        hops: z.number().int().positive().optional().describe("Number of relationship hops (default: 2)")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, entity, link, hops }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["follow", file, entity], { link, hops });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_who",
    {
      title: "Entity Lookup",
      description: `Entity lookup - find information about an entity.

Searches for entity mentions and related information.

Args:
  file: Path to the .mv2 memory file
  query: Entity name or search query

Returns:
  Entity information and mentions`,
      inputSchema: z.object({
        file: filePathSchema,
        query: z.string().min(1).describe("Entity name or query")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["who", file, query]);
      return formatToolResult(result);
    }
  );
}
