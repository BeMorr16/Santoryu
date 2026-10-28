import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { componentPages } from "./design-system/components/pages.ts";

export default [
  index("routes/home.tsx"),
  route("experience", "routes/experience.tsx"),
  route("contact", "routes/contact.tsx"),
  route("design-system", "routes/design-system/index.tsx"),
  route("design-system/tokens", "routes/design-system/tokens.tsx"),
  route("design-system/theme-creator", "routes/design-system/theme-creator.tsx"),
  route("design-system/components", "routes/design-system/components/index.tsx"),
  // One page per component, from the side menu's list (ds-components R6.2).
  ...componentPages.map(({ id }) =>
    route(`design-system/components/${id}`, `routes/design-system/components/${id}.tsx`),
  ),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
