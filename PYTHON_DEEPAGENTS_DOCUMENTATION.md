# Python Deep Agents Codebase - Complete Documentation

## Executive Summary
Deep Agents is a Python package (v0.2.5) built on LangGraph that enables creation of sophisticated AI agents with:
- Planning & task decomposition (write_todos tool)
- File system abstraction (read/write/edit/glob/grep)
- Subagent spawning (task tool for context isolation)
- Long-term memory persistence
- Human-in-the-loop workflows
- CLI interface for interactive use

### Key Dependencies
- langchain-anthropic >= 1.0.0, < 2.0.0
- langchain >= 1.0.2, < 2.0.0
- langchain-core >= 1.0.0, < 2.0.0
- wcmatch (for glob patterns)

---

## 1. DIRECTORY STRUCTURE

```
/home/user/deepagents/
├── libs/
│   ├── deepagents/                    # Core library
│   │   ├── __init__.py
│   │   ├── graph.py                  # Main agent creation (create_deep_agent)
│   │   ├── backends/                 # Pluggable storage backends
│   │   │   ├── __init__.py
│   │   │   ├── protocol.py          # Backend interface definition
│   │   │   ├── state.py             # LangGraph state storage
│   │   │   ├── filesystem.py        # Local filesystem storage
│   │   │   ├── store.py             # LangGraph Store persistence
│   │   │   ├── composite.py         # Multi-backend routing
│   │   │   └── utils.py             # Shared backend utilities
│   │   ├── middleware/               # Middleware components
│   │   │   ├── __init__.py
│   │   │   ├── filesystem.py        # Filesystem tools (ls/read/write/edit/glob/grep)
│   │   │   ├── subagents.py         # Subagent spawning (task tool)
│   │   │   ├── patch_tool_calls.py  # Dangling tool call patching
│   │   │   └── resumable_shell.py   # Shell tool with HITL support
│   │   └── tests/
│   │       ├── integration_tests/
│   │       └── unit_tests/
│   │
│   └── deepagents-cli/                # CLI implementation
│       ├── deepagents_cli/
│       │   ├── __init__.py
│       │   ├── main.py               # Entry point & CLI loop
│       │   ├── agent.py              # Agent creation & management
│       │   ├── config.py             # Config, colors, defaults
│       │   ├── commands.py           # Slash command handlers
│       │   ├── execution.py          # Task execution & streaming
│       │   ├── tools.py              # Web search, HTTP, Tavily
│       │   ├── ui.py                 # UI rendering & display
│       │   ├── file_ops.py           # File op tracking & diffs
│       │   ├── input.py              # Interactive input handling
│       │   ├── agent_memory.py       # Long-term memory middleware
│       │   ├── token_utils.py        # Token counting & tracking
│       │   ├── default_agent_prompt.md # Default system prompt
│       │   └── py.typed
│       └── tests/
│
├── examples/
│   └── research/
│       └── research_agent.py         # Example: Research with subagents

├── pyproject.toml                    # Python package config
├── README.md                         # Main documentation
├── Makefile
└── uv.lock                          # Dependency lock file
```

---

## 2. CORE AGENT IMPLEMENTATION

### Main Entry Point: `/libs/deepagents/graph.py`

**Function: `create_deep_agent()`**
```python
def create_deep_agent(
    model: str | BaseChatModel | None = None,
    tools: Sequence[BaseTool | Callable | dict[str, Any]] | None = None,
    system_prompt: str | None = None,
    middleware: Sequence[AgentMiddleware] = (),
    subagents: list[SubAgent | CompiledSubAgent] | None = None,
    response_format: ResponseFormat | None = None,
    context_schema: type[Any] | None = None,
    checkpointer: Checkpointer | None = None,
    store: BaseStore | None = None,
    backend: BackendProtocol | BackendFactory | None = None,
    interrupt_on: dict[str, bool | InterruptOnConfig] | None = None,
    debug: bool = False,
    name: str | None = None,
    cache: BaseCache | None = None,
) -> CompiledStateGraph
```

**Default Configuration:**
- Model: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929), max_tokens=20000
- Base System Prompt: "In order to complete the objective that the user asks of you, you have access to a number of standard tools."
- Recursion Limit: 1000

