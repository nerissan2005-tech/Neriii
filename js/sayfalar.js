function installCard() {
  const p = platformInfo();
  let hidden = false;
  try { hidden = localStorage.getItem("neriii-install-hint") === "1"; } catch (e) {}
  if (p.standalone || hidden || !(p.ios || p.android || installPrompt)) return null;
  const close = e => { try { localStorage.setItem("neriii-install-hint", "1"); } catch (ex) {} e.currentTarget.closest(".ios-hint").remove(); };
  return h("section", { class: "card ios-hint span-12", "data-install": "" },
    h("img", { src: "icons/icon.svg", alt: "", width: "56", height: "56" }),
    h("div", { style: "flex:1;min-width:0" },
      h("strong", { text: "Neriii'yi telefonuna indir ♡" }),
      h("p", { text: "Ana ekranında hayalet simgesiyle dursun, uygulama gibi tam ekran açılsın." }),
      h("button", { class: "btn primary small", type: "button", style: "margin-top:.6rem", onclick: installApp },
        h("span", { html: ico("download", 15), style: "display:inline-grid;vertical-align:-3px;margin-right:.35rem" }), "Uygulamayı indir")),
    h("button", { class: "icon-btn", type: "button", "aria-label": "Kapat", html: ico("x", 18), onclick: close })
  );
}

