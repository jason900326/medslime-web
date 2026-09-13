#!/usr/bin/env python3
"""Compatibility entrypoint for the official-question image backfill.

Supabase's hosted API gateway accepts both legacy service-role JWTs and the
new ``sb_secret_...`` API keys. For the new opaque secret keys, hosted
Supabase expects the request to carry both the ``apikey`` header and
``Authorization: Bearer sb_secret_...``. The gateway recognizes that opaque
Bearer value and replaces it with an internal service-role JWT before
forwarding the request to PostgREST / Storage.
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
    if not (service_key.startswith("sb_secret_") or service_key.startswith("eyJ")):
        raise RuntimeError(
            "GitHub Secret 不是 Supabase API Secret key。請使用 Settings → API Keys "
            "中的 sb_secret_...，不要使用 Storage / S3 的 Secret access key。"
        )

    # The base client already sets both:
    #   apikey: <secret>
    #   Authorization: Bearer <secret>
    # Keep both headers for hosted Supabase. This is correct for both legacy
    # service-role JWTs and the new sb_secret_ opaque API keys.
    _original_init(self, base_url, service_key, bucket)


impl.SupabaseClient.__init__ = _compatible_init

if __name__ == "__main__":
    raise SystemExit(impl.main())
