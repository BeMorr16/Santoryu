import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { Button, type ButtonProps } from "../Button/Button.tsx";
import { Icon } from "../Icon/Icon.tsx";
import type { IconName } from "../Icon/registry.ts";
import { cx } from "../shared/cx.ts";
import { useOverflowFocus } from "../shared/overflow.ts";
import { assignRef } from "../shared/ref.ts";
import { Typography } from "../Typography/Typography.tsx";
import styles from "./Dialog.module.css";

/** What a completion button reports through `onComplete`. */
export type DialogResult = "success" | "failure";

export interface DialogOwnProps {
  /** Shown as a modal while true. Controlled: `onClose` must set it to false. */
  open: boolean;
  /** Any close: Escape, a backdrop click, the Close button or a `DialogButton`. */
  onClose: () => void;
  /** A `DialogButton` with a `result` was chosen, just before the dialog closes. */
  onComplete?: ((result: DialogResult) => void) | undefined;
  /** The heading, and the dialog's accessible name. Required (an accessibility rule, decision 0008). */
  title: ReactNode;
  /** A decorative icon before the title. */
  titleIcon?: IconName | undefined;
  /** The title's heading level, to fit the page's outline. Default 2. */
  titleLevel?: 2 | 3 | 4 | 5 | 6 | undefined;
  /** `full` fills the viewport on narrow screens, and nearly fills it from 48em. Default `default`. */
  size?: "default" | "full" | undefined;
  /** Close on a click on the backdrop. Default true. */
  closeOnBackdrop?: boolean | undefined;
  /** Close on Escape. Default true. Browsers may still close on a repeated Escape. */
  closeOnEsc?: boolean | undefined;
  /** `alertdialog` for a dialog that interrupts with an urgent message. Default `dialog`. */
  role?: "dialog" | "alertdialog" | undefined;
  /** Focused on open. Default: the first focusable element after the header, else Close. */
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  children?: ReactNode;
}

/** Native `<dialog>` props go to the dialog element; `open` is the controlled prop above. */
export type DialogProps = DialogOwnProps &
  Omit<ComponentPropsWithRef<"dialog">, keyof DialogOwnProps>;

