import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AiCallLog, ProviderCall } from "@/lib/ai";

// Live-mode tests swap the real providers for these stubs (no network, no keys).
const anthropicCall = vi.fn<(input: ProviderCall) => Promise<unknown>>();
const googleCall = vi.fn<(input: ProviderCall) => Promise<unknown>>();
vi.mock("@/lib/ai/providers/anthropic", () => ({
  anthropicProvider: { name: "anthropic", call: (i: ProviderCall) => anthropicCall(i) },
}));
vi.mock("@/lib/ai/providers/google", () => ({
  googleProvider: { name: "google", call: (i: ProviderCall) => googleCall(i) },
}));

const { generateText, generateObject, configureAi, setMockResponder, resetMockResponders, AiFailedError } =
  await import("@/lib/ai");

const Greeting = z.object({ greeting: z.string().min(1), lang: z.enum(["sl", "hr"]) });

let logs: AiCallLog[];

beforeEach(() => {
  logs = [];
  configureAi({ log: (e) => void logs.push(e), beforeCall: () => {} });
  resetMockResponders();
  anthropicCall.mockReset();
  googleCall.mockReset();
  delete process.env.AI_PROVIDER_MODE;
});

afterEach(() => {
  delete process.env.AI_PROVIDER_MODE;
});

describe("mock mode (default)", () => {
  it("returns text without any keys", async () => {
    const res = await generateText({ task: "outreach", prompt: "Pozdravljeni" });
    expect(res.provider).toBe("mock");
    expect(res.data).toContain("[mock outreach]");
    expect(res.costUsdMicros).toBe(0);
    expect(logs).toHaveLength(1);
  });

  it("validates structured output from a registered responder", async () => {
    setMockResponder("outreach", () => ({ greeting: "Pozdravljeni", lang: "sl" }));
    const res = await generateObject({ task: "outreach", prompt: "x" }, Greeting);
    expect(res.data).toEqual({ greeting: "Pozdravljeni", lang: "sl" });
  });

  it("retries once with the validation error, then succeeds", async () => {
    const prompts: string[] = [];
    let calls = 0;
    setMockResponder("outreach", (input) => {
      prompts.push(input.prompt);
      calls += 1;
      return calls === 1 ? { greeting: "", lang: "de" } : { greeting: "Dober dan", lang: "sl" };
    });
    const res = await generateObject({ task: "outreach", prompt: "base" }, Greeting);
    expect(res.data.greeting).toBe("Dober dan");
    expect(prompts[1]).toContain("not valid for the required JSON schema");
    expect(logs.map((l) => l.ok)).toEqual([false, true]);
  });

  it("fails after two invalid answers", async () => {
    setMockResponder("outreach", () => "not json");
    await expect(generateObject({ task: "outreach", prompt: "x" }, Greeting)).rejects.toBeInstanceOf(
      AiFailedError,
    );
  });

  it("fails loudly when a structured call has no mock responder", async () => {
    await expect(generateObject({ task: "site_content", prompt: "x" }, Greeting)).rejects.toThrow(
      /No mock responder/,
    );
  });

  it("lets beforeCall block a call (budget cap)", async () => {
    configureAi({
      beforeCall: () => {
        throw new Error("Monthly budget reached");
      },
    });
    await expect(generateText({ task: "outreach", prompt: "x" })).rejects.toThrow("Monthly budget reached");
    expect(logs).toHaveLength(0);
  });
});

describe("live mode routing", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER_MODE = "live";
  });

  it("uses the primary route and computes cost", async () => {
    anthropicCall.mockResolvedValue({
      text: '{"greeting":"Živijo","lang":"sl"}',
      model: "claude-opus-5-5",
      inputTokens: 1_000,
      outputTokens: 500,
    });
    const res = await generateObject({ task: "outreach", prompt: "x", promptVersion: "1" }, Greeting);
    expect(res.provider).toBe("anthropic");
    // 1000 × $4/M + 500 × $20/M = $0.014 = 14,000 micro-USD
    expect(res.costUsdMicros).toBe(14_000);
    expect(anthropicCall.mock.calls[0]![0]).toMatchObject({ model: "claude-opus-5-5", effort: "medium" });
    expect(googleCall).not.toHaveBeenCalled();
    expect(logs[0]).toMatchObject({ ok: true, promptVersion: "1", costUsdMicros: 14_000 });
  });

  it("falls back to the other provider when the primary errors", async () => {
    anthropicCall.mockRejectedValue(new Error("overloaded"));
    googleCall.mockResolvedValue({ text: "Hvala", model: "gemini-3.8-flash", inputTokens: 10, outputTokens: 5 });
    const res = await generateText({ task: "outreach", prompt: "x" });
    expect(res.provider).toBe("google");
    expect(res.data).toBe("Hvala");
    expect(logs.map((l) => [l.provider, l.ok])).toEqual([
      ["anthropic", false],
      ["google", true],
    ]);
  });

  it("routes classification to Gemini first", async () => {
    googleCall.mockResolvedValue({ text: "ok", model: "gemini-3.5-flash-lite", inputTokens: 1, outputTokens: 1 });
    await generateText({ task: "classify", prompt: "x" });
    expect(googleCall.mock.calls[0]![0].model).toBe("gemini-3.5-flash-lite");
    expect(anthropicCall).not.toHaveBeenCalled();
  });

  it("reports every cause when all routes fail", async () => {
    anthropicCall.mockRejectedValue(new Error("a down"));
    googleCall.mockRejectedValue(new Error("g down"));
    const err = await generateText({ task: "outreach", prompt: "x" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiFailedError);
    expect((err as InstanceType<typeof AiFailedError>).causes.map((c) => c.message)).toEqual(["a down", "g down"]);
  });
});
