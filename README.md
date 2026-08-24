# Draft Command

A 12-team PPR fantasy football snake draft assistant with a value-based
recommendation engine, a live draft clock, and an injury board that
refreshes itself once a day via GitHub Actions.

## What actually automates and what doesn't

- **Automated (real, runs whether you're online or not):** a GitHub Action
  fires daily, hits ESPN's public injury endpoints, matches results against
  your player pool, and redeploys the site with the refreshed data.
- **Not automated, by design:** the underlying player point projections and
  the ~190-player pool itself. Those live in `app.jsx` (the `RAW` array) and
  only change when you edit them. Re-projecting fantasy points daily isn't
  really a thing anyone needs — injury *status* is the part that moves fast
  during camp/preseason, so that's what's wired up.
- **Fair warning:** ESPN doesn't publish or support this API — it's the same
  JSON their own website quietly loads in the background. It's free, no key
  needed, and it works today, but it can change or start rate-limiting
  without notice. `scripts/update-injuries.mjs` is written to fail soft: if a
  run breaks, it just skips updating rather than wiping your data.

## One-time setup

1. **Create a new GitHub repo** (public or private — Pages works with both on
   a free personal account as of now, but private repo Pages requires GitHub
   Pro/Team/Enterprise. If you're not sure, make it public).

2. **Push this folder to it:**
   ```bash
   cd draft-command-repo
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

3. **Enable GitHub Pages via Actions:**
   Repo → Settings → Pages → under "Build and deployment", set **Source** to
   **GitHub Actions**. (Not "Deploy from a branch" — the workflow handles
   deployment itself.)

4. **Confirm Actions has permission to deploy:**
   Repo → Settings → Actions → General → Workflow permissions → make sure
   **Read and write permissions** is selected. (The workflow only needs
   `pages: write` and `id-token: write`, which it requests itself, but this
   setting needs to not be locked to read-only.)

5. **Trigger the first run:**
   Repo → Actions tab → "Update injuries and deploy" → **Run workflow**
   (this is the `workflow_dispatch` trigger — no need to wait for the cron).
   After it finishes (green check, usually 1-2 minutes), your site is live at
   `https://<your-username>.github.io/<your-repo>/`.

From that point on, it redeploys automatically:
- Every day at **12:00 UTC** (~7-8am Eastern depending on daylight saving) —
  change the cron line in `.github/workflows/deploy.yml` if you want a
  different time. Cron time is always UTC.
- Every time you push a change to `main`.
- Any time you manually click "Run workflow."

## Editing the player pool / projections

Open `app.jsx`, find the `RAW` array near the top, and edit points/players
directly — same format as before: `["POS","Name","TEAM",points]`. Commit and
push; the next Action run (or your next push) rebuilds and redeploys.

If you add or rename a player, also re-run this once locally so
`data/players.json` (used for injury name-matching) stays in sync:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('app.jsx','utf8');
const body = src.match(/const RAW = \[([\s\S]*?)\n\];/)[1];
const re = /\[\"([A-Z]+)\",\"([^\"]+)\",\"([A-Z]+)\",(\d+)\]/g;
let m, list = [];
while ((m = re.exec(body))) list.push({ pos: m[1], name: m[2], team: m[3] });
fs.writeFileSync('data/players.json', JSON.stringify(list, null, 2));
console.log(list.length, 'players');
"
```

## Local development

```bash
npm install
npm run update-injuries   # optional — hits ESPN, writes data/injuries.json
npm run build              # compiles app.jsx -> dist/app.js
python3 -m http.server 8080   # then open http://localhost:8080
```

`npm run dev-build` is the same as `build` but unminified, for readable stack
traces while debugging.

## File map

```
index.html                        — page shell, loads React/ReactDOM from CDN + Tailwind CDN
app.jsx                           — the whole app (edit this)
package.json                      — build script (esbuild)
data/players.json                 — name/pos/team list, used only for injury name-matching
data/injuries.json                — generated file, overwritten daily (seeded with a known-good snapshot)
scripts/update-injuries.mjs       — the ESPN fetch + match + write script
.github/workflows/deploy.yml      — cron schedule + build + deploy to Pages
```

## Known limitations

- Point projections are static estimates, not live projections — see
  "Editing the player pool" above if you want to update them for news beyond
  injuries (depth chart changes, trades, etc.).
- Draft progress saves to your browser's local storage, per-browser/device —
  it won't sync between your phone and laptop mid-draft.
- The injury status mapping is a judgment call (ESPN's raw codes get folded
  into just Q/D/O) — for anything draft-critical, the note text and ESPN's
  own site are the source of truth, not just the badge.
