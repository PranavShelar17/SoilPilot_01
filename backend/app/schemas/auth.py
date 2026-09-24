from typing import Optional
from pydantic import BaseModel, Field


class GatLoginRequest(BaseModel):
    """Gat-based farmer field access request."""
    state_id: int = Field(..., gt=0, description="ID of the State (e.g. Maharashtra)")
    district_id: int = Field(..., gt=0, description="ID of the District (e.g. Pune)")
    taluka_id: int = Field(..., gt=0, description="ID of the Taluka (e.g. Baramati)")
    village_id: int = Field(..., gt=0, description="ID of the Village (e.g. Malegaon Bk)")
    gat_no: str = Field(..., min_length=1, max_length=50, description="Cadastral Gat Number (e.g. 123, 124/A)")


class FarmerSessionBrief(BaseModel):
    id: int
    name: str
    farmer_code: str


class FieldSessionBrief(BaseModel):
    id: int
    gat_no: str
    area: Optional[float] = None
    area_unit: str = "hectare"
    is_demo: bool = True


class LocationSessionBrief(BaseModel):
    state: str
    district: str
    taluka: str
    village: str


class AuthResponse(BaseModel):
    """Successful Gat login response containing session token and minimal farm profile."""
    success: bool = True
    message: str = "Farm verified successfully"
    token: str
    field: FieldSessionBrief
    farmer: Optional[FarmerSessionBrief] = None
    location: LocationSessionBrief


class SessionUserResponse(BaseModel):
    """Current session verification response for /api/v1/auth/me."""
    authenticated: bool = True
    field: FieldSessionBrief
    farmer: Optional[FarmerSessionBrief] = None
    location: LocationSessionBrief
