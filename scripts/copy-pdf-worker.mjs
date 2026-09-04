import {
  cp,
  mkdir,
  copyFile,
  access,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyFileAsset(sourceRelative, targetRelative) {
  const source = resolve(sourceRelative);
  const target = resolve(targetRelative);

  if (!(await exists(source))) {
    console.warn(`⚠ skipped missing asset: ${sourceRelative}`);
    return;
  }

  await mkdir(dirname(target), {
    recursive: true,
  });

  await copyFile(source, target);

  console.log(`✓ copied ${sourceRelative} → ${targetRelative}`);
}

async function copyDirectoryAsset(sourceRelative, targetRelative) {
  const source = resolve(sourceRelative);
  const target = resolve(targetRelative);

  if (!(await exists(source))) {
    console.warn(`⚠ skipped missing asset directory: ${sourceRelative}`);
    return;
  }

  await mkdir(target, {
    recursive: true,
  });

  await cp(source, target, {
    recursive: true,
    force: true,
  });

  console.log(`✓ copied ${sourceRelative} → ${targetRelative}`);
}

// Worker
await copyFileAsset(
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "public/pdf.worker.min.mjs",
);

// PDF.js v5 auxiliary assets.
// JPX / JPEG2000 images rely on OpenJPEG WASM;
// without these assets some official exam images render as blank.
await copyDirectoryAsset(
  "node_modules/pdfjs-dist/wasm",
  "public/pdfjs/wasm",
);

await copyDirectoryAsset(
  "node_modules/pdfjs-dist/cmaps",
  "public/pdfjs/cmaps",
);

await copyDirectoryAsset(
  "node_modules/pdfjs-dist/standard_fonts",
  "public/pdfjs/standard_fonts",
);

await copyDirectoryAsset(
  "node_modules/pdfjs-dist/iccs",
  "public/pdfjs/iccs",
);

console.log("✓ PDF.js browser assets are ready");
