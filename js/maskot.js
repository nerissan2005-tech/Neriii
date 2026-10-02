const FRAMES = [
  ["", "Çerçevesiz"], ["pastel", "Pastel"], ["rainbow", "Gökkuşağı"], ["hearts", "Kalpler"], ["flowers", "Çiçek tacı"],
  ["stars", "Yıldızlar"], ["moon", "Ay ve yıldız"], ["bow", "Fiyonk"], ["crown", "Taç"], ["cat", "Kedi kulakları"],
  ["bunny", "Tavşan kulakları"], ["bear", "Ayıcık"], ["ghost", "Hayalet dostu"]
];
const frameCls = f => f && FRAMES.some(x => x[0] === f) ? " frm fr-" + f : "";

const PET_SPECIES = { bunny: "Tavşan", bear: "Ayıcık" };
const PET_FOOD = { bunny: ["🥕", "havuç"], bear: ["🍯", "bal"] };
const PET_COLORS = {
  bunny: [["#FFFDFB", "Beyaz"], ["#FFD9E6", "Pembe"], ["#FFF0D2", "Krem"], ["#DCD8E6", "Gri"], ["#E6D9FF", "Lila"]],
  bear: [["#C08A62", "Kahve"], ["#E6AE5C", "Bal"], ["#F2D6B5", "Krem"], ["#F6C9D3", "Pembe"], ["#F7F5F2", "Kutup"]]
};
const PET_EFFECTS = [["", "Yok"], ["💗", "Kalpler"], ["⭐", "Yıldızlar"], ["✨", "Pırıltı"], ["🌸", "Çiçekler"], ["💧", "Gözyaşı"], ["🎵", "Notalar"], ["🦋", "Kelebek"], ["🫧", "Baloncuk"], ["❄️", "Kar"]];
const PET_SHOP = [
  ["bow", "Fiyonk", "head", 30], ["flower", "Çiçek tacı", "head", 60], ["party", "Parti şapkası", "head", 80], ["halo", "Hale", "head", 150], ["crown", "Taç", "head", 220],
  ["hglasses", "Kalp gözlük", "face", 70], ["sun", "Güneş gözlüğü", "face", 90],
  ["bowtie", "Papyon", "neck", 40], ["scarf", "Atkı", "neck", 60], ["necklace", "Kalp kolye", "neck", 100],
  ["wings", "Melek kanatları", "back", 250]
];
const PET_SLOTS = { head: "Baş", face: "Yüz", neck: "Boyun", back: "Sırt" };
const PET_STAGES = [[0, "Bebek", .58], [100, "Minik", .72], [300, "Genç", .86], [700, "Büyük", 1]];
const DAILY = [["olumlama", "Günün olumlamasını oku"], ["dua", "Bir dua ya da sure oku"], ["gunluk", "Günlüğüne yaz"], ["besle", "Petini besle"], ["sev", "Petini sev"], ["sihir", "Sihirli Kutu'yu aç"], ["mesaj", "Birine mesaj yaz"]];
const PET_TASKS = [
  ["olumlama", "Günün olumlaması", 10, 10], ["dua", "Dua ve sureler", 10, 30], ["gunluk", "Günlük", 20, 20],
  ["besle", "Besle", 10, 30], ["sev", "Sev", 5, 15], ["sihir", "Sihirli Kutu", 10, 10], ["mesaj", "Mesaj", 2, 10],
  ["gorev", "Plan işleri", 5, 20], ["aliskanlik", "Alışkanlıklar", 5, 20], ["ani", "Anı", 15, 15], ["kalp", "Arkadaş sevgisi", 5, 50], ["bonus", "Tüm görevler bonusu", 30, 30]
];
const EMO_TEXT = { happy: "mutlu 😊", love: "çok mutlu 🥰", sad: "üzgün 🥺", sleepy: "uykulu 😴", hungry: "aç " };
let petState = null;
let petSaveTimer = null;
let petRenderTimer = null;

const petStage = xp => { let s = PET_STAGES[0]; PET_STAGES.forEach(x => { if (xp >= x[0]) s = x; }); return s; };
const nextStage = xp => PET_STAGES.find(x => x[0] > xp) || null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function normPet(p) {
  p = p || {};
  const d = { name: "Minik", xp: 0, coins: 0, owned: [], wear: {}, effect: "💗", color: "", species: "", lastActive: todayKey, fedAt: Date.now(), pettedAt: Date.now(), claimed: [], partner: "" };
  Object.keys(d).forEach(k => { if (p[k] === undefined || p[k] === null) p[k] = d[k]; });
  if (typeof p.wear !== "object" || !p.wear) p.wear = {};
  if (p.coins == null || isNaN(p.coins)) p.coins = p.xp || 0;
  if (!Array.isArray(p.owned)) p.owned = [];
  if (!p.day || p.day.date !== todayKey) p.day = { date: todayKey, got: {} };
  if (!p.color && p.species) p.color = PET_COLORS[p.species][0][0];
  return p;
}
function myPet() {
  petState = normPet(petState);
  return petState;
}
function savePet() {
  clearTimeout(petSaveTimer);
  petSaveTimer = setTimeout(() => {
    if (!me || !db || !petState) return;
    petState.mood = petEmotion(petState);
    db.collection("profiles").doc(me.uid).update({ pet: petState }).catch(() => {});
  }, 800);
}
function petRerender() {
  if (state.view !== "pet" && state.view !== "home") return;
  clearTimeout(petRenderTimer);
  petRenderTimer = setTimeout(() => { if (state.view === "pet" || state.view === "home") scheduleRender(); }, 1600);
}
const dailyDone = p => DAILY.filter(([k]) => (p.day && p.day.date === todayKey && (p.day.got || {})[k] > 0)).length;

