# @deepagents/core

TypeScript implementation of Deep Agents - A powerful agent framework with file system tools, subagent spawning, and planning capabilities. Built on [Mastra](https://mastra.ai).

## Features

- **Pluggable Backends**: Multiple storage backends for file operations
  - `StateBackend`: In-memory storage (ephemeral) ✅
  - `FilesystemBackend`: Disk-based storage with virtual mode ✅
  - `CompositeBackend`: Route operations to different backends ✅
  - `StoreBackend`: Persistent storage with Mastra (coming soon)

- **Mastra-Compatible Tools**: Full suite of tools for AI agents ✅
  - Filesystem tools (ls, readFile, writeFile, editFile, grepSearch, globSearch)
  - Planning tools (writeTodos for task management)
  - Subagent tool (task for delegating complex work)

- **Agent Factory**: Simple API to create fully-configured agents ✅
  - `createDeepAgent()` - One function to create agents with all tools
  - Support for multiple LLM providers (Anthropic, OpenAI, X.AI)
  - Configurable backends, tools, and system prompts

- **Subagent Spawning**: Create isolated subagents for complex tasks ✅
  - Custom subagent definitions
  - Context isolation
  - Parallel task execution

## Installation

```bash
pnpm add @deepagents/core @mastra/core
```

## Quick Start

```typescript
import { createDeepAgent, StateBackend } from '@deepagents/core';

// Create an agent with all tools
const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  backend: new StateBackend(),
});

// Use the agent
const response = await agent.generate({
  messages: [
    {
      role: 'user',
      content: 'Create a TypeScript file called hello.ts with a greeting function',
    },
  ],
});

console.log(response.text);
```

## Usage Examples

### Basic Agent (In-Memory Storage)

```typescript
import { createDeepAgent, StateBackend } from '@deepagents/core';

const agent = createDeepAgent({
  model: 'sonnet', // Shorthand for claude-sonnet-4-5-20250929
  backend: new StateBackend(),
});

const result = await agent.generate({
  messages: [{ role: 'user', content: 'List all TypeScript files' }],
});
```

### Agent with Filesystem Backend

```typescript
import { createDeepAgent, FilesystemBackend } from '@deepagents/core';

const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  backend: new FilesystemBackend({
    rootDir: './my-project',
    virtualMode: true, // Sandboxed to rootDir
  }),
  system_prompt: 'You are a helpful coding assistant...',
});
```

### Hybrid Storage with CompositeBackend

```typescript
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  FilesystemBackend,
} from '@deepagents/core';

const agent = createDeepAgent({
  model: 'sonnet',
  backend: new CompositeBackend({
    default: new StateBackend(), // Temporary files
    routes: {
      '/workspace/': new FilesystemBackend({
        rootDir: './workspace',
        virtualMode: true,
      }), // Persistent files
    },
  }),
});
```

### Agent with X.AI (Grok)

```typescript
import { createDeepAgent, StateBackend } from '@deepagents/core';

// Using Grok model
const agent = createDeepAgent({
  model: 'grok', // Shorthand for grok-beta
  backend: new StateBackend(),
  system_prompt: 'You are a helpful AI assistant powered by Grok...',
});

// Or use Grok-2 for advanced reasoning
const grok2Agent = createDeepAgent({
  model: 'grok-2', // grok-2-1212
  backend: new StateBackend(),
});

const result = await agent.generate({
  messages: [{ role: 'user', content: 'Create a TypeScript utility file' }],
});
```

### Agent with Custom Subagents

```typescript
import { createDeepAgent, StateBackend } from '@deepagents/core';

const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  backend: new StateBackend(),
  subagents: [
    {
      name: 'researcher',
      description: 'Research and gather information on topics',
      system_prompt: 'You are a thorough researcher...',
      tools: {}, // Inherits filesystem tools
    },
    {
      name: 'analyzer',
      description: 'Analyze data and find insights',
      system_prompt: 'You are an analytical assistant...',
      tools: {},
    },
  ],
});

// Agent can now delegate work to subagents
const result = await agent.generate({
  messages: [
    {
      role: 'user',
      content: 'Research TypeScript and analyze its impact on web development',
    },
  ],
});
```

## API Reference

### createDeepAgent(config)

Create a fully-configured Deep Agent with Mastra.

**Parameters:**
- `config.model` (string, optional): Model to use. Supports shortcuts like 'sonnet', 'opus', 'haiku', 'grok', 'grok-2', 'gpt-4' or full model names. Default: 'claude-sonnet-4-5-20250929'
- `config.backend` (BackendProtocol, optional): Backend for file operations. Default: StateBackend
- `config.subagents` (SubAgent[], optional): Custom subagents for task delegation
- `config.system_prompt` (string, optional): Custom system prompt
- `config.tools` (object, optional): Additional custom tools
- `config.memory` (object, optional): Memory configuration

**Returns:** Configured Mastra Agent instance

### Backends

#### StateBackend

In-memory file storage (ephemeral).

```typescript
const backend = new StateBackend();
```

#### FilesystemBackend

Disk-based file storage with optional virtual mode.

```typescript
const backend = new FilesystemBackend({
  rootDir: './my-project', // Root directory
  virtualMode: true, // Sandboxed to rootDir
  maxFileSizeMb: 10, // Max file size (default: 10MB)
});
```

#### CompositeBackend

Route operations to different backends based on path prefix.

```typescript
const backend = new CompositeBackend({
  default: new StateBackend(),
  routes: {
    '/workspace/': new FilesystemBackend({ rootDir: './workspace' }),
    '/memories/': new StoreBackend(), // Coming soon
  },
});
```

### Tools

All tools are automatically included when using `createDeepAgent()`:

- **ls**: List files and directories
- **readFile**: Read file contents with line numbers
- **writeFile**: Create new files
- **editFile**: Edit files with string replacement
- **grepSearch**: Search file contents with regex
- **globSearch**: Find files by pattern
- **writeTodos**: Manage task lists
- **task**: Spawn subagents for complex work

## Examples

See the [examples directory](./examples/) for complete working examples:

- **basic-agent.ts**: Simple agent with in-memory storage
- **filesystem-agent.ts**: Agent with disk-based storage
- **research-agent.ts**: Agent with custom subagents for research

## Development Status

### Completed ✅
- ✅ **Phase 1 & 2**: Type system, utilities, and all backends (State, Filesystem, Composite)
- ✅ **Phase 3**: All Mastra-compatible tools (filesystem, planning, subagent)
- ✅ **Phase 4**: Agent factory (`createDeepAgent`) and example projects
- ✅ Comprehensive test coverage (>90%)
- ✅ Full TypeScript strict mode compliance
- ✅ Complete API documentation

### Coming Soon
- 📋 StoreBackend for persistent cross-session storage
- 📋 Full subagent execution (currently placeholder)
- 📋 Streaming support for real-time responses
- 📋 Additional example projects

## Architecture

```
@deepagents/core
├── Backends (Storage Layer)
│   ├── StateBackend (in-memory)
│   ├── FilesystemBackend (disk)
│   └── CompositeBackend (routing)
│
├── Tools (Mastra-compatible)
│   ├── Filesystem (6 tools)
│   ├── Planning (TodoList)
│   └── Subagent (Task)
│
└── Agent Factory
    └── createDeepAgent() → Configured Mastra Agent
```

## Documentation

For detailed information:
- [Examples](./examples/README.md) - Working code examples
- [Library Migration Plan](../../PLAN_LIBRARY_MIGRATION.md) - Architecture details
- [CLI Migration Plan](../../PLAN_CLI_MIGRATION.md) - CLI implementation plans

## License

MIT
