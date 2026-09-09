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
    const normalize = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );

      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        if (
          parent &&
          !parent.closest("script, style, textarea, [data-preserve-era-label]")
        ) {
          const current = node.nodeValue ?? "";
          const next = current.replace(
            /^(\s*)民國\s*(?=\d{2,3}\s*年(?:\s*[·・]|\s*$))/,
            "$1",
          );
          if (next !== current) node.nodeValue = next;
        }
        node = walker.nextNode();
      }
    };

    normalize();
    const observer = new MutationObserver(normalize);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