function renderHome() {
  const grid = h("div", { class: "grid" });
  const hint = installCard();
  if (hint) grid.append(hint);

  if (site.announcement) {
    grid.append(h("section", { class: "card announce span-12" },
      h("div", { class: "card-head" }, h("span", { class: "ci", html: ico("shield", 22) }), h("h2", { text: "Duyuru" }),
        h("span", { class: "tag", text: (site.byName || "Yönetici") + (site.at ? ", " + fmtShort.format(new Date(site.at)) : "") })),
      h("p", { class: "announce-text", text: site.announcement })
    ));
  }

  grid.append(h("section", { class: "hero span-9", html: HERO_SVG },
    h("div", { class: "hero-in" },
      h("p", { class: "hero-label", html: ico("star", 14) + "<span>Günün olumlaması</span>" }, catTag(todayAff().cat)),
      h("p", { class: "hero-text", text: affirmation() + " ♡" }),
      h("button", {
        class: "hero-copy", type: "button", text: "Kopyala",
        onclick: async e => {
          const b = e.currentTarget;
          try { await navigator.clipboard.writeText(affirmation()); b.textContent = "Kopyalandı"; }
          catch (err) { b.textContent = "Kopyalanamadı"; }
        }
      })
    )
  ));

  grid.append(card({
    title: "Bugünün Planı", icon: "calendar", span: "span-3",
    extra: h("span", { class: "tag", text: fmtShort.format(today) }),
    body: [
      checklist(plansOn(todayKey), { empty: "Bugün için henüz plan yok." }),
      addForm("plan-home", "Plana ekle", "plan", (t, v) => addItem("plan", { text: t, date: todayKey, done: false }, v))
    ]
  }));

  const notes = listOf("note").sort((a, b) => b.upd - a.upd).slice(0, 4);
  grid.append(card({
    title: "Notlarım", icon: "note", tint: "t-peach", span: "span-3", onAdd: newNote, more: ["Tüm notlar", "notes"], doodle: "leaf",
    body: [notes.length
      ? h("ul", { class: "links" }, notes.map(n => h("li", {}, h("button", { type: "button", onclick: () => go("notes", { noteId: n.id }) }, h("span", { text: n.title || "Başlıksız not" })))))
      : h("p", { class: "empty", text: "Aklına geleni yazmak için + simgesine dokun." })]
  }));

  const habits = listOf("habit").slice(0, 5);
  grid.append(card({
    title: "Alışkanlıklar", icon: "repeat", tint: "t-sage", span: "span-3", more: ["Tüm alışkanlıklar", "habits"], doodle: "sprout",
    onAdd: () => go("habits", { focus: "#add-habit" }),
    body: [habits.length
      ? h("ul", { class: "checks" }, habits.map(hb => {
          const on = !!doneOf(hb)[todayKey];
          const st = streakOf(hb);
          return h("li", { class: on ? "done" : "" },
            h("label", {},
              h("input", { type: "checkbox", checked: on, onchange: e => toggleHabit(hb, todayKey, e.target.checked) }),
              h("span", { text: hb.name })
            ),
            st ? h("span", { class: "streak", text: st + " gün" }) : null
          );
        }))
      : h("p", { class: "empty", text: "Her gün yapmak istediğin bir şey ekle." })]
  }));

  const dIdx = affDay();
  const past = [];
  for (let i = dIdx - 1; i >= 0 && past.length < 4; i--) past.push(affAt(i));
  grid.append(card({
    title: "Olumlamalarım", icon: "star", tint: "t-lilac", span: "span-3", more: ["Tüm olumlamalar", "affirm"], doodle: "moon",
    onAdd: () => go("affirm", { focus: "#myAffText" }),
    body: [past.length
      ? h("ul", { class: "links" }, past.map(x => h("li", {}, h("button", { type: "button", onclick: () => go("affirm") }, h("span", { text: x.text })))))
      : h("p", { class: "empty", text: "Her gün yeni bir olumlama açılır. Önceki günlerin olumlamaları burada birikecek." })]
  }));

  grid.append(h("section", { class: "art span-3", html: ART_SVG }, h("p", { text: softNote() })));

  const goals = listOf("goal").slice(0, 4);
  grid.append(card({
    title: "Hedeflerim", icon: "target", tint: "t-blush", span: "span-3", more: ["Tüm hedefler", "goals"], doodle: "flag",
    onAdd: () => go("goals", { focus: "#goalText" }),
    body: [goals.length
      ? h("div", {}, goals.map(g => h("div", { class: "goal" },
          h("div", { class: "goal-top" }, h("span", { text: g.text }), h("span", { text: "%" + (g.progress || 0) })),
          h("div", { class: "bar" }, h("i", { style: "width:" + (g.progress || 0) + "%" }))
        )))
      : h("p", { class: "empty", text: "Ulaşmak istediğin ilk hedefi ekle." })]
  }));

  grid.append(card({ title: "Takvim", icon: "calendar", span: "span-3", more: ["Tüm etkinlikler", "calendar"], body: [monthGrid(false)] }));

  grid.append(card({
    title: "Alışveriş Listesi", icon: "cart", span: "span-3", more: ["Tüm liste", "shopping"], doodle: "basket",
    onAdd: focusAdd("shop-home"),
    body: [
      checklist(listOf("shop").slice(0, 6), { empty: "Liste boş." }),
      addForm("shop-home", "Listeye ekle", "shop", (t, v) => addItem("shop", { text: t, done: false }, v))
    ]
  }));

  const weatherBox = h("div", {});
  grid.append(h("div", { class: "stack span-3" },
    h("section", { class: "card" }, weatherBox),
    card({ title: "Bugün nasılsın?", icon: "heart", body: [moodPicker(todayKey)], more: ["Günlüğe yaz", "journal"] })
  ));
  loadWeather(weatherBox);

  const ideas = h("section", { class: "ideas" },
    h("h2", { text: "Daha fazlası için öneriler" }),
    h("div", { class: "ideas-wrap" },
      h("p", { class: "ideas-hand", html: "Senin için<br>küçük fikirler ♡<svg viewBox=\"0 0 60 40\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"><path d=\"M6 6 C 10 26 26 34 52 30 M44 22 L52 30 L42 36\"/></svg>" }),
      h("div", { class: "tiles" }, TILES.map(([v, title, desc, icon, color]) =>
        h("button", { class: "tile", type: "button", onclick: () => go(v) },
          h("span", { class: "tile-ic", style: "background:" + color, html: ico(icon, 22) }),
          h("h3", { text: title }),
          h("p", { text: desc })
        )
      ))
    )
  );
  return h("div", {}, grid, ideas);
}

function newNote() {
  const id = addItem("note", { title: "", body: "" }, getVis("note"));
  go("notes", { noteId: id, focus: "#noteTitle" });
}

