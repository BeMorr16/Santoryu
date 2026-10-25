/**
 * The Figure section's photos without their files (refinement R18.10), so browser tests can read
 * them without Vite's image imports.
 */

/** The landscape photo (3:2). Capped at 80dvh, it's at most 120vh wide, so wider windows get that. */
export const elkPhoto = {
  sizes: "(max-aspect-ratio: 6/5) 100vw, 120vh",
  width: 1920,
  height: 1280,
  alt: "A bull elk with a wide rack of antlers stands side-on in a mown field by a road, a white two-story building behind it.",
  caption: "Bull elk, Yellowstone National Park.",
} as const;

/** The portrait photo (2:3). Capped at 80dvh, it's at most 54vh wide, so wider windows get that. */
export const fallsPhoto = {
  sizes: "(max-aspect-ratio: 8/15) 100vw, 54vh",
  width: 1440,
  height: 2160,
  alt: "A tall waterfall pours between yellow and rust canyon walls into a green river, framed by pines under a blue sky.",
  caption:
    "Lower Falls of the Yellowstone River, which drops 308 feet into the Grand Canyon of the Yellowstone.",
} as const;

/** No such file: the server answers 404, and health.spec.ts allows this one URL (refinement R18.10). */
export const missingImageSrc = "/design-system/missing-image.jpg";
