import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, formatToolResult, ANNOTATIONS } from "../types.js";

export function registerSessionTools(server: McpServer) {
  server.tool(
    "memvid_session",
    "Session management - list, start, stop, or replay sessions",
    {
      file: filePathSchema,
      list: z.boolean().optional().describe("List all sessions"),
      start: z.string().optional().describe("Start a new session with this name"),
      stop: z.boolean().optional().describe("Stop the current session"),
      replay: z.string().optional().describe("Replay a session by ID"),
    },
    { ...ANNOTATIONS.WRITE, title: "Session Management" },
    async ({ file, list, start, stop, replay }) => {
      const args = buildArgs(["session", file], { list, start, stop, replay });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_binding",
    "Memory binding operations - show or unbind",
    {
      file: filePathSchema,
      show: z.boolean().optional().describe("Show current binding"),
      unbind: z.boolean().optional().describe("Unbind memory"),
    },
    { ...ANNOTATIONS.DESTRUCTIVE, title: "Memory Binding" },
    async ({ file, show, unbind }) => {
      const args = buildArgs(["binding", file], { show, unbind });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_status",
    "Show system status (version, NER model status)",
    {},
    { ...ANNOTATIONS.READ_ONLY, title: "System Status" },
    async () => {
      const result = await executeMemvid(["status"]);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_sketch",
    "Sketch operations (SimHash) - build or show stats",
    {
      file: filePathSchema,
      build: z.boolean().optional().describe("Build sketches for all frames"),
      stats: z.boolean().optional().describe("Show sketch statistics"),
    },
    { ...ANNOTATIONS.WRITE, title: "Build Sketches" },
    async ({ file, build, stats }) => {
      const args = buildArgs(["sketch", file], { build, stats });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_nudge",
    "Nudge operations - trigger background processing",
    {
      file: filePathSchema,
    },
    { ...ANNOTATIONS.WRITE, title: "Trigger Processing" },
    async ({ file }) => {
      const result = await executeMemvid(["nudge", file]);
      return formatToolResult(result);
    }
  );
}