function renderNotes() {
  const notes = listOf("note").sort((a, b) => b.upd - a.upd);
  if (!notes.some(n => n.id === state.noteId)) state.noteId = notes[0] ? notes[0].id : null;
  const cur = notes.find(n => n.id === state.noteId);
  let activeTitle = null;

  const list = h("section", { class: "card t-peach" },
    h("button", { class: "btn primary", type: "button", text: "Yeni not", onclick: newNote }),
    h("div", { style: "margin:.4rem 0 .9rem" }, visPicker("note")),
    notes.length ? notes.map(n => {
      const strong = h("strong", { text: n.title || "Başlıksız not" });
      if (n.id === state.noteId) activeTitle = strong;
      return h("button", { type: "button", class: "item-btn", style: n.id === state.noteId ? "background:#fff" : null, onclick: () => { state.noteId = n.id; render(); } },
        strong, h("span", { class: "item-sub" }, fmtShort.format(new Date(n.upd || n.at)), whoTag(n)));
    }) : h("p", { class: "empty", text: "Henüz not yok." })
  );

  let editor;
  if (cur) {
    const status = h("span", { class: "status", text: "Son düzenleme: " + fmtShort.format(new Date(cur.upd || cur.at)) + " " + fmtTime.format(new Date(cur.upd || cur.at)) + (cur.updName && cur.updName !== me.name ? ", " + cur.updName : "") });
    let st;
    const saving = () => { status.textContent = "Kaydediliyor…"; clearTimeout(st); st = setTimeout(() => { status.textContent = "Kaydedildi"; }, 900); };
    editor = h("section", { class: "card" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:.4rem" },
        isMine(cur) ? itemVis(cur) : h("span", { class: "who" }, h("span", { html: ico("users", 12), style: "display:grid" }), cur.ownerName + " paylaştı"),
        status),
      h("input", { class: "big-title live", id: "noteTitle", type: "text", value: cur.title || "", placeholder: "Başlık", "aria-label": "Not başlığı",
        oninput: e => { updItem(cur, { title: e.target.value }, true); if (activeTitle) activeTitle.textContent = e.target.value || "Başlıksız not"; saving(); } }),
      h("textarea", { class: "bare live", id: "noteBody", placeholder: "Yazmaya başla…", "aria-label": "Not içeriği",
        oninput: e => { updItem(cur, { body: e.target.value }, true); saving(); } }, cur.body || ""),
      canDel(cur) ? h("div", { class: "row", style: "justify-content:flex-end;margin-top:1rem" },
        h("button", { class: "btn danger", type: "button", text: "Notu sil", onclick: () => { delItem(cur, "Bu not silinsin mi?"); state.noteId = null; } })) : null
    );
  } else {
    editor = h("section", { class: "card" }, h("p", { class: "empty", text: "Bir not seç ya da yeni bir not oluştur." }));
  }
  return h("div", {}, pageHead("Notlar", "Fikirlerin, listelerin, aklına gelen her şey. Her not için kimlerin göreceğini sen seçersin."), h("div", { class: "split" }, list, editor));
}

function renderAffirm() {
  const d = affDay();
  const t = todayAff();
  const fav = isFav(t.text);
  const top = h("section", { class: "aff-hero" },
    h("div", { class: "aff-top" }, catTag(t.cat), h("span", { class: "aff-count", text: fmtLong.format(today) })),
    h("p", { class: "aff-big", text: t.text }),
    h("div", { class: "row", style: "position:relative" },
      h("button", { class: "btn light", type: "button", text: "Kopyala", onclick: async e => {
        const b = e.currentTarget;
        try { await navigator.clipboard.writeText(t.text); b.textContent = "Kopyalandı"; } catch (err) { b.textContent = "Kopyalanamadı"; }
      } }),
      h("button", { class: "btn light", type: "button", "aria-pressed": fav ? "true" : "false", onclick: () => toggleFav(t.text) },
        h("span", { html: ico("heart", 16), style: "display:grid" }), fav ? "Favorilerimde" : "Favorilere ekle")
    ),
    h("p", { class: "aff-note", text: "Yolculuğunun " + (d + 1) + ". günü. Her gün yeni bir olumlama açılır ve " + AFF_CYCLE + " gün boyunca hiçbiri tekrar etmez." })
  );

  const items = [];
  for (let i = d; i >= 0; i--) items.push(affAt(i));
  listOf("aff").forEach(m => items.push({ cat: m.cat, text: m.text, date: fromKey(m.date), item: m }));
  items.sort((a, b) => b.date - a.date || (b.item ? 1 : 0) - (a.item ? 1 : 0));

  const filters = ["Tümü"].concat(AFF_CATS, ["Favoriler", "Eklenenler"]);
  const match = (f, x) => f === "Tümü" || (f === "Favoriler" ? isFav(x.text) : f === "Eklenenler" ? !!x.item : x.cat === f);
  const f = filters.includes(state.affFilter) ? state.affFilter : "Tümü";
  const shown = items.filter(x => match(f, x));

  const chips = h("div", { class: "chips" }, filters.map(x =>
    h("button", { type: "button", "aria-pressed": x === f ? "true" : "false", onclick: () => { state.affFilter = x; render(); } },
      x, h("small", { text: String(items.filter(y => match(x, y)).length) }))
  ));

  const list = shown.length ? h("ul", { class: "aff-list" }, shown.map(x => h("li", {},
    h("div", { style: "flex:1;min-width:0" },
      h("p", { text: x.text }),
      h("div", { class: "aff-meta" }, catTag(x.cat), h("span", { text: fmtDate.format(x.date) }), x.item ? (whoTag(x.item) || h("span", { text: "Kişisel" })) : null)
    ),
    h("button", { class: "fav" + (isFav(x.text) ? " on" : ""), type: "button", "aria-pressed": isFav(x.text) ? "true" : "false",
      "aria-label": isFav(x.text) ? "Favorilerden çıkar" : "Favorilere ekle", html: ico("heart", 19), onclick: () => toggleFav(x.text) }),
    x.item ? visBtn(x.item) : null,
    x.item ? delBtn(x.item, "Olumlama", "Bu olumlama silinsin mi?") : null
  ))) : h("p", { class: "empty", text: f === "Favoriler" ? "Kalp simgesine dokunduğun olumlamalar burada toplanır."
    : f === "Eklenenler" ? "Sağdaki alandan kendi olumlamanı yazabilirsin."
    : "Bu kategoride henüz açılmış olumlama yok. Her gün yenisi geliyor." });

  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const text = $("myAffText").value.trim();
    if (!text) return;
    addItem("aff", { text, cat: $("myAffCat").value, date: todayKey }, getVis("aff"));
    $("myAffText").value = "";
    state.affFilter = "Eklenenler";
  } },
    h("textarea", { id: "myAffText", rows: "4", placeholder: "Örn. Bugün kendime güveniyorum.", "aria-label": "Olumlama" }),
    h("div", { class: "row", style: "margin-top:.75rem" },
      h("select", { id: "myAffCat", "aria-label": "Kategori" }, AFF_CATS.map(c => h("option", { text: c }))),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })
    ),
    visPicker("aff")
  );

  return h("div", {},
    pageHead("Olumlamalar", "Aşk, bolluk, şükür, özgüven, sağlık, huzur ve başarı üzerine her gün yeni bir olumlama."),
    top,
    h("div", { class: "grid" },
      h("section", { class: "card span-8" }, h("div", { class: "card-head" }, h("h2", { text: "Açılan olumlamalar" })), chips, list),
      card({ title: "Kendi olumlamanı yaz", span: "span-4", tint: "t-lilac", doodle: "moon", body: [form] })
    )
  );
}

