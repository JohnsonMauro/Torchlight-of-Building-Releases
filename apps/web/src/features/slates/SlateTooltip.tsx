import type { SlateAffixText, SlateAffixView, SlateTooltipView } from "@legacy/app/bridge/slate-tooltip-view.ts";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { useAltHeld } from "../../ui/use-alt-held";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import * as classes from "./slate-tooltip-classes";
import { KeywordText } from "../../ui/KeywordText";

/** A slate's tooltip (`id`), on the board or in the Slate Inventory: the planner's slateTooltip query. */
export function SlateTooltip({ id, children }: { id: string; children: TooltipAnchor }) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().slateTooltip(id);
        return view ? { body: <SlateCard view={view} />, kind: classes.FRAME } : null;
      }}
    >
      {children}
    </Tooltip>
  );
}

/** A slate's card (its tooltip, and a damage path source naming it). */
export function SlateCard({ view }: { view: SlateTooltipView }) {
  const { rotation, flipX, flipY } = view.pose;
  return (
    <>
      <div className={`${classes.HEAD} ${view.family}`}>
        {view.icon ? (
          <img
            className={classes.ICON}
            src={view.icon}
            alt=""
            style={{ transform: `scale(${flipX},${flipY}) rotate(${rotation}deg)` }}
          />
        ) : null}
        <div>
          <strong className={classes.TITLE}>{view.name}</strong>
          <small className={classes.KICKER}>{view.kicker}</small>
        </div>
      </div>
      {view.judgment ? <div className={classes.JUDGMENT}>Judgment · Affix effect +70%</div> : null}
      <div className={classes.PREVIEW}>
        {view.groups.length ? (
          view.groups.map((group) => (
            <section key={group.title} className={classes.SECTION}>
              <h3 className={classes.HEADING}>{group.title}</h3>
              <ul className={classes.LIST}>
                {group.affixes.map((affix, index) => (
                  <SlateAffix key={index} affix={affix} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className={classes.EMPTY}>{view.empty}</p>
        )}
        {view.copied ? (
          <section className={classes.COPIED}>
            <h3 className={classes.COPIED_HEADING}>Copied affixes</h3>
            {view.copied.affixes.length ? (
              <ul className={classes.COPIED_LIST}>
                {view.copied.affixes.map((affix, index) => (
                  <li key={index} className={classes.COPIED_AFFIX}>
                    <div className={classes.COPIED_META}>
                      <small className={classes.COPIED_SOURCE}>{affix.source}</small>
                      <strong className={classes.COPIED_BADGE}>Copied</strong>
                    </div>
                    <span className={classes.COPIED_TEXT}>
                      <AffixText text={affix.text} />
                    </span>
                    <CoverageBadge coverage={affix.coverage} className="justify-self-start px-1.5 py-0.5" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs">{view.copied.empty}</p>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}

/** An affix as the game shows it: its node type's diamond, then the effect (a core: its name, its effect under Alt). */
function SlateAffix({ affix }: { affix: SlateAffixView }) {
  const altHeld = useAltHeld();
  return (
    <li className={classes.AFFIX}>
      <span className={classes.DIAMOND} data-kind={affix.kind || undefined} title={affix.origin || undefined} />
      <div className="min-w-0">
        {affix.core ? (
          <>
            <span className={classes.CORE_NAME}>
              <AffixText text={affix.core} />
            </span>
            {altHeld ? (
              <span className={classes.CORE_DETAIL}>
                <AffixText text={affix.text} />
              </span>
            ) : (
              <small className={classes.CORE_HINT}>Hold Alt for the core's effect</small>
            )}
          </>
        ) : (
          <span className={classes.EFFECT}>
            <AffixText text={affix.text} />
          </span>
        )}
        <div className={classes.BADGES}>
          {affix.limited ? (
            <strong
              className={classes.LIMIT_BADGE}
              title="Only one copy of this effect is active across equipped slates"
            >
              Max active: 1
            </strong>
          ) : null}
          <CoverageBadge coverage={affix.coverage} />
        </div>
      </div>
    </li>
  );
}

function AffixText({ text }: { text: SlateAffixText }) {
  return (
    <>
      {text.tree ? <b className={`${classes.TREE} ${text.family}`}>{text.tree}</b> : null}
      <KeywordText text={text.rest} />
    </>
  );
}