function petAward(kind, amount, cap) {
  if (!me) return 0;
  const p = myPet();
  const task = PET_TASKS.find(t => t[0] === kind);
  cap = cap || (task ? task[3] : amount);
  const got = p.day.got[kind] || 0;
  p.lastActive = todayKey;
  if (got >= cap) { savePet(); return 0; }
  const add = Math.min(amount || (task ? task[2] : 5), cap - got);
  const before = petStage(p.xp)[1];
  const doneBefore = dailyDone(p);
  p.xp += add;
  p.coins += add;
  p.day.got[kind] = got + add;
  savePet();
  if (p.species) {
    const after = petStage(p.xp)[1];
    if (after !== before) setTimeout(() => showToast(p.name + " büyüdü! Artık " + after + " " + (p.species === "bunny" ? "🐰" : "🐻"), "Ona bakmaya devam et, daha da büyüyecek ♡", () => go("pet"), "Gör"), 300);
    if (kind !== "bonus" && doneBefore < DAILY.length && dailyDone(p) === DAILY.length) {
      petAward("bonus", 30);
      setTimeout(() => showToast("Bugünün tüm görevleri tamam! 💞", p.name + " arkadaşıyla buluştu, +30 puan kazandın", () => go("pet"), "Buluşmayı gör"), 600);
    }
  }
  petRerender();
  return add;
}

function petNeeds(p) {
  const now = Date.now();
  return {
    hunger: Math.round(clamp(100 - (now - (p.fedAt || now)) / 3600000 * 5, 0, 100)),
    love: Math.round(clamp(100 - (now - (p.pettedAt || now)) / 3600000 * 4, 0, 100))
  };
}
function petEmotion(p, ownMood) {
  const n = petNeeds(p);
  const mood = ownMood !== undefined ? ownMood : (p === petState && typeof journalOf === "function" ? ((journalOf(todayKey) || {}).mood || "") : "");
  if (n.hunger < 30) return "hungry";
  if (mood === "Zor bir gün" || n.love < 25) return "sad";
  if (mood === "Yorgun") return "sleepy";
  if (mood === "Harika" || (p.day && p.day.date === todayKey && dailyDone(p) === DAILY.length)) return "love";
  return "happy";
}
const otherEmotion = p => p.day && p.day.date !== todayKey && p.lastActive !== todayKey ? "sad" : (p.mood || "happy");