function renderGoals() {
  const goals = listOf("goal");
  const done = goals.filter(g => (g.progress || 0) >= 100).length;
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const t = $("goalText").value.trim();
    if (!t) return;
    addItem("goal", { text: t, area: $("goalArea").value, progress: 0 }, getVis("goal"));
    $("goalText").value = "";
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "goalText", type: "text", placeholder: "Yeni bir hedef yaz", "aria-label": "Hedef", autocomplete: "off" }),
      h("select", { id: "goalArea", "aria-label": "Alan" }, AREAS.map(a => h("option", { text: a }))),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })
    ),
    visPicker("goal")
  );
  const rows = goals.map(g => {
    const pct = h("span", { class: "pct", text: "%" + (g.progress || 0) });
    return h("div", { class: "goal-row" },
      h("div", { class: "row", style: "gap:.5rem" }, h("strong", { text: g.text }), h("span", { class: "tag", text: g.area }), whoTag(g)),
      h("div", { class: "row", style: "gap:.1rem" }, visBtn(g), delBtn(g, g.text, "\"" + g.text + "\" silinsin mi?")),
      h("input", { class: "live", id: "gp-" + g.id, type: "range", min: "0", max: "100", step: "5", value: String(g.progress || 0), "aria-label": g.text + " ilerleme",
        oninput: e => { pct.textContent = "%" + e.target.value; updItem(g, { progress: Number(e.target.value) }, true); },
        onchange: () => flushItem(g.id) }),
      pct
    );
  });
  return h("div", {},
    pageHead("Hedefler", goals.length ? goals.length + " hedef var, " + done + " tanesi tamamlandı." : "Ulaşmak istediğin şeyleri yaz, ilerledikçe çubuğu kaydır."),
    h("section", { class: "card t-blush" }, doodle("flag"), form, rows.length ? h("div", { style: "margin-top:.75rem;position:relative" }, rows) : h("p", { class: "empty", style: "margin-top:1rem", text: "Henüz hedef yok." }))
  );
}