**Built-in Middleware Stack (in order):**
1. `TodoListMiddleware()` - Planning via write_todos tool
2. `FilesystemMiddleware(backend=backend)` - File operations
3. `SubAgentMiddleware()` - Task tool for subagents
4. `SummarizationMiddleware()` - Context reduction (max_tokens_before_summary=170000, messages_to_keep=6)
5. `AnthropicPromptCachingMiddleware()` - Prompt caching
6. `PatchToolCallsMiddleware()` - Dangling tool call handling
7. Optional: `HumanInTheLoopMiddleware()` - If interrupt_on specified

**Default Tools in Subagents:**
- Same as above, minus the main agent's custom tools
- Subagent default middleware includes additional SummarizationMiddleware

---

## 3. BACKEND SYSTEM

### Protocol Definition: `/libs/deepagents/backends/protocol.py`

**BackendProtocol Interface:**
```python
class BackendProtocol(Protocol):
    """Unified interface for file storage backends"""
    
    def ls_info(path: str) -> list[FileInfo]
    def read(file_path: str, offset: int = 0, limit: int = 2000) -> str
    def write(file_path: str, content: str) -> WriteResult
    def edit(file_path: str, old_string: str, new_string: str, replace_all: bool = False) -> EditResult
    def grep_raw(pattern: str, path: str | None = None, glob: str | None = None) -> list[GrepMatch] | str
    def glob_info(pattern: str, path: str = "/") -> list[FileInfo]
```

**FileInfo Structure:**
```python
class FileInfo(TypedDict, total=False):
    path: str           # Required
    is_dir: bool        # Optional
    size: int          # Bytes
    modified_at: str   # ISO timestamp
```

**WriteResult/EditResult:**
- `error`: Error message (None on success)
- `path`: Absolute path of file (None on failure)
- `files_update`: State update dict for checkpoint backends (None for external storage)
- `occurrences`: (EditResult only) Number of replacements

### Backend Implementations

#### 1. StateBackend (`state.py`)
**Purpose:** Store files in LangGraph agent state (ephemeral, conversation-scoped)

**File Data Structure:**
```python
{
    "content": list[str],      # Lines of file
    "created_at": str,         # ISO timestamp
    "modified_at": str,        # ISO timestamp
}
```

**Key Features:**
- Files persist within a conversation thread
- Automatically checkpointed after each agent step
- Returns `files_update` dict for state mutations
- Supports deletion via None values

#### 2. FilesystemBackend (`filesystem.py`)
**Purpose:** Direct filesystem access with security

**Initialization:**
```python
FilesystemBackend(
    root_dir: str | Path | None = None,      # Working directory
    virtual_mode: bool = False,               # Sandbox to root_dir
    max_file_size_mb: int = 10               # File size limit
)
```

**Features:**
- Secure path resolution (prevents `.., ~` traversal)
- O_NOFOLLOW flag to prevent symlink following
- Ripgrep integration for grep (fallback to Python regex)
- Virtual mode support for sandboxing
- Returns `files_update=None` (already persisted)

**Search Capabilities:**
- **ripgrep**: JSON output parsing, fallback on failure
- **Python fallback**: Regex compilation with wcmatch glob filtering
- **max_file_size**: Skips files over 10MB

#### 3. StoreBackend (`store.py`)
**Purpose:** Persistent cross-conversation storage via LangGraph Store

**Namespace Structure:**
```
(namespace,) or (assistant_id, "filesystem")
```

**Features:**
- Paginated store search (100 items per page)
- Per-assistant isolation
- Persistent across threads
- Returns `files_update=None` (already persisted)
- Converts between Store Items and FileData

#### 4. CompositeBackend (`composite.py`)
**Purpose:** Route operations to different backends by path prefix

**Configuration:**
```python
CompositeBackend(
    default: BackendProtocol,
    routes: dict[str, BackendProtocol]  # e.g., {"/memories/": store_backend}
)
```

**Features:**
- Longest-prefix-first matching
- Aggregates ls results from all backends
- Routes ls at "/" to show all backend roots
- Merges state updates across backends

---

## 4. MIDDLEWARE SYSTEM

### TodoListMiddleware
**Built-in via langchain library**
- Provides `write_todos` tool
- System prompt guides agents to write/update todos for complex tasks
- Enables breaking down multi-step work

### FilesystemMiddleware (`middleware/filesystem.py`)

