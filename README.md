# 週期與體溫計算器 · Cycle & BBT Calculator

[![Last Commit](https://img.shields.io/github/last-commit/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator/commits/main)
[![Deploy Status](https://img.shields.io/github/deployments/bruce-yang-422/cycle-bbt-calculator/github-pages?label=pages)](https://github.com/bruce-yang-422/cycle-bbt-calculator/deployments)
[![License](https://img.shields.io/github/license/bruce-yang-422/cycle-bbt-calculator)](LICENSE)
[![Issues](https://img.shields.io/github/issues/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator/issues)
[![Repo Size](https://img.shields.io/github/repo-size/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator)

> 結合日曆計算法與基礎體溫（BBT）記錄的週期預估工具。純前端 PWA，免帳號、可離線，所有資料只存在你的裝置。

**線上網址：** <https://cycle-bbt.stack-base.com/>

## 目錄

- [功能特色](#功能特色)
- [技術棧](#技術棧)
- [快速開始](#快速開始)
- [可用指令](#可用指令)
- [專案結構](#專案結構)
- [架構與核心邏輯](#架構與核心邏輯)
- [資料與隱私](#資料與隱私)
- [國際化](#國際化)
- [部署](#部署)
- [測試](#測試)
- [免責聲明](#免責聲明)
- [參考資料](#參考資料)
- [授權](#授權)

## 功能特色

- **一眼看懂今天**：首頁主卡顯示週期進度環、週期第幾天、目前階段與下次月經倒數。
- **一鍵記錄**：「月經來了」點一下即記錄今天並重算日曆（可復原）；「記錄體溫」以 −／＋ 微調，免打字。
- **點日期即操作**：點日曆任一天，可直接標記「月經從這天開始」或補記當天體溫。
- **三種使用目的**：避孕規劃（預設）、月經記錄、備孕規劃，相同計算邏輯搭配不同說明與建議。
- **無保護記錄**（避孕模式最醒目，其他模式也有低調入口）：輸入發生日期，即顯示當日風險、三種事後避孕方法的時限，以及建議驗孕日，並在首頁提醒。
- **基礎體溫分析**：自動計算參考線（cover line）與連續升溫天數，附 30 筆走勢圖。
- **週期歷史**：輸入月經開始日即自動算出週期間隔、平均、最短與最長；記錯日期可直接原地修改，若是目前預估所依據的日期，日曆會一併更新。
- **分享**：匯出 1080 × 1620 PNG 圖片，或可貼到 LINE 的純文字。
- **淺色／深色／跟隨系統**：頂端以圖示一鍵切換外觀，選擇會被記住。
- **八種語言**：繁體中文、English、日本語、한국어、Español、Deutsch、ไทย、Tiếng Việt。
- **PWA**：可安裝至主畫面，完整離線使用。
- **關於本站與隱私權政策**：八語版本，可從頁尾、「設定與指南」開啟，或以 `#about`、`#privacy` 網址直接連結。

## 技術棧

| 類別 | 使用技術 |
| --- | --- |
| 框架 | [Vue 3](https://vuejs.org/)（Composition API、`<script setup>`） |
| 語言 | [TypeScript](https://www.typescriptlang.org/) |
| 建置 | [Vite](https://vite.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox)（`injectManifest`） |
| 樣式 | 原生 CSS（design tokens、淺色／深色主題、無 UI 套件） |
| 字型 | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)、[Noto Sans TC／JP／KR／Thai](https://fonts.google.com/noto) |
| 測試 | Node.js test runner + [tsx](https://tsx.is/)、[Playwright](https://playwright.dev/) |

## 快速開始

### 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm

### 安裝與啟動

```sh
git clone https://github.com/bruce-yang-422/cycle-bbt-calculator.git
cd cycle-bbt-calculator
npm ci
npm run dev
```

開啟終端機顯示的網址即可。要驗證 PWA 安裝或離線快取，請改用正式建置：

```sh
npm run build
npm run preview
```

## 可用指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動 Vite 開發伺服器 |
| `npm run build` | 型別檢查並建置至 `dist/` |
| `npm run preview` | 預覽正式建置產物 |
| `npm run typecheck` | 執行 `vue-tsc` 型別檢查 |
| `npm test` | 執行單元測試 |
| `npm run test:browser` | 建置後執行 Playwright 瀏覽器測試 |

## 專案結構

```text
.
├── index.html / 404.html      Vite 入口與 SEO metadata
├── vite.config.ts             多入口建置與 PWA 設定
├── css/                       全站樣式（app.css）與 404 頁樣式
├── public/                    圖示、PWA manifest（各語言）
├── src/
│   ├── main.ts / App.vue      應用程式進入點、導覽、首次使用流程
│   ├── components/            頁面與對話框元件
│   │   ├── CalendarPage.vue       首頁：今日主卡、快捷鍵、摘要、日曆
│   │   ├── TemperaturePage.vue    體溫記錄與走勢圖
│   │   ├── HistoryPage.vue        月經開始日歷史
│   │   ├── SettingsPage.vue       偏好設定與健康指南
│   │   ├── CycleSettings.vue      週期設定表單
│   │   ├── UnprotectedDialog.vue  無保護記錄與事後避孕時限
│   │   ├── ShareDialog.vue        圖片／文字分享
│   │   ├── InstallControls.vue    PWA 安裝提示
│   │   ├── ThemeToggle.vue        外觀切換
│   │   ├── InfoDialogs.vue        關於本站與隱私權政策
│   │   ├── EntryField.vue         共用輸入欄位（含 −／＋ 步進器）
│   │   └── AppIcon.vue            線條圖示
│   ├── cycle.ts               週期與體溫演算法（純函式）
│   ├── useCycle.ts            反應式狀態與使用者操作
│   ├── unprotected.ts         事後避孕時限與驗孕日計算
│   ├── storage.ts             localStorage 讀寫與重置
│   ├── audience.ts            使用目的文案
│   ├── region.ts              地區判斷
│   ├── theme.ts               淺色／深色／跟隨系統
│   ├── i18n.ts / locales/     國際化與各語言字串
│   ├── chart.ts / share.ts    Canvas 走勢圖與分享圖片
│   ├── not-found.ts           多語 404 頁
│   └── sw.ts                  Service Worker
└── locales/tests/             單元測試與瀏覽器測試
```

## 架構與核心邏輯

應用程式沒有後端。Vue 元件只負責畫面與互動；演算法集中在無副作用的 TypeScript 模組，方便單元測試。

### 週期預估

由 [`cycle.ts`](src/cycle.ts) 的 `calculateDays()` 依「上次月經第一天」與週期長度推算月經期、受孕期與排卵日：

- **規律週期**：單一平均天數，排卵日 = 週期長度 − 14。
- **不規律週期**：以最短／最長週期推算受孕期區間，不標示單一排卵日。
- 已記錄的下一次月經開始日會提前截止預估範圍。

「月經來了」由 [`useCycle.ts`](src/useCycle.ts) 的 `startPeriod()` 處理：寫入歷史記錄、以該日重新套用設定，並回傳可還原的 `undo`。

### 基礎體溫分析

由 [`cycle.ts`](src/cycle.ts) 的 `analyzeBBT()` 處理：

1. 取升溫前連續 6 天的最高體溫 + 0.05°C 作為參考線（cover line）。
2. 需連續 3 個以上日曆日高於或等於參考線，且持續到查詢日，才視為升溫趨勢確立。
3. 中途漏測、降溫、缺少查詢日資料或進入新週期，皆重新判定。
4. 只分析同一週期內、不晚於今天的資料。

### 週期歷史

由 `deriveHistory()` 處理：N 筆月經開始日自動產生 N−1 個週期間隔，新增或刪除後即時重算統計。

### 無保護記錄

由 [`unprotected.ts`](src/unprotected.ts) 依發生日期計算：

| 項目 | 時限 |
| --- | --- |
| 左炔諾孕酮（LNG） | 72 小時內 |
| 烏利司他（UPA） | 120 小時內 |
| 銅 IUD | 5 天內 |
| 建議驗孕日 | 預估月經未來時，或事後第 21 天起 |

入口依使用目的調整醒目程度，但任何模式都找得到，避免臨時需要時還得先改設定：

| 入口 | 避孕規劃 | 月經記錄／備孕規劃 |
| --- | --- | --- |
| 首頁快捷鍵下方的整列按鈕 | 顯示 | 不顯示 |
| 首頁底部的文字按鈕 | 不顯示 | 顯示 |
| 「設定與指南」頁指南最上方 | 顯示 | 顯示 |
| 已記錄後的首頁提醒卡與日曆標記 | 顯示 | 顯示 |

### 使用目的

三種使用目的共用同一套計算與日期範圍，只改變文案、建議與配色：

| 目的 | 重點 | 低風險日配色 |
| --- | --- | --- |
| 避孕規劃 | 預估風險期、事後避孕與驗孕 | 中性燕麥色 |
| 月經記錄 | 開始日、出血天數、週期變化 | 薄荷綠 |
| 備孕規劃 | 受孕時段與孕前準備 | 薄荷綠 |

避孕模式刻意不用綠色，避免傳達「綠色 = 可以不避孕」的錯誤暗示。

## 資料與隱私

- 所有資料只存在瀏覽器的 `localStorage`，不會傳送到任何伺服器。
- 不需要帳號，也沒有分析追蹤或第三方 SDK。
- 分享功能在本機產生圖片與文字，由使用者自行決定分享對象；匯出內容不含體溫明細、歷史記錄與無保護記錄。

### 儲存鍵值

| 鍵值 | 內容 |
| --- | --- |
| `cycleSettings` | 已套用的週期設定 |
| `periodHistory` | 月經開始日清單 |
| `bbtData` | 基礎體溫記錄 |
| `unprotectedLog` | 無保護性行為日期 |
| `audienceMode` | 使用目的（`contraception` / `tracking` / `conception`） |
| `language` | 介面語言 |
| `regionPreference` | 地區說明（`auto` / `TW` / `global`） |
| `theme` | 外觀（`light` / `dark`；未設定即跟隨系統） |
| `installBannerDismissed` | 是否已關閉安裝提示 |

「設定與指南」頁的「一鍵清除並重置」（`resetAllData()`）會在確認後刪除以上所有鍵值，並回到首次使用狀態。

### 地區判斷

地區選單提供自動／台灣／通用三種選項。自動模式會查詢同網域的 Cloudflare `/cdn-cgi/trace` 端點，只讀取國家欄位 `loc`，不儲存 IP 或完整回應。查詢失敗、離線或未經 Cloudflare 代理時，會改用通用說明，使用者可隨時手動選擇。地區只影響「在台灣尋求協助」的說明內容，不影響介面語言或計算結果。

### 隱私權政策

站內完整政策見「隱私權政策」對話框，或直接開啟 <https://cycle-bbt.stack-base.com/#privacy>。內容更新時，請同步修改 [`InfoDialogs.vue`](src/components/InfoDialogs.vue) 的 `policyDate`。

### 外部資源

網頁字型由 Google Fonts 載入，請求不含任何使用者記錄；無法連線時會改用系統字型。

## 國際化

- 語言優先順序：網址參數 `?lang=xx` → 已儲存的選擇 → 瀏覽器語言 → 英文。中文一律對應 `zh-TW`。
- 字串位於 `src/locales/<lang>.ts`，各語言鍵值與參數（如 `{n}`、`{date}`）必須一致，由單元測試把關。
- 元件透過 `t(key, values)` 取得翻譯；日期與數字以 `Intl` 依語言格式化。
- 字型依 `lang` 切換：拉丁文字與數字使用 Plus Jakarta Sans，中、日、韓、泰文各自使用對應的 Noto Sans。
- 原生日期選擇器的語言由瀏覽器與作業系統決定。

新增語言時，需同時新增 `src/locales/<lang>.ts`、`public/locales/manifest.<lang>.json`，並更新 `i18n.ts` 的 `supportedLanguages`。

## 部署

正式站由 GitHub Pages 發佈 `gh-pages` 分支根目錄。建置時會將 `CNAME`、Google 驗證檔、`robots.txt` 與 `sitemap.xml` 複製到 `dist/`。

```sh
# 1. 從 main 建置
git checkout main
npm ci
npm run build

# 2. 以 worktree 更新 gh-pages（保留 .nojekyll）
git fetch origin gh-pages
git worktree add ../gh-pages origin/gh-pages --detach
cd ../gh-pages
git ls-files | grep -v '^\.nojekyll$' | xargs git rm -q
cp -r ../cycle-bbt-calculator/dist/. .
git add -A
git commit -m "deploy: 發佈網站 / publish website"
git push origin HEAD:gh-pages

# 3. 清理
cd -
git worktree remove ../gh-pages
```

若將 Pages 來源切換為 GitHub Actions，可手動執行 [Deploy to GitHub Pages](.github/workflows/pages.yml) 工作流程，它會自動安裝、測試、建置並發佈 `dist/`。

### 圖示與版本

- 品牌圖形以 [`public/images/logo-cycle.svg`](public/images/logo-cycle.svg) 為準；`favicon.ico` 與 `logo.png` 為其點陣版本。
- PWA 圖示（`icon-*.png`、`icon-maskable-*.png`、`apple-touch-icon.png`）由 SVG 以瀏覽器引擎逐一尺寸重新繪製，避免點陣縮圖造成模糊；maskable 圖示將圖形保留在中央 80% 安全區內。
- 「關於本站」顯示的版本號取自 `package.json` 的 `version`，更新日期為建置當天。

### PWA 快取

Vite 產生內容雜湊檔名，Workbox 依每次建置更新預快取。新版本會清除舊快取，但保留 `localStorage` 中的記錄。八種語言的 manifest 皆預先快取，離線時仍可切換語言。

## 測試

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run test:browser
```

| 測試 | 範圍 |
| --- | --- |
| [`bbt.test.cjs`](locales/tests/bbt.test.cjs) | 體溫升溫演算法 |
| [`locales.test.cjs`](locales/tests/locales.test.cjs) | 八種語言的鍵值完整性、參數一致性、原始碼引用的鍵值存在 |
| [`storage.test.cjs`](locales/tests/storage.test.cjs) | 一鍵清除並重置 |
| [`browser.cjs`](locales/tests/browser.cjs) | 8 種語言 × 3 種使用目的 × 4 個頁面 × 3 種寬度；首次使用、月經來了與復原、無保護記錄、表單草稿、記錄、地區、離線、分享匯出、多語 404 |

瀏覽器測試會先建置，再以暫時的本機伺服器測試 `dist/`，並固定系統時間以確保結果可重現。

## 免責聲明

本工具僅提供記錄與日期預估，**不是醫療器材，也不能取代醫療建議**。日曆法與體溫趨勢無法確認排卵，預估的「低風險期」不代表不會懷孕，也不能取代避孕措施。體溫分析規則未經臨床驗證。個人避孕、備孕或健康問題請諮詢合格醫療人員。

## 參考資料

- [WHO：緊急避孕](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception)
- [NHS：驗孕時機](https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/)
- [NHS：避孕方法](https://www.nhs.uk/contraception/methods-of-contraception/)
- [ACOG：生育意識與家庭計畫](https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning)
- [ACOG：體溫與排卵評估](https://www.acog.org/womens-health/faqs/evaluating-infertility)
- [移民署：1990 外來人士在臺生活諮詢服務熱線](https://www.immigration.gov.tw/5385/7445/7910/204893/)
- [Cloudflare：同網域端點說明](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/)

## 授權

本專案以 [MIT License](LICENSE) 授權。© 2026 Bruce Yang
