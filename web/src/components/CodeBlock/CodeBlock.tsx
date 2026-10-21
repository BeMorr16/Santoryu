import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "../Button/Button.tsx";
import type { IconName } from "../Icon/registry.ts";
import { cx } from "../shared/cx.ts";
import { Typography } from "../Typography/Typography.tsx";
import { VisuallyHidden } from "../VisuallyHidden/VisuallyHidden.tsx";
import styles from "./CodeBlock.module.css";

export interface CodeBlockOwnProps {
  /** The code, as plain text. One leading and one trailing line break are trimmed (refinement R15.1). */
  children: string;
  /** What the code is (a language, a file name or a purpose). Names the block; no interactive content. */
  label: ReactNode;
  /** Sets class="language-<language>" on the code. No highlighting (refinement R15.3). */
  language?: string | undefined;
  /** Wrap long lines instead of scrolling. Default false (refinement R15.4). */
  wrap?: boolean | undefined;
  /** Show the "Copy code" button. Default true (refinement R15.6). */
  copy?: boolean | undefined;
  /** Number each line in a gutter at the start. Decorative: never copied or announced. Default true. */
  lineNumbers?: boolean | undefined;
}

export type CodeBlockProps = CodeBlockOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof CodeBlockOwnProps>;

/** How long the check icon and the "Copied" message stay (refinement R15.6): a behavior constant. */
export const COPY_RESET_MS = 2000;

const messages = { idle: "", copied: "Copied", failed: "Couldn't copy" } as const;
const icons = { idle: "copy", copied: "check", failed: "warning" } as const satisfies Record<
  keyof typeof messages,
  IconName
>;

/** Drops one leading and one trailing line break, so a template literal can sit on its own lines. */
export function trimCode(code: string): string {
  return code.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
}

/**
 * A labelled code sample whose long lines scroll inside it (refinement R15). While it overflows,
 * the `pre` is a focusable group named by the label, since Safari doesn't make scrolling boxes
 * keyboard-focusable (R15.5).
 */
export function CodeBlock({
  children,
  label,
  language,
  wrap = false,
  copy = true,
  lineNumbers = true,
  className,
  ...rest
}: CodeBlockProps) {
  const code = trimCode(children);
  const lines = code.split("\n");
  const labelId = useId();
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  // Prerendered as focusable, so the block is reachable before it can be measured (R15.5).
  const [measured, setMeasured] = useState(!wrap);
  const focusable = !wrap && measured;
  const [status, setStatus] = useState<keyof typeof messages>("idle");
  const resetTimer = useRef<number>(undefined);

  // The pre follows its container; the code (max-content wide) follows its longest line through
  // text zoom, the web font loading and new children.
  useEffect(() => {
    const pre = preRef.current;
    const codeElement = codeRef.current;
    if (wrap || !pre || !codeElement) return;
    // A focused block keeps its Tab stop until blur, so focus never drops to the body.
    const measure = () => {
      setMeasured(pre.scrollWidth > pre.clientWidth || document.activeElement === pre);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(pre);
    observer.observe(codeElement);
    pre.addEventListener("blur", measure);
    return () => {
      observer.disconnect();
      pre.removeEventListener("blur", measure);
    };
  }, [wrap, code]);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyCode() {
    window.clearTimeout(resetTimer.current);
    // Emptied first, so a second press announces "Copied" again.
    flushSync(() => {
      setStatus("idle");
    });
    try {
      await navigator.clipboard.writeText(code);
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
    <div {...rest} className={cx(styles.root, className)}>
      <div className={styles.header}>
        <Typography as="span" variant="small" id={labelId} className={styles.label}>
          {label}
        </Typography>
        {copy && (
          <span className={styles.actions}>
            {/* Shown for sighted users; the status below announces it (refinement R15.6). */}
            {status === "failed" && (
              <Typography as="span" variant="small" aria-hidden="true" className={styles.failure}>
                {messages.failed}
              </Typography>
            )}
            <Button
              variant="ghost"
              size="sm"
              iconStart={icons[status]}
              aria-label="Copy code"
              onClick={() => void copyCode()}
            />
            <VisuallyHidden role="status">{messages[status]}</VisuallyHidden>
          </span>
        )}
      </div>
      <pre
        ref={preRef}
        className={cx(styles.pre, wrap && styles.wrap, lineNumbers && styles.numbered)}
        {...(focusable && { tabIndex: 0, role: "group", "aria-labelledby": labelId })}
      >
        <code ref={codeRef} className={cx(styles.code, language && `language-${language}`)}>
          {lines.map((line, index) => (
            // Lines have no identity beyond their position, and only change all together.
            <span key={index} className={styles.line}>
              <span className={styles.text}>{index < lines.length - 1 ? `${line}\n` : line}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
