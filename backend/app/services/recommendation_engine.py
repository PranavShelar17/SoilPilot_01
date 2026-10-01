"""SoilPilot Phase 8: Deterministic Rule-Based Soil Recommendations Engine.
Based on ICAR and Maharashtra State Agricultural University (MPKV Rahuri) standards
for Deccan Vertisols (Black Cotton Soils).

NO generative AI / LLM is used. All recommendations are derived from structured rules.
"""
from typing import Dict, Any, List, Optional

def evaluate_parameter_recommendation(
    key: str,
    name: str,
    name_mr: str,
    category: str,
    value: Optional[float],
    unit: str,
    interpretation_en: str,
    interpretation_mr: str,
    source: str = "LAB OBSERVATION"
) -> Optional[Dict[str, Any]]:
    """Evaluates a single soil parameter observation and returns a structured recommendation.
    Returns None if value is not available.
    """
    if value is None:
        return None

    # Base record structure
    rec = {
        "parameter_key": key,
        "parameter_name": name,
        "parameter_name_mr": name_mr,
        "category": category,
        "value": value,
        "unit": unit,
        "status": interpretation_en,
        "status_mr": interpretation_mr,
        "source": source,
        "priority": "INFORMATION",
        "priority_key": "info",
        "needs_attention": False,
        "what_observed": "",
        "what_observed_mr": "",
        "what_it_means": "",
        "what_it_means_mr": "",
        "action_guidance": "",
        "action_guidance_mr": "",
        "why_it_matters": "",
        "why_it_matters_mr": "",
    }

    # 1. Soil pH
    if key == "ph":
        rec["why_it_matters"] = "Soil pH dictates chemical solubility and how readily crop roots can absorb macro and micronutrients."
        rec["why_it_matters_mr"] = "मातीचा सामू (pH) रासायनिक विद्राव्यता आणि पिकांची मुळे अन्नद्रव्ये किती सहज शोषून घेऊ शकतात हे ठरवतो."

        if value < 5.5:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Soil pH is {value:.2f}, indicating strongly acidic condition."
            rec["what_observed_mr"] = f"मातीचा सामू {value:.2f} आहे, जो तीव्र आम्लधर्मी स्थिती दर्शवतो."
            rec["what_it_means"] = "High acidity severely limits phosphorus and calcium availability and can cause aluminum/manganese toxicity."
            rec["what_it_means_mr"] = "तीव्र आम्लतेमुळे स्फुरद आणि कॅल्शियमची उपलब्धता मर्यादित होते आणि पिकांच्या मुळांवर विपरीत परिणाम होऊ शकतो."
            rec["action_guidance"] = "Apply agricultural lime (calcium carbonate) or dolomite as per soil testing recommendations before sowing. Avoid acid-forming fertilizers."
            rec["action_guidance_mr"] = "पेरणीपूर्वी कृषी चुना किंवा डोलोमाइट माती चाचणीनुसार जमिनीत मिसळा. आम्लधर्मी खतांचा वापर टाळा."
        elif value < 6.5:
            rec["priority"] = "MODERATE"
            rec["priority_key"] = "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Soil pH is {value:.2f}, indicating slightly to moderately acidic soil."
            rec["what_observed_mr"] = f"मातीचा सामू {value:.2f} आहे, जो मध्यम आम्लधर्मी स्थिती दर्शवतो."
            rec["what_it_means"] = "Nutrient uptake is moderately affected. Most crops prefer closer to neutral reaction."
            rec["what_it_means_mr"] = "अन्नद्रव्य शोषणावर मध्यम परिणाम होतो. बहुतेक पिकांना उदासीन (न्यूट्रल) जमीन अधिक अनुकूल असते."
            rec["action_guidance"] = "Incorporate well-decomposed FYM or compost. Consider light liming if cultivating sensitive pulse or oilseed crops."
            rec["action_guidance_mr"] = "चांगले कुजलेले शेणखत किंवा कंपोस्ट वापरा. डाळवर्गीय पिकांसाठी हलका चुना वापरण्याचा विचार करावा."
        elif value <= 7.5:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Soil pH is {value:.2f}, which is within the optimal neutral zone."
            rec["what_observed_mr"] = f"मातीचा सामू {value:.2f} आहे, जो पिकांसाठी अत्यंत योग्य व उदासीन स्थितीत आहे."
            rec["what_it_means"] = "Root zone provides optimal chemical balance for maximum nutrient uptake efficiency."
            rec["what_it_means_mr"] = "पिकांची मुळे सर्व मुख्य व सूक्ष्म अन्नद्रव्ये पूर्ण कार्यक्षमतेने शोषून घेऊ शकतात."
            rec["action_guidance"] = "Maintain current balanced soil management practices and regular organic matter recycling."
            rec["action_guidance_mr"] = "सध्याच्या संतुलित खत व्यवस्थापन पद्धती आणि नियमित सेंद्रिय खतांचा वापर सुरू ठेवा."
        elif value <= 8.5:
            rec["priority"] = "MODERATE"
            rec["priority_key"] = "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Soil pH is {value:.2f}, indicating moderately alkaline soil (typical of Vertisols)."
            rec["what_observed_mr"] = f"मातीचा सामू {value:.2f} आहे, जो मध्यम विम्लधर्मी (काळी जमीन) स्थिती दर्शवतो."
            rec["what_it_means"] = "Availability of phosphorus and micronutrients like zinc and iron decreases due to fixation with soil calcium."
            rec["what_it_means_mr"] = "चुनखडीमुळे स्फुरद, जस्त आणि लोह या अन्नद्रव्यांचे जमिनीत स्थिरीकरण होऊन पिकांना मिळण्यात अडचण येते."
            rec["action_guidance"] = "Apply organic manures, press mud, or green manure (Dhaincha/Sunnhemp) to buffer pH. Use fertigation with acid-reacting fertilizers like Ammonium Sulphate."
            rec["action_guidance_mr"] = "सेंद्रिय खते, कंपोस्ट किंवा ताग/धैंचाचे हिरवळीचे खत वापरा. अमोनियम सल्फेट किंवा गंधकयुक्त खतांचा वापर फायदेशीर ठरतो."
        else:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Soil pH is {value:.2f}, indicating strongly alkaline condition."
            rec["what_observed_mr"] = f"मातीचा सामू {value:.2f} आहे, जो अति विम्लधर्मी स्थिती दर्शवतो."
            rec["what_it_means"] = "Severe nutrient lockout. High risk of chlorosis (yellowing) due to iron and zinc deficiency."
            rec["what_it_means_mr"] = "अन्नद्रव्यांची कमतरता तीव्र होते. लोह आणि जस्ताच्या कमतरतेमुळे पाने पिवळी पडण्याचा मोठा धोका असतो."
            rec["action_guidance"] = "Apply agricultural gypsum if Exchangeable Sodium (ESP) is also elevated. Use elemental sulphur (100-150 kg/ha) and liberal organic composting."
            rec["action_guidance_mr"] = "सोडियम जास्त असल्यास कृषी जिप्समचा वापर करा. जिवाणू खते आणि सेंद्रिय खतांचा भरमसाठ वापर करून सामू संतुलित करा."

    # 2. Electrical Conductivity (EC)
    elif key == "ec":
        rec["why_it_matters"] = "Electrical conductivity measures dissolved soluble salts in soil water, indicating salinity risks."
        rec["why_it_matters_mr"] = "विद्युत वाहकता मातीतील विद्राव्य क्षारांचे प्रमाण मोजते आणि क्षारयुक्ततेचा धोका दर्शवते."

        if value < 1.0:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Soil EC is {value:.2f} dS/m, well within safe limits."
            rec["what_observed_mr"] = f"मातीची विद्युत वाहकता {value:.2f} dS/m आहे, जी पूर्णपणे सुरक्षित पातळीत आहे."
            rec["what_it_means"] = "Soluble salt concentrations pose no threat to seed germination or root water uptake."
            rec["what_it_means_mr"] = "विद्राव्य क्षारांचे प्रमाण कमी असल्यामुळे पिकांच्या वाढीवर कोणताही विपरित परिणाम होणार नाही."
            rec["action_guidance"] = "Maintain regular irrigation scheduling and monitor quality of tubewell/canal water periodically."
            rec["action_guidance_mr"] = "नियमित पाणी व्यवस्थापन ठेवा आणि विहीर/कॅनॉलच्या पाण्याच्या गुणवत्तेवर लक्ष ठेवा."
        elif value <= 2.0:
            rec["priority"] = "MODERATE"
            rec["priority_key"] = "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Soil EC is {value:.2f} dS/m, approaching critical salinity threshold."
            rec["what_observed_mr"] = f"मातीची विद्युत वाहकता {value:.2f} dS/m आहे, जी पिकांच्या वाढीसाठी धोक्याच्या उंबरठ्यावर आहे."
            rec["what_it_means"] = "Salt-sensitive crops (pulses, citrus) may experience delayed germination or stunted seedling growth."
            rec["what_it_means_mr"] = "संवेदनशील पिकांची उगवण मंदावू शकते किंवा रोपांची वाढ खुंटू शकते."
            rec["action_guidance"] = "Provide adequate field drainage. Leach excess salts with good-quality irrigation water. Avoid saline water sources."
            rec["action_guidance_mr"] = "जमिनीतील पाण्याचा निचरा सुधारा. चांगल्या गुणवत्तेच्या पाण्याने जादा क्षार धुवून काढण्यास मदत करा."
        else:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Soil EC is {value:.2f} dS/m, indicating saline soil condition."
            rec["what_observed_mr"] = f"मातीची विद्युत वाहकता {value:.2f} dS/m आहे, जी क्षारयुक्त जमीन दर्शवते."
            rec["what_it_means"] = "High osmotic stress prevents roots from drinking water, causing physiological drought even in moist soil."
            rec["what_it_means_mr"] = "जास्त क्षारामुळे जमिनीत ओलावा असला तरी पिकांची मुळे पाणी शोषू शकत नाहीत."
            rec["action_guidance"] = "Construct deep surface drainage channels to flush salts. Select salt-tolerant crops (cotton, barley, sugar beet). Apply bulky organic matter."
            rec["action_guidance_mr"] = "शेतातून पाण्याचा निचरा करणारी चर काढा. क्षार सहन करणारी पिके निवडा आणि भरपूर सेंद्रिय खतांचा वापर करा."

    # 3. Organic Carbon
    elif key == "organic_carbon":
        rec["why_it_matters"] = "Organic carbon is the biological backbone of soil, controlling moisture retention, microbial activity, and nutrient delivery."
        rec["why_it_matters_mr"] = "सेंद्रिय कर्ब हा मातीचा कणा आहे; तो ओलावा टिकवून ठेवणे, सूक्ष्मजीव क्रियाशीलता आणि अन्नद्रव्य पुरवठा नियंत्रित करतो."

        if value <= 0.40:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Organic Carbon is {value:.2f}%, which is in the low/deficient category."
            rec["what_observed_mr"] = f"सेंद्रिय कर्ब {value:.2f}% आहे, जे कमी/कमतरतेच्या श्रेणीत आहे."
            rec["what_it_means"] = "Soil structure is fragile with reduced water retention capacity and low microbial biomass."
            rec["what_it_means_mr"] = "जमिनीची पाणी धरून ठेवण्याची क्षमता कमी असून सूक्ष्मजीवांची संख्या घटलेली आहे."
            rec["action_guidance"] = "Apply 8-10 tons/ha of Farmyard Manure (FYM) or 3-5 tons/ha of vermicompost annually. Incorporate crop residues instead of burning."
            rec["action_guidance_mr"] = "दरवर्षी हेक्टरी ८-१० टन शेणखत किंवा ३-५ टन गांडूळखत वापरा. पिकांचे अवशेष जाळण्याऐवजी जमिनीत गाडा."
        elif value <= 0.60:
            rec["priority"] = "MODERATE"
            rec["priority_key"] = "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Organic Carbon is {value:.2f}%, placing it in the medium category."
            rec["what_observed_mr"] = f"सेंद्रिय कर्ब {value:.2f}% आहे, जे मध्यम श्रेणीत आहे."
            rec["what_it_means"] = "Moderate organic reserves exist, but continuous cropping without replenishment may deplete soil quality."
            rec["what_it_means_mr"] = "मध्यम सेंद्रिय साठा उपलब्ध आहे, परंतु सतत पीक घेतल्यास हा साठा कमी होऊ शकतो."
            rec["action_guidance"] = "Practice green manuring (Sunnhemp/Dhaincha) in crop rotation cycles and recycle stubble into compost."
            rec["action_guidance_mr"] = "पीक फेरपालटात ताग किंवा धैंचा यांसारख्या हिरवळीच्या खतांचा वापर करा."
        else:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Organic Carbon is {value:.2f}%, in the high / very high category."
            rec["what_observed_mr"] = f"सेंद्रिय कर्ब {value:.2f}% आहे, जे उत्तम/जास्त श्रेणीत आहे."
            rec["what_it_means"] = "Excellent organic matter retention supports active microbial ecology and high cation exchange capacity."
            rec["what_it_means_mr"] = "जमिनीत सेंद्रिय पदार्थांचे प्रमाण उत्कृष्ट असून सूक्ष्मजीवांची वाढ व अन्नद्रव्य साठवण क्षमता चांगली आहे."
            rec["action_guidance"] = "Maintain regular mulching and conservation tillage practices to preserve this healthy carbon reserve."
            rec["action_guidance_mr"] = "हा सेंद्रिय साठा टिकवून ठेवण्यासाठी आच्छादन (मल्चिंग) आणि नियमित सेंद्रिय व्यवस्थापन सुरू ठेवा."

    # 4. Available Nitrogen (N)
    elif key == "available_nitrogen":
        rec["why_it_matters"] = "Nitrogen drives rapid vegetative growth, tillering, stem elongation, and chlorophyll synthesis for green foliage."
        rec["why_it_matters_mr"] = "नत्र हे पिकांची जोमदार शाकीय वाढ, फुटवे, हिरवेगार पानांसाठी क्लोरोफिल निर्मितीसाठी अत्यावश्यक आहे."

        if value <= 280:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Available Nitrogen is {value:.1f} kg/ha, classified as low."
            rec["what_observed_mr"] = f"उपलब्ध नत्र {value:.1f} किलो/हेक्टर आहे, जे कमी श्रेणीत मोडते."
            rec["what_it_means"] = "Crops may suffer from stunted growth, reduced tillers, and pale yellowing of older leaves."
            rec["what_it_means_mr"] = "पिकांची वाढ खुंटणे, फुटवे कमी येणे आणि जुनी पाने पिवळी पडणे अशी लक्षणे दिसू शकतात."
            rec["action_guidance"] = "Apply nitrogen in 2 to 3 split doses (basal + vegetative + tillering) using Neem-coated urea to prevent leaching losses. Treat seed with Azotobacter or Rhizobium."
            rec["action_guidance_mr"] = "नत्रयुक्त खतांचा (उदा. युरिया) वापर २ ते ३ हप्त्यांमध्ये विभागून करा. ॲझोटोबॅक्टर किंवा रायझोबियम जिवाणू संवर्धकाची बीजप्रक्रिया करा."
        elif value <= 420:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Available Nitrogen is {value:.1f} kg/ha, which is in the balanced medium range."
            rec["what_observed_mr"] = f"उपलब्ध नत्र {value:.1f} किलो/हेक्टर आहे, जे मध्यम व संतुलित पातळीत आहे."
            rec["what_it_means"] = "Adequate nitrogen is present to sustain normal vegetative development."
            rec["what_it_means_mr"] = "पिकाच्या सामान्य शाकीय वाढीसाठी पुरेसे नत्र उपलब्ध आहे."
            rec["action_guidance"] = "Apply standard recommended crop fertilizer dosages in split applications aligned with growth stages."
            rec["action_guidance_mr"] = "पिकाच्या वाढीच्या अवस्थेनुसार खतांचे शिफारशीत प्रमाण विभागून द्यावे."
        else:
            rec["priority"] = "MODERATE"
            rec["priority_key"] = "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Available Nitrogen is {value:.1f} kg/ha, which is high."
            rec["what_observed_mr"] = f"उपलब्ध नत्र {value:.1f} किलो/हेक्टर आहे, जे जास्त श्रेणीत आहे."
            rec["what_it_means"] = "Excess nitrogen can cause succulent overgrowth, crop lodging, delayed maturity, and increased vulnerability to sucking pests."
            rec["what_it_means_mr"] = "जास्त नत्रामुळे पिकांची अवाजवी वाढ होते, पीक लोळण्याची शक्यता वाढते आणि किडींचा प्रादुर्भाव वाढू शकतो."
            rec["action_guidance"] = "Reduce basal and top-dress nitrogen applications by 15-20% to prevent luxury consumption and lodging."
            rec["action_guidance_mr"] = "युरियाचा वापर १५-२०% कमी करावा, जेणेकरून अनावश्यक वाढ टळेल आणि खर्चात बचत होईल."

    # 5. Available Phosphorus (P)
    elif key == "available_phosphorus":
        rec["why_it_matters"] = "Phosphorus fuels root architecture development, energy transfer (ATP), and early flowering/pod setting."
        rec["why_it_matters_mr"] = "स्फुरद मुळांचा विस्तार, वनस्पतीतील ऊर्जा वहन आणि वेळेवर फुले व फळे धरण्यासाठी अत्यंत महत्त्वाचे आहे."

        if value <= 14.0:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Available Phosphorus is {value:.2f} kg/ha, classified as low."
            rec["what_observed_mr"] = f"उपलब्ध स्फुरद {value:.2f} किलो/हेक्टर आहे, जे कमी श्रेणीत आहे."
            rec["what_it_means"] = "Poor root penetration, delayed maturity, and purplish discoloration of leaves may occur."
            rec["what_it_means_mr"] = "मुळांची वाढ व्यवस्थित न होणे, पक्वता उशिरा येणे आणि पानांवर जांभळट छटा येणे अशी लक्षणे दिसू शकतात."
            rec["action_guidance"] = "Apply phosphatic fertilizers (Single Super Phosphate / DAP) placed in the root zone at sowing. Inoculate seeds/soil with Phosphate Solubilizing Bacteria (PSB)."
            rec["action_guidance_mr"] = "पेरणीवेळी स्फुरदयुक्त खत (उदा. सिंगल सुपर फॉस्फेट किंवा डीएपी) मुळांच्या सानिध्यात द्या. पीएसबी (PSB) जिवाणू खताचा वापर करा."
        elif value <= 28.0:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Available Phosphorus is {value:.2f} kg/ha, falling in the medium range."
            rec["what_observed_mr"] = f"उपलब्ध स्फुरद {value:.2f} किलो/हेक्टर आहे, जे मध्यम पातळीत आहे."
            rec["what_it_means"] = "Sufficient for moderate crop needs without acute limitation."
            rec["what_it_means_mr"] = "पिकांच्या सामान्य गरजेसाठी स्फुरद पुरेसे आहे."
            rec["action_guidance"] = "Maintain standard balanced phosphatic fertilization tailored to the chosen crop."
            rec["action_guidance_mr"] = "निवडलेल्या पिकानुसार शिफारशीत मात्रेत स्फुरद खत द्यावे."
        else:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Available Phosphorus is {value:.2f} kg/ha, classified as high."
            rec["what_observed_mr"] = f"उपलब्ध स्फुरद {value:.2f} किलो/हेक्टर आहे, जे जास्त श्रेणीत आहे."
            rec["what_it_means"] = "High phosphorus reserves can satisfy crop uptake; excess application is wasteful and may suppress zinc uptake."
            rec["what_it_means_mr"] = "जमिनीत स्फुरदाचा पुरेसा साठा आहे; अतिरिक्त स्फुरद दिल्यास जस्त (झिंक) शोषणात अडथळा येऊ शकतो."
            rec["action_guidance"] = "Phosphorus dose can be reduced to maintenance levels, saving unnecessary chemical expenditure."
            rec["action_guidance_mr"] = "स्फुरदयुक्त खतांची मात्रा कमी करून खतांवरील खर्चात बचत करता येईल."

    # 6. Available Potassium (K)
    elif key == "available_potassium":
        rec["why_it_matters"] = "Potassium strengthens cell walls, governs stomatal water management during drought, and improves grain/fruit weight and quality."
        rec["why_it_matters_mr"] = "पालाश पेशींची रचना बळकट करते, दुष्काळात पाण्याचे नियंत्रण ठेवते आणि दाण्यांचे/फळांचे वजन व प्रत सुधारते."

        if value <= 150:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Available Potassium is {value:.1f} kg/ha, which is low."
            rec["what_observed_mr"] = f"उपलब्ध पालाश {value:.1f} किलो/हेक्टर आहे, जे कमी श्रेणीत आहे."
            rec["what_it_means"] = "Leaf margins may turn brown (scorched appearance), with reduced tolerance to moisture stress and fungal pathogens."
            rec["what_it_means_mr"] = "पानांच्या कडा करपणे, दुष्काळ सहन करण्याची ताकद कमी होणे आणि रोगांना बळी पडणे असा धोका असतो."
            rec["action_guidance"] = "Apply Muriate of Potash (MOP) or Sulphate of Potash (SOP) at sowing and pre-flowering stages."
            rec["action_guidance_mr"] = "पेरणीवेळी व फुलोऱ्यापूर्वी म्युरेट ऑफ पोटॅश (MOP) किंवा सल्फेट ऑफ पोटॅश (SOP) खताचा वापर करावा."
        elif value <= 250:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Available Potassium is {value:.1f} kg/ha, in the medium range."
            rec["what_observed_mr"] = f"उपलब्ध पालाश {value:.1f} किलो/हेक्टर आहे, जे मध्यम श्रेणीत आहे."
            rec["what_it_means"] = "Adequate potassium to sustain standard grain filling and disease resistance."
            rec["what_it_means_mr"] = "पिकांची प्रत आणि रोगप्रतिकारशक्ती टिकवून ठेवण्यासाठी पुरेसे पालाश उपलब्ध आहे."
            rec["action_guidance"] = "Apply standard recommended potassium dosage as per crop requirement."
            rec["action_guidance_mr"] = "पिकाच्या गरजेनुसार शिफारशीत प्रमाणात पालाश द्यावे."
        else:
            rec["priority"] = "MODERATE"
            rec["priority_key"] = "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Available Potassium is {value:.1f} kg/ha, in the high/very high range (characteristic of Deccan Vertisols)."
            rec["what_observed_mr"] = f"उपलब्ध पालाश {value:.1f} किलो/हेक्टर आहे, जे जास्त/भरपूर श्रेणीत आहे (महाराष्ट्रातील काळ्या जमिनीचे वैशिष्ट्य)."
            rec["what_it_means"] = "Abundant potassium reserve already exists in the soil minerals."
            rec["what_it_means_mr"] = "जमिनीत पालाशचा नैसर्गिक साठा मुबलक प्रमाणात आहे."
            rec["action_guidance"] = "Chemical potassium (MOP) dosage can be reduced or omitted for cereal crops, delivering direct fertilizer cost savings without yield loss."
            rec["action_guidance_mr"] = "रासायनिक पालाश खतांची मात्रा ५०% पर्यंत कमी करता येईल किंवा वगळता येईल, ज्यामुळे खताचा खर्च वाचेल."

    # 7. Micronutrients & Secondary Nutrients
    elif key in ["zinc", "iron", "manganese", "copper", "boron", "sulphur"]:
        nutrient_titles = {
            "zinc": ("Zinc (Zn)", "जस्त (Zn)"),
            "iron": ("Iron (Fe)", "लोह (Fe)"),
            "manganese": ("Manganese (Mn)", "मँगनीज (Mn)"),
            "copper": ("Copper (Cu)", "तांबे (Cu)"),
            "boron": ("Boron (B)", "बोरॉन (B)"),
            "sulphur": ("Sulphur (S)", "गंधक (S)"),
        }
        title_en, title_mr = nutrient_titles.get(key, (name, name_mr))

        rec["why_it_matters"] = f"{title_en} activates vital enzymatic pathways and directly impacts hormone synthesis and crop yield potential."
        rec["why_it_matters_mr"] = f"{title_mr} हे वनस्पतींमधील विविध विकर (एंझाइम) सक्रिय करण्यासाठी आणि उत्पादन क्षमता वाढवण्यासाठी आवश्यक आहे."

        is_deficient = "Deficient" in interpretation_en or "कमतरता" in interpretation_mr

        if is_deficient:
            rec["priority"] = "HIGH PRIORITY" if key in ["zinc", "iron"] else "MODERATE"
            rec["priority_key"] = "high" if key in ["zinc", "iron"] else "moderate"
            rec["needs_attention"] = True
            rec["what_observed"] = f"{title_en} level is {value:.2f} {unit}, which is below critical threshold (Deficient)."
            rec["what_observed_mr"] = f"{title_mr} पातळी {value:.2f} {unit} आहे, जी आवश्यक मर्यादेपेक्षा कमी (कमतरता) आहे."

            if key == "zinc":
                rec["what_it_means"] = "Zinc deficiency causes khaira disease, interveinal chlorosis, and stunted top growth in crops like sugarcane and paddy."
                rec["what_it_means_mr"] = "जस्ताच्या कमतरतेमुळे उसासारख्या पिकात शेंड्याची वाढ खुंटणे व पानांवर पिवळे पट्टे पडणे अशी लक्षणे दिसतात."
                rec["action_guidance"] = "Apply Zinc Sulphate (20-25 kg/ha) to soil during final land preparation, or foliar spray Zinc Sulphate (0.5%) with lime water."
                rec["action_guidance_mr"] = "जमिनीत २५ किलो झिंक सल्फेट प्रति हेक्टर टाकावे किंवा ०.५% झिंक सल्फेटची फवारणी करावी."
            elif key == "iron":
                rec["what_it_means"] = "Iron deficiency causes yellowing of young top leaves while veins remain green (lime-induced chlorosis common in calcareous soils)."
                rec["what_it_means_mr"] = "लोहाच्या कमतरतेमुळे कोवळी पाने पिवळी पडतात, विशेषतः चुनखडीयुक्त जमिनीत हा त्रास जास्त आढळतो."
                rec["action_guidance"] = "Foliar spray Ferrous Sulphate (0.5-1.0%) with citric acid during early vegetative stage. Avoid broadcasting directly into high-lime soil."
                rec["action_guidance_mr"] = "०.५% फेरस सल्फेट आणि किंचित सायट्रिक ॲसिडची फवारणी कोवळ्या पानांवर करावी."
            elif key == "boron":
                rec["what_it_means"] = "Boron deficiency impairs pollen viability, resulting in poor fruit set and hollow stem in vegetables/pulses."
                rec["what_it_means_mr"] = "बोरॉनच्या कमतरतेमुळे परागीभवनावर परिणाम होऊन फळधारणा कमी होते."
                rec["action_guidance"] = "Apply Borax (10 kg/ha) to soil or foliar spray Solubor (0.1-0.2%) at pre-flowering stage."
                rec["action_guidance_mr"] = "जमिनीत १० किलो बोरॅक्स टाकावे किंवा फुलोऱ्यापूर्वी ०.१ ते ०.२% सोल्यूबोरची फवारणी करावी."
            elif key == "sulphur":
                rec["what_it_means"] = "Sulphur deficiency reduces oil content in oilseeds and protein synthesis in pulses."
                rec["what_it_means_mr"] = "गंधकाच्या कमतरतेमुळे तेलबिया पिकांतील तेलाचे प्रमाण आणि डाळींमधील प्रथिनांचे प्रमाण घटते."
                rec["action_guidance"] = "Apply elemental sulphur or gypsum (200 kg/ha), or choose Single Super Phosphate (SSP) as the phosphorus source."
                rec["action_guidance_mr"] = "जमिनीत गंधक किंवा जिप्सम वापरावे, किंवा स्फुरदासाठी सिंगल सुपर फॉस्फेट (SSP) खत निवडावे."
            else:
                rec["what_it_means"] = f"Low {title_en} level may restrict complete expression of crop yield potential."
                rec["what_it_means_mr"] = f"{title_mr} कमी असल्यामुळे पिकांची पूर्ण उत्पादन क्षमता साधणे कठीण होऊ शकते."
                rec["action_guidance"] = f"Apply recommended micronutrient mixtures or foliar sprays based on crop advisory."
                rec["action_guidance_mr"] = f"कृषी तज्ज्ञांच्या सल्ल्याने शिफारशीत सूक्ष्म अन्नद्रव्य मिश्रणाचा वापर करावा."
        else:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"{title_en} is {value:.2f} {unit}, classified as sufficient."
            rec["what_observed_mr"] = f"{title_mr} {value:.2f} {unit} आहे, जे पुरेसे (सफिशियंट) आहे."
            rec["what_it_means"] = "Adequate reserves ensure unimpeded enzyme activity and crop metabolism."
            rec["what_it_means_mr"] = "पुरेसा साठा उपलब्ध असल्याने पिकांच्या वाढीवर कोणताही विपरीत परिणाम होणार नाही."
            rec["action_guidance"] = "No additional chemical application needed for this micronutrient. Regular organic manuring will maintain this balance."
            rec["action_guidance_mr"] = "या सूक्ष्म अन्नद्रव्यासाठी अतिरिक्त खताची गरज नाही. नियमित सेंद्रिय खतांचा वापर सुरू ठेवा."

    # 8. Free Lime (CaCO3) & Exchangeable Sodium (ESP)
    elif key in ["free_lime", "exchangeable_sodium"]:
        if key == "free_lime":
            rec["why_it_matters"] = "Excess free lime (calcium carbonate) precipitates phosphorus, iron, and zinc into insoluble forms."
            rec["why_it_matters_mr"] = "जास्त मुक्त चुनखडीमुळे स्फुरद, लोह आणि जस्त ही अन्नद्रव्ये अविद्राव्य होऊन पिकांना मिळत नाहीत."
            if value > 10.0:
                rec["priority"] = "MODERATE"
                rec["priority_key"] = "moderate"
                rec["needs_attention"] = True
                rec["what_observed"] = f"Free Lime is {value:.1f}%, indicating high calcareous nature."
                rec["what_observed_mr"] = f"मुक्त चुनखडी {value:.1f}% आहे, जी जास्त चुनखडीयुक्त जमीन दर्शवते."
                rec["what_it_means"] = "Phosphorus and micronutrients become fixed; risk of iron chlorosis is heightened."
                rec["what_it_means_mr"] = "अन्नद्रव्यांचे स्थिरीकरण होऊन पानांवर पिवळेपणा येण्याचा धोका असतो."
                rec["action_guidance"] = "Apply organic manures, sulphur, or press mud. Prefer foliar nutrition for iron and zinc rather than soil application."
                rec["action_guidance_mr"] = "सेंद्रिय खते, कंपोस्ट किंवा प्रेसमड वापरा. लोह व जस्तासाठी जमिनीत खत देण्याऐवजी फवारणीचा मार्ग निवडा."
            else:
                rec["priority"] = "INFORMATION"
                rec["priority_key"] = "info"
                rec["needs_attention"] = False
                rec["what_observed"] = f"Free Lime is {value:.1f}%, within acceptable range."
                rec["what_observed_mr"] = f"मुक्त चुनखडी {value:.1f}% आहे, जी योग्य मर्यादेत आहे."
                rec["what_it_means"] = "Calcium carbonate concentration is manageable."
                rec["what_it_means_mr"] = "चुनखडीचे प्रमाण मर्यादित आहे."
                rec["action_guidance"] = "Continue standard agronomic practices."
                rec["action_guidance_mr"] = "नियमित शेती पद्धती सुरू ठेवा."
        else:
            rec["why_it_matters"] = "Exchangeable Sodium Percentage (ESP) measures sodium saturation on soil clays, which degrades soil physical structure."
            rec["why_it_matters_mr"] = "विनिमययोग्य सोडियम (ESP) मातीची भौतिक रचना, पाणी मुरण्याची गती आणि हवा खेळती राहणे यावर परिणाम करतो."
            if value > 15.0:
                rec["priority"] = "HIGH PRIORITY"
                rec["priority_key"] = "high"
                rec["needs_attention"] = True
                rec["what_observed"] = f"ESP is {value:.1f}%, indicating sodic / alkali soil condition."
                rec["what_observed_mr"] = f"सोडियमचे प्रमाण {value:.1f}% आहे, जे समस्याग्रस्त चोपण जमीन दर्शवते."
                rec["what_it_means"] = "Soil particles disperse when wet, creating a hard crust when dry with very poor water drainage."
                rec["what_it_means_mr"] = "जमीन ओली असताना चिकट होते व वाळल्यावर टणक भेगा पडतात, पाण्याचा निचरा होत नाही."
                rec["action_guidance"] = "Apply agricultural gypsum based on gypsum requirement tests. Ensure proper drainage and incorporate organic residues."
                rec["action_guidance_mr"] = "माती चाचणीनुसार शेतात कृषी जिप्सम वापरा आणि पाण्याचा निचरा करणारी व्यवस्था करा."
            else:
                rec["priority"] = "INFORMATION"
                rec["priority_key"] = "info"
                rec["needs_attention"] = False
                rec["what_observed"] = f"ESP is {value:.1f}%, within safe non-sodic limits."
                rec["what_observed_mr"] = f"सोडियमचे प्रमाण {value:.1f}% आहे, जे सुरक्षित मर्यादेत आहे."
                rec["what_it_means"] = "Soil structure and drainage properties are sound."
                rec["what_it_means_mr"] = "मातीची भौतिक रचना व निचरा चांगला आहे."
                rec["action_guidance"] = "Maintain good drainage to avoid sodium accumulation from irrigation water."
                rec["action_guidance_mr"] = "पाण्याचा निचरा चांगला ठेवा जेणेकरून भविष्यात सोडियम साचणार नाही."

    # 9. Bulk Density (BD)
    elif key in ["bd", "bulk_density"]:
        rec["why_it_matters"] = "Bulk density indicates soil compaction, root aeration, and water infiltration resistance in Vertisols."
        rec["why_it_matters_mr"] = "मातीची घनता मुळांची वाढ, हवा खेळती राहणे आणि पाणी मुरण्याची क्षमता दर्शवते."
        if value > 1.60:
            rec["priority"] = "HIGH PRIORITY"
            rec["priority_key"] = "high"
            rec["needs_attention"] = True
            rec["what_observed"] = f"Bulk density is {value:.3f} g/cm³, indicating compacted soil layers."
            rec["what_observed_mr"] = f"मातीची घनता {value:.3f} g/cm³ आहे, जी जमीन घट्ट (कॉम्पॅक्ट) झाल्याचे दर्शवते."
            rec["what_it_means"] = "High compaction limits crop root growth, restricts aeration, and elevates waterlogging risks."
            rec["what_it_means_mr"] = "मुळांच्या वाढीस अडथळा येतो आणि पावसाळ्यात पाणी साचून राहण्याचा धोका वाढतो."
            rec["action_guidance"] = "Perform deep summer subsoiling or ripping. Incorporate green manure (Sunnhemp) or compost to reduce compaction."
            rec["action_guidance_mr"] = "उन्हाळ्यात खोल नांगरट किंवा सबसॉयलरचा वापर करा. ताग किंवा धैंचाचे हिरवळीचे खत जमिनीत गाडून सेंद्रिय कर्ब वाढवा."
        else:
            rec["priority"] = "INFORMATION"
            rec["priority_key"] = "info"
            rec["needs_attention"] = False
            rec["what_observed"] = f"Bulk density is {value:.3f} g/cm³, representing moderate, healthy density for Deccan Vertisols."
            rec["what_observed_mr"] = f"मातीची घनता {value:.3f} g/cm³ आहे, जी काळ्या जमिनीसाठी योग्य व मध्यम मर्यादेत आहे."
            rec["what_it_means"] = "Good balance of soil particle packing for moisture conservation and root stability."
            rec["what_it_means_mr"] = "मातीची रचना पिकांच्या मुळांसाठी व ओलावा टिकवण्यासाठी अनुकूल आहे."
            rec["action_guidance"] = "Maintain minimum tillage and retain crop residues on surface to preserve soil structure."
            rec["action_guidance_mr"] = "कमीतकमी मशागत पद्धत अवलंबा आणि शेतात पाचट किंवा सेंद्रिय आच्छादन ठेवा."

    return rec


