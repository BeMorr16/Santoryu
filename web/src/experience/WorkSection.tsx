import { Fragment } from "react";
import { Separator } from "../components/Separator/Separator.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, positions } from "../content/experience.ts";
import styles from "./Experience.module.css";
import type { Selection } from "./model.ts";
import { PositionEntry } from "./PositionEntry.tsx";

/** "Work": every position in authored order, with a decorative rule between them (R3.4, R4.1). */
export function WorkSection({ selection }: { selection: Selection }) {
  return (
    <Stack as="section" gap="lg" aria-labelledby="experience-work" className={styles.work}>
      <Typography as="h2" id="experience-work">
        {experienceContent.workHeading}
      </Typography>
      {positions.map((position, index) => (
        <Fragment key={position.id}>
          {index > 0 && <Separator decorative />}
          <PositionEntry position={position} selection={selection} />
        </Fragment>
      ))}
    </Stack>
  );
}
