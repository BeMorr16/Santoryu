import { useEffect, useState } from "react";
import { Link } from "../../components/Link/Link.tsx";
import { sections } from "./model/controls.ts";
import { currentSection } from "./model/library.ts";
import styles from "./ThemeCreator.module.css";

const headingId = (id: string) => `section-${id}`;

/** A length in px from a computed custom property, which keeps its rem unit. */
function lengthPx(value: string): number {
  const size = Number.parseFloat(value);
  if (Number.isNaN(size)) return 0;
  return value.trim().endsWith("rem")
    ? size * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    : size;
}

/**
 * Below this line a heading is past the pinned bars: the root's scroll padding, which clears them
 * in every layout (theme-creator-controls design §5.3), plus space.stack.md.
 */
function readingLine(): number {
  const root = getComputedStyle(document.documentElement);
  const padding = Number.parseFloat(root.scrollPaddingTop);
  return (
    (Number.isNaN(padding) ? 0 : padding) + lengthPx(root.getPropertyValue("--space-stack-md"))
  );
}

/**
 * In-page links to the editor's sections, marking the one in view as the current location
 * (theme-creator-controls R5.1–R5.3; design §5.2). Not announced as it changes.
 */
export function SectionLinks() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = sections.map(
        ({ id }) =>
          document.getElementById(headingId(id))?.getBoundingClientRect().top ??
          Number.POSITIVE_INFINITY,
      );
      const root = document.documentElement;
      // Within a pixel of the bottom: scroll positions can be fractional.
      const atEnd =
        window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 1;
      setCurrent(currentSection(tops, readingLine(), atEnd));
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav aria-label="Editor sections">
      <ul className={styles.sectionLinks}>
        {sections.map(({ id, title }, index) => (
          <li key={id}>
            <Link
              href={`#${headingId(id)}`}
              underline="hover"
              aria-current={index === current ? "location" : undefined}
            >
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
