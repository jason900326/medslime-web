# Study 介面改版

## 設計目的

保留題庫、計分、史萊姆、獎勵與會員權限，讓考生能快速選擇練習、檢討與下一步。區分導覽、資料和可執行動作，避免每一層都使用圓角卡片與實心按鈕。

- 桌面固定學習工具側欄；手機使用同一份導覽資料的原生選單。
- 國考題庫依年度、梯次、科目排列，科目改成可掃讀的列表。
- 自由測驗先選科目、題數，再選年份；摘要與設定即時同步。
- 錯題複習提供科目篩選；個別錯題與教材錯題入口放到列表上方。
- 學習紀錄提供搜尋與統計，移除每筆紀錄重複顯示的購買區塊。考卷詳解購買仍保留在作答檢討頁。
- 學習分析直接顯示主題正確率、樣本題數、重複錯題、不確定次數與趨勢；切換科目即可查看，不再巢狀展開。
- 專注頁以時間與開始／暫停動作為主，保留陪伴史萊姆和獎勵。
- 教材頁使用「選擇 PDF → 分析教材 → 開始練習」流程，保留檔案驗證與原有額度邏輯。

## 參考

- [Education platform / classes](https://dribbble.com/shots/18699336-Education-platform-classes)：科目與進度分區。
- [E-learning Dashboard / studify](https://dribbble.com/shots/20303585-E-learning-Dashboard-studify)：固定工具導覽與內容層級。

僅參考資訊配置，使用 MedSlime 原有配色、圖片與實際資料。

## 驗證與開發預覽

已檢查桌面及 390px、320px 手機版面；操作驗證涵蓋紀錄搜尋、錯題篩選、測驗題數切換、考試梯次連結與分析科目切換。未為視覺測試交卷、消耗 AI 額度或新增專注紀錄。

`/study/design-preview` 是僅 development 可用的示範資料頁，仍受既有登入保護；正式環境回傳 404。它重用實際分析元件，不會替代使用者的 Pro 資料。

現有 16 項測試通過。排除原先未追蹤的 `medslime-preview` 副本後，主專案 TypeScript 檢查通過。完整 `npm run typecheck` 仍受到該副本既有 `answeredCount` 未定義錯誤影響。

## 本機登入與資料限制

開發來源允許 `192.168.68.102`。實測區網 Google 登入回跳到了 localhost，發生 PKCE verifier 缺失；需確認 Supabase Authentication → URL Configuration 的 Redirect URLs 包含本機回呼，例如 `http://192.168.68.102:3000/auth/callback**`。不要為此改動正式站 Site URL。

真實 Pro 分析需要有效的 `SUPABASE_SERVICE_ROLE_KEY`。僅存於本機 `.env.local` 的伺服器端設定，不可使用 NEXT_PUBLIC 前綴或提交版本控制。Email 登入新增 20 秒逾時提示，手機登入成功與否仍需實機確認。


## Final interface pass — 2026-09-22
- Flattened subject-grouped learning notes and aligned cards/buttons across about, feedback, privacy, terms, tasks, achievements, shop, payment result, slimes, and gacha. No rewards or commerce rules changed.
- National, free, and material quizzes share QuizOption: answer text selects an answer; a separate labeled button toggles exclusion. Updated first-use instructions.
- Simplified result panels and confirmation dialogs. QuizDialog supports initial focus, Tab wrapping, Escape, and focus restoration. Clock moved to a reserved footer strip.
- Validation: main-project TypeScript 0 errors (excluding pre-existing medslime-preview copy); ESLint 0 errors with existing warnings; existing regression tests 16/16; git diff --check passed.
- Browser checked real records, answer selection, independent exclusion, next/previous answer retention, and the incomplete national-exam result at 390 px. Incomplete submission does not persist an attempt. Did not create completed attempts or spend AI credits to test completion results.
- Live learning-analysis endpoint still showed its error fallback after the user's environment update. No authentication or environment troubleshooting was performed in this pass; successful Pro layout had previously been checked using the clearly labeled development fixture.


## Mobile-first consolidation — follow-up
- Canonical history destination is /study/records with attempts, mistakes (待複習), and notes tabs. Legacy /study/mistakes and /study/mistakes/individual preserve year/session/subject filters when redirecting; legacy attempt URLs redirect to the existing full review page. No app/component/lib navigation targets the old mistakes paths.
- Review records retain question review status, removal, official source, and explanations, including uploaded-material mistakes. Default is pending review; subject filtering and 10-item incremental loading keep long histories manageable on phones.
- Removed duplicated analysis practice hero; each topic has its own distinct practice URL. Live Pro data and subject switching verified successfully in this pass.
- Focus now centers companion, clock, duration, and controls; secondary statistics follow. Slime collection shares the study shell, has larger touch targets and smaller mobile illustrations, and collapsed detail actions are inert.
- Removed decorative English headings and redundant introductory copy. Combined the two resource-shop links into one balances link.
- Browser QA: 390px and 320px layouts, real Pro topic/subject destinations, focus presets and custom duration (restored 30 minutes), SSR filter/detail, review load-more (10 to 20), notes, legacy subject redirect and attempt redirect. Desktop analysis and focus visually checked. No review status, purchases, rewards, or account data modified during QA.
- Main-project TypeScript: 0 errors (pre-existing medslime-preview excluded); scoped ESLint: 0 errors / 6 existing warnings; existing tests: 16 passed.
