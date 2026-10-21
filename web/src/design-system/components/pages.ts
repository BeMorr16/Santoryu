// Plain data with no imports: routes.ts and react-router.config.ts load it too (ds-components design §3.1).

export const componentGroups = ["Actions", "Content", "Layout", "Disclosure", "Utilities"] as const;
export type ComponentGroup = (typeof componentGroups)[number];

/**
 * Every component page, in side-menu order (R2.2). `name` is also the component's folder under
 * web/src/components/, so it gives the page's source link.
 */
export const componentPages = [
  { id: "button", name: "Button", group: "Actions" },
  { id: "link", name: "Link", group: "Actions" },
  { id: "menu", name: "Menu", group: "Actions" },
  { id: "back-to-top", name: "BackToTop", group: "Actions" },
  { id: "typography", name: "Typography", group: "Content" },
  { id: "code-block", name: "CodeBlock", group: "Content" },
  { id: "table", name: "Table", group: "Content" },
  { id: "figure", name: "Figure", group: "Content" },
  { id: "separator", name: "Separator", group: "Content" },
  { id: "badge", name: "Badge", group: "Content" },
  { id: "stack", name: "Stack", group: "Layout" },
  { id: "grid", name: "Grid", group: "Layout" },
  { id: "card", name: "Card", group: "Layout" },
  { id: "accordion", name: "Accordion", group: "Disclosure" },
  { id: "tooltip", name: "Tooltip", group: "Disclosure" },
  { id: "icon", name: "Icon", group: "Utilities" },
  { id: "visually-hidden", name: "VisuallyHidden", group: "Utilities" },
  { id: "theme-switcher", name: "ThemeSwitcher", group: "Utilities" },
] as const satisfies readonly { id: string; name: string; group: ComponentGroup }[];

export type ComponentPage = (typeof componentPages)[number];
export type ComponentPageId = ComponentPage["id"];

export const designSystemPath = "/design-system";
export const tokensPath = `${designSystemPath}/tokens`;
export const componentsPath = `${designSystemPath}/components`;
export const componentPath = (id: ComponentPageId) => `${componentsPath}/${id}`;

/** The page with this id. */
export function componentPage(id: ComponentPageId): ComponentPage {
  const page = componentPages.find((candidate) => candidate.id === id);
  if (!page) throw new Error(`No component page "${id}"`);
  return page;
}

/** Overview, then every component page: previous/next order (R4.9). */
export const docsSequence: readonly { href: string; name: string }[] = [
  { href: componentsPath, name: "Overview" },
  ...componentPages.map(({ id, name }) => ({ href: componentPath(id), name })),
];
