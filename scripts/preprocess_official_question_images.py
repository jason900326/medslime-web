#!/usr/bin/env python3
"""Pre-render image-based national exam questions into stable static PNGs.

This script is designed for GitHub Actions. It:
1. reads candidate questions from Supabase,
2. downloads each official MOEX PDF once,
3. renders the question area with MuPDF/PyMuPDF,
4. uploads the resulting PNG to a public Supabase Storage bucket,
5. writes the public URL back to national_exam_questions.image_url,
6. emits JSON + Markdown reports for anything that could not be processed.

The website can then prefer image_url and only fall back to browser-side PDF.js.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

import fitz  # PyMuPDF
import requests
from PIL import Image, ImageChops

DEFAULT_BUCKET = "official-question-images"
DEFAULT_TEST_LIMIT = 10
REPORT_DIR = Path("artifacts/official-question-images")
MOEX_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0 Safari/537.36 MedSlimeImageBackfill/1.0"
)

# Mirrors the user-facing image detection in app/api/national-exam/route.ts.
VISUAL_PATTERNS = [
    re.compile(r"如下圖"),
    re.compile(r"如圖(?:\d+|[一二三四五六七八九十]+)?(?:所示|顯示|中|為)?"),
    re.compile(r"下圖(?:中|為|所示|顯示)?"),
    re.compile(r"上圖(?:中|為|所示|顯示)?"),
    re.compile(r"附圖(?:中|為|所示|顯示)?"),
    re.compile(r"圖(?:\d+|[一二三四五六七八九十]+)(?:中|為|所示|顯示)"),
    re.compile(r"圖中(?:所示|顯示|箭頭|標示)"),
    re.compile(r"圖示(?:中|為|所示)?"),
    re.compile(r"影像(?:中|如下|所示)"),
    re.compile(r"照片(?:中|如下|所示)"),
    re.compile(r"顯微鏡下(?:圖|影像|照片)"),
    re.compile(r"箭頭所指"),
]

QUESTION_PREFIX_RE = re.compile(r"^\s*(\d{1,2})\s*[\.．、\)）:]\s*")


@dataclass
class Anchor:
    page_index: int
    y: float


@dataclass
class Result:
    id: int
    roc_year: int | None
    exam_round: str
    subject: str
    question_number: int
    status: str
    image_url: str | None = None
    page: int | None = None
    message: str | None = None
    nonwhite_ratio: float | None = None


def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"缺少必要環境變數：{name}")
    return value.rstrip("/") if name == "SUPABASE_URL" else value


def is_explicit_visual_reference(text: str) -> bool:
    compact = re.sub(r"\s+", "", text or "").replace("「", "").replace("」", "")
    return any(pattern.search(compact) for pattern in VISUAL_PATTERNS)


def clean_filename_piece(value: str) -> str:
    text = re.sub(r"\s+", "-", value.strip())
    text = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff._-]+", "-", text)
    return text.strip("-_")[:80] or "unknown"


class SupabaseClient:
    def __init__(self, base_url: str, service_key: str, bucket: str):
        self.base_url = base_url
        self.service_key = service_key
        self.bucket = bucket
        self.session = requests.Session()
        self.session.headers.update(
            {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "User-Agent": MOEX_USER_AGENT,
            }
        )

    def _rest_get(self, params: dict[str, str]) -> list[dict[str, Any]]:
        response = self.session.get(
            f"{self.base_url}/rest/v1/national_exam_questions",
            params=params,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise RuntimeError("Supabase 題庫回傳格式異常")
        return payload

    def candidate_rows(self, question_id: int | None, force: bool) -> list[dict[str, Any]]:
        params = {
            "select": (
                "id,roc_year,exam_round,subject,question_number,question,"
                "question_pdf_url,question_pdf_page,image_url,has_image_hint"
            ),
            "order": "roc_year.desc,exam_round.desc,subject.asc,question_number.asc",
            "limit": "1000",
        }
        if question_id is not None:
            params["id"] = f"eq.{question_id}"
        else:
            params["has_image_hint"] = "eq.true"
            if not force:
                params["image_url"] = "is.null"

        rows = self._rest_get(params)
        if question_id is not None:
            return rows

        # has_image_hint contains a few legacy keyword false positives. Match the
        # same explicit visual-language rule used by the website before creating
        # a permanent image_url, otherwise a false positive would become permanent.
        return [row for row in rows if is_explicit_visual_reference(str(row.get("question") or ""))]

    def paper_rows(self, pdf_url: str) -> list[dict[str, Any]]:
        return self._rest_get(
            {
                "select": "id,question_number,question,question_pdf_url",
                "question_pdf_url": f"eq.{pdf_url}",
                "order": "question_number.asc",
                "limit": "200",
            }
        )

    def ensure_bucket(self) -> None:
        response = self.session.get(
            f"{self.base_url}/storage/v1/bucket/{quote(self.bucket, safe='')}",
            timeout=30,
        )
        if response.status_code == 200:
            payload = response.json()
            if not payload.get("public", False):
                update = self.session.put(
                    f"{self.base_url}/storage/v1/bucket/{quote(self.bucket, safe='')}",
                    json={"public": True},
                    timeout=30,
                )
                update.raise_for_status()
            return
        if response.status_code != 404:
            response.raise_for_status()

        create = self.session.post(
            f"{self.base_url}/storage/v1/bucket",
            json={
                "id": self.bucket,
                "name": self.bucket,
                "public": True,
                "file_size_limit": 12 * 1024 * 1024,
                "allowed_mime_types": ["image/png"],
            },
            timeout=30,
        )
        if create.status_code not in (200, 201, 409):
            create.raise_for_status()

    def upload_png(self, object_path: str, png_bytes: bytes) -> str:
        encoded_path = "/".join(quote(part, safe="") for part in object_path.split("/"))
        response = self.session.post(
            f"{self.base_url}/storage/v1/object/{quote(self.bucket, safe='')}/{encoded_path}",
            data=png_bytes,
            headers={
                "Content-Type": "image/png",
                "x-upsert": "true",
                "Cache-Control": "31536000",
            },
            timeout=90,
        )
        response.raise_for_status()
        return f"{self.base_url}/storage/v1/object/public/{self.bucket}/{encoded_path}"

    def update_question(self, row_id: int, image_url: str, page: int) -> None:
        response = self.session.patch(
            f"{self.base_url}/rest/v1/national_exam_questions",
            params={"id": f"eq.{row_id}"},
            json={"image_url": image_url, "question_pdf_page": page},
            headers={"Prefer": "return=minimal"},
            timeout=30,
        )
        response.raise_for_status()


def download_pdf(url: str, session: requests.Session) -> bytes:
    response = session.get(
        url,
        headers={"User-Agent": MOEX_USER_AGENT, "Accept": "application/pdf,*/*"},
        timeout=90,
    )
    response.raise_for_status()
    content = response.content
    if not content.startswith(b"%PDF"):
        snippet = content[:120].decode("utf-8", errors="replace")
        raise RuntimeError(f"官方連結未回傳 PDF：{snippet!r}")
    return content


def detect_anchors(doc: fitz.Document, valid_numbers: set[int]) -> dict[int, Anchor]:
    anchors: dict[int, Anchor] = {}

    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        page_width = page.rect.width
        candidates: list[tuple[int, float, float]] = []

        # Blocks are usually the most reliable representation for MOEX PDFs.
        for block in page.get_text("blocks", sort=True):
            x0, y0, _x1, _y1, text = block[:5]
            if x0 > page_width * 0.38:
                continue
            match = QUESTION_PREFIX_RE.match(str(text or ""))
            if not match:
                continue
            number = int(match.group(1))
            if number in valid_numbers:
                candidates.append((number, float(x0), float(y0)))

        # Some PDFs split the question number into a separate text object.
        for word in page.get_text("words", sort=True):
            x0, y0, _x1, _y1, text = word[:5]
            if x0 > page_width * 0.38:
                continue
            match = QUESTION_PREFIX_RE.match(str(text or ""))
            if match:
                number = int(match.group(1))
                if number in valid_numbers:
                    candidates.append((number, float(x0), float(y0)))

        # Prefer the left-most occurrence. Question numbers sit at the left edge;
        # numeric values inside stems tend to be farther right.
        candidates.sort(key=lambda item: (item[0], item[1], item[2]))
        for number in valid_numbers:
            if number in anchors:
                continue
            matches = [item for item in candidates if item[0] == number]
            if matches:
                chosen = min(matches, key=lambda item: (item[1], item[2]))
                anchors[number] = Anchor(page_index=page_index, y=chosen[2])

    return anchors


def pixmap_to_image(pix: fitz.Pixmap) -> Image.Image:
    mode = "RGBA" if pix.alpha else "RGB"
    image = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def render_segment(page: fitz.Page, top: float, bottom: float, zoom: float = 2.0) -> Image.Image:
    side_margin = max(8.0, page.rect.width * 0.025)
    top = max(page.rect.y0, top)
    bottom = min(page.rect.y1, bottom)
    if bottom <= top + 4:
        raise RuntimeError("題目裁切高度過小")

    clip = fitz.Rect(side_margin, top, page.rect.width - side_margin, bottom)
    matrix = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=matrix, clip=clip, alpha=False, annots=True)
    return pixmap_to_image(pix)


def trim_outer_whitespace(image: Image.Image, padding: int = 24) -> Image.Image:
    white = Image.new("RGB", image.size, "white")
    difference = ImageChops.difference(image.convert("RGB"), white).convert("L")
    # Tiny anti-aliasing differences should not determine the crop bounds.
    difference = difference.point(lambda value: 255 if value > 12 else 0)
    bbox = difference.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    return image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )


def combine_vertical(images: list[Image.Image]) -> Image.Image:
    if not images:
        raise RuntimeError("沒有可合併的頁面片段")
    if len(images) == 1:
        return trim_outer_whitespace(images[0])

    width = max(image.width for image in images)
    gap = 8
    height = sum(image.height for image in images) + gap * (len(images) - 1)
    canvas = Image.new("RGB", (width, height), "white")
    y = 0
    for image in images:
        x = (width - image.width) // 2
        canvas.paste(image, (x, y))
        y += image.height + gap
    return trim_outer_whitespace(canvas)


def render_question(
    doc: fitz.Document,
    start: Anchor,
    next_anchor: Anchor | None,
) -> tuple[Image.Image, int]:
    last_page = next_anchor.page_index if next_anchor else start.page_index
    if last_page < start.page_index:
        last_page = start.page_index

    pieces: list[Image.Image] = []
    for page_index in range(start.page_index, last_page + 1):
        page = doc.load_page(page_index)
        top = page.rect.y0 + 10
        bottom = page.rect.y1 - 18

        if page_index == start.page_index:
            top = max(page.rect.y0, start.y - 4)
        if next_anchor and page_index == next_anchor.page_index:
            bottom = min(page.rect.y1, next_anchor.y - 4)

        if bottom > top + 4:
            pieces.append(render_segment(page, top, bottom))

    return combine_vertical(pieces), start.page_index + 1


def image_metrics(image: Image.Image) -> tuple[float, int]:
    gray = image.convert("L")
    histogram = gray.histogram()
    total = max(1, image.width * image.height)
    nonwhite = sum(histogram[:248])
    return nonwhite / total, total


def encode_png(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def object_path(row: dict[str, Any]) -> str:
    year = clean_filename_piece(str(row.get("roc_year") or "unknown"))
    round_name = clean_filename_piece(str(row.get("exam_round") or "unknown"))
    subject = clean_filename_piece(str(row.get("subject") or "unknown"))
    q = int(row.get("question_number") or 0)
    row_id = int(row["id"])
    return f"{year}/{round_name}/{subject}/q{q:02d}-{row_id}.png"


def write_report(results: list[Result], metadata: dict[str, Any]) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"metadata": metadata, "results": [asdict(result) for result in results]}
    (REPORT_DIR / "report.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    ok = [r for r in results if r.status == "success"]
    skipped = [r for r in results if r.status == "skipped"]
    failed = [r for r in results if r.status == "failed"]

    lines = [
        "# 國考圖片題批次處理報告",
        "",
        f"- 成功：**{len(ok)}**",
        f"- 跳過：**{len(skipped)}**",
        f"- 需要處理：**{len(failed)}**",
        "",
    ]
    if failed:
        lines += ["## 需要處理", ""]
        for result in failed:
            lines.append(
                f"- #{result.id}｜{result.roc_year or ''} {result.exam_round}｜"
                f"{result.subject}｜Q{result.question_number}｜{result.message or '未知錯誤'}"
            )
        lines.append("")
    if ok:
        lines += ["## 已完成", ""]
        for result in ok[:60]:
            lines.append(
                f"- #{result.id}｜{result.roc_year or ''} {result.exam_round}｜"
                f"{result.subject}｜Q{result.question_number}"
            )
        if len(ok) > 60:
            lines.append(f"- …其餘 {len(ok) - 60} 題請看 report.json")
        lines.append("")

    (REPORT_DIR / "report.md").write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["test", "all"], default="test")
    parser.add_argument("--question-id", type=int, default=None)
    parser.add_argument("--limit", type=int, default=DEFAULT_TEST_LIMIT)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    supabase_url = env("SUPABASE_URL")
    service_key = env("SUPABASE_SERVICE_ROLE_KEY")
    client = SupabaseClient(supabase_url, service_key, args.bucket)
    client.ensure_bucket()

    candidates = client.candidate_rows(args.question_id, args.force)
    if args.mode == "test" and args.question_id is None:
        candidates = candidates[: max(1, args.limit)]

    metadata = {
        "mode": args.mode,
        "question_id": args.question_id,
        "force": args.force,
        "candidate_count": len(candidates),
        "bucket": args.bucket,
        "started_at_epoch": int(time.time()),
    }

    if not candidates:
        write_report([], metadata)
        print("沒有需要處理的圖片題。")
        return 0

    print(f"準備處理 {len(candidates)} 題。")
    download_session = requests.Session()
    results: list[Result] = []

    groups: dict[str, list[dict[str, Any]]] = {}
    for row in candidates:
        pdf_url = str(row.get("question_pdf_url") or "").strip()
        if not pdf_url:
            results.append(
                Result(
                    id=int(row["id"]),
                    roc_year=row.get("roc_year"),
                    exam_round=str(row.get("exam_round") or ""),
                    subject=str(row.get("subject") or ""),
                    question_number=int(row.get("question_number") or 0),
                    status="failed",
                    message="缺少官方 PDF URL",
                )
            )
            continue
        groups.setdefault(pdf_url, []).append(row)

    for group_index, (pdf_url, rows) in enumerate(groups.items(), start=1):
        print(f"[{group_index}/{len(groups)}] 下載官方 PDF，處理 {len(rows)} 題")
        try:
            paper_rows = client.paper_rows(pdf_url)
            valid_numbers = {
                int(item.get("question_number") or 0)
                for item in paper_rows
                if int(item.get("question_number") or 0) > 0
            }
            pdf_bytes = download_pdf(pdf_url, download_session)
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            anchors = detect_anchors(doc, valid_numbers)

            try:
                for row in rows:
                    row_id = int(row["id"])
                    q = int(row.get("question_number") or 0)
                    base_result = dict(
                        id=row_id,
                        roc_year=row.get("roc_year"),
                        exam_round=str(row.get("exam_round") or ""),
                        subject=str(row.get("subject") or ""),
                        question_number=q,
                    )
                    try:
                        if row.get("image_url") and not args.force:
                            results.append(
                                Result(
                                    **base_result,
                                    status="skipped",
                                    image_url=str(row.get("image_url")),
                                    message="已有 image_url",
                                )
                            )
                            continue

                        start = anchors.get(q)
                        if not start:
                            raise RuntimeError("找不到題號定位點")
                        next_anchor = anchors.get(q + 1)
                        image, page_number = render_question(doc, start, next_anchor)
                        nonwhite_ratio, total_pixels = image_metrics(image)

                        if image.width < 500 or image.height < 120:
                            raise RuntimeError(
                                f"裁切尺寸異常：{image.width}×{image.height}"
                            )
                        if total_pixels < 100_000 or nonwhite_ratio < 0.001:
                            raise RuntimeError(
                                f"產出內容疑似空白（nonwhite={nonwhite_ratio:.4f}）"
                            )

                        png = encode_png(image)
                        if len(png) < 8_000:
                            raise RuntimeError(f"PNG 過小：{len(png)} bytes")

                        path = object_path(row)
                        public_url = client.upload_png(path, png)
                        client.update_question(row_id, public_url, page_number)
                        results.append(
                            Result(
                                **base_result,
                                status="success",
                                image_url=public_url,
                                page=page_number,
                                nonwhite_ratio=round(nonwhite_ratio, 6),
                            )
                        )
                        print(f"  ✓ #{row_id} Q{q} → {path}")
                    except Exception as error:  # noqa: BLE001
                        results.append(
                            Result(
                                **base_result,
                                status="failed",
                                message=str(error),
                            )
                        )
                        print(f"  ✗ #{row_id} Q{q}: {error}", file=sys.stderr)
            finally:
                doc.close()
        except Exception as error:  # noqa: BLE001
            print(f"  ✗ 整份 PDF 處理失敗：{error}", file=sys.stderr)
            for row in rows:
                row_id = int(row["id"])
                if any(result.id == row_id for result in results):
                    continue
                results.append(
                    Result(
                        id=row_id,
                        roc_year=row.get("roc_year"),
                        exam_round=str(row.get("exam_round") or ""),
                        subject=str(row.get("subject") or ""),
                        question_number=int(row.get("question_number") or 0),
                        status="failed",
                        message=f"PDF 處理失敗：{error}",
                    )
                )

    metadata["finished_at_epoch"] = int(time.time())
    write_report(results, metadata)

    succeeded = sum(result.status == "success" for result in results)
    skipped = sum(result.status == "skipped" for result in results)
    failed = sum(result.status == "failed" for result in results)
    print(f"完成：成功 {succeeded}，跳過 {skipped}，需要處理 {failed}。")

    # A partial batch should still upload the report artifact. Fail the Action only
    # when nothing worked, which catches credentials/network/renderer breakage while
    # allowing a small number of odd legacy PDFs to be reviewed from the report.
    if failed and succeeded == 0 and skipped == 0:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
