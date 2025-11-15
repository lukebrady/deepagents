# Deep Agents: Python vs TypeScript Gap Analysis

## Executive Summary

This document provides a comprehensive comparison between the Python and TypeScript implementations of Deep Agents to ensure 1:1 feature parity.

**Analysis Date:** 2025-11-15
**Python Version:** 0.2.5
**TypeScript Version:** 0.1.0

---

## CRITICAL GAPS (Must Fix)

### 1. Missing Backends

| Backend | Python | TypeScript | Status | Priority |
|---------|--------|------------|--------|----------|
| StateBackend | ✅ | ✅ | ✅ Complete | - |
| FilesystemBackend | ✅ | ✅ | ✅ Complete | - |
| CompositeBackend | ✅ | ✅ | ✅ Complete | - |
| **StoreBackend** | ✅ | ❌ | ❌ **MISSING** | **HIGH** |

**StoreBackend Details:**
- **Purpose:** Persistent cross-conversation storage (Python uses LangGraph Store)
- **Features:**
  - Paginated store search (100 items per page)
  - Per-assistant isolation via namespace
  - Persistent across threads/sessions
  - Used for `/memories/` path in CLI
- **Impact:** CLI's long-term memory system `/memories/` won't work without this
- **Python File:** `libs/deepagents/backends/store.py`

---

### 2. Missing Middleware System

| Middleware Component | Python | TypeScript | Status | Priority |
|---------------------|--------|------------|--------|----------|
| **TodoListMiddleware** | ✅ | ⚠️ | Partial (as tool, not middleware) | **MEDIUM** |
| **FilesystemMiddleware** | ✅ | ⚠️ | Partial (as tools, not middleware) | **MEDIUM** |
| **SubAgentMiddleware** | ✅ | ⚠️ | Partial (as tool, not middleware) | **MEDIUM** |
| **PatchToolCallsMiddleware** | ✅ | ❌ | ❌ **MISSING** | **HIGH** |
| **ResumableShellToolMiddleware** | ✅ | ❌ | ❌ **MISSING** | **MEDIUM** |
| **SummarizationMiddleware** | ✅ (LangChain) | ❌ | ❌ **MISSING** | **HIGH** |
| **AnthropicPromptCachingMiddleware** | ✅ (LangChain) | ❌ | ❌ **MISSING** | **LOW** |
| **HumanInTheLoopMiddleware** | ✅ | ⚠️ | Partial (via interrupt_on) | **MEDIUM** |

**Middleware Architecture Gap:**
- **Python:** Has explicit middleware stack pattern with before/after agent hooks
- **TypeScript:** Tools are standalone, no middleware interception layer
- **Impact:** Cannot implement cross-cutting concerns like summarization, caching, dangling tool call handling

**PatchToolCallsMiddleware Details:**
- Scans message history before agent runs
- Adds ToolMessage for any tool_calls without corresponding ToolMessage
- Message: "Tool call X was cancelled - another message came in before it could be completed."

**ResumableShellToolMiddleware Details:**
- Shell tool that survives HITL interrupts
- Lazily recreates shell session after pauses
- Prevents "Shell session resources unavailable" errors

**SummarizationMiddleware Details:**
- Kicks in at 170,000 tokens
- Keeps last 6 messages
- Reduces context automatically

---

### 3. Missing CLI Features

| Feature | Python | TypeScript | Status | Priority |
|---------|--------|------------|--------|----------|
| **Agent Memory System** | ✅ | ❌ | ❌ **MISSING** | **HIGH** |
| **Long-term `/memories/` path** | ✅ | ❌ | ❌ **MISSING** | **HIGH** |
| **`agent.md` injection** | ✅ | ❌ | ❌ **MISSING** | **HIGH** |
| **Token counting** | ✅ | ⚠️ | Partial (tracked but not displayed) | **MEDIUM** |
| **Token display (/tokens)** | ✅ | ❌ | ❌ **MISSING** | **LOW** |
| **File mention parsing** | ✅ | ❌ | ❌ **MISSING** | **MEDIUM** |
| **Bash command execution (!)** | ✅ | ❌ | ❌ **MISSING** | **MEDIUM** |
| **File operation diffs in HITL** | ✅ | ⚠️ | Partial (diff generator exists but not integrated) | **MEDIUM** |
| **Todo list rendering** | ✅ | ❌ | ❌ **MISSING** | **MEDIUM** |
| **Multi-line input** | ✅ (prompt_toolkit) | ⚠️ | Basic (readline only) | **LOW** |

