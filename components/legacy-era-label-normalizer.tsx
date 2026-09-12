"use client";

import { useEffect } from "react";

const DECORATIVE_ENGLISH_LABELS = new Set([
  "TODAY'S STUDY",
  "MY ROOM",
  "WELCOME TO MEDSLIME",
  "EXAM REVIEW",
  "RESULT",
  "OFFICIAL QUESTION",
  "MEDSLIME PRO",
  "30-DAY ACCESS",
  "ONE-TIME PURCHASE",
]);

/*
 * Keep historical stored labels intact while cleaning a few legacy UI fragments
 * at render time. This component is intentionally conservative: it only touches
 * exact decorative labels or text that starts with an old ROC-era prefix.
 */
export default function LegacyEraLabelNormalizer() {
  useEffect(() => {
    const normalizeTextNode = (node: Node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const parent = node.parentElement;
      if (
        !parent ||
        parent.closest("script, style, textarea, [data-preserve-era-label]")
      ) {
        return;
      }

      const current = node.nodeValue ?? "";
      const next = current.replace(
        /^(\s*)民國\s*(?=\d{2,3}\s*年(?:\s*[·・]|\s*$))/,
        "$1",
      );
      if (next !== current) node.nodeValue = next;

      if (DECORATIVE_ENGLISH_LABELS.has((node.nodeValue ?? "").trim())) {
        parent.hidden = true;
      }

      if ((node.nodeValue ?? "").includes("✓ 已永久解鎖")) {
        const panel = parent.closest("section");
        if (
          panel instanceof HTMLElement &&
          panel.textContent?.includes("這份考卷的解析權限") &&
          panel.dataset.transientUnlockedProcessed !== "1"
        ) {
          panel.dataset.transientUnlockedProcessed = "1";
          panel.style.display = "none";

          const notice = document.createElement("div");
          notice.setAttribute("role", "status");
          notice.className =
            "mt-5 rounded-2xl border border-[#bfe1cb] bg-[#eefaf2] px-4 py-3 text-sm font-black leading-6 text-[#237849] shadow-[0_6px_18px_rgba(31,83,53,0.04)] transition-opacity duration-300";
          notice.textContent = "✓ 本卷詳解已解鎖，可以直接查看需要的題目。";
          panel.before(notice);

          window.setTimeout(() => {
            notice.style.opacity = "0";
            window.setTimeout(() => notice.remove(), 320);
          }, 4200);
        }
      }
    };

    const normalizeTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        normalizeTextNode(root);
        return;
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        normalizeTextNode(node);
        node = walker.nextNode();
      }
    };

    normalizeTree(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") {
          normalizeTextNode(record.target);
          continue;
        }
        record.addedNodes.forEach(normalizeTree);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
