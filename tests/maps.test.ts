import { afterEach, describe, expect, it, vi } from "vitest";
import { buildKeyword, demoProspects, parseDataForSeoResponse } from "@/lib/maps";
import { dataForSeoSource } from "@/lib/maps/dataforseo";
import { classifyProspect } from "@/lib/classify";

// Invented response in DataForSEO's documented shape (no real businesses).
const sample = {
  status_code: 20000,
  status_message: "Ok.",
  cost: 0.002,
  tasks: [
    {
      status_code: 20000,
      status_message: "Ok.",
      cost: 0.002,
      result: [
        {
          items: [
            {
              type: "maps_search",
              title: "Frizerski salon Primer",
              url: null,
              phone: "+386 41 000 001",
              address: "Izmišljena 1, 2000 Maribor",
              address_info: { address: "Izmišljena 1", city: "Maribor", zip: "2000", country_code: "si" },
              place_id: "ChIJfake1",
              category: "Hair salon",
              rating: { rating_type: "Max5", value: 4.7, votes_count: 33 },
              latitude: 46.55,
              longitude: 15.64,
              work_hours: {
                timetable: {
                  monday: [{ open: { hour: 8, minute: 0 }, close: { hour: 16, minute: 30 } }],
                  sunday: null,
                },
                current_status: "open",
              },
            },
            { type: "maps_paid_item", title: "Ad", place_id: "ChIJad" },
            { type: "maps_search", title: "No place id" },
            { type: "maps_search", title: "Salon Percent", place_id: "ChIJfake2", rating: { rating_type: "Percents", value: 90, votes_count: 3 } },
          ],
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DATAFORSEO_LOGIN;
  delete process.env.DATAFORSEO_PASSWORD;
});

describe("DataForSEO parsing", () => {
  it("maps maps_search items to prospects and skips ads and broken items", () => {
    const { prospects, costUsd } = parseDataForSeoResponse(sample, "SI");
    expect(costUsd).toBe(0.002);
    expect(prospects.map((p) => p.mapsPlaceId)).toEqual(["ChIJfake1", "ChIJfake2"]);
    expect(prospects[0]).toMatchObject({
      source: "dataforseo",
      name: "Frizerski salon Primer",
      country: "SI",
      city: "Maribor",
      postalCode: "2000",
      rating: 4.7,
      reviewCount: 33,
      hours: [{ day: "mon", opens: "08:00", closes: "16:30" }],
    });
    expect(prospects[0]!.website).toBeUndefined();
    expect(prospects[1]!.rating).toBeUndefined(); // only Max5 ratings are used
  });

  it("throws on API and task errors", () => {
    expect(() => parseDataForSeoResponse({ status_code: 40100, status_message: "Not authorized" }, "SI")).toThrow(/40100/);
    expect(() =>
      parseDataForSeoResponse({ ...sample, tasks: [{ status_code: 40501, status_message: "Invalid field" }] }, "SI"),
    ).toThrow(/40501/);
  });
});

describe("DataForSEO request", () => {
  it("builds a local keyword and sends one task with basic auth", async () => {
    process.env.DATAFORSEO_LOGIN = "user@example.com";
    process.env.DATAFORSEO_PASSWORD = "secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(sample), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await dataForSeoSource.search({ trade: "vodovodar", city: " Kranj ", country: "SI" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.dataforseo.com/v3/serp/google/maps/live/advanced");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("user@example.com:secret").toString("base64")}`);
    expect(JSON.parse(init.body)).toEqual([
      { keyword: "vodovodar Kranj", location_name: "Slovenia", language_code: "en", depth: 100 },
    ]);
    expect(res.costUsdMicros).toBe(2_000);
    expect(res.keyword).toBe("vodovodar Kranj");
  });

  it("uses the country's language for the keyword", () => {
    expect(buildKeyword({ trade: "vodovodar", city: "Split", country: "HR" })).toBe("vodoinstalater Split");
  });

  it("estimates cost per 100-result page", () => {
    expect(dataForSeoSource.estimateCostUsdMicros({ trade: "frizer", city: "x", country: "SI", depth: 250 })).toBe(6_000);
  });

  it("refuses to run without credentials", async () => {
    await expect(dataForSeoSource.search({ trade: "frizer", city: "Maribor", country: "SI" })).rejects.toThrow(/DATAFORSEO_LOGIN/);
  });
});

describe("demo data", () => {
  it("is deterministic, obviously fake, and covers every classifier outcome", () => {
    const a = demoProspects({ trade: "frizer", city: "Celje", country: "SI" });
    expect(demoProspects({ trade: "frizer", city: "Celje", country: "SI" })).toEqual(a);
    expect(a.every((p) => p.name.startsWith("Demo "))).toBe(true);
    const labels = new Set(a.map((p) => classifyProspect(p).label));
    expect(labels).toEqual(new Set(["no_website", "social_only", "needs_check", "chain", "closed"]));
  });

  it("produces valid phones in every supported country", () => {
    for (const country of ["SI", "HR", "RS", "BA", "MK", "AT"] as const) {
      for (const p of demoProspects({ trade: "frizer", city: "Mesto", country })) {
        expect(classifyProspect(p).phoneE164, `${country} ${p.phone}`).toBeDefined();
      }
    }
  });
});
