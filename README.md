# zai-mcp-server

An MCP (Model Context Protocol) server that connects any MCP-compatible AI client to the **Z.ai API** — giving coding agents like Claude Code direct access to Z.ai's chat and code completion models.

## Why?

Coding agents work best when they can call different LLMs for different jobs. This server lets your agent:

- **Route code tasks** to Z.ai's coding-optimized endpoint for better results on generation, refactoring, and debugging
- **Compare models** by listing what's available and estimating costs before making calls
- **Stay in flow** — no copy-pasting between tools; the agent calls Z.ai directly through MCP

## Install in Claude Code (One Click)

Open Claude Code **Settings > MCP Servers > Add Custom Server**, paste this URL:

```
https://github.com/kemalabuteliyte/zai-mcp-server
```

Then set the `ZAI_API_KEY` environment variable when prompted.

### Or via CLI

```bash
claude mcp add zai-mcp-server -- npx -y github:kemalabuteliyte/zai-mcp-server
```

Then add your API key:

```bash
export ZAI_API_KEY="your-z-ai-api-key"
```

### Or manual config

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "zai-mcp-server": {
      "command": "npx",
      "args": ["-y", "github:kemalabuteliyte/zai-mcp-server"],
      "env": {
        "ZAI_API_KEY": "your-z-ai-api-key"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `zai_chat_complete` | Chat completion via Z.ai general endpoint |
| `zai_code_complete` | Code completion via Z.ai coding endpoint (with optional language hint) |
| `zai_list_models` | List all available Z.ai models |
| `zai_stream_complete` | Streaming chat completion (collected into a single response) |
| `zai_set_config` | Update runtime config (API key, default model, temperature, max tokens) |
| `zai_estimate_cost` | Estimate cost for a given model and token count |

## Tool Details

### zai_chat_complete

Send a chat completion request to Z.ai.

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain closures in JavaScript." }
  ],
  "model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

### zai_code_complete

Optimized for code generation. Uses Z.ai's dedicated coding endpoint (`/api/coding/paas/v4`). Pass a `language` hint to prepend a system prompt automatically.

```json
{
  "messages": [
    { "role": "user", "content": "Write a binary search function" }
  ],
  "language": "typescript",
  "model": "gpt-4o"
}
```

### zai_list_models

No parameters. Returns all available models with their IDs.

### zai_stream_complete

Same interface as `zai_chat_complete` but uses streaming internally. Useful when you want the server to handle chunked responses and return the full result.

### zai_set_config

Update any combination of runtime settings without restarting the server:

```json
{
  "api_key": "new-key",
  "default_model": "gpt-4o-mini",
  "temperature": 0.5,
  "max_tokens": 8192
}
```

### zai_estimate_cost

Estimate the cost before making a call:

```json
{
  "model": "gpt-4o",
  "input_tokens": 1000,
  "output_tokens": 500
}
```

Returns a breakdown of input/output/total cost in USD.

## Usage with Coding Agents

Once installed, your coding agent can use Z.ai tools naturally. Example prompts:

> "Use zai_code_complete to generate a React hook for debouncing, in TypeScript."

> "List available Z.ai models and estimate the cost of processing 10K input tokens + 2K output tokens with gpt-4o."

> "Use zai_chat_complete to review this function for security issues."

The agent will automatically discover the tools via MCP and call them as needed.

## Build from Source

```bash
git clone https://github.com/kemalabuteliyte/zai-mcp-server.git
cd zai-mcp-server
npm install
npm run build
```

Run directly:

```bash
ZAI_API_KEY="your-key" node dist/index.js
```

## API Endpoints

| Endpoint | Used by |
|----------|---------|
| `https://api.z.ai/api/paas/v4` | `zai_chat_complete`, `zai_stream_complete`, `zai_list_models` |
| `https://api.z.ai/api/coding/paas/v4` | `zai_code_complete` |

## License

ISC
