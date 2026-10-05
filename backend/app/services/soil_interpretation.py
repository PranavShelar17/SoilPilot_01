"""Centralized Soil Nutrient Interpretation Rules & Thresholds.
SoilPilot Phase 7 & 8 - Based on Soil Health Card (SHC) & Indian Research (242,827 samples across 615 districts).
"""
from typing import Dict, Any, Tuple

# Scientific classification thresholds for agricultural soils (Vertisols/Deccan Black Soils)
SOIL_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "ph": {
        "unit": "",
        "name": "Soil pH",
        "name_mr": "सामू (pH)",
        "interpret": lambda v: (
            ("Strongly acidic", "तीव्र आम्लधर्मी") if v < 5.0 else
            ("Acidic", "आम्लधर्मी") if v <= 6.0 else
            ("Suitable", "योग्य (अनुकूल)") if v <= 7.5 else
            ("Alkaline", "विम्लधर्मी") if v <= 8.5 else
            ("Strongly alkaline", "अति विम्लधर्मी")
        ),
        "reference_range": "6.0 - 7.5 (Suitable)",
        "reference_range_mr": "6.0 - 7.5 (योग्य)",
    },
    "ec": {
        "unit": "dS/m",
        "name": "Electrical Conductivity",
        "name_mr": "विद्युत वाहकता (EC)",
        "interpret": lambda v: (
            ("Non-saline", "अक्षारयुक्त") if v < 0.4 else
            ("Slightly saline", "किंचित क्षारयुक्त") if v <= 0.8 else
            ("Moderately saline", "मध्यम क्षारयुक्त") if v <= 1.6 else
            ("Highly saline", "अति क्षारयुक्त")
        ),
        "reference_range": "< 0.8 (Normal)",
        "reference_range_mr": "< 0.8 (सामान्य)",
    },
    "organic_carbon": {
        "unit": "%",
        "name": "Organic Carbon",
        "name_mr": "सेंद्रिय कर्ब",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 0.50 else
            ("Medium", "मध्यम") if v <= 0.75 else
            ("High", "जास्त")
        ),
        "reference_range": "0.50 - 0.75% (Medium)",
        "reference_range_mr": "0.50 - 0.75% (मध्यम)",
    },
    "available_nitrogen": {
        "unit": "kg/ha",
        "name": "Available Nitrogen",
        "name_mr": "उपलब्ध नत्र (N)",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 280 else
            ("Medium", "मध्यम") if v <= 560 else
            ("High", "जास्त")
        ),
        "reference_range": "280 - 560 (Medium)",
        "reference_range_mr": "280 - 560 (मध्यम)",
    },
    "available_phosphorus": {
        "unit": "kg/ha",
        "name": "Available Phosphorus",
        "name_mr": "उपलब्ध स्फुरद (P)",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 10.0 else
            ("Medium", "मध्यम") if v <= 25.0 else
            ("High", "जास्त") if v <= 50.0 else
            ("Very high", "अति जास्त")
        ),
        "reference_range": "10 - 25 (Medium)",
        "reference_range_mr": "10 - 25 (मध्यम)",
    },
    "available_potassium": {
        "unit": "kg/ha",
        "name": "Available Potassium",
        "name_mr": "उपलब्ध पालाश (K)",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 120.0 else
            ("Medium", "मध्यम") if v <= 280.0 else
            ("High", "जास्त") if v <= 600.0 else
            ("Very high", "अति जास्त")
        ),
        "reference_range": "120 - 280 (Medium)",
        "reference_range_mr": "120 - 280 (मध्यम)",
    },
    "exchangeable_sodium": {
        "unit": "%",
        "name": "Exchangeable Sodium Percentage",
        "name_mr": "विनिमययोग्य सोडियम (ESP)",
        "interpret": lambda v: (
            ("Normal", "सर्वसाधारण") if v < 15.0 else
            ("Sodic / Problematic", "सोडियमयुक्त (समस्याग्रस्त)")
        ),
        "reference_range": "< 15.0 (Normal)",
        "reference_range_mr": "< 15.0 (सामान्य)",
    },
    "free_lime": {
        "unit": "%",
        "name": "Free Lime (CaCO3)",
        "name_mr": "मुक्त चुनखडी (CaCO3)",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 5.0 else
            ("Medium", "मध्यम") if v <= 10.0 else
            ("High (Calcareous)", "जास्त (चुनखडीयुक्त)")
        ),
        "reference_range": "< 5.0% (Normal)",
        "reference_range_mr": "< 5.0% (सामान्य)",
    },
    "iron": {
        "unit": "ppm",
        "name": "Available Iron (Fe)",
        "name_mr": "उपलब्ध लोह (Fe)",
        "interpret": lambda v: (
            ("Very deficient", "अति तीव्र कमतरता") if v < 2.5 else
            ("Deficient", "कमतरता") if v <= 4.5 else
            ("Marginal", "सीमांत") if v <= 6.5 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "> 4.5 (Sufficient)",
        "reference_range_mr": "> 4.5 (पुरेसे)",
    },
    "manganese": {
        "unit": "ppm",
        "name": "Available Manganese (Mn)",
        "name_mr": "उपलब्ध मँगनीज (Mn)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 3.0 else
            ("Marginal", "सीमांत") if v <= 5.0 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "> 3.0 (Sufficient)",
        "reference_range_mr": "> 3.0 (पुरेसे)",
    },
    "zinc": {
        "unit": "ppm",
        "name": "Available Zinc (Zn)",
        "name_mr": "उपलब्ध जस्त (Zn)",
        "interpret": lambda v: (
            ("Very deficient", "अति तीव्र कमतरता") if v < 0.3 else
            ("Deficient", "कमतरता") if v <= 0.6 else
            ("Marginal", "सीमांत") if v <= 0.9 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "> 0.6 (Sufficient)",
        "reference_range_mr": "> 0.6 (पुरेसे)",
    },
    "copper": {
        "unit": "ppm",
        "name": "Available Copper (Cu)",
        "name_mr": "उपलब्ध तांबे (Cu)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 0.4 else
            ("Marginal", "सीमांत") if v <= 0.6 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "> 0.4 (Sufficient)",
        "reference_range_mr": "> 0.4 (पुरेसे)",
    },
    "sulphur": {
        "unit": "ppm",
        "name": "Available Sulphur (S)",
        "name_mr": "उपलब्ध गंधक (S)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 15.0 else
            ("Marginal", "सीमांत") if v <= 22.5 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "> 15.0 (Sufficient)",
        "reference_range_mr": "> 15.0 (पुरेसे)",
    },
    "boron": {
        "unit": "ppm",
        "name": "Available Boron (B)",
        "name_mr": "उपलब्ध बोरॉन (B)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 0.50 else
            ("Marginal", "सीमांत") if v <= 0.70 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "> 0.5 (Sufficient)",
        "reference_range_mr": "> 0.5 (पुरेसे)",
    },
    "bd": {
        "unit": "g/cm³",
        "name": "Bulk Density",
        "name_mr": "मातीची घनता (BD)",
        "interpret": lambda v: (
            ("Optimal Porosity", "उत्तम सच्छिद्रता") if v < 1.40 else
            ("Moderate Density", "मध्यम घनता") if v <= 1.60 else
            ("High Density / Compacted", "जास्त घनता / कठीण जमीन")
        ),
        "reference_range": "< 1.40 (Optimal)",
        "reference_range_mr": "< 1.40 (उत्तम)",
    },
    "total_nitrogen": {
        "unit": "%",
        "name": "Total Nitrogen",
        "name_mr": "एकूण नत्र",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 0.05 else
            ("Medium", "मध्यम") if v <= 0.18 else
            ("High", "जास्त")
        ),
        "reference_range": "AOI range: 0.05 - 0.18",
        "reference_range_mr": "कार्यक्षेत्र श्रेणी: ०.०५ - ०.१८%",
    },
    "cec": {
        "unit": "cmol(c)/kg",
        "name": "Cation Exchange Capacity (CEC)",
        "name_mr": "धनायन विनिमय क्षमता (CEC)",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 18.5 else
            ("Moderate", "मध्यम") if v < 25.0 else
            ("High", "जास्त (उत्कृष्ट)")
        ),
        "reference_range": "AOI range: 18.5 - 35.0",
        "reference_range_mr": "कार्यक्षेत्र श्रेणी: १८.५ - ३५.०",
    },
    "cfvo": {
        "unit": "%",
        "name": "Coarse Fragments",
        "name_mr": "दगड-गोटे प्रमाण",
        "interpret": lambda v: (
            ("Optimal (Low)", "कमी (चांगले)") if v <= 6.5 else
            ("Moderate", "मध्यम") if v <= 15.0 else
            ("High Gravelly", "जास्त खडेयुक्त")
        ),
        "reference_range": "AOI range: 1.2 - 6.5",
        "reference_range_mr": "कार्यक्षेत्र श्रेणी: १.२ - ६.५%",
    },
    "sand": {
        "unit": "%",
        "name": "Sand",
        "name_mr": "वाळू / रेती",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 28.0 else
            ("Moderate", "मध्यम") if v <= 45.0 else
            ("High", "जास्त")
        ),
        "reference_range": "AOI range: 28.0 - 45.0",
        "reference_range_mr": "कार्यक्षेत्र श्रेणी: २८.० - ४५.०%",
    },
    "silt": {
        "unit": "%",
        "name": "Silt",
        "name_mr": "गाळाचे प्रमाण",
        "interpret": lambda v: (
            ("Low", "कमी") if v < 25.0 else
            ("Moderate", "मध्यम") if v <= 35.0 else
            ("High", "जास्त")
        ),
        "reference_range": "AOI range: 25.0 - 35.0",
        "reference_range_mr": "कार्यक्षेत्र श्रेणी: २५.० - ३५.०%",
    },
    "clay": {
        "unit": "%",
        "name": "Clay",
        "name_mr": "चिकणमाती",
        "interpret": lambda v: (
            ("Moderate Clay", "मध्यम चिकण") if v < 25.0 else
            ("Heavy Clay", "काळी चिकण माती")
        ),
        "reference_range": "AOI range: 22.0 - 38.5",
        "reference_range_mr": "कार्यक्षेत्र श्रेणी: २२.० - ३८.५%",
    },
    "soil_texture": {
        "unit": "—",
        "name": "Soil Texture Class",
        "name_mr": "मातीचा पोत वर्ग",
        "interpret": lambda v: ("Clayey (काळी माती)", "काळी चिकण माती (Vertisols)"),
        "reference_range": "USDA Class: Clay / Vertisols",
        "reference_range_mr": "USDA वर्ग: काळी चिकण माती",
    },
}

def interpret_parameter(key: str, value: Any) -> Tuple[str, str, str]:
    config = SOIL_THRESHOLDS.get(key)
    if not config:
        return ("Not Available", "उपलब्ध नाही", "N/A")
    if value is None:
        return ("Not Available", "उपलब्ध नाही", config.get("reference_range", "N/A"))
    if isinstance(value, str):
        en, mr = config["interpret"](1.0)
        return (en, mr, config["reference_range"])
    try:
        val_float = float(value)
        en, mr = config["interpret"](val_float)
        return (en, mr, config["reference_range"])
    except (ValueError, TypeError):
        return ("Normal", "सामान्य", config["reference_range"])