function petSVG(o) {
  const sp = o.species === "bear" ? "bear" : "bunny";
  const c = o.color || PET_COLORS[sp][0][0];
  const emo = o.emotion || "happy";
  const w = o.wear || {};
  const ink = "#2B1B2E";
  const dy = sp === "bear" ? 6 : 0;
  const top = sp === "bear" ? 46 : 54;
  let back = "", ears = "", face = "", eyes = "", mouth = "", acc = "";
  if (w.back === "wings") back = '<path d="M56 160c-34-8-48-44-34-54 12-8 32 12 40 34zM144 160c34-8 48-44 34-54-12-8-32 12-40 34z" fill="#fff" stroke="#E7DDF0" stroke-width="3"/>';
  if (sp === "bunny") ears = '<g><ellipse cx="78" cy="40" rx="14" ry="38" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2" transform="rotate(-10 78 72)" class="ear-l"/><ellipse cx="78" cy="42" rx="6.5" ry="27" fill="#FFB8CC" transform="rotate(-10 78 72)" class="ear-l"/><ellipse cx="122" cy="40" rx="14" ry="38" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2" transform="rotate(10 122 72)" class="ear-r"/><ellipse cx="122" cy="42" rx="6.5" ry="27" fill="#FFB8CC" transform="rotate(10 122 72)" class="ear-r"/></g>';
  else ears = '<g><circle cx="56" cy="58" r="19" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2" class="ear-l"/><circle cx="56" cy="58" r="10" fill="#F4B7C4" class="ear-l"/><circle cx="144" cy="58" r="19" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2" class="ear-r"/><circle cx="144" cy="58" r="10" fill="#F4B7C4" class="ear-r"/></g>';
  const heart = (x, y, s, fill) => '<path d="M' + x + ' ' + (y + 5 * s) + 'c' + (-7 * s) + ' ' + (-5 * s) + ' ' + (-9 * s) + ' ' + (-11 * s) + ' ' + (-5 * s) + ' ' + (-13 * s) + ' ' + (2 * s) + ' ' + (-1 * s) + ' ' + (4 * s) + ' 0 ' + (5 * s) + ' ' + (2 * s) + ' ' + (1 * s) + ' ' + (-2 * s) + ' ' + (3 * s) + ' ' + (-3 * s) + ' ' + (5 * s) + ' ' + (-2 * s) + ' ' + (4 * s) + ' ' + (2 * s) + ' ' + (2 * s) + ' ' + (8 * s) + ' ' + (-5 * s) + ' ' + (13 * s) + 'z" fill="' + fill + '"/>';
  if (emo === "love") eyes = heart(80, 98, 1.1, "#E0457F") + heart(120, 98, 1.1, "#E0457F");
  else if (emo === "happy") eyes = '<path d="M72 102q8-10 16 0M112 102q8-10 16 0" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
  else if (emo === "sleepy") eyes = '<path d="M72 102q8 5 16 0M112 102q8 5 16 0" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/><text x="150" y="58" font-size="20" font-weight="700" fill="#8E8BB8" font-family="sans-serif">z</text><text x="164" y="42" font-size="14" font-weight="700" fill="#8E8BB8" font-family="sans-serif">z</text>';
  else eyes = '<ellipse cx="80" cy="100" rx="6.5" ry="8" fill="' + ink + '"/><ellipse cx="120" cy="100" rx="6.5" ry="8" fill="' + ink + '"/><circle cx="82.5" cy="96.5" r="2.6" fill="#fff"/><circle cx="122.5" cy="96.5" r="2.6" fill="#fff"/>';
  if (emo === "sad") eyes += '<path d="M70 86l17 6M130 86l-17 6" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/><path d="M76 110q-4 9 0 13q4-4 0-13z" fill="#8ECBFF"/>';
  if (sp === "bear") face = '<ellipse cx="100" cy="120" rx="24" ry="17" fill="#FFF4E8" opacity=".92"/><ellipse cx="100" cy="112" rx="8" ry="6" fill="#3A2530"/>';
  else face = '<ellipse cx="100" cy="113" rx="5" ry="4" fill="#F27BA5"/>';
  const my = 118 + dy;
  if (emo === "love") mouth = '<path d="M91 ' + my + 'q9 12 18 0z" fill="#E0455F" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/>';
  else if (emo === "sad") mouth = '<path d="M93 ' + (my + 6) + 'q7-6 14 0" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/>';
  else if (emo === "sleepy" || emo === "hungry") mouth = '<ellipse cx="100" cy="' + (my + 3) + '" rx="4" ry="5" fill="' + ink + '"/>' + (emo === "hungry" ? '<path d="M106 ' + (my + 5) + 'q-2 9 2 11q3-3-2-11z" fill="#9FD3FF"/>' : "");
  else mouth = '<path d="M93 ' + my + 'q3.5 5 7 0q3.5 5 7 0" fill="none" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>';
  if (w.neck === "scarf") acc += '<path d="M60 146q40 18 80 0v13q-40 18-80 0z" fill="#E0455F"/><path d="M72 154l-6 30 15-3 3-23z" fill="#C93450"/>';
  if (w.neck === "bowtie") acc += '<path d="M100 152l-18-10v20zM100 152l18-10v20z" fill="#8459AE"/><circle cx="100" cy="152" r="5" fill="#6A3F94"/>';
  if (w.neck === "necklace") acc += '<path d="M74 144q26 22 52 0" fill="none" stroke="#FFC94A" stroke-width="3"/>' + heart(100, 158, .8, "#E0457F");
  if (w.face === "hglasses") acc += '<g opacity=".95">' + heart(80, 96, 1.6, "rgba(255,120,170,.35)") + heart(120, 96, 1.6, "rgba(255,120,170,.35)") + '</g><path d="M90 100h20" stroke="#E0457F" stroke-width="3"/>';
  if (w.face === "sun") acc += '<rect x="66" y="91" width="28" height="18" rx="8" fill="#2B1B2E"/><rect x="106" y="91" width="28" height="18" rx="8" fill="#2B1B2E"/><path d="M94 98h12" stroke="#2B1B2E" stroke-width="3"/><path d="M72 96l8-1" stroke="#fff" stroke-width="2" opacity=".6"/>';
  if (w.head === "bow") acc += '<g transform="translate(' + (sp === "bunny" ? 138 : 140) + ' ' + (top + 6) + ') rotate(18)"><path d="M0 0l-18-12v24zM0 0l18-12v24z" fill="#F27BA5"/><circle r="6" fill="#E0457F"/></g>';
  if (w.head === "flower") acc += [[66, 10], [83, 3], [100, 0], [117, 3], [134, 10]].map(([x, d], i) => '<circle cx="' + x + '" cy="' + (top + d) + '" r="9" fill="' + ["#FFB3C7", "#FFE08A", "#C8A8FF", "#9FE3B8", "#FFB3C7"][i] + '"/><circle cx="' + x + '" cy="' + (top + d) + '" r="3.5" fill="#FFD25E"/>').join("");
  if (w.head === "party") acc += '<path d="M100 ' + (top - 42) + 'L84 ' + (top + 4) + 'H116z" fill="#8ECBFF"/><path d="M92 ' + (top - 18) + 'h16M88 ' + (top - 6) + 'h24" stroke="#fff" stroke-width="4"/><circle cx="100" cy="' + (top - 44) + '" r="7" fill="#FFD166"/>';
  if (w.head === "crown") acc += '<path d="M78 ' + (top + 2) + 'l6-24 12 14 4-18 4 18 12-14 6 24z" fill="#FFC94A" stroke="#E0A020" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="' + (top - 10) + '" r="4" fill="#E0457F"/>';
  if (w.head === "halo") acc += '<ellipse cx="100" cy="' + (sp === "bunny" ? 6 : 30) + '" rx="30" ry="7" fill="none" stroke="#FFD25E" stroke-width="6"/>';
  return '<svg viewBox="0 0 200 220" aria-hidden="true">' + back +
    '<ellipse cx="100" cy="212" rx="44" ry="6" fill="#000" opacity=".1"/>' +
    '<ellipse cx="78" cy="203" rx="15" ry="9" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2"/><ellipse cx="122" cy="203" rx="15" ry="9" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2"/>' +
    '<ellipse cx="100" cy="172" rx="46" ry="38" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2"/><ellipse cx="100" cy="178" rx="27" ry="24" fill="#fff" opacity=".5"/>' +
    '<ellipse cx="58" cy="168" rx="10" ry="15" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2" transform="rotate(20 58 168)" class="arm-l"/><ellipse cx="142" cy="168" rx="10" ry="15" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2" transform="rotate(-20 142 168)" class="arm-r"/>' +
    ears + '<circle cx="100" cy="104" r="56" fill="' + c + '" stroke="rgba(0,0,0,.08)" stroke-width="2"/>' +
    '<ellipse cx="68" cy="118" rx="10" ry="6" fill="#FFB3C7" opacity=".85"/><ellipse cx="132" cy="118" rx="10" ry="6" fill="#FFB3C7" opacity=".85"/>' +
    face + '<g class="eyes">' + eyes + '</g>' + mouth + acc + '</svg>';
}

