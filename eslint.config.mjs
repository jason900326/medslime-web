import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // These files are copied verbatim from pdfjs-dist by postinstall. They are
    // third-party browser assets, not MedSlime source code.
    ignores: [
      "public/pdf.worker.min.mjs",
      "public/pdfjs/**",
      "types/pdfjs-dist.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Existing, localized lint debt. Keep these visible as warnings while CI
    // blocks all new errors elsewhere in the codebase.
    files: ["app/study/exam/quiz/page.tsx", "components/ai-explanation-button.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    // PDF.js' browser/Safari interop surfaces intentionally use loose runtime
    // objects. TypeScript still checks the rest of this component strictly.
    files: ["components/official-question-crop.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Tailwind v3 plugins are CommonJS-compatible and this config predates the
    // app's ESM migration. Keep the single require visible without blocking CI.
    files: ["tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
];

export default eslintConfig;
