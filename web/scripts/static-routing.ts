/**
 * Maps a request path to a file in the client build the way static hosting will (decision 0003):
 * `/design-system` serves `design-system/index.html`, and unknown paths get `404.html` with a 404 status.
 */
export function resolveStaticPath(
  pathname: string,
  isFile: (path: string) => boolean,
): { path: string; status: 200 | 404 } {
  if (isFile(pathname)) return { path: pathname, status: 200 };
  const index = `${pathname.replace(/\/$/, "")}/index.html`;
  if (isFile(index)) return { path: index, status: 200 };
  return { path: "/404.html", status: 404 };
}
