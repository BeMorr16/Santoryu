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
import "./generated/tokens.css";
import "./styles/global.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
