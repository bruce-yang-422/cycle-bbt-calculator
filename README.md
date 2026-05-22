# 週期體溫避孕計算器

> 結合「日曆計算法」與「基礎體溫（BBT）」的雙重確認，協助記錄週期、觀察排卵、辨識安全期與受孕期。

🌐 **線上版：[cycle-bbt.stack-base.com](https://cycle-bbt.stack-base.com)**

![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)
![Static HTML](https://img.shields.io/badge/Frontend-Pure%20HTML%2FJS-lightpink)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20本機運算-green)

---

## 功能

| 功能 | 說明 |
| --- | --- |
| 📅 預測日曆 | 以月曆視圖標示月經期、受孕期、排卵日、安全期 |
| 🌡️ 基礎體溫（BBT） | 記錄每日晨溫、Cover-Line 演算法自動偵測排卵轉折點、折線圖視覺化 |
| 📋 週期記錄 | 累積歷史經期，自動統計平均週期、判斷規律／不規律 |
| 🚨 緊急措施 | 緊急避孕藥說明、懷孕自測時機、長期避孕選項參考 |
| 🔒 今日雙重安全鎖 | 結合公式判斷 ＋ BBT 連續高溫確認，給出紅／黃／綠燈建議 |

---

## 技術規格

- **純前端靜態網頁**：單一 `index.html`，零依賴、零框架、零後端
- **本機運算**：所有資料存於 `localStorage`，不上傳任何伺服器
- **隱私安全**：無 Cookie、無追蹤、無外部請求
- **響應式設計**：手機優先（底部 Tab 導航），桌面版雙欄布局
- **BBT 折線圖**：純 Canvas 繪製，不依賴任何圖表庫
- **SEO**：Open Graph、Twitter Card、JSON-LD Structured Data、sitemap.xml

---

## 使用方式

### 線上版

直接開啟 **[cycle-bbt.stack-base.com](https://cycle-bbt.stack-base.com)** 即可使用，無需安裝。

### 本機開啟

```bash
# 直接開啟 index.html，或用本機 HTTP server
npx serve .
# 或
python -m http.server 8080
```

### 自行部署

任何靜態網站託管服務均可直接部署：

- **GitHub Pages**：推送至 `main` 分支，在 Settings → Pages 啟用
- **Cloudflare Pages**：連接 GitHub repo 即可自動部署
- **Netlify / Vercel**：拖曳資料夾上傳，或連接 repo

---

## 專案結構

```text
stm-cycle-calculator/
├── index.html      # 主應用程式（含所有 CSS / JS）
├── 404.html        # 404 錯誤頁
├── robots.txt      # 搜尋引擎爬蟲設定
├── sitemap.xml     # 網站地圖
├── images/
│   ├── favicon.ico
│   ├── logo.png
│   └── og-cover.png   # Open Graph 分享封面（1200×630px）
├── LICENSE
├── .gitignore
└── README.md
```

---

## BBT 演算法說明

採用 **Cover-Line Method（分界線法）**：

1. 取最近記錄中體溫最低的 6 筆，找出其中最高值
2. Cover Line = 最低 6 筆中的最高值 + 0.05°C
3. 找出第一段「連續 3 天以上體溫均 ≥ Cover Line」的起始日
4. 起始日前一天視為排卵日（體溫最低點後的升溫轉折）
5. 連續高溫達 3 天 → 確認排卵完成，進入安全期

---

## 免責聲明

> ⚠️ **本工具不構成醫療建議。**
>
> 週期體溫法正確使用的失敗率約 0.4–2%，典型使用失敗率仍達 1–3%。壓力、熬夜、生病、時差等均可能使排卵日偏移。若完全不想懷孕，**強烈建議搭配口服避孕藥、保險套或 IUD**。任何避孕或醫療決定，請諮詢持照婦產科醫師或藥師。

---

## 授權

MIT License © 2026 Bruce Yang

詳見 [LICENSE](LICENSE)。
