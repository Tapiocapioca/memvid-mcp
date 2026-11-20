import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid } from "../executor.js";
import { filePathSchema, formatToolResult, validateMv2Exists, ANNOTATIONS } from "../types.js";

export function registerSessionTools(server: McpServer) {
  server.registerTool(
    "memvid_session",
    {
      title: "Session Management",
      description: `Session management - list, start, stop, or replay sessions.

Sessions track agent interactions for replay and analysis.

Args:
  file: Path to the .mv2 memory file
  list: List all recorded sessions
  start: Start a new session with this name
  stop: Stop the current active session
  replay: Replay a session by ID

Returns:
  Session information or operation status`,
      inputSchema: z.object({
        file: filePathSchema,
        list: z.boolean().optional().describe("List all sessions"),
        start: z.string().optional().describe("Start a new session with this name"),
        stop: z.boolean().optional().describe("Stop the current session"),
        replay: z.string().optional().describe("Replay a session by ID")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, list, start, stop, replay }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      if (start) {
        const result = await executeMemvid(["session", "start", file, "--name", start], { skipJson: true });
        return formatToolResult(result);
      }
      if (stop) {
        const result = await executeMemvid(["session", "end", file], { skipJson: true });
        return formatToolResult(result);
      }
      if (replay) {
        const result = await executeMemvid(["session", "replay", file, "--session", replay, "--format", "json"], { skipJson: true });
        return formatToolResult(result);
      }
      const result = await executeMemvid(["session", "list", file, "--format", "json"], { skipJson: true });
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_binding",
    {
      title: "Memory Binding",
      description: `Memory binding operations - show or unbind.

Bindings associate memory files with specific contexts or agents.

Args:
  file: Path to the .mv2 memory file
  show: Show current binding information
  unbind: Remove the current binding

Returns:
  Binding status or operation confirmation`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async ({ file }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["binding", file]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_status",
    {
      title: "System Status",
      description: `Show system status.

Displays:
- Memvid version
- NER model status
- Embedder configuration
- LLM configuration

Returns:
  System status information`,
      inputSchema: z.object({}).strict(),
      annotations: ANNOTATIONS.READ_ONLY
    },
    async () => {
      const result = await executeMemvid(["status", "--offline"]);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_sketch",
    {
      title: "Build Sketches",
      description: `Sketch operations using SimHash for near-duplicate detection.

Sketches enable fast similarity detection between frames.

Args:
  file: Path to the .mv2 memory file
  build: Build sketches for all frames without them
  stats: Show sketch statistics

Returns:
  Sketch build status or statistics`,
      inputSchema: z.object({
        file: filePathSchema,
        build: z.boolean().optional().describe("Build sketches for all frames"),
        stats: z.boolean().optional().describe("Show sketch statistics")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, build }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = build ? ["sketch", "build", file] : ["sketch", "info", file];
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_nudge",
    {
      title: "Trigger Processing",
      description: `Nudge operations - trigger background processing.

Forces processing of pending operations like:
- Index updates
- Embedding generation
- Entity extraction

Args:
  file: Path to the .mv2 memory file

Returns:
  Processing trigger confirmation`,
      inputSchema: z.object({
        file: filePathSchema
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const result = await executeMemvid(["nudge", file], { skipJson: true });
      return formatToolResult(result);
    }
  );
}
