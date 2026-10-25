import { Accordion, AccordionItem } from "@/components/Accordion";

export function AccordionExample() {
  return (
    <Accordion headingLevel={2}>
      <AccordionItem heading="What is this site built with?">
        <p>React, prerendered to static pages, served from S3 and CloudFront.</p>
      </AccordionItem>
      <AccordionItem heading="Can I use these components?">
        <p>They're built for this site, but the source is on GitHub to read and learn from.</p>
      </AccordionItem>
      <AccordionItem heading="How are they tested?">
        <p>Unit tests with axe, and browser tests in Chromium and WebKit.</p>
      </AccordionItem>
    </Accordion>
  );
}
