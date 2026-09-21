# MedSlime

> 弱點補起來，分數撿回來。

MedSlime 是以醫療相關國考歷屆題為核心的學習平台。

產品的核心不是「很多功能」、不是單純題庫，也不是把 AI 詳解當成主要賣點，而是讓使用者完成這條學習循環：

```text
開始刷題
  ↓
寫完考卷
  ↓
訂正
  ↓
累積作答資料
  ↓
找出真正弱點
  ↓
知道先補什麼
  ↓
快速補強
  ↓
再做題驗證
  ↓
長期確認是否改善
```

之後設計任何新畫面或功能，都先問：

> 這會不會讓使用者更快完成這條核心流程？

如果沒有明顯關係，就不應該搶主要畫面的注意力。

---

## 1. Product positioning

### Brand statement

**弱點補起來，分數撿回來。**

### User-facing value proposition

使用者可以刷國考歷屆題，MedSlime 透過長期作答紀錄找出弱點，告訴使用者接下來該讀什麼，提供快速補強，再透過同主題題目與後續考卷確認是否真的改善。

### What MedSlime is not

MedSlime 不應該被設計成：

- 以史萊姆養成為主體、學習只是附帶功能的產品
- 只提供國考題目的題庫網站
- 以「無限 AI 詳解」作為最主要 Pro 賣點
- 到處加入聊天框的 AI 產品
- 一進首頁就把所有功能平行展示的功能 Dashboard
- 完整補習班型 AI 教材平台

---

## 2. Multi-profession architecture

目前主要題庫是醫事檢驗師國考，但未來會支援其他醫療相關職類。

因此：

- UI 與資料結構不得寫死只有醫事檢驗師。
- 不需要為每一個職類建立不同 landing page。
- 不要求使用者進站時先選職類。
- 所有人直接進入同一個 MedSlime。
- 使用者進「國考題庫」後，再依職類、年份、考次與科目找題目。
- 現有考卷選擇流程可以保留，除非另外發現明確 UX 問題。

---

## 3. Core navigation model

主要產品導覽分成三個區域：

1. **學習**
2. **學習紀錄**
3. **史萊姆**

不要另外建立一個塞滿所有功能的登入後首頁 Dashboard。

### 學習

回答：

> 我現在要做什麼？

「國考題庫」必須是最主要、最醒目的入口。

其他現有功能可以保留，但視覺優先級低於國考題庫：

- 自由測驗
- 錯題複習
- 教材上傳
- 專心讀書

第一次使用者進入學習頁時，不需要教學就應該知道：

> 我要準備國考，就從這裡開始。

### 學習紀錄

回答：

> 我以前寫過什麼？  
> 我現在弱在哪？  
> 我接下來該讀什麼？

### 史萊姆

史萊姆是學習後的獎勵與收藏系統，不應干擾主要學習流程。

目前核心循環：

```text
學習行為
  ↓
獲得遊戲金幣
  ↓
使用金幣抽史萊姆
  ↓
收藏史萊姆
```

不要反過來把史萊姆設計成強迫或主導使用者學習的系統。

---

## 4. Public landing page redesign

目前首頁最大的產品問題是：第一次進來的人無法快速理解 MedSlime 是國考題庫／弱點分析學習平台。

新的公開首頁應先讓使用者理解：

> MedSlime 是用國考題幫你找出弱點，再告訴你下一步該讀什麼。

### Hero

主標：

**弱點補起來，分數撿回來。**

副標方向：

> 刷國考歷屆題，透過作答紀錄找出真正的弱點，知道接下來該讀什麼。

Primary CTA：

**開始刷題**

首頁不要再把史萊姆、收藏、商店、成就、任務與學習功能全部平行展示。

---

## 5. Authentication boundary

公開首頁、SEO 頁與必要的介紹／法務頁可以不登入。

**所有實際產品功能都必須先登入才能使用。**

包含：

- 國考題庫與實際作答
- 自由測驗
- 錯題與訂正
- 學習紀錄
- 「我該讀什麼？」
- 教材分析與專心讀書
- 史萊姆、收藏、商店與其他個人化功能

未登入使用者點擊「開始刷題」或其他產品入口時，應先進入登入流程，登入成功後再回到原本想前往的功能。

