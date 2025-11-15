# @deepagents/core

TypeScript implementation of Deep Agents - A powerful agent framework with file system tools, subagent spawning, and planning capabilities. Built on [Mastra](https://mastra.ai).

## Features

- **Pluggable Backends**: Multiple storage backends for file operations
  - `StateBackend`: In-memory storage (ephemeral)
  - `FilesystemBackend`: Disk-based storage (coming soon)
  - `StoreBackend`: Persistent storage with Mastra (coming soon)
  - `CompositeBackend`: Route operations to different backends (coming soon)

- **File System Tools**: Complete file operations with Mastra-compatible tools
  - List files and directories
  - Read file contents with line numbers
  - Write new files
  - Edit files with string replacement
  - Search file contents (grep)
  - Find files by pattern (glob)

- **Subagent Spawning**: Create isolated subagents for complex tasks (coming soon)

- **Planning Tools**: Todo list management for task tracking (coming soon)

## Installation

```bash
pnpm add @deepagents/core
```

## Quick Start

```typescript
import { StateBackend } from '@deepagents/core';

// Create a backend
const backend = new StateBackend();

// Write a file
await backend.write('/hello.ts', 'console.log("Hello, World!");');

// Read the file
const content = await backend.read('/hello.ts');
console.log(content);

// Edit the file
await backend.edit('/hello.ts', 'World', 'TypeScript');

// Search files
const matches = await backend.grep_raw('console');

// Find files by pattern
const files = await backend.glob_info('*.ts');
```

## Development Status

This is an early preview release. The library is under active development as part of the TypeScript migration from the Python version.

### Completed (Phase 1 & 2)
- ✅ Project structure and build configuration
- ✅ Type definitions (BackendProtocol, FileInfo, GrepMatch, etc.)
- ✅ Utility functions (formatting, path validation, string replacement)
- ✅ StateBackend implementation
- ✅ Comprehensive test suite for StateBackend

### In Progress
- 🚧 FilesystemBackend implementation
- 🚧 Mastra tool integrations
- 🚧 Agent factory (createDeepAgent)

### Planned
- 📋 StoreBackend for persistent storage
- 📋 CompositeBackend for routing
- 📋 Subagent spawning system
- 📋 Planning tools (TodoList)
- 📋 Full Mastra integration

## Documentation

For detailed migration plans and architecture, see:
- [Library Migration Plan](../../PLAN_LIBRARY_MIGRATION.md)
- [CLI Migration Plan](../../PLAN_CLI_MIGRATION.md)

## License

MIT
