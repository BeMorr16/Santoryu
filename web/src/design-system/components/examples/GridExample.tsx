import { Card } from "@/components/Card";
import { Grid } from "@/components/Grid";

const projects = [
  { name: "Personal site", summary: "Prerendered React on S3 and CloudFront." },
  { name: "Component library", summary: "Accessible components built on design tokens." },
  { name: "Contact form", summary: "A serverless API behind the site." },
];

export function GridExample() {
  return (
    <Grid as="ul" min="sm" maxColumns={3}>
      {projects.map(({ name, summary }) => (
        <Card key={name} as="li" heading={name} headingLevel={2}>
          {summary}
        </Card>
      ))}
    </Grid>
  );
}
