const FRAMES = [
  ["", "Çerçevesiz"], ["pastel", "Pastel"], ["rainbow", "Gökkuşağı"], ["hearts", "Kalpler"], ["flowers", "Çiçek tacı"],
  ["stars", "Yıldızlar"], ["moon", "Ay ve yıldız"], ["bow", "Fiyonk"], ["crown", "Taç"], ["cat", "Kedi kulakları"],
  ["bunny", "Tavşan kulakları"], ["bear", "Ayıcık"], ["ghost", "Hayalet dostu"]
];
const frameCls = f => f && FRAMES.some(x => x[0] === f) ? " frm fr-" + f : "";

const PET_LEVELS = [0, 60, 150, 300, 500, 800, 1200, 1700, 2300, 3000];
const PET_ITEMS = [
  ["", "Sade", 1], ["bow", "Fiyonk", 2], ["flower", "Çiçek tacı", 3], ["glasses", "Kalp gözlük", 4], ["cat", "Kedi kulakları", 5],
  ["scarf", "Atkı", 6], ["crown", "Taç", 7], ["wings", "Melek kanatları", 8], ["halo", "Hale", 9], ["rainbow", "Gökkuşağı", 10]
];
const PET_TASKS = [
  ["olumlama", "Günün olumlamasını oku", 10, 10],
  ["dua", "Dua ya da sure oku", 10, 30],
  ["gunluk", "Günlüğüne yaz", 20, 20],
  ["gorev", "Planından bir iş bitir", 5, 20],
  ["aliskanlik", "Alışkanlığını işaretle", 5, 20],
  ["sihir", "Sihirli Kutu'yu aç", 10, 10],
  ["ani", "Bir anı ekle", 15, 15],
  ["mesaj", "Birine mesaj yaz", 2, 10],
  ["besle", "Hayaletini besle", 5, 15],
  ["sev", "Hayaletini sev", 2, 6],
  ["kalp", "Arkadaşlarından kalp al", 5, 50]
];
let petState = null;
let petSaveTimer = null;
let petRenderTimer = null;

const petLevel = xp => { let l = 1; PET_LEVELS.forEach((t, i) => { if (xp >= t) l = i + 1; }); return l; };
function myPet() {
  if (!petState) petState = { name: "Neri", xp: 0, wear: "", lastActive: todayKey, day: { date: todayKey, got: {} }, fedAt: 0, pettedAt: 0, claimed: [] };
  if (!petState.day || petState.day.date !== todayKey) petState.day = { date: todayKey, got: {} };
  return petState;
}
function savePet() {
  clearTimeout(petSaveTimer);
  petSaveTimer = setTimeout(() => {
    if (!me || !db) return;
    db.collection("profiles").doc(me.uid).update({ pet: petState }).catch(() => {});
  }, 900);
}
function petAward(kind, amount, cap) {
  if (!me) return 0;
  const p = myPet();
  const task = PET_TASKS.find(t => t[0] === kind);
  cap = cap || (task ? task[3] : amount);
  const got = p.day.got[kind] || 0;
  if (got >= cap) { p.lastActive = todayKey; savePet(); return 0; }
  const add = Math.min(amount || (task ? task[2] : 5), cap - got);
  const before = petLevel(p.xp);
  p.xp += add;
  p.day.got[kind] = got + add;
  p.lastActive = todayKey;
  savePet();
  const after = petLevel(p.xp);
  if (state.view === "pet" || state.view === "home") { clearTimeout(petRenderTimer); petRenderTimer = setTimeout(() => { if (state.view === "pet" || state.view === "home") scheduleRender(); }, 1800); }
  if (after > before) {
    const item = PET_ITEMS.find(x => x[2] === after);
    setTimeout(() => showToast(p.name + " " + after + ". seviyeye ulaştı! 🎉", item ? "Yeni aksesuar açıldı: " + item[1] : "Seninle çok mutlu ♡", () => go("pet"), "Gör"), 300);
  }
  return add;
}
function petMood(p) {
  if (!p || !p.lastActive) return "normal";
  const days = Math.round((today - fromKey(p.lastActive)) / DAY_MS);
  return days <= 0 ? "happy" : days === 1 ? "normal" : "sad";
}
const PET_LINES = {
  happy: ["Bugün harikasın! ✨", "Seninle olmak çok güzel 💗", "Gülüşün bana enerji veriyor 🌸", "Birlikte ne güzel bir gün geçiriyoruz!", "Seni çok seviyorum 👻💕", "Bugün kendinle gurur duy!"],
  normal: ["Seni özlemiştim 🥺", "Bugün birlikte bir şeyler yapalım mı?", "Olumlamanı okudun mu? 🌸", "Bir dua okuyalım mı? 🤲", "Bana biraz kurabiye verir misin? 🍪"],
  sad: ["Neredeydin? Çok özledim 😢", "Beni unuttun sandım 🥺", "Geldiğine çok sevindim, bir sarıl bana 🤍"]
};

