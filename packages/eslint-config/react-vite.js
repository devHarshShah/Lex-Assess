import { config as reactInternalConfig } from "./react-internal.js";

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  ...reactInternalConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // TanStack Router route modules intentionally export route constants.
      "react-refresh/only-export-components": "off",
    },
  },
];