def get_concise_parameter_recommendation(
    key: str,
    value: Optional[float],
    interpretation_en: str = "",
    interpretation_mr: str = ""
) -> Dict[str, Any]:
    """Returns a short, farmer-friendly recommendation, status category, and priority ranking
    for tabular display in the Soil Health Card, Soil Sample Test Report, and PDF.
    
    Status Categories: OPTIMAL, GOOD, LOW, MEDIUM, HIGH, VERY HIGH, CRITICAL, NOT AVAILABLE
    Priority Rank: 1 (Critical), 2 (Low), 3 (High), 4 (Medium), 5 (Optimal), 6 (Not Available)
    """
    if value is None:
        return {
            "status_category": "NOT AVAILABLE",
            "priority_rank": 6,
            "priority_key": "info",
            "recommendation": "Recommendation unavailable because this parameter has no valid test value.",
            "recommendation_mr": "या घटकाची वैध चाचणी नोंद उपलब्ध नसल्याने शिफारस उपलब्ध नाही.",
        }

    k = key.lower()
    interp_en = (interpretation_en or "").lower()

    # 1. Soil pH
    if k in ["ph", "soil_reaction"]:
        if value < 6.5:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "high" if value < 5.5 else "moderate",
                "recommendation": "Consider soil-specific amelioration practices only according to the configured soil test recommendation. Avoid applying amendments without a validated requirement.",
                "recommendation_mr": "माती चाचणीच्या शिफारशीनुसारच आवश्यकतेनुसार जमीन सुधारक वापरा. प्रमाणीकरणाशिवाय अतिरिक्त भूसुधारके वापरणे टाळा.",
            }
        elif value <= 7.8:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "No major pH correction indicated from this result. Maintain balanced nutrient management and continue periodic soil testing.",
                "recommendation_mr": "सामू संतुलित असल्याने कोणत्याही मोठ्या दुरुस्तीची गरज नाही. संतुलित खत व्यवस्थापन आणि नियमित माती परीक्षण सुरू ठेवा.",
            }
        else:
            return {
                "status_category": "HIGH" if value > 8.5 else "MEDIUM",
                "priority_rank": 3 if value > 8.5 else 4,
                "priority_key": "high" if value > 8.5 else "moderate",
                "recommendation": "Consider soil-specific nutrient and soil management practices based on the soil test and crop requirement. Do not apply amendments without a validated recommendation.",
                "recommendation_mr": "माती परीक्षण आणि पिकाच्या गरजेनुसार खत व जमीन व्यवस्थापन ठेवा. शिफारशीशिवाय अतिरिक्त घटक टाळणे योग्य.",
            }

    # 2. Electrical Conductivity (EC)
    elif k in ["ec", "electrical_conductivity"]:
        if value < 1.0:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "Electrical conductivity is within the configured safe range. Maintain appropriate irrigation and nutrient management.",
                "recommendation_mr": "विद्युत वाहकता सुरक्षित मर्यादेत आहे. योग्य सिंचन आणि संतुलित खत व्यवस्थापन सुरू ठेवा.",
            }
        elif value <= 2.0:
            return {
                "status_category": "HIGH",
                "priority_rank": 3,
                "priority_key": "moderate",
                "recommendation": "Monitor salinity risk and maintain appropriate irrigation and drainage practices.",
                "recommendation_mr": "क्षारतेच्या जोखमीवर लक्ष ठेवा आणि शेतातून पाण्याचा योग्य निचरा ठेवा.",
            }
        else:
            return {
                "status_category": "CRITICAL",
                "priority_rank": 1,
                "priority_key": "high",
                "recommendation": "Further assessment of soil and irrigation-water salinity is recommended before selecting corrective practices.",
                "recommendation_mr": "कोणतीही सुधारणा पद्धत निवडण्यापूर्वी माती आणि सिंचन पाण्याच्या क्षारतेची पुढील तपासणी करावी.",
            }

    # 3. Organic Carbon
    elif k in ["organic_carbon", "soc"]:
        if value <= 0.50:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "high",
                "recommendation": "Improve soil organic matter through appropriate residue management, compost/FYM or other locally suitable organic inputs according to the farm plan.",
                "recommendation_mr": "पिकांचे अवशेष, शेणखत किंवा कंपोस्टच्या योग्य वापराद्वारे सेंद्रिय कर्ब वाढवण्यावर भर द्या.",
            }
        elif value <= 0.75:
            return {
                "status_category": "MEDIUM",
                "priority_rank": 4,
                "priority_key": "moderate",
                "recommendation": "Maintain organic matter through residue retention, appropriate organic inputs and balanced nutrient management.",
                "recommendation_mr": "पिकांचे अवशेष जमिनीत गाडून आणि संतुलित सेंद्रिय खतांचा वापर करून सेंद्रिय कर्ब टिकवून ठेवा.",
            }
        else:
            return {
                "status_category": "VERY HIGH" if value > 1.20 else "HIGH",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "Maintain organic matter and avoid unnecessary additional amendments solely to increase SOC.",
                "recommendation_mr": "सेंद्रिय कर्बाचा सध्याचा चांगला साठा टिकवून ठेवा; केवळ कर्ब वाढवण्यासाठी अनावश्यक खते टाळा.",
            }

    # 4. Available Nitrogen (N)
    elif k in ["available_nitrogen", "nitrogen"]:
        if value < 280:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "high",
                "recommendation": "Nitrogen status is low. Follow the field-specific soil-test-based nutrient recommendation and consider integrated nutrient management.",
                "recommendation_mr": "नत्राचे प्रमाण कमी आहे. शेताच्या माती चाचणीनुसार शिफारशीत खत मात्रा विभागून द्या व एकात्मिक पोषण व्यवस्थापन ठेवा.",
            }
        elif value <= 420:
            return {
                "status_category": "MEDIUM",
                "priority_rank": 4,
                "priority_key": "info",
                "recommendation": "Maintain balanced nitrogen management based on crop requirement and soil testing.",
                "recommendation_mr": "पिकाच्या गरजेनुसार व माती चाचणीनुसार संतुलित नत्र व्यवस्थापन ठेवा.",
            }
        else:
            return {
                "status_category": "HIGH",
                "priority_rank": 3,
                "priority_key": "moderate",
                "recommendation": "Avoid unnecessary additional nitrogen application and follow the crop-specific soil-test-based recommendation.",
                "recommendation_mr": "अनावश्यक अतिरिक्त नत्र खत देणे टाळा आणि पीक गरजेनुसारच खतांचा वापर करा.",
            }

    # 5. Available Phosphorus (P)
    elif k in ["available_phosphorus", "phosphorus"]:
        if value < 14.0:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "high",
                "recommendation": "Phosphorus status is low. Follow the field-specific soil-test-based phosphorus recommendation.",
                "recommendation_mr": "स्फुरदाचे प्रमाण कमी आहे. शेताच्या माती चाचणीनुसार शिफारशीत स्फुरद खत मुळांच्या सानिध्यात द्या.",
            }
        elif value <= 28.0:
            return {
                "status_category": "MEDIUM",
                "priority_rank": 4,
                "priority_key": "info",
                "recommendation": "Maintain balanced phosphorus application based on crop requirement and soil testing.",
                "recommendation_mr": "पिकाच्या गरजेनुसार संतुलित स्फुरद खत व्यवस्थापन ठेवा.",
            }
        else:
            return {
                "status_category": "HIGH",
                "priority_rank": 3,
                "priority_key": "info",
                "recommendation": "Avoid unnecessary phosphorus application until further soil testing indicates a requirement.",
                "recommendation_mr": "जमिनीत स्फुरद पुरेसे असल्याने पुढील माती चाचणी होईपर्यंत अनावश्यक स्फुरद खतांचा वापर टाळा.",
            }

    # 6. Available Potassium (K)
    elif k in ["available_potassium", "potassium"]:
        if value < 150.0:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "high",
                "recommendation": "Potassium status is low. Follow the field-specific soil-test-based potassium recommendation.",
                "recommendation_mr": "पालाशचे प्रमाण कमी आहे. शेताच्या माती चाचणीनुसार शिफारशीत पालाश खताचा वापर करा.",
            }
        elif value <= 250.0:
            return {
                "status_category": "MEDIUM",
                "priority_rank": 4,
                "priority_key": "info",
                "recommendation": "Maintain balanced potassium management according to crop requirement.",
                "recommendation_mr": "पिकाच्या गरजेनुसार संतुलित पालाश व्यवस्थापन ठेवा.",
            }
        else:
            return {
                "status_category": "VERY HIGH" if value > 300 else "HIGH",
                "priority_rank": 3,
                "priority_key": "moderate",
                "recommendation": "Avoid unnecessary potassium application and continue monitoring through soil testing.",
                "recommendation_mr": "पालाशचा मुबलक साठा असल्याने अनावश्यक पालाश खतांचा खर्च टाळा आणि माती चाचणीद्वारे लक्ष ठेवा.",
            }

    # 7. Micronutrients: Iron, Zinc, Manganese, Copper, Boron
    elif k in ["zinc", "iron", "manganese", "copper", "boron"]:
        is_deficient = "deficient" in interp_en or "low" in interp_en or "कमतरता" in interpretation_mr
        is_high = "high" in interp_en or "जास्त" in interpretation_mr
        if is_deficient:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "high" if k in ["zinc", "iron"] else "moderate",
                "recommendation": "The nutrient level is below the configured reference range. Follow the soil-test-based micronutrient recommendation.",
                "recommendation_mr": "या सूक्ष्मअन्नद्रव्याचे प्रमाण आवश्यकतेपेक्षा कमी आहे. माती चाचणीनुसार शिफारशीत सूक्ष्मअन्नद्रव्य मात्रा द्या.",
            }
        elif is_high:
            return {
                "status_category": "HIGH",
                "priority_rank": 3,
                "priority_key": "info",
                "recommendation": "Avoid unnecessary additional application of this micronutrient and monitor future soil tests.",
                "recommendation_mr": "या सूक्ष्मअन्नद्रव्याचा अतिरिक्त वापर टाळा आणि पुढील चाचणीपर्यंत निरीक्षण ठेवा.",
            }
        else:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "The nutrient level is within the configured range. Maintain balanced nutrient management.",
                "recommendation_mr": "हे सूक्ष्मअन्नद्रव्य योग्य पातळीत आहे. संतुलित पोषण व्यवस्थापन सुरू ठेवा.",
            }

    # 8. Sulphur
    elif k in ["sulphur", "sulfur"]:
        if value < 10.0 or "deficient" in interp_en or "low" in interp_en:
            return {
                "status_category": "LOW",
                "priority_rank": 2,
                "priority_key": "moderate",
                "recommendation": "Sulphur status is low. Follow the field-specific soil-test-based sulphur recommendation.",
                "recommendation_mr": "गंधकाचे प्रमाण कमी आहे. शेताच्या माती चाचणीनुसार शिफारशीत गंधक खताचा वापर करा.",
            }
        elif value > 25.0:
            return {
                "status_category": "HIGH",
                "priority_rank": 3,
                "priority_key": "info",
                "recommendation": "Avoid unnecessary additional sulphur application until further soil testing indicates a requirement.",
                "recommendation_mr": "अतिरिक्त गंधक देणे टाळा आणि पुढील माती चाचणीनुसार नियोजन करा.",
            }
        else:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "Maintain balanced nutrient management.",
                "recommendation_mr": "गंधक पुरेसे आहे. संतुलित पोषण व्यवस्थापन कायम ठेवा.",
            }

    # 9. Exchangeable Sodium Percentage (ESP)
    elif k in ["exchangeable_sodium", "esp"]:
        if value > 15.0:
            return {
                "status_category": "CRITICAL",
                "priority_rank": 1,
                "priority_key": "high",
                "recommendation": "Monitor sodicity risk and follow a soil- and water-test-based reclamation recommendation where required.",
                "recommendation_mr": "चोपण जमिनीचा धोका टाळण्यासाठी माती व पाणी चाचणीनुसार शिफारशीत सुधारणा पद्धतींचा वापर करा.",
            }
        else:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "Exchangeable sodium is within the safe range. Maintain appropriate drainage.",
                "recommendation_mr": "सोडियमचे प्रमाण सुरक्षित मर्यादेत आहे. शेतातील पाण्याचा निचरा योग्य ठेवा.",
            }

    # 10. Free Lime (CaCO3)
    elif k in ["free_lime", "caco3"]:
        if value > 10.0:
            return {
                "status_category": "MEDIUM",
                "priority_rank": 4,
                "priority_key": "moderate",
                "recommendation": "Interpretation should be considered together with soil reaction and crop requirements; consider organic inputs and foliar nutrition.",
                "recommendation_mr": "चुनखडीचे प्रमाण जास्त असल्याने सेंद्रिय खतांचा वापर वाढवा व अन्नद्रव्यांसाठी फवारणीचा मार्ग विचारात घ्या.",
            }
        else:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "Interpretation should be considered together with soil reaction and crop requirements.",
                "recommendation_mr": "मुक्त चुनखडी योग्य मर्यादेत आहे. नियमित संतुलित शेती पद्धती सुरू ठेवा.",
            }

    # 11. Bulk Density
    elif k in ["bd", "bulk_density"]:
        if value > 1.60:
            return {
                "status_category": "HIGH",
                "priority_rank": 3,
                "priority_key": "high",
                "recommendation": "Soil density is elevated; consider deep subsoiling and organic residue incorporation to relieve compaction.",
                "recommendation_mr": "माती घट्ट झाल्याचे दिसते; खोल नांगरट व सेंद्रिय घटकांचा वापर करून मातीची रचना सुधारा.",
            }
        else:
            return {
                "status_category": "OPTIMAL",
                "priority_rank": 5,
                "priority_key": "info",
                "recommendation": "Soil physical condition and density are favorable for root penetration and moisture retention.",
                "recommendation_mr": "मातीची भौतिक घनता योग्य असून मुळांची वाढ व ओलावा टिकवण्यासाठी अनुकूल आहे.",
            }

    # Fallback
    return {
        "status_category": "GOOD",
        "priority_rank": 5,
        "priority_key": "info",
        "recommendation": "Maintain balanced nutrient management and continue periodic soil testing.",
        "recommendation_mr": "संतुलित खत व्यवस्थापन आणि नियमित माती चाचणी सुरू ठेवा.",
    }


