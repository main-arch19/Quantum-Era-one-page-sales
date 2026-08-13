/**
 * Guesses a company name from the domain the visitor already typed.
 *
 * The point is not accuracy for its own sake. It is that a field which is
 * already filled in, correctly, at the exact moment somebody is deciding
 * whether we pay attention, reads as competence — and it costs them no
 * keystrokes to get there. It stays editable, because a guess presented as
 * fact is the opposite of the effect we want.
 *
 * WHERE THIS DEPARTS FROM THE BRIEF
 * The brief says: strip www and the TLD, split on hyphens, title-case, and
 * "acmeplumbing.com becomes Acme Plumbing". Those two things do not follow.
 * Splitting on hyphens leaves "acmeplumbing" as one token and title-casing it
 * gives "Acmeplumbing". Getting "Acme Plumbing" out of a concatenated domain
 * requires knowing where the word boundary is, which needs a dictionary.
 *
 * A general dictionary would be worse than useless here: it would confidently
 * produce "Acmep Lumbing" and similar, and a wrong guess in that field is more
 * damaging than no guess, because it advertises that we tried and failed at
 * something trivial. So this splits ONLY on an exact match against a short
 * list of trade nouns at the END of the string — the case that actually occurs
 * in this market — and leaves everything else as a single title-cased token.
 */

/**
 * Multi-part public suffixes we care about. This is deliberately a short hand
 * list and not the full Public Suffix List: the PSL is ~10k entries that needs
 * updating, and getting this wrong costs a slightly-off prefill, not a bug.
 */
const MULTI_PART_SUFFIXES = [
  "co.uk",
  "org.uk",
  "me.uk",
  "ltd.uk",
  "plc.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.jm",
  "co.jm",
  "com.br",
  "co.za",
  "com.mx",
  "co.in",
  "com.sg",
];

/**
 * Trailing words worth splitting on. Every entry must be a word that is
 * unambiguous as a suffix — adding a short or common fragment here (like "art"
 * or "ink") would start mangling names that merely end in those letters.
 */
const TRADE_SUFFIXES = [
  "accounting",
  "architects",
  "automotive",
  "builders",
  "catering",
  "cleaning",
  "construction",
  "consulting",
  "contracting",
  "dental",
  "electric",
  "electrical",
  "engineering",
  "financial",
  "fitness",
  "flooring",
  "furniture",
  "garage",
  "group",
  "heating",
  "homes",
  "hvac",
  "insurance",
  "interiors",
  "joinery",
  "kitchens",
  "landscaping",
  // "law" is deliberately ABSENT. It is short enough to appear inside ordinary
  // words — "coleslaw" would split to "Coles Law" — and the damage from one
  // mangled name outweighs the gain on "joeslaw". "legal" covers the trade.
  "legal",
  "lighting",
  "logistics",
  "motors",
  "painting",
  "photography",
  "plumbing",
  "printing",
  "properties",
  "property",
  "realty",
  "removals",
  "roofing",
  "security",
  "services",
  "solutions",
  "studios",
  "supplies",
  "systems",
  "tiling",
  "windows",
  // Longest first, so "electrical" is tried before "electric".
].sort((a, b) => b.length - a.length);

/** Subdomains that are never part of the business name. */
const IGNORED_SUBDOMAINS = new Set([
  "www",
  "www2",
  "web",
  "shop",
  "store",
  "info",
  "home",
  "m",
  "en",
  "uk",
  "us",
]);

function titleCase(word: string): string {
  if (!word) return "";
  return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Splits a concatenated token on a known trailing trade word, once.
 * "acmeplumbing" → ["acme", "plumbing"]. "plumbing" → ["plumbing"].
 * Anything with no confident match comes back untouched.
 */
function splitTrailingTradeWord(token: string): string[] {
  for (const suffix of TRADE_SUFFIXES) {
    if (!token.endsWith(suffix)) continue;

    const head = token.slice(0, -suffix.length);
    // Require a head of real length. At 3 this splits "outlaw" into "Out Law";
    // at 4 the shortest real business names ("acme", "bell") still work and the
    // accidental matches stop. When in doubt, leave the token whole — an
    // unsplit "Abcplumbing" is a worse guess, but a wrong split is an error.
    if (head.length >= 4) return [head, suffix];
  }
  return [token];
}

/**
 * Extracts the registrable label from a hostname.
 * "www.shop.acme.co.uk" → "acme"
 */
function registrableLabel(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;

  const lastTwo = parts.slice(-2).join(".");
  // Multi-part suffix: the label is the third-from-last part.
  if (MULTI_PART_SUFFIXES.includes(lastTwo)) {
    return parts.length >= 3 ? parts[parts.length - 3]! : parts[0]!;
  }

  const label = parts[parts.length - 2]!;

  // "shop.acme.com" — the second-from-last IS the label, so this only trips
  // when someone has a domain that literally is a generic subdomain word.
  if (IGNORED_SUBDOMAINS.has(label) && parts.length >= 3) {
    return parts[parts.length - 3]!;
  }

  return label;
}

/**
 * Best-effort company name from a URL or bare domain.
 * Returns "" when there is nothing sensible to offer — an empty field the
 * visitor fills in themselves is always better than a wrong one.
 */
export function companyFromDomain(input: string): string {
  if (!input) return "";

  let hostname = input.trim();

  // Tolerate a full URL, a bare domain, or something in between.
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(hostname)
      ? hostname
      : `https://${hostname}`;
    hostname = new URL(withScheme).hostname;
  } catch {
    // Not parseable as a URL — strip anything after the first slash and hope.
    hostname = hostname.split("/")[0]!.split("?")[0]!;
  }

  const label = registrableLabel(hostname);
  if (!label) return "";

  // An all-digit or punycode label is not a name anybody wants prefilled.
  if (/^\d+$/.test(label) || label.startsWith("xn--")) return "";

  const words = label
    .split(/[-_]+/)
    .filter(Boolean)
    .flatMap((token) =>
      // Only attempt the dictionary split when hyphens gave us nothing —
      // a hyphenated domain has already told us where the boundaries are.
      label.includes("-") || label.includes("_")
        ? [token]
        : splitTrailingTradeWord(token)
    )
    .map(titleCase)
    .filter(Boolean);

  return words.join(" ");
}
