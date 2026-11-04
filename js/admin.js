const ST = ["Menunggu pembayaran", "Diproses", "Dikirim", "Selesai", "Batal"]; let f = { active: true };
async function init() {
  const { data } = await db.auth.getSession(); const ok = !!data.session; $("nav").hidden = !ok;
  if (!ok) return $("app").innerHTML = `<div class="box" style="max-width:380px;margin:40px auto"><h1>Masuk</h1><label for="em">Email</label><input id="em" type="email"><label for="pw">Password</label><input id="pw" type="password"><div class="err" id="err"></div><button class="btn" onclick="login()">Masuk</button></div>`;
  tab("produk");
}
async function login() { const { error } = await db.auth.signInWithPassword({ email: $("em").value, password: $("pw").value }); error ? $("err").textContent = "Email atau password salah." : init(); }
const tab = (t) => t == "produk" ? produk() : pesanan();
async function produk() {
  const { data: l } = await db.from("products").select().order("created_at", { ascending: false });
  $("app").innerHTML = `<h1>Produk</h1><div class="box"><label for="pn">Nama</label><input id="pn" value="${esc(f.name)}"><div class="two"><div><label for="pc">Kategori</label><input id="pc" value="${esc(f.category)}"></div><div><label for="pp">Harga (Rp)</label><input id="pp" type="number" value="${f.price || ""}"></div></div>
  <label for="pd">Deskripsi</label><textarea id="pd" rows="2">${esc(f.description)}</textarea><label for="pf">Foto</label><input id="pf" type="file" accept="image/*" onchange="upload(this.files[0])">${f.image_url ? `<img src="${esc(f.image_url)}" alt="" style="width:90px;margin-top:8px;border-radius:8px">` : ""}
  <label class="chk"><input id="pa" type="checkbox" ${f.active ? "checked" : ""}> Tampil di toko</label><p class="mut" id="msg"></p><button class="btn" onclick="saveP()">${f.id ? "Simpan perubahan" : "Tambah produk"}</button></div>
  ${(l || []).map((p) => `<div class="box sum"><span><b>${esc(p.name)}</b> ${p.active ? "" : "(disembunyikan)"}<br><span class="price">${rp(p.price)}</span></span><span><button class="btn alt sm" onclick='edit(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Ubah</button> <button class="btn alt sm" onclick="delP('${p.id}')">Hapus</button></span></div>`).join("")}`;
}
function edit(p) { f = p; produk(); scrollTo(0, 0); }
function keep() { f = { ...f, name: $("pn").value, category: $("pc").value, price: +$("pp").value, description: $("pd").value, active: $("pa").checked }; }
async function delP(id) { if (confirm("Hapus produk?")) { await db.from("products").delete().eq("id", id); produk(); } }
async function toWebp(file) {
  const bm = await createImageBitmap(file), r = Math.min(1, 1000 / Math.max(bm.width, bm.height)), c = document.createElement("canvas");
  c.width = bm.width * r; c.height = bm.height * r; c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/webp", 0.82));
}
async function upload(file) {
  if (!file) return; keep(); $("msg").textContent = "Mengunggah foto…";
  try {
    const { data } = await db.auth.getSession();
    const r = await fetch(CFG.UPLOAD_URL, { method: "PUT", headers: { "Content-Type": "image/webp", Authorization: "Bearer " + data.session.access_token }, body: await toWebp(file) });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()));
    f.image_url = (await r.json()).url; produk();
  } catch (e) { $("msg").textContent = "Upload gagal: " + (e.message && e.message != "Failed to fetch" ? e.message : "diblokir browser (CORS) atau Worker tidak terjangkau"); }
}
async function saveP() {
  keep(); if (!f.name || !f.price) return $("msg").textContent = "Nama dan harga wajib diisi.";
  const row = { name: f.name, category: f.category, price: f.price, description: f.description, image_url: f.image_url, active: f.active };
  const { error } = f.id ? await db.from("products").update(row).eq("id", f.id) : await db.from("products").insert(row);
  if (error) return $("msg").textContent = "Gagal menyimpan."; f = { active: true }; produk();
}
async function pesanan() {
  const { data: o } = await db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  $("app").innerHTML = "<h1>Pesanan</h1>" + ((o || []).map((x) => `<div class="box"><div class="sum"><b>${esc(x.no)} · ${esc(x.name)}</b><span class="price">${rp(x.total)}</span></div><div class="mut">${esc(x.phone)} · ${esc(x.area)} · kirim ${esc(x.deliver_on)} ${esc(x.deliver_slot)}</div><div>${esc(x.address)}</div>${x.card_message ? `<div class="mut">Kartu: ${esc(x.card_message)}</div>` : ""}
  ${(x.order_items || []).map((i) => `<div>${i.qty}× ${esc(i.product_name)}${i.addons?.length ? " + " + esc(i.addons.join(", ")) : ""}</div>`).join("")}${x.promo_code ? `<div class="mut">Promo ${esc(x.promo_code)}: −${rp(x.discount)}</div>` : ""}
  <div class="sum" style="margin-top:8px"><select style="width:auto" onchange="setSt('${x.id}',this.value)">${ST.map((s) => `<option ${s == x.status ? "selected" : ""}>${s}</option>`).join("")}</select><a class="btn alt sm" target="_blank" rel="noopener" href="https://wa.me/${x.phone.replace(/^0/, "62")}">WhatsApp</a></div></div>`).join("") || '<p class="mut">Belum ada pesanan.</p>');
}
async function setSt(id, s) { await db.from("orders").update({ status: s }).eq("id", id); }
init();
