// Ctrl+F (Cmd+F on macOS) find bar: searches the visible page text, highlights every match with
// <mark class="find-hit"> and the current one with .find-hit.current. Mainly for the desktop
// (Electron) build, which has no browser find; the browser uses the same bar so the behaviour
// matches and it survives the planner's frequent re-renders (a MutationObserver re-runs the
// search while the bar is open, keeping the current match index when it still exists).
//
// Electron's native webContents.findInPage was tried (2026-10-15, Electron 44) and is not used:
// it also matches the find bar's own <input> value and takes focus out of the input, and
// re-focusing the input restarts every "find next" at the first match.

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "SVG",
  "CANVAS",
  "IFRAME",
]);
const TYPE_DEBOUNCE_MS = 120;
const RERENDER_DEBOUNCE_MS = 150;

const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive, non-overlapping matches of `query` in `text`, as [start, end) pairs in order. */
export function findMatches(text, query) {
  const source = String(text ?? "");
  const needle = String(query ?? "");
  if (!needle || !source) return [];
  const pattern = new RegExp(escapeRegExp(needle), "giu");
  const ranges = [];
  for (const match of source.matchAll(pattern)) {
    if (!match[0]) break;
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

/**
 * Matches over a list of text segments (one per text node, in document order). Each match keeps
 * its segment index; the result is in document order (segment, then offset).
 */
export function findMatchesInSegments(segments, query) {
  const matches = [];
  (segments || []).forEach((segment, segmentIndex) => {
    for (const [start, end] of findMatches(segment, query)) matches.push({ segment: segmentIndex, start, end });
  });
  return matches;
}

/** The next (+1) or previous (-1) match index, wrapping at both ends. -1 when there are no matches. */
export function stepMatchIndex(current, count, direction = 1) {
  if (!(count > 0)) return -1;
  if (!(current >= 0 && current < count)) return direction < 0 ? count - 1 : 0;
  return (((current + (direction < 0 ? -1 : 1)) % count) + count) % count;
}

/** After a re-run (re-render), keep the previous index when it still exists, else the last match. */
export function keepMatchIndex(previous, count) {
  if (!(count > 0)) return -1;
  if (!(previous >= 0)) return 0;
  return Math.min(previous, count - 1);
}

/** Counter text: "3 / 12", "0 / 0" for no matches, empty with no query. */
export function matchCounterText(index, count, query) {
  if (!query) return "";
  return count > 0 ? `${index + 1} / ${count}` : "0 / 0";
}

/** True for Ctrl+F (Cmd+F on macOS), without Alt. */
export function isFindShortcut(event) {
  return Boolean(
    event && (event.ctrlKey || event.metaKey) && !event.altKey && String(event.key || "").toLowerCase() === "f",
  );
}

// The bar: a raised slate box with a gold top edge, fixed at the right under the header (its top is set on opening).
const BAR_CLASS =
  "find-bar fixed top-18.5 right-4 z-150 flex items-center gap-1.5 rounded-md border border-t-2 border-line border-t-gold bg-raised px-2 py-1.5 text-sm/[normal] text-text shadow-[0_8px_24px_rgb(0_0_0/0.5)]";
const INPUT_CLASS =
  "find-bar-input h-7 w-55 rounded-[5px] border border-[#465363] bg-[linear-gradient(180deg,#151f2b,#0b1219)] px-2 text-[0.82rem] text-text focus:border-[#e78136] focus:outline-none max-[480px]:w-36";
const COUNT_CLASS = "find-bar-count min-w-11.5 text-center text-[0.74rem] whitespace-nowrap text-muted";
const BUTTON_CLASS =
  "find-bar-button inline-grid size-6.5 cursor-pointer place-items-center rounded-[5px] border border-[#465363] bg-[#0c1219] leading-none font-bold text-muted hover:border-gold hover:text-gold focus-visible:border-gold focus-visible:text-gold focus-visible:outline-none";
// A match: an ember wash; the current one solid gold.
const HIT_CLASS =
  "find-hit rounded-[2px] bg-[rgb(240_154_66/0.35)] text-inherit [&.current]:bg-gold [&.current]:text-[#10141b]";

function barMarkup() {
  return (
    `<input type="text" class="${INPUT_CLASS}" aria-label="Find on page" placeholder="Find" spellcheck="false" autocomplete="off">` +
    `<span class="${COUNT_CLASS}" aria-live="polite"></span>` +
    `<button type="button" class="${BUTTON_CLASS} text-[0.85rem]" data-find-step="-1" aria-label="Previous match" title="Previous match (Shift+Enter)">&#8593;</button>` +
    `<button type="button" class="${BUTTON_CLASS} text-[0.85rem]" data-find-step="1" aria-label="Next match" title="Next match (Enter)">&#8595;</button>` +
    `<button type="button" class="${BUTTON_CLASS} find-bar-close text-[1.05rem]" data-find-close aria-label="Close find bar" title="Close (Esc)">&times;</button>`
  );
}

/** Installs the find bar on `doc` once. Returns the controller (open / close / search) for tests. */
export function installFindBar(doc = globalThis.document) {
  if (!doc?.body) return null;
  if (doc.__tliFindBar) return doc.__tliFindBar;
  const win = doc.defaultView || globalThis;

  const bar = doc.createElement("div");
  bar.className = BAR_CLASS;
  bar.setAttribute("role", "search");
  bar.hidden = true;
  bar.innerHTML = barMarkup();
  doc.body.appendChild(bar);
  const input = bar.querySelector(".find-bar-input");
  const counter = bar.querySelector(".find-bar-count");

  let marks = [];
  let index = -1;
  let query = "";
  let typeTimer = 0;
  let rerenderTimer = 0;
  let observer = null;

  const visibleCache = new Map();
  function elementVisible(element) {
    if (visibleCache.has(element)) return visibleCache.get(element);
    let visible;
    if (typeof element.checkVisibility === "function") {
      visible = element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
        opacityProperty: true,
        visibilityProperty: true,
      });
    } else {
      const style = win.getComputedStyle(element);
      visible = element.getClientRects().length > 0 && style.visibility !== "hidden" && style.opacity !== "0";
    }
    visibleCache.set(element, visible);
    return visible;
  }

  function textNodes() {
    visibleCache.clear();
    const nodes = [];
    const walker = doc.createTreeWalker(doc.body, win.NodeFilter.SHOW_ELEMENT | win.NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1) {
          if (node === bar || SKIP_TAGS.has(node.tagName.toUpperCase()) || node.hidden)
            return win.NodeFilter.FILTER_REJECT;
          return win.NodeFilter.FILTER_SKIP;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) return win.NodeFilter.FILTER_SKIP;
        return node.parentElement && elementVisible(node.parentElement)
          ? win.NodeFilter.FILTER_ACCEPT
          : win.NodeFilter.FILTER_SKIP;
      },
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
    return nodes;
  }

  // Our own DOM edits must not wake the re-render observer.
  function quietly(edit) {
    observer?.disconnect();
    try {
      edit();
    } finally {
      observer?.takeRecords?.();
      if (!bar.hidden) watch();
    }
  }

  function clearMarks() {
    if (!marks.length) return;
    const parents = new Set();
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (!parent) continue;
      parent.replaceChild(doc.createTextNode(mark.textContent), mark);
      parents.add(parent);
    }
    for (const parent of parents) parent.normalize();
    marks = [];
  }

  function highlight(text) {
    const nodes = textNodes();
    const found = findMatchesInSegments(
      nodes.map((node) => node.nodeValue),
      text,
    );
    const created = [];
    // Wrap from the end of each node backwards so earlier offsets stay valid.
    for (let i = found.length - 1; i >= 0; i--) {
      const { segment, start, end } = found[i];
      const node = nodes[segment];
      const range = doc.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      const mark = doc.createElement("mark");
      mark.className = HIT_CLASS;
      range.surroundContents(mark);
      created.push(mark);
    }
    return created.reverse();
  }

  function render(scroll) {
    marks.forEach((mark, i) => mark.classList.toggle("current", i === index));
    counter.textContent = matchCounterText(index, marks.length, query);
    if (scroll && marks[index]) marks[index].scrollIntoView({ block: "center", inline: "nearest" });
  }

  function search({ keepIndex = false, scroll = true } = {}) {
    const previous = index;
    quietly(() => {
      clearMarks();
      marks = query ? highlight(query) : [];
    });
    index = keepIndex ? keepMatchIndex(previous, marks.length) : marks.length ? 0 : -1;
    render(scroll);
  }

  function step(direction) {
    if (input.value !== query) {
      clearTimeout(typeTimer);
      query = input.value;
      search();
    }
    if (!marks.length) return;
    index = stepMatchIndex(index, marks.length, direction);
    render(true);
  }

  function watch() {
    if (!observer && win.MutationObserver) {
      observer = new win.MutationObserver((records) => {
        if (bar.hidden || !query) return;
        if (records.every((record) => bar.contains(record.target))) return;
        clearTimeout(rerenderTimer);
        rerenderTimer = setTimeout(() => {
          if (!bar.hidden && query) search({ keepIndex: true, scroll: false });
        }, RERENDER_DEBOUNCE_MS);
      });
    }
    observer?.observe(doc.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });
  }

  function placeBelowHeader() {
    const header = doc.querySelector(".site-header");
    const bottom = header ? header.getBoundingClientRect().bottom : 0;
    bar.style.top = `${Math.max(8, Math.round(bottom) + 8)}px`;
  }

  function open() {
    const wasHidden = bar.hidden;
    bar.hidden = false;
    placeBelowHeader();
    input.focus();
    input.select();
    if (wasHidden) {
      watch();
      if (input.value) {
        query = input.value;
        search();
      }
    }
  }

  function close() {
    clearTimeout(typeTimer);
    clearTimeout(rerenderTimer);
    observer?.disconnect();
    bar.hidden = true;
    clearMarks();
    index = -1;
    counter.textContent = "";
  }

  input.addEventListener("input", () => {
    clearTimeout(typeTimer);
    typeTimer = setTimeout(() => {
      query = input.value;
      search();
    }, TYPE_DEBOUNCE_MS);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.hasAttribute("data-find-close")) close();
    else step(Number(button.dataset.findStep) || 1);
    if (!bar.hidden) input.focus();
  });
  bar.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && event.target !== input) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });
  win.addEventListener(
    "keydown",
    (event) => {
      if (!isFindShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      open();
    },
    true,
  );

  const controller = {
    open,
    close,
    search: () => search(),
    get matchCount() {
      return marks.length;
    },
    get currentIndex() {
      return index;
    },
  };
  doc.__tliFindBar = controller;
  return controller;
}
