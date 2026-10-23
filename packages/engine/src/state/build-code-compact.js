// Compact build codes: Import still reads them (src/app/builds/build-library-controller.js), though the planner no
// longer writes any (they were made for the feedback dialog's GitHub issue URLs, removed 2026-10-22). Export writes the
// original code (base64url of the state JSON, packages/engine/src/state/planner-state.ts encodePlannerState).
//   "TLB2:" + base64url(raw DEFLATE of the export JSON).
//   "TLB3:" + base64url(raw DEFLATE of the packed JSON). The state was packed losslessly before deflating:
//     1. Strings: every string (value or key) that is in the frozen table packages/engine/data/build-code-dictionary-v3.js became
//        "~" + its index in base 36; any other string that started with "~" got one more "~" in front. So "~" followed
//        by base-36 digits is always a table entry, "~~…" is an escaped string, and a lone "~" never comes from data.
//     2. Equipped items: an equipmentOverrides[slot] whose sourceInventoryId named an equipmentInventory item became
//        { "~": [inventory index, changed or added fields, removed keys, key order] } (trailing parts left out; the key
//        order only when the fields' default order — the item's own order, then added keys — differs).
//   Packing was verified when a code was made, so expandBuildCode returns the original Export code, byte for byte
//   (tests/unit/build-code-compact.test.js).
//   expandBuildCode(text)    compact code → the original code; any other text comes back trimmed

const COMPACT_BUILD_CODE_PREFIX = "TLB3:";
const LEGACY_COMPACT_BUILD_CODE_PREFIX = "TLB2:";
const COMPACT_BUILD_CODE_PREFIXES = Object.freeze([COMPACT_BUILD_CODE_PREFIX, LEGACY_COMPACT_BUILD_CODE_PREFIX]);
const MAX_COMPACT_LENGTH = 250000;
const MAX_EXPANDED_BYTES = 4 * 1024 * 1024;
const TOKEN = "~";
const MARKER = "~";

/** "TLB3", "TLB2" or "" for the (trimmed) text's compact version. */
function compactCodeVersion(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  const prefix = COMPACT_BUILD_CODE_PREFIXES.find((item) => trimmed.startsWith(item));
  return prefix ? prefix.slice(0, -1) : "";
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(text) {
  const clean = String(text).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9_+/=-]*$/.test(clean)) throw new TypeError("Invalid build code characters");
  const padded = clean.replaceAll("-", "+").replaceAll("_", "/").replace(/=+$/, "");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

const utf8Decode = (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const utf8Encode = (text) => new TextEncoder().encode(text);

async function throughStream(Stream, bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new Stream("deflate-raw"));
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_EXPANDED_BYTES) {
      await reader.cancel();
      throw new TypeError("Build code expands too far");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// CompressionStream "deflate-raw" (browsers, Electron, Node 21.2+); node:zlib where the stream lacks the format.
function streamSupports(Stream) {
  try {
    new Stream("deflate-raw");
    return true;
  } catch {
    return false;
  }
}
async function inflateRaw(bytes) {
  if (streamSupports(globalThis.DecompressionStream)) {
    try {
      return await throughStream(globalThis.DecompressionStream, bytes);
    } catch {
      throw new TypeError("That build code could not be decompressed");
    }
  }
  const zlib = await import("node:zlib");
  try {
    return new Uint8Array(zlib.inflateRawSync(bytes, { maxOutputLength: MAX_EXPANDED_BYTES }));
  } catch {
    throw new TypeError("That build code could not be decompressed");
  }
}

// ---- The string table (packages/engine/data/build-code-dictionary-v3.js) ----

function tableFromJson(json, expectedCount) {
  const list = JSON.parse(json);
  if (!Array.isArray(list) || list.length !== expectedCount || !list.every((item) => typeof item === "string"))
    throw new TypeError("Build code dictionary is damaged");
  return Object.freeze({ list, index: new Map(list.map((item, i) => [item, i])) });
}

let tablePromise = null;
/** The TLB3 string table (inflated once). */
function loadBuildCodeTable() {
  tablePromise ||= (async () => {
    const { BUILD_CODE_DICTIONARY_V3: dictionary } = await import("../../data/build-code-dictionary-v3.js");
    return tableFromJson(utf8Decode(await inflateRaw(base64UrlToBytes(dictionary.deflated))), dictionary.count);
  })().catch((error) => {
    tablePromise = null;
    throw error;
  });
  return tablePromise;
}

// ---- Packing (pure) ----

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function packString(table, text) {
  const index = table.index.get(text);
  if (index !== undefined) return `${TOKEN}${index.toString(36)}`;
  return text.startsWith(TOKEN) ? `${TOKEN}${text}` : text;
}

function unpackString(table, text) {
  if (!text.startsWith(TOKEN)) return text;
  if (text[1] === TOKEN) return text.slice(1);
  if (!/^~[0-9a-z]+$/.test(text)) throw new TypeError("Invalid build code string");
  const entry = table.list[parseInt(text.slice(1), 36)];
  if (entry === undefined) throw new TypeError("Invalid build code string");
  return entry;
}

// Object.fromEntries defines own properties, so a "__proto__" key stays an ordinary key.
function mapStrings(value, map) {
  if (typeof value === "string") return map(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, map));
  if (isPlainObject(value))
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [map(key), mapStrings(item, map)]));
  return value;
}

