# WebGIS Pemetaan Lokasi Parkir Publik — Kota Bandung

> Sistem Informasi Geografis berbasis web untuk memvisualisasikan dan mencari lokasi parkir resmi di Kota Bandung secara interaktif.

---

## Tim Pengembang

Proyek ini dikembangkan oleh mahasiswa Teknik Informatika — Institut Teknologi Sumatera (ITERA) Angkatan 2023.

| Nama | NIM |
|---|---|
| M. Zahran Dhiyaul Haq | 123140120 |
| M. Daffansyah Desuandi | 123140127 |
| Falih Faiq Fadhlurrahman | 123140129 |
| Khairul Rijal Syauqi | 123140143 |

---

## Tentang Proyek

Proyek ini dikembangkan sebagai respons atas permasalahan parkir liar yang tidak terkendali di Kota Bandung. Banyak pengendara parkir sembarangan karena tidak mengetahui lokasi kantong parkir resmi terdekat.

Solusinya adalah WebGIS yang menampilkan sebaran titik parkir resmi di seluruh wilayah Kota Bandung, dilengkapi dengan pencarian berdasarkan radius lokasi pengguna dan informasi detail seperti tarif dan kapasitas.

---

## Fitur Utama

- **Peta Interaktif** — Visualisasi titik parkir resmi di atas peta OpenStreetMap menggunakan Leaflet.js
- **Popup Informasi** — Klik marker untuk melihat nama lokasi, alamat, tarif, dan kapasitas parkir
- **Pencarian Radius** — Cari parkir dalam radius tertentu (misal: 500 m) dari posisi pengguna saat ini menggunakan fungsi spasial `ST_DWithin`
- **Parkir Terdekat** — Urutkan lokasi parkir berdasarkan jarak menggunakan `ST_Distance`
- **CRUD Admin** — Tambah, ubah, dan hapus data parkir melalui form modal
- **Filter Wilayah** — Analisis sebaran parkir per kecamatan

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│              ReactJS + Leaflet.js                       │
│    (Peta Interaktif, Sidebar, Filter, Form CRUD)        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / REST API
                         ▼
┌─────────────────────────────────────────────────────────┐
│                       BACKEND                           │
│               FastAPI (Python)                          │
│    (REST API, Validasi Pydantic, Kueri Spasial)         │
└────────────────────────┬────────────────────────────────┘
                         │ SQL + PostGIS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      DATABASE                           │
│           PostgreSQL + Ekstensi PostGIS                 │
│  (ST_DWithin, ST_Distance, Geometry Point & Polygon)    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              OpenStreetMap (Tile Provider)
```

---

## Tech Stack

| Lapisan | Teknologi | Keterangan |
|---|---|---|
| **Frontend** | ReactJS | UI komponen berbasis state |
| **Peta** | Leaflet.js | Render marker dan peta interaktif |
| **Backend** | FastAPI (Python) | REST API dan validasi data |
| **Database** | PostgreSQL | Penyimpanan data relasional |
| **Spasial** | PostGIS | Kueri dan fungsi geometri |
| **Tile Map** | OpenStreetMap | Peta dasar gratis & open-source |

---

## Struktur Folder

```
Pengembangan-WEB-Parkir-Bandung/
│
├── Backend/                        # FastAPI Backend
│   ├── main.py                     # Entry point aplikasi FastAPI
│   ├── schema.py                   # Koneksi ke PostgreSQL/PostGIS, model SQLAlchemy / Pydantic schema
│   ├── routes/
│   │   └── parkir.py               # Router endpoint /api/parkir
│   ├── requirements.txt            # Dependensi Python
│   └── .env.example                # Template variabel environment
│
├── Frontend/                       # ReactJS Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx          # Komponen peta Leaflet utama
│   │   │   ├── Sidebar.jsx          # Panel pencarian & daftar parkir
│   │   │   ├── ParkingMarker.jsx    # Marker + popup informasi parkir
│   │   │   └── ModalForm.jsx        # Form CRUD tambah/edit parkir
│   │   ├── services/
│   │   │   └── api.js               # Fungsi fetch ke Backend API
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── .env.example
│
├── database/                       # Script SQL
│   └── database_parkir_bandung.sql # Tabel & aktifkan PostGIS, data sample 20 titik parkir, contoh kueri spasial ST_Distance, ST_DWithin
│
└── README.md
```

---

## Persyaratan

Pastikan sudah terinstall:

- [Python](https://www.python.org/) >= 3.10
- [Node.js](https://nodejs.org/) >= 18.x & npm
- [PostgreSQL](https://www.postgresql.org/) >= 14
- [PostGIS](https://postgis.net/) >= 3.x (ekstensi PostgreSQL)

---

## Setup Database

### 1. Buat database baru di PostgreSQL

```sql
CREATE DATABASE parkir_bandung;
```

### 2. Aktifkan ekstensi PostGIS

Masuk ke database yang baru dibuat, lalu jalankan:

```sql
\c parkir_bandung
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Jalankan script skema dan data

