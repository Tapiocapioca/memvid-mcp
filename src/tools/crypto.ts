import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, formatToolResult } from "../types.js";

export function registerCryptoTools(server: McpServer) {
  server.tool(
    "memvid_lock",
    "Encrypt a memory file (creates .mv2e encrypted file)",
    {
      file: filePathSchema.describe("Path to the .mv2 file to encrypt"),
      output: z.string().min(1).describe("Output path for the encrypted file (.mv2e)"),
      password: z.string().optional().describe("Encryption password (required for non-interactive use)"),
    },
    async ({ file, output, password }) => {
      const args = buildArgs(["lock", "--output", output, file], { password });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.tool(
    "memvid_unlock",
    "Decrypt an encrypted memory file",
    {
      file: filePathSchema.describe("Path to the encrypted .mv2e file"),
      output: z.string().min(1).describe("Output path for the decrypted file (.mv2)"),
      password: z.string().optional().describe("Decryption password (required for non-interactive use)"),
    },
    async ({ file, output, password }) => {
      const args = buildArgs(["unlock", "--output", output, file], { password });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
