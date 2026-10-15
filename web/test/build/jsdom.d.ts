// jsdom ships no type declarations. This covers only what build-output.test.ts uses.
declare module "jsdom" {
  export class JSDOM {
    constructor(html: string);
    readonly window: Window & typeof globalThis;
  }
}
