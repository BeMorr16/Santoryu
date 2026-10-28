import { ContactPage } from "../contact/ContactPage.tsx";
import { contactContent } from "../content/contact.ts";
import { contactHref } from "../shell/nav.ts";
import { pageMeta } from "../shell/page-meta.ts";
import type { RouteHandle } from "../shell/route-handle.ts";

export const handle = { backdrop: "striking" } satisfies RouteHandle;

const page = pageMeta(contactHref, contactContent.heading, contactContent.description);

export const meta = page.meta;
export const links = page.links;

export default function Contact() {
  return <ContactPage />;
}
