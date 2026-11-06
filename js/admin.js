const ST = ["Menunggu pembayaran", "Diproses", "Dikirim", "Selesai", "Batal"]; let f = { active: true };
async function init() {
  const { data } = await db.auth.getSession(); const ok = !!data.session; $("nav").hidden = !ok;
  document.body.classList.toggle("loggedout", !ok);
  if (!ok) { $("app").innerHTML = `<div class="login"><div class="box"><div class="brand2">BOUQUET CANTIK<small>Admin</small></div><label for="em">Email</label><input id="em" type="email" autocomplete="username"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()"><div class="err" id="err"></div><button class="btn blk" onclick="login()">Masuk</button></div></div>`; return; }
  tab("produk");
}
async function login() { const { error } = await db.auth.signInWithPassword({ email: $("em").value, password: $("pw").value }); error ? $("err").textContent = "Email atau password salah." : init(); }
const tab = (t) => { document.querySelectorAll("#nav a[data-t]").forEach((a) => a.classList.toggle("on", a.dataset.t == t)); return ({ produk, banner, pesanan, laporan, addon, promo, pengaturan })[t](); };
async function produk() {
  const { data: l } = await db.from("products").select().order("created_at", { ascending: false });
  const { data: ad } = await db.from("addons").select().order("name");
  if (f.id && !f.aids) f.aids = ((await db.from("product_addons").select("addon_id").eq("product_id", f.id)).data || []).map((x) => x.addon_id);
  $("app").innerHTML = `<h1>Produk</h1><div class="box"><label for="pn">Nama</label><input id="pn" value="${esc(f.name)}"><div class="two"><div><label for="pc">Kategori</label><input id="pc" value="${esc(f.category)}"></div><div><label for="pp">Harga (Rp)</label><input id="pp" type="number" value="${f.price || ""}"></div></div><label for="pcmp">Harga normal / coret (opsional, harus lebih besar dari harga)</label><input id="pcmp" type="number" value="${f.compare_price || ""}">
  <label for="pd">Deskripsi</label><textarea id="pd" rows="2">${esc(f.description)}</textarea><label for="pf">Foto (maks. 6, foto pertama jadi foto utama)</label><input id="pf" type="file" accept="image/*" multiple onchange="upload(this.files)"><div class="thumbs">${imgs(f).map((u, i) => `<div><img src="${esc(u)}" alt=""><span><button type="button" class="btn alt sm" onclick="fotoUtama(${i})">Utama</button><button type="button" class="btn alt sm" onclick="fotoHapus(${i})">Hapus</button></span></div>`).join("")}</div>
  ${(ad || []).length ? "<label>Add-on yang tersedia</label>" + ad.map((a) => `<label class="chk"><input type="checkbox" class="pad" value="${a.id}" ${(f.aids || []).includes(a.id) ? "checked" : ""}> ${esc(a.name)} (+${rp(a.price)})</label>`).join("") : ""}
  <label class="chk"><input id="pa" type="checkbox" ${f.active ? "checked" : ""}> Tampil di toko</label><p class="mut" id="msg"></p><button class="btn" onclick="saveP()">${f.id ? "Simpan perubahan" : "Tambah produk"}</button></div>
  ${(l || []).map((p) => `<div class="box pl">${imgs(p)[0] ? `<img class="th2" src="${esc(imgs(p)[0])}" alt="">` : '<div class="th2">💐</div>'}<div class="pi"><b>${esc(p.name)}</b>${p.active ? "" : ' <span class="st st4">Disembunyikan</span>'}<div class="mut">${esc(p.category || "Tanpa kategori")}</div><div><span class="price">${rp(p.price)}</span>${p.compare_price > p.price ? ` <s class="was">${rp(p.compare_price)}</s>` : ""}</div></div><div class="pa"><button class="btn alt sm" onclick='edit(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Ubah</button><button class="btn alt sm" onclick="delP('${p.id}')">Hapus</button></div></div>`).join("") || '<p class="mut">Belum ada produk.</p>'}`;
}
function edit(p) { f = p; produk(); scrollTo(0, 0); }
function keep() { f = { ...f, name: $("pn").value, category: $("pc").value, price: +$("pp").value, compare_price: +$("pcmp").value || null, description: $("pd").value, active: $("pa").checked, aids: [...document.querySelectorAll(".pad:checked")].map((x) => x.value) }; }
async function delP(id) { if (confirm("Hapus produk?")) { await db.from("products").delete().eq("id", id); produk(); } }
async function toWebp(file, max = 1000) {
  const bm = await createImageBitmap(file), r = Math.min(1, max / Math.max(bm.width, bm.height)), c = document.createElement("canvas");
  c.width = bm.width * r; c.height = bm.height * r; c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/webp", 0.82));
}
const imgs = (p) => p.images?.length ? p.images : (p.image_url ? [p.image_url] : []);
function fotoUtama(i) { keep(); const a = imgs(f); f.images = [a[i], ...a.filter((_, j) => j != i)]; produk(); }
function fotoHapus(i) { keep(); f.images = imgs(f).filter((_, j) => j != i); produk(); }
async function upload(files) {
  if (!files.length) return; keep(); const out = imgs(f).slice(); let err = "";
  try {
    const { data } = await db.auth.getSession();
    for (const file of [...files].slice(0, Math.max(0, 6 - out.length))) {
      $("msg").textContent = "Mengunggah foto " + (out.length + 1) + "…";
      const r = await fetch(CFG.UPLOAD_URL, { method: "PUT", headers: { "Content-Type": "image/webp", Authorization: "Bearer " + data.session.access_token }, body: await toWebp(file) });
      if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()));
      out.push((await r.json()).url);
    }
  } catch (e) { err = "Upload gagal: " + (e.message && e.message != "Failed to fetch" ? e.message : "diblokir browser (CORS) atau Worker tidak terjangkau"); }
  f.images = out; await produk(); if (err) $("msg").textContent = err;
}
async function saveP() {
  keep(); if (!f.name || !f.price) return $("msg").textContent = "Nama dan harga wajib diisi.";
  const row = { name: f.name, category: f.category, price: f.price, description: f.description, image_url: imgs(f)[0] || null, images: imgs(f), compare_price: f.compare_price > f.price ? f.compare_price : null, active: f.active };
  const { data: sv, error } = f.id ? await db.from("products").update(row).eq("id", f.id).select().single() : await db.from("products").insert(row).select().single();
  if (error) return $("msg").textContent = "Gagal menyimpan.";
  await db.from("product_addons").delete().eq("product_id", sv.id);
  if ((f.aids || []).length) await db.from("product_addons").insert(f.aids.map((a) => ({ product_id: sv.id, addon_id: a })));
  f = { active: true }; produk();
}
let sf = "Semua"; const STC = { "Menunggu pembayaran": 0, Diproses: 1, Dikirim: 2, Selesai: 3, Batal: 4 };
const setSf = (v) => { sf = v; pesanan(); };
async function pesanan() {
  const { data: o } = await db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  const all = o || [], l = sf == "Semua" ? all : all.filter((x) => x.status == sf), n = (s) => s == "Semua" ? all.length : all.filter((x) => x.status == s).length;
  const tm = (d) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  $("app").innerHTML = `<h1>Pesanan</h1><div class="chips">${["Semua", ...ST].map((s) => `<button class="chip${s == sf ? " on" : ""}" onclick="setSf('${s}')">${s}<i>${n(s)}</i></button>`).join("")}</div>` + (l.map((x) => `<div class="box ord"><div class="oh"><div><b>${esc(x.no)}</b> <span class="mut">${tm(x.created_at)}</span></div><span class="st st${STC[x.status] ?? 0}">${esc(x.status)}</span></div>
  <div class="og"><div><span class="lb">Pemesan</span>${esc(x.name)}<br><span class="mut">${esc(x.phone)}</span></div><div><span class="lb">Kirim</span>${esc(x.deliver_on)} · ${esc(x.deliver_slot)}<br><span class="mut">${esc(x.area)}</span></div><div><span class="lb">Alamat</span>${esc(x.address)}</div></div>
  <div class="oi">${(x.order_items || []).map((i) => `<div>${i.qty}× ${esc(i.product_name)}${i.addons?.length ? " + " + esc(i.addons.join(", ")) : ""}</div>`).join("")}</div>${x.card_message ? `<div class="ocard"><b>Kartu ucapan</b><br>${esc(x.card_message).replace(/\n/g, "<br>")}</div>` : ""}
  <div class="of"><b class="price">${rp(x.total)}</b>${x.promo_code ? `<span class="mut">Promo ${esc(x.promo_code)}: −${rp(x.discount)}</span>` : ""}<span class="sp"></span><select onchange="setSt('${x.id}',this.value)">${ST.map((s) => `<option ${s == x.status ? "selected" : ""}>${s}</option>`).join("")}</select><a class="btn alt sm" target="_blank" rel="noopener" href="https://wa.me/${String(x.phone).replace(/^0/, "62")}">WhatsApp</a></div></div>`).join("") || '<p class="mut">Tidak ada pesanan.</p>');
}
async function setSt(id, s) { const y = scrollY; await db.from("orders").update({ status: s }).eq("id", id); await pesanan(); scrollTo(0, y); }

