# 沒有晶片的一天：交接文件

接手修改前請先讀完這份。如果你用 Claude Code 或其他 AI 協助，第一句話請它「先讀 HANDOVER.md」。

---

## 1. 這是什麼

LIS 晶片系列課程開頭的 20 分鐘暖身活動。學生用平板在一天的四個場景（早上房間、上學路上、教室、晚上的家）裡，點掉「裡面有晶片」的東西。點對了那樣東西淡出變灰，下方說明「沒有了晶片，它沒辦法判斷／計算／控制什麼，所以發生什麼事」；點錯了說明它為什麼不需要晶片。最後的結算頁提問：「會壞掉的和不會壞掉的，差在哪裡？」

**教學目標**：讓學生把「有晶片的東西」的共同點，從「要插電」推進到「**會自己判斷、自己決定要做什麼**」，銜接後面的課。

| 用途 | 網址 |
|---|---|
| 學生（單人模式） | https://pxchen-89.github.io/nochip-day/ |
| 老師控制台（投影、班級競賽） | https://pxchen-89.github.io/nochip-day/teacher.html |
| 老師版單人模式（多一顆「顯示答案」） | https://pxchen-89.github.io/nochip-day/?teacher |

班級競賽流程：老師開控制台 → 投影 QR code → 學生掃碼輸入名字 → 老師按「開始」→ 即時排行榜 → 老師按「結束」→ 頒獎台。

---

## 2. 檔案

| 檔案 | 內容 |
|---|---|
| `index.html` | 遊戲本體。四個場景的圖（SVG）、場景資料 `SCENES`、遊戲邏輯、結算頁，全部在這一個檔案 |
| `mp-student.js` | 班級競賽的學生端：加入房間、等老師開始、回報分數、速度加分 |
| `teacher.html` | 老師控制台：開房間、QR code、等待區、排行榜、頒獎台 |
| `firebase-config.js` | Firebase 網頁設定（本來就公開在網頁上，不是密碼；安全靠資料庫規則） |
| `.nojekyll` | 讓 GitHub Pages 直接發布檔案，不要刪 |

**注意：推上 GitHub 的 main 分支就等於直接上線**，學生掃 QR code 看到的就是最新版。沒有測試環境。

---

## 3. 架構

- **網站**：GitHub Pages，repo `pxchen-89/nochip-day`，main 分支根目錄。推上去約 20 秒生效。
- **即時排行榜**：Firebase 專案 `nochip-day`（Spark 免費方案），Realtime Database 在新加坡（asia-southeast1），用匿名登入分辨學生。免費方案同時最多 100 個連線，一次一個班沒問題。
- **資料結構**：
  - `rooms/{4 位數代碼}/meta`：`owner`（開房老師）、`state`（`lobby` / `playing` / `ended`）、`created`、`startedAt`、`endedAt`
  - `rooms/{代碼}/players/{學生 uid}`：`name`、`score`、`found`、`wrong`、`t`（最後更新時間，同分先到先贏）
- **安全規則**（Firebase 主控台 → Realtime Database → 規則）：學生只能寫自己那一筆、只有開房的老師能改遊戲狀態和踢人；分數上限 10000、晶片數上限 60、點錯上限 200。
  - 規則頁直連：https://console.firebase.google.com/project/nochip-day/database/nochip-day-default-rtdb/rules
  - **如果改計分會超過這些上限，要先改規則、再推程式**，不然學生的分數寫不進資料庫，排行榜會卡住。

---

## 4. 計分

| 情況 | 分數 | 程式位置 |
|---|---|---|
| 找到晶片 | +100 | `index.html` 的 `PTS_RIGHT` |
| 越快找到再加 | 最多 +50，老師按開始起 12 分鐘內線性降到 0 | `mp-student.js` 的 `MAX_BONUS`、`BONUS_WINDOW` |
| 點到沒晶片的 | −30 | `index.html` 的 `PTS_WRONG` |
| 最低 | 0 分 | |

設計原則（原作者明確要求）：**答對比快更重要**，所以速度加分最多只有答對分數的一半。

點錯扣分曾經設為 −100（讓亂點的期望值變成負的），2026-10-12 原作者覺得扣太多，改回 −30。目前的取捨：扣 30 時亂點的期望值是正的，學生用猜的仍可能賺分；如果課堂上亂點的人太多，可以改成 −50 或 −60 當折衷。

