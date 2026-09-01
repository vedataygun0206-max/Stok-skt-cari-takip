const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json; charset=UTF-8"
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS
  });
}

function ok(data = {}, status = 200) {
  return response({ ok: true, ...data }, status);
}

function fail(message, status = 400, extra = {}) {
  return response({
    ok: false,
    error: message,
    ...extra
  }, status);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value, fallback = "") {
  return value === undefined || value === null
    ? fallback
    : String(value).trim();
}

function today() {
  return new Date().toISOString();
}

function validId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function sanitizeColumns(body, allowed) {
  return allowed.filter(column =>
    Object.prototype.hasOwnProperty.call(body, column)
  );
}

async function insertDynamic(DB, table, body, allowed) {
  const columns = sanitizeColumns(body, allowed);

  if (!columns.length) {
    throw new Error("Kaydedilecek veri bulunamadı.");
  }

  const placeholders = columns.map(() => "?").join(",");
  const values = columns.map(column => body[column]);

  const sql = `
    INSERT INTO ${table}
    (${columns.join(",")})
    VALUES (${placeholders})
  `;

  const result = await DB
    .prepare(sql)
    .bind(...values)
    .run();

  return result.meta?.last_row_id || null;
}

async function updateDynamic(DB, table, id, body, allowed) {
  const columns = sanitizeColumns(body, allowed);

  if (!columns.length) {
    throw new Error("Güncellenecek veri bulunamadı.");
  }

  const sets =
    columns.map(column => `${column} = ?`).join(",");

  const values =
    columns.map(column => body[column]);

  await DB.prepare(`
    UPDATE ${table}
    SET ${sets}
    WHERE id = ?
  `)
    .bind(...values, id)
    .run();
}

async function softDelete(DB, table, id) {
  await DB.prepare(`
    UPDATE ${table}
    SET aktif = 0
    WHERE id = ?
  `)
    .bind(id)
    .run();
}


/* =========================================================
   TABLO TANIMLARI
   ========================================================= */

const TABLES = {

  firmalar: {
    table: "firmalar",
    allowed: [
      "ad",
      "vergi_no",
      "telefon",
      "email",
      "adres",
      "aktif"
    ]
  },

  subeler: {
    table: "subeler",
    allowed: [
      "firma_id",
      "ad",
      "kod",
      "telefon",
      "adres",
      "aktif"
    ]
  },

  kategoriler: {
    table: "kategoriler",
    allowed: [
      "firma_id",
      "ad",
      "ust_kategori_id",
      "aktif"
    ]
  },

  birimler: {
    table: "birimler",
    allowed: [
      "ad",
      "sembol"
    ]
  },

  urunler: {
    table: "urunler",
    allowed: [
      "firma_id",
      "kategori_id",
      "birim_id",
      "urun_kodu",
      "ad",
      "marka",
      "alis_fiyati",
      "satis_fiyati",
      "minimum_stok",
      "maksimum_stok",
      "kdv_orani",
      "tartili_urun",
      "aktif"
    ]
  },

  barkodlar: {
    table: "barkodlar",
    allowed: [
      "urun_id",
      "barkod",
      "barkod_tipi",
      "birincil"
    ]
  },

  depolar: {
    table: "depolar",
    allowed: [
      "sube_id",
      "ad",
      "kod",
      "aktif"
    ]
  },

  cariler: {
    table: "cariler",
    allowed: [
      "firma_id",
      "cari_tipi",
      "ad",
      "vergi_no",
      "telefon",
      "email",
      "adres",
      "bakiye",
      "aktif"
    ]
  },

  kasalar: {
    table: "kasalar",
    allowed: [
      "sube_id",
      "kasa_kodu",
      "kasa_adi",
      "aktif"
    ]
  },

  odeme_yontemleri: {
    table: "odeme_yontemleri",
    allowed: [
      "ad",
      "aktif"
    ]
  },

  fire_nedenleri: {
    table: "fire_nedenleri",
    allowed: [
      "ad",
      "aktif"
    ]
  },

  roller: {
    table: "roller",
    allowed: [
      "ad",
      "aciklama"
    ]
  },

  yetkiler: {
    table: "yetkiler",
    allowed: [
      "kod",
      "ad",
      "aciklama"
    ]
  }
};


/* =========================================================
   DASHBOARD
   ========================================================= */

async function dashboard(DB) {

  const [
    firmalar,
    subeler,
    urunler,
    stok,
    kritik,
    skt,
    fire,
    cariler,
    kasa
  ] = await Promise.all([

    DB.prepare(`
      SELECT COUNT(*) AS sayi
      FROM firmalar
      WHERE aktif = 1
    `).first(),

    DB.prepare(`
      SELECT COUNT(*) AS sayi
      FROM subeler
      WHERE aktif = 1
    `).first(),

    DB.prepare(`
      SELECT COUNT(*) AS sayi
      FROM urunler
      WHERE aktif = 1
    `).first(),

    DB.prepare(`
      SELECT COALESCE(SUM(miktar),0) AS miktar
      FROM mevcut_stoklar
    `).first(),

    DB.prepare(`
      SELECT COUNT(*) AS sayi
      FROM mevcut_stoklar s
      JOIN urunler u
        ON u.id = s.urun_id
      WHERE u.aktif = 1
        AND u.minimum_stok > 0
        AND s.miktar <= u.minimum_stok
    `).first(),

    DB.prepare(`
      SELECT COUNT(*) AS sayi
      FROM partiler
      WHERE son_kullanma_tarihi IS NOT NULL
        AND date(son_kullanma_tarihi)
            BETWEEN date('now')
            AND date('now','+30 day')
        AND miktar > 0
    `).first(),

    DB.prepare(`
      SELECT COALESCE(
        SUM(miktar * birim_maliyet),
        0
      ) AS tutar
      FROM fireler
      WHERE date(olusturma_tarihi) = date('now')
    `).first(),

    DB.prepare(`
      SELECT COALESCE(
        SUM(bakiye),
        0
      ) AS bakiye
      FROM cariler
      WHERE aktif = 1
    `).first(),

    DB.prepare(`
      SELECT COALESCE(
        SUM(tutar),
        0
      ) AS tutar
      FROM kasa_hareketleri
    `).first()

  ]);

  return ok({
    data: {
      firmalar: firmalar?.sayi || 0,
      subeler: subeler?.sayi || 0,
      urunler: urunler?.sayi || 0,
      toplam_stok: stok?.miktar || 0,
      kritik_stok: kritik?.sayi || 0,
      yaklaşan_skt: skt?.sayi || 0,
      bugun_fire: fire?.tutar || 0,
      cari_bakiye: cariler?.bakiye || 0,
      kasa_hareketleri: kasa?.tutar || 0
    }
  });
}
/* =====================================================
     12 - MAL KABUL ROUTES
     ===================================================== */

  if (
    path === "/api/mal-kabuller" &&
    method === "GET"
  ) {
    return listMalKabuller(
      DB,
      request
    );
  }

  if (
    path === "/api/mal-kabuller" &&
    method === "POST"
  ) {
    const body =
      await readBody(request);

    return createMalKabul(
      DB,
      body
    );
  }

  const malKabulMatch =
    path.match(
      /^\/api\/mal-kabuller\/(\d+)$/
    );

  if (malKabulMatch) {

    const id =
      Number(malKabulMatch[1]);

    if (!validId(id)) {
      return fail(
        "Geçersiz mal kabul ID."
      );
    }

    if (method === "GET") {
      return getMalKabul(
        DB,
        id
      );
    }
  }

