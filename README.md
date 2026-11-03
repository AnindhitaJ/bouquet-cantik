# Bouquet Cantik by Vita (HTML statis)
HTML + JavaScript biasa, tanpa build. Data & login admin: Supabase. Foto: Cloudflare R2 lewat 1 Worker kecil.

## Setup
1. **Supabase**: jalankan `supabase/schema.sql` di SQL Editor. Lalu di Settings > API > *Exposed schemas* tambahkan `bouquet`. Buat user admin (Authentication > Users) dan daftarkan lewat baris `insert into bouquet.admins` di akhir file SQL.
2. Isi `js/config.js` dengan Project URL dan anon key (aman dipublikasikan, akses dijaga RLS).
3. **R2**: buat bucket `bouquet-cantik`, sambungkan custom domain (mis. `img.domainanda.id`).
4. **Worker**: `cd worker`, isi `wrangler.toml` (SUPABASE_URL, SUPABASE_ANON_KEY, domain), lalu `npx wrangler deploy`. Isi `UPLOAD_URL` di `js/config.js` dengan URL Worker.
5. **Hosting**: push ke GitHub, sambungkan ke Cloudflare Pages (tanpa build command, output directory `/`).
6. Ganti `domainanda.id` di `sitemap.xml`, `robots.txt`, dan `index.html` (canonical + JSON-LD) dengan domain asli. Admin ada di `/admin/`.

## Sudah ada
Toko (katalog, detail, add-on, keranjang, checkout tamu, promo, ongkir per area, WhatsApp), wording SEO area di halaman utama, admin login, CRUD produk + upload R2, kelola pesanan.

## Berikutnya
Admin add-on, promo, pengaturan, laporan omzet; cek pesanan pembeli.
