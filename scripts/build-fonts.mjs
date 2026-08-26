// Copies the exact font files this app uses out of the @fontsource npm
// packages into dist/fonts/, and writes dist/fonts.css with @font-face
// rules pointing at those local files - replacing the Google Fonts CDN
// @import that used to live in app.jsx's <style> block.
//
// Why this matters: loading fonts directly from fonts.googleapis.com means
// every visitor's browser makes a direct request to Google, which
// necessarily includes their IP address. This exact pattern (Google Fonts
// CDN, not self-hosted) was the basis for real GDPR fines in Germany in
// 2022. Self-hosting removes that third-party data flow entirely - no
// visitor's browser talks to anything but this site anymore, for fonts.
//
// Run manually:   node scripts/build-fonts.mjs
// Run on a cron:  see .github/workflows/deploy.yml

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_FONTS_DIR = path.join(ROOT, "dist", "fonts");
const OUT_CSS_PATH = path.join(ROOT, "dist", "fonts.css");

// Exact weights actually used in app.jsx's className styles - matches the
// font-face declarations that were in the Google Fonts @import URL.
const FONTS = [
  { family: "Oswald", pkg: "@fontsource/oswald", weight: 500 },
  { family: "Oswald", pkg: "@fontsource/oswald", weight: 600 },
  { family: "Oswald", pkg: "@fontsource/oswald", weight: 700 },
  { family: "Inter", pkg: "@fontsource/inter", weight: 400 },
  { family: "Inter", pkg: "@fontsource/inter", weight: 500 },
  { family: "Inter", pkg: "@fontsource/inter", weight: 600 },
  { family: "JetBrains Mono", pkg: "@fontsource/jetbrains-mono", weight: 500 },
  { family: "JetBrains Mono", pkg: "@fontsource/jetbrains-mono", weight: 700 },
];

async function main() {
  await mkdir(OUT_FONTS_DIR, { recursive: true });
  const cssRules = [];

  for (const f of FONTS) {
    const slug = f.family.toLowerCase().replace(/\s+/g, "-");
    const filename = `${slug}-latin-${f.weight}-normal.woff2`;
    const srcPath = path.join(ROOT, "node_modules", f.pkg, "files", filename);
    const destPath = path.join(OUT_FONTS_DIR, filename);
    await copyFile(srcPath, destPath);
    cssRules.push(
      `@font-face { font-family: '${f.family}'; font-style: normal; font-weight: ${f.weight}; font-display: swap; src: url('./fonts/${filename}') format('woff2'); }`
    );
  }

  await writeFile(OUT_CSS_PATH, cssRules.join("\n") + "\n");
  console.log(`Copied ${FONTS.length} font files to ${OUT_FONTS_DIR} and wrote ${OUT_CSS_PATH}`);
}

main().catch((err) => {
  console.error("build-fonts failed:", err);
  process.exit(1); // unlike the data-refresh scripts, a missing font is a
  // real build problem worth failing loudly on, not something to silently skip
});
