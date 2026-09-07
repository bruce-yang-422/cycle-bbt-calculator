# 週期與體溫計算器

以日期預估與短期記錄為主的靜態網站，提供月經記錄、避孕規劃、備孕規劃三種說明模式。

線上網址：https://cycle-bbt.stack-base資.com/

## 專案結構

```text
index.html                    頁面結構與翻譯標記
css/
  app.css                     主程式樣式、響應式與多語排版
  not-found.css               404 頁樣式
js/
  app.js                      狀態、表單、日曆與結果呈現
  cycle.js                    週期資料切分、體溫趨勢、歷史日期間隔
  storage.js                  本機記錄讀寫
  purposes.js                 三種使用目的的說明與建議選擇
  i18n.js                     語言切換、日期與數字格式、文字替換
  chart.js                    Canvas 體溫圖
  pwa.js                      安裝提示、手動安裝入口
  events.js                   HTML 控制項事件綁定
  not-found.js                404 頁多語呈現
locales/
  zh-TW.js en.js ja.js ko.js   繁體中文、英文、日文、韓文
  es.js de.js th.js vi.js     西班牙文、德文、泰文、越南文
  manifest.*.json             各語言的 PWA 名稱與啟動網址
sw.js                         根目錄 Service Worker 與版本快取
manifest.json                 預設 PWA 設定
images/                       圖示與分享圖片
404.html                      多語錯誤頁
sitemap.xml robots.txt        搜尋引擎設定
googlea581463e157279ca.html    Google 擁有權驗證，保留原樣
tests/
  bbt.test.cjs                體溫演算法回歸
  locales.test.cjs            字串完整性、參數與資源檢查
  browser.cjs                多語、多目的、響應式、儲存與離線測試
```

沒有執行期框架或翻譯服務依賴。所有語言字典隨網站載入，使用者資料不會送往翻譯服務。`package.json` 只供開發測試使用。

## 本機使用與部署

```sh
python -m http.server 8080
```

開啟 `http://localhost:8080`。亦可直接開啟 `index.html` 查看主程式；安裝與離線快取需 localhost 或 HTTPS，瀏覽器也可能限制 file URL 的儲存。

部署時上傳整個網站，包含 `css/`、`js/`、`locales/` 與 `images/`，不需要建置。網站使用根目錄部署，請保留根目錄的 `sw.js` 以涵蓋整站範圍。

## 語言與使用目的

支援 `zh-TW`、`en`、`ja`、`ko`、`es`、`de`、`th`、`vi`。語言優先順序為網址 `?lang=xx` → 本機儲存選擇 → 瀏覽器語言 → 英文。中文語系對應繁體中文。

- 頁面與首次使用視窗都有語言選單。
- 語言切換更新文字、驗證訊息、日期／數字格式、安裝說明與頁面 metadata，並保留未送出的表單內容。
- 原生日期輸入器的選取面板仍由瀏覽器與作業系統決定顯示語言。
- 首次未設定用途時詢問使用者；已有用途者不重複詢問。可從小型下拉選單手動修改。
- 月經記錄：核對開始日、出血天數與週期變化。
- 避孕規劃：預估風險與避孕提醒。
- 備孕規劃：預估受孕時段與安排方向。
- 三種用途只調整文字；計算、日期、粉／綠／橙／紅四色分類保持一致。

字串放在 `locales/<語言>.js`。每種語言須有相同鍵值，`{n}`、`{date}` 等參數名稱必須一致。HTML 用 `data-i18n` 與 `data-i18n-aria`，動態內容用 `t(key, values)`，不可直接寫入特定語言文案。

## 本機資料與週期

沿用既有 `periodHistory`、`bbtData`、`cycleSettings`、`audienceMode`、`installBannerDismissed`；新增 `language`。更新程式不清除既有記錄。清除瀏覽器網站資料會移除記錄與偏好。

只填月經開始日，N 筆日期形成 N−1 個完整週期。新增、補登或刪除日期後會重算統計；舊資料手填的週期天數不再參與計算。週期設定只在成功送出後保存，歷史記錄只在主動帶入時填入設定。

## 體溫趨勢

分析只使用所屬週期、截至查詢日且不晚於今天的資料，不混用前一週期：

1. 比較升溫前連續 6 天的最高體溫 + 0.05°C。
2. 至少連續 3 個日曆日高於或等於參考線，且持續至查詢日，才顯示升溫趨勢。
3. 漏測、降溫、缺少查詢日資料或進入新週期，不沿用舊結果。
4. 未來日期只呈現日期預估。

這是未經臨床驗證的輔助趨勢規則，不診斷排卵日、不保證避孕或受孕。

## PWA 更新

八種語言與各自 manifest 全部預先快取，離線可切換語言。各 manifest 共用同一個 app ID；已安裝 App 的系統名稱更新方式依瀏覽器而定。

