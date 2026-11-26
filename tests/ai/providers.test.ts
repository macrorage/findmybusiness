/**
 * Checks the exact request shape each provider sends, with the SDKs stubbed out.
 * (Real calls need keys: PROGRESS 👤 H1.)
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const parse = vi.fn();
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = { messages: { parse, create } };
  },
}));

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { anthropicProvider } = await import("@/lib/ai/providers/anthropic");
const { googleProvider } = await import("@/lib/ai/providers/google");
const { AiRefusalError, AiValidationError } = await import("@/lib/ai/errors");

const Schema = z.object({ ok: z.boolean() });
const image = { mimeType: "image/png" as const, base64: "iVBORw0KGgo=" };

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.GEMINI_API_KEY = "test-key";
});

beforeEach(() => {
  parse.mockReset();
  create.mockReset();
  generateContent.mockReset();
});

const usage = { input_tokens: 12, output_tokens: 34 };

describe("anthropic provider", () => {
  it("sends structured output, effort, image and the default refusal fallback", async () => {
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      model: "claude-opus-5-5",
      content: [{ type: "text", text: '{"ok":true}' }],
      parsed_output: { ok: true },
      usage,
    });
    const res = await anthropicProvider.call({
      task: "outdated_vision",
      model: "claude-opus-5-5",
      effort: "low",
      system: "sys",
      prompt: "Rate this site",
      images: [image],
      schema: Schema,
      maxTokens: 2000,
    });

    const params = parse.mock.calls[0]![0];
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: "sys",
      output_config: { effort: "low" },
    });
    expect(params.output_config.format).toBeDefined();
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("thinking");
    expect(params.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64" } });
    expect(params.messages[0].content[1]).toEqual({ type: "text", text: "Rate this site" });
    expect(res).toMatchObject({ parsed: { ok: true }, inputTokens: 12, outputTokens: 34 });
  });

  it("uses create() for plain text", async () => {
    create.mockResolvedValue({
      stop_reason: "end_turn",
      model: "claude-opus-5-5",
      content: [{ type: "thinking", thinking: "" }, { type: "text", text: "Pozdravljeni" }],
      usage,
    });
    const res = await anthropicProvider.call({ task: "outreach", model: "claude-opus-5-5", prompt: "x", maxTokens: 100 });
    expect(res.text).toBe("Pozdravljeni");
    expect(parse).not.toHaveBeenCalled();
  });

  it("turns a refusal into AiRefusalError", async () => {
    create.mockResolvedValue({
      stop_reason: "refusal",
      stop_details: { category: "cyber" },
      model: "claude-opus-5-5",
      content: [],
      usage,
    });
    await expect(
      anthropicProvider.call({ task: "outreach", model: "claude-opus-5-5", prompt: "x", maxTokens: 100 }),
    ).rejects.toBeInstanceOf(AiRefusalError);
  });

  it("turns a null parsed_output into AiValidationError", async () => {
    parse.mockResolvedValue({
      stop_reason: "max_tokens",
      model: "claude-opus-5-5",
      content: [{ type: "text", text: '{"ok":' }],
      parsed_output: null,
      usage,
    });
    await expect(
      anthropicProvider.call({ task: "outreach", model: "claude-opus-5-5", prompt: "x", schema: Schema, maxTokens: 10 }),
    ).rejects.toBeInstanceOf(AiValidationError);
  });
});

describe("google provider", () => {
  it("sends a JSON schema, inline image and counts thinking tokens as output", async () => {
    generateContent.mockResolvedValue({
      text: '{"ok":true}',
      candidates: [{ finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 30 },
    });
    const res = await googleProvider.call({
      task: "outdated_vision",
      model: "gemini-3.5-flash-lite",
      system: "sys",
      prompt: "Rate",
      images: [image],
      schema: Schema,
      maxTokens: 2000,
    });
    const params = generateContent.mock.calls[0]![0];
    expect(params.model).toBe("gemini-3.5-flash-lite");
    expect(params.config).toMatchObject({
      maxOutputTokens: 2000,
      systemInstruction: "sys",
      responseMimeType: "application/json",
    });
    expect(params.config.responseJsonSchema).toMatchObject({ type: "object" });
    expect(params.contents[0].parts[0]).toEqual({ inlineData: { mimeType: "image/png", data: image.base64 } });
    expect(res).toMatchObject({ text: '{"ok":true}', inputTokens: 100, outputTokens: 50 });
  });

  it("turns a safety block into AiRefusalError", async () => {
    generateContent.mockResolvedValue({ text: "", candidates: [{ finishReason: "SAFETY" }] });
    await expect(
      googleProvider.call({ task: "classify", model: "gemini-3.5-flash-lite", prompt: "x", maxTokens: 10 }),
    ).rejects.toBeInstanceOf(AiRefusalError);
  });
});
