-- Bouquet Cantik by Vita: semua tabel di schema "bouquet" (aman untuk project Supabase yang sudah dipakai)
create schema if not exists bouquet;
create sequence if not exists bouquet.order_seq start 1001;

-- Admin toko: hanya akun yang terdaftar di sini yang bisa mengelola data
create table bouquet.admins(user_id uuid primary key references auth.users on delete cascade);
create function bouquet.is_admin() returns boolean language sql stable security definer set search_path=bouquet,public as
$$ select exists(select 1 from bouquet.admins where user_id = auth.uid()) $$;

create table bouquet.settings(id int primary key default 1 check(id=1), store_name text default 'Bouquet Cantik by Vita', whatsapp text default '6281234567890', bank_info text default 'BCA 1234567890 a.n. Vita');
insert into bouquet.settings default values;
create table bouquet.areas(name text primary key, fee int not null default 0, active boolean default true);
insert into bouquet.areas(name,fee) values ('Cibubur',15000),('Depok',20000),('Bogor',25000),('Kota Wisata',15000),('Legenda Wisata',15000),('Ciangsana',15000),('Cileungsi',20000),('Jonggol',35000);
create table bouquet.products(id uuid primary key default gen_random_uuid(), name text not null, category text, price int not null check(price>=0), description text, image_url text, active boolean default true, created_at timestamptz default now());
create table bouquet.addons(id uuid primary key default gen_random_uuid(), name text not null, price int not null check(price>=0), active boolean default true);
create table bouquet.product_addons(product_id uuid references bouquet.products on delete cascade, addon_id uuid references bouquet.addons on delete cascade, primary key(product_id,addon_id));
create table bouquet.promos(id uuid primary key default gen_random_uuid(), code text unique not null, kind text check(kind in('percent','amount')), value int not null, min_order int default 0, starts_on date, ends_on date, quota int, used int default 0, active boolean default true);
create table bouquet.orders(id uuid primary key default gen_random_uuid(), no text unique default ('BCV-'||nextval('bouquet.order_seq')), name text, phone text, area text, address text, deliver_on date, deliver_slot text, card_message text, note text, subtotal int, shipping int, discount int default 0, promo_code text, total int, status text default 'Menunggu pembayaran', created_at timestamptz default now());
create table bouquet.order_items(id uuid primary key default gen_random_uuid(), order_id uuid references bouquet.orders on delete cascade, product_name text, qty int, unit_price int, addons jsonb default '[]');
create index on bouquet.orders(created_at desc);

-- Akses: publik hanya baca katalog; admin penuh; pesanan masuk lewat fungsi create_order
alter table bouquet.admins enable row level security;
do $$ declare t text; begin
 foreach t in array array['settings','areas','products','addons','product_addons','promos','orders','order_items'] loop
  execute format('alter table bouquet.%I enable row level security', t);
  execute format('create policy admin_all on bouquet.%I for all to authenticated using (bouquet.is_admin()) with check (bouquet.is_admin())', t);
 end loop; end $$;
create policy pub_settings on bouquet.settings for select using (true);
create policy pub_areas on bouquet.areas for select using (active);
create policy pub_products on bouquet.products for select using (active);
create policy pub_addons on bouquet.addons for select using (active);
create policy pub_pa on bouquet.product_addons for select using (true);
grant usage on schema bouquet to anon, authenticated;
grant select on bouquet.settings, bouquet.areas, bouquet.products, bouquet.addons, bouquet.product_addons to anon;
grant select, insert, update, delete on all tables in schema bouquet to authenticated;

-- Hitung & simpan pesanan di database (harga tidak bisa diubah dari browser)
create function bouquet.create_order(p jsonb) returns jsonb language plpgsql security definer set search_path=bouquet,public as $$
declare a areas; pr promos; o orders; it jsonb; pd products; q int; u int; s int:=0; d int:=0; code text; adt int; adn jsonb; rws jsonb:='[]';
begin
 if coalesce(trim(p->>'name'),'')='' or length(regexp_replace(coalesce(p->>'phone',''),'\D','','g'))<9 or coalesce(trim(p->>'address'),'')='' or coalesce(p->>'deliverOn','')='' then raise exception 'Lengkapi nama, nomor HP, alamat, dan tanggal kirim.'; end if;
 select * into a from areas where name=p->>'area' and active; if not found then raise exception 'Area pengiriman tidak tersedia.'; end if;
 for it in select value from jsonb_array_elements(p->'items') loop
  select * into pd from products where id=(it->>'productId')::uuid and active; if not found then raise exception 'Ada produk yang sudah tidak tersedia.'; end if;
  q:=greatest(1,least(50,coalesce((it->>'qty')::int,1)));
  select coalesce(sum(price),0), coalesce(jsonb_agg(name),'[]') into adt, adn from addons where active and id in (select (jsonb_array_elements_text(coalesce(it->'addonIds','[]')))::uuid);
  u:=pd.price+adt; s:=s+u*q; rws:=rws||jsonb_build_object('n',pd.name,'q',q,'u',u,'a',adn);
 end loop;
 if s=0 then raise exception 'Keranjang kosong.'; end if;
 if coalesce(trim(p->>'promo'),'')<>'' then
  select * into pr from promos where lower(code)=lower(trim(p->>'promo')) and active for update;
  if not found or s<pr.min_order or (pr.starts_on is not null and current_date<pr.starts_on) or (pr.ends_on is not null and current_date>pr.ends_on) or (pr.quota is not null and pr.used>=pr.quota) then raise exception 'Kode promo tidak berlaku.'; end if;
  d:=case when pr.kind='percent' then round(s*pr.value/100.0) else least(pr.value,s) end; code:=pr.code; update promos set used=used+1 where id=pr.id;
 end if;
 insert into orders(name,phone,area,address,deliver_on,deliver_slot,card_message,subtotal,shipping,discount,promo_code,total)
  values(trim(p->>'name'),regexp_replace(p->>'phone','\D','','g'),a.name,trim(p->>'address'),(p->>'deliverOn')::date,p->>'slot',p->>'card',s,a.fee,d,code,s+a.fee-d) returning * into o;
 insert into order_items(order_id,product_name,qty,unit_price,addons) select o.id,r->>'n',(r->>'q')::int,(r->>'u')::int,r->'a' from jsonb_array_elements(rws) r;
 return jsonb_build_object('no',o.no,'total',o.total);
end $$;
grant execute on function bouquet.create_order(jsonb) to anon, authenticated;

-- LANGKAH TERAKHIR: daftarkan akun admin Anda (ganti emailnya, akun harus sudah dibuat di Authentication > Users)
-- insert into bouquet.admins select id from auth.users where email = 'email-anda@gmail.com';
