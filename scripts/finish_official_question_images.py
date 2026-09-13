#!/usr/bin/env python3
"""Finish the image-question backfill for rows missed by text-only heuristics.

The first pass intentionally required explicit phrases such as "如下圖" so it
would not turn every mention of 心電圖 / 影像 into a screenshot. That leaves a
second class of questions behind: wording such as "下列心電圖的判讀" or image
only questions whose extracted stem is empty.

This pass uses the PDF itself as the source of truth:
- direct visual wording is accepted immediately;
- otherwise the question segment is inspected for embedded raster images or
  substantial vector drawings;
- rows that were keyword false positives and contain no visual material are
  cleared from has_image_hint so future runs do not keep retrying them.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from collections import defaultdict
from typing import Any

import fitz
import requests

# Importing the compatibility wrapper installs the working Supabase Storage SDK
# uploader and backend-safe authentication onto the base implementation.
from scripts import run_preprocess_official_question_images as compat

base = compat.impl


DIRECT_VISUAL_PATTERNS = [
    re.compile(r"圖中(?:的)?"),
    re.compile(r"(?:左圖|右圖|上圖|下圖|前圖|後圖)"),
    re.compile(r"(?:下方|上方|以下|上述).{0,8}(?:圖|心電圖|影像|照片)"),
    re.compile(r"(?:對此|此|該).{0,6}(?:心電圖|電泳圖|影像|照片).{0,10}(?:判讀|診斷|分析|顯示)"),
    re.compile(r"(?:心電圖|電泳圖|曲線圖|圖像|影像|照片).{0,10}(?:如下|如下所示|所示|判讀|診斷)"),
    re.compile(r"(?:下列|以下).{0,8}(?:心電圖|電泳圖|圖像|影像|照片).{0,10}(?:判讀|診斷|分析)"),
    re.compile(r"(?:電泳圖|圖像).{0,8}(?:呈現|出現)"),
]


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "")).replace("「", "").replace("」", "")


def has_direct_visual_wording(value: Any) -> bool:
    text = compact_text(value)
    if base.is_explicit_visual_reference(text):
        return True
    return any(pattern.search(text) for pattern in DIRECT_VISUAL_PATTERNS)


def rect_intersection_area(a: fitz.Rect, b: fitz.Rect) -> float:
    inter = a & b
    if inter.is_empty or inter.width <= 0 or inter.height <= 0:
        return 0.0
    return float(inter.width * inter.height)


def iter_question_clips(
    doc: fitz.Document,
    start: base.Anchor,
    next_anchor: base.Anchor | None,
):
    last_page = next_anchor.page_index if next_anchor else start.page_index
    if last_page < start.page_index:
        last_page = start.page_index

    for page_index in range(start.page_index, last_page + 1):
        page = doc.load_page(page_index)
        top = page.rect.y0 + 10
        bottom = page.rect.y1 - 18
        if page_index == start.page_index:
            top = max(page.rect.y0, start.y - 4)
        if next_anchor and page_index == next_anchor.page_index:
            bottom = min(page.rect.y1, next_anchor.y - 4)
        if bottom <= top + 4:
            continue
        side_margin = max(8.0, page.rect.width * 0.025)
        yield page, fitz.Rect(side_margin, top, page.rect.width - side_margin, bottom)


def segment_has_visual_objects(
    doc: fitz.Document,
    start: base.Anchor,
    next_anchor: base.Anchor | None,
) -> tuple[bool, str]:
    """Detect meaningful non-text graphics inside one question segment.

    Raster images are strong evidence. Vector evidence is intentionally more
    conservative because PDF decorations and underlines also appear as drawings.
    """

    raster_hits = 0
    raster_area = 0.0
    vector_hits = 0
    vector_area = 0.0

    for page, clip in iter_question_clips(doc, start, next_anchor):
        clip_area = max(1.0, float(clip.width * clip.height))

        try:
            blocks = page.get_text("dict").get("blocks", [])
        except Exception:  # noqa: BLE001
            blocks = []
        for block in blocks:
            if int(block.get("type", 0)) != 1:
                continue
            bbox = block.get("bbox")
            if not bbox:
                continue
            area = rect_intersection_area(fitz.Rect(bbox), clip)
            # Ignore tiny icons / artifacts. A real exam figure usually occupies
            # far more than this, but this threshold still catches small panels.
            if area >= 300 or area / clip_area >= 0.002:
                raster_hits += 1
                raster_area += area

        try:
            drawings = page.get_drawings()
        except Exception:  # noqa: BLE001
            drawings = []
        for drawing in drawings:
            rect = drawing.get("rect")
            if not rect:
                continue
            rect = fitz.Rect(rect)
            area = rect_intersection_area(rect, clip)
            if area <= 0:
                continue
            inter = rect & clip
            # Drop hairlines and tiny glyph-like artifacts. ECGs, plots, tables,
            # diagrams and other vector figures usually contribute several sizable
            # paths or a materially large bounding area.
            if inter.width < 12 or inter.height < 6 or area < 80:
                continue
            vector_hits += 1
            vector_area += area

    if raster_hits:
        return True, f"raster={raster_hits}, area={raster_area:.0f}"
    if vector_hits >= 3 or vector_area >= 3500:
        return True, f"vector={vector_hits}, area={vector_area:.0f}"
    return False, f"raster=0, vector={vector_hits}, area={vector_area:.0f}"


def fetch_remaining(client: base.SupabaseClient) -> list[dict[str, Any]]:
    return client._rest_get(  # noqa: SLF001 - internal helper is intentional here
        {
            "select": (
                "id,roc_year,exam_round,subject,question_number,question,"
                "question_pdf_url,question_pdf_page,image_url,has_image_hint"
            ),
            "has_image_hint": "eq.true",
            "image_url": "is.null",
            "order": "roc_year.desc,exam_round.desc,subject.asc,question_number.asc",
            "limit": "1000",
        }
    )


def clear_false_positive(client: base.SupabaseClient, row_id: int) -> None:
    response = client.session.patch(
        f"{client.base_url}/rest/v1/national_exam_questions",
        params={"id": f"eq.{row_id}"},
        json={"has_image_hint": False},
        headers={"Prefer": "return=minimal"},
        timeout=30,
    )
    response.raise_for_status()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="0 means process all")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supabase_url = base.env("SUPABASE_URL")
    service_key = base.env("SUPABASE_SERVICE_ROLE_KEY")
    client = base.SupabaseClient(supabase_url, service_key, base.DEFAULT_BUCKET)

    rows = fetch_remaining(client)
    if args.limit > 0:
        rows = rows[: args.limit]
    if not rows:
        print("沒有剩餘的圖片候選題。")
        return 0

    print(f"第二階段檢查 {len(rows)} 題。")
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unresolved_no_pdf: list[dict[str, Any]] = []
    for row in rows:
        pdf_url = str(row.get("question_pdf_url") or "").strip()
        if not pdf_url:
            unresolved_no_pdf.append(row)
        else:
            groups[pdf_url].append(row)

    download_session = requests.Session()
    rendered = 0
    cleared = 0
    failed = 0
    failures: list[str] = []

    for index, (pdf_url, group_rows) in enumerate(groups.items(), start=1):
        print(f"[{index}/{len(groups)}] 檢查 PDF：{len(group_rows)} 題")
        try:
            paper_rows = client.paper_rows(pdf_url)
            valid_numbers = {
                int(item.get("question_number") or 0)
                for item in paper_rows
                if int(item.get("question_number") or 0) > 0
            }
            pdf_bytes = base.download_pdf(pdf_url, download_session)
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            anchors = base.detect_anchors(doc, valid_numbers)
            try:
                for row in group_rows:
                    row_id = int(row["id"])
                    q = int(row.get("question_number") or 0)
                    start = anchors.get(q)
                    if not start:
                        failed += 1
                        failures.append(f"#{row_id} Q{q}: 找不到題號定位點")
                        print(f"  ✗ #{row_id} Q{q}: 找不到題號定位點", file=sys.stderr)
                        continue

                    next_anchor = anchors.get(q + 1)
                    direct = has_direct_visual_wording(row.get("question"))
                    detected, evidence = segment_has_visual_objects(doc, start, next_anchor)

                    if not direct and not detected:
                        if not args.dry_run:
                            clear_false_positive(client, row_id)
                        cleared += 1
                        print(f"  · #{row_id} Q{q}: 非圖片題，清除誤判 ({evidence})")
                        continue

                    try:
                        image, page_number = base.render_question(doc, start, next_anchor)
                        nonwhite_ratio, total_pixels = base.image_metrics(image)
                        if image.width < 500 or image.height < 120:
                            raise RuntimeError(f"裁切尺寸異常：{image.width}×{image.height}")
                        if total_pixels < 100_000 or nonwhite_ratio < 0.001:
                            raise RuntimeError(
                                f"產出內容疑似空白（nonwhite={nonwhite_ratio:.4f}）"
                            )
                        png = base.encode_png(image)
                        if len(png) < 8_000:
                            raise RuntimeError(f"PNG 過小：{len(png)} bytes")

                        if not args.dry_run:
                            path = base.object_path(row)
                            public_url = client.upload_png(path, png)
                            client.update_question(row_id, public_url, page_number)
                        rendered += 1
                        why = "文字明確指向圖片" if direct else evidence
                        print(f"  ✓ #{row_id} Q{q}: 補圖完成 ({why})")
                    except Exception as error:  # noqa: BLE001
                        failed += 1
                        failures.append(f"#{row_id} Q{q}: {error}")
                        print(f"  ✗ #{row_id} Q{q}: {error}", file=sys.stderr)
            finally:
                doc.close()
        except Exception as error:  # noqa: BLE001
            failed += len(group_rows)
            failures.append(f"PDF {pdf_url}: {error}")
            print(f"  ✗ 整份 PDF 檢查失敗：{error}", file=sys.stderr)

    for row in unresolved_no_pdf:
        failed += 1
        failures.append(f"#{row['id']}: 缺少官方 PDF URL")

    print(
        f"第二階段完成：補圖 {rendered}，確認非圖片題 {cleared}，"
        f"仍需處理 {failed}。"
    )
    if failures:
        print("仍需處理：", file=sys.stderr)
        for item in failures[:80]:
            print(f"  - {item}", file=sys.stderr)
        if len(failures) > 80:
            print(f"  - …其餘 {len(failures) - 80} 項", file=sys.stderr)

    # A few irregular legacy PDFs should not hide successful work. Return a hard
    # failure only if the entire second pass could not classify a single row.
    if failed and rendered == 0 and cleared == 0:
        return 1
    return 0


if __name__ == "__main__":
    started = time.time()
    code = main()
    print(f"耗時 {time.time() - started:.1f}s")
    raise SystemExit(code)
