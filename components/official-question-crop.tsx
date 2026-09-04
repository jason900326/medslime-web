"use client";

import { useEffect, useState } from "react";

type CropState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; images: string[] }
  | { status: "error"; message: string };

type TextAnchor = {
  pageIndex: number;
  x: number;
  y: number;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuestionNumber(text: string, questionNumber: number) {
  const value = text.replace(/\s+/g, " ").trim();

  if (!value) return false;

  const n = escapeRegExp(String(questionNumber));

  return (
    new RegExp(`^${n}\\s*[\\.．、\\)）:]\\s*`).test(value) ||
    new RegExp(`^${n}$`).test(value)
  );
}

async function getTextItemsSafariSafe(page: any) {
  const stream = page.streamTextContent();
  const reader = stream.getReader();
  const items: any[] = [];

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      if (value?.items && Array.isArray(value.items)) {
        items.push(...value.items);
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Safari 上 releaseLock 失敗不影響已取得的文字。
    }
  }

  return items;
}

async function findAnchor(
  pdf: any,
  questionNumber: number,
): Promise<TextAnchor | null> {
  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex + 1);
    const items = await getTextItemsSafariSafe(page);

    const candidates = items
      .filter(
        (item: any) =>
          typeof item?.str === "string" &&
          Array.isArray(item?.transform),
      )
      .map((item: any) => ({
        text: String(item.str),
        x: Number(item.transform[4] ?? 0),
        y: Number(item.transform[5] ?? 0),
      }))
      .filter((item: { text: string; x: number; y: number }) =>
        matchesQuestionNumber(item.text, questionNumber),
      )
      .sort(
        (
          a: { text: string; x: number; y: number },
          b: { text: string; x: number; y: number },
        ) => a.x - b.x,
      );

    const preferred =
      candidates.find((item: { x: number }) => item.x < 180) ??
      candidates[0];

    if (preferred) {
      return {
        pageIndex,
        x: preferred.x,
        y: preferred.y,
      };
    }
  }

  return null;
}

function rowHasVisibleContent(
  pixels: Uint8ClampedArray,
  width: number,
  y: number,
) {
  let visible = 0;

  // 每 2 px 掃一次，避免手機上成本太高。
  for (let x = 0; x < width; x += 2) {
    const index = (y * width + x) * 4;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const a = pixels[index + 3];

    // 不是接近純白就視為內容。
    if (a > 10 && (r < 248 || g < 248 || b < 248)) {
      visible += 1;

      // 只要有少量內容即可，不要求整列很密，
      // 這樣圖片、線條、標本圖都不容易被漏掉。
      if (visible >= 5) {
        return true;
      }
    }
  }

  return false;
}

function findLastQuestionBottom(
  source: HTMLCanvasElement,
  cropTop: number,
) {
  const context = source.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    return source.height - 18;
  }

  // 忽略最底下約 4%：很多官方 PDF 的頁碼 / footer 會在這裡。
  const scanBottom = Math.max(
    cropTop + 40,
    Math.floor(source.height * 0.96),
  );

  const scanHeight = Math.max(1, scanBottom - cropTop);

  const imageData = context.getImageData(
    0,
    cropTop,
    source.width,
    scanHeight,
  );

  const pixels = imageData.data;
  let lastContentRow = -1;

  for (let y = 0; y < scanHeight; y += 1) {
    if (
      rowHasVisibleContent(
        pixels,
        source.width,
        y,
      )
    ) {
      lastContentRow = y;
    }
  }

  if (lastContentRow < 0) {
    return source.height - 18;
  }

  // 留一點底部空間，不要貼著最後一行文字 / 圖片。
  return Math.min(
    source.height - 18,
    cropTop + lastContentRow + 24,
  );
}

function canvasToDataUrl(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
) {
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.floor(sw));
  output.height = Math.max(1, Math.floor(sh));

  const context = output.getContext("2d");

  if (!context) {
    throw new Error("瀏覽器無法建立圖片畫布。");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, output.width, output.height);
  context.drawImage(
    source,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    output.width,
    output.height,
  );

  return output.toDataURL("image/png", 0.94);
}

