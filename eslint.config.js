import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "dist-web/", "test-results/", "playwright-report/", "node_modules/"] },
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser } }
  },
  {
    files: ["scripts/**/*.js", "tests/**/*.js", "*.config.js", "src/game-log-local.js"],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ["electron/**/*.cjs"],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: { ...globals.node } }
  }
];
