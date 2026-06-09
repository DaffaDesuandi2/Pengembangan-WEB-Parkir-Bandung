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
    category_id: int
    rate_id: int
    admin_id: Optional[int] = None
    capacity: int
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