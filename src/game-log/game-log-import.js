// "Import from game log": read the logged-in character's build from Torchlight Infinite's UE_game.log.
//
// At every login the client prints the server's GetPlayerData reply as a tree ("+key+key [value]" lines, "|" columns
// continue the parent path). This module finds those dumps, keeps only the build sections (everything else in the
// log, including account ids, tokens and names, is never read into the result), merges several dumps of the same
// character to fill the client printer's 30-entry cuts, and resolves the game ids into a planner state.
// Unresolved items are skipped and listed in the report, never guessed. Browser-safe: no Node APIs.
// Design and evidence: research/game-log-import-2026-10-12.md.
import {
  activationMediumAffixLines,
  activationMediumGameAffixes,
  activationMediumGameLine,
  activationMediumGameRolls,
  allHeroTraits,
  allProfessionTalentCatalogue,
  baseAffixTiers,
  beltBlends,
  canPlaceSlate,
  lockedSlateCells,
  CLOCKWORK_CORE,
  craftAffixes,
  craftedSlateShape,
  defaultPlannerState,
  equipmentSlots,
  etherealPrismBases,
  folkloreRingOptions,
  heroCatalog,
  heroMemoryAffixes,
  heroTraitTree,
  importGameIdMap,
  isActivationMedium,
  isValidPedigreeAffix,
  kismetCatalog,
  kismetRollControls,
  legendaryCorrodedModifiers,
  legendaryGear,
  legendaryLowerTierTemplates,
  legendarySlateShapes,
  legendaryAffixText,
  legendaryTierTextForAffixId,
  memoryAffixTiers,
  memoryRevivalAffixIds,
  memoryScaledBaseStat,
  netherKingFixedAffixes,
  netherKingUltimateAffixes,
  normalizePlannerState,
  normalizeRevivedAffix,
  observedGameAffixIds,
  orderedPactspiritNodes,
  pactspiritCatalog,
  pactspiritTrees,
  placeholderPool,
  prismAffixes,
  progressionSupportHasStars,
  progressionSupportTierData,
  rareBaseByGameId,
  rareBaseByName,
  slateOffsets,
  slateTransformRules,
  specialSupportTierData,
  TLIDB_PRISM_AFFIXES,
  tlidbSkillCatalog,
  tlidbSupportCatalog,
  towerSequenceTexts,
  towerSequences,
  TRAIT_SLOT_GRANTS,
  traitGroupOf,
  treeMaxCapacity,
  treeRules,
  validatePlannerState,
  voraxCrafting,
} from "#engine";
import {
  DEFAULT_GAME_DIRECTION,
  craftedSlateGod,
  craftedSlateShapeForId,
  gameDirectionTurn,
  plannerGodKey,
} from "./slate-shape-ids.js";

export const GAME_LOG_FOLDER_HINT = "<Torchlight Infinite>\\UE_game\\TorchLight\\Saved\\Logs";
// User answer 2026-10-12, "probably": a pactspirit's planner level is its star level + 1.
export const PACTSPIRIT_LEVEL_RULE = "Pactspirit level = star level + 1 (provisional)";

let idMapPromise = null;
/** Loads the generated game id map (about 0.9 MB) on first use. */
export function loadGameIdMap() {
  idMapPromise ||= importGameIdMap();
  return idMapPromise;
}

// ---------------------------------------------------------------- log scan

const STAMP = /^\[(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2}):(\d{3})\]/;
const stampIso = (line) => {
  const m = STAMP.exec(line || "");
  if (!m) return null;
  const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const CHANGE_EVENT =
  /ItemChange@ ProtoName=(PutOn|PutOff|UnequipSkill|EquipSkill|TalentBlockEquip|TalentBlockUnequip|TalentBlockUnEquip)\b.*\bstart\b/;

/** Turns the printer's tree lines into nested objects. Every value is a string. */
export function parseTree(lines) {
  const root = {};
  let stack = [];
  for (const raw of lines) {
    const first = raw.indexOf("+");
    if (first < 0) continue;
    stack = stack.filter((entry) => entry.column < first);
    let parent = stack.length ? stack[stack.length - 1].node : root;
    const rest = raw.slice(first);
    const valueStart = rest.indexOf(" [");
    const pathPart = valueStart >= 0 ? rest.slice(0, valueStart) : rest.trimEnd();
    const value = valueStart >= 0 ? rest.slice(valueStart + 2).replace(/\]$/, "") : undefined;
    const segments = pathPart.split("+").slice(1);
    let column = first;
    segments.forEach((key, index) => {
      if (index === segments.length - 1 && value !== undefined) parent[key] = value;
      else {
        if (typeof parent[key] !== "object" || parent[key] === null) parent[key] = {};
        parent = parent[key];
        stack.push({ column, node: parent });
      }
      column += key.length + 1;
    });
  }
  return root;
}

// Only these sections and fields are kept from a dump; everything else (account ids, names, purchases, friends,
// rewards, map state) is dropped on read.
const KEPT_SECTIONS = {
  player: ["HeroPurchaseId", "HeroId", "Level", "GeniusCareerIdStr"],
  bag: ["wearItems", "dressSkillItems", "dressingTalentBlocks"],
  geniusInfos: null,
  skillLayout: null,
  skills: null,
  talentBlockInfluence: null,
  SkillSlot: ["costSlot"],
  ContractInfosV2: ["ContractDatas", "pointDatas", "unlockInfo"],
  ServantInfos: ["servantData"],
  heroCharacterv3OverView: ["pointOverView", "reminiscenceOverView", "treeActivatedNodes"],
};
const UUID_VALUE = /^(\d+)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A section the printer replaced whole ("+bag+..." when the dump has 31 table-valued sections): nothing of it was logged.
const isWholeCut = (value) =>
  Boolean(value && typeof value === "object" && Object.keys(value).length === 1 && "..." in value);

function sanitizeTree(tree, tokens) {
  const token = (value) => {
    const m = UUID_VALUE.exec(value);
    if (!m) return value;
    if (!tokens.has(value)) tokens.set(value, `${m[1]}_item${tokens.size + 1}`);
    return tokens.get(value);
  };
  const walk = (node) => {
    if (typeof node === "string") return token(node);
    if (!node || typeof node !== "object") return node;
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [token(key), walk(value)]));
  };
  const out = {};
  for (const [section, fields] of Object.entries(KEPT_SECTIONS)) {
    const value = tree[section];
    if (!value || typeof value !== "object" || isWholeCut(value)) continue;
    out[section] = walk(
      fields
        ? Object.fromEntries(fields.filter((field) => field in value).map((field) => [field, value[field]]))
        : value,
    );
  }
  return out;
}

const isCut = (table) =>
  Boolean(
    table &&
    typeof table === "object" &&
    Object.values(table).some((entry) => entry && typeof entry === "object" && "..." in entry),
  );
const entries = (table) =>
  Object.entries(table || {})
    .filter(([, value]) => !(value && typeof value === "object" && "..." in value))
    .map(([, value]) => value);

/**
 * Finds every GetPlayerData dump in a log. Returns only sanitised build data, timestamps and counts; the raw log
 * text is not kept. Account ids are used in memory to group dumps by character and are not returned. Each dump carries
 * `accountGroup`, a small number per login account (from `accountGroups`, a Map the caller may share across files), and
 * `character`, a small number per character (from `characterGroups`, shareable the same way). Item ids become
 * `<base>_item<n>` tokens from `tokens` (a Map the caller may share across files so one item keeps one token).
 */
export function scanGameLog(
  text,
  { accountGroups = new Map(), characterGroups = new Map(), tokens = new Map(), partialTail = false } = {},
) {
  let source = String(text || "");
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  // NUL runs (a preallocated or padded live log) end the line they cut; a dump cut by one ends there.
  if (source.includes("\0")) source = source.replace(/\0+/g, "\n");
  const lines = source.split(/\r?\n/);
  // A log the game may still be writing (`partialTail`): its last line can be partial, and a dump with no line after
  // it may be cut mid-write, so both are left out (counted in `incompleteDumps`). A dump whose header is written but
  // whose tree has not started yet, or whose header is the partial last line, counts as incomplete too.
  const DUMP_HEADER = "----Socket RecvMessage STT----GetPlayerData----";
  const tail = partialTail ? lines.pop() : "";
  const dumps = [],
    changes = [],
    attributeSnapshots = [];
  let incompleteDumps = tail?.includes(DUMP_HEADER) ? 1 : 0,
    skippedDumps = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes(DUMP_HEADER)) {
      const stamp = stampIso(line);
      let start = index + 1;
      while (start < lines.length && start <= index + 4 && !/^[+|]/.test(lines[start])) start += 1;
      let end = start;
      while (end < lines.length && /^[+|]/.test(lines[end])) end += 1;
      // Still being written: the tree runs to the end, or the header is there and its tree has not started yet.
      const pending = end > start ? end >= lines.length : start >= lines.length && start <= index + 4;
      if (partialTail && pending) incompleteDumps += 1;
      else if (end > start)
        try {
          const raw = parseTree(lines.slice(start, end));
          const account = typeof raw.player?.PlayerId === "string" ? raw.player.PlayerId : null;
          // The login account (shared by its characters) becomes a small opaque number; the id itself is not kept.
          const user = typeof raw.player?.UserId === "string" ? raw.player.UserId : null;
          if (user && !accountGroups.has(user)) accountGroups.set(user, accountGroups.size + 1);
          const wornIds = entries(raw.bag?.wearItems)
            .map((entry) => entry.Item?.Id)
            .filter(Boolean);
          const cutSections = Object.keys(KEPT_SECTIONS).filter((section) => isWholeCut(raw[section]));
          // Past about 30 top-level tables the printer leaves the rest out entirely, key included (no "..." marker).
          const droppedSections = Object.keys(KEPT_SECTIONS).filter((section) => !(section in raw));
          dumps.push({
            stamp,
            account,
            accountGroup: user ? accountGroups.get(user) : null,
            wornIds,
            topLevelCut: "..." in raw,
            cutSections,
            droppedSections,
            tree: sanitizeTree(raw, tokens),
          });
        } catch {
          skippedDumps += 1;
        }
      index = Math.max(index, end - 1);
      continue;
    }
    if (line.includes("ItemChange@ ProtoName=")) {
      const m = CHANGE_EVENT.exec(line);
      if (m) changes.push({ stamp: stampIso(line), kind: m[1] });
      continue;
    }
    if (line.includes("RoleAttrMgr@Attri.Id")) {
      const stamp = stampIso(line);
      if (stamp && attributeSnapshots.at(-1) !== stamp) attributeSnapshots.push(stamp);
    }
  }
  // Group by character: the account id when the dump has it, else shared worn gear with an identified dump.
  const groups = characterGroups;
  const number = (key) => {
    if (!groups.has(key)) groups.set(key, groups.size + 1);
    return groups.get(key);
  };
  for (const dump of dumps) if (dump.account) dump.character = number(dump.account);
  for (const dump of dumps) {
    if (!dump.account)
      dump.character =
        dumps.find((other) => other.account && other.wornIds.some((id) => dump.wornIds.includes(id)))?.character ??
        number({});
  }
  const result = dumps.map((dump, index) => ({
    id: `dump-${index + 1}`,
    stamp: dump.stamp,
    character: dump.character,
    accountGroup: dump.accountGroup,
    topLevelCut: dump.topLevelCut,
    cutSections: dump.cutSections,
    droppedSections: dump.droppedSections,
    tree: dump.tree,
  }));
  // Change events carry no character; those before the next login (any character) belong to this dump's session.
  for (const dump of result) {
    const later =
      result
        .filter((other) => other.stamp > dump.stamp)
        .map((other) => other.stamp)
        .sort()[0] || null;
    dump.changesAfter = changes.filter(
      (change) => change.stamp > dump.stamp && (!later || change.stamp < later),
    ).length;
    dump.attributeSnapshotAfter = attributeSnapshots.some((stamp) => stamp > dump.stamp && (!later || stamp < later));
  }
  return { dumps: result, changeEvents: changes.length, incompleteDumps, skippedDumps };
}

// ---------------------------------------------------------------- reading a chosen file (browser) and decoding

/** Above this size only the end of a chosen log is read (a JavaScript string cannot hold much more). */
export const GAME_LOG_READ_LIMIT_BYTES = 256 * 1024 * 1024;

/** "utf-16le" / "utf-16be" (BOM, or NUL bytes on one side of most byte pairs), else "utf-8". */
export function detectGameLogEncoding(bytes) {
  const head = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (head[0] === 0xff && head[1] === 0xfe) return "utf-16le";
  if (head[0] === 0xfe && head[1] === 0xff) return "utf-16be";
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) return "utf-8";
  const pairs = Math.floor(Math.min(head.length, 4096) / 2);
  let evenZero = 0,
    oddZero = 0;
  for (let i = 0; i < pairs; i += 1) {
    if (head[2 * i] === 0) evenZero += 1;
    if (head[2 * i + 1] === 0) oddZero += 1;
  }
  if (pairs >= 8 && oddZero > pairs * 0.4 && evenZero < pairs * 0.05) return "utf-16le";
  if (pairs >= 8 && evenZero > pairs * 0.4 && oddZero < pairs * 0.05) return "utf-16be";
  return "utf-8";
}

/** Bytes to text without throwing: BOM dropped, invalid bytes replaced, NUL runs left for scanGameLog to split on. */
export function decodeGameLogBytes(bytes, encoding = detectGameLogEncoding(bytes)) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const whole = encoding.startsWith("utf-16") && view.length % 2 ? view.subarray(0, view.length - 1) : view;
  return new TextDecoder(encoding, { fatal: false }).decode(whole);
}

// Game-log markers (Unreal Engine log): the "Log file open, <date>" first line, "[YYYY.MM.DD-HH.MM.SS:mmm][frame]"
// stamped lines, and "<Category>: <Verbosity>:" lines from the engine (LogInit, LogTemp, LogConfig…) or the game
// (TLShipping, TLGame, TLNetGame…). The user's own logs (2026-10-19) open with "Log file open," and unstamped
// "LogTemp: Display:" lines; stamped lines follow. A file with none of these is not a game log.
const LOG_OPEN = /^\uFEFF?Log file open,/;
const LOG_LINE = /^\[\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}\.\d{2}:\d{3}\]/m;
const LOG_CATEGORY_LINE =
  /^(?:\[[^\]\n]*\]\[\s*\d+\])?(?:Log[A-Z]\w*|TL[A-Z]\w*): (?:Display|Warning|Error|Log|Verbose|VeryVerbose|Fatal):/m;
const MARKER_WINDOW = 1 << 20;
/** DOMException names a browser raises when it refuses to read a chosen file (Chrome: NotReadableError once the file changed after it was picked). */
export const GAME_LOG_READ_ERRORS = ["NotReadableError", "NotFoundError", "SecurityError", "AbortError"];

/** True when the text carries Unreal Engine log markers (checked on its first megabyte) or a player-data dump. */
export function hasGameLogMarkers(text) {
  const source = String(text || "");
  const head = source.length > MARKER_WINDOW ? source.slice(0, MARKER_WINDOW) : source;
  return (
    LOG_OPEN.test(head) ||
    LOG_LINE.test(head) ||
    LOG_CATEGORY_LINE.test(head) ||
    source.includes("STT----GetPlayerData----")
  );
}

/** "empty" (nothing, or only NUL padding / whitespace), "binary" (mostly control or undecodable characters) or "text". */
function textKind(text) {
  const head = String(text || "").slice(0, 65536);
  if (!head.replace(/[\0\s\uFEFF]+/g, "")) return "empty";
  let odd = 0;
  for (let i = 0; i < head.length; i += 1) {
    const code = head.charCodeAt(i);
    if (code === 0xfffd || (code < 32 && code !== 9 && code !== 10 && code !== 13)) odd += 1;
  }
  return odd > head.length * 0.1 ? "binary" : "text";
}

const errorName = (error) => (error && typeof error.name === "string" && error.name ? error.name : "Error");

