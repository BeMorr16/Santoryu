import type { RouteHandle } from "../../shell/route-handle.ts";
import { ComponentsSideMenu } from "./SideMenu.tsx";

/** The route handle of every docs page: the side menu, before main (ds-components R2.1). */
export const docsHandle = { Aside: ComponentsSideMenu } satisfies RouteHandle;
