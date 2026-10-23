import { hubData } from "../../generated/hub-data.ts";
import { MAX_CUSTOM_THEMES } from "../../theme/custom-themes.ts";
import { componentPages } from "../components/pages.ts";
import { presets } from "../theme-creator/model/presets.ts";
import type { HubCardId } from "./cards.ts";

const groups = new Set(componentPages.map((page) => page.group)).size;

/** Each card's footer, from the data (ds-hub R3.4). None of these figures can realistically be 1. */
export const cardCounts: Record<HubCardId, string> = {
  tokens: `${String(hubData.tokens.total)} tokens in ${String(hubData.tokens.tiers)} tiers`,
  components: `${String(componentPages.length)} components in ${String(groups)} groups`,
  "theme-creator": `${String(hubData.themeCreator.categories)} categories, ${String(presets.length)} presets, save up to ${String(MAX_CUSTOM_THEMES)} themes`,
};
