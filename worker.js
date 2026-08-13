const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/api/health") {
      return json({ ok: true, service: "stok-skt-cari-takip", time: new Date().toISOString() });
    }

    if (request.method === "GET" && path === "/api/products") {
      const { results } = await env.DB.prepare(`
        SELECT p.*, c.name AS category_name, u.symbol AS unit_symbol
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN units u ON u.id = p.unit_id
        WHERE p.is_active = 1
        ORDER BY p.id DESC
      `).all();
      return json(results);
    }

    if (request.method === "POST" && path === "/api/products") {
      const body = await request.json();
      if (!body.company_id || !body.unit_id || !body.code || !body.name) {
        return json({ error: "company_id, unit_id, code ve name zorunludur." }, 400);
      }

      const result = await env.DB.prepare(`
        INSERT INTO products
        (company_id, category_id, unit_id, code, name, brand, purchase_price,
         sale_price, min_stock, vat_rate, scale_product)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        body.company_id, body.category_id ?? null, body.unit_id, body.code,
        body.name, body.brand ?? null, body.purchase_price ?? 0,
        body.sale_price ?? 0, body.min_stock ?? 0, body.vat_rate ?? 0,
        body.scale_product ? 1 : 0
      ).run();

      return json({ ok: true, id: result.meta.last_row_id }, 201);
    }

    return new Response(HTML, {
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  }
};

const HTML = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKT Stok & Cari Takip</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#f4f6f8;color:#17202a}
header{background:#17202a;color:#fff;padding:18px 22px;font-size:20px;font-weight:700}
main{max-width:1200px;margin:auto;padding:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}
.card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 2px 10px #00000012}
.card b{display:block;font-size:25px;margin-top:8px}
section{margin-top:22px}.title{font-size:18px;font-weight:700;margin-bottom:12px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}
th,td{padding:11px;border-bottom:1px solid #eee;text-align:left}
th{background:#f0f2f4}
.badge{padding:5px 8px;border-radius:6px;background:#e8f5e9}
</style>
</head>
<body>
<header>📦 SKT Stok & Cari Takip — Yönetim Paneli</header>
<main>
<div class="grid">
<div class="card">Ürün Sayısı<b id="products">—</b></div>
<div class="card">Kritik SKT<b>0</b></div>
<div class="card">Kritik Stok<b>0</b></div>
<div class="card">Cari Bakiye<b>0,00 ₺</b></div>
</div>
<section>
<div class="title">Son Ürünler</div>
<table><thead><tr><th>Kod</th><th>Ürün</th><th>Marka</th><th>Satış</th></tr></thead>
<tbody id="productRows"><tr><td colspan="4">Yükleniyor...</td></tr></tbody></table>
</section>
</main>
<script>
async function load(){
  try{
    const r=await fetch('/api/products'); const data=await r.json();
    document.querySelector('#products').textContent=data.length;
    document.querySelector('#productRows').innerHTML=data.slice(0,20).map(p=>
      '<tr><td>'+esc(p.code)+'</td><td>'+esc(p.name)+'</td><td>'+esc(p.brand||'-')+
      '</td><td>'+Number(p.sale_price||0).toFixed(2)+' ₺</td></tr>'
    ).join('') || '<tr><td colspan="4">Henüz ürün yok.</td></tr>';
  }catch(e){document.querySelector('#productRows').innerHTML='<tr><td colspan="4">API bağlantısı kurulamadı.</td></tr>'}
}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
load();
</script>
</body></html>`;
