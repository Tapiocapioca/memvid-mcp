# memvid-mcp

MCP (Model Context Protocol) server for [memvid](https://github.com/olow304/memvid-unlocked) - a memory layer for AI agents.

This server wraps the memvid Rust CLI, exposing 40 tools for persistent memory management with hybrid search (lexical + vector), temporal indexing, knowledge graphs, and RAG capabilities.

## Use Cases

- **Agent Memory**: Give AI agents persistent memory across sessions with semantic search and temporal awareness
- **Document Intelligence**: Ingest documents, code, and web content with automatic entity extraction and fact tracking
- **Knowledge Base**: Build searchable knowledge bases with hybrid lexical/vector search and knowledge graph relationships
- **Audit & Compliance**: Track information sources with citation generation and audit reports
- **Session Replay**: Record and replay agent sessions for debugging and analysis

## Prerequisites

- **Node.js 18+**
- **memvid CLI** binary ([memvid-unlocked](https://github.com/olow304/memvid-unlocked) or official memvid)
- **Optional**: Embedder configuration for vector search (embedder.toml)
- **Optional**: LLM configuration for RAG (llm.toml)

## Installation

### From Source

```bash
git clone https://github.com/Tapiocapioca/memvid-mcp.git
cd memvid-mcp
npm install
npm run build
```

### Verify Installation

```bash
# Test the server starts
node dist/index.js
# Should output: "memvid-mcp server started"
# Press Ctrl+C to exit
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMVID_PATH` | `memvid` | Path to the memvid binary |
| `MEMVID_LOG_LEVEL` | `warning` | Log level: `debug`, `info`, `warning`, `error` |
| `MEMVID_VERBOSE` | `0` | Set to `1` for verbose CLI output |

### MCP Client Setup

#### VS Code (Copilot)

Add to your VS Code MCP settings:

```json
{
  "servers": {
    "memvid": {
      "command": "node",
      "args": ["/path/to/memvid-mcp/dist/index.js"],
      "env": {
        "MEMVID_PATH": "/path/to/memvid"
      }
    }
  }
}
```

#### Claude Desktop

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

#### Cursor

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

#### OpenCode

Add to `opencode.json`:

```json
{
  "mcp": {
    "memvid": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/AI/memvid-mcp/dist/index.js"],
      "env": {
        "MEMVID_PATH": "C:/Tools/bin/memvid.exe"
      }
    }
  }
}
```

## Security Considerations

### Path Validation

The server implements multiple layers of path security:

1. **Path Traversal Protection**: Blocks `..` patterns
2. **System Path Blocklist**: Prevents access to sensitive directories (`/etc/`, `/proc/`, `\windows\`, etc.)
3. **MCP Roots Validation**: Respects client-provided roots boundaries (when supported by client)

### Encryption

Memory files can be encrypted using AES-256-GCM:

```
memvid_lock { "file": "data.mv2", "output": "data.mv2e", "password": "secret" }
memvid_unlock { "file": "data.mv2e", "output": "data.mv2", "password": "secret" }
```

### Recommendations

- Store memory files in dedicated directories
- Use encrypted files (`.mv2e`) for sensitive data
- Configure MCP roots in your client to restrict file access
- Use separate memory files per project/context

## Available Tools (40)

### Lifecycle (5 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_create` | Create a new .mv2 memory file | write |
| `memvid_open` | Open and display file metadata | read-only |
| `memvid_stats` | Show detailed statistics (frame count, index sizes) | read-only |
| `memvid_verify` | Verify file integrity with optional deep check | read-only |
| `memvid_doctor` | Diagnose and repair corrupted indexes | destructive |

### Content Management (7 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_put` | Add content from file/directory with optional embeddings | write |
| `memvid_put_many` | Batch add with progress tracking | write |
| `memvid_view` | View frame content by ID | read-only |
| `memvid_update` | Replace frame content | destructive |
| `memvid_delete` | Delete a frame | destructive |
| `memvid_correct` | Amend frame with audit trail | write |
| `memvid_api_fetch` | Fetch URL content and add to memory | network |

### Search (5 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_find` | Hybrid/lexical/vector search | read-only |
| `memvid_vec_search` | Vector-only semantic search | read-only |
| `memvid_ask` | RAG question answering | read-only |
| `memvid_timeline` | Chronological frame view | read-only |
| `memvid_when` | Temporal search (find when something was mentioned) | read-only |

### Analysis (6 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_audit` | Generate audit report with citations | read-only |
| `memvid_debug_segment` | Debug internal index segments | read-only |
| `memvid_export` | Export to JSON/CSV/JSONL | write |
| `memvid_tables` | List internal SQLite tables | read-only |
| `memvid_schema` | Schema inference and summary | read-only |
| `memvid_models` | List available embedding models | read-only |

### Knowledge Graph (6 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_enrich` | NER entity extraction | write |
| `memvid_memories` | Memory card operations | read-only |
| `memvid_state` | Show current memory state | read-only |
| `memvid_facts` | Fact extraction and listing | read-only |
| `memvid_follow` | Traverse entity relationships | read-only |
| `memvid_who` | Entity lookup | read-only |

### Session Management (5 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_session` | Start/stop/list/replay sessions | write |
| `memvid_binding` | Memory binding operations | destructive |
| `memvid_status` | System status (version, model status) | read-only |
| `memvid_sketch` | SimHash sketch operations | write |
| `memvid_nudge` | Trigger background processing | write |

### Encryption (2 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_lock` | Encrypt memory file (AES-256-GCM) | write |
| `memvid_unlock` | Decrypt memory file | write |

### Utility (4 tools)

| Tool | Description | Annotations |
|------|-------------|-------------|
| `memvid_process_queue` | Process pending operations | write |
| `memvid_verify_single_file` | Verify single frame integrity | read-only |
| `memvid_config` | Show current configuration | read-only |
| `memvid_version` | Print version information | read-only |

## Example Workflows

### Basic Memory Setup

```
# 1. Create a new memory file
memvid_create { "file": "project.mv2" }

# 2. Ingest documentation
memvid_put { 
  "file": "project.mv2", 
  "input": "./docs", 
  "recursive": true,
  "embed": true  # Generate vector embeddings
}

# 3. Check statistics
memvid_stats { "file": "project.mv2" }
```

### Search and Retrieval

```
# Hybrid search (lexical + vector)
memvid_find { 
  "file": "project.mv2", 
  "query": "authentication flow", 
  "mode": "hybrid",
  "limit": 5 
}

# Semantic search only
memvid_vec_search { 
  "file": "project.mv2", 
  "query": "how to handle user sessions" 
}

# RAG question answering
memvid_ask { 
  "file": "project.mv2", 
  "question": "What authentication methods are supported?" 
}
```

### Knowledge Graph Operations

```
# Extract entities from all frames
memvid_enrich { "file": "project.mv2", "all": true }

# Look up an entity
memvid_who { "file": "project.mv2", "query": "OAuth" }

# Follow entity relationships
memvid_follow { 
  "file": "project.mv2", 
  "entity": "AuthService", 
  "hops": 2 
}
```

### Audit and Export

```
# Generate audit report with sources
memvid_audit { 
  "file": "project.mv2", 
  "query": "security requirements",
  "include_snippets": true 
}

# Export for backup
memvid_export { 
  "file": "project.mv2", 
  "output": "backup.json",
  "format": "json" 
}
```

### Session Recording

```
# Start recording a session
memvid_session { "file": "project.mv2", "start": "debug-session-1" }

# ... agent interactions ...

# Stop recording
memvid_session { "file": "project.mv2", "stop": true }

# Replay later
memvid_session { "file": "project.mv2", "replay": "debug-session-1" }
```

## Embedder Configuration

For vector search capabilities, create `~/.config/memvid/embedder.toml`:

```toml
[embedder]
provider = "openai"
model = "text-embedding-3-large"
api_key_env = "OPENAI_API_KEY"
dimensions = 3072
```

Or for A4F/OpenRouter compatible APIs:

```toml
[embedder]
provider = "openai"
model = "provider-3/text-embedding-3-large"
base_url = "https://api.a]4f.co/v1"
api_key_env = "A4F_API_KEY"
```

## Performance Characteristics

| Operation | Typical Latency | Notes |
|-----------|-----------------|-------|
| `memvid_create` | < 100ms | Creates empty SQLite database |
| `memvid_put` (single file) | 100-500ms | Depends on file size |
| `memvid_put` (with embed) | 500ms-2s | Includes API call for embedding |
| `memvid_find` (lexical) | < 50ms | Tantivy full-text search |
| `memvid_find` (hybrid) | 100-500ms | Combines lexical + vector |
| `memvid_ask` (RAG) | 1-5s | Includes LLM API call |

Timeouts are configured per operation type:
- Default: 120 seconds
- Heavy operations (batch put): 300 seconds
- RAG operations: 180 seconds

## Development

```bash
npm run dev    # Run with tsx (hot reload)
npm run build  # Compile TypeScript
npm start      # Run compiled version
npm run clean  # Remove dist/
```

## Troubleshooting

### Server won't start

1. Check Node.js version: `node --version` (requires 18+)
2. Verify build: `npm run build`
3. Check memvid binary: `memvid --version`

### "MEMVID_PATH not found"

Set the environment variable to the full path:
```bash
export MEMVID_PATH=/path/to/memvid
# or on Windows
set MEMVID_PATH=C:\path\to\memvid.exe
```

### Vector search returns no results

1. Check embeddings were generated: `memvid_stats` shows `vector_count > 0`
2. Verify embedder config: `memvid_config`
3. Re-ingest with embeddings: `memvid_put { ..., "embed": true }`

### Path validation errors

The server validates all paths against:
1. Path traversal patterns (`..`)
2. System directory blocklist
3. MCP roots (if client supports roots capability)

Ensure your paths are within allowed directories.

## License

MIT
