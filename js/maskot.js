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
  ["bow", "Fiyonk", "head", 30], ["flower", "Çiçek tacı", "head", 60], ["party", "Şapka", "head", 80], ["halo", "Hale", "head", 150], ["crown", "Taç", "head", 220],
  ["hglasses", "Gözlük", "face", 70], ["sun", "Güneş gözlüğü", "face", 90],
  ["bowtie", "Papyon", "neck", 40], ["scarf", "Atkı", "neck", 60], ["necklace", "Kalp kolye", "neck", 100],
  ["wings", "Melek kanatları", "back", 250]
];
const PET_SLOTS = { head: "Baş", face: "Yüz", neck: "Boyun", back: "Sırt" };
const PET_STAGES = [[0, "Bebek", .58], [100, "Minik", .72], [300, "Genç", .86], [700, "Büyük", 1]];
const DAILY = [["olumlama", "Günün olumlamasını oku"], ["dua", "Bir dua ya da sure oku"], ["gunluk", "Günlüğüne yaz"], ["besle", "Petini besle"], ["sev", "Petini sev"], ["sihir", "Sihirli Kutu'yu aç"], ["mesaj", "Birine mesaj yaz"]];
const PET_TASKS = [
  ["olumlama", "Günün olumlaması", 10, 10], ["dua", "Dua ve sureler", 10, 30], ["gunluk", "Günlük", 20, 20],
  ["besle", "Besle", 10, 30], ["sev", "Sev", 5, 15], ["sihir", "Sihirli Kutu", 10, 10], ["mesaj", "Mesaj", 2, 10],
  ["gorev", "Plan işleri", 5, 20], ["aliskanlik", "Alışkanlıklar", 5, 20], ["uyku", "Güzel uyku", 15, 15], ["ani", "Anı", 15, 15], ["kalp", "Arkadaş sevgisi", 5, 50], ["bonus", "Tüm görevler bonusu", 30, 30]
];
const EMO_TEXT = { happy: "mutlu 😊", love: "çok mutlu 🥰", sad: "üzgün 🥺", sleepy: "uykulu 😴", hungry: "aç ", asleep: "mışıl mışıl uyuyor 💤" };
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
  const now = p.sleeping && p.sleepAt ? p.sleepAt : Date.now();
  return {
    hunger: Math.round(clamp(100 - (now - (p.fedAt || now)) / 3600000 * 5, 0, 100)),
    love: Math.round(clamp(100 - (now - (p.pettedAt || now)) / 3600000 * 4, 0, 100))
  };
}
function petEmotion(p, ownMood) {
  if (p.sleeping) return "asleep";
  const n = petNeeds(p);
  const mood = ownMood !== undefined ? ownMood : (p === petState && typeof journalOf === "function" ? ((journalOf(todayKey) || {}).mood || "") : "");
  if (n.hunger < 30) return "hungry";
  if (mood === "Zor bir gün" || n.love < 25) return "sad";
  if (mood === "Yorgun" || isBedtime()) return "sleepy";
  if (mood === "Harika" || (p.day && p.day.date === todayKey && dailyDone(p) === DAILY.length)) return "love";
  return "happy";
}
const isBedtime = () => { const hr = new Date().getHours(); return hr >= 22 || hr < 6; };
const otherEmotion = p => p.sleeping ? "asleep" : p.day && p.day.date !== todayKey && p.lastActive !== todayKey ? "sad" : (p.mood || "happy");

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.round(clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function petSVG(o) {
  const sp = o.species === "bear" ? "bear" : "bunny";
  const c = o.color || PET_COLORS[sp][0][0];
  const emo = o.emotion || "happy";
  const w = o.wear || {};
  const id = "p" + Math.random().toString(36).slice(2, 8);
  const t = (ch, x, y, size, extra) => '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle" dominant-baseline="central"' + (extra || "") + '>' + ch + '</text>';
  let back = "", acc = "", badge = "";
  if (w.back === "wings") back = '<path d="M46 120c-34-6-48-46-34-58 12-10 34 10 42 34zM154 120c34-6 48-46 34-58-12-10-34 10-42 34z" fill="#fff" stroke="#E7DDF0" stroke-width="3"/>';
  if (w.head === "halo") back += '<ellipse cx="100" cy="14" rx="34" ry="8" fill="none" stroke="#FFD25E" stroke-width="6"/>';
  if (w.head === "bow") acc += t("🎀", 146, 46, 46);
  if (w.head === "flower") acc += t("🌸", 64, 44, 30) + t("🌼", 100, 30, 30) + t("🌷", 136, 44, 30);
  if (w.head === "party") acc += t("🎩", 100, 22, 54);
  if (w.head === "crown") acc += t("👑", 100, 22, 52);
  if (w.face === "hglasses") acc += t("👓", 100, 104, 68);
  if (w.face === "sun") acc += t("🕶️", 100, 104, 68);
  if (w.neck === "scarf") acc += t("🧣", 100, 204, 44);
  if (w.neck === "necklace") acc += t("💝", 100, 205, 30);
  if (w.neck === "bowtie") acc += '<path d="M100 204l-17-10v20zM100 204l17-10v20z" fill="#8E6BD8"/><circle cx="100" cy="204" r="5.5" fill="#6E4BC0"/>';
  const badges = { love: "💕", sad: "💧", sleepy: "😪", hungry: sp === "bunny" ? "🥕" : "🍯", asleep: "💤" };
  if (badges[emo]) badge = '<g class="emo-badge">' + t(badges[emo], 168, 46, emo === "sad" ? 32 : 40) + '</g>';
  if (emo === "hungry") badge = '<g class="emo-badge"><ellipse cx="166" cy="46" rx="24" ry="20" fill="#fff" stroke="#EADFEA" stroke-width="2"/><circle cx="146" cy="70" r="5" fill="#fff" stroke="#EADFEA" stroke-width="2"/>' + t(badges.hungry, 166, 46, 26) + '</g>';
  const face = sp === "bunny" ? "🐰" : "🐻";
  const mood = emo === "asleep" ? ' class="pet-emoji asleep"' : emo === "sad" ? ' class="pet-emoji sad"' : ' class="pet-emoji"';
  return '<svg viewBox="0 -8 200 228" aria-hidden="true"><defs><radialGradient id="' + id + 'a"><stop offset="0" stop-color="' + c + '" stop-opacity=".95"/><stop offset=".6" stop-color="' + c + '" stop-opacity=".45"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient></defs>' +
    '<circle cx="100" cy="112" r="94" fill="url(#' + id + 'a)"/>' + back +
    '<ellipse cx="100" cy="214" rx="50" ry="7" fill="#000" opacity=".1"/>' +
    '<g' + mood + '>' + t(face, 100, 112, 150) + '</g>' + acc + badge + '</svg>';
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

function sleepPet() {
  const p = myPet();
  if (p.sleeping) return;
  p.sleeping = true;
  p.sleepAt = Date.now();
  savePet();
  showToast(p.name + " uyudu 🌙", "Sen uyurken o da dinlenecek, acıkmayacak. Sabah uyandırmayı unutma ♡");
  render();
}
function wakePet() {
  const p = myPet();
  if (!p.sleeping) return;
  const slept = Date.now() - (p.sleepAt || Date.now());
  p.fedAt = (p.fedAt || Date.now()) + slept;
  p.pettedAt = (p.pettedAt || Date.now()) + slept;
  p.sleeping = false;
  p.sleepAt = 0;
  if (slept >= 5 * 3600000) { p.pettedAt = Date.now(); petAward("uyku", 15); }
  savePet();
  showToast("Günaydın " + p.name + "! ☀️", slept >= 5 * 3600000 ? "Güzel bir uyku çekti, +15 puan kazandın" : "Biraz kestirdi, şimdi enerji dolu");
  render();
}
const sleepBtn = (p, small) => h("button", { class: "btn" + (small ? " small light-btn" : ""), type: "button", text: p.sleeping ? "Uyandır ☀️" : "Uyut 🌙", onclick: () => p.sleeping ? wakePet() : sleepPet() });

function feedPet(stage) {
  const p = myPet();
  if (p.sleeping) { petSay(stage, "Şşş… " + p.name + " uyuyor 🤫"); return; }
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
  if (p.sleeping) { petSay(stage, "Şşş… tatlı rüyalar görüyor 💤"); petBurst(stage, "💤", 3); return; }
  p.pettedAt = Date.now();
  petAward("sev", 5);
  petBurst(stage, "💗", 8);
  petSay(stage, petLine(p));
}

function petStageEl(p, big, interactive) {
  const v = petView(p);
  const stage = h("div", { class: "pet-stage" + (big ? " big" : "") + (p.sleeping ? " night" : ""), "data-fx": p.sleeping ? "💤" : (p.effect || "") }, v.wrap);
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
      p.sleeping ? null : h("button", { class: "btn small light-btn", type: "button", text: "Besle " + PET_FOOD[p.species][0], onclick: () => feedPet(stage) }),
      p.sleeping ? null : h("button", { class: "btn small light-btn", type: "button", text: "Sev 💗", onclick: () => lovePet(stage) }),
      p.sleeping || isBedtime() ? sleepBtn(p, true) : null),
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
      h("h3", { text: "2. Parıltı rengini seç" }),
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
  const status = p.sleeping ? p.name + " mışıl mışıl uyuyor 💤 Uyurken acıkmıyor" : emo === "hungry" ? p.name + " acıkmış, onu besle " + food[0] : emo === "sad" ? p.name + " biraz üzgün, onu sev 🥺" : isBedtime() ? p.name + " uykulu, uyku vakti geldi 🌙" : p.name + " şu an " + EMO_TEXT[emo];

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
      p.sleeping ? null : h("button", { class: "btn primary", type: "button", text: "Besle " + food[0], onclick: () => feedPet(stage) }),
      p.sleeping ? null : h("button", { class: "btn", type: "button", text: "Sev 💗", onclick: () => lovePet(stage) }),
      h("button", { class: "btn" + (p.sleeping || isBedtime() ? " primary" : ""), type: "button", text: p.sleeping ? "Uyandır ☀️" : "Uyut 🌙", onclick: () => p.sleeping ? wakePet() : sleepPet() }),
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
      h("h3", { class: "form-title", text: "Parıltı rengi" }),
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
  const hr = new Date().getHours();
  const morning = p.sleeping && hr >= 6 && hr < 13;
  const bedtime = !p.sleeping && isBedtime();
  if (p.species && !morning && !bedtime && (p.sleeping || (n.hunger >= 60 && n.love >= 60))) return;
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
  } else if (morning || bedtime) {
    const box = h("div", { class: "pet-stage" + (p.sleeping ? " night" : "") }, petView(p, { scale: .85 }).wrap);
    root.replaceChildren(h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide pet-prompt", role: "dialog", "aria-modal": "true", "aria-label": p.name },
        box,
        h("h2", { text: morning ? "Günaydın! ☀️" : p.name + "'in uykusu geldi 😴" }),
        h("p", { text: morning ? p.name + " hâlâ uyuyor. Uyandıralım mı?" : "Sen de uyumadan önce onu uyutalım mı? Uyurken acıkmaz 🌙" }),
        h("div", { class: "dlg-actions" },
          h("button", { class: "btn", type: "button", text: "Sonra", onclick: close }),
          h("button", { class: "btn primary", type: "button", text: morning ? "Uyandır ☀️" : "Uyut 🌙", onclick: () => { close(); morning ? wakePet() : sleepPet(); } }))));
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
