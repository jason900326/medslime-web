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
  /*
   * Safari 26.x 與新版 pdf.js 的已知相容性問題：
   * page.getTextContent() 內部使用 for-await-of 讀 ReadableStream，
   * 但部分 Safari 的 ReadableStream 沒有 Symbol.asyncIterator，
   * 會噴出：
   * "undefined is not a function (near '...value of readableStream...')"
   *
   * 改成直接使用 streamTextContent().getReader()，
   * 避開 pdf.js 內部那段 for-await-of。
   */
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
      // Safari 上 releaseLock 失敗也不影響結果。
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
  /*
   * iPad Safari 對 pdf.js 的串流讀取相容性比較差。
   * 先把整份 PDF 下載成 ArrayBuffer，再交給 pdf.js。
   */
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

  /*
   * 動態 import 只在瀏覽器執行。
   * 使用 modern build，但完全不讓 pdf.js 自己 fetch PDF。
   */
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;

  try {
    const start = await findAnchor(pdf, questionNumber);

    if (!start) {
      throw new Error(`找不到第 ${questionNumber} 題在官方 PDF 中的位置。`);
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
        cropBottom = Math.min(canvas.height, viewportY - 12);
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
      throw new Error("已找到題號，但沒有產生可顯示的題目裁切圖。");
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

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div
        className={[
          "rounded-[18px] border border-[#dfe8e2] bg-[#f8fcf9] text-center font-bold text-[#789083]",
          compact ? "p-4 text-sm" : "p-6",
        ].join(" ")}
      >
        <div className="mx-auto h-8 w-10 animate-pulse rounded-[50%_50%_42%_42%/56%_56%_42%_42%] border-2 border-[#8fd0a9] bg-[#d9f3e4]" />
        <div className="mt-3">正在定位官方第 {questionNumber} 題…</div>
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
              images.length > 1 ? `第 ${index + 1} 段` : ""
            }`}
            className="h-auto w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
