import { expect, test } from "@playwright/test";
import { tabKey } from "./support.ts";

interface Ring {
  label: string;
  width: number;
  contrast: number;
}

test("every control on /lab/components shows a 2px, 3:1 focus ring from the keyboard (R3.8, R16.5)", async ({
  page,
  browserName,
}) => {
  test.slow();
  await page.goto("/lab/components");
  const rings: Ring[] = [];
  const seen = new Set<string>();

  for (let step = 0; step < 400; step++) {
    await page.keyboard.press(tabKey(browserName));
    const ring = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || focused === document.body) return null;
      if (!focused.dataset.focusStep) focused.dataset.focusStep = String(Math.random());
      // A link card draws its ring on the card (R10.4), not on the link itself.
      let ringElement: Element = focused;
      while (getComputedStyle(ringElement).outlineStyle === "none" && ringElement.parentElement) {
        ringElement = ringElement.parentElement;
      }
      const style = getComputedStyle(ringElement);
      const parse = (color: string) => {
        const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
        return { rgb: [r / 255, g / 255, b / 255], a };
      };
      // The ring sits outside the element, so it's seen against the backgrounds behind it.
      let behind = { rgb: [0, 0, 0], a: 0 };
      for (let el = ringElement.parentElement; el && behind.a < 1; el = el.parentElement) {
        const layer = parse(getComputedStyle(el).backgroundColor);
        if (layer.a === 0) continue;
        const a = behind.a + layer.a * (1 - behind.a);
        behind = {
          rgb: behind.rgb.map(
            (c, i) => (c * behind.a + (layer.rgb[i] ?? 0) * layer.a * (1 - behind.a)) / a,
          ),
          a,
        };
      }
      const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = ([r = 0, g = 0, b = 0]: number[]) =>
        0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const [l1, l2] = [lum(parse(style.outlineColor).rgb), lum(behind.rgb)];
      const label = `${focused.tagName.toLowerCase()} "${(focused.getAttribute("aria-label") ?? focused.textContent).trim().slice(0, 40)}"`;
      return {
        id: focused.dataset.focusStep,
        label,
        width: parseFloat(style.outlineWidth),
        contrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05),
      };
    });
    if (ring === null || seen.has(ring.id)) break;
    seen.add(ring.id);
    rings.push(ring);
  }

  expect(rings.length).toBeGreaterThan(40);
  const weak = rings.filter((ring) => ring.width < 2 || ring.contrast < 3);
  expect(
    weak.map((ring) => `${ring.label}: ${String(ring.width)}px, ${ring.contrast.toFixed(2)}:1`),
  ).toEqual([]);
});
