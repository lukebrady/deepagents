# deepagents cli

This is the CLI for deepagents

## Configuration

The CLI supports multiple model providers. Configure by setting one of the following API keys:

### Environment Variables

**Model Provider (choose one):**
- `OPENAI_API_KEY` - For OpenAI models (default: gpt-5-mini)
- `XAI_API_KEY` - For xAI Grok models (default: grok-4-fast-reasoning)
- `ANTHROPIC_API_KEY` - For Anthropic Claude models (default: claude-sonnet-4-5-20250929)

**Model Selection (optional):**
- `OPENAI_MODEL` - Override default OpenAI model
- `XAI_MODEL` - Override default xAI model (e.g., grok-code-fast-1)
- `ANTHROPIC_MODEL` - Override default Anthropic model

**Other:**
- `TAVILY_API_KEY` - Optional, for web search functionality

### Example Usage

```bash
# Using xAI Grok
export XAI_API_KEY=your_xai_api_key_here
deepagents

# Using a specific Grok model
export XAI_API_KEY=your_xai_api_key_here
export XAI_MODEL=grok-code-fast-1
deepagents

# Using OpenAI
export OPENAI_API_KEY=your_openai_api_key_here
deepagents
```

Alternatively, create a `.env` file in your working directory:

```
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-4-fast-reasoning
```

## Development

### Running Tests

To run the test suite:

```bash
uv sync --all-groups

make test
```
