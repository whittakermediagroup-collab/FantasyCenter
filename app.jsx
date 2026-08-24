// React is loaded globally via the CDN <script> tags in index.html (not
// bundled) — no ES import here, so esbuild doesn't need to resolve "react"
// at build time and the browser never sees a require() call.
const { useState, useMemo, useEffect } = React;

/* ---------------------------------------------------------------
   Minimal inline icon set (swapped in for lucide-react so this file
   has zero external JS dependencies besides React itself — needed
   since GitHub Pages serves this as a plain static site).
---------------------------------------------------------------- */
const iconProps = (size) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" });
function Trophy({ size = 16, color }) { return <svg {...iconProps(size)} style={{ color }}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>; }
function Zap({ size = 16, color }) { return <svg {...iconProps(size)} style={{ color }}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" /></svg>; }
function RotateCcw({ size = 16 }) { return <svg {...iconProps(size)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>; }
function Undo2({ size = 16 }) { return <svg {...iconProps(size)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>; }
function Search({ size = 16, color }) { return <svg {...iconProps(size)} style={{ color }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>; }
function Flame({ size = 16, color }) { return <svg {...iconProps(size)} style={{ color }}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 1 1-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z" /></svg>; }
function Users({ size = 16, color }) { return <svg {...iconProps(size)} style={{ color }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>; }
function Radio({ size = 16 }) { return <svg {...iconProps(size)}><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2" /></svg>; }

/* ---------------------------------------------------------------
   PLAYER POOL — 2026 preseason PPR projections (editable starting
   point). Values are approximate projected fantasy points for a
   12-team PPR league. Tweak freely as news breaks.
---------------------------------------------------------------- */
const RAW = [
  // QB — points rebuilt for THIS league's scoring: 6-pt passing TD (not the
  // usual 4) and 0.05/yd passing (vs the more common 0.04/yd). Formula:
  // base_pts (4pt-TD equivalent) + est. season pass TDs × 2 + est. pass yards × 0.01.
  // This is why high-TD-rate passers (Burrow, Mahomes, Baker Mayfield) jump
  // relative to high-floor/low-ceiling game managers compared to a standard league.
  ["QB","Josh Allen","BUF",522],["QB","Jayden Daniels","WAS",486],["QB","Joe Burrow","CIN",480],
  ["QB","Lamar Jackson","BAL",477],["QB","Drake Maye","NE",459],["QB","Jalen Hurts","PHI",445],
  ["QB","Dak Prescott","DAL",435],["QB","Trevor Lawrence","JAC",432],["QB","Matthew Stafford","LAR",424],
  ["QB","Patrick Mahomes","KC",421],["QB","Brock Purdy","SF",421],["QB","Bo Nix","DEN",420],
  ["QB","Justin Herbert","LAC",419],["QB","Jared Goff","DET",398],["QB","Baker Mayfield","TB",389],
  ["QB","Kyler Murray","ARI",392],["QB","C.J. Stroud","HOU",376],["QB","Jordan Love","GB",368],
  ["QB","Daniel Jones","IND",363],["QB","Caleb Williams","CHI",406],
  // RB
  ["RB","Bijan Robinson","ATL",340],["RB","Jahmyr Gibbs","DET",330],["RB","Christian McCaffrey","SF",320],
  ["RB","Jonathan Taylor","IND",310],["RB","De'Von Achane","MIA",305],["RB","Ashton Jeanty","LV",295],
  ["RB","Saquon Barkley","PHI",290],["RB","James Cook","BUF",285],["RB","Derrick Henry","BAL",280],
  ["RB","Chase Brown","CIN",275],["RB","Kenneth Walker III","SEA",265],["RB","Josh Jacobs","GB",260],
  ["RB","Bucky Irving","TB",258],["RB","Kyren Williams","LAR",255],["RB","Omarion Hampton","LAC",250],
  ["RB","TreVeyon Henderson","NE",245],["RB","Alvin Kamara","NO",240],["RB","Breece Hall","NYJ",238],
  ["RB","Joe Mixon","FA",70],["RB","James Conner","ARI",230],["RB","Jaylen Warren","PIT",225],
  ["RB","D'Andre Swift","CHI",220],["RB","Tony Pollard","TEN",215],["RB","Chuba Hubbard","CAR",212],
  ["RB","Rhamondre Stevenson","NE",208],["RB","Aaron Jones","MIN",205],["RB","Javonte Williams","DAL",200],
  ["RB","Zach Charbonnet","SEA",198],["RB","Isiah Pacheco","KC",195],["RB","David Montgomery","HOU",210],
  ["RB","Rachaad White","TB",188],["RB","Brian Robinson Jr","WAS",185],["RB","Jerome Ford","CLE",182],
  ["RB","Tyrone Tracy Jr","NYG",180],["RB","Najee Harris","NYG",160],["RB","Cam Skattebo","NYG",175],
  ["RB","Ray Davis","BUF",170],["RB","Austin Ekeler","WAS",168],["RB","Tyjae Spears","TEN",165],
  ["RB","Jaylen Wright","MIA",160],["RB","Emanuel Wilson","GB",158],["RB","Kimani Vidal","LAC",155],
  ["RB","Blake Corum","LAR",152],["RB","MarShawn Lloyd","GB",150],["RB","Justice Hill","BAL",148],
  ["RB","Braelon Allen","NYJ",145],["RB","Jordan Mason","MIN",142],["RB","Ty Johnson","BUF",140],
  ["RB","Zamir White","LV",138],["RB","Dylan Sampson","CLE",135],["RB","Jaydon Blue","DAL",132],
  ["RB","Bhayshul Tuten","JAC",130],["RB","Trey Benson","ARI",128],["RB","Woody Marks","HOU",126],
  ["RB","Devin Neal","NO",124],["RB","Jordan James","SF",96],
  // WR
  ["WR","Ja'Marr Chase","CIN",320],["WR","Puka Nacua","LAR",310],["WR","Jaxon Smith-Njigba","SEA",300],
  ["WR","Amon-Ra St. Brown","DET",295],["WR","Justin Jefferson","MIN",290],["WR","CeeDee Lamb","DAL",285],
  ["WR","Drake London","ATL",275],["WR","Rashee Rice","KC",270],["WR","Nico Collins","HOU",268],
  ["WR","A.J. Brown","PHI",265],["WR","Malik Nabers","NYG",262],["WR","Marvin Harrison Jr","ARI",258],
  ["WR","Mike Evans","SF",228],
  ["WR","Brian Thomas Jr","JAC",255],["WR","Tyreek Hill","MIA",250],["WR","Garrett Wilson","NYJ",248],
  ["WR","DK Metcalf","PIT",245],["WR","Terry McLaurin","WAS",240],["WR","Ladd McConkey","LAC",238],
  ["WR","Davante Adams","LAR",235],["WR","Zay Flowers","BAL",232],["WR","Tee Higgins","CIN",230],
  ["WR","Chris Olave","NO",225],["WR","DJ Moore","CHI",222],["WR","Jameson Williams","DET",220],
  ["WR","Jerry Jeudy","CLE",215],["WR","Courtland Sutton","DEN",212],["WR","Xavier Worthy","KC",210],
  ["WR","Rome Odunze","CHI",208],["WR","Jordan Addison","MIN",205],["WR","Travis Hunter","JAC",203],
  ["WR","Jauan Jennings","SF",202],["WR","Keon Coleman","BUF",198],["WR","Khalil Shakir","BUF",195],
  ["WR","Deebo Samuel Sr","WAS",192],["WR","Calvin Ridley","TEN",190],["WR","Josh Downs","IND",188],
  ["WR","Cooper Kupp","SEA",185],["WR","Jayden Reed","GB",182],["WR","Christian Kirk","HOU",180],
  ["WR","Emeka Egbuka","TB",180],["WR","Wan'Dale Robinson","NYG",178],["WR","Ricky Pearsall","SF",175],
  ["WR","Michael Pittman Jr","IND",172],["WR","Marquise Brown","KC",170],["WR","Rashid Shaheed","NO",168],
  ["WR","Tank Dell","HOU",165],["WR","Jakobi Meyers","LV",162],["WR","Adam Thielen","CAR",160],
  ["WR","Darnell Mooney","ATL",158],["WR","Romeo Doubs","GB",156],["WR","Tutu Atwell","LAR",154],
  ["WR","Xavier Legette","CAR",152],["WR","Jalen McMillan","TB",150],["WR","Dontayvion Wicks","GB",148],
  ["WR","Elic Ayomanor","TEN",146],["WR","Luther Burden III","CHI",144],["WR","Matthew Golden","GB",142],
  ["WR","Jayden Higgins","HOU",138],["WR","Alec Pierce","IND",136],["WR","Josh Palmer","LAC",134],
  ["WR","Demario Douglas","NE",132],["WR","Kayshon Boutte","NE",130],["WR","Rashod Bateman","BAL",128],
  ["WR","Jalen Coker","CAR",126],["WR","Marvin Mims Jr","DEN",124],["WR","Xavier Restrepo","MIA",122],
  ["WR","Cedric Tillman","CLE",120],["WR","Jalen Tolbert","DAL",118],["WR","Troy Franklin","DEN",116],
  ["WR","Jack Bech","HOU",114],
  // TE
  ["TE","Brock Bowers","LV",220],["TE","Trey McBride","ARI",210],["TE","Sam LaPorta","DET",190],
  ["TE","George Kittle","SF",180],["TE","T.J. Hockenson","MIN",170],["TE","Mark Andrews","BAL",165],
  ["TE","David Njoku","CLE",160],["TE","Evan Engram","DEN",155],["TE","Dallas Goedert","PHI",150],
  ["TE","Jonnu Smith","PIT",145],["TE","Colston Loveland","CHI",140],["TE","Dalton Kincaid","BUF",135],
  ["TE","Tucker Kraft","GB",130],["TE","Kyle Pitts","ATL",128],["TE","Isaiah Likely","BAL",125],
  ["TE","Hunter Henry","NE",122],["TE","Cade Otton","TB",118],["TE","Juwan Johnson","NO",115],
  // K
  ["K","Brandon Aubrey","DAL",145],["K","Cameron Dicker","LAC",142],["K","Jake Bates","DET",140],
  ["K","Chris Boswell","PIT",138],["K","Harrison Butker","KC",136],["K","Jason Myers","SEA",134],
  ["K","Younghoe Koo","ATL",132],["K","Ka'imi Fairbairn","HOU",130],["K","Tyler Bass","BUF",128],
  ["K","Cairo Santos","CHI",126],["K","Will Reichard","MIN",124],["K","Joshua Karty","LAR",122],
  // DST
  ["DST","Broncos","DEN",140],["DST","Eagles","PHI",138],["DST","Steelers","PIT",135],
  ["DST","Texans","HOU",133],["DST","Vikings","MIN",130],["DST","Ravens","BAL",128],
  ["DST","49ers","SF",126],["DST","Packers","GB",124],["DST","Chiefs","KC",122],
  ["DST","Seahawks","SEA",120],["DST","Cowboys","DAL",118],["DST","Chargers","LAC",116],
];

/* ---------------------------------------------------------------
   INJURY BOARD — manually seeded from preseason/training-camp
   reports as of late August 2026. This is a snapshot, not a live
   feed — re-check closer to your draft since camp injury news
   changes daily. Status scale: Q = questionable/minor concern,
   D = doubtful/significant concern trending the wrong way,
   O = out for the season or a long-term multi-week absence.
---------------------------------------------------------------- */
const INJURIES = {
  "Ricky Pearsall": { status: "O", note: "Out for the 2026 season — PCL surgery on his surgically repaired knee." },
  "Jayden Higgins": { status: "O", note: "Out for the 2026 season — torn ACL." },
  "Zach Charbonnet": { status: "D", note: "ACL tear suffered in the playoffs; expected to miss the start of the season. Kenneth Walker III projects as Seattle's lead back early." },
  "Malik Nabers": { status: "D", note: "ACL + meniscus tear, needed a second cleanup surgery in spring 2026. Real chance he opens on PUP (min. 4 games out) — value is discounted hard until he's cleared." },
  "Najee Harris": { status: "D", note: "Still working back from a ruptured Achilles; buried in a crowded NYG backfield behind Skattebo and Tracy. Low-priority stash at best." },
  "Christian McCaffrey": { status: "Q", note: "Missed ~2 weeks of camp with unspecified leg 'tightness' before returning to practice Aug 23. Long injury history (calf/Achilles) makes him a real risk at his ADP." },
  "George Kittle": { status: "Q", note: "Off the PUP list Aug 23 in his recovery from a torn Achilles; trending toward a Week 1 return but could slip a week." },
  "Sam LaPorta": { status: "Q", note: "Missed practice with a hip injury; trending the wrong way heading into camp's final stretch." },
  "Luther Burden III": { status: "Q", note: "Expected to miss the preseason with a groin injury; team hopeful for Week 1." },
  "Josh Jacobs": { status: "Q", note: "Dealing with a groin injury in camp; no real Week 1 concern yet, just a flag to monitor." },
  "Rachaad White": { status: "Q", note: "Groin injury, day-to-day, behind Bucky Irving anyway." },
  "Rhamondre Stevenson": { status: "Q", note: "Missed practice time for an undisclosed reason — worth confirming before you draft him." },
  "Breece Hall": { status: "Q", note: "Banged up in camp with a possible groin issue; monitor before drafting at cost." },
  "Mike Evans": { status: "Q", note: "Managing a quad injury in his first camp with San Francisco; team expects him for Week 1 but he's 33 with recent injury seasons." },
  "Patrick Mahomes": { status: "Q", note: "Recovering from a torn ACL/LCL suffered in Week 15 last season; reportedly progressing well but bears watching into Week 1." },
  "Joe Mixon": { status: "O", note: "Missed the entire 2025 season with an unclear, unresolved foot/ankle condition the team never fully explained. Released by Houston in March 2026 and unsigned as of this writing — do not draft off name value alone; verify he's actually on a roster before considering him." },
  "Alvin Kamara": { status: "D", note: "Suffered an MCL sprain in joint practices and is expected to miss Week 1 2026 — only the second Week 1 he's missed in his career. Also battled recurring knee/ankle issues down the stretch of 2025." },
};

/* ---------------------------------------------------------------
   DURABILITY — games missed to injury over the last 3 seasons
   (2023-2025), hand-researched for the players where multi-year
   history is well-documented and materially affects draft value.
   This is a CURATED subset, not exhaustive — most of the 189-player
   pool has no entry here and is treated as neutral, since we don't
   have a verified injury log for everyone. Past health isn't
   destiny (durability multiplier has a floor), but it's a real
   signal the raw points don't otherwise capture.
   denominator: 51 = 3 seasons x 17 games, used as a rough baseline
   regardless of exactly how many of those games a player was
   active for the team in question.
---------------------------------------------------------------- */
const DURABILITY = {
  "Christian McCaffrey": { missed: 14, note: "Missed 1 game in 2023, 13 in 2024 (Achilles/PCL), 0 in 2025. The 2025 bounce-back was real, but this is a two-time multi-week absence in three years." },
  "Kenneth Walker III": { missed: 10, note: "Missed 10 games to injury over the last 3 seasons — oblique, calf, and high-ankle issues have recurred, not just one bad break." },
  "Cooper Kupp": { missed: 18, note: "Chronic soft-tissue history (hamstring, ankle) across this window — the talent is real when he's on the field, the field time is the risk." },
  "Rashee Rice": { missed: 22, note: "Only ~12 games played across the last two seasons combined, between a torn ACL and a suspension. Different causes, same result: missed time." },
  "Deebo Samuel": { missed: 12, note: "Recurring calf and shoulder issues have cost him real time in multiple recent seasons." },
  "Mark Andrews": { missed: 11, note: "A fractured ankle in 2023 was the big one; mostly available since, but the multi-year total still stands out." },
  "Jonathan Taylor": { missed: 8, note: "Ankle and trade-drama-affected 2023 cost him real time; fully healthy and dominant in 2024. Trending the right direction." },
  "Puka Nacua": { missed: 7, note: "Knee/ankle issues limited him for a stretch in 2024. Elite production rate when playing." },
  "Justin Jefferson": { missed: 7, note: "A 2023 hamstring injury cost him about a quarter of that season; otherwise durable." },
  "James Conner": { missed: 8, note: "Recurring minor injuries have chipped into his availability across multiple seasons without being one big one." },
  "Breece Hall": { missed: 5, note: "Finished as a top-20 back in PPG each of the last 3 seasons despite some nagging issues — availability has been better than his injury reputation suggests." },
  "Saquon Barkley": { missed: 5, note: "A 2023 high-ankle sprain cost him a few weeks; his 2024 workload (450+ touches) was a full-season iron-man effort." },
  "Nico Collins": { missed: 4, note: "A 2024 hamstring injury cost him some time; otherwise available." },
  "George Kittle": { missed: 5, note: "Recurring hamstring history, though recent seasons have been better than his earlier injury reputation." },
  "Joe Mixon": { missed: 20, note: "3 games missed in 2024 (ankle) plus the entire 2025 season (unresolved foot/ankle condition) — this is on top of the current release/unsigned status flagged above. About as red a flag as this list has." },
  "Alvin Kamara": { missed: 7, note: "Missed the final ~4 games of 2025 with knee/ankle issues, now dealing with a fresh MCL sprain entering 2026. A downturn in availability for a back who was durable earlier in his career." },
  "Isiah Pacheco": { missed: 9, note: "A broken fibula cost him most of a season, and quad/shoulder issues limited him late in 2024. Talented but hasn't strung together a fully healthy stretch recently." },
  "Chris Olave": { missed: 5, note: "This one isn't just missed-games — Olave has 5 documented concussions since 2020 (4 in the NFL), including two in 2024 alone that had him weighing retirement. He played through most of 2025, but repeated head trauma is a different, more serious category of risk than a soft-tissue injury." },
};

function durabilityMultiplier(p) {
  const d = DURABILITY[p.name];
  if (!d) return { mult: 1, note: null };
  const missedRate = d.missed / 51;
  const mult = Math.max(0.75, 1 - missedRate * 0.55);
  return { mult, note: `⛑ Durability: ${d.missed} games missed over the last 3 seasons. ${d.note}` };
}

/* ---------------------------------------------------------------
   HANDCUFFS — backup RB -> the starter they'd inherit touches from.
   Two distinct strategic uses this powers:
   1. Direct insurance — if you already own the starter, their
      handcuff is real injury insurance for YOUR roster.
   2. Speculative denial/value — a notable backup to an
      injury-prone starter (per DURABILITY above) has standalone
      late-round value even on a team you don't own, since the
      touches land somewhere the moment that starter goes down.
---------------------------------------------------------------- */
const HANDCUFFS = {
  "Ray Davis": "James Cook",
  "Justice Hill": "Derrick Henry",
  "MarShawn Lloyd": "Josh Jacobs",
  "Rachaad White": "Bucky Irving",
  "Braelon Allen": "Breece Hall",
  "Woody Marks": "David Montgomery", // updated: Mixon released/unsigned, Montgomery traded in as Houston's back
  "Devin Neal": "Alvin Kamara",
  "Tyjae Spears": "Tony Pollard",
  "Jordan Mason": "Aaron Jones",
  "Tyrone Tracy Jr": "Cam Skattebo",
  "Jordan James": "Christian McCaffrey",
};

const INITIAL_PLAYERS = RAW.map((r, i) => ({
  id: i, pos: r[0], name: r[1], team: r[2], pts: r[3], drafted: false, owner: null,
  injury: INJURIES[r[1]] || null,
}));

const TEAMS = 12;
const REQ = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1 };
const BASELINE_RANK = { QB: 12, RB: 30, WR: 30, TE: 13, K: 12, DST: 12 };
const POS_LIST = ["QB", "RB", "WR", "TE", "K", "DST"];
const CAPACITY = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 7, IR: 1 };

/* ---------------------------------------------------------------
   STRATEGY RESEARCH NOTES (baked into the scoring model, not just
   the player pool):

   - "RB Dead Zone": extensively documented (Establish The Run,
     FantasyPros, RotoWire, 4for4, PlayerProfiler) — RBs taken
     roughly rounds 3-8 who aren't clear bell-cows bust at a much
     higher rate than WRs taken in the same range, because mid-tier
     backfields are usually committees. The model applies a small
     score discount to non-elite RBs (outside the top ~12 at the
     position) specifically in rounds 3-8, unless you're running
     Robust RB on purpose.
   - Zero RB / Hero RB / Robust RB are established, competing
     doctrines for how hard to prioritize RB early. Rather than pick
     one for you, the app lets you set a philosophy and tunes the
     early-round position weighting to match it.
   - Positional "tiers" (clusters separated by real point-gap cliffs,
     not arbitrary round cutoffs) matter more than raw rank — the
     app detects tier breaks live off the remaining pool so you can
     see when a position is about to fall off a cliff.
---------------------------------------------------------------- */

function computeTiers(posArrSortedDesc) {
  let tier = 1;
  return posArrSortedDesc.map((p, i) => {
    if (i > 0) {
      const prev = posArrSortedDesc[i - 1].pts;
      const drop = prev > 0 ? (prev - p.pts) / prev : 0;
      if (drop > 0.07) tier++;
    }
    return { ...p, tier };
  });
}

function deadZoneAdjust(p, round, rbCountOnMyTeam, rbPosRank, strategy) {
  if (p.pos !== "RB") return { mult: 1, note: null };
  if (strategy === "robust") {
    return round <= 3 ? { mult: 1.1, note: "Robust RB mode — leaning into a 2nd early back." } : { mult: 1, note: null };
  }
  if (strategy === "zero") {
    return round <= 8
      ? { mult: 0.72, note: "Zero RB mode — fading RB early on purpose to stack WR value." }
      : { mult: 1, note: null };
  }
  if (strategy === "hero") {
    if (rbCountOnMyTeam === 0) return { mult: 1, note: null };
    if (round >= 3 && round <= 8) return { mult: 0.82, note: "Hero RB mode — you have your bell-cow, fading the RB dead zone." };
    return { mult: 1, note: null };
  }
  // balanced — still respect the documented dead zone, just softer
  if (round >= 3 && round <= 8 && rbPosRank > 12) {
    return { mult: 0.9, note: "RB Dead Zone: backs taken rounds 3-8 outside the top tier bust more than WRs at the same cost." };
  }
  return { mult: 1, note: null };
}

const POS_COLOR = {
  QB: { fg: "var(--violet)", bg: "rgba(201,168,255,0.12)" },
  RB: { fg: "#34D399", bg: "rgba(52,211,153,0.12)" },
  WR: { fg: "#38BDF8", bg: "rgba(56,189,248,0.12)" },
  TE: { fg: "#FB923C", bg: "rgba(251,146,60,0.12)" },
  K:  { fg: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  DST:{ fg: "var(--danger)", bg: "rgba(251,113,133,0.12)" },
};

function InjuryFreshnessBanner({ injuryMeta }) {
  const isLive = injuryMeta.source !== "built-in seed" && injuryMeta.generatedAt;
  const age = isLive ? daysSince(injuryMeta.generatedAt.slice(0, 10)) : null;
  const tone = !isLive ? "stale" : age <= 1 ? "fresh" : age <= 2 ? "aging" : "stale";
  const color = tone === "fresh" ? "var(--turf-bright)" : tone === "aging" ? "var(--amber)" : "var(--danger)";
  const label = !isLive
    ? "Using built-in seed data — live feed hasn't loaded"
    : tone === "fresh" ? "Injury data current (auto-refreshed)"
    : tone === "aging" ? "Injury data aging"
    : "Injury data stale — check the GitHub Action run";

  return (
    <div className="rounded-xl border lift px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3" style={{ background: "var(--surface)", borderColor: color + "55" }}>
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${tone === "stale" ? "pulse" : ""}`} style={{ background: color }} />
        <div>
          <div className="text-sm font-semibold" style={{ color }}>{label}</div>
          <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>
            {isLive
              ? `Auto-updated ${injuryMeta.generatedAt} · ${injuryMeta.count} flagged players · sourced from ESPN via the daily GitHub Action`
              : "This file is generated by .github/workflows/update-injuries.yml — it'll populate after the first scheduled run on GitHub."}
          </div>
        </div>
      </div>
    </div>
  );
}

function InjuryBadge({ injury }) {
  if (!injury) return null;
  return (
    <span
      className="text-xs font-bold mono px-1.5 py-0.5 rounded"
      style={{ color: INJURY_COLOR[injury.status], background: `${INJURY_COLOR[injury.status]}22`, border: `1px solid ${INJURY_COLOR[injury.status]}55` }}
      title={injury.note}
    >
      {INJURY_LABEL[injury.status]}
    </span>
  );
}

function computeBaselines() {
  const out = {};
  POS_LIST.forEach((pos) => {
    const arr = RAW.filter((r) => r[0] === pos).map((r) => r[3]).sort((a, b) => b - a);
    const idx = Math.min(BASELINE_RANK[pos] - 1, arr.length - 1);
    out[pos] = arr[idx] || 0;
  });
  return out;
}
const BASELINES = computeBaselines();

const INJURY_MULT = { Q: 0.93, D: 0.75, O: 0.1 };
const INJURY_LABEL = { Q: "Q", D: "D", O: "OUT" };
const INJURY_COLOR = { Q: "#FFB020", D: "#FB923C", O: "var(--danger)" };
// Hand-verified snapshot date for the injury board below. There is no live
// feed wired in — see the freshness banner in the UI for how to refresh this.
const INJURY_VERIFIED_AT = "2026-08-24";

function daysSince(dateStr) {
  const ms = Date.now() - new Date(dateStr + "T00:00:00").getTime();
  return Math.floor(ms / 86400000);
}

function scoreCandidate(p, ctx) {
  const { bucketCounts, round, undraftedByPos, rbCountOnMyTeam, strategy, nextPickOverall, currentPickOverall, myRosterNames, allPlayersByName } = ctx;
  const vbd = p.pts - BASELINES[p.pos];
  const starterNeeded = Math.max(0, (REQ[p.pos] || 0) - (bucketCounts[p.pos] || 0));
  const flexNeeded = Math.max(0, REQ.FLEX - bucketCounts.FLEX);
  const flexEligible = ["RB", "WR", "TE"].includes(p.pos);

  let mult;
  if (["K", "DST"].includes(p.pos)) {
    mult = round < 12 ? 0.12 : starterNeeded > 0 ? 1.3 : 0.5;
  } else if (starterNeeded > 0) mult = 1.15;
  else if (flexEligible && flexNeeded > 0) mult = 1.08;
  else mult = 0.88;

  const arr = undraftedByPos[p.pos] || [];
  const tierPts = p.pts * 0.93;
  const tierCount = arr.filter((x) => x.pts >= tierPts).length;
  let scarcity = 0;
  if (tierCount <= 3) scarcity = 0.1;
  else if (tierCount <= 6) scarcity = 0.05;

  const rbPosRank = p.pos === "RB" ? arr.findIndex((x) => x.id === p.id) + 1 : 0;
  const dz = deadZoneAdjust(p, round, rbCountOnMyTeam, rbPosRank, strategy);

  const injuryMult = p.injury ? INJURY_MULT[p.injury.status] ?? 1 : 1;

  // ADP-based urgency: if the market's average draft slot for this player is
  // at or before your next actual turn, the field is likely to take him
  // before you get another shot — that's real, actionable urgency distinct
  // from VBD/scarcity, which only describe value, not market timing.
  let adpUrgency = 0;
  let goneBeforeNextPick = false;
  if (typeof p.adp === "number" && nextPickOverall != null) {
    if (p.adp <= nextPickOverall) { adpUrgency = 0.12; goneBeforeNextPick = true; }
    else if (p.adp <= nextPickOverall + 6) adpUrgency = 0.05;
  }

  // Durability — discount (never destroy) value for players with a real,
  // documented multi-year pattern of missed time. Floor keeps this from
  // ever fully tanking a player, since past health isn't destiny.
  const dur = durabilityMultiplier(p);

  // Handcuff value — two distinct triggers, per real draft strategy:
  // owning the starter turns this into direct injury insurance; NOT owning
  // the starter but that starter being a documented injury risk still gives
  // this speculative "denial" value in the mid/late rounds.
  // NOTE: this is an ADDITIVE score bonus, not a multiplier — most handcuffs
  // have negative raw VBD (they're below-replacement by design until their
  // starter is out), so a multiplier would make a low/negative score even
  // more negative. A flat bonus is the only version of this that actually
  // lifts a legitimate late-round handcuff target above other deep bench
  // filler without that inversion bug.
  let handcuffBonus = 0;
  let handcuffNote = null;
  const starterName = HANDCUFFS[p.name];
  if (starterName) {
    const ownStarter = myRosterNames && myRosterNames.has(starterName);
    const starterDur = DURABILITY[starterName];
    const starterRisky = starterDur && starterDur.missed / 51 > 0.15;
    if (ownStarter) {
      handcuffBonus = round >= 6 ? 55 : 15;
      handcuffNote = `You own ${starterName} — this is direct injury insurance for your own roster, not just a flier.`;
    } else if (starterRisky && round >= 8) {
      handcuffBonus = 25;
      handcuffNote = `Handcuff to ${starterName}, who has a documented injury history (${starterDur.missed} games missed over 3 seasons). Cheap speculative value even on a team you don't own — those touches land somewhere the moment he's out.`;
    } else if (starterRisky) {
      handcuffNote = `Handcuff to ${starterName} (injury-prone historically) — worth remembering for a few rounds from now rather than a priority yet.`;
    }
  }

  const score = vbd * mult * (1 + scarcity) * dz.mult * injuryMult * (1 + adpUrgency) * dur.mult + handcuffBonus;
  return {
    vbd: Math.round(vbd), mult, scarcity, tierCount, score, starterNeeded, flexNeeded, flexEligible,
    dzNote: dz.note, goneBeforeNextPick, adpDelta: typeof p.adp === "number" && currentPickOverall != null ? Math.round((p.adp - currentPickOverall) * 10) / 10 : null,
    durabilityNote: dur.note, handcuffNote, isHandcuff: !!starterName,
  };
}

function reasoningFor(p, meta, round) {
  const bullets = [];
  bullets.push(`${meta.vbd > 0 ? "+" : ""}${meta.vbd} pts above replacement at ${p.pos} — the top value on the board right now.`);
  if (["K", "DST"].includes(p.pos)) {
    bullets.push(round < 12 ? "It's early to lock in a K/DST — this is only surfacing because the skill-position board is thin. Stream this position instead." : "Roster's set — a reasonable streaming option to lock down the position.");
  } else if (meta.starterNeeded > 0) {
    bullets.push(`You still need a starting ${p.pos} — this fills a real roster hole, not just bench depth.`);
  } else if (meta.flexEligible && meta.flexNeeded > 0) {
    bullets.push(`Your starting ${p.pos} slots are full, but this player fits your FLEX and upgrades your lineup.`);
  } else {
    bullets.push(`Starters are set at ${p.pos} — this is pure depth/upside for your bench.`);
  }
  if (meta.tierCount <= 3) bullets.push(`Only ${meta.tierCount} similarly-ranked ${p.pos}s left before the next tier drops — this is close to last call.`);
  else if (meta.tierCount <= 6) bullets.push(`${meta.tierCount} players remain in this ${p.pos} tier — value's still fine to wait one round, but the cliff is close.`);
  if (meta.goneBeforeNextPick) bullets.push(`Market ADP has him gone before your next turn — this isn't a "wait and see" pick.`);
  if (meta.dzNote) bullets.push(meta.dzNote);
  if (meta.durabilityNote) bullets.push(meta.durabilityNote);
  if (meta.handcuffNote) bullets.push(meta.handcuffNote);
  if (p.injury) bullets.push(`⚠ ${INJURY_LABEL[p.injury.status]}: ${p.injury.note}`);
  return bullets;
}

function picksUntilMyTurn(pickIndex, draftSlot) {
  for (let i = 1; i <= 30; i++) {
    const { team } = snakeTeam(pickIndex + i);
    if (team === draftSlot) return i - 1;
  }
  return null;
}

// The overall (1-indexed) pick number of your NEXT turn — used to compare
// against a player's ADP and flag "the market expects him gone before you
// pick again."
function nextMyPickOverall(pickIndex, draftSlot) {
  for (let i = 1; i <= 30; i++) {
    const { team } = snakeTeam(pickIndex + i);
    if (team === draftSlot) return pickIndex + i + 1; // +1 for 1-indexed display
  }
  return null;
}

function gradeFor(totalStarterVBD) {
  if (totalStarterVBD >= 700) return { letter: "A+", color: "#7CE38B" };
  if (totalStarterVBD >= 580) return { letter: "A", color: "#7CE38B" };
  if (totalStarterVBD >= 460) return { letter: "B+", color: "#A3E635" };
  if (totalStarterVBD >= 340) return { letter: "B", color: "#FFB020" };
  if (totalStarterVBD >= 220) return { letter: "C+", color: "#FFB020" };
  if (totalStarterVBD >= 100) return { letter: "C", color: "#FB923C" };
  return { letter: "D", color: "var(--danger)" };
}

function snakeTeam(pickIndex) {
  const round = Math.floor(pickIndex / TEAMS) + 1;
  const inRound = pickIndex % TEAMS;
  const team = round % 2 === 1 ? inRound + 1 : TEAMS - inRound;
  return { round, team };
}

const EMPTY_LINEUP = { QB: [], RB: [], WR: [], TE: [], FLEX: [], K: [], DST: [], BENCH: [], IR: [] };

export default function DraftCommand() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [pickIndex, setPickIndex] = useState(0);
  const [draftSlot, setDraftSlot] = useState(11);
  const [history, setHistory] = useState([]);
  const [posFilter, setPosFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [strategy, setStrategy] = useState("balanced");
  const [page, setPage] = useState("board");
  const [lineup, setLineup] = useState(EMPTY_LINEUP);
  const [clockSeconds, setClockSeconds] = useState(120);
  const [clockActive, setClockActive] = useState(true);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [injuryMeta, setInjuryMeta] = useState({ generatedAt: null, source: "built-in seed", count: 0 });
  const [adpMeta, setAdpMeta] = useState({ generatedAt: null, source: null, count: 0 });

  // Load any in-progress draft from localStorage on first mount (this is a
  // real deployed site now, so real browser storage — no artifact sandbox).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("draft-command-state");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.players && saved.players.length === INITIAL_PLAYERS.length) {
          setPlayers(saved.players.map((p, i) => ({ ...INITIAL_PLAYERS[i], drafted: p.drafted, owner: p.owner })));
        }
        if (saved.pickIndex != null) setPickIndex(saved.pickIndex);
        if (saved.draftSlot != null) setDraftSlot(saved.draftSlot);
        if (saved.history) setHistory(saved.history);
        if (saved.strategy) setStrategy(saved.strategy);
        if (saved.lineup) setLineup(saved.lineup);
      }
    } catch (e) {
      // no saved draft yet, or corrupted — start fresh
    }
    setLoadedFromStorage(true);
  }, []);

  // Pull the daily-refreshed injury board. This file is written by a GitHub
  // Action (see .github/workflows/update-injuries.yml) that runs on a cron
  // schedule, hits ESPN's public injury endpoints, and commits the result —
  // this is the actual automation; the built-in INJURIES map is just the
  // fallback if the fetch fails (e.g. viewing index.html locally).
  useEffect(() => {
    fetch("./data/injuries.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.players) return;
        setPlayers((prev) =>
          prev.map((p) => {
            const live = data.players[p.name];
            return live ? { ...p, injury: { status: live.status, note: live.note } } : { ...p, injury: null };
          })
        );
        setInjuryMeta({ generatedAt: data.generatedAt, source: "live (GitHub Action)", count: Object.keys(data.players).length });
      })
      .catch(() => {
        // fetch failed (offline, local file://, or first deploy hasn't run yet) — keep built-in seed
      });
  }, []);

  // Pull current team affiliation for every player from the daily-refreshed
  // roster check (data/teams.json). This is the actual fix for the "app
  // still thinks Joe Mixon is on Houston" class of problem — instead of
  // someone hand-editing a JSON file every time a trade or release happens,
  // this checks all 32 rosters daily and overrides the static team field
  // automatically. A player absent from every roster gets "FA".
  const [teamsMeta, setTeamsMeta] = useState({ generatedAt: null, movedCount: 0 });
  useEffect(() => {
    fetch("./data/teams.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.players) return;
        let moved = 0;
        setPlayers((prev) =>
          prev.map((p) => {
            const liveTeam = data.players[p.name];
            if (!liveTeam || liveTeam === p.team) return p;
            moved++;
            return { ...p, team: liveTeam };
          })
        );
        setTeamsMeta({ generatedAt: data.generatedAt, movedCount: moved });
      })
      .catch(() => {
        // no teams.json yet (first deploy hasn't run) — falls back to the
        // static team field baked into the RAW pool
      });
  }, []);

  // Pull real Average Draft Position from Fantasy Football Calculator's
  // public API (fetched server-side by the same daily Action, written to
  // data/adp.json). This is what powers the "gone before your next pick"
  // urgency flag — a signal VBD alone can't give you, since it only
  // describes value, not what the rest of the room is likely to do.
  useEffect(() => {
    fetch("./data/adp.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.players) return;
        setPlayers((prev) =>
          prev.map((p) => {
            const live = data.players[p.name];
            return live ? { ...p, adp: live.adp, bye: live.bye } : p;
          })
        );
        setAdpMeta({ generatedAt: data.generatedAt, source: data.source, count: Object.keys(data.players).length });
      })
      .catch(() => {
        // no ADP file yet (first deploy hasn't run) — app works fine without it,
        // just no urgency flag or ADP column until it shows up
      });
  }, []);

  // Persist draft progress after it loads, so a refresh or new tab picks up
  // right where you left off.
  useEffect(() => {
    if (!loadedFromStorage) return;
    const payload = {
      players: players.map((p) => ({ drafted: p.drafted, owner: p.owner })),
      pickIndex, draftSlot, history, strategy, lineup,
    };
    try { localStorage.setItem("draft-command-state", JSON.stringify(payload)); } catch (e) {}
    setSaveNote("saved");
    const t = setTimeout(() => setSaveNote(""), 1500);
    return () => clearTimeout(t);
  }, [players, pickIndex, draftSlot, history, strategy, lineup, loadedFromStorage]);

  const { round, team: teamOnClock } = snakeTeam(pickIndex);
  const isMyClock = teamOnClock === draftSlot;
  const gapToMyTurn = useMemo(() => picksUntilMyTurn(pickIndex, draftSlot), [pickIndex, draftSlot]);

  // draft clock: auto-resets to 2:00 whenever it becomes my turn
  useEffect(() => {
    if (isMyClock) { setClockSeconds(120); setClockActive(true); }
  }, [isMyClock, pickIndex]);
  useEffect(() => {
    if (!isMyClock || !clockActive) return;
    const t = setInterval(() => setClockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [isMyClock, clockActive]);

  const undrafted = useMemo(() => players.filter((p) => !p.drafted), [players]);
  const myRoster = useMemo(() => players.filter((p) => p.owner === "me"), [players]);
  const rbCountOnMyTeam = useMemo(() => myRoster.filter((p) => p.pos === "RB").length, [myRoster]);

  const bucketCounts = useMemo(() => {
    const out = {};
    Object.keys(lineup).forEach((k) => { out[k] = lineup[k].length; });
    return out;
  }, [lineup]);

  const undraftedByPos = useMemo(() => {
    const out = {};
    POS_LIST.forEach((pos) => {
      out[pos] = computeTiers(undrafted.filter((p) => p.pos === pos).sort((a, b) => b.pts - a.pts));
    });
    return out;
  }, [undrafted]);

  const myRosterNames = useMemo(() => new Set(myRoster.map((p) => p.name)), [myRoster]);

  const ranked = useMemo(() => {
    const nextPickOverall = nextMyPickOverall(pickIndex, draftSlot);
    const currentPickOverall = pickIndex + 1;
    const ctx = { bucketCounts, round, undraftedByPos, rbCountOnMyTeam, strategy, nextPickOverall, currentPickOverall, myRosterNames };
    return undrafted
      .map((p) => ({ player: p, meta: scoreCandidate(p, ctx) }))
      .sort((a, b) => b.meta.score - a.meta.score);
  }, [undrafted, bucketCounts, round, undraftedByPos, rbCountOnMyTeam, strategy, pickIndex, draftSlot, myRosterNames]);

  const topPick = ranked[0];
  const bestByPos = useMemo(() => {
    const out = {};
    POS_LIST.forEach((pos) => { out[pos] = undraftedByPos[pos]?.[0] || null; });
    return out;
  }, [undraftedByPos]);

  const filtered = useMemo(() => {
    let list = ranked;
    if (posFilter !== "ALL") list = list.filter((r) => r.player.pos === posFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => r.player.name.toLowerCase().includes(q) || r.player.team.toLowerCase().includes(q));
    }
    return list;
  }, [ranked, posFilter, query]);

  function placeInLineup(player) {
    setLineup((prev) => {
      const next = { ...prev, QB: [...prev.QB], RB: [...prev.RB], WR: [...prev.WR], TE: [...prev.TE], FLEX: [...prev.FLEX], K: [...prev.K], DST: [...prev.DST], BENCH: [...prev.BENCH], IR: [...prev.IR] };
      const flexEligible = ["RB", "WR", "TE"].includes(player.pos);
      if (next[player.pos].length < (CAPACITY[player.pos] || 0)) next[player.pos].push(player.id);
      else if (flexEligible && next.FLEX.length < CAPACITY.FLEX) next.FLEX.push(player.id);
      else next.BENCH.push(player.id);
      return next;
    });
  }

  function removeFromLineup(id) {
    setLineup((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = prev[k].filter((pid) => pid !== id); });
      return next;
    });
  }

  function moveToSlot(id, targetSlot) {
    setLineup((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => { next[k] = prev[k].filter((pid) => pid !== id); });
      next[targetSlot] = [...next[targetSlot], id];
      return next;
    });
  }

  function draftPlayer(id, mine) {
    const player = players.find((p) => p.id === id);
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, drafted: true, owner: mine ? "me" : "opp" } : p)));
    setHistory((h) => [...h, { id, mine }]);
    setPickIndex((i) => i + 1);
    if (mine && player) placeInLineup(player);
  }

  function undo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPlayers((prev) => prev.map((p) => (p.id === last.id ? { ...p, drafted: false, owner: null } : p)));
    setHistory((h) => h.slice(0, -1));
    setPickIndex((i) => Math.max(0, i - 1));
    if (last.mine) removeFromLineup(last.id);
  }

  function reset() {
    const hasProgress = history.length > 0;
    if (hasProgress) {
      const ok = window.confirm(
        `This will wipe your entire draft — ${history.length} pick${history.length === 1 ? "" : "s"} logged, ${myRoster.length} player${myRoster.length === 1 ? "" : "s"} on your roster. This can't be undone. Reset anyway?`
      );
      if (!ok) return;
    }
    setPlayers(INITIAL_PLAYERS.map((p) => ({ ...p })));
    setPickIndex(0);
    setHistory([]);
    setLineup(EMPTY_LINEUP);
    try { localStorage.removeItem("draft-command-state"); } catch (e) {}
  }

  // keyboard shortcut: press D to instantly draft the top recommendation to my team
  useEffect(() => {
    function onKey(e) {
      if ((e.key === "d" || e.key === "D") && topPick && page === "board" && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        draftPlayer(topPick.player.id, true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topPick, page]);

  const starterVBDTotal = useMemo(() => {
    let sum = 0;
    ["QB", "RB", "WR", "TE", "FLEX", "K", "DST"].forEach((slotKey) => {
      lineup[slotKey].forEach((id) => {
        const p = players.find((pl) => pl.id === id);
        if (p) sum += p.pts - BASELINES[p.pos];
      });
    });
    return Math.round(sum);
  }, [lineup, players]);
  const grade = gradeFor(starterVBDTotal);

  const scarcityRows = POS_LIST.map((pos) => {
    const total = RAW.filter((r) => r[0] === pos).length;
    const topN = Math.min(BASELINE_RANK[pos], total);
    const remaining = undraftedByPos[pos].filter((_, idx) => idx < topN).length;
    const remainingOfTop = RAW.filter((r) => r[0] === pos)
      .sort((a, b) => b[3] - a[3])
      .slice(0, topN)
      .filter((r) => {
        const match = players.find((p) => p.pos === r[0] && p.name === r[1]);
        return match && !match.drafted;
      }).length;
    return { pos, topN, remainingOfTop, pct: topN ? remainingOfTop / topN : 0 };
  });

  const lineupPlayers = useMemo(() => {
    const out = {};
    Object.keys(lineup).forEach((k) => {
      out[k] = lineup[k].map((id) => players.find((p) => p.id === id)).filter(Boolean);
    });
    return out;
  }, [lineup, players]);

  function slotOptionsFor(player) {
    const flexEligible = ["RB", "WR", "TE"].includes(player.pos);
    const opts = ["BENCH"];
    if (lineup[player.pos].length < CAPACITY[player.pos] || lineup[player.pos].includes(player.id)) opts.unshift(player.pos);
    if (flexEligible && (lineup.FLEX.length < CAPACITY.FLEX || lineup.FLEX.includes(player.id))) opts.splice(opts.length - 1, 0, "FLEX");
    const canIR = player.injury && ["D", "O"].includes(player.injury.status);
    if (canIR && (lineup.IR.length < CAPACITY.IR || lineup.IR.includes(player.id))) opts.push("IR");
    return opts;
  }

  function currentSlotFor(id) {
    return Object.keys(lineup).find((k) => lineup[k].includes(id)) || "BENCH";
  }

  const clockColor = clockSeconds > 60 ? "var(--turf-bright)" : clockSeconds > 20 ? "var(--amber)" : "var(--danger)";
  const clockMin = String(Math.floor(clockSeconds / 60)).padStart(2, "0");
  const clockSec = String(clockSeconds % 60).padStart(2, "0");

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100%", fontFamily: "'Inter',sans-serif" }} className="w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        :root{
          --bg:#0A100D; --surface:#121B17; --surface2:#182420; --border:#243830;
          --turf:#2FA84F; --turf-bright:#7CE38B; --amber:#FFB020;
          --danger:#FB7185; --violet:#C9A8FF;
          --text:#F2F5F1; --text-dim:#8FA79B;
          /* Radius scale — was ad hoc per component before, now tied to role. */
          --r-pill:6px; --r-control:8px; --r-card:12px; --r-hero:20px;
          /* Refined per Linear's real 6-step scale (design-md/linear.app) — xs for
             tiny status chips we didn't have a token for before, pill for true
             toggle/capsule shapes distinct from our badge radius. */
          --r-xs:4px; --r-pill-full:9999px;
        }
        /* Linear's real technique for dark-surface depth: no drop shadows (their
           own system explicitly avoids that on dark), instead a faint inset
           top-edge highlight on lifted panels — "pixel-rendered lift" without
           the weight of a shadow. Applied to top-level cards + hero. */
        .lift{ box-shadow: inset 0 1px 0 0 rgba(255,255,255,0.05); }
        /* Linear's Level-4 focus ring: 2px accent outline at 50% opacity,
           replacing the unstyled browser default across interactive elements. */
        button:focus-visible, select:focus-visible, input:focus-visible{
          outline: 2px solid rgba(124,227,139,0.5); outline-offset: 2px;
        }
        .mono{ font-family:'JetBrains Mono',monospace; }
        .display{ font-family:'Oswald',sans-serif; letter-spacing:0.02em; }
        .glow{ box-shadow: 0 0 0 1px rgba(124,227,139,0.25), 0 0 40px -12px rgba(124,227,139,0.35); }

        /* Four previously-identical pulses, now distinct per signal type so they
           don't visually blur into "the same alert" when several fire at once. */
        @keyframes pulseDot{ 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes pulseUrgent{ 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.55; transform:scale(1.06)} }
        @keyframes pulseGlow{ 0%,100%{box-shadow:0 0 0 0 rgba(251,113,133,0.5)} 50%{box-shadow:0 0 0 6px rgba(251,113,133,0)} }
        @keyframes shimmerBar{ 0%{opacity:0.55} 50%{opacity:1} 100%{opacity:0.55} }
        @keyframes heroEnter{ from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)} }

        .pulse{ animation: pulseDot 1.6s ease-in-out infinite; }          /* on-the-clock / live dot */
        .pulse-urgent{ animation: pulseUrgent 1s ease-in-out infinite; }   /* clock <20s */
        .pulse-glow{ animation: pulseGlow 1.4s ease-out infinite; }        /* gone-by-your-pick badge */
        .pulse-bar{ animation: shimmerBar 1.8s ease-in-out infinite; }     /* scarcity bar critical */
        .hero-enter{ animation: heroEnter 0.28s ease-out; }

        @media (prefers-reduced-motion: reduce){
          .pulse, .pulse-urgent, .pulse-glow, .pulse-bar, .hero-enter{ animation: none !important; }
        }

        ::-webkit-scrollbar{ width:8px; height:8px; }
        ::-webkit-scrollbar-thumb{ background:#26362F; border-radius:8px; }
        ::-webkit-scrollbar-track{ background:transparent; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={20} color="var(--turf-bright)" />
              <h1 className="display text-2xl sm:text-3xl font-bold tracking-wide" style={{ color: "var(--text)" }}>DRAFT COMMAND</h1>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>12-team PPR snake draft · value-based recommendation engine</p>
            <p className="text-xs mt-1 mono flex items-center gap-3" style={{ color: "var(--text-dim)" }}>
              <span><InjuryBadge injury={{ status: "Q", note: "" }} /> minor concern</span>
              <span><InjuryBadge injury={{ status: "D", note: "" }} /> trending bad</span>
              <span><InjuryBadge injury={{ status: "O", note: "" }} /> out for season</span>
              {saveNote && <span style={{ color: "var(--turf-bright)" }}>· draft progress saved</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs mono px-2" style={{ color: "var(--text-dim)" }}>MY SLOT</label>
            <select
              value={draftSlot}
              onChange={(e) => setDraftSlot(Number(e.target.value))}
              className="mono text-sm rounded-md px-2 py-1.5 border"
              style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {Array.from({ length: TEAMS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Pick {n}</option>
              ))}
            </select>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="mono text-sm rounded-md px-2 py-1.5 border"
              style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
              title="Tunes how hard the model prioritizes RB early — all four are established, research-backed doctrines."
            >
              <option value="balanced">Balanced (RB dead zone aware)</option>
              <option value="hero">Hero RB</option>
              <option value="zero">Zero RB</option>
              <option value="robust">Robust RB</option>
            </select>
            <button onClick={undo} disabled={history.length === 0}
              className="flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 border disabled:opacity-40"
              style={{ borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text)" }}>
              <Undo2 size={14} /> Undo
            </button>
            <button onClick={reset}
              className="flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5 border"
              style={{ borderColor: "var(--border)", background: "var(--surface2)", color: "var(--text)" }}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>

        <InjuryFreshnessBanner injuryMeta={injuryMeta} />

        {/* PAGE NAV */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setPage("board")}
            className="display text-sm font-semibold tracking-wide px-4 py-2 rounded-lg border"
            style={{
              background: page === "board" ? "var(--turf)" : "var(--surface)",
              color: page === "board" ? "#06120A" : "var(--text-dim)",
              borderColor: page === "board" ? "var(--turf)" : "var(--border)",
            }}>
            DRAFT BOARD
          </button>
          <button onClick={() => setPage("team")}
            className="display text-sm font-semibold tracking-wide px-4 py-2 rounded-lg border flex items-center gap-2"
            style={{
              background: page === "team" ? "var(--turf)" : "var(--surface)",
              color: page === "team" ? "#06120A" : "var(--text-dim)",
              borderColor: page === "team" ? "var(--turf)" : "var(--border)",
            }}>
            MY TEAM <span className="mono text-xs opacity-80">({myRoster.length})</span>
          </button>
        </div>

        {/* STATUS BAR */}
        <div className="rounded-xl border lift px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>ROUND</div>
              <div className="display text-xl font-semibold">{round}</div>
            </div>
            <div>
              <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>OVERALL PICK</div>
              <div className="display text-xl font-semibold">{pickIndex + 1}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isMyClock ? "pulse" : ""}`} style={{ background: isMyClock ? "var(--turf-bright)" : "var(--text-dim)" }} />
              <div>
                <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>ON THE CLOCK</div>
                <div className="display text-lg font-semibold" style={{ color: isMyClock ? "var(--turf-bright)" : "var(--text)" }}>
                  Team {teamOnClock}{isMyClock ? " — YOU" : ""}
                </div>
              </div>
            </div>
            {!isMyClock && gapToMyTurn !== null && (
              <div>
                <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>PICKS TIL YOUR TURN</div>
                <div className="display text-lg font-semibold">{gapToMyTurn}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isMyClock && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border" style={{ borderColor: clockColor, background: "var(--surface2)" }}>
                <span className={`mono text-2xl font-bold ${clockSeconds <= 20 ? "pulse-urgent" : ""}`} style={{ color: clockColor }}>{clockMin}:{clockSec}</span>
                <button onClick={() => setClockActive((a) => !a)} className="text-xs mono px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
                  {clockActive ? "pause" : "resume"}
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs mono" style={{ color: "var(--text-dim)" }}>
              <Radio size={13} /> Press <kbd className="px-1 rounded" style={{ background: "var(--surface2)" }}>D</kbd> to instant-draft the top rec
            </div>
          </div>
        </div>

        {page === "team" ? (
          <MyTeamPage
            lineupPlayers={lineupPlayers}
            myRoster={myRoster}
            slotOptionsFor={slotOptionsFor}
            currentSlotFor={currentSlotFor}
            moveToSlot={moveToSlot}
            grade={grade}
            starterVBDTotal={starterVBDTotal}
          />
        ) : (
        <>

        {/* SCARCITY SCOREBOARD */}
        <div className="rounded-xl border lift p-4 mb-6" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={15} color="var(--amber)" />
            <h2 className="display text-sm font-semibold tracking-wide" style={{ color: "var(--text)" }}>SCARCITY SCOREBOARD</h2>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>— top-tier players remaining by position</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {scarcityRows.map((r) => {
              const c = POS_COLOR[r.pos];
              const critical = r.pct <= 0.2;
              return (
                <div key={r.pos} className="rounded-lg px-3 py-2" style={{ background: "var(--surface2)", border: `1px solid var(--border)` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold mono" style={{ color: c.fg }}>{r.pos}</span>
                    <span className="text-xs mono" style={{ color: critical ? "var(--danger)" : "var(--text-dim)" }}>
                      {r.remainingOfTop}/{r.topN}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1E2B25" }}>
                    <div className={`h-full ${critical ? "pulse-bar" : ""}`} style={{ width: `${r.pct * 100}%`, background: critical ? "var(--danger)" : c.fg }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RECOMMENDATION HERO */}
        {topPick && (
          <div key={topPick.player.id} className="border p-5 sm:p-6 mb-6 glow hero-enter lift" style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)", borderColor: "rgba(124,227,139,0.3)", borderRadius: "var(--r-hero)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} color="var(--turf-bright)" />
              <span className="text-xs mono tracking-widest" style={{ color: "var(--turf-bright)" }}>BEST PICK AVAILABLE</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="display text-3xl sm:text-4xl font-bold">{topPick.player.name}</h3>
                  <span className="text-xs font-bold px-2 py-1 rounded mono" style={{ color: POS_COLOR[topPick.player.pos].fg, background: POS_COLOR[topPick.player.pos].bg }}>
                    {topPick.player.pos}
                  </span>
                  <span className="text-sm" style={{ color: topPick.player.team === "FA" ? "var(--danger)" : "var(--text-dim)", fontWeight: topPick.player.team === "FA" ? 700 : 400 }}>{topPick.player.team}</span>
                  <InjuryBadge injury={topPick.player.injury} />
                  {topPick.meta.goneBeforeNextPick && (
                    <span className="text-xs font-bold mono px-2 py-1 rounded pulse-glow" style={{ color: "var(--danger)", background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.4)" }}>
                      GONE BY YOUR NEXT PICK
                    </span>
                  )}
                  {DURABILITY[topPick.player.name] && (
                    <span className="text-xs font-bold mono px-2 py-1 rounded" style={{ color: "#FB923C", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.4)" }} title={DURABILITY[topPick.player.name].note}>
                      ⛑ {DURABILITY[topPick.player.name].missed} GM MISSED (3YR)
                    </span>
                  )}
                  {topPick.meta.isHandcuff && (
                    <span className="text-xs font-bold mono px-2 py-1 rounded" style={{ color: "var(--violet)", background: "rgba(201,168,255,0.12)", border: "1px solid rgba(201,168,255,0.4)" }}>
                      HANDCUFF: {HANDCUFFS[topPick.player.name]}
                    </span>
                  )}
                </div>
                <div className="flex gap-6 mt-3 mono text-sm flex-wrap">
                  <div><span style={{ color: "var(--text-dim)" }}>Proj Pts </span><span className="font-bold">{topPick.player.pts}</span></div>
                  {typeof topPick.player.adp === "number" && (
                    <div><span style={{ color: "var(--text-dim)" }}>ADP </span><span className="font-bold">{topPick.player.adp.toFixed(1)}</span></div>
                  )}
                  <div><span style={{ color: "var(--text-dim)" }}>VBD </span><span className="font-bold" style={{ color: "var(--amber)" }}>+{topPick.meta.vbd}</span></div>
                  <div><span style={{ color: "var(--text-dim)" }}>Score </span><span className="font-bold" style={{ color: "var(--turf-bright)" }}>{Math.round(topPick.meta.score)}</span></div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {reasoningFor(topPick.player, topPick.meta, round).map((b, i) => (
                    <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text)" }}>
                      <span style={{ color: "var(--turf-bright)" }}>—</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2 lg:w-48">
                <button onClick={() => draftPlayer(topPick.player.id, true)}
                  className="w-full rounded-lg py-2.5 font-semibold text-sm display tracking-wide"
                  style={{ background: "var(--turf)", color: "#06120A" }}>
                  DRAFT TO MY TEAM
                </button>
                <button onClick={() => draftPlayer(topPick.player.id, false)}
                  className="w-full rounded-lg py-2 text-sm border"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
                  Someone else took him
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BEST BY POSITION */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {POS_LIST.map((pos) => {
            const p = bestByPos[pos];
            const c = POS_COLOR[pos];
            return (
              <div key={pos} className="rounded-lg border p-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="text-xs font-bold mono mb-1" style={{ color: c.fg }}>TOP {pos}</div>
                {p ? (
                  <>
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">{p.name}{p.injury && <InjuryBadge injury={p.injury} />}</div>
                    <div className="text-xs mono mt-0.5" style={{ color: "var(--text-dim)" }}>{p.pts} pts · {p.team}</div>
                  </>
                ) : <div className="text-xs" style={{ color: "var(--text-dim)" }}>none left</div>}
              </div>
            );
          })}
        </div>

        {/* MAIN GRID: TABLE + ROSTER */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* AVAILABLE PLAYERS */}
          <div className="rounded-xl border lift" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="p-4 border-b flex flex-wrap items-center gap-3" style={{ borderColor: "var(--border)" }}>
              <h2 className="display text-sm font-semibold tracking-wide">AVAILABLE PLAYERS</h2>
              <div className="flex items-center gap-1 flex-wrap">
                {["ALL", ...POS_LIST].map((pos) => (
                  <button key={pos} onClick={() => setPosFilter(pos)}
                    className="text-xs px-2.5 py-1 rounded-full mono font-medium"
                    style={{
                      background: posFilter === pos ? (pos === "ALL" ? "var(--turf)" : POS_COLOR[pos].bg) : "var(--surface2)",
                      color: posFilter === pos ? (pos === "ALL" ? "#06120A" : POS_COLOR[pos].fg) : "var(--text-dim)",
                    }}>
                    {pos}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 ml-auto rounded-md px-2 py-1 border" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                <Search size={13} color="var(--text-dim)" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player or team"
                  className="bg-transparent outline-none text-xs w-40" style={{ color: "var(--text)" }} />
              </div>
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
                  <tr className="text-left" style={{ color: "var(--text-dim)" }}>
                    <th className="px-4 py-2 font-medium text-xs mono">#</th>
                    <th className="px-2 py-2 font-medium text-xs mono">PLAYER</th>
                    <th className="px-2 py-2 font-medium text-xs mono">POS</th>
                    <th className="px-2 py-2 font-medium text-xs mono text-right">PTS</th>
                    <th className="px-2 py-2 font-medium text-xs mono text-right">ADP</th>
                    <th className="px-2 py-2 font-medium text-xs mono text-right">VBD</th>
                    <th className="px-2 py-2 font-medium text-xs mono text-right">SCORE</th>
                    <th className="px-4 py-2 font-medium text-xs mono text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 80).map((r, i) => {
                    const c = POS_COLOR[r.player.pos];
                    const isTop = topPick && r.player.id === topPick.player.id;
                    return (
                      <tr key={r.player.id} className="border-t" style={{ borderColor: "var(--border)", background: isTop ? "rgba(124,227,139,0.06)" : "transparent" }}>
                        <td className="px-4 py-2 mono text-xs" style={{ color: "var(--text-dim)" }}>{i + 1}</td>
                        <td className="px-2 py-2 font-medium">
                          <div className="flex items-center gap-1.5">
                            {r.player.name}<span className="text-xs" style={{ color: r.player.team === "FA" ? "var(--danger)" : "var(--text-dim)", fontWeight: r.player.team === "FA" ? 700 : 400 }}>{r.player.team}</span>
                            <InjuryBadge injury={r.player.injury} />
                            {r.meta.goneBeforeNextPick && (
                              <span className="text-xs font-bold mono px-1.5 py-0.5 rounded" style={{ color: "var(--danger)", background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.4)" }} title="Market ADP has him gone before your next turn">
                                GONE BY YOUR PICK
                              </span>
                            )}
                            {DURABILITY[r.player.name] && (
                              <span className="text-xs font-bold mono px-1.5 py-0.5 rounded" style={{ color: "#FB923C", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.4)" }} title={DURABILITY[r.player.name].note}>
                                ⛑ {DURABILITY[r.player.name].missed}gm/3yr
                              </span>
                            )}
                            {r.meta.isHandcuff && (
                              <span className="text-xs font-bold mono px-1.5 py-0.5 rounded" style={{ color: "var(--violet)", background: "rgba(201,168,255,0.12)", border: "1px solid rgba(201,168,255,0.4)" }} title={r.meta.handcuffNote || `Handcuff to ${HANDCUFFS[r.player.name]}`}>
                                HC: {HANDCUFFS[r.player.name]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2"><span className="text-xs font-bold px-1.5 py-0.5 rounded mono" style={{ color: c.fg, background: c.bg }}>{r.player.pos}</span></td>
                        <td className="px-2 py-2 text-right mono">{r.player.pts}</td>
                        <td className="px-2 py-2 text-right mono" style={{ color: "var(--text-dim)" }}>{typeof r.player.adp === "number" ? r.player.adp.toFixed(1) : "—"}</td>
                        <td className="px-2 py-2 text-right mono" style={{ color: "var(--amber)" }}>{r.meta.vbd > 0 ? "+" : ""}{r.meta.vbd}</td>
                        <td className="px-2 py-2 text-right mono font-semibold" style={{ color: "var(--turf-bright)" }}>{Math.round(r.meta.score)}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => draftPlayer(r.player.id, true)}
                              className="text-xs px-2 py-1 rounded font-medium" style={{ background: "var(--turf)", color: "#06120A" }}>Me</button>
                            <button onClick={() => draftPlayer(r.player.id, false)}
                              className="text-xs px-2 py-1 rounded font-medium border" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>Opp</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-6 text-center text-sm" style={{ color: "var(--text-dim)" }}>No players match.</div>
              )}
            </div>
          </div>

          {/* MY ROSTER — quick view, full editing lives on the My Team page */}
          <div className="rounded-xl border lift p-4 h-fit" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={15} color="var(--turf-bright)" />
                <h2 className="display text-sm font-semibold tracking-wide">MY ROSTER</h2>
              </div>
              <span className="display text-lg font-bold" style={{ color: grade.color }}>{grade.letter}</span>
            </div>
            <div className="space-y-1.5">
              {["QB", "RB", "WR", "TE", "FLEX", "K", "DST"].flatMap((slotKey) =>
                Array.from({ length: CAPACITY[slotKey] }, (_, i) => {
                  const p = lineupPlayers[slotKey][i];
                  const c = p ? POS_COLOR[p.pos] : null;
                  return (
                    <div key={`${slotKey}-${i}`} className="flex items-center justify-between rounded-md px-2.5 py-1.5" style={{ background: "var(--surface2)" }}>
                      <span className="text-xs font-bold mono w-11" style={{ color: "var(--text-dim)" }}>{slotKey}</span>
                      {p ? <span className="text-sm flex-1 truncate ml-2">{p.name}</span> : <span className="text-sm flex-1 ml-2" style={{ color: "var(--text-dim)" }}>open</span>}
                      {p && <span className="text-xs font-bold mono px-1.5 py-0.5 rounded" style={{ color: c.fg, background: c.bg }}>{p.pos}</span>}
                    </div>
                  );
                })
              )}
              {lineupPlayers.BENCH.length > 0 && (
                <div className="text-xs mono pt-2" style={{ color: "var(--text-dim)" }}>+ {lineupPlayers.BENCH.length} on bench</div>
              )}
            </div>
            <button onClick={() => setPage("team")} className="mt-3 w-full text-xs mono rounded-md py-2 border" style={{ borderColor: "var(--border)", color: "var(--turf-bright)" }}>
              Manage lineup →
            </button>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   MY TEAM PAGE — dedicated view for building your final lineup.
   Every drafted player auto-slots on pickup; use the dropdown on
   any card to move them between starting slots, FLEX, and bench.
---------------------------------------------------------------- */
function MyTeamPage({ lineupPlayers, myRoster, slotOptionsFor, currentSlotFor, moveToSlot, grade, starterVBDTotal }) {
  const starterSlots = ["QB", "RB", "WR", "TE", "FLEX", "K", "DST"];

  // Bye-week clash detection — only among actual STARTERS, since a bench
  // clash doesn't cost you a week (that's what the bench is for). Group
  // starters by bye week; any week with 2+ starters is a real problem.
  const byeClashes = useMemo(() => {
    const byWeek = {};
    starterSlots.forEach((slotKey) => {
      lineupPlayers[slotKey].forEach((p) => {
        if (typeof p.bye !== "number") return;
        if (!byWeek[p.bye]) byWeek[p.bye] = [];
        byWeek[p.bye].push(p);
      });
    });
    return Object.entries(byWeek)
      .filter(([, players]) => players.length >= 2)
      .map(([week, players]) => ({ week: Number(week), players }))
      .sort((a, b) => a.week - b.week);
  }, [lineupPlayers]);

  function Card({ p, slotKey }) {
    const c = POS_COLOR[p.pos];
    const vbd = Math.round(p.pts - BASELINES[p.pos]);
    return (
      <div className="rounded-lg border p-3 flex items-center justify-between gap-3" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate flex items-center gap-1.5">{p.name}<InjuryBadge injury={p.injury} /></div>
          <div className="text-xs mono mt-0.5" style={{ color: "var(--text-dim)" }}>
            {p.team} · {p.pts} pts · {typeof p.bye === "number" && <>Bye {p.bye} · </>}<span style={{ color: "var(--amber)" }}>{vbd > 0 ? "+" : ""}{vbd} VBD</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold mono px-1.5 py-0.5 rounded" style={{ color: c.fg, background: c.bg }}>{p.pos}</span>
          <select
            value={currentSlotFor(p.id)}
            onChange={(e) => moveToSlot(p.id, e.target.value)}
            className="mono text-xs rounded px-1.5 py-1 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            {slotOptionsFor(p).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border lift p-5 mb-6 flex flex-wrap items-center justify-between gap-4" style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)", borderColor: "var(--border)" }}>
        <div>
          <div className="text-xs mono tracking-widest" style={{ color: "var(--text-dim)" }}>PROJECTED TEAM GRADE</div>
          <div className="display text-5xl font-bold mt-1" style={{ color: grade.color }}>{grade.letter}</div>
        </div>
        <div className="text-sm max-w-md" style={{ color: "var(--text-dim)" }}>
          Based on total value-above-replacement across your <strong style={{ color: "var(--text)" }}>starting lineup</strong> (QB, 2×RB, 2×WR, TE, FLEX, K, DST). Bench depth isn't counted toward the grade — use the slot dropdown on any card to move players between bench and your starters.
        </div>
        <div className="text-right">
          <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>STARTER VBD</div>
          <div className="mono text-2xl font-bold">{starterVBDTotal}</div>
        </div>
      </div>

      {byeClashes.length > 0 && (
        <div className="rounded-xl border lift p-4 mb-6" style={{ background: "rgba(251,146,60,0.08)", borderColor: "rgba(251,146,60,0.4)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: "#FB923C" }}>⚠ Bye week clash{byeClashes.length > 1 ? "es" : ""} in your starting lineup</span>
          </div>
          {byeClashes.map((clash) => (
            <div key={clash.week} className="text-xs mono mt-1" style={{ color: "var(--text-dim)" }}>
              Week {clash.week}: {clash.players.map((p) => p.name).join(", ")} are all out the same week — you'll need bench depth or a waiver pickup to cover.
            </div>
          ))}
        </div>
      )}

      {myRoster.length === 0 ? (
        <div className="rounded-xl border lift p-10 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>No players drafted yet. Head to the Draft Board and start picking — everyone you draft to your team shows up here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border lift p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="display text-sm font-semibold tracking-wide mb-3">STARTING LINEUP</h2>
            <div className="space-y-2">
              {starterSlots.flatMap((slotKey) =>
                Array.from({ length: CAPACITY[slotKey] }, (_, i) => {
                  const p = lineupPlayers[slotKey][i];
                  return (
                    <div key={`${slotKey}-${i}`} className="flex items-center gap-2">
                      <span className="text-xs font-bold mono w-11 shrink-0" style={{ color: "var(--text-dim)" }}>{slotKey}</span>
                      {p ? <div className="flex-1"><Card p={p} slotKey={slotKey} /></div> : (
                        <div className="flex-1 rounded-lg border border-dashed p-3 text-xs mono" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>open slot</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="rounded-xl border lift p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="display text-sm font-semibold tracking-wide mb-3">BENCH ({lineupPlayers.BENCH.length}/7)</h2>
            <div className="space-y-2">
              {lineupPlayers.BENCH.length === 0 ? (
                <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>Nothing benched.</div>
              ) : (
                lineupPlayers.BENCH.map((p) => <Card key={p.id} p={p} slotKey="BENCH" />)
              )}
            </div>
            <h2 className="display text-sm font-semibold tracking-wide mb-3 mt-5">INJURED RESERVE ({lineupPlayers.IR.length}/1)</h2>
            <div className="space-y-2">
              {lineupPlayers.IR.length === 0 ? (
                <div className="text-xs mono" style={{ color: "var(--text-dim)" }}>Empty — only players flagged D or OUT can move here, freeing a bench spot.</div>
              ) : (
                lineupPlayers.IR.map((p) => <Card key={p.id} p={p} slotKey="IR" />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
