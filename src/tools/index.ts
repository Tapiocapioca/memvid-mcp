import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLifecycleTools } from "./lifecycle.js";
import { registerWriteTools } from "./write.js";
import { registerSearchTools } from "./search.js";
import { registerAnalysisTools } from "./analysis.js";
import { registerKnowledgeTools } from "./knowledge.js";
import { registerSessionTools } from "./session.js";
import { registerCryptoTools } from "./crypto.js";
import { registerUtilityTools } from "./utility.js";

export function registerAllTools(server: McpServer): void {
  registerLifecycleTools(server);
  registerWriteTools(server);
  registerSearchTools(server);
  registerAnalysisTools(server);
  registerKnowledgeTools(server);
  registerSessionTools(server);
  registerCryptoTools(server);
  registerUtilityTools(server);
}