function petSay(stage, text) {
  const old = stage.querySelector(".pet-bubble");
  if (old) old.remove();
  const b = h("span", { class: "pet-bubble", text });
  stage.append(b);
  setTimeout(() => b.classList.add("out"), 2600);
  setTimeout(() => b.remove(), 3100);
}
function petBurst(stage, emoji, n) {
  for (let i = 0; i < (n || 7); i++) {
    const s = h("i", { class: "pet-heart", text: emoji || "💗", style: "--x:" + (Math.random() * 140 - 70) + "px;--d:" + (i * .08) + "s" });
    stage.append(s);
    setTimeout(() => s.remove(), 1700);
  }
}
function petLine(p) {
  const emo = petEmotion(p);
  const food = PET_FOOD[p.species || "bunny"];
  const lines = {
    happy: ["Seninle olmak çok güzel 💗", "Bugün harikasın! ✨", "Birlikte ne güzel bir gün!", "Bana sarılır mısın? 🤗"],
    love: ["Seni çok seviyorum! 🥰", "Bugün dünyanın en mutlu " + PET_SPECIES[p.species || "bunny"].toLowerCase() + "uyum!", "İyi ki varsın 💞"],
    sad: ["Biraz üzgünüm, sarılır mısın? 🥺", "Yanımda kalır mısın?", "Moralim bozuk ama seni görünce iyi geldi 🤍"],
    sleepy: ["Biraz uykum var 😴", "Birlikte dinlenelim mi?"],
    hungry: ["Karnım çok aç, bana " + food[1] + " verir misin? " + food[0], "Mmm " + food[1] + " kokusu mu geliyor? " + food[0]]
  }[emo].slice();
  if (emo !== "hungry" && emo !== "sad") {
    if (typeof prayedToday === "function" && !prayedToday().length) lines.push("Bugün bir dua okuyalım mı? 🤲");
    if (!p.day.got.olumlama) lines.push("Günün olumlaması seni bekliyor 🌸");
  }
  return lines[Math.floor(Math.random() * lines.length)];
}

function petView(p, opts) {
  opts = opts || {};
  const emo = opts.emotion || petEmotion(p);
  const st = petStage(p.xp || 0);
  const wrap = h("div", { class: "pet-wrap", style: "--s:" + (opts.scale || st[2]) });
  const btn = h("button", { class: "pet-svg", type: "button", "aria-label": p.name || "Pet", html: petSVG({ species: p.species, color: p.color, emotion: emo, wear: p.wear }) });
  wrap.append(btn);
  return { wrap, btn, emo };
}

function feedPet(stage) {
  const p = myPet();
  const n = petNeeds(p);
  const food = PET_FOOD[p.species];
  if (n.hunger >= 90) { petSay(stage, "Karnım tok 😋 Biraz sonra tekrar"); return; }
  p.fedAt = Date.now();
  petAward("besle", 10);
  petBurst(stage, food[0], 6);
  petSay(stage, "Mmm çok lezzetli! Teşekkür ederim " + food[0]);
}
function lovePet(stage) {
  const p = myPet();
  p.pettedAt = Date.now();
  petAward("sev", 5);
  petBurst(stage, "💗", 8);
  petSay(stage, petLine(p));
}

function petStageEl(p, big, interactive) {
  const v = petView(p);
  const stage = h("div", { class: "pet-stage" + (big ? " big" : ""), "data-fx": p.effect || "" }, v.wrap);
  if (interactive) v.btn.addEventListener("click", () => { v.wrap.classList.remove("hop"); void v.wrap.offsetWidth; v.wrap.classList.add("hop"); setTimeout(() => v.wrap.classList.remove("hop"), 700); lovePet(stage); });
  return stage;
}

