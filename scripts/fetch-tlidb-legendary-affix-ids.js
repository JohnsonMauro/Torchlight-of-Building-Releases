// Writes packages/engine/data/gear/legendary-affix-ids.generated.js: the game's affix id of every legendary line, as the
// current season's TLIDB item pages print them (<span data-modifier-id="51341311"><span class="tier tier1"></span>…</span>),
// for the game-log import. The game id map (game-id-map.generated.js, upstream's tool) was built from older pages: it
// lacks the lines of items the season added or rewrote (On the Sublime, 2026-10-23) and keeps older texts for others.
//   node scripts/fetch-tlidb-legendary-affix-ids.js          fetch every legendary's page (about 340 requests, one a second)
//   node scripts/fetch-tlidb-legendary-affix-ids.js <dir>    same, keeping the pages in <dir> and reusing the ones already there
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { legendaryGear } from "../packages/engine/data/gear/legendary-gear.generated.js";

const SITE = "https://tlidb.com";
const OUTPUT = new URL("../packages/engine/data/gear/legendary-affix-ids.generated.js", import.meta.url);
const ENTITIES = { ndash: "–", amp: "&", quot: '"', lt: "<", gt: ">", nbsp: " ", "#39": "'" };
const decode = (text) => text.replace(/&(ndash|amp|quot|lt|gt|nbsp|#39);/g, (_, name) => ENTITIES[name]);

/**
 * The legendary lines of one item page, [{ id, tier, text }]: every span with a data-modifier-id that holds a tier mark
 * (tier0 = corroded, tier1 / tier2 = the drop tiers); the item's base and implicit lines carry none. "\n" = line break.
 */
export function parseLegendaryAffixes(html) {
  const lines = [];
  const opening = /<span data-modifier-id="(\d+)">/g;
  for (let match; (match = opening.exec(html));) {
    const tag = /<(\/?)span\b[^>]*>/g;
    tag.lastIndex = opening.lastIndex;
    let depth = 1,
      close;
    while (depth && (close = tag.exec(html))) depth += close[1] ? -1 : 1;
    if (!close) throw new Error(`Unclosed modifier span ${match[1]}`);
    const inner = html.slice(opening.lastIndex, close.index);
    const tier = inner.match(/class="tier tier(\d)"/)?.[1];
    if (tier === undefined) continue;
    const text = decode(inner.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, ""))
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
    lines.push({ id: match[1], tier: Number(tier), text });
  }
  return lines;
}

async function page(path, cacheFile) {
  if (cacheFile) {
    const cached = await readFile(cacheFile, "utf8").catch(() => null);
    if (cached) return cached;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const response = await fetch(`${SITE}${path}`, {
    headers: { "User-Agent": "Torchlight-of-Building legendary affix ids" },
  });
  if (!response.ok) throw new Error(`${SITE}${path}: HTTP ${response.status}`);
  const html = await response.text();
  if (cacheFile) await writeFile(cacheFile, html);
  return html;
}

function dataFile(texts, fetched) {
  return [
    "// GENERATED FILE - do not edit by hand.",
    `// Source: TLIDB (${SITE}/en/<item>), fetched ${fetched}: every legendary item page of the catalog`,
    "//   (legendary-gear.generated.js ids). Regenerate: node scripts/fetch-tlidb-legendary-affix-ids.js [page cache dir]",
    '// LEGENDARY_AFFIX_TEXTS[the game\'s affix id] = [kind, template]: "legendary" (drop tiers 1 and 2) or',
    '//   "legendary-corroded" (tier 0), the line as the page prints it, "\\n" = line break (the game id map\'s shape).',
    `export const LEGENDARY_AFFIX_TEXTS_SOURCE = ${JSON.stringify({ site: SITE, items: legendaryGear.length, fetched })};`,
    "export const LEGENDARY_AFFIX_TEXTS = {",
    ...Object.entries(texts).map(([id, entry]) => `  ${JSON.stringify(id)}: ${JSON.stringify(entry)},`),
    "};",
    "",
  ].join("\n");
}

async function main([cacheDir]) {
  if (cacheDir) await mkdir(cacheDir, { recursive: true });
  const texts = {};
  for (const item of legendaryGear) {
    const html = await page(`/en/${item.id}`, cacheDir ? join(cacheDir, `${item.id}.html`) : null);
    for (const line of parseLegendaryAffixes(html)) {
      const entry = [line.tier === 0 ? "legendary-corroded" : "legendary", line.text];
      if (texts[line.id] && texts[line.id][1] !== line.text)
        throw new Error(`Affix ${line.id} reads "${texts[line.id][1]}" and "${line.text}"`);
      texts[line.id] = entry;
    }
  }
  const sorted = Object.fromEntries(Object.entries(texts).sort(([a], [b]) => Number(a) - Number(b)));
  await writeFile(OUTPUT, dataFile(sorted, new Date().toISOString().slice(0, 10)));
  console.log(
    `${Object.keys(sorted).length} legendary affix ids from ${legendaryGear.length} pages → ${fileURLToPath(OUTPUT)}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
