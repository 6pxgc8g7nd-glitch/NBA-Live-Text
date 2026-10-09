# NBA Live Text

個人用的 NBA 即時比分與文字轉播網頁 App（PWA），繁體中文介面。
目前與 MLB-Live-Text 完全獨立，之後再評估如何整合。

## 功能

- 依日期瀏覽賽程與比分（進行中、未開打、已結束）
- 比賽頁：各節比分、逐球文字轉播（可只看得分）、球員數據
- 進行中的比賽自動更新（比賽頁 5 秒、賽程頁 10 秒）
- PWA：可加入主畫面、離線載入外殼（比分資料仍需連網）

## 技術

- 純靜態網頁（HTML、CSS、原生 JavaScript），沒有建置步驟、沒有後端
- 資料來自 ESPN 公開接口（非官方、無穩定性保證）；NBA 官方 cdn.nba.com 會擋一般請求
- 比分資料不快取；外殼網路優先、離線時用快取

## 本機開發

```bash
python3 -m http.server 8765
```

開啟 http://localhost:8765/ 。PWA 安裝需要 HTTPS 或 localhost。

## 檔案

- `index.html`：全部的介面與邏輯
- `sw.js`：Service Worker
- `manifest.webmanifest`、`icons/`：PWA 設定與圖示

非官方專案，與 NBA 及各球隊無關聯。
