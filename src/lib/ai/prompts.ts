import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Prompt files live in src/prompts/<name>.md (AGENTS.md §4: prompts are code). Format:
 *
 *   ---
 *   version: 3
 *   ---
 *   ## system
 *   You write short, friendly website copy in {{language}}.
 *   ## user
 *   Business: {{business_json}}
 *
 * Bump `version` on every change; it is logged with each AI call.
 */
export interface RenderedPrompt {
  name: string;
  version: string;
  system?: string;
  prompt: string;
}

const DEFAULT_DIR = join(process.cwd(), "src", "prompts");

export function loadPrompt(
  name: string,
  vars: Record<string, string | number>,
  dir: string = DEFAULT_DIR,
): RenderedPrompt {
  const raw = readFileSync(join(dir, `${name}.md`), "utf8").replace(/\r\n/g, "\n");

  const front = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const version = front?.[1]?.match(/^version:\s*(\S+)\s*$/m)?.[1];
  if (!front || !version) {
    throw new Error(`Prompt "${name}" needs front matter with a version: line`);
  }
  const body = raw.slice(front[0].length);

  const sections = parseSections(body);
  const user = sections.get("user");
  if (user === undefined) {
    throw new Error(`Prompt "${name}" needs a "## user" section`);
  }
  const system = sections.get("system");

  return {
    name,
    version,
    ...(system !== undefined ? { system: render(name, system, vars) } : {}),
    prompt: render(name, user, vars),
  };
}

function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  let current: string | undefined;
  let lines: string[] = [];
  const flush = () => {
    if (current) sections.set(current, lines.join("\n").trim());
  };
  for (const line of body.split("\n")) {
    const heading = line.match(/^## (system|user)\s*$/);
    if (heading) {
      flush();
      current = heading[1];
      lines = [];
    } else {
      lines.push(line);
    }
  }
  flush();
  return sections;
}

function render(name: string, template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    if (!(key in vars)) {
      throw new Error(`Prompt "${name}" uses {{${key}}} but no value was passed`);
    }
    return String(vars[key]);
  });
}
