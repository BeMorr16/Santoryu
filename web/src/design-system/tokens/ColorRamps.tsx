import { cx } from "../../components/shared/cx.ts";
import { listRole } from "../../components/shared/layout.ts";
import type { PrimitiveTokenMeta } from "../../tokens/types.ts";
import { Specimen } from "../Specimen.tsx";
import tableStyles from "../TableContent.module.css";
import styles from "./ColorRamps.module.css";
import { tokenRowId } from "./reference-ids.ts";
import { UsedBy } from "./UsedBy.tsx";

/** Translucent steps sit on a checkerboard, so their alpha shows (ds-tokens R5.3). */
const translucent = new Set(["overlay"]);

function Ramp({
  group,
  tokens,
  shown,
}: {
  group: string;
  tokens: readonly PrimitiveTokenMeta[];
  shown: ReadonlySet<string> | null | undefined;
}) {
  const hidden = shown != null && !tokens.some((token) => shown.has(tokenRowId(token.name)));
  return (
    <div className={styles.ramp} hidden={hidden}>
      <h4 className={styles.heading}>{group}</h4>
      <ul className={styles.steps} {...listRole("ul", undefined)}>
        {tokens.map((token) => {
          const id = tokenRowId(token.name);
          return (
            <li
              key={token.name}
              id={id}
              className={cx(styles.step, tableStyles.target)}
              hidden={shown?.has(id) === false}
            >
              <Specimen
                token={token}
                className={cx(styles.swatch, translucent.has(group) && styles.checkerboard)}
              />
              <code className={styles.name}>{token.name.split(".").at(-1)}</code>
              <code className={tableStyles.value}>{token.css}</code>
              <UsedBy tokens={token.usedBy} showLabel />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The color primitives as one ramp per hue, in source order (ds-tokens R5.3). */
export function ColorRamps({
  tokens,
  shown,
}: {
  tokens: readonly PrimitiveTokenMeta[];
  /** Search results: steps outside it are hidden (R11.3). */
  shown?: ReadonlySet<string> | null | undefined;
}) {
  const groups = [...new Set(tokens.map((token) => token.group))];
  return (
    <div className={styles.ramps}>
      {groups.map((group) => (
        <Ramp
          key={group}
          group={group}
          tokens={tokens.filter((token) => token.group === group)}
          shown={shown}
        />
      ))}
    </div>
  );
}
