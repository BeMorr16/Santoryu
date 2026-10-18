import { BackToLab } from "../lab/BackToLab.tsx";
import { ComponentsPage } from "../lab/components/ComponentsPage.tsx";
import { siteName, siteUrl } from "../site.config.ts";
import type { Route } from "./+types/lab-components";

export function meta(): Route.MetaDescriptors {
  return [
    { title: `Components · Lab · ${siteName}` },
    {
      name: "description",
      content:
        "The component library behind this site: live examples, props, styling hooks and accessibility notes.",
    },
  ];
}

export function links(): Route.LinkDescriptors {
  return [{ rel: "canonical", href: `${siteUrl}/lab/components` }];
}

export default function LabComponents() {
  return (
    <>
      <BackToLab />
      <h1>Components</h1>
      <p>
        The component library this site is built from. Each component has live examples in a panel
        with its own theme menu, its props, the tokens you can override to restyle it, and how it
        works with a keyboard and assistive technology.
      </p>
      <ComponentsPage />
    </>
  );
}