**Tool Generator Functions:**
1. `_ls_tool_generator()` - Lists files with filtering
2. `_read_file_tool_generator()` - Reads file content with pagination
3. `_write_file_tool_generator()` - Creates new files
4. `_edit_file_tool_generator()` - Replaces strings in files
5. `_glob_tool_generator()` - Finds files by pattern
6. `_grep_tool_generator()` - Searches file contents

**FilesystemState:**
```python
class FilesystemState(AgentState):
    files: Annotated[NotRequired[dict[str, FileData]], _file_data_reducer]
```

**Reducer:** `_file_data_reducer()` merges file updates, supports deletion via None

**System Prompt Injection:**
```
## Filesystem Tools `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`

- ls: list files in a directory (requires absolute path)
- read_file: read a file from the filesystem (supports offset/limit)
- write_file: write to a new file in the filesystem
- edit_file: edit an existing file (requires unique old_string)
- glob: find files matching a pattern (e.g., "**/*.py")
- grep: search for patterns within files
```

**Read Tool Defaults:**
- `offset=0`, `limit=500` lines
- Supports pagination via offset/limit

**Edit Tool:**
- Requires exact string matching
- Supports `replace_all=True` for multiple occurrences
- Returns error if match found multiple times without replace_all

### SubAgentMiddleware (`middleware/subagents.py`)

**SubAgent TypedDict:**
```python
class SubAgent(TypedDict):
    name: str                                    # Subagent identifier
    description: str                             # Used by main agent
    system_prompt: str                          # System instructions
    tools: Sequence[BaseTool | Callable]       # Available tools
    model: NotRequired[str | BaseChatModel]    # Optional override
    middleware: NotRequired[list[AgentMiddleware]]
    interrupt_on: NotRequired[dict[str, bool | InterruptOnConfig]]
```

**CompiledSubAgent TypedDict:**
```python
class CompiledSubAgent(TypedDict):
    name: str                  # Identifier
    description: str           # Display in main agent
    runnable: Runnable        # Pre-built LangGraph graph
```

**Task Tool Description:**
Automatically generated and injected. Includes:
- Available agent types and their capabilities
- Usage guidelines (parallelize when possible)
- When to use (complex multi-step, independent tasks)
- State exclusion: "messages" and "todos" not passed to subagents

**General-Purpose Agent:**
- Created if `general_purpose_agent=True` (default behavior)
- Has same tools as main agent
- Description: "General-purpose agent for researching complex questions, searching for files and content, and executing multi-step tasks"

**Subagent Invocation:**
```python
task(
    description: str,      # Detailed task specification
    subagent_type: str,   # Name from available agents
    runtime: ToolRuntime  # Tool runtime context
) -> str | Command
```

**State Management:**
- Subagents receive filtered state (excludes "messages", "todos")
- Results returned via ToolMessage
- State updates bubbled back to main agent

### PatchToolCallsMiddleware (`middleware/patch_tool_calls.py`)
**Purpose:** Handle dangling tool calls (calls without corresponding ToolMessage)

**Implementation:**
- Before agent runs, scans message history
- Adds ToolMessage for any unmatched tool calls
- Message content: "Tool call X was cancelled - another message came in before it could be completed."

### ResumableShellToolMiddleware (`middleware/resumable_shell.py`)
**Purpose:** Shell tool that survives human-in-the-loop pauses

**Features:**
- Extends langchain's ShellToolMiddleware
- Lazily recreates shell session after HITL interrupts
- Prevents "Shell session resources unavailable" errors

---

## 5. CLI IMPLEMENTATION

### Entry Point: `/libs/deepagents-cli/deepagents_cli/`

**Main Module:** `main.py`

**CLI Commands:**
1. `list` - List all available agents (stored in ~/.deepagents/)
2. `help` - Show help information
3. `reset --agent NAME [--target SOURCE_AGENT]` - Reset agent to default or copy from another
4. Interactive mode (default) - Chat with agent

**CLI Arguments:**
```
--agent NAME              # Agent identifier for separate memory stores (default: "agent")
--auto-approve           # Auto-approve tool usage without HITL prompts
```

**Dependency Check:**
Function `check_cli_dependencies()` verifies:
- rich (UI rendering)
- requests (HTTP)
- python-dotenv (environment)
- tavily-python (web search)
- prompt-toolkit (input)

