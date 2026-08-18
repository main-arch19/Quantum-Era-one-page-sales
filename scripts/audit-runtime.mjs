#!/usr/bin/env node
/**
 * RUNTIME ZERO-LEAKAGE AUDIT
 *
 * audit-links.mjs reads server HTML, which cannot see next/script injections —
 * those happen client-side after hydration. This drives a real browser and
 * records every host each page actually contacts, which is the only way to
 * verify rule 5 (no external scripts beyond tracking and the form handler) and
 * rule 8 (no third-party iframe overlays).
 *
 * Usage:
 *   1. Start the app with your tracking + Calendly env vars set.
 *   2. Launch Chrome with remote debugging:
 *      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *        --headless --disable-gpu --remote-debugging-port=9222 \
 *        --user-data-dir=/tmp/qes-audit about:blank &
 *   3. AUDIT_BASE=http://localhost:3000 npm run audit:runtime
 */

const PORT = process.env.CDP_PORT ?? 9222;
const BASE =
  process.env.AUDIT_BASE ?? "http://localhost:3000";
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 7000);

/**
 * Google serves Ads conversion pings from regional ccTLDs (google.com.jm from
 * Jamaica, google.co.uk from Britain, and so on). These are the same tag, not
 * a third party — the allowlist has to match the whole family or the audit
 * fails wherever it happens to run.
 */
const GOOGLE_CCTLD =
  /^([a-z0-9-]+\.)*google(\.[a-z]{2,3})?(\.[a-z]{2})?$/i;

const TRACKING_HOSTS = [
  "googletagmanager.com",
  "google-analytics.com",
  "googleadservices.com",
  "doubleclick.net",
  "googlesyndication.com",
];

const SCHEDULING_HOSTS = ["calendly.com"];

function isAllowed(host, allowed) {
  if (GOOGLE_CCTLD.test(host) && allowed.includes("__google__")) return true;
  return allowed.some((a) => host === a || host.endsWith("." + a));
}

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const target = list.find((t) => t.type === "page" && !t.url.startsWith("chrome"));
if (!target) {
  console.error("No page target on the debugging port. Is Chrome running with --remote-debugging-port?");
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
let hosts = new Set();
let frames = new Set();

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === "Network.requestWillBeSent") {
    const { url, } = msg.params.request;
    try {
      const h = new URL(url).hostname;
      if (h !== "localhost" && h !== "127.0.0.1") {
        hosts.add(h);
        if (msg.params.type === "Document" && msg.params.frameId !== target.id) {
          frames.add(h);
        }
      }
    } catch {}
  }
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

const send = (method, params = {}) => {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((r) => pending.set(msgId, r));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Network.enable");
await send("Page.enable");

let failures = 0;

async function audit(path, label, allowed) {
  hosts = new Set();
  frames = new Set();

  await send("Page.navigate", { url: `${BASE}${path}` });
  await wait(SETTLE_MS);

  const contacted = [...hosts].sort();
  const unexpected = contacted.filter((h) => !isAllowed(h, allowed));

  console.log(`\n${label}  ${BASE}${path}`);
  console.log(
    `  hosts contacted: ${contacted.length ? contacted.join(", ") : "(none)"}`
  );

  if (unexpected.length) {
    failures += 1;
    console.log(`  ✗ LEAK — unpermitted host(s): ${unexpected.join(", ")}`);
  } else {
    console.log(`  ✓ every host permitted here`);
  }
  return contacted;
}

console.log("RUNTIME ZERO-LEAKAGE AUDIT");

await audit("/", "LANDING PAGE", ["__google__", ...TRACKING_HOSTS]);

// Calendly is permitted ONLY here.
await audit(
  "/booked?lid=00000000-0000-4000-8000-000000000000",
  "BOOKED PAGE",
  ["__google__", ...TRACKING_HOSTS, ...SCHEDULING_HOSTS]
);

// The rule that matters most: the scheduler must never touch the money page.
hosts = new Set();
await send("Page.navigate", { url: `${BASE}/` });
await wait(SETTLE_MS);
const calendlyOnLanding = [...hosts].some((h) => h.includes("calendly"));

console.log(
  `\nCALENDLY ON LANDING PAGE: ${calendlyOnLanding ? "✗ PRESENT — this is a leak and an LCP cost" : "✓ absent"}`
);
if (calendlyOnLanding) failures += 1;

console.log("");
if (failures) {
  console.error(`FAILED — ${failures} problem(s).\n`);
  ws.close();
  process.exit(1);
}
console.log("PASSED — no runtime leaks.\n");
ws.close();