/**
 * Reads a chosen log file in this browser (nothing is uploaded or kept) and scans it. Never throws. Returns
 * { status, scan, partial, incompleteDumps, details }. Status:
 * - "unreadable": reading the file's bytes failed (details.errorName: the DOMException name, e.g. NotReadableError when
 *   Chrome refuses a file changed after it was chosen, as UE_game.log is while the game runs; NotFoundError,
 *   SecurityError, AbortError). Only the read itself gives this status; decoding and scanning problems never do.
 * - "ok": at least one complete player-data dump (an incomplete newest one is left out and counted in incompleteDumps).
 * - "writing": no complete dump, and one is still being written at the end of the log.
 * - "no-login": a game log (UE log markers) with no player-data dump.
 * - "unknown-format": no game-log markers (details.kind: "empty", "binary" or "text").
 * A file past `maxBytes` is read from its end (`partial`). The live log's trailing partial line and a dump with nothing
 * after it are skipped (scanGameLog `partialTail`). `details` holds counts and error names only, never file contents.
 */
export async function readGameLogFile(file, { maxBytes = GAME_LOG_READ_LIMIT_BYTES, ...scanOptions } = {}) {
  const size = Number(file?.size) || 0,
    partial = size > maxBytes;
  const result = (status, scan, details) => ({
    status,
    scan,
    partial,
    incompleteDumps: scan?.incompleteDumps || 0,
    details: { size, partial, ...details },
  });
  let head, body;
  try {
    head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
    let start = partial ? size - maxBytes : 0;
    if (detectGameLogEncoding(head).startsWith("utf-16") && start % 2) start += 1;
    body = new Uint8Array(await file.slice(start, size).arrayBuffer());
  } catch (error) {
    const name = errorName(error);
    return result("unreadable", null, { errorName: name, browserRefused: GAME_LOG_READ_ERRORS.includes(name) });
  }
  let text;
  try {
    text = decodeGameLogBytes(body, detectGameLogEncoding(head));
    if (partial) text = text.slice(text.indexOf("\n") + 1);
  } catch (error) {
    return result("unknown-format", null, {
      gameLog: false,
      kind: "binary",
      decodeError: errorName(error),
      logins: 0,
      incompleteDumps: 0,
      skippedDumps: 0,
    });
  }
  body = null;
  const markers = hasGameLogMarkers(text),
    kind = textKind(text);
  let scan = null,
    scanError = null;
  try {
    scan = scanGameLog(text, { ...scanOptions, partialTail: true });
  } catch (error) {
    scanError = errorName(error);
  }
  text = null;
  const gameLog = markers || Boolean(scan?.dumps.length || scan?.incompleteDumps);
  const counts = {
    gameLog,
    kind,
    logins: scan?.dumps.length || 0,
    incompleteDumps: scan?.incompleteDumps || 0,
    skippedDumps: scan?.skippedDumps || 0,
    ...(scanError ? { scanError } : {}),
  };
  const status = scan?.dumps.length
    ? "ok"
    : scan?.incompleteDumps
      ? "writing"
      : gameLog
        ? "no-login"
        : "unknown-format";
  return result(status, scan, counts);
}

/** One row per dump for the picker: hero, level, time and section completeness. No account data. */
export function listSnapshots(scan, idMap) {
  return scan.dumps.map((dump) => {
    const tree = dump.tree,
      player = tree.player || {};
    const purchase = idMap?.heroPurchases?.[player.HeroPurchaseId];
    const expected = new Set(Object.values(tree.SkillSlot?.costSlot || {}).map(String));
    const found = new Set([
      ...entries(tree.bag?.dressSkillItems).map((entry) => String(entry.Index)),
      ...entries(tree.skillLayout?.slots).map((entry) => String(entry.key)),
    ]);
    const cuts = [
      ["skills", isCut(tree.bag?.dressSkillItems) || isCut(tree.skillLayout?.slots)],
      ["pact points", isCut(tree.ContractInfosV2?.pointDatas)],
      ["pactspirit levels", isCut(tree.ServantInfos?.servantData)],
    ]
      .filter(([, cut]) => cut)
      .map(([name]) => name);
    const sections = Object.keys(KEPT_SECTIONS).filter((section) => !tree[section]);
    return {
      id: dump.id,
      stamp: dump.stamp,
      character: dump.character,
      hero: purchase ? purchase[0] : player.HeroPurchaseId ? `Hero ${player.HeroPurchaseId}` : "Unknown hero",
      level: player.Level ? Number(player.Level) : null,
      gear: entries(tree.bag?.wearItems).length,
      trees: entries(tree.geniusInfos?.info).length,
      skills: { found: [...expected].filter((slot) => found.has(slot)).length, expected: expected.size },
      cuts,
      missingSections: sections,
      cutSections: dump.cutSections || [],
      droppedSections: dump.droppedSections || [],
      topLevelCut: dump.topLevelCut,
      changesAfter: dump.changesAfter,
      attributeSnapshotAfter: dump.attributeSnapshotAfter,
    };
  });
}

// ---------------------------------------------------------------- merge

const sectionPaths = {
  player: ["player"],
  gear: ["bag", "wearItems"],
  talents: ["geniusInfos"],
  slates: ["bag", "dressingTalentBlocks"],
  slateInfluence: ["talentBlockInfluence"],
  pacts: ["ContractInfosV2"],
  hero: ["heroCharacterv3OverView"],
};
const getPath = (tree, path) => path.reduce((node, key) => node?.[key], tree);
const timeLabel = (stamp) => (stamp ? stamp.replace("T", " ").slice(0, 19) + " UTC" : "unknown time");

/**
 * Fills sections and cut entries missing from the chosen dump with other dumps of the same character: the chosen dump
 * wins wherever it has data; older dumps fill first (newest of them first), then newer ones (closest first). `scan.dumps`
 * may hold dumps from several log files (src/app/game-log-import-view.js combines them), all with one character numbering.
 */
export function mergeDumps(scan, dumpId) {
  const chosen = scan.dumps.find((dump) => dump.id === dumpId);
  if (!chosen) throw new Error("Unknown snapshot");
  const same = scan.dumps.filter((dump) => dump !== chosen && dump.character === chosen.character);
  const others = [
    ...same.filter((dump) => !(dump.stamp > chosen.stamp)).sort((a, b) => (a.stamp < b.stamp ? 1 : -1)),
    ...same.filter((dump) => dump.stamp > chosen.stamp).sort((a, b) => (a.stamp < b.stamp ? -1 : 1)),
  ];
  const tree = structuredClone(chosen.tree);
  const merges = [];
  for (const [section, path] of Object.entries(sectionPaths)) {
    if (getPath(tree, path)) continue;
    const donor = others.find((dump) => getPath(dump.tree, path));
    if (!donor) continue;
    let node = tree;
    for (const key of path.slice(0, -1)) node = node[key] ||= {};
    node[path.at(-1)] = structuredClone(getPath(donor.tree, path));
    merges.push({
      section,
      from: donor.stamp,
      detail: `${section} missing from the chosen dump; taken from the ${timeLabel(donor.stamp)} dump`,
    });
  }
  // Pactspirit star levels: the owned-spirit list is cut at 30; fill spirits it lacks, first from this character's other
  // dumps, then from the same account's other characters (the list looks account-wide: in the user's nine 2026-10-09..13
  // dumps, all 40 spirits listed for both characters had the same star level), including dumps from other log files
  // (`scan.servantDonors`, attached by src/game-log/game-log-local.js), newest first.
  const accountDonors =
    chosen.accountGroup == null
      ? []
      : [
          ...scan.dumps.filter(
            (dump) =>
              dump !== chosen && dump.character !== chosen.character && dump.accountGroup === chosen.accountGroup,
          ),
          ...(scan.servantDonors || []).filter((dump) => dump.accountGroup === chosen.accountGroup),
        ].sort((a, b) => (a.stamp < b.stamp ? 1 : -1));
  const servantDonors = [
    ...others.map((dump) => ({ dump, fromAccount: false })),
    ...accountDonors.map((dump) => ({ dump, fromAccount: true })),
  ];
  if (tree.ServantInfos || servantDonors.some(({ dump }) => dump.tree.ServantInfos)) {
    tree.ServantInfos ||= { servantData: {} };
    const known = new Set(
      entries(tree.ServantInfos.servantData)
        .filter((entry) => entry.starLevel != null)
        .map((entry) => entry.servantId),
    );
    let key = 1000;
    for (const { dump: donor, fromAccount } of servantDonors)
      for (const entry of entries(donor.tree.ServantInfos?.servantData)) {
        if (known.has(entry.servantId) || entry.starLevel == null) continue;
        known.add(entry.servantId);
        tree.ServantInfos.servantData[`m${key++}`] = { ...entry, mergedFrom: donor.stamp, fromAccount };
      }
  }
  return { tree, merges, chosen, others };
}

// Skill slots: layout (slot -> item token), equipped skill items and the skill inventory, each cut at 30 entries.
function collectSkillSlots(tree, others) {
  const fromTree = (source) => {
    const items = new Map(),
      slots = new Map();
    for (const entry of entries(source.skills?.skills)) if (entry?.Id) items.set(entry.Id, entry);
    for (const entry of entries(source.bag?.dressSkillItems))
      if (entry?.Item?.Id) {
        items.set(entry.Item.Id, entry.Item);
        slots.set(String(entry.Index), entry.Item.Id);
      }
    for (const entry of entries(source.skillLayout?.slots))
      if (entry?.value?.skillId) slots.set(String(entry.key), entry.value.skillId);
    return { items, slots };
  };
  const own = fromTree(tree);
  const donors = others.map((dump) => ({ stamp: dump.stamp, ...fromTree(dump.tree) }));
  const expected = [...new Set(Object.values(tree.SkillSlot?.costSlot || {}).map(String))];
  for (const slot of own.slots.keys()) if (!expected.includes(slot)) expected.push(slot);
  const cut = isCut(tree.bag?.dressSkillItems) || isCut(tree.skillLayout?.slots);
  const usedIds = new Set(own.slots.values());
  const result = new Map(),
    missing = [];
  for (const slot of expected) {
    let itemId = own.slots.get(slot),
      from = null;
    if (!itemId) {
      const donor = donors.find((entry) => entry.slots.has(slot) && !usedIds.has(entry.slots.get(slot)));
      if (donor) {
        itemId = donor.slots.get(slot);
        from = donor.stamp;
        usedIds.add(itemId);
      }
    }
    if (!itemId) {
      if (cut) missing.push(slot);
      continue;
    }
    let item = own.items.get(itemId),
      itemFrom = null;
    if (!item) {
      const donor = donors.find((entry) => entry.items.has(itemId));
      if (donor) {
        item = donor.items.get(itemId);
        itemFrom = donor.stamp;
      }
    }
    result.set(slot, { slot, itemId, baseId: itemId.split("_")[0], item: item || null, from: from || itemFrom });
  }
  return { slots: result, missing, cut };
}

// ---------------------------------------------------------------- text helpers

const RANGE = /\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/g;
const NUMBER = /-?\d+(?:\.\d+)?/g;
/** Comparison key for two affix texts: ranges normalised, spacing and line separators ignored. */
export const affixSignature = (text) =>
  String(text || "")
    .replace(RANGE, "($1–$2)")
    .replace(/[\s·;|]+/g, "")
    .toLowerCase();