### Agent Management: `agent.py`

**Agent Directories:**
```
~/.deepagents/
├── agent/                # Default agent
│   ├── agent.md         # System prompt (customizable)
│   └── .deepagents/     # Memory files
│       └── memories/    # Persistent memory files
└── [other-agents]/
```

**Functions:**

1. `list_agents()` - Lists all agents in ~/.deepagents/
2. `reset_agent(agent_name, source_agent=None)` - Reset to default or copy prompt
3. `get_system_prompt()` - Gets base system prompt with CWD context
4. `create_agent_with_config()` - Creates agent with full setup
5. `load_agent_state()` - Loads persisted agent state
6. `save_agent_state()` - Saves agent state

**System Prompt Components:**
- Base: Current working directory
- Memory System: Instructions for /memories/ filesystem
- Long-term Memory: agent.md content injected before each call
- Default Coding Instructions: From default_agent_prompt.md

**Backend Setup:**
```python
# CompositeBackend routes:
/memories/  → StoreBackend   # Persistent cross-session
/          → FilesystemBackend # Session files (virtual_mode=True)
```

**Middleware Stack:**
1. TodoListMiddleware()
2. FilesystemMiddleware(backend=composite)
3. SubAgentMiddleware() - General-purpose only
4. ResumableShellToolMiddleware() - Shell tool support
5. AgentMemoryMiddleware() - Load agent.md
6. SummarizationMiddleware()
7. AnthropicPromptCachingMiddleware()
8. HumanInTheLoopMiddleware() - If not --auto-approve

**Checkpointer:** InMemorySaver (for conversation persistence within session)

### Configuration: `config.py`

**Color Scheme:**
```python
COLORS = {
    "primary": "#10b981",      # Green
    "dim": "#6b7280",          # Gray
    "user": "#ffffff",         # White
    "agent": "#10b981",        # Green
    "thinking": "#34d399",     # Light green
    "tool": "#fbbf24",         # Amber
}
```

**Interactive Commands:**
- `/clear` - Clear screen and reset conversation
- `/help` - Show help
- `/tokens` - Show token usage
- `/quit` or `/exit` - Exit CLI
- `!command` - Execute bash command

**Model Creation:** `create_model()`
- Checks OPENAI_API_KEY first → ChatOpenAI(gpt-5-mini)
- Falls back to ANTHROPIC_API_KEY → ChatAnthropic(claude-sonnet-4-5-20250929)
- Exits if no API key available

### Execution: `execution.py`

**Main Function:** `execute_task(user_input, agent, assistant_id, session_state, token_tracker)`

**Features:**
1. **File Mention Parsing** - Automatically includes referenced files
2. **Streaming** - Dual-mode streaming: "messages" + "updates"
3. **Token Tracking** - Captures input/output token usage
4. **HITL Integration** - Arrow-key navigation for approvals
5. **Tool Visualization** - Emojis and formatted output
6. **Todo Rendering** - Shows updated todo lists in real-time
7. **Diff Preview** - Shows file changes in HITL approval
8. **Error Handling** - Graceful interrupt handling (Ctrl+C)

**Streaming Modes:**
- `messages`: AIMessage, HumanMessage, ToolMessage chunks
- `updates`: State updates including interrupts

**Tool Icons:**
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

**HITL Approval Flow:**
1. Stream detects `__interrupt__` in updates
2. Collects all pending interrupts
3. Prompts user with arrow-key menu (default: Approve)
4. Supports: Approve, Reject, Edit (when available)
5. Resumes with Command(resume=decisions)

### Tools: `tools.py`

**Web Search Tool:**
```python
def web_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
) -> dict
```
Uses: Tavily API (requires TAVILY_API_KEY)

**HTTP Request Tool:**
```python
def http_request(
    url: str,
    method: str = "GET",
    headers: dict[str, str] = None,
    data: str | dict = None,
    params: dict[str, str] = None,
    timeout: int = 30,
) -> dict
```

**Fetch URL Tool:**
```python
def fetch_url(url: str, timeout: int = 30) -> dict
```

**Response Format:**
```python
{
    "success": bool,
    "status_code": int,
    "headers": dict,
    "content": str | dict,
    "url": str,
}
```

### UI: `ui.py`

