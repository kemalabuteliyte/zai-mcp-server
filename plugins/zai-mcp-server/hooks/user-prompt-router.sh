#!/bin/sh
# zai-mcp-server UserPromptSubmit hook
# Reads the prompt from stdin (JSON with `prompt` field), detects heavy-codegen
# verbs, and injects a hint suggesting the matching zai-* skill or agent.
# Never blocks — only adds context when a match is found.

INPUT=$(cat)

# Extract prompt text portably (no jq dependency)
PROMPT=$(printf '%s' "$INPUT" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print(d.get("prompt","").lower())
except Exception:
    pass' 2>/dev/null)

if [ -z "$PROMPT" ]; then
  exit 0
fi

HINT=""

case "$PROMPT" in
  *"in parallel"*|*"at the same time"*|*"concurrently"*|*"fan out"*|*"all at once"*)
    HINT="Multiple-unit / parallel request detected. Consider invoking the zai-orchestrator agent or the zai-parallel-tasks skill to dispatch GLM workers concurrently — saves wall-clock time and Claude tokens."
    ;;
  *"scaffold"*|*"boilerplate"*|*"crud"*|*"build a feature"*|*"implement a full"*|*"end-to-end"*)
    HINT="Substantial code-gen request detected. The zai-coder agent (single-file path) or zai-orchestrator agent (multi-file path) will offload code generation to GLM and save Claude tokens."
    ;;
  *"write tests"*|*"add tests"*|*"test coverage"*|*"unit tests for"*)
    HINT="Test-gen request detected. The zai-test skill delegates test writing to glm-4.5-air."
    ;;
  *"review"*|*"audit"*|*"find bugs"*|*"security check"*)
    HINT="Review request detected. The zai-review skill or zai-reviewer agent will run the analysis on GLM."
    ;;
  *"refactor"*|*"clean up"*|*"simplify this"*|*"reduce duplication"*)
    HINT="Refactor request detected. The zai-refactor skill delegates the rewrite to GLM."
    ;;
  *"explain"*|*"what does this do"*|*"how does this work"*)
    HINT="Explanation request detected. The zai-explain skill delegates the explanation to glm-4.5-air."
    ;;
esac

if [ -z "$HINT" ]; then
  exit 0
fi

CONTEXT="[zai-mcp-server router] ${HINT}"

printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":%s}}\n' \
  "$(printf '%s' "$CONTEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || \
     printf '"%s"' "$CONTEXT")"