const statSignature = (text) =>
  String(text || "")
    .replace(RANGE, "#")
    .replace(NUMBER, "#")
    .replace(/[\s·;|]+/g, "")
    .replace(/[+-]#/g, "#")
    .toLowerCase();
const formatNumber = (value) => String(Math.round(Number(value) * 10000) / 10000);
const argsOf = (affix) => entries(affix?.DynArgs).map(Number).filter(Number.isFinite);

function* choose(count, size, prefix = []) {
  if (prefix.length === count) {
    yield prefix;
    return;
  }
  for (let index = 0; index < size; index += 1)
    if (!prefix.includes(index)) yield* choose(count, size, [...prefix, index]);
}
/**
 * Fills a "(a–b)" template with logged rolls. Extra rolls must equal fixed numbers in the text. Lines that share one
 * range share one roll when the log has fewer rolls than ranges ("+(26–36)% Cast Speed / +(26–36)% Minion Cast Speed"
 * is logged as a single 29, shown as 29 on both lines).
 */
export function fillTemplate(template, args = []) {
  const ranges = [...String(template).matchAll(RANGE)].map((match) => ({
    min: Math.min(+match[1], +match[2]),
    max: Math.max(+match[1], +match[2]),
  }));
  const keys = ranges.map((range) => `${range.min}:${range.max}`);
  const shared = args.length < ranges.length;
  // The rolls to find: one per range, or one per distinct range when the lines share theirs.
  const rolls = shared ? ranges.filter((_, index) => keys.indexOf(keys[index]) === index) : ranges;
  const rollOf = (rangeIndex) =>
    shared ? rolls.findIndex((range) => `${range.min}:${range.max}` === keys[rangeIndex]) : rangeIndex;
  const fixed = (String(template).replace(RANGE, " ").match(NUMBER) || []).map((value) => Math.abs(Number(value)));
  const leftoversFit = (used) =>
    args.every(
      (value, index) => used.includes(index) || fixed.some((number) => Math.abs(number - Math.abs(value)) < 1e-6),
    );
  if (args.length < rolls.length)
    return { ok: false, reason: `${rolls.length} rolled values expected, ${args.length} logged` };
  for (const pick of choose(rolls.length, args.length)) {
    if (
      !pick.every(
        (argIndex, rollIndex) =>
          args[argIndex] >= rolls[rollIndex].min - 1e-6 && args[argIndex] <= rolls[rollIndex].max + 1e-6,
      )
    )
      continue;
    if (!leftoversFit(pick)) continue;
    let index = 0;
    return { ok: true, text: String(template).replace(RANGE, () => formatNumber(args[pick[rollOf(index++)]])) };
  }
  if (rolls.length && args.length === rolls.length) {
    let index = 0;
    return {
      ok: true,
      text: String(template).replace(RANGE, () => formatNumber(args[rollOf(index++)])),
      note: "roll outside the catalog range",
    };
  }
  return {
    ok: false,
    reason: ranges.length ? "logged rolls do not fit the catalog ranges" : "logged values differ from the catalog text",
  };
}

// ---------------------------------------------------------------- report

/** Always shown with an import: the log never records the active follower (research/followers/game-log-follower-import-2026-10-19.md). */
export const FOLLOWER_NOTICE =
  "Followers are not imported: the game log does not record your active follower. Set it in the Hero → Follower tab.";
function newReport() {
  const section = () => ({ imported: [], unresolved: [], missing: [], notes: [] });
  return {
    sections: {
      character: section(),
      gear: section(),
      talents: section(),
      skills: section(),
      slates: section(),
      pacts: section(),
      hero: section(),
    },
    notices: [FOLLOWER_NOTICE],
    provisional: [],
    merges: [],
    filledFrom: {},
    replaced: {},
    gaps: new Set(),
    logGaps: [],
  };
}
const add = (report, section, kind, text, reason) =>
  report.sections[section][kind].push(reason ? { item: text, reason } : { item: text });
/** Records that `section` took entries from the dump logged at `stamp` (another dump than the chosen one). */
const filledFrom = (report, section, stamp) => {
  if (!stamp) return;
  const list = (report.filledFrom[section] ||= []);
  if (!list.includes(stamp)) list.push(stamp);
};

// ---------------------------------------------------------------- gear

// Equipment index -> planner slot. Index 7 holds the right ring: the user's Folklore of Locking Fingers there rolled
// the "right Ring slot" line, and the 54 s fixture (hand-entered from the game) has it in rightRing.
export const GEAR_INDEX_SLOTS = {
  1: "helmet",
  2: "mainHand",
  3: "secondaryHand",
  4: "chest",
  5: "necklace",
  6: "leftRing",
  7: "rightRing",
  8: "belt",
  9: "gloves",
  10: "boots",
};
const slotLabel = (slot) => equipmentSlots.find(([key]) => key === slot)?.[1] || slot;

/** Resolves one logged item at gear index `index` ({ BaseId, UniqueItmId, Prefix, Suffix, … }): { item, report } (tests). */
export function resolveLoggedGearItem(item, idMap, index = 5) {
  const report = newReport();
  const { inventory } = resolveGear({ bag: { wearItems: { 1: { Index: String(index), Item: item } } } }, idMap, report);
  return { item: inventory[0] || null, report };
}

function resolveGear(tree, idMap, report) {
  const inventory = [],
    overrides = {};
  const byIndex = new Map(entries(tree.bag?.wearItems).map((entry) => [Number(entry.Index), entry.Item]));
  for (const [index, slot] of Object.entries(GEAR_INDEX_SLOTS)) {
    const item = byIndex.get(Number(index));
    if (!item) continue;
    const label = slotLabel(slot);
    const [baseName, baseType] = idMap.itemBases[item.BaseId] || [];
    // A legendary line reads the current season's text of its id (its TLIDB item page), which the id map, built from older
    // pages, may lack (a line the season added or rewrote: On the Sublime, 2026-10-23) or print as it was; an id the map
    // files as another kind (a base or prism line) keeps the map's. A tiered line's tier-2 id is in neither table.
    const lineText = (affix, kinds) => {
      const mapped = idMap.affixes[affix.Id];
      const current = !mapped || /^legendary/.test(mapped[0]) ? legendaryAffixText(affix.Id) : null;
      const tierText = legendaryTierTextForAffixId(affix.Id),
        entry = current || mapped || (tierText ? ["legendary", tierText] : null);
      return entry && (!kinds || kinds.includes(entry[0])) ? entry : null;
    };
    const unresolved = (what, affix, reason) =>
      add(
        report,
        "gear",
        "unresolved",
        `${label}: ${what} ${affix.Id}${argsOf(affix).length ? ` = ${argsOf(affix).join(", ")}` : ""}`,
        reason,
      );
    const blendAndTower = () => {
      const extra = { modifiers: [], fields: {} };
      for (const affix of entries(item.EnchantAffixs)) {
        const blend = beltBlends.find((entry) => entry.id === idMap.blends?.[affix.Id]);
        if (blend) {
          extra.fields.beltBlendId = blend.id;
          extra.modifiers.push(blend.modifier);
        } else unresolved("belt blend", affix, "not in the belt blend table");
      }
      for (const affix of entries(item.ChipAffix)) {
        const sequence = towerSequences.find((entry) => entry.id === `tower-sequence-${affix.Id}`);
        // A log written before the 2026-10-14 game patch carries the old affix's values for an id that now rolls a new affix
        // (packages/engine/data/changed-item-ids.js): the item reads the current line, as a saved item does.
        const previous = sequence && towerSequenceTexts[sequence.id];
        const filled =
          sequence &&
          (previous && fillTemplate(previous, argsOf(affix)).ok
            ? { ok: true }
            : fillTemplate(sequence.modifier, argsOf(affix)));
        if (sequence && filled.ok) {
          extra.fields.towerSequenceId = sequence.id;
          extra.modifiers.push(sequence.modifier);
        } else unresolved("TOWER sequence", affix, sequence ? filled.reason : "not in the TOWER sequence table");
      }
      return extra;
    };
    let built = null;
    if (item.UniqueItmId && item.UniqueItmId !== "0")
      built = resolveLegendary(item, label, idMap, report, unresolved, lineText);
    else if (baseType === "Vorax Gear") built = resolveVorax(item, baseName, label, idMap, report, unresolved);
    else if (baseName) built = resolveRare(item, baseName, baseType, label, idMap, report, unresolved, lineText);
    if (!built) {
      add(
        report,
        "gear",
        "unresolved",
        `${label}: base ${item.BaseId}${item.UniqueItmId && item.UniqueItmId !== "0" ? ` / legendary ${item.UniqueItmId}` : ""}`,
        "item not in the planner's gear catalogs",
      );
      continue;
    }
    const extra = blendAndTower();
    const result = {
      ...built,
      ...extra.fields,
      modifiers: [...built.modifiers, ...extra.modifiers],
      affixCount: built.affixCount + extra.modifiers.length,
    };
    const id = `gear-game-log-${slot}`;
    const inventoryItem = { id, ...result, source: "game-log" };
    inventory.push(inventoryItem);
    const { id: ignored, source, slot: itemSlot, ...override } = inventoryItem;
    overrides[slot] = { ...override, source: "game-log", sourceInventoryId: id };
    add(
      report,
      "gear",
      "imported",
      `${label}: ${result.name} (${result.modifiers.length + (result.corrosionModifiers?.length || 0)} lines)`,
    );
  }
  return { inventory, overrides };
}

function resolveRare(item, baseName, baseType, label, idMap, report, unresolved, lineText) {
  // By the logged game base id first: two bases can share a name (Imperishable Black Robe #3209 Lv70 / #3214 Lv66).
  const byGameId = rareBaseByGameId(item.BaseId);
  const base =
    byGameId && byGameId.name === baseName && byGameId.type === baseType
      ? byGameId
      : rareBaseByName(baseName, baseType);
  if (!base || !craftAffixes[baseType]) return null;
  const implicitModifiers = [];
  for (const affix of [...entries(item.BaseAttrAffix), ...entries(item.FixedBaseAffix)]) {
    const entry = lineText(affix);
    const filled = entry && fillTemplate(entry[1], argsOf(affix));
    if (!filled?.ok) {
      unresolved("implicit", affix, entry ? filled.reason : "no text for this id");
      continue;
    }
    implicitModifiers.push(
      base.modifiers.find((text) => affixSignature(text) === affixSignature(filled.text)) || filled.text,
    );
  }
  const baseAffixModifiers = [],
    baseAffixTierIds = [];
  for (const affix of entries(item.BaseAffix)) {
    const entry = lineText(affix, ["base"]);
    const filled = entry && fillTemplate(entry[1], argsOf(affix));
    if (!filled?.ok) {
      unresolved("base affix", affix, entry ? filled.reason : "no text for this id");
      continue;
    }
    const tiers = baseAffixTiers[baseType] || {};
    const tierKey = Object.keys(tiers).find((template) => affixSignature(template) === affixSignature(entry[1]));
    baseAffixModifiers.push(filled.text);
    baseAffixTierIds.push(tierKey ? String(tiers[tierKey]) : "");
  }
  while (baseAffixTierIds.length < 2) baseAffixTierIds.push("");
  const families = [],
    tiers = [],
    prefixModifiers = [],
    suffixModifiers = [];
  for (const [group, slots, list] of [
    ["prefix", item.PrefixSlots, item.Prefix],
    ["suffix", item.SuffixSlots, item.Suffix],
  ]) {
    const affixes = entries(list);
    const order = entries(slots).map((entry) => entry.affixId);
    affixes.sort((a, b) => (order.indexOf(a.Id) + 1 || 99) - (order.indexOf(b.Id) + 1 || 99));
    for (const affix of affixes) {
      const id = String(affix.Id);
      const familyId = `${group}-${id.slice(0, 7)}`,
        tier = String(Number(id.slice(7)));
      const family = /^\d{9}$/.test(id) ? craftAffixes[baseType][group]?.find((entry) => entry.id === familyId) : null;
      const tierEntry = family?.tiers.find((entry) => entry.tier === tier);
      const filled = tierEntry && fillTemplate(tierEntry.template, argsOf(affix));
      if (!filled?.ok) {
        unresolved(
          group,
          affix,
          !family
            ? "not a craft affix family for this base"
            : !tierEntry
              ? `tier ${tier} not in the craft table`
              : filled.reason,
        );
        continue;
      }
      (group === "prefix" ? prefixModifiers : suffixModifiers).push(filled.text);
      families.push(familyId);
      tiers.push(tier);
    }
  }
  return {
    name: base.name,
    base: baseType,
    baseId: base.id,
    slot: base.slot,
    implicitModifiers,
    baseAffixModifiers,
    baseAffixTierIds,
    prefixModifiers,
    suffixModifiers,
    craftAffixFamilyIds: families,
    craftAffixTierIds: tiers,
    craftAffixLegendary: families.map(() => false),
    level: base.level,
    itemLevel: clampLevel(item.Level),
    energy: energyOf(item),
    icon: base.icon,
    modifiers: [...implicitModifiers, ...baseAffixModifiers, ...prefixModifiers, ...suffixModifiers],
    affixCount: baseAffixModifiers.length + prefixModifiers.length + suffixModifiers.length,
    defenses: {},
    rarity: "rare",
  };
}

const clampLevel = (value) => Math.max(1, Math.min(100, Math.round(Number(value) || 1)));
const energyOf = (item) => Math.max(0, Math.min(1000, Math.round(Number(item.cost) || 0)));

function resolveVorax(item, baseName, label, idMap, report, unresolved) {
  const base = voraxCrafting.bases.find((entry) => entry.name === baseName);
  if (!base) return null;
  const text = (affix) => idMap.affixes[affix.Id]?.[1] || null;
  const implicitModifiers = [];
  for (const affix of entries(item.BaseAttrAffix)) {
    const args = argsOf(affix);
    if (args.length && args.every((value) => value === 0)) continue; // Vorax bases list 0 Armor / Evasion / Energy Shield.
    const filled = text(affix) && fillTemplate(text(affix), args);
    if (filled?.ok) implicitModifiers.push(filled.text);
    else unresolved("implicit", affix, text(affix) ? filled.reason : "no text for this id");
  }
  const baseAffixModifiers = [],
    baseAffixTierIds = [];
  for (const affix of entries(item.BaseAffix)) {
    const template = text(affix);
    const entry =
      template &&
      (voraxCrafting.baseAffixes[baseName] || []).find(
        (option) => affixSignature(option.modifier) === affixSignature(template),
      );
    const filled = entry && fillTemplate(entry.modifier, argsOf(affix));
    if (!filled?.ok) {
      unresolved("base affix", affix, template ? "not in the Vorax base affix table" : "no text for this id");
      continue;
    }
    baseAffixModifiers.push(filled.text);
    baseAffixTierIds.push(String(entry.tier));
  }
  while (baseAffixTierIds.length < 2) baseAffixTierIds.push("");
  const families = [],
    tiers = [],
    legendary = [],
    prefixModifiers = [],
    suffixModifiers = [];
  for (const [group, slots, list] of [
    ["prefix", item.PrefixSlots, item.Prefix],
    ["suffix", item.SuffixSlots, item.Suffix],
  ]) {
    const affixes = entries(list);
    const order = entries(slots).map((entry) => entry.affixId);
    affixes.sort((a, b) => (order.indexOf(a.Id) + 1 || 99) - (order.indexOf(b.Id) + 1 || 99));
    for (const affix of affixes) {
      const template = text(affix);
      if (!template) {
        unresolved(group, affix, "no text for this id");
        continue;
      }
      const signature = affixSignature(template);
      const candidates = [];
      for (const family of voraxCrafting.affixes[baseName]?.[group] || [])
        for (const tier of family.tiers)
          if (affixSignature(tier.template) === signature)
            candidates.push({ id: family.id, tier: tier.tier, template: tier.template, legendary: false });
      if (!candidates.length)
        for (const donor of voraxCrafting.legendaryDonors[baseName] || [])
          donor.modifiers.forEach((modifier, index) => {
            if (affixSignature(modifier) === signature)
              candidates.push({ id: `${donor.id}-mod-${index}`, tier: "L", template: modifier, legendary: true });
          });
      const unique = [
        ...new Map(candidates.map((candidate) => [`${candidate.id}|${candidate.tier}`, candidate])).values(),
      ];
      if (unique.length !== 1) {
        unresolved(
          group,
          affix,
          unique.length ? "matches several Vorax affix families" : "not in the Vorax affix tables for this base",
        );
        continue;
      }
      const filled = fillTemplate(unique[0].template, argsOf(affix));
      if (!filled.ok) {
        unresolved(group, affix, filled.reason);
        continue;
      }
      (group === "prefix" ? prefixModifiers : suffixModifiers).push(filled.text);
      families.push(unique[0].id);
      tiers.push(unique[0].tier);
      legendary.push(unique[0].legendary);
    }
  }
  return {
    name: base.name,
    base: base.name,
    baseId: base.id,
    slot: base.slot,
    implicitModifiers,
    baseAffixModifiers,
    baseAffixTierIds,
    prefixModifiers,
    suffixModifiers,
    craftAffixFamilyIds: families,
    craftAffixTierIds: tiers,
    craftAffixLegendary: legendary,
    level: clampLevel(item.Level),
    itemLevel: clampLevel(item.Level),
    energy: energyOf(item),
    icon: base.icon,
    modifiers: [...implicitModifiers, ...baseAffixModifiers, ...prefixModifiers, ...suffixModifiers],
    affixCount: baseAffixModifiers.length + prefixModifiers.length + suffixModifiers.length,
    defenses: {},
    rarity: "vorax",
  };
}

function resolveLegendary(item, label, idMap, report, unresolved, lineText) {
  const name = idMap.legendaries[item.UniqueItmId];
  const source = name && legendaryGear.find((entry) => entry.name === name);
  if (!source) return null;
  const corrodedTemplates = legendaryCorrodedModifiers[source.id] || [];
  const isFolklore = source.id === "Folklore_of_Locking_Fingers";
  const options = (index) => {
    const list = [
      { template: source.modifiers[index], corroded: false },
      ...(corrodedTemplates[index] ? [{ template: corrodedTemplates[index], corroded: true }] : []),
    ];
    if (isFolklore && index === 2)
      for (const side of ["left", "right"])
        list.push(
          { template: folkloreRingOptions[side].normal, corroded: false },
          { template: folkloreRingOptions[side].corroded, corroded: true },
        );
    // A "<Random …>" placeholder line (False God's Skin, Lone Walker's Boots, …) carries one roll of its pool (packages/engine/src/gear/legendary-placeholder-pools.js).
    // A keyword roll (Pantheon's Elegy's Dirges) is logged as the keyword alone (corroded: the keyword and its extra lines), so it
    // matches by its first line and is saved as the pool's text: the keyword, its effect lines, then the logged extra lines.
    for (const option of placeholderPool(source.id, index)?.options || [])
      list.push(
        { template: option.template, corroded: false, keyword: option.keyword, effect: option.effect },
        ...(option.corrodedTemplate
          ? [{ template: option.corrodedTemplate, corroded: true, keyword: option.keyword, effect: option.effect }]
          : []),
      );
    // A tiered line's lower tier (Ice Pulse's tier-2 Spell Damage, packages/engine/src/gear/legendary-affix-tiers.js).
    for (const template of legendaryLowerTierTemplates(source.id, index))
      list.push({ template, corroded: false, tier: true });
    return list;
  };
  const firstLine = (text) => String(text).split("\n")[0].trim();
  const matches = (option, text) =>
    option.keyword ? firstLine(text) === option.keyword : affixSignature(option.template) === affixSignature(text);
  const matched = new Map();
  for (const affix of [...entries(item.Prefix), ...entries(item.Suffix)]) {
    const entry = lineText(affix, ["legendary", "legendary-corroded"]);
    if (!entry) {
      unresolved("legendary line", affix, "no text for this id");
      continue;
    }
    const corrodedId = entry[0] === "legendary-corroded";
    let hit = null;
    for (let index = 0; index < source.modifiers.length && !hit; index += 1) {
      if (matched.has(index)) continue;
      const candidates = options(index).filter((option) => matches(option, entry[1]));
      const option =
        candidates.find((candidate) => candidate.tier && candidate.template === entry[1]) ||
        candidates.find((candidate) => candidate.corroded === corrodedId) ||
        candidates[0];
      if (option) hit = { index, option };
    }
    if (!hit) {
      unresolved(
        "legendary line",
        affix,
        `"${entry[1].replace(/\n/g, " / ")}" is not a line of ${name} in the planner catalog`,
      );
      continue;
    }
    const keywordLines = hit.option.keyword ? fillTemplate(entry[1], argsOf(affix)) : null;
    const filled = keywordLines?.ok
      ? {
          ok: true,
          text: [hit.option.keyword, ...hit.option.effect, ...keywordLines.text.split("\n").slice(1)].join("\n"),
        }
      : keywordLines || fillTemplate(hit.option.template, argsOf(affix));
    if (!filled.ok) {
      unresolved("legendary line", affix, filled.reason);
      continue;
    }
    matched.set(hit.index, { text: filled.text, corroded: hit.option.corroded || corrodedId });
  }
  const order = [...matched.keys()].sort((a, b) => a - b);
  const legendaryModifiers = order.map((index) => matched.get(index).text);
  const corrodedModifierIndices = order
    .map((index, position) => (matched.get(index).corroded ? position : -1))
    .filter((position) => position >= 0);
  const corrosionModifiers = [];
  for (const affix of entries(item.BaseAffix)) {
    const entry = lineText(affix, ["corrosion"]);
    const filled = entry && fillTemplate(entry[1], argsOf(affix));
    if (filled?.ok) corrosionModifiers.push(filled.text);
    else unresolved("corrosion base affix", affix, entry ? filled.reason : "no text for this id");
  }
  // The base item's implicit (BaseAttrAffix / FixedBaseAffix) is its own game record, separate from the legendary lines
  // (Prefix / Suffix), so Sun's Embrace's +1615 implicit Gear Armor and its +3168 legendary Gear Armor are two lines. The
  // planner's legendary catalog (TLIDB) lists legendary lines only. A line already imported as a legendary line is skipped.
  // Implicits go after the legendary lines so corrodedModifierIndices and the legendary editor keep their positions; a
  // corrosion base affix replaces them (effectiveGearModifierTexts), as for rare items.
  const implicitModifiers = [];
  for (const affix of [...entries(item.BaseAttrAffix), ...entries(item.FixedBaseAffix)]) {
    const entry = lineText(affix);
    const filled = entry && fillTemplate(entry[1], argsOf(affix));
    if (!filled?.ok) {
      unresolved("implicit", affix, entry ? filled.reason : "no text for this id");
      continue;
    }
    if (legendaryModifiers.some((text) => affixSignature(text) === affixSignature(filled.text))) {
      add(
        report,
        "gear",
        "notes",
        `${label}: ${name}'s base implicit ${filled.text.replace(/\n/g, " / ")} equals one of its legendary lines; counted once`,
      );
      continue;
    }
    implicitModifiers.push(filled.text);
  }
  if (implicitModifiers.length && corrosionModifiers.length)
    add(
      report,
      "gear",
      "notes",
      `${label}: ${name}'s base implicit (${implicitModifiers.join("; ").replace(/\n/g, " / ")}) is replaced by its corrosion base affix`,
    );
  const [, baseType] = idMap.itemBases[item.BaseId] || [];
  return {
    name: source.name,
    base: baseType || source.slot,
    slot: source.slot,
    legendaryModifiers,
    corrodedModifierIndices,
    ...(implicitModifiers.length ? { implicitModifiers } : {}),
    ...(corrosionModifiers.length ? { corrosionModifiers } : {}),
    level: source.level,
    itemLevel: clampLevel(item.Level),
    energy: energyOf(item),
    icon: source.icon,
    modifiers: [...legendaryModifiers, ...implicitModifiers],
    affixCount: legendaryModifiers.length,
    rarity: "legendary",
  };
}

// ---------------------------------------------------------------- talents

const godTreeOf = (careerId) => {
  const id = Number(careerId);
  return id >= 10 && id <= 60 && id % 10 === 0 ? id / 10 : id;
};
const typeLabels = { micro: "Micro Talent", medium: "Medium Talent", legendary: "Legendary Medium Talent" };
/** Talent id CC YY XX 00 -> tree and node (or a core when YY is 00). God trees use god x 10 as CC. */
export function talentFromId(talentId, idMap) {
  const id = String(talentId).padStart(8, "0");
  const tree = idMap.professions[String(godTreeOf(id.slice(0, 2)))];
  const catalogue = tree && allProfessionTalentCatalogue[tree];
  if (!catalogue) return null;
  const column = Number(id.slice(2, 4)) - 1,
    row = Number(id.slice(4, 6)) - 1;
  if (column < 0) {
    const coreName = idMap.talents[String(Number(id))] || idMap.talents[id];
    const core = catalogue.coreTalents?.find((entry) => entry.name === coreName);
    return core ? { tree, core } : null;
  }
  const node = catalogue.nodes.find((entry) => entry.coordinate[0] === column && entry.coordinate[1] === row);
  return node ? { tree, node, coordinate: `${column},${row}` } : null;
}

function resolveTalents(tree, idMap, report, state) {
  const infos = Object.entries(tree.geniusInfos?.info || {})
    .filter(([, info]) => info && typeof info === "object" && !("..." in info))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, info]) => info);
  if (!infos.length) {
    if (!report.gaps.has("geniusInfos"))
      add(
        report,
        "talents",
        "missing",
        "Talent trees",
        "the geniusInfos section is not in this dump or in another dump of the character",
      );
    return;
  }
  const selectedTrees = ["", "", "", ""];
  infos.slice(0, 4).forEach((info, slot) => {
    if (!info.geniusCareerId || info.geniusCareerId === "0") return; // empty tree slot
    const treeName = idMap.professions[String(info.geniusCareerId)];
    const catalogue = treeName && allProfessionTalentCatalogue[treeName];
    if (!catalogue) {
      add(
        report,
        "talents",
        "unresolved",
        `Tree slot ${slot + 1}: career ${info.geniusCareerId}`,
        "not a planner talent tree",
      );
      return;
    }
    selectedTrees[slot] = treeName;
    const nodes = entries(info.geniusList);
    let points = 0,
      allocated = 0;
    for (const node of nodes) {
      const rank = Number(node.point || 0);
      if (!rank) continue;
      const column = Number(node.position?.y) - 1,
        row = Number(node.position?.x) - 1;
      if (!catalogue.nodes.some((entry) => entry.coordinate[0] === column && entry.coordinate[1] === row)) {
        add(
          report,
          "talents",
          "unresolved",
          `${treeName} node ${node.geniusId} (rank ${rank})`,
          "no planner node at that position",
        );
        continue;
      }
      state.talentRanks[`${treeName}:${column},${row}`] = Math.min(3, rank);
      points += rank;
      allocated += 1;
    }
    add(report, "talents", "imported", `${treeName}: ${allocated} nodes, ${points} points`);
    if (isCut(info.geniusList)) {
      const listed = new Set(nodes.map((node) => `${Number(node.position?.y) - 1},${Number(node.position?.x) - 1}`));
      const lost = catalogue.nodes
        .filter((entry) => !listed.has(String(entry.coordinate)))
        .map((entry) => entry.coordinate.join(","));
      add(
        report,
        "talents",
        "missing",
        `${treeName}: nodes ${lost.join(" ")}`,
        "the log cuts every table at 30 entries; ranks on these nodes are unknown",
      );
    }
    for (const bonus of entries(info.bonusGeniusInfo)) {
      const value = bonus.value || {};
      const coreName = idMap.talents[value.geniusId];
      if (value.isPrismSkill === "true") {
        add(
          report,
          "talents",
          "imported",
          `${treeName}: core ${coreName || value.geniusId} (granted by the installed prism)`,
        );
        continue;
      }
      const core = catalogue.coreTalents?.find((entry) => entry.name === coreName);
      if (!core) {
        add(
          report,
          "talents",
          "unresolved",
          `${treeName}: core talent ${value.geniusId}`,
          coreName ? `${coreName} is not a core of this tree in the planner` : "no name for this id",
        );
        continue;
      }
      state.talents.coreSelections[`${treeName}:${core.unlockPoints}`] = core.name;
      add(report, "talents", "imported", `${treeName}: core ${core.name}`);
    }
    if (info.prismInfo) resolvePrism(info, treeName, nodes, idMap, report, state);
  });
  state.talents.selectedTrees = selectedTrees;
}

