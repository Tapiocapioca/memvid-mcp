import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeMemvid, buildArgs } from "../executor.js";
import { filePathSchema, outputPathSchema, formatToolResult, validateMv2Exists, fileExists, ANNOTATIONS } from "../types.js";

export function registerCryptoTools(server: McpServer) {
  server.registerTool(
    "memvid_lock",
    {
      title: "Encrypt Memory",
      description: `Encrypt a memory file.

Creates an encrypted .mv2e file using AES-256-GCM encryption.
The original .mv2 file is not modified.

Args:
  file: Path to the .mv2 file to encrypt
  output: Output path for the encrypted file (.mv2e)
  password: Encryption password (required for non-interactive use)

Returns:
  {
    "encrypted_file": string,
    "original_size": number,
    "encrypted_size": number
  }

Security:
  - Uses PBKDF2 key derivation
  - AES-256-GCM encryption
  - Password is not stored`,
      inputSchema: z.object({
        file: filePathSchema.describe("Path to the .mv2 file to encrypt"),
        output: outputPathSchema.describe("Output path for the encrypted file (.mv2e)"),
        password: z.string().optional().describe("Encryption password (required for non-interactive use)")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, output, password }) => {
      const mv2Error = validateMv2Exists(file);
      if (mv2Error) return mv2Error;

      const args = buildArgs(["lock", "--output", output, file], { password });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );

  server.registerTool(
    "memvid_unlock",
    {
      title: "Decrypt Memory",
      description: `Decrypt an encrypted memory file.

Decrypts a .mv2e file back to .mv2 format.

Args:
  file: Path to the encrypted .mv2e file
  output: Output path for the decrypted file (.mv2)
  password: Decryption password (required for non-interactive use)

Returns:
  {
    "decrypted_file": string,
    "success": boolean
  }

Errors:
  - Invalid password
  - Corrupted encrypted file`,
      inputSchema: z.object({
        file: filePathSchema.describe("Path to the encrypted .mv2e file"),
        output: outputPathSchema.describe("Output path for the decrypted file (.mv2)"),
        password: z.string().optional().describe("Decryption password (required for non-interactive use)")
      }).strict(),
      annotations: ANNOTATIONS.WRITE
    },
    async ({ file, output, password }) => {
      if (!fileExists(file)) {
        return {
          content: [{ type: "text" as const, text: `Error: Encrypted file not found: "${file}". Verify the .mv2e file exists at this path.` }],
          isError: true,
        };
      }

      const args = buildArgs(["unlock", "--output", output, file], { password });
      const result = await executeMemvid(args);
      return formatToolResult(result);
    }
  );
}
