"""Digital Soil Mapping (DSM) API Endpoints.
SoilPilot Phase 6
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from app.services.dsm_service import dsm_service

router = APIRouter(prefix="/soil-layers", tags=["Digital Soil Mapping"])

@router.get("", response_model=List[Dict[str, Any]])
def get_soil_layers():
    """List all registered Digital Soil Mapping (DSM) layers and their status."""
    return dsm_service.get_layers()

@router.get("/{layer_id}", response_model=Dict[str, Any])
def get_soil_layer(layer_id: str):
    """Get detailed layer configuration and metadata by layer ID."""
    layer = dsm_service.get_layer_by_id(layer_id)
    if not layer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Soil layer '{layer_id}' not found in DSM catalog."
        )
    return layer