function needBar(label, val, cls) {
  return h("div", { class: "need" }, h("span", { text: label }), h("div", { class: "bar " + (cls || "") }, h("i", { style: "width:" + val + "%" })), h("small", { text: "%" + val }));
}

function petCard() {
  const p = myPet();
  if (!p.species) {
    return h("section", { class: "card pet-card span-3" },
      h("div", { class: "pet-top" }, h("strong", { text: "Minik dostun seni bekliyor" })),
      h("div", { class: "pet-duo" }, h("span", { html: petSVG({ species: "bunny", emotion: "happy" }) }), h("span", { html: petSVG({ species: "bear", emotion: "happy" }) })),
      h("button", { class: "btn primary small", type: "button", style: "align-self:center;margin-top:.6rem", text: "Petini seç 🐰🐻", onclick: () => go("pet") }));
  }
  const n = petNeeds(p);
  const stage = petStageEl(p, false, true);
  return h("section", { class: "card pet-card span-3" },
    h("div", { class: "pet-top" }, h("strong", { text: p.name }), h("span", { class: "pet-lv", text: petStage(p.xp)[1] })),
    stage,
    needBar("Tokluk", n.hunger, n.hunger < 30 ? "low" : ""),
    needBar("Sevgi", n.love, n.love < 30 ? "low" : ""),
    h("div", { class: "row", style: "justify-content:center;margin-top:.5rem;gap:.4rem" },
      h("button", { class: "btn small light-btn", type: "button", text: "Besle " + PET_FOOD[p.species][0], onclick: () => feedPet(stage) }),
      h("button", { class: "btn small light-btn", type: "button", text: "Sev 💗", onclick: () => lovePet(stage) })),
    h("button", { class: "more", type: "button", text: p.name + "'e git", onclick: () => go("pet") })
  );
}

function sendPetHeart(friend) {
  const sent = listOf("petheart").some(x => isMine(x) && x.to === friend.uid && x.date === todayKey);
  if (sent) { showToast("Bugün zaten sevdin 💗", "Yarın yine sevebilirsin."); return; }
  addItem("petheart", { to: friend.uid, date: todayKey }, { vis: "some", mode: "only", people: [friend.uid] });
  showToast((friend.pet && friend.pet.name || "Pet") + " sevildi 💗", friend.name + " bunu görünce çok sevinecek.");
}
function claimHearts() {
  if (!me) return;
  const p = myPet();
  const fresh = listOf("petheart").filter(x => x.to === me.uid && !isMine(x) && !p.claimed.includes(x.id));
  if (!fresh.length) return;
  fresh.forEach(x => { p.claimed.push(x.id); p.pettedAt = Date.now(); petAward("kalp", 5); });
  p.claimed = p.claimed.slice(-80);
  savePet();
}

function choosePartner() {
  const p = myPet();
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  root.replaceChildren(
    h("div", { class: "dlg-back", onclick: close }),
    h("div", { class: "dlg dlg-wide", role: "dialog", "aria-modal": "true", "aria-label": "Petini paylaş" },
      h("span", { class: "dlg-ic", html: ico("heart", 26) }),
      h("h2", { text: p.name + "'i kiminle paylaşalım?" }),
      h("p", { class: "clip", text: "Paylaştığın kişinin petiyle birlikte görev yapıp buluşacaklar 💞" }),
      profiles.length ? h("div", { class: "aud-people", style: "justify-content:center;margin:.6rem 0 .2rem" }, profiles.map(f =>
        h("button", { type: "button", class: "person" + (p.partner === f.uid ? " on" : ""), onclick: () => {
          p.partner = f.uid; savePet(); close(); render();
          sendQuickMessage(f.uid, { text: "💞 Petim " + p.name + "'i seninle paylaştım! Hadi birlikte bakalım 🐰🐻" }).catch(() => {});
          showToast(p.name + " artık " + f.name + " ile paylaşıldı 💞");
        } }, avatar(f), h("span", { text: f.name })))) : h("p", { class: "empty", text: "Henüz başka profil yok." }),
      h("div", { class: "dlg-actions" },
        p.partner ? h("button", { class: "btn danger", type: "button", text: "Paylaşımı bitir", onclick: () => { p.partner = ""; savePet(); close(); render(); } }) : null,
        h("button", { class: "btn", type: "button", text: "Vazgeç", onclick: close }))
    )
  );
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
}

