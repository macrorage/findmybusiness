import { afterEach, describe, expect, it } from "vitest";
import { fmt, getDictionary, getUiLocale } from "@/i18n";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [p, v] of leaves(value, path)) out.set(p, v);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => {
  delete process.env.APP_LOCALE;
});

describe("i18n", () => {
  it("has the same keys and placeholders in every language", () => {
    const sl = leaves(getDictionary("sl") as unknown as Tree);
    const en = leaves(getDictionary("en") as unknown as Tree);
    expect([...en.keys()].sort()).toEqual([...sl.keys()].sort());
    for (const [key, text] of sl) {
      expect(placeholders(en.get(key)!), key).toEqual(placeholders(text));
      expect(en.get(key)!.trim(), key).not.toBe("");
    }
  });

  it("defaults to Slovenian and reads APP_LOCALE", () => {
    expect(getUiLocale()).toBe("sl");
    process.env.APP_LOCALE = "en";
    expect(getUiLocale()).toBe("en");
    process.env.APP_LOCALE = "fr";
    expect(getUiLocale()).toBe("sl");
  });

  it("fills placeholders", () => {
    expect(fmt("Zadetki: {count}", { count: 3 })).toBe("Zadetki: 3");
    expect(fmt("Ocena: {cost}", {})).toBe("Ocena: {cost}");
  });
});
