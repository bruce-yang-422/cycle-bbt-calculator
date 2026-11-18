<!-- Translation of README.md, which is the primary version. Keep both in sync: update the other whenever either changes (npm test checks that their structure matches). -->

# Cycle & BBT Calculator · 週期與體溫計算器

[繁體中文](README.md) | **English**

[![Last Commit](https://img.shields.io/github/last-commit/bruce-yang-422/cycle-bbt-calculator)](https://github.com/bruce-yang-422/cycle-bbt-calculator/commits/main)
[![Deploy Status](https://img.shields.io/github/deployments/bruce-yang-422/cycle-bbt-calculator/github-pages?label=pages)](https://github.com/bruce-yang-422/cycle-bbt-calculator/deployments)
[![License](https://img.shields.io/github/license/bruce-yang-422/cycle-bbt-calculator)](LICENSE)

A PWA that estimates menstrual cycles with the calendar method and basal body temperature (BBT). Client-only, with no backend or accounts: data lives only in the browser's `localStorage`, and the app works offline in eight languages.

**Live site:** <https://cycle-bbt.stack-base.com/>

## Overview

- Cycle prediction (regular / irregular) with a calendar of period, fertile window and ovulation
- BBT logging, cover-line detection and a trend chart
- Period start history and cycle statistics
- Unprotected-sex log with emergency contraception time limits and a test date
- Three purposes (contraception, period tracking, conception) share one calculation and only switch copy
- CSV backup export and import
- Light / dark / system themes, eight languages, PNG/text sharing, installable offline PWA

## Tech stack

| Category | Technology |
| --- | --- |
| Framework | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict) |
| Build | [Vite](https://vite.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox) (`injectManifest`) |
| Styling | Plain CSS with design tokens, no UI library |
| Testing | Node.js test runner + [tsx](https://tsx.is/), [Playwright](https://playwright.dev/) |

## Getting started

Requires Node.js `^20.19.0` or `>=22.12.0`.

```sh
git clone https://github.com/bruce-yang-422/cycle-bbt-calculator.git
cd cycle-bbt-calculator
npm ci
npm run dev
```

The service worker is only enabled in production builds; to test PWA install or offline caching, use `npm run build && npm run preview`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run `vue-tsc` type checking |
| `npm test` | Unit tests |
| `npm run test:browser` | Build, then run Playwright browser tests |

## Project structure

```text
src/
├── main.ts / App.vue      Entry point, navigation, first-run flow
├── components/            Pages (*Page.vue), dialogs (*Dialog.vue) and shared components
├── cycle.ts               Cycle and BBT algorithms (pure functions)
├── unprotected.ts         EC time limits and test date (pure functions)
├── useCycle.ts            Reactive state and all write operations
├── storage.ts             localStorage read/write, validation and reset
├── backup.ts              CSV backup export, parsing and restore
├── theme.ts / region.ts   Appearance and region preferences
├── i18n.ts / locales/     Translations and Intl formatting
├── chart.ts / share.ts    Canvas trend chart and share image
└── sw.ts                  Service worker
css/app.css                Design tokens and site styles
public/                    Icons and per-language PWA manifests
locales/tests/             Unit and browser tests
```

## Architecture

- **Layers**: algorithms live in side-effect-free modules (`cycle.ts`, `unprotected.ts`); state and persistence for cycles, history, temperatures and unprotected-sex records are centralized in `useCycle()`; preferences such as language, appearance, region and purpose are handled by their own modules (`i18n.ts`, `theme.ts`, `region.ts`, `App.vue`); components handle rendering and events only.
- **Action results**: write operations return an `ActionResult` (`{ ok, key, field? }`) where `key` is a translation key and `field` is the id of the input to focus; the UI decides how to present it.
- **No router**: the four pages switch on `activePage`; `#about` and `#privacy` open their dialogs directly.

### Cycle prediction

`calculateDays()` ([`cycle.ts`](src/cycle.ts)) anchors on the first day of the last period:

- Regular cycle: ovulation day = cycle length − 14; the fertile window runs from 5 days before to 2 days after ovulation.
- Irregular cycle: the fertile window runs from day (shortest − 18) to day (longest − 11), with no ovulation day.
- A recorded next period start ends the prediction.

`startPeriod()` ([`useCycle.ts`](src/useCycle.ts)) writes history and moves the anchor in one step, returning `undo`; `updateHistory()` also moves the prediction when the edited date is the anchor.

### BBT analysis

`analyzeBBT()` ([`cycle.ts`](src/cycle.ts)):

1. Cover line = highest of the 6 consecutive days before the rise + 0.05°C.
2. A rise is confirmed only after 3 or more consecutive calendar days ≥ the cover line, continuing to the query date.
3. A missed reading, a drop, missing data for the query date, or a new cycle resets the result.
4. Only readings from the same cycle and no later than today are analyzed.

These rules indicate a trend only and are not clinically validated.

### Emergency contraception limits

Constants are defined in [`unprotected.ts`](src/unprotected.ts):

| Item | Limit | Source |
| --- | --- | --- |
| Levonorgestrel (LNG) | 3 days (72 hours) | [WHO](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception) |
| Ulipristal (UPA) | 5 days (120 hours) | [WHO](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception) |
| Copper IUD | 5 days | [WHO](https://www.who.int/news-room/fact-sheets/detail/emergency-contraception) |
| Test date | Day 21 after | [NHS](https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/) |

### Styling and themes

- Every colour is a CSS custom property in `css/app.css`; `chart.ts` reads the same tokens at runtime.
- `<html data-theme="light|dark">` records an explicit user choice; when unset, `prefers-color-scheme` applies.
- `<html data-mode="contraception">` switches lower-risk days to a neutral colour; other purposes keep green.
- Share images always use the light palette.

## Data storage

All state lives in `localStorage`; reads are validated and invalid data is ignored:

| Key | Contents |
| --- | --- |
| `cycleSettings` | Applied cycle settings |
| `periodHistory` | Period start dates |
| `bbtData` | BBT readings |
| `unprotectedLog` | Dates of unprotected sex |
| `audienceMode` | `contraception` / `tracking` / `conception` |
| `language` | Interface language |
| `regionPreference` | `auto` / `TW` / `global` |
| `theme` | `light` / `dark` (unset follows the system) |
| `installBannerDismissed` | Install prompt dismissed |

When adding a key, also add it to `appStorageKeys` in `storage.ts` so `resetAllData()` clears it.

### Backup format

[`backup.ts`](src/backup.ts) exports UTF-8 CSV (with BOM), one `record,key,value` row per item. Column names and `record` types are fixed English identifiers and never change with the interface language:

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

- File names follow `<lang>_<name>_<date>.csv`, starting with the language code and with the name translated to the interface language, e.g. `en_cycle-temperature-backup_2026-11-18.csv` or `zh-TW_週期與體溫備份_2026-11-18.csv`.
- `parseBackup()` validates the whole file first and rejects it if any row is invalid, so nothing is partially overwritten; unknown `record` types are skipped for forward compatibility.
- Restoring replaces all records; preferences present in the file override, others are kept. `installBannerDismissed` is device-specific and not exported.
- Bump `backupVersion` when the format changes; files with a newer version are rejected.

The site makes only two kinds of external request: Google Fonts, and the same-domain Cloudflare `/cdn-cgi/trace` when region is set to automatic (only `loc` is read). The full privacy policy lives in [`InfoDialogs.vue`](src/components/InfoDialogs.vue) and the locale files; when its substance changes, update `policyDate` in that file.

## Internationalization

- Language priority: `?lang=` → `localStorage` → browser language → English.
- Strings live in `src/locales/<lang>.ts` and components use `t(key, values)`; dates and numbers are formatted with `Intl`.
- Unit tests check that all eight languages have identical keys and the same placeholders such as `{n}`, and that every key referenced in source exists.
- To add a language, add `src/locales/<lang>.ts` and `public/locales/manifest.<lang>.json`, and register it in `supportedLanguages` in `i18n.ts`.

## Deployment

The production site is published by GitHub Pages from the root of the `gh-pages` branch (`.nojekyll` must be kept):

```sh
npm run build
git fetch origin gh-pages
git worktree add ../gh-pages origin/gh-pages --detach
cd ../gh-pages
git ls-files | grep -v '^\.nojekyll$' | xargs git rm -q
cp -r ../cycle-bbt-calculator/dist/. .
git add -A
git commit -m "deploy: 發佈網站 / publish website"
git push origin HEAD:gh-pages
cd -
git worktree remove ../gh-pages
```

A manually triggered [GitHub Actions workflow](.github/workflows/pages.yml) is also available if the Pages source is switched to Actions.

- The version comes from `package.json` and the build date is injected at build time (`__APP_VERSION__`, `__BUILD_DATE__`).
- The brand mark is defined by [`logo-cycle.svg`](public/images/logo-cycle.svg); PWA icons are re-rendered from it at each size, and maskable versions keep an 80% safe zone.

## Testing

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run test:browser
```

| Test | Coverage |
| --- | --- |
| [`bbt.test.cjs`](locales/tests/bbt.test.cjs) | BBT algorithm |
| [`locales.test.cjs`](locales/tests/locales.test.cjs) | Translation keys and placeholders, HTML entries, manifest icons |
| [`storage.test.cjs`](locales/tests/storage.test.cjs) | Clear all data & reset |
| [`backup.test.cjs`](locales/tests/backup.test.cjs) | Backup round trip, spreadsheet-edit tolerance, invalid-file rejection, file names |
| [`readme.test.cjs`](locales/tests/readme.test.cjs) | Structural sync between the Chinese and English READMEs |
| [`browser.cjs`](locales/tests/browser.cjs) | End-to-end tests against `dist/`: 8 languages × 3 purposes × 4 pages × 3 widths, plus user flows and offline |

Browser tests use a fixed clock (`2026-01-31`) and isolated browser data.

## Documentation sync

This README is a translation of the [Traditional Chinese README](README.md), which is the primary version; if they differ, the Traditional Chinese version prevails. Update the other whenever either changes; `npm test` checks that their sections, tables, commands and links match.

## Disclaimer

This tool only provides records and date estimates. It is not a medical device and does not replace contraception or medical advice.

## License

[MIT License](LICENSE) © 2026 Bruce Yang
