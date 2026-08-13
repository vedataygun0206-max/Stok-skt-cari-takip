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
      // FİRMALAR
      // ================================

      if (request.method === "GET" && path === "/api/firmalar") {

        const { results } = await env.DB
          .prepare(`
            SELECT *
            FROM firmalar
            WHERE aktif = 1
            ORDER BY id DESC
          `)
          .all();

        return json(results);
      }

// ================================
// FİRMALAR
// ================================

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


if (request.method === "POST" && path === "/api/firmalar") {

  const body = await request.json();

  if (!body.ad || !body.ad.trim()) {

    return json({
      ok: false,
      error: "Firma adı zorunludur."
    }, 400);

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
      body.ad.trim(),
      body.vergi_no ?? null,
      body.telefon ?? null,
      body.email ?? null,
      body.adres ?? null
    )
    .run();

  return json({
    ok: true,
    mesaj: "Firma başarıyla oluşturuldu.",
    id: result.meta.last_row_id
  }, 201);
}
      // ================================
      // ŞUBELER
      // ================================

      if (request.method === "GET" && path === "/api/subeler") {

        const { results } = await env.DB
          .prepare(`
            SELECT
              s.*,
              f.ad AS firma_adi
            FROM subeler s
            JOIN firmalar f
              ON f.id = s.firma_id
            WHERE s.aktif = 1
            ORDER BY s.id DESC
          `)
          .all();

        return json(results);
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
      // ÜRÜNLER
      // ================================

      if (request.method === "GET" && path === "/api/urunler") {

        // ================================
// ÜRÜN EKLE
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
        kdv_orani,
        terazi_urunu,
        aktif
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `)
    .bind(
      body.firma_id,
      body.kategori_id ?? null,
      body.birim_id,
      body.kod,
      body.ad,
      body.marka ?? null,
      body.alis_fiyati ?? 0,
      body.satis_fiyati ?? 0,
      body.minimum_stok ?? 0,
      body.kdv_orani ?? 0,
      body.tartili_urun ? 1 : 0
    )
    .run();

  return json({
    ok: true,
    mesaj: "Ürün başarıyla oluşturuldu.",
    id: result.meta.last_row_id
  }, 201);
}
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
              ms.miktar,
              u.kod AS urun_kodu,
              u.ad AS urun_adi,
              d.ad AS depo_adi
            FROM mevcut_stoklar ms
            JOIN urunler u
              ON u.id = ms.urun_id
            JOIN depolar d
              ON d.id = ms.depo_id
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