改計分時可以這樣驗算：某個場景「有晶片的數量 ÷ 全部可點的數量」＝ 亂點命中率 p，亂點一下的期望值 ≈ p ×（100 + 平均速度加分）− (1 − p) × 扣分。要讓這個值小於 0，扣分大約要 100。不論扣多少，**每個場景的命中率都要維持在一半以下**。

老師控制台的晶片總數寫在 `teacher.html` 的 `MAX_FOUND`（目前 26），增減有晶片的物品時要一起改。右側欄和學生等待畫面的規則文字也要一起改。

---

## 5. 教學設計原則（請不要違反）

1. **結算頁不要提晶片的大小**。晶片大小是後面課程的內容，提了會破梗。
2. **晶片的後果句型**統一為「沒有了晶片，○○沒辦法判斷／計算／控制＿＿，所以＿＿」。中間要寫出晶片原本在做什麼，學生點完一輪會一直看到「判斷、計算、控制」。
3. **沒晶片的說明**要讓學生歸納得出規則，例如「它不用判斷」「只要有人動它，它就動」。
4. **知識要正確，而且要查證**。每一樣「有沒有晶片」都要有可靠來源（期刊、大學教材、原廠資料優先，新聞次之，不用維基百科），有爭議的不要放。例子：
   - 一般電鍋寫「電子鍋」（有晶片），大同電鍋是感溫磁鐵（沒有晶片）
   - 一般快煮壺是蒸氣加雙金屬片（沒有晶片），可設定溫度的才有
   - 電風扇標成「遙控」才有晶片；吊扇靠牆上的旋鈕調速（沒有）
5. **陷阱物品**是刻意設計的：「看起來有、其實沒有」（吹風機、延長線、變壓器、電動削鉛筆機、大同電鍋、快煮壺、吊扇、廣播喇叭）與「看起來沒有、其實有」（電子體重計、YouBike 2.0、無線麥克風、電視遙控器）。說明文字**不要提示其他物品的答案**。
6. 物品要是**臺灣學生真的會看到的樣子**（例如直立式洗衣機、鐵窗、上白下綠的教室牆面、智慧型公車站牌）。

---

## 6. 畫圖規則

- **真實比例**：畫布固定 1600 × 900 單位。每個場景有 `upm`（1 公尺等於幾單位），所有東西用真實尺寸乘上去畫，右下角有「1 公尺」比例尺可以驗。街景、教室、家裡有前景層，離觀者近的那層 `upm` 比較大（近大遠小）。
  - 房間 260；街景 對街 150／馬路 170／人行道 210；教室 200（前景課桌 230）；家裡 228（前景沙發 250）
- **好認的畫法**：從斜上方看、看得到正面側面頂面最好認（Palmer, Rosch & Chase, 1981 的典型視角研究），再補上每樣東西的招牌特徵（例如冷氣的出風波浪、投影機的鏡頭和光束、印表機吐出的紙）。參考圖示可以到 Iconify 查。
- **每樣可點的東西是一個 `<g id="g-名稱">` 群組**，會自動加上深色輪廓（`OUTLINE` 濾鏡）；被點掉時整組變淡變灰。
  - 群組**不能互相包含**，改完一定要跑第 8 節的結構檢查。
  - **不要用文字搜尋「`</g>`」來找群組結尾**，內層群組也有同樣的字串，會切錯（曾經因此造成點一樣東西整片一起變淡的 bug）。
- **顏色**：物品不要跟背景同色系。可點的東西**不要畫在半透明圖層（例如玻璃）後面**，不然還沒點就看起來像已經被點掉。
- **小東西**用 emoji 圖示，大小由真實尺寸 `m`（公尺）換算。斜著畫的 emoji（掃把、尺、鉛筆、筷子、麥克風）真實長度是方框對角線，`m` 要除以 1.41。點擊範圍最少 44 像素，平板才點得到。

---

## 7. 新增一樣物品

1. 在對應場景的 SVG（`ART_ROOM` / `ART_STREET` / `ART_CLASS` / `ART_HOME`）裡，用真實尺寸畫一個 `<g id="g-新名稱">…</g>`。前後順序決定誰蓋在誰上面。
2. 在 `SCENES` 對應場景的 `items` 裡加一筆：

   ```js
   {e:"🫖", n:"快煮壺", chip:0, zone:[176,398,70,72], gid:"g-kettle", say:"說明文字"}
   ```

   - `zone` 是點擊範圍 `[x, y, 寬, 高]`（畫布座標），`gid` 對到 SVG 群組
   - 用 emoji 畫的小東西改成 `at:[中心x, 中心y], m:真實公尺`，不用 `zone` 和 `gid`
   - `chip:1` 有晶片、`chip:0` 沒有
