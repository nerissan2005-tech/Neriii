const TR_MAP = { "ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c" };
const slugOf = n => (n || "").toLocaleLowerCase("tr").replace(/[ığüşöç]/g, c => TR_MAP[c]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const emailOf = n => n.includes("@") ? n.trim().toLowerCase() : slugOf(n) + "@nerii.app";
function authError(err) {
  const c = (err && err.code) || "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials", "auth/invalid-email"].includes(c)) return "Profil adı ya da şifre hatalı.";
  if (c === "auth/email-already-in-use") return "Bu isimde bir profil zaten var.";
  if (c === "auth/weak-password") return "Şifre en az 6 karakter olmalı.";
  if (c === "auth/too-many-requests") return "Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.";
  if (c === "auth/network-request-failed") return "İnternet bağlantını kontrol et.";
  if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation") return "Yeni profil oluşturma şu an kapalı.";
  if (c === "auth/requires-recent-login") return "Güvenlik için çıkış yapıp tekrar giriş yapman gerekiyor.";
  return "Bir sorun oluştu, tekrar dene.";
}

const FB_READY = !Object.values(firebaseConfig).some(v => !v || v === "BURAYA");
let pendingName = "";

function showLogin(message) {
  $("appRoot").hidden = true;
  $("band").hidden = true;
  const box = $("login");
  box.hidden = false;
  const err = h("p", { class: "err", role: "alert", text: message || "" });
  const form = h("form", { onsubmit: async e => {
    e.preventDefault();
    err.textContent = "";
    if (!FB_READY) { err.textContent = "Kurulum henüz tamamlanmadı."; return; }
    const name = $("lgName").value.trim(), pw = $("lgPass").value;
    if (!slugOf(name)) { err.textContent = "Profil adını ya da kullanıcı adını yaz."; return; }
    if (!pw) { err.textContent = "Şifreni yaz."; return; }
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
    try {
      if (!name.includes("@")) pendingName = name;
      const email = await resolveEmail(name);
      if (!email) {
        err.textContent = "Bu kullanıcı adı değiştirilmiş. Yeni kullanıcı adınla giriş yap.";
        btn.disabled = false; btn.textContent = "Giriş yap";
        return;
      }
      await auth.signInWithEmailAndPassword(email, pw);
    } catch (ex) {
      err.textContent = authError(ex);
      btn.disabled = false; btn.textContent = "Giriş yap";
    }
  } },
    h("label", { class: "lbl", for: "lgName", text: "Profil adı ya da kullanıcı adı" }),
    h("input", { class: "field", id: "lgName", type: "text", autocomplete: "username", autocapitalize: "words" }),
    h("label", { class: "lbl", for: "lgPass", text: "Şifre" }),
    h("input", { class: "field", id: "lgPass", type: "password", autocomplete: "current-password" }),
    h("button", { class: "btn primary", type: "submit", text: "Giriş yap" }),
    err
  );
  box.replaceChildren(
    h("span", { html: HERO_SVG, style: "position:absolute;inset:0;display:block" }),
    h("div", { class: "login-card" },
      h("h1", { text: "Neriii ♡" }),
      h("p", { class: "sub", text: "Profilinle giriş yap" }),
      FB_READY ? form : h("p", { class: "setup", text: "Giriş sistemi için Firebase ayarlarının index.html içindeki firebaseConfig alanına eklenmesi gerekiyor." })
    )
  );
  box.querySelector("span > svg").style.cssText = "width:100%;height:100%";
  const first = $("lgName");
  if (first) first.focus();
}

