# 週期與體溫計算器

[![Last Commit](https://img.shields.io/github/last-commit/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator/commits/main)
[![Deploy Status](https://img.shields.io/github/deployments/bruce-yang-422/cycle-bbt-calculator/github-pages?label=pages)](https://github.com/bruce-yang-422/cycle-bbt-calculator/deployments)
[![License](https://img.shields.io/github/license/bruce-yang-422/cycle-bbt-calculator)](LICENSE)
[![Issues](https://img.shields.io/github/issues/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator/issues)
[![Repo Size](https://img.shields.io/github/repo-size/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator)

線上網址：https://cycle-bbt.stack-base.com/

以日期預估與短期記錄為主的靜態網站／PWA，結合日曆計算法與基礎體溫（BBT）記錄，依「月經記錄」「避孕規劃」「備孕規劃」三種使用目的呈現對應說明。所有資料只存在使用者瀏覽器的 `localStorage`，沒有後端、沒有帳號，也不會把記錄送出網站。支援繁體中文、英文、日文、韓文、西班牙文、德文、泰文、越南文八種語言。

## 目錄

- [專案結構](#專案結構)
- [本機開發與部署](#本機開發與部署)
- [核心邏輯](#核心邏輯)
- [語言與使用目的](#語言與使用目的)
- [本機資料與儲存鍵值](#本機資料與儲存鍵值)
- [地區化說明來源](#地區化說明來源)
- [分享本次結果](#分享本次結果)
- [PWA 與離線快取](#pwa-與離線快取)
- [測試](#測試)
- [字型與授權](#字型與授權)

## 專案結構

前端使用 Vite、Vue 3、Naive UI 與 TypeScript。Vue 元件負責互動與畫面，週期演算法及儲存規則由 TypeScript 模組處理。

```text
index.html、404.html           Vite 入口與搜尋引擎 metadata
vite.config.ts                 兩個 HTML 入口及 PWA 建置
src/
  App.vue、main.ts              主程式、首次設定、頁面導覽
  components/                  日曆、週期設定、體溫、歷史、指南、分享及安裝
  cycle.ts、useCycle.ts         週期與體溫演算法、反應式狀態
  storage.ts                   瀏覽器資料讀寫與重置
  i18n.ts、locales/             語系字串、日期與數字格式
  audience.ts、region.ts       用途文案與地區資訊
  chart.ts、share.ts            走勢圖與匯出圖片
  not-found.ts                 多語 404 頁面
  sw.ts                        Service Worker 與離線快取
css/                           主程式與 404 頁的樣式
public/                        圖檔與 PWA manifest
CNAME、Google 驗證檔等         根目錄的網站網域與搜尋引擎設定
locales/tests/                 單元測試與 Playwright 瀏覽器測試
```

## 本機開發與部署

使用 Node.js 20.19+ 或 22.12+（支援範圍見 `package.json`）。

```sh
npm ci
npm run dev
```

開啟 Vite 終端機顯示的網址。要驗證 PWA 安裝或離線快取，先建置，再預覽正式產物。

```sh
npm run build
npm run preview
```

建置會將專案根目錄的 `CNAME`、Google 驗證檔、`robots.txt` 和 `sitemap.xml` 原樣複製到 `dist/`。正式站由 GitHub Pages 發佈 `gh-pages` 分支的根目錄。發佈新版時，從 `main` 執行 `npm run build`，將 `dist/` 的內容發佈到 `gh-pages`，並保留該分支根目錄的 `.nojekyll`。

若將 Pages 的來源切換成 GitHub Actions，可手動執行 [Deploy to GitHub Pages](.github/workflows/pages.yml)。它會安裝依賴、執行測試、建置並發佈 `dist/`。

## 核心邏輯

**週期預估**（[src/useCycle.ts](src/useCycle.ts) 與 [src/cycle.ts](src/cycle.ts) 的 `calculateDays()`）：依「上次月經第一天」與週期長度，用日曆法推算月經期、受孕期與排卵日。支援「規律週期」（單一平均天數）與「不規律週期」（最短／最長天數區間）兩種模式；已知的下一筆歷史記錄日期會提前截止預估範圍。

**體溫升溫判定**（[src/cycle.ts](src/cycle.ts) 的 `analyzeBBT()`）：

1. 取升溫前連續 6 天的最高體溫 + 0.05°C 作為參考線（cover line）。
2. 需連續 3 個以上日曆日的體溫高於或等於參考線，且持續到查詢日，才視為升溫趨勢確立。
3. 中途漏測、體溫下降、缺少查詢日資料，或已進入新週期，都不會沿用先前的判定結果。
4. 只分析所屬週期內、不晚於今天的資料，不會跨週期混算。

這是未經臨床驗證的輔助趨勢規則，不作排卵日診斷，也不保證避孕或受孕效果。

**歷史記錄**（[src/cycle.ts](src/cycle.ts) 的 `deriveHistory()`）：只需輸入月經開始日，N 筆日期會自動算出 N−1 個完整週期；新增、補登或刪除日期後即時重算統計。週期設定只在使用者送出後才寫入 `localStorage`；歷史記錄只在使用者主動按「從記錄帶入」時才回填到設定表單。

## 語言與使用目的

語言優先順序：網址參數 `?lang=xx` → 本機儲存的選擇 → 瀏覽器語言 → 預設英文；中文一律對應繁體中文（`zh-TW`）。頁面頂部與首次使用視窗都可以切換語言，切換時會更新文字、驗證訊息、日期／數字格式、安裝說明與頁面 metadata，並保留使用者尚未送出的表單內容。原生日期輸入器（`<input type="date">`）的選取面板語言仍由瀏覽器與作業系統決定，不受網站語言影響。

三種使用目的只改變文案與建議內容，計算邏輯、日期範圍與粉／橙／紅／綠四色分類完全一致：

- **月經記錄**：著重核對開始日、出血天數與週期變化。
- **避孕規劃**：著重預估風險期與避孕提醒。
- **備孕規劃**：著重預估受孕時段與安排方向。

首次使用時會詢問使用者選擇用途，之後不再重複詢問，可從「設定與指南」頁的下拉選單隨時修改。

字串統一放在 `src/locales/<語言>.ts`。各語言使用相同的鍵值和 `{n}`、`{date}` 等參數名稱。Vue 元件透過 `t(key, values)` 顯示翻譯。

## 本機資料與儲存鍵值

所有記錄與偏好都存在 `localStorage`，不會上傳到任何伺服器：

| 鍵值 | 內容 |
| --- | --- |
| `periodHistory` | 月經開始日清單 |
| `bbtData` | 基礎體溫記錄（日期＋體溫） |
| `cycleSettings` | 已成功送出的週期設定（類型、天數） |
| `audienceMode` | 使用目的（`tracking` / `contraception` / `conception`） |
| `language` | 使用者選擇的語言 |
| `regionPreference` | 地區說明的手動選擇（`auto` / `TW` / `global`） |
| `installBannerDismissed` | 是否已關閉或完成 PWA 安裝提示 |

更新程式不會清除既有記錄；清除瀏覽器的網站資料則會移除全部記錄與偏好。

「設定與指南」頁提供「一鍵清除並重置」（[src/storage.ts](src/storage.ts) 的 `resetAllData()`）：經確認對話框同意後刪除上述所有鍵值，重新整理頁面並回到首次使用狀態，不影響同瀏覽器內其他網站的資料；若瀏覽器阻擋寫入導致刪除不完整，會提示使用者，且不會執行重新整理。

## 地區化說明來源

三種用途的建議與參考頁提供通用資訊，另外準備了八語版本的台灣地區說明（在地就醫、諮詢管道等）。地區與語言彼此獨立——例如台灣 IP 搭配越南文介面時，仍以越南文顯示台灣的婦產科名稱與諮詢資訊，不會改變週期計算、記錄或介面語言本身。

「設定與指南」頁的地區選單提供自動／台灣／通用三個選項，手動選擇會存在 `regionPreference`，離線時仍然有效。自動模式（[src/region.ts](src/region.ts)）會查詢同網域的 `/cdn-cgi/trace` 端點，只讀取 IP 所在國家欄位 `loc`（不讀取資料中心位置 `colo`），不會儲存或記錄完整回應、IP 或判斷結果；回應內容含 IP，只由瀏覽器暫時接收處理，程式不會加入任何回應記錄或分析追蹤，也不會呼叫第三方定位服務或傳送月經、體溫資料。VPN 等因素可能影響 IP 對應的地區判斷，使用者可以隨時手動修正。

**GitHub Pages 部署備註：** 若自訂網域已透過 Cloudflare 代理（DNS 橘雲），可直接使用其同網域 trace 端點，不需要搬離 GitHub Pages。若使用 Cloudflare 純 DNS（灰雲）或直接使用 `github.io` 網域，則沒有此端點；在偵測失敗、離線、逾時或回應格式不符時，頁面會明確顯示「無法判斷」並改用通用說明，使用者仍可手動選擇台灣。本專案不會、也無法自行修改 DNS 設定。自動查詢的結果不會進入 Service Worker 快取，手動選擇一律優先於尚未完成的自動偵測請求。

參考來源：

- [Cloudflare 同網域端點說明](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/)
- [移民署：1990 外來人士在臺生活諮詢服務熱線](https://www.immigration.gov.tw/5385/7445/7910/204893/)（支援語言與服務時間以官方公告為準）
- [ACOG：生育意識與家庭計畫](https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning)
- [ACOG：體溫與排卵評估](https://www.acog.org/womens-health/faqs/evaluating-infertility)
- [WHO：緊急避孕](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception)
- [NHS：驗孕時機](https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/)

「設定與指南」頁分為「偏好設定」與「緊急措施與參考」兩部分：緊急處理、驗孕摘要直接顯示；方法比較、日常避孕、LH／體溫／黏液判讀與伴侶規劃則用原生 `<details>` 展開，八語同步提供，內容都附上來源連結。指南內容依使用目的切換整組標題、重點卡片與 FAQ：避孕規劃提供緊急避孕、驗孕與方法比較；備孕規劃提供受孕安排、孕前準備、驗孕與就醫提醒；月經記錄提供通用的月經與婦科健康指南，優先呈現經痛、月經不規律、出血變化與就醫時機，操作說明放在 FAQ 後段。切換語言或離線還原時都會套用目前的使用目的，不會改變任何計算結果。

## 分享本次結果

日曆下方的「分享本次結果」（[src/share.ts](src/share.ts)）提供預覽與兩種匯出方式：

- **圖片**：在本機用 Canvas 產生 1080 × 1620 的 PNG（2:3 比例）。上方 1080 × 1080 為完整週期日曆（可跨月、跨年），下方為使用目的與週期摘要卡片。可直接下載，或交由裝置的分享選單傳送。
- **文字**：純文字加 emoji，不含 Markdown 語法，可複製後貼到 LINE 等聊天工具，或同樣使用裝置分享選單。

匯出內容依目前語言與使用目的產生，採用「已套用的本次計算結果」，不會採用尚未儲存的表單草稿，也不受目前月曆顯示到哪個月份影響；遇到已記錄的下一次月經開始日即截止。匯出不包含體溫明細或完整歷史記錄，但會保留預估標示與用途提醒文字。整個流程資料不會傳送到任何圖片服務，分享對象完全由使用者自行決定；離線狀態下也能匯出，若瀏覽器不支援 Web Share 或剪貼簿權限，會退回為下載圖片或提示手動選取文字複製。

## PWA 與離線快取

八種語言與各自的 `manifest.<lang>.json` 全部預先快取，離線時仍可切換語言；各語言 manifest 共用同一個 app ID，已安裝 App 之後系統顯示名稱的更新方式則依瀏覽器而定。

建置時 Vite 產生帶有內容雜湊的檔名，Workbox 依每次建置產物更新離線快取。新版本會清除舊版 App 的快取，並保留 `localStorage` 的既有記錄。頁面內對外部網站的參考連結需要網路才能開啟。

## 測試

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run test:browser
```

`npm test` 涵蓋：

- [bbt.test.cjs](locales/tests/bbt.test.cjs)：體溫升溫演算法回歸
- [locales.test.cjs](locales/tests/locales.test.cjs)：語言字串鍵值完整性、`{n}`／`{date}` 等參數一致性、來源連結檢查
- [storage.test.cjs](locales/tests/storage.test.cjs)：一鍵清除並重置的行為（確認取消、失敗提示、成功後保留其他網站資料）

`npm run test:browser` 先建置，再用 Playwright 和暫時的本機伺服器測試 `dist/`，涵蓋八種語言 × 三種使用目的 × 四個頁面 × 三種螢幕寬度，並驗證首次設定流程、設定持久化、表單草稿保留、月經／體溫記錄與離線切換。所有瀏覽器測試都使用互相隔離的瀏覽器資料，不會互相污染。

## 字型與授權

標題文字使用 [Google Fonts 的 Huninn（粉圓）](https://fonts.google.com/specimen/Huninn)，由 justfont 提供的開源圓體（並非金萱那提），透過 Google Fonts 以 `display=swap` 載入；無網路或字型服務不可用時會回退到微軟正黑體等系統字型。字型請求不含使用者記錄，但 Google 會接收到一般的字型連線資訊；外部字型不納入 App 的離線預快取範圍。內文維持系統無襯線字型。

MIT License © 2026 Bruce Yang，詳見 [LICENSE](LICENSE)。
