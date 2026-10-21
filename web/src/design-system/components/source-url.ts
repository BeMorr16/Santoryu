import { repoUrl } from "../../site.config.ts";

/** A component's source folder on GitHub; `name` is its folder under web/src/components/ (R4.1). */
export function sourceUrl(name: string): string {
  return `${repoUrl}/tree/main/web/src/components/${name}`;
}
