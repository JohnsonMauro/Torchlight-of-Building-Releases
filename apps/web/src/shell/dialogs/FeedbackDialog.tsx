// The feedback dialog behind "Report calculation issue", "Report bug" and "Submit an answer": an editable issue Title,
// then the GitHub form's fields (src/app/feedback/feedback-forms.js). The logic is the pure model's
// (src/app/feedback/feedback-dialog-model.js): the title follows its default ("[Bug] <Area>: ") until the player edits
// it, required fields validate on leaving them (selects on change, or all on Send), what was typed is kept as a draft
// in localStorage when the dialog closes, and "Send to GitHub" opens the pre-filled issue form in a new tab, copying the
// build code (or the full report when a field had to be trimmed) when it does not fit the URL. The desktop app hands
// https links to the system browser (electron/main.cjs setWindowOpenHandler). No network here.
// The planner opens it with a form and its context (the "feedback" source; `session` goes up at every opening).
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import {
  AUTO_FIELD_IDS,
  BUILD_CODE_FIELD,
  TITLE_FIELD,
  clearDraft,
  defaultIssueTitle,
  dialogHeading,
  draftKeyFor,
  draftValues,
  feedbackForm,
  feedbackSubmission,
  missingRequired,
  prefillValues,
  readDraft,
  saveDraft,
  sendToast,
} from "@legacy/app/feedback/feedback-dialog-model.js";
import { compactBuildCode } from "@legacy/engine/state/build-code-compact.js";
import { normalizePercentageText } from "@legacy/engine/text/percentage-text.js";
import { useViewSource } from "../../ui/use-view-source";

const NOTE = "GitHub opens with everything filled in. Click Create to post it publicly (free GitHub account needed).";
const fieldDomId = (id: string) => `feedback-field-${id}`;
// The legacy dialog printed every text through escapeHtml, which also closes "N %" gaps.
const text = (value: unknown) => normalizePercentageText(String(value ?? ""));
const safeStorage = () => {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
};
interface FormField {
  id: string;
  type: string;
  label: string;
  description: string;
  placeholder: string;
  options: readonly string[];
  required: boolean;
}
type Values = Record<string, string>;
type FeedbackContext = Record<string, unknown> & { buildCode?: string };

function Star({ required }: { required: boolean }) {
  return required ? (
    <span className="feedback-required" aria-hidden="true">
      *
    </span>
  ) : null;
}

