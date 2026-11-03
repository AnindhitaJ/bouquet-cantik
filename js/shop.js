let settings = {}, areas = [], cur = null, last = null, cart = JSON.parse(localStorage.getItem("cart") || "[]");
const save = () => { localStorage.setItem("cart", JSON.stringify(cart)); $("cnt").textContent = cart.reduce((s, i) => s + i.qty, 0); };
async function boot() {
  const [s, a] = await Promise.all([db.from("settings").select().maybeSingle(), db.from("areas").select().eq("active", true).order("name")]);
  settings = s.data || {}; areas = a.data || [];
  if (settings.whatsapp) { $("wa").href = "https://wa.me/" + settings.whatsapp; $("wa").hidden = false; }
  save(); route();
}
async function route() {
  const h = location.hash.slice(1); $("seo").hidden = !!h; $("app").innerHTML = '<p class="mut">Memuat…</p>';
  $("app").innerHTML = h.startsWith("p-") ? await detail(h.slice(2)) : h == "keranjang" ? checkout() : h == "selesai" && last ? done() : await home();
  scrollTo(0, 0); if (h == "keranjang") upd();
}
async function home() {
  const { data } = await db.from("products").select().eq("active", true).order("created_at", { ascending: false });
  return `<h1>Buket bunga cantik, diantar ke depan pintu</h1><p class="mut">Tanpa akun. Pilih buket, isi alamat, transfer, selesai.</p><div class="grid" style="margin-top:18px">${(data || []).map((p) => `<a class="card" href="#p-${p.id}">${imgTag(p)}<div><b>${esc(p.name)}</b><div class="price">${rp(p.price)}</div></div></a>`).join("")}</div>${data?.length ? "" : '<p class="mut">Belum ada produk.</p>'}`;
}
async function detail(id) {
  const { data: p } = await db.from("products").select().eq("id", id).eq("active", true).maybeSingle();
  if (!p) return '<p>Produk tidak ditemukan.</p><a class="btn" href="#">Ke katalog</a>';
  const { data: pa } = await db.from("product_addons").select("addons(*)").eq("product_id", id);
  cur = { p, ad: (pa || []).map((x) => x.addons).filter((a) => a && a.active) };
  return `<div class="det">${imgTag(p)}<div><h1>${esc(p.name)}</h1><p class="price">${rp(p.price)}</p><p>${esc(p.description || "")}</p>
  ${cur.ad.length ? "<label>Tambahan</label>" + cur.ad.map((a) => `<label class="chk"><input type="checkbox" class="ad" value="${a.id}"> ${esc(a.name)} (+${rp(a.price)})</label>`).join("") : ""}
  <label for="qty">Jumlah</label><input id="qty" type="number" min="1" value="1"><button class="btn" onclick="addCart()">Tambah ke keranjang</button></div></div>`;
}
function addCart() {
  const ids = [...document.querySelectorAll(".ad:checked")].map((x) => x.value), ad = cur.ad.filter((a) => ids.includes(a.id));
  cart.push({ productId: cur.p.id, name: cur.p.name, qty: Math.max(1, +$("qty").value || 1), unit: cur.p.price + ad.reduce((s, a) => s + a.price, 0), addonIds: ids, addonNames: ad.map((a) => a.name) });
  save(); location.hash = "keranjang";
}
function del(n) { cart.splice(n, 1); save(); route(); }
function checkout() {
  if (!cart.length) return '<div class="box"><p>Keranjang masih kosong.</p><a class="btn" href="#">Lihat katalog</a></div>';
  const today = new Date().toISOString().slice(0, 10);
  return `<h1>Checkout</h1><div class="box">${cart.map((i, n) => `<div class="sum"><span>${i.qty}× ${esc(i.name)}${i.addonNames.length ? " + " + esc(i.addonNames.join(", ")) : ""}</span><span>${rp(i.unit * i.qty)} <button class="btn alt sm" onclick="del(${n})">Hapus</button></span></div>`).join("")}</div>
  <div class="box"><label for="nm">Nama</label><input id="nm" autocomplete="name"><label for="hp">Nomor HP (WhatsApp)</label><input id="hp" type="tel" autocomplete="tel">
  <label for="ar">Area</label><select id="ar" onchange="upd()">${areas.map((a) => `<option>${esc(a.name)}</option>`).join("")}</select>
  <label for="al">Alamat lengkap</label><textarea id="al" rows="3"></textarea>
  <div class="two"><div><label for="tg">Tanggal kirim</label><input id="tg" type="date" min="${today}"></div><div><label for="jm">Jam kirim</label><select id="jm"><option>09.00–12.00</option><option>12.00–15.00</option><option>15.00–18.00</option></select></div></div>
  <label for="kt">Kartu ucapan (opsional)</label><textarea id="kt" rows="2"></textarea><label for="pr">Kode promo (opsional)</label><input id="pr"></div>
  <div class="box"><div class="sum"><span>Subtotal</span><span id="sb"></span></div><div class="sum"><span>Ongkir</span><span id="ok"></span></div><div class="sum"><b>Total (sebelum promo)</b><b id="tt"></b></div></div>
  <div class="err" id="err" role="alert"></div><button class="btn" id="go" onclick="submit()">Buat pesanan</button>`;
}
function upd() {
  if (!$("ar")) return; const f = areas.find((a) => a.name == $("ar").value)?.fee || 0, s = cart.reduce((x, i) => x + i.unit * i.qty, 0);
  $("sb").textContent = rp(s); $("ok").textContent = rp(f); $("tt").textContent = rp(s + f);
}
async function submit() {
  const v = (i) => $(i).value.trim(); $("err").textContent = ""; $("go").disabled = true;
  const { data, error } = await db.rpc("create_order", { p: { name: v("nm"), phone: v("hp"), area: v("ar"), address: v("al"), deliverOn: v("tg"), slot: v("jm"), card: v("kt"), promo: v("pr"), items: cart } });
  $("go").disabled = false; if (error) { $("err").textContent = error.message; return; }
  last = { ...data, name: v("nm") }; cart = []; save(); location.hash = "selesai";
}
function done() {
  const t = encodeURIComponent(`Halo kak Vita, saya sudah transfer untuk pesanan ${last.no} a.n. ${last.name} sebesar ${rp(last.total)}. Berikut bukti transfernya.`);
  return `<div class="box"><h1>Pesanan ${esc(last.no)} dibuat</h1><p>Transfer <b>${rp(last.total)}</b> ke:<br><b>${esc(settings.bank_info)}</b></p><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${settings.whatsapp}?text=${t}">Kirim bukti transfer via WhatsApp</a></div>`;
}
addEventListener("hashchange", route); boot();
