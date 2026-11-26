/**
 * The checker fetches URLs taken from Maps listings. Block anything that isn't a public
 * http(s) host, so a planted URL can't make the server call localhost or the local network.
 * (Hostnames are not resolved here; DNS-rebinding protection belongs in the deployment.)
 */
const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
  } catch {
    throw new Error(`Not a valid URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Only http(s) URLs can be checked: ${raw}`);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blocked =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".") ||
    PRIVATE_V4.some((re) => re.test(host)) ||
    host === "::1" ||
    /^(fc|fd|fe80)/.test(host);
  if (blocked) throw new Error(`Refusing to check a private or local address: ${host}`);
  return url;
}
