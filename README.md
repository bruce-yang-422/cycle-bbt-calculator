<!-- 本文件為主要版本。README.en.md 為英文翻譯，內容須雙向同步：修改任一份時，請一併更新另一份（npm test 會檢查結構一致）。 -->

# 週期與體溫計算器 · Cycle & BBT Calculator

**繁體中文** | [English](README.en.md)

[![Last Commit](https://img.shields.io/github/last-commit/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator/commits/main)
[![Deploy Status](https://img.shields.io/github/deployments/bruce-yang-422/cycle-bbt-calculator/github-pages?label=pages)](https://github.com/bruce-yang-422/cycle-bbt-calculator/deployments)
[![License](https://img.shields.io/github/license/bruce-yang-422/cycle-bbt-calculator)](LICENSE)

以日曆計算法與基礎體溫（BBT）預估月經週期的 PWA。純前端、無後端與帳號，資料只存在瀏覽器的 `localStorage`，支援離線與八種語言。

**線上網址：** <https://cycle-bbt.stack-base.com/>

## 功能概覽

- 週期預估（規律／不規律週期），以及月經期、受孕期、排卵日的日曆
- 基礎體溫記錄、參考線（cover line）判定與走勢圖
- 月經開始日歷史與週期統計
- 無保護性行為記錄：事後避孕時限與驗孕日
- 三種使用目的（避孕、月經記錄、備孕）共用同一套計算，只切換文案
- CSV 備份匯出與匯入
- 淺色／深色／跟隨系統、八種語言、PNG／文字分享、可安裝的離線 PWA

## 技術棧

| 類別 | 使用技術 |
| --- | --- |
| 框架 | [Vue 3](https://vuejs.org/)（Composition API、`<script setup>`） |
| 語言 | [TypeScript](https://www.typescriptlang.org/)（strict） |
| 建置 | [Vite](https://vite.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox)（`injectManifest`） |
| 樣式 | 原生 CSS 與 design tokens，無 UI 套件 |
| 測試 | Node.js test runner + [tsx](https://tsx.is/)、[Playwright](https://playwright.dev/) |

## 快速開始

需要 Node.js `^20.19.0` 或 `>=22.12.0`。

```sh
git clone https://github.com/bruce-yang-422/cycle-bbt-calculator.git
cd cycle-bbt-calculator
npm ci
npm run dev
```

Service Worker 只在正式建置啟用；要測試 PWA 安裝或離線快取，請用 `npm run build && npm run preview`。

## 可用指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動 Vite 開發伺服器 |
| `npm run build` | 型別檢查並建置至 `dist/` |
| `npm run preview` | 預覽正式建置產物 |
| `npm run typecheck` | 執行 `vue-tsc` 型別檢查 |
| `npm test` | 單元測試 |
| `npm run test:browser` | 建置後執行 Playwright 瀏覽器測試 |

## 專案結構

```text
src/
├── main.ts / App.vue      進入點、導覽、首次使用流程
├── components/            頁面（*Page.vue）、對話框（*Dialog.vue）與共用元件
├── cycle.ts               週期與 BBT 演算法（純函式）
├── unprotected.ts         事後避孕時限與驗孕日（純函式）
├── useCycle.ts            反應式狀態與所有寫入操作
├── storage.ts             localStorage 讀寫、驗證與重置
├── backup.ts              CSV 備份的匯出、解析與還原
├── theme.ts / region.ts   外觀與地區偏好
├── i18n.ts / locales/     翻譯與 Intl 格式化
├── chart.ts / share.ts    Canvas 走勢圖與分享圖片
└── sw.ts                  Service Worker
css/app.css                design tokens 與全站樣式
public/                    圖示與各語言 PWA manifest
locales/tests/             單元與瀏覽器測試
```

## 架構

- **分層**：演算法放在無副作用的模組（`cycle.ts`、`unprotected.ts`）；週期、歷史、體溫與無保護記錄的狀態與讀寫都集中在 `useCycle()`；語言、外觀、地區與使用目的等偏好由各自模組（`i18n.ts`、`theme.ts`、`region.ts`、`App.vue`）存取；元件只負責畫面與事件。
- **操作結果**：寫入操作回傳 `ActionResult`（`{ ok, key, field? }`），`key` 為翻譯鍵、`field` 為要聚焦的欄位 id，由 UI 決定如何呈現。
- **無路由**：四個頁面以 `activePage` 切換；`#about`、`#privacy` 會直接開啟對應對話框。

### 週期預估

`calculateDays()`（[`cycle.ts`](src/cycle.ts)）以「上次月經第一天」為錨點：

- 規律週期：排卵日 = 週期長度 − 14，受孕期為排卵日前 5 天至後 2 天。
- 不規律週期：受孕期為第（最短 − 18）天至第（最長 − 11）天，不標示排卵日。
- 已記錄的下一次月經開始日會截止預估。

`startPeriod()`（[`useCycle.ts`](src/useCycle.ts)）同時寫入歷史並重設錨點，回傳 `undo`；`updateHistory()` 修改的若是錨點日期，也會一併移動預估。

### 基礎體溫分析

`analyzeBBT()`（[`cycle.ts`](src/cycle.ts)）：

1. 參考線 = 升溫前連續 6 天的最高值 + 0.05°C。
2. 連續 3 個以上日曆日 ≥ 參考線，且延續到查詢日，才視為升溫確立。
3. 漏測、降溫、缺少查詢日資料或進入新週期時重新判定。
4. 只分析同一週期內、不晚於今天的資料。

此規則僅供趨勢參考，未經臨床驗證。

### 事後避孕時限

常數定義於 [`unprotected.ts`](src/unprotected.ts)：

| 項目 | 期限 | 出處 |
| --- | --- | --- |
| 左炔諾孕酮（LNG） | 3 天（72 小時） | [WHO](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception) |
| 烏利司他（UPA） | 5 天（120 小時） | [WHO](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception) |
| 銅 IUD | 5 天 | [WHO](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception) |
| 驗孕日 | 事後第 21 天 | [NHS](https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/) |

### 樣式與主題

- 所有顏色皆為 `css/app.css` 的 CSS 自訂屬性；`chart.ts` 執行時讀取同一組 token。
- `<html data-theme="light|dark">` 為使用者明確選擇，未設定時依 `prefers-color-scheme`。
- `<html data-mode="contraception">` 將低風險日改為中性色；其他使用目的沿用綠色。
- 分享圖片固定使用淺色配色。

## 資料儲存

所有狀態都存在 `localStorage`，讀取時會驗證格式，無效資料一律忽略：

| 鍵值 | 內容 |
| --- | --- |
| `cycleSettings` | 已套用的週期設定 |
| `periodHistory` | 月經開始日 |
| `bbtData` | 基礎體溫記錄 |
| `unprotectedLog` | 無保護性行為日期 |
| `audienceMode` | `contraception` / `tracking` / `conception` |
| `language` | 介面語言 |
| `regionPreference` | `auto` / `TW` / `global` |
| `theme` | `light` / `dark`（未設定即跟隨系統） |
| `installBannerDismissed` | 已關閉安裝提示 |

新增鍵值時，請一併加入 `storage.ts` 的 `appStorageKeys`，`resetAllData()` 才會清除它。

### 備份格式

[`backup.ts`](src/backup.ts) 匯出 UTF-8（含 BOM）CSV，每列為 `record,key,value`，欄位名稱與 `record` 類型固定為英文，不隨介面語言改變：

```text
record,key,value
meta,format,cycle-bbt-backup
meta,version,1
setting,lastPeriod,2026-11-05
period,2026-10-08,
bbt,2026-11-18,36.68
unprotected,2026-11-16,
preference,language,zh-TW
```

- 檔名格式為 `<lang>_<name>_<date>.csv`，以語言代碼開頭、名稱依介面語言翻譯，例如 `en_cycle-temperature-backup_2026-11-18.csv`、`zh-TW_週期與體溫備份_2026-11-18.csv`。
- `parseBackup()` 先驗證整份檔案，任何一列無效就整份拒絕，不會部分覆蓋；未知的 `record` 類型會略過，保留向後相容。
- 還原時取代所有記錄；備份內有的偏好會覆寫，沒有的則保留。`installBannerDismissed` 屬於裝置層級設定，不會匯出。
- 格式變更時請遞增 `backupVersion`；版本較新的檔案會被拒絕。

網站只發出兩種外部請求：Google Fonts，以及「自動判斷地區」時的同網域 Cloudflare `/cdn-cgi/trace`（只讀 `loc`）。隱私權政策全文在 [`InfoDialogs.vue`](src/components/InfoDialogs.vue) 與各語言檔；政策內容變更時，請同步更新該檔的 `policyDate`。

## 國際化

- 語言優先順序：`?lang=` → `localStorage` → 瀏覽器語言 → 英文。
- 字串位於 `src/locales/<lang>.ts`，元件以 `t(key, values)` 取用；日期與數字以 `Intl` 格式化。
- 單元測試會檢查：八種語言的鍵值完全一致、`{n}` 等參數相同，以及原始碼引用的鍵值都存在。
- 新增語言：新增 `src/locales/<lang>.ts`、`public/locales/manifest.<lang>.json`，並加入 `i18n.ts` 的 `supportedLanguages`。
- SEO：每種語言都有 `?lang=<lang>` 專屬網址，`index.html` 與 `sitemap.xml` 以 hreflang 互相標示（不帶參數的 `/` 為 `x-default`）。`syncLocalizedMetadata()` 會依目前語言改寫 `<title>`、描述、Open Graph、JSON-LD 與 canonical，文案取自 `seo.title`、`seo.description`；新增語言時請一併加入 hreflang 與 sitemap。

## 部署

正式站由 [GitHub Actions 工作流程](.github/workflows/pages.yml) 部署：每次推送到 `main` 會自動執行測試、建置並發佈 `dist/` 到 GitHub Pages，不使用部署分支。也可在 Actions 頁面手動執行。

首次設定時，請到 GitHub 儲存庫的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。

- 版本號取自 `package.json`，建置日期在建置時注入（`__APP_VERSION__`、`__BUILD_DATE__`）。
- 品牌圖形以 [`logo-cycle.svg`](public/images/logo-cycle.svg) 為準；PWA 圖示由此 SVG 逐一尺寸重新繪製，maskable 版本保留 80% 安全區。

## 測試

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run test:browser
```

| 測試 | 範圍 |
| --- | --- |
| [`bbt.test.cjs`](locales/tests/bbt.test.cjs) | BBT 演算法 |
| [`locales.test.cjs`](locales/tests/locales.test.cjs) | 翻譯鍵值與參數、HTML 入口、manifest 圖示 |
| [`storage.test.cjs`](locales/tests/storage.test.cjs) | 一鍵清除並重置 |
| [`backup.test.cjs`](locales/tests/backup.test.cjs) | 備份往返、試算表編輯容錯、無效檔案拒絕、檔名 |
| [`readme.test.cjs`](locales/tests/readme.test.cjs) | 中英文 README 結構同步 |
| [`browser.cjs`](locales/tests/browser.cjs) | 對 `dist/` 進行端對端測試：8 語言 × 3 使用目的 × 4 頁面 × 3 寬度，加上各項使用流程與離線 |

瀏覽器測試使用固定時鐘（`2026-01-31`）與隔離的瀏覽器資料。

## 文件同步

本 README（繁體中文）為主要版本，[英文版](README.en.md)為翻譯；兩者不一致時以繁體中文版為準。修改任一份時請同步更新另一份，`npm test` 會檢查兩者的章節、表格、指令與連結是否一致。

## 免責聲明

本工具僅提供記錄與日期預估，不是醫療器材，也不能取代避孕措施或醫療建議。

## 授權

[MIT License](LICENSE) © 2026 Bruce Yang