// A prism affix's id-map entry. The upstream map lacks the lower prism tiers' ids (1214…, 1224…) a dropped prism logs:
// those come from TLIDB's table (scripts/fetch-tlidb-prism-affixes.js).
const prismAffixEntry = (idMap, id) => idMap.affixes[id] || TLIDB_PRISM_AFFIXES[id] || null;
// TLIDB writes "The area of effect expands to" where the planner's options say "The Effect Area expands to".
const prismSignature = (text) =>
  affixSignature(String(text).replace(/^The area of effect expands to\b/i, "The Effect Area expands to"));

function resolvePrism(info, treeName, nodes, idMap, report, state) {
  const prism = info.prismInfo,
    item = prism.item || {};
  const node = nodes.find((entry) => entry.geniusId === prism.geniusId);
  const [itemName] = idMap.itemBases[item.BaseId] || [];
  const base = itemName?.replace(/^Ethereal Prism:\s*/, "");
  if (!node || !base || !itemName.startsWith("Ethereal Prism:") || !etherealPrismBases.includes(base)) {
    add(
      report,
      "talents",
      "unresolved",
      `${treeName}: prism ${item.BaseId || "?"}`,
      "not an Ethereal Prism base the planner has",
    );
    return;
  }
  const coordinate = `${Number(node.position.y) - 1},${Number(node.position.x) - 1}`;
  const crafted = {
    id: "game-log-prism-1",
    type: "ethereal",
    base,
    radiusAffix: "",
    rareAffix: "",
    legendaryAffix: "",
    baseAffix: "",
  };
  const lists = {
    radiusAffix: prismAffixes.radius,
    rareAffix: prismAffixes.rare,
    legendaryAffix: prismAffixes.legendary,
  };
  for (const affix of entries(item.Prefix)) {
    const entry = prismAffixEntry(idMap, affix.Id);
    const field =
      entry &&
      Object.keys(lists).find(
        (key) => !crafted[key] && lists[key].some((option) => prismSignature(option) === prismSignature(entry[1])),
      );
    if (field) crafted[field] = lists[field].find((option) => prismSignature(option) === prismSignature(entry[1]));
    else
      add(
        report,
        "talents",
        "unresolved",
        `${treeName}: prism affix ${affix.Id}`,
        entry ? `"${entry[1].replace(/\n/g, " / ")}" is not a planner prism affix` : "no text for this id",
      );
  }
  const attributes = new Set(entries(item.BaseAttrAffix));
  for (const affix of [...entries(item.BaseAffix), ...attributes, ...entries(prism.extAffix)]) {
    const entry = prismAffixEntry(idMap, affix.Id);
    // A base attribute neither the id map nor TLIDB has text for (1204509011 on the 2026-10-22 Lich prism): nothing to
    // read, so a note rather than something the user should fix.
    if (!entry && attributes.has(affix)) {
      add(
        report,
        "talents",
        "notes",
        `${treeName}: prism base attribute ${affix.Id}`,
        "the game data has no text for it; the planner does not read it",
      );
      continue;
    }
    if (entry && /Replaces the Core Talent/.test(entry[1]) && entry[1].includes(base)) continue; // the base effect, implied by the base name
    // A base affix that adds an effect to the panel's core (Haze's, 2026-10-22 log): kept on the prism, which applies it.
    if (entry && /^Adds an additional effect to the Core Talent/.test(entry[1]) && !crafted.baseAffix) {
      // The upstream id map writes the line break as the two characters "\\n".
      crafted.baseAffix = entry[1].replace(/\\n/g, "\n");
      add(report, "talents", "imported", `${treeName}: prism base affix ${entry[1].replace(/\n/g, " / ")}`);
      continue;
    }
    add(
      report,
      "talents",
      "unresolved",
      `${treeName}: prism line ${affix.Id}${argsOf(affix).length ? ` = ${argsOf(affix).join(", ")}` : ""}`,
      entry ? "base line the planner derives from the prism base" : "no text for this id",
    );
  }
  state.talents.prismInventory.push(crafted);
  state.talents.installedPrisms[treeName] = crafted.id;
  state.talents.installedPrismNodes[treeName] = coordinate;
  add(
    report,
    "talents",
    "imported",
    `${treeName}: Ethereal Prism ${base} at ${coordinate}${crafted.radiusAffix ? `, ${crafted.radiusAffix}` : ""}`,
  );
}

// ---------------------------------------------------------------- skills

const skillByName = new Map(tlidbSkillCatalog.map((entry) => [entry.name, entry]));
const supportByName = new Map(tlidbSupportCatalog.map((entry) => [entry.name, entry]));
const ACTIVE_SKILL_SLOTS = [1, 2, 3, 4, 5];
const AURA_SLOTS = [1001, 1007, 1013, 1019];
const levelOf = (item, fallback = 20) => Math.max(1, Math.min(40, Math.round(Number(item?.Level) || fallback)));

function specialSupportConfig(name, item, report, label) {
  const affixes = entries(item?.Prefix);
  if (isActivationMedium(name)) {
    const lines = activationMediumAffixLines(name);
    if (!lines) return null;
    const configs = lines.map(() => ({ tier: null, rolls: [] }));
    let resolved = 0;
    const fixedLines = []; // lines whose logged row has no rolled value: their tier follows the rolled lines (below)
    for (const affix of affixes) {
      const id = String(affix.Id),
        observed = observedGameAffixIds[id],
        game = activationMediumGameAffixes[id];
      const roll = argsOf(affix);
      const label2 = `${label}: ${name} affix ${id}${roll.length ? ` = ${roll.join(", ")}` : ""}`;
      // Pinned observations first (Preparation, 2026-10-12), then the game's own row text (config_modifier, 2026-10-18).
      if (observed?.family === "activation-medium" && observed.support === name) {
        const option = lines[observed.line]?.options.find((entry) => entry.tier === observed.tier);
        if (
          option &&
          roll.length === option.ranges.length &&
          option.ranges.every((range, index) => roll[index] >= range.min && roll[index] <= range.max)
        ) {
          configs[observed.line] = { tier: observed.tier, rolls: roll };
          resolved += 1;
          continue;
        }
        add(
          report,
          "skills",
          "unresolved",
          label2,
          option
            ? "roll outside the TLIDB tier range"
            : `TLIDB's ${name} table has no tier ${observed.tier} for line ${observed.line + 1}`,
        );
        continue;
      }
      if (!game) {
        add(
          report,
          "skills",
          "unresolved",
          label2,
          "this affix id is not an Activation Medium row of the game's modifier table (gamedata 2026-10-18)",
        );
        continue;
      }
      const [template, tier] = game;
      const match = activationMediumGameLine(name, template);
      if (!match) {
        add(
          report,
          "skills",
          "unresolved",
          label2,
          `the game line "${template.replace(/\n/g, " / ")}" is not a line of TLIDB's ${name} table`,
        );
        continue;
      }
      const line = lines[match.index];
      if (!/\$[+-]?P\d+\$/.test(template)) {
        fixedLines.push({ index: match.index, tier, template, roll, match, label2 });
        resolved += 1;
        continue;
      }
      const option = line.options.find((entry) => entry.tier === tier);
      if (!option) {
        add(
          report,
          "skills",
          "unresolved",
          label2,
          `TLIDB's ${name} table has no tier ${tier} for "${line.options[0].text}"`,
        );
        continue;
      }
      const rolls = activationMediumGameRolls(option, template, roll, match);
      if (!rolls) {
        add(report, "skills", "unresolved", label2, `logged value(s) do not fit TLIDB's tier ${tier} "${option.text}"`);
        continue;
      }
      configs[match.index] = { tier, rolls };
      resolved += 1;
    }
    // A fixed line (no rolled value) is one game row for every tier; TLIDB repeats it per tier. Use the rolled lines' tier
    // when TLIDB lists the line there, else the row's own tier, else any tier with the same text.
    const rolledTier = configs.find((config) => config.tier != null)?.tier;
    for (const { index, tier, template, roll, match, label2 } of fixedLines) {
      const options = lines[index].options;
      const option =
        options.find((entry) => entry.tier === rolledTier) ||
        options.find((entry) => entry.tier === tier) ||
        options[0];
      const rolls = activationMediumGameRolls(option, template, roll, match);
      if (!rolls) {
        add(
          report,
          "skills",
          "unresolved",
          label2,
          `logged value(s) do not fit TLIDB's tier ${option.tier} "${option.text}"`,
        );
        resolved -= 1;
        continue;
      }
      configs[index] = { tier: option.tier, rolls };
    }
    return resolved ? { lines: configs } : null;
  }
  const special = specialSupportTierData(name),
    progression = progressionSupportTierData(name);
  if (!special && !progression) return null;
  // The support item is not in the dump (the log cuts the skill-item table at about 30 entries): its stars (the item's Level)
  // and roll are unknown, so no config is written and the planner's default for the support stays (the caller notes it).
  if (!item) return null;
  const stars = Math.max(1, Math.min(5, Math.round(Number(item.Level) || 1)));
  const affix = affixes[0];
  const roll = affix ? argsOf(affix) : [];
  const starPart = !special && !progressionSupportHasStars(name) ? {} : { stars, starScaleVersion: 2 };
  if (!roll.length) {
    add(report, "skills", "notes", `${label}: ${name} has no logged roll; ${stars}★ with the planner's default tier`);
    return starPart.stars ? starPart : null;
  }
  // A roll outside every TLIDB range takes the nearest tier (distance to the range, summed over the rolled values).
  const gap = (value, min, max) => (value < min ? min - value : value > max ? value - max : 0);
  const outside = (tier) =>
    add(
      report,
      "skills",
      "notes",
      `${label}: ${name} roll ${affix.Id} = ${roll.join(", ")} is outside the TLIDB tier ranges; nearest tier T${tier} used`,
    );
  if (special) {
    const ranked =
      roll.length === 1 ? [...special].sort((a, b) => gap(roll[0], a.min, a.max) - gap(roll[0], b.min, b.max)) : [];
    const tier = ranked[0];
    if (!tier) {
      add(
        report,
        "skills",
        "unresolved",
        `${label}: ${name} roll ${affix.Id} = ${roll.join(", ")}`,
        "expected one rolled value",
      );
      return starPart;
    }
    if (gap(roll[0], tier.min, tier.max) > 0) outside(tier.tier);
    return { tier: tier.tier, roll: roll[0], ...starPart };
  }
  const distance = (entry) =>
    entry.ranges.reduce((sum, range, index) => sum + gap(roll[index], range.min, range.max), 0);
  const tier = progression
    .filter((entry) => entry.ranges.length === roll.length)
    .sort((a, b) => distance(a) - distance(b))[0];
  if (!tier) {
    add(
      report,
      "skills",
      "unresolved",
      `${label}: ${name} roll ${affix.Id} = ${roll.join(", ")}`,
      "no TLIDB tier has this many rolled values",
    );
    return starPart.stars ? starPart : null;
  }
  if (distance(tier) > 0) outside(tier.tier);
  return { tier: tier.tier, rolls: roll, ...starPart };
}

