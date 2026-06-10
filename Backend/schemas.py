from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# Schema untuk Admin Login
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminSession(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    token: str

# Schema untuk Admin
class AdminBase(BaseModel):
    username: str

class AdminCreate(AdminBase):
    password: str

class AdminResponse(AdminBase):
    id: int
    class Config:
        from_attributes = True

# Schema Input Lokasi Parkir Baru (Dari Frontend Admin) - LENGKAP
class ParkingLocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    capacity: Optional[int] = 0
    price_rate: Optional[int] = 3000
    status: Optional[str] = "Open"
    category_id: Optional[int] = 1
    admin_id: Optional[int] = 1
    lat: float
    lon: float

# Schema untuk Categories (dropdown)
class CategoryResponse(BaseModel):
    id: int
    type_name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

# Schema GeoJSON Standar untuk Output Peta Frontend
class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    properties: Dict[str, Any]
    geometry: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
