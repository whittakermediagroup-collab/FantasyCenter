// Pulls current 12-team PPR Average Draft Position and writes data/adp.json.
//
// Data source: Fantasy Football Calculator's public ADP REST API — free for
// personal and commercial use, no key required, documented at
// https://help.fantasyfootballcalculator.com/article/42-adp-rest-api
// Built from live mock drafts, refreshed continuously on their end.
//
// Run manually:   node scripts/update-adp.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "adp.json");
const ADP_URL = "https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026&position=all";

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.'']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const players = JSON.parse(playersRaw);
  const byNormalizedName = new Map(players.map((p) => [normalizeName(p.name), p.name]));

  console.log("Fetching ADP...");
  const res = await fetch(ADP_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`ADP fetch failed: ${res.status}`);
  const data = await res.json();

  // The API's exact field names have drifted slightly across versions in
  // the wild (name vs player_name, adp vs overall) — handle both rather
  // than assuming one and silently writing an empty file if it's off.
  const rows = data?.players || data?.player || [];
  console.log(`Got ${rows.length} ADP rows.`);

  const out = {};
  let matched = 0;
  for (const row of rows) {
    const rawName = row.name || row.player_name || "";
    if (!rawName) continue;
    const key = byNormalizedName.get(normalizeName(rawName));
    if (!key) continue; // not in our pool — fine, most rookies/deep bench aren't

    const adp = Number(row.adp ?? row.overall ?? row.adp_overall);
    if (!Number.isFinite(adp)) continue;

    out[key] = {
      adp: Math.round(adp * 10) / 10,
      adpFormatted: row.adp_formatted || row.formatted || null,
      timesDrafted: row.times_drafted ?? row.timesDrafted ?? null,
    };
    matched++;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Fantasy Football Calculator ADP API (12-team PPR)",
    players: out,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ADP for ${matched} matched players to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-adp failed:", err);
  // Same fail-soft policy as update-injuries.mjs: a bad ADP fetch should
  // never take the deploy down, just mean today's ADP doesn't refresh.
  process.exit(0);
});
