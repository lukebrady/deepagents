# Deep Agents CLI - TypeScript Migration Plan

## Executive Summary

This document outlines the comprehensive plan for porting the **deepagents-cli** from Python to TypeScript using the **Mastra** framework and modern TypeScript tooling. The CLI migration will maintain feature parity with the Python version while leveraging TypeScript's ecosystem for improved developer experience and cross-platform compatibility.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Migration Goals](#migration-goals)
3. [Architecture Comparison](#architecture-comparison)
4. [Technical Requirements](#technical-requirements)
5. [Project Structure](#project-structure)
6. [Migration Roadmap](#migration-roadmap)
7. [Detailed Component Mapping](#detailed-component-mapping)
8. [UI/UX Implementation](#uiux-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Risk Assessment](#risk-assessment)
11. [Success Criteria](#success-criteria)

---

## 1. Project Overview

### Current State (Python)
- **Framework**: Custom CLI with prompt_toolkit + rich
- **Language**: Python 3.11+
- **Package Manager**: UV
- **Core Dependencies**:
  - deepagents library (LangGraph)
  - prompt-toolkit (input handling)
  - rich (terminal UI)
  - requests (HTTP)
  - tavily-python (web search)
  - markdownify (HTML to Markdown)

### Key Features:
1. **Interactive CLI Loop**: REPL-style interface
2. **Agent Management**: List, reset, switch agents
3. **File Operations Tracking**: Visual diffs, previews
4. **HITL Workflow**: Tool approval/rejection
5. **Rich Terminal UI**: Syntax highlighting, diffs, token tracking
6. **Multiline Input**: Alt+Enter for multiline, Ctrl+E for editor
7. **Custom Tools**: web_search, http_request, fetch_url
8. **Slash Commands**: /clear, /help, /tokens, /quit
9. **Agent Memory**: Persistent memory system
10. **Real-time Streaming**: Live token tracking, streaming responses

### Target State (TypeScript)
- **Framework**: Mastra + Custom CLI
- **Language**: TypeScript 5.x
- **Package Manager**: pnpm
- **Build System**: tsup
- **Runtime**: Node.js 18+
- **Core Dependencies**:
  - @deepagents/core (TypeScript library)
  - @mastra/core (agent framework)
  - @clack/prompts or ink (terminal UI)
  - commander or yargs (CLI framework)
  - chalk (terminal colors)
  - node-fetch (HTTP)
  - marked (Markdown rendering)
  - turndown (HTML to Markdown)

---

## 2. Migration Goals

### Primary Goals
1. **Feature Parity**: 100% functional equivalence with Python CLI
2. **Type Safety**: Leverage TypeScript for better developer experience
3. **Cross-Platform**: Work seamlessly on Linux, macOS, Windows
4. **Performance**: Match or exceed Python CLI performance
5. **User Experience**: Maintain or improve UX (keyboard shortcuts, rendering)

### Secondary Goals
1. **Extensibility**: Easy to add custom tools and commands
2. **Configuration**: Support .deepagentsrc config file
3. **Plugin System**: Allow third-party extensions
4. **Testing**: >85% code coverage
5. **Documentation**: Comprehensive user guide

### Nice-to-Have
1. **Tab Completion**: Shell completion for commands
2. **History Search**: Ctrl+R style history search
3. **Configuration UI**: Interactive config setup
4. **Themes**: Customizable color schemes

---

## 3. Architecture Comparison

### Current Python Architecture

```
deepagents-cli
├── main.py (CLI loop, argument parsing)
├── agent.py (Agent creation, management)
├── execution.py (Task execution, streaming, HITL)
├── tools.py (web_search, http_request, fetch_url)
├── input.py (Prompt toolkit, multiline, file mentions)
├── ui.py (Rich UI, diffs, token tracking, help)
├── file_ops.py (FileOpTracker, previews, diffs)
├── agent_memory.py (AgentMemoryMiddleware)
├── commands.py (Slash command handlers)
├── config.py (Configuration, session state)
└── default_agent_prompt.md (Default instructions)
```

### Target TypeScript Architecture

```
packages/deepagents-cli/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── cli/
│   │   ├── main.ts                 # Main CLI loop
│   │   ├── args.ts                 # Argument parser
│   │   └── commands.ts             # Command registry
│   ├── agent/
│   │   ├── manager.ts              # Agent creation & management
│   │   ├── list.ts                 # List agents
│   │   ├── reset.ts                # Reset agent
│   │   └── memory.ts               # Agent memory middleware
│   ├── execution/
│   │   ├── executor.ts             # Task execution
│   │   ├── streaming.ts            # Stream handling
│   │   ├── hitl.ts                 # HITL workflow
│   │   └── interrupt.ts            # Interrupt handling
│   ├── tools/
│   │   ├── web-search.ts           # Web search (Tavily)
│   │   ├── http-request.ts         # HTTP client
│   │   └── fetch-url.ts            # URL fetcher
│   ├── ui/
│   │   ├── renderer.ts             # UI rendering
│   │   ├── diff.ts                 # Diff display
│   │   ├── token-tracker.ts        # Token tracking
│   │   ├── todo-renderer.ts        # Todo list display
│   │   ├── help.ts                 # Help screens
│   │   └── themes.ts               # Color themes
│   ├── input/
│   │   ├── prompt.ts               # Input handling
│   │   ├── multiline.ts            # Multiline support
│   │   ├── editor.ts               # External editor
│   │   ├── file-mentions.ts        # @file parsing
│   │   └── keybindings.ts          # Keyboard shortcuts
│   ├── file-ops/
│   │   ├── tracker.ts              # File operation tracking
│   │   ├── preview.ts              # Preview generation
│   │   └── diff.ts                 # Diff generation
│   ├── config/
│   │   ├── loader.ts               # Config file loading
│   │   ├── schema.ts               # Config schema (Zod)
│   │   └── defaults.ts             # Default config
│   ├── utils/
│   │   ├── paths.ts                # Path utilities
│   │   ├── logger.ts               # Logging
│   │   └── dependencies.ts         # Dependency checking
│   └── types/
│       ├── cli.ts                  # CLI types
│       ├── config.ts               # Config types
│       └── session.ts              # Session types
├── prompts/
│   └── default-agent-prompt.md    # Default instructions
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Technical Requirements

### 4.1 Core Dependencies

```json
{
  "dependencies": {
    "@deepagents/core": "workspace:*",
    "@mastra/core": "^latest",
    "@ai-sdk/anthropic": "^latest",
    "@ai-sdk/openai": "^latest",
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "enquirer": "^2.4.0",
    "marked": "^12.0.0",
    "marked-terminal": "^7.0.0",
    "turndown": "^7.2.0",
    "node-fetch": "^3.3.0",
    "dotenv": "^16.0.0",
    "xdg-basedir": "^5.1.0",
    "conf": "^12.0.0",
    "highlight.js": "^11.9.0",
    "diff": "^5.2.0",
    "fast-glob": "^3.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/diff": "^5.2.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "tsup": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

### 4.2 Alternative UI Libraries (to be evaluated)

**Option 1: Ink (React for CLI)**
```typescript
import { render, Text, Box } from 'ink';

// Pros: Component-based, familiar React patterns
// Cons: Heavier weight, React dependency
```

**Option 2: @clack/prompts (Lightweight, modern)**
```typescript
import * as p from '@clack/prompts';

// Pros: Modern, beautiful, lightweight
// Cons: Limited customization
```

**Option 3: Custom with chalk + enquirer**
```typescript
import chalk from 'chalk';
import { prompt } from 'enquirer';

// Pros: Maximum control, lightweight
// Cons: More work to implement
```

**Recommendation**: Start with **@clack/prompts + chalk** for simplicity, migrate to Ink if needed for complex UI.

### 4.3 Input Handling

**Option 1: readline (Node.js built-in)**
```typescript
import * as readline from 'readline';

// Pros: No dependencies, standard
// Cons: Limited features
```

**Option 2: enquirer**
```typescript
import { Input } from 'enquirer';

// Pros: Rich features, multiline support
// Cons: Less control than prompt_toolkit
```

**Recommendation**: **enquirer** for feature parity with prompt_toolkit

### 4.4 Diff Rendering

```typescript
import * as Diff from 'diff';
import chalk from 'chalk';

// Create unified diff
const diff = Diff.createPatch('file.txt', oldContent, newContent);

// Render with colors
const renderDiff = (diff: string) => {
  return diff.split('\n').map(line => {
    if (line.startsWith('+')) return chalk.green(line);
    if (line.startsWith('-')) return chalk.red(line);
    if (line.startsWith('@')) return chalk.cyan(line);
    return chalk.gray(line);
  }).join('\n');
};
```

---

## 5. Project Structure

```
packages/deepagents-cli/
├── src/
│   ├── index.ts                    # Main entry point
│   │
│   ├── cli/
│   │   ├── main.ts                 # CLI main loop
│   │   ├── args.ts                 # Commander argument parser
│   │   ├── commands/               # Slash commands
│   │   │   ├── index.ts            # Command registry
│   │   │   ├── clear.ts            # /clear
│   │   │   ├── help.ts             # /help
│   │   │   ├── tokens.ts           # /tokens
│   │   │   ├── quit.ts             # /quit, /exit
│   │   │   └── bash.ts             # !command
│   │   └── session.ts              # Session state management
│   │
│   ├── agent/
│   │   ├── manager.ts              # AgentManager class
│   │   ├── create.ts               # createAgentWithConfig()
│   │   ├── list.ts                 # listAgents()
│   │   ├── reset.ts                # resetAgent()
│   │   ├── memory.ts               # AgentMemoryMiddleware
│   │   └── config.ts               # Agent configuration types
│   │
│   ├── execution/
│   │   ├── executor.ts             # TaskExecutor class
│   │   ├── streaming.ts            # StreamingHandler
│   │   ├── hitl.ts                 # HITLWorkflow
│   │   ├── interrupt.ts            # InterruptHandler (Ctrl+C)
│   │   └── state.ts                # Execution state types
│   │
│   ├── tools/
│   │   ├── index.ts                # Tool exports
│   │   ├── web-search.ts           # webSearch (Tavily)
│   │   ├── http-request.ts         # httpRequest
│   │   ├── fetch-url.ts            # fetchUrl (HTML to MD)
│   │   └── resumable-shell.ts      # ResumableShellTool
│   │
│   ├── ui/
│   │   ├── renderer.ts             # UIRenderer class
│   │   ├── components/
│   │   │   ├── message.ts          # Message rendering
│   │   │   ├── tool-call.ts        # Tool call formatting
│   │   │   ├── diff.ts             # Diff display
│   │   │   ├── todo.ts             # Todo list rendering
│   │   │   ├── thinking.ts         # Thinking tag display
│   │   │   └── error.ts            # Error formatting
│   │   ├── token-tracker.ts        # TokenTracker class
│   │   ├── themes.ts               # Color themes
│   │   ├── help.ts                 # Help screen renderer
│   │   └── spinner.ts              # Loading spinners
│   │
│   ├── input/
│   │   ├── prompt.ts               # PromptHandler class
│   │   ├── multiline.ts            # Multiline input (Alt+Enter)
│   │   ├── editor.ts               # External editor (Ctrl+E)
│   │   ├── file-mentions.ts        # @file.txt parsing
│   │   ├── keybindings.ts          # Keyboard shortcuts
│   │   └── history.ts              # Command history
│   │
│   ├── file-ops/
│   │   ├── tracker.ts              # FileOpTracker class
│   │   ├── preview.ts              # generatePreview()
│   │   ├── diff.ts                 # generateDiff()
│   │   └── types.ts                # FileOperation types
│   │
│   ├── config/
│   │   ├── loader.ts               # ConfigLoader class
│   │   ├── schema.ts               # Zod config schema
│   │   ├── defaults.ts             # Default configuration
│   │   ├── paths.ts                # Config file paths
│   │   └── types.ts                # Config types
│   │
│   ├── utils/
│   │   ├── paths.ts                # Path utilities
│   │   ├── logger.ts               # Logger (winston or pino)
│   │   ├── dependencies.ts         # Dependency checker
│   │   ├── markdown.ts             # Markdown rendering
│   │   └── errors.ts               # Error classes
│   │
│   └── types/
│       ├── index.ts                # Re-exports
│       ├── cli.ts                  # CLI types
│       ├── config.ts               # Configuration types
│       ├── session.ts              # Session types
│       └── events.ts               # Event types
│
├── prompts/
│   └── default-agent-prompt.md    # Default agent instructions
│
├── tests/
│   ├── unit/
│   │   ├── cli/
│   │   ├── agent/
│   │   ├── execution/
│   │   ├── tools/
│   │   ├── ui/
│   │   ├── input/
│   │   └── utils/
│   ├── integration/
│   │   ├── cli-flow.test.ts
│   │   ├── hitl-workflow.test.ts
│   │   └── agent-management.test.ts
│   └── fixtures/
│       └── test-agents/
│
├── bin/
│   └── deepagents.js              # CLI executable
│
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── tsup.config.ts
├── README.md
└── CHANGELOG.md
```

---

## 6. Migration Roadmap

### Phase 1: Project Setup & CLI Framework (Week 1)

**Objective**: Set up project infrastructure and basic CLI framework

#### Tasks:
1. **Project Initialization**
   - [ ] Initialize pnpm workspace
   - [ ] Configure TypeScript (strict mode)
   - [ ] Set up tsup for bundling
   - [ ] Configure Vitest
   - [ ] Set up ESLint + Prettier
   - [ ] Create bin/deepagents.js executable

2. **CLI Framework**
   - [ ] Set up Commander for argument parsing
   - [ ] Implement basic CLI loop
   - [ ] Add version flag (-v, --version)
   - [ ] Add help flag (-h, --help)
   - [ ] Add agent selection (--agent)
   - [ ] Add auto-approve flag (--auto-approve)

3. **Configuration System**
   - [ ] Define Zod config schema
   - [ ] Implement ConfigLoader
   - [ ] Add XDG base directory support
   - [ ] Load ~/.deepagents/ directory
   - [ ] Create default config

#### Deliverables:
- Working CLI skeleton
- Argument parsing
- Configuration system

---

### Phase 2: Agent Management (Week 1-2)

**Objective**: Implement agent creation, listing, and reset functionality

#### Tasks:
1. **Agent Manager**
   - [ ] Implement AgentManager class
   - [ ] Add createAgentWithConfig()
   - [ ] Add listAgents()
   - [ ] Add resetAgent()
   - [ ] Add switchAgent()

2. **Agent Storage**
   - [ ] Implement CompositeBackend routing
   - [ ] Set up FilesystemBackend for /workspace
   - [ ] Set up StoreBackend for /memories
   - [ ] Load default-agent-prompt.md

3. **Agent Memory**
   - [ ] Implement AgentMemoryMiddleware
   - [ ] Add /memories/agent.md support
   - [ ] Add personality persistence

4. **CLI Commands**
   - [ ] Implement `deepagents list`
   - [ ] Implement `deepagents reset`
   - [ ] Implement `deepagents --agent <name>`

#### Deliverables:
- Agent management system
- Agent storage
- CLI commands for agent operations

---

### Phase 3: Input Handling (Week 2)

**Objective**: Implement rich input handling with multiline, editor, file mentions

#### Tasks:
1. **Basic Input**
   - [ ] Implement PromptHandler with enquirer
   - [ ] Add command history
   - [ ] Add prompt styling

2. **Advanced Input Features**
   - [ ] Implement multiline input (Alt+Enter)
   - [ ] Implement external editor (Ctrl+E)
   - [ ] Add auto-approve toggle (Ctrl+T)
   - [ ] Add Ctrl+C handling (double press to exit)

3. **File Mentions**
   - [ ] Implement @file.txt parsing
   - [ ] Add file content injection
   - [ ] Add error handling for missing files

4. **Keyboard Shortcuts**
   - [ ] Document keybindings
   - [ ] Add keybinding customization
   - [ ] Add help for shortcuts

#### Deliverables:
- Full-featured input system
- Multiline and editor support
- File mention parsing

---

### Phase 4: UI Rendering (Week 2-3)

**Objective**: Implement rich terminal UI with colors, diffs, streaming

#### Tasks:
1. **Message Rendering**
   - [ ] Implement UIRenderer class
   - [ ] Render user messages
   - [ ] Render AI responses
   - [ ] Render thinking tags
   - [ ] Syntax highlighting for code blocks

2. **Tool Call Rendering**
   - [ ] Render tool calls (name, args)
   - [ ] Render tool results
   - [ ] Add collapsing for long results
   - [ ] Add color coding

3. **Diff Rendering**
   - [ ] Implement diff generation
   - [ ] Render unified diffs
   - [ ] Add syntax highlighting for diffs
   - [ ] Support side-by-side (optional)

4. **Todo List Rendering**
   - [ ] Render todo items with status
   - [ ] Add checkboxes (□ pending, ◆ in_progress, ✓ completed)
   - [ ] Add color coding

5. **Token Tracking**
   - [ ] Implement TokenTracker
   - [ ] Display real-time token counts
   - [ ] Calculate baseline tokens
   - [ ] Show input/output/total

6. **Themes**
   - [ ] Define default theme
   - [ ] Add dark theme
   - [ ] Add light theme
   - [ ] Support theme customization

#### Deliverables:
- Complete UI rendering system
- Beautiful terminal output
- Token tracking

---

### Phase 5: Task Execution & Streaming (Week 3-4)

**Objective**: Implement task execution with streaming and HITL

#### Tasks:
1. **Basic Execution**
   - [ ] Implement TaskExecutor class
   - [ ] Add message sending
   - [ ] Add response parsing
   - [ ] Add error handling

2. **Streaming**
   - [ ] Implement StreamingHandler
   - [ ] Stream text chunks
   - [ ] Stream tool calls
   - [ ] Update UI in real-time

3. **HITL Workflow**
   - [ ] Implement HITLWorkflow
   - [ ] Detect tool approval requests
   - [ ] Show tool preview
   - [ ] Handle approve/reject/edit
   - [ ] Resume execution after approval

4. **Interrupt Handling**
   - [ ] Implement InterruptHandler
   - [ ] Handle Ctrl+C during execution
   - [ ] Show "Interrupting..." message
   - [ ] Clean up gracefully
   - [ ] Support double Ctrl+C to force exit

5. **File Operation Tracking**
   - [ ] Implement FileOpTracker
   - [ ] Track file reads/writes/edits
   - [ ] Generate previews for HITL
   - [ ] Generate diffs for edits

#### Deliverables:
- Task execution engine
- Streaming support
- HITL workflow
- File operation tracking

---

### Phase 6: Custom Tools (Week 4)

**Objective**: Implement CLI-specific custom tools

#### Tasks:
1. **Web Search Tool**
   - [ ] Integrate Tavily API
   - [ ] Implement webSearch tool
   - [ ] Add Zod schema
   - [ ] Handle API errors
   - [ ] Add optional env var check

2. **HTTP Request Tool**
   - [ ] Implement httpRequest tool
   - [ ] Support GET, POST, PUT, DELETE
   - [ ] Add headers support
   - [ ] Add body support
   - [ ] Handle errors

3. **Fetch URL Tool**
   - [ ] Implement fetchUrl tool
   - [ ] Fetch URL content
   - [ ] Convert HTML to Markdown (turndown)
   - [ ] Handle errors
   - [ ] Add timeout

4. **Resumable Shell Tool**
   - [ ] Implement ResumableShellTool
   - [ ] Run background bash commands
   - [ ] Track shell sessions
   - [ ] Read output later
   - [ ] Kill shells

#### Deliverables:
- 4 custom CLI tools
- Integration with Mastra
- Comprehensive testing

---

### Phase 7: Slash Commands (Week 4-5)

**Objective**: Implement slash commands and special input handling

#### Tasks:
1. **Command Registry**
   - [ ] Implement command parser
   - [ ] Add command registration
   - [ ] Add command execution

2. **Built-in Commands**
   - [ ] /clear - Reset conversation
   - [ ] /help - Show help
   - [ ] /tokens - Show token usage
   - [ ] /quit, /exit - Exit CLI
   - [ ] !command - Execute bash command

3. **Help System**
   - [ ] Implement help renderer
   - [ ] Add command documentation
   - [ ] Add examples
   - [ ] Add keybinding help

#### Deliverables:
- Slash command system
- Built-in commands
- Help system

---

### Phase 8: Session Management & Persistence (Week 5)

**Objective**: Implement session state and persistence

#### Tasks:
1. **Session State**
   - [ ] Implement SessionState class
   - [ ] Track current agent
   - [ ] Track conversation history
   - [ ] Track token usage
   - [ ] Track file operations

2. **State Persistence**
   - [ ] Save session to disk
   - [ ] Load session on startup
   - [ ] Clear session on /clear
   - [ ] Auto-save on exit

3. **Agent State**
   - [ ] Persist agent memory
   - [ ] Persist agent personality
   - [ ] Persist working directory

#### Deliverables:
- Session management
- State persistence
- Agent state handling

---

### Phase 9: Testing & Debugging (Week 5-6)

**Objective**: Comprehensive testing and debugging

#### Tasks:
1. **Unit Tests**
   - [ ] Test CLI argument parsing
   - [ ] Test agent management
   - [ ] Test input handling
   - [ ] Test UI rendering
   - [ ] Test task execution
   - [ ] Test tools
   - [ ] Test commands
   - [ ] Achieve >85% coverage

2. **Integration Tests**
   - [ ] End-to-end CLI flow
   - [ ] HITL workflow
   - [ ] Agent switching
   - [ ] File operations
   - [ ] Slash commands

3. **Manual Testing**
   - [ ] Test on Linux
   - [ ] Test on macOS
   - [ ] Test on Windows
   - [ ] Test different terminals
   - [ ] Test different Node versions

4. **Debugging Tools**
   - [ ] Add --debug flag
   - [ ] Add verbose logging
   - [ ] Add error stack traces
   - [ ] Add performance profiling

#### Deliverables:
- Comprehensive test suite
- Cross-platform testing
- Debugging tools

---

### Phase 10: Documentation & Polish (Week 6-7)

**Objective**: Documentation, polish, and release preparation

#### Tasks:
1. **User Documentation**
   - [ ] Write README
   - [ ] Write user guide
   - [ ] Write migration guide from Python
   - [ ] Add examples
   - [ ] Add troubleshooting guide

2. **Developer Documentation**
   - [ ] API documentation (TypeDoc)
   - [ ] Architecture guide
   - [ ] Contributing guide
   - [ ] Code comments (JSDoc)

3. **Polish**
   - [ ] Improve error messages
   - [ ] Add loading spinners
   - [ ] Optimize performance
   - [ ] Fix edge cases
   - [ ] Add Easter eggs (optional)

4. **Release Preparation**
   - [ ] Create CHANGELOG
   - [ ] Update version to 0.1.0
   - [ ] Create release notes
   - [ ] Prepare npm package

#### Deliverables:
- Complete documentation
- Polished CLI
- Release-ready package

---

### Phase 11: Release & Distribution (Week 7)

**Objective**: Publish and distribute the CLI

#### Tasks:
1. **Package Configuration**
   - [ ] Configure bin in package.json
   - [ ] Set up package.json metadata
   - [ ] Add keywords
   - [ ] Add repository URL

2. **npm Publication**
   - [ ] Publish to npm
   - [ ] Test installation (npm install -g)
   - [ ] Verify executable works

3. **Alternative Distributions**
   - [ ] Homebrew formula (macOS)
   - [ ] apt package (Linux)
   - [ ] Scoop manifest (Windows)
   - [ ] Docker image

4. **Announcement**
   - [ ] GitHub release
   - [ ] Blog post
   - [ ] Social media
   - [ ] Hacker News (optional)

#### Deliverables:
- npm package published
- Installation guides
- Release announcement

---

## 7. Detailed Component Mapping

### 7.1 Python → TypeScript Module Mapping

| Python Module | TypeScript Module | Notes |
|---------------|-------------------|-------|
| `main.py` | `cli/main.ts` | Main CLI loop |
| `agent.py` | `agent/manager.ts` | Agent creation & management |
| `execution.py` | `execution/executor.ts` | Task execution |
| `tools.py` | `tools/*.ts` | Custom tools |
| `input.py` | `input/prompt.ts` | Input handling |
| `ui.py` | `ui/renderer.ts` | UI rendering |
| `file_ops.py` | `file-ops/tracker.ts` | File operation tracking |
| `agent_memory.py` | `agent/memory.ts` | Agent memory |
| `commands.py` | `cli/commands/*.ts` | Slash commands |
| `config.py` | `config/loader.ts` | Configuration |

### 7.2 Library Mapping

| Python Library | TypeScript Library | Purpose |
|----------------|-------------------|---------|
| `prompt_toolkit` | `enquirer` | Input handling |
| `rich` | `chalk` + custom | Terminal UI |
| `requests` | `node-fetch` | HTTP requests |
| `tavily-python` | `@tavily/client` or REST API | Web search |
| `markdownify` | `turndown` | HTML to Markdown |
| `python-dotenv` | `dotenv` | Environment variables |

### 7.3 CLI Command Mapping

| Python Command | TypeScript Command | Implementation |
|----------------|-------------------|----------------|
| `deepagents` | `deepagents` | Start default agent |
| `deepagents --agent <name>` | `deepagents --agent <name>` | Start specific agent |
| `deepagents --auto-approve` | `deepagents --auto-approve` | Auto-approve mode |
| `deepagents list` | `deepagents list` | List agents |
| `deepagents reset` | `deepagents reset` | Reset agent |

### 7.4 Keyboard Shortcut Mapping

| Shortcut | Python | TypeScript | Action |
|----------|--------|-----------|--------|
| Enter | Submit | Submit | Submit input |
| Alt+Enter | Newline | Newline | Multiline input |
| Ctrl+E | Editor | Editor | Open external editor |
| Ctrl+T | Toggle | Toggle | Toggle auto-approve |
| Ctrl+C | Interrupt | Interrupt | Cancel current task |
| Ctrl+C × 2 | Exit | Exit | Force exit |
| Ctrl+D | Exit | Exit | Exit CLI |

---

## 8. UI/UX Implementation

### 8.1 Message Rendering

**User Message**:
```
┌─ You ───────────────────────────────────────────────────
│ Create a file called hello.ts with a hello world function
└─────────────────────────────────────────────────────────
```

**AI Response**:
```
┌─ Assistant ─────────────────────────────────────────────
│ I'll create a TypeScript file with a hello world function.
│
│ [Tool: writeFile]
│ ├─ file_path: /workspace/hello.ts
│ └─ content: <<<
│    export function hello() {
│      console.log('Hello, World!');
│    }
│    >>>
│
│ ✓ File created successfully
└─────────────────────────────────────────────────────────
```

### 8.2 Tool Approval (HITL)

```
┌─ Tool Approval Required ────────────────────────────────
│ Tool: writeFile
│ ├─ file_path: /workspace/important.ts
│ └─ content: <<<
│    export const secret = 'my-api-key';
│    >>>
│
│ Preview:
│ ┌─ /workspace/important.ts (new file) ─────────────────
│ │ export const secret = 'my-api-key';
│ └───────────────────────────────────────────────────────
│
│ [A]pprove  [R]eject  [E]dit  [V]iew full
└─────────────────────────────────────────────────────────
```

### 8.3 Diff Display

```
┌─ Edit: /workspace/hello.ts ─────────────────────────────
│ @@ -1,3 +1,5 @@
│  export function hello() {
│ -  console.log('Hello, World!');
│ +  const message = 'Hello, World!';
│ +  console.log(message);
│  }
└─────────────────────────────────────────────────────────
```

### 8.4 Token Tracker

```
╭─ Tokens ──────────────────────────────────────────────╮
│ Input: 1,234 │ Output: 567 │ Total: 1,801 │ Baseline: 456
╰───────────────────────────────────────────────────────╯
```

### 8.5 Todo List

```
┌─ Tasks ─────────────────────────────────────────────────
│ ✓ Create hello.ts file
│ ◆ Add error handling
│ □ Write unit tests
│ □ Update documentation
└─────────────────────────────────────────────────────────
```

### 8.6 Streaming

```typescript
// Streaming implementation
import { Agent } from '@mastra/core';

async function streamResponse(agent: Agent, message: string) {
  const stream = await agent.stream({
    messages: [{ role: 'user', content: message }],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'text') {
      process.stdout.write(chunk.content);
    } else if (chunk.type === 'tool-call') {
      renderToolCall(chunk.toolCall);
    }
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Testing

**Framework**: Vitest

**Coverage Target**: >85%

**Test Categories**:
1. CLI argument parsing
2. Agent management
3. Input handling
4. UI rendering (with mock stdout)
5. Tool implementations
6. File operation tracking
7. Command handling
8. Configuration loading

**Example**:
```typescript
// tests/unit/cli/args.test.ts
import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../../src/cli/args';

describe('CLI Argument Parser', () => {
  it('should parse agent flag', () => {
    const args = parseArgs(['--agent', 'my-agent']);
    expect(args.agent).toBe('my-agent');
  });

  it('should parse auto-approve flag', () => {
    const args = parseArgs(['--auto-approve']);
    expect(args.autoApprove).toBe(true);
  });

  it('should default to default agent', () => {
    const args = parseArgs([]);
    expect(args.agent).toBe('default');
  });
});
```

### 9.2 Integration Testing

**Test Scenarios**:
1. **End-to-End Flow**: Start CLI → Send message → Get response → Exit
2. **HITL Workflow**: Tool requires approval → Show preview → Approve → Continue
3. **Agent Management**: List agents → Switch agent → Reset agent
4. **File Operations**: Create file → Edit file → Read file → Track operations
5. **Slash Commands**: /clear → /help → /tokens → /quit

**Example**:
```typescript
// tests/integration/cli-flow.test.ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';

describe('CLI Integration', () => {
  it('should handle basic conversation', async () => {
    const cli = spawn('node', ['dist/index.js', '--auto-approve'], {
      env: { ...process.env, ANTHROPIC_API_KEY: 'test-key' },
    });

    // Send message
    cli.stdin.write('Create a file called test.txt\n');

    // Wait for response
    const output = await waitForOutput(cli.stdout);

    expect(output).toContain('writeFile');
    expect(output).toContain('test.txt');

    // Exit
    cli.stdin.write('/quit\n');
  });
});
```

### 9.3 Manual Testing Checklist

- [ ] CLI starts without errors
- [ ] Agent selection works
- [ ] Auto-approve mode works
- [ ] Multiline input (Alt+Enter) works
- [ ] External editor (Ctrl+E) works
- [ ] File mentions (@file) work
- [ ] Tool approvals work
- [ ] Diffs display correctly
- [ ] Token tracking updates
- [ ] Todo list renders
- [ ] Slash commands work
- [ ] Ctrl+C interrupts gracefully
- [ ] Session persists across restarts
- [ ] Works on Linux, macOS, Windows

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Terminal Compatibility** | Medium | High | Test on major terminals, fallback to simple output |
| **Streaming Performance** | Low | Medium | Optimize chunk processing, use worker threads if needed |
| **HITL State Management** | Medium | High | Thorough testing, state machine design |
| **Cross-Platform Issues** | Medium | Medium | Test on all platforms, use platform-agnostic libs |
| **Mastra API Changes** | Medium | High | Pin versions, monitor releases |
| **Input Handling Bugs** | Low | Medium | Comprehensive input testing |

### 10.2 UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Poor Rendering** | Low | High | Test on various screen sizes, themes |
| **Confusing Keybindings** | Medium | Medium | Clear documentation, in-app help |
| **Slow Response Time** | Low | High | Optimize rendering, async operations |
| **Error Message Clarity** | Medium | Medium | User testing, improve messages iteratively |

### 10.3 Project Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Scope Creep** | High | High | Strict feature parity, defer enhancements to v2 |
| **Timeline Slippage** | Medium | Medium | Weekly milestones, prioritize core features |
| **Dependency Issues** | Low | Medium | Lock versions, minimal dependencies |

---

## 11. Success Criteria

### 11.1 Functional Requirements

- [ ] All Python CLI features ported
- [ ] Agent management works (list, reset, switch)
- [ ] HITL workflow equivalent
- [ ] File operation tracking matches Python
- [ ] Custom tools functional
- [ ] Slash commands work
- [ ] Session persistence works

### 11.2 Quality Requirements

- [ ] >85% test coverage
- [ ] Zero ESLint errors
- [ ] Zero TypeScript errors (strict mode)
- [ ] Works on Node 18, 20, 22
- [ ] Works on Linux, macOS, Windows
- [ ] Performance within 10% of Python

### 11.3 UX Requirements

- [ ] Beautiful terminal output
- [ ] Responsive input handling
- [ ] Clear error messages
- [ ] Helpful documentation
- [ ] Intuitive keybindings

### 11.4 Release Requirements

- [ ] Published to npm
- [ ] Installation works (npm install -g)
- [ ] README complete
- [ ] CHANGELOG maintained
- [ ] GitHub release

---

## Appendix A: Example CLI Session

```bash
$ deepagents --agent dev-assistant

╭─────────────────────────────────────────────────────────╮
│  Deep Agents CLI v0.1.0                                │
│  Agent: dev-assistant                                   │
│  Model: claude-sonnet-4-5-20250929                     │
│                                                         │
│  Type /help for commands                               │
│  Ctrl+D or /quit to exit                               │
╰─────────────────────────────────────────────────────────╯

You> Create a TypeScript function to reverse a string

Assistant> I'll create a TypeScript function to reverse a string.

[Tool: writeFile]
├─ file_path: /workspace/reverse.ts
└─ content: <<<
   export function reverseString(str: string): string {
     return str.split('').reverse().join('');
   }
   >>>

✓ Created /workspace/reverse.ts

I've created a reverse string function. Would you like me to add tests?

You> Yes, add tests using Vitest

Assistant> I'll create tests for the reverse function.

[Tool: writeFile]
├─ file_path: /workspace/reverse.test.ts
└─ content: <<<
   import { describe, it, expect } from 'vitest';
   import { reverseString } from './reverse';

   describe('reverseString', () => {
     it('should reverse a simple string', () => {
       expect(reverseString('hello')).toBe('olleh');
     });

     it('should handle empty string', () => {
       expect(reverseString('')).toBe('');
     });
   });
   >>>

✓ Created /workspace/reverse.test.ts

Tests created! Run `vitest` to execute them.

╭─ Tokens ──────────────────────────────────────────────╮
│ Input: 234 │ Output: 156 │ Total: 390 │ Baseline: 120
╰───────────────────────────────────────────────────────╯

You> /quit

Goodbye! 👋
```

---

## Appendix B: Configuration File Schema

```typescript
// ~/.deepagents/config.json
import { z } from 'zod';

export const ConfigSchema = z.object({
  // Model configuration
  model: z.object({
    provider: z.enum(['anthropic', 'openai']).default('anthropic'),
    name: z.string().default('claude-sonnet-4-5-20250929'),
    apiKey: z.string().optional(), // Falls back to env var
  }),

  // UI configuration
  ui: z.object({
    theme: z.enum(['dark', 'light', 'auto']).default('dark'),
    showTokens: z.boolean().default(true),
    showThinking: z.boolean().default(false),
    syntax_highlighting: z.boolean().default(true),
  }),

  // Input configuration
  input: z.object({
    editor: z.string().default(process.env.EDITOR || 'vim'),
    multilineKey: z.string().default('alt-enter'),
    historySize: z.number().default(1000),
  }),

  // Agent configuration
  agent: z.object({
    defaultAgent: z.string().default('default'),
    autoApprove: z.boolean().default(false),
    workspaceDir: z.string().default('~/deepagents-workspace'),
  }),

  // Tool configuration
  tools: z.object({
    webSearch: z.object({
      enabled: z.boolean().default(true),
      apiKey: z.string().optional(), // Tavily
    }).optional(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

---

## Appendix C: Tool Implementation Example

```typescript
// src/tools/web-search.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const createWebSearchTool = (apiKey?: string) => {
  if (!apiKey) {
    console.warn('Tavily API key not found. Web search tool disabled.');
    return null;
  }

  return createTool({
    id: 'webSearch',
    description: 'Search the web using Tavily. Returns up to 5 relevant results.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
      maxResults: z.number().optional().default(5),
    }),
    outputSchema: z.object({
      results: z.array(
        z.object({
          title: z.string(),
          url: z.string(),
          snippet: z.string(),
        })
      ),
    }),
    execute: async ({ context }) => {
      const { query, maxResults } = context;

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          query,
          max_results: maxResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        results: data.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
        })),
      };
    },
  });
};
```

---

## Appendix D: References

### TypeScript CLI Libraries
- [Commander.js](https://github.com/tj/commander.js)
- [Enquirer](https://github.com/enquirer/enquirer)
- [Chalk](https://github.com/chalk/chalk)
- [Ink](https://github.com/vadimdemedes/ink)
- [@clack/prompts](https://github.com/natemoo-re/clack)

### Mastra Resources
- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Mastra Examples](https://github.com/mastra-ai/mastra/tree/main/examples)

### Testing
- [Vitest](https://vitest.dev/)
- [Vitest CLI Testing](https://vitest.dev/guide/cli.html)

### Project Resources
- [Python deepagents-cli Source](../libs/deepagents-cli/)
- [Current CLI Tests](../libs/deepagents-cli/tests/)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Author**: Claude (Migration Plan)
**Status**: Draft for Review
