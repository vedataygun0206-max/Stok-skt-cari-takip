const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {

      // =====================================================
      // HEALTH
      // =====================================================

      if (request.method === "GET" && path === "/api/health") {
        return json({
          ok: true,
          service: "stok-skt-cari-takip",
          time: new Date().toISOString()
        });
      }


      // =====================================================
      // DASHBOARD
      // =====================================================

      if (request.method === "GET" && path === "/api/dashboard") {

        const products = await env.DB
          .prepare("SELECT COUNT(*) AS count FROM products WHERE is_active = 1")
          .first();

        const companies = await env.DB
          .prepare("SELECT COUNT(*) AS count FROM companies WHERE is_active = 1")
          .first();

        const branches = await env.DB
          .prepare("SELECT COUNT(*) AS count FROM branches WHERE is_active = 1")
          .first();

        const accounts = await env.DB
          .prepare("SELECT COALESCE(SUM(balance),0) AS balance FROM accounts WHERE is_active = 1")
          .first();

        return json({
          products: products?.count || 0,
          companies: companies?.count || 0,
          branches: branches?.count || 0,
          balance: accounts?.balance || 0
        });
      }


      // =====================================================
      // COMPANIES - LIST
      // =====================================================

      if (request.method === "GET" && path === "/api/companies") {

        const { results } = await env.DB.prepare(`
          SELECT
            id,
            name,
            tax_no,
            phone,
            email,
            address,
            is_active,
            created_at
          FROM companies
          ORDER BY id DESC
        `).all();

        return json(results);
      }


      // =====================================================
      // COMPANIES - CREATE
      // =====================================================

      if (request.method === "POST" && path === "/api/companies") {

        const body = await request.json();

        const name = clean(body.name);

        if (!name) {
          return json({
            error: "Firma adı zorunludur."
          }, 400);
        }

        const result = await env.DB.prepare(`
          INSERT INTO companies
          (name, tax_no, phone, email, address, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
        `).bind(
          name,
          clean(body.tax_no) || null,
          clean(body.phone) || null,
          clean(body.email) || null,
          clean(body.address) || null
        ).run();

        return json({
          ok: true,
          id: result.meta.last_row_id,
          message: "Firma başarıyla eklendi."
        }, 201);
      }


      // =====================================================
      // COMPANIES - UPDATE
      // =====================================================

      if (
        request.method === "PUT" &&
        path.startsWith("/api/companies/")
      ) {

        const id = Number(path.split("/").pop());

        if (!Number.isInteger(id)) {
          return json({
            error: "Geçersiz firma ID."
          }, 400);
        }

        const body = await request.json();

        const name = clean(body.name);

        if (!name) {
          return json({
            error: "Firma adı zorunludur."
          }, 400);
        }

        await env.DB.prepare(`
          UPDATE companies
          SET
            name = ?,
            tax_no = ?,
            phone = ?,
            email = ?,
            address = ?
          WHERE id = ?
        `).bind(
          name,
          clean(body.tax_no) || null,
          clean(body.phone) || null,
          clean(body.email) || null,
          clean(body.address) || null,
          id
        ).run();

        return json({
          ok: true,
          message: "Firma güncellendi."
        });
      }


      // =====================================================
      // COMPANIES - DELETE / PASSIVE
      // =====================================================

      if (
        request.method === "DELETE" &&
        path.startsWith("/api/companies/")
      ) {

        const id = Number(path.split("/").pop());

        if (!Number.isInteger(id)) {
          return json({
            error: "Geçersiz firma ID."
          }, 400);
        }

        await env.DB.prepare(`
          UPDATE companies
          SET is_active = 0
          WHERE id = ?
        `).bind(id).run();

        return json({
          ok: true,
          message: "Firma pasif hale getirildi."
        });
      }


      // =====================================================
      // PRODUCTS - LIST
      // =====================================================

      if (request.method === "GET" && path === "/api/products") {

        const { results } = await env.DB.prepare(`
          SELECT
            p.*,
            c.name AS category_name,
            u.symbol AS unit_symbol
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          LEFT JOIN units u ON u.id = p.unit_id
          WHERE p.is_active = 1
          ORDER BY p.id DESC
        `).all();

        return json(results);
      }


      // =====================================================
      // PRODUCTS - CREATE
      // =====================================================

      if (request.method === "POST" && path === "/api/products") {

        const body = await request.json();

        if (
          !body.company_id ||
          !body.unit_id ||
          !body.code ||
          !body.name
        ) {
          return json({
            error: "company_id, unit_id, code ve name zorunludur."
          }, 400);
        }

        const result = await env.DB.prepare(`
          INSERT INTO products
          (
            company_id,
            category_id,
            unit_id,
            code,
            name,
            brand,
            purchase_price,
            sale_price,
            min_stock,
            vat_rate,
            scale_product
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          body.company_id,
          body.category_id ?? null,
          body.unit_id,
          body.code,
          body.name,
          body.brand ?? null,
          body.purchase_price ?? 0,
          body.sale_price ?? 0,
          body.min_stock ?? 0,
          body.vat_rate ?? 0,
          body.scale_product ? 1 : 0
        ).run();

        return json({
          ok: true,
          id: result.meta.last_row_id
        }, 201);
      }


      // =====================================================
      // HTML PANEL
      // =====================================================

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

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f4f6f8;
  color: #17202a;
}

header {
  background: #17202a;
  color: white;
  padding: 18px 22px;
  font-size: 21px;
  font-weight: 700;
}

nav {
  background: white;
  border-bottom: 1px solid #ddd;
  padding: 10px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

nav button {
  border: 0;
  background: #eef1f4;
  padding: 10px 15px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

nav button.active {
  background: #17202a;
  color: white;
}

main {
  max-width: 1200px;
  margin: auto;
  padding: 20px;
}

.grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit,minmax(180px,1fr));
  gap: 14px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 10px #00000012;
}

.card b {
  display: block;
  font-size: 28px;
  margin-top: 8px;
}

section {
  margin-top: 22px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
}

.panel {
  background: white;
  padding: 18px;
  border-radius: 12px;
  box-shadow: 0 2px 10px #00000012;
}

.form-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit,minmax(180px,1fr));
  gap: 10px;
}

input,
textarea {
  width: 100%;
  padding: 11px;
  border: 1px solid #d6dbe0;
  border-radius: 8px;
  font-size: 15px;
}

textarea {
  min-height: 80px;
}

.btn {
  border: 0;
  border-radius: 8px;
  padding: 11px 16px;
  cursor: pointer;
  font-weight: 700;
}

.btn-primary {
  background: #17202a;
  color: white;
}

.btn-danger {
  background: #c62828;
  color: white;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

th,
td {
  padding: 11px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

th {
  background: #f0f2f4;
}

.badge {
  padding: 5px 8px;
  border-radius: 6px;
  background: #e8f5e9;
}

.hidden {
  display: none;
}

.message {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #eef5ff;
}

@media(max-width:600px) {

  main {
    padding: 12px;
  }

  table {
    font-size: 13px;
  }

  th,
  td {
    padding: 8px;
  }

}

</style>

</head>

<body>

<header>
📦 SKT Stok & Cari Takip — Yönetim Paneli
</header>


<nav>

<button
  id="navDashboard"
  class="active"
  onclick="showPage('dashboard')"
>
Ana Sayfa
</button>

<button
  id="navCompanies"
  onclick="showPage('companies')"
>
🏢 Firmalar
</button>

<button
  onclick="alert('Şube modülü bir sonraki aşamada açılacak.')"
>
🏪 Şubeler
</button>

<button
  onclick="alert('Ürün modülü bir sonraki aşamada açılacak.')"
>
📦 Ürünler
</button>

</nav>


<main>


<!-- =====================================================
     DASHBOARD
===================================================== -->

<div id="dashboardPage">

<div class="grid">

<div class="card">
Firma Sayısı
<b id="companiesCount">0</b>
</div>

<div class="card">
Şube Sayısı
<b id="branchesCount">0</b>
</div>

<div class="card">
Ürün Sayısı
<b id="productsCount">0</b>
</div>

<div class="card">
Cari Bakiye
<b id="balance">0,00 ₺</b>
</div>

</div>


<section>

<div class="title">
Sistem Durumu
</div>

<div class="panel">

<div>
🟢 D1 Veritabanı bağlantısı aktif
</div>

<div style="margin-top:8px">
🟢 Worker aktif
</div>

<div style="margin-top:8px">
🟢 Yönetim paneli aktif
</div>

</div>

</section>

</div>


<!-- =====================================================
     COMPANIES
===================================================== -->

<div
  id="companiesPage"
  class="hidden"
>

<section>

<div class="title">
🏢 Firma Yönetimi
</div>

<div class="panel">

<div class="form-grid">

<input
  id="companyName"
  placeholder="Firma adı *"
>

<input
  id="companyTax"
  placeholder="Vergi No"
>

<input
  id="companyPhone"
  placeholder="Telefon"
>

<input
  id="companyEmail"
  placeholder="E-posta"
>

</div>

<div style="margin-top:10px">

<textarea
  id="companyAddress"
  placeholder="Adres"
></textarea>

</div>

<div class="actions">

<button
  class="btn btn-primary"
  onclick="saveCompany()"
>
➕ Firma Ekle
</button>

<button
  class="btn"
  onclick="clearCompanyForm()"
>
Temizle
</button>

</div>

<div
  id="companyMessage"
  class="message hidden"
></div>

</div>

</section>


<section>

<div class="title">
Firma Listesi
</div>

<div class="panel">

<input
  id="companySearch"
  placeholder="Firma ara..."
  oninput="filterCompanies()"
>

</div>

<br>

<table>

<thead>

<tr>
<th>ID</th>
<th>Firma</th>
<th>Vergi No</th>
<th>Telefon</th>
<th>E-posta</th>
<th>Durum</th>
<th>İşlem</th>
</tr>

</thead>

<tbody id="companyRows">

<tr>
<td colspan="7">
Yükleniyor...
</td>
</tr>

</tbody>

</table>

</section>

</div>

</main>


<script>

let companies = [];


// =====================================================
// PAGE
// =====================================================

function showPage(page) {

  document
    .getElementById("dashboardPage")
    .classList.toggle("hidden", page !== "dashboard");

  document
    .getElementById("companiesPage")
    .classList.toggle("hidden", page !== "companies");

  document
    .getElementById("navDashboard")
    .classList.toggle("active", page === "dashboard");

  document
    .getElementById("navCompanies")
    .classList.toggle("active", page === "companies");

  if (page === "companies") {
    loadCompanies();
  }
}


// =====================================================
// DASHBOARD
// =====================================================

async function loadDashboard() {

  try {

    const r =
      await fetch("/api/dashboard");

    const data =
      await r.json();

    document
      .getElementById("companiesCount")
      .textContent = data.companies || 0;

    document
      .getElementById("branchesCount")
      .textContent = data.branches || 0;

    document
      .getElementById("productsCount")
      .textContent = data.products || 0;

    document
      .getElementById("balance")
      .textContent =
      Number(data.balance || 0)
      .toLocaleString("tr-TR", {
        minimumFractionDigits: 2
      }) + " ₺";

  } catch (e) {

    console.error(e);

  }
}


// =====================================================
// COMPANIES
// =====================================================

async function loadCompanies() {

  try {

    const r =
      await fetch("/api/companies");

    companies =
      await r.json();

    renderCompanies(companies);

  } catch (e) {

    document
      .getElementById("companyRows")
      .innerHTML =
      '<tr><td colspan="7">Firmalar yüklenemedi.</td></tr>';

  }
}


function renderCompanies(list) {

  const rows =
    document.getElementById("companyRows");

  if (!list.length) {

    rows.innerHTML =
      '<tr><td colspan="7">Henüz firma yok.</td></tr>';

    return;
  }

  rows.innerHTML =
    list.map(c => `

      <tr>

        <td>${esc(c.id)}</td>

        <td><b>${esc(c.name)}</b></td>

        <td>${esc(c.tax_no || "-")}</td>

        <td>${esc(c.phone || "-")}</td>

        <td>${esc(c.email || "-")}</td>

        <td>
          ${
            c.is_active
              ? '<span class="badge">Aktif</span>'
              : 'Pasif'
          }
        </td>

        <td>

          ${
            c.is_active
              ? `
                <button
                  class="btn btn-danger"
                  onclick="deactivateCompany(${c.id})"
                >
                  Pasifleştir
                </button>
              `
              : ""
          }

        </td>

      </tr>

    `).join("");

}


// =====================================================
// SAVE COMPANY
// =====================================================

async function saveCompany() {

  const body = {

    name:
      document
        .getElementById("companyName")
        .value,

    tax_no:
      document
        .getElementById("companyTax")
        .value,

    phone:
      document
        .getElementById("companyPhone")
        .value,

    email:
      document
        .getElementById("companyEmail")
        .value,

    address:
      document
        .getElementById("companyAddress")
        .value

  };


  if (!body.name.trim()) {

    showMessage(
      "Firma adı zorunludur."
    );

    return;
  }


  try {

    const r =
      await fetch(
        "/api/companies",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json"
          },
          body:
            JSON.stringify(body)
        }
      );

    const data =
      await r.json();

    if (!r.ok) {

      showMessage(
        data.error || "Firma eklenemedi."
      );

      return;
    }


    showMessage(
      "✅ Firma başarıyla eklendi."
    );

    clearCompanyForm();

    await loadCompanies();

    await loadDashboard();

  } catch (e) {

    showMessage(
      "Sunucu bağlantı hatası."
    );

  }

}


// =====================================================
// DEACTIVATE
// =====================================================

async function deactivateCompany(id) {

  if (
    !confirm(
      "Bu firmayı pasif yapmak istediğinize emin misiniz?"
    )
  ) {
    return;
  }


  try {

    const r =
      await fetch(
        "/api/companies/" + id,
        {
          method: "DELETE"
        }
      );

    const data =
      await r.json();

    if (!r.ok) {

      alert(
        data.error ||
        "İşlem başarısız."
      );

      return;
    }

    await loadCompanies();

    await loadDashboard();

  } catch (e) {

    alert(
      "Sunucu bağlantı hatası."
    );

  }

}


// =====================================================
// SEARCH
// =====================================================

function filterCompanies() {

  const q =
    document
      .getElementById("companySearch")
      .value
      .toLowerCase()
      .trim();

  const filtered =
    companies.filter(c =>
      String(c.name || "")
        .toLowerCase()
        .includes(q)
      ||
      String(c.tax_no || "")
        .toLowerCase()
        .includes(q)
      ||
      String(c.phone || "")
        .toLowerCase()
        .includes(q)
    );

  renderCompanies(filtered);
}


// =====================================================
// FORM
// =====================================================

function clearCompanyForm() {

  document.getElementById("companyName").value = "";
  document.getElementById("companyTax").value = "";
  document.getElementById("companyPhone").value = "";
  document.getElementById("companyEmail").value = "";
  document.getElementById("companyAddress").value = "";

}


function showMessage(text) {

  const box =
    document.getElementById("companyMessage");

  box.textContent = text;

  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 3500);

}


// =====================================================
// ESCAPE
// =====================================================

function esc(v) {

  return String(v ?? "")
    .replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));

}


// =====================================================
// START
// =====================================================

loadDashboard();

</script>

</body>
</html>`;