function FeedbackForm({
  formKey,
  context,
  dialog,
}: {
  formKey: string;
  context: FeedbackContext;
  dialog: React.RefObject<HTMLDialogElement | null>;
}) {
  const form = feedbackForm(formKey) as { fields: readonly FormField[] };
  const storage = useMemo(() => safeStorage(), []);
  const prefilled = useMemo(() => prefillValues(formKey, context) as Values, [formKey, context]);
  const draftKey = draftKeyFor(formKey, context);
  const buildCode = String(context.buildCode || "");
  // The compact code (src/engine/state/build-code-compact.js) is prepared now so Send opens the tab without waiting on it.
  const compactCode = useMemo(
    () =>
      buildCode
        ? Promise.resolve()
            .then(() => compactBuildCode(buildCode))
            .catch(() => "")
        : Promise.resolve(""),
    [buildCode],
  );
  // What the fields start with: the pre-fills, then the draft (a choice no longer offered starts empty).
  const [initial] = useState(() => {
    const draft = readDraft(storage, draftKey);
    const start: Values = { ...prefilled, ...(draft?.values || {}) };
    for (const field of form.fields)
      if (field.type === "dropdown" && !field.options.includes(start[field.id])) start[field.id] = "";
    return {
      values: start,
      includeCode: Boolean(draft?.includeBuildCode),
      titleEdited: Boolean(draft?.values?.[TITLE_FIELD]),
    };
  });
  const inputIds = [
    TITLE_FIELD,
    ...form.fields
      .filter((field) => !AUTO_FIELD_IDS.includes(field.id) && field.id !== BUILD_CODE_FIELD)
      .map((f) => f.id),
  ];
  const [inputs, setInputs] = useState<Values>(() =>
    Object.fromEntries(inputIds.map((id) => [id, String(initial.values[id] ?? "")])),
  );
  const [includeCode, setIncludeCode] = useState(initial.includeCode);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [copyLabel, setCopyLabel] = useState("Copy");
  const state = useRef({
    titleEdited: initial.titleEdited,
    touched: new Set<string>(),
    sendAttempted: false,
    done: false,
    copyTimer: 0 as ReturnType<typeof setTimeout> | 0,
  });
  const valuesOf = (fields: Values) => ({ ...prefilled, ...fields });
  const optionsOf = (include: boolean) => ({ buildCode, includeBuildCode: include });
  const missing = missingRequired(formKey, valuesOf(inputs), optionsOf(includeCode)) as string[];

  const persist = (fields: Values, include: boolean) =>
    saveDraft(storage, draftKey, {
      values: draftValues(formKey, valuesOf(fields), prefilled, context),
      includeBuildCode: formKey === "calculation" ? false : include,
    });
  // A shown error goes away once its field is filled.
  const settleErrors = (fields: Values, include: boolean) => {
    const stillMissing = missingRequired(formKey, valuesOf(fields), optionsOf(include)) as string[];
    setErrors((shown) =>
      Object.fromEntries(Object.entries(shown).map(([id, on]) => [id, on && stillMissing.includes(id)])),
    );
  };
  // A field typed in: an unedited title follows its default (the bug form's Area, the calculation form's Skill).
  function edit(id: string, value: string, { touched = true } = {}) {
    let fields = { ...inputs, [id]: value };
    if (id === TITLE_FIELD)
      state.current.titleEdited = value.trim() !== defaultIssueTitle(formKey, valuesOf(fields), context).trim();
    else if (!state.current.titleEdited)
      fields = { ...fields, [TITLE_FIELD]: defaultIssueTitle(formKey, valuesOf(fields), context) };
    if (touched) state.current.touched.add(id);
    setInputs(fields);
    settleErrors(fields, includeCode);
    persist(fields, includeCode);
    return fields;
  }
  function validate(id: string, fields = inputs) {
    const field = id === TITLE_FIELD ? { required: true } : form.fields.find((entry) => entry.id === id);
    if (!field?.required) return;
    setErrors((shown) => ({ ...shown, [id]: !String(fields[id] || "").trim() }));
  }
  function close() {
    if (!state.current.done) persist(inputs, includeCode);
    state.current.done = true;
    if (dialog.current?.open) dialog.current.close();
  }
  async function send() {
    state.current.sendAttempted = true;
    if (missing.length) {
      setErrors((shown) => ({ ...shown, ...Object.fromEntries(missing.map((id) => [id, true])) }));
      dialog.current?.querySelector<HTMLElement>(`#${fieldDomId(missing[0])}`)?.focus();
      return;
    }
    const formValues = valuesOf(inputs),
      options = optionsOf(includeCode),
      compact = await compactCode;
    if (state.current.done) return;
    const submission = feedbackSubmission(formKey, formValues, { ...options, compactCode: compact, context });
    let copied = true;
    if (submission.copyText) {
      try {
        await navigator.clipboard.writeText(submission.copyText);
      } catch {
        copied = false;
      }
    }
    window.open(submission.url, "_blank", "noopener,noreferrer");
    clearDraft(storage, draftKey);
    state.current.done = true;
    if (dialog.current?.open) dialog.current.close();
    plannerCommands().showToast(sendToast(submission.copyKind, copied));
  }
  // The toast sits under the modal dialog, so the button itself says what happened (as "Copy questions" does).
  function copyCode() {
    const label = (value: string) => {
      setCopyLabel(value);
      clearTimeout(state.current.copyTimer || undefined);
      state.current.copyTimer = setTimeout(() => setCopyLabel("Copy"), 1600);
    };
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(buildCode))
      .then(
        () => label("Copied"),
        () => label("Copy failed"),
      );
  }
  // Esc (the dialog's cancel event) closes and keeps the draft.
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    element.addEventListener("cancel", onCancel);
    return () => element.removeEventListener("cancel", onCancel);
  });
  // Opened: the first editable field has the focus and the form starts at its top.
  useLayoutEffect(() => {
    dialog.current?.querySelector<HTMLElement>("[data-feedback-input]:not([readonly])")?.focus({ preventScroll: true });
    const body = dialog.current?.querySelector(".feedback-body");
    if (body) body.scrollTop = 0;
  }, [dialog]);

  const control = (field: FormField) => {
    const id = fieldDomId(field.id),
      describedBy = [field.description ? `${id}-help` : "", field.required ? `${id}-error` : ""]
        .filter(Boolean)
        .join(" "),
      common = {
        id,
        name: field.id,
        "data-feedback-input": field.id,
        ...(field.required ? { required: true, "aria-required": true } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(field.placeholder ? { placeholder: text(field.placeholder) } : {}),
        ...(field.id in errors ? { "aria-invalid": errors[field.id] } : {}),
        value: inputs[field.id],
      };
    const leave = () => {
      // Text fields validate on blur only once typed in or after a Send attempt, so tabbing through an empty form stays quiet.
      if (state.current.touched.has(field.id) || state.current.sendAttempted) validate(field.id);
    };
    if (field.type === "dropdown")
      return (
        <select
          className="planner-select"
          {...common}
          data-native-select=""
          onChange={(event) => validate(field.id, edit(field.id, event.target.value))}
        >
          <option value="">Select…</option>
          {field.options.map((option) => (
            // The option's value is its text, as in the legacy markup.
            <option key={option}>{text(option)}</option>
          ))}
        </select>
      );
    if (field.type === "textarea")
      return (
        <textarea
          {...common}
          rows={Math.min(6, Math.max(3, String(initial.values[field.id] ?? "").split("\n").length))}
          onChange={(event) => edit(field.id, event.target.value)}
          onBlur={leave}
        />
      );
    return <input type="text" {...common} onChange={(event) => edit(field.id, event.target.value)} onBlur={leave} />;
  };
  const errorLine = (id: string) => (
    <p className="feedback-error" id={`${fieldDomId(id)}-error`} hidden={!errors[id]}>
      This field is required.
    </p>
  );
  const auto = form.fields.filter((field) => AUTO_FIELD_IDS.includes(field.id));
  const titleId = fieldDomId(TITLE_FIELD);
  return (
    <>
      <header>
        <h2 id="feedback-dialog-title">{text(dialogHeading(formKey, context))}</h2>
        <button type="button" className="feedback-close" data-feedback-close="" aria-label="Close" onClick={close}>
          ×
        </button>
      </header>
      <section className="feedback-body">
        <div className="feedback-field" data-feedback-field={TITLE_FIELD}>
          <label htmlFor={titleId}>
            {"Title "}
            <Star required />
          </label>
          <input
            type="text"
            id={titleId}
            name={TITLE_FIELD}
            data-feedback-input={TITLE_FIELD}
            required
            aria-required="true"
            aria-describedby={`${titleId}-error`}
            {...(TITLE_FIELD in errors ? { "aria-invalid": errors[TITLE_FIELD] } : {})}
            value={inputs[TITLE_FIELD]}
            onChange={(event) => edit(TITLE_FIELD, event.target.value)}
            onBlur={() => {
              if (state.current.touched.has(TITLE_FIELD) || state.current.sendAttempted) validate(TITLE_FIELD);
            }}
          />
          {errorLine(TITLE_FIELD)}
        </div>
        {form.fields
          .filter((field) => !AUTO_FIELD_IDS.includes(field.id))
          .map((field) => {
            const id = fieldDomId(field.id),
              label = text(field.label);
            if (field.id === BUILD_CODE_FIELD)
              return formKey === "calculation" ? (
                <div key={field.id} className="feedback-field" data-feedback-field={field.id}>
                  <label htmlFor={id}>
                    {field.required ? `${label} ` : label}
                    <Star required={field.required} />
                  </label>
                  <div className="feedback-code-row">
                    <textarea id={id} rows={3} readOnly data-feedback-build-code="" value={text(buildCode)} />
                    <button type="button" data-feedback-copy-code="" onClick={copyCode}>
                      {copyLabel}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={field.id} className="feedback-field" data-feedback-field={field.id}>
                  <label className="feedback-check">
                    <input
                      type="checkbox"
                      data-feedback-include-code=""
                      checked={includeCode}
                      disabled={!buildCode}
                      onChange={(event) => {
                        setIncludeCode(event.target.checked);
                        settleErrors(inputs, event.target.checked);
                        persist(inputs, event.target.checked);
                      }}
                    />
                    {" Include my build code"}
                  </label>
                </div>
              );
            return (
              <div key={field.id} className="feedback-field" data-feedback-field={field.id}>
                <label htmlFor={id}>
                  {field.required ? `${label} ` : label}
                  <Star required={field.required} />
                </label>
                {field.description ? (
                  <p className="feedback-help" id={`${id}-help`}>
                    {text(field.description)}
                  </p>
                ) : null}
                {control(field)}
                {field.required ? errorLine(field.id) : null}
              </div>
            );
          })}
        {auto.length ? (
          <div className="feedback-auto">
            <p>Included automatically</p>
            <dl>
              {auto.map((field) => (
                <div key={field.id}>
                  <dt>{text(field.label)}</dt>
                  <dd data-feedback-auto={field.id}>{text(initial.values[field.id] || "—")}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>
      <p className="feedback-note">{NOTE}</p>
      <div className="feedback-actions">
        <button type="button" data-feedback-cancel="" onClick={close}>
          Cancel
        </button>
        <button
          type="button"
          className="feedback-send"
          data-feedback-send=""
          disabled={missing.length > 0}
          onClick={send}
        >
          Send to GitHub
        </button>
      </div>
    </>
  );
}

// Enter does not submit from a text field; Tab and Shift+Tab stay within the dialog.
function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
  const target = event.target as HTMLElement;
  if (event.key === "Enter" && target.matches("input[type=text]")) {
    event.preventDefault();
    return;
  }
  if (event.key !== "Tab") return;
  const list = [...event.currentTarget.querySelectorAll<HTMLElement>("button, input, select, textarea")].filter(
    (el) => !(el as HTMLButtonElement).disabled && !el.hidden && el.offsetParent !== null,
  );
  if (!list.length) return;
  const first = list[0],
    last = list[list.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function FeedbackDialog() {
  const view = useViewSource("feedback");
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <dialog
      id="feedback-dialog"
      ref={dialog}
      className="reset-build-confirm import-build-dialog feedback-dialog"
      aria-labelledby="feedback-dialog-title"
      onKeyDown={trapFocus}
    >
      {view?.formKey ? (
        <FeedbackForm key={view.session} formKey={view.formKey} context={view.context} dialog={dialog} />
      ) : null}
    </dialog>
  );
}
