// jsdom ships no type declarations, and infra has no DOM lib. This covers only what the smoke
// suite uses.
declare module "jsdom" {
  interface SmokeElement {
    readonly textContent: string;
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
  }
  interface SmokeDocument {
    readonly title: string;
    querySelectorAll(selectors: string): Iterable<SmokeElement>;
  }
  export class JSDOM {
    constructor(html: string, options?: { contentType?: string });
    readonly window: { readonly document: SmokeDocument };
  }
}
