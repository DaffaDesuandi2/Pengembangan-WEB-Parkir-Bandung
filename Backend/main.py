from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from typing import Optional
import traceback

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
            database="ParkirBandung", 
            user="postgres",               
            password="falihfaiqf666",          
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
    
    # Kolom p.capacity dihapus dari query karena tidak ada di tabel database
    query = """
        SELECT 
            p.id, 
            p.name, 
            p.address, 
            ST_AsGeoJSON(p.geom) AS geom_json
        FROM public.parking_locations p;
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
                    p_geom = row.get('geom_json')
                else:
                    p_id = row[0]
                    p_name = row[1]
                    p_address = row[2]
                    p_geom = row[3]

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
                        "capacity": "Tersedia", # Fallback manual agar frontend tidak error
                        "category": "Umum", 
                        "tarif_per_jam": 3000 
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
    
    # Kolom p.capacity dihapus dari query
    query = """
        SELECT 
            p.id, p.name, p.address,
            ST_Distance(p.geom::geography, ST_MakePoint(%s, %s)::geography) AS jarak_meter,
            ST_AsGeoJSON(p.geom)::json AS geom_json
        FROM public.parking_locations p
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
                    "capacity": "Tersedia", # Fallback manual
                    "jarak_meter": round(row['jarak_meter'], 2),
                    "tarif_per_jam": 3000 
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
    
    # Query disederhanakan: Hanya memasukkan kolom name, address, dan geom yang ada di tabel DB
    query = """
        INSERT INTO public.parking_locations (name, address, geom)
        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        RETURNING id;
    """
    try:
        cur.execute(query, (
            payload.name, payload.address,
            payload.lon, payload.lat
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
    
    # Query disederhanakan: Menghapus kolom category_id, rate_id, admin_id, dan capacity
    query = """
        UPDATE public.parking_locations 
        SET name = %s, address = %s, geom = ST_SetSRID(ST_MakePoint(%s, %s), 4326)
        WHERE id = %s;
    """
    try:
        cur.execute(query, (
            payload.name, payload.address, 
            payload.lon, payload.lat, parkir_id
        ))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Data parkir tidak ditemukan")
            
        conn.commit()
        return {"status": "Sukses", "message": f"Data parkir ID {parkir_id} berhasil diperbarui"}
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