import { Stack } from "../components/Stack/Stack.tsx";
import { Typography } from "../components/Typography/Typography.tsx";
import { education, experienceContent } from "../content/experience.ts";
import styles from "./Experience.module.css";

/** "Education": each entry's credential, school and year, then its note (R9). */
export function EducationSection() {
  return (
    <Stack
      as="section"
      gap="md"
      aria-labelledby="experience-education"
      className={styles.education}
    >
      <Typography as="h2" id="experience-education">
        {experienceContent.educationHeading}
      </Typography>
      <Stack as="ul" gap="md">
        {education.map((entry) => (
          <li key={entry.id}>
            <Typography variant="h5">{entry.credential}</Typography>
            <Typography tone="muted">
              {entry.school} · <time dateTime={String(entry.year)}>{entry.year}</time>
            </Typography>
            {"note" in entry && (
              <Typography variant="small" tone="muted">
                {entry.note}
              </Typography>
            )}
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
