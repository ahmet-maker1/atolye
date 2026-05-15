# Atölye.co — Smartphone Envanter & Satış Sistemi

İkinci el telefon alım-satımı, teknik servis ve kasa yönetimi için web tabanlı, self-hosted bir envanter sistemi.

**Stack:** Node.js + Express + SQLite (better-sqlite3) + React + Vite + Tailwind + Recharts
**Sürüm:** v1.2 — production-ready (JWT auth, bcrypt parola, rate limit, helmet)

---

## 🚀 Yerel kurulum

### 1. Gereksinimler
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- (Windows: VS Build Tools, Mac: Xcode CLT — better-sqlite3'ün native binding'i için)

### 2. Kur
```bash
npm run install-all
npm run seed         # tek admin oluşturur (default: admin@atolye.co / admin)
npm run dev
```

`http://localhost:5173` aç.

### 3. Giriş

**Geliştirme default'u:**
- `admin@atolye.co` / `admin` — Admin

**Kendi kullanıcı bilgilerinle başlamak istersen:**
```bash
ADMIN_NAME="Adın Soyadın" \
ADMIN_EMAIL="sen@dukkan.com" \
ADMIN_PASSWORD="Guclu_Parola_42" \
npm run seed
```

---

## 🌐 Canlıya alma — Hostinger VPS + Coolify

### 1. Hazırlık
- **Hostinger VPS** al — KVM 1 yeterli (3-4 €/ay, 1 vCPU, 4 GB RAM). Plan satın alırken 1 yıl ücretsiz domain seç.
- OS olarak **Ubuntu 22.04 LTS** kur
- Bu projeyi GitHub'a private repo olarak push et

### 2. Coolify kurulumu (VPS'e)

VPS hazır olduğunda SSH'le bağlan:

```bash
ssh root@<vps-ip>
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

10 dakika sonra `http://<vps-ip>:8000` adresinde Coolify panelin hazır olur. İlk girişte admin hesabı oluştur.

### 3. Domain'i VPS'e yönlendir

Hostinger panelinde **Domains > DNS Yönetimi**:
- A kaydı `@` → VPS IP
- A kaydı `www` → VPS IP

DNS yayılması 10-30 dakika.

### 4. Coolify'de proje oluştur