**Agent Memory System (`agent_memory.py`):**
- Loads `/memories/agent.md` at session start
- Injects into system prompt with `<agent_memory>` tags
- Provides learning pattern guidance
- Memory-first protocol instructions
- **Python File:** `libs/deepagents-cli/deepagents_cli/agent_memory.py`

**File Mention Parsing (`input.py`):**
- Format: `@/path/to/file` automatically reads and includes content
- Enhances user input with file context
- **Python File:** `libs/deepagents-cli/deepagents_cli/input.py`

**Bash Command Execution:**
- Format: `!command` executes bash commands inline
- Shows output in CLI

---

### 4. Missing Tools

| Tool | Python | TypeScript | Status | Priority |
|------|--------|------------|--------|----------|
| **Shell tool** | ✅ | ❌ | ❌ **MISSING** | **MEDIUM** |
| Default model | Claude Sonnet | Grok | ❌ **DIFFERENT** | **MEDIUM** |
| Default web search | Tavily | Brave Search | ❌ **DIFFERENT** | **LOW** |

**Shell Tool Details:**
- Execute bash commands
- Resumable across HITL pauses
- Via ResumableShellToolMiddleware
- **Python File:** `libs/deepagents/middleware/resumable_shell.py`

**Note:** TypeScript uses Brave Search by default (per user request), while Python uses Tavily. Both are valid but different.

---

### 5. System Prompt Differences

| Component | Python | TypeScript | Match? |
|-----------|--------|------------|--------|
| Base agent prompt | "In order to complete the objective..." | "You are a helpful AI assistant..." | ❌ **DIFFERENT** |
| Filesystem tools instructions | Detailed inline docs | Tool descriptions only | ❌ **DIFFERENT** |
| Subagent system prompt | Detailed usage guidelines | Basic guidance | ❌ **DIFFERENT** |
| Memory system prompt | Extensive learning pattern | **MISSING** | ❌ **MISSING** |
| Default coding instructions | `default_agent_prompt.md` | **MISSING** | ❌ **MISSING** |

**Python Base Prompt:**
```
In order to complete the objective that the user asks of you, you have access to a number of standard tools.
```

**TypeScript Base Prompt:**
```
You are a helpful AI assistant with access to file system operations and task management tools.

You can:
- Read, write, and edit files
...
Be efficient, accurate, and helpful in completing user requests.
```

**Python Default Agent Prompt (`default_agent_prompt.md`):**
Contains sections on:
1. Core Role
2. Memory-First Protocol
3. Tone and Style
4. Proactiveness
5. Following Conventions
6. Task Management
7. File Reading Best Practices
8. Subagent Usage
9. Tools Reference

**TypeScript:** Missing this comprehensive default prompt file

---

### 6. Missing Utilities

| Utility | Python | TypeScript | Status |
|---------|--------|------------|--------|
| `sanitize_tool_call_id()` | ✅ | ✅ | ✅ Complete |
| `format_content_with_line_numbers()` | ✅ | ✅ | ✅ Complete |
| `check_empty_content()` | ✅ | ✅ | ✅ Complete |
| `truncate_if_too_long()` | ✅ | ✅ | ✅ Complete |
| `perform_string_replacement()` | ✅ | ✅ | ✅ Complete |
| Ripgrep integration | ✅ | ✅ | ✅ Complete |
| Glob search | ✅ (wcmatch) | ✅ (minimatch) | ✅ Complete |
| Token counting | ✅ | ⚠️ Partial | ⚠️ **INCOMPLETE** |

