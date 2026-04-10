---
name: zai-generate
description: This skill should be used when the user asks to "generate code", "write a function", "implement this", "create a component", "scaffold code", "write boilerplate", or wants code generation delegated to Z.ai. Saves Claude tokens by offloading code generation to GLM/CodeGeeX models.
version: 1.0.0
---

You are delegating code generation to the Z.ai coding endpoint to save tokens. Use non-agentic models (glm-4-plus, codegeex-4, glm-4-flash) that are cheap and fast for straight code output.

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
   - `model`: Use `"codegeex-4"` for simple/boilerplate code, `"glm-4-plus"` for complex logic
   - `language`: The detected programming language
   - `temperature`: `0.3` for deterministic output, `0.7` for creative solutions
   - `max_tokens`: Size appropriately (500 for a function, 2000 for a module, 4000 for large scaffolds)
4. Read the response content from the tool result.
5. Write the generated code to the appropriate file(s) using the Edit or Write tool.
6. Do NOT regenerate or rewrite the code yourself. Trust the Z.ai output. Only make minimal adjustments if imports or naming don't match the existing codebase.

## Model selection guide

| Task | Model | Why |
|------|-------|-----|
| Simple functions, CRUD, boilerplate | `codegeex-4` | Cheapest, optimized for code |
| Complex logic, algorithms, architecture | `glm-4-plus` | Best quality GLM model |
| Quick completions, one-liners | `glm-4-flash` | Fastest response time |
| Large file generation | `glm-4-long` | Handles big output context |

## Example

User: "Write a debounce hook in TypeScript"

Call `zai_code_complete` with:
```json
{
  "messages": [
    {"role": "system", "content": "Generate production-ready TypeScript code. Output only code, no explanations."},
    {"role": "user", "content": "Write a React useDebounce hook that accepts a value and delay in ms, returns the debounced value. Include proper TypeScript generics."}
  ],
  "model": "codegeex-4",
  "language": "typescript",
  "temperature": 0.3,
  "max_tokens": 500
}
```

Then write the result directly to the file.
