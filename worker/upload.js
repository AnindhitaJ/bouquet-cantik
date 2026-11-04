// Cloudflare Worker: terima foto dari admin (harus login Supabase), simpan ke R2.
export default {
  async fetch(req, env) {
    const cors = { "Access-Control-Allow-Origin": env.ALLOW_ORIGIN, "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Allow-Methods": "PUT,OPTIONS" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "PUT") return new Response("Method not allowed", { status: 405, headers: cors });
    const u = await fetch(env.SUPABASE_URL + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: req.headers.get("Authorization") || "" } });
    if (!u.ok) return new Response("Unauthorized", { status: 401, headers: cors });
    const adm = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/is_admin", { method: "POST", headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: req.headers.get("Authorization") || "", "Content-Profile": "bouquet", "Content-Type": "application/json" }, body: "{}" });
    if (!adm.ok || (await adm.json()) !== true) return new Response("Forbidden", { status: 403, headers: cors });
    if (req.headers.get("Content-Type") !== "image/webp" || +req.headers.get("Content-Length") > 2e6) return new Response("Hanya WebP maks 2 MB", { status: 400, headers: cors });
    const key = "products/" + crypto.randomUUID() + ".webp";
    await env.BUCKET.put(key, req.body, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
    return Response.json({ url: env.PUBLIC_URL + "/" + key }, { headers: cors });
  },
};
