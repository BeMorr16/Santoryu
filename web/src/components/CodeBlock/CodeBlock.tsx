import { useId, useRef, type ComponentPropsWithRef, type ReactNode } from "react";
import { CopyButton } from "../shared/CopyButton.tsx";
import { cx } from "../shared/cx.ts";
import { useOverflowFocus } from "../shared/overflow.ts";
import { Typography } from "../Typography/Typography.tsx";
import styles from "./CodeBlock.module.css";

export { COPY_RESET_MS } from "../shared/CopyButton.tsx";

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
  // The pre follows its container; the code (max-content wide) follows its longest line through
  // text zoom, the web font loading and new children (R15.5).
  const focusable = useOverflowFocus(preRef, codeRef, !wrap);

  return (
    <div {...rest} className={cx(styles.root, className)}>
      <div className={styles.header}>
        <Typography as="span" variant="small" id={labelId} className={styles.label}>
          {label}
        </Typography>
        {copy && (
          <CopyButton
            text={code}
            label="Copy code"
            className={styles.actions}
            failureClassName={styles.failure}
          />
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