async function migrateBlob(blob) {
  const rows = [];
  const base = vis => ({ owner: me.uid, ownerName: me.name, vis: vis || "private", upd: Date.now(), updName: me.name });
  (blob.notes || []).forEach(n => rows.push(Object.assign(base(), { kind: "note", title: n.title || "", body: n.body || "", at: n.updated || Date.now() })));
  (blob.goals || []).forEach(g => rows.push(Object.assign(base(), { kind: "goal", text: g.text, area: g.area || "Kişisel", progress: g.progress || 0, at: Date.now() })));
  (blob.habits || []).forEach(hb => rows.push(Object.assign(base(), { kind: "habit", name: hb.name, done: { [me.uid]: hb.done || {} }, at: Date.now() })));
  Object.entries(blob.plan || {}).forEach(([k, arr]) => (arr || []).forEach(p => rows.push(Object.assign(base(), { kind: "plan", text: p.text, date: k, done: !!p.done, at: Date.now() }))));
  (blob.shopping || []).forEach(s => rows.push(Object.assign(base(), { kind: "shop", text: s.text, done: !!s.done, at: Date.now() })));
  (blob.books || []).forEach(b => rows.push(Object.assign(base(), { kind: "book", title: b.title, author: b.author || "", status: b.status || "Okunacak", at: Date.now() })));
  (blob.myAff || []).forEach(a => rows.push(Object.assign(base(), { kind: "aff", text: a.text, cat: a.cat, date: a.date || todayKey, at: Date.now() })));
  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    rows.slice(i, i + 400).forEach(r => batch.set(itemsCol().doc(), r));
    await batch.commit();
  }
  ["notes", "goals", "habits", "plan", "shopping", "books", "myAff", "name", "recipes"].forEach(k => { delete data[k]; });
  data.v3 = true;
}

async function resolveEmail(name) {
  if (name.includes("@")) return name.trim().toLowerCase();
  const slug = slugOf(name);
  try {
    const d = await db.collection("logins").doc(slug).get();
    if (d.exists) {
      const x = d.data();
      if (x.moved) return null;
      if (x.email) return x.email;
    }
  } catch (e) {}
  return slug + "@nerii.app";
}

const isRootProfile = p => p.root === true || (me && me.isRoot && p.uid === me.uid);
const profEmail = p => p.email || (p.slug ? p.slug + "@nerii.app" : "");

async function renameProfile(p, newName) {
  newName = (newName || "").trim();
  const newSlug = slugOf(newName);
  if (!newSlug || newName.includes("@")) throw new Error("Geçerli bir kullanıcı adı yaz.");
  if (newName === p.name) return;
  const batch = db.batch();
  if (newSlug !== p.slug) {
    if (allProfiles.some(x => x.uid !== p.uid && x.slug === newSlug)) throw new Error("Bu kullanıcı adı başka bir profilde kullanılıyor.");
    const taken = await db.collection("logins").doc(newSlug).get();
    if (taken.exists && taken.data().uid !== p.uid) throw new Error("Bu kullanıcı adı daha önce alınmış.");
    batch.set(db.collection("logins").doc(newSlug), { uid: p.uid, email: profEmail(p), at: Date.now() });
    if (p.slug) batch.set(db.collection("logins").doc(p.slug), { uid: p.uid, moved: true, at: Date.now() });
  }
  batch.update(db.collection("profiles").doc(p.uid), { name: newName, slug: newSlug, email: profEmail(p) });
  await batch.commit();
}

