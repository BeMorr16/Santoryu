import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "web/build/",
    "**/.react-router/",
    "web/src/generated/",
    "**/coverage/",
    "**/cdk.out/",
    "e2e/playwright-report/",
    "e2e/test-results/",
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "jsx-a11y": fixupPluginRules(jsxA11y),
    },
    languageOptions: jsxA11y.flatConfigs.strict.languageOptions,
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Scrollable regions (e.g. wide /lab tables) must be keyboard-focusable. Decision 0002.
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "region"], allowExpressionValues: true },
      ],
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // CloudFront Functions (cloudfront-js-2.0): classic scripts with no host globals. The runtime
    // also lacks some ES2015+ syntax, so those forms are reported. Decision 0005.
    files: ["infra/functions/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2020,
      globals: Object.fromEntries(
        Object.keys({ ...globals.browser, ...globals.node }).map((name) => [name, "off"]),
      ),
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        ...[
          ["ForOfStatement", "for...of"],
          ["SpreadElement", "Spread syntax"],
          ["ObjectPattern, ArrayPattern", "Destructuring"],
          ["AssignmentPattern", "Default parameters"],
          ["ChainExpression", "Optional chaining"],
          ["LogicalExpression[operator='??']", "Nullish coalescing"],
          ["ClassDeclaration, ClassExpression", "class"],
          ["ImportDeclaration, ExportNamedDeclaration, ExportDefaultDeclaration", "Modules"],
        ].map(([selector, feature]) => ({
          selector,
          message: `${feature} is not supported by the cloudfront-js-2.0 runtime.`,
        })),
      ],
    },
  },
);
