// Computes durability history for EVERY player in the pool, automatically,
// from official NFL weekly injury reports - replacing the old hand-curated
// ~18-player list with real computed data for the whole ~190-player pool.
//
// Data source: nflverse-data (github.com/nflverse/nflverse-data), a free,
// public, no-key-required dataset built and maintained by the football
// analytics community from official NFL sources (weekly injury reports as
// filed by teams). This is the same underlying data used by nflreadr/
// nfl_data_py, the standard tools serious analysts use.
//
// Metric: for each of the last 3 seasons, count the number of distinct
// weeks a player was listed "Out" on the official Friday/Saturday injury
// report. This is an honest, defensible proxy for "documented missed time
// due to injury" - it's not literally "confirmed did not suit up" (a team
// could occasionally list someone Out and see them play, though this is
// rare), but it is real, sourced, official data, not a guess.
//
// Run manually:   node scripts/update-durability.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "durability.json");
const BASE = "https://github.com/nflverse/nflverse-data/releases/download/injuries";
const SEASONS = [2023, 2024, 2025]; // most recent 3 completed seasons

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Minimal CSV parser - nflverse injury CSVs don't have embedded commas in
// the fields we read, so a straightforward split is reliable here.
function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx]; });
    rows.push(row);
  }
  return rows;
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return parseCsv(await res.text());
}

async function main() {
  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const players = JSON.parse(playersRaw);
  const byNormalizedName = new Map(players.map((p) => [normalizeName(p.name), p.name]));

  // player -> season -> Set of weeks listed Out (dedupe: a player can appear
  // on multiple reports in one week in rare cases)
  const outWeeksByPlayer = new Map();

  for (const season of SEASONS) {
    console.log(`Fetching ${season} injury reports...`);
    let rows;
    try {
      rows = await fetchCsv(`${BASE}/injuries_${season}.csv`);
    } catch (e) {
      console.log(`  skipped ${season}: ${e.message}`);
      continue;
    }
    for (const row of rows) {
      if (row.report_status !== "Out") continue;
      const norm = normalizeName(row.full_name || "");
      if (!norm) continue;
      if (!outWeeksByPlayer.has(norm)) outWeeksByPlayer.set(norm, new Map());
      const bySeason = outWeeksByPlayer.get(norm);
      if (!bySeason.has(season)) bySeason.set(season, new Set());
      bySeason.get(season).add(row.week);
    }
    console.log(`  parsed ${rows.length} report rows`);
  }

  const out = {};
  let matched = 0;
  for (const p of players) {
    if (["K", "DST"].includes(p.pos)) continue; // not meaningful for these
    const norm = normalizeName(p.name);
    const bySeason = outWeeksByPlayer.get(norm);
    if (!bySeason) continue; // no "Out" designations found - clean bill of health, not a data gap
    let totalWeeksOut = 0;
    const seasonBreakdown = {};
    for (const [season, weeks] of bySeason.entries()) {
      seasonBreakdown[season] = weeks.size;
      totalWeeksOut += weeks.size;
    }
    if (totalWeeksOut === 0) continue;
    out[p.name] = {
      weeksOutLast3Seasons: totalWeeksOut,
      bySeasons: seasonBreakdown,
    };
    matched++;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: `nflverse official NFL injury reports (${SEASONS.join(", ")}), weeks listed "Out"`,
    players: out,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote durability data for ${matched} players to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-durability failed:", err);
  // Fail-soft, same policy as the other update scripts.
  process.exit(0);
});
