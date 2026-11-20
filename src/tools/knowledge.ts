import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, formatToolResult, validateMv2Exists, TIMEOUTS, ANNOTATIONS } from "../types.js";

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
        engine: z.enum(["rules", "llm", "candle", "openai", "claude", "gemini", "xai", "groq", "mistral"]).optional().describe("Enrichment engine (default: rules)"),
        force: z.boolean().optional().describe("Re-enrich all frames, ignoring previous records"),
        all: z.boolean().optional().describe("Alias for force")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, engine, force, all }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["enrich", file], { engine, force: force ?? all });
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
        entity: z.string().optional().describe("Filter by entity name"),
        slot: z.string().optional().describe("Filter by slot")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, entity, slot }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["memories", file], { entity, slot });
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
        entity: z.string().min(1).describe("Entity to query"),
        slot: z.string().optional().describe("Specific slot to query"),
        at_time: z.number().optional().describe("Unix timestamp for point-in-time query")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, entity, slot, at_time }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["state", file], { entity, slot, at_time });
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
        entity: z.string().optional().describe("Filter by entity"),
        predicate: z.string().optional().describe("Filter by predicate/slot"),
        value: z.string().optional().describe("Filter by value"),
        history: z.boolean().optional().describe("Include superseded values")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, entity, predicate, value, history }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["facts", file], { entity, predicate, value, history });
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

      const args = buildArgs(["follow", "traverse", file], { start: entity, link, hops });
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
        query: z.string().optional().describe("Optional entity name to filter entities in Logic-Mesh; if omitted shows active writer lock info")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, query }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = query ? buildArgs(["follow", "entities", file], { query }) : ["who", file];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
