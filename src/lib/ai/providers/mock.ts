import type { AiProvider, AiTask, ProviderCall, ProviderResponse } from "../types";

/** Returns the object (or text) a mock call should produce. Tests and dev fixtures register these. */
export type MockResponder = (input: ProviderCall) => unknown;

const responders = new Map<AiTask, MockResponder>();

export function setMockResponder(task: AiTask, responder: MockResponder): void {
  responders.set(task, responder);
}

export function resetMockResponders(): void {
  responders.clear();
}

/** Rough token estimate so cost and budget code paths get exercised in mock mode. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Deterministic, free provider used when AI_PROVIDER_MODE=mock (the default).
 * Structured calls need a registered responder, so a missing fixture fails loudly
 * instead of returning plausible-looking junk.
 */
export const mockProvider: AiProvider = {
  name: "mock",

  async call(input: ProviderCall): Promise<ProviderResponse> {
    const responder = responders.get(input.task);
    let text: string;
    if (responder) {
      const out = responder(input);
      text = typeof out === "string" ? out : JSON.stringify(out);
    } else if (input.schema) {
      throw new Error(
        `No mock responder for task "${input.task}". Register one with setMockResponder() (src/lib/ai/providers/mock.ts).`,
      );
    } else {
      text = `[mock ${input.task}] ${input.prompt.slice(0, 80)}`;
    }
    return {
      text,
      model: "mock",
      inputTokens: estimateTokens((input.system ?? "") + input.prompt),
      outputTokens: estimateTokens(text),
    };
  },
};