/* =========================================================
   GENEL TABLO İŞLEMLERİ
   ========================================================= */

async function listTable(DB, config, request) {

  const url = new URL(request.url);

  const search =
    text(url.searchParams.get("search"));

  let sql =
    `SELECT * FROM ${config.table}`;

  const params = [];

  const passiveSearchTables = [
    "birimler",
    "odeme_yontemleri",
    "fire_nedenleri",
    "roller",
    "yetkiler"
  ];

  if (!passiveSearchTables.includes(config.table)) {

    sql += ` WHERE aktif = 1`;

    if (search && config.allowed.includes("ad")) {
      sql += ` AND ad LIKE ?`;
      params.push(`%${search}%`);
    }

  } else if (
    search &&
    config.allowed.includes("ad")
  ) {

    sql += ` WHERE ad LIKE ?`;
    params.push(`%${search}%`);
  }

  sql += ` ORDER BY id DESC`;

  const result =
    await DB.prepare(sql)
      .bind(...params)
      .all();

  return ok({
    data: result.results || []
  });
}


async function getTable(DB, config, id) {

  const row =
    await DB.prepare(`
      SELECT *
      FROM ${config.table}
      WHERE id = ?
    `)
    .bind(id)
    .first();

  if (!row) {
    return fail(
      "Kayıt bulunamadı.",
      404
    );
  }

  return ok({
    data: row
  });
}


async function createTable(DB, config, body) {

  const id =
    await insertDynamic(
      DB,
      config.table,
      body,
      config.allowed
    );

  return ok({
    id
  }, 201);
}


async function updateTable(DB, config, id, body) {

  await updateDynamic(
    DB,
    config.table,
    id,
    body,
    config.allowed
  );

  return ok();
}


async function deleteTable(DB, config, id) {

  if (
    config.allowed.includes("aktif")
  ) {

    await softDelete(
      DB,
      config.table,
      id
    );

  } else {

    await DB.prepare(`
      DELETE FROM ${config.table}
      WHERE id = ?
    `)
      .bind(id)
      .run();
  }

  return ok();
}


/* =========================================================
   ÜRÜNLER
   ========================================================= */

