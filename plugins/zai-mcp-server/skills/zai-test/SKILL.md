---
name: zai-test
description: This skill should be used when the user asks to "write tests", "generate tests", "add test coverage", "create unit tests", "test this function", or wants test generation delegated to Z.ai. Saves Claude tokens by offloading test writing to Z.ai non-reasoning models.
version: 1.2.0
---

You are delegating test generation to the Z.ai coding endpoint. Tests are high-volume, repetitive code — perfect for offloading to `glm-4.5-air` (non-reasoning, all tokens go to code).

## When to use

- User asks to write tests for a function, class, or module
- Adding test coverage to existing code
- Generating edge case tests
- Creating integration or snapshot tests

## How to execute

1. Read the source file(s) to test using the Read tool.
2. Detect the test framework from the project:
   - Check for `jest.config`, `vitest.config`, `pytest.ini`, `.mocharc`, `go test` patterns
   - Check existing test files for import patterns
3. Build a test generation prompt that includes:
   - The full source code to test
   - The test framework and assertion library
   - Import paths relative to the test file location
   - Any mocking patterns used in the project
4. Call `zai_code_complete`:
   - `messages`: System message with test rules + user message with code and framework info
   - `model`: `"glm-4.5-air"` (non-reasoning, cheapest, all tokens = test code)
   - `language`: The programming language
   - `temperature`: `0.3`
   - `max_tokens`: `4096` (tests are verbose — never go below 2000)
5. Write the test file to the correct location (matching project convention: `__tests__/`, `*.test.*`, `*.spec.*`, `_test.go`, etc.)
6. Run the tests to verify they pass. If they fail, read the error and fix with a targeted Edit — do NOT regenerate the entire test file.

## Test generation prompt template

System message:
```
You are a test engineer. Write comprehensive tests for the given code.
Rules:
1. Use [FRAMEWORK] with [ASSERTION_LIBRARY]
2. Cover: happy path, edge cases, error cases, boundary values
3. Use descriptive test names that explain the expected behavior
4. Mock external dependencies, not the unit under test
5. One assertion per test when possible
6. Output ONLY the test file code with all imports. No explanations.
```

## Model selection

| Scenario | Model | Why |
|----------|-------|-----|
| All test generation (default) | `glm-4.5-air` | Non-reasoning, cheap, all output = code |
| Tests needing complex reasoning about invariants | `glm-4.5` | Reasoning helps with edge case discovery |

## Example

User: "Write tests for this utility"

1. Read `src/utils/debounce.ts`
2. Check project uses vitest (found `vitest.config.ts`)
3. Call `zai_code_complete`:
```json
{
  "messages": [
    {"role": "system", "content": "Write comprehensive vitest tests. Use describe/it/expect. Cover happy path, edge cases, timing. Use vi.useFakeTimers(). Output only code."},
    {"role": "user", "content": "Write tests for:\n\n```typescript\nexport function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n```\n\nTest file location: src/utils/__tests__/debounce.test.ts\nImport: import { debounce } from '../debounce';"}
  ],
  "model": "glm-4.5-air",
  "language": "typescript",
  "temperature": 0.3,
  "max_tokens": 4096
}
```
4. Write result to `src/utils/__tests__/debounce.test.ts`
5. Run `npx vitest run src/utils/__tests__/debounce.test.ts` to verify.
