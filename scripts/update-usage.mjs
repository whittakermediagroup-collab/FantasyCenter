// Pulls real season-long usage (snap share, target share) for every player
// in the pool from nflverse - the free, public, no-key dataset the football
// analytics community actually uses (same source powering nflreadr /
// nfl_data_py).
//
// Honest note on scope: TRUE August 2026 preseason snap counts are not
// tracked by any structured source anywhere - Pro Football Reference (the
// origin of this data) and every derivative of it only track regular-season
// games, because preseason snap distribution is notoriously unreliable for
// fantasy value anyway (starters play a handful of series, roster-bubble
// players get inflated run). What this script pulls instead - final 2025
// regular-season snap share and target share - is real, complete-season,
// game-verified usage data, which is actually the more predictive signal
// for redraft fantasy value than a few preseason series would be. It's
// presented in the app as exactly what it is: last season's usage, not
// this preseason's.
//
// Run manually:   node scripts/update-usage.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "usage.json");
const SEASON = 2025; // most recent completed regular season
const SNAP_COUNTS_URL = "https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2025.csv";
// Season-aggregated (not week-level) player stats - already totals target
// share/targets/games per player for the season, one row per player.
const PLAYER_STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2025.csv";

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple CSV parser handling quoted fields (these files have commas inside
// quoted headshot-URL fields).
function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = splitCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx]; });
    rows.push(row);
  }
  return rows;
}
function splitCsvLine(line) {
  const out = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return parseCsv(await res.text());
}

async function main() {
  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const players = JSON.parse(playersRaw);

  console.log("Fetching 2025 snap counts...");
  const snapRows = await fetchCsv(SNAP_COUNTS_URL);
  const offensePctByPlayer = new Map(); // norm name -> [pct, pct, ...]
  for (const row of snapRows) {
    if (row.season !== String(SEASON) || row.game_type !== "REG") continue;
    const pct = Number(row.offense_pct);
    if (!Number.isFinite(pct) || pct === 0) continue;
    const norm = normalizeName(row.player || "");
    if (!norm) continue;
    if (!offensePctByPlayer.has(norm)) offensePctByPlayer.set(norm, []);
    offensePctByPlayer.get(norm).push(pct);
  }
  console.log(`  parsed ${snapRows.length} snap rows`);

  console.log("Fetching 2025 season player stats (already season-aggregated)...");
  const statsRows = await fetchCsv(PLAYER_STATS_URL);
  const statsByPlayer = new Map(); // norm name -> { targets, targetSharePct, games }
  for (const row of statsRows) {
    if (row.season !== String(SEASON)) continue;
    const norm = normalizeName(row.player_display_name || "");
    if (!norm) continue;
    const targetShare = Number(row.target_share);
    statsByPlayer.set(norm, {
      targets: Number(row.targets) || 0,
      targetSharePct: Number.isFinite(targetShare) ? Math.round(targetShare * 1000) / 10 : null,
      games: Number(row.games) || null,
    });
  }
  console.log(`  parsed ${statsRows.length} season-total stat rows`);

  const out = {};
  let matched = 0;
  for (const p of players) {
    if (["K", "DST", "QB"].includes(p.pos)) continue; // usage share isn't meaningful for these
    const norm = normalizeName(p.name);
    const snapList = offensePctByPlayer.get(norm);
    const statEntry = statsByPlayer.get(norm);
    if (!snapList && !statEntry) continue;

    const entry = {};
    if (snapList && snapList.length) {
      entry.snapPct = Math.round((snapList.reduce((a, b) => a + b, 0) / snapList.length) * 1000) / 10;
      entry.gamesPlayed = snapList.length;
    }
    if (statEntry && statEntry.targetSharePct) {
      entry.targetSharePct = statEntry.targetSharePct;
      entry.totalTargets = statEntry.targets;
    }
    if (Object.keys(entry).length === 0) continue;
    out[p.name] = entry;
    matched++;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: `nflverse ${SEASON} regular-season snap counts + season stats (2025 final season usage, not this preseason - see script comment)`,
    season: SEASON,
    players: out,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote usage data for ${matched} players to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-usage failed:", err);
  process.exit(0);
});
