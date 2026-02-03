import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RootsListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerAllTools } from "./tools/index.js";
import { initializeRoots, handleRootsChanged } from "./roots.js";
import { log } from "./types.js";

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "memvid-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.server.oninitialized = async () => {
    log("info", "Server initialized, requesting roots from client");

    await initializeRoots(async () => {
      return server.server.listRoots();
    });
  };

  server.server.setNotificationHandler(
    RootsListChangedNotificationSchema,
    async () => {
      log("info", "Received roots/list_changed notification");
      await handleRootsChanged(async () => {
        return server.server.listRoots();
      });
    }
  );

  registerAllTools(server);

  return server;
}
