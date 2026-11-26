import type { Reason } from "@/lib/classify";
import { fmt, type Dictionary } from "@/i18n";

export function reasonText(t: Dictionary, reason: Reason): string {
  const { code, ...vars } = reason;
  return fmt(t.reasons[code], vars as Record<string, string | number>);
}

/** Tailwind classes per label: muted for skipped, warm for the best leads. */
export const LABEL_STYLES: Record<string, string> = {
  no_website: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  social_only: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  needs_check: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  outdated: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  ok: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  chain: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
