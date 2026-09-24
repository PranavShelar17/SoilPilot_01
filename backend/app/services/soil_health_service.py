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

# Authoritative Demo Sample Dataset (matching the reference laboratory report for Gat 104 in Malegaon Bk)
DEMO_LAB_PARAMETERS = [
    # Primary Nutrients & Chemical Metrics
    {"sr_no": 1, "key": "ph", "name": "Soil pH", "name_mr": "मातीचा सामू (pH)", "category": "Chemical", "value": 8.38, "unit": "", "source": "LAB OBSERVATION"},
    {"sr_no": 2, "key": "ec", "name": "Electrical Conductivity (EC)", "name_mr": "विद्युत वाहकता (EC)", "category": "Chemical", "value": 0.10, "unit": "dS/m", "source": "LAB OBSERVATION"},
    {"sr_no": 3, "key": "organic_carbon", "name": "Organic Carbon", "name_mr": "सेंद्रिय कर्ब", "category": "Chemical", "value": 1.02, "unit": "%", "source": "LAB OBSERVATION"},
    {"sr_no": 4, "key": "available_nitrogen", "name": "Available Nitrogen", "name_mr": "उपलब्ध नत्र (N)", "category": "Primary Nutrient", "value": 163.0, "unit": "kg/ha", "source": "LAB OBSERVATION"},
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
        """Resolve field by integer ID, string ID, or demo Gat lookup."""
        # Try direct integer ID
        if str(field_identifier).isdigit():
            field = db.query(Field).filter(Field.id == int(field_identifier)).first()
            if field:
                return field

        # Check for demo keywords or Gat 104
        norm = str(field_identifier).strip().lower()
        if norm in ["demo-field-gat-104", "demo", "gat-104", "104"]:
            field = db.query(Field).filter(Field.gat_no == "104").first()
            if field:
                return field

        # Check by Gat number directly
        field = db.query(Field).filter(Field.gat_no == str(field_identifier)).first()
        return field

    @staticmethod
    def get_report_for_field(db: Session, field_identifier: str) -> Dict[str, Any]:
        field = SoilHealthService._find_field(db, field_identifier)
        norm_id = str(field_identifier).strip().lower()

        # If field is not found and it's explicitly a demo string, synthesize demo context
        is_demo_req = norm_id in ["demo-field-gat-104", "demo", "gat-104"] or (field and (str(field.gat_no) in ["104", "104/1"] or getattr(field, "is_demo", False)))

        if not field and not is_demo_req:
            # Return standard empty structure for unseeded field
            return {
                "field": {
                    "id": field_identifier,
                    "gat_no": "N/A",
                    "area": None,
                    "area_unit": "hectare",
                    "village": "N/A",
                    "taluka": "N/A",
                    "district": "N/A",
                    "state": "Maharashtra",
                },
                "farmer": {
                    "id": None,
                    "name": "Farmer",
                    "code": "",
                },
                "has_report": False,
                "is_demo": False,
                "report": None,
                "parameters": [],
            }

        farmer = db.query(Farmer).filter(Farmer.id == field.farmer_id).first() if field and field.farmer_id else None
        village = db.query(Village).filter(Village.id == field.village_id).first() if field else None
        taluka = db.query(Taluka).filter(Taluka.id == village.taluka_id).first() if village else None
        district = db.query(District).filter(District.id == taluka.district_id).first() if taluka else None

        # 1. Check if an official soil report exists in DB
        db_report = db.query(SoilReport).filter(SoilReport.field_id == field.id).first() if field else None
        if db_report:
            params = []
            for p in db_report.parameters:
                params.append({
                    "sr_no": p.sr_no,
                    "key": p.parameter_key,
                    "parameter_key": p.parameter_key,
                    "name": p.parameter_name,
                    "parameter_name": p.parameter_name,
                    "name_mr": p.parameter_name_mr,
                    "parameter_name_mr": p.parameter_name_mr,
                    "category": p.category,
                    "value": p.value,
                    "unit": p.unit,
                    "interpretation": p.interpretation_en,
                    "interpretation_en": p.interpretation_en,
                    "interpretation_mr": p.interpretation_mr,
                    "reference_range": p.reference_range,
                    "source": p.source_type,
                    "source_type": p.source_type,
                })
            
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
                    "name": farmer.full_name if farmer else "Pradip Bhauso Shelar",
                    "code": farmer.farmer_code if farmer else "FARMER-001",
                },
                "has_report": True,
                "is_demo": db_report.is_demo,
                "report": {
                    "id": db_report.id,
                    "report_no": db_report.report_no,
                    "receipt_no": db_report.receipt_no,
                    "sample_name": db_report.sample_name,
                    "sample_date": db_report.sample_date,
                    "report_date": db_report.report_date,
                    "crop_name": db_report.crop_name or "Sugarcane / Cash Crop",
                    "laboratory_name": db_report.laboratory_name,
                    "is_demo": db_report.is_demo,
                    "status": "Available",
                },
                "parameters": params,
            }

        # 2. If it's the demo record (Gat 104 in Malegaon Bk) or requested as demo
        if is_demo_req:
            params = []
            for p in DEMO_LAB_PARAMETERS:
                interp_en, interp_mr, ref_range = interpret_parameter(p["key"], p["value"])
                params.append({
                    "sr_no": p["sr_no"],
                    "key": p["key"],
                    "parameter_key": p["key"],
                    "name": p["name"],
                    "parameter_name": p["name"],
                    "name_mr": p["name_mr"],
                    "parameter_name_mr": p["name_mr"],
                    "category": p["category"],
                    "value": p["value"],
                    "unit": p["unit"],
                    "interpretation": interp_en,
                    "interpretation_en": interp_en,
                    "interpretation_mr": interp_mr,
                    "reference_range": ref_range,
                    "source": p["source"],
                    "source_type": p["source"],
                })

            return {
                "field": {
                    "id": field.id if field else "demo-field-gat-104",
                    "gat_no": field.gat_no if field else "104",
                    "area": field.area if field and field.area else 1.96,
                    "area_unit": field.area_unit if field and field.area_unit else "hectare",
                    "village": village.name if village else "Malegaon Bk",
                    "taluka": taluka.name if taluka else "Baramati",
                    "district": district.name if district else "Pune",
                    "state": "Maharashtra",
                },
                "farmer": {
                    "id": farmer.id if farmer else 1,
                    "name": farmer.full_name if farmer else "Pradip Bhauso Shelar",
                    "code": farmer.farmer_code if farmer else "DEMO-FARMER-104",
                },
                "has_report": True,
                "is_demo": True,
                "report": {
                    "id": 104,
                    "report_no": "SPL/2026/SL-0104",
                    "receipt_no": "REC-7842/26",
                    "sample_name": "Surface Soil Composite (0-15 cm)",
                    "sample_date": "15-09-2026",
                    "report_date": "20-09-2026",
                    "crop_name": "Sugarcane (ऊस)",
                    "laboratory_name": "SoilPilot Soil Testing & Diagnostic Laboratory",
                    "is_demo": True,
                    "status": "Available",
                },
                "parameters": params,
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
