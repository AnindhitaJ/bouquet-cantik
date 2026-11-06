let settings = {}, areas = [], cur = null, last = null, prods = [], cats = [], cat = -1, q = "", sort = "new", promo = "", selArea = "", cart = JSON.parse(localStorage.getItem("cart") || "[]");
const save = () => { localStorage.setItem("cart", JSON.stringify(cart)); const n = cart.reduce((s, i) => s + i.qty, 0); $("cnt").textContent = n; $("cnt").hidden = !n; };
const sub = () => cart.reduce((x, i) => x + i.unit * i.qty, 0);
const OCC = { "Ulang tahun": "Selamat ulang tahun! Semoga selalu bahagia dan sehat.", "Anniversary": "Selamat anniversary. Terima kasih sudah menemani sampai hari ini.", "Romantis": "Untukmu yang selalu di hati.", "Selamat": "Selamat atas pencapaianmu! Kami ikut bangga.", "Wisuda": "Selamat wisuda! Semoga ilmunya berkah dan sukses selalu.", "Duka cita": "Turut berduka cita. Semoga keluarga diberi kekuatan dan ketabahan." };
async function boot() {
  const [s, a] = await Promise.all([db.from("settings").select().maybeSingle(), db.from("areas").select().eq("active", true).order("name")]);
  settings = s.data || {}; areas = a.data || [];
  if (settings.whatsapp) { $("wa").href = "https://wa.me/" + settings.whatsapp; $("wa").hidden = false; $("wa2").href = "https://wa.me/" + settings.whatsapp + "?text=" + encodeURIComponent("Halo kak Vita, saya mau tanya ketersediaan dan ongkir pengiriman ke area ..."); $("wa2").hidden = false; }
  save(); route();
}
async function route() {
  clearInterval(bnTimer); const h = location.hash.slice(1); $("seo").hidden = !!h; document.body.classList.remove("s");
  $("app").innerHTML = '<p class="mut">Memuat…</p>';
  $("app").innerHTML = h.startsWith("p-") ? await detail(h.slice(2)) : h == "pesanan" ? pesananView() : h == "keranjang" ? cartView() : h == "checkout" ? checkout() : h == "selesai" && last ? done() : await home();
  scrollTo(0, 0); if (h == "checkout") upd(); if (h == "keranjang") updCart(); if (!h) { setBand(); initSlider(); }
}
const ico = (c) => /wisuda/i.test(c) ? "🎓" : /romant|anniv|valent/i.test(c) ? "💖" : /ulang|birth/i.test(c) ? "🎂" : /duka|bela/i.test(c) ? "🕊️" : "💐";
const thumb = (c) => { const p = prods.find((x) => x.category == c && x.image_url); return p ? `<img src="${esc(p.image_url)}" alt="">` : ico(c); };
const pimgs = (p) => p.images?.length ? p.images : (p.image_url ? [p.image_url] : []);
const priceHtml = (p) => p.compare_price > p.price ? `<s class="was">${rp(p.compare_price)}</s><b class="pr">${rp(p.price)}</b><span class="off">${Math.round((1 - p.price / p.compare_price) * 100)}%</span>` : `<b class="pr">${rp(p.price)}</b>`;
const gallery = (p) => { const a = pimgs(p); return a.length ? `<div class="gal">${a.length > 1 ? `<div class="thumbs-v">${a.map((u, i) => `<button type="button" class="th${i ? "" : " on"}" onclick="showImg(${i})" aria-label="Foto ${i + 1}"><img src="${esc(u)}" alt=""></button>`).join("")}</div>` : ""}<div class="gmain"><img id="gm" src="${esc(a[0])}" alt="${esc(p.name)}"></div></div>` : '<div class="gal"><div class="gmain"><div class="ph">💐</div></div></div>'; };
const showImg = (i) => { $("gm").src = pimgs(cur.p)[i]; document.querySelectorAll(".th").forEach((b, j) => b.classList.toggle("on", j == i)); };
const card = (p) => `<a class="card" href="#p-${p.id}"><div class="ph-wrap">${imgTag(p)}</div><div class="meta"><span class="cn">${esc(p.name)}</span><div class="pw">${priceHtml(p)}</div><span class="cta">Lihat detail</span></div></a>`;
function lst() {
  let l = prods.filter((p) => (cat < 0 || p.category == cats[cat]) && (p.name + " " + (p.category || "")).toLowerCase().includes(q.toLowerCase()));
  if (sort == "lo") l = [...l].sort((a, b) => a.price - b.price); if (sort == "hi") l = [...l].sort((a, b) => b.price - a.price);
  return l;
}
const waBtn = () => settings.whatsapp ? `<a class="btn" href="https://wa.me/${settings.whatsapp}" target="_blank" rel="noopener">Hubungi via WhatsApp</a>` : "";
const gridHtml = () => lst().map(card).join("") || `<div class="empty"><p>${prods.length ? "Buket yang kamu cari belum ditemukan. Coba gunakan kata kunci lain atau hubungi kami untuk mendapatkan rekomendasi." : "Belum ada buket yang tersedia saat ini. Yuk, hubungi kami melalui WhatsApp untuk melihat pilihan buket yang bisa kamu pesan."}</p>${waBtn()}</div>`;
const catsHtml = () => [["Semua", -1], ...cats.map((c, i) => [c, i])].map(([l, n]) => `<button class="cat${n == cat ? " on" : ""}" onclick="setCat(${n})"><span class="ico">${n < 0 ? (prods.find((p) => p.image_url) ? thumb(prods.find((p) => p.image_url).category) : "💐") : thumb(l)}</span>${esc(l)}</button>`).join("");
function paint() { if ($("grid")) { $("cats").innerHTML = catsHtml(); $("grid").innerHTML = gridHtml(); $("cn").textContent = lst().length + " buket"; } }
function setCat(n) { cat = n; paint(); }
function setQ(v) { q = v; if (location.hash.length > 1) location.hash = ""; else paint(); }
const setBand = () => { const a = prods.filter((p) => p.image_url), b = a[1] || a[0]; if (b && $("band-art")) $("band-art").innerHTML = `<img src="${esc(b.image_url)}" alt="" loading="lazy">`; };
let bnTimer = null;
const sliderHtml = (bs) => bs.length ? `<div class="bn" role="region" aria-roledescription="carousel" aria-label="Banner"><div class="bn-track" id="bnt">${bs.map((b, i) => { const ok = b.product_id && prods.some((p) => p.id == b.product_id); const inner = `<img src="${esc(b.image_url)}" alt="${esc(b.title || "Banner")}"${i ? ' loading="lazy"' : ""}>${b.title || b.subtitle ? `<div class="bn-txt">${b.title ? `<b>${esc(b.title)}</b>` : ""}${b.subtitle ? `<span>${esc(b.subtitle)}</span>` : ""}</div>` : ""}`; return ok ? `<a class="bs" href="#p-${b.product_id}">${inner}</a>` : `<div class="bs">${inner}</div>`; }).join("")}</div>${bs.length > 1 ? `<button class="bn-a l" onclick="bnGo(-1)" aria-label="Sebelumnya">‹</button><button class="bn-a r" onclick="bnGo(1)" aria-label="Berikutnya">›</button><div class="bn-d" id="bnd">${bs.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>` : ""}</div>` : "";
const bnGo = (d) => { const t = $("bnt"); if (!t) return; const n = t.children.length, i = Math.round(t.scrollLeft / t.clientWidth); t.scrollTo({ left: ((i + d + n) % n) * t.clientWidth, behavior: "smooth" }); };
function initSlider() {
  clearInterval(bnTimer); const t = $("bnt"); if (!t) return;
  t.addEventListener("scroll", () => { const i = Math.round(t.scrollLeft / t.clientWidth); document.querySelectorAll("#bnd i").forEach((d, k) => d.classList.toggle("on", k == i)); }, { passive: true });
  if (t.children.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = t.parentNode, run = () => { clearInterval(bnTimer); bnTimer = setInterval(() => bnGo(1), 5000); };
  run(); ["pointerdown", "mouseenter", "focusin"].forEach((e) => box.addEventListener(e, () => clearInterval(bnTimer))); ["mouseleave", "pointerup"].forEach((e) => box.addEventListener(e, run));
}
const toCat = () => $("katalog").scrollIntoView({ behavior: "smooth" });
async function home() {
  const [{ data }, { data: bn }] = await Promise.all([db.from("products").select().eq("active", true).order("created_at", { ascending: false }), db.from("banners").select().eq("active", true).order("sort_order").order("created_at", { ascending: false })]);
  prods = data || []; cats = [...new Set(prods.map((p) => p.category).filter(Boolean))]; if (cat >= cats.length) cat = -1;
  const hp = prods.find((p) => p.image_url);
  const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const T = [[ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'), "Atur Jadwal Pengiriman", "Tentukan sendiri tanggal dan waktu pengiriman sesuai kebutuhanmu."], [ic('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 8l9 6 9-6"/>'), "Tambahkan Kartu Ucapan", "Sisipkan pesan personal untuk membuat hadiahmu semakin berkesan."], [ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'), "Pesan Tanpa Registrasi", "Tidak perlu membuat akun. Langsung pilih buket dan pesan."], [ic('<path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'), "Konfirmasi via WhatsApp", "Lanjutkan konfirmasi dan pembayaran dengan praktis lewat WhatsApp."]];
  const bs = (bn || []).filter((b) => b.image_url);
  return `${sliderHtml(bs)}<section class="hero${bs.length ? " one" : ""}"><div><h1>Buket Bunga untuk Setiap Momen Istimewa</h1><p>Dari ucapan selamat hingga kejutan untuk orang tersayang, temukan buket yang tepat untuk setiap cerita.</p><a class="btn" href="#" onclick="toCat();return false">Lihat Koleksi Buket</a></div>${bs.length ? "" : `<div class="hero-img">${hp ? `<img src="${esc(hp.image_url)}" alt="${esc(hp.name)}">` : "<span>💐</span>"}</div>`}</section>
  <h2 class="sech">Temukan Buket Favoritmu</h2><div class="cats" id="cats">${catsHtml()}</div>
  <div class="bar" id="katalog"><span id="cn">${prods.length} buket</span><label class="sort">Urutkan <select onchange="sort=this.value;paint()">${[["new", "Terbaru"], ["lo", "Harga terendah"], ["hi", "Harga tertinggi"]].map(([v, l]) => `<option value="${v}"${v == sort ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
  <div class="grid" id="grid">${gridHtml()}</div>
  <div class="trust">${T.map(([i, t, d]) => `<div><span>${i}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div>`;
}
async function detail(id) {
  const { data: p } = await db.from("products").select().eq("id", id).eq("active", true).maybeSingle();
  if (!p) return '<p>Produk tidak ditemukan.</p><a class="btn" href="#">Ke katalog</a>';
  const { data: pa } = await db.from("product_addons").select("addons(*)").eq("product_id", id);
  cur = { p, ad: (pa || []).map((x) => x.addons).filter((a) => a && a.active) };
  const { data: rl } = await db.from("products").select().eq("active", true).neq("id", id).order("created_at", { ascending: false }).limit(12);
  const rel = (rl || []).sort((a, b) => (b.category == p.category) - (a.category == p.category)).slice(0, 5);
  const relHtml = rel.length ? `<h2 class="sech" style="margin-top:44px">Mungkin Anda suka</h2><div class="grid">${rel.map(card).join("")}</div>` : "";
  return `<a class="back" href="#">‹ Kembali</a><div class="det">${gallery(p)}<div class="info"><h1>${esc(p.name)}</h1><div class="price">${priceHtml(p)}</div>
  <div class="note">Melayani pengiriman: ${areas.map((a) => esc(a.name)).join(", ")}.<br>Pesanan dikonfirmasi lewat WhatsApp.</div>${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
  <h3 class="step"><i>01</i> Kartu ucapan <small>opsional</small></h3><div class="chips">${Object.keys(OCC).map((k) => `<button type="button" class="chip" onclick="occ('${k}')">${k}</button>`).join("")}</div>
  <label for="to">Untuk (nama penerima)</label><input id="to"><label for="fr">Dari (nama pengirim)</label><input id="fr"><label for="msg">Pesan</label><textarea id="msg" rows="3" maxlength="200"></textarea>
  ${cur.ad.length ? `<h3 class="step"><i>02</i> Tambahan</h3>` + cur.ad.map((a) => `<label class="chk"><input type="checkbox" class="ad" value="${a.id}"> ${esc(a.name)} (+${rp(a.price)})</label>`).join("") : ""}
  <label for="qty">Jumlah</label><input id="qty" type="number" min="1" value="1"><button class="btn blk" onclick="addCart()">Tambah ke keranjang</button>
  ${settings.whatsapp ? `<p class="help">Butuh bantuan? <a href="https://wa.me/${settings.whatsapp}" target="_blank" rel="noopener">Chat via WhatsApp</a></p>` : ""}</div></div>${relHtml}`;
}
const occ = (k) => { $("msg").value = OCC[k]; };
function addCart() {
  const ids = [...document.querySelectorAll(".ad:checked")].map((x) => x.value), ad = cur.ad.filter((a) => ids.includes(a.id));
  cart.push({ productId: cur.p.id, name: cur.p.name, img: cur.p.image_url || "", qty: Math.max(1, +$("qty").value || 1), unit: cur.p.price + ad.reduce((s, a) => s + a.price, 0), addonIds: ids, addonNames: ad.map((a) => a.name), to: $("to").value.trim(), from: $("fr").value.trim(), msg: $("msg").value.trim() });
  save(); location.hash = "keranjang";
}
const redraw = () => { $("app").innerHTML = cartView(); updCart(); };
function updCart() { if (!$("ctt")) return; const a = areas.find((x) => x.name == selArea); $("cok").textContent = a ? rp(a.fee) : "Pilih area"; $("ctt").textContent = rp(sub() + (a ? a.fee : 0)); }
const setArea = (v) => { selArea = v; updCart(); };
const qty = (n, d) => { cart[n].qty = Math.max(1, cart[n].qty + d); save(); redraw(); };
const del = (n) => { cart.splice(n, 1); save(); redraw(); };
function cartView() {
  if (!cart.length) return '<div class="box"><p>Keranjangmu masih kosong. Yuk, pilih buket favoritmu dulu.</p><a class="btn" href="#">Lihat Koleksi Buket</a></div>';
  return `<h1>Keranjang <span class="pill">${cart.length}</span></h1><div class="two-col"><div>${cart.map((i, n) => `<div class="line">${i.img ? `<img src="${esc(i.img)}" alt="">` : '<div class="ph">💐</div>'}<div class="li"><b>${esc(i.name)}</b><div class="mut">${i.qty} × ${rp(i.unit)}</div>${i.addonNames.length ? `<div class="mut">+ ${esc(i.addonNames.join(", "))}</div>` : ""}${i.to || i.msg ? `<div class="gc"><b>Kartu ucapan</b> untuk ${esc(i.to || "-")}, dari ${esc(i.from || "-")}<br>${esc(i.msg || "")}</div>` : ""}<div class="q"><button onclick="qty(${n},-1)" aria-label="Kurangi">−</button><span>${i.qty}</span><button onclick="qty(${n},1)" aria-label="Tambah">+</button><button class="x" onclick="del(${n})">Hapus</button></div></div><b>${rp(i.unit * i.qty)}</b></div>`).join("")}</div>
  <aside class="sumbox"><label for="pr">Kode promo</label><input id="pr" value="${esc(promo)}" oninput="promo=this.value.trim()"><label for="ca">Area pengiriman</label><select id="ca" onchange="setArea(this.value)"><option value="">Pilih area untuk lihat ongkir</option>${areas.map((a) => `<option${a.name == selArea ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select><div class="sum" style="margin-top:12px"><span>Subtotal</span><span>${rp(sub())}</span></div><div class="sum"><span>Perkiraan ongkir</span><span id="cok"></span></div><div class="sum tot"><span>Estimasi total</span><b id="ctt"></b></div><p class="mut" style="font-size:13px">Potongan promo diterapkan saat pesanan dibuat. Pembayaran lewat transfer dan dikonfirmasi via WhatsApp.</p><a class="btn blk" href="#checkout">Lanjutkan Pemesanan</a></aside></div>`;
}
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const wibNow = () => new Date(Date.now() + 7 * 36e5), wibHour = () => wibNow().getUTCHours();
const mark = () => document.querySelectorAll(".dc").forEach((b) => b.classList.toggle("on", b.dataset.d == $("tg").value));
const pickD = (v) => { $("tg").value = v; mark(); };
const pickT = (b) => { $("jm").value = b.dataset.t; document.querySelectorAll(".tc").forEach((x) => x.classList.toggle("on", x === b)); };
function checkout() {
  if (!cart.length) return cartView();
  const cut = wibHour() >= (CFG.CUTOFF_HOUR ?? 15);
  const days = [...Array(7)].map((_, i) => { const d = new Date(Date.now() + i * 864e5); return `<button type="button" class="dc" data-d="${ymd(d)}"${i == 0 && cut ? " disabled" : ""} onclick="pickD('${ymd(d)}')"><b>${i == 0 ? "Hari ini" : i == 1 ? "Besok" : d.toLocaleDateString("id-ID", { weekday: "short" })}</b><span>${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span></button>`; }).join("");
  const slots = [["Pagi", "09.00–12.00"], ["Siang", "12.00–15.00"], ["Sore", "15.00–18.00"]].map(([n, t], i) => `<button type="button" class="tc${i ? "" : " on"}" data-t="${t}" onclick="pickT(this)"><b>${n}</b><span>${t}</span></button>`).join("");
  return `<a class="back" href="#keranjang">‹ Kembali ke keranjang</a><h1>Detail Pemesanan</h1><div class="two-col"><div>
  <div class="box"><h3 class="step">Penerima</h3><label for="nm">Nama</label><input id="nm" autocomplete="name"><label for="hp">Nomor HP (WhatsApp)</label><input id="hp" type="tel" autocomplete="tel"></div>
  <div class="box"><h3 class="step">Alamat</h3><label for="ar">Area pengiriman</label><select id="ar" onchange="selArea=this.value;upd()">${areas.map((a) => `<option${a.name == selArea ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select><label for="al">Alamat lengkap</label><textarea id="al" rows="3"></textarea></div>
  <div class="box"><h3 class="step">Jadwal kirim</h3><div class="dcs">${days}</div><p class="mut" style="font-size:13px;margin:8px 0 0">Pesanan untuk hari ini diterima sebelum pukul ${String(CFG.CUTOFF_HOUR ?? 15).padStart(2, "0")}.00.</p><label for="tg">Atau pilih tanggal lain</label><input id="tg" type="date" min="${ymd(new Date(Date.now() + (cut ? 864e5 : 0)))}" onchange="mark()"><label>Jam kirim</label><div class="tcs">${slots}</div><input id="jm" type="hidden" value="09.00–12.00"></div></div>
  <aside class="sumbox"><h3 class="step">Ringkasan</h3>${cart.map((i) => `<div class="sum"><span>${i.qty}× ${esc(i.name)}</span><span>${rp(i.unit * i.qty)}</span></div>`).join("")}<div class="sum"><span>Subtotal</span><span id="sb"></span></div><div class="sum"><span>Ongkir</span><span id="ok"></span></div>${promo ? `<div class="sum"><span>Kode promo</span><span>${esc(promo)}</span></div>` : ""}<div class="sum tot"><span>Total (sebelum promo)</span><b id="tt"></b></div>
  <p class="mut" style="font-size:13px">Pembayaran lewat transfer ke ${esc(settings.bank_info || "rekening toko")}. Total akhir (termasuk promo) muncul setelah pesanan dibuat.</p><div class="err" id="err" role="alert"></div><button class="btn blk" id="go" onclick="submit()">Buat Pesanan</button></aside></div>`;
}
function upd() {
  if (!$("ar")) return; const f = areas.find((a) => a.name == $("ar").value)?.fee || 0, s = sub();
  $("sb").textContent = rp(s); $("ok").textContent = rp(f); $("tt").textContent = rp(s + f);
}
async function submit() {
  const v = (i) => $(i).value.trim(); $("err").textContent = ""; if (v("tg") && v("tg") == wibNow().toISOString().slice(0, 10) && wibHour() >= (CFG.CUTOFF_HOUR ?? 15)) { $("err").textContent = "Pesanan untuk hari ini sudah ditutup. Silakan pilih tanggal kirim besok atau setelahnya."; return; } $("go").disabled = true;
  const kartu = cart.filter((i) => i.to || i.from || i.msg).map((i) => `${i.name}: untuk ${i.to || "-"}, dari ${i.from || "-"}. ${i.msg || ""}`).join("\n");
  const { data, error } = await db.rpc("create_order", { p: { name: v("nm"), phone: v("hp"), area: v("ar"), address: v("al"), deliverOn: v("tg"), slot: v("jm"), card: kartu, promo, items: cart } });
  $("go").disabled = false; if (error) { $("err").textContent = error.message; return; }
  last = { ...data, name: v("nm") }; cart = []; promo = ""; save(); location.hash = "selesai";
}
function done() {
  const t = encodeURIComponent(`Halo kak Vita, saya sudah transfer untuk pesanan ${last.no} a.n. ${last.name} sebesar ${rp(last.total)}. Berikut bukti transfernya.`);
  return `<div class="box"><h1>Pesanan ${esc(last.no)} dibuat</h1><p>Transfer <b>${rp(last.total)}</b> ke:<br><b>${esc(settings.bank_info)}</b></p><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${settings.whatsapp}?text=${t}">Kirim bukti transfer via WhatsApp</a></div>`;
}
function pesananView() { return '<h1>Lihat Status Pesanan</h1><div class="box"><label for="cn">Nomor pesanan</label><input id="cn" placeholder="BCV-1001"><label for="ch">Nomor HP saat memesan</label><input id="ch" type="tel"><button class="btn" onclick="cek()">Lihat Status</button></div><div id="hs" style="margin-top:14px"></div>'; }
async function cek() {
  const { data } = await db.rpc("track_order", { p_no: $("cn").value, p_phone: $("ch").value });
  $("hs").innerHTML = data ? `<div class="box"><b>${esc(data.status)}</b><p>${esc(data.no)} · kirim ${esc(data.deliver_on)}, ${esc(data.slot)} ke ${esc(data.area)}</p>${data.items.map((i) => `<div>${i.q}× ${esc(i.n)}</div>`).join("")}<div class="sum"><b>Total</b><b>${rp(data.total)}</b></div></div>` : '<div class="err">Pesanan tidak ditemukan. Periksa nomor pesanan dan nomor HP.</div>';
}
addEventListener("hashchange", route); boot();
