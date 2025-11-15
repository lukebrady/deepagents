# Deep Agents Examples

This directory contains example projects demonstrating how to use the Deep Agents TypeScript library.

## Examples

### 1. Basic Agent (`basic-agent.ts`)

The simplest way to create and use a Deep Agent with in-memory storage.

```bash
tsx examples/basic-agent.ts
```

**Demonstrates:**
- Creating an agent with StateBackend
- Using the default model (Claude Sonnet)
- Making simple file operations

### 2. Filesystem Agent (`filesystem-agent.ts`)

Using a Deep Agent with disk-based file storage for persistent files.

```bash
tsx examples/filesystem-agent.ts
```

**Demonstrates:**
- CompositeBackend with mixed storage (memory + disk)
- FilesystemBackend with virtual mode
- Creating a multi-file TypeScript project
- Custom system prompts

### 3. Research Agent (`research-agent.ts`)

Creating a specialized research agent with custom subagents.

```bash
tsx examples/research-agent.ts
```

**Demonstrates:**
- Defining custom subagents
- Using the task tool for delegation
- Parallel research workflows
- Synthesizing results from multiple subagents

### 4. X.AI Agent (`xai-agent.ts`)

Using X.AI's Grok models with Deep Agents.

```bash
tsx examples/xai-agent.ts
```

**Demonstrates:**
- Using Grok models (grok-beta, grok-2)
- Model shortcuts for X.AI
- Real-time information access
- Custom system prompts for Grok

### 5. Streaming Agent (`streaming-agent.ts`)

Real-time streaming responses with Deep Agents.

```bash
tsx examples/streaming-agent.ts
```

**Demonstrates:**
- Streaming text responses in real-time
- Processing stream events (text-delta, tool-call, tool-result)
- Using `agent.stream()` instead of `agent.generate()`
- Accessing fullStream for complete event handling
- Building interactive CLI experiences

## Running Examples

### Prerequisites

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build
```

### Environment Variables

Set your API key before running examples:

```bash
# For Claude models
export ANTHROPIC_API_KEY="your-key-here"

# For GPT models
export OPENAI_API_KEY="your-key-here"

# For Grok models
export XAI_API_KEY="your-key-here"
```

### Running

```bash
# Run with tsx
pnpm tsx examples/basic-agent.ts

# Or compile and run
pnpm build
node dist/examples/basic-agent.js
```

## Common Patterns

### Creating an Agent

```typescript
import { createDeepAgent, StateBackend } from '@deepagents/core';

const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  backend: new StateBackend(),
});
```

### Using Different Backends

```typescript
import { FilesystemBackend, CompositeBackend } from '@deepagents/core';

// Filesystem only
const fsBackend = new FilesystemBackend({
  rootDir: './my-project',
  virtualMode: true,
});

// Composite (hybrid)
const backend = new CompositeBackend({
  default: new StateBackend(),
  routes: {
    '/workspace/': fsBackend,
  },
});
```

### Custom System Prompts

```typescript
const agent = createDeepAgent({
  model: 'sonnet',
  backend,
  system_prompt: 'You are a specialized coding assistant focused on TypeScript...',
});
```

### Adding Custom Tools

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const customTool = createTool({
  id: 'myTool',
  description: 'My custom tool',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  execute: async ({ context }) => {
    return { output: `Processed: ${context.input}` };
  },
});

const agent = createDeepAgent({
  model: 'sonnet',
  backend,
  tools: { myTool: customTool },
});
```

## Next Steps

- Check out the [main README](../README.md) for full API documentation
- Review the [migration plans](../../../PLAN_LIBRARY_MIGRATION.md) for architecture details
- Explore the source code in `../src/` for advanced usage
