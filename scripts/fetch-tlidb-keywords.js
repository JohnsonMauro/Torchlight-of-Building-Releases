// Writes packages/engine/data/game/keywords.generated.js: the game's keywords (Spell Burst, Tangle, Blur…), the words the game
// underlines in item, talent and skill text, with the definition it shows on hover. Source: TLIDB (tlidb.com/en/).
//   node scripts/fetch-tlidb-keywords.js          fetch every page it needs (about 70 requests, one a second)
//   node scripts/fetch-tlidb-keywords.js <dir>    same, keeping the pages in <dir> and reusing the ones already there
//
// TLIDB's glossary (/en/Hyperlink) lists ~1600 names, many of them named effects the game never links in running text
// ("Mana": "20% of damage is taken from Mana"). So the keywords are the ones the game actually links: TLIDB's list pages
// (LIST_PAGES) keep the game's marks in every text, <e id=<hyperlink id> class="Hyperlink" data-hover="<card>"
// href="<page>">form as written</e>. Each mark gives a keyword (its id), the page it belongs to and a form the text uses
// ("Frostbitten", "Tangle(s)", "nearby"). The definition is the glossary's when the page has one; a page with several
// (Frostbite, Judgment, Lock…) takes each id's own hover card.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://tlidb.com";
const OUTPUT = new URL("../packages/engine/data/game/keywords.generated.js", import.meta.url);
const LIST_PAGES = [
  "Legendary_Gear",
  "Craft",
  "Corrosion",
  "Graft",
  "Talent",
  "Divinity_Slate",
  "Nether_Kings_Divinity",
  "Ethereal_Prism",
  "Special_Prism",
  "Active_Skill",
  "Support_Skill",
  "Passive_Skill",
  "Activation_Medium_Skill",
  "Magnificent_Support_Skill",
  "Noble_Support_Skill",
  "Hero_Memories",
  "Pactspirit",
  "Destiny",
  "Tartarus_Skill",
  "Origin_Tartarus_Skill",
];
// Forms the game links in one sentence but that are plain words everywhere else ("each enemy" links Enemy Count,
// "Resistance" links Max Resistance, "Shadow" links Phantom): matched by name they would underline most lines.
const PLAIN_FORMS = new Set([
  "bonuses",
  "charge",
  "Cold Resistance",
  "Copies",
  "copy",
  "Discipline",
  "distant",
  "each",
  "each enemy",
  "effective",
  "enemies",
  "enemy",
  "Energy Shield",
  "Epic",
  "every enemy",
  "excess",
  "Fire Resistance",
  "Lightning Resistance",
  "Origin",
  "prepare",
  "Progress",
  "Rare",
  "Resistance",
  "Shadow",
  "Shadows",
  "transferred",
]);

