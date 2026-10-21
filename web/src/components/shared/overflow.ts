import { useEffect, useState, type RefObject } from "react";

/**
 * Whether a scroller should be a Tab stop (refinement R15.5, R16.6): true before hydration, then
 * while it overflows sideways or has focus. Watches the scroller (its container) and its content
 * (whose width follows the content) with one ResizeObserver, and measures again on blur.
 */
export function useOverflowFocus(
  scroller: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  enabled = true,
): boolean {
  // Prerendered as focusable, so the scroller is reachable before it can be measured.
  const [measured, setMeasured] = useState(enabled);

  useEffect(() => {
    const scrollerElement = scroller.current;
    const contentElement = content.current;
    if (!enabled || !scrollerElement || !contentElement) return;
    // A focused scroller keeps its Tab stop until blur, so focus never drops to the body.
    const measure = () => {
      setMeasured(
        scrollerElement.scrollWidth > scrollerElement.clientWidth ||
          document.activeElement === scrollerElement,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(scrollerElement);
    observer.observe(contentElement);
    scrollerElement.addEventListener("blur", measure);
    return () => {
      observer.disconnect();
      scrollerElement.removeEventListener("blur", measure);
    };
  }, [scroller, content, enabled]);

  return enabled && measured;
}
