"""Digital Soil Mapping (DSM) catalog and layer service.
SoilPilot Phase 6
"""

from typing import List, Dict, Any, Optional

DSM_LAYERS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "farm_boundary",
        "name": "Farm Boundary",
        "name_mr": "शेताची हद्द",
        "short_name": "Boundary",
        "unit": "Cadastral",
        "source_type": "DEMO KML",
        "source_label": "Demo Cadastral GIS Data",
        "status": "available",
        "is_default": True,
        "description": "Verified cadastral boundary polygon of the selected farm.",
    },
    {
        "id": "ph",
        "name": "Soil pH",
        "name_mr": "सामू (pH)",
        "short_name": "pH",
        "unit": "pH",
        "source_type": "DSM PREDICTION",
        "source_label": "DSM Model Prediction (Awaiting Ingestion)",
        "status": "pending",
        "is_default": False,
        "min": 4.5,
        "max": 8.5,
        "description": "Spatial acidity and alkalinity variations (optimal: 6.5 - 7.5).",
    },
    {
        "id": "bd",
        "name": "Bulk Density",
        "name_mr": "मातीची घनता",
        "short_name": "BD",
        "unit": "g/cm³",
        "source_type": "DSM PREDICTION",
        "source_label": "DSM Model Prediction (Awaiting Ingestion)",
        "status": "pending",
        "is_default": False,
        "min": 1.0,
        "max": 1.8,
        "description": "Soil compaction and root penetration resistance metric.",
    },
    {
        "id": "elevation",
        "name": "Elevation / DEM",
        "name_mr": "उंची / स्थलाकृति",
        "short_name": "DEM",
        "unit": "m",
        "source_type": "DSM PREDICTION",
        "source_label": "Digital Elevation Model (Awaiting Ingestion)",
        "status": "pending",
        "is_default": False,
        "min": 520,
        "max": 580,
        "description": "Topographical elevation above sea level in meters.",
    },
    {
        "id": "nitrogen",
        "name": "Available Nitrogen",
        "name_mr": "उपलब्ध नत्र (N)",
        "short_name": "N",
        "unit": "kg/ha",
        "source_type": "DSM PREDICTION",
        "source_label": "Available Nitrogen (Awaiting Ingestion)",
        "status": "pending",
        "is_default": False,
        "min": 140,
        "max": 450,
        "description": "Soil available nitrogen availability in kg/ha.",
    },
    {
        "id": "soc",
        "name": "Soil Organic Carbon",
        "name_mr": "मातीतील सेंद्रिय कर्ब",
        "short_name": "SOC",
        "unit": "%",
        "source_type": "DSM PREDICTION",
        "source_label": "Soil Organic Carbon (Awaiting Ingestion)",
        "status": "pending",
        "is_default": False,
        "min": 0.2,
        "max": 1.2,
        "description": "Soil organic carbon concentration as a percentage.",
    },
    {
        "id": "ndvi",
        "name": "NDVI Vegetation Index",
        "name_mr": "वनस्पती निर्देशांक",
        "short_name": "NDVI",
        "unit": "Index",
        "source_type": "SATELLITE DERIVED",
        "source_label": "Sentinel-2 Multi-temporal (Awaiting Ingestion)",
        "status": "pending",
        "is_default": False,
        "min": -0.1,
        "max": 0.85,
        "description": "Normalized Difference Vegetation Index measuring green vigor.",
    },
]

class DSMService:
    @staticmethod
    def get_layers() -> List[Dict[str, Any]]:
        return DSM_LAYERS_CATALOG

    @staticmethod
    def get_layer_by_id(layer_id: str) -> Optional[Dict[str, Any]]:
        for layer in DSM_LAYERS_CATALOG:
            if layer["id"] == layer_id:
                return layer
        return None

dsm_service = DSMService()
