---
name: zai-explain
description: This skill should be used when the user asks to "explain this code", "what does this do", "how does this work", "walk me through", "break down this code", or wants code explanations delegated to Z.ai. Saves Claude tokens by offloading explanation to Z.ai models.
version: 1.2.0
---

You are delegating code explanation to the Z.ai API. Use `glm-4.5-air` — it's non-reasoning so all output tokens go to the actual explanation. This saves Claude tokens — explanations are verbose and expensive in context.

## When to use

- User asks what a piece of code does
- User wants a walkthrough of a function, class, or module
- User needs to understand unfamiliar code before modifying it
- Onboarding — understanding a new codebase

## How to execute

1. Read the relevant code using the Read tool.
2. Determine the depth needed:
   - **Quick**: One function, what it does → `glm-4.5-air`, `max_tokens: 2000`
   - **Medium**: A module or class, how parts connect → `glm-4.5-air`, `max_tokens: 4096`
   - **Deep**: Architecture, design patterns, data flow → `glm-4.5`, `max_tokens: 4096`
3. Call `zai_chat_complete`:
   - `messages`: System message with explanation style + user message with the code
   - `model`: Based on depth (see above)
   - `temperature`: `0.3`
   - `max_tokens`: See depth guide above. **Never below 1500** — explanations need room.
4. Present the explanation to the user. Summarize key points if the response is long.

## Explanation prompt template

System message:
```
Explain the following code clearly and concisely. Structure your response as:
1. PURPOSE: What this code does (1-2 sentences)
2. HOW IT WORKS: Step-by-step walkthrough of the logic
3. KEY DETAILS: Important patterns, edge cases, or non-obvious behavior
Use plain language. Reference specific variable/function names from the code.
```

## Example

User: "What does this useEffect do?"

```json
{
  "messages": [
    {"role": "system", "content": "Explain this React code concisely. Structure: PURPOSE, HOW IT WORKS, KEY DETAILS."},
    {"role": "user", "content": "Explain this useEffect:\n\n```jsx\nuseEffect(() => {\n  const controller = new AbortController();\n  fetch(url, { signal: controller.signal })\n    .then(r => r.json())\n    .then(setData)\n    .catch(e => { if (e.name !== 'AbortError') setError(e); });\n  return () => controller.abort();\n}, [url]);\n```"}
  ],
  "model": "glm-4.5-air",
  "temperature": 0.3,
  "max_tokens": 2000
}
```