不要建立 guest exam、訪客 localStorage 作答、登入後同步訪客成果或「先免費做一份再註冊」的旁路。這些流程會增加狀態分岔、資料同步與錯誤處理成本。

Free 指的是**已登入的免費會員**，不是未登入訪客。

---

## 6. Free question-bank strategy

免費會員可以：

- 使用完整國考題庫
- 保存錯題
- 保存考試紀錄
- 正常訂正考卷

原始國考題本身不應是主要付費牆。

真正值得付費的價值是：

> MedSlime 利用你的長期資料，告訴你到底該補什麼，並陪你確認有沒有真的改善。

---

## 7. Exam result page

一份考卷完成後，結果頁主要負責：

> 檢討這一份。

優先順序：

1. 看分數
2. 看整份考卷
3. 訂正錯題
4. 簡單指出這份考卷最主要的弱點

示例：

```text
64 分

本次主要弱點：酵素
酵素相關 10 題，答錯 5 題
```

結果頁不要立刻塞入：

- 六科比較
- 長期趨勢
- 多個 Topic / Subtopic
- 複雜指數
- AI 長篇建議

長期分析統一交給「學習紀錄」。

---

## 8. Learning records

學習紀錄本身保持簡潔。

使用者可依科目查看多份考卷，例如：

```text
生化

115 年第 1 次 — 72 分
114 年第 2 次 — 66 分
114 年第 1 次 — 70 分
```

列表不要直接塞大量 AI 分析或複雜圖表。

### Core entry: 我該讀什麼？

在學習紀錄加入清楚入口：

**我該讀什麼？**

不要以這些名稱作為主要 user-facing 文案：

- AI 分析
- Pro Analysis
- 智慧分析

使用者真正關心的是：

> 我現在到底該讀什麼？

---

## 9. What should I study?

### Layer 1: overall subject view

第一層先呈現整體科目狀況，目標是讓使用者能自然判斷要點進哪一科。

不要把第一層做成複雜數據儀表板，也不要同時堆滿：

- 平均分
- 正確率
- 最近三次平均
- 趨勢線
- 多種自創指數

### Layer 2: subject weaknesses

點進單科後，最重要的是回答：

1. 我這科最弱的 3 個主題是什麼？
2. 我現在應該先補哪一個？

示例：

```text
生化目前主要弱點：

1. 酵素
2. 醣類代謝
3. 脂蛋白

建議優先補強：
酵素
```

「為什麼判定它是弱點」屬於次要資訊。

可以用「查看分析依據」展開：

- 做過多少題
- 錯多少題
- 哪些考卷反覆錯
- 最近是否改善
- 近期與長期表現

---

## 10. Weakness remediation loop

當使用者選擇一個弱點，例如「酵素」：

### Step 1 — 快速補概念

先看 **1～3 分鐘**的精簡重點。

### Step 2 — 題目驗證

再做 **5～10 題**同 Topic / Subtopic 的歷屆題。

不要一進補強流程就先丟大量題目。

### Step 3 — Immediate feedback

完成後可以回饋：

> 這次補強練習正確率 80%。

這只是一次練習結果，不代表弱點已消失。

### Step 4 — Long-term verification

真正降低弱點優先級需要觀察：

- 多次作答
- 不同考卷
- 跨時間表現
- 重複錯誤是否下降
- 近期與長期趨勢

不能因為一次補強做得好，就直接把弱點刪掉。

---

## 11. Weakness detection architecture

**AI / LLM 不負責判斷使用者的弱點。**

Topic / Subtopic 弱點應由 deterministic 程式與資料決定。

可使用：

- 題目 taxonomy
- 正確率
- 作答數
- 近期表現
- 長期表現
- 重複錯誤
- 趨勢
- Priority Score

弱點分析應盡量沿用現有 deterministic analysis。

不要把大量作答資料丟給 LLM 再問：

> 你覺得這個人哪裡比較弱？

這會增加成本並降低穩定性。

### Current implementation foundation

目前 repo 已經具備可延續的基礎：

- `national_exam_questions.topic`
- `national_exam_questions.subtopic`
- `national_exam_questions.concepts`
- `exam_attempts.question_outcomes`
- deterministic Topic/Subtopic analytics
- evidence-size threshold
- weak-topic ranking
- weak-topic practice flow

這些應成為新版「我該讀什麼？」的資料基礎，而不是重做一套 AI 判斷系統。