**TokenTracker Class:**
- Tracks session input/output tokens
- Displays token usage statistics
- Supports reset on /clear command

**Display Functions:**
- `format_tool_display()` - Smart tool call formatting (abbreviates paths)
- `format_tool_message_content()` - Formats tool results
- `render_file_operation()` - Shows file operation details
- `render_diff_block()` - Shows unified diff with syntax highlight
- `render_todo_list()` - Renders structured todo items
- `show_interactive_help()` - Interactive help display

**Text Rendering:**
- Markdown support via Rich
- Line number formatting
- Syntax highlighting
- Colored panels for important messages

### File Operations Tracking: `file_ops.py`

**FileOperationRecord:**
```python
@dataclass
class FileOperationRecord:
    tool_name: str           # read_file, write_file, edit_file
    display_path: str        # File path for display
    status: FileOpStatus     # pending, success, error
    metrics: FileOpMetrics   # Lines, bytes, changes
    diff: str | None        # Unified diff
    error: str | None       # Error message if failed
```

**FileOpMetrics:**
```python
@dataclass
class FileOpMetrics:
    lines_read: int = 0
    start_line: int | None = None
    end_line: int | None = None
    lines_written: int = 0
    lines_added: int = 0
    lines_removed: int = 0
    bytes_written: int = 0
```

**Diff Computation:**
- `compute_unified_diff()` - Creates unified diffs
- Max 800 lines (configurable)
- 3 context lines around changes

### Agent Memory: `agent_memory.py`

**AgentMemoryMiddleware:**
Injects long-term memory into system prompt

**Memory File Path:** `/agent.md` in memories filesystem

**Features:**
1. Loads agent.md at session start
2. Injects into system prompt with markers
3. Supports custom template format

**System Prompt Additions:**
```
## Long-term Memory

Your system prompt is loaded from /memories/agent.md at startup.
You can update your own instructions by editing this file.

When to CHECK memories:
- At start of ANY new session
- BEFORE answering questions
- When user asks about past work
- If you're unsure
```

**Learning Pattern:**
1. User describes role → Update agent.md
2. User gives feedback → Capture WHY and update
3. User says "remember X" → Update memories IMMEDIATELY

### Input Handling: `input.py`

**Features:**
- File mention parsing (e.g., @/path/to/file)
- Multi-line input with prompt_toolkit
- Session history
- Syntax highlighting

**File Mention Format:**
```
@/path/to/file  → Automatically reads and includes content
```

### Token Utilities: `token_utils.py`

**Functions:**
- Count tokens in text
- Estimate tokens for messages
- Track cumulative usage

---

## 6. PROMPTS & TEMPLATES

### Base Agent Prompt: `graph.py`
```
"In order to complete the objective that the user asks of you, you have access to a number of standard tools."
```

### Default Coding Instructions: `default_agent_prompt.md`

**Sections:**
1. **Core Role** - Description of assistant function
2. **Memory-First Protocol** - How to use persistent /memories/
3. **Tone and Style** - Concise, direct responses
4. **Proactiveness** - Take action when asked
5. **Following Conventions** - Match existing code styles
6. **Task Management** - When to use write_todos
7. **File Reading Best Practices** - Pagination guidelines
8. **Subagent Usage** - When to delegate tasks
9. **Tools** - Reference documentation

**Key Guidance:**
- Use pagination for large files (limit=100 to start)
- Check /memories/ at session start
- Use write_todos for 3+ step tasks
- Parallelize independent subagent work
- Use filesystem for large I/O between agents

### Filesystem System Prompt: `middleware/filesystem.py`
```
## Filesystem Tools `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`

- ls: list files in a directory
- read_file: read a file from the filesystem
- write_file: write to a new file
- edit_file: edit an existing file
- glob: find files matching a pattern
- grep: search for text within files
```

### SubAgent System Prompt: `middleware/subagents.py`

**Default Subagent Prompt:**
```
In order to complete the objective that the user asks of you, you have access to a number of standard tools.
```

**Task Tool System Prompt:**
```
## `task` (subagent spawner)

You have access to a `task` tool to launch short-lived subagents that handle isolated tasks.

When to use the task tool:
- Complex, multi-step independent tasks
- Tasks that can run in parallel
- Tasks requiring heavy token/context usage
- Context-heavy operations (code execution, large searches)

When NOT to use:
- Need to see intermediate reasoning
- Task is trivial (few tool calls)
- Splitting adds latency without benefit
```

