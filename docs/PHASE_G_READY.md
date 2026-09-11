# Phase G readiness

This marker documents that the Phase G branch reached a green Vercel Preview build before PR creation.

Required database step before persistence testing:

- Run `supabase/phase_g_learning_memory.sql` once after Phase F.

Then test:

1. Learning Records tabs: 作答紀錄 / 觀念不熟 / 我的筆記 / Pro 分析.
2. A manually marked 觀念不熟 question shows its mastery streak.
3. Three consecutive correct + not-uncertain outcomes automatically clear 觀念不熟.
4. Wrong, skipped, or uncertain outcomes reset the streak.
5. Exam explanation entitlement loaded in Learning Records is reused on attempt detail without a second visible access check.
6. Direct-entry/reload attempt detail can still fall back to a background entitlement fetch.
