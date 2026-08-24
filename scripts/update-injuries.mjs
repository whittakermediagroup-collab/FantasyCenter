// Pulls current NFL injury reports and writes data/injuries.json.
//
// Data source: ESPN's public (but unofficial/undocumented) sports API.
// No API key required, but ESPN can change or rate-limit this without
// notice — that's the tradeoff of a free source. If a run fails partway,
// this script keeps whatever it already resolved and leaves everything
// else untouched rather than wiping the file.
//
// Run manually:   node scripts/update-injuries.mjs
// Run on a cron:  see .github/workflows/update-injuries.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "injuries.json");

// ESPN injury "type.abbreviation" -> our Q/D/O scale.
// Anything not in this map is treated as healthy (no flag) or logged and skipped.
const STATUS_MAP = {
  Q: "Q",
  D: "D",
  O: "O",
  IR: "O",
  PUP: "D",
  NFI: "D",
  SUSP: "D",
};

const CONCURRENCY = 8;

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.'']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const current = idx++;
      try {
        results[current] = await worker(items[current], current);
      } catch (e) {
        results[current] = null; // swallow individual failures, keep going
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function getTeamIds() {
  const data = await fetchJson("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=32");
  const teams = data?.sports?.[0]?.leagues?.[0]?.teams || [];
  return teams.map((t) => t.team.id);
}

async function getTeamInjuryEntries(teamId) {
  // Page 1 only — ESPN returns newest entries first, which is what we want
  // for "current status" rather than full historical injury log.
  const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/teams/${teamId}/injuries?limit=25`;
  const data = await fetchJson(url);
  return (data?.items || []).map((i) => i.$ref);
}

async function resolveEntry(ref) {
  const detail = await fetchJson(ref);
  const abbr = detail?.type?.abbreviation;
  if (!abbr || abbr === "A") return null; // "Active" = not currently flagged
  const mapped = STATUS_MAP[abbr];
  if (!mapped) return null; // unrecognized code, skip rather than guess

  const athleteRef = detail?.athlete?.$ref;
  if (!athleteRef) return null;
  const athlete = await fetchJson(athleteRef);
  const displayName = athlete?.displayName;
  if (!displayName) return null;

  const note = (detail.shortComment || detail.longComment || "").trim();
  return {
    name: displayName,
    status: mapped,
    note: note ? note.slice(0, 220) : `Listed as ${detail.type?.description || abbr} on the injury report.`,
    espnDate: detail.date || null,
  };
}

async function main() {
  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const players = JSON.parse(playersRaw);
  const byNormalizedName = new Map(players.map((p) => [normalizeName(p.name), p.name]));

  console.log("Fetching NFL team list...");
  const teamIds = await getTeamIds();
  console.log(`Found ${teamIds.length} teams.`);

  console.log("Fetching injury report refs per team...");
  const perTeamRefs = await mapWithConcurrency(teamIds, CONCURRENCY, getTeamInjuryEntries);
  const allRefs = perTeamRefs.filter(Boolean).flat();
  console.log(`${allRefs.length} injury log entries to check.`);

  console.log("Resolving non-active entries (this is the slow part)...");
  const resolved = await mapWithConcurrency(allRefs, CONCURRENCY, resolveEntry);

  const out = {};
  let matched = 0;
  for (const entry of resolved) {
    if (!entry) continue;
    const key = byNormalizedName.get(normalizeName(entry.name));
    if (!key) continue; // player not in our pool (e.g. deep bench/IDP) — skip
    // Keep the most recent entry if we see the same player twice.
    if (!out[key] || (entry.espnDate && entry.espnDate > (out[key].espnDate || ""))) {
      out[key] = { status: entry.status, note: entry.note, espnDate: entry.espnDate };
      matched++;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "ESPN public injuries API (unofficial)",
    players: out,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${matched} flagged players to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-injuries failed:", err);
  // Exit 0 rather than failing the whole workflow — a bad run should not
  // take the site down; it just means today's data doesn't refresh.
  process.exit(0);
});