function resolveSkills(tree, others, idMap, report, state) {
  const { slots, missing } = collectSkillSlots(tree, others);
  const skills = state.skills;
  const describe = (slot) => {
    const number = Number(slot);
    if (number < 100) return `Skill ${number}`;
    if (number < 1000) return `Skill ${Math.floor(number / 100)} support ${number % 100}`;
    const aura = Math.floor((number - 1001) / 6) + 1,
      offset = (number - 1001) % 6;
    return offset ? `Passive ${aura} support ${offset}` : `Passive ${aura}`;
  };
  for (const slot of missing)
    add(
      report,
      "skills",
      "missing",
      describe(slot),
      "not in this dump or another dump of the character (the log cuts skill tables at 30 entries)",
    );
  const mergedNote = (entry) => (entry.from ? ` (from the ${timeLabel(entry.from)} dump)` : "");
  if ([...slots.values()].some((entry) => entry.from))
    report.merges.push({
      section: "skills",
      detail: "skill slots cut from the chosen dump were filled from other dumps of the character",
    });
  for (const entry of slots.values()) filledFrom(report, "skills", entry.from);
  if (slots.size && [...slots.values()].every((entry) => entry.from)) report.replaced.skills = true;
  const setupFor = (slotNumber, role, index) => {
    const entry = slots.get(String(slotNumber));
    if (!entry) return null;
    const [name] = idMap.itemBases[entry.baseId] || [];
    const catalog = name && skillByName.get(name);
    if (!catalog) {
      add(
        report,
        "skills",
        "unresolved",
        `${describe(slotNumber)}: skill ${entry.baseId}`,
        name ? `${name} is not in the planner's skill catalog` : "no name for this id",
      );
      return null;
    }
    const level = levelOf(entry.item);
    // A skill a hero trait puts in this Active slot (Youga's Stasis Vault in slot 2, …) is the trait's own skill in the
    // planner (packages/engine/src/heroes/trait-board-grants.js): its supports go under `trait:<skill>`, where the granted skill
    // reads them, and the slot is left to the grant.
    const granted =
      role === "skill" && Object.values(TRAIT_SLOT_GRANTS).some((grant) => grant.skill === name && grant.row === index);
    let key;
    if (granted) key = `trait:${name}`;
    else {
      key = `game-log-skill-${slotNumber}`;
      skills.customSetups.push({
        instanceId: key,
        role: catalog.role,
        name,
        baseLevel: level,
        addedLevels: 0,
        supports: [],
        enabledSupportSlots: 0,
        ...(Number.isFinite(catalog.sealedManaPercent) ? { sealedManaPercent: catalog.sealedManaPercent } : {}),
        source: catalog.source || "game-log",
        custom: true,
        ...(role !== "aura" && catalog.role === "aura" ? { boardTab: "skills" } : {}),
      });
    }
    if (!entry.item)
      add(report, "skills", "notes", `${describe(slotNumber)}: ${name} level not logged; Lv ${level} assumed`);
    add(
      report,
      "skills",
      "imported",
      granted
        ? `${describe(slotNumber)}: ${name} (granted by the hero trait; its supports go on the granted skill)${mergedNote(entry)}`
        : `${describe(slotNumber)}: ${name} Lv ${level}${mergedNote(entry)}`,
    );
    const order = ["", "", "", "", ""];
    const supportSlots =
      role === "aura"
        ? [1, 2, 3, 4, 5].map((offset) => slotNumber + offset)
        : [1, 2, 3, 4, 5].map((offset) => slotNumber * 100 + offset);
    supportSlots.forEach((supportSlot, position) => {
      const support = slots.get(String(supportSlot));
      if (!support) return;
      const [supportName] = idMap.itemBases[support.baseId] || [];
      // Youga's trait puts Clockwork Core in this socket; the planner grants it from the trait, never from the board.
      if (supportName === CLOCKWORK_CORE.name) {
        add(
          report,
          "skills",
          "imported",
          `${name} support ${position + 1}: Clockwork Core (granted by the hero trait; the planner adds it itself)`,
        );
        return;
      }
      const supportCatalog = supportName && supportByName.get(supportName);
      if (!supportCatalog) {
        add(
          report,
          "skills",
          "unresolved",
          `${describe(supportSlot)}: support ${support.baseId}`,
          supportName ? `${supportName} is not in the planner's support catalog` : "no name for this id",
        );
        return;
      }
      const label = `${name} support ${position + 1}`;
      const config = specialSupportConfig(supportName, support.item, report, label);
      const starSupport = Boolean(
        specialSupportTierData(supportName) ||
        (progressionSupportTierData(supportName) && progressionSupportHasStars(supportName)),
      );
      const hasStars = Boolean(config?.stars) || starSupport;
      const supportLevel = hasStars ? supportCatalog.level || 20 : levelOf(support.item, supportCatalog.level || 20);
      const stateKey = `${key}:${supportName}`;
      skills.supportEnabled[stateKey] = true;
      (skills.customSupports[key] ||= []).push({
        name: supportName,
        level: supportLevel,
        manaCostMultiplierPercent: specialSupportTierData(supportName)
          ? 110
          : (supportCatalog.manaCostMultiplierPercent ?? 100),
        effects: structuredClone(supportCatalog.effects || []),
        custom: true,
      });
      if (config) skills.specialSupportConfigs[stateKey] = config;
      order[position] = supportName;
      const configText = config?.stars
        ? `, ${config.stars}★${config.tier != null ? ` T${config.tier}` : ""}`
        : config?.lines
          ? `, ${config.lines
              .filter((line) => line.tier != null)
              .map((line) => `T${line.tier} ${line.rolls.join("/")}`)
              .join(", ")}`
          : "";
      if (!support.item)
        add(
          report,
          "skills",
          "notes",
          starSupport
            ? `${label}: ${supportName} stars and roll not logged (the support item is not in the dump); the planner default for this support is kept, set it on the support card`
            : `${label}: ${supportName} level and rolls not logged (the support item is past the log's 30-entry cut of the skill-item table); imported at Lv ${supportLevel}, the catalog default`,
        );
      add(
        report,
        "skills",
        "imported",
        `${label}: ${supportName}${hasStars ? "" : ` Lv ${supportLevel}`}${configText}${mergedNote(support)}`,
      );
    });
    skills.supportOrder[key] = order;
    return granted ? "" : key;
  };
  skills.boardSlots.skills = ACTIVE_SKILL_SLOTS.map((slot, index) => setupFor(slot, "skill", index) || "");
  skills.boardSlots.auras = AURA_SLOTS.map((slot, index) => setupFor(slot, "aura", index) || "");
}

// ---------------------------------------------------------------- slates

// The game anchors a slate at one cell: the cell with the most neighbours in the shape (first such cell). Index =
// column x 10 + row of that cell; Direction 2 is the unrotated shape, each step turns 90 degrees and a missing one is 0. Calibrated on the
// user's nine slates (Fallen Starlight, A Corner of Divinity, Pedigree of Gods, Sparks, Prairie, Judgment). The same rule
// places god-crafted slates (src/game-log/slate-shape-ids.js; research/slate-shape-import-2026-10-19.md).
const CALIBRATED_SLATES = new Set([
  "Fallen Starlight",
  "A Corner of Divinity",
  "Pedigree of Gods",
  "Sparks of Moth Fire",
  "When Sparks Set the Prairie Ablaze",
  "Nether King's Divinity: Judgment",
]);
const anchorCell = (shape) => {
  const neighbours = (cell) =>
    shape.filter((other) => Math.abs(other[0] - cell[0]) + Math.abs(other[1] - cell[1]) === 1).length;
  let best = 0;
  shape.forEach((cell, index) => {
    if (neighbours(cell) > neighbours(shape[best])) best = index;
  });
  return best;
};
const offsetKey = (offsets) =>
  offsets
    .map((cell) => cell.join(","))
    .sort()
    .join(" ");
/**
 * The planner orientation of a game turn. A slate the planner flips but never rotates (Pedigree of Gods) keeps a turn whose
 * cells equal a mirror of its shape as that mirror: Pedigree is symmetric about its diagonal, so a quarter turn either way is
 * a mirror. User's SS14 login (2026-10-19): Pedigree at game direction 1 fits the board at its logged cell only mirrored.
 * Any other turn stays a rotation (refused later when the slate cannot rotate).
 */
function gameSlateOrientation(slate, shape, rotation, offsets) {
  const rules = slateTransformRules(slate);
  if (rotation && !rules.rotate && rules.flip) {
    const target = offsetKey(offsets);
    for (const [flipX, flipY] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      if (offsetKey(slateOffsets({ shape }, 0, flipX, flipY)) === target)
        return { rotation: 0, flipX, flipY, mirrored: flipX !== 1 || flipY !== 1 };
    }
  }
  return { rotation, flipX: 1, flipY: 1, mirrored: false };
}

/** The planner rotation / flip of a shape whose cells equal the game's offsets (unflipped and least turned first), or null. */
function plannerOrientation(shape, offsets) {
  const target = offsetKey(offsets);
  for (const [flipX, flipY] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    for (const rotation of [0, 90, 180, 270])
      if (offsetKey(slateOffsets({ shape }, rotation, flipX, flipY)) === target)
        return { rotation, flipX, flipY, mirrored: flipX * flipY === -1 };
  }
  return null;
}

// The crafter's art for a god's planner shape (src/app/slates/slate-shapes.js craftedSlateIcon / the crafter's shape buttons).
const GOD_SLATE_CAPTURES = {
  hunting: "goddess-of-hunting",
  knowledge: "goddess-of-knowledge",
  machines: "god-of-machines",
  might: "god-of-might",
  war: "god-of-war",
};
const craftedSlateIconPath = (godKey, index) =>
  `./src/assets/tli/slates/game-captures/${index ? `${godKey}-${["Z1", "L1", "O1", "T1"][index]}.png` : godKey === "deception" ? "goddess-of-deception-divinity.webp" : `${GOD_SLATE_CAPTURES[godKey]}.svg`}`;
const CRAFTED_SHAPE_RULE =
  "Crafted Divinity Slate shape ids 1021 / 1031 / 1051 are read as Z2 / L1 / O1 from TLIDB's shape order (1011 Z1, 1041 L2 and 1061 T1 are confirmed on a logged board)";
const CRAFTED_DIRECTION_RULE = `A crafted Divinity Slate with no logged Direction is read as direction ${DEFAULT_GAME_DIRECTION}, the game's default turn (the only reading that fits the 2026-10-19 board)`;

/**
 * A god-crafted Divinity Slate: ShapeId names one of the god's six shapes, Direction its quarter turns (missing: 0), and the
 * logged cell is its anchor, as for legendary slates. Fixed talents come from BaseTalentList (2), random ones from
 * EnchantTalentList (3), the crafter's two groups. The planner draws one Z / L / O / T per god, so a game shape that is the
 * mirror image of the planner's drawing (Z2 / L2, or Deception's Z1) is placed flipped. Never placed illegally: a shape
 * that does not fit at its logged cell is parked beside the board.
 */