async function startApp(user) {
  const isRoot = (user.email || "").toLowerCase() === ADMIN_EMAIL;
  const pRef = db.collection("profiles").doc(user.uid);
  let pDoc = await pRef.get();
  if (!pDoc.exists) {
    if (!isRoot) { loginNotice = "Bu profil yönetici tarafından eklenmemiş."; await auth.signOut(); return; }
    await pRef.set({ name: pendingName || "Neriii", slug: ADMIN_EMAIL.split("@")[0], role: "admin", root: true, email: ADMIN_EMAIL, at: Date.now() });
    pDoc = await pRef.get();
  }
  const p = pDoc.data();
  if (p.disabled && !isRoot) { loginNotice = "Bu profil devre dışı bırakılmış. Yöneticiyle görüş."; await auth.signOut(); return; }
  pendingName = "";
  me = { uid: user.uid, name: p.name, photo: p.photo || "", email: user.email, isRoot, isAdmin: isRoot || p.role === "admin" };
  const fix = {};
  if (isRoot && p.root !== true) Object.assign(fix, { root: true, role: "admin" });
  if (!p.email) fix.email = user.email;
  if (Object.keys(fix).length) { try { await pRef.update(fix); } catch (e) {} }
  if (p.slug) {
    try {
      const lg = await db.collection("logins").doc(p.slug).get();
      if (!lg.exists) await db.collection("logins").doc(p.slug).set({ uid: user.uid, email: user.email, at: Date.now() });
    } catch (e) {}
  }

  const uDoc = await db.collection("userdata").doc(user.uid).get();
  const blob = uDoc.exists && uDoc.data().json ? JSON.parse(uDoc.data().json) : null;
  data = Object.assign(defaults(), blob || {});
  if (blob && !blob.v3) { await migrateBlob(blob); pushData(); }
  if (!data.j2) {
    const rows = Object.entries(data.journal || {}).filter(([k, e]) => e && ((e.text || "").trim() || e.mood || (e.gratitude || []).some(g => (g || "").trim())));
    for (let i = 0; i < rows.length; i += 400) {
      const batch = db.batch();
      rows.slice(i, i + 400).forEach(([k, e]) => batch.set(itemsCol().doc(), { kind: "journal", owner: me.uid, ownerName: me.name, vis: "private", at: Date.now(), upd: Date.now(), updName: me.name, date: k, mood: e.mood || "", gratitude: e.gratitude || ["", "", ""], text: e.text || "" }));
      await batch.commit();
    }
    data.journal = {};
    data.j2 = true;
    pushData();
  }
  else if (!blob) pushData();

  $("login").hidden = true;
  $("login").replaceChildren();
  $("appRoot").hidden = false;
  $("band").hidden = false;
  const paintMe = () => {
    $("logoName").textContent = me.name + " ♡";
    $("logoShort").textContent = initial(me.name) + "♡";
    const ab = document.querySelector('#nav button[data-view="admin"]');
    if (ab) ab.hidden = !me.isAdmin;
  };
  paintMe();

  let firstIn = true;
  unsubs.push(db.collection("profiles").onSnapshot(snap => {
    allProfiles = snap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
    profiles = allProfiles.filter(x => x.uid !== me.uid && !x.disabled);
    const mine = allProfiles.find(x => x.uid === me.uid);
    if (mine) {
      if (mine.disabled && !isRoot) { loginNotice = "Bu profil devre dışı bırakıldı."; logout(); return; }
      me.name = mine.name;
      me.photo = mine.photo || "";
      me.isAdmin = isRoot || mine.role === "admin";
      if (!me.isAdmin && state.view === "admin") { go("home"); return; }
      paintMe();
    }
    if (["messages", "admin", "settings"].includes(state.view)) scheduleRender(); else updateHeader();
  }, () => {}));
  unsubs.push(db.collection("messages").where("to", "==", me.uid).onSnapshot(snap => {
    msgsIn = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    if (firstIn) {
      firstIn = false;
      const un = msgsIn.filter(m => !m.read && !m.unsent && !(m.hidden || []).includes(me.uid)).sort((a, b) => b.at - a.at);
      if (un.length) {
        const names = [...new Set(un.map(m => m.fromName))];
        showToast(un.length === 1 ? un[0].fromName + " sana bir mesaj bıraktı" : "Sana " + un.length + " yeni mesaj var",
          un.length === 1 ? msgPreview(un[0]) : names.join(", ") + " sana yazdı.",
          () => go("messages", { chatWith: un[0].from }), "Mesajlara git");
      }
    } else {
      snap.docChanges().forEach(ch => {
        const m = Object.assign({ id: ch.doc.id }, ch.doc.data());
        if (ch.type === "added" && !m.read && !m.unsent && !(state.view === "messages" && state.chatWith === m.from && document.visibilityState === "visible")) {
          showToast(m.fromName + " sana yazdı", msgPreview(m), () => go("messages", { chatWith: m.from }), "Cevap ver");
        }
      });
    }
    if (state.view === "messages") scheduleRender(); else updateHeader();
  }, () => {}));
  unsubs.push(db.collection("messages").where("from", "==", me.uid).onSnapshot(snap => {
    msgsOut = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    if (state.view === "messages") scheduleRender();
  }, () => {}));

  let firstItems = 0;
  const startItems = () => {
    const onItems = (target, setter) => snap => {
      const m = new Map();
      snap.docs.forEach(d => m.set(d.id, Object.assign({ id: d.id }, d.data())));
      setter(m);
      itemsCache = null;
      if (firstItems < 2) { firstItems++; if (firstItems === 2) go(location.hash.slice(1) || "home"); return; }
      if (!["messages", "settings"].includes(state.view)) scheduleRender(); else updateHeader();
    };
    unsubs.push(itemsCol().where("vis", "==", "public").onSnapshot(onItems("pub", m => { pubItems = m; }), () => { if (firstItems < 2) { firstItems++; if (firstItems === 2) go(location.hash.slice(1) || "home"); } }));
    unsubs.push(itemsCol().where("owner", "==", me.uid).onSnapshot(onItems("mine", m => { myItems = m; }), () => { if (firstItems < 2) { firstItems++; if (firstItems === 2) go(location.hash.slice(1) || "home"); } }));
  };
  startItems();
  unsubs.push(db.collection("config").doc("site").onSnapshot(d => {
    site = d.exists ? d.data() : {};
    if (state.view === "home" && firstItems >= 2) scheduleRender();
  }, () => {}));
}

