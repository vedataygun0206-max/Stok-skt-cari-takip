PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. FİRMA / ŞUBE / KULLANICI / YETKİ
-- =========================================================

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id)
);

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

    FOREIGN KEY(rol_id)
        REFERENCES roller(id),

    FOREIGN KEY(yetki_id)
        REFERENCES yetkiler(id)
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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id),

    FOREIGN KEY(rol_id)
        REFERENCES roller(id)
);

-- =========================================================
-- 2. ÜRÜN / KATEGORİ / BİRİM / BARKOD
-- =========================================================

CREATE TABLE IF NOT EXISTS kategoriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    ust_kategori_id INTEGER,
    aktif INTEGER NOT NULL DEFAULT 1,

    UNIQUE(firma_id, ad),

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(ust_kategori_id)
        REFERENCES kategoriler(id)
);

CREATE TABLE IF NOT EXISTS birimler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    sembol TEXT NOT NULL UNIQUE
);

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(kategori_id)
        REFERENCES kategoriler(id),

    FOREIGN KEY(birim_id)
        REFERENCES birimler(id)
);

CREATE TABLE IF NOT EXISTS barkodlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_id INTEGER NOT NULL,
    barkod TEXT NOT NULL UNIQUE,
    barkod_tipi TEXT NOT NULL DEFAULT 'EAN13',
    birincil INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id)
);

-- =========================================================
-- 3. DEPO / PARTİ / SKT / STOK
-- =========================================================

CREATE TABLE IF NOT EXISTS depolar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sube_id INTEGER NOT NULL,
    ad TEXT NOT NULL,
    kod TEXT NOT NULL,
    aktif INTEGER NOT NULL DEFAULT 1,

    UNIQUE(sube_id, kod),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id)
);

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

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id),

    FOREIGN KEY(depo_id)
        REFERENCES depolar(id)
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

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id),

    FOREIGN KEY(parti_id)
        REFERENCES partiler(id),

    FOREIGN KEY(depo_id)
        REFERENCES depolar(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS mevcut_stoklar (
    urun_id INTEGER NOT NULL,
    depo_id INTEGER NOT NULL,

    miktar REAL NOT NULL DEFAULT 0,

    PRIMARY KEY(urun_id, depo_id),

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id),

    FOREIGN KEY(depo_id)
        REFERENCES depolar(id)
);

-- =========================================================
-- 4. CARİ HESAPLAR
-- =========================================================

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id)
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

    FOREIGN KEY(cari_id)
        REFERENCES cariler(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
);

-- =========================================================
-- 5. SATIN ALMA
-- =========================================================

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id),

    FOREIGN KEY(cari_id)
        REFERENCES cariler(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
);

CREATE TABLE IF NOT EXISTS satin_alma_detaylari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    siparis_id INTEGER NOT NULL,
    urun_id INTEGER NOT NULL,

    miktar REAL NOT NULL,
    birim_fiyat REAL NOT NULL DEFAULT 0,
    kdv_orani REAL NOT NULL DEFAULT 0,

    toplam REAL NOT NULL DEFAULT 0,

    FOREIGN KEY(siparis_id)
        REFERENCES satin_alma_siparisleri(id),

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id)
);

-- =========================================================
-- 6. MAL KABUL
-- =========================================================

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id),

    FOREIGN KEY(depo_id)
        REFERENCES depolar(id),

    FOREIGN KEY(cari_id)
        REFERENCES cariler(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
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

    FOREIGN KEY(kabul_id)
        REFERENCES mal_kabuller(id),

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id)
);

-- =========================================================
-- 7. POS / SATIŞ
-- =========================================================

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
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

    FOREIGN KEY(satis_id)
        REFERENCES satislar(id),

    FOREIGN KEY(urun_id)
        REFERENCES urunler(id)
);

-- =========================================================
-- 8. KASA
-- =========================================================