---

## 12. AI role

AI 在 MedSlime 裡真正有價值的角色是：

> 把已經被資料判定的弱點，轉成使用者現在最需要看的補強內容。

也就是：

- 程式找弱點
- AI 協助修復弱點

### AI remediation content

預設長度：

**1～3 分鐘**

AI 可依內容自動選擇最適合格式：

| 類型 | 建議格式 |
| --- | --- |
| 容易混淆的概念 | 比較表 |
| 流程型概念 | 步驟整理 |
| 記憶型內容 | bullet points |
| 計算題 | 公式 + 判斷規則 |
| 機轉 | 因果鏈 |
| 鑑別型內容 | 看到 X → 想到 Y |

使用者不需要自己決定要叫 AI 產生表格、條列或其他格式。

MedSlime 應依主題自動選擇。

---

## 13. Existing single-question AI explanation

現有單題 AI 詳解保留。

它回答：

> 我這一題為什麼錯？

它仍然有價值，但不再作為 Pro 最核心的賣點。

可以理解為：

```text
單題 AI 詳解 = 急診室
弱點補強     = 復健計畫
```

---

## 14. AI cost principles

不要每完成一份考卷就自動大量呼叫 LLM。

原則：

1. 弱點計算完全不需要 AI
2. AI 補強採 lazy / on-demand
3. 能 cache 就 cache
4. Topic / Subtopic 共通知識內容盡量共用
5. 真正需要個人化時才生成

設計方向：

```text
80% 共用知識內容
+
20% 個人化重點
```

---

## 15. Free / Pro boundary

### Free

免費會員在「我該讀什麼？」中可以看到：

**目前最弱 Top 1**

目的不是把分析全部鎖死，而是讓免費會員真的感受到：

> MedSlime 有看懂我的弱點。

### Pro

Pro 開放：

- Top 3 弱點
- 補強優先順序
- 1～3 分鐘 AI 弱點補強
- 同主題歷屆題練習
- 長期弱點改善追蹤

Pro 核心價值應逐漸從：

> 更多 AI 使用次數

轉變成：

> MedSlime 幫我找出弱點，告訴我怎麼補，並追蹤我有沒有真的進步。

---

## 16. Pro daily yesterday summary

此功能是第三階段，不優先於核心弱點流程。

Pro 使用者每天第一次進入「學習」頁時，可看到一次昨日摘要卡。

快速回答：

- 昨天學了什麼
- 昨天主要弱點是什麼
- 哪裡有改善
- 今天建議先從哪裡開始

規則：

- 一天一次
- 簡短摘要卡
- 可關閉
- 當天關閉後不要一直出現
- 不做長篇報告
- 免費會員完全不顯示

它與「我該讀什麼？」不同：

```text
昨日學習統整
= 短期 / 一天一次
= 今天開始前，我應該知道什麼？

我該讀什麼？
= 長期 / 常駐 / 持續更新
= 以所有學習紀錄來看，我真正的弱點在哪？
```

---

## 17. Slime system

史萊姆是獎勵與收藏，不是核心學習導航。

目前：

```text
Study / tasks / achievements
        ↓
      coins
        ↓
  slime gacha
        ↓
   collection
```

### Current game-state source of truth

`public.player_account_state` 是 gameplay source of truth。

```text
auth.users.id
    ↓
player_account_state.user_id
    ↓
player_account_state.state (jsonb)
```

不要建立第二套平行 game-state persistence path。

目前 slime collection state 只保留 ownership 與 optional nickname。

### Explicitly retired / out of scope

目前不要做：

- 史萊姆進化
- 飾品系統
- fragments progression

Duplicate slime 繼續以 gameplay coins 處理，不重新導回碎片或飾品。

詳細資料見：

- `supabase/SCHEMA_MAP.md`
- `docs/game-balance-v1.md`

---

## 18. Mistakes and exam history

- `public.player_mistakes`：目前錯題庫 source of truth
- `public.exam_attempts`：已完成國考／自由測驗與 analytics snapshots

```text
completed quiz
      ├─> exam_attempts   -> score / history / analytics
      └─> player_mistakes -> wrong / uncertain questions
```

`question_outcomes` 保留每題結果，讓正確題也能進入 Topic/Subtopic analytics。

---

