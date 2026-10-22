import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "../Button/Button.tsx";
import type { IconName } from "../Icon/registry.ts";
import { Typography } from "../Typography/Typography.tsx";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";

/** How long the check icon and the "Copied" message stay (refinement R15.6): a behavior constant. */
export const COPY_RESET_MS = 2000;

const messages = { idle: "", copied: "Copied", failed: "Couldn't copy" } as const;
const icons = { idle: "copy", copied: "check", failed: "warning" } as const satisfies Record<
  keyof typeof messages,
  IconName
>;

/**
 * An icon-only button that copies `text`, then shows and announces the result (refinement R15.6).
 * Internal: CodeBlock and the token tables use it (ds-tokens R8.1). It has no styles of its own,
 * so each user sets the wrapper's layout and the failure text's color.
 */
export function CopyButton({
  text,
  label,
  className,
  failureClassName,
}: {
  text: string;
  /** The button's accessible name and tooltip, e.g. "Copy code". */
  label: string;
  className?: string | undefined;
  failureClassName?: string | undefined;
}) {
  const [status, setStatus] = useState<keyof typeof messages>("idle");
  const resetTimer = useRef<number>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copy() {
    window.clearTimeout(resetTimer.current);
    // Emptied first, so a second press announces "Copied" again.
    flushSync(() => {
      setStatus("idle");
    });
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    // Again, for a press that started while this one waited on the clipboard.
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setStatus("idle");
    }, COPY_RESET_MS);
  }

  return (
    <span className={className}>
      {/* Shown for sighted users; the status below announces it. */}
      {status === "failed" && (
        <Typography as="span" variant="small" aria-hidden="true" className={failureClassName}>
          {messages.failed}
        </Typography>
      )}
      <Button
        variant="ghost"
        size="sm"
        iconStart={icons[status]}
        aria-label={label}
        onClick={() => void copy()}
      />
      <VisuallyHidden role="status">{messages[status]}</VisuallyHidden>
    </span>
  );
}
