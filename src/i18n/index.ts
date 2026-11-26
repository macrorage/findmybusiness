/**
 * UI translations for the Spletko app itself (not the generated client sites, which get their
 * language from the site content). Phase 1 has one user, so the UI language is a setting
 * (APP_LOCALE, default "sl"), not per visitor. Phase 2 can switch to a per-user cookie.
 */
import { en } from "./en";
import { sl } from "./sl";

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dictionary = Widen<typeof sl>;

export const UI_LOCALES = ["sl", "en"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

const DICTIONARIES: Record<UiLocale, Dictionary> = { sl, en };

export function getUiLocale(): UiLocale {
  const value = process.env.APP_LOCALE;
  return (UI_LOCALES as readonly string[]).includes(value ?? "") ? (value as UiLocale) : "sl";
}

export function getDictionary(locale: UiLocale = getUiLocale()): Dictionary {
  return DICTIONARIES[locale];
}

/** Fill {placeholders}: fmt("Zadetki: {count}", { count: 3 }). Unknown placeholders stay visible. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Intl locale tag for numbers and dates. */
export function intlLocale(locale: UiLocale = getUiLocale()): string {
  return locale === "sl" ? "sl-SI" : "en-GB";
}
