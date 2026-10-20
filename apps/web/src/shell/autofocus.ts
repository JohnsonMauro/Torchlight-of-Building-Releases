/**
 * Writes the HTML `autofocus` attribute. React's `autoFocus` only calls focus() on mount and never sets the attribute,
 * but `dialog.showModal()` focuses the descendant that carries it.
 */
export function setAutofocusAttribute(element: HTMLElement | null): void {
  element?.setAttribute("autofocus", "");
}