CREATE TABLE IF NOT EXISTS kasalar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sube_id INTEGER NOT NULL,

    kasa_kodu TEXT NOT NULL,
    kasa_adi TEXT NOT NULL,

    aktif INTEGER NOT NULL DEFAULT 1,

    UNIQUE(sube_id, kasa_kodu),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id)
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

    FOREIGN KEY(kasa_id)
        REFERENCES kasalar(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
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

    FOREIGN KEY(kasa_id)
        REFERENCES kasalar(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
);

-- =========================================================
-- 9. ÖDEME YÖNTEMLERİ
-- =========================================================

CREATE TABLE IF NOT EXISTS odeme_yontemleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    ad TEXT NOT NULL UNIQUE,

    aktif INTEGER NOT NULL DEFAULT 1
);

-- =========================================================
-- 10. BANKA / HESAP
-- =========================================================

CREATE TABLE IF NOT EXISTS banka_hesaplari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,

    banka_adi TEXT NOT NULL,
    hesap_adi TEXT,

    iban TEXT,
    hesap_no TEXT,

    bakiye REAL NOT NULL DEFAULT 0,

    aktif INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id)
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

    FOREIGN KEY(banka_hesabi_id)
        REFERENCES banka_hesaplari(id),

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
);

-- =========================================================
-- 11. E-FATURA / E-ARŞİV
-- =========================================================

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

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id),

    FOREIGN KEY(sube_id)
        REFERENCES subeler(id),

    FOREIGN KEY(cari_id)
        REFERENCES cariler(id),

    FOREIGN KEY(satis_id)
        REFERENCES satislar(id)
);

-- =========================================================
-- 12. BARKODLU TERAZİ
-- =========================================================

CREATE TABLE IF NOT EXISTS terazi_ayarlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,

    prefix TEXT NOT NULL DEFAULT '27',

    urun_kodu_baslangic INTEGER NOT NULL DEFAULT 2,
    urun_kodu_uzunluk INTEGER NOT NULL DEFAULT 5,

    agirlik_baslangic INTEGER,
    agirlik_uzunluk INTEGER,

    fiyat_baslangic INTEGER,
    fiyat_uzunluk INTEGER,

    aktif INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id)
);

-- =========================================================
-- 13. DENETİM / AUDIT
-- =========================================================

CREATE TABLE IF NOT EXISTS denetim_kayitlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    kullanici_id INTEGER,

    islem_tipi TEXT NOT NULL,

    tablo_adi TEXT NOT NULL,

    kayit_id INTEGER,

    eski_veri TEXT,
    yeni_veri TEXT,

    ip_adresi TEXT,
    cihaz_id TEXT,

    tarih_saat TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(kullanici_id)
        REFERENCES kullanicilar(id)
);

-- =========================================================
-- 14. SİSTEM AYARLARI
-- =========================================================

CREATE TABLE IF NOT EXISTS sistem_ayarlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    firma_id INTEGER NOT NULL,

    anahtar TEXT NOT NULL,
    deger TEXT,

    UNIQUE(firma_id, anahtar),

    FOREIGN KEY(firma_id)
        REFERENCES firmalar(id)
);

-- =========================================================
-- BAŞLANGIÇ ROLLERİ
-- =========================================================

INSERT OR IGNORE INTO roller
(ad, aciklama)
VALUES
('SUPER_ADMIN','Tam sistem yetkisi'),
('MAGAZA_MUDURU','Mağaza yönetimi'),
('FINANS','Finans ve kasa işlemleri'),
('DEPO','Depo ve stok işlemleri'),
('KASIYER','POS ve satış işlemleri');

-- =========================================================
-- BAŞLANGIÇ BİRİMLERİ
-- =========================================================

INSERT OR IGNORE INTO birimler
(ad, sembol)
VALUES
('Adet','AD'),
('Kilogram','KG'),
('Gram','GR'),
('Litre','LT'),
('Metre','MT');

-- =========================================================
-- BAŞLANGIÇ ÖDEME YÖNTEMLERİ
-- =========================================================

INSERT OR IGNORE INTO odeme_yontemleri
(ad)
VALUES
('Nakit'),
('Kredi Kartı'),
('Banka Kartı'),
('Yemek Kartı'),
('Havale / EFT');
