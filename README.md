# zai-mcp-server

A Claude Code plugin that makes your coding agent **token-efficient** by delegating code generation, review, testing, and refactoring to **Z.ai non-agentic models** (GLM-4, CodeGeeX) via MCP.

## Why?

Claude is great at reasoning but expensive when writing large amounts of code. This plugin offloads the heavy lifting:

- **Save tokens** — Code generation, test writing, and boilerplate go to cheap GLM/CodeGeeX models instead of consuming Claude context
- **Non-agentic models only** — Uses glm-4-plus, glm-4-flash, codegeex-4 — fast, cheap, no reasoning overhead
- **Claude stays in control** — Claude reads, plans, and orchestrates; Z.ai writes the code
- **5 skills + 2 agents** — Ready-to-use workflows for generate, review, explain, refactor, and test

## Install as Claude Code Plugin (Marketplace)

Open Claude Code **Settings > Plugins > Add Marketplace**, paste:

```
kemalabuteliyte/zai-mcp-server
```

Click **Sync**, then install the plugin from the marketplace. Set your `ZAI_API_KEY` when prompted.

### Or via CLI (MCP server only)

```bash
claude mcp add zai-mcp-server -- npx -y github:kemalabuteliyte/zai-mcp-server
```

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

## Skills

Skills are invoked with `/zai-mcp-server:<skill>` or triggered automatically when Claude detects a matching request.

| Skill | Trigger | Model Used |
|-------|---------|------------|
| `zai-generate` | "generate code", "write a function", "implement this" | `codegeex-4` / `glm-4-plus` |
| `zai-review` | "review code", "find bugs", "audit this" | `glm-4-plus` |
| `zai-explain` | "explain this code", "what does this do" | `glm-4-flash` / `glm-4-plus` |
| `zai-refactor` | "refactor this", "clean up", "simplify" | `glm-4-plus` |
| `zai-test` | "write tests", "add test coverage" | `codegeex-4` / `glm-4-plus` |

### How skills save tokens

Instead of Claude generating code in its response (expensive), skills instruct Claude to:
1. Read the relevant code locally (cheap — file reads don't cost output tokens)
2. Send a targeted prompt to Z.ai via MCP tool call (cheap — GLM models cost ~10-50x less)
3. Apply the Z.ai response directly to files (cheap — Edit/Write tools, minimal Claude output)

## Agents

| Agent | Purpose | Model |
|-------|---------|-------|
| `zai-coder` | End-to-end feature implementation. Claude plans, Z.ai writes all code. | sonnet (orchestrator) + glm-4-plus/codegeex-4 (code) |
| `zai-reviewer` | Code review and security audit. Reads locally, analyzes via Z.ai. | haiku (orchestrator) + glm-4-plus (analysis) |

### zai-coder agent

Use for substantial coding tasks — multi-file features, scaffolding, migrations. The agent:
- Reads and understands the codebase (using Claude)
- Generates ALL code via `zai_code_complete` (using Z.ai GLM/CodeGeeX)
- Applies and verifies the results
- Never writes code in its own response

### zai-reviewer agent

Use for code review, PR review, security audit. The agent:
- Gathers diffs and reads changed files locally
- Sends code to `zai_chat_complete` with a structured review prompt
- Presents findings sorted by severity (CRITICAL > WARNING > INFO)

## Model Selection Guide

All models are **non-agentic** — no chain-of-thought overhead, no tool-use loops, just fast completion.

| Model | Best for | Cost | Speed |
|-------|----------|------|-------|
| `codegeex-4` | Code generation, tests, boilerplate | Cheapest | Fast |
| `glm-4-flash` | Quick explanations, one-liners, small edits | Very cheap | Fastest |
| `glm-4-air` | General tasks, balanced quality/cost | Cheap | Fast |
| `glm-4-plus` | Complex logic, review, refactoring, architecture | Moderate | Medium |
| `glm-4-long` | Large file generation, long context | Cheap | Medium |

Default model: `glm-4-plus`. Override per-call or globally via `zai_set_config`.

## Tool Details

### zai_chat_complete

Send a chat completion request to Z.ai.

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Explain closures in JavaScript." }
  ],
  "model": "glm-4-plus",
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
  "model": "glm-4-plus"
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
  "default_model": "glm-4-flash",
  "temperature": 0.5,
  "max_tokens": 8192
}
```

### zai_estimate_cost

Estimate the cost before making a call:

```json
{
  "model": "glm-4-plus",
  "input_tokens": 1000,
  "output_tokens": 500
}
```

Returns a breakdown of input/output/total cost in USD.

## Usage Examples

Once installed, Claude automatically uses Z.ai via skills and agents:

```
/zai-mcp-server:zai-generate  → "Write a REST API for user management in Express"
/zai-mcp-server:zai-review    → "Review src/auth.ts for security issues"
/zai-mcp-server:zai-test      → "Write tests for the UserService class"
/zai-mcp-server:zai-refactor  → "Refactor this to reduce duplication"
/zai-mcp-server:zai-explain   → "Explain how the caching layer works"
```

Or use agents for larger tasks:

> "Use the zai-coder agent to implement a full CRUD API for products with validation and tests."

> "Use the zai-reviewer agent to review all changes on this branch."

Skills also trigger automatically when Claude detects matching requests — no slash command needed.

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
