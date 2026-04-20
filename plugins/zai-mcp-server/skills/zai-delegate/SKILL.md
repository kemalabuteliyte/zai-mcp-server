---
name: zai-delegate
description: This skill should be used when the user explicitly asks to "delegate this to GLM", "send this to Z.ai", "use the cheap model", "save tokens on this", or any general-purpose handoff to a Z.ai model that doesn't fit the more specific zai-generate / zai-review / zai-test / zai-refactor / zai-explain skills. The escape hatch for arbitrary delegation.
version: 1.3.1
---

> **Environment note**: Steps that read files (Bash/Read) or write results (Edit/Write) require Claude Code CLI. In Claude Desktop, paste the relevant content into your prompt and the GLM output will be shown as text — file writes are skipped.

You are the general-purpose delegation entry point for Z.ai. Use this skill when the user wants Claude to offload a task to a cheaper GLM model but the task does not match a more specific skill (generate, review, test, refactor, explain).

## When to use

- User says "delegate this", "send to GLM", "save tokens", "use the cheap model"
- Task is open-ended (summarize this log, classify these errors, draft a commit message, etc.)
- A more specific `zai-*` skill does NOT apply

If the task is clearly code generation → use `zai-generate`. Code review → `zai-review`. Etc.

## How to execute

1. **Pick the endpoint:**
   - Code-shaped output (any language, snippets, refactors) → `zai_code_complete`
   - Prose, classification, summarization, planning → `zai_chat_complete`

2. **Pick the model:**
   - Default: `glm-4.5-air` — non-reasoning, every token is output, cheapest
   - Only escalate to `glm-4.5` if the task needs multi-step reasoning the user explicitly flagged as complex

3. **Build a self-contained prompt.** The GLM model has zero memory of the conversation. Inline:
   - The actual content to operate on (file contents, log excerpt, diff, etc.)
   - The exact output format expected
   - Any constraints (length, tone, framework conventions)

4. **Set parameters:**
   - `temperature`: `0.2` for deterministic tasks (classification, extraction), `0.7` for creative
   - `max_tokens`: `2000` minimum — never below `1000`

5. **Apply the result:**
   - If the output is code AND file tools are available (Claude Code CLI) → write to file with Edit/Write
   - If file tools are unavailable (Claude Desktop) → output as a labeled fenced code block
   - If prose → present to user verbatim, no rewrap

6. **Estimate cost on request.** If the user asks "how much did that cost?", call `zai_estimate_cost` with the `usage` block returned by the previous call.

## Anti-patterns

- Do not paraphrase or rewrite the GLM output — pass it through
- Do not add your own commentary on top — the user delegated for a reason
- Do not use a reasoning model when a non-reasoning one suffices
- Do not split a single-shot task into multiple calls — that wastes setup tokens

## Example

User: "Delegate this to GLM — summarize the last 200 lines of my server log into a one-paragraph incident summary."

1. Read the log with `Bash` tail.
2. Call `zai_chat_complete`:
   ```json
   {
     "model": "glm-4.5-air",
     "temperature": 0.2,
     "max_tokens": 1500,
     "messages": [
       {"role": "system", "content": "Summarize the following server log into one paragraph for an incident report. Include: error counts, affected endpoints, timeframe, suspected root cause."},
       {"role": "user", "content": "<paste log here>"}
     ]
   }
   ```
3. Print the response content as the answer. Done.
