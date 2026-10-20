import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { Link } from "../components/Link/Link.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { ThemeSwitcher } from "../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { VisuallyHidden } from "../components/VisuallyHidden/VisuallyHidden.tsx";
import { footerText, siteName } from "../site.config.ts";
import styles from "./SiteShell.module.css";

export function SiteShell({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Comparing paths (rather than skipping the first run) stays correct when StrictMode re-runs effects.
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    const main = mainRef.current;
    const heading = main?.querySelector("h1");
    // Pages own their h1, so the shell makes it focusable here rather than in every route.
    if (heading && !heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    (heading ?? main)?.focus({ preventScroll: true });
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
              <Link href="/lab" underline="hover" className={styles.navLink}>
                Lab
              </Link>
            </li>
          </Stack>
        </nav>
        <ThemeSwitcher />
      </Stack>
      <Stack as="main" gap="lg" className={styles.main} id="main" tabIndex={-1} ref={mainRef}>
        {children}
      </Stack>
      <footer className={styles.footer}>
        <p>{footerText}</p>
      </footer>
    </div>
  );
}
