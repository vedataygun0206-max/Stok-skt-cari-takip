PRAGMA foreign_keys = ON;

-- ============================================================
-- STOK • SKT • CARİ TAKİP
-- V1.0 GÜVENLİ ŞEMA / MIGRATION
-- ============================================================

-- ============================================================
-- 1. FİRMA
-- ============================================================

CREATE TABLE IF NOT EXISTS firmalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    vergi_no TEXT,
    telefon TEXT,
    email TEXT,
    adres TEXT,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ŞUBELER
-- ============================================================

CREATE TABLE IF NOT EXISTS subeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT NOT NULL,
    telefon TEXT,
    adres TEXT,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(firma_id, kod),
    FOREIGN KEY(firma_id) REFERENCES firmalar(id)
);

-- ============================================================
-- 3. ROLLER / YETKİLER
-- ============================================================

CREATE TABLE IF NOT EXISTS roller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    aciklama TEXT
);

CREATE TABLE IF NOT EXISTS yetkiler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT NOT NULL UNIQUE,
    ad TEXT NOT NULL,
    aciklama TEXT
);

CREATE TABLE IF NOT EXISTS rol_yetkileri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rol_id INTEGER NOT NULL,
    yetki_id INTEGER NOT NULL,
    UNIQUE(rol_id, yetki_id),
    FOREIGN KEY(rol_id) REFERENCES roller(id),
    FOREIGN KEY(yetki_id) REFERENCES yetkiler(id)
);

CREATE TABLE IF NOT EXISTS kullanicilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    sube_id INTEGER,
    rol_id INTEGER NOT NULL,
    ad_soyad TEXT NOT NULL,
    kullanici_adi TEXT NOT NULL UNIQUE,
    sifre_hash TEXT NOT NULL,
    aktif INTEGER NOT NULL DEFAULT 1,
    son_giris TEXT,
    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(rol_id) REFERENCES roller(id)
);

-- ============================================================
-- 4. KATEGORİ / BİRİM
-- ============================================================

CREATE TABLE IF NOT EXISTS kategoriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    ust_kategori_id INTEGER,
    aktif INTEGER NOT NULL DEFAULT 1,
    UNIQUE(firma_id, ad),
    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(ust_kategori_id) REFERENCES kategoriler(id)
);

CREATE TABLE IF NOT EXISTS birimler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    sembol TEXT NOT NULL UNIQUE
);

-- ============================================================
-- 5. ÜRÜNLER
-- ============================================================

CREATE TABLE IF NOT EXISTS urunler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    kategori_id INTEGER,
    birim_id INTEGER NOT NULL,

    urun_kodu TEXT NOT NULL,
    ad TEXT NOT NULL,
    marka TEXT,

    alis_fiyati REAL NOT NULL DEFAULT 0,
    satis_fiyati REAL NOT NULL DEFAULT 0,

    minimum_stok REAL NOT NULL DEFAULT 0,
    maksimum_stok REAL NOT NULL DEFAULT 0,

    kdv_orani REAL NOT NULL DEFAULT 0,

    tartili_urun INTEGER NOT NULL DEFAULT 0,
    aktif INTEGER NOT NULL DEFAULT 1,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(firma_id, urun_kodu),

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(kategori_id) REFERENCES kategoriler(id),
    FOREIGN KEY(birim_id) REFERENCES birimler(id)
);

CREATE TABLE IF NOT EXISTS barkodlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_id INTEGER NOT NULL,
    barkod TEXT NOT NULL UNIQUE,
    barkod_tipi TEXT NOT NULL DEFAULT 'EAN13',
    birincil INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(urun_id) REFERENCES urunler(id)
);

-- ============================================================
-- 6. DEPOLAR
-- ============================================================

CREATE TABLE IF NOT EXISTS depolar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sube_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT NOT NULL,
    aktif INTEGER NOT NULL DEFAULT 1,
    UNIQUE(sube_id, kod),
    FOREIGN KEY(sube_id) REFERENCES subeler(id)
);

-- ============================================================
-- 7. PARTİ / SKT
-- ============================================================

CREATE TABLE IF NOT EXISTS partiler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_id INTEGER NOT NULL,
    depo_id INTEGER NOT NULL,
    parti_no TEXT,
    uretim_tarihi TEXT,
    son_kullanma_tarihi TEXT,
    miktar REAL NOT NULL DEFAULT 0,
    alis_maliyeti REAL NOT NULL DEFAULT 0,
    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(urun_id) REFERENCES urunler(id),
    FOREIGN KEY(depo_id) REFERENCES depolar(id)
);

-- ============================================================
-- 8. STOK
-- ============================================================

