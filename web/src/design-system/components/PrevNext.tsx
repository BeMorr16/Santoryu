import { Icon } from "../../components/Icon/Icon.tsx";
import { Link } from "../../components/Link/Link.tsx";
import { docsSequence } from "./pages.ts";
import styles from "./PrevNext.module.css";

/**
 * One end of the pair, named "Previous: Link" (R4.9). The name is an aria-label, since a stacked
 * layout can make engines join the visible words differently; it holds both visible words in order.
 */
function PageLink({
  direction,
  href,
  name,
}: {
  direction: "Previous" | "Next";
  href: string;
  name: string;
}) {
  return (
    <Link
      href={href}
      underline="hover"
      className={styles.link}
      aria-label={`${direction}: ${name}`}
    >
      {direction === "Previous" && <Icon name="arrow-left" />}
      <span className={styles.text}>
        <span className={styles.direction}>{direction}</span>
        <span>{name}</span>
      </span>
      {direction === "Next" && <Icon name="arrow-right" />}
    </Link>
  );
}

/** Links to the docs pages before and after `current` (a path), in side-menu order (R4.9). */
export function PrevNext({ current }: { current: string }) {
  const index = docsSequence.findIndex(({ href }) => href === current);
  const previous = index > 0 ? docsSequence[index - 1] : undefined;
  const next = index >= 0 ? docsSequence[index + 1] : undefined;
  return (
    <ul aria-label="Previous and next" className={styles.prevNext}>
      {previous && (
        <li>
          <PageLink direction="Previous" {...previous} />
        </li>
      )}
      {next && (
        <li className={styles.next}>
          <PageLink direction="Next" {...next} />
        </li>
      )}
    </ul>
  );
}