## 19. Question taxonomy

國考題的 shared taxonomy 存在 `national_exam_questions`：

```text
national exam question
       ↓
subject
       ↓
topic
       ↓
subtopic
       ↓
concepts[]
```

Taxonomy 是題目 metadata，不是 learner data。

同一題只分類一次，之後所有使用者共用。

不要為每個使用者重新分類同一題。

Topic / Subtopic 必須使用 canonical catalog，不要讓 classifier 自行產生同義詞造成 analytics bucket 分裂。

詳細規則見 `supabase/SCHEMA_MAP.md`。

---

## 20. AI explanation rules

現有單題 detailed explanation：

- 免費帳號每日最多 5 次
- 依台灣日曆日重置
- 不累積
- 不可購買、儲值、轉移
- `shared_ai_explanations`：共用國考詳解 cache
- `ai_question_explanations`：使用者教材題目 AI cache
- 購買指定考卷完整詳解後，永久解鎖該份考卷詳解

這套機制可以保留，但不要再把「AI 詳解次數」當作未來 Pro 的中心產品敘事。

---

## 21. Payments

Gameplay currency 與 paid services 必須分離。

不存在任何 real-money path 可以購買：

- coins
- tickets
- gacha pulls
- fragments
- accessories
- AI credits
- 其他 stored-value balance

目前 active paid outcomes：

```text
Payment
   ├─> MedSlime Pro 30-day access
   └─> permanent full-explanation access for one identified national exam
```

`supabase/payment_entitlement_v2.sql` 是 canonical payment migration。

不要以舊 payment / AI-credit SQL 取代。

---

## 22. Current repo vs target product

截至本次改版開始，repo 仍有以下舊資訊架構：

### `/`

目前首頁仍以：

- Today's Study hero
- My Room
- 今日學習統計
- 商城
- 收藏
- 抽卡
- 成就
- 今日任務

為主要內容。

**Target:** 首頁應改成能清楚解釋 MedSlime 的國考刷題／弱點補強定位，不再讓史萊姆與遊戲功能搶走主敘事。

### `/study`

目前：

- 國考題庫
- 自由測驗
- 錯題複習
- 學習紀錄
- 專心讀書
- 教材上傳

六個入口幾乎同權重。

**Target:** 國考題庫為主 CTA，其餘功能降低視覺優先級。

### `/study/records`

目前已有：

- 作答紀錄
- 筆記
- Pro analysis
- deterministic Topic/Subtopic analytics
- weak-topic practice

但 user-facing 仍使用「Pro 學習分析」。

**Target:** 改為以「我該讀什麼？」作為核心入口，重新整理為六科總覽 → 單科 Top 3 弱點 → 建議優先補強 → 補強內容 → 同 Topic 練習 → 長期追蹤。

---

## 23. Implementation roadmap

### Phase 1 — 先讓產品看得懂

本階段優先解決：

> 第一次進來不知道 MedSlime 是什麼。

工作：

- [ ] 重製網站首頁資訊架構
- [ ] Hero 改為「弱點補起來，分數撿回來。」
- [ ] Hero 副標明確說明「刷歷屆題 → 找弱點 → 知道下一步讀什麼」
- [ ] Primary CTA 改為「開始刷題」
- [ ] 首頁移除／降級史萊姆房間、商城、收藏、抽卡、成就、任務的主要視覺權重
- [ ] 建立清楚的「學習 / 學習紀錄 / 史萊姆」導覽
- [ ] 學習頁突出「國考題庫」
- [ ] 自由測驗、錯題複習、教材上傳、專心讀書降為 secondary actions
- [ ] 保留現有考卷選擇流程，不無故重做
- [ ] 確認導覽與文案不寫死只有醫事檢驗師

### Phase 2 — 建立差異化核心價值

完成：

```text
學習紀錄
  ↓
我該讀什麼？
  ↓
六科總覽
  ↓
單科弱點 Top 3
  ↓
推薦優先補強項目
  ↓
1–3 分鐘快速補強
  ↓
5–10 題同 Topic 練習
  ↓
即時練習回饋
  ↓
長期改善追蹤
```

工作：

