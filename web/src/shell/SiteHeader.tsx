import { useEffect, useId, useRef, useState, type Ref, type RefObject } from "react";
import { useLocation } from "react-router";
import { Button } from "../components/Button/Button.tsx";
import { Link } from "../components/Link/Link.tsx";
import { ThemeSwitcher } from "../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { initials, linkedinUrl, ownerName } from "../site.config.ts";
import { BackdropPauseToggle } from "./backdrop/BackdropPauseToggle.tsx";
import { contactHref, navLinks } from "./nav.ts";
import styles from "./SiteHeader.module.css";

/** size.breakpoint.md: the panel is part of the bar from here up (design §4.3). */
const wideQuery = "(min-width: 48em)";

function hidePanel(panel: HTMLElement | null) {
  if (panel?.matches(":popover-open")) panel.hidePopover();
}

/**
 * The browser's popover owns the panel's open state; this mirrors it for aria-expanded, and closes
 * the panel when focus leaves it and its button (R8.3; design §10), when the page changes from
 * anywhere, and when the bar turns wide (R8.4; design §4.4).
 */
function usePanel(
  panel: RefObject<HTMLElement | null>,
  menuButton: RefObject<HTMLElement | null>,
): boolean {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const onToggle = (event: ToggleEvent) => {
      setOpen(event.newState === "open");
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node)) return;
      if (element.contains(next) || menuButton.current?.contains(next)) return;
      hidePanel(element);
    };
    element.addEventListener("toggle", onToggle);
    element.addEventListener("focusout", onFocusOut);
    return () => {
      element.removeEventListener("toggle", onToggle);
      element.removeEventListener("focusout", onFocusOut);
    };
  }, [panel, menuButton]);

  useEffect(() => {
    hidePanel(panel.current);
  }, [panel, pathname]);

  useEffect(() => {
    const wide = window.matchMedia(wideQuery);
    const onChange = () => {
      hidePanel(panel.current);
    };
    wide.addEventListener("change", onChange);
    return () => {
      wide.removeEventListener("change", onChange);
    };
  }, [panel]);

  return open;
}

/**
 * The floating bar (site-refresh design §4): "BM", a menu button for narrow screens, and one panel
 * that CSS shows inline when wide and the browser shows as a popover when narrow.
 */
export function SiteHeader({
  ref,
  showBackdropPause = false,
}: {
  ref?: Ref<HTMLElement>;
  /** Shows the sphere's pause toggle, before the theme switcher (site-backdrop R6.7). */
  showBackdropPause?: boolean;
}) {
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const open = usePanel(panel, menuButton);

  // A followed link closes it, the current page's included (R8.3). Enter on a link clicks it too.
  const closePanel = () => {
    hidePanel(panel.current);
  };

  return (
    <header ref={ref} className={styles.bar}>
      <Link
        href="/"
        currentMatch="exact"
        underline="none"
        aria-label={`${initials}, ${ownerName}, home`}
        className={styles.initials}
      >
        {initials}
      </Link>
      <Button
        ref={menuButton}
        variant="ghost"
        size="sm"
        iconStart="menu"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        popoverTarget={panelId}
        className={styles.menuButton}
      />
      <div id={panelId} ref={panel} popover="auto" className={styles.panel}>
        <nav aria-label="Primary">
          <ul className={styles.links}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  currentMatch={link.currentMatch}
                  underline="none"
                  className={styles.navLink}
                  onClick={closePanel}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.end}>
          {showBackdropPause && <BackdropPauseToggle />}
          <ThemeSwitcher variant="ghost" size="sm" showLabel={false} />
          <Link
            href={linkedinUrl}
            appearance="button"
            variant="ghost"
            size="sm"
            iconStart="linkedin"
            aria-label="LinkedIn"
            onClick={closePanel}
          />
          <Link
            href={contactHref}
            appearance="button"
            variant="ghost"
            size="sm"
            iconEnd="arrow-right"
            className={styles.contact}
            onClick={closePanel}
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}
