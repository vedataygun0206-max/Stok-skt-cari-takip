const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {

      // ================================
      // API HEALTH
      // ================================

      if (request.method === "GET" && path === "/api/health") {
        return json({
          ok: true,
          service: "stok-skt-cari-takip",
          time: new Date().toISOString()
        });
      }


      // ================================
      // DASHBOARD
      // ================================

      if (request.method === "GET" && path === "/api/dashboard") {

        const products = await env.DB
          .prepare(`
            SELECT COUNT(*) AS count
            FROM products
            WHERE is_active = 1
          `)
          .first();

        const companies = await env.DB
          .prepare(`
            SELECT COUNT(*) AS count
            FROM companies
            WHERE is_active = 1
          `)
          .first();

        const branches = await env.DB
          .prepare(`
            SELECT COUNT(*) AS count
            FROM branches
            WHERE is_active = 1
          `)
          .first();

        const accounts = await env.DB
          .prepare(`
            SELECT COALESCE(SUM(balance),0) AS balance
            FROM accounts
            WHERE is_active = 1
          `)
          .first();

        return json({
          products: products?.count || 0,
          companies: companies?.count || 0,
          branches: branches?.count || 0,
          balance: accounts?.balance || 0
        });
      }


      // ================================
      // PRODUCTS
      // ================================

      if (request.method === "GET" && path === "/api/products") {

        const { results } = await env.DB.prepare(`
          SELECT
            p.*,
            c.name AS category_name,
            u.symbol AS unit_symbol
          FROM products p
          LEFT JOIN categories c
            ON c.id = p.category_id
          LEFT JOIN units u
            ON u.id = p.unit_id
          WHERE p.is_active = 1
          ORDER BY p.id DESC
        `).all();

        return json(results);
      }


      // ================================
      // COMPANIES
      // ================================

      if (request.method === "GET" && path === "/api/companies") {

        const { results } = await env.DB.prepare(`
          SELECT *
          FROM companies
          ORDER BY id DESC
        `).all();

        return json(results);
      }


      // ================================
      // ANA SAYFA
      // ================================

      return new Response(HTML, {
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      });

    } catch (error) {

      return json({
        ok: false,
        error: error.message
      }, 500);
    }
  }
};