**每次發布修改都要更新 `sw.js` 的 `CACHE_NAME`**。新增必需檔案時同步加入 `PRECACHE_URLS`。此策略讓 HTML、腳本與語系來自同一版本；只刪除本 App 的舊快取，不清除 localStorage 或其他網站快取。外部參考連結需要網路。

## 測試

```sh
npm test
npm install
npx playwright install chromium
npm run test:browser
```

`npm test` 僅需 Node.js，不需先安裝套件。瀏覽器測試自行啟動暫時的本機伺服器，涵蓋八種語言 × 三種用途 × 四個頁面 × 三種寬度、首次設定、持久化、草稿保留、月經／體溫記錄及離線切換。所有測試使用隔離的瀏覽器資料。

## 說明來源

三種用途的建議與參考頁提供通用資訊，另有八語台灣地區說明。地區與語言獨立，例如台灣 IP 搭配越南文時，仍以越南文顯示台灣的婦產科名稱與諮詢資訊，不改變週期計算、紀錄或介面語言。

「設定與指南」頁的小型地區選單提供自動／台灣／通用，手動選擇儲存在此瀏覽器，離線仍有效。自動模式由 `js/region.js` 查詢同網域 `/cdn-cgi/trace`，僅讀取 IP 國家欄位 `loc`，不讀取資料中心位置 `colo`，不儲存或記錄完整回應、IP 或自動判斷結果。回應包含 IP，僅由瀏覽器暫時接收；請勿加入回應記錄或分析追蹤。不呼叫第三方定位服務，不傳送月經或體溫資料。VPN 等因素可能影響 IP 地區，使用者可手動修正。

**GitHub Pages 部署：** 若自訂網域已經由 Cloudflare 代理（DNS 橘雲），可使用其同網域 trace 端點，不需搬離 GitHub Pages。只有 Cloudflare DNS（灰雲）或直接使用 `github.io` 不提供此端點；此時、離線、逾時或回應格式不符，頁面明確顯示無法判斷並使用通用說明，可手動選台灣。此專案不會自行修改 DNS。自動查詢不進入 Service Worker 快取，手動選擇優先於尚未完成的請求。

- [Cloudflare 同網域端點說明](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/)
- [移民署：1990 外來人士在臺生活諮詢服務熱線](https://www.immigration.gov.tw/5385/7445/7910/204893/)（支援語言與服務時間以官方公告為準）

- [ACOG：生育意識與家庭計畫](https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning)
- [ACOG：體溫與排卵評估](https://www.acog.org/womens-health/faqs/evaluating-infertility)
- [WHO：緊急避孕](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception)
- [NHS：驗孕時機](https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/)

## 分享本次結果

日曆下方的「分享本次結果」提供預覽與兩種匯出方式：

- 圖片：本機 Canvas 產生 1080 × 1620 PNG（2:3）；上方 1080 × 1080 為完整週期日曆，可跨月、跨年，下方為用途與週期摘要。可下載或交由裝置分享選單傳送。
- 文字：純文字與 emoji，不含 Markdown，可複製後貼到 LINE，或使用裝置分享選單。

內容依目前語言與使用目的產生，採用已套用的本次結果，不採用尚未儲存的表單草稿，也不受目前月曆顯示月份影響。遇到已記錄的下一次月經開始日即截止。匯出不包含體溫明細或歷史紀錄，保留預估標示與用途提醒。資料不傳送至圖片服務；由使用者自行決定分享對象。離線可匯出；不支援 Web Share 或剪貼簿權限時，可下載圖片或手動選取文字複製。

## 字型與授權

標題引用 [Google Fonts 的 Huninn（粉圓）](https://fonts.google.com/specimen/Huninn)，由 justfont 提供的開源圓體，並非金萱那提。透過 Google Fonts 載入，使用 `display=swap`；無網路或字型服務不可用時回退至微軟正黑體等系統字型。字型請求不含使用者紀錄，Google 會接收一般字型連線資訊；外部字型不納入 App 的離線預快取。內文維持系統無襯線字型。

MIT License © 2026 Bruce Yang，詳見 LICENSE。

語言、使用目的、地區與資料儲存提示集中於「設定與指南」頁；手機由右下角齒輪進入，桌面由導覽列進入。原有協助資訊保留於設定下方，首次使用的目的提問仍保留。

設定與指南分為偏好設定及緊急措施與參考。緊急處理、驗孕摘要直接顯示；方法比較、日常避孕、LH／體溫／黏液判讀與伴侶規劃使用原生 details 展開，八語同步提供，來源連結隨內容附上。

指南依使用目的切換整組標題、重點卡片及 FAQ：避孕規劃提供緊急避孕、驗孕與方法比較；備孕規劃提供受孕安排、孕前準備、驗孕與就醫提醒；月經記錄提供通用的月經與婦科健康指南，優先呈現經痛、月經不規律、出血變化及就醫時機，操作說明放在 FAQ 後段。語言切換與離線還原也會套用目前目的，不變更計算結果。
