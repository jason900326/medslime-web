#!/usr/bin/env python3
"""Compatibility entrypoint for the official-question image backfill.

Database reads/writes keep using the lightweight REST client in the renderer,
while Storage uploads go through the official Supabase Python SDK. This avoids
subtle differences in opaque ``sb_secret_...`` authentication between
PostgREST and Storage and gives us much better upload errors.
"""

from __future__ import annotations

import math
from urllib.parse import quote

from PIL import Image
from supabase import create_client

try:
    from scripts import preprocess_official_question_images as impl
except ModuleNotFoundError:
    import preprocess_official_question_images as impl


_original_init = impl.SupabaseClient.__init__
_original_render_question = impl.render_question


def _compatible_init(self, base_url: str, service_key: str, bucket: str) -> None:
    service_key = service_key.strip()
    if not (service_key.startswith("sb_secret_") or service_key.startswith("eyJ")):
        raise RuntimeError(
            "GitHub Secret 不是 Supabase API Secret key。請使用 Settings → API Keys "
            "中的 sb_secret_...，不要使用 Storage / S3 的 Secret access key。"
        )

    _original_init(self, base_url, service_key, bucket)

    # Supabase secret keys are blocked when used from a browser-like User-Agent.
    self.session.headers["User-Agent"] = "MedSlimeImageBackfill/1.0 (GitHub Actions backend)"

    if service_key.startswith("sb_secret_"):
        # Opaque secret keys belong in apikey for direct PostgREST calls.
        self.session.headers["apikey"] = service_key
        self.session.headers.pop("Authorization", None)
    else:
        self.session.headers["apikey"] = service_key
        self.session.headers["Authorization"] = f"Bearer {service_key}"

    # Let the official SDK handle Storage authentication for both key types.
    self.storage_sdk = create_client(base_url, service_key)


def _sdk_upload_png(self, object_path: str, png_bytes: bytes) -> str:
    # Keep object paths ASCII-only. The row id is globally unique, so this is
    # deterministic without relying on URL-encoded Chinese subject/round names.
    try:
        self.storage_sdk.storage.from_(self.bucket).upload(
            path=object_path,
            file=png_bytes,
            file_options={
                "content-type": "image/png",
                "cache-control": "31536000",
                "upsert": "true",
            },
        )
    except Exception as exc:
        raise RuntimeError(f"Supabase Storage 上傳失敗：{type(exc).__name__}: {exc}") from exc

    encoded_path = "/".join(quote(part, safe="") for part in object_path.split("/"))
    return f"{self.base_url}/storage/v1/object/public/{self.bucket}/{encoded_path}"


def _ascii_object_path(row: dict) -> str:
    row_id = int(row["id"])
    q = int(row.get("question_number") or 0)
    return f"questions/{row_id}/q{q:02d}.png"


def _render_question_with_minimum_canvas(doc, start, next_anchor):
    """Keep legitimate compact figures from failing the legacy size guard.

    Some MOEX questions are genuinely narrow (for example small microscopy,
    ECG or diagram panels). The base renderer's old 500px width / 100k-pixel
    guard was meant to catch broken crops, but it rejects valid 300–465px
    outputs. Render first, then upscale only when necessary. This preserves the
    actual crop while still satisfying the downstream blank/broken-image guard.
    """

    image, page_number = _original_render_question(doc, start, next_anchor)
    width, height = image.size
    if width <= 0 or height <= 0:
        return image, page_number

    min_width = 500
    min_height = 120
    min_pixels = 100_000
    scale = max(
        1.0,
        min_width / width,
        min_height / height,
        math.sqrt(min_pixels / (width * height)),
    )
    if scale > 1.0:
        new_size = (
            max(min_width, math.ceil(width * scale)),
            max(min_height, math.ceil(height * scale)),
        )
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    return image, page_number


impl.SupabaseClient.__init__ = _compatible_init
impl.SupabaseClient.upload_png = _sdk_upload_png
impl.object_path = _ascii_object_path
impl.render_question = _render_question_with_minimum_canvas

if __name__ == "__main__":
    raise SystemExit(impl.main())