### Agent Memory System Prompt: `agent_memory.py`

**Template:**
```
<agent_memory>
{agent_memory_content}
</agent_memory>

## Long-term Memory

You have access to a long-term memory system using the {memory_path} path prefix.
Files stored in {memory_path} persist across sessions and conversations.

Your system prompt is loaded from {memory_path}agent.md at startup.

[Usage guidelines...]
```

---

## 7. UTILITIES & HELPERS

### Backend Utilities: `backends/utils.py`

**Key Functions:**

1. **File Formatting:**
   - `format_content_with_line_numbers()` - Cat-style formatting with line nums
   - `check_empty_content()` - Warning for empty files
   - `file_data_to_string()` - Convert FileData to string
   - `create_file_data()` - Create FileData with timestamps
   - `update_file_data()` - Update FileData preserving creation time

2. **Search Functions:**
   - `_glob_search_files()` - Glob matching across files
   - `_grep_search_files()` - Regex search in file content
   - `grep_matches_from_files()` - Structured grep results

3. **Utilities:**
   - `sanitize_tool_call_id()` - Prevent path traversal
   - `truncate_if_too_long()` - Token-aware truncation
   - `perform_string_replacement()` - Safe string replacement

**Constants:**
```python
MAX_LINE_LENGTH = 10000
LINE_NUMBER_WIDTH = 6
TOOL_RESULT_TOKEN_LIMIT = 20000
TRUNCATION_GUIDANCE = "... [results truncated, try being more specific...]"
```

**Structured Types:**
```python
FileInfo: path, is_dir, size, modified_at
GrepMatch: path, line, text
WriteResult: error, path, files_update
EditResult: error, path, files_update, occurrences
```

---

## 8. EXAMPLES

### Research Agent: `examples/research/research_agent.py`

**Setup:**
```python
from deepagents import create_deep_agent
from tavily import TavilyClient

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

def internet_search(query: str, max_results: int = 5, topic: str = "general", include_raw_content: bool = False):
    """Run a web search"""
    return tavily_client.search(...)
```

**Subagents:**

1. **Research Agent:**
   - Name: "research-agent"
   - Role: Conduct in-depth research
   - Tools: internet_search
   - System Prompt: Dedicated researcher instructions

2. **Critique Agent:**
   - Name: "critique-agent"
   - Role: Review final reports
   - Tools: None (inherits defaults)
   - System Prompt: Edit/critique instructions

**Main Agent:**
- Role: Orchestrator, planner, report writer
- Tools: internet_search
- Subagents: [research-agent, critique-agent]
- Workflow:
  1. Write question to question.txt (record keeping)
  2. Use research-agent for deep research
  3. Write final_report.md
  4. Use critique-agent for feedback
  5. Iterate until satisfied

---

## 9. CONFIGURATION & DEFAULTS

### Model Configuration
```python
# Default Model
ChatAnthropic(
    model_name="claude-sonnet-4-5-20250929",
    max_tokens=20000,
)
```

### Recursion Limits
```python
recursion_limit=1000  # Max steps per invocation
```

### Summarization Settings
```python
max_tokens_before_summary=170000
messages_to_keep=6
```

### File Operation Limits
```python
max_file_size_mb=10      # FilesystemBackend max read
DEFAULT_READ_LIMIT=500   # Lines per read_file call
TOOL_RESULT_TOKEN_LIMIT=20000
```

### Path Validation
```python
# StateBackend & FilesystemBackend secure path handling
- Prevent "../" and "~" traversal
- Normalize to forward slashes
- Require absolute paths starting with "/"
```

---

## 10. SYSTEM FLOWS

### Agent Invocation Flow

```
1. create_deep_agent()
   └─ Sets up middleware stack
   └─ Creates ChatAnthropic model
   └─ Returns CompiledStateGraph

2. agent.invoke(input_state)
   ├─ Messages stream: AIMessage, ToolMessage, HumanMessage
   ├─ Middleware interceptors:
   │   ├─ PatchToolCallsMiddleware (before_agent)
   │   ├─ AgentMemoryMiddleware (load agent.md)
   │   ├─ Model call with system prompt injection
   │   └─ SummarizationMiddleware (post-processing)
   └─ Returns final state
```