**Token Counting Gap:**
- Python has `token_utils.py` with counting functions
- TypeScript tracks tokens but doesn't have utilities to count/estimate
- **Python File:** `libs/deepagents-cli/deepagents_cli/token_utils.py`

---

### 7. Missing Configuration Options

| Config | Python | TypeScript | Status |
|--------|--------|------------|--------|
| `recursion_limit` | ✅ (1000) | ❌ | ❌ **MISSING** |
| `max_tokens` | ✅ (20000) | ❌ | ❌ **MISSING** |
| `max_tokens_before_summary` | ✅ (170000) | ❌ | ❌ **MISSING** |
| `messages_to_keep` | ✅ (6) | ❌ | ❌ **MISSING** |
| `checkpointer` | ✅ | ❌ | ❌ **MISSING** |
| `store` | ✅ | ❌ | ❌ **MISSING** |
| `debug` | ✅ | ❌ | ❌ **MISSING** |
| `cache` | ✅ | ❌ | ❌ **MISSING** |
| `response_format` | ✅ | ❌ | ❌ **MISSING** |
| `context_schema` | ✅ | ❌ | ❌ **MISSING** |

---

### 8. CLI Commands Gap

| Command | Python | TypeScript | Status |
|---------|--------|------------|--------|
| `/help` | ✅ | ✅ | ✅ Complete |
| `/clear` | ✅ | ✅ | ✅ Complete |
| `/quit`, `/exit` | ✅ | ✅ | ✅ Complete |
| `/tokens` | ✅ | ❌ | ❌ **MISSING** |
| `/reset` | ✅ | ✅ | ✅ Complete |
| `/list` | ✅ | ✅ | ✅ Complete |
| `/switch <name>` | ✅ | ✅ | ✅ Complete |
| `!<command>` | ✅ | ❌ | ❌ **MISSING** |

---

### 9. CLI Arguments Gap

| Argument | Python | TypeScript | Status |
|----------|--------|------------|--------|
| `--agent NAME` | ✅ | ✅ `-a, --agent` | ✅ Complete |
| `--auto-approve` | ✅ | ❌ | ❌ **MISSING** |
| `--model` | ❌ | ✅ `-m, --model` | ⚠️ **TS ONLY** |
| `--verbose` | ❌ | ✅ `-v, --verbose` | ⚠️ **TS ONLY** |
| `--no-streaming` | ❌ | ✅ | ⚠️ **TS ONLY** |
| `--config` | ❌ | ✅ `-c, --config` | ⚠️ **TS ONLY** |
| `list` | ✅ (subcommand) | ⚠️ (slash command) | ⚠️ **DIFFERENT** |
| `reset` | ✅ (subcommand) | ⚠️ (slash command) | ⚠️ **DIFFERENT** |

---

### 10. File Operation Details Gap

| Feature | Python | TypeScript | Status |
|---------|--------|------------|--------|
| Read default limit | 500 lines | 2000 lines | ⚠️ **DIFFERENT** |
| Max file size | 10 MB | 10 MB | ✅ Match |
| Line number formatting | Cat -n style | Cat -n style | ✅ Match |
| Edit uniqueness check | ✅ | ✅ | ✅ Match |
| Virtual mode | ✅ | ✅ | ✅ Match |
| O_NOFOLLOW (symlink prevention) | ✅ | ❌ | ❌ **MISSING** |
| Path validation (.., ~) | ✅ | ✅ | ✅ Match |
| Parent directory creation | ✅ | ✅ | ✅ Match |

**Read Limit Difference:**
- Python: DEFAULT_READ_LIMIT = 500
- TypeScript: Default limit = 2000
- **Should align to Python's 500 for consistency**

---

### 11. HITL Flow Differences

