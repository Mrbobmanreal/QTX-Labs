
import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx"],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        THREE: "readonly",
        confirm: "readonly",
        Audio: "readonly",
        indexedDB: "readonly",
        URL: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        requestAnimationFrame: "readonly",
        Blob: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
    },
  },
];