async function products(DB, request) {

  const url =
    new URL(request.url);

  const search =
    text(url.searchParams.get("search"));

  let sql = `
    SELECT
      u.*,
      f.ad AS firma_adi,
      k.ad AS kategori_adi,
      b.ad AS birim_adi,
      b.sembol AS birim_sembol,

      COALESCE(
        (
          SELECT SUM(ms.miktar)
          FROM mevcut_stoklar ms
          WHERE ms.urun_id = u.id
        ),
        0
      ) AS toplam_stok,

      (
        SELECT GROUP_CONCAT(
          br.barkod,
          ','
        )
        FROM barkodlar br
        WHERE br.urun_id = u.id
      ) AS barkodlar

    FROM urunler u

    JOIN firmalar f
      ON f.id = u.firma_id

    LEFT JOIN kategoriler k
      ON k.id = u.kategori_id

    JOIN birimler b
      ON b.id = u.birim_id

    WHERE u.aktif = 1
  `;

  const params = [];

  if (search) {

    sql += `
      AND (
        u.ad LIKE ?
        OR u.urun_kodu LIKE ?

        OR EXISTS (
          SELECT 1
          FROM barkodlar br
          WHERE br.urun_id = u.id
            AND br.barkod LIKE ?
        )
      )
    `;

    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  sql += `
    ORDER BY u.id DESC
  `;

  const result =
    await DB.prepare(sql)
      .bind(...params)
      .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   BARKOD
   ========================================================= */

async function barcode(DB, request) {

  const url =
    new URL(request.url);

  const value =
    text(
      url.searchParams.get("barkod")
    );

  if (!value) {
    return fail(
      "Barkod belirtilmedi."
    );
  }

  const row =
    await DB.prepare(`
      SELECT
        u.*,
        br.barkod,
        br.barkod_tipi,
        br.birincil
      FROM barkodlar br
      JOIN urunler u
        ON u.id = br.urun_id
      WHERE br.barkod = ?
        AND u.aktif = 1
      LIMIT 1
    `)
    .bind(value)
    .first();

  if (!row) {
    return fail(
      "Barkod kayıtlı değil.",
      404
    );
  }

  return ok({
    data: row
  });
}


/* =========================================================
   STOK
   ========================================================= */

async function stock(DB, request) {

  const url =
    new URL(request.url);

  const depoId =
    url.searchParams.get("depo_id");

  let sql = `
    SELECT
      ms.urun_id,
      ms.depo_id,
      ms.miktar,

      u.urun_kodu,
      u.ad AS urun_adi,
      u.minimum_stok,
      u.maksimum_stok,

      d.ad AS depo_adi,
      d.kod AS depo_kodu

    FROM mevcut_stoklar ms

    JOIN urunler u
      ON u.id = ms.urun_id

    JOIN depolar d
      ON d.id = ms.depo_id

    WHERE u.aktif = 1
  `;

  const params = [];

  if (validId(depoId)) {

    sql += `
      AND ms.depo_id = ?
    `;

    params.push(
      Number(depoId)
    );
  }

  sql += `
    ORDER BY u.ad
  `;

  const result =
    await DB.prepare(sql)
      .bind(...params)
      .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   SKT
   ========================================================= */

async function skt(DB, request) {

  const url =
    new URL(request.url);

  const days =
    Math.max(
      0,
      number(
        url.searchParams.get("days"),
        30
      )
    );

  const result =
    await DB.prepare(`
      SELECT
        p.*,

        u.urun_kodu,
        u.ad AS urun_adi,

        d.ad AS depo_adi,
        d.kod AS depo_kodu,

        CASE
          WHEN date(
            p.son_kullanma_tarihi
          ) < date('now')
            THEN 'GECMIS'

          WHEN date(
            p.son_kullanma_tarihi
          ) <= date(
            'now',
            '+' || ? || ' day'
          )
            THEN 'YAKLASIYOR'

          ELSE 'NORMAL'
        END AS durum,

        CAST(
          julianday(
            date(p.son_kullanma_tarihi)
          )
          -
          julianday(
            date('now')
          )
          AS INTEGER
        ) AS kalan_gun

      FROM partiler p

      JOIN urunler u
        ON u.id = p.urun_id

      JOIN depolar d
        ON d.id = p.depo_id

      WHERE
        p.son_kullanma_tarihi IS NOT NULL
        AND p.miktar > 0
        AND date(
          p.son_kullanma_tarihi
        )
        <= date(
          'now',
          '+' || ? || ' day'
        )

      ORDER BY
        date(p.son_kullanma_tarihi)
    `)
    .bind(days, days)
    .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   CARİ HAREKETLERİ
   ========================================================= */

async function cariHareketleri(DB, request) {

  const url =
    new URL(request.url);

  const cariId =
    number(
      url.searchParams.get("cari_id")
    );

  if (!validId(cariId)) {
    return fail(
      "Geçerli cari_id gerekli."
    );
  }

  const result =
    await DB.prepare(`
      SELECT *
      FROM cari_hareketleri
      WHERE cari_id = ?
      ORDER BY id DESC
    `)
    .bind(cariId)
    .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   KASA HAREKETLERİ
   ========================================================= */

async function kasaHareketleri(DB, request) {

  const url =
    new URL(request.url);

  const kasaId =
    number(
      url.searchParams.get("kasa_id")
    );

  if (!validId(kasaId)) {
    return fail(
      "Geçerli kasa_id gerekli."
    );
  }

  const result =
    await DB.prepare(`
      SELECT *
      FROM kasa_hareketleri
      WHERE kasa_id = ?
      ORDER BY id DESC
    `)
    .bind(kasaId)
    .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   STOK HAREKETİ
   ========================================================= */

async function stockMovement(DB, body) {

  const urunId =
    number(body.urun_id);

  const depoId =
    number(body.depo_id);

  const miktar =
    number(body.miktar);

  const tip =
    text(body.hareket_tipi);

  if (
    !validId(urunId) ||
    !validId(depoId) ||
    !miktar ||
    !tip
  ) {
    return fail(
      "urun_id, depo_id, miktar ve hareket_tipi zorunludur."
    );
  }

  const mevcut =
    await DB.prepare(`
      SELECT miktar
      FROM mevcut_stoklar
      WHERE urun_id = ?
        AND depo_id = ?
    `)
    .bind(
      urunId,
      depoId
    )
    .first();

  const eski =
    number(mevcut?.miktar);

  const cikisTipleri = [
    "CIKIS",
    "SATIS",
    "FIRE",
    "TRANSFER_CIKIS"
  ];

  const yeni =
    cikisTipleri.includes(tip)
      ? eski - miktar
      : eski + miktar;

  if (yeni < 0) {

    return fail(
      "Yetersiz stok.",
      409,
      {
        mevcut: eski,
        istenen: miktar
      }
    );
  }

  await DB.prepare(`
    INSERT INTO stok_hareketleri (
      urun_id,
      parti_id,
      depo_id,
      hareket_tipi,
      miktar,
      birim_maliyet,
      referans_tipi,
      referans_id,
      kullanici_id,
      aciklama
    )
    VALUES (
      ?,?,?,?,?,?,?,?,?,?
    )
  `)
    .bind(
      urunId,
      body.parti_id || null,
      depoId,
      tip,
      miktar,
      number(body.birim_maliyet),
      body.referans_tipi || null,
      body.referans_id || null,
      body.kullanici_id || null,
      body.aciklama || null
    )
    .run();

  await DB.prepare(`
    INSERT INTO mevcut_stoklar (
      urun_id,
      depo_id,
      miktar
    )
    VALUES (?,?,?)

    ON CONFLICT(
      urun_id,
      depo_id
    )

    DO UPDATE SET
      miktar = excluded.miktar
  `)
    .bind(
      urunId,
      depoId,
      yeni
    )
    .run();

  return ok({
    eski_stok: eski,
    yeni_stok: yeni
  }, 201);
}


/* =========================================================
   FIRE
   ========================================================= */

async function createFire(DB, body) {

  const miktar =
    number(body.miktar);

  if (
    !validId(body.urun_id) ||
    !validId(body.depo_id) ||
    miktar <= 0
  ) {
    return fail(
      "Ürün, depo ve pozitif miktar zorunludur."
    );
  }

  const result =
    await stockMovement(
      DB,
      {
        urun_id: body.urun_id,
        depo_id: body.depo_id,
        parti_id: body.parti_id,

        miktar,

        hareket_tipi: "FIRE",

        birim_maliyet:
          number(body.birim_maliyet),

        referans_tipi: "FIRE",

        aciklama:
          body.aciklama ||
          body.neden ||
          null,

        kullanici_id:
          body.kullanici_id ||
          null
      }
    );

  if (result.status !== 201) {
    return result;
  }

  const firma =
    await DB.prepare(`
      SELECT firma_id
      FROM urunler
      WHERE id = ?
    `)
    .bind(body.urun_id)
    .first();

  const depo =
    await DB.prepare(`
      SELECT sube_id
      FROM depolar
      WHERE id = ?
    `)
    .bind(body.depo_id)
    .first();

  const id =
    await insertDynamic(
      DB,
      "fireler",
      {
        firma_id:
          firma?.firma_id,

        sube_id:
          depo?.sube_id,

        depo_id:
          body.depo_id,

        urun_id:
          body.urun_id,

        parti_id:
          body.parti_id || null,

        miktar,

        birim_maliyet:
          number(body.birim_maliyet),

        neden_id:
          body.neden_id || null,

        neden:
          body.neden || null,

        aciklama:
          body.aciklama || null,

        kullanici_id:
          body.kullanici_id || null
      },
      [
        "firma_id",
        "sube_id",
        "depo_id",
        "urun_id",
        "parti_id",
        "miktar",
        "birim_maliyet",
        "neden_id",
        "neden",
        "aciklama",
        "kullanici_id"
      ]
    );

  return ok({
    id
  }, 201);
}


/* =========================================================
   SAYIM
   ========================================================= */

async function createSayim(DB, body) {

  const firmaId =
    number(body.firma_id);

  const subeId =
    number(body.sube_id);

  const depoId =
    number(body.depo_id);

  if (
    !validId(firmaId) ||
    !validId(subeId) ||
    !validId(depoId)
  ) {
    return fail(
      "Firma, şube ve depo zorunludur."
    );
  }

  const sayimNo =
    text(body.sayim_no) ||
    `SAY-${Date.now()}`;

  const id =
    await insertDynamic(
      DB,
      "sayimlar",
      {
        firma_id: firmaId,
        sube_id: subeId,
        depo_id: depoId,
        sayim_no: sayimNo,
        durum: "ACIK",
        kullanici_id:
          body.kullanici_id || null,
        aciklama:
          body.aciklama || null
      },
      [
        "firma_id",
        "sube_id",
        "depo_id",
        "sayim_no",
        "durum",
        "kullanici_id",
        "aciklama"
      ]
    );

  return ok({
    id,
    sayim_no: sayimNo
  }, 201);
}


async function listSayim(DB) {

  const result =
    await DB.prepare(`
      SELECT
        s.*,

        f.ad AS firma_adi,
        b.ad AS sube_adi,
        d.ad AS depo_adi

      FROM sayimlar s

      JOIN firmalar f
        ON f.id = s.firma_id

      JOIN subeler b
        ON b.id = s.sube_id

      JOIN depolar d
        ON d.id = s.depo_id

      ORDER BY s.id DESC
    `)
    .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   FIRE LİSTE
   ========================================================= */

async function listFire(DB) {

  const result =
    await DB.prepare(`
      SELECT

        f.*,

        u.ad AS urun_adi,
        u.urun_kodu,

        d.ad AS depo_adi,

        COALESCE(
          f.miktar * f.birim_maliyet,
          0
        ) AS toplam_tutar

      FROM fireler f

      JOIN urunler u
        ON u.id = f.urun_id

      JOIN depolar d
        ON d.id = f.depo_id

      ORDER BY f.id DESC
    `)
    .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   RAPORLAR
   ========================================================= */

async function reports(DB) {

  const [
    stokDegeri,
    fire,
    skt,
    cari,
    satis
  ] = await Promise.all([

    DB.prepare(`
      SELECT COALESCE(
        SUM(
          ms.miktar *
          u.alis_fiyati
        ),
        0
      ) AS toplam

      FROM mevcut_stoklar ms

      JOIN urunler u
        ON u.id = ms.urun_id
    `).first(),

    DB.prepare(`
      SELECT

        COALESCE(
          SUM(miktar),
          0
        ) AS miktar,

        COALESCE(
          SUM(
            miktar *
            birim_maliyet
          ),
          0
        ) AS tutar

      FROM fireler
    `).first(),

    DB.prepare(`
      SELECT

        COUNT(*) AS adet,

        COALESCE(
          SUM(miktar),
          0
        ) AS miktar

      FROM partiler

      WHERE
        son_kullanma_tarihi IS NOT NULL

        AND date(
          son_kullanma_tarihi
        )
        <= date(
          'now',
          '+30 day'
        )

        AND miktar > 0
    `).first(),

    DB.prepare(`
      SELECT
        COALESCE(
          SUM(bakiye),
          0
        ) AS bakiye

      FROM cariler

      WHERE aktif = 1
    `).first(),

    DB.prepare(`
      SELECT

        COUNT(*) adet,

        COALESCE(
          SUM(genel_toplam),
          0
        ) toplam

      FROM satislar

      WHERE date(
        satis_tarihi
      ) = date('now')
    `).first()

  ]);

  return ok({
    data: {

      stok_degeri:
        stokDegeri?.toplam || 0,

      fire_miktari:
        fire?.miktar || 0,

      fire_tutari:
        fire?.tutar || 0,

      yaklasan_skt:
        skt?.adet || 0,

      yaklasan_skt_miktari:
        skt?.miktar || 0,

      cari_bakiye:
        cari?.bakiye || 0,

      bugun_satis_adet:
        satis?.adet || 0,

      bugun_satis:
        satis?.toplam || 0
    }
  });
}


/* =========================================================
   SATIN ALMA - LİSTE
   ========================================================= */

async function listSatinAlma(DB, request) {

  const url =
    new URL(request.url);

  const search =
    text(
      url.searchParams.get("search")
    );

  let sql = `
    SELECT

      s.*,

      f.ad AS firma_adi,
      b.ad AS sube_adi,
      c.ad AS cari_adi

    FROM satin_alma_siparisleri s

    JOIN firmalar f
      ON f.id = s.firma_id

    JOIN subeler b
      ON b.id = s.sube_id

    LEFT JOIN cariler c
      ON c.id = s.cari_id
  `;

  const params = [];

  if (search) {

    sql += `
      WHERE

        s.siparis_no LIKE ?

        OR f.ad LIKE ?

        OR b.ad LIKE ?

        OR c.ad LIKE ?
    `;

    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  sql += `
    ORDER BY s.id DESC
  `;

  const result =
    await DB.prepare(sql)
      .bind(...params)
      .all();

  return ok({
    data: result.results || []
  });
}


/* =========================================================
   SATIN ALMA - DETAY
   ========================================================= */

async function getSatinAlma(DB, id) {

  const siparis =
    await DB.prepare(`
      SELECT

        s.*,

        f.ad AS firma_adi,
        b.ad AS sube_adi,
        c.ad AS cari_adi

      FROM satin_alma_siparisleri s

      JOIN firmalar f
        ON f.id = s.firma_id

      JOIN subeler b
        ON b.id = s.sube_id

      LEFT JOIN cariler c
        ON c.id = s.cari_id

      WHERE s.id = ?
    `)
    .bind(id)
    .first();

  if (!siparis) {
    return fail(
      "Satın alma kaydı bulunamadı.",
      404
    );
  }

  const detaylar =
    await DB.prepare(`
      SELECT

        d.*,

        u.ad AS urun_adi,
        u.urun_kodu,

        b.ad AS birim_adi,
        b.sembol AS birim_sembol

      FROM satin_alma_detaylari d

      JOIN urunler u
        ON u.id = d.urun_id

      LEFT JOIN birimler b
        ON b.id = u.birim_id

      WHERE d.siparis_id = ?

      ORDER BY d.id
    `)
    .bind(id)
    .all();

  return ok({
    data: {
      ...siparis,

      detaylar:
        detaylar.results || []
    }
  });
}


/* =========================================================
   SATIN ALMA - OLUŞTUR
   ========================================================= */

async function createSatinAlma(DB, body) {

  const firmaId =
    number(body.firma_id);

  const subeId =
    number(body.sube_id);

  const cariId =
    validId(body.cari_id)
      ? Number(body.cari_id)
      : null;

  if (!validId(firmaId)) {
    return fail(
      "Firma seçimi zorunludur."
    );
  }

  if (!validId(subeId)) {
    return fail(
      "Şube seçimi zorunludur."
    );
  }

  const firma =
    await DB.prepare(`
      SELECT id
      FROM firmalar
      WHERE id = ?
        AND aktif = 1
    `)
    .bind(firmaId)
    .first();

  if (!firma) {
    return fail(
      "Firma bulunamadı.",
      404
    );
  }

  const sube =
    await DB.prepare(`
      SELECT id
      FROM subeler
      WHERE id = ?
        AND firma_id = ?
        AND aktif = 1
    `)
    .bind(
      subeId,
      firmaId
    )
    .first();

  if (!sube) {
    return fail(
      "Şube firmaya ait değil.",
      400
    );
  }

  if (cariId) {

    const cari =
      await DB.prepare(`
        SELECT id
        FROM cariler
        WHERE id = ?
          AND aktif = 1
      `)
      .bind(cariId)
      .first();

    if (!cari) {
      return fail(
        "Cari bulunamadı.",
        404
      );
    }
  }

  const detaylar =
    Array.isArray(body.detaylar)
      ? body.detaylar
      : [];

  if (!detaylar.length) {
    return fail(
      "En az bir ürün eklemelisiniz."
    );
  }

  const siparisNo =
    text(body.siparis_no) ||
    `SA-${Date.now()}`;

  const durum =
    text(body.durum) ||
    "BEKLIYOR";

  const siparisTarihi =
    text(body.siparis_tarihi) ||
    today();

  let toplamTutar = 0;

  const temizDetaylar = [];

  for (const item of detaylar) {

    const urunId =
      number(item.urun_id);

    const miktar =
      number(item.miktar);

    const birimFiyat =
      number(item.birim_fiyat);

    const kdvOrani =
      number(item.kdv_orani);

    if (!validId(urunId)) {
      return fail(
        "Geçersiz ürün."
      );
    }

    if (miktar <= 0) {
      return fail(
        "Miktar 0'dan büyük olmalıdır."
      );
    }

    if (birimFiyat < 0) {
      return fail(
        "Birim fiyat geçersiz."
      );
    }

    const urun =
      await DB.prepare(`
        SELECT id
        FROM urunler
        WHERE id = ?
          AND aktif = 1
      `)
      .bind(urunId)
      .first();

    if (!urun) {
      return fail(
        `Ürün bulunamadı: ${urunId}`,
        404
      );
    }

    const toplam =
      miktar * birimFiyat;

    toplamTutar += toplam;

    temizDetaylar.push({
      urunId,
      miktar,
      birimFiyat,
      kdvOrani,
      toplam
    });
  }

  const siparisId =
    await insertDynamic(
      DB,
      "satin_alma_siparisleri",
      {
        firma_id: firmaId,
        sube_id: subeId,
        cari_id: cariId,
        siparis_no: siparisNo,
        durum,
        toplam_tutar: toplamTutar,
        siparis_tarihi: siparisTarihi,
        kullanici_id:
          validId(body.kullanici_id)
            ? Number(body.kullanici_id)
            : null
      },
      [
        "firma_id",
        "sube_id",
        "cari_id",
        "siparis_no",
        "durum",
        "toplam_tutar",
        "siparis_tarihi",
        "kullanici_id"
      ]
    );

  for (const item of temizDetaylar) {

    await insertDynamic(
      DB,
      "satin_alma_detaylari",
      {
        siparis_id: siparisId,
        urun_id: item.urunId,
        miktar: item.miktar,
        birim_fiyat: item.birimFiyat,
        kdv_orani: item.kdvOrani,
        toplam: item.toplam
      },
      [
        "siparis_id",
        "urun_id",
        "miktar",
        "birim_fiyat",
        "kdv_orani",
        "toplam"
      ]
    );
  }

  return ok({
    id: siparisId,
    siparis_no: siparisNo,
    toplam_tutar: toplamTutar
  }, 201);
}


/* =========================================================
   SATIN ALMA - GÜNCELLE
   ========================================================= */

async function updateSatinAlma(DB, id, body) {

  const mevcut =
    await DB.prepare(`
      SELECT id
      FROM satin_alma_siparisleri
      WHERE id = ?
    `)
    .bind(id)
    .first();

  if (!mevcut) {
    return fail(
      "Satın alma kaydı bulunamadı.",
      404
    );
  }

  const allowed = [
    "cari_id",
    "siparis_no",
    "durum",
    "siparis_tarihi",
    "kullanici_id"
  ];

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "cari_id"
    )
  ) {

    if (
      body.cari_id !== null &&
      body.cari_id !== "" &&
      !validId(body.cari_id)
    ) {
      return fail(
        "Geçersiz cari_id."
      );
    }

    if (validId(body.cari_id)) {

      const cari =
        await DB.prepare(`
          SELECT id
          FROM cariler
          WHERE id = ?
            AND aktif = 1
        `)
        .bind(Number(body.cari_id))
        .first();

      if (!cari) {
        return fail(
          "Cari bulunamadı.",
          404
        );
      }
    }
  }

  const columns =
    sanitizeColumns(
      body,
      allowed
    );

  if (!columns.length) {
    return fail(
      "Güncellenecek veri bulunamadı."
    );
  }

  await updateDynamic(
    DB,
    "satin_alma_siparisleri",
    id,
    body,
    allowed
  );

  return ok();
}


/* =========================================================
   SATIN ALMA - SİL
   ========================================================= */

async function deleteSatinAlma(DB, id) {

  const mevcut =
    await DB.prepare(`
      SELECT id
      FROM satin_alma_siparisleri
      WHERE id = ?
    `)
    .bind(id)
    .first();

  if (!mevcut) {
    return fail(
      "Satın alma kaydı bulunamadı.",
      404
    );
  }

  await DB.prepare(`
    DELETE FROM satin_alma_detaylari
    WHERE siparis_id = ?
  `)
    .bind(id)
    .run();

  await DB.prepare(`
    DELETE FROM satin_alma_siparisleri
    WHERE id = ?
  `)
    .bind(id)
    .run();

  return ok();
}

/* =========================================================
   12 - MAL KABUL
   ========================================================= */

async function listMalKabuller(DB, request) {

  const url = new URL(request.url);

  const search =
    text(url.searchParams.get("search"));

  let sql = `
    SELECT
      m.*,
      f.ad AS firma_adi,
      s.ad AS sube_adi,
      d.ad AS depo_adi,
      c.ad AS cari_adi
    FROM mal_kabuller m
    JOIN firmalar f
      ON f.id = m.firma_id
    JOIN subeler s
      ON s.id = m.sube_id
    JOIN depolar d
      ON d.id = m.depo_id
    LEFT JOIN cariler c
      ON c.id = m.cari_id
  `;

  const params = [];

  if (search) {

    sql += `
      WHERE
        m.kabul_no LIKE ?
        OR m.fatura_no LIKE ?
        OR f.ad LIKE ?
        OR s.ad LIKE ?
        OR d.ad LIKE ?
        OR c.ad LIKE ?
    `;

    const q = `%${search}%`;

    params.push(
      q,
      q,
      q,
      q,
      q,
      q
    );
  }

  sql += `
    ORDER BY m.id DESC
  `;

  const result =
    await DB.prepare(sql)
      .bind(...params)
      .all();

  return ok({
    data: result.results || []
  });
}


async function getMalKabul(DB, id) {

  const kabul =
    await DB.prepare(`
      SELECT
        m.*,
        f.ad AS firma_adi,
        s.ad AS sube_adi,
        d.ad AS depo_adi,
        c.ad AS cari_adi
      FROM mal_kabuller m
      JOIN firmalar f
        ON f.id = m.firma_id
      JOIN subeler s
        ON s.id = m.sube_id
      JOIN depolar d
        ON d.id = m.depo_id
      LEFT JOIN cariler c
        ON c.id = m.cari_id
      WHERE m.id = ?
    `)
    .bind(id)
    .first();

  if (!kabul) {
    return fail(
      "Mal kabul kaydı bulunamadı.",
      404
    );
  }

  const detaylar =
    await DB.prepare(`
      SELECT
        d.*,
        u.ad AS urun_adi,
        u.urun_kodu,
        b.ad AS birim_adi,
        b.sembol AS birim_sembol
      FROM mal_kabul_detaylari d
      JOIN urunler u
        ON u.id = d.urun_id
      LEFT JOIN birimler b
        ON b.id = u.birim_id
      WHERE d.kabul_id = ?
      ORDER BY d.id
    `)
    .bind(id)
    .all();

  return ok({
    data: {
      ...kabul,
      detaylar:
        detaylar.results || []
    }
  });
}


async function createMalKabul(DB, body) {

  const firmaId =
    number(body.firma_id);

  const subeId =
    number(body.sube_id);

  const depoId =
    number(body.depo_id);

  const cariId =
    validId(body.cari_id)
      ? Number(body.cari_id)
      : null;

  if (!validId(firmaId)) {
    return fail(
      "Firma seçimi zorunludur."
    );
  }

  if (!validId(subeId)) {
    return fail(
      "Şube seçimi zorunludur."
    );
  }

  if (!validId(depoId)) {
    return fail(
      "Depo seçimi zorunludur."
    );
  }

  /* -------------------------------------------------------
     FİRMA KONTROLÜ
     ------------------------------------------------------- */

  const firma =
    await DB.prepare(`
      SELECT id
      FROM firmalar
      WHERE id = ?
        AND aktif = 1
    `)
    .bind(firmaId)
    .first();

  if (!firma) {
    return fail(
      "Firma bulunamadı.",
      404
    );
  }

  /* -------------------------------------------------------
     ŞUBE KONTROLÜ
     ------------------------------------------------------- */

  const sube =
    await DB.prepare(`
      SELECT id
      FROM subeler
      WHERE id = ?
        AND firma_id = ?
        AND aktif = 1
    `)
    .bind(
      subeId,
      firmaId
    )
    .first();

  if (!sube) {
    return fail(
      "Şube firmaya ait değil.",
      400
    );
  }

  /* -------------------------------------------------------
     DEPO KONTROLÜ
     ------------------------------------------------------- */

  const depo =
    await DB.prepare(`
      SELECT
        id,
        sube_id
      FROM depolar
      WHERE id = ?
        AND sube_id = ?
        AND aktif = 1
    `)
    .bind(
      depoId,
      subeId
    )
    .first();

  if (!depo) {
    return fail(
      "Depo seçilen şubeye ait değil.",
      400
    );
  }

  /* -------------------------------------------------------
     CARİ KONTROLÜ
     ------------------------------------------------------- */

  if (cariId) {

    const cari =
      await DB.prepare(`
        SELECT id
        FROM cariler
        WHERE id = ?
          AND aktif = 1
      `)
      .bind(cariId)
      .first();

    if (!cari) {
      return fail(
        "Cari bulunamadı.",
        404
      );
    }
  }

  /* -------------------------------------------------------
     DETAYLAR
     ------------------------------------------------------- */

  const detaylar =
    Array.isArray(body.detaylar)
      ? body.detaylar
      : [];

  if (!detaylar.length) {
    return fail(
      "En az bir ürün eklemelisiniz."
    );
  }

  const kabulNo =
    text(body.kabul_no) ||
    `MK-${Date.now()}`;

  const faturaNo =
    text(body.fatura_no) || null;

  const kabulTarihi =
    text(body.kabul_tarihi) ||
    today();

  let toplamTutar = 0;

  const temizDetaylar = [];

  /* -------------------------------------------------------
     ÜRÜNLERİ KONTROL ET
     ------------------------------------------------------- */

  for (const item of detaylar) {

    const urunId =
      number(item.urun_id);

    const miktar =
      number(item.miktar);

    const birimFiyat =
      number(item.birim_fiyat);

    const partiNo =
      text(item.parti_no) || null;

    const sonKullanmaTarihi =
      text(item.son_kullanma_tarihi) || null;

    if (!validId(urunId)) {
      return fail(
        "Geçersiz ürün."
      );
    }

    if (miktar <= 0) {
      return fail(
        "Miktar 0'dan büyük olmalıdır."
      );
    }

    if (birimFiyat < 0) {
      return fail(
        "Birim fiyat geçersiz."
      );
    }

    const urun =
      await DB.prepare(`
        SELECT
          id,
          firma_id,
          ad
        FROM urunler
        WHERE id = ?
          AND aktif = 1
      `)
      .bind(urunId)
      .first();

    if (!urun) {
      return fail(
        `Ürün bulunamadı: ${urunId}`,
        404
      );
    }

    if (Number(urun.firma_id) !== firmaId) {
      return fail(
        `Ürün seçilen firmaya ait değil: ${urun.ad}`,
        400
      );
    }

    const toplam =
      miktar * birimFiyat;

    toplamTutar += toplam;

    temizDetaylar.push({
      urunId,
      miktar,
      birimFiyat,
      toplam,
      partiNo,
      sonKullanmaTarihi
    });
  }

  /* -------------------------------------------------------
     MAL KABUL BAŞLIĞI
     ------------------------------------------------------- */

  const kabulId =
    await insertDynamic(
      DB,
      "mal_kabuller",
      {
        firma_id: firmaId,
        sube_id: subeId,
        depo_id: depoId,
        cari_id: cariId,
        kabul_no: kabulNo,
        fatura_no: faturaNo,
        toplam_tutar: toplamTutar,
        kabul_tarihi: kabulTarihi,
        kullanici_id:
          validId(body.kullanici_id)
            ? Number(body.kullanici_id)
            : null
      },
      [
        "firma_id",
        "sube_id",
        "depo_id",
        "cari_id",
        "kabul_no",
        "fatura_no",
        "toplam_tutar",
        "kabul_tarihi",
        "kullanici_id"
      ]
    );

  /* -------------------------------------------------------
     DETAY + PARTİ + STOK
     ------------------------------------------------------- */

  for (const item of temizDetaylar) {

    /* -----------------------------------------------
       MAL KABUL DETAYI
       ----------------------------------------------- */

    await insertDynamic(
      DB,
      "mal_kabul_detaylari",
      {
        kabul_id: kabulId,
        urun_id: item.urunId,
        parti_no: item.partiNo,
        son_kullanma_tarihi:
          item.sonKullanmaTarihi,
        miktar: item.miktar,
        birim_fiyat: item.birimFiyat,
        toplam: item.toplam
      },
      [
        "kabul_id",
        "urun_id",
        "parti_no",
        "son_kullanma_tarihi",
        "miktar",
        "birim_fiyat",
        "toplam"
      ]
    );

    /* -----------------------------------------------
       PARTİ OLUŞTUR
       ----------------------------------------------- */

    const partiId =
      await insertDynamic(
        DB,
        "partiler",
        {
          urun_id: item.urunId,
          depo_id: depoId,
          parti_no: item.partiNo,
          son_kullanma_tarihi:
            item.sonKullanmaTarihi,
          miktar: item.miktar,
          alis_maliyeti: item.birimFiyat
        },
        [
          "urun_id",
          "depo_id",
          "parti_no",
          "son_kullanma_tarihi",
          "miktar",
          "alis_maliyeti"
        ]
      );

    /* -----------------------------------------------
       STOK GİRİŞİ
       ----------------------------------------------- */

    const stokSonucu =
      await stockMovement(
        DB,
        {
          urun_id: item.urunId,
          depo_id: depoId,
          parti_id: partiId,
          miktar: item.miktar,
          hareket_tipi: "GIRIS",
          birim_maliyet: item.birimFiyat,
          referans_tipi: "MAL_KABUL",
          referans_id: kabulId,
          kullanici_id:
            validId(body.kullanici_id)
              ? Number(body.kullanici_id)
              : null,
          aciklama:
            `Mal kabul: ${kabulNo}`
        }
      );

    if (!stokSonucu.ok) {
      return stokSonucu;
    }
  }

  return ok({
    id: kabulId,
    kabul_no: kabulNo,
    toplam_tutar: toplamTutar
  }, 201);
}
/* =========================================================
   ANA ROUTER
   ========================================================= */

async function route(request, env) {

  const DB = env.DB;

  if (!DB) {
    return fail(
      "D1 DB binding bulunamadı.",
      500
    );
  }

  const url =
    new URL(request.url);

  const path =
    url.pathname.replace(
      /\/+$/,
      ""
    ) || "/";

  const method =
    request.method.toUpperCase();


  /* =====================================================
     HEALTH
     ===================================================== */

  if (
    path === "/api/health" &&
    method === "GET"
  ) {

    return ok({
      service:
        "stok-skt-cari-takip",

      database:
        "D1",

      timestamp:
        today()
    });
  }


  /* =====================================================
     DASHBOARD
     ===================================================== */

  if (
    path === "/api/dashboard" &&
    method === "GET"
  ) {
    return dashboard(DB);
  }


  /* =====================================================
     ÜRÜNLER
     ===================================================== */

  if (
    path === "/api/urunler" &&
    method === "GET"
  ) {
    return products(
      DB,
      request
    );
  }


  /* =====================================================
     BARKOD
     ===================================================== */

  if (
    path === "/api/urunler/barkod" &&
    method === "GET"
  ) {
    return barcode(
      DB,
      request
    );
  }


  /* =====================================================
     STOK
     ===================================================== */

  if (
    path === "/api/stok" &&
    method === "GET"
  ) {
    return stock(
      DB,
      request
    );
  }


  /* =====================================================
     SKT
     ===================================================== */

  if (
    path === "/api/skt" &&
    method === "GET"
  ) {
    return skt(
      DB,
      request
    );
  }


  /* =====================================================
     CARİ HAREKETLERİ
     ===================================================== */

  if (
    path === "/api/cari-hareketleri" &&
    method === "GET"
  ) {
    return cariHareketleri(
      DB,
      request
    );
  }


  /* =====================================================
     KASA HAREKETLERİ
     ===================================================== */

  if (
    path === "/api/kasa-hareketleri" &&
    method === "GET"
  ) {
    return kasaHareketleri(
      DB,
      request
    );
  }


  /* =====================================================
     FIRE
     ===================================================== */

  if (
    path === "/api/fire" &&
    method === "GET"
  ) {
    return listFire(
      DB,
      request
    );
  }


  /* =====================================================
     SAYIM
     ===================================================== */

  if (
    path === "/api/sayimlar" &&
    method === "GET"
  ) {
    return listSayim(
      DB,
      request
    );
  }


  /* =====================================================
     RAPORLAR
     ===================================================== */

  if (
    path === "/api/raporlar" &&
    method === "GET"
  ) {
    return reports(DB);
  }


  /* =====================================================
     STOK HAREKETİ
     ===================================================== */

  if (
    path === "/api/stok-hareketi" &&
    method === "POST"
  ) {

    const body =
      await readBody(request);

    return stockMovement(
      DB,
      body
    );
  }


  /* =====================================================
     FIRE OLUŞTUR
     ===================================================== */

  if (
    path === "/api/fire" &&
    method === "POST"
  ) {

    const body =
      await readBody(request);

    return createFire(
      DB,
      body
    );
  }


  /* =====================================================
     SAYIM OLUŞTUR
     ===================================================== */

  if (
    path === "/api/sayimlar" &&
    method === "POST"
  ) {

    const body =
      await readBody(request);

    return createSayim(
      DB,
      body
    );
  }


  /* =====================================================
     SATIN ALMA
     ===================================================== */

  if (
    path === "/api/satin-alma" &&
    method === "GET"
  ) {

    return listSatinAlma(
      DB,
      request
    );
  }


  if (
    path === "/api/satin-alma" &&
    method === "POST"
  ) {

    const body =
      await readBody(request);

    return createSatinAlma(
      DB,
      body
    );
  }


  const satinAlmaMatch =
    path.match(
      /^\/api\/satin-alma\/(\d+)$/
    );

  if (satinAlmaMatch) {

    const id =
      Number(
        satinAlmaMatch[1]
      );

    if (!validId(id)) {

      return fail(
        "Geçersiz satın alma ID."
      );
    }

    if (method === "GET") {

      return getSatinAlma(
        DB,
        id
      );
    }

    if (
      method === "PUT" ||
      method === "PATCH"
    ) {

      const body =
        await readBody(request);

      return updateSatinAlma(
        DB,
        id,
        body
      );
    }

    if (method === "DELETE") {

      return deleteSatinAlma(
        DB,
        id
      );
    }
  }


  /* =====================================================
     GENEL CRUD ROUTES
     ===================================================== */

  const match =
    path.match(
      /^\/api\/([^/]+)(?:\/(\d+))?$/
    );

  if (match) {

    const routeName =
      match[1];

    const id =
      match[2]
        ? Number(match[2])
        : null;

    const config =
      TABLES[routeName];

    if (config) {

      if (
        id !== null &&
        !validId(id)
      ) {

        return fail(
          "Geçersiz kayıt ID."
        );
      }


      if (method === "GET") {

        if (id !== null) {

          return getTable(
            DB,
            config,
            id
          );
        }

        return listTable(
          DB,
          config,
          request
        );
      }


      if (method === "POST") {

        const body =
          await readBody(request);

        return createTable(
          DB,
          config,
          body
        );
      }


      if (
        (
          method === "PUT" ||
          method === "PATCH"
        ) &&
        id !== null
      ) {

        const body =
          await readBody(request);

        return updateTable(
          DB,
          config,
          id,
          body
        );
      }


      if (
        method === "DELETE" &&
        id !== null
      ) {

        return deleteTable(
          DB,
          config,
          id
        );
      }
    }
  }


  return fail(
    "API endpoint bulunamadı.",
    404,
    {
      path,
      method
    }
  );
}


/* =========================================================
   CLOUDFLARE WORKER
   ========================================================= */

export default {

  async fetch(request, env) {

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          status: 204,
          headers: CORS
        }
      );
    }

    try {

      const pathname =
        new URL(request.url)
          .pathname;

      if (
        pathname.startsWith("/api/")
      ) {

        return await route(
          request,
          env
        );
      }


      if (env.ASSETS) {

        return env.ASSETS.fetch(
          request
        );
      }


      return new Response(
        "SKT Stok & Cari Takip",
        {
          status: 200,
          headers: {
            "content-type":
              "text/plain; charset=UTF-8"
          }
        }
      );

    } catch (error) {

      console.error(
        "WORKER_ERROR",
        error
      );

      return fail(
        error?.message ||
        "Beklenmeyen sunucu hatası.",
        500
      );
    }
  }
};