function renderHabits() {
  const habits = listOf("habit");
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  const body = !habits.length
    ? h("p", { class: "empty", style: "margin-top:1rem", text: "Henüz alışkanlık yok. Yukarıdan ilkini ekle." })
    : h("div", { class: "table-wrap", style: "margin-top:1rem" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", { text: "Alışkanlık" }), days.map(d => h("th", { text: fmtWd.format(d) })), h("th", { text: "Seri" }), h("th"))),
      h("tbody", {}, habits.map(hb => {
        const done = doneOf(hb);
        return h("tr", {},
          h("td", {}, h("div", { class: "row", style: "gap:.4rem" }, h("span", { text: hb.name }), whoTag(hb))),
          days.map(d => {
            const k = keyOf(d);
            return h("td", {}, h("input", { type: "checkbox", checked: !!done[k], "aria-label": hb.name + ", " + fmtLong.format(d), onchange: e => toggleHabit(hb, k, e.target.checked) }));
          }),
          h("td", {}, h("span", { class: "streak", text: streakOf(hb) + " gün" })),
          h("td", {}, h("div", { class: "row", style: "gap:.1rem;flex-wrap:nowrap" }, visBtn(hb), delBtn(hb, hb.name, "\"" + hb.name + "\" silinsin mi?")))
        );
      }))
    ));
  return h("div", {},
    pageHead("Alışkanlıklar", "Her gün yapmak istediklerin. Paylaşılan alışkanlıklarda herkes kendi günlerini işaretler."),
    h("section", { class: "card t-sage" }, addForm("habit", "Örn. 10 dakika meditasyon", "habit", (t, v) => addItem("habit", { name: t, done: {} }, v)), body)
  );
}

function renderCalendar() {
  const sel = fromKey(state.sel);
  return h("div", {},
    pageHead("Takvim", "Bir güne dokun, o günün planını gör ve düzenle."),
    h("div", { class: "grid" },
      h("section", { class: "card span-7" }, monthGrid(true)),
      card({
        title: fmtLong.format(sel), span: "span-5", tint: "t-peach", doodle: "leaf",
        body: [
          checklist(plansOn(state.sel), { empty: "Bu gün için plan yok." }),
          addForm("plan-day", "Bu güne ekle", "plan", (t, v) => addItem("plan", { text: t, date: state.sel, done: false }, v))
        ]
      })
    )
  );
}

function renderShopping() {
  const items = listOf("shop");
  const doneMine = items.filter(i => i.done && canDel(i));
  return h("div", {},
    pageHead("Alışveriş Listesi", "Aldıklarını işaretle, bitince temizle."),
    h("section", { class: "card t-lilac", style: "max-width:42rem" },
      doodle("basket"),
      addForm("shop", "Listeye ekle", "shop", (t, v) => addItem("shop", { text: t, done: false }, v)),
      h("div", { style: "margin-top:.75rem;position:relative" }, checklist(items, { empty: "Liste boş." })),
      doneMine.length ? h("button", { class: "btn", type: "button", style: "margin-top:1rem;align-self:flex-start;position:relative", text: "Alınanları temizle (" + doneMine.length + ")",
        onclick: async () => { if (await ask({ title: "Alınanlar temizlensin mi?", text: "İşaretlenen " + doneMine.length + " ürün listeden kaldırılacak.", ok: "Temizle", icon: "cart" })) doneMine.forEach(i => delItem(i)); } }) : null
    )
  );
}

function toggleAmin(it) {
  const F = firebase.firestore;
  const on = !!((it.amins || {})[me.uid]);
  itemsCol().doc(it.id).update(new F.FieldPath("amins", me.uid), on ? F.FieldValue.delete() : Date.now(), "upd", Date.now()).catch(writeFail);
}

function prayedToday() {
  data.prayed = data.prayed || {};
  return data.prayed[todayKey] || [];
}
function togglePrayed(id) {
  const list = prayedToday().slice();
  const i = list.indexOf(id);
  if (i > -1) list.splice(i, 1); else list.push(id);
  data.prayed = { [todayKey]: list };
  save();
  render();
}

function builtinPrayers() {
  const done = prayedToday();
  const open = state.mealOpen || {};
  return h("section", { class: "builtin" },
    h("div", { class: "builtin-head" },
      h("h3", { text: "Sureler ve dualar" }),
      h("span", { class: "tag", text: "Bugün " + done.filter(id => BUILTIN_PRAYERS.some(p => p.id === id)).length + " / " + BUILTIN_PRAYERS.length + " okundu" })),
    h("div", { class: "prayer-list" }, BUILTIN_PRAYERS.map(p => {
      const read = done.includes(p.id);
      return h("article", { class: "prayer builtin-card" + (read ? " read" : ""), id: "dua-" + p.id },
        h("div", { class: "prayer-head" },
          h("span", { class: "prayer-ic", html: ico("moon", 18) }),
          h("div", { style: "flex:1;min-width:0" }, h("h3", { text: p.title }), h("span", { class: "tag", text: p.sub })),
          h("span", { class: "who mine", text: p.kind })),
        h("div", { class: "okunus" }, p.lines.map(l => h("p", { text: l }))),
        open[p.id] ? h("p", { class: "meal", text: p.meal }) : null,
        h("div", { class: "prayer-foot" },
          h("button", { class: "amin" + (read ? " on" : ""), type: "button", "aria-pressed": read ? "true" : "false", onclick: () => togglePrayed(p.id) }, read ? "✓ Bugün okudum" : "🤲 Okudum"),
          h("button", { class: "more", type: "button", style: "margin:0;padding:0", text: open[p.id] ? "Anlamını gizle" : "Anlamını göster",
            onclick: () => { state.mealOpen = Object.assign({}, open, { [p.id]: !open[p.id] }); render(); } }))
      );
    }))
  );
}

