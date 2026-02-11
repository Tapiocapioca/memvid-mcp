import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, formatToolResult, validateMv2Exists, ANNOTATIONS } from "../types.js";

export function registerLifecycleTools(server: McpServer) {
  server.registerTool(
    "memvid_create",
    {
      title: "Create Memory File",
      description: `Create a new .mv2 memory file for storing AI agent memories.

IMPORTANT: memvid.exe runs on Windows. The path MUST be a Windows-style path.

The .mv2 format is a SQLite-based memory store supporting:
- Full-text lexical search (Tantivy)
- Vector similarity search (embeddings)
- Temporal indexing

Args:
  file: Windows path where the .mv2 file will be created (e.g., C:\\Tools\\memvid-data\\knowledge.mv2)

Returns:
  JSON with creation status and file path

Errors:
  - File already exists at that path
  - Invalid path or permission denied
  - Path outside allowed roots
  - Linux paths (e.g., /tmp/file.mv2) will fail — use Windows paths`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file }) => {
      const result = await executeMemvid(["create", file]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_open",
    {
      title: "Open Memory File",
      description: `Open and display information about a memory file.

Returns metadata including:
- Frame count
- Index sizes (lexical, vector, temporal)
- Creation date
- Last modified date

Args:
  file: Path to the .mv2 memory file

Returns:
  JSON with file metadata and statistics`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["open", file]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_stats",
    {
      title: "Memory Statistics",
      description: `Show detailed statistics for a memory file.

Returns:
  {
    "frame_count": number,
    "vector_count": number,
    "lex_index_bytes": number,
    "vec_index_bytes": number,
    "time_index_bytes": number,
    "total_size_bytes": number
  }

Args:
  file: Path to the .mv2 memory file`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["stats", file]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_verify",
    {
      title: "Verify Integrity",
      description: `Verify integrity of a memory file.

Checks:
- SQLite database integrity
- Index consistency
- Frame checksums (with deep=true)

Args:
  file: Path to the .mv2 memory file
  deep: Perform thorough verification including all frame checksums (slower)

Returns:
  JSON with verification results and any issues found`,
      inputSchema: z.object({
        file: filePathSchema,
        deep: z.boolean().optional().describe("Perform deep verification (slower, more thorough)")
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file, deep }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["verify", file], { deep });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_doctor",
    {
      title: "Diagnose & Repair",
      description: `Diagnose and repair a memory file.

Can rebuild corrupted indexes:
- Time index: chronological ordering
- Lexical index: full-text search (Tantivy)
- Vector index: similarity search

Args:
  file: Path to the .mv2 memory file
  rebuild_time_index: Rebuild temporal index
  rebuild_lex_index: Rebuild full-text search index
  rebuild_vec_index: Rebuild vector similarity index
  dry_run: Preview changes without applying

Returns:
  JSON with diagnosis results and repairs performed`,
      inputSchema: z.object({
        file: filePathSchema,
        rebuild_time_index: z.boolean().optional().describe("Rebuild the time index"),
        rebuild_lex_index: z.boolean().optional().describe("Rebuild the lexical (full-text) index"),
        rebuild_vec_index: z.boolean().optional().describe("Rebuild the vector index"),
        dry_run: z.boolean().optional().describe("Preview changes without applying them")
      }).strict(),
      annotations: ANNOTATIONS.DESTRUCTIVE
    },
    async ({ file, rebuild_time_index, rebuild_lex_index, rebuild_vec_index, dry_run }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["doctor", file], {
        rebuild_time_index,
        rebuild_lex_index,
        rebuild_vec_index,
        dry_run
      });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