function resolveCraftedSlate({ entry, item, position, baseName, idMap, report, state, placements, boardSlates }) {
  const god = craftedSlateGod(baseName),
    godKey = plannerGodKey(god),
    shapeInfo = craftedSlateShapeForId(item.ShapeId);
  const label = `Slate at ${entry.Index} (${baseName}${shapeInfo ? ` ${shapeInfo.code}` : ""})`;
  if (!godKey) {
    add(report, "slates", "unresolved", label, "the planner has no crafted slates for this god");
    return;
  }
  if (!shapeInfo) {
    add(
      report,
      "slates",
      "unresolved",
      label,
      `crafted slate shape id ${item.ShapeId ?? "none"} is not in the shape table yet (src/game-log/slate-shape-ids.js)`,
    );
    return;
  }
  const id = `game-log-slate-${position + 1}`;
  const problems = [];
  const talents = (list, count) => {
    const ids = entries(list);
    if (ids.length > count) problems.push(`${ids.length - count} talent(s) past the planner's ${count} slots`);
    const values = ids.slice(0, count).map((talentId) => {
      const value = slateTalentAffix(talentId, idMap);
      if (!value) problems.push(`talent ${talentId}`);
      return value || "";
    });
    while (values.length < count) values.push("");
    return values;
  };
  const fixed = talents(item.BaseTalentList, 2),
    random = talents(item.EnchantTalentList, 3);
  for (const problem of problems)
    add(report, "slates", "unresolved", `${label}: ${problem}`, "no planner talent at that id");
  const shape = `${godKey}-${shapeInfo.plannerIndex}`;
  const plannerShape = craftedSlateShape(shape, god, god);
  const turned = gameDirectionTurn(item.Direction);
  const offsets = turned == null ? null : slateOffsets({ shape: shapeInfo.cells }, turned, 1, 1);
  const orientation = offsets && plannerOrientation(plannerShape, offsets);
  const { rotation, flipX, flipY, mirrored } = orientation || { rotation: 0, flipX: 1, flipY: 1, mirrored: false };
  const crafted = {
    id,
    name: god,
    god,
    shape,
    rotation,
    flipX,
    flipY,
    affixes: [...fixed, ...random].filter(Boolean),
    affixGroups: { fixed, random },
    rarity: "magic",
    icon: craftedSlateIconPath(godKey, shapeInfo.plannerIndex),
  };
  state.slates.inventory.push(crafted);
  if (!shapeInfo.confirmed && !report.provisional.includes(CRAFTED_SHAPE_RULE))
    report.provisional.push(CRAFTED_SHAPE_RULE);
  if (item.Direction == null || item.Direction === "") {
    add(
      report,
      "slates",
      "notes",
      `${label}: no Direction logged; read as direction ${DEFAULT_GAME_DIRECTION}, the game's default turn`,
    );
    if (!report.provisional.includes(CRAFTED_DIRECTION_RULE)) report.provisional.push(CRAFTED_DIRECTION_RULE);
  }
  if (mirrored)
    add(
      report,
      "slates",
      "notes",
      `${label}: the planner draws this god's ${["Z", "L", "O", "T"][shapeInfo.plannerIndex]} shape as the mirror image of the game's ${shapeInfo.code}, so it is placed flipped`,
    );
  // The cell the game's Index names: the table's `anchor` where the shape has one, else the anchor rule.
  const anchorIndex = shapeInfo.anchor
    ? shapeInfo.cells.findIndex(([column, row]) => column === shapeInfo.anchor[0] && row === shapeInfo.anchor[1])
    : anchorCell(shapeInfo.cells);
  const anchor = offsets?.[anchorIndex];
  const placement = anchor && {
    column: Math.floor(Number(entry.Index) / 10) - anchor[0],
    row: (Number(entry.Index) % 10) - anchor[1],
    rotation,
    flipX,
    flipY,
  };
  const boardSlate = { ...crafted, shape: plannerShape };
  if (
    orientation &&
    placement &&
    placement.column >= 1 &&
    placement.row >= 1 &&
    canPlaceSlate(boardSlate, placement, placements, boardSlates, lockedSlateCells(state.hero.characterLevel))
  ) {
    placements[id] = placement;
    boardSlates.push(boardSlate);
    state.equippedSlateIds.push(id);
    add(
      report,
      "slates",
      "imported",
      `${baseName} ${shapeInfo.code} at column ${placement.column}, row ${placement.row}${rotation ? `, rotated ${rotation}°` : ""}${mirrored ? ", mirrored" : ""}: ${crafted.affixes.length} talents`,
    );
    return;
  }
  state.slates.parked[id] = { x: 2, y: Math.min(90, 4 + position * 10), rotation, flipX, flipY };
  const reason =
    turned == null
      ? `direction ${item.Direction} is not a quarter turn; parked beside the board`
      : !orientation
        ? "the planner's shape for this god does not match the game shape; parked beside the board"
        : "does not fit the board at the computed cell; parked beside the board";
  add(
    report,
    "slates",
    "unresolved",
    `${baseName} ${shapeInfo.code} placement (game cell ${entry.Index}, direction ${item.Direction ?? "none"})`,
    reason,
  );
}

function slateTalentAffix(talentId, idMap, pedigreeSlot = null) {
  const found = talentFromId(talentId, idMap);
  if (!found) return null;
  if (found.core) {
    if (pedigreeSlot == null) return null;
    const value = `${found.tree}: ${pedigreeSlot === 2 ? "Lv.1" : "Lv.2"} Core Talent: ${found.core.name} — ${found.core.description.replaceAll(" | ", " · ")}`;
    return isValidPedigreeAffix(pedigreeSlot, value) ? value : null;
  }
  const value = `${found.tree}: ${typeLabels[found.node.type] || found.node.type}: ${found.node.description.replaceAll(" | ", " · ")}`;
  return pedigreeSlot == null || isValidPedigreeAffix(pedigreeSlot, value) ? value : null;
}

function resolveSlates(tree, idMap, report, state) {
  const items = entries(tree.bag?.dressingTalentBlocks);
  const placements = {},
    boardSlates = [];
  items.forEach((entry, position) => {
    const item = entry.Item || {};
    const legendaryName = item.UniqueItmId && item.UniqueItmId !== "0" ? idMap.legendaries[item.UniqueItmId] : null;
    const name = legendaryName || idMap.itemBases[item.BaseId]?.[0] || "";
    const label = `Slate at ${entry.Index}${name ? ` (${name})` : ""}`;
    // A god's crafted slate ("Goddess of Deception's Divinity", base type "Divinity Slate", no legendary id) is named by its base.
    const godCrafted = !legendaryName && idMap.itemBases[item.BaseId]?.[1] === "Divinity Slate";
    if (!name) {
      add(report, "slates", "unresolved", label, "the slate's item id is not in the game id table");
      return;
    }
    if (godCrafted) {
      resolveCraftedSlate({ entry, item, position, baseName: name, idMap, report, state, placements, boardSlates });
      return;
    }
    if (!legendarySlateShapes[name]) {
      add(report, "slates", "unresolved", label, "the planner has no shape for this slate");
      return;
    }
    const id = `game-log-slate-${position + 1}`;
    const isNether = name.startsWith("Nether King's Divinity");
    const affixes = [],
      problems = [];
    const talentIds = entries(item.BaseTalentList);
    let crafted;
    if (isNether) {
      const fixed = talentIds.map((talentId) => {
        const node = idMap.affixes[talentId];
        const effect = node?.[0] === "nether-king" ? node[1].replace(/\n/g, " · ") : null;
        const known =
          effect &&
          [...netherKingFixedAffixes, ...netherKingUltimateAffixes].some(
            (option) => option.name === node[2] && affixSignature(option.effect) === affixSignature(effect),
          );
        if (!known) {
          problems.push(`fixed node ${talentId}`);
          return "";
        }
        return `Nether King: ${node[2]}: ${effect}`;
      });
      const brand = entries(item.EnchantTalentList).map((talentId) => {
        const value = slateTalentAffix(talentId, idMap);
        if (!value) problems.push(`brand node ${talentId}`);
        return value || "";
      });
      while (fixed.length < 2) fixed.push("");
      while (brand.length < 3) brand.push("");
      crafted = {
        id,
        name,
        god: "Nether King",
        shape: "authority",
        rotation: 0,
        flipX: 1,
        flipY: 1,
        affixes: [...fixed, ...brand].filter(Boolean),
        affixGroups: { fixed: fixed.slice(0, 2), brand: brand.slice(0, 3) },
        rarity: "legendary",
        icon: "",
      };
    } else {
      const copyRule = item.InfluenceId ? idMap.slateInfluences[item.InfluenceId] : "";
      if (copyRule && /^Copies/.test(copyRule)) affixes.push(copyRule);
      else
        talentIds.forEach((talentId, index) => {
          const value = slateTalentAffix(talentId, idMap, name === "Pedigree of Gods" ? index : null);
          if (value) affixes.push(value);
          else {
            problems.push(`talent ${talentId}`);
            if (name === "Pedigree of Gods") affixes.push("");
          }
        });
      crafted = {
        id,
        name,
        template: name,
        god: "Goddess of Deception",
        shape: name.startsWith("Sparks") || name.startsWith("When Sparks") ? "single" : "legendary",
        rotation: 0,
        flipX: 1,
        flipY: 1,
        affixes,
        ...(copyRule && /^Copies/.test(copyRule) ? { copyRule } : {}),
        rarity: "legendary",
        icon: "",
      };
    }
    for (const problem of problems)
      add(report, "slates", "unresolved", `${label}: ${problem}`, "no planner talent at that id");
    // Placement from the game's anchor cell. The log leaves Direction out when it is 0 (no dump writes "Direction [0]"),
    // so a missing one is 0, as for god-crafted slates (gameDirectionTurn).
    const shape = legendarySlateShapes[name];
    const turned = gameDirectionTurn(item.Direction) ?? 0;
    const offsets = slateOffsets({ shape }, turned, 1, 1);
    const anchor = offsets[anchorCell(shape)];
    const boardSlate = { ...crafted, shape };
    const { rotation, flipX, flipY, mirrored } = gameSlateOrientation(boardSlate, shape, turned, offsets);
    const placement = {
      column: Math.floor(Number(entry.Index) / 10) - anchor[0],
      row: (Number(entry.Index) % 10) - anchor[1],
      rotation,
      flipX,
      flipY,
    };
    Object.assign(crafted, { rotation, flipX, flipY });
    state.slates.inventory.push(crafted);
    if (mirrored)
      add(
        report,
        "slates",
        "notes",
        `${name}: game direction ${item.Direction} is a quarter turn; the planner flips this slate instead of rotating it, and for its shape that turn is a mirror`,
      );
    const rotationAllowed = rotation === 0 || slateTransformRules(boardSlate).rotate;
    const placeable =
      CALIBRATED_SLATES.has(name) &&
      rotationAllowed &&
      placement.column >= 1 &&
      placement.row >= 1 &&
      canPlaceSlate(boardSlate, placement, placements, boardSlates, lockedSlateCells(state.hero.characterLevel));
    if (placeable) {
      placements[id] = placement;
      boardSlates.push(boardSlate);
      state.equippedSlateIds.push(id);
      add(
        report,
        "slates",
        "imported",
        `${name} at column ${placement.column}, row ${placement.row}${rotation ? `, rotated ${rotation}°` : ""}${mirrored ? ", mirrored" : ""}${affixes.length || isNether ? `: ${crafted.affixes.length} talents` : ""}`,
      );
    } else {
      state.slates.parked[id] = { x: 2, y: Math.min(90, 4 + position * 10), rotation, flipX, flipY };
      add(
        report,
        "slates",
        "unresolved",
        `${name} placement (game cell ${entry.Index}, direction ${item.Direction ?? "none"})`,
        CALIBRATED_SLATES.has(name)
          ? "does not fit the board at the computed cell; parked beside the board"
          : "anchor and rotation not calibrated for this shape; parked beside the board",
      );
    }
  });
  state.slates.placements = placements;
}

// ---------------------------------------------------------------- pacts

// Pact board points (config_contractPoint via idMap.contractPoints: [area, type, level, prerequisite]). A point's level is
// the order it opens in on its pactspirit's board, which is the planner's node order (orderedPactspiritNodes): node index =
// level - 1 for levels 1-11. Levels 12-16 are destiny (fate) slots, which the planner holds as a fate-slot choice instead.
const POINT_RING = { 1: "inner", 2: "mid", 3: "outer", 4: "destiny" };
const POINT_KISMET_KIND = { 1: "micro", 2: "medium" };
const levelRange = (from, to) => (from === to ? `${from}` : `${from}–${to}`);
const levelList = (levels) =>
  levels
    .reduce((runs, level) => {
      const last = runs.at(-1);
      if (last && level === last[1] + 1) last[1] = level;
      else runs.push([level, level]);
      return runs;
    }, [])
    .map(([from, to]) => levelRange(from, to))
    .join(", ");

/** Logged kismet values -> planner rolls (one per "(a–b)" range, in order). Values outside a catalog range are refused. */
export function kismetRollsFromGame(entry, args = []) {
  const controls = kismetRollControls(entry);
  const inRange = (value, control) => value >= control.min - 1e-6 && value <= control.max + 1e-6;
  const fixed = (entry.affixes.join("\n").replace(RANGE, " ").match(NUMBER) || []).map((value) =>
    Math.abs(Number(value)),
  );
  const isFixed = (value) => fixed.some((number) => Math.abs(number - Math.abs(value)) < 1e-6);
  if (!controls.length)
    return args.every(isFixed)
      ? { rolls: [] }
      : { reason: `logged values ${args.join(", ")} differ from the catalog text` };
  for (const pick of args.length >= controls.length ? choose(controls.length, args.length) : []) {
    if (!pick.every((argIndex, index) => inRange(args[argIndex], controls[index]))) continue;
    if (!args.every((value, index) => pick.includes(index) || isFixed(value))) continue;
    return { rolls: pick.map((index) => args[index]) };
  }
  // One logged value for several identical ranges (Kismet: Volcano logs [-25, 1] for its two (-25–-20)% lines and its
  // "+1 Ignite limit"): the value fills each range. The user's hand-entered 54 s build reads the same value on both lines.
  const rolled = args.filter((value) => !isFixed(value) || controls.some((control) => inRange(value, control)));
  const same = controls.every((control) => control.min === controls[0].min && control.max === controls[0].max);
  if (rolled.length === 1 && same) {
    return inRange(rolled[0], controls[0])
      ? { rolls: controls.map(() => rolled[0]), shared: true }
      : { reason: `roll ${rolled[0]} is outside the catalog range (${controls[0].min}–${controls[0].max})` };
  }
  return {
    reason: `logged values ${args.join(", ") || "none"} do not fit the catalog ranges ${controls.map((control) => `(${control.min}–${control.max})`).join(", ")}`,
  };
}