- [ ] 將現有 Pro analysis user-facing 入口改為「我該讀什麼？」
- [ ] 建立六科總覽
- [ ] 建立單科 Top 3 弱點
- [ ] 顯示推薦優先補強項目
- [ ] 「查看分析依據」採 progressive disclosure
- [ ] Free 顯示 Top 1
- [ ] Pro 顯示 Top 3
- [ ] 建立 1～3 分鐘 AI 弱點補強
- [ ] 建立 5～10 題同 Topic 歷屆題練習
- [ ] 顯示補強練習正確率
- [ ] 不因一次練習結果直接清除 weakness
- [ ] 以跨考卷、跨時間資料調整 weakness priority

### Phase 3 — Pro daily yesterday summary

前兩階段穩定後：

- [ ] 每日第一次進學習頁顯示昨日摘要卡
- [ ] 顯示昨天學了什麼
- [ ] 顯示昨天主要弱點
- [ ] 顯示改善項目
- [ ] 顯示今天建議先做什麼
- [ ] 當日 dismiss 後不再重複
- [ ] Free 不顯示

---

## 24. Scope guard

這次改版不要自行擴 scope：

- 不做史萊姆進化
- 不做飾品系統
- 不重做既有考卷選擇流程，除非有明確 UX 問題
- 不把首頁再次變成功能 Dashboard
- 不大量加入新的 AI 功能
- 不建立每個職類不同的一套網站
- 不先做複雜數據 Dashboard
- 不用 AI 判斷弱點
- 不因為有 AI 就到處加入聊天介面
- 不做完整補習班型 AI 教材作為第一階段目標
- 不讓史萊姆系統主導學習流程
- 不把原始題庫本身當成主要付費牆

---

## 25. Stack

- Next.js / React / TypeScript
- Supabase Auth + Postgres
- OpenAI API for AI explanations, material analysis and future weakness-remediation content
- Vercel deployment
- ECPay integration for direct service/content entitlements

---

## 26. Supabase SQL: what is current?

開始執行 SQL 前先讀：

- `supabase/README.md`
- `supabase/SCHEMA_MAP.md`

重要規則：

> 標示為 **RETIRED**、**ARCHIVE** 或 **COMPATIBILITY NOTE** 的檔案是歷史文件，不得直接套用到 current schema。

Key current migrations：

- `supabase/payment_entitlement_v2.sql`
- `supabase/question_topic_taxonomy.sql`
- `supabase/exam_attempt_question_outcomes.sql`
- `supabase/remove_slime_accessories.sql`
- `supabase/cleanup_legacy_schema.sql`

Historical stored-value AI files such as `ai_detail_credit_consumption.sql`, `ai_detail_free_quota.sql`, and `remove_ai_stored_value.sql` are retired compatibility notes only.

---

## 27. Local setup

Copy `.env.example` to `.env.local` and configure required values.

```bash
npm install
npm run dev
```

Core Supabase variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, ECPay `HASH_KEY`, or `HASH_IV` through `NEXT_PUBLIC_*`.

---

## 28. Payment release gates

Checkout is protected by public and server-side environment flags:

```env
NEXT_PUBLIC_ECPAY_ENABLED=false
NEXT_PUBLIC_SHOP_CHECKOUT_ENABLED=false
SHOP_CHECKOUT_ENABLED=false
```

Keep checkout disabled until:

- canonical payment migration has been applied
- merchant review is approved
- production credentials are configured
- callback / entitlement fulfillment has been tested

---

## 29. Before changing database structure

1. Read `supabase/README.md` and `supabase/SCHEMA_MAP.md`.
2. Confirm the migration is active rather than retired/archive.
3. Inspect current row counts and dependencies.
4. Prefer migration/archiving over manual deletion.
5. Smoke-test login, question practice, mistakes, AI explanations, tasks, achievements, focus tools, slime state, and payment entitlement reads after schema changes.
6. Update `supabase/SCHEMA_MAP.md` whenever the source of truth changes.

---

## 30. Release

Use `RELEASE_CHECKLIST.md` before enabling production payment or treating a deployment as a release candidate.

For this product redesign, the release check should additionally confirm:

- The first screen clearly communicates national-exam preparation and weakness remediation.
- 「開始刷題」 is visually dominant.
- 國考題庫 is the dominant action in Study.
- Game/collection content does not compete with the main learning journey.
- 「我該讀什麼？」 uses deterministic learner analytics as its weakness source.
- AI is only used after a weakness has been determined.
