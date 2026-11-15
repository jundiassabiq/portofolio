# Creative Portfolio — Apple Style (Pure White Edition)

Website portofolio interaktif yang memadukan **arsitektur layout Sawad** (dua kolom, sticky sidebar, hero brutalist, showcase projects, experience, tools, dan contact form) dengan **Apple Design Language Pure White / Light Mode** ([apple.com/id](https://www.apple.com/id/)).

---

## ⚪ Karakteristik Apple Pure White Style

1. **Palet Warna & Permukaan Bersih (Cupertino Light Aesthetic):**
   - **Background Halaman:** `#fbfbfd` (warna off-white khas halaman utama Apple).
   - **Kartu & Surface Utama:** `#ffffff` murni berpadu dengan aksen `#f5f5f7` (warna kontainer bento / rak produk Apple).
   - **Hairline Borders:** Garis batas halus `rgba(0, 0, 0, 0.08)` dan `#d2d2d7`.
   - **Diffuse Apple Shadows:** Bayangan lembut bertingkat (`0 2px 8px rgba(0, 0, 0, 0.04)` hingga `0 16px 36px rgba(0, 0, 0, 0.08)`).
   - **Tipografi Apple Light:**
     - Judul solid: `#1d1d1f` (deep charcoal near-black standar Apple).
     - Judul ghost: `#d2d2d7` (abu-abu terang kontras minimal khas Apple).
     - Teks sekunder & deskripsi: `#6e6e73` & `#86868b`.
   - **Aksen Biru Apple:** `#0071e3` (tombol utama) dan `#0066cc` (tautan dan eyebrow tags).
   - **Status Hijau iOS:** `#34c759` (iOS system green light).

2. **Apple Frosted Glass Navigation:**
   - Navbar kaca buram putih transparan (`rgba(255, 255, 255, 0.82)` dengan `backdrop-filter: saturate(180%) blur(20px)`), logo Apple hitam elegan, link navigasi minimalis, dan tombol aksi biru Apple.

3. **Komponen Apple Human Interface:**
   - Sudut melengkung squircle (`24px` pada kartu, `20px` pada avatar, `980px` pada pill buttons).
   - Tag eyebrow berkategori huruf kapital rapi (`PORTFOLIO`, `CAREER MILESTONES`, `ENVIRONMENT`, `COLLABORATION`).
   - Tombol tautan dengan chevron `›` (*Explore*).
   - Input formulir bergaya macOS/iOS dengan background putih-abu lembut dan focus ring biru Apple.

4. **Dynamic Island Switcher:**
   - Widget di pojok kanan bawah memungkinkan peralihan instan antara **Sawad Demo Mode** dan **Profil Jundi Assabiq** (Informatika UNSOED).

---

## 📁 Struktur File

```
portofolio/
├── index.html          # Markup semantik dengan tema Apple White
├── style.css           # Desain tokens Apple Light, bayangan difusi, dan tipografi
├── script.js           # Scroll spy, menu mobile, validasi form, dan profile switcher
├── content.js          # Dataset profil (Sawad Demo & Muhammad Jundi Assabiq)
├── assets/
│   ├── icons/          # Ikon Apple SVG, media sosial, dan chevron
│   └── images/         # Foto profil dan ikon aplikasi/tools
└── README.md
```

---

## 🚀 Cara Menjalankan

Buka langsung [index.html](file:///c:/Users/Junid/Documents/PROJECT/portofolio/index.html) di browser Anda, atau jalankan server lokal:

```bash
python -m http.server 3000
```
Lalu kunjungi `http://localhost:3000`.