interface DialogContextValue {
  open: boolean;
  titleId: string;
  bodyId: string;
  setHasBody: Dispatch<SetStateAction<boolean>>;
  complete: (result: DialogResult | undefined) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog(part: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${part} must be inside a Dialog.`);
  return context;
}

const focusable = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * A modal dialog on native `<dialog>` and `showModal()` (theme-creator design §11): the browser
 * puts it in the top layer and makes the page behind it inert. Focus moves inside on open and
 * returns to the opener on close. A required `title` names it.
 */
export function Dialog({
  open,
  onClose,
  onComplete,
  title,
  titleIcon,
  titleLevel = 2,
  size = "default",
  closeOnBackdrop = true,
  closeOnEsc = true,
  role,
  initialFocus,
  className,
  children,
  ref,
  onCancel,
  "aria-describedby": ariaDescribedby,
  ...rest
}: DialogProps) {
  const id = useId();
  const titleId = `${id}title`;
  const bodyId = `${id}body`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [hasBody, setHasBody] = useState(false);

  // The dialog element is the external system: open and close it to match `open`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      const first = [...dialog.querySelectorAll<HTMLElement>(focusable)].find(
        (element) => !headerRef.current?.contains(element) && !element.matches(":disabled"),
      );
      (initialFocus?.current ?? first ?? closeRef.current)?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocus]);

  // A pointer-only shortcut, so it's a native listener: Escape and Close are the keyboard paths.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !closeOnBackdrop) return;
    // The surface fills the dialog, so the dialog itself is hit only on its backdrop. A press that
    // began inside (say, selecting text) and ended outside isn't a backdrop click.
    let pressedBackdrop = false;
    const onPointerDown = (event: PointerEvent) => {
      pressedBackdrop = event.target === dialog;
    };
    const onClick = (event: MouseEvent) => {
      if (pressedBackdrop && event.target === dialog) dialog.close();
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("click", onClick);
    };
  }, [closeOnBackdrop]);

  function close() {
    dialogRef.current?.close();
  }

  function complete(result: DialogResult | undefined) {
    if (result !== undefined) onComplete?.(result);
    close();
  }

  // Every close passes through here, so `open` follows the dialog however it closed.
  function handleClose() {
    // Back to the opener, unless something already moved focus elsewhere. While the dialog is
    // open the page behind is inert, so focus can move there only once it has closed: in
    // onClose, or after a render (as "Edit <token>" does).
    const active = document.activeElement;
    const focusLeft =
      active === null || active === document.body || dialogRef.current?.contains(active) === true;
    if (focusLeft && opener.current?.isConnected) opener.current.focus();
    opener.current = null;
    if (open) onClose();
  }

  const heading = `h${String(titleLevel)}` as `h${typeof titleLevel}`;

  return (
    <DialogContext value={{ open, titleId, bodyId, setHasBody, complete }}>
      <dialog
        {...rest}
        ref={(node) => {
          dialogRef.current = node;
          assignRef(ref, node);
        }}
        role={role}
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedby ?? (hasBody ? bodyId : undefined)}
        className={cx(styles.dialog, styles[size], className)}
        onClose={handleClose}
        onCancel={(event) => {
          onCancel?.(event);
          if (!closeOnEsc) event.preventDefault();
        }}
      >
        <div className={styles.surface}>
          <div ref={headerRef} className={styles.header}>
            <Typography as={heading} variant="h4" id={titleId} className={styles.title}>
              {titleIcon && <Icon name={titleIcon} className={styles.titleIcon} />}
              {title}
            </Typography>
            <Button
              ref={closeRef}
              variant="ghost"
              size="sm"
              iconStart="close"
              aria-label="Close"
              onClick={close}
            />
          </div>
          {children}
        </div>
      </dialog>
    </DialogContext>
  );
}

export type DialogBodyProps = ComponentPropsWithRef<"div">;

/**
 * The dialog's message: it describes the dialog, and scrolls when it's too tall. While it
 * overflows it's a focusable group, since Safari doesn't make scrolling boxes keyboard-focusable.
 */
export function DialogBody({ className, children, ref, ...rest }: DialogBodyProps) {
  const { open, titleId, bodyId, setHasBody } = useDialog("DialogBody");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollable = useOverflowFocus(scrollerRef, contentRef, open, "block");

  // Registers with the Dialog, which then points aria-describedby here.
  useEffect(() => {
    setHasBody(true);
    return () => {
      setHasBody(false);
    };
  }, [setHasBody]);

  return (
    <div
      {...rest}
      ref={(node) => {
        scrollerRef.current = node;
        assignRef(ref, node);
      }}
      id={bodyId}
      className={cx(styles.body, className)}
      {...(scrollable && { tabIndex: 0, role: "group", "aria-labelledby": titleId })}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}

export interface DialogActionsOwnProps {
  /** Where the actions sit along the row. Default `end`. */
  justify?: "start" | "end" | "center" | "space-between" | undefined;
}

export type DialogActionsProps = DialogActionsOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof DialogActionsOwnProps>;

/** A row of actions at the end of the dialog, wrapping on narrow screens. */
export function DialogActions({ justify = "end", className, ...rest }: DialogActionsProps) {
  return <div {...rest} className={cx(styles.actions, styles[justify], className)} />;
}

export interface DialogButtonOwnProps {
  /** Reported through the Dialog's `onComplete` before it closes. */
  result?: DialogResult | undefined;
}

export type DialogButtonProps = ButtonProps & DialogButtonOwnProps;

/** A Button that closes its dialog after its own `onClick`, reporting `result` when set. */
export function DialogButton({ result, onClick, ...rest }: DialogButtonProps) {
  const { complete } = useDialog("DialogButton");
  return (
    <Button
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        complete(result);
      }}
    />
  );
}
