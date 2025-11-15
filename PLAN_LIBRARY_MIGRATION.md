# Deep Agents Library - TypeScript Migration Plan

## Executive Summary

This document outlines the comprehensive plan for porting the **deepagents** library from Python (LangGraph-based) to TypeScript using the **Mastra** framework. The migration will maintain feature parity while leveraging Mastra's modern TypeScript architecture for agents, tools, workflows, and middleware.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Migration Goals](#migration-goals)
3. [Architecture Comparison](#architecture-comparison)
4. [Technical Requirements](#technical-requirements)
5. [Project Structure](#project-structure)
6. [Migration Roadmap](#migration-roadmap)
7. [Detailed Component Mapping](#detailed-component-mapping)
8. [Testing Strategy](#testing-strategy)
9. [Risk Assessment](#risk-assessment)
10. [Success Criteria](#success-criteria)

---

## 1. Project Overview

### Current State (Python)
- **Framework**: LangGraph + LangChain
- **Language**: Python 3.11+
- **Package Manager**: UV (modern Python package manager)
- **Architecture**: Middleware-based agent framework
- **Key Features**:
  - Planning tool (TodoList middleware)
  - File system tools with pluggable backends
  - Subagent spawning capabilities
  - Context management and summarization
  - Human-in-the-loop (HITL) support
  - Prompt caching with Anthropic

### Target State (TypeScript)
- **Framework**: Mastra
- **Language**: TypeScript 5.x
- **Package Manager**: pnpm (for monorepo)
- **Build System**: Turbo (for monorepo orchestration)
- **Architecture**: Mastra agent-based with tool composition
- **Runtime**: Node.js 18+

---

## 2. Migration Goals

### Primary Goals
1. **Feature Parity**: Maintain 100% functional equivalence with Python implementation
2. **Type Safety**: Leverage TypeScript's type system for better developer experience
3. **Performance**: Match or exceed Python performance
4. **Developer Experience**: Provide excellent IDE support, autocomplete, and documentation
5. **Maintainability**: Create clean, modular TypeScript codebase

### Secondary Goals
1. **Modern Tooling**: Utilize TypeScript ecosystem best practices
2. **Testing**: Achieve >90% code coverage
3. **Documentation**: Comprehensive JSDoc and user guides
4. **Extensibility**: Easy to extend with custom middleware and tools
5. **Compatibility**: Ensure backend storage can be shared between Python and TypeScript versions

---

## 3. Architecture Comparison

### Current Python Architecture (LangGraph)

```
create_deep_agent()
├── LangGraph Runnable
├── Middleware Stack
│   ├── TodoListMiddleware (planning)
│   ├── FilesystemMiddleware (file operations)
│   ├── SubAgentMiddleware (spawning subagents)
│   ├── SummarizationMiddleware (context management)
│   ├── AnthropicPromptCachingMiddleware
│   ├── PatchToolCallsMiddleware
│   └── HumanInTheLoopMiddleware (optional)
├── Backend System (Protocol-based)
│   ├── StateBackend (ephemeral)
│   ├── StoreBackend (persistent)
│   ├── FilesystemBackend (disk)
│   └── CompositeBackend (routing)
└── Tools
    ├── ls, read_file, write_file, edit_file
    ├── glob_search, grep_search
    └── task (subagent spawning)
```

### Target TypeScript Architecture (Mastra)

```
createDeepAgent()
├── Mastra Agent
├── Tools (Mastra-compatible)
│   ├── Planning Tools (todo list)
│   ├── Filesystem Tools
│   │   ├── ls, readFile, writeFile, editFile
│   │   └── globSearch, grepSearch
│   └── Subagent Tool (task spawning)
├── Backend System (TypeScript Protocol)
│   ├── StateBackend (in-memory)
│   ├── StoreBackend (persistent - Mastra store)
│   ├── FilesystemBackend (Node.js fs)
│   └── CompositeBackend (routing)
├── Memory System
│   ├── Conversation memory (Mastra native)
│   ├── Working memory (short-term context)
│   └── Semantic memory (long-term facts)
├── Workflow Integration (optional)
│   └── Complex multi-step operations
└── Context Management
    ├── Summarization hooks
    └── Context window management
```

### Key Architectural Decisions

1. **Middleware → Tools + Memory**: Mastra's agent model uses tools for actions and memory for state, rather than middleware wrapping
2. **Backend Protocol Preservation**: Keep the backend abstraction layer for compatibility
3. **Subagents as Nested Agents**: Leverage Mastra's agent composition capabilities
4. **Memory-First Approach**: Use Mastra's memory system for context management
5. **Workflow Integration**: Optional workflow engine for complex orchestrations

---

## 4. Technical Requirements

### 4.1 Core Dependencies

```json
{
  "dependencies": {
    "@mastra/core": "^latest",
    "@ai-sdk/anthropic": "^latest",
    "@ai-sdk/openai": "^latest",
    "zod": "^3.23.0",
    "minimatch": "^10.0.0",
    "ripgrep-js": "^1.0.0 or native ripgrep wrapper",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^20.0.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0",
    "tsup": "^8.0.0"
  }
}
```

### 4.2 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 4.3 Build System Requirements

- **Bundler**: tsup (for library bundling)
- **Type Checking**: tsc --noEmit
- **Testing**: Vitest (faster than Jest, native ESM support)
- **Linting**: ESLint with TypeScript plugin
- **Formatting**: Prettier
- **Monorepo**: pnpm workspaces + Turbo

### 4.4 Runtime Requirements

- **Node.js**: >= 18.0.0 (for native fetch, async context)
- **Platform**: Linux, macOS, Windows (cross-platform)
- **ripgrep**: Optional system dependency for fast grep (fallback to pure Node.js)

---

## 5. Project Structure

```
packages/
└── deepagents/
    ├── src/
    │   ├── index.ts                      # Main exports
    │   ├── agent.ts                      # createDeepAgent factory
    │   ├── types/
    │   │   ├── index.ts                  # Common types
    │   │   ├── agent.ts                  # Agent types
    │   │   ├── backend.ts                # Backend protocol
    │   │   └── middleware.ts             # Middleware types (if needed)
    │   ├── tools/
    │   │   ├── index.ts                  # Tool exports
    │   │   ├── filesystem/
    │   │   │   ├── ls.ts                 # ls tool
    │   │   │   ├── read-file.ts          # read_file tool
    │   │   │   ├── write-file.ts         # write_file tool
    │   │   │   ├── edit-file.ts          # edit_file tool
    │   │   │   ├── glob-search.ts        # glob_search tool
    │   │   │   └── grep-search.ts        # grep_search tool
    │   │   ├── planning/
    │   │   │   └── todo-list.ts          # TodoList tool
    │   │   └── subagent/
    │   │       └── task.ts               # task (subagent) tool
    │   ├── backends/
    │   │   ├── index.ts                  # Backend exports
    │   │   ├── protocol.ts               # BackendProtocol interface
    │   │   ├── state-backend.ts          # In-memory state backend
    │   │   ├── store-backend.ts          # Persistent store backend
    │   │   ├── filesystem-backend.ts     # Disk filesystem backend
    │   │   └── composite-backend.ts      # Composite routing backend
    │   ├── memory/
    │   │   ├── index.ts                  # Memory exports
    │   │   ├── conversation-memory.ts    # Conversation history
    │   │   ├── working-memory.ts         # Short-term context
    │   │   └── semantic-memory.ts        # Long-term facts
    │   ├── context/
    │   │   ├── index.ts                  # Context management
    │   │   ├── summarization.ts          # Context summarization
    │   │   └── truncation.ts             # Context truncation logic
    │   ├── utils/
    │   │   ├── index.ts                  # Utility exports
    │   │   ├── path-validation.ts        # Path security
    │   │   ├── diff.ts                   # Diff generation
    │   │   └── grep.ts                   # Grep implementation
    │   └── subagents/
    │       ├── index.ts                  # Subagent exports
    │       ├── types.ts                  # SubAgent config types
    │       └── spawner.ts                # Subagent spawning logic
    ├── tests/
    │   ├── unit/
    │   │   ├── tools/
    │   │   ├── backends/
    │   │   ├── memory/
    │   │   └── utils/
    │   └── integration/
    │       ├── agent.test.ts
    │       ├── filesystem.test.ts
    │       ├── subagents.test.ts
    │       └── hitl.test.ts
    ├── examples/
    │   ├── basic-agent.ts
    │   ├── custom-backend.ts
    │   └── research-agent.ts
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.build.json
    ├── tsup.config.ts
    └── README.md
```

---

## 6. Migration Roadmap

### Phase 1: Foundation (Week 1-2)

**Objective**: Set up project infrastructure and type system

#### Tasks:
1. **Project Setup**
   - [ ] Initialize pnpm workspace
   - [ ] Configure TypeScript with strict mode
   - [ ] Set up tsup for bundling
   - [ ] Configure Vitest for testing
   - [ ] Set up ESLint + Prettier
   - [ ] Create initial package.json

2. **Type System Foundation**
   - [ ] Define `BackendProtocol` interface
   - [ ] Define `FileInfo` and `GrepMatch` types
   - [ ] Define `AgentConfig` types
   - [ ] Define `ToolContext` types
   - [ ] Define `SubAgentConfig` types

3. **Backend Protocol Implementation**
   - [ ] Implement `BackendProtocol` interface
   - [ ] Create base backend abstract class
   - [ ] Add path validation utilities
   - [ ] Add security checks (symlinks, path traversal)

#### Deliverables:
- Working TypeScript project with build pipeline
- Complete type definitions
- Backend protocol interface

---

### Phase 2: Backend Implementations (Week 2-3)

**Objective**: Implement all backend storage systems

#### Tasks:
1. **StateBackend** (In-Memory)
   - [ ] Implement `BackendProtocol` interface
   - [ ] Add in-memory storage with Map
   - [ ] Implement ls_info, read, write, edit operations
   - [ ] Implement glob_info (using minimatch)
   - [ ] Implement grep_raw (in-memory search)
   - [ ] Add unit tests (>90% coverage)

2. **FilesystemBackend** (Disk)
   - [ ] Implement `BackendProtocol` interface
   - [ ] Use Node.js `fs/promises` for operations
   - [ ] Add virtual_mode for sandboxing
   - [ ] Implement ripgrep integration (with fallback)
   - [ ] Add symlink protection
   - [ ] Add unit tests with temp directories

3. **StoreBackend** (Persistent)
   - [ ] Integrate with Mastra's store system
   - [ ] Implement namespace isolation
   - [ ] Add cross-thread persistence
   - [ ] Add unit tests with mock store

4. **CompositeBackend** (Routing)
   - [ ] Implement path-based routing
   - [ ] Add backend registration
   - [ ] Add default backend fallback
   - [ ] Add integration tests

#### Deliverables:
- 4 fully functional backends
- Comprehensive test suite
- Documentation for each backend

---

### Phase 3: Tool Implementation (Week 3-4)

**Objective**: Convert all Python tools to Mastra-compatible TypeScript tools

#### Tasks:
1. **Filesystem Tools**
   - [ ] Implement `ls` tool (uses backend.ls_info)
   - [ ] Implement `readFile` tool (uses backend.read)
   - [ ] Implement `writeFile` tool (uses backend.write)
   - [ ] Implement `editFile` tool (uses backend.edit)
   - [ ] Implement `globSearch` tool (uses backend.glob_info)
   - [ ] Implement `grepSearch` tool (uses backend.grep_raw)
   - [ ] Add Zod schemas for all inputs/outputs
   - [ ] Add tool descriptions for LLM
   - [ ] Unit test each tool

2. **Planning Tools**
   - [ ] Implement TodoList tool
   - [ ] Define TodoItem type (content, status, activeForm)
   - [ ] Add state persistence
   - [ ] Add rendering logic
   - [ ] Unit test todo operations

3. **Subagent Tool**
   - [ ] Implement `task` tool
   - [ ] Add subagent spawning logic
   - [ ] Add context isolation
   - [ ] Add streaming support
   - [ ] Unit test subagent execution

#### Deliverables:
- 9+ Mastra-compatible tools
- Comprehensive Zod schemas
- Tool test suite

---

### Phase 4: Agent Factory (Week 4-5)

**Objective**: Implement the main `createDeepAgent` factory function

#### Tasks:
1. **Core Agent Creation**
   - [ ] Implement `createDeepAgent()` function
   - [ ] Configure Mastra Agent with tools
   - [ ] Set up model integration (Anthropic, OpenAI)
   - [ ] Add system prompt configuration
   - [ ] Add backend configuration

2. **Memory System Integration**
   - [ ] Integrate conversation memory
   - [ ] Add working memory for context
   - [ ] Add semantic memory for facts
   - [ ] Configure memory persistence

3. **Context Management**
   - [ ] Implement summarization hooks
   - [ ] Add context truncation logic
   - [ ] Add prompt caching support (if available in Mastra)

4. **HITL Support**
   - [ ] Add interrupt_on callback support
   - [ ] Implement tool approval workflow
   - [ ] Add state persistence for resumption

#### Deliverables:
- Working `createDeepAgent()` factory
- Memory system integration
- HITL support

---

### Phase 5: Subagent System (Week 5-6)

**Objective**: Implement subagent spawning and management

#### Tasks:
1. **SubAgent Types**
   - [ ] Define `SubAgent` interface
   - [ ] Define `CompiledSubAgent` type
   - [ ] Add subagent configuration types

2. **SubAgent Spawning**
   - [ ] Implement subagent creation
   - [ ] Add context isolation
   - [ ] Add streaming to parent agent
   - [ ] Add error handling

3. **Default Subagents**
   - [ ] Implement "general-purpose" subagent
   - [ ] Add subagent registry
   - [ ] Add custom subagent registration

#### Deliverables:
- Complete subagent system
- SubAgent API
- Integration tests

---

### Phase 6: Testing & Documentation (Week 6-7)

**Objective**: Comprehensive testing and documentation

#### Tasks:
1. **Unit Tests**
   - [ ] Achieve >90% coverage on backends
   - [ ] Achieve >90% coverage on tools
   - [ ] Achieve >90% coverage on agent factory
   - [ ] Add edge case tests
   - [ ] Add error handling tests

2. **Integration Tests**
   - [ ] End-to-end agent tests
   - [ ] Filesystem middleware integration
   - [ ] Subagent integration tests
   - [ ] HITL workflow tests
   - [ ] Multi-backend tests

3. **Documentation**
   - [ ] API documentation (TypeDoc)
   - [ ] User guide
   - [ ] Migration guide from Python
   - [ ] Examples (basic, custom backend, research agent)
   - [ ] JSDoc for all public APIs

4. **Performance Testing**
   - [ ] Benchmark against Python version
   - [ ] Memory usage profiling
   - [ ] Optimize hot paths

#### Deliverables:
- >90% test coverage
- Complete API documentation
- User guides and examples

---

### Phase 7: Polish & Release (Week 7-8)

**Objective**: Final polish and release preparation

#### Tasks:
1. **Code Quality**
   - [ ] ESLint clean (no warnings)
   - [ ] Prettier formatting
   - [ ] Type safety review
   - [ ] Security audit

2. **Package Preparation**
   - [ ] Optimize bundle size
   - [ ] Generate type declarations
   - [ ] Create CHANGELOG
   - [ ] Update README
   - [ ] Add LICENSE

3. **Release**
   - [ ] Version 0.1.0-beta.1
   - [ ] Publish to npm
   - [ ] Create GitHub release
   - [ ] Announce to community

#### Deliverables:
- Production-ready package
- npm publication
- Release notes

---

## 7. Detailed Component Mapping

### 7.1 Middleware → Tools + Hooks

| Python Middleware | TypeScript Equivalent | Notes |
|-------------------|----------------------|-------|
| `FilesystemMiddleware` | Filesystem Tools + Backend | 6 tools: ls, readFile, writeFile, editFile, globSearch, grepSearch |
| `SubAgentMiddleware` | Subagent Tool + Spawner | Single `task` tool for spawning |
| `TodoListMiddleware` | TodoList Tool + State | Planning tool with state management |
| `SummarizationMiddleware` | Context Manager + Hooks | Implement as context truncation hooks |
| `AnthropicPromptCachingMiddleware` | Model Config | Configure in Mastra agent model settings |
| `PatchToolCallsMiddleware` | Tool Wrappers | Wrap tools with error handling |
| `HumanInTheLoopMiddleware` | HITL Handler | Implement via interrupt callbacks |

### 7.2 Backend System Mapping

| Python Backend | TypeScript Backend | Implementation |
|----------------|-------------------|----------------|
| `StateBackend` | `StateBackend` | In-memory Map, ephemeral |
| `StoreBackend` | `StoreBackend` | Mastra store integration |
| `FilesystemBackend` | `FilesystemBackend` | Node.js fs/promises |
| `CompositeBackend` | `CompositeBackend` | Path-based routing |
| `BackendProtocol` | `BackendProtocol` | Interface with same methods |

### 7.3 Tool Conversion Mapping

| Python Tool | TypeScript Tool | Zod Schema |
|-------------|----------------|------------|
| `ls` | `createTool({ id: 'ls' })` | `z.object({ path: z.string() })` |
| `read_file` | `createTool({ id: 'readFile' })` | `z.object({ file_path: z.string(), offset?: z.number(), limit?: z.number() })` |
| `write_file` | `createTool({ id: 'writeFile' })` | `z.object({ file_path: z.string(), content: z.string() })` |
| `edit_file` | `createTool({ id: 'editFile' })` | `z.object({ file_path: z.string(), old_string: z.string(), new_string: z.string(), replace_all?: z.boolean() })` |
| `glob_search` | `createTool({ id: 'globSearch' })` | `z.object({ pattern: z.string(), path?: z.string() })` |
| `grep_search` | `createTool({ id: 'grepSearch' })` | `z.object({ pattern: z.string(), path?: z.string(), glob?: z.string() })` |
| `task` | `createTool({ id: 'task' })` | `z.object({ description: z.string(), prompt: z.string(), subagent_type: z.string(), model?: z.enum(['sonnet', 'opus', 'haiku']) })` |

### 7.4 Type System Mapping

```typescript
// Python: FileInfo
interface FileInfo {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
}

// Python: GrepMatch
interface GrepMatch {
  path: string;
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

// Python: BackendProtocol
interface BackendProtocol {
  ls_info(path: string): Promise<FileInfo[]>;
  read(path: string, offset?: number, limit?: number): Promise<string>;
  write(path: string, content: string): Promise<void>;
  edit(path: string, oldString: string, newString: string, replaceAll?: boolean): Promise<void>;
  glob_info(pattern: string, path?: string): Promise<FileInfo[]>;
  grep_raw(pattern: string, path?: string, glob?: string): Promise<GrepMatch[]>;
}

// Python: SubAgent config
interface SubAgent {
  name: string;
  description: string;
  system_prompt?: string;
  tools?: Record<string, Tool>;
  model?: string;
  middleware?: Middleware[];
}

// Python: CompiledSubAgent
interface CompiledSubAgent {
  name: string;
  description: string;
  runnable: Agent; // Mastra Agent
}
```

---

## 8. Testing Strategy

### 8.1 Unit Testing

**Framework**: Vitest

**Coverage Target**: >90%

**Test Structure**:
```typescript
// Example: backends/state-backend.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StateBackend } from '../src/backends/state-backend';

describe('StateBackend', () => {
  let backend: StateBackend;

  beforeEach(() => {
    backend = new StateBackend();
  });

  describe('ls_info', () => {
    it('should list root directory', async () => {
      await backend.write('/test.txt', 'content');
      const files = await backend.ls_info('/');
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('test.txt');
    });

    it('should throw on non-existent directory', async () => {
      await expect(backend.ls_info('/nonexistent')).rejects.toThrow();
    });
  });

  // ... more tests
});
```

### 8.2 Integration Testing

**Test Scenarios**:
1. **End-to-End Agent**: Create agent, execute task, verify file operations
2. **Filesystem Integration**: Test all filesystem tools with different backends
3. **Subagent Spawning**: Test task tool with nested subagents
4. **HITL Workflow**: Test interrupt and resume
5. **Multi-Backend**: Test CompositeBackend routing

**Example**:
```typescript
// integration/agent.test.ts
import { describe, it, expect } from 'vitest';
import { createDeepAgent } from '../src/agent';

describe('Deep Agent Integration', () => {
  it('should create files and read them back', async () => {
    const agent = createDeepAgent({
      model: 'claude-sonnet-4-5-20250929',
      backend: new StateBackend(),
    });

    const result = await agent.generate({
      messages: [
        { role: 'user', content: 'Create a file called test.txt with content "Hello World"' }
      ]
    });

    // Verify file was created
    const backend = agent.getBackend();
    const content = await backend.read('/test.txt');
    expect(content).toBe('Hello World');
  });
});
```

### 8.3 Type Testing

Use `@typescript-eslint/no-explicit-any` to ensure no `any` types slip through.

**Type Tests**:
```typescript
// types/backend.test-d.ts
import { expectType, expectError } from 'vitest';
import type { BackendProtocol, FileInfo } from '../src/types';

// Verify BackendProtocol compliance
const backend: BackendProtocol = {
  ls_info: async (path: string) => expectType<FileInfo[]>([]),
  read: async (path: string) => expectType<string>(''),
  // ... etc
};

// Should error on wrong types
expectError(backend.ls_info(123)); // number instead of string
```

### 8.4 Compatibility Testing

**Cross-Version Tests**: Ensure TypeScript version can read files written by Python version

```typescript
it('should read files created by Python version', async () => {
  // Assume Python version created a file
  const pythonCreatedFile = '/tmp/python-deepagents/test.txt';
  const backend = new FilesystemBackend({ rootDir: '/tmp/python-deepagents' });

  const content = await backend.read('/test.txt');
  expect(content).toBeTruthy();
});
```

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Mastra API Changes** | Medium | High | Pin Mastra version, monitor releases |
| **Performance Degradation** | Low | Medium | Benchmark early, optimize hot paths |
| **Type System Complexity** | Medium | Low | Use strict TypeScript, comprehensive tests |
| **Backend Incompatibility** | Low | High | Design for cross-version compatibility |
| **ripgrep Integration** | Medium | Low | Provide pure Node.js fallback |
| **Memory Management** | Low | Medium | Use weak references, monitor heap |

### 9.2 Project Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Scope Creep** | Medium | High | Strict feature parity, no extras in v1 |
| **Timeline Slippage** | Medium | Medium | Weekly milestones, prioritize core features |
| **Mastra Learning Curve** | High | Low | Study examples, engage with community |
| **Testing Gaps** | Medium | High | TDD approach, coverage requirements |

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] All Python tools ported to TypeScript
- [ ] All backends functional with same API
- [ ] Subagent spawning works equivalently
- [ ] HITL workflow matches Python behavior
- [ ] TodoList planning tool functional
- [ ] Context management equivalent

### 10.2 Quality Requirements

- [ ] >90% test coverage
- [ ] Zero ESLint errors
- [ ] Zero TypeScript errors (strict mode)
- [ ] All tests pass on Node 18, 20, 22
- [ ] Cross-platform (Linux, macOS, Windows)
- [ ] Performance within 10% of Python version

### 10.3 Documentation Requirements

- [ ] Complete API documentation (TypeDoc)
- [ ] User guide with examples
- [ ] Migration guide from Python
- [ ] JSDoc for all public APIs
- [ ] README with quickstart

### 10.4 Release Requirements

- [ ] Published to npm
- [ ] Semantic versioning
- [ ] CHANGELOG maintained
- [ ] GitHub release notes
- [ ] Example projects

---

## Appendix A: Mastra Tool Template

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { BackendProtocol } from '../types';

export const createReadFileTool = (backend: BackendProtocol) => {
  return createTool({
    id: 'readFile',
    description: 'Read the contents of a file from the filesystem',
    inputSchema: z.object({
      file_path: z.string().describe('The absolute path to the file to read'),
      offset: z.number().optional().describe('Line number to start reading from'),
      limit: z.number().optional().describe('Number of lines to read'),
    }),
    outputSchema: z.object({
      content: z.string().describe('The file contents'),
      lines: z.number().describe('Total number of lines'),
    }),
    execute: async ({ context }) => {
      const { file_path, offset, limit } = context;
      const content = await backend.read(file_path, offset, limit);
      const lines = content.split('\n').length;
      return { content, lines };
    },
  });
};
```

---

## Appendix B: Agent Factory Template

```typescript
import { Agent } from '@mastra/core';
import { anthropic } from '@ai-sdk/anthropic';
import { createFilesystemTools } from './tools/filesystem';
import { createTodoListTool } from './tools/planning/todo-list';
import { createTaskTool } from './tools/subagent/task';
import type { DeepAgentConfig } from './types';

export function createDeepAgent(config: DeepAgentConfig) {
  const {
    model = 'claude-sonnet-4-5-20250929',
    backend,
    subagents = [],
    interrupt_on,
    system_prompt,
  } = config;

  // Create tools
  const filesystemTools = createFilesystemTools(backend);
  const todoTool = createTodoListTool();
  const taskTool = createTaskTool({ subagents, backend });

  const tools = {
    ...filesystemTools,
    todo: todoTool,
    task: taskTool,
  };

  // Create agent
  const agent = new Agent({
    name: 'Deep Agent',
    instructions: system_prompt || DEFAULT_SYSTEM_PROMPT,
    model: anthropic(model),
    tools,
    // Configure memory
    memory: {
      conversation: true,
      working: true,
      semantic: true,
    },
  });

  return agent;
}
```

---

## Appendix C: References

### Mastra Documentation
- [Mastra Docs](https://mastra.ai/docs)
- [createTool Reference](https://mastra.ai/reference/tools/create-tool)
- [Agent Configuration](https://mastra.ai/docs/agents/overview)
- [Middleware Guide](https://mastra.ai/docs/server-db/middleware)

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)

### Project Resources
- [Python deepagents Source](../libs/deepagents/)
- [Current Tests](../libs/deepagents/tests/)
- [Examples](../examples/)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Author**: Claude (Migration Plan)
**Status**: Draft for Review
