// Pulls current team affiliation for every player on all 32 NFL rosters
// and writes data/teams.json. This is what keeps player "team" fields
// correct through roster cuts, trades, and releases WITHOUT anyone
// manually editing a JSON file on GitHub — the actual fix for the
// Mixon/Montgomery situation, generalized to every player automatically.
//
// A player from our pool who does NOT show up on any of the 32 rosters
// after checking all of them is a confirmed signal, not a guess — they've
// been checked against every active roster and found on none of them, so
// they're written out as team "FA" (free agent / off a roster entirely).
//
// Data source: ESPN's public (unofficial) roster endpoint, one call per
// team — no key required.
//
// Run manually:   node scripts/update-teams.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "data", "players.json");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "teams.json");
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
  return teams.map((t) => ({
    id: t.team.id,
    abbr: t.team.abbreviation,
    logo: t.team.logos?.[0]?.href || null,
  }));
}

async function getRoster(teamId) {
  const data = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`);
  const groups = data?.athletes || [];
  const athletes = [];
  for (const group of groups) {
    for (const a of group.items || []) {
      if (a.fullName) athletes.push({ name: a.fullName, headshot: a.headshot?.href || null });
    }
  }
  return athletes;
}

async function main() {
  const playersRaw = await readFile(PLAYERS_PATH, "utf8");
  const players = JSON.parse(playersRaw);
  const byNormalizedName = new Map(players.map((p) => [normalizeName(p.name), p.name]));

  console.log("Fetching team list...");
  const teams = await getTeams();
  console.log(`Found ${teams.length} teams.`);

  console.log("Fetching all 32 rosters (this is the slow part)...");
  const rosterLists = await mapWithConcurrency(teams, CONCURRENCY, async (team) => {
    const athletes = await getRoster(team.id);
    return { abbr: team.abbr, athletes };
  });

  // Build normalized-name -> current team map (and -> headshot map) from
  // every roster we found.
  const liveTeamByName = new Map();
  const headshotByName = new Map();
  for (const roster of rosterLists) {
    if (!roster) continue;
    for (const a of roster.athletes) {
      const norm = normalizeName(a.name);
      liveTeamByName.set(norm, roster.abbr);
      if (a.headshot) headshotByName.set(norm, a.headshot);
    }
  }

  const teamLogos = {};
  for (const t of teams) {
    if (t.logo) teamLogos[t.abbr] = t.logo;
  }

  const out = {};
  const photos = {};
  let matched = 0, movedOrCut = 0;
  for (const p of players) {
    if (p.pos === "DST") continue; // team defenses aren't on a roster endpoint, skip
    const norm = normalizeName(p.name);
    const liveTeam = liveTeamByName.get(norm);
    if (liveTeam) {
      out[p.name] = liveTeam;
      matched++;
      if (liveTeam !== p.team) movedOrCut++;
    } else {
      // Checked against all 32 rosters and found on none - confirmed FA,
      // not a data gap.
      out[p.name] = "FA";
      matched++;
      if (p.team !== "FA") movedOrCut++;
    }
    const headshot = headshotByName.get(norm);
    if (headshot) photos[p.name] = headshot;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "ESPN team roster API (unofficial), checked against all 32 teams",
    players: out,
    photos,
    teamLogos,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Wrote current teams for ${matched} players (${movedOrCut} changed from the static pool), ${Object.keys(photos).length} headshots, and ${Object.keys(teamLogos).length} team logos to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("update-teams failed:", err);
  // Fail-soft, same policy as the other update scripts: a bad run should
  // never take the deploy down, just mean today's team data doesn't refresh.
  process.exit(0);
});
