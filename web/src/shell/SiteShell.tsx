import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ThemeSwitcher } from "../components/ThemeSwitcher/ThemeSwitcher.tsx";
import { footerText, siteName } from "../site.config.ts";
import styles from "./SiteShell.module.css";

const navLinkClassName = () => styles.navLink;

export function SiteShell({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Comparing paths (rather than skipping the first run) stays correct when StrictMode re-runs effects.
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a
        className={styles.skipLink}
        href="#main"
        onClick={() => {
          mainRef.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className={styles.header}>
        <Link className={styles.siteName} to="/">
          {siteName}
        </Link>
        <nav aria-label="Primary">
          <ul className={styles.navList}>
            <li>
              <NavLink className={navLinkClassName} to="/" end>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink className={navLinkClassName} to="/lab" end>
                Lab
              </NavLink>
            </li>
          </ul>
        </nav>
        <ThemeSwitcher />
      </header>
      <main className={styles.main} id="main" tabIndex={-1} ref={mainRef}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>{footerText}</p>
      </footer>
    </>
  );
}
