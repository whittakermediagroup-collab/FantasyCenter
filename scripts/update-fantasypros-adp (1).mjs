// Pulls FantasyPros' consensus ADP - already a blend of ESPN, CBS,
// RTSports, Fantrax, and Sleeper - as a SECOND real market-consensus
// source alongside Fantasy Football Calculator's ADP (scripts/update-adp.mjs).
// Two independent consensus sources catch cases where one site's mock-draft
// pool skews weird for a given player; blending is more honest than
// trusting either alone.
//
// Requires a FantasyPros API key (free, personal, non-commercial - see
// secure.fantasypros.com/api-keys/request). The key is NEVER hardcoded here
// - it's read from the FANTASYPROS_API_KEY environment variable, which the
// GitHub Action injects from a repo secret of the same name. If that secret
// isn't set, this script exits cleanly and the app just runs on FFC's ADP
// alone, exactly as it already does.
//
// Docs referenced (not independently verified live - this sandbox can't
// reach api.fantasypros.com to test): GET /nfl/{season}/consensus-rankings
// ?position={POS}&scoring=PPR, header "x-api-key". Response shape assumed
// from FantasyPros' own documentation examples; parsing below is defensive
// and will just skip anything that doesn't match rather than throw.
//
// Run manually (with the env var set):  FANTASYPROS_API_KEY=xxx node scripts/update-fantasypros-adp.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "fantasypros-adp.json");
const SEASON = 2026;
const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];
const API_KEY = process.env.FANTASYPROS_API_KEY;

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPosition(pos) {
  const url = `https://api.fantasypros.com/public/v2/json/nfl/${SEASON}/consensus-rankings?position=${pos}&scoring=PPR`;
  const res = await fetch(url, { headers: { "x-api-key": API_KEY, accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${pos}`);
  const data = await res.json();
  // Defensive: FantasyPros' docs show a "players" array with rank_ecr /
  // player_name - handle a couple of plausible variants without throwing
  // if the real shape differs slightly.
  const list = data.players || data.rankings || [];
  return list.map((p) => ({
    name: p.player_name || p.name,
    rankEcr: p.rank_ecr ?? p.rank ?? null,
    team: p.player_team_id || p.team || null,
  })).filter((p) => p.name && p.rankEcr != null);
}

async function main() {
  if (!API_KEY) {
    console.log("No FANTASYPROS_API_KEY set - skipping, app runs on FFC ADP alone.");
    process.exit(0);
  }

  // Rate-limit guard: FantasyPros' free tier caps at 50 requests/day, and
  // this script uses 6 per run (one per position). A normal once-daily cron
  // run is nowhere close to that, but manually re-triggering the workflow
  // several times in one debugging session can add up fast. If the last
  // successful run was recent, skip re-fetching entirely rather than
  // burning quota on data that's still fresh.
  const FRESHNESS_HOURS = 20;
  try {
    const existingRaw = await readFile(OUTPUT_PATH, "utf8");
    const existing = JSON.parse(existingRaw);
    if (existing.generatedAt) {
      const ageHours = (Date.now() - new Date(existing.generatedAt).getTime()) / 3600000;
      if (ageHours < FRESHNESS_HOURS) {
        console.log(`Existing data/fantasypros-adp.json is ${ageHours.toFixed(1)}h old (under the ${FRESHNESS_HOURS}h freshness window) - skipping to conserve the daily request quota.`);
        process.exit(0);
      }
      console.log(`Existing data is ${ageHours.toFixed(1)}h old - refreshing.`);
    }
  } catch (e) {
    // no existing file yet, or it's malformed - proceed to fetch fresh data
  }

  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const players = JSON.parse(playersRaw);
  const byNormalizedName = new Map(players.map((p) => [normalizeName(p.name), p.name]));

  const perPosition = {};
  for (const pos of POSITIONS) {
    console.log(`Fetching FantasyPros ${pos} consensus rankings...`);
    try {
      perPosition[pos] = await fetchPosition(pos);
      console.log(`  got ${perPosition[pos].length} ${pos} entries`);
    } catch (e) {
      console.log(`  skipped ${pos}: ${e.message}`);
      perPosition[pos] = [];
    }
    // Brief pause between the 6 sequential requests - not because FantasyPros
    // documents a per-second limit on their free tier, but firing 6 requests
    // back-to-back with zero spacing is the kind of burst pattern that trips
    // undocumented rate limits on APIs generally. Cheap, defensive, and more
    // polite API citizenship regardless.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  // Position-rank (rank_ecr is rank WITHIN position, e.g. "RB1") isn't
  // directly comparable to FFC's overall-pick ADP number, so this is
  // written out as its own field (fantasyProsPosRank) rather than forced
  // into the same "adp" number - the app can display/use both without
  // conflating two different scales.
  const out = {};
  let matched = 0;
  for (const [pos, list] of Object.entries(perPosition)) {
    list.forEach((entry, idx) => {
      const norm = normalizeName(entry.name);
      const key = byNormalizedName.get(norm);
      if (!key) return;
      out[key] = { fantasyProsPosRank: entry.rankEcr, position: pos };
      matched++;
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "FantasyPros consensus rankings API (5-source blend: ESPN, CBS, RTSports, Fantrax, Sleeper)",
    players: out,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote FantasyPros consensus data for ${matched} players to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-fantasypros-adp failed:", err);
  // Fail-soft, same policy as every other update script.
  process.exit(0);
});
