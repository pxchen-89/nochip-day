// 班級競賽模式（學生端）：網址帶 ?room=1234 時才會啟動。
// 學生輸入名字加入房間 → 等老師按開始 → 每點一下就把分數送到老師的排行榜。
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const game = window.mpGame;
const ROOM = game && game.room;

if (ROOM && ROOM.length === 4) start();

function start() {
  document.body.classList.add("mp");
  window.mpLocked = true;
  injectStyle();
  ["#btnReset", "#btnJoin", "#btnReplay"].forEach(q => { const el = document.querySelector(q); if (el) el.hidden = true; });

  const status = document.querySelector(".status");
  const chip = document.createElement("span");
  chip.className = "mp-score";
  chip.innerHTML = '我的分數 <b id="mpScore">0</b>';
  status.insertBefore(chip, status.querySelector(".bar"));

  const ov = document.createElement("div");
  ov.id = "mpOverlay";
  ov.innerHTML = '<div class="mp-card" id="mpCard"></div>';
  document.body.appendChild(ov);

  if (!firebaseConfig || !firebaseConfig.apiKey) {
    card(`<h2>班級遊戲還沒設定好</h2><p>請告訴老師。</p>`);
    return;
  }
  card(`<h2>連線中…</h2><p>房間 ${ROOM}</p>`);
  connect().catch(err => {
    console.error(err);
    card(`<h2>連不上班級遊戲</h2><p>請確認平板有連上網路，再重新整理一次。</p>
      <button type="button" id="mpRetry">重新整理</button>`);
    document.getElementById("mpRetry").onclick = () => location.reload();
  });
}

async function connect() {
  const [{ initializeApp }, A, D] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-database.js"),
  ]);
  const app = initializeApp(firebaseConfig);
  const { user } = await A.signInAnonymously(A.getAuth(app));
  const db = D.getDatabase(app);
  const metaRef = D.ref(db, `rooms/${ROOM}/meta`);
  const myRef = D.ref(db, `rooms/${ROOM}/players/${user.uid}`);

  const meta = (await D.get(metaRef)).val();
  if (!meta) {
    card(`<h2>找不到房間 ${ROOM}</h2><p>請重新掃描投影幕上的 QR code。</p>`);
    return;
  }

  // 同一台平板之前玩過同代碼的另一局：把舊進度清掉
  const stampKey = "nochip-room-created-" + ROOM;
  try {
    if (localStorage.getItem(stampKey) !== String(meta.created)) {
      localStorage.setItem(stampKey, String(meta.created));
      game.reset();
    }
  } catch (e) {}

  let joined = false, metaState = meta.state, myName = "";

  const push = () => {
    if (!joined) return;
    const s = game.scoreInfo();
    document.getElementById("mpScore").textContent = s.score;
    D.update(myRef, { ...s, t: D.serverTimestamp() }).catch(console.error);
  };

  const showJoin = (note = "") => {
    let saved = "";
    try { saved = localStorage.getItem("nochip-name") || ""; } catch (e) {}
    card(`<h2>加入班級遊戲</h2>
      <p class="mp-room">房間 <b>${ROOM}</b></p>
      ${note ? `<p class="mp-note">${note}</p>` : ""}
      <label for="mpName">你的名字（最多 8 個字）</label>
      <input id="mpName" maxlength="8" autocomplete="off" enterkeyhint="go">
      <p class="mp-err" id="mpErr"></p>
      <button type="button" id="mpGo">加入</button>`);
    const input = document.getElementById("mpName");
    input.value = saved;
    const go = async () => {
      const name = input.value.replace(/\s+/g, " ").trim().slice(0, 8);
      if (!name) { document.getElementById("mpErr").textContent = "請先輸入名字"; return; }
      document.getElementById("mpGo").disabled = true;
      try { localStorage.setItem("nochip-name", name); } catch (e) {}
      try {
        await D.set(myRef, { name, ...game.scoreInfo(), t: D.serverTimestamp() });
        myName = name; joined = true;
        applyState();
      } catch (e) {
        console.error(e);
        document.getElementById("mpErr").textContent = "加入失敗，請再按一次";
        document.getElementById("mpGo").disabled = false;
      }
    };
    document.getElementById("mpGo").onclick = go;
    input.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  };

  const applyState = () => {
    if (!joined) return;
    const s = game.scoreInfo();
    document.getElementById("mpScore").textContent = s.score;
    if (metaState === "playing") {
      window.mpLocked = false;
      hideCard();
    } else if (metaState === "ended") {
      window.mpLocked = true;
      card(`<h2>時間到！</h2>
        <p class="mp-big">${s.score}<small> 分</small></p>
        <p>你找到 ${s.found} 個晶片</p>
        <p class="mp-note">抬頭看投影幕上的排名</p>`);
    } else {
      window.mpLocked = true;
      card(`<h2>你已經加入了！</h2>
        <p class="mp-name">${escapeHtml(myName)}</p>
        <p>等老師按「開始」就可以玩</p>
        <div class="mp-dots"><i></i><i></i><i></i></div>`);
    }
  };

  // 之前加入過（重新整理、平板睡著）：直接接回去
  const mine = (await D.get(myRef)).val();
  if (mine) { joined = true; myName = mine.name; push(); }
  else showJoin();

  D.onValue(metaRef, snap => {
    const m = snap.val();
    if (!m) {
      window.mpLocked = true;
      card(`<h2>這一局已經結束</h2><p>老師開了新的一局，請重新掃描投影幕上的 QR code。</p>`);
      joined = false;
      return;
    }
    metaState = m.state;
    applyState();
  });

  // 被老師移出房間
  D.onValue(myRef, snap => {
    if (joined && !snap.exists()) {
      joined = false;
      window.mpLocked = true;
      showJoin("你被移出房間了，請重新輸入名字");
    }
  });

  window.mpOnTap = it => {
    push();
    const msg = document.getElementById("msg");
    const b = document.createElement("b");
    b.className = "mp-delta " + (it.chip ? "plus" : "minus");
    b.textContent = it.chip ? "+100" : "−30";
    msg.appendChild(b);
  };

  window.mpOnFinal = () => {
    const s = game.scoreInfo();
    const inner = document.querySelector("#final .inner");
    let box = document.getElementById("mpFinal");
    if (!box) {
      box = document.createElement("div");
      box.id = "mpFinal";
      inner.insertBefore(box, inner.firstChild);
    }
    box.innerHTML = `你這一局拿到 <b>${s.score}</b> 分，抬頭看投影幕上的排名！`;
  };
}

