import os
import re
import json
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.field import Field
from app.models.geography import Village, Taluka, District, State
from app.repositories.geography_repository import geography_repository
from app.repositories.field_repository import field_repository
from app.gis.geojson_utils import geometry_to_geojson


def normalize_gat_number(raw_gat: Optional[str]) -> str:
    """
    Robust Gat number normalization.
    Strips leading/trailing spaces, removes prefix 'gat', 'gat no', 'survey no', 'गट',
    while preserving meaningful sub-identifiers like 104/1, 104/A, 104-B.
    """
    if not raw_gat:
        return ""
    clean = str(raw_gat).strip()
    # Strip prefix variations case-insensitively
    clean = re.sub(
        r'^(gat\s*no\.?|gat\s*number|gat|survey\s*no\.?|survey\s*number|survey|गट\s*क्र\.?|गट)\s*[:\-]?\s*',
        '',
        clean,
        flags=re.IGNORECASE
    )
    return clean.strip()


class FieldService:
    """Business logic for field identification and parcel lookup."""

    def get_field_by_gat(
        self,
        db: Session,
        gat_no: str,
        village_id: Optional[int] = None,
        village_name: Optional[str] = None,
        taluka: Optional[str] = None,
    ) -> dict:
        # 1. Validate village input
        village = None
        if village_id:
            village = geography_repository.get_village_by_id(db, village_id)
            if not village:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Village with ID {village_id} not found"
                )
        elif village_name:
            if taluka:
                taluka_obj = geography_repository.get_taluka_by_name(db, taluka)
                if taluka_obj:
                    village = geography_repository.get_village_by_name_and_taluka(db, village_name, taluka_obj.id)
            if not village:
                village = db.query(Village).filter(Village.name.ilike(village_name.strip())).first()
            if not village:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Village '{village_name}' not found"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either village_id or village name must be provided"
            )

        # 2. Strict Administrative Hierarchy Validation
        if taluka:
            clean_taluka = taluka.strip()
            if clean_taluka.isdigit():
                if village.taluka_id != int(clean_taluka):
                    expected_taluka = geography_repository.get_taluka_by_id(db, int(clean_taluka))
                    expected_name = expected_taluka.name if expected_taluka else clean_taluka
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Hierarchy mismatch: Village '{village.name}' does not belong to Taluka '{expected_name}'."
                    )
            else:
                taluka_obj = geography_repository.get_taluka_by_name(db, clean_taluka)
                if taluka_obj and village.taluka_id != taluka_obj.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Hierarchy mismatch: Village '{village.name}' does not belong to Taluka '{taluka_obj.name}'."
                    )

        # Verify district
        if village.taluka and village.taluka.district:
            district_name = village.taluka.district.name
            if district_name.lower() != "pune":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Hierarchy mismatch: Village '{village.name}' belongs to district '{district_name}', not Pune."
                )

        # 3. Robust Gat number normalization
        clean_gat = normalize_gat_number(gat_no)
        if not clean_gat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gat number cannot be empty"
            )

        # 4. Retrieve field
        field = field_repository.get_by_village_and_gat(db, village.id, clean_gat)
        if not field:
            taluka_name = village.taluka.name if village.taluka else "selected taluka"
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No farm plot was found for Gat number '{clean_gat}' in {taluka_name}, Village '{village.name}'."
            )

        geom_wkt = None
        if field.geometry is not None:
            geom_wkt = str(field.geometry)

        return {
            "id": field.id,
            "gat_no": field.gat_no,
            "area": field.area,
            "area_unit": field.area_unit,
            "is_demo": field.is_demo,
            "is_active": field.is_active,
            "geometry_wkt": geom_wkt,
            "village": {
                "id": village.id,
                "name": village.name,
                "taluka_id": village.taluka_id,
                "taluka_name": village.taluka.name if village.taluka else None,
                "district_name": "Pune",
                "state_name": "Maharashtra",
            },
            "farmer": {
                "id": field.farmer.id,
                "full_name": field.farmer.full_name,
                "farmer_code": field.farmer.farmer_code,
            } if field.farmer else None,
        }

    def get_authenticated_field(
        self,
        db: Session,
        session_payload: Dict[str, Any],
    ) -> dict:
        """
        Retrieves verified field details and GeoJSON geometry for the authenticated session.
        """
        field_id = session_payload.get("field_id")
        if not field_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token: missing farm identification.",
            )

        field = field_repository.get_by_id(db, field_id)
        if not field or not field.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The authorized field could not be found or is inactive.",
            )

        village = field.village
        taluka = village.taluka if village else None
        district = taluka.district if taluka else None
        state = district.state if district else None

        # Convert geometry to clean GeoJSON
        geojson_geom = geometry_to_geojson(field.geometry)

        return {
            "id": field.id,
            "gat_no": field.gat_no,
            "area": field.area,
            "area_unit": field.area_unit,
            "village": village.name if village else "",
            "taluka": taluka.name if taluka else "",
            "district": district.name if district else "Pune",
            "state": state.name if state else "Maharashtra",
            "farmer_name": field.farmer.full_name if field.farmer else None,
            "is_demo": field.is_demo,
            "geometry": geojson_geom,
        }

    def get_village_geojson(
        self,
        db: Session,
        village_id: Optional[int] = None,
        village_name: Optional[str] = None,
        taluka_name: Optional[str] = None,
    ) -> dict:
        """
        Returns GeoJSON FeatureCollection of all plots in the specified village.
        """
        village = None
        if village_id:
            village = geography_repository.get_village_by_id(db, village_id)
        elif village_name:
            if taluka_name:
                t_obj = geography_repository.get_taluka_by_name(db, taluka_name)
                if t_obj:
                    village = geography_repository.get_village_by_name_and_taluka(db, village_name, t_obj.id)
            if not village:
                village = db.query(Village).filter(Village.name.ilike(village_name.strip())).first()

        # If it's Malegaon, check for cached processed GeoJSON first
        if village and "malegaon" in village.name.lower():
            processed_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../../data/gis/processed/malegaon_plots.geojson")
            )
            if os.path.exists(processed_path):
                with open(processed_path, "r", encoding="utf-8") as f:
                    return json.load(f)

        # Fallback to querying all fields in the village from database
        features = []
        if village:
            fields = field_repository.get_by_village(db, village.id)
            taluka = village.taluka
            district = taluka.district if taluka else None
            state = district.state if district else None

            for f in fields:
                geom = geometry_to_geojson(f.geometry)
                if not geom:
                    continue
                features.append({
                    "type": "Feature",
                    "properties": {
                        "id": f.id,
                        "gat_no": f.gat_no,
                        "village": village.name,
                        "taluka": taluka.name if taluka else "",
                        "district": district.name if district else "Pune",
                        "state": state.name if state else "Maharashtra",
                        "area": f.area,
                        "area_unit": f.area_unit,
                        "is_demo": f.is_demo,
                        "source": "DEMO KML" if f.is_demo else "Official Cadastral",
                    },
                    "geometry": geom,
                })

        return {
            "type": "FeatureCollection",
            "name": f"{village.name if village else 'plots'}_geojson",
            "crs": {
                "type": "name",
                "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
            },
            "features": features
        }


field_service = FieldService()