| Feature | Python | TypeScript | Status |
|---------|--------|------------|--------|
| Interrupt detection | ✅ `__interrupt__` stream | ⚠️ `interrupt_on` callback | ⚠️ **DIFFERENT APPROACH** |
| Arrow-key UI | ✅ | ❌ | ❌ **MISSING** |
| Diff preview in approval | ✅ | ❌ | ❌ **MISSING** |
| Edit option | ✅ (when available) | ❌ | ❌ **MISSING** |
| Always approve/deny | ✅ | ✅ | ✅ Match |
| Per-tool enable/disable | ✅ | ✅ | ✅ Match |

**Python HITL Flow:**
1. Stream detects `__interrupt__` in updates
2. Collects all pending interrupts
3. Arrow-key menu (Approve, Reject, Edit)
4. Shows file diffs for edit operations
5. Resumes with Command(resume=decisions)

**TypeScript HITL Flow:**
1. interrupt_on callback returns true/false
2. Simple confirm() prompt
3. No diff preview
4. No edit option
5. Basic approval only

---

### 12. Examples & Documentation Gap

| Item | Python | TypeScript | Status |
|------|--------|------------|--------|
| Research agent example | ✅ | ❌ | ❌ **MISSING** |
| API documentation | ✅ README | ⚠️ Basic README | ⚠️ **INCOMPLETE** |
| System flow diagrams | ✅ (in docs) | ❌ | ❌ **MISSING** |
| Testing structure | ✅ (unit + integration) | ❌ | ❌ **MISSING** |

**Python Research Example:**
- Multi-agent workflow (main, research-agent, critique-agent)
- File-based communication
- Iterative improvement loop
- **File:** `examples/research/research_agent.py`

---

## MEDIUM PRIORITY GAPS

### 13. UI/UX Differences

| Feature | Python (Rich library) | TypeScript (chalk/marked) | Status |
|---------|----------------------|---------------------------|--------|
| Markdown rendering | ✅ | ✅ | ✅ Match |
| Syntax highlighting | ✅ | ⚠️ Via highlight.js dep but not used | ⚠️ **INCOMPLETE** |
| Tool icons/emojis | ✅ | ⚠️ Basic colors only | ⚠️ **INCOMPLETE** |
| Colored panels | ✅ | ❌ | ❌ **MISSING** |
| Progress spinners | ✅ (Rich) | ✅ (ora) | ✅ Match |
| Token visualization | ✅ (color-coded) | ✅ (color-coded) | ✅ Match |
| Line wrapping | ✅ | ⚠️ Basic | ⚠️ **INCOMPLETE** |

**Python Tool Icons:**
```python
"read_file": "📖",
"write_file": "✏️",
"edit_file": "✂️",
"ls": "📁",
"glob": "🔍",
"grep": "🔎",
"shell": "⚡",
"web_search": "🌐",
"http_request": "🌍",
"task": "🤖",
"write_todos": "📋",
```

**TypeScript:** No tool icons/emojis in output

---

### 14. Error Handling Differences

| Feature | Python | TypeScript | Status |
|---------|--------|------------|--------|
| Graceful Ctrl+C handling | ✅ | ⚠️ Basic | ⚠️ **INCOMPLETE** |
| Error message formatting | ✅ Rich panels | ⚠️ Basic chalk | ⚠️ **INCOMPLETE** |
| Detailed error context | ✅ | ⚠️ | ⚠️ **INCOMPLETE** |
| Stack trace suppression | ✅ | ❌ | ❌ **MISSING** |

---

### 15. Memory System Architecture

| Component | Python | TypeScript | Status |
|-----------|--------|------------|--------|
| Conversation memory | ✅ (InMemorySaver) | ⚠️ (messages array) | ⚠️ **DIFFERENT** |
| Working memory | ✅ (StateBackend) | ✅ (StateBackend) | ✅ Match |
| Long-term memory | ✅ (StoreBackend + agent.md) | ❌ | ❌ **MISSING** |
| Semantic memory | ❌ (not implemented) | ❌ | ✅ Match (both missing) |

**Python Memory Architecture:**
- **Conversation:** LangGraph InMemorySaver checkpointer (session-scoped)
- **Working:** StateBackend files (ephemeral)
- **Long-term:** StoreBackend + agent.md injection (persistent)