```bash
psql -U postgres -d parkir_bandung -f database/schema.sql
psql -U postgres -d parkir_bandung -f database/seed.sql
```

### 4. Verifikasi

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

Harus muncul: `titik_parkir`, `pengelola`, `wilayah_kecamatan`.

---

## Setup Backend

### 1. Masuk ke folder Backend

```bash
cd Backend
```

### 2. Buat dan aktifkan virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependensi

```bash
pip install -r requirements.txt
```

### 4. Konfigurasi environment

Salin file `.env.example` menjadi `.env` dan isi variabel berikut:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/parkir_bandung
```

Ganti `postgres` dan `password` sesuai konfigurasi PostgreSQL lokal kamu.

### 5. Jalankan server FastAPI

```bash
uvicorn main:app --reload
```

Server akan berjalan di: `http://localhost:8000`

Dokumentasi API interaktif tersedia di: `http://localhost:8000/docs`

---

## Setup Frontend

### 1. Masuk ke folder Frontend

```bash
cd Frontend
```

### 2. Install dependensi Node

```bash
npm install
```

### 3. Konfigurasi environment

Salin file `.env.example` menjadi `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Jalankan development server

```bash
npm run dev
```

Aplikasi akan berjalan di: `http://localhost:5173`

---

## Endpoint API

Base URL: `http://localhost:8000`

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/parkir` | Ambil semua titik parkir (format GeoJSON) |
| `POST` | `/api/parkir` | Tambah titik parkir baru |
| `GET` | `/api/parkir/terdekat` | Cari parkir terdekat berdasarkan koordinat & radius |
| `PUT` | `/api/parkir/{id}` | Update data parkir |
| `DELETE` | `/api/parkir/{id}` | Hapus data parkir |

### Contoh: Cari Parkir Terdekat

```
GET /api/parkir/terdekat?lat=-6.9175&lon=107.6191&radius=500
```

**Parameter query:**

| Parameter | Tipe | Keterangan |
|---|---|---|
| `lat` | `float` | Latitude posisi pengguna |
| `lon` | `float` | Longitude posisi pengguna |
| `radius` | `int` | Radius pencarian dalam meter (default: 500) |

**Contoh respons:**

```json
[
  {
    "id": 1,
    "nama_lokasi": "Lahan Parkir Balai Kota",
    "alamat": "Jl. Wastukencana No. 2",
    "kapasitas": 150,
    "tarif": 3000,
    "jarak_meter": 212.5,
    "geometry": {
      "type": "Point",
      "coordinates": [107.6191, -6.9175]
    }
  }
]
```

---

## Skema Database

### Tabel `titik_parkir`
Menyimpan lokasi spesifik setiap kantong parkir resmi.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `SERIAL PK` | ID unik parkir |
| `nama_lokasi` | `VARCHAR` | Nama tempat parkir |
| `alamat` | `TEXT` | Alamat singkat |
| `kapasitas` | `INTEGER` | Jumlah slot tersedia |
| `tarif` | `INTEGER` | Tarif parkir (Rp/jam atau flat) |
| `id_pengelola` | `INTEGER FK` | Referensi ke tabel `pengelola` |
| `geom` | `GEOMETRY(Point, 4326)` | Koordinat lokasi (WGS84) |

### Tabel `pengelola`
Menyimpan data instansi/pihak pengelola parkir (relasi One-to-Many dengan `titik_parkir`).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `SERIAL PK` | ID unik pengelola |
| `nama_pengelola` | `VARCHAR` | Nama instansi |
| `kontak` | `VARCHAR` | Nomor telepon / email |
| `jenis_instansi` | `VARCHAR` | Contoh: Swasta, Dishub, dll. |

### Tabel `wilayah_kecamatan`
Menyimpan batas administratif kecamatan di Kota Bandung untuk analisis spasial area.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `SERIAL PK` | ID unik kecamatan |
| `nama_kecamatan` | `VARCHAR` | Nama kecamatan |
| `luas_area` | `FLOAT` | Luas dalam km² |
| `geom` | `GEOMETRY(Polygon, 4326)` | Batas wilayah (WGS84) |

### Contoh Kueri Spasial

```sql
-- Cari parkir dalam radius 500 meter dari titik tertentu
SELECT id, nama_lokasi, tarif, kapasitas,
       ST_Distance(geom::geography, ST_MakePoint(107.6191, -6.9175)::geography) AS jarak_meter
FROM titik_parkir
WHERE ST_DWithin(geom::geography, ST_MakePoint(107.6191, -6.9175)::geography, 500)
ORDER BY jarak_meter ASC;
```

---

## Referensi

- [PostGIS Documentation](https://postgis.net/documentation/)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Data Lokasi Parkir Off-Street Kota Bandung — Dishub Bandung](https://dishub.bandung.go.id/berita/data-lokasi-parkir-off-street-di-kota-bandung)
- [OpenStreetMap via Overpass Turbo](https://overpass-turbo.eu/)

---
