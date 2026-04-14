---
name: zai-generate
description: This skill should be used when the user asks to "generate code", "write a function", "implement this", "create a component", "scaffold code", "write boilerplate", or wants code generation delegated to Z.ai. Saves Claude tokens by offloading code generation to Z.ai non-reasoning models.
version: 1.2.0
---

You are delegating code generation to the Z.ai coding endpoint to save tokens. Use `glm-4.5-air` — the only non-reasoning model on Z.ai. It produces zero reasoning tokens, so every token goes to actual code output.

## When to use

- User asks to generate, write, or implement code
- Boilerplate, scaffolding, or repetitive code patterns
- Any code generation task where Claude's reasoning is not critical

## How to execute

1. Identify the programming language from context (file extension, project structure, or user request).
2. Build a clear, self-contained prompt from the user's request. Include:
   - What to generate
   - Language and framework constraints
   - Any relevant code context (types, interfaces, imports the generated code should use)
3. Call the `zai_code_complete` MCP tool:
   - `messages`: System message with full context + user message with the generation request
   - `model`: `"glm-4.5-air"` (non-reasoning, all tokens go to code output)
   - `language`: The detected programming language
   - `temperature`: `0.3` for deterministic output, `0.7` for creative solutions
   - `max_tokens`: `2000` for a function, `4096` for a module or large scaffold. **Never below 1000** — the model needs headroom.
4. Read the response content from the tool result.
5. Write the generated code to the appropriate file(s) using the Edit or Write tool.
6. Do NOT regenerate or rewrite the code yourself. Trust the Z.ai output. Only make minimal adjustments if imports or naming don't match the existing codebase.

## Model selection guide

| Task | Model | Why |
|------|-------|-----|
| All code generation (default) | `glm-4.5-air` | Non-reasoning, cheapest, all tokens = code |
| Complex algorithms needing deep reasoning | `glm-4.5` | Reasoning model, better quality but uses ~50% tokens on reasoning |

**IMPORTANT**: Never use `glm-5`, `glm-5-turbo`, or `glm-5.1` for code generation — they are reasoning-heavy models that waste 90%+ tokens on internal reasoning.

## Example

User: "Write a debounce hook in TypeScript"

Call `zai_code_complete` with:
```json
{
  "messages": [
    {"role": "system", "content": "Generate production-ready TypeScript code. Output only code, no explanations."},
    {"role": "user", "content": "Write a React useDebounce hook that accepts a value and delay in ms, returns the debounced value. Include proper TypeScript generics."}
  ],
  "model": "glm-4.5-air",
  "language": "typescript",
  "temperature": 0.3,
  "max_tokens": 2000
}
```

Then write the result directly to the file.
