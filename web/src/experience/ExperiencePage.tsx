import { useState } from "react";
import { Link } from "../components/Link/Link.tsx";
import { cx } from "../components/shared/cx.ts";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, positions } from "../content/experience.ts";
import page from "../shell/page.module.css";
import { resumePdfPath } from "../site.config.ts";
import { EducationSection } from "./EducationSection.tsx";
import styles from "./Experience.module.css";
import { countHighlights, emptySelection, type Selection } from "./model.ts";
import { SkillsPanel } from "./SkillsPanel.tsx";
import { WorkSection } from "./WorkSection.tsx";

/**
 * The Experience page: the intro, then the skills panel, work and education in one grid (R3.1).
 * The selection is its only state; the counts are derived from it.
 */
export function ExperiencePage() {
  const [selection, setSelection] = useState<Selection>(emptySelection);
  const { shown, total } = countHighlights(positions, selection);
  return (
    <div className={cx(page.column, styles.layout)}>
      <div className={styles.intro}>
        <Typography as="h1" variant="display">
          {experienceContent.heading}
        </Typography>
        <Stack direction="horizontal" gap="sm" className={page.actions}>
          {/* reloadDocument: a routed path would render the 404 page instead of downloading. */}
          <Link
            href={resumePdfPath}
            appearance="button"
            variant="secondary"
            iconStart="download"
            download
            reloadDocument
          >
            {experienceContent.pdfLabel}
          </Link>
        </Stack>
      </div>
      <SkillsPanel
        selection={selection}
        onSelectionChange={setSelection}
        shown={shown}
        total={total}
      />
      <WorkSection selection={selection} />
      <EducationSection />
    </div>
  );
}