function logout() {
  lockAdmin();
  if (saveTimer) pushData();
  flushItems();
  unsubs.forEach(u => u());
  unsubs = [];
  setTimeout(() => auth.signOut().then(() => { history.replaceState(null, "", location.pathname); location.reload(); }), 300);
}

const RENDER = { home: renderHome, notes: renderNotes, goals: renderGoals, habits: renderHabits, calendar: renderCalendar, journal: renderJournal, affirm: renderAffirm, messages: renderMessages, shopping: renderShopping, books: renderBooks, settings: renderSettings, admin: renderAdmin };


function greeting() {
  const hr = new Date().getHours();
  if (hr >= 5 && hr < 12) return "Günaydın";
  if (hr >= 12 && hr < 18) return "İyi günler";
  if (hr >= 18 && hr < 22) return "İyi akşamlar";
  return "İyi geceler";
}


function updateHeader() {
  if (!me) return;
  const unread = unreadCount();
  $("greetTitle").textContent = greeting() + " " + me.name + " ♡";
  const p = plansOn(todayKey);
  const done = p.filter(i => i.done).length;
  const left = p.length - done;
  $("greetSub").textContent = unread ? "Sana " + unread + " yeni mesaj var ♡"
    : !p.length ? "Bugün harika şeyler başarabilirsin."
    : !left ? "Bugünkü planının hepsini tamamladın, tebrikler."
    : "Bugün planında " + p.length + " iş var, " + done + " tanesi tamam.";
  const now = new Date();
  $("clockDate").textContent = fmtDate.format(now);
  $("clockTime").textContent = fmtTime.format(now);
  const total = unread + left;
  $("bellBtn").innerHTML = ico("bell", 22) + (total ? '<span class="badge">' + total + "</span>" : "");
  $("bellBtn").setAttribute("aria-label", unread ? unread + " okunmamış mesaj" : left ? "Bugün " + left + " iş kaldı" : "Bildirimler");
  const ab = $("avatarBtn");
  ab.textContent = me.photo ? "" : initial(me.name);
  ab.style.backgroundImage = me.photo ? "url(\"" + me.photo + "\")" : "";
  ab.classList.toggle("has-photo", !!me.photo);
  const mBtn = document.querySelector('#nav button[data-view="messages"] .lbl');
  if (mBtn) mBtn.textContent = unread ? "Mesajlar (" + unread + ")" : "Mesajlar";
}

function tick() {
  if (!me) return;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (now.getTime() !== today.getTime()) {
    today = now; todayKey = keyOf(today); state.calMonth = firstOfMonth(today);
    if (state.view === "home") scheduleRender();
  }
  updateHeader();
}

