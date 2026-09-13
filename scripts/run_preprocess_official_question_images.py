#!/usr/bin/env python3
"""Compatibility entrypoint for the official-question image backfill.

Supabase's new ``sb_secret_`` API keys are opaque API keys rather than JWTs.
The hosted API gateway expects them in the ``apikey`` header and mints the
short-lived service-role JWT forwarded to PostgREST/Storage. Sending the
opaque key itself as ``Authorization: Bearer ...`` can make downstream
services reject it as an invalid JWT, so remove that header for new keys.
Legacy JWT service-role keys keep the old behavior.
"""

from __future__ import annotations

try:
    from scripts import preprocess_official_question_images as impl
except ModuleNotFoundError:
    # When this file is executed directly (``python scripts/....py``), Python
    # adds ``scripts/`` rather than the repository root to sys.path.
    import preprocess_official_question_images as impl


_original_init = impl.SupabaseClient.__init__


def _compatible_init(self, base_url: str, service_key: str, bucket: str) -> None:
    if not (service_key.startswith("sb_secret_") or service_key.startswith("eyJ")):
        raise RuntimeError(
            "GitHub Secret 不是 Supabase API Secret key。請使用 Settings → API Keys "
            "中的 sb_secret_...，不要使用 Storage / S3 的 Secret access key。"
        )

    _original_init(self, base_url, service_key, bucket)

    if service_key.startswith("sb_secret_"):
        # Opaque API keys are authenticated via `apikey`. Let Supabase's
        # hosted gateway synthesize the internal service-role Authorization JWT.
        self.session.headers.pop("Authorization", None)


impl.SupabaseClient.__init__ = _compatible_init

if __name__ == "__main__":
    raise SystemExit(impl.main())
