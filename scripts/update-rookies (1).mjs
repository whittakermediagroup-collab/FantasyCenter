// Automatically finds every true rookie AND second-year player (still
// likely undervalued or missing from a static list) at an offensive skill
// position (QB/RB/WR/TE) on an active 53-man roster, across all 32 teams.
// This replaces the "hand-pick a few headline names" approach (which
// reliably misses real players) with the same kind of full-coverage
// automation as update-teams.mjs / update-durability.mjs / update-usage.mjs.
//
// Originally this only caught experience.years === 0 (true rookies). That
// left a real, confirmed gap: 2025 draft class players who are now in their
// 2nd season (years === 1) - real, fantasy-relevant names like Tyler
// Warren, RJ Harvey, Kyle Monangai - fell through BOTH nets: too "old" for
// the rookie scan, but not in the original hand-built list either, since
// that predates their rookie-year breakouts. Broadened to years <= 1 to
// close that gap the same way the original rookie gap got closed: catch
// the whole category automatically, not one name at a time as people
// happen to notice them missing.
//
// Point projections here are NOT researched - there's no honest way to
// hand-project ~100+ players individually. Every player found gets a flat,
// deliberately conservative placeholder by position and year-tier (see
// PLACEHOLDER_PTS below) - low enough that they won't wrongly get
// recommended over established players, but high enough to be visible and
// manually draftable if you have specific conviction on one. Note: once a
// player lands in data/players.json via this script, the EXISTING
// update-usage.mjs / update-durability.mjs scripts automatically pick up
// their real 2025 nflverse stats on the next run (they scan the full
// players.json list) - so a 2nd-year player who actually saw real snaps
// gets a real usage-based score boost regardless of how rough this
// placeholder points number is. Players ALREADY in the static pool with a
// real hand-calibrated projection (e.g. Jeremiyah Love) are left untouched
// - this script only adds players who are missing entirely, never
// downgrades an existing entry.
//
// Run manually:   node scripts/update-rookies.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "rookies.json");
const CONCURRENCY = 8;
const OFFENSE_POS = new Set(["QB", "RB", "WR", "TE"]);
const MAX_YEARS_EXP = 1; // catches years 0 (true rookie) and 1 (2nd year)
const PLACEHOLDER_PTS = {
  0: { QB: 60, RB: 45, WR: 40, TE: 30 },
  1: { QB: 90, RB: 70, WR: 65, TE: 50 }, // modestly higher - they have at
  // least some real NFL track record now, even though this is still a
  // rough estimate, not a researched projection.
};

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
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
        results[current] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function getTeams() {
  const data = await fetchJson("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=32");
  const teams = data?.sports?.[0]?.leagues?.[0]?.teams || [];
  return teams.map((t) => ({ id: t.team.id, abbr: t.team.abbreviation }));
}

async function getRookies(teamId, teamAbbr) {
  const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`);
  const groups = data?.athletes || [];
  const rookies = [];
  for (const group of groups) {
    for (const a of group.items || []) {
      const posAbbr = a.position?.abbreviation;
      const years = a.experience?.years;
      const isActive = !a.status || a.status.type === "active";
      if (!a.fullName || !OFFENSE_POS.has(posAbbr) || !isActive) continue;
      if (typeof years !== "number" || years > MAX_YEARS_EXP) continue;
      rookies.push({
        name: a.fullName,
        pos: posAbbr,
        team: teamAbbr,
        headshot: a.headshot?.href || null,
        yearsExp: years,
      });
    }
  }
  return rookies;
}

async function main() {
  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const existingPlayers = JSON.parse(playersRaw);
  const existingNames = new Set(existingPlayers.map((p) => normalizeName(p.name)));

  console.log("Fetching team list...");
  const teams = await getTeams();
  console.log(`Found ${teams.length} teams.`);

  console.log(`Scanning all 32 rosters for rookies and 2nd-year players (experience.years <= ${MAX_YEARS_EXP})...`);
  const perTeam = await mapWithConcurrency(teams, CONCURRENCY, (team) => getRookies(team.id, team.abbr));

  const allRookies = [];
  let skippedAlreadyKnown = 0;
  for (const list of perTeam) {
    if (!list) continue;
    for (const r of list) {
      if (existingNames.has(normalizeName(r.name))) {
        // Already in the static pool with a real hand-calibrated projection
        // (e.g. Jeremiyah Love) - don't touch it.
        skippedAlreadyKnown++;
        continue;
      }
      allRookies.push({
        ...r,
        pts: PLACEHOLDER_PTS[r.yearsExp]?.[r.pos] ?? PLACEHOLDER_PTS[1][r.pos],
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: `ESPN active rosters, all 32 teams, filtered to experience.years <= ${MAX_YEARS_EXP} at QB/RB/WR/TE`,
    note: "Point projections are flat conservative placeholders by position and year-tier, not researched - see script comment.",
    players: allRookies,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Found ${allRookies.length} new rookies/2nd-year players (${skippedAlreadyKnown} already in the pool, left untouched). Wrote to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-rookies failed:", err);
  // Fail-soft, same policy as every other update script.
  process.exit(0);
});