### Filesystem Operation Flow

```
1. Agent calls ls/read_file/edit_file/glob/grep
   └─ FilesystemMiddleware intercepts

2. Backend routing:
   - CompositeBackend checks path prefix
   - /memories/* → StoreBackend (persistent)
   - /* → FilesystemBackend (session)

3. Operation execution:
   - Read: Returns formatted string with line numbers
   - Write: Returns WriteResult with files_update or None
   - Edit: Returns EditResult with occurrences
   - Search: Returns list of matches or error string

4. State update (StateBackend only):
   - files_update merged into agent state
   - Persisted via LangGraph checkpoint
```

### Subagent Invocation Flow

```
1. Agent calls task(description, subagent_type)
   └─ SubAgentMiddleware intercepts

2. State preparation:
   - Filter state (exclude "messages", "todos")
   - Create HumanMessage with task description
   - Lookup subagent graph

3. Subagent execution:
   - Create_agent called with subagent spec
   - Runs to completion (no streaming)
   - Returns final message

4. Result handling:
   - Wrapped in ToolMessage
   - State updates bubbled back
   - Returned to agent as tool result
```

### HITL Approval Flow

```
1. Agent tool call triggers interrupt_on config
   └─ HumanInTheLoopMiddleware pauses

2. execution.py handles interrupts:
   - Collects all pending interrupts
   - Prompts user with action preview
   - Arrow keys to select Approve/Reject
   - Show diffs for file operations

3. User decision:
   - If approved → Resume with ApproveDecision
   - If rejected → Resume with RejectDecision
   - Can edit (when middleware supports)

4. Agent resumes:
   - Receives decision in Command
   - Continues execution or fails
   - Tool result reflects decision
```

---

## 11. KEY FEATURES BY CATEGORY

### Planning & Task Decomposition
- **write_todos** tool (via TodoListMiddleware)
- Structured task breakdown
- Progress tracking
- Dynamic plan updates

### Context Management
- **Filesystem tools**: ls, read_file, write_file, edit_file, glob, grep
- **Pagination**: Offset/limit parameters prevent context overflow
- **Large file handling**: 10MB max, 500-line default reads
- **Search optimization**: Ripgrep + Python fallback for grep

### Subagent System
- **Ephemeral subagents**: Task-scoped context isolation
- **Parallel execution**: Multiple tasks simultaneously
- **State isolation**: Messages/todos not passed to subagents
- **General-purpose agent**: Available for flexible task delegation
- **CompiledSubAgent**: Support for pre-built custom graphs

### Memory System
- **Long-term persistence**: /memories/ filesystem
- **Per-assistant isolation**: Metadata-based namespacing
- **Session scoping**: /temporary/ or StateBacked files
- **Agent.md injection**: System prompt updates persisted

### Human-in-the-Loop
- **Interrupt configs**: Per-tool, per-interrupt
- **Approval previews**: File diffs, operation details
- **Arrow-key UI**: Intuitive approval interface
- **Auto-approve mode**: Bypass HITL for unattended operation
- **Resumable workflows**: Pause/resume with state preservation

### Tool System
- **Built-in tools**: write_todos, ls, read_file, write_file, edit_file, glob, grep
- **CLI custom tools**: web_search, http_request, fetch_url
- **Shell tool**: (via ResumableShellToolMiddleware)
- **Task tool**: Subagent spawner
- **Extensible**: Support for custom tools via middleware

---

## 12. FILE OPERATION DETAILS

### Read Operation
```
read_file(path, offset=0, limit=500)
  ├─ Backend.read(path, offset, limit)
  ├─ Format with line numbers (cat -n style)
  └─ Return: "   1\tline content\n   2\tline content"
```

### Write Operation
```
write_file(path, content)
  ├─ Check if exists → Error
  ├─ Backend.write(path, content)
  ├─ StateBackend: Return files_update
  └─ FilesystemBackend: Return None (already persisted)
```

### Edit Operation
```
edit_file(path, old_string, new_string, replace_all=False)
  ├─ Backend.edit(path, old_string, new_string, replace_all)
  ├─ Error if:
  │  ├─ File not found
  │  ├─ old_string not found
  │  └─ Multiple matches and replace_all=False
  ├─ Return: EditResult with occurrences count
  └─ StateBackend: Include files_update
```