function applyItemDiff(base, set, removed, order) {
  const value = (key) => (Object.hasOwn(set, key) ? set[key] : base[key]);
  if (order) return Object.fromEntries(order.map((key) => [key, value(key)]));
  const gone = new Set(removed);
  const entries = Object.keys(base)
    .filter((key) => !gone.has(key))
    .map((key) => [key, value(key)]);
  for (const key of Object.keys(set)) if (!Object.hasOwn(base, key)) entries.push([key, set[key]]);
  return Object.fromEntries(entries);
}

const keysFor = (table) => ({
  overrides: packString(table, "equipmentOverrides"),
  inventory: packString(table, "equipmentInventory"),
  source: packString(table, "sourceInventoryId"),
  id: packString(table, "id"),
});

const isReference = (value) => isPlainObject(value) && Object.keys(value).length === 1 && Array.isArray(value[MARKER]);

/** The state object for a packed one. */
function unpackBuildState(packed, table) {
  if (!isPlainObject(packed)) throw new TypeError("Invalid build code state");
  const keys = keysFor(table);
  const overrides = packed[keys.overrides];
  const inventory = packed[keys.inventory];
  if (isPlainObject(overrides)) {
    for (const slot of Object.keys(overrides)) {
      if (!isReference(overrides[slot])) continue;
      const [index, set = {}, removed = [], order = null] = overrides[slot][MARKER];
      const base = Array.isArray(inventory) && Number.isInteger(index) ? inventory[index] : undefined;
      if (
        !isPlainObject(base) ||
        !isPlainObject(set) ||
        !Array.isArray(removed) ||
        !(order === null || Array.isArray(order))
      )
        throw new TypeError("Invalid build code item reference");
      overrides[slot] = applyItemDiff(base, set, removed, order);
    }
  }
  return mapStrings(packed, (text) => unpackString(table, text));
}

/** The export JSON text for a packed JSON text. */
function unpackBuildJson(packedJson, table) {
  return JSON.stringify(unpackBuildState(JSON.parse(packedJson), table));
}

// ---- Codes ----

function compactBody(trimmed, prefix) {
  const body = trimmed.slice(prefix.length);
  if (!body || body.length > MAX_COMPACT_LENGTH) throw new TypeError("Invalid or oversized build code");
  return base64UrlToBytes(body);
}

function originalCode(version, inflated, table) {
  const text = utf8Decode(inflated);
  if (version === "TLB2") return bytesToBase64Url(inflated);
  let json;
  try {
    json = unpackBuildJson(text, table);
  } catch {
    throw new TypeError("That build code could not be read");
  }
  const bytes = utf8Encode(json);
  if (bytes.length > MAX_EXPANDED_BYTES) throw new TypeError("Build code expands too far");
  return bytesToBase64Url(bytes);
}

/**
 * The original build code for a compact one (exactly what Export wrote for that state); other text is returned trimmed,
 * so the result can go straight to src/app/storage/build-library.ts importBuildCode / packages/engine/src/state/planner-state.ts decodePlannerState.
 */
export async function expandBuildCode(text) {
  const trimmed = String(text ?? "").trim();
  const version = compactCodeVersion(trimmed);
  if (!version) return trimmed;
  const inflated = await inflateRaw(compactBody(trimmed, `${version}:`));
  return originalCode(version, inflated, version === "TLB3" ? await loadBuildCodeTable() : null);
}
