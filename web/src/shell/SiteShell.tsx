import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { BackToTop } from "../components/BackToTop/BackToTop.tsx";
import { cx } from "../components/shared/cx.ts";
import { focusWithoutScroll, pageFocusTarget } from "../components/shared/focus.ts";
import { Stack } from "../components/Stack/Stack.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { footerText } from "../site.config.ts";
import { useRouteHandle } from "./route-handle.ts";
import { SiteHeader } from "./SiteHeader.tsx";
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

  // The space the bar takes at the top: its height, however many rows it wraps onto (refinement
  // R11.3), plus its top inset (space.stack.sm, site-refresh design §4.6). Scroll padding and the
  // sticky asides read it.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const blockSize = entry?.borderBoxSize[0]?.blockSize ?? header.offsetHeight;
      // Its top margin equals its sticky inset. Resolved here, in px: with a rem inset in the
      // property, WebKit's scroll padding missed a root font-size change (e2e, 200% text).
      const inset = Number.parseFloat(getComputedStyle(header).marginTop);
      root.style.setProperty("--shell-header-block-size", `${String(blockSize + inset)}px`);
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
      <SiteHeader ref={headerRef} />
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