### Search Operations

**Glob:**
```
glob(pattern, path="/")
  ├─ Backend.glob_info(pattern, path)
  ├─ Return: list[FileInfo]
  └─ Sorted by modification time (newest first)
```

**Grep:**
```
grep(pattern, path="/", glob=None, output_mode="files_with_matches")
  ├─ Backend.grep_raw(pattern, path, glob)
  ├─ output_mode options:
  │  ├─ "files_with_matches" (default): Just file paths
  │  ├─ "content": File paths + line numbers + text
  │  └─ "count": File paths + match count
  └─ Return: list[GrepMatch] | str
```

---

## 13. DEPENDENCY MAPPING

### Core Library Dependencies
```
langchain-anthropic >= 1.0.0
├─ langchain >= 1.0.2
├─ langchain-core >= 1.0.0
└─ Anthropic API client

wcmatch
└─ Glob pattern matching library
```

### CLI Optional Dependencies
```
rich              # Terminal UI rendering
requests          # HTTP client
python-dotenv     # Environment file loading
tavily-python     # Web search API
prompt-toolkit    # Interactive input
```

### Development Dependencies
```
pytest            # Testing
pytest-cov        # Coverage
pytest-xdist      # Parallel testing
ruff              # Linting & formatting
mypy              # Type checking
```

---

## 14. KNOWN LIMITATIONS & EDGE CASES

1. **Symlink Handling**: O_NOFOLLOW prevents following symlinks in FilesystemBackend
2. **File Size Limits**: 10MB max for FilesystemBackend reads
3. **Token Limits**: Summarization kicks in at 170,000 tokens
4. **Recursion Limit**: 1000 steps max per invocation
5. **Edit String Uniqueness**: old_string must be unique unless replace_all=True
6. **Shell Resumption**: ResumableShellToolMiddleware recreates session after HITL pauses
7. **Virtual Mode**: Prevents path traversal when virtual_mode=True in FilesystemBackend
8. **StateBackend Ephemeral**: Files not persisted across conversations

---

## 15. TESTING STRUCTURE

### Unit Tests: `/libs/deepagents/tests/unit_tests/`
- Backend implementations
- Middleware behavior
- Utility functions

### Integration Tests: `/libs/deepagents/tests/integration_tests/`
- End-to-end agent workflows
- Middleware composition
- Tool invocation

### CLI Tests: `/libs/deepagents-cli/tests/`
- File operations tracking
- URL fetching
- Tool functionality

---

## SUMMARY TABLE: Core Components

| Component | File | Purpose | Key Classes/Functions |
|-----------|------|---------|----------------------|
| **Agent Factory** | graph.py | Create configured agents | create_deep_agent(), get_default_model() |
| **Filesystem Middleware** | middleware/filesystem.py | File tools | _ls_tool_generator, _read_file_tool_generator, etc. |
| **Subagent Middleware** | middleware/subagents.py | Task delegation | SubAgentMiddleware, _create_task_tool() |
| **State Backend** | backends/state.py | Ephemeral storage | StateBackend.write(), read(), edit() |
| **Filesystem Backend** | backends/filesystem.py | Direct FS access | FilesystemBackend with virtual_mode |
| **Store Backend** | backends/store.py | Persistent storage | StoreBackend with LangGraph Store |
| **Backend Protocol** | backends/protocol.py | Interface definition | BackendProtocol, FileInfo, WriteResult |
| **CLI Main** | deepagents_cli/main.py | Entry point | cli_main(), simple_cli() |
| **Agent Mgmt** | deepagents_cli/agent.py | Agent lifecycle | create_agent_with_config(), reset_agent() |
| **Execution** | deepagents_cli/execution.py | Task running | execute_task(), handle HITL |
| **UI** | deepagents_cli/ui.py | Display | TokenTracker, format_tool_display() |
| **Config** | deepagents_cli/config.py | Settings | create_model(), COLORS, COMMANDS |
| **Tools** | deepagents_cli/tools.py | Custom tools | web_search(), http_request() |
| **Memory** | deepagents_cli/agent_memory.py | Long-term memory | AgentMemoryMiddleware |
| **File Ops** | deepagents_cli/file_ops.py | Op tracking | FileOperationRecord, compute_unified_diff() |