function ghostSVG(o) {
  o = o || {};
  const mood = o.mood || "happy";
  const wear = o.wear || "";
  const id = "g" + Math.random().toString(36).slice(2, 7);
  let back = "", front = "", eyes, mouth;
  if (wear === "wings") back = '<path d="M42 110c-30-20-40-58-22-66 14-6 30 18 34 44zM158 110c30-20 40-58 22-66-14-6-30 18-34 44z" fill="#fff" stroke="#E7DDF0" stroke-width="3"/>';
  if (wear === "rainbow") back = '<circle cx="100" cy="112" r="92" fill="url(#' + id + 'r)" opacity=".55"/>';
  if (mood === "happy") eyes = '<path d="M72 98q10-14 20 0M108 98q10-14 20 0" fill="none" stroke="#2B1B2E" stroke-width="6" stroke-linecap="round"/>';
  else if (mood === "sad") eyes = '<ellipse cx="82" cy="100" rx="7" ry="9" fill="#2B1B2E"/><ellipse cx="118" cy="100" rx="7" ry="9" fill="#2B1B2E"/><path d="M70 86l18 5M130 86l-18 5" stroke="#2B1B2E" stroke-width="4" stroke-linecap="round"/><path d="M80 112q-3 8 0 12q3-4 0-12z" fill="#8ECBFF"/>';
  else eyes = '<ellipse cx="82" cy="98" rx="8" ry="10" fill="#2B1B2E"/><ellipse cx="118" cy="98" rx="8" ry="10" fill="#2B1B2E"/><circle cx="85" cy="94" r="3" fill="#fff"/><circle cx="121" cy="94" r="3" fill="#fff"/>';
  mouth = mood === "sad" ? '<path d="M92 124q8-7 16 0" fill="none" stroke="#2B1B2E" stroke-width="5" stroke-linecap="round"/>'
    : mood === "happy" ? '<path d="M88 116q12 14 24 0" fill="#E0455F" stroke="#2B1B2E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<path d="M92 118q8 8 16 0" fill="none" stroke="#2B1B2E" stroke-width="5" stroke-linecap="round"/>';
  if (wear === "bow") front = '<g transform="translate(132 34) rotate(18)"><path d="M0 0l-18-12v24zM0 0l18-12v24z" fill="#F27BA5"/><circle r="6" fill="#E0457F"/></g>';
  if (wear === "flower") front = '<g>' + [[64, 40, "#FFB3C7"], [82, 26, "#FFE08A"], [100, 21, "#C8A8FF"], [118, 26, "#FFB3C7"], [136, 40, "#9FE3B8"]].map(([x, y, c]) => '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + c + '"/><circle cx="' + x + '" cy="' + y + '" r="4" fill="#FFD25E"/>').join("") + '</g>';
  if (wear === "glasses") front = '<g fill="none" stroke="#E0457F" stroke-width="4"><path d="M82 112c-14-8-18-22-8-26 4-2 8 0 8 4 0-4 4-6 8-4 10 4 6 18-8 26zM118 112c-14-8-18-22-8-26 4-2 8 0 8 4 0-4 4-6 8-4 10 4 6 18-8 26z" fill="rgba(255,150,190,.35)"/><path d="M92 92h16"/></g>';
  if (wear === "cat") front = '<path d="M58 52l6-38 28 24zM142 52l-6-38-28 24z" fill="#fff" stroke="#EAE0EE" stroke-width="3"/><path d="M64 44l4-20 14 13zM136 44l-4-20-14 13z" fill="#F6A6BE"/>';
  if (wear === "scarf") front = '<path d="M44 132q56 22 112 0v16q-56 22-112 0z" fill="#E0455F"/><path d="M60 142l-6 34 18-4 4-26z" fill="#C93450"/><path d="M50 136q50 18 100 0" stroke="#fff" stroke-width="3" stroke-dasharray="6 8" fill="none" opacity=".7"/>';
  if (wear === "crown") front = '<path d="M70 34l8-26 14 16 8-20 8 20 14-16 8 26z" fill="#FFC94A" stroke="#E0A020" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="26" r="4" fill="#E0457F"/>';
  if (wear === "halo") front = '<ellipse cx="100" cy="10" rx="34" ry="8" fill="none" stroke="#FFD25E" stroke-width="6"/>';
  return '<svg viewBox="0 0 200 220" aria-hidden="true"><defs><radialGradient id="' + id + 'r"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#FFD6E8"/><stop offset=".75" stop-color="#C8E6FF"/><stop offset="1" stop-color="#D9C8FF" stop-opacity="0"/></radialGradient></defs>' +
    back + '<ellipse cx="100" cy="212" rx="46" ry="6" fill="#000" opacity=".12" class="pet-shadow"/>' +
    '<path d="M40 104c0-50 27-82 60-82s60 32 60 82v84q-12 22-24 0q-12 22-24 0q-12 22-24 0q-12 22-24 0q-12 22-24 0z" fill="#FFFDFB" stroke="#EADFEA" stroke-width="3"/>' +
    eyes + '<ellipse cx="66" cy="116" rx="10" ry="6" fill="#F6A6BE"/><ellipse cx="134" cy="116" rx="10" ry="6" fill="#F6A6BE"/>' + mouth + front + '</svg>';
}

function petSay(stage, text) {
  const old = stage.querySelector(".pet-bubble");
  if (old) old.remove();
  const b = h("span", { class: "pet-bubble", text });
  stage.append(b);
  setTimeout(() => b.classList.add("out"), 2600);
  setTimeout(() => b.remove(), 3100);
}
function petHearts(stage, emoji) {
  for (let i = 0; i < 7; i++) {
    const s = h("i", { class: "pet-heart", text: emoji || "💗", style: "--x:" + (Math.random() * 120 - 60) + "px;--d:" + (i * .08) + "s" });
    stage.append(s);
    setTimeout(() => s.remove(), 1600);
  }
}
function petLine(p) {
  const mood = petMood(p);
  const list = PET_LINES[mood].slice();
  if (mood !== "sad") {
    if (!prayedToday().length) list.push("Bugün bir dua okumaya ne dersin? 🤲");
    if (!(p.day.got.olumlama)) list.push("Günün olumlaması seni bekliyor 🌸");
  }
  return list[Math.floor(Math.random() * list.length)];
}

function petStage(p, big) {
  const mood = petMood(p);
  const stage = h("div", { class: "pet-stage" + (big ? " big" : "") });
  const ghost = h("button", { class: "pet-ghost mood-" + mood, type: "button", "aria-label": p.name + " ile oyna", html: ghostSVG({ mood, wear: p.wear }),
    onclick: () => {
      ghost.classList.remove("jump"); void ghost.offsetWidth; ghost.classList.add("jump");
      petSay(stage, petLine(p));
      if (Date.now() - (p.pettedAt || 0) > 3600000) { p.pettedAt = Date.now(); petAward("sev", 2); petHearts(stage); }
    } });
  stage.append(ghost);
  return stage;
}

function petCard() {
  const p = myPet();
  const lv = petLevel(p.xp), next = PET_LEVELS[lv] || null, prev = PET_LEVELS[lv - 1];
  const pct = next ? Math.round((p.xp - prev) / (next - prev) * 100) : 100;
  return h("section", { class: "card pet-card span-3" },
    h("div", { class: "pet-top" },
      h("strong", { text: p.name }),
      h("span", { class: "pet-lv", text: "Seviye " + lv })),
    petStage(p, false),
    h("div", { class: "bar pet-bar" }, h("i", { style: "width:" + pct + "%" })),
    h("button", { class: "more", type: "button", text: petMood(p) === "sad" ? p.name + " seni özledi 🥺" : "Hayaletine git", onclick: () => go("pet") })
  );
}

function feedPet(stage) {
  const p = myPet();
  const left = 4 * 3600000 - (Date.now() - (p.fedAt || 0));
  if (left > 0) { petSay(stage, "Karnım tok 😋 " + Math.ceil(left / 3600000) + " saat sonra tekrar"); return; }
  p.fedAt = Date.now();
  petAward("besle", 5);
  petHearts(stage, "🍪");
  petSay(stage, "Mmm çok lezzetli, teşekkür ederim! 🍪");
}

async function sendPetHeart(friend) {
  const sent = listOf("petheart").some(x => isMine(x) && x.to === friend.uid && x.date === todayKey);
  if (sent) { showToast("Bugün zaten kalp gönderdin 💗", friend.name + " yarın yine kalp alabilir."); return; }
  addItem("petheart", { to: friend.uid, date: todayKey }, { vis: "some", mode: "only", people: [friend.uid] });
  showToast(friend.name + " adlı kişinin hayaletine kalp gönderdin 💗");
}

function claimHearts() {
  if (!me) return;
  const p = myPet();
  p.claimed = p.claimed || [];
  const fresh = listOf("petheart").filter(x => x.to === me.uid && !isMine(x) && !p.claimed.includes(x.id));
  if (!fresh.length) return;
  fresh.forEach(x => { p.claimed.push(x.id); petAward("kalp", 5); });
  p.claimed = p.claimed.slice(-80);
  savePet();
}

function renderPet() {
  const p = myPet();
  claimHearts();
  const lv = petLevel(p.xp), next = PET_LEVELS[lv] || null, prev = PET_LEVELS[lv - 1];
  const pct = next ? Math.round((p.xp - prev) / (next - prev) * 100) : 100;
  const mood = petMood(p);
  const stage = petStage(p, true);
  const heartsToday = listOf("petheart").filter(x => x.to === me.uid && x.date === todayKey && !isMine(x));

  const main = h("section", { class: "card pet-main span-8" },
    h("div", { class: "pet-head" },
      h("input", { class: "pet-name", id: "petName", type: "text", value: p.name, maxlength: "16", "aria-label": "Hayaletinin adı",
        onchange: e => { p.name = e.target.value.trim() || "Neri"; savePet(); render(); } }),
      h("span", { class: "pet-lv", text: "Seviye " + lv })),
    stage,
    h("p", { class: "pet-mood", text: mood === "happy" ? p.name + " bugün çok mutlu ✨" : mood === "normal" ? p.name + " seni biraz özlemiş" : p.name + " seni çok özledi, onunla biraz vakit geçir 🥺" }),
    h("div", { class: "bar pet-bar" }, h("i", { style: "width:" + pct + "%" })),
    h("p", { class: "tag", style: "text-align:center;margin:.4rem 0 0", text: next ? p.xp + " / " + next + " puan, sonraki seviyeye " + (next - p.xp) + " puan" : "En yüksek seviyedesin! 🌈" }),
    h("div", { class: "row", style: "justify-content:center;margin-top:1rem" },
      h("button", { class: "btn primary", type: "button", text: "Besle 🍪", onclick: () => feedPet(stage) }),
      h("button", { class: "btn", type: "button", text: "Sev 💗", onclick: () => stage.querySelector(".pet-ghost").click() })),
    heartsToday.length ? h("p", { class: "pet-mood", style: "margin-top:1rem", text: "Bugün " + [...new Set(heartsToday.map(x => x.ownerName))].join(", ") + " " + p.name + "'ye kalp gönderdi 💗" }) : null
  );

  const tasks = card({ title: "Bugün puan kazan", icon: "star", span: "span-4", tint: "t-lilac",
    body: [h("ul", { class: "pet-tasks" }, PET_TASKS.map(([k, label, , cap]) => {
      const got = p.day.got[k] || 0;
      return h("li", { class: got >= cap ? "done" : "" }, h("span", { text: (got >= cap ? "✓ " : "") + label }), h("small", { text: got + "/" + cap }));
    }))] });

  const wardrobe = card({ title: "Gardırop", icon: "gift", span: "span-12",
    body: [h("div", { class: "wardrobe" }, PET_ITEMS.map(([k, label, need]) => {
      const open = lv >= need;
      return h("button", { type: "button", class: "ward" + (p.wear === k ? " on" : "") + (open ? "" : " locked"), disabled: !open,
        onclick: () => { p.wear = k; savePet(); render(); } },
        h("span", { class: "ward-pic", html: ghostSVG({ mood: "happy", wear: k }) }),
        h("small", { text: open ? label : "🔒 " + need + ". seviye" }));
    }))] });

  const friends = profiles.filter(f => f.pet);
  const friendsCard = card({ title: "Arkadaşlarının hayaletleri", icon: "users", span: "span-12", tint: "t-peach",
    body: [friends.length ? h("div", { class: "pet-friends" }, friends.map(f => {
      const fp = f.pet;
      const sent = listOf("petheart").some(x => isMine(x) && x.to === f.uid && x.date === todayKey);
      return h("div", { class: "pet-friend" },
        h("span", { class: "ward-pic", html: ghostSVG({ mood: petMood(fp), wear: fp.wear }) }),
        h("strong", { text: fp.name || "Neri" }),
        h("small", { text: f.name + ", seviye " + petLevel(fp.xp || 0) }),
        h("button", { class: "btn small" + (sent ? "" : " primary"), type: "button", text: sent ? "Kalp gönderildi 💗" : "Kalp gönder 💗", disabled: sent, onclick: () => sendPetHeart(f) }));
    })) : h("p", { class: "empty", text: "Arkadaşların hayaletlerini sahiplenince burada görünecek." })] });

  return h("div", {},
    pageHead("Hayaletim", "Sen kendine iyi baktıkça " + p.name + " de mutlu oluyor, büyüyor ve yeni aksesuarlar açılıyor."),
    h("div", { class: "grid" }, main, tasks, wardrobe, friendsCard)
  );
}

function framePickerCard() {
  const mine = profileOf(me.uid) || { name: me.name, photo: me.photo, frame: me.frame };
  return card({ title: "Profil çerçevem", icon: "heart", span: "span-12", tint: "t-blush",
    body: [h("p", { class: "empty", text: "Profil resminin etrafına sevimli bir çerçeve seç. Mesajlarda ve profil listesinde herkes görür." }),
      h("div", { class: "frame-grid" }, FRAMES.map(([k, label]) =>
        h("button", { type: "button", class: "frame-opt" + ((mine.frame || "") === k ? " on" : ""), onclick: async () => {
          try { await db.collection("profiles").doc(me.uid).update({ frame: k }); me.frame = k; updateHeader(); render(); }
          catch (e) { showToast("Kaydedilemedi", "İnternet bağlantını kontrol et."); }
        } }, avatar(Object.assign({}, mine, { frame: k })), h("small", { text: label }))))] });
}