async function renderQuestionCrops(
  pdfUrl: string,
  questionNumber: number,
) {
  const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;

  const response = await fetch(proxyUrl, {
    method: "GET",
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`官方 PDF 下載失敗：HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const pdfBytes = new Uint8Array(arrayBuffer);

  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    isEvalSupported: false,

    // PDF.js v5 的部分圖片格式（尤其 JPEG2000 / JPX）
    // 需要 OpenJPEG WASM 才能解碼。
    // 如果沒提供 wasmUrl，常見症狀就是：
    // 題幹和選項正常，但中間的圖片完全空白。
    wasmUrl: "/pdfjs/wasm/",

    // 一併提供 PDF.js 常用輔助資源，
    // 避免不同年份官方 PDF 的字型 / CMap / ICC 差異造成缺字或色彩問題。
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    iccUrl: "/pdfjs/iccs/",
  });

  const pdf = await loadingTask.promise;

  try {
    const start = await findAnchor(pdf, questionNumber);

    if (!start) {
      throw new Error(
        `找不到第 ${questionNumber} 題在官方 PDF 中的位置。`,
      );
    }

    const next = await findAnchor(pdf, questionNumber + 1);

    const lastPageIndex =
      next && next.pageIndex >= start.pageIndex
        ? next.pageIndex
        : start.pageIndex;

    const scale = 1.7;
    const images: string[] = [];

    for (
      let pageIndex = start.pageIndex;
      pageIndex <= lastPageIndex;
      pageIndex += 1
    ) {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("瀏覽器無法建立 PDF 畫布。");
      }

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      } as any).promise;

      let cropTop = 18;
      let cropBottom = canvas.height - 18;

      if (pageIndex === start.pageIndex) {
        const [, viewportY] = viewport.convertToViewportPoint(
          start.x,
          start.y,
        );
        cropTop = Math.max(0, viewportY - 24);
      }

      if (next && pageIndex === next.pageIndex) {
        const [, viewportY] = viewport.convertToViewportPoint(
          next.x,
          next.y,
        );
        cropBottom = Math.min(
          canvas.height,
          viewportY - 12,
        );
      }

      /*
       * 重點：
       * 有下一題時，完全相信「下一題題號」當作裁切下界。
       * 不再用內部空白區判斷題目是否結束。
       *
       * 圖片題常常是：
       * 題幹
       * ↓
       * 一大段白底圖片區
       * ↓
       * 選項
       *
       * 如果看到長空白就裁掉，圖片會消失或只剩一部分。
       *
       * 只有最後一題（通常第 80 題）沒有下一題 anchor，
       * 才用整張已 render 的 canvas 找「最後一個實際內容 row」，
       * 去掉頁底巨大空白。
       */
      if (!next) {
        cropBottom = findLastQuestionBottom(
          canvas,
          cropTop,
        );
      }

      if (cropBottom <= cropTop + 20) continue;

      const sideMargin = Math.max(
        12,
        Math.round(canvas.width * 0.035),
      );

      images.push(
        canvasToDataUrl(
          canvas,
          sideMargin,
          cropTop,
          canvas.width - sideMargin * 2,
          cropBottom - cropTop,
        ),
      );
    }

    if (images.length === 0) {
      throw new Error(
        "已找到題號，但沒有產生可顯示的題目裁切圖。",
      );
    }

    return images;
  } finally {
    await loadingTask.destroy();
  }
}

export default function OfficialQuestionCrop({
  pdfUrl,
  questionNumber,
  compact = false,
}: {
  pdfUrl: string | null;
  questionNumber: number;
  compact?: boolean;
}) {
  const [state, setState] = useState<CropState>({
    status: "idle",
  });

  useEffect(() => {
    let cancelled = false;

    if (!pdfUrl || !questionNumber) {
      setState({
        status: "error",
        message: "這題目前沒有可用的官方 PDF。",
      });
      return;
    }

    const safePdfUrl = pdfUrl;

    async function run() {
      setState({ status: "loading" });

      try {
        const images = await renderQuestionCrops(
          safePdfUrl,
          questionNumber,
        );

        if (!cancelled) {
          setState({
            status: "ready",
            images,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "官方原題載入失敗。",
          });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, questionNumber]);

  if (
    state.status === "idle" ||
    state.status === "loading"
  ) {
    return (
      <div
        className={[
          "rounded-[18px] border border-[#dfe8e2] bg-[#f8fcf9] text-center font-bold text-[#789083]",
          compact ? "p-4 text-sm" : "p-6",
        ].join(" ")}
      >
        <div className="mx-auto h-8 w-10 animate-pulse rounded-[50%_50%_42%_42%/56%_56%_42%_42%] border-2 border-[#8fd0a9] bg-[#d9f3e4]" />
        <div className="mt-3">
          正在定位官方第 {questionNumber} 題…
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-[18px] border border-[#f0dddd] bg-[#fff8f8] p-4 text-sm font-bold leading-6 text-[#9b5050]">
        {state.message}
      </div>
    );
  }

  const images = state.images;

  return (
    <div className="space-y-3">
      {images.map((image, index) => (
        <div
          key={`${questionNumber}-${index}`}
          className="overflow-hidden rounded-[16px] border border-[#dde7e1] bg-white"
        >
          <img
            src={image}
            alt={`官方第 ${questionNumber} 題${
              images.length > 1
                ? `第 ${index + 1} 段`
                : ""
            }`}
            className="h-auto w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
