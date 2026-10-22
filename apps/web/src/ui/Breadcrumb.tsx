/** A step of a breadcrumb: the steps taken open again on a click; the last one, where the user stands, does not. */
export interface BreadcrumbStep {
  label: string;
  onSelect?: () => void;
}

/**
 * Where a picker or a form stands (the equipment and prism crafters): each step taken opens it again. It sits above the
 * column's scrolling content (CraftColumn), so it never scrolls away.
 */
export function Breadcrumb({ label, steps }: { label: string; steps: BreadcrumbStep[] }) {
  return (
    <nav aria-label={label} data-craft-path="">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {steps.map(({ label: stepLabel, onSelect }, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index ? <span aria-hidden="true">›</span> : null}
            {onSelect ? (
              <button
                type="button"
                className="cursor-pointer rounded-sm text-info underline-offset-2 hover:underline"
                onClick={onSelect}
              >
                {stepLabel}
              </button>
            ) : (
              <span className="font-bold text-text" aria-current="step">
                {stepLabel}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