function card(html) {
  document.getElementById("mpCard").innerHTML = html;
  document.getElementById("mpOverlay").hidden = false;
}
function hideCard() {
  document.getElementById("mpOverlay").hidden = true;
}
function escapeHtml(t) {
  return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function injectStyle() {
  const css = document.createElement("style");
  css.textContent = `
  .mp-score{background:rgba(0,0,0,.28);border:1px solid var(--accent);border-radius:999px;padding:4px 14px;font-size:clamp(13px,1.3vw,16px);white-space:nowrap}
  .mp-score b{color:var(--accent);font-size:1.25em;font-variant-numeric:tabular-nums}
  #mpOverlay[hidden]{display:none}
  #mpOverlay{position:fixed;inset:0;z-index:80;background:rgba(14,10,24,.82);display:grid;place-items:center;padding:16px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
  .mp-card{width:min(440px,100%);background:#241a33;border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:30px 26px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.5)}
  .mp-card h2{margin:0 0 10px;font-size:clamp(22px,3vw,30px)}
  .mp-card p{margin:8px 0;color:rgba(246,241,234,.75);font-size:16px;line-height:1.6}
  .mp-card .mp-room b{color:#ffb35c;font-size:1.4em;letter-spacing:.12em}
  .mp-card .mp-note{color:#ffd166}
  .mp-card .mp-err{color:#ff8f80;min-height:1.4em;margin:6px 0 0}
  .mp-card .mp-name{font-size:28px;font-weight:900;color:#fff}
  .mp-card .mp-big{font-size:64px;font-weight:900;color:#ffb35c;margin:6px 0;font-variant-numeric:tabular-nums}
  .mp-card .mp-big small{font-size:22px;color:rgba(246,241,234,.7)}
  .mp-card label{display:block;margin:18px 0 8px;font-size:15px;color:rgba(246,241,234,.75)}
  .mp-card input{width:100%;font:inherit;font-size:24px;text-align:center;padding:12px;border-radius:14px;border:2px solid rgba(255,255,255,.2);background:#160f22;color:#fff}
  .mp-card input:focus{outline:none;border-color:#ffb35c}
  .mp-card button{margin-top:14px;width:100%;min-height:52px;border:0;border-radius:999px;background:#ffb35c;color:#1c1526;font:inherit;font-size:20px;font-weight:900;cursor:pointer}
  .mp-card button:disabled{opacity:.5}
  .mp-dots{display:flex;gap:8px;justify-content:center;margin-top:16px}
  .mp-dots i{width:10px;height:10px;border-radius:50%;background:#ffb35c;animation:mpdot 1.2s infinite}
  .mp-dots i:nth-child(2){animation-delay:.2s}.mp-dots i:nth-child(3){animation-delay:.4s}
  @keyframes mpdot{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
  .mp-delta{flex:none;margin-left:6px;padding:4px 12px;border-radius:999px;font-size:.95em;animation:mpdelta .5s}
  .mp-delta.plus{background:#ff9c6e;color:#1c1526}
  .mp-delta.minus{background:rgba(255,255,255,.12);color:rgba(246,241,234,.8)}
  @keyframes mpdelta{0%{transform:scale(1.6);opacity:0}100%{transform:none;opacity:1}}
  #mpFinal{margin:0 auto 22px;padding:16px 20px;border-radius:18px;background:rgba(255,179,92,.14);border:1px solid #ffb35c;font-size:clamp(16px,1.8vw,22px);font-weight:700}
  #mpFinal b{color:#ffb35c;font-size:1.4em}
  `;
  document.head.appendChild(css);
}
