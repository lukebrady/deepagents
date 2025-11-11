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

**Web Search (optional, choose one):**
- `BRAVE_API_KEY` - For Brave Search API (recommended - cheaper, 2000 free searches/month)
- `TAVILY_API_KEY` - For Tavily search API

If both are set, Brave API will be used (it's more cost-effective).

### Example Usage

```bash
# Using xAI Grok with Brave Search
export XAI_API_KEY=your_xai_api_key_here
export BRAVE_API_KEY=your_brave_api_key_here
deepagents

# Using a specific Grok model
export XAI_API_KEY=your_xai_api_key_here
export XAI_MODEL=grok-code-fast-1
deepagents

# Using OpenAI with Tavily Search
export OPENAI_API_KEY=your_openai_api_key_here
export TAVILY_API_KEY=your_tavily_api_key_here
deepagents

# Using Anthropic (Claude)
export ANTHROPIC_API_KEY=your_anthropic_api_key_here
deepagents
```

Alternatively, create a `.env` file in your working directory:

```
# Model provider
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-4-fast-reasoning

# Web search (optional)
BRAVE_API_KEY=your_brave_api_key_here
```

Get your API keys:
- xAI/Grok: https://x.ai/api
- Brave Search: https://brave.com/search/api/ (2000 free searches/month)
- Tavily Search: https://tavily.com
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

## Development

### Running Tests

To run the test suite:

```bash
uv sync --all-groups

make test
```