function renderPrayers() {
  const all = listOf("prayer").sort((a, b) => (b.at || 0) - (a.at || 0));
  const f = state.prayerCat || "Tümü";
  const shown = all.filter(p => f === "Tümü" || p.cat === f);
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const title = $("prTitle").value.trim(), text = $("prText").value.trim();
    if (!title && !text) return;
    addItem("prayer", { title: title || "Dua", text, cat: $("prCat").value, amins: {} }, getVis("prayer"));
    $("prTitle").value = ""; $("prText").value = "";
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "prTitle", type: "text", placeholder: "Duanın adı, örn. Sabah duası", "aria-label": "Duanın adı", autocomplete: "off" }),
      h("select", { id: "prCat", "aria-label": "Kategori" }, PRAYER_CATS.map(c => h("option", { text: c })))),
    h("textarea", { id: "prText", rows: "4", style: "margin-top:.6rem", placeholder: "Duanı buraya yaz…", "aria-label": "Dua" }),
    h("div", { class: "row", style: "justify-content:space-between;align-items:flex-start;margin-top:.4rem" },
      visPicker("prayer"),
      h("button", { class: "btn primary", type: "submit", style: "margin-top:.5rem", text: "Duayı ekle" }))
  );

  const cats = ["Tümü"].concat(PRAYER_CATS.filter(c => all.some(p => p.cat === c)));
  const chips = cats.length > 2 ? h("div", { class: "chips" }, cats.map(c =>
    h("button", { type: "button", "aria-pressed": c === f ? "true" : "false", onclick: () => { state.prayerCat = c; render(); } }, c,
      h("small", { text: String(c === "Tümü" ? all.length : all.filter(p => p.cat === c).length) })))) : null;

  const cardsEl = shown.length ? h("div", { class: "prayer-list" }, shown.map(p => {
    const amins = Object.keys(p.amins || {});
    const mineAmin = amins.includes(me.uid);
    const editing = state.prayerEdit === p.id && isMine(p);
    return h("article", { class: "prayer" },
      h("div", { class: "prayer-head" },
        h("span", { class: "prayer-ic", html: ico("moon", 18) }),
        editing
          ? h("input", { class: "field live", id: "pe-t-" + p.id, value: p.title || "", "aria-label": "Duanın adı", oninput: e => updItem(p, { title: e.target.value }, true) })
          : h("h3", { text: p.title || "Dua" }),
        h("span", { class: "tag", text: p.cat || "" }),
        whoTag(p), visBtn(p),
        isMine(p) ? h("button", { class: "icon-btn sm", type: "button", "aria-label": editing ? "Düzenlemeyi bitir" : "Düzenle", html: ico(editing ? "check" : "note", 16),
          onclick: () => { flushItems(); state.prayerEdit = editing ? null : p.id; state.focus = editing ? null : "#pe-x-" + p.id; render(); } }) : null,
        delBtn(p, p.title, "Bu dua silinsin mi?")),
      editing
        ? h("textarea", { class: "live", id: "pe-x-" + p.id, rows: "5", "aria-label": "Dua", oninput: e => updItem(p, { text: e.target.value }, true) }, p.text || "")
        : p.text ? h("p", { class: "prayer-text", text: p.text }) : null,
      h("div", { class: "prayer-foot" },
        h("button", { class: "amin" + (mineAmin ? " on" : ""), type: "button", "aria-pressed": mineAmin ? "true" : "false", onclick: () => toggleAmin(p) }, "🤲 ", mineAmin ? "Amin dedin" : "Amin"),
        amins.length ? h("span", { class: "tag", title: amins.map(u => u === me.uid ? me.name : nameOfUid(u)).join(", "),
          text: amins.length === 1 && mineAmin ? "Sen amin dedin" : amins.length + " kişi amin dedi" }) : null)
    );
  })) : h("p", { class: "empty", text: all.length ? "Bu kategoride dua yok." : "Henüz dua eklenmedi. İlk duayı sen yaz ♡" });

  return h("div", {},
    pageHead("Dualarımız", "Sureleri ve duaları oku, kendi dualarını yaz, istersen sevdiklerinle paylaş ve birlikte amin deyin."),
    builtinPrayers(),
    h("h3", { class: "section-title", text: "Bizim dualarımız" }),
    h("div", { class: "grid" },
      h("section", { class: "card span-12 t-sage" }, doodle("moon"), form)),
    h("div", { style: "margin-top:1.25rem" }, chips, cardsEl)
  );
}

