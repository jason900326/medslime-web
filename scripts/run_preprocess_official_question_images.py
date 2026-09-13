#!/usr/bin/env python3
"""Compatibility entrypoint for the official-question image backfill.

Supabase's new ``sb_secret_...`` keys are backend-only API keys. They must be
sent in the ``apikey`` header, and Supabase rejects them when the request looks
like browser traffic. The renderer previously reused a Chrome-like User-Agent
intended for downloading MOEX PDFs, which caused every Supabase REST request
to be rejected with HTTP 401 even though the key and project were correct.

This wrapper keeps the browser-like User-Agent only for MOEX PDF downloads and
uses a backend User-Agent for Supabase. Legacy service-role JWTs keep their
Authorization header; new opaque secret keys use ``apikey`` only.
"""

from __future__ import annotations

try:
    from scripts import preprocess_official_question_images as impl
except ModuleNotFoundError:
    # When this file is executed directly, Python adds scripts/ rather than the
    # repository root to sys.path.
    import preprocess_official_question_images as impl


_original_init = impl.SupabaseClient.__init__


def _compatible_init(self, base_url: str, service_key: str, bucket: str) -> None:
    service_key = service_key.strip()
    if not (service_key.startswith("sb_secret_") or service_key.startswith("eyJ")):
        raise RuntimeError(
            "GitHub Secret 不是 Supabase API Secret key。請使用 Settings → API Keys "
            "中的 sb_secret_...，不要使用 Storage / S3 的 Secret access key。"
        )

    _original_init(self, base_url, service_key, bucket)

    # Supabase secret keys are explicitly blocked when they are used from a
    # browser-like User-Agent. The base renderer uses a Chrome UA for MOEX PDF
    # downloads, but Supabase requests must identify as a backend worker.
    self.session.headers["User-Agent"] = "MedSlimeImageBackfill/1.0 (GitHub Actions backend)"

    if service_key.startswith("sb_secret_"):
        # New API keys are opaque, not JWTs. Supabase's Data/Storage APIs expect
        # them in `apikey`; sending them as Bearer tokens can trigger JWT auth
        # handling and 401 responses.
        self.session.headers["apikey"] = service_key
        self.session.headers.pop("Authorization", None)
    else:
        # Legacy service_role keys are JWTs and continue to work as Bearer JWTs.
        self.session.headers["apikey"] = service_key
        self.session.headers["Authorization"] = f"Bearer {service_key}"


impl.SupabaseClient.__init__ = _compatible_init

if __name__ == "__main__":
    raise SystemExit(impl.main())
