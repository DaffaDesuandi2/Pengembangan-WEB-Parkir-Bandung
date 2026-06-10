# WebGIS Lokasi Parkir Publik Kota Bandung

WebGIS ini dibuat untuk menampilkan titik-titik lokasi parkir publik di Kota Bandung secara interaktif. Aplikasi ini membantu pengguna mencari lokasi parkir resmi, melihat informasi parkir, serta menemukan parkir terdekat berdasarkan posisi pengguna.

## Tim Pengembang

Proyek ini dikembangkan oleh mahasiswa Teknik Informatika Institut Teknologi Sumatera (ITERA) Angkatan 2023.

| Nama                     | NIM       |
| ------------------------ | --------- |
| M. Zahran Dhiyaul Haq    | 123140120 |
| M. Daffansyah Desuandi   | 123140127 |
| Falih Faiq Fadhlurrahman | 123140129 |
| Khairul Rijal Syauqi     | 123140143 |

## Tentang Proyek

Permasalahan parkir liar masih sering ditemukan di Kota Bandung. Salah satu penyebabnya adalah kurangnya informasi mengenai lokasi parkir resmi yang tersedia di sekitar pengguna.

Melalui aplikasi ini, pengguna dapat melihat sebaran lokasi parkir publik pada peta, membaca informasi detail parkir, dan mencari titik parkir terdekat dalam radius tertentu.

## Fitur

* Menampilkan titik parkir pada peta interaktif
* Melihat detail lokasi parkir seperti nama, alamat, tarif, dan kapasitas
* Mencari lokasi parkir dalam radius tertentu dari posisi pengguna
* Mengurutkan parkir berdasarkan jarak terdekat
* Mengelola data parkir melalui fitur tambah, ubah, dan hapus data
* Melihat sebaran lokasi parkir berdasarkan wilayah kecamatan
* Sistem login administrator untuk pengelolaan data

## Teknologi yang Digunakan

| Bagian       | Teknologi     |
| ------------ | ------------- |
| Frontend     | ReactJS       |
| Peta         | Leaflet.js    |
| Backend      | FastAPI       |
| Database     | PostgreSQL    |
| Data Spasial | PostGIS       |
| Peta Dasar   | OpenStreetMap |

## Arsitektur Singkat

Aplikasi terdiri dari tiga bagian utama:

1. Frontend menggunakan ReactJS dan Leaflet.js untuk menampilkan peta serta antarmuka pengguna.
2. Backend menggunakan FastAPI untuk menyediakan REST API.
3. Database menggunakan PostgreSQL dengan ekstensi PostGIS untuk menyimpan dan mengolah data spasial.

Alur sistem:

```text
Frontend (React + Leaflet)
        |
        | REST API
        v
Backend (FastAPI)
        |
        | SQL + PostGIS
        v
Database (PostgreSQL + PostGIS)
```

## Struktur Folder

```text
Pengembangan-WEB-Parkir-Bandung/
│
├── Backend/
│   ├── main.py
│   ├── schemas.py
│   └── requirements.txt
│
├── Frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
├── database/
│   └── database_parkir_bandung.sql
│
└── README.md
```

## Persyaratan

Sebelum menjalankan aplikasi, pastikan perangkat sudah memiliki:

* Python 3.10 atau versi lebih baru
* Node.js 18 atau versi lebih baru
* PostgreSQL 14 atau versi lebih baru
* PostGIS 3 atau versi lebih baru

## Setup Database

Buat database baru di PostgreSQL:

```sql
CREATE DATABASE "Tubes_SIG";
```

Masuk ke database tersebut, lalu aktifkan ekstensi PostGIS:

```sql
\c "Tubes_SIG"

CREATE EXTENSION IF NOT EXISTS postgis;
```

Jalankan file SQL yang tersedia:

```bash
psql -U postgres -d "Tubes_SIG" -f database/database_parkir_bandung.sql
```

## Setup Backend

Masuk ke folder backend:

```bash
cd Backend
```

Buat virtual environment:

```bash
python -m venv venv
```

Aktifkan virtual environment:

```bash
venv\Scripts\activate
```

Install dependensi:

```bash
pip install -r requirements.txt
```

Jalankan server FastAPI:

```bash
uvicorn main:app --reload
```

Backend berjalan di:

```text
http://localhost:8000
```

Dokumentasi API dapat diakses melalui:

