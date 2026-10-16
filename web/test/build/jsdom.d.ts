// jsdom ships no type declarations. This covers only what the build tests use.
declare module "jsdom" {
  export class JSDOM {
    constructor(html: string, options?: { contentType?: string });
    readonly window: Window & typeof globalThis;
  }
}