3. 有晶片的數量變了，記得改 `teacher.html` 的 `MAX_FOUND`。
4. 檢查該場景的亂點命中率還是低於一半（第 4 節）。
5. 跑第 8 節的檢查。

---

## 8. 測試

**本機開網站**（在這個資料夾）：

```bash
python -m http.server 8775 --bind 127.0.0.1
```

- 單人：http://127.0.0.1:8775/index.html
- 班級競賽要兩個不同網址才會是兩個不同的人：老師開 `http://localhost:8775/teacher.html`，學生開 `http://127.0.0.1:8775/index.html?room=房間代碼`
- 本機測試會連到**正式的** Firebase，測完請在老師控制台按「開新的一局」或清掉測試房間

**結構和點擊檢查**：打開 index.html，按 F12 開主控台，貼上下面這段。回傳 `[]` 或只有地毯（上面放了衣服和鉛筆，邊緣點得到，屬正常）才算通過。

```js
localStorage.clear(); state = SCENES.map(s => s.items.map(() => 0)); bonus = SCENES.map(s => s.items.map(() => 0));
const report = [];
SCENES.forEach(S => {
  const doc = new DOMParser().parseFromString(S.art, "image/svg+xml");
  if (doc.querySelector("parsererror")) report.push(S.place + "：SVG 標籤不成對");
  [...new Set(S.items.map(i => i.gid).filter(Boolean))].forEach(g => {
    const el = doc.getElementById(g);
    if (!el) report.push(S.place + "：找不到 " + g);
    else if (el.querySelector('[id^="g-"]') || el.parentElement.closest('[id^="g-"]')) report.push(S.place + "：" + g + " 跟別的群組包在一起");
  });
});
for (let i = 0; i < SCENES.length; i++) {
  cur = i; render();
  const st = document.querySelector(".stage"); st.scrollIntoView({block: "center"});
  const sr = st.getBoundingClientRect();
  document.querySelectorAll(".stage .hot").forEach(b => {
    const r = (b.querySelector(".e") || b).getBoundingClientRect();
    let own = 0;
    for (let a = 1; a < 10; a++) for (let c = 1; c < 10; c++) {
      const h = document.elementFromPoint(r.left + r.width * a / 10, r.top + r.height * c / 10);
      if (h && h.closest(".hot") === b) own++;
    }
    const out = r.left < sr.left - 1 || r.right > sr.right + 1 || r.top < sr.top - 1 || r.bottom > sr.bottom + 1;
    if (own / 81 < .4 || out) report.push(SCENES[i].place + "／" + b.getAttribute("aria-label") + "：點得到 " + Math.round(own / 81 * 100) + "%" + (out ? "，超出畫面" : ""));
  });
}
cur = 0; render(); localStorage.clear();
console.log(SCENES.map(S => S.place + "：" + S.items.filter(i => i.chip).length + "/" + S.items.length));
report
```

測點擊前一定要先清掉進度（上面第一行已經做了），不然之前點掉的東西會被當成點不到。

**平板**：老師控制台要在投影解析度看（1366×768、1920×1080），學生端要在 iPad 橫放看（1024×768）。

---

## 9. 發布流程

1. 開工前先 `git pull`，拿到別人改過的最新版
2. 修改、在本機測試
3. `git add` 改過的檔案（**不要用 `git add -A`**，資料夾裡的 QR code 圖片不需要發布）
4. `git commit`，說明改了什麼
5. `git push`，約 20 秒後線上更新
6. **不要在別人上課時推**，學生的平板會在重新整理時換成新版

兩個人同時改容易衝突，開工前在群組說一聲。

---

## 10. 版本紀錄

完整紀錄請看 `git log`。重要里程碑：

- 2026-10-05　上線（四個場景、真實比例、學生版藏答案）
- 2026-10-06　班級競賽模式（Firebase、老師控制台、排行榜、頒獎台）；物品加輪廓、牆面改亮；依典型視角重畫不好認的物品
- 2026-10-08　加入陷阱物品（76 樣、26 樣有晶片）；計分加入時間，點錯 −100
- 2026-10-12　點錯改回 −30；新增這份交接文件
