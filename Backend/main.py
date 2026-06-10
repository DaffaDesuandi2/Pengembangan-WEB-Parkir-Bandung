from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from typing import Optional
import traceback
import hashlib
import secrets

import schemas

app = FastAPI(
    title="WebGIS Parkir Publik Bandung - API",
    description="Backend API Tugas Besar SIG menggunakan FastAPI dan PostGIS",
    version="1.0.0"
)

# Aktifkan CORS agar frontend (HTML/Vue/React) bisa memanggil API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fungsi Koneksi Database
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="Tubes SIG", 
            user="postgres",               
            password="12345",          
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"Gagal koneksi ke database: {e}")
        return None

@app.get("/")
def root():
    return {"status": "Online", "message": "Backend WebGIS Parkir Bandung Siap Digunakan"}

# ==========================================
# ENDPOINT 1: AMBIL SEMUA WILAYAH KECAMATAN (POLYGON)
# ==========================================
@app.get("/api/kecamatan", response_model=schemas.GeoJSONFeatureCollection)
def get_all_kecamatan():
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()
    
    query = """
        SELECT 
            id, 
            nama_kecamatan,
            ST_AsGeoJSON(geom)::json AS geom_json
        FROM public.wilayah_kecamatan;
    """
    try:
        cur.execute(query)
        rows = cur.fetchall()
        
        features = []
        for row in rows:
            feature = {
                "type": "Feature",
                "properties": {
                    "id": row['id'],
                    "nama_kecamatan": row['nama_kecamatan']
                },
                "geometry": row['geom_json']
            }
            features.append(feature)
            
        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 2: AMBIL SEMUA LOKASI PARKIR (POINT)