function renderBooks() {
  const books = listOf("book");
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const t = $("bookTitle").value.trim();
    if (!t) return;
    addItem("book", { title: t, author: $("bookAuthor").value.trim(), status: "Okunacak" }, getVis("book"));
    $("bookTitle").value = ""; $("bookAuthor").value = "";
    $("bookTitle").focus();
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "bookTitle", type: "text", placeholder: "Kitap adı", "aria-label": "Kitap adı", autocomplete: "off" }),
      h("input", { class: "field", id: "bookAuthor", type: "text", placeholder: "Yazar", "aria-label": "Yazar", autocomplete: "off" }),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })
    ),
    visPicker("book")
  );
  const tints = { "Okunacak": "t-peach", "Okunuyor": "t-sage", "Bitti": "t-lilac" };
  const cols = BOOK_STATUSES.map(s => {
    const items = books.filter(b => b.status === s);
    return card({
      title: s + " (" + items.length + ")", span: "span-4", tint: tints[s],
      body: [items.length ? h("ul", { class: "checks" }, items.map(b => h("li", {},
        h("div", { style: "flex:1;min-width:0;padding:.4rem 0" }, h("div", { text: b.title }), h("div", { class: "row", style: "gap:.4rem" }, b.author ? h("span", { class: "tag", text: b.author }) : null, whoTag(b))),
        h("select", { "aria-label": b.title + " durumu", style: "padding:.3rem .5rem;font-size:.8rem", onchange: e => updItem(b, { status: e.target.value }) },
          BOOK_STATUSES.map(x => h("option", { text: x, selected: x === b.status }))),
        visBtn(b), delBtn(b, b.title)
      ))) : h("p", { class: "empty", text: "Boş." })]
    });
  });
  return h("div", {},
    pageHead("Okuma Listesi", "Okumak istediklerin, okuduğun ve bitirdiklerin."),
    h("section", { class: "card", style: "margin-bottom:1.25rem" }, form),
    h("div", { class: "grid" }, cols)
  );
}


let weatherCache = null;
async function loadWeather(box) {
  const paint = () => box.replaceChildren(h("div", { class: "weather" },
    h("span", { class: "ws", html: ico("sun", 48) }),
    h("div", {},
      h("div", { class: "wcity", text: weatherCache.name }),
      h("div", { class: "wtemp", text: weatherCache.temp + "°C" }),
      h("div", { text: WEATHER[weatherCache.code] || "" })
    )
  ));
  if (!data.city) {
    box.replaceChildren(h("div", { class: "weather" },
      h("span", { class: "ws", html: ico("sun", 48) }),
      h("div", {}, h("p", { class: "empty", text: "Hava durumu için şehrini ekle." }),
        h("button", { class: "more", type: "button", style: "padding-top:.2rem", text: "Ayarlar", onclick: () => go("settings", { focus: "#setCity" }) }))
    ));
    return;
  }
  if (weatherCache && weatherCache.city === data.city) return paint();
  box.replaceChildren(h("p", { class: "empty", text: "Hava durumu yükleniyor…" }));
  try {
    const g = await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=tr&name=" + encodeURIComponent(data.city))).json();
    if (!g.results || !g.results.length) throw new Error("bulunamadı");
    const r = g.results[0];
    const w = await (await fetch("https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&timezone=auto&latitude=" + r.latitude + "&longitude=" + r.longitude)).json();
    weatherCache = { city: data.city, name: r.name, temp: Math.round(w.current.temperature_2m), code: w.current.weather_code };
    paint();
  } catch (e) {
    box.replaceChildren(h("p", { class: "empty", text: "Hava durumu alınamadı. Ayarlar'daki şehir adını kontrol et." }));
  }
}

