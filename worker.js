const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*"
    }
  });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    try {

      // ================================
      // SİSTEM SAĞLIK KONTROLÜ
      // ================================

      if (request.method === "GET" && path === "/api/health") {

        return json({
          ok: true,
          service: "stok-skt-cari-takip",
          database: "D1",
          time: new Date().toISOString()
        });
      }


      // ================================
      // DASHBOARD
      // ================================

      if (request.method === "GET" && path === "/api/dashboard") {

        const firmalar = await env.DB
          .prepare(`
            SELECT COUNT(*) AS sayi
            FROM firmalar
            WHERE aktif = 1
          `)
          .first();

        const subeler = await env.DB
          .prepare(`
            SELECT COUNT(*) AS sayi
            FROM subeler
            WHERE aktif = 1
          `)
          .first();

        const urunler = await env.DB
          .prepare(`
            SELECT COUNT(*) AS sayi
            FROM urunler
            WHERE aktif = 1
          `)
          .first();

        const cariler = await env.DB
          .prepare(`
            SELECT COALESCE(SUM(bakiye),0) AS bakiye
            FROM cariler
            WHERE aktif = 1
          `)
          .first();

        const stok = await env.DB
          .prepare(`
            SELECT COALESCE(SUM(miktar),0) AS miktar
            FROM mevcut_stoklar
          `)
          .first();

        return json({
          ok: true,
          firmalar: firmalar?.sayi || 0,
          subeler: subeler?.sayi || 0,
          urunler: urunler?.sayi || 0,
          cari_bakiye: cariler?.bakiye || 0,
          toplam_stok: stok?.miktar || 0
        });
      }


// ================================
// FİRMALAR - CRUD
// ================================

// GET /api/firmalar
// Tüm aktif firmaları getir
if (request.method === "GET" && path === "/api/firmalar") {
  const { results } = await env.DB
    .prepare(`
      SELECT
        id,
        ad,
        vergi_no,
        telefon,
        email,
        adres,
        aktif,
        olusturma_tarihi
      FROM firmalar
      WHERE aktif = 1
      ORDER BY id DESC
    `)
    .all();

  return json(results);
}


// /api/firmalar/:id
const firmaMatch = path.match(/^\/api\/firmalar\/(\d+)$/);
const firmaId = firmaMatch ? Number(firmaMatch[1]) : null;


// GET /api/firmalar/:id
// Tek firma getir
if (request.method === "GET" && firmaId !== null) {

  const firma = await env.DB
    .prepare(`
      SELECT
        id,
        ad,
        vergi_no,
        telefon,
        email,
        adres,
        aktif,
        olusturma_tarihi
      FROM firmalar
      WHERE id = ?
        AND aktif = 1
    `)
    .bind(firmaId)
    .first();

  if (!firma) {
    return json({
      ok: false,
      error: "Firma bulunamadı."
    }, 404);
  }

  return json(firma);
}


// POST /api/firmalar
// Yeni firma ekle
if (request.method === "POST" && path === "/api/firmalar") {

  const body = await request.json();

  const ad = String(body.ad ?? "").trim();
  const vergiNo = String(body.vergi_no ?? "").trim() || null;
  const telefon = String(body.telefon ?? "").trim() || null;
  const email = String(body.email ?? "").trim() || null;
  const adres = String(body.adres ?? "").trim() || null;

  // Firma adı zorunlu
  if (!ad) {
    return json({
      ok: false,
      error: "Firma adı zorunludur."
    }, 400);
  }

  // Vergi numarası mükerrer kontrolü
  if (vergiNo) {

    const mevcut = await env.DB
      .prepare(`
        SELECT id, ad
        FROM firmalar
        WHERE vergi_no = ?
          AND aktif = 1
        LIMIT 1
      `)
      .bind(vergiNo)
      .first();

    if (mevcut) {
      return json({
        ok: false,
        error: "Bu vergi numarasıyla kayıtlı aktif bir firma zaten var.",
        mevcut_firma_id: mevcut.id,
        mevcut_firma: mevcut.ad
      }, 409);
    }
  }

  const result = await env.DB
    .prepare(`
      INSERT INTO firmalar
      (
        ad,
        vergi_no,
        telefon,
        email,
        adres,
        aktif
      )
      VALUES (?, ?, ?, ?, ?, 1)
    `)
    .bind(
      ad,
      vergiNo,
      telefon,
      email,
      adres
    )
    .run();

  const yeniFirma = await env.DB
    .prepare(`
      SELECT
        id,
        ad,
        vergi_no,
        telefon,
        email,
        adres,
        aktif,
        olusturma_tarihi
      FROM firmalar
      WHERE id = ?
    `)
    .bind(result.meta.last_row_id)
    .first();

  return json({
    ok: true,
    mesaj: "Firma başarıyla oluşturuldu.",
    firma: yeniFirma
  }, 201);
}


// PUT /api/firmalar/:id
// Firma güncelle
if (request.method === "PUT" && firmaId !== null) {

  const mevcut = await env.DB
    .prepare(`
      SELECT
        id,
        ad,
        vergi_no,
        telefon,
        email,
        adres
      FROM firmalar
      WHERE id = ?
    `)
    .bind(firmaId)
    .first();

  if (!mevcut) {
    return json({
      ok: false,
      error: "Firma bulunamadı."
    }, 404);
  }

  const body = await request.json();

  const ad = String(body.ad ?? mevcut.ad ?? "").trim();
  const vergiNo =
    String(body.vergi_no ?? mevcut.vergi_no ?? "").trim() || null;

  const telefon =
    String(body.telefon ?? mevcut.telefon ?? "").trim() || null;

  const email =
    String(body.email ?? mevcut.email ?? "").trim() || null;

  const adres =
    String(body.adres ?? mevcut.adres ?? "").trim() || null;


  // Firma adı zorunlu
  if (!ad) {
    return json({
      ok: false,
      error: "Firma adı zorunludur."
    }, 400);
  }


  // Başka firmada aynı vergi numarası var mı?
  if (vergiNo) {

    const duplicate = await env.DB
      .prepare(`
        SELECT id, ad
        FROM firmalar
        WHERE vergi_no = ?
          AND id != ?
          AND aktif = 1
        LIMIT 1
      `)
      .bind(vergiNo, firmaId)
      .first();

    if (duplicate) {
      return json({
        ok: false,
        error: "Bu vergi numarası başka bir aktif firmaya ait.",
        mevcut_firma_id: duplicate.id,
        mevcut_firma: duplicate.ad
      }, 409);
    }
  }


  await env.DB
    .prepare(`
      UPDATE firmalar
      SET
        ad = ?,
        vergi_no = ?,
        telefon = ?,
        email = ?,
        adres = ?
      WHERE id = ?
    `)
    .bind(
      ad,
      vergiNo,
      telefon,
      email,
      adres,
      firmaId
    )
    .run();


  const guncelFirma = await env.DB
    .prepare(`
      SELECT
        id,
        ad,
        vergi_no,
        telefon,
        email,
        adres,
        aktif,
        olusturma_tarihi
      FROM firmalar
      WHERE id = ?
    `)
    .bind(firmaId)
    .first();


  return json({
    ok: true,
    mesaj: "Firma başarıyla güncellendi.",
    firma: guncelFirma
  });
}


// DELETE /api/firmalar/:id
// Firmayı fiziksel olarak silmez.
// Sadece pasifleştirir.
if (request.method === "DELETE" && firmaId !== null) {

  const mevcut = await env.DB
    .prepare(`
      SELECT id, ad
      FROM firmalar
      WHERE id = ?
        AND aktif = 1
    `)
    .bind(firmaId)
    .first();

  if (!mevcut) {
    return json({
      ok: false,
      error: "Firma bulunamadı veya zaten pasif."
    }, 404);
  }


  // Bağlı kayıtları kontrol et
  const bagli = await env.DB
    .prepare(`
      SELECT

        (
          SELECT COUNT(*)
          FROM subeler
          WHERE firma_id = ?
        ) AS sube_sayisi,

        (
          SELECT COUNT(*)
          FROM cariler
          WHERE firma_id = ?
        ) AS cari_sayisi,

        (
          SELECT COUNT(*)
          FROM urunler
          WHERE firma_id = ?
        ) AS urun_sayisi

    `)
    .bind(
      firmaId,
      firmaId,
      firmaId
    )
    .first();


  // Soft delete
  await env.DB
    .prepare(`
      UPDATE firmalar
      SET aktif = 0
      WHERE id = ?
    `)
    .bind(firmaId)
    .run();


  return json({
    ok: true,
    mesaj: "Firma pasifleştirildi.",
    id: firmaId,

    bagli_kayitlar: {
      sube: Number(bagli?.sube_sayisi || 0),
      cari: Number(bagli?.cari_sayisi || 0),
      urun: Number(bagli?.urun_sayisi || 0)
    }
  });
}

      // ================================
      // KATEGORİLER
      // ================================

      if (request.method === "GET" && path === "/api/kategoriler") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              k.*,
              f.ad AS firma_adi
            FROM kategoriler k
            JOIN firmalar f
              ON f.id = k.firma_id
            WHERE k.aktif = 1
            ORDER BY k.id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // BİRİMLER
      // ================================

      if (request.method === "GET" && path === "/api/birimler") {

        const { results } = await env.DB
          .prepare(`
            SELECT *
            FROM birimler
            ORDER BY id
          `)
          .all();

        return json(results);
      }


      // ================================
// ÜRÜNLER - LİSTELE
// ================================

if (request.method === "GET" && path === "/api/urunler") {

  const { results } = await env.DB
    .prepare(`
      SELECT
        u.*,
        f.ad AS firma_adi,
        k.ad AS kategori_adi,
        b.ad AS birim_adi,
        b.sembol AS birim_sembol
      FROM urunler u

      JOIN firmalar f
        ON f.id = u.firma_id

      LEFT JOIN kategoriler k
        ON k.id = u.kategori_id

      JOIN birimler b
        ON b.id = u.birim_id

      WHERE u.aktif = 1

      ORDER BY u.id DESC
    `)
    .all();

  return json(results);
}


// ================================
// ÜRÜNLER - EKLE
// ================================

if (request.method === "POST" && path === "/api/urunler") {

  const body = await request.json();

  if (
    !body.firma_id ||
    !body.birim_id ||
    !body.kod ||
    !body.ad
  ) {

    return json({
      ok: false,
      error: "Firma, birim, ürün kodu ve ürün adı zorunludur."
    }, 400);

  }

  const result = await env.DB
    .prepare(`
      INSERT INTO urunler (
        firma_id,
        kategori_id,
        birim_id,
        kod,
        ad,
        marka,
        alis_fiyati,
        satis_fiyati,
        minimum_stok,
        maksimum_stok,
        kdv_orani,
        terazi_urunu,
        aktif
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)
    .bind(
      Number(body.firma_id),
      body.kategori_id ? Number(body.kategori_id) : null,
      Number(body.birim_id),
      body.kod.trim(),
      body.ad.trim(),
      body.marka?.trim() || null,
      Number(body.alis_fiyati || 0),
      Number(body.satis_fiyati || 0),
      Number(body.minimum_stok || 0),
      Number(body.maksimum_stok || 0),
      Number(body.kdv_orani || 0),
      body.tartili_urun ? 1 : 0
    )
    .run();

  return json({
    ok: true,
    mesaj: "Ürün başarıyla oluşturuldu.",
    id: result.meta.last_row_id
  }, 201);
}
if (request.method === "GET" && path === "/api/urunler") {
const { results } = await env.DB
          .prepare(`
            SELECT
              u.*,
              f.ad AS firma_adi,
              k.ad AS kategori_adi,
              b.ad AS birim_adi,
              b.sembol AS birim_sembol
            FROM urunler u
            JOIN firmalar f
              ON f.id = u.firma_id
            LEFT JOIN kategoriler k
              ON k.id = u.kategori_id
            JOIN birimler b
              ON b.id = u.birim_id
            WHERE u.aktif = 1
            ORDER BY u.id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // BARKODLAR
      // ================================

      if (request.method === "GET" && path === "/api/barkodlar") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              b.*,
              u.kod AS urun_kodu,
              u.ad AS urun_adi
            FROM barkodlar b
            JOIN urunler u
              ON u.id = b.urun_id
            ORDER BY b.id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // DEPOLAR
      // ================================

      if (request.method === "GET" && path === "/api/depolar") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              d.*,
              s.ad AS sube_adi
            FROM depolar d
            JOIN subeler s
              ON s.id = d.sube_id
            WHERE d.aktif = 1
            ORDER BY d.id DESC
          `)
          .all();

        return json(results);
      }


    // ================================
// STOK
// ================================

if (request.method === "GET" && path === "/api/stok") {

  const { results } = await env.DB
    .prepare(`
      SELECT
        ms.urun_id,
        ms.depo_id,
        ms.miktar AS mevcut_miktar,

        u.kod,
        u.ad AS urun_adi,
        u.minimum_stok,
        u.maksimum_stok,

        d.ad AS depo_adi

      FROM mevcut_stoklar ms

      JOIN urunler u
        ON u.id = ms.urun_id

      JOIN depolar d
        ON d.id = ms.depo_id

      WHERE u.aktif = 1
        AND d.aktif = 1

      ORDER BY u.ad
    `)
    .all();

  return json(results);
}
      // ================================
      // PARTİ / SKT
      // ================================

      if (request.method === "GET" && path === "/api/skt") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              p.*,
              u.kod AS urun_kodu,
              u.ad AS urun_adi,
              d.ad AS depo_adi
            FROM partiler p
            JOIN urunler u
              ON u.id = p.urun_id
            JOIN depolar d
              ON d.id = p.depo_id
            ORDER BY p.son_kullanma_tarihi ASC
          `)
          .all();

        return json(results);
      }


      // ================================
      // CARİLER
      // ================================

      if (request.method === "GET" && path === "/api/cariler") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              c.*,
              f.ad AS firma_adi
            FROM cariler c
            JOIN firmalar f
              ON f.id = c.firma_id
            WHERE c.aktif = 1
            ORDER BY c.id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // KASALAR
      // ================================

      if (request.method === "GET" && path === "/api/kasalar") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              k.*,
              s.ad AS sube_adi
            FROM kasalar k
            JOIN subeler s
              ON s.id = k.sube_id
            WHERE k.aktif = 1
            ORDER BY k.id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // SATIN ALMA
      // ================================

      if (
        request.method === "GET" &&
        path === "/api/satin-alma"
      ) {

        const { results } = await env.DB
          .prepare(`
            SELECT *
            FROM satin_alma_siparisleri
            ORDER BY id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // MAL KABUL
      // ================================

      if (
        request.method === "GET" &&
        path === "/api/mal-kabul"
      ) {

        const { results } = await env.DB
          .prepare(`
            SELECT *
            FROM mal_kabuller
            ORDER BY id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // SATIŞLAR
      // ================================

      if (request.method === "GET" && path === "/api/satislar") {

        const { results } = await env.DB
          .prepare(`
            SELECT *
            FROM satislar
            ORDER BY id DESC
          `)
          .all();

        return json(results);
      }


      // ================================
      // ÖDEME YÖNTEMLERİ
      // ================================

      if (
        request.method === "GET" &&
        path === "/api/odeme-yontemleri"
      ) {

        const { results } = await env.DB
          .prepare(`
            SELECT *
            FROM odeme_yontemleri
            WHERE aktif = 1
            ORDER BY id
          `)
          .all();

        return json(results);
      }


      // ================================
      // 404
      // ================================

      return json({
        ok: false,
        error: "API endpoint bulunamadı",
        path
      }, 404);


    } catch (error) {

      return json({
        ok: false,
        error: error.message,
        path
      }, 500);
    }
  }
};