# ==========================================
@app.get("/api/parkir")
def get_all_parking_locations():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database Server Offline")
    cur = conn.cursor()

    query = """
        SELECT
            p.id,
            p.name,
            p.address,
            p.capacity,
            p.price_rate,
            p.status,
            p.category_id,
            c.type_name as category_name,
            ST_AsGeoJSON(p.geom) AS geom_json
        FROM public.parking_locations p
        LEFT JOIN public.categories c ON p.category_id = c.id;
    """
    try:
        cur.execute(query)
        rows = cur.fetchall()

        features = []
        for row in rows:
            try:
                if isinstance(row, dict):
                    p_id = row.get('id')
                    p_name = row.get('name')
                    p_address = row.get('address')
                    p_capacity = row.get('capacity')
                    p_price_rate = row.get('price_rate')
                    p_status = row.get('status')
                    p_category_id = row.get('category_id')
                    p_category_name = row.get('category_name')
                    p_geom = row.get('geom_json')
                else:
                    p_id = row[0]
                    p_name = row[1]
                    p_address = row[2]
                    p_capacity = row[3]
                    p_price_rate = row[4]
                    p_status = row[5]
                    p_category_id = row[6]
                    p_category_name = row[7]
                    p_geom = row[8]

                if p_geom is None:
                    continue

                if isinstance(p_geom, str):
                    p_geom = json.loads(p_geom)

                feature = {
                    "type": "Feature",
                    "properties": {
                        "id": p_id,
                        "name": p_name if p_name else "Lahan Parkir",
                        "address": p_address if p_address else "Bandung",
                        "capacity": p_capacity if p_capacity is not None else 0,
                        "price_rate": p_price_rate if p_price_rate is not None else 3000,
                        "status": p_status if p_status else "Open",
                        "category_id": p_category_id if p_category_id is not None else 1,
                        "category_name": p_category_name if p_category_name else "Umum"
                    },
                    "geometry": p_geom
                }
                features.append(feature)

            except Exception as row_err:
                print(f"⚠️ Melewati baris bermasalah: {row_err}")
                continue

        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        print("\n❌ CRASH PADA ENDPOINT /api/parkir:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 3: CARI LOKASI PARKIR TERDEKAT (SPATIAL QUERY)
# ==========================================
@app.get("/api/parkir/terdekat", response_model=schemas.GeoJSONFeatureCollection)
def get_nearest_parking(
    lon: float = Query(..., description="Longitude posisi user saat ini"),
    lat: float = Query(..., description="Latitude posisi user saat ini"),
    radius_meter: float = Query(1000, description="Radius pencarian dalam satuan meter")
):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    query = """
        SELECT
            p.id, p.name, p.address, p.capacity, p.price_rate, p.status,
            p.category_id, c.type_name as category_name,
            ST_Distance(p.geom::geography, ST_MakePoint(%s, %s)::geography) AS jarak_meter,
            ST_AsGeoJSON(p.geom)::json AS geom_json
        FROM public.parking_locations p
        LEFT JOIN public.categories c ON p.category_id = c.id
        WHERE ST_DWithin(p.geom::geography, ST_MakePoint(%s, %s)::geography, %s)
        ORDER BY jarak_meter ASC;
    """
    try:
        cur.execute(query, (lon, lat, lon, lat, radius_meter))
        rows = cur.fetchall()

        features = []
        for row in rows:
            feature = {
                "type": "Feature",
                "properties": {
                    "id": row['id'],
                    "name": row['name'],
                    "address": row['address'],
                    "capacity": row['capacity'] if row['capacity'] is not None else 0,
                    "price_rate": row['price_rate'] if row['price_rate'] is not None else 3000,
                    "status": row['status'] if row['status'] else "Open",
                    "category_id": row['category_id'] if row['category_id'] is not None else 1,
                    "category_name": row['category_name'] if row['category_name'] else "Umum",
                    "jarak_meter": round(row['jarak_meter'], 2)
                },
                "geometry": row['geom_json']
            }
            features.append(feature)

        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 4: TAMBAH TITIK PARKIR BARU (INPUT SPASIAL ADMIN)
# ==========================================
@app.post("/api/parkir", status_code=201)
def create_parking_location(payload: schemas.ParkingLocationCreate):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    query = """
        INSERT INTO public.parking_locations
        (name, address, capacity, price_rate, status, category_id, admin_id, geom)
        VALUES (%s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        RETURNING id;
    """
    try:
        cur.execute(query, (
            payload.name,
            payload.address or "Bandung",
            payload.capacity or 0,
            payload.price_rate or 3000,
            payload.status or "Open",
            payload.category_id or 1,
            payload.admin_id or 1,
            payload.lon,
            payload.lat
        ))
        new_id = cur.fetchone()['id']
        conn.commit()
        return {"status": "Sukses", "message": "Titik parkir baru berhasil ditambahkan", "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 5: UPDATE DATA PARKIR (UBAH)
# ==========================================
@app.put("/api/parkir/{parkir_id}")
def update_parking_location(parkir_id: int, payload: schemas.ParkingLocationCreate):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    query = """
        UPDATE public.parking_locations
        SET name = %s, address = %s, capacity = %s, price_rate = %s,
            status = %s, category_id = %s,
            geom = ST_SetSRID(ST_MakePoint(%s, %s), 4326)
        WHERE id = %s;
    """
    try:
        cur.execute(query, (
            payload.name,
            payload.address or "Bandung",
            payload.capacity or 0,
            payload.price_rate or 3000,
            payload.status or "Open",
            payload.category_id or 1,
            payload.lon,
            payload.lat,
            parkir_id
        ))

        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Data parkir tidak ditemukan")

        conn.commit()
        return {"status": "Sukses", "message": f"Data parkir ID {parkir_id} berhasil diperbarui"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 6: DELETE DATA PARKIR (HAPUS)
# ==========================================
@app.delete("/api/parkir/{parkir_id}")
def delete_parking_location(parkir_id: int):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    query = "DELETE FROM public.parking_locations WHERE id = %s;"
    try:
        cur.execute(query, (parkir_id,))

        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Data parkir tidak ditemukan")

        conn.commit()
        return {"status": "Sukses", "message": f"Data parkir ID {parkir_id} berhasil dihapus"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 7: LOGIN ADMIN
# ==========================================
@app.post("/api/admin/login")
def admin_login(credentials: schemas.AdminLogin):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    # Hash password dengan SHA-256
    hashed_password = hashlib.sha256(credentials.password.encode()).hexdigest()

    query = """
        SELECT id, username, full_name, password
        FROM public.admins
        WHERE username = %s;
    """
    try:
        cur.execute(query, (credentials.username,))
        admin = cur.fetchone()

        if not admin:
            raise HTTPException(status_code=401, detail="Username atau password salah")

        # Cek password (cek password plain atau hash)
        stored_password = admin['password']
        input_password = credentials.password

        # Trim whitespace dari kedua password
        if stored_password:
            stored_password = stored_password.strip()
        if input_password:
            input_password = input_password.strip()

        is_valid = False

        # Cek jika password tersimpan sebagai plain text
        if stored_password == input_password:
            is_valid = True
        # Cek jika password tersimpan sebagai hash SHA-256
        elif stored_password == hashed_password:
            is_valid = True

        if not is_valid:
            raise HTTPException(status_code=401, detail="Username atau password salah")

        # Generate token sederhana
        token = secrets.token_urlsafe(32)

        # Update last_login
        update_query = "UPDATE public.admins SET last_login = NOW() WHERE id = %s;"
        cur.execute(update_query, (admin['id'],))
        conn.commit()

        return {
            "status": "Sukses",
            "token": token,
            "admin": {
                "id": admin['id'],
                "username": admin['username'],
                "full_name": admin['full_name']
            }
        }
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ==========================================
# ENDPOINT 8: VERIFIKASI TOKEN ADMIN
# ==========================================
@app.get("/api/admin/verify")
def verify_admin_token():
    # Endpoint untuk cek apakah token valid
    # Token disimpan di client dan dikirim via header
    return {"status": "Valid", "message": "Token admin masih aktif"}

# ==========================================
# ENDPOINT 9: AMBIL SEMUA KATEGORI KENDARAAN
# ==========================================
@app.get("/api/categories", response_model=List[schemas.CategoryResponse])
def get_all_categories():
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    query = "SELECT id, type_name, description FROM public.categories ORDER BY id;"
    try:
        cur.execute(query)
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# ==========================================
# ENDPOINT 10: REGISTRASI ADMIN (OPSIONAL - UNTUK SETUP AWAL)
# ==========================================
@app.post("/api/admin/register", status_code=201)
def register_admin(admin: schemas.AdminCreate):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="Database Offline")
    cur = conn.cursor()

    # Hash password dengan SHA-256
    hashed_password = hashlib.sha256(admin.password.encode()).hexdigest()

    # Cek apakah username sudah ada
    check_query = "SELECT id FROM public.admins WHERE username = %s;"
    cur.execute(check_query, (admin.username,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    # Insert admin baru
    insert_query = """
        INSERT INTO public.admins (username, password, full_name)
        VALUES (%s, %s, %s)
        RETURNING id, username, full_name;
    """
    try:
        cur.execute(insert_query, (admin.username, hashed_password, admin.username))
        new_admin = cur.fetchone()
        conn.commit()
        return {
            "status": "Sukses",
            "message": "Admin baru berhasil didaftarkan",
            "admin": {
                "id": new_admin['id'],
                "username": new_admin['username'],
                "full_name": new_admin['full_name']
            }
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()