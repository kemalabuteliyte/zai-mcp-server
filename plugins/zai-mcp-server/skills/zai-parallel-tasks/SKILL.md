---
name: zai-parallel-tasks
description: This skill should be used when the user asks to "build a feature in parallel", "implement multiple files at once", "scaffold these in parallel", "fan out", "do these concurrently", or any task that decomposes into independent code units. Saves wall-clock time AND Claude tokens by dispatching multiple `zai_code_complete` calls concurrently to GLM models.
version: 1.3.0
---

You are coordinating parallel code generation across multiple Z.ai GLM workers. Your job is to split a feature into independent units, dispatch them concurrently in a single tool-call batch, then stitch the results back into the codebase. You NEVER write the code yourself.

## When to use

- Multi-file feature requests ("build a CRUD API for X — model, controller, routes, tests")
- Boilerplate fan-outs (5 React components, 10 DTOs, all DB migrations)
- Independent refactors across N files
- Test generation across a module's public surface

Skip this skill when units depend on each other's output (sequential pipeline) — use `zai-generate` per step instead.

## How to execute

### 1. Decompose

Break the request into independent units. Each unit must be self-contained — the prompt for unit B must NOT depend on the result of unit A. If they depend on each other, generate the shared types/interfaces first (one call), then fan out the rest.

Write the unit list as:
```
Unit 1: <file path> — <one-line goal> — <model>
Unit 2: <file path> — <one-line goal> — <model>
...
```

### 2. Dispatch in parallel

In a SINGLE message, emit N concurrent `zai_code_complete` tool calls. Claude Code will execute them in parallel.

For each call:
- `model`: `"glm-4.5-air"` (default — non-reasoning, all tokens go to code)
- `temperature`: `0.3`
- `max_tokens`: `2000` minimum (`4096` for full modules)
- `language`: detected language
- `messages`: self-contained system + user prompt with all needed context (types, imports, conventions)

### 3. Apply

After all calls return, write each result to its target file with Edit/Write. Do this in parallel too where possible.

### 4. Verify

Run the project's typecheck/build/test command once across all changes. If failures, dispatch a second parallel batch of fix calls — do NOT hand-fix.

## Cost & speed notes

- 5 parallel `glm-4.5-air` calls at ~500 output tokens each ≈ $0.0005 total
- Wall-clock time = max(individual call) instead of sum — typically 3–5x faster
- Claude's own output stays minimal: just the dispatch + file writes

## Anti-patterns

- Do not serialize calls when units are independent — always batch in one message
- Do not include another unit's expected output in a unit's prompt — that creates a hidden dependency
- Do not use reasoning models (`glm-5`, `glm-5-turbo`) for parallel boilerplate — they waste 80% of tokens on reasoning
- Do not regenerate units that compiled fine — only re-dispatch the failing ones

## Example

User: "Build a User CRUD API in Express + TypeScript — model, repository, controller, routes, tests."

1. Decompose:
   ```
   Unit 1: src/models/user.ts — Drizzle schema + types — glm-4.5-air
   Unit 2: src/repositories/user.repo.ts — CRUD repo using shared types — glm-4.5-air
   Unit 3: src/controllers/user.controller.ts — Express handlers — glm-4.5-air
   Unit 4: src/routes/user.routes.ts — Router wiring — glm-4.5-air
   Unit 5: src/__tests__/user.test.ts — Vitest suite — glm-4.5-air
   ```
2. Generate Unit 1 first (others depend on its types).
3. Dispatch Units 2–5 in a single parallel batch, each with the Unit 1 type definitions inlined as context.
4. Write all 4 files.
5. Run `npm run typecheck && npm test`.