const HTML = `<!doctype html>
<html lang="tr">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>SKT Stok & Cari Takip</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f4f6f8;
  color:#17202a;
}

header{
  background:#17202a;
  color:white;
  padding:18px 20px;
}

.logo{
  font-size:22px;
  font-weight:bold;
}

.subtitle{
  margin-top:5px;
  opacity:.75;
  font-size:14px;
}

nav{
  background:white;
  display:flex;
  gap:8px;
  padding:10px;
  overflow-x:auto;
  border-bottom:1px solid #ddd;
}

nav button{
  border:0;
  padding:10px 14px;
  border-radius:8px;
  background:#eef1f4;
  font-weight:bold;
  white-space:nowrap;
}

nav button:hover{
  background:#17202a;
  color:white;
}

main{
  max-width:1250px;
  margin:auto;
  padding:20px;
}

.welcome{
  background:white;
  padding:22px;
  border-radius:14px;
  margin-bottom:20px;
  box-shadow:0 2px 10px #00000010;
}

.welcome h1{
  margin:0 0 7px;
}

.cards{
  display:grid;
  grid-template-columns:
    repeat(auto-fit,minmax(190px,1fr));
  gap:14px;
}

.card{
  background:white;
  padding:20px;
  border-radius:14px;
  box-shadow:0 2px 10px #00000010;
}

.card .icon{
  font-size:28px;
}

.card .label{
  margin-top:8px;
  color:#68727d;
}

.card .number{
  font-size:28px;
  font-weight:bold;
  margin-top:5px;
}

.modules{
  display:grid;
  grid-template-columns:
    repeat(auto-fit,minmax(210px,1fr));
  gap:14px;
  margin-top:20px;
}

.module{
  background:white;
  padding:20px;
  border-radius:14px;
  border:1px solid #e5e8eb;
  cursor:pointer;
  transition:.15s;
}

.module:hover{
  transform:translateY(-2px);
  box-shadow:0 5px 18px #00000015;
}

.module .micon{
  font-size:32px;
}

.module h3{
  margin:10px 0 5px;
}

.module p{
  margin:0;
  color:#69737d;
  font-size:14px;
}

section{
  margin-top:25px;
}

.title{
  font-size:20px;
  font-weight:bold;
  margin-bottom:12px;
}

.panel{
  background:white;
  border-radius:14px;
  padding:18px;
  box-shadow:0 2px 10px #00000010;
}

table{
  width:100%;
  border-collapse:collapse;
}

th,td{
  padding:11px;
  border-bottom:1px solid #eee;
  text-align:left;
}

th{
  background:#f0f2f4;
}

.status{
  color:#16803c;
  font-weight:bold;
}

@media(max-width:600px){

  main{
    padding:12px;
  }

  .welcome{
    padding:17px;
  }

}

</style>

</head>


<body>


<header>

<div class="logo">
📦 SKT Stok & Cari Takip
</div>

<div class="subtitle">
Market Yönetim ve Stok Kontrol Sistemi
</div>

</header>


<nav>

<button onclick="go('dashboard')">
🏠 Ana Sayfa
</button>

<button onclick="coming('Ürün Yönetimi')">
📦 Ürünler
</button>

<button onclick="coming('Stok Yönetimi')">
📊 Stok
</button>

<button onclick="coming('SKT Takibi')">
⏰ SKT
</button>

<button onclick="coming('Cari Hesaplar')">
🧾 Cari
</button>

<button onclick="coming('Kasa')">
💰 Kasa
</button>

<button onclick="coming('POS')">
🛒 POS
</button>

</nav>


<main>


<div class="welcome">

<h1>
Hoş Geldiniz 👋
</h1>

<div>
Marketinizin stok, SKT, cari, kasa ve satış işlemlerini
tek merkezden yönetin.
</div>

</div>


<div class="cards">


<div class="card">

<div class="icon">🏢</div>

<div class="label">
Firma
</div>

<div
  class="number"
  id="companies"
>
0
</div>

</div>


<div class="card">

<div class="icon">🏪</div>

<div class="label">
Şube
</div>

<div
  class="number"
  id="branches"
>
0
</div>

</div>


<div class="card">

<div class="icon">📦</div>

<div class="label">
Aktif Ürün
</div>

<div
  class="number"
  id="products"
>
0
</div>

</div>


<div class="card">

<div class="icon">🧾</div>

<div class="label">
Cari Bakiye
</div>

<div
  class="number"
  id="balance"
>
0,00 ₺
</div>

</div>

</div>


<section>

<div class="title">
⚡ Hızlı İşlemler
</div>


<div class="modules">


<div
 class="module"
 onclick="coming('Ürün Yönetimi')"
>

<div class="micon">📦</div>

<h3>
Ürün Yönetimi
</h3>

<p>
Ürün kartları, fiyatlar ve barkodlar
</p>

</div>


<div
 class="module"
 onclick="coming('Stok Yönetimi')"
>

<div class="micon">📊</div>

<h3>
Stok Yönetimi
</h3>

<p>
Stok giriş, çıkış ve hareketleri
</p>

</div>


<div
 class="module"
 onclick="coming('SKT Takibi')"
>

<div class="micon">⏰</div>

<h3>
SKT Takibi
</h3>

<p>
Son kullanma tarihi kontrolü
</p>

</div>


<div
 class="module"
 onclick="coming('Cari Hesaplar')"
>

<div class="micon">🧾</div>

<h3>
Cari Hesaplar
</h3>

<p>
Müşteri ve tedarikçi hesapları
</p>

</div>


<div
 class="module"
 onclick="coming('Firma ve Şubeler')"
>

<div class="micon">🏢</div>

<h3>
Firma / Şube
</h3>

<p>
Firma ve şube yönetimi
</p>

</div>


<div
 class="module"
 onclick="coming('Raporlama')"
>

<div class="micon">📈</div>

<h3>
Raporlar
</h3>

<p>
Satış, stok ve kârlılık raporları
</p>

</div>


<div
 class="module"
 onclick="coming('Kasa Yönetimi')"
>

<div class="micon">💰</div>

<h3>
Kasa
</h3>

<p>
Kasa, nakit ve gün sonu işlemleri
</p>

</div>


<div
 class="module"
 onclick="coming('Kullanıcı ve Yetkiler')"
>

<div class="micon">🔐</div>

<h3>
Yetkilendirme
</h3>

<p>
Kullanıcı, rol ve işlem yetkileri
</p>

</div>


</div>

</section>


<section>

<div class="title">
🟢 Sistem Durumu
</div>

<div class="panel">

<div class="status">
✓ Worker aktif
</div>

<br>

<div class="status">
✓ D1 veritabanı bağlantısı aktif
</div>

<br>

<div class="status">
✓ API sistemi aktif
</div>

</div>

</section>


<section>

<div class="title">
📦 Son Ürünler
</div>

<div class="panel">

<table>

<thead>

<tr>
<th>Kod</th>
<th>Ürün</th>
<th>Marka</th>
<th>Satış Fiyatı</th>
</tr>

</thead>

<tbody id="productRows">

<tr>
<td colspan="4">
Yükleniyor...
</td>
</tr>

</tbody>

</table>

</div>

</section>


</main>


<script>


async function loadDashboard(){

  try{

    const r =
      await fetch("/api/dashboard");

    if(!r.ok){
      throw new Error("Dashboard API");
    }

    const data =
      await r.json();

    document.getElementById("companies")
      .textContent =
      data.companies || 0;

    document.getElementById("branches")
      .textContent =
      data.branches || 0;

    document.getElementById("products")
      .textContent =
      data.products || 0;

    document.getElementById("balance")
      .textContent =
      Number(data.balance || 0)
      .toLocaleString("tr-TR",{
        minimumFractionDigits:2,
        maximumFractionDigits:2
      }) + " ₺";

  }catch(e){

    console.error(e);

  }

}


async function loadProducts(){

  try{

    const r =
      await fetch("/api/products");

    const data =
      await r.json();

    const rows =
      document.getElementById("productRows");

    if(!data.length){

      rows.innerHTML =
        '<tr><td colspan="4">Henüz ürün yok.</td></tr>';

      return;
    }

    rows.innerHTML =
      data.slice(0,20).map(p => `

        <tr>

          <td>${esc(p.code)}</td>

          <td>${esc(p.name)}</td>

          <td>${esc(p.brand || "-")}</td>

          <td>
            ${Number(p.sale_price || 0)
              .toLocaleString("tr-TR",{
                minimumFractionDigits:2
              })} ₺
          </td>

        </tr>

      `).join("");

  }catch(e){

    document.getElementById("productRows")
      .innerHTML =
      '<tr><td colspan="4">Ürünler yüklenemedi.</td></tr>';

  }

}


function esc(v){

  return String(v ?? "")
    .replace(/[&<>"']/g,m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[m]));

}


function coming(name){

  alert(
    name +
    "\\n\\nBu modül hazırlanıyor.\\n\\n" +
    "Sistemin sonraki geliştirme aşamasında aktif edilecek."
  );

}


function go(page){

  if(page === "dashboard"){

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });

  }

}


loadDashboard();
loadProducts();

</script>


</body>

</html>`;