CREATE TABLE IF NOT EXISTS mevcut_stoklar (
    urun_id INTEGER NOT NULL,
    depo_id INTEGER NOT NULL,
    miktar REAL NOT NULL DEFAULT 0,
    PRIMARY KEY(urun_id, depo_id),
    FOREIGN KEY(urun_id) REFERENCES urunler(id),
    FOREIGN KEY(depo_id) REFERENCES depolar(id)
);

CREATE TABLE IF NOT EXISTS stok_hareketleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    urun_id INTEGER NOT NULL,
    parti_id INTEGER,
    depo_id INTEGER NOT NULL,

    hareket_tipi TEXT NOT NULL,
    miktar REAL NOT NULL,

    birim_maliyet REAL NOT NULL DEFAULT 0,

    referans_tipi TEXT,
    referans_id INTEGER,

    kullanici_id INTEGER,
    aciklama TEXT,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(urun_id) REFERENCES urunler(id),
    FOREIGN KEY(parti_id) REFERENCES partiler(id),
    FOREIGN KEY(depo_id) REFERENCES depolar(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 9. CARİ
-- ============================================================

CREATE TABLE IF NOT EXISTS cariler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    cari_tipi TEXT NOT NULL,
    ad TEXT NOT NULL,
    vergi_no TEXT,
    telefon TEXT,
    email TEXT,
    adres TEXT,
    bakiye REAL NOT NULL DEFAULT 0,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(firma_id) REFERENCES firmalar(id)
);