def get_ranked_key_recommendations(parameters: List[Dict[str, Any]], max_items: int = 5) -> List[Dict[str, Any]]:
    """Rank recommendations internally by priority:
    1. Critical
    2. Low
    3. High
    4. Medium
    5. Optimal
    
    Returns the top most relevant recommendations dynamically generated from actual soil data.
    """
    ranked_list = []
    seen_keys = set()

    for p in parameters:
        key = p.get("key") or p.get("parameter_key") or ""
        if key in seen_keys:
            continue
        val = p.get("value")
        interp_en = p.get("interpretation") or p.get("interpretation_en") or ""
        interp_mr = p.get("interpretation_mr") or interp_en
        name = p.get("name") or p.get("parameter_name") or key
        name_mr = p.get("name_mr") or p.get("parameter_name_mr") or name

        rec_meta = get_concise_parameter_recommendation(key, val, interp_en, interp_mr)
        seen_keys.add(key)

        ranked_list.append({
            "key": key,
            "name": name,
            "parameter": name,
            "name_mr": name_mr,
            "value": val,
            "unit": p.get("unit", ""),
            "status": rec_meta["status_category"],
            "status_category": rec_meta["status_category"],
            "priority_rank": rec_meta["priority_rank"],
            "priority_key": rec_meta["priority_key"],
            "recommendation": rec_meta["recommendation"],
            "recommendation_mr": rec_meta["recommendation_mr"],
        })

    # Sort strictly by priority_rank (1=Critical, 2=Low, 3=High, 4=Medium, 5=Optimal)
    ranked_list.sort(key=lambda x: (x["priority_rank"], x["key"]))

    return ranked_list[:max_items]

