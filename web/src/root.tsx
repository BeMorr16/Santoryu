import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { SiteShell } from "./shell/SiteShell.tsx";
import { siteName } from "./site.config.ts";
import { themeScript } from "./theme/theme-script.ts";
import interWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import spaceGroteskWoff2 from "@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url";
import "./generated/tokens.css";
import "./styles/fonts.css";
import "./styles/global.css";

/** Body and heading faces are above the fold on every page (R1.6). Fira Code isn't. */
export function links(): Route.LinkDescriptors {
  return [interWoff2, spaceGroteskWoff2].map((href) => ({
    rel: "preload",
    href,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  }));
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The pre-paint script sets data-theme/data-js on <html> before hydration (R13.4, R13.8).
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta charSet="utf-8" />
        {/* viewport-fit=cover: the page, backdrop included, draws under the status bar and toolbar. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <SiteShell>
      <Outlet />
    </SiteShell>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const detail = isRouteErrorResponse(error)
    ? `${String(error.status)} ${error.statusText}`
    : "An unexpected error occurred.";
  return (
    <SiteShell>
      <title>{`Something went wrong · ${siteName}`}</title>
      <h1>Something went wrong</h1>
      <p>{detail}</p>
    </SiteShell>
  );
}
