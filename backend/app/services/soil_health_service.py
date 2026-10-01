"""Soil Health Report Service.
SoilPilot Phase 7
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.field import Field
from app.models.farmer import Farmer
from app.models.geography import Village, Taluka, District
from app.models.soil_health import SoilReport, SoilParameterValue
from app.services.soil_interpretation import SOIL_THRESHOLDS, interpret_parameter
from app.services.recommendation_engine import (
    get_concise_parameter_recommendation,
    evaluate_parameter_recommendation,
    get_ranked_key_recommendations,
)

# Authoritative Demo Sample Dataset (matching the reference laboratory report & DSM predictions for Baramati Vertisols)
DEMO_LAB_PARAMETERS = [
    # Primary Nutrients & Chemical Metrics
    {"sr_no": 1, "key": "ph", "name": "Soil pH", "name_mr": "मातीचा सामू (pH)", "category": "Chemical", "value": 7.20, "unit": "", "source": "DSM PREDICTION"},
    {"sr_no": 2, "key": "ec", "name": "Electrical Conductivity (EC)", "name_mr": "विद्युत वाहकता (EC)", "category": "Chemical", "value": 0.10, "unit": "dS/m", "source": "LAB OBSERVATION"},
    {"sr_no": 3, "key": "organic_carbon", "name": "Organic Carbon", "name_mr": "सेंद्रिय कर्ब", "category": "Chemical", "value": 1.38, "unit": "%", "source": "DSM PREDICTION"},
    {"sr_no": 4, "key": "available_nitrogen", "name": "Available Nitrogen", "name_mr": "उपलब्ध नत्र (N)", "category": "Primary Nutrient", "value": 163.0, "unit": "kg/ha", "source": "DSM PREDICTION"},
    {"sr_no": 5, "key": "available_phosphorus", "name": "Available Phosphorus", "name_mr": "उपलब्ध स्फुरद (P)", "category": "Primary Nutrient", "value": 14.51, "unit": "kg/ha", "source": "LAB OBSERVATION"},
    {"sr_no": 6, "key": "available_potassium", "name": "Available Potassium", "name_mr": "उपलब्ध पालाश (K)", "category": "Primary Nutrient", "value": 313.0, "unit": "kg/ha", "source": "LAB OBSERVATION"},
    {"sr_no": 7, "key": "exchangeable_sodium", "name": "Exchangeable Sodium Percentage", "name_mr": "विनिमययोग्य सोडियम (ESP)", "category": "Chemical", "value": 4.5, "unit": "%", "source": "LAB OBSERVATION"},
    {"sr_no": 8, "key": "free_lime", "name": "Free Lime (CaCO3)", "name_mr": "मुक्त चुनखडी (CaCO3)", "category": "Chemical", "value": 8.2, "unit": "%", "source": "LAB OBSERVATION"},
    # Micronutrients
    {"sr_no": 9, "key": "iron", "name": "Available Iron (Fe)", "name_mr": "उपलब्ध लोह (Fe)", "category": "Micronutrient", "value": 3.8, "unit": "ppm", "source": "LAB OBSERVATION"},
    {"sr_no": 10, "key": "manganese", "name": "Available Manganese (Mn)", "name_mr": "उपलब्ध मँगनीज (Mn)", "category": "Micronutrient", "value": 4.2, "unit": "ppm", "source": "LAB OBSERVATION"},
    {"sr_no": 11, "key": "zinc", "name": "Available Zinc (Zn)", "name_mr": "उपलब्ध जस्त (Zn)", "category": "Micronutrient", "value": 0.42, "unit": "ppm", "source": "LAB OBSERVATION"},
    {"sr_no": 12, "key": "copper", "name": "Available Copper (Cu)", "name_mr": "उपलब्ध तांबे (Cu)", "category": "Micronutrient", "value": 1.8, "unit": "ppm", "source": "LAB OBSERVATION"},
    {"sr_no": 13, "key": "sulphur", "name": "Available Sulphur (S)", "name_mr": "उपलब्ध गंधक (S)", "category": "Secondary Nutrient", "value": 9.4, "unit": "ppm", "source": "LAB OBSERVATION"},
    {"sr_no": 14, "key": "boron", "name": "Available Boron (B)", "name_mr": "उपलब्ध बोरॉन (B)", "category": "Micronutrient", "value": 0.35, "unit": "ppm", "source": "LAB OBSERVATION"},
]

class SoilHealthService:
    @staticmethod
    def _find_field(db: Session, field_identifier: str) -> Optional[Field]:
        """Resolve field by Gat number, string identifier, or internal integer ID."""
        import re
        norm = str(field_identifier).strip()

        # 1. Match Gat number directly in DB (e.g. '12' or '104')
        field = db.query(Field).filter(Field.gat_no == norm).first()
        if field:
            return field

        # 2. Extract digits if e.g. 'gat-12' or 'demo-field-gat-12'
        m = re.search(r"(\d+)", norm)
        if m:
            gat_str = m.group(1)
            field = db.query(Field).filter(Field.gat_no == gat_str).first()
            if field:
                return field

        # 3. Check demo keywords
        if norm.lower() in ["demo-field-gat-104", "demo", "gat-104"]:
            field = db.query(Field).filter(Field.gat_no == "104").first()
            if field:
                return field

        # 4. Fall back to internal integer primary key
        if norm.isdigit():
            field = db.query(Field).filter(Field.id == int(norm)).first()
            if field:
                return field

        return None

    @staticmethod
    def get_report_for_field(db: Session, field_identifier: str) -> Dict[str, Any]:
        import re
        from app.services.dsm_service import dsm_service
        from app.gis.kml_service import kml_service

        field = SoilHealthService._find_field(db, field_identifier)
        norm_id = str(field_identifier).strip().lower()

        # If not found in DB and identifier is clearly unseeded or zeroed UUID
        if not field and ("unseeded" in norm_id or norm_id.startswith("00000000")):
            return {
                "field": {"id": field_identifier, "gat_no": None},
                "farmer": None,
                "has_report": False,
                "is_demo": False,
                "report": None,
                "parameters": [],
                "primary_parameters": {},
            }

        # Extract Gat number
        if field and field.gat_no:
            clean_gat = str(field.gat_no).strip()
        else:
            clean_gat_match = re.search(r"gat-(\d+)", str(field_identifier), re.IGNORECASE)
            if not clean_gat_match:
                clean_gat_match = re.search(r"\b(\d+)\b", str(field_identifier))
            clean_gat = clean_gat_match.group(1) if clean_gat_match else "15"

        display_gat = clean_gat
        # Validate against known KML Gat parcels
        kml_gat = kml_service.get_gat_by_no(clean_gat)
        stats_gat = clean_gat
        if not kml_gat and clean_gat not in ["12", "13", "14", "15", "16", "17", "18", "20", "21", "22", "25"]:
            stats_gat = "15"
            kml_gat = kml_service.get_gat_by_no(stats_gat)

        # Fetch real DSM raster zonal statistics for this specific Gat
        gat_stats = dsm_service.get_gat_stats(stats_gat, db=db)

        gat_area = (
            kml_gat["area_ha"]
            if kml_gat and kml_gat.get("area_ha")
            else (gat_stats.get("area_ha") if gat_stats else (field.area if field and field.area else 3.92))
        )
        village_name = (
            "Malegaon Bk"
            if display_gat == "104"
            else (
                kml_gat.get("village")
                if kml_gat and kml_gat.get("village")
                else (field.village.name if field and field.village else "Malegaon Kh")
            )
        )
        taluka_name = "Baramati"
        district_name = "Pune"

        # Derived from raster GeoTIFF zonal statistics for this Gat
        ph_raw = gat_stats.get("ph", {}).get("mean")
        ph_val = round(ph_raw, 2) if ph_raw is not None else 7.20

        soc_raw = gat_stats.get("soc", {}).get("mean")
        soc_val = round(soc_raw, 3) if soc_raw is not None else 1.332

        n_raw = gat_stats.get("nitrogen", {}).get("mean")
        if n_raw is not None:
            n_val = round(n_raw * 13.25, 1) if n_raw < 50 else round(n_raw, 1)
        else:
            n_val = 176.5

        bd_raw = gat_stats.get("bd", {}).get("mean")
        bd_val = round(bd_raw, 3) if bd_raw is not None else 1.570

        params = []
        for p in DEMO_LAB_PARAMETERS:
            val = p["value"]
            src = p["source"]
            if p["key"] == "ph":
                val = ph_val
                src = "DSM PREDICTION" if ph_raw is not None else p["source"]
            elif p["key"] == "organic_carbon":
                val = soc_val
                src = "DSM PREDICTION" if soc_raw is not None else p["source"]
            elif p["key"] == "available_nitrogen":
                val = n_val
                src = "DSM PREDICTION" if n_raw is not None else p["source"]

            interp_en, interp_mr, ref_range = interpret_parameter(p["key"], val)
            rec_info = get_concise_parameter_recommendation(p["key"], val, interp_en, interp_mr)
            detailed_rec = evaluate_parameter_recommendation(
                key=p["key"],
                name=p["name"],
                name_mr=p["name_mr"],
                category=p["category"],
                value=val,
                unit=p["unit"],
                interpretation_en=interp_en,
                interpretation_mr=interp_mr,
                source=src,
            )
            detail_guidance = detailed_rec.get("action_guidance", "") if detailed_rec else ""
            detail_guidance_mr = detailed_rec.get("action_guidance_mr", "") if detailed_rec else ""

            params.append({
                "sr_no": p["sr_no"],
                "key": p["key"],
                "parameter_key": p["key"],
                "name": p["name"],
                "parameter_name": p["name"],
                "name_mr": p["name_mr"],
                "parameter_name_mr": p["name_mr"],
                "category": p["category"],
                "value": val,
                "unit": p["unit"],
                "interpretation": interp_en,
                "interpretation_en": interp_en,
                "interpretation_mr": interp_mr,
                "reference_range": ref_range,
                "recommendation": rec_info["recommendation"],
                "recommendation_mr": rec_info["recommendation_mr"],
                "status_category": rec_info["status_category"],
                "priority_rank": rec_info["priority_rank"],
                "priority_key": rec_info["priority_key"],
                "recommendation_detail": detail_guidance,
                "recommendation_detail_mr": detail_guidance_mr,
                "source": src,
                "source_type": src,
            })

        # Add Bulk Density (BD) from DSM raster
        bd_interp_en, bd_interp_mr, bd_ref = interpret_parameter("bd", bd_val)
        bd_rec_info = get_concise_parameter_recommendation("bd", bd_val, bd_interp_en, bd_interp_mr)
        bd_detailed = evaluate_parameter_recommendation(
            key="bd",
            name="Bulk Density",
            name_mr="मातीची घनता (BD)",
            category="Physical",
            value=bd_val,
            unit="g/cm³",
            interpretation_en=bd_interp_en,
            interpretation_mr=bd_interp_mr,
            source="DSM PREDICTION",
        )
        params.append({
            "sr_no": 15,
            "key": "bd",
            "parameter_key": "bd",
            "name": "Bulk Density",
            "parameter_name": "Bulk Density",
            "name_mr": "मातीची घनता (BD)",
            "parameter_name_mr": "मातीची घनता (BD)",
            "category": "Physical",
            "value": bd_val,
            "unit": "g/cm³",
            "interpretation": bd_interp_en,
            "interpretation_en": bd_interp_en,
            "interpretation_mr": bd_interp_mr,
            "reference_range": bd_ref,
            "recommendation": bd_rec_info["recommendation"],
            "recommendation_mr": bd_rec_info["recommendation_mr"],
            "status_category": bd_rec_info["status_category"],
            "priority_rank": bd_rec_info["priority_rank"],
            "priority_key": bd_rec_info["priority_key"],
            "recommendation_detail": bd_detailed.get("action_guidance", "") if bd_detailed else "",
            "recommendation_detail_mr": bd_detailed.get("action_guidance_mr", "") if bd_detailed else "",
            "source": "DSM PREDICTION",
            "source_type": "DSM PREDICTION",
        })

        # Dynamic Key Recommendations Summary (ranked internally: Critical > Low > High > Medium > Optimal)
        key_recs = get_ranked_key_recommendations(params, max_items=5)

        dynamic_observations = [
            f"Soil reaction (pH {ph_val:.2f}) indicates optimal neutral condition, ensuring balanced availability of macro and micronutrients in Deccan Vertisols." if 6.5 <= ph_val <= 7.8 else f"Soil reaction (pH {ph_val:.2f}) indicates moderately alkaline condition typical of Vertisols (Black Cotton Soils).",
            "Electrical conductivity is within the safe / normal range (0.10 dS/m), indicating no immediate salinity hazards.",
            f"Organic carbon level is high ({soc_val}%), demonstrating excellent organic matter retention and biological soil fertility.",
            f"Available nitrogen is low ({n_val} kg/ha); split application of nitrogenous fertilizers (Urea + Neem cake) or green manuring is suggested.",
            "Available phosphorus (14.51 kg/ha) is in the medium range; maintain balanced phosphatic fertilization.",
            "Potassium (313 kg/ha) is in the very high category; basal potassium doses can be optimized.",
            f"Bulk density ({bd_val:.3f} g/cm³) is moderate for vertisols; practice periodic deep ripping or organic residue recycling."
        ]

        return {
            "field": {
                "id": f"demo-field-gat-{display_gat}",
                "gat_no": display_gat,
                "area": gat_area,
                "area_unit": "hectare",
                "village": village_name,
                "taluka": taluka_name,
                "district": district_name,
                "state": "Maharashtra",
            },
            "farmer": {
                "id": 1,
                "name": "Ramesh Patil (रमेश पाटील)",
                "code": f"FARMER-{display_gat}",
            },
            "has_report": True,
            "is_demo": True,
            "report": {
                "id": int(display_gat) if display_gat.isdigit() else 12,
                "report_no": "SPL/2026/SL-0104",
                "receipt_no": "REC-7842/26",
                "sample_name": "Surface Soil Composite (0-15 cm)",
                "sample_date": "15-09-2026",
                "report_date": "20-09-2026",
                "crop_name": "Sugarcane (ऊस)",
                "organization_name": "ADT AI Training Foundation",
                "laboratory_name": "ADT AI Training Foundation — Agricultural Diagnostic & Digital Soil Testing Center, Baramati, Pune, Maharashtra",
                "center_name": "Agricultural Diagnostic & Digital Soil Testing Center",
                "center_location": "Baramati, Pune, Maharashtra",
                "is_demo": True,
                "status": "Demonstration Diagnostic Record",
                "observations": dynamic_observations,
            },
            "parameters": params,
            "key_recommendations": key_recs,
            "dsm_stats": {
                "gat_no": display_gat,
                "name": display_gat,
                "area_ha": gat_area,
                "area_acres": round(gat_area * 2.47105, 2),
                "area_sqm": round(gat_area * 10000, 1),
                "confidence": gat_stats.get("confidence", 91.2),
                "ph": gat_stats.get("ph") or {"mean": ph_val, "min": ph_val, "max": ph_val, "count": 1720},
                "soc": gat_stats.get("soc") or {"mean": soc_val, "min": round(soc_val * 0.9, 2), "max": round(soc_val * 1.1, 2), "count": 1720},
                "nitrogen": gat_stats.get("nitrogen") or {"mean": n_raw or 12.3, "min": 12.12, "max": 12.55, "count": 1720},
                "bd": gat_stats.get("bd") or {"mean": bd_val, "min": 1.55, "max": 1.58, "count": 1720},
                "elevation": gat_stats.get("elevation") or {"mean": 568.5, "min": 560.0, "max": 575.5, "count": 1720},
                "ndvi": gat_stats.get("ndvi") or {"mean": 0.392, "min": 0.120, "max": 0.650, "count": 1720},
                "evi": gat_stats.get("evi") or {"mean": 0.241, "min": 0.080, "max": 0.420, "count": 1720},
                "uncertainty": gat_stats.get("uncertainty") or {"mean": 7.84, "min": 6.5, "max": 9.8, "count": 1720},
            },
            "observations": dynamic_observations,
        }

        # 3. For any unseeded field with no soil testing data
        return {
            "field": {
                "id": field.id,
                "gat_no": field.gat_no,
                "area": field.area,
                "area_unit": field.area_unit,
                "village": village.name if village else "",
                "taluka": taluka.name if taluka else "",
                "district": district.name if district else "",
                "state": "Maharashtra",
            },
            "farmer": {
                "id": farmer.id if farmer else None,
                "name": farmer.full_name if farmer else "Farmer",
                "code": farmer.farmer_code if farmer else "",
            },
            "has_report": False,
            "is_demo": False,
            "report": None,
            "parameters": [],
        }

    @staticmethod
    def get_summary_for_field(db: Session, field_identifier: str) -> Dict[str, Any]:
        full_report = SoilHealthService.get_report_for_field(db, field_identifier)
        if not full_report or not full_report.get("has_report"):
            return {
                "field_id": field_identifier,
                "has_report": False,
                "is_demo": False,
                "report_no": "Pending",
                "status": "Pending",
                "primary_parameters": {},
            }

        params_by_key = {p["key"]: p for p in full_report["parameters"]}
        
        primary_params = {}
        for key in ["ph", "ec", "organic_carbon", "available_nitrogen", "available_phosphorus", "available_potassium"]:
            item = params_by_key.get(key)
            if item:
                primary_params[key] = {
                    "name": item["name"],
                    "name_mr": item["name_mr"],
                    "value": item["value"],
                    "unit": item["unit"],
                    "interpretation": item["interpretation"],
                    "interpretation_mr": item["interpretation_mr"],
                    "source": item["source"],
                }

        return {
            "field_id": field_identifier,
            "has_report": True,
            "is_demo": full_report["is_demo"],
            "report_no": full_report["report"]["report_no"] if full_report["report"] else "Pending",
            "report_date": full_report["report"]["report_date"] if full_report["report"] else "Pending",
            "status": full_report["report"]["status"] if full_report["report"] else "Pending",
            "primary_parameters": primary_params,
            # Flat convenience fields for quick dashboard consumption
            "ph": params_by_key.get("ph", {}).get("value"),
            "ph_status": params_by_key.get("ph", {}).get("interpretation", "N/A"),
            "organic_carbon": params_by_key.get("organic_carbon", {}).get("value"),
            "nitrogen": params_by_key.get("available_nitrogen", {}).get("value"),
            "phosphorus": params_by_key.get("available_phosphorus", {}).get("value"),
            "potassium": params_by_key.get("available_potassium", {}).get("value"),
        }

soil_health_service = SoilHealthService()