const ROW = /<tr><td><a href="([^"]*)">([^<]*)<\/a><\/td><td>(.*?)<\/td><\/tr>/gs;
const MARK = /<e id=(\d+) class="Hyperlink" data-hover="([^"]*)" href="([^"]*)">([^<]*)<\/e>/g;
const DECLARED_ROWS = /class="card-header">Hyperlink \/(\d+) </;
const CARD = /<h5 class="card-title" data-id="(\d+)">.*?<div class="card-text">(.*?)<\/div>/s;

// Game text as TLIDB writes it → plain text with "\n" line breaks.
function plainText(markup) {
  const text = markup
    .replaceAll(MARK, "$4")
    .replaceAll(/\s*<br\/>\s*/g, "\n")
    .trim();
  if (/[<>&]/.test(text)) throw new Error(`Unparsed markup in a definition: ${text.slice(0, 120)}`);
  return text;
}

/** The glossary page → Map page → { name, definitions: [distinct texts in page order] }; empty rows left out. */
export function parseGlossary(html) {
  const rows = [...html.matchAll(ROW)];
  const declared = Number(html.match(DECLARED_ROWS)?.[1]);
  if (rows.length === 0 || rows.length !== declared) {
    throw new Error(`Expected ${declared} glossary rows, parsed ${rows.length}: the page layout changed`);
  }
  const glossary = new Map();
  for (const [, page, name, cell] of rows) {
    const text = plainText(cell);
    if (!name.trim() || !text) continue;
    const entry = glossary.get(page) ?? { name, definitions: [] };
    if (!entry.definitions.includes(text)) entry.definitions.push(text);
    glossary.set(page, entry);
  }
  return glossary;
}

/** Every keyword mark in a page: { id, hover, page, form }. */
export function parseMarks(html) {
  return [...html.matchAll(MARK)].map(([, id, hover, page, form]) => ({
    id: Number(id),
    hover,
    page,
    form: form.trim(),
  }));
}

/** A keyword's hover card → { id, text }. */
export function parseHoverCard(html) {
  const match = html.match(CARD);
  if (!match) throw new Error("No hover card in the page: the layout changed");
  return { id: Number(match[1]), text: plainText(match[2]) };
}

/**
 * Marks + glossary + the hover cards of ids whose page has several definitions →
 * { keywords: { id: { name, page, definition } }, forms: { form: id } }. A form marked with several ids takes the one
 * the texts use most (then the lowest id); PLAIN_FORMS are left out, and with them a keyword no other form names.
 */
export function buildKeywords({ glossary, marks, hoverTexts }) {
  const formCounts = new Map();
  for (const mark of marks) {
    if (!mark.form || PLAIN_FORMS.has(mark.form)) continue;
    if (/[<>&]/.test(mark.form)) throw new Error(`Unparsed markup in a keyword form: ${mark.form}`);
    const counts = formCounts.get(mark.form) ?? new Map();
    counts.set(mark.id, (counts.get(mark.id) ?? 0) + 1);
    formCounts.set(mark.form, counts);
  }
  const pageOf = new Map(marks.map((mark) => [mark.id, mark.page]));
  const forms = {};
  for (const [form, counts] of [...formCounts].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    forms[form] = [...counts].sort(([idA, a], [idB, b]) => b - a || idA - idB)[0][0];
  }
  const keywords = {};
  for (const id of [...new Set(Object.values(forms))].sort((a, b) => a - b)) {
    const page = pageOf.get(id);
    const entry = glossary.get(page);
    if (!entry) throw new Error(`Keyword ${id} links ${page}, which the glossary does not list`);
    const definition = entry.definitions.length === 1 ? entry.definitions[0] : hoverTexts.get(id);
    if (!definition) throw new Error(`Keyword ${id} (${entry.name}) has several definitions and no hover card`);
    keywords[id] = { name: entry.name, page, definition };
  }
  return { keywords, forms };
}

function dataFile({ keywords, forms }, fetched) {
  const lines = (object) =>
    Object.entries(object).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  return [
    "// GENERATED FILE - do not edit by hand.",
    `// Source: TLIDB (${SITE}/en/), fetched ${fetched}: the glossary /en/Hyperlink, the hover cards of keywords with`,
    `//   several definitions, and the keyword marks in the game texts of these list pages: ${LIST_PAGES.join(", ")}.`,
    "// Regenerate: node scripts/fetch-tlidb-keywords.js [page cache dir]",
    '// GAME_KEYWORDS[the game\'s hyperlink id] = { name, page: tlidb.com/en/<page>, definition: its hover text, "\\n" = line break }.',
    "// GAME_KEYWORD_FORMS[a form as the game's text writes it, case kept] = its keyword's id (\"Frostbitten\": 735).",
    `export const GAME_KEYWORDS_SOURCE = ${JSON.stringify({ site: SITE, pages: LIST_PAGES, fetched })};`,
    "export const GAME_KEYWORDS = {",
    ...lines(keywords),
    "};",
    "export const GAME_KEYWORD_FORMS = {",
    ...lines(forms),
    "};",
    "",
  ].join("\n");
}

// A TLIDB page, from the cache when it holds it; a fetch waits a second first.
async function page(path, cacheFile) {
  if (cacheFile) {
    const cached = await readFile(cacheFile, "utf8").catch(() => null);
    if (cached !== null) return cached;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const response = await fetch(`${SITE}${path}`, {
    headers: { "User-Agent": "Torchlight-of-Building keyword glossary" },
  });
  if (!response.ok) throw new Error(`${SITE}${path}: HTTP ${response.status}`);
  const html = await response.text();
  if (cacheFile) await writeFile(cacheFile, html);
  return html;
}

async function main([cacheDir]) {
  if (cacheDir) await mkdir(join(cacheDir, "hover"), { recursive: true });
  const cached = (name) => (cacheDir ? join(cacheDir, name) : null);
  const glossary = parseGlossary(await page("/en/Hyperlink", cached("Hyperlink.html")));
  const marks = [];
  for (const name of LIST_PAGES) marks.push(...parseMarks(await page(`/en/${name}`, cached(`${name}.html`))));
  const severalDefinitions = marks.filter((mark) => glossary.get(mark.page)?.definitions.length > 1);
  const hoverTexts = new Map();
  for (const mark of new Map(severalDefinitions.map((mark) => [mark.id, mark])).values()) {
    const card = parseHoverCard(await page(mark.hover, cached(`hover/${mark.id}.html`)));
    if (card.id !== mark.id) throw new Error(`Hover card ${mark.hover} is keyword ${card.id}, expected ${mark.id}`);
    hoverTexts.set(mark.id, card.text);
  }
  const result = buildKeywords({ glossary, marks, hoverTexts });
  await writeFile(OUTPUT, dataFile(result, new Date().toISOString().slice(0, 10)));
  const counts = `${Object.keys(result.keywords).length} keywords, ${Object.keys(result.forms).length} forms`;
  console.log(`${counts} from ${marks.length} marks → ${fileURLToPath(OUTPUT)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