function resolvePactBoard(contract, spirits, idMap, report, state, donors = []) {
  const board = idMap.contractPoints || {};
  const listed = new Map();
  for (const point of entries(contract.pointDatas)) {
    const id = String(point.contractPointId || "");
    if (!id) continue;
    if (!board[id]) {
      add(report, "pacts", "unresolved", `Contract point ${id}`, "not in the game's config_contractPoint table");
      continue;
    }
    listed.set(id, point);
  }
  // Active points: the listed active ones plus their prerequisites (a point cannot be active without its parent).
  const active = new Map(),
    conflicts = new Set();
  const chainBlockedBy = (id) => {
    for (let parent = String(board[id][3]); parent !== "0" && board[parent]; parent = String(board[parent][3]))
      if (listed.has(parent) && listed.get(parent).isActive !== "true") return parent;
    return null;
  };
  const activate = (id) => {
    for (let parent = String(board[id][3]); parent !== "0" && board[parent]; parent = String(board[parent][3])) {
      if (active.has(parent)) continue;
      if (listed.has(parent)) {
        if (!conflicts.has(parent))
          add(
            report,
            "pacts",
            "unresolved",
            `Contract point ${parent}`,
            `listed as inactive, but active point ${id} depends on it; left inactive`,
          );
        conflicts.add(parent);
        break;
      }
      active.set(parent, "implied");
    }
  };
  for (const [id, point] of listed) if (point.isActive === "true") active.set(id, "listed");
  for (const id of [...active.keys()]) activate(id);
  // The 30-entry cut hides some points in every dump. Active points the chosen dump does not list are taken from the
  // same character's other dumps (newest first; src/game-log/game-log-local.js adds dumps from other log files), when the same
  // pactspirit sits in that slot and nothing in the chosen dump contradicts them. This dump's own listing always wins.
  const servantOf = (source) =>
    Object.fromEntries(entries(source?.ContractDatas).map((entry) => [Number(entry.areaId), entry.servantId]));
  const ownServants = servantOf(contract);
  for (const donor of donors) {
    const donorServants = servantOf(donor.tree.ContractInfosV2);
    for (const point of entries(donor.tree.ContractInfosV2?.pointDatas)) {
      const id = String(point.contractPointId || "");
      if (!board[id] || listed.has(id) || point.isActive !== "true") continue;
      const area = board[id][0];
      if (!ownServants[area] || donorServants[area] !== ownServants[area] || chainBlockedBy(id)) continue;
      listed.set(id, { ...point, mergedFrom: donor.stamp });
      if (!active.has(id) || active.get(id) === "implied") active.set(id, "merged");
      activate(id);
    }
  }
  const cut = isCut(contract.pointDatas);
  for (const spirit of spirits) {
    const areaPoints = [...active.keys()]
      .filter((id) => board[id][0] === spirit.area)
      .sort((a, b) => board[a][2] - board[b][2]);
    if (!spirit.planner) {
      if (areaPoints.length)
        add(
          report,
          "pacts",
          "notes",
          `Pactspirit slot ${spirit.area}: ${areaPoints.length} active contract point(s) not imported (${spirit.name || spirit.servantId} is not a planner combat slot)`,
        );
      continue;
    }
    const nodes = orderedPactspiritNodes(pactspiritTrees[spirit.name]);
    const placed = [];
    for (const id of areaPoints) {
      const [, type, level] = board[id];
      if (type === 5) {
        add(
          report,
          "pacts",
          "unresolved",
          `${spirit.name}: destiny slot point ${id} (level ${level})`,
          "the planner holds destiny slots as a fate-slot choice; set it by hand",
        );
        continue;
      }
      const node = nodes[level - 1];
      if (!node || node.ring !== POINT_RING[type]) {
        add(
          report,
          "pacts",
          "unresolved",
          `${spirit.name}: contract point ${id} (level ${level})`,
          `the planner's node ${level} is ${node ? `a ${node.ring} node` : "missing"}, the game's point is ${POINT_RING[type] || `type ${type}`}`,
        );
        continue;
      }
      state.pacts.nativeNodeQuantities[`${spirit.name}:${level - 1}`] = 1;
      placed.push(level);
    }
    const implied = areaPoints.filter((id) => active.get(id) === "implied");
    const merged = areaPoints.filter((id) => active.get(id) === "merged");
    for (const id of merged) filledFrom(report, "pacts", listed.get(id).mergedFrom);
    const mergedFrom = [...new Set(merged.map((id) => timeLabel(listed.get(id).mergedFrom)))];
    const detail = [
      implied.length ? `${implied.length} implied by the board's prerequisites` : "",
      merged.length ? `${merged.length} from the ${mergedFrom.join(", ")} dump${mergedFrom.length > 1 ? "s" : ""}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    if (placed.length)
      add(
        report,
        "pacts",
        "imported",
        `${spirit.name} board: node${placed.length > 1 ? "s" : ""} ${levelList(placed)} of ${nodes.length}${detail ? ` (${detail})` : ""}`,
      );
    // An implied point is active, but no dump says whether it holds a kismet; it counts as its native node.
    const unknownContents = implied.filter((id) => POINT_KISMET_KIND[board[id][1]]).map((id) => board[id][2]);
    if (unknownContents.length)
      add(
        report,
        "pacts",
        "missing",
        `${spirit.name} node${unknownContents.length > 1 ? "s" : ""} ${levelList(unknownContents)}: kismet or native node`,
        "active (a listed point depends on it), but past the 30-entry cut in every dump of this character; imported as the native node",
      );
    const highest = Math.max(0, ...placed);
    if (cut && highest < nodes.length)
      add(
        report,
        "pacts",
        "missing",
        `${spirit.name} board node${highest + 1 < nodes.length ? "s" : ""} ${levelRange(highest + 1, nodes.length)}`,
        "the log lists only 30 contract points; higher nodes may be active but are past the cut in this dump",
      );
  }
  // Kismets sit on active points whose contract is set to the kismet (selectContract 2).
  for (const [id, point] of listed) {
    if (!point.tattoInfo) continue;
    const [area, type, level] = board[id];
    const spirit = spirits.find((entry) => entry.area === area);
    const [name] = idMap.itemBases[point.tattoInfo.BaseId] || [];
    const args = entries(point.Modifiers).flatMap(argsOf);
    const values = args.length ? args : entries(point.tattoInfo.BaseAffix).flatMap(argsOf);
    const label = `${name || `Kismet ${point.tattoInfo.BaseId}`}${values.length ? ` (${values.join(", ")})` : ""} on contract point ${id}`;
    if (point.isActive !== "true" || point.selectContract !== "2") {
      add(
        report,
        "pacts",
        "notes",
        `${label}: not imported (point ${point.isActive === "true" ? "uses its native effect" : "inactive"})`,
      );
      continue;
    }
    if (!spirit?.planner) {
      add(report, "pacts", "notes", `${label}: not imported (pactspirit slot ${area} is not a planner combat slot)`);
      continue;
    }
    const entry = name && kismetCatalog.find((item) => item.name === name);
    if (!entry) {
      add(
        report,
        "pacts",
        "unresolved",
        label,
        name ? "not in the planner's kismet catalog" : "no name for this item id",
      );
      continue;
    }
    if (entry.kind !== POINT_KISMET_KIND[type]) {
      add(
        report,
        "pacts",
        "unresolved",
        label,
        `a ${entry.kind} kismet on a ${POINT_RING[type] || `type ${type}`} point`,
      );
      continue;
    }
    const rolls = kismetRollsFromGame(entry, values);
    if (!rolls.rolls) {
      add(report, "pacts", "unresolved", label, rolls.reason);
      continue;
    }
    state.pacts.kismetSlots[`${spirit.name}:${level - 1}`] = { name: entry.name, rolls: rolls.rolls };
    filledFrom(report, "pacts", point.mergedFrom);
    add(
      report,
      "pacts",
      "imported",
      `${entry.name} on ${spirit.name} node ${level}${rolls.rolls.length ? ` (${rolls.rolls.join(", ")})` : ""}${rolls.shared ? "; one logged value fills its identical ranges" : ""}${point.mergedFrom ? `; from the ${timeLabel(point.mergedFrom)} dump` : ""}`,
    );
  }
}

function resolvePacts(tree, idMap, report, state, pactDonors = []) {
  const contract = tree.ContractInfosV2;
  if (!contract) {
    if (!report.gaps.has("ContractInfosV2"))
      add(
        report,
        "pacts",
        "missing",
        "Pactspirits",
        "the ContractInfosV2 section is not in this dump or another dump of the character",
      );
    return;
  }
  const levels = new Map(entries(tree.ServantInfos?.servantData).map((entry) => [entry.servantId, entry]));
  const spirits = entries(contract.ContractDatas)
    .map((entry) => ({
      area: Number(entry.areaId),
      servantId: entry.servantId,
      name: idMap.servants[entry.servantId],
      planner: false,
    }))
    .sort((a, b) => a.area - b.area);
  let levelRuleUsed = false,
    accountUsed = false;
  for (const spirit of spirits) {
    if (!spirit.name || !pactspiritCatalog.some((entry) => entry.name === spirit.name)) {
      add(
        report,
        "pacts",
        "unresolved",
        `Pactspirit slot ${spirit.area}: ${spirit.name || spirit.servantId}`,
        "not in the planner's pactspirit catalog",
      );
      continue;
    }
    if (spirit.area > 3) {
      add(
        report,
        "pacts",
        "notes",
        `Pactspirit slot ${spirit.area}: ${spirit.name} (drop pactspirit slots are not modeled by the planner)`,
      );
      continue;
    }
    spirit.planner = true;
    state.pacts.selectedSpirits[spirit.area - 1] = spirit.name;
    const owned = levels.get(spirit.servantId);
    if (owned && owned.starLevel != null && Number.isFinite(Number(owned.starLevel))) {
      state.pacts.spiritLevels[spirit.name] = Math.max(1, Math.min(6, Number(owned.starLevel) + 1));
      levelRuleUsed = true;
      if (owned.fromAccount) accountUsed = true;
      filledFrom(report, "pacts", owned.mergedFrom);
      add(
        report,
        "pacts",
        "imported",
        `${spirit.name}: level ${state.pacts.spiritLevels[spirit.name]} (star level ${owned.starLevel}${owned.mergedFrom ? `, from the ${timeLabel(owned.mergedFrom)} dump${owned.fromAccount ? ", same account" : ""}` : ""})`,
      );
    } else {
      add(report, "pacts", "imported", `${spirit.name}`);
      add(
        report,
        "pacts",
        "missing",
        `${spirit.name} level`,
        owned
          ? "the owned-spirit list has this spirit without a star level"
          : "its star level is past the log's 30-entry cut of the owned-spirit list in every dump of this account",
      );
    }
  }
  if (levelRuleUsed) report.provisional.push(PACTSPIRIT_LEVEL_RULE);
  if (accountUsed)
    report.provisional.push(
      "Pactspirit star levels are treated as account-wide (a dump of another character or another log file was used)",
    );
  resolvePactBoard(contract, spirits, idMap, report, state, pactDonors);
}

// ---------------------------------------------------------------- hero

const TRAIT_TIERS = { 1: "level45", 2: "level60", 3: "level75" };
// A memory's RareValue is its quality 1–5 (not the gear / letter item qualities 1 / 2 / 3 / 100 / 110). Evidence: the
// 2026-10-12 fixture's three Ultimate 50 memories log 5; the user's SS14 memories (2026-10-19: two Epic, one Legendary in
// game) log 3, 3, 4 at enhancement 30, 30, 40, the Epic and Legendary caps; the quality digit Q of every memory base-stat
// id (4031 SS Q LL, config_modifier: 5 qualities per stat) equals RareValue. 1 / 2 = Normal / Magic follow that order
// (no logged memory yet; listed as provisional when met).
const MEMORY_RARITY = { 1: "normal", 2: "magic", 3: "epic", 4: "legendary", 5: "ultimate" };
const INFERRED_MEMORY_RARITY = new Set(["1", "2"]);
const MEMORY_RARITY_RULE =
  "Hero Memory quality 1 / 2 read as Normal / Magic (the game's 1–5 quality order; 3 Epic, 4 Legendary and 5 Ultimate are confirmed)";

function memoryAffixLabel(type, kind, text) {
  const pool = heroMemoryAffixes.filter((entry) => entry.type === type && entry.kind === kind);
  const full = pool.filter((entry) => statSignature(entry.effect) === statSignature(text));
  if (full.length === 1) return full[0].effect;
  const firstLine = String(text).split("\n")[0];
  const partial = pool.filter((entry) => statSignature(entry.effect) === statSignature(firstLine));
  return partial.length === 1 ? partial[0].effect : null;
}

/** A memory base-stat id (4031 SS Q LL) -> { memory, text: "+# Intelligence" } from the game's config_modifier table, or null. */
export function memoryBaseStatById(id, idMap) {
  const key = String(id);
  const entry = /^4031\d{5}$/.test(key) ? idMap?.memoryBaseStats?.[key.slice(0, 6)] : null;
  if (!entry || Number(key) < entry[3] || Number(key) > entry[4]) return null;
  return { memory: entry[0], text: entry[1] };
}

function resolveMemoryAffix(affix, type, kind, idMap) {
  const id = String(affix.Id),
    roll = argsOf(affix)[0] ?? null;
  const observed = observedGameAffixIds[id];
  if (observed?.family === "memory" && observed.type === type && observed.kind === kind)
    return { label: observed.label, tier: observed.tier, roll };
  const familyText =
    idMap.affixes[id]?.[0] === "memory"
      ? idMap.affixes[id][1]
      : idMap.affixes[`${id.slice(0, -2)}00`]?.[0] === "memory"
        ? idMap.affixes[`${id.slice(0, -2)}00`][1]
        : null;
  if (!familyText) return { reason: "no text for this id or its tier-0 family" };
  const label = memoryAffixLabel(type, kind, familyText);
  if (!label)
    return { reason: `"${familyText.replace(/\n/g, " / ")}" has no planner ${kind.toLowerCase()} for ${type}` };
  const tier = Number(id.slice(-2));
  if (!(tier >= 0 && tier <= 3)) return { reason: `tier ${tier} out of range` };
  const row = memoryAffixTiers.find(
    (entry) =>
      entry.type === type &&
      entry.kind === kind &&
      entry.tier === tier &&
      statSignature(entry.text) === statSignature(label),
  );
  if (row?.ranges?.length && roll != null && !(roll >= row.ranges[0].min && roll <= row.ranges[0].max))
    return { reason: `roll ${roll} outside the TLIDB T${tier} range` };
  return { label, tier, roll };
}

function resolveHero(tree, idMap, report, state) {
  const player = tree.player || {};
  const purchase = idMap.heroPurchases[player.HeroPurchaseId];
  const hero = purchase && heroCatalog.find((entry) => entry.trait === purchase[1] && purchase[0].includes(entry.name));
  if (player.Level) {
    state.hero.characterLevel = clampLevel(player.Level);
    add(report, "character", "imported", `Level ${state.hero.characterLevel}`);
  }
  if (!hero) {
    if (purchase || !report.gaps.has("player"))
      add(
        report,
        "character",
        purchase ? "unresolved" : "missing",
        purchase ? `Hero ${purchase[0]}` : "Hero",
        purchase
          ? "not in the planner's hero catalog"
          : "the player section is not in this dump or another dump of the character",
      );
    return;
  }
  state.hero.selectedHeroId = hero.id;
  add(report, "character", "imported", `Hero ${hero.name} · ${hero.trait}`);
  const overview = tree.heroCharacterv3OverView;
  const traits = allHeroTraits[hero.id]?.traits || [];
  // A trait-tree hero (packages/engine/src/heroes/hero-trait-tree.js) takes the active traits as its tree picks, in the logged order; the placement
  // rule seats them (pointOverView does not say which memory row each trait sits in).
  const traitTree = heroTraitTree(hero.id);
  let treePicks = [];
  for (const traitId of entries(overview?.pointOverView?.activeId)) {
    const name = idMap.heroTraits[traitId];
    const trait = traits.find((entry) => entry.name === name && entry.level > 1);
    if (!trait) {
      add(
        report,
        "hero",
        "unresolved",
        `Hero trait ${traitId}`,
        name ? `${name} is not a ${hero.trait} trait in the planner` : "no name for this id",
      );
      continue;
    }
    if (traitTree) {
      treePicks.push(trait.name);
      add(report, "hero", "imported", `Trait path: ${trait.name}`);
      continue;
    }
    // The pick goes under its choice group's key (Bing picks two traits per tier, one in each group).
    state.hero.selectedTraits[traitGroupOf(hero.id, trait.level, trait.name)?.selectionKey || `level${trait.level}`] =
      trait.name;
    add(report, "hero", "imported", `Trait Lv ${trait.level}: ${trait.name}`);
  }
  // SS14 logs a tree hero's picks as activated tree nodes instead (treeActivatedNodes, printed beside an empty
  // skillOverView), each with the memory row it sits in (matched_slot 1–4; the base trait has none). 2026-10-22 log, Youga – The Ultimate One: 1320011 / 1320021 / 1320032 in rows 1 / 2 / 3.
  const activatedNodes = entries(overview?.treeActivatedNodes);
  if (traitTree && activatedNodes.length) {
    const nodeNames = new Map((allHeroTraits[hero.id]?.tree?.nodes || []).map((node) => [String(node.id), node.name]));
    const rows = [];
    for (const node of activatedNodes) {
      if (node.matched_slot == null) continue; // the base trait
      const name = nodeNames.get(String(node.node_id)),
        row = Number(node.matched_slot) - 1;
      if (!name || !Number.isInteger(row) || row < 0) {
        add(
          report,
          "hero",
          "unresolved",
          `Hero trait node ${node.node_id}`,
          name ? `memory row ${node.matched_slot} is not one the planner has` : `not a ${hero.trait} tree node`,
        );
        continue;
      }
      rows[row] = name;
      add(report, "hero", "imported", `Trait path: ${name} (row ${row + 1})`);
    }
    treePicks = Array.from(rows, (name) => name || "");
  }
  if (traitTree)
    state.hero.treeTraits = {
      ...(state.hero.treeTraits || {}),
      [hero.id]: treeRules(traitTree, treeMaxCapacity(traitTree)).normalize(treePicks),
    };
  // Neither form in the login (a section the printer cut, or a layout this importer does not know yet): say so rather
  // than import a hero with no traits picked in silence.
  if (overview && !entries(overview.pointOverView?.activeId).length && !activatedNodes.length)
    add(report, "hero", "missing", "Hero trait picks", "not in this login's data; pick them in the Hero Trait tab");
  for (const entry of entries(overview?.reminiscenceOverView?.reminiscence)) {
    if (!entry.detail) continue; // unlocked slot with no memory
    const detail = entry.detail,
      tier = TRAIT_TIERS[entry.index];
    const [type] = idMap.itemBases[detail.BaseId] || [];
    if (!tier || !type || !/^Memory of /.test(type)) {
      add(report, "hero", "unresolved", `Memory in slot ${entry.index}`, "unknown memory type or slot");
      continue;
    }
    const memory = {
      id: `game-log-memory-${entry.index}`,
      name: type,
      type,
      rarity: MEMORY_RARITY[detail.RareValue] || "",
      baseStat: "",
      enhancementLevel: Math.max(1, Math.min(50, Number(detail.ReminiscenceLevel) || 1)),
      waxAndWane: false,
      risingMoon: false,
      revivedAffix: "",
      revivedTier: 1,
      revivedRoll: null,
      fixedAffixes: [],
      randomAffixes: [],
      fixedTiers: [],
      randomTiers: [],
      fixedRolls: [],
      randomRolls: [],
      traitLevelBonus: 0,
    };
    if (!memory.rarity)
      add(
        report,
        "hero",
        "unresolved",
        `${type} rarity (game value ${detail.RareValue})`,
        "only the memory qualities 1–5 are mapped",
      );
    else if (INFERRED_MEMORY_RARITY.has(String(detail.RareValue)) && !report.provisional.includes(MEMORY_RARITY_RULE))
      report.provisional.push(MEMORY_RARITY_RULE);
    const label = `${type} (${tier.replace("level", "Lv ")})`;
    // Base stat: by id (the game's config_modifier table names the stat of every 4031SSQLL id; the Help Manual cache lists a
    // few), else the roll must fit exactly one base stat at this enhancement. The logged value is the enhanced value.
    for (const affix of entries(detail.BaseAttrAffix)) {
      const roll = argsOf(affix)[0];
      const candidates = heroMemoryAffixes.filter((option) => option.type === type && option.kind === "Base Stats");
      const byId = memoryBaseStatById(affix.Id, idMap);
      if (byId && byId.memory !== type) {
        add(
          report,
          "hero",
          "unresolved",
          `${label}: base stat ${affix.Id} = ${roll}`,
          `the game's modifier table gives this id to ${byId.memory}`,
        );
        continue;
      }
      const cached = byId?.text || (idMap.affixes[affix.Id]?.[0] === "memory" ? idMap.affixes[affix.Id][1] : null);
      let match = cached ? candidates.filter((option) => statSignature(option.effect) === statSignature(cached)) : [];
      if (byId && !match.length) {
        add(
          report,
          "hero",
          "unresolved",
          `${label}: base stat ${affix.Id} = ${roll}`,
          `the game names it "${byId.text.replace("#", roll)}", which is not a planner base stat for ${type}`,
        );
        continue;
      }
      if (!match.length)
        match = candidates.filter(
          (option) =>
            Number(
              String(memoryScaledBaseStat(option.effect, type, memory.enhancementLevel, false, memory.rarity)).match(
                /-?\d+(?:\.\d+)?/,
              )?.[0],
            ) === roll,
        );
      if (match.length === 1) {
        memory.baseStat = match[0].effect;
        add(
          report,
          "hero",
          "imported",
          `${label}: base stat ${match[0].effect}${byId ? " (by its game id)" : cached ? "" : " (matched by its value at this enhancement)"}`,
        );
        const planned = Number(
          String(memoryScaledBaseStat(match[0].effect, type, memory.enhancementLevel, false, memory.rarity)).match(
            /-?\d+(?:\.\d+)?/,
          )?.[0],
        );
        if (cached && Number.isFinite(roll) && Number.isFinite(planned) && Math.abs(planned - roll) > 0.05)
          add(
            report,
            "hero",
            "notes",
            `${label}: the game logs ${byId ? byId.text.replace("#", roll) : `${roll}`}; the planner's value for ${match[0].effect} at enhancement ${memory.enhancementLevel} is ${planned}`,
          );
      } else
        add(
          report,
          "hero",
          "unresolved",
          `${label}: base stat ${affix.Id} = ${roll}`,
          match.length
            ? `the value fits ${match.map((option) => option.effect).join(", ")}`
            : "no text for this id and no base stat with this value",
        );
    }
    for (const [group, kind, list] of [
      ["fixed", "Fixed Affix", detail.BaseAffix],
      ["random", "Random Affix", detail.Suffix],
    ]) {
      for (const affix of entries(list)) {
        const resolved = resolveMemoryAffix(affix, type, kind, idMap);
        memory[`${group}Affixes`].push(resolved.label || "");
        memory[`${group}Tiers`].push(
          Number.isInteger(resolved.tier) ? resolved.tier : Number(String(affix.Id).slice(-2)) || 0,
        );
        memory[`${group}Rolls`].push(Number.isFinite(resolved.roll) ? Math.round(resolved.roll) : null);
        if (resolved.label)
          add(
            report,
            "hero",
            "imported",
            `${label}: ${kind.toLowerCase()} ${resolved.label} T${resolved.tier} = ${resolved.roll}`,
          );
        else
          add(
            report,
            "hero",
            "unresolved",
            `${label}: ${kind.toLowerCase()} ${affix.Id}${argsOf(affix).length ? ` = ${argsOf(affix).join(", ")}` : ""}`,
            resolved.reason,
          );
      }
    }
    memory.risingMoon = memory.fixedTiers.includes(0) && memory.fixedAffixes.some(Boolean);
    for (const affix of entries(detail.AwakenAffix)) {
      const revived = memoryRevivalAffixIds[affix.Id];
      if (!revived) {
        add(report, "hero", "unresolved", `${label}: revived affix ${affix.Id}`, "not in the revival table");
        continue;
      }
      memory.revivedAffix = revived.name || normalizeRevivedAffix(revived.text);
      if (!revived.name && revived.tier) memory.revivedTier = Math.max(1, Math.min(3, revived.tier));
      const roll = argsOf(affix)[0];
      if (Number.isFinite(roll)) memory.revivedRoll = Math.round(roll);
      add(report, "hero", "imported", `${label}: revived ${memory.revivedAffix}`);
    }
    state.hero.memoryInventory.push(memory);
    state.hero.equippedMemoryIds[tier] = memory.id;
  }
}

