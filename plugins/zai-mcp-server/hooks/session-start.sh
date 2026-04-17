#!/bin/sh
# zai-mcp-server SessionStart hook
# - Verifies ZAI_API_KEY is configured
# - Injects a brief reminder that GLM delegation is available

if [ -z "$ZAI_API_KEY" ]; then
  KEY_STATUS="ZAI_API_KEY is NOT set. The zai_* MCP tools will fail until it is configured. Set it in ~/.claude/settings.json mcpServers.zai-mcp-server.env, or call zai_set_config."
else
  KEY_STATUS="ZAI_API_KEY detected (ending …${ZAI_API_KEY#${ZAI_API_KEY%????}})."
fi

CONTEXT="zai-mcp-server is active. ${KEY_STATUS}

Delegation guidance for this session:
- For substantial code generation, prefer the zai-generate skill or zai-coder agent over writing code inline.
- For multi-file features with independent units, use the zai-orchestrator agent or zai-parallel-tasks skill to dispatch GLM workers in parallel.
- Default model: glm-4.5-air (non-reasoning, cheapest, all output tokens are content).
- Reasoning models (glm-4.5, glm-5*) need max_tokens >= 2000 — they spend 80%+ of tokens on internal chain-of-thought."

# Emit JSON so SessionStart adds the text to context
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":%s}}\n' \
  "$(printf '%s' "$CONTEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || \
     printf '%s' "$CONTEXT" | awk 'BEGIN{printf "\""} {gsub(/\\/,"\\\\"); gsub(/"/,"\\\""); printf "%s\\n", $0} END{printf "\""}')"
