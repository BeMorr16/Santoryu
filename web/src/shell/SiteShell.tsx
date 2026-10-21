import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { BackToTop } from "../components/BackToTop/BackToTop.tsx";
import { Link } from "../components/Link/Link.tsx";
import { cx } from "../components/shared/cx.ts";
import { focusWithoutScroll, pageFocusTarget } from "../components/shared/focus.ts";
import { Stack } from "../components/Stack/Stack.tsx";
import { ThemeSwitcher } from "../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { footerText, siteName } from "../site.config.ts";
import { useRouteHandle } from "./route-handle.ts";
import styles from "./SiteShell.module.css";

export function SiteShell({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { Aside, backToTop = true } = useRouteHandle();
  // Comparing paths (rather than skipping the first run) stays correct when StrictMode re-runs effects.
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    // Pages own their h1, so the shell makes it focusable here rather than in every route.
    focusWithoutScroll(pageFocusTarget(mainRef.current));
  }, [pathname]);

  // The scroll padding follows the header's height, however many rows it wraps onto (refinement R11.3).
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const blockSize = entry?.borderBoxSize[0]?.blockSize ?? header.offsetHeight;
      root.style.setProperty("--shell-header-block-size", `${String(blockSize)}px`);
    });
    observer.observe(header, { box: "border-box" });
    return () => {
      observer.disconnect();
      root.style.removeProperty("--shell-header-block-size");
    };
  }, []);

  return (
    <div className={styles.page}>
      <VisuallyHidden
        as="a"
        focusable
        className={styles.skipLink}
        href="#main"
        onClick={() => {
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </VisuallyHidden>
      <Stack
        as="header"
        ref={headerRef}
        direction="horizontal"
        justify="between"
        align="center"
        rowGap="sm"
        columnGap="md"
        className={styles.header}
      >
        {/* Not part of the nav, and "Home" already marks the home page (refinement R11.8). */}
        <Link href="/" underline="hover" aria-current={false} className={styles.siteName}>
          {siteName}
        </Link>
        <nav aria-label="Primary">
          <Stack as="ul" direction="horizontal" gap="md">
            <li>
              <Link href="/" underline="hover" className={styles.navLink}>
                Home
              </Link>
            </li>
            <li>
              {/* Marked on every design-system page: "page" on /design-system, "true" below it (R1.6). */}
              <Link
                href="/design-system"
                currentMatch="section"
                underline="hover"
                className={styles.navLink}
              >
                Design System
              </Link>
            </li>
          </Stack>
        </nav>
        <ThemeSwitcher />
      </Stack>
      <div className={cx(styles.body, Aside && styles.withAside)}>
        {/* Before main, so the skip link bypasses it; the key remounts it collapsed after every navigation. */}
        {Aside && <Aside key={pathname} />}
        <Stack as="main" gap="lg" className={styles.main} id="main" tabIndex={-1} ref={mainRef}>
          {children}
        </Stack>
      </div>
      <footer className={styles.footer}>
        <p>{footerText}</p>
      </footer>
      {/* Once per page, after the footer; a route turns it off with handle.backToTop (R5.2, R5.8). */}
      {backToTop && <BackToTop />}
    </div>
  );
}
