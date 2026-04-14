#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
// ── Config ──────────────────────────────────────────────────────────────────
const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";
const ZAI_CODING_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
const config = {
    apiKey: process.env.ZAI_API_KEY ?? "",
    defaultModel: "glm-4.5-air",
    temperature: 0.7,
    maxTokens: 4096,
};
function getClient(baseURL = ZAI_BASE_URL) {
    if (!config.apiKey) {
        throw new Error("ZAI_API_KEY is not set. Use zai_set_config or set the ZAI_API_KEY environment variable.");
    }
    return new openai_1.default({ apiKey: config.apiKey, baseURL });
}
// ── Pricing table (USD per 1K tokens) ───────────────────────────────────────
const PRICING = {
    // Non-reasoning (truly non-agentic, token-efficient)
    "glm-4.5-air": { input: 0.0002, output: 0.0002 },
    // Reasoning models (use more tokens internally)
    "glm-4.5": { input: 0.0005, output: 0.0005 },
    "glm-4.6": { input: 0.0005, output: 0.0005 },
    "glm-4.7": { input: 0.0008, output: 0.0008 },
    "glm-5": { input: 0.001, output: 0.001 },
    "glm-5-turbo": { input: 0.0008, output: 0.0008 },
    "glm-5.1": { input: 0.001, output: 0.001 },
};
// ── Shared Zod shapes ───────────────────────────────────────────────────────
const MessageSchema = zod_1.z.object({
    role: zod_1.z.enum(["system", "user", "assistant"]),
    content: zod_1.z.string(),
});
// ── MCP Server ──────────────────────────────────────────────────────────────
const server = new mcp_js_1.McpServer({
    name: "zai-mcp-server",
    version: "1.2.0",
});
// ── Tool 1: zai_chat_complete ───────────────────────────────────────────────
server.tool("zai_chat_complete", "Send a chat completion request to Z.ai API. Returns the model's response.", {
    messages: zod_1.z.array(MessageSchema).describe("Array of chat messages"),
    model: zod_1.z.string().optional().describe("Model name (defaults to config default)"),
    temperature: zod_1.z.number().min(0).max(2).optional().describe("Sampling temperature"),
    max_tokens: zod_1.z.number().int().positive().optional().describe("Max tokens to generate"),
}, async (args) => {
    const client = getClient();
    const response = await client.chat.completions.create({
        model: args.model ?? config.defaultModel,
        messages: args.messages,
        temperature: args.temperature ?? config.temperature,
        max_tokens: args.max_tokens ?? config.maxTokens,
    });
    const choice = response.choices[0];
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    id: response.id,
                    model: response.model,
                    content: choice?.message?.content ?? "",
                    finish_reason: choice?.finish_reason,
                    usage: response.usage,
                }, null, 2),
            },
        ],
    };
});
// ── Tool 2: zai_code_complete ───────────────────────────────────────────────
server.tool("zai_code_complete", "Send a code completion request to Z.ai coding endpoint. Optimized for code generation tasks.", {
    messages: zod_1.z.array(MessageSchema).describe("Array of chat messages for code generation"),
    model: zod_1.z.string().optional().describe("Model name (defaults to config default)"),
    temperature: zod_1.z.number().min(0).max(2).optional().describe("Sampling temperature"),
    max_tokens: zod_1.z.number().int().positive().optional().describe("Max tokens to generate"),
    language: zod_1.z.string().optional().describe("Programming language hint"),
}, async (args) => {
    const client = getClient(ZAI_CODING_BASE_URL);
    const messages = args.language
        ? [
            { role: "system", content: `You are a coding assistant. Language: ${args.language}` },
            ...args.messages,
        ]
        : args.messages;
    const response = await client.chat.completions.create({
        model: args.model ?? config.defaultModel,
        messages,
        temperature: args.temperature ?? config.temperature,
        max_tokens: args.max_tokens ?? config.maxTokens,
    });
    const choice = response.choices[0];
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    id: response.id,
                    model: response.model,
                    content: choice?.message?.content ?? "",
                    finish_reason: choice?.finish_reason,
                    usage: response.usage,
                }, null, 2),
            },
        ],
    };
});
// ── Tool 3: zai_list_models ─────────────────────────────────────────────────
server.tool("zai_list_models", "List all available models from the Z.ai API.", {}, async () => {
    const client = getClient();
    const list = await client.models.list();
    const models = [];
    for await (const model of list) {
        models.push({ id: model.id, created: model.created, owned_by: model.owned_by });
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ models, count: models.length }, null, 2),
            },
        ],
    };
});
// ── Tool 4: zai_stream_complete ─────────────────────────────────────────────
server.tool("zai_stream_complete", "Send a streaming chat completion to Z.ai API. Collects all chunks and returns the full response.", {
    messages: zod_1.z.array(MessageSchema).describe("Array of chat messages"),
    model: zod_1.z.string().optional().describe("Model name (defaults to config default)"),
    temperature: zod_1.z.number().min(0).max(2).optional().describe("Sampling temperature"),
    max_tokens: zod_1.z.number().int().positive().optional().describe("Max tokens to generate"),
}, async (args) => {
    const client = getClient();
    const stream = await client.chat.completions.create({
        model: args.model ?? config.defaultModel,
        messages: args.messages,
        temperature: args.temperature ?? config.temperature,
        max_tokens: args.max_tokens ?? config.maxTokens,
        stream: true,
    });
    let fullContent = "";
    let finishReason = null;
    let model = "";
    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
            fullContent += delta.content;
        }
        if (chunk.choices[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason;
        }
        if (chunk.model) {
            model = chunk.model;
        }
    }
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    model,
                    content: fullContent,
                    finish_reason: finishReason,
                }, null, 2),
            },
        ],
    };
});
// ── Tool 5: zai_set_config ──────────────────────────────────────────────────
server.tool("zai_set_config", "Update Z.ai client configuration (API key, default model, temperature, max tokens).", {
    api_key: zod_1.z.string().optional().describe("Z.ai API key"),
    default_model: zod_1.z.string().optional().describe("Default model name"),
    temperature: zod_1.z.number().min(0).max(2).optional().describe("Default sampling temperature"),
    max_tokens: zod_1.z.number().int().positive().optional().describe("Default max tokens"),
}, async (args) => {
    if (args.api_key !== undefined)
        config.apiKey = args.api_key;
    if (args.default_model !== undefined)
        config.defaultModel = args.default_model;
    if (args.temperature !== undefined)
        config.temperature = args.temperature;
    if (args.max_tokens !== undefined)
        config.maxTokens = args.max_tokens;
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    message: "Configuration updated successfully.",
                    config: {
                        api_key: config.apiKey ? "***" + config.apiKey.slice(-4) : "(not set)",
                        default_model: config.defaultModel,
                        temperature: config.temperature,
                        max_tokens: config.maxTokens,
                    },
                }, null, 2),
            },
        ],
    };
});
// ── Tool 6: zai_estimate_cost ───────────────────────────────────────────────
server.tool("zai_estimate_cost", "Estimate the cost of a Z.ai API call based on model and token counts.", {
    model: zod_1.z.string().optional().describe("Model name (defaults to config default)"),
    input_tokens: zod_1.z.number().int().nonnegative().describe("Number of input/prompt tokens"),
    output_tokens: zod_1.z.number().int().nonnegative().describe("Number of output/completion tokens"),
}, async (args) => {
    const modelName = args.model ?? config.defaultModel;
    const pricing = PRICING[modelName];
    if (!pricing) {
        const available = Object.keys(PRICING).join(", ");
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: `No pricing data for model "${modelName}".`,
                        available_models: available,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
    const inputCost = (args.input_tokens / 1000) * pricing.input;
    const outputCost = (args.output_tokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    model: modelName,
                    input_tokens: args.input_tokens,
                    output_tokens: args.output_tokens,
                    input_cost_usd: `$${inputCost.toFixed(6)}`,
                    output_cost_usd: `$${outputCost.toFixed(6)}`,
                    total_cost_usd: `$${totalCost.toFixed(6)}`,
                    pricing_per_1k: pricing,
                }, null, 2),
            },
        ],
    };
});
// ── Start ───────────────────────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("zai-mcp-server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map