# memvid-mcp

MCP (Model Context Protocol) server for the [memvid](https://github.com/memvid/memvid) CLI - a memory layer for AI agents.

This server wraps the memvid Rust CLI binary, exposing all 40 commands as MCP tools. Compatible with both `memvid` (official) and `memvid-unlocked` binaries.

## Prerequisites

- Node.js 18+
- memvid CLI binary installed and accessible

## Installation

```bash
git clone https://github.com/user/memvid-mcp.git
cd memvid-mcp
npm install
npm run build
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MEMVID_PATH` | `memvid` | Path to the memvid binary |
| `MEMVID_TIMEOUT` | `120000` | Default command timeout (ms) |
| `MEMVID_VERBOSE` | `0` | Set to `1` for verbose logging |

## MCP Client Setup

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memvid": {
      "command": "node",
      "args": ["C:/AI/memvid-mcp/dist/index.js"],
      "env": {
        "MEMVID_PATH": "C:/Tools/bin/memvid.exe"
      }
    }
  }
}
```

### Cursor

Add to MCP settings:

```json
{
  "memvid": {
    "command": "node",
    "args": ["/path/to/memvid-mcp/dist/index.js"],
    "env": {
      "MEMVID_PATH": "/path/to/memvid"
    }
  }
}
```

## Available Tools (40)

### Lifecycle (5)
| Tool | Description |
|------|-------------|
| `memvid_create` | Create a new .mv2 memory file |
| `memvid_open` | Open and display file information |
| `memvid_stats` | Show statistics |
| `memvid_verify` | Verify file integrity |
| `memvid_doctor` | Diagnose and repair |

### Write Operations (7)
| Tool | Description |
|------|-------------|
| `memvid_put` | Add content from file/directory |
| `memvid_put_many` | Batch add with progress |
| `memvid_view` | View frame content |
| `memvid_update` | Update frame content |
| `memvid_delete` | Delete a frame |
| `memvid_correct` | Correct/amend a frame |
| `memvid_api_fetch` | Fetch URL and add |

### Search (5)
| Tool | Description |
|------|-------------|
| `memvid_find` | Hybrid/lexical/vector search |
| `memvid_vec_search` | Vector-only similarity search |
| `memvid_ask` | RAG question answering |
| `memvid_timeline` | Chronological view |
| `memvid_when` | Temporal search |

### Analysis (6)
| Tool | Description |
|------|-------------|
| `memvid_audit` | Generate audit report |
| `memvid_debug_segment` | Debug internal segments |
| `memvid_export` | Export to JSON/CSV/JSONL |
| `memvid_tables` | List internal tables |
| `memvid_schema` | Schema operations |
| `memvid_models` | List available models |

### Knowledge Graph (6)
| Tool | Description |
|------|-------------|
| `memvid_enrich` | NER entity extraction |
| `memvid_memories` | Memory card operations |
| `memvid_state` | State management |
| `memvid_facts` | Fact extraction |
| `memvid_follow` | Follow entity relationships |
| `memvid_who` | Entity lookup |

### Session (5)
| Tool | Description |
|------|-------------|
| `memvid_session` | Session management |
| `memvid_binding` | Memory binding |
| `memvid_status` | System status |
| `memvid_sketch` | SimHash sketches |
| `memvid_nudge` | Trigger background processing |

### Crypto (2)
| Tool | Description |
|------|-------------|
| `memvid_lock` | Encrypt file |
| `memvid_unlock` | Decrypt file |

### Utility (4)
| Tool | Description |
|------|-------------|
| `memvid_process_queue` | Process pending operations |
| `memvid_verify_single_file` | Verify single frame |
| `memvid_config` | Show configuration |
| `memvid_version` | Print version |

## Example Workflow

```
1. memvid_create { "file": "project.mv2" }
2. memvid_put { "file": "project.mv2", "input": "./docs", "recursive": true }
3. memvid_find { "file": "project.mv2", "query": "authentication", "limit": 5 }
4. memvid_ask { "file": "project.mv2", "question": "How does the auth system work?" }
5. memvid_export { "file": "project.mv2", "output": "backup.json" }
```

## Development

```bash
npm run dev    # Run with tsx (development)
npm run build  # Compile TypeScript
npm start      # Run compiled version
```

## License

MIT
