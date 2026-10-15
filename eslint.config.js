import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["web/build/", "**/.react-router/", "web/src/generated/", "**/coverage/"]),
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
);
