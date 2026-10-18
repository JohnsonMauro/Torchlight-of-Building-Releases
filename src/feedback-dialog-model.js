import { FEEDBACK_FORMS } from "./feedback-forms.js";
import { issueFormUrlInfo, plannerFiguresText } from "./feedback-links.js";

// The feedback dialog's logic (pure; no DOM): what each form pre-fills, which fields are required and missing, the
// GitHub URL it sends (src/feedback-links.js issueFormUrlInfo, 6000-character cap), what goes on the clipboard, and the
// unsent drafts kept in localStorage under FEEDBACK_DRAFTS_KEY only (never the build library keys).
// The build code never goes in the URL: when it is included it is copied to the clipboard on Send. When a long field
// still had to be trimmed, the full report text (build code included) is copied instead, so nothing is lost.

export const FEEDBACK_DRAFTS_KEY = "tlib.feedbackDrafts";
/** Context fields shown read-only under "Included automatically" instead of as inputs. */
export const AUTO_FIELD_IDS = Object.freeze(["question_id", "app_version", "platform"]);
export const BUILD_CODE_FIELD = "build_code";

export const feedbackForm = (key) => FEEDBACK_FORMS[key] || null;
const blank = (value) => !String(value ?? "").trim();

/**
 * The fields a form fills in, as the direct URLs did. context: { skill, hero, figures } (calculation),
 * { area } (bug), { entry } (answer: an open-question registry entry), plus { version, platform }.
 */
export function prefillValues(formKey, context = {}) {
  const { version = "", platform = "" } = context;
  if (formKey === "calculation") {
    return { skill: context.skill || "", hero: context.hero || "", planner_figures: plannerFiguresText(context.figures || {}), app_version: version, platform };
  }
  if (formKey === "bug") {
    const areas = feedbackForm("bug").fields.find((field) => field.id === "area").options;
    return { area: areas.includes(context.area) ? context.area : "", app_version: version, platform };
  }
  if (formKey === "answer") {
    const entry = context.entry || {};
    return { question_id: entry.id || "", question: entry.question || "", planner_now: entry.current || "", app_version: version };
  }
  return {};
}

/** The dialog heading: the calculation and bug names, or "Answer: <question title>". */
export function dialogHeading(formKey, context = {}) {
  const form = feedbackForm(formKey);
  if (formKey === "answer") return `Answer: ${context.entry?.title || ""}`.trim();
  return form?.dialogTitle || "";
}

/** The issue title after the form's prefix, as the direct URLs set it. */
export function issueTitle(formKey, values = {}, context = {}) {
  if (formKey === "calculation") return `${String(values.skill || "").trim() || "Skill"} – `;
  if (formKey === "answer") return context.entry?.title || "";
  return "";
}

/** Whether the build code goes with the report: always on the calculation form (when there is one), opt-in elsewhere. */
export function buildCodeIncluded(formKey, { buildCode = "", includeBuildCode = false } = {}) {
  if (blank(buildCode)) return false;
  return formKey === "calculation" ? true : Boolean(includeBuildCode);
}

/** Ids of required fields that are still empty (the build code counts as filled when it is included). */
export function missingRequired(formKey, values = {}, options = {}) {
  const form = feedbackForm(formKey);
  if (!form) return [];
  return form.fields.filter((field) => field.required).filter((field) => (field.id === BUILD_CODE_FIELD ? !buildCodeIncluded(formKey, options) : blank(values[field.id]))).map((field) => field.id);
}

/** The whole report as plain text ("### Label" sections, as GitHub renders the issue), with the build code when included. */
export function fullReportText(formKey, values = {}, options = {}) {
  const form = feedbackForm(formKey);
  const title = `${form.titlePrefix}${options.title ?? ""}`.trim();
  const sections = [title];
  for (const field of form.fields) {
    const value = field.id === BUILD_CODE_FIELD ? (buildCodeIncluded(formKey, options) ? options.buildCode : "") : values[field.id];
    if (blank(value)) continue;
    sections.push(`### ${field.label}\n\n${String(value).trim()}`);
  }
  return `${sections.join("\n\n")}\n`;
}

