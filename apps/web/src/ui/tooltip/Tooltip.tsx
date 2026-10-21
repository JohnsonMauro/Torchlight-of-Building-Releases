import {
  cloneElement,
  useRef,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { hideTooltip, hideTooltipSoon, hoversQuiet, showTooltip, tooltipShownFor } from "./tooltip-store";

/** The handlers <Tooltip> adds to its child (and calls the child's own after). */
interface AnchorHandlers {
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

interface TooltipProps {
  /** What the tooltip shows; built only when it opens. */
  content: () => ReactNode;
  /** The frame's kind classes (tooltip-classes.ts). */
  kind?: string;
  /** The pointer may move into the tooltip (a long breakdown to scroll). */
  sticky?: boolean;
  /**
   * A help button: a click, tap or Enter toggles the tooltip (a mouse click only opens it, as hovering already did), and
   * a touch never opens it by hovering.
   */
  toggle?: boolean;
  children: ReactElement<AnchorHandlers>;
}

/**
 * Shows `content` in the page's tooltip (TooltipHost) while its one child is hovered or focused. The child keeps its
 * own handlers; these run first.
 */
export function Tooltip({ content, kind = "", sticky = false, toggle = false, children }: TooltipProps) {
  const openAtPointerDown = useRef<boolean | null>(null);
  const own = children.props;
  const show = (anchor: HTMLElement, x: number, y: number) =>
    showTooltip({ anchor, content: content(), kind, x, y, sticky });
  const showBeside = (anchor: HTMLElement) => {
    const box = anchor.getBoundingClientRect();
    show(anchor, box.right, box.top);
  };
  const handlers: AnchorHandlers = {
    onPointerEnter(event) {
      if (!(toggle && event.pointerType === "touch") && !hoversQuiet())
        show(event.currentTarget, event.clientX, event.clientY);
      own.onPointerEnter?.(event);
    },
    onPointerLeave(event) {
      if (!(toggle && event.pointerType === "touch")) {
        if (sticky) hideTooltipSoon(event.currentTarget);
        else hideTooltip(event.currentTarget);
      }
      own.onPointerLeave?.(event);
    },
    onFocus(event) {
      showBeside(event.currentTarget);
      own.onFocus?.(event);
    },
    onBlur(event) {
      hideTooltip(event.currentTarget);
      own.onBlur?.(event);
    },
  };
  if (toggle) {
    handlers.onPointerDown = (event) => {
      openAtPointerDown.current = event.pointerType !== "mouse" && tooltipShownFor(event.currentTarget);
      own.onPointerDown?.(event);
    };
    handlers.onClick = (event) => {
      event.preventDefault();
      const open = openAtPointerDown.current ?? tooltipShownFor(event.currentTarget);
      openAtPointerDown.current = null;
      if (open) hideTooltip(event.currentTarget);
      else showBeside(event.currentTarget);
      own.onClick?.(event);
    };
  }
  return cloneElement(children, handlers);
}
