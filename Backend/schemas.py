from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# Schema untuk Admin
class AdminBase(BaseModel):
    username: str

class AdminCreate(AdminBase):
    password: str

class AdminResponse(AdminBase):
    id: int
    class Config:
        from_attributes = True

# Schema untuk Tarif (Rates)
class RateResponse(BaseModel):
    id: int
    vehicle_type: str
    hourly_rate: float
    max_rate: Optional[float] = None
    class Config:
        from_attributes = True

# Schema Input Lokasi Parkir Baru (Dari Frontend Admin)
class ParkingLocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    category_id: Optional[int] = 1  # Diberi default agar opsional
    rate_id: Optional[int] = 1      # Diberi default agar opsional
    admin_id: Optional[int] = None
    capacity: Optional[int] = 0     # Diberi default agar opsional
    lon: float  # Koordinat Bujur dari peta
    lat: float  # Koordinat Lintang dari peta

# Schema GeoJSON Standar untuk Output Peta Frontend
class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    properties: Dict[str, Any]
    geometry: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]