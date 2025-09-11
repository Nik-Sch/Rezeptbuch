import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js, pluginReact }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      "@typescript-eslint/no-deprecated": "warn"
    }
  }
]);