// ---------------------------------------------------------------- import

/** A section filled from a dump logged this many hours before the chosen one is flagged as possibly outdated. */
export const STALE_DUMP_HOURS = 24;
const MERGE_SECTION = {
  player: "character",
  gear: "gear",
  talents: "talents",
  slates: "slates",
  slateInfluence: "slates",
  pacts: "pacts",
  hero: "hero",
};

/**
 * Per report section: { chosen: whether the chosen dump supplied it, from: other dumps' stamps that filled it (newest first),
 * stale: [{ stamp, reason }] for fills logged more than STALE_DUMP_HOURS before the chosen dump or at another character level }.
 */
function sectionSources(report, merged, tree) {
  const chosenStamp = merged.chosen.stamp;
  const levels = new Map(
    [merged.chosen, ...merged.others].map((dump) => [dump.stamp, Number(dump.tree.player?.Level) || null]),
  );
  const chosenLevel = Number(tree.player?.Level) || null;
  const staleReason = (stamp) => {
    if (!chosenStamp || !(stamp < chosenStamp)) return null;
    const hours = (Date.parse(chosenStamp) - Date.parse(stamp)) / 3.6e6;
    if (hours > STALE_DUMP_HOURS) return `logged ${Math.round(hours)} h before the selected login`;
    const level = levels.get(stamp);
    if (level && chosenLevel && level !== chosenLevel)
      return `logged at level ${level}, before a level change (selected login: level ${chosenLevel})`;
    return null;
  };
  return Object.fromEntries(
    Object.keys(report.sections).map((section) => {
      const from = [...(report.filledFrom[section] || [])].sort().reverse();
      return [
        section,
        {
          chosen: !report.replaced[section],
          from,
          stale: from.map((stamp) => ({ stamp, reason: staleReason(stamp) })).filter((entry) => entry.reason),
        },
      ];
    }),
  );
}

// The top-level sections the importer's readers expect, per report section: [report section, label, present(tree),
// effect when absent, expected(tree) (default: always)]. The log printer loses them in two ways:
// - cut: it replaces the section whole with "+<section>+..." (a dump with 31 table-valued sections loses the 31st in hash
//   order; research/game-log-import-2026-10-12.md §2). Before 2026-10-15 the import listed nothing: a Selena login whose
//   bag was cut imported with no gear, so its skills fell short of Energy and lost their skill levels from gear.
// - dropped: past that table it leaves out every further table entirely, key included (research/followers/
//   game-log-follower-import-2026-10-19.md, "corrected top-level cut"; both dumps of the 2026-10-19 session had no
//   geniusInfos, so the import arrived without talents and said nothing specific).
// Either is reported only when no other dump of the character filled the section (mergeDumps).
const LOG_SECTION_PARTS = {
  player: [["character", "Hero and character level", (tree) => tree.player]],
  bag: [
    [
      "gear",
      "Equipped gear",
      (tree) => tree.bag?.wearItems,
      "the build has no gear Energy (skills may show as short of Energy) and no skill levels from gear",
    ],
    ["slates", "Equipped slates", (tree) => tree.bag?.dressingTalentBlocks],
  ],
  geniusInfos: [["talents", "Talent trees", (tree) => tree.geniusInfos, "the build has no talents"]],
  skillLayout: [["skills", "Skill board layout", (tree) => tree.skillLayout]],
  skills: [["skills", "Skill list", (tree) => tree.skills]],
  // Slate influence exists only with equipped slates (the fixture's Iris login has neither).
  talentBlockInfluence: [
    [
      "slates",
      "Slate influence",
      (tree) => tree.talentBlockInfluence,
      null,
      (tree) => entries(tree.bag?.dressingTalentBlocks).length > 0,
    ],
  ],
  SkillSlot: [["skills", "Skill slot list", (tree) => tree.SkillSlot]],
  ContractInfosV2: [["pacts", "Pact board", (tree) => tree.ContractInfosV2]],
  ServantInfos: [["pacts", "Pactspirit star levels", (tree) => tree.ServantInfos]],
  heroCharacterv3OverView: [["hero", "Hero traits and memories", (tree) => tree.heroCharacterv3OverView]],
};
/** Every top-level section the importer reads (the keys of KEPT_SECTIONS). */
export const EXPECTED_LOG_SECTIONS = Object.keys(LOG_SECTION_PARTS);
const CUT_SECTION_REASON =
  "the game's log printer cut this part of the login's data (it keeps 30 top-level sections) and no other login of this character in the logs has it; restart the game, log in to the character and import again";
const DROPPED_SECTION_PREFIX = "Not in the game log: ";
const DROPPED_SECTION_REASON =
  "the game's log printer dropped it; log out and back in, then import again. Past about 30 top-level sections the printer leaves the rest out entirely, key included, and no other login of this character in the logs has this one";
/**
 * Reports the chosen dump's cut ("...") and dropped (absent) sections that merging did not fill; records their top-level
 * keys in report.gaps (resolver dedupe, removed before return) and { label, kind } in report.logGaps (the dialog's top warning).
 */
function reportSectionGaps(report, { cutSections = [], droppedSections = [] }, tree) {
  const gaps = [
    ...cutSections.map((section) => [section, "cut"]),
    ...droppedSections.filter((section) => !cutSections.includes(section)).map((section) => [section, "dropped"]),
  ];
  for (const [section, kind] of gaps)
    for (const [reportSection, label, present, effect, expected] of LOG_SECTION_PARTS[section] || []) {
      if (present(tree) || (expected && !expected(tree))) continue;
      const reason = kind === "cut" ? CUT_SECTION_REASON : DROPPED_SECTION_REASON;
      add(
        report,
        reportSection,
        "missing",
        kind === "cut" ? label : `${DROPPED_SECTION_PREFIX}${label}`,
        effect ? `${reason}. Without it ${effect}` : reason,
      );
      report.gaps.add(section);
      report.logGaps.push({ label, kind });
    }
}

/** Builds a planner state from one dump (merged with the character's other dumps). Returns { state, report }. */
export function importSnapshot(scan, dumpId, idMap, { merge = true } = {}) {
  if (!idMap) throw new Error("The game id map is required (loadGameIdMap())");
  const merged = mergeDumps(scan, dumpId);
  const tree = merge ? merged.tree : structuredClone(merged.chosen.tree);
  const others = merge ? merged.others : [];
  const report = newReport();
  if (merge) report.merges.push(...merged.merges.map(({ section, from, detail }) => ({ section, from, detail })));
  for (const { section, from } of report.merges) {
    filledFrom(report, MERGE_SECTION[section], from);
    if (section !== "slateInfluence") report.replaced[MERGE_SECTION[section]] = true;
  }
  reportSectionGaps(report, merged.chosen, tree);
  const state = structuredClone(defaultPlannerState);
  resolveHero(tree, idMap, report, state);
  const gear = resolveGear(tree, idMap, report);
  state.equipmentInventory = gear.inventory;
  state.equipmentOverrides = gear.overrides;
  state.disabledEquipmentSlots = state.disabledEquipmentSlots.filter((slot) => !gear.overrides[slot]);
  resolveTalents(tree, idMap, report, state);
  resolveSkills(tree, others, idMap, report, state);
  resolveSlates(tree, idMap, report, state);
  // The character's other dumps in merge order (older first), then point listings attached from other log files.
  const pactDonors = merge
    ? [
        ...others,
        ...(scan.pointDonors || [])
          .filter((dump) => dump.character === merged.chosen.character)
          .sort((a, b) => (a.stamp < b.stamp ? 1 : -1)),
      ].filter((dump) => dump.tree.ContractInfosV2)
    : [];
  resolvePacts(tree, idMap, report, state, pactDonors);
  validatePlannerState(state);
  const normalized = normalizePlannerState(state);
  validatePlannerState(normalized);
  const player = tree.player || {};
  const purchase = idMap.heroPurchases[player.HeroPurchaseId];
  report.source = {
    stamp: merged.chosen.stamp,
    hero: purchase ? purchase[0] : null,
    level: player.Level ? Number(player.Level) : null,
    changesAfter: merged.chosen.changesAfter,
    attributeSnapshotAfter: merged.chosen.attributeSnapshotAfter,
  };
  if (merged.chosen.changesAfter)
    report.sections.character.notes.push({
      item: `${merged.chosen.changesAfter} gear, skill or slate change(s) were logged after this snapshot; the game only dumps the build at login, so re-log in to refresh it`,
    });
  report.sources = sectionSources(report, merged, tree);
  delete report.filledFrom;
  delete report.replaced;
  delete report.gaps;
  report.counts = Object.fromEntries(
    Object.entries(report.sections).map(([section, value]) => [
      section,
      { imported: value.imported.length, unresolved: value.unresolved.length, missing: value.missing.length },
    ]),
  );
  return { state: normalized, report };
}

/** Plain-text summary for the build notes (kept under the 10,000-character notes limit). */
export function importReportText(report) {
  const lines = [
    `Imported from UE_game.log (snapshot ${timeLabel(report.source?.stamp)}). The log was read locally and not stored.`,
  ];
  for (const [section, value] of Object.entries(report.sections)) {
    if (!value.unresolved.length && !value.missing.length && !value.notes.length) continue;
    lines.push("", `${section[0].toUpperCase()}${section.slice(1)}: ${value.imported.length} imported`);
    for (const entry of value.unresolved)
      lines.push(`- not imported: ${entry.item}${entry.reason ? ` (${entry.reason})` : ""}`);
    for (const entry of value.missing)
      lines.push(`- missing: ${entry.item}${entry.reason ? ` (${entry.reason})` : ""}`);
    for (const entry of value.notes) lines.push(`- note: ${entry.item}`);
  }
  for (const notice of report.notices || []) lines.push("", notice);
  if (report.provisional.length) lines.push("", "Provisional:", ...report.provisional.map((text) => `- ${text}`));
  for (const merge of report.merges) lines.push(`- merged: ${merge.detail}`);
  for (const [section, source] of Object.entries(report.sources || {}))
    for (const entry of source.stale)
      lines.push(
        `- ${section} filled from the ${timeLabel(entry.stamp)} dump: from an older login; may be outdated (${entry.reason})`,
      );
  const text = lines.join("\n");
  return text.length > 9500 ? `${text.slice(0, 9480)}\n… (report cut)` : text;
}

/** Scans a log and imports its newest dump (or the dump given by id). Convenience for scripts and tests. */
export async function importGameLog(text, { dumpId = null, idMap = null, merge = true } = {}) {
  const map = idMap || (await loadGameIdMap());
  const scan = scanGameLog(text);
  if (!scan.dumps.length) throw new Error("No character data found in this log");
  const chosen = dumpId || [...scan.dumps].sort((a, b) => (a.stamp < b.stamp ? 1 : -1))[0].id;
  return { scan, ...importSnapshot(scan, chosen, map, { merge }) };
}