CREATE TABLE IF NOT EXISTS cari_hareketleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cari_id INTEGER NOT NULL,

    hareket_tipi TEXT NOT NULL,

    borc REAL NOT NULL DEFAULT 0,
    alacak REAL NOT NULL DEFAULT 0,
    bakiye REAL NOT NULL DEFAULT 0,

    referans_tipi TEXT,
    referans_id INTEGER,

    aciklama TEXT,
    kullanici_id INTEGER,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(cari_id) REFERENCES cariler(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 10. SAYIM
-- ============================================================

CREATE TABLE IF NOT EXISTS sayimlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    sube_id INTEGER NOT NULL,
    depo_id INTEGER NOT NULL,

    sayim_no TEXT NOT NULL UNIQUE,
    durum TEXT NOT NULL DEFAULT 'ACIK',

    baslangic_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bitis_tarihi TEXT,

    kullanici_id INTEGER,

    aciklama TEXT,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(depo_id) REFERENCES depolar(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS sayim_detaylari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sayim_id INTEGER NOT NULL,
    urun_id INTEGER NOT NULL,
    parti_id INTEGER,

    sistem_miktari REAL NOT NULL DEFAULT 0,
    sayilan_miktar REAL NOT NULL DEFAULT 0,
    fark REAL NOT NULL DEFAULT 0,

    aciklama TEXT,

    FOREIGN KEY(sayim_id) REFERENCES sayimlar(id),
    FOREIGN KEY(urun_id) REFERENCES urunler(id),
    FOREIGN KEY(parti_id) REFERENCES partiler(id)
);

-- ============================================================
-- 11. FIRE
-- ============================================================

CREATE TABLE IF NOT EXISTS fire_nedenleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    aktif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fireler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,
    sube_id INTEGER NOT NULL,
    depo_id INTEGER NOT NULL,

    urun_id INTEGER NOT NULL,
    parti_id INTEGER,

    miktar REAL NOT NULL,
    birim_maliyet REAL NOT NULL DEFAULT 0,

    neden_id INTEGER,
    neden TEXT,

    aciklama TEXT,

    kullanici_id INTEGER,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(depo_id) REFERENCES depolar(id),
    FOREIGN KEY(urun_id) REFERENCES urunler(id),
    FOREIGN KEY(parti_id) REFERENCES partiler(id),
    FOREIGN KEY(neden_id) REFERENCES fire_nedenleri(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 12. SATIN ALMA
-- ============================================================

CREATE TABLE IF NOT EXISTS satin_alma_siparisleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,
    sube_id INTEGER NOT NULL,
    cari_id INTEGER,

    siparis_no TEXT NOT NULL UNIQUE,
    durum TEXT NOT NULL DEFAULT 'BEKLIYOR',

    toplam_tutar REAL NOT NULL DEFAULT 0,

    siparis_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    kullanici_id INTEGER,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(cari_id) REFERENCES cariler(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS satin_alma_detaylari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    siparis_id INTEGER NOT NULL,
    urun_id INTEGER NOT NULL,

    miktar REAL NOT NULL,
    birim_fiyat REAL NOT NULL DEFAULT 0,
    kdv_orani REAL NOT NULL DEFAULT 0,
    toplam REAL NOT NULL DEFAULT 0,

    FOREIGN KEY(siparis_id) REFERENCES satin_alma_siparisleri(id),
    FOREIGN KEY(urun_id) REFERENCES urunler(id)
);

-- ============================================================
-- 13. MAL KABUL
-- ============================================================

CREATE TABLE IF NOT EXISTS mal_kabuller (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,
    sube_id INTEGER NOT NULL,
    depo_id INTEGER NOT NULL,

    cari_id INTEGER,

    kabul_no TEXT NOT NULL UNIQUE,
    fatura_no TEXT,

    toplam_tutar REAL NOT NULL DEFAULT 0,

    kabul_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    kullanici_id INTEGER,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(depo_id) REFERENCES depolar(id),
    FOREIGN KEY(cari_id) REFERENCES cariler(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS mal_kabul_detaylari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    kabul_id INTEGER NOT NULL,
    urun_id INTEGER NOT NULL,

    parti_no TEXT,
    son_kullanma_tarihi TEXT,

    miktar REAL NOT NULL,
    birim_fiyat REAL NOT NULL DEFAULT 0,
    toplam REAL NOT NULL DEFAULT 0,

    FOREIGN KEY(kabul_id) REFERENCES mal_kabuller(id),
    FOREIGN KEY(urun_id) REFERENCES urunler(id)
);

-- ============================================================
-- 14. SATIŞ / POS
-- ============================================================

CREATE TABLE IF NOT EXISTS satislar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,
    sube_id INTEGER NOT NULL,

    fis_no TEXT NOT NULL UNIQUE,

    kullanici_id INTEGER,

    ara_toplam REAL NOT NULL DEFAULT 0,
    indirim REAL NOT NULL DEFAULT 0,
    kdv REAL NOT NULL DEFAULT 0,
    genel_toplam REAL NOT NULL DEFAULT 0,

    odeme_tipi TEXT,

    durum TEXT NOT NULL DEFAULT 'TAMAMLANDI',

    satis_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS satis_detaylari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    satis_id INTEGER NOT NULL,
    urun_id INTEGER NOT NULL,

    miktar REAL NOT NULL,
    birim_fiyat REAL NOT NULL DEFAULT 0,

    indirim REAL NOT NULL DEFAULT 0,
    kdv_orani REAL NOT NULL DEFAULT 0,
    toplam REAL NOT NULL DEFAULT 0,

    FOREIGN KEY(satis_id) REFERENCES satislar(id),
    FOREIGN KEY(urun_id) REFERENCES urunler(id)
);

-- ============================================================
-- 15. KASA
-- ============================================================

CREATE TABLE IF NOT EXISTS kasalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sube_id INTEGER NOT NULL,

    kasa_kodu TEXT NOT NULL,
    kasa_adi TEXT NOT NULL,

    aktif INTEGER NOT NULL DEFAULT 1,

    UNIQUE(sube_id, kasa_kodu),

    FOREIGN KEY(sube_id) REFERENCES subeler(id)
);

CREATE TABLE IF NOT EXISTS kasa_hareketleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    kasa_id INTEGER NOT NULL,

    hareket_tipi TEXT NOT NULL,
    tutar REAL NOT NULL,

    aciklama TEXT,

    referans_tipi TEXT,
    referans_id INTEGER,

    kullanici_id INTEGER,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(kasa_id) REFERENCES kasalar(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS kasa_gunleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    kasa_id INTEGER NOT NULL,
    tarih TEXT NOT NULL,

    acilis_nakdi REAL NOT NULL DEFAULT 0,
    beklenen_nakit REAL NOT NULL DEFAULT 0,
    sayilan_nakit REAL NOT NULL DEFAULT 0,

    kasa_fazlasi REAL NOT NULL DEFAULT 0,
    kasa_eksigi REAL NOT NULL DEFAULT 0,

    kapanis_tarihi TEXT,

    kullanici_id INTEGER,

    FOREIGN KEY(kasa_id) REFERENCES kasalar(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 16. ÖDEME YÖNTEMLERİ
-- ============================================================

CREATE TABLE IF NOT EXISTS odeme_yontemleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    aktif INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- 17. BANKA
-- ============================================================

CREATE TABLE IF NOT EXISTS banka_hesaplari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,

    banka_adi TEXT NOT NULL,
    hesap_adi TEXT,

    iban TEXT,
    hesap_no TEXT,

    bakiye REAL NOT NULL DEFAULT 0,

    aktif INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id)
);

CREATE TABLE IF NOT EXISTS banka_hareketleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    banka_hesabi_id INTEGER NOT NULL,

    hareket_tipi TEXT NOT NULL,
    tutar REAL NOT NULL,

    aciklama TEXT,

    referans_tipi TEXT,
    referans_id INTEGER,

    kullanici_id INTEGER,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(banka_hesabi_id) REFERENCES banka_hesaplari(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 18. FATURALAR
-- ============================================================

CREATE TABLE IF NOT EXISTS faturalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,
    sube_id INTEGER,
    cari_id INTEGER,

    satis_id INTEGER,

    fatura_tipi TEXT NOT NULL,

    belge_no TEXT,
    ettn TEXT,

    toplam_tutar REAL NOT NULL DEFAULT 0,

    durum TEXT NOT NULL DEFAULT 'BEKLIYOR',

    entegrator TEXT,
    hata_mesaji TEXT,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(cari_id) REFERENCES cariler(id),
    FOREIGN KEY(satis_id) REFERENCES satislar(id)
);

-- ============================================================
-- 19. GÖREVLER
-- ============================================================

CREATE TABLE IF NOT EXISTS gorevler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,
    sube_id INTEGER,

    baslik TEXT NOT NULL,
    aciklama TEXT,

    atanan_kullanici_id INTEGER,

    durum TEXT NOT NULL DEFAULT 'BEKLIYOR',

    oncelik TEXT NOT NULL DEFAULT 'NORMAL',

    son_tarih TEXT,

    tamamlanma_tarihi TEXT,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(sube_id) REFERENCES subeler(id),
    FOREIGN KEY(atanan_kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 20. İŞLEM LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS islem_loglari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER,
    kullanici_id INTEGER,

    islem TEXT NOT NULL,
    tablo_adi TEXT,
    kayit_id INTEGER,

    eski_deger TEXT,
    yeni_deger TEXT,

    ip_adresi TEXT,

    olusturma_tarihi TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(firma_id) REFERENCES firmalar(id),
    FOREIGN KEY(kullanici_id) REFERENCES kullanicilar(id)
);

-- ============================================================
-- 21. SİSTEM AYARLARI
-- ============================================================

CREATE TABLE IF NOT EXISTS sistem_ayarlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,

    anahtar TEXT NOT NULL,
    deger TEXT,

    UNIQUE(firma_id, anahtar),

    FOREIGN KEY(firma_id) REFERENCES firmalar(id)
);