function renderJournal() {
  const k = state.jDate;
  const j = journalOf(k);
  const status = h("span", { class: "status" });
  let timer;
  const saving = () => { status.textContent = "Kaydediliyor…"; clearTimeout(timer); timer = setTimeout(() => { status.textContent = "Kaydedildi"; }, 900); };
  const filled = e => (e.text || "").trim() || e.mood || (e.gratitude || []).some(g => (g || "").trim());
  const entries = listOf("journal").filter(filled).sort((a, b) => b.date.localeCompare(a.date) || (isMine(b) ? 1 : 0) - (isMine(a) ? 1 : 0));
  const other = state.jOther ? entries.find(e => e.id === state.jOther && !isMine(e)) : null;

  let main;
  if (other) {
    main = h("section", { class: "card span-8 t-lilac" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:1rem" },
        h("div", {}, h("strong", { text: other.ownerName + " adlı kişinin günlüğü" }), h("div", { class: "tag", text: fmtLong.format(fromKey(other.date)) })),
        h("button", { class: "btn small", type: "button", text: "Kendi günlüğüme dön", onclick: () => { state.jOther = null; render(); } })),
      other.mood ? h("p", { text: "Ruh hali: " + ((MOODS.find(x => x[0] === other.mood) || ["", ""])[1]) + " " + other.mood }) : null,
      (other.gratitude || []).some(g => (g || "").trim()) ? h("div", {}, h("h3", { style: "margin:1rem 0 .4rem;font-size:1rem", text: "Şükrettiği şeyler" }),
        h("ul", {}, other.gratitude.filter(g => (g || "").trim()).map(g => h("li", { text: g })))) : null,
      other.text ? h("div", {}, h("h3", { style: "margin:1rem 0 .4rem;font-size:1rem", text: "Aklındakiler" }), h("p", { style: "white-space:pre-wrap;margin:0", text: other.text })) : null
    );
  } else {
    main = h("section", { class: "card span-8" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:1rem" },
        h("input", { class: "field", type: "date", value: k, max: todayKey, style: "flex:none", "aria-label": "Tarih",
          onchange: e => { state.jDate = e.target.value || todayKey; render(); } }),
        status
      ),
      h("div", { style: "margin-bottom:1rem" }, j ? itemVis(j) : visPicker("journal")),
      h("h3", { style: "margin:.25rem 0 .6rem;font-size:1rem", text: "Nasıl hissediyorsun?" }),
      moodPicker(k),
      h("h3", { style: "margin:1.5rem 0 .6rem;font-size:1rem", text: "Şükrettiğim üç şey" }),
      h("div", { class: "gratitude" }, [0, 1, 2].map(i =>
        h("input", { class: "field live", id: "gr-" + i, type: "text", value: j ? (j.gratitude || [])[i] || "" : "", placeholder: (i + 1) + ". şey", "aria-label": "Şükran " + (i + 1), autocomplete: "off",
          oninput: e => { const it = ensureJournal(k); const g = (it.gratitude || ["", "", ""]).slice(); g[i] = e.target.value; updItem(it, { gratitude: g }, true); saving(); } })
      )),
      h("h3", { style: "margin:1.5rem 0 .6rem;font-size:1rem", text: "Bugün aklımda" }),
      h("textarea", { class: "live", id: "jText", rows: "9", placeholder: "Yazmaya başla…", "aria-label": "Günlük yazısı",
        oninput: e => { updItem(ensureJournal(k), { text: e.target.value }, true); saving(); } }, j ? j.text || "" : ""),
      j && canDel(j) && filled(j) ? h("div", { class: "row", style: "justify-content:flex-end;margin-top:1rem" },
        h("button", { class: "btn danger", type: "button", text: "Bu günü sil", onclick: () => delItem(j, "Bu günün günlüğü silinsin mi?") })) : null
    );
  }

  return h("div", {},
    pageHead("Günlük", "Ruh halin, şükrettiklerin ve aklından geçenler. Her günü kişisel ya da herkese açık kaydedebilirsin."),
    h("div", { class: "grid" },
      main,
      card({
        title: "Önceki günler", span: "span-4", tint: "t-blush",
        body: [entries.length ? h("div", {}, entries.map(e => {
          const preview = (e.text || "").trim() || (e.gratitude || []).filter(g => (g || "").trim()).join(", ") || "";
          const mine = isMine(e);
          return h("button", { class: "entry", type: "button", onclick: () => { if (mine) { state.jDate = e.date; state.jOther = null; } else state.jOther = e.id; render(); } },
            h("small", { class: "item-sub" }, fmtDate.format(fromKey(e.date)) + (e.mood ? ", " + e.mood : ""), whoTag(e)),
            preview.length > 70 ? preview.slice(0, 70) + "…" : preview
          );
        })) : h("p", { class: "empty", text: "Yazdıkların burada birikecek." })]
      })
    )
  );
}