function meetingCard(p) {
  const partner = p.partner ? profileOf(p.partner) : null;
  const other = partner && partner.pet && partner.pet.species ? Object.assign({ name: "Pet" }, partner.pet) : {
    name: p.species === "bunny" ? "Boncuk" : "Pamuk", species: p.species === "bunny" ? "bear" : "bunny", xp: p.xp, wear: {}, color: "", mood: "happy"
  };
  const mine = dailyDone(p) / DAILY.length;
  const theirs = partner && partner.pet ? (partner.pet.day && partner.pet.day.date === todayKey ? DAILY.filter(([k]) => (partner.pet.day.got || {})[k] > 0).length : 0) / DAILY.length : mine;
  const prog = partner ? (mine + theirs) / 2 : mine;
  const met = prog >= 1;
  const a = petView(p), b = petView(other, { emotion: met ? "love" : (partner ? otherEmotion(other) : "happy") });
  a.wrap.classList.add("meet-l"); b.wrap.classList.add("meet-r");
  const scene = h("div", { class: "meet-scene" + (met ? " met" : ""), style: "--p:" + prog.toFixed(2), "data-fx": met ? "💞" : "" }, a.wrap, b.wrap, met ? h("span", { class: "meet-heart", text: "💞" }) : null);
  return card({ title: "Buluşma", icon: "heart", span: "span-12", tint: "t-blush",
    body: [
      h("p", { class: "empty", text: met ? p.name + " ve " + other.name + " bugün buluştu! Görevlerinizi tamamladınız 💞"
        : partner ? "Siz görev yaptıkça " + p.name + " ile " + other.name + " birbirine yaklaşıyor. İkiniz de bugünün görevlerini bitirince buluşacaklar."
        : "Görev yaptıkça " + p.name + " arkadaşı " + other.name + "'a yaklaşıyor. Bugünün tüm görevlerini bitirince buluşacaklar." }),
      scene,
      h("div", { class: "row", style: "justify-content:space-between;margin-top:.6rem" },
        h("span", { class: "tag", text: "Senin görevlerin: " + dailyDone(p) + "/" + DAILY.length + (partner ? ", " + partner.name + ": " + Math.round(theirs * DAILY.length) + "/" + DAILY.length : "") }),
        h("div", { class: "row", style: "gap:.4rem" },
          partner ? h("button", { class: "btn small", type: "button", text: other.name + "'i sev 💗", onclick: () => sendPetHeart(partner) }) : null,
          h("button", { class: "btn small primary", type: "button", text: partner ? partner.name + " ile paylaşılıyor 💞" : "Şununla paylaş 💞", onclick: choosePartner })))
    ] });
}

function petSetup() {
  const p = myPet();
  const pick = state.petPick || { species: "bunny", name: p.name && p.name !== "Neri" ? p.name : "", color: "" };
  state.petPick = pick;
  const colors = PET_COLORS[pick.species];
  if (!colors.some(x => x[0] === pick.color)) pick.color = colors[0][0];
  return h("div", {},
    pageHead("Petim", "Minik bir dost seç. Sen kendine iyi baktıkça o da büyüyecek ♡"),
    h("section", { class: "card pet-setup" },
      h("h3", { text: "1. Dostunu seç" }),
      h("div", { class: "species-pick" }, Object.entries(PET_SPECIES).map(([k, label]) =>
        h("button", { type: "button", class: "species" + (pick.species === k ? " on" : ""), onclick: () => { pick.species = k; pick.color = ""; render(); } },
          h("span", { html: petSVG({ species: k, emotion: "happy", color: k === pick.species ? pick.color : "" }) }), h("strong", { text: label })))),
      h("h3", { text: "2. Rengini seç" }),
      h("div", { class: "swatches" }, colors.map(([hex, label]) =>
        h("button", { type: "button", class: "swatch" + (pick.color === hex ? " on" : ""), title: label, "aria-label": label, style: "--c:" + hex, onclick: () => { pick.color = hex; render(); } }))),
      h("h3", { text: "3. Ona bir isim ver" }),
      h("input", { class: "field", id: "petNewName", type: "text", maxlength: "16", placeholder: pick.species === "bunny" ? "Örn. Pamuk" : "Örn. Boncuk", value: pick.name, oninput: e => { pick.name = e.target.value; } }),
      h("button", { class: "btn primary", type: "button", style: "margin-top:1.2rem", text: "Hadi başlayalım 💗", onclick: () => {
        const nm = ($("petNewName").value || "").trim() || (pick.species === "bunny" ? "Pamuk" : "Boncuk");
        Object.assign(p, { species: pick.species, color: pick.color, name: nm, fedAt: Date.now() - 3600000 * 6, pettedAt: Date.now() - 3600000 * 6, wear: {}, effect: "💗" });
        state.petPick = null; savePet(); render();
        showToast(nm + " ile tanıştın! 🎉", "Onu beslemeyi ve sevmeyi unutma ♡");
      } })
    )
  );
}