function searchAll(q) {
  q = q.toLocaleLowerCase("tr");
  const has = s => s && String(s).toLocaleLowerCase("tr").includes(q);
  const out = [];
  allItems().forEach(i => {
    if (i.kind === "note" && (has(i.title) || has(i.body))) out.push([i.title || "Başlıksız not", "Not", () => go("notes", { noteId: i.id })]);
    if (i.kind === "goal" && has(i.text)) out.push([i.text, "Hedef", () => go("goals")]);
    if (i.kind === "habit" && has(i.name)) out.push([i.name, "Alışkanlık", () => go("habits")]);
    if (i.kind === "plan" && has(i.text)) out.push([i.text, "Plan, " + fmtShort.format(fromKey(i.date)), () => go("calendar", { sel: i.date, calMonth: firstOfMonth(fromKey(i.date)) })]);
    if (i.kind === "shop" && has(i.text)) out.push([i.text, "Alışveriş listesi", () => go("shopping")]);
    if (i.kind === "book" && (has(i.title) || has(i.author))) out.push([i.title, "Kitap, " + i.status, () => go("books")]);
    if (i.kind === "journal" && (has(i.text) || (i.gratitude || []).some(has))) out.push([fmtDate.format(fromKey(i.date)) + (isMine(i) ? "" : ", " + i.ownerName), "Günlük", () => go("journal", isMine(i) ? { jDate: i.date, jOther: null } : { jOther: i.id })]);
    if (i.kind === "aff" && has(i.text)) out.push([i.text, "Olumlama", () => go("affirm", { affFilter: "Eklenenler" })]);
  });
  const dAll = affDay();
  for (let i = dAll; i >= 0; i--) { const x = affAt(i); if (has(x.text)) out.push([x.text, "Olumlama, " + x.cat, () => go("affirm", { affFilter: x.cat })]); }

  return out.slice(0, 8);
}


const searchIn = $("search");
const resultsEl = $("results");
searchIn.addEventListener("input", () => {
  const q = searchIn.value.trim();
  if (q.length < 2) { resultsEl.hidden = true; return; }
  const res = searchAll(q);
  resultsEl.replaceChildren(...(res.length
    ? res.map(([label, kind, fn]) => h("li", {}, h("button", { type: "button", onclick: () => { searchIn.value = ""; resultsEl.hidden = true; fn(); } }, label, h("small", { text: kind }))))
    : [h("li", { class: "empty", style: "padding:.5rem .7rem", text: "Sonuç bulunamadı." })]));
  resultsEl.hidden = false;
});
document.addEventListener("click", e => { if (!e.target.closest(".search")) resultsEl.hidden = true; });
searchIn.addEventListener("keydown", e => { if (e.key === "Escape") { searchIn.value = ""; resultsEl.hidden = true; } });

$("gsun").innerHTML = ico("sun", 44);
$("searchIco").innerHTML = ico("search", 18);
$("bellBtn").addEventListener("click", () => {
  const un = msgsIn.filter(m => !m.read).sort((a, b) => b.at - a.at);
  if (un.length) go("messages", { chatWith: un[0].from });
  else go("calendar", { sel: todayKey, calMonth: firstOfMonth(today) });
});
$("avatarBtn").addEventListener("click", () => go("settings"));


$("nav").append(...VIEWS.map(([v, label, icon]) =>
  h("button", { type: "button", "data-view": v, title: label, hidden: v === "admin", onclick: () => go(v) }, h("span", { html: ico(icon, 21), style: "display:grid" }), h("span", { class: "lbl", text: label }))
));
$("nav").append(h("button", { type: "button", class: "logout", title: "Çıkış yap", onclick: logout }, h("span", { html: ico("logout", 21), style: "display:grid" }), h("span", { class: "lbl", text: "Çıkış yap" })));

window.addEventListener("hashchange", () => { if (!me) return; const v = location.hash.slice(1); if (v !== state.view) go(v); });
setInterval(tick, 20000);

if (!FB_READY || typeof firebase === "undefined") {
  showLogin();
} else {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  auth.onAuthStateChanged(user => {
    if (user) startApp(user).catch(() => { loginNotice = "Veriler yüklenemedi. Firestore kurallarını ve internet bağlantını kontrol edip tekrar dene."; auth.signOut(); });
    else { me = null; showLogin(loginNotice); loginNotice = ""; }
  });
}
