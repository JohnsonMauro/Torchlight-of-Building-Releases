import { HELP_FOOTER, type HelpTopic } from "./help-topics";

const KEY =
  "rounded-sm border border-line-strong bg-raised px-1.5 py-px text-[10px] font-bold tracking-wide whitespace-nowrap text-accent uppercase";

/** A section's controls: each action with what it does, and the controls that work anywhere. */
export function HelpTooltip({ topic }: { topic: HelpTopic }) {
  return (
    <>
      <strong className="block text-sm font-bold text-accent">Controls · {topic.title}</strong>
      <ul className="mt-1.5 grid gap-1">
        {topic.items.map((item) => (
          <li key={`${item.action} ${item.text}`} className="grid grid-cols-[auto_1fr] items-start gap-2">
            <kbd className={KEY}>{item.action}</kbd>
            <span className="text-xs/snug text-text">{item.text}</span>
          </li>
        ))}
      </ul>
      <small className="mt-2.5 block border-t border-line pt-2 text-xs/snug text-dim">{HELP_FOOTER}</small>
    </>
  );
}