function renderPet() {
  const p = myPet();
  if (!p.species) return petSetup();
  claimHearts();
  const n = petNeeds(p);
  const emo = petEmotion(p);
  const st = petStage(p.xp), nx = nextStage(p.xp);
  const stage = petStageEl(p, true, true);
  const food = PET_FOOD[p.species];
  const status = emo === "hungry" ? p.name + " acıkmış, onu besle " + food[0] : emo === "sad" ? p.name + " biraz üzgün, onu sev 🥺" : p.name + " şu an " + EMO_TEXT[emo];

  const main = h("section", { class: "card pet-main span-8" },
    h("div", { class: "pet-head" },
      h("input", { class: "pet-name", id: "petName", type: "text", value: p.name, maxlength: "16", "aria-label": "Petinin adı",
        onchange: e => { p.name = e.target.value.trim() || p.name; savePet(); render(); } }),
      h("span", { class: "pet-lv", text: PET_SPECIES[p.species] + ", " + st[1] }),
      h("span", { class: "coins", text: "🪙 " + p.coins })),
    stage,
    h("p", { class: "pet-mood", text: status }),
    h("div", { class: "needs" },
      needBar("Tokluk", n.hunger, n.hunger < 30 ? "low" : ""),
      needBar("Sevgi", n.love, n.love < 30 ? "low" : ""),
      needBar("Büyüme", nx ? Math.round((p.xp - st[0]) / (nx[0] - st[0]) * 100) : 100, "grow")),
    h("p", { class: "tag", style: "text-align:center;margin:.3rem 0 0", text: nx ? nx[1] + " olmasına " + (nx[0] - p.xp) + " puan kaldı" : "Kocaman oldu! 🌈" }),
    h("div", { class: "row", style: "justify-content:center;margin-top:1rem" },
      h("button", { class: "btn primary", type: "button", text: "Besle " + food[0], onclick: () => feedPet(stage) }),
      h("button", { class: "btn", type: "button", text: "Sev 💗", onclick: () => lovePet(stage) }),
      h("button", { class: "btn", type: "button", text: p.partner ? "Paylaşılıyor 💞" : "Paylaş 💞", onclick: choosePartner }))
  );

  const doneN = dailyDone(p);
  const tasks = card({ title: "Günlük görevler " + doneN + "/" + DAILY.length, icon: "star", span: "span-4", tint: "t-lilac",
    body: [h("ul", { class: "pet-tasks" }, DAILY.map(([k, label]) => {
      const ok = (p.day.got[k] || 0) > 0;
      return h("li", { class: ok ? "done" : "" }, h("span", { text: (ok ? "✓ " : "○ ") + label }), h("small", { text: "+" + PET_TASKS.find(t => t[0] === k)[2] }));
    })),
    h("p", { class: "tag", style: "margin-top:.7rem", text: doneN === DAILY.length ? "Hepsi tamam! Bonus +30 kazandın 🎉" : "Hepsini bitirirsen +30 bonus ve buluşma 💞" }),
    h("p", { class: "tag", style: "margin-top:.3rem", text: "Plan, alışkanlık, anı ve arkadaş sevgisi de ekstra puan kazandırır." })] });

  const shop = card({ title: "Gardırop ve mağaza", icon: "gift", span: "span-12",
    body: [h("p", { class: "empty", text: "Puanlarınla aksesuar al, istediğini giydir. Puanın: 🪙 " + p.coins }),
      h("div", { class: "wardrobe" }, PET_SHOP.map(([k, label, slot, price]) => {
        const owned = p.owned.includes(k), on = p.wear[slot] === k;
        const preview = Object.assign({}, p.wear, { [slot]: k });
        return h("div", { class: "ward" + (on ? " on" : "") + (!owned && p.coins < price ? " locked" : "") },
          h("span", { class: "ward-pic", html: petSVG({ species: p.species, color: p.color, emotion: "happy", wear: preview }) }),
          h("small", { text: label }),
          h("span", { class: "tag", text: PET_SLOTS[slot] }),
          owned
            ? h("button", { class: "btn small" + (on ? "" : " primary"), type: "button", text: on ? "Çıkar" : "Giydir", onclick: () => { p.wear[slot] = on ? "" : k; savePet(); render(); } })
            : h("button", { class: "btn small primary", type: "button", text: "Al 🪙 " + price, disabled: p.coins < price, onclick: async () => {
                if (!(await ask({ title: label + " alınsın mı?", text: price + " puan harcanacak. Kalan puanın: " + (p.coins - price), ok: "Satın al", icon: "gift" }))) return;
                p.coins -= price; p.owned.push(k); p.wear[slot] = k; savePet(); render();
                showToast(p.name + " " + label.toLowerCase() + " ile çok tatlı oldu! 🎀");
              } }));
      }))] });

  const look = card({ title: "Görünüm ve efekt", icon: "star", span: "span-12", tint: "t-peach",
    body: [
      h("h3", { class: "form-title", text: "Renk" }),
      h("div", { class: "swatches" }, PET_COLORS[p.species].map(([hex, label]) =>
        h("button", { type: "button", class: "swatch" + (p.color === hex ? " on" : ""), title: label, "aria-label": label, style: "--c:" + hex, onclick: () => { p.color = hex; savePet(); render(); } }))),
      h("h3", { class: "form-title", style: "margin-top:1rem", text: "Etrafına saçılan efekt" }),
      h("div", { class: "fx-pick" }, PET_EFFECTS.map(([e, label]) =>
        h("button", { type: "button", class: "fx" + ((p.effect || "") === e ? " on" : ""), onclick: () => { p.effect = e; savePet(); render(); } }, h("span", { text: e || "🚫" }), h("small", { text: label })))),
      h("div", { class: "row", style: "margin-top:1rem" },
        h("button", { class: "btn small", type: "button", text: p.species === "bunny" ? "Ayıcığa geç 🐻" : "Tavşana geç 🐰", onclick: async () => {
          if (!(await ask({ title: "Dostunu değiştirmek ister misin?", text: "Puanın, aksesuarların ve büyüklüğü aynı kalır, sadece türü değişir.", ok: "Değiştir", icon: "heart" }))) return;
          p.species = p.species === "bunny" ? "bear" : "bunny"; p.color = PET_COLORS[p.species][0][0]; savePet(); render();
        } }))
    ] });

  const friends = profiles.filter(f => f.pet && f.pet.species);
  const friendsCard = card({ title: "Arkadaşlarının petleri", icon: "users", span: "span-12",
    body: [friends.length ? h("div", { class: "pet-friends" }, friends.map(f => {
      const fp = f.pet;
      const sent = listOf("petheart").some(x => isMine(x) && x.to === f.uid && x.date === todayKey);
      const v = petView(fp, { emotion: otherEmotion(fp), scale: .8 });
      return h("div", { class: "pet-friend", "data-fx": fp.effect || "" }, h("div", { class: "pet-stage mini" }, v.wrap),
        h("strong", { text: fp.name || "Pet" }),
        h("small", { text: f.name + ", " + PET_SPECIES[fp.species] + ", " + petStage(fp.xp || 0)[1] + (fp.partner === me.uid ? " 💞" : "") }),
        h("button", { class: "btn small" + (sent ? "" : " primary"), type: "button", text: sent ? "Sevildi 💗" : (fp.name || "Pet") + "'i sev 💗", disabled: sent, onclick: () => sendPetHeart(f) }));
    })) : h("p", { class: "empty", text: "Arkadaşların petlerini seçince burada görünecek." })] });

  const sharedWithMe = profiles.filter(f => f.pet && f.pet.partner === me.uid && p.partner !== f.uid);
  const invite = sharedWithMe.length ? h("section", { class: "card span-12 invite" },
    h("p", { text: sharedWithMe.map(f => f.name).join(", ") + " petini seninle paylaştı 💞" }),
    h("button", { class: "btn primary small", type: "button", text: "Ben de paylaşayım", onclick: () => { p.partner = sharedWithMe[0].uid; savePet(); render(); } })) : null;

  return h("div", {},
    pageHead("Petim", "Sen kendine iyi baktıkça " + p.name + " de mutlu oluyor ve büyüyor."),
    h("div", { class: "grid" }, invite, main, tasks, meetingCard(p), shop, look, friendsCard)
  );
}

