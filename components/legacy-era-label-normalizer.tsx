"use client";

import { useEffect } from "react";

/*
 * New UI copy omits the redundant 「民國」 prefix. A few older records and
 * legacy screen fragments may still contain labels such as
 * 「民國 115 年・第 1 次」. Keep those historical values intact in storage,
 * but normalize their rendered label until every old record has been rewritten.
 *
 * This deliberately only touches text that STARTS with a ROC exam-year label,
 * so source question content that merely mentions a historical year in prose is
 * left alone.
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
