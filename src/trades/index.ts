/**
 * Registry of trade configs. Add new trades here (tests/trades.test.ts checks
 * that every JSON file in this folder is listed). Validated in src/lib/trades.ts.
 */
import apartmaji from "./apartmaji.json";
import avtoservis from "./avtoservis.json";
import elektricar from "./elektricar.json";
import frizer from "./frizer.json";
import gostilna from "./gostilna.json";
import kozmeticniSalon from "./kozmeticni-salon.json";
import vodovodar from "./vodovodar.json";

export const RAW_TRADES: unknown[] = [
  frizer,
  kozmeticniSalon,
  avtoservis,
  vodovodar,
  elektricar,
  gostilna,
  apartmaji,
];
