// Writes packages/engine/data/talents/prism-affixes-tlidb.generated.js: every Ethereal Prism affix TLIDB lists, by the game's modifier
// id, for "Import from game". The upstream id map (packages/engine/data/game-id-map-ss14.generated.js) lacks the lower prism tiers'
// ids (1214…, 1224…) a dropped prism logs, so the importer reads them here. Source: TLIDB (tlidb.com/en/Ethereal_Prism).
//   node scripts/fetch-tlidb-prism-affixes.js          fetch the page (one request)
//   node scripts/fetch-tlidb-prism-affixes.js <dir>    same, keeping the page in <dir> and reusing it when there
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://tlidb.com";
const PAGE = "Ethereal_Prism";
const OUTPUT = new URL("../packages/engine/data/talents/prism-affixes-tlidb.generated.js", import.meta.url);

const ROW = /<tr><td><span data-modifier-id="(\d+)">(.*?)<\/td><td>([^<]*)<\/td><td>(.*?)<\/td><\/tr>/gs;
const DECLARED_ROWS = /class="card-header">Ethereal Prism Affix \/(\d+) </;

// Game text as TLIDB writes it → plain text with "\n" line breaks.
function plainText(markup) {
  const text = markup
    .replaceAll(/\s*<br\/>\s*/g, "\n")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll(/[ \t]+/g, " ")
    .trim();
  if (/[<>&]/.test(text)) throw new Error(`Unparsed markup in a prism affix: ${text.slice(0, 120)}`);
  return text;
}

/** The Ethereal Prism page → { [modifier id]: ["prism", text, kind] } (the id map's entry shape; kind "Random Affix"…). */
export function parsePrismAffixes(html) {
  const rows = [...html.matchAll(ROW)];
  const declared = Number(html.match(DECLARED_ROWS)?.[1]);
  if (rows.length === 0 || rows.length !== declared) {
    throw new Error(`Expected ${declared} prism affix rows, parsed ${rows.length}: the page layout changed`);
  }
  const affixes = {};
  for (const [, id, text, item, kind] of rows) {
    if (item !== "Ethereal Prism") throw new Error(`Prism affix ${id} belongs to "${item}"`);
    affixes[id] = ["prism", plainText(text), plainText(kind)];
  }
  return Object.fromEntries(Object.entries(affixes).sort(([a], [b]) => a.localeCompare(b)));
}

function dataFile(affixes, fetched) {
  return [
    "// GENERATED FILE - do not edit by hand.",
    `// Source: TLIDB (${SITE}/en/${PAGE}), fetched ${fetched}: the Ethereal Prism Affix table.`,
    "// Regenerate: node scripts/fetch-tlidb-prism-affixes.js [page cache dir]",
    '// TLIDB_PRISM_AFFIXES[the game\'s modifier id] = ["prism", text ("\\n" = line break), TLIDB kind].',
    `export const TLIDB_PRISM_AFFIXES_SOURCE = ${JSON.stringify({ site: SITE, page: PAGE, fetched })};`,
    "export const TLIDB_PRISM_AFFIXES = {",
    ...Object.entries(affixes).map(([id, entry]) => `  ${JSON.stringify(id)}: ${JSON.stringify(entry)},`),
    "};",
    "",
  ].join("\n");
}

async function page(cacheFile) {
  if (cacheFile) {
    const cached = await readFile(cacheFile, "utf8").catch(() => null);
    if (cached !== null) return cached;
  }
  const response = await fetch(`${SITE}/en/${PAGE}`, {
    headers: { "User-Agent": "Torchlight-of-Building prism affixes" },
  });
  if (!response.ok) throw new Error(`${SITE}/en/${PAGE}: HTTP ${response.status}`);
  const html = await response.text();
  if (cacheFile) await writeFile(cacheFile, html);
  return html;
}

async function main([cacheDir]) {
  if (cacheDir) await mkdir(cacheDir, { recursive: true });
  const affixes = parsePrismAffixes(await page(cacheDir ? join(cacheDir, `${PAGE}.html`) : null));
  await writeFile(OUTPUT, dataFile(affixes, new Date().toISOString().slice(0, 10)));
  console.log(`${Object.keys(affixes).length} prism affixes → ${fileURLToPath(OUTPUT)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
