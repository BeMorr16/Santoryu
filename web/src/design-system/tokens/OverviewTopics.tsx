import { CodeBlock } from "../../components/CodeBlock/CodeBlock.tsx";
import { minimumRatio } from "../../tokens/contrast.ts";
import { DocSection } from "../DocSection.tsx";
import showcaseStyles from "../components/Showcase.module.css";
import { semanticUsageCode, stylingCode } from "../snippets.ts";
import { topicSections } from "./reference-ids.ts";
import { namingExamples, pairingCount, reducedCount, themedCount, tierRules } from "./stats.ts";
import { TokenLink } from "./TokenLink.tsx";

/** The prose's example: the semantic one among the naming examples. */
const semanticExample = (() => {
  const token = namingExamples.find((example) => example.tier === "semantic");
  if (token?.tier !== "semantic") throw new Error("Naming needs a semantic example");
  return token;
})();

const tierNames = { primitive: "Primitive", semantic: "Semantic", component: "Component" } as const;

/** Naming, Theming, Usage and Accessibility, with every figure and example from metadata (ds-tokens R3). */
export function OverviewTopics() {
  return (
    <>
      <DocSection {...topicSections.naming}>
        <p>
          A token&apos;s name is a dotted path: its category, a group, then the name, as in{" "}
          <code>{semanticExample.name}</code>. Semantic and component tokens are CSS custom
          properties named by the same path, with each dot as a dash:{" "}
          <code>{semanticExample.cssVar}</code>. Primitives never become custom properties.
        </p>
        <ul className={showcaseStyles.notes}>
          {namingExamples.map((token) => (
            <li key={token.name}>
              {tierNames[token.tier]}: <TokenLink token={token.name} />
              {token.tier === "primitive" ? (
                ", no custom property"
              ) : (
                <>
                  {" "}
                  becomes <code>{token.cssVar}</code>
                </>
              )}
            </li>
          ))}
        </ul>
        <p>Each tier has one rule:</p>
        <ul className={showcaseStyles.notes}>
          {(["primitive", "semantic", "component"] as const).map((tier) => (
            <li key={tier}>
              {tierNames[tier]}: {tierRules[tier]}
            </li>
          ))}
        </ul>
      </DocSection>
      <DocSection {...topicSections.theming}>
        <p>
          The theme menu offers System, which follows the device&apos;s setting, Light and Dark.
          Themes override semantic tokens only: {themedCount} of them have a light and a dark value.
          Primitives and component tokens never change, and since every component token aliases a
          semantic one, a theme reaches every component.
        </p>
        <p>
          Any element can set its own theme with <code>data-theme=&quot;light&quot;</code> or{" "}
          <code>data-theme=&quot;dark&quot;</code>, and every token inside it follows, as in the
          component pages&apos; preview panels.
        </p>
        <p>
          When the device asks for reduced motion, the {reducedCount} <code>motion.duration</code>{" "}
          tokens are overridden, so transitions are instant.
        </p>
      </DocSection>
      <DocSection {...topicSections.usage}>
        <p>Use semantic tokens in a page&apos;s own CSS:</p>
        <CodeBlock label="CSS" language="css">
          {semanticUsageCode}
        </CodeBlock>
        <p>
          To restyle a component, override its <code>--component-*</code> tokens on a wrapper class.
          Each component page lists its tokens.
        </p>
        <CodeBlock label="CSS" language="css">
          {stylingCode}
        </CodeBlock>
      </DocSection>
      <DocSection {...topicSections.accessibility}>
        <p>
          Each foreground token declares the backgrounds it must be readable on, and the minimum
          contrast it needs there: {minimumRatio.text}:1 for text, {minimumRatio["large-text"]}:1
          for large text and {minimumRatio["non-text"]}:1 for borders and icons (WCAG 2.2 AA). A
          unit test measures all {pairingCount} declared pairings in both the light and the dark
          theme, so a token change that breaks one fails the tests.
        </p>
        <p>
          Another test checks that reduced motion overrides every <code>motion.duration</code>{" "}
          token.
        </p>
      </DocSection>
    </>
  );
}
