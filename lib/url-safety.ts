import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF DEFENCE.
 *
 * Stage 1 of this page takes a URL from an anonymous visitor and the server
 * then fetches it. That is a server-side request forgery primitive handed to
 * the public internet, and on a cloud host it is a serious one: the instance
 * metadata endpoint at 169.254.169.254 will hand out credentials to anything
 * that asks from inside the network.
 *
 * So every hostname is resolved to its actual IP addresses and checked against
 * the reserved ranges BEFORE we connect, and — because a DNS name can resolve
 * to a public address once and a private one a moment later, and because a
 * redirect can move us anywhere — the check runs again on every hop.
 *
 * The residual gap is the DNS rebinding window between our lookup and Node's
 * own lookup inside fetch(). Closing that completely means connecting by IP
 * and carrying the Host header ourselves, which breaks SNI on most hosts and
 * would fail on a large share of legitimate sites. Re-checking every hop plus
 * a hard cap on redirects and body size is the proportionate trade here; the
 * fetched bytes are parsed as text and never executed.
 */

const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB of HTML is already pathological.
const TIMEOUT_MS = 8000;

/** Honest identification. A site owner grepping their logs should find us. */
const USER_AGENT =
  "QuantumEraSiteCheck/1.0 (+automated check requested by the site owner)";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/**
 * Reserved IPv4 space that must never be reachable from a user-supplied URL.
 * Expressed as [network, prefix length] and compared numerically.
 */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC1918 private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — THE cloud metadata range
  ["172.16.0.0", 12], // RFC1918 private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // RFC1918 private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function v4ToInt(address: string): number {
  return address
    .split(".")
    .reduce((total, octet) => (total << 8) + Number(octet), 0) >>> 0;
}

function isBlockedV4(address: string): boolean {
  const value = v4ToInt(address);
  return BLOCKED_V4.some(([network, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (v4ToInt(network) & mask);
  });
}

function isBlockedV6(address: string): boolean {
  const value = address.toLowerCase().split("%")[0]!;

  if (value === "::" || value === "::1") return true; // unspecified, loopback
  if (value.startsWith("fe80")) return true; // link-local
  if (value.startsWith("ff")) return true; // multicast

  // fc00::/7 — unique local addresses.
  if (/^f[cd]/.test(value)) return true;

  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms smuggle v4 in.
  const mapped = value.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]!);

  return false;
}

function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isBlockedV4(address);
  if (family === 6) return isBlockedV6(address);
  return true; // Not an IP we can reason about — refuse it.
}

/**
 * Normalises what a person actually types.
 *
 * People type "yourbusiness.com", not "https://yourbusiness.com". Refusing
 * that is refusing most of your traffic, so we add the scheme rather than
 * making the visitor guess what we wanted.
 */
export function normaliseUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new UnsafeUrlError("Please enter your website address.");

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new UnsafeUrlError(
      "That does not look like a web address — check for a typo, and leave off anything before the domain."
    );
  }

  // http and https only. file:, ftp:, gopher: and data: are all ways of
  // asking a server to read something it should not.
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError(
      "We can only check addresses that start with http or https."
    );
  }

  // Credentials in the URL are never legitimate here and confuse redirects.
  url.username = "";
  url.password = "";
  url.hash = "";

  if (!url.hostname || !url.hostname.includes(".")) {
    throw new UnsafeUrlError(
      "That address is missing a domain — try something like yourbusiness.com."
    );
  }

  return url;
}

/** Resolves the hostname and refuses it if ANY address is in reserved space. */
async function assertHostIsPublic(hostname: string): Promise<void> {
  // A bare IP needs no lookup, and would otherwise slip past a DNS check.
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new UnsafeUrlError("That address is not reachable from the public internet.");
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError(
      "That domain does not resolve — check the spelling of the address."
    );
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError("That domain does not resolve to anything we can reach.");
  }

  // ALL of them, not some. A host that resolves to one public and one private
  // address is a rebinding attempt, not a coincidence.
  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new UnsafeUrlError("That address is not reachable from the public internet.");
  }
}

export type SafeFetchResult = {
  /** Final URL after redirects — may differ from the one requested. */
  finalUrl: URL;
  status: number;
  headers: Headers;
  /** Decoded body, truncated at MAX_BODY_BYTES. */
  body: string;
  /** Milliseconds to the response headers. The honest "how slow is it" number. */
  ttfbMs: number;
  /** Bytes actually read off the wire, capped. */
  bytes: number;
  /** True when the body hit the cap and was cut short. */
  truncated: boolean;
};

/**
 * Fetches a visitor-supplied URL with every hop revalidated.
 *
 * Redirects are followed manually (`redirect: "manual"`) precisely so that each
 * new Location can be resolved and checked before we go there. Handing
 * `redirect: "follow"` to fetch would let hop two land on 169.254.169.254
 * without us ever seeing it.
 */
export async function safeFetch(input: string): Promise<SafeFetchResult> {
  let url = normaliseUrl(input);
  const startedAt = Date.now();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertHostIsPublic(url.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          // Ask for identity so byte counts mean what they appear to mean.
          "Accept-Encoding": "identity",
        },
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new UnsafeUrlError(
          `That site did not respond within ${TIMEOUT_MS / 1000} seconds.`
        );
      }
      throw new UnsafeUrlError(
        "We could not connect to that address. It may be down, or it may block automated checks."
      );
    } finally {
      clearTimeout(timer);
    }

    const ttfbMs = Date.now() - startedAt;

    // ── Redirect? Re-check the destination before following it. ────────────
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new UnsafeUrlError("That site returned a redirect with nowhere to go.");
      }
      if (hop === MAX_REDIRECTS) {
        throw new UnsafeUrlError("That address redirects too many times to follow.");
      }

      // Relative Locations are legal and common; resolve against the current URL.
      const next = normaliseUrl(new URL(location, url).toString());
      url = next;
      continue;
    }

    // ── Terminal response. Read the body under a hard cap. ─────────────────
    const { body, bytes, truncated } = await readCapped(response);

    return {
      finalUrl: url,
      status: response.status,
      headers: response.headers,
      body,
      ttfbMs,
      bytes,
      truncated,
    };
  }

  throw new UnsafeUrlError("That address redirects too many times to follow.");
}

/**
 * Streams the body and stops at the cap.
 *
 * response.text() would happily buffer a multi-gigabyte response into memory
 * and take the process down with it — a decompression bomb or a misconfigured
 * server is enough, no malice required.
 */
async function readCapped(
  response: Response
): Promise<{ body: string; bytes: number; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { body: "", bytes: 0, truncated: false };

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      bytes += value.byteLength;
      if (bytes >= MAX_BODY_BYTES) {
        chunks.push(value.slice(0, value.byteLength - (bytes - MAX_BODY_BYTES)));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  // fatal:false — a mis-declared charset must degrade, not throw. We are
  // reading other people's markup and some of it is genuinely broken.
  const body = new TextDecoder("utf-8", { fatal: false }).decode(merged);
  return { body, bytes: truncated ? MAX_BODY_BYTES : bytes, truncated };
}