const tog = async (t, id, v, fn) => { await db.from(t).update({ active: v }).eq("id", id); fn(); };
const rm = async (t, id, fn) => { if (confirm("Hapus?")) { await db.from(t).delete().eq("id", id); fn(); } };
async function addon() {
  const { data: l } = await db.from("addons").select().order("name");
  $("app").innerHTML = `<h1>Add-on</h1><div class="box"><div class="two"><div><label for="an">Nama</label><input id="an" placeholder="Cokelat"></div><div><label for="ap">Harga (Rp)</label><input id="ap" type="number"></div></div><button class="btn" onclick="saveA()">Tambah add-on</button><p class="mut">Atur add-on mana yang tersedia di tiap produk lewat menu Produk.</p></div>` +
    (l || []).map((a) => `<div class="box sum"><span><b>${esc(a.name)}</b> ${a.active ? "" : "(nonaktif)"}<br><span class="price">${rp(a.price)}</span></span><span><button class="btn alt sm" onclick="tog('addons','${a.id}',${!a.active},addon)">${a.active ? "Nonaktifkan" : "Aktifkan"}</button> <button class="btn alt sm" onclick="rm('addons','${a.id}',addon)">Hapus</button></span></div>`).join("");
}
async function saveA() { if (!$("an").value.trim() || !+$("ap").value) return; await db.from("addons").insert({ name: $("an").value.trim(), price: +$("ap").value }); addon(); }
async function promo() {
  const { data: l } = await db.from("promos").select().order("code");
  $("app").innerHTML = `<h1>Promo</h1><div class="box"><label for="kc">Kode</label><input id="kc" placeholder="HEMAT10"><div class="two"><div><label for="kk">Jenis</label><select id="kk"><option value="percent">Persen (%)</option><option value="amount">Nominal (Rp)</option></select></div><div><label for="kv">Nilai</label><input id="kv" type="number"></div></div>
  <div class="two"><div><label for="km">Min. belanja (Rp)</label><input id="km" type="number" value="0"></div><div><label for="kq">Kuota (kosong = bebas)</label><input id="kq" type="number"></div></div>
  <div class="two"><div><label for="ks">Mulai</label><input id="ks" type="date"></div><div><label for="ke">Berakhir</label><input id="ke" type="date"></div></div><p class="mut" id="pm"></p><button class="btn" onclick="saveK()">Tambah promo</button></div>` +
    (l || []).map((k) => `<div class="box sum"><span><b>${esc(k.code)}</b> ${k.active ? "" : "(nonaktif)"}<br><span class="mut">${k.kind == "percent" ? k.value + "%" : rp(k.value)} · min ${rp(k.min_order)} · dipakai ${k.used}${k.quota != null ? "/" + k.quota : ""}${k.ends_on ? " · s.d. " + esc(k.ends_on) : ""}</span></span><span><button class="btn alt sm" onclick="tog('promos','${k.id}',${!k.active},promo)">${k.active ? "Nonaktifkan" : "Aktifkan"}</button> <button class="btn alt sm" onclick="rm('promos','${k.id}',promo)">Hapus</button></span></div>`).join("");
}
async function saveK() {
  const v = (i) => $(i).value.trim(); if (!v("kc") || !+v("kv")) return $("pm").textContent = "Kode dan nilai wajib diisi.";
  const { error } = await db.from("promos").insert({ code: v("kc").toUpperCase(), kind: v("kk"), value: +v("kv"), min_order: +v("km") || 0, quota: v("kq") ? +v("kq") : null, starts_on: v("ks") || null, ends_on: v("ke") || null });
  error ? $("pm").textContent = "Gagal (kode mungkin sudah ada)." : promo();
}
async function pengaturan() {
  const [{ data: s }, { data: a }] = await Promise.all([db.from("settings").select().single(), db.from("areas").select().order("name")]);
  $("app").innerHTML = `<h1>Pengaturan</h1><div class="box"><label for="sn">Nama toko</label><input id="sn" value="${esc(s.store_name)}"><label for="sw">Nomor WhatsApp (format 62812…)</label><input id="sw" value="${esc(s.whatsapp)}"><label for="sb">Info rekening</label><textarea id="sb" rows="2">${esc(s.bank_info)}</textarea><p class="mut" id="sm"></p><button class="btn" onclick="saveS()">Simpan</button></div><h2>Area dan ongkir</h2>` +
    (a || []).map((r) => `<div class="box sum"><span><b>${esc(r.name)}</b> ${r.active ? "" : "(nonaktif)"}</span><span><input type="number" style="width:110px" value="${r.fee}" onchange="db.from('areas').update({fee:+this.value}).eq('name',this.dataset.n).then(()=>{})" data-n="${esc(r.name)}"> <button class="btn alt sm" onclick="togArea(this.dataset.n,${!r.active})" data-n="${esc(r.name)}">${r.active ? "Nonaktifkan" : "Aktifkan"}</button></span></div>`).join("") +
    `<div class="box"><div class="two"><div><label for="nan">Area baru</label><input id="nan"></div><div><label for="naf">Ongkir (Rp)</label><input id="naf" type="number"></div></div><button class="btn" onclick="addArea()">Tambah area</button></div>`;
}
async function saveS() { const { error } = await db.from("settings").update({ store_name: $("sn").value, whatsapp: $("sw").value.replace(/\D/g, ""), bank_info: $("sb").value }).eq("id", 1); $("sm").textContent = error ? "Gagal menyimpan." : "Tersimpan."; }
async function togArea(n, v) { await db.from("areas").update({ active: v }).eq("name", n); pengaturan(); }
async function addArea() { if (!$("nan").value.trim()) return; await db.from("areas").insert({ name: $("nan").value.trim(), fee: +$("naf").value || 0 }); pengaturan(); }
let rg = 7, allO = [];
async function laporan() {
  const { data: o } = await db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }); allO = o || [];
  const from = rg ? Date.now() - rg * 864e5 : 0, l = allO.filter((x) => ["Diproses", "Dikirim", "Selesai"].includes(x.status) && new Date(x.created_at) >= from), tot = l.reduce((s, x) => s + x.total, 0), by = {}, top = {};
  l.forEach((x) => { const d = x.created_at.slice(0, 10); by[d] = (by[d] || 0) + x.total; (x.order_items || []).forEach((i) => { top[i.product_name] ||= { q: 0, r: 0 }; top[i.product_name].q += i.qty; top[i.product_name].r += i.unit_price * i.qty; }); });
  const days = [...Array(7)].map((_, i) => new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10)), mx = Math.max(1, ...days.map((d) => by[d] || 0)), tp = Object.keys(top).sort((a, b) => top[b].q - top[a].q).slice(0, 5);
  $("app").innerHTML = `<div class="sum"><h1>Laporan</h1><select style="width:auto" onchange="rg=+this.value;laporan()"><option value="7" ${rg == 7 ? "selected" : ""}>7 hari</option><option value="30" ${rg == 30 ? "selected" : ""}>30 hari</option><option value="0" ${!rg ? "selected" : ""}>Semua</option></select></div>
  <div class="two"><div class="box"><span class="mut">Omzet</span><br><b>${rp(tot)}</b></div><div class="box"><span class="mut">Pesanan</span><br><b>${l.length}</b></div></div>
  <div class="box"><b>Omzet 7 hari terakhir</b><div style="display:flex;align-items:flex-end;gap:6px;height:130px;margin-top:8px">${days.map((d) => `<div style="flex:1;text-align:center;font-size:11px" title="${rp(by[d] || 0)}"><div style="background:var(--pri);border-radius:6px 6px 0 0;height:${Math.round((by[d] || 0) / mx * 100)}px;min-height:2px"></div>${d.slice(8)}</div>`).join("")}</div></div>
  <div class="box"><b>Buket terlaris</b>${tp.map((n) => `<div class="sum"><span>${esc(n)}</span><span>${top[n].q} pcs · ${rp(top[n].r)}</span></div>`).join("") || '<p class="mut">Belum ada data.</p>'}</div><p class="mut">Omzet dihitung dari pesanan berstatus Diproses, Dikirim, atau Selesai.</p><button class="btn" onclick="csv()">Unduh CSV</button>`;
}
function csv() {
  const q = (x) => '"' + String(x ?? "").replace(/"/g, '""') + '"';
  const r = ["No,Tanggal,Nama,HP,Area,Item,Total,Status"].concat(allO.map((o) => [o.no, o.created_at.slice(0, 10), o.name, o.phone, o.area, (o.order_items || []).map((i) => i.qty + "x " + i.product_name).join("; "), o.total, o.status].map(q).join(",")));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r.join("\n")], { type: "text/csv" })); a.download = "laporan-bouquet-cantik.csv"; a.click();
}
let bf = { src: "upload" }, bnl = [], pdl = [];
const bKeep = () => { if ($("bt")) { bf.title = $("bt").value; bf.subtitle = $("bs").value; } if ($("bl")) bf.product_id = $("bl").value || null; };
const bSrc = (v) => { bKeep(); bf = { ...bf, src: v, image_url: null, product_id: null }; banner(); };
function bPick(id) { bKeep(); const p = pdl.find((x) => x.id == id); bf.product_id = id || null; bf.image_url = p ? imgs(p)[0] || null : null; if (p && !bf.title) bf.title = p.name; banner(); }
async function bUp(file) {
  if (!file) return; bKeep(); $("bm").textContent = "Mengunggah banner…";
  try {
    const { data } = await db.auth.getSession();
    const r = await fetch(CFG.UPLOAD_URL, { method: "PUT", headers: { "Content-Type": "image/webp", Authorization: "Bearer " + data.session.access_token }, body: await toWebp(file, 1600) });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()));
    bf.image_url = (await r.json()).url; await banner();
  } catch (e) { $("bm").textContent = "Upload gagal: " + (e.message && e.message != "Failed to fetch" ? e.message : "diblokir browser (CORS) atau Worker tidak terjangkau"); }
}
async function banner() {
  const [{ data: l, error }, { data: ps }] = await Promise.all([db.from("banners").select().order("sort_order").order("created_at", { ascending: false }), db.from("products").select("id,name,image_url,images").order("name")]);
  if (error) { $("app").innerHTML = '<h1>Banner</h1><div class="err">Tabel banner belum ada. Jalankan tambahan_banner.sql di SQL Editor Supabase.</div>'; return; }
  bnl = l || []; pdl = ps || [];
  const opt = (sel) => pdl.map((p) => `<option value="${p.id}"${p.id == sel ? " selected" : ""}>${esc(p.name)}</option>`).join("");
  const pv = bf.image_url ? `<img class="bprev" src="${esc(bf.image_url)}" alt="">` : "";
  $("app").innerHTML = `<h1>Banner</h1><div class="box"><div class="chips">${[["upload", "Upload gambar"], ["product", "Ambil dari produk"]].map(([v, t]) => `<button class="chip${bf.src == v ? " on" : ""}" onclick="bSrc('${v}')">${t}</button>`).join("")}</div>
  ${bf.src == "upload" ? `<label for="bi">Gambar banner</label><input id="bi" type="file" accept="image/*" onchange="bUp(this.files[0])"><p class="mut" style="font-size:13px;margin:6px 0 0">Disarankan 1600×600 px, bagian penting di tengah gambar.</p>${pv}<label for="bl">Tautkan ke produk (opsional)</label><select id="bl"><option value="">Tanpa tautan</option>${opt(bf.product_id)}</select>` : `<label for="bp">Pilih produk</label><select id="bp" onchange="bPick(this.value)"><option value="">Pilih produk…</option>${opt(bf.product_id)}</select><p class="mut" style="font-size:13px;margin:6px 0 0">Foto utama produk dipakai sebagai banner dan mengarah ke halaman produknya.</p>${pv}`}
  <label for="bt">Judul (opsional)</label><input id="bt" value="${esc(bf.title)}"><label for="bs">Teks kecil (opsional)</label><input id="bs" value="${esc(bf.subtitle)}"><p class="mut" id="bm"></p><button class="btn" onclick="saveB()">Tambah banner</button></div>
  ${bnl.map((b, i) => `<div class="box bl"><img class="bth" src="${esc(b.image_url)}" alt=""><div class="pi"><b>${esc(b.title || "(tanpa judul)")}</b>${b.active ? "" : ' <span class="st st4">Nonaktif</span>'}<div class="mut">${esc(b.subtitle || "")}</div><div class="mut">${b.product_id ? "Menuju: " + esc(pdl.find((p) => p.id == b.product_id)?.name || "produk") : "Tanpa tautan"}</div></div><div class="pa"><button class="btn alt sm" ${i ? "" : "disabled"} onclick="moveB(${i},-1)" aria-label="Naik">▲</button><button class="btn alt sm" ${i < bnl.length - 1 ? "" : "disabled"} onclick="moveB(${i},1)" aria-label="Turun">▼</button><button class="btn alt sm" onclick="tog('banners','${b.id}',${!b.active},banner)">${b.active ? "Nonaktifkan" : "Aktifkan"}</button><button class="btn alt sm" onclick="rm('banners','${b.id}',banner)">Hapus</button></div></div>`).join("") || '<p class="mut">Belum ada banner.</p>'}`;
}
async function saveB() {
  bKeep(); if (!bf.image_url) return $("bm").textContent = "Pilih gambar atau produk dulu.";
  const { error } = await db.from("banners").insert({ image_url: bf.image_url, title: bf.title || null, subtitle: bf.subtitle || null, product_id: bf.product_id || null, sort_order: bnl.length });
  if (error) return $("bm").textContent = "Gagal menyimpan banner."; bf = { src: bf.src }; banner();
}
async function moveB(i, d) { const a = [...bnl], j = i + d; [a[i], a[j]] = [a[j], a[i]]; await Promise.all(a.map((b, k) => db.from("banners").update({ sort_order: k }).eq("id", b.id))); banner(); }
init();