-- ============================================================
-- 22. İNDEKSLER
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_urunler_ad
ON urunler(ad);

CREATE INDEX IF NOT EXISTS idx_urunler_kodu
ON urunler(urun_kodu);

CREATE INDEX IF NOT EXISTS idx_barkodlar_barkod
ON barkodlar(barkod);

CREATE INDEX IF NOT EXISTS idx_partiler_skt
ON partiler(son_kullanma_tarihi);

CREATE INDEX IF NOT EXISTS idx_partiler_urun
ON partiler(urun_id);

CREATE INDEX IF NOT EXISTS idx_stok_hareket_urun
ON stok_hareketleri(urun_id);

CREATE INDEX IF NOT EXISTS idx_stok_hareket_depo
ON stok_hareketleri(depo_id);

CREATE INDEX IF NOT EXISTS idx_cari_hareket_cari
ON cari_hareketleri(cari_id);

CREATE INDEX IF NOT EXISTS idx_fire_tarih
ON fireler(olusturma_tarihi);

CREATE INDEX IF NOT EXISTS idx_sayim_detay_sayim
ON sayim_detaylari(sayim_id);

CREATE INDEX IF NOT EXISTS idx_kasa_hareket_kasa
ON kasa_hareketleri(kasa_id);

CREATE INDEX IF NOT EXISTS idx_satis_tarih
ON satislar(satis_tarihi);

-- ============================================================
-- 23. BAŞLANGIÇ VERİLERİ
-- ============================================================

INSERT OR IGNORE INTO birimler (ad,sembol)
VALUES
('Adet','ADET'),
('Kilogram','KG'),
('Gram','GR'),
('Litre','LT'),
('Kutu','KUTU'),
('Paket','PKT'),
('Koli','KOLI');

INSERT OR IGNORE INTO odeme_yontemleri (ad)
VALUES
('Nakit'),
('Kredi Kartı'),
('Banka Kartı'),
('Havale/EFT'),
('Veresiye');

INSERT OR IGNORE INTO fire_nedenleri (ad)
VALUES
('SKT geçti'),
('Bozulma'),
('Hasar'),
('Kırılma'),
('Kayıp'),
('Sayım farkı'),
('Diğer');

INSERT OR IGNORE INTO roller (ad,aciklama)
VALUES
('Yönetici','Tüm sisteme erişim'),
('Depo Sorumlusu','Stok, depo ve SKT işlemleri'),
('Satın Alma','Tedarikçi ve sipariş işlemleri'),
('Kasa','Kasa ve ödeme işlemleri'),
('Personel','Sınırlı operasyon işlemleri');

-- ============================================================
-- ŞEMA SONU
-- ============================================================