function petCarePrompt() {
  if (!me || !$("dialog") || !$("dialog").hidden) return;
  const p = myPet();
  let last = 0;
  try { last = Number(localStorage.getItem("neriii-pet-prompt") || 0); } catch (e) {}
  if (Date.now() - last < 3 * 3600000) return;
  const n = petNeeds(p);
  if (p.species && n.hunger >= 60 && n.love >= 60) return;
  try { localStorage.setItem("neriii-pet-prompt", String(Date.now())); } catch (e) {}
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  if (!p.species) {
    root.replaceChildren(h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide pet-prompt", role: "dialog", "aria-modal": "true", "aria-label": "Yeni dostun" },
        h("div", { class: "pet-duo" }, h("span", { html: petSVG({ species: "bunny", emotion: "love" }) }), h("span", { html: petSVG({ species: "bear", emotion: "love" }) })),
        h("h2", { text: "Minik bir dost seni bekliyor!" }),
        h("p", { text: "Bir tavşan ya da ayıcık seç, ona baktıkça büyüsün 🐰🐻" }),
        h("div", { class: "dlg-actions" }, h("button", { class: "btn", type: "button", text: "Sonra", onclick: close }), h("button", { class: "btn primary", type: "button", text: "Hadi seçelim", onclick: () => { close(); go("pet"); } }))));
  } else {
    const food = PET_FOOD[p.species];
    const hungry = n.hunger < 60;
    const box = h("div", { class: "pet-stage" }, petView(p, { scale: .85 }).wrap);
    root.replaceChildren(h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide pet-prompt", role: "dialog", "aria-modal": "true", "aria-label": p.name },
        box,
        h("h2", { text: hungry ? p.name + " acıkmış! " + food[0] : p.name + " seni özledi 🥺" }),
        h("p", { text: hungry ? p.name + "'i besle, sonra biraz sev ♡" : "Biraz sevgiye ihtiyacı var, sarıl ona 🤗" }),
        h("div", { class: "dlg-actions" },
          h("button", { class: "btn", type: "button", text: "Sev 💗", onclick: () => { lovePet(box); setTimeout(close, 1200); } }),
          h("button", { class: "btn primary", type: "button", text: "Besle " + food[0], onclick: () => { feedPet(box); setTimeout(close, 1200); } }))));
  }
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
}

setInterval(() => {
  if (document.hidden) return;
  document.querySelectorAll(".pet-stage, .meet-scene, .pet-friend").forEach(st => {
    const fx = st.getAttribute("data-fx");
    if (fx && Math.random() < .7) {
      for (let i = 0; i < 2; i++) {
        const s = h("i", { class: "pet-fx", text: fx, style: "left:" + (15 + Math.random() * 70) + "%;--d:" + (i * .4) + "s" });
        st.append(s);
        setTimeout(() => s.remove(), 3200);
      }
    }
  });
  document.querySelectorAll(".pet-wrap").forEach(w => {
    if (Math.random() < .35 && !w.classList.contains("hop")) {
      const a = ["wiggle", "tilt", "bounce"][Math.floor(Math.random() * 3)];
      w.classList.add(a);
      setTimeout(() => w.classList.remove(a), 1100);
    }
  });
}, 2800);

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
