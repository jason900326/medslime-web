import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
);
const target = resolve(
  "public/pdf.worker.min.mjs",
);

await mkdir(dirname(target), {
  recursive: true,
});

await copyFile(source, target);

console.log(
  "✓ copied pdf.worker.min.mjs to public/",
);
