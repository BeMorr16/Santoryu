import { describe, expect, it } from "vitest";
import { resolveStaticPath } from "./static-routing.ts";

const files = new Set(["/index.html", "/design-system/index.html", "/404.html", "/assets/app.js"]);
const isFile = (path: string) => files.has(path);

describe("resolveStaticPath", () => {
  it.each([
    ["/", "/index.html"],
    ["/design-system", "/design-system/index.html"],
    ["/design-system/", "/design-system/index.html"],
    ["/assets/app.js", "/assets/app.js"],
    ["/404.html", "/404.html"],
  ])("serves %s from %s", (pathname, path) => {
    expect(resolveStaticPath(pathname, isFile)).toEqual({ path, status: 200 });
  });

  it.each(["/nope", "/design-system/nope", "/assets/missing.js"])(
    "serves 404.html with status 404 for %s",
    (pathname) => {
      expect(resolveStaticPath(pathname, isFile)).toEqual({ path: "/404.html", status: 404 });
    },
  );
});