/**
 * What Send does: { url, trimmed, copyText, copyKind } where copyKind is "code" (the build code), "full" (the full
 * report text because a field was trimmed) or "" (nothing to copy). The URL carries the title and every field in schema
 * order except the build code; text areas (and the answer title) may be trimmed to fit the cap.
 * options: { title, buildCode, includeBuildCode, repo, max }.
 */
export function feedbackSubmission(formKey, values = {}, options = {}) {
  const form = feedbackForm(formKey);
  const title = options.title ?? issueTitle(formKey, values, options);
  const fields = [["title", title, { prefix: form.titlePrefix, trim: formKey === "answer" }]];
  for (const field of form.fields) {
    if (field.id === BUILD_CODE_FIELD) continue;
    const value = field.type === "dropdown" && !field.options.includes(values[field.id]) ? "" : values[field.id];
    fields.push([field.id, String(value ?? "").trim(), { trim: field.type === "textarea" }]);
  }
  const { url, trimmed } = issueFormUrlInfo(form.template, fields, { repo: options.repo, max: options.max });
  const withCode = buildCodeIncluded(formKey, options);
  if (trimmed.length) return { url, trimmed, copyKind: "full", copyText: fullReportText(formKey, values, { ...options, title }) };
  if (withCode) return { url, trimmed, copyKind: "code", copyText: String(options.buildCode) };
  return { url, trimmed, copyKind: "", copyText: "" };
}

/** The toast after Send, by what was copied and whether the clipboard worked. */
export function sendToast(copyKind, copied) {
  if (!copyKind) return "GitHub opened in your browser";
  if (!copied) return "GitHub opened. The clipboard was unavailable: use Export and paste your build code into Build code";
  if (copyKind === "full") return "GitHub opened. Some text was too long for the link: the full report is on your clipboard";
  return "GitHub opened. Paste your build code into Build code";
}

// ---- Drafts: { [draftKey]: { values, includeBuildCode } } under FEEDBACK_DRAFTS_KEY. Every access is guarded. ----

/** "calculation", "bug", or "answer:<question id>" (an answer draft belongs to its question). */
export function draftKeyFor(formKey, context = {}) {
  return formKey === "answer" ? `answer:${context.entry?.id || ""}` : formKey;
}

/** The values worth keeping: the fields the player types (not non-empty pre-fills, automatic fields or the build code). */
export function draftValues(formKey, values = {}, prefilled = {}) {
  const form = feedbackForm(formKey);
  const out = {};
  for (const field of form?.fields || []) {
    if (field.id === BUILD_CODE_FIELD || AUTO_FIELD_IDS.includes(field.id) || !blank(prefilled[field.id])) continue;
    if (!blank(values[field.id])) out[field.id] = String(values[field.id]);
  }
  return out;
}

function readAll(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(FEEDBACK_DRAFTS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
function writeAll(storage, drafts) {
  try {
    if (Object.keys(drafts).length) storage?.setItem(FEEDBACK_DRAFTS_KEY, JSON.stringify(drafts));
    else storage?.removeItem(FEEDBACK_DRAFTS_KEY);
    return true;
  } catch { return false; }
}

/** The saved draft for a key ({ values, includeBuildCode }) or null. */
export function readDraft(storage, draftKey) {
  const draft = readAll(storage)[draftKey];
  if (!draft || typeof draft !== "object") return null;
  const values = draft.values && typeof draft.values === "object" ? Object.fromEntries(Object.entries(draft.values).filter(([, value]) => typeof value === "string")) : {};
  return { values, includeBuildCode: Boolean(draft.includeBuildCode) };
}

/** Saves (or, when empty, removes) one draft; other drafts and other storage keys are untouched. */
export function saveDraft(storage, draftKey, { values = {}, includeBuildCode = false } = {}) {
  const drafts = readAll(storage);
  if (Object.keys(values).length || includeBuildCode) drafts[draftKey] = { values, includeBuildCode: Boolean(includeBuildCode) };
  else delete drafts[draftKey];
  return writeAll(storage, drafts);
}

export function clearDraft(storage, draftKey) {
  const drafts = readAll(storage);
  if (!(draftKey in drafts)) return true;
  delete drafts[draftKey];
  return writeAll(storage, drafts);
}
