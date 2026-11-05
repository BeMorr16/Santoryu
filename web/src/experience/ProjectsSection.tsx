import { Fragment } from "react";
import { Separator } from "../components/Separator/Separator.tsx";
import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { experienceContent, projects, type Project } from "../content/experience.ts";
import styles from "./Experience.module.css";
import type { Selection } from "./model.ts";
import { ProjectEntry } from "./ProjectEntry.tsx";

/**
 * "Projects": every project in authored order, with a decorative rule between them
 * (experience-skills R1.3, R1.5, R2.1). `list` defaults to the content's projects.
 */
export function ProjectsSection({
  selection,
  list = projects,
}: {
  selection: Selection;
  list?: readonly Project[];
}) {
  return (
    <Stack as="section" gap="lg" aria-labelledby="experience-projects" className={styles.projects}>
      <Typography as="h2" id="experience-projects">
        {experienceContent.projectsHeading}
      </Typography>
      {list.map((project, index) => (
        <Fragment key={project.id}>
          {index > 0 && <Separator decorative />}
          <ProjectEntry project={project} selection={selection} />
        </Fragment>
      ))}
    </Stack>
  );
}
