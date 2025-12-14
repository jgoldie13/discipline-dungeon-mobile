import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Repo uses lightweight runtime checks; allow `any` where needed.
      "@typescript-eslint/no-explicit-any": "off",
      // Some scripts use CommonJS for Node compatibility.
      "@typescript-eslint/no-require-imports": "off",
      // Allow apostrophes/quotes in JSX text.
      "react/no-unescaped-entities": "off",
      // Effects frequently set state after reading external inputs (URL params, etc.).
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
