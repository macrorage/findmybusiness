import { Suspense } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/classify";
import { fmt, getDictionary, getUiLocale, intlLocale, type Dictionary } from "@/i18n";
import { findProspects, FinderInputError, parseFinderQuery, type FinderResult, type Lead } from "@/lib/finder";
import { SUPPORTED_COUNTRIES } from "@/lib/maps";
import { formatUsdMicros } from "@/lib/money";
import { listTrades, tradeLabel } from "@/lib/trades";
import { LABEL_STYLES, reasonText } from "./format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function FindPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getDictionary();
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <nav className="mb-8 text-sm opacity-60">
        <Link href="/" className="hover:underline">
          {t.app.name}
        </Link>{" "}
        / {t.nav.find}
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight">{t.finder.title}</h1>
      <p className="mt-2 max-w-2xl opacity-70">{t.finder.subtitle}</p>
      <Suspense fallback={<p className="mt-8 opacity-60">{t.finder.searching}</p>}>
        <Finder searchParams={searchParams} t={t} />
      </Suspense>
    </main>
  );
}

async function Finder({ searchParams, t }: { searchParams: SearchParams; t: Dictionary }) {
  const params = await searchParams;
  const locale = getUiLocale();
  const values = { trade: one(params.trade), city: one(params.city), country: one(params.country) ?? "SI" };
  const submitted = values.trade !== undefined || values.city !== undefined;

  // Fetch inside try/catch, render outside it (errors during rendering need an error boundary instead).
  let result: FinderResult | undefined;
  let errorMessage: string | undefined;
  if (submitted) {
    try {
      result = await findProspects(parseFinderQuery(values));
    } catch (err) {
      errorMessage =
        err instanceof FinderInputError
          ? t.finder.invalidInput
          : fmt(t.finder.error, { message: err instanceof Error ? err.message : String(err) });
    }
  }

  let content: React.ReactNode = null;
  if (errorMessage) {
    content = <p className="mt-8 rounded-md bg-red-50 px-3 py-2 text-red-900 dark:bg-red-950 dark:text-red-200">{errorMessage}</p>;
  } else if (result) {
    content = (
        <section className="mt-8">
          {result.mode === "mock" && (
            <p className="mb-4 rounded-md border border-dashed px-3 py-2 text-sm opacity-80">{t.finder.mockNotice}</p>
          )}
          <p className="mb-3 text-sm opacity-70">
            {fmt(t.finder.results, { count: result.leads.length })} · {fmt(t.finder.skipped, { count: result.skipped.length })} ·{" "}
            {fmt(t.finder.actualCost, { cost: formatUsdMicros(result.costUsdMicros, intlLocale(locale)) })}
          </p>
          {result.leads.length === 0 ? <p>{t.finder.empty}</p> : <LeadTable leads={result.leads} t={t} />}
          {result.skipped.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm opacity-70">{t.finder.skippedTitle}</summary>
              <div className="mt-3">
                <LeadTable leads={result.skipped} t={t} />
              </div>
            </details>
          )}
        </section>
    );
  }

  return (
    <>
      <form action="/find" method="get" className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">{t.finder.trade}</span>
          <select name="trade" defaultValue={values.trade ?? "frizer"} className="h-10 rounded-md border bg-transparent px-2">
            {listTrades().map((trade) => (
              <option key={trade.id} value={trade.id}>
                {tradeLabel(trade, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">{t.finder.city}</span>
          <input
            name="city"
            defaultValue={values.city ?? ""}
            placeholder={t.finder.hint}
            required
            minLength={2}
            maxLength={80}
            className="h-10 rounded-md border bg-transparent px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">{t.finder.country}</span>
          <select name="country" defaultValue={values.country} className="h-10 rounded-md border bg-transparent px-2">
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t.countries[c]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90">
          {t.finder.search}
        </button>
      </form>
      {content}
    </>
  );
}

function LeadTable({ leads, t }: { leads: Lead[]; t: Dictionary }) {
  const locale = intlLocale();
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b bg-black/[0.03] dark:bg-white/[0.04]">
          <tr>
            {[t.finder.columns.score, t.finder.columns.business, t.finder.columns.label, t.finder.columns.rating, t.finder.columns.phone, t.finder.columns.channels, t.finder.columns.reasons].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map(({ prospect, classification, score }) => (
            <tr key={prospect.mapsPlaceId} className="border-b last:border-0 align-top">
              <td
                className="px-3 py-2 font-semibold tabular-nums"
                title={score.breakdown.map((b) => `${b.points > 0 ? "+" : ""}${b.points} ${t.signals[b.signal]}`).join("\n")}
              >
                {score.score ?? "–"}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{prospect.name}</div>
                <div className="opacity-60">{prospect.address ?? prospect.city}</div>
              </td>
              <td className="px-3 py-2">
                <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${LABEL_STYLES[classification.label] ?? ""}`}>
                  {t.labels[classification.label]}
                </span>
              </td>
              <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                {prospect.rating !== undefined
                  ? `${prospect.rating.toLocaleString(locale)} ★ (${prospect.reviewCount ?? 0})`
                  : "–"}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                {classification.phoneE164 ? formatPhone(classification.phoneE164) : t.finder.noPhone}
              </td>
              <td className="px-3 py-2">{classification.channels.map((c) => t.channels[c]).join(", ") || "–"}</td>
              <td className="px-3 py-2">
                <ul className="list-disc pl-4 opacity-80">
                  {classification.reasons.map((r, i) => (
                    <li key={i}>{reasonText(t, r)}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
