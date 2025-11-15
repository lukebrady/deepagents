# @deepagents/cli

Interactive command-line interface for Deep Agents powered by Mastra.

## Features

- **Interactive REPL**: Chat with AI agents in your terminal
- **Multiple Agents**: Create, switch, and manage multiple agents
- **Streaming Responses**: Real-time streaming output with tool call tracking
- **Rich Terminal UI**: Syntax highlighting, markdown rendering, colors
- **Slash Commands**: Built-in commands for agent management
- **File Operations**: Automatic file operation tracking with diffs
- **Web Search**: Brave Search integration for real-time information
- **HTTP Tools**: Make API calls and fetch URLs with HTML-to-Markdown conversion
- **HITL Workflow**: Human-in-the-Loop tool approval for safety
- **Multiple Providers**: Support for X.AI (Grok), Anthropic (Claude), OpenAI (GPT)
- **Default**: Uses X.AI's Grok and Brave Search by default

## Installation

```bash
# Install globally
pnpm install -g @deepagents/cli

# Or run with npx
npx @deepagents/cli
```

## Usage

### Basic Usage

```bash
# Start the CLI
deepagents

# Or use the short alias
da

# Start with specific model
deepagents --model grok

# Start with specific agent
deepagents --agent my-agent
```

### Slash Commands

Once in the CLI, you can use these commands:

- `/help` - Show available commands
- `/clear` - Clear the screen
- `/reset` - Reset the current agent (clear memory)
- `/list` - List all agents
- `/switch <name>` - Switch to a different agent
- `/quit` or `/exit` - Exit the CLI

### Configuration

Create a `.deepagentsrc.json` file in your home directory or project root:

```json
{
  "model": "grok",
  "defaultAgent": "default",
  "streaming": true,
  "trackTokens": true,
  "theme": "auto",
  "apiKeys": {
    "xai": "your-xai-key-here",
    "braveSearch": "your-brave-key-here",
    "anthropic": "your-anthropic-key-here",
    "openai": "your-openai-key-here"
  }
}
```

### Environment Variables

You can also configure the CLI using environment variables:

```bash
# API Keys (defaults)
export XAI_API_KEY="your-xai-key"
export BRAVE_SEARCH_API_KEY="your-brave-key"

# Optional API Keys
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"

# Configuration
export DEEPAGENTS_MODEL="grok"
export DEEPAGENTS_VERBOSE="true"
```

## Examples

### Basic Conversation

```
You: Hello! Can you help me create a TypeScript function?
Agent: Of course! I'd be happy to help you create a TypeScript function...
```

### File Operations

The CLI automatically tracks file operations performed by the agent:

```
You: Create a new file called hello.ts with a greeting function
Agent: I'll create that file for you...
✍️  WRITE hello.ts
```

### Switching Agents

```
You: /list
Available Agents
→ default
  research-agent

You: /switch research-agent
[System] Switched to agent: research-agent
```

## CLI Options

```
Usage: deepagents [options]

Options:
  -a, --agent <name>    Agent name to use
  -m, --model <model>   Model to use (e.g., sonnet, gpt-4, grok)
  -v, --verbose         Verbose output
  --no-streaming        Disable streaming responses
  -c, --config <path>   Config file path
  -h, --help            Display help
  -V, --version         Display version
```

## Development

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Run in development
pnpm dev

# Run tests
pnpm test
```

## License

MIT
