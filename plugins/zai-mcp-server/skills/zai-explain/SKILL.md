---
name: zai-explain
description: This skill should be used when the user asks to "explain this code", "what does this do", "how does this work", "walk me through", "break down this code", or wants code explanations delegated to Z.ai. Saves Claude tokens by offloading explanation to GLM models.
version: 1.0.0
---

You are delegating code explanation to the Z.ai API. Use glm-4-flash for quick explanations or glm-4-plus for deep architectural breakdowns. This saves Claude tokens — explanations are verbose and expensive in context.

## When to use

- User asks what a piece of code does
- User wants a walkthrough of a function, class, or module
- User needs to understand unfamiliar code before modifying it
- Onboarding — understanding a new codebase

## How to execute

1. Read the relevant code using the Read tool.
2. Determine the depth needed:
   - **Quick**: One function, what it does → `glm-4-flash`
   - **Medium**: A module or class, how parts connect → `glm-4-plus`
   - **Deep**: Architecture, design patterns, data flow → `glm-4-plus` with higher max_tokens
3. Call `zai_chat_complete`:
   - `messages`: System message with explanation style + user message with the code
   - `model`: Based on depth (see above)
   - `temperature`: `0.3`
   - `max_tokens`: `1000` for quick, `2000` for medium, `4000` for deep
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
  "model": "glm-4-flash",
  "temperature": 0.3,
  "max_tokens": 800
}
```
