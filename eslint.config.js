import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist/", "dist-web/", "test-results/", "playwright-report/", "node_modules/"] },
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser } },
  },
  {
    files: ["scripts/**/*.js", "tests/**/*.js", "*.config.js", "src/game-log-local.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["electron/**/*.cjs"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: { ...globals.node } },
  },
  // Web app (React + TypeScript).
  ...tseslint.config({
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "error",
    },
  }),
  {
    files: ["apps/web/vite.config.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
];
