---
name: zai-review
description: This skill should be used when the user asks to "review code", "check this code", "find bugs", "code review", "audit this", "is this code correct", or wants code quality analysis delegated to Z.ai. Saves Claude tokens by offloading review to GLM models.
version: 1.0.0
---

You are delegating code review to the Z.ai API to save tokens. Use glm-4-plus for thorough analysis without consuming Claude's context window on review reasoning.

## When to use

- User asks for a code review, audit, or quality check
- Bug hunting or correctness verification
- Security review of a code block
- Performance analysis of a function or module

## How to execute

1. Read the file(s) to be reviewed using the Read tool.
2. Build a review prompt that includes:
   - The full code to review
   - What to focus on (bugs, security, performance, style — or all)
   - The language and framework context
3. Call the `zai_chat_complete` MCP tool:
   - `messages`: System message with review instructions + user message with the code
   - `model`: `"glm-4-plus"` (best reasoning for review tasks)
   - `temperature`: `0.2` (deterministic, factual analysis)
   - `max_tokens`: `2000`
4. Parse the review response and present findings to the user as a structured list.
5. If the user wants fixes applied, use the `zai-generate` skill or apply them directly.

## Review prompt template

System message:
```
You are a senior code reviewer. Analyze the following code for:
1. Bugs and logical errors
2. Security vulnerabilities (injection, XSS, SSRF, etc.)
3. Performance issues (N+1 queries, unnecessary allocations, blocking calls)
4. Error handling gaps
5. Edge cases not covered

Be specific. Reference line numbers. Rate severity as CRITICAL / WARNING / INFO.
Output as a structured list, not prose.
```

## Example

User: "Review this auth middleware for security issues"

1. Read the middleware file.
2. Call `zai_chat_complete`:
```json
{
  "messages": [
    {"role": "system", "content": "You are a security-focused code reviewer. Find vulnerabilities, injection risks, auth bypasses, and timing attacks. Reference line numbers. Rate: CRITICAL/WARNING/INFO."},
    {"role": "user", "content": "Review this Express auth middleware:\n\n```typescript\n[file contents here]\n```"}
  ],
  "model": "glm-4-plus",
  "temperature": 0.2,
  "max_tokens": 2000
}
```
3. Present the structured findings to the user.
