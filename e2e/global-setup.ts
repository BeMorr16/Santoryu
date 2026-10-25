import { readManifest } from "./build.ts";

export default function globalSetup(): void {
  readManifest();
}
