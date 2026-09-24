"""Centralized Soil Nutrient Interpretation Rules & Thresholds.
SoilPilot Phase 7 - Based on ICAR and Maharashtra Agricultural University standards.
"""
from typing import Dict, Any, Tuple

# Scientific classification thresholds for agricultural soils (Vertisols/Deccan Black Soils)
SOIL_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "ph": {
        "unit": "",
        "name": "Soil pH",
        "name_mr": "सामू (pH)",
        "interpret": lambda v: (
            ("Strongly Acidic", "तीव्र आम्लधर्मी") if v < 5.5 else
            ("Moderately Acidic", "मध्यम आम्लधर्मी") if v < 6.5 else
            ("Neutral / Optimal", "उदासीन (योग्य)") if v <= 7.5 else
            ("Moderately Alkaline", "मध्यम विम्लधर्मी") if v <= 8.5 else
            ("Strongly Alkaline", "अति विम्लधर्मी")
        ),
        "reference_range": "Acidic < 6.5 | Neutral 6.5 - 7.5 | Alkaline > 7.5",
    },
    "ec": {
        "unit": "dS/m",
        "name": "Electrical Conductivity",
        "name_mr": "विद्युत वाहकता (EC)",
        "interpret": lambda v: (
            ("Normal / Safe", "सर्वसाधारण (सुरक्षित)") if v < 1.0 else
            ("Critical for Germination", "धोकादायक (उगवणीवर परिणाम)") if v <= 2.0 else
            ("Injurious / Saline", "क्षारयुक्त (पिकास घातक)")
        ),
        "reference_range": "Normal < 1.0 | Critical 1.0 - 2.0 | Saline > 2.0",
    },
    "organic_carbon": {
        "unit": "%",
        "name": "Organic Carbon",
        "name_mr": "सेंद्रिय कर्ब",
        "interpret": lambda v: (
            ("Very Low", "अति कमी") if v < 0.20 else
            ("Low", "कमी") if v <= 0.40 else
            ("Medium", "मध्यम") if v <= 0.60 else
            ("High", "जास्त") if v <= 0.80 else
            ("Very High", "अति जास्त")
        ),
        "reference_range": "Low < 0.40 | Medium 0.41 - 0.60 | High 0.61 - 0.80 | Very High > 0.80",
    },
    "available_nitrogen": {
        "unit": "kg/ha",
        "name": "Available Nitrogen",
        "name_mr": "उपलब्ध नत्र (N)",
        "interpret": lambda v: (
            ("Very Low", "अति कमी") if v < 140 else
            ("Low", "कमी") if v <= 280 else
            ("Medium", "मध्यम") if v <= 420 else
            ("High", "जास्त") if v <= 560 else
            ("Very High", "अति जास्त")
        ),
        "reference_range": "Low < 280 | Medium 280 - 560 | High > 560",
    },
    "available_phosphorus": {
        "unit": "kg/ha",
        "name": "Available Phosphorus",
        "name_mr": "उपलब्ध स्फुरद (P)",
        "interpret": lambda v: (
            ("Very Low", "अति कमी") if v < 7.0 else
            ("Low", "कमी") if v <= 14.0 else
            ("Medium", "मध्यम") if v <= 21.0 else
            ("High", "जास्त") if v <= 28.0 else
            ("Very High", "अति जास्त")
        ),
        "reference_range": "Low < 14.0 | Medium 14.1 - 28.0 | High > 28.0",
    },
    "available_potassium": {
        "unit": "kg/ha",
        "name": "Available Potassium",
        "name_mr": "उपलब्ध पालाश (K)",
        "interpret": lambda v: (
            ("Very Low", "अति कमी") if v < 100 else
            ("Low", "कमी") if v <= 150 else
            ("Medium", "मध्यम") if v <= 250 else
            ("High", "जास्त") if v <= 300 else
            ("Very High", "अति जास्त")
        ),
        "reference_range": "Low < 150 | Medium 150 - 250 | High > 250",
    },
    "exchangeable_sodium": {
        "unit": "%",
        "name": "Exchangeable Sodium Percentage",
        "name_mr": "विनिमययोग्य सोडियम (ESP)",
        "interpret": lambda v: (
            ("Normal", "सर्वसाधारण") if v < 15.0 else
            ("Sodic / Problematic", "सोडियमयुक्त (समस्याग्रस्त)")
        ),
        "reference_range": "Normal < 15.0 | Sodic > 15.0",
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
        "reference_range": "Low < 5.0 | Medium 5.0 - 10.0 | High > 10.0",
    },
    "iron": {
        "unit": "ppm",
        "name": "Iron (Fe)",
        "name_mr": "लोह (Fe)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 4.5 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "Deficient < 4.5 | Sufficient >= 4.5",
    },
    "manganese": {
        "unit": "ppm",
        "name": "Manganese (Mn)",
        "name_mr": "मँगनीज (Mn)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 2.0 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "Deficient < 2.0 | Sufficient >= 2.0",
    },
    "zinc": {
        "unit": "ppm",
        "name": "Zinc (Zn)",
        "name_mr": "जस्त (Zn)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 0.6 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "Deficient < 0.6 | Sufficient >= 0.6",
    },
    "copper": {
        "unit": "ppm",
        "name": "Copper (Cu)",
        "name_mr": "तांबे (Cu)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 0.2 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "Deficient < 0.2 | Sufficient >= 0.2",
    },
    "sulphur": {
        "unit": "ppm",
        "name": "Sulphur (S)",
        "name_mr": "गंधक (S)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 10.0 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "Deficient < 10.0 | Sufficient >= 10.0",
    },
    "boron": {
        "unit": "ppm",
        "name": "Boron (B)",
        "name_mr": "बोरॉन (B)",
        "interpret": lambda v: (
            ("Deficient", "कमतरता") if v < 0.5 else
            ("Sufficient", "पुरेसे")
        ),
        "reference_range": "Deficient < 0.5 | Sufficient >= 0.5",
    },
}

def interpret_parameter(key: str, value: float) -> Tuple[str, str, str]:
    config = SOIL_THRESHOLDS.get(key)
    if not config or value is None:
        return ("Not Available", "उपलब्ध नाही", "N/A")
    en, mr = config["interpret"](value)
    return (en, mr, config["reference_range"])
