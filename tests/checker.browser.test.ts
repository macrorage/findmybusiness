/**
 * Real-browser smoke test (network + Chromium). Off by default:
 *   RUN_BROWSER_TESTS=1 pnpm vitest run tests/checker.browser.test.ts
 * Needs `pnpm exec playwright install chromium` once.
 */
import { describe, expect, it } from "vitest";
import { takeScreenshot } from "@/lib/checker";

describe.runIf(process.env.RUN_BROWSER_TESTS === "1")("takeScreenshot (real browser)", () => {
  it("captures a phone-sized PNG of a public page", async () => {
    const shot = await takeScreenshot("https://example.com");
    const png = Buffer.from(shot.base64, "base64");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.length).toBeGreaterThan(1_000);
    expect(shot.viewport).toContain("390");
  }, 60_000);
});
