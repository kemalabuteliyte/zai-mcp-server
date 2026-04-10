---
name: zai-refactor
description: This skill should be used when the user asks to "refactor this", "clean up this code", "simplify", "optimize", "improve code quality", "make this more readable", or wants code refactoring delegated to Z.ai. Saves Claude tokens by offloading refactoring to GLM models.
version: 1.0.0
---

You are delegating code refactoring to the Z.ai coding endpoint. Use glm-4-plus for quality refactoring output without burning Claude tokens on rewriting code.

## When to use

- User asks to refactor, clean up, or simplify code
- Extracting functions, reducing duplication
- Improving readability or performance
- Converting patterns (callbacks to async/await, class to functional, etc.)

## How to execute

1. Read the file(s) to refactor using the Read tool.
2. Identify what needs refactoring and the constraints:
   - Must preserve behavior (no functional changes unless asked)
   - Respect existing code style and naming conventions
   - Keep the same exports/interfaces
3. Call `zai_code_complete`:
   - `messages`: System message with refactoring rules + user message with the code and what to improve
   - `model`: `"glm-4-plus"` (needs good reasoning for safe refactoring)
   - `language`: The programming language
   - `temperature`: `0.2` (conservative — refactoring should be predictable)
   - `max_tokens`: At least as many tokens as the original code, plus 50% headroom
4. Diff the original and refactored code mentally. Verify:
   - Same exports / public API
   - No logic changes unless explicitly requested
   - No new dependencies introduced
5. Apply the refactored code using Edit tool. Prefer targeted edits over full file rewrites.

## Refactoring prompt template

System message:
```
You are a senior developer performing a code refactoring. Rules:
1. PRESERVE all existing behavior — this is a refactor, not a rewrite
2. Keep the same public API (exports, function signatures, types)
3. Apply: extract functions, reduce duplication, improve naming, simplify control flow
4. Do NOT add comments, docstrings, or type annotations unless asked
5. Do NOT add error handling or validation that wasn't there before
6. Output ONLY the refactored code, no explanations
```

## Example

User: "Refactor this to reduce duplication"

```json
{
  "messages": [
    {"role": "system", "content": "Refactor this code to reduce duplication. Preserve behavior and public API. Output only code."},
    {"role": "user", "content": "Refactor this TypeScript module:\n\n```typescript\n[original code here]\n```"}
  ],
  "model": "glm-4-plus",
  "language": "typescript",
  "temperature": 0.2,
  "max_tokens": 3000
}
```

Then apply changes via Edit tool, targeting specific functions that changed.
