import { Typography } from "@/components/Typography";

export function TypographyExample() {
  return (
    <>
      <Typography variant="lead">A design system built from tokens up.</Typography>
      <Typography>
        Body text sets the reading size. Every size, weight and line height comes from a token.
      </Typography>
      <Typography variant="small" tone="muted">
        Last updated October 2026.
      </Typography>
    </>
  );
}
