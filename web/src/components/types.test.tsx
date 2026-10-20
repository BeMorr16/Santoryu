/**
 * Type-level tests (component-library design §12.1). Each `@ts-expect-error` line is an
 * assertion: `typecheck` fails if the error it expects disappears. The functions are never called.
 */
import { describe, expectTypeOf, it } from "vitest";
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  Grid,
  Icon,
  Link,
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  Stack,
  ThemeSwitcher,
  Typography,
  VisuallyHidden,
} from "./index.ts";
import type { ButtonLookProps } from "./shared/button.tsx";
import type { PolymorphicProps } from "./shared/polymorphic.ts";

describe("library types", () => {
  it("PolymorphicProps checks element-specific props against `as`", () => {
    type Props<E extends "a" | "div"> = PolymorphicProps<E, { tone?: "x" }>;
    expectTypeOf<Props<"a">>().toHaveProperty("href");
    expectTypeOf<Props<"a">["tone"]>().toEqualTypeOf<"x" | undefined>();

    function invalid() {
      // @ts-expect-error -- `href` isn't a <div> prop.
      const props: Props<"div"> = { href: "/" };
      return props;
    }
    expectTypeOf(invalid).toBeFunction();
  });

  it("Icon accepts only registry names, and owns its accessible name (R6.1)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- not a registry name.
        <Icon key="a" name="unicorn" />,
        // @ts-expect-error -- the accessible name comes from `label`.
        <Icon key="b" name="check" aria-label="Done" />,
        // @ts-expect-error -- not a normalized weight.
        <Icon key="c" name="check" weight="thin" />,
        // @ts-expect-error -- the accessible name comes from `label` only (refinement R1.11).
        <Icon key="h" name="check" aria-labelledby="other" />,
        // @ts-expect-error -- an icon is never focusable (refinement R1.11).
        <Icon key="i" name="check" tabIndex={0} />,
        // @ts-expect-error -- renamed to sun (refinement R1.3).
        <Icon key="d" name="theme-light" />,
        // @ts-expect-error -- renamed to moon (refinement R1.3).
        <Icon key="e" name="theme-dark" />,
        // @ts-expect-error -- renamed to external-link (refinement R1.3).
        <Icon key="f" name="new-tab" />,
        // @ts-expect-error -- removed (refinement R1.3).
        <Icon key="g" name="theme-system" />,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
  });

  it("Button needs a label or an accessible name, and closed variant/size unions (R4.4, R3.4)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- icon-only with no accessible name.
        <Button key="a" iconStart="github" />,
        // @ts-expect-error -- not a variant.
        <Button key="b" variant="danger">
          x
        </Button>,
        // @ts-expect-error -- not a size.
        <Button key="c" size="lg">
          x
        </Button>,
      ];
    }
    function valid() {
      return [
        <Button key="a">Save</Button>,
        <Button key="b" iconStart="github" aria-label="GitHub" />,
        <Button key="c" iconStart="github" aria-labelledby="label" />,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Button: no aria-disabled, and icon-only needs an icon (refinement R3.6, R3.7)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- disabled only through `disabled`.
        <Button key="c" aria-disabled>
          x
        </Button>,
        // @ts-expect-error -- an accessible name with nothing to show.
        <Button key="d" aria-label="x" />,
      ];
    }
    function valid(variant: ButtonLookProps["variant"]) {
      return [
        <Button key="a" variant="secondary" aria-pressed>
          x
        </Button>,
        <Button key="b" variant="ghost" aria-pressed={false}>
          x
        </Button>,
        <Button key="c" aria-pressed="mixed">
          x
        </Button>,
        <Button key="d" variant="primary" aria-pressed>
          x
        </Button>,
        <Button key="e" aria-label="x" iconEnd="check" />,
        <Button key="f" variant={variant} iconStart="check" aria-label="x" />,
        <Menu key="g">
          <MenuTrigger variant={variant}>x</MenuTrigger>
        </Menu>,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Link takes Button props only as a button, and has no disabled state (R5.5, R5.6)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- variant needs appearance="button".
        <Link key="a" href="/" variant="primary">
          x
        </Link>,
        // @ts-expect-error -- size needs appearance="button".
        <Link key="b" href="/" appearance="inline" size="sm">
          x
        </Link>,
        // @ts-expect-error -- links have no disabled state.
        <Link key="c" href="/" disabled>
          x
        </Link>,
        // @ts-expect-error -- href is required.
        <Link key="d">x</Link>,
        // @ts-expect-error -- target is owned by newTab.
        <Link key="e" href="/" target="_blank">
          x
        </Link>,
        // @ts-expect-error -- links don't support aria-pressed (refinement R3.13).
        <Link key="f" href="/" appearance="button" aria-pressed>
          x
        </Link>,
      ];
    }
    function valid() {
      return (
        <Link href="/" appearance="button" variant="primary" size="sm" iconEnd="arrow-right">
          x
        </Link>
      );
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Link always has a name, and takes rel, router options, current matching and underline (refinement R4.1, R4.6–R4.9, R11.7)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- an inline link needs text.
        <Link key="a" href="/" />,
        // @ts-expect-error -- an inline link needs text, even with aria-label.
        <Link key="b" href="/" aria-label="Home" />,
        // @ts-expect-error -- a button-styled link with no text needs a name.
        <Link key="c" href="/" appearance="button" iconStart="github" />,
        // @ts-expect-error -- a button-styled link with no text needs an icon.
        <Link key="d" href="/" appearance="button" aria-label="Home" />,
        // @ts-expect-error -- showVisited is for inline links.
        <Link key="e" href="/" appearance="button" showVisited>
          x
        </Link>,
        // @ts-expect-error -- currentMatch is for inline links.
        <Link key="g" href="/" appearance="button" currentMatch="section">
          x
        </Link>,
        // @ts-expect-error -- not a match mode.
        <Link key="f" href="/" currentMatch="prefix">
          x
        </Link>,
        // @ts-expect-error -- underline is for inline links.
        <Link key="h" href="/" appearance="button" underline="hover">
          x
        </Link>,
        // @ts-expect-error -- not an underline mode.
        <Link key="i" href="/" underline="none">
          x
        </Link>,
      ];
    }
    function valid(variant: ButtonLookProps["variant"]) {
      return [
        <Link
          key="a"
          href="/"
          appearance="button"
          variant={variant}
          iconStart="check"
          aria-label="x"
        />,
        <Link key="b" href="/" appearance="button" iconEnd="mail" aria-labelledby="label" />,
        <Link key="c" href="https://github.com/" rel="me" newTab showVisited>
          GitHub
        </Link>,
        <Link key="d" href="/lab" prefetch="intent" state={{ from: "home" }} currentMatch="section">
          Lab
        </Link>,
        <Link key="e" href="/lab" aria-current={false}>
          Lab
        </Link>,
        <Link key="f" href="/lab" underline="hover">
          Lab
        </Link>,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Stack and Grid allow only the closed element set, no reverse directions, gap steps per axis and 2–4 max columns (R8.2, R8.4, R9.3, refinement R6.2, R7.1, R7.3)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- no reverse directions (DOM order is visual order).
        <Stack key="a" direction="row-reverse" />,
        // @ts-expect-error -- span isn't a layout element.
        <Stack key="b" as="span" />,
        // @ts-expect-error -- not a gap step.
        <Stack key="c" gap="2xl" />,
        // @ts-expect-error -- not a column minimum.
        <Grid key="d" min="xl" />,
        // @ts-expect-error -- button isn't a layout element.
        <Grid key="e" as="button" />,
        // @ts-expect-error -- not a gap step.
        <Stack key="f" rowGap="2xl" />,
        // @ts-expect-error -- not a gap step.
        <Stack key="g" columnGap="around" />,
        // @ts-expect-error -- not a gap step.
        <Grid key="h" rowGap="2xl" />,
        // @ts-expect-error -- at most 4 columns.
        <Grid key="i" maxColumns={5} />,
        // @ts-expect-error -- one column is a vertical Stack.
        <Grid key="j" maxColumns={1} />,
      ];
    }
    function valid() {
      return [
        <Stack key="a" as="form" action="/x" />,
        <Grid key="b" as="ol" start={2} />,
        <Stack key="c" direction="vertical" wrap rowGap="xs" columnGap="lg" />,
        <Grid key="d" min="sm" rowGap="xs" columnGap="lg" stretch={false} maxColumns={3} />,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Card needs a heading to link and has closed variants, and Badge has closed variants, elements and icons (R10.3, R11, refinement R8.5, R9.6, R9.9)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- a link card needs a heading (its link's accessible name).
        <Card key="a" href="/projects">
          Body
        </Card>,
        // @ts-expect-error -- newTab only makes sense with href.
        <Card key="b" heading="x" newTab />,
        // @ts-expect-error -- heading levels are 2–6.
        <Card key="c" heading="x" headingLevel={1} />,
        // @ts-expect-error -- not a card variant (refinement R8.5).
        <Card key="f" heading="x" variant="ghost" />,
        // @ts-expect-error -- not a badge variant.
        <Badge key="d" variant="danger">
          x
        </Badge>,
        // @ts-expect-error -- badges are span or li.
        <Badge key="e" as="button">
          x
        </Badge>,
        // @ts-expect-error -- not an icon in the registry (refinement R9.9).
        <Badge key="g" icon="nope">
          x
        </Badge>,
      ];
    }
    function valid() {
      return [
        <Card key="a" heading="x" href="/projects" newTab />,
        <Card key="b" as="li" heading="x" />,
        <Card
          key="d"
          heading="T"
          href="/"
          variant="glass"
          footer={<span />}
          subgrid
          aria-current="page"
        />,
        <Badge key="c" as="li" variant="accent" size="sm">
          x
        </Badge>,
        <Badge key="e" variant="accent-2" icon="check">
          x
        </Badge>,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Accordion items need a heading, and the group has closed levels and looks (refinement R13.1, R13.3, R13.5)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- an item needs a heading (its button's name).
        <AccordionItem key="a">x</AccordionItem>,
        // @ts-expect-error -- heading levels are 2–6.
        <Accordion key="b" headingLevel={1} />,
        // @ts-expect-error -- heading levels are 2–6.
        <Accordion key="c" headingLevel={7} />,
        // @ts-expect-error -- not a Typography variant.
        <Accordion key="d" headingVariant="h7" />,
        // @ts-expect-error -- exclusive is a boolean.
        <Accordion key="e" exclusive="yes" />,
      ];
    }
    function valid() {
      return [
        <Accordion key="a" headingLevel={4} headingVariant="body" exclusive region>
          <AccordionItem heading="x" open onOpenChange={() => undefined}>
            y
          </AccordionItem>
          <AccordionItem heading={<span>x</span>} defaultOpen />
        </Accordion>,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Menu parts: icon-only triggers need a name, radio groups need a label (R12.1, R12.2)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- an icon-only trigger needs an accessible name, as Button does.
        <MenuTrigger key="a" iconStart="sun" />,
        // @ts-expect-error -- a radio group needs a label.
        <MenuRadioGroup key="b" defaultValue="x" />,
        // @ts-expect-error -- a radio item needs a value.
        <MenuRadioItem key="c">x</MenuRadioItem>,
        // @ts-expect-error -- the popup's role is fixed.
        <MenuPopup key="d" role="listbox" />,
      ];
    }
    function valid() {
      return (
        <Menu>
          <MenuTrigger iconStart="sun" aria-label="Theme" />
          <MenuPopup>
            <MenuRadioGroup label="Theme" value="light" onValueChange={() => undefined}>
              <MenuRadioItem value="light">Light</MenuRadioItem>
            </MenuRadioGroup>
            <MenuItem onSelect={() => undefined}>Action</MenuItem>
          </MenuPopup>
        </Menu>
      );
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Menu: link options need href, closed placement unions, no separator children (refinement R5.7, R5.8, R5.12)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- newTab does nothing without href.
        <MenuItem key="a" newTab>
          x
        </MenuItem>,
        // @ts-expect-error -- rel does nothing without href.
        <MenuItem key="b" rel="me">
          x
        </MenuItem>,
        // @ts-expect-error -- side is bottom or top.
        <MenuPopup key="c" side="left" />,
        // @ts-expect-error -- align is start or end.
        <MenuPopup key="d" align="center" />,
        // @ts-expect-error -- a separator has no content.
        <MenuSeparator key="e">x</MenuSeparator>,
        // @ts-expect-error -- a checkbox item's role is fixed.
        <MenuCheckboxItem key="f" role="menuitemradio">
          x
        </MenuCheckboxItem>,
      ];
    }
    function valid() {
      return (
        <Menu open onOpenChange={() => undefined}>
          <MenuTrigger iconEnd="chevron-down">Options</MenuTrigger>
          <MenuPopup side="top" align="end">
            <MenuItem icon="mail" closeOnSelect={false}>
              Action
            </MenuItem>
            <MenuItem href="https://github.com/" newTab rel="me" download>
              GitHub
            </MenuItem>
            <MenuSeparator />
            <MenuCheckboxItem checked onCheckedChange={() => undefined} closeOnSelect>
              Wrap
            </MenuCheckboxItem>
            <MenuRadioGroup label="View" defaultValue="grid">
              <MenuRadioItem value="grid" closeOnSelect>
                Grid
              </MenuRadioItem>
            </MenuRadioGroup>
          </MenuPopup>
        </Menu>
      );
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("ThemeSwitcher: Menu's closed placement unions and a boolean showLabel (refinement R10.1, R10.2)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- align is start or end.
        <ThemeSwitcher key="a" align="center" />,
        // @ts-expect-error -- side is bottom or top.
        <ThemeSwitcher key="b" side="left" />,
        // @ts-expect-error -- showLabel is a boolean; unset means automatic.
        <ThemeSwitcher key="c" showLabel="yes" />,
      ];
    }
    function valid() {
      return <ThemeSwitcher align="start" side="top" showLabel={false} />;
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it('VisuallyHidden: as="a" requires focusable, and `as` is a closed text-element union (refinement R2.5, R2.6, R12.11)', () => {
    function invalid() {
      return [
        // @ts-expect-error -- a hidden link must be focusable.
        <VisuallyHidden key="a" as="a" href="#main" />,
        // @ts-expect-error -- a hidden link must be focusable.
        <VisuallyHidden key="b" as="a" focusable={false} href="#main" />,
        // @ts-expect-error -- sectioning elements aren't in the union.
        <VisuallyHidden key="c" as="section" />,
        // @ts-expect-error -- a Tab stop must be focusable (refinement R2.12).
        <VisuallyHidden key="d" as="h2" tabIndex={0} />,
        // @ts-expect-error -- a Tab stop must be focusable (refinement R2.12).
        <VisuallyHidden key="e" focusable={false} tabIndex={0} />,
      ];
    }
    function valid() {
      return [
        <VisuallyHidden key="a" as="a" focusable href="#main" />,
        <VisuallyHidden key="b" as="h2" />,
        <VisuallyHidden key="c" as="label" htmlFor="search" />,
        <VisuallyHidden key="d" as="strong" />,
        <VisuallyHidden key="e" as="li" />,
        <VisuallyHidden key="f" focusable={false} />,
        <VisuallyHidden key="g" as="h2" tabIndex={-1} />,
        <VisuallyHidden key="h" as="div" focusable tabIndex={0} />,
        <VisuallyHidden key="i" focusable={Math.random() > 0.5} />,
        <VisuallyHidden key="j" as="kbd" />,
        <VisuallyHidden key="k" as="time" dateTime="2026-10-20" />,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("Typography: `as` is a closed text-element union, and variant and tone are closed (refinement R12.1, R12.2, R12.5)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- links are Link; a linked heading is a Typography holding a Link.
        <Typography key="a" as="a" href="/" />,
        // @ts-expect-error -- buttons are Button.
        <Typography key="b" as="button" />,
        // @ts-expect-error -- not a variant.
        <Typography key="c" variant="h7" />,
        // @ts-expect-error -- not a tone.
        <Typography key="d" tone="danger" />,
        // @ts-expect-error -- dateTime needs as="time".
        <Typography key="e" dateTime="2026-10-20" />,
      ];
    }
    function valid() {
      return [
        <Typography key="a" as="time" dateTime="2026-10-20" />,
        <Typography key="b" as="label" htmlFor="x" />,
        <Typography key="c" as="h2" variant="h4" tone="muted" measure />,
        <Typography key="d" as="abbr" title="Web Content Accessibility Guidelines" />,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
    expectTypeOf(valid).toBeFunction();
  });

  it("VisuallyHidden, ThemeSwitcher and the remaining unions reject invalid values (R3.4)", () => {
    function invalid() {
      return [
        // @ts-expect-error -- a hidden button has the same problem as a hidden link (refinement R2.6).
        <VisuallyHidden key="a" as="button" />,
        // @ts-expect-error -- href needs as="a".
        <VisuallyHidden key="b" href="/" />,
        // @ts-expect-error -- not a variant.
        <ThemeSwitcher key="c" variant="danger" />,
        // @ts-expect-error -- not a size.
        <ThemeSwitcher key="d" size="lg" />,
        // @ts-expect-error -- the switcher renders its own content.
        <ThemeSwitcher key="e">x</ThemeSwitcher>,
        // @ts-expect-error -- not an icon size.
        <Icon key="f" name="check" size="xl" />,
        // @ts-expect-error -- not a badge size.
        <Badge key="g" size="lg">
          x
        </Badge>,
        // @ts-expect-error -- cards are article, section, div or li.
        <Card key="h" as="span" />,
        // @ts-expect-error -- not an alignment.
        <Stack key="i" align="top" />,
        // @ts-expect-error -- not a justification.
        <Stack key="j" justify="around" />,
        // @ts-expect-error -- icons need appearance="button".
        <Link key="k" href="/" iconStart="check">
          x
        </Link>,
        // @ts-expect-error -- not a variant, even as a button.
        <Link key="l" href="/" appearance="button" variant="danger">
          x
        </Link>,
      ];
    }
    expectTypeOf(invalid).toBeFunction();
  });
});