Coolify panelinde:
1. **New Resource > Public Repository** veya **Private Repository** (GitHub App bağla)
2. Build Pack: **Dockerfile** (zip'inde hazır)
3. Domain bağla — Coolify Let's Encrypt SSL'i otomatik alır

### 5. Environment Variables

Coolify proje > **Environment Variables**:

```
NODE_ENV=production
JWT_SECRET=<aşağıdaki komutla üret>
PUBLIC_URL=https://senin-domain.com
CORS_ORIGIN=https://senin-domain.com
DATA_DIR=/data
```

`JWT_SECRET` için terminalden:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 6. Persistent Storage

Coolify proje > **Storages**:
- Container path: `/data`
- Volume size: 5 GB başlangıç (DB + fotoğraflar burada kalır, restart'ta silinmez)

### 7. Deploy

**Deploy** butonuna bas → 5-10 dakikada sistem ayakta. Domain'i açtığında login ekranı gelir.

### 8. İlk admin'i oluştur

Coolify panelinde proje > **Terminal** sekmesinden konteynere bağlan:

```bash
cd /app/server
ADMIN_NAME="Adın Soyadın" \
ADMIN_EMAIL="sen@dukkan.com" \
ADMIN_PASSWORD="Cok_Guclu_Parola_42!" \
SEED_FORCE=1 \
node seed.js
```

`SEED_FORCE=1` production guard'ı aşar (canlıda yanlışlıkla seed çalışmasın diye). Bu komut **boş** bir veritabanı oluşturur ve içinde sadece bir Admin kullanıcısı olur. Cihazlar, müşteriler, servisler — hepsi 0.

İlk giriş sonrası:
1. **Personel** sayfasından diğer kullanıcıları ekle (Kasiyer, Teknisyen)
2. **Cari Kartlar** sayfasından tedarikçi/müşterileri ekle
3. **Cihazlar** sayfasından cihaz girişine başla

⚠ `seed.js`'i ikinci kez çalıştırırsan **tüm veriyi siler**. Production'da `SEED_FORCE=1` zorunlu, yanlışlıkla tetiklenmesin.

---

## 🔒 Güvenlik

Bu sürümde yapılanlar:

- **Parolalar bcrypt ile hash'leniyor** (10 round)
- **JWT auth** — 12 saat geçerli token, her API çağrısında doğrulanır
- **Rol bazlı yetki** — Admin (her şey) / Kasiyer (satış, müşteri) / Teknisyen (servis)
- **Rate limiting** — login için 15dk'da 10 deneme; genel API için 15dk'da 600
- **Helmet** — güvenlik header'ları
- **CORS whitelist** — sadece `CORS_ORIGIN`'deki domain'lerden istek kabul edilir
- **Backup sadece Admin** — token ile imzalı download URL

Yapılması iyi olan ama henüz olmayan:
- 2FA (gerekmez, dahili 3 kişilik takım için)
- Audit log (kim ne sildi/değiştirdi — sonradan ekleriz)
- Otomatik bulut yedek (Cloudflare R2 hazır olunca ekleriz)

---

## 📱 Telefondan QR okutma

Telefon, web sayfasına HTTPS ile erişebildiği sürece QR taraması direkt çalışır. Production'da Railway HTTPS otomatik gelir.

QR'ın içerdiği URL = `<PUBLIC_URL>/qr/<token>` formatında. Yani QR'ı tarayan kişi (müşteri/teknisyen) hassas bilgileri **göremez** — sadece cihazın aleni özellikleri (marka, model, durum, fotoğraflar).

---

## 📋 Özellikler

### Cihaz yönetimi
- IMEI, marka, model, renk, hafıza, RAM, batarya, ekran, kondisyon, raf
- IMEI **unique değil** — aynı cihaz 2. el geri alınabilir
- 10 fotoğrafa kadar (8 MB max, jpeg/png/webp)
- QR kod (gerçek, taranabilir) ve Code128 barkod
- Sticker yazdırma (60×40mm)
- Sil & geri al (30 saniye undo)

### Maliyet & kâr otomasyonu
Cihaza eklenen her masraf, servis parçası ve işçilik otomatik maliyete eklenir. Sat → kâr anında hesaplanır.

### Kasa
Her alış kasa çıkışı, her satış kasa girişi (otomatik). Manuel kira/fatura/diğer giderler.

### Teknik servis
İş emri (envanter veya harici), parça + işçilik, teknisyen, durum akışı.

### Yedekleme
Ayarlar > Yedek Al → DB + tüm fotoğraflar tek `.zip` olarak iner. Sadece Admin.

### Tema
Açık (krem) ve koyu (deep) tema. Sol alt köşedeki ay/güneş ikonu.

### Mobil uyumlu
Tüm sayfalar telefon ekranında çalışır, sidebar drawer olur.

---

## 🔧 Komutlar

```bash
npm run install-all      # Tüm bağımlılıkları kur
npm run dev              # Server + client paralel (dev)
npm run build            # React production build
npm start                # Production server (:3001'de hem API hem UI)
npm run seed             # Tek admin kullanıcısı oluştur
npm run reset-db         # ⚠ DB'yi silip yeniden yükle
```

---

## 🐛 Sorun giderme

### `better-sqlite3` derleme hatası
- **Windows:** `npm install --global windows-build-tools`
- **Mac:** `xcode-select --install`
- **Linux:** `sudo apt install build-essential python3`
- Sonra `cd server && rm -rf node_modules && npm install`

### "JWT_SECRET tanımlı değil" hatası
`server/.env.example`'ı `.env`'ye kopyala ve değerleri doldur (özellikle JWT_SECRET).

### Railway'de QR kodlar localhost gösteriyor
`PUBLIC_URL` env değişkenini Railway Variables'a ekle.

### Telefondan açılmıyor
HTTPS gerekli. Production'da Railway HTTPS otomatik veriyor.

---

## 📦 Veritabanı

SQLite tek dosya:
- **Local:** `server/db/atolye.db`
- **Railway:** `/data/atolye.db` (volume mount)

100k cihaza kadar problemsiz (~50 MB). WAL modu aktif (paralel okuma + güvenli yazma).

Yedekten geri dönmek: zip içinden çıkan dosyaları ilgili klasöre kopyala, sunucuyu yeniden başlat.