**TypeScript Memory Architecture:**
- **Conversation:** Simple messages array (no checkpointing)
- **Working:** StateBackend files (ephemeral)
- **Long-term:** Missing

---

## LOW PRIORITY GAPS

### 16. Dependency Differences

| Library | Python | TypeScript Equivalent | Notes |
|---------|--------|----------------------|-------|
| LangChain | langchain, langchain-core | **N/A** (using Mastra) | Different framework |
| LangGraph | Core dependency | **N/A** (using Mastra) | Different framework |
| Rich | Terminal UI | chalk + marked-terminal | Different libraries, similar purpose |
| wcmatch | Glob matching | minimatch | Different libraries, similar purpose |
| prompt-toolkit | Input | readline | More basic in TS |
| requests | HTTP | node-fetch | Equivalent |
| tavily-python | Web search | Brave Search API | Different service (per user request) |
| pytest | Testing | **MISSING** | No test framework |
| ruff | Linting | **MISSING** | No linter configured |
| mypy | Type checking | TypeScript compiler | Built-in |

---

### 17. Testing Gap

| Test Type | Python | TypeScript | Status |
|-----------|--------|------------|--------|
| Unit tests | ✅ | ❌ | ❌ **MISSING** |
| Integration tests | ✅ | ❌ | ❌ **MISSING** |
| CLI tests | ✅ | ❌ | ❌ **MISSING** |
| Test coverage | ✅ pytest-cov | ❌ | ❌ **MISSING** |

---

## ARCHITECTURAL DIFFERENCES

### Framework Choice

**Python:**
- Built on LangChain + LangGraph
- Middleware stack pattern
- Graph-based execution
- Built-in checkpointing

**TypeScript:**
- Built on Mastra framework
- Tool-based pattern
- Streaming execution
- Manual state management

**Impact:** Cannot directly port Python's middleware system to TypeScript without adapting to Mastra's architecture. Will need to find equivalent patterns in Mastra or implement custom middleware layer.

---

## SUMMARY: CRITICAL MISSING FEATURES

### Must Implement for 1:1 Parity (Ordered by Priority)

1. **StoreBackend** - Persistent storage for long-term memory
2. **Agent Memory System** - `agent.md` loading and injection
3. **SummarizationMiddleware** - Context reduction at 170k tokens
4. **PatchToolCallsMiddleware** - Dangling tool call handling
5. **Shell Tool** - Bash command execution via tool
6. **Default Agent Prompt File** - `default_agent_prompt.md` with comprehensive guidance
7. **File Mention Parsing** - `@/path/to/file` syntax
8. **HITL Improvements** - Diff preview, arrow-key UI, edit option
9. **Bash Command Execution** - `!command` syntax in CLI
10. **Todo List Rendering** - Real-time todo display
11. **Token Counting** - `/tokens` command with estimation
12. **ResumableShellToolMiddleware** - HITL-safe shell
13. **Tool Icons/Emojis** - Visual indicators for tools
14. **File Operation Diffs** - Show diffs during HITL approval
15. **Configuration Options** - recursion_limit, max_tokens, etc.

### Configuration Alignment

1. Change default read limit from 2000 to 500 lines
2. Implement O_NOFOLLOW for symlink prevention (if possible in Node.js)
3. Align system prompts with Python version

### Documentation

1. Add comprehensive README
2. Create research agent example
3. Document system flows
4. Add testing framework

---

## NOTES

- TypeScript uses Brave Search instead of Tavily per user's explicit request (acceptable difference)
- TypeScript uses Grok as default model instead of Claude per user's request (acceptable difference)
- Framework differences (LangChain vs Mastra) require architectural adaptations, not direct ports
- Some middleware functionality may need to be implemented differently in Mastra's model

---

## NEXT STEPS

1. Review this gap analysis
2. Prioritize which gaps to address first
3. Create implementation plan for critical features
4. Consider framework limitations when porting middleware patterns
5. Test each implemented feature for parity