```text
http://localhost:8000/docs
```

## Setup Frontend

Masuk ke folder frontend:

```bash
cd Frontend
```

Install dependensi:

```bash
npm install
```

Jalankan frontend:

```bash
npm run dev
```

Frontend berjalan di:

```text
http://localhost:5173
```

## Endpoint API

| Method | Endpoint               | Keterangan                                               |
| ------ | ---------------------- | -------------------------------------------------------- |
| GET    | `/api/parkir`          | Mengambil semua data titik parkir                        |
| POST   | `/api/parkir`          | Menambahkan data parkir baru                             |
| GET    | `/api/parkir/terdekat` | Mencari parkir terdekat berdasarkan koordinat dan radius |
| PUT    | `/api/parkir/{id}`     | Mengubah data parkir                                     |
| DELETE | `/api/parkir/{id}`     | Menghapus data parkir                                    |
| GET    | `/api/kecamatan`       | Mengambil batas wilayah kecamatan                         |
| GET    | `/api/categories`      | Mengambil daftar kategori kendaraan                       |
| POST   | `/api/admin/login`     | Login administrator                                       |

Contoh pencarian parkir terdekat:

```text
GET /api/parkir/terdekat?lat=-6.9175&lon=107.6191&radius_meter=1000
```

Parameter:

| Parameter     | Tipe  | Keterangan                   |
| ------------- | ----- | ---------------------------- |
| lat           | float | Latitude posisi pengguna     |
| lon           | float | Longitude posisi pengguna    |
| radius_meter  | int   | Radius pencarian dalam meter |

## Skema Database

### Tabel `parking_locations`

Menyimpan data lokasi parkir.

| Kolom        | Tipe                  | Keterangan                |
| ------------ | --------------------- | ------------------------- |
| id           | SERIAL PK             | ID parkir                 |
| name         | VARCHAR               | Nama lokasi parkir        |
| address      | TEXT                  | Alamat lokasi             |
| capacity     | INTEGER               | Kapasitas parkir          |
| price_rate   | INTEGER               | Tarif parkir per jam       |
| status       | VARCHAR               | Status (Open/Closed/Full) |
| category_id  | INTEGER FK            | Relasi ke tabel kategori  |
| admin_id     | INTEGER FK            | Relasi ke tabel admin     |
| geom         | GEOMETRY(Point, 4326) | Koordinat lokasi          |

### Tabel `categories`

Menyimpan kategori jenis kendaraan.

| Kolom        | Tipe      | Keterangan       |
| ------------ | --------- | ---------------- |
| id           | SERIAL PK | ID kategori      |
| type_name    | VARCHAR   | Nama jenis       |
| description  | TEXT      | Deskripsi kategori |

### Tabel `wilayah_kecamatan`

Menyimpan data wilayah kecamatan.

| Kolom          | Tipe                    | Keterangan              |
| -------------- | ----------------------- | ----------------------- |
| id             | SERIAL PK               | ID kecamatan            |
| nama_kecamatan | VARCHAR                 | Nama kecamatan          |
| geom           | GEOMETRY(Polygon, 4326) | Batas wilayah kecamatan |

### Tabel `admins`

Menyimpan data administrator sistem.

| Kolom       | Tipe      | Keterangan       |
| ----------- | --------- | ---------------- |
| id          | SERIAL PK | ID admin         |
| username    | VARCHAR   | Username login   |
| password    | VARCHAR   | Password (hash)   |
| full_name   | VARCHAR   | Nama lengkap     |
| last_login  | TIMESTAMP | Waktu login terakhir |

## Contoh Query Spasial

Query berikut digunakan untuk mencari lokasi parkir dalam radius 500 meter dari titik tertentu:

```sql
SELECT 
    id,
    name,
    price_rate,
    capacity,
    ST_Distance(
        geom::geography,
        ST_MakePoint(107.6191, -6.9175)::geography
    ) AS jarak_meter
FROM parking_locations
WHERE ST_DWithin(
    geom::geography,
    ST_MakePoint(107.6191, -6.9175)::geography,
    500
)
ORDER BY jarak_meter ASC;
```

## Referensi

* [PostGIS Documentation](https://postgis.net/documentation/)
* [Leaflet.js Documentation](https://leafletjs.com/)
* [FastAPI Documentation](https://fastapi.tiangolo.com/)
* [OpenStreetMap](https://www.openstreetmap.org/)
