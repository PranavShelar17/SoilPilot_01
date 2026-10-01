/**
 * SoilPilot — Client-Side Soil Recommendation Engine
 *
 * Mirrors the backend recommendation_engine.py logic so that the
 * Recommendations page and Soil Health Card always show parameter-specific,
 * data-driven recommendations — even if the backend API is momentarily
 * unavailable.
 *
 * Architecture:
 *   Soil observation → parameter normalization → reference range →
 *   status → recommendation rule → farmer-friendly recommendation
 *
 * Recommendation basis: soil-test-based balanced/integrated nutrient
 * management principles (standard agronomic guidance, not ICAR-certified).
 */

export type StatusCategory =
  | 'OPTIMAL'
  | 'GOOD'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY HIGH'
  | 'CRITICAL'
  | 'NOT AVAILABLE';

export type PriorityKey = 'high' | 'moderate' | 'info';

export interface ParameterRec {
  status_category: StatusCategory;
  priority_rank: number; // 1=Critical, 2=Low, 3=High, 4=Medium, 5=Optimal
  priority_key: PriorityKey;
  recommendation: string;
  recommendation_mr: string;
}

// ---------------------------------------------------------------------------
// CORE PER-PARAMETER RECOMMENDATION ENGINE
// ---------------------------------------------------------------------------
export function getConciseParameterRecommendation(
  key: string,
  value: number | null | undefined,
  interpretationEn: string = '',
  interpretationMr: string = '',
): ParameterRec {
  if (value === null || value === undefined) {
    return {
      status_category: 'NOT AVAILABLE',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Recommendation unavailable because the required soil value is not available.',
      recommendation_mr:
        'या घटकाचे मूल्य उपलब्ध नसल्यामुळे शिफारस देणे शक्य नाही.',
    };
  }

  const k = (key || '').toLowerCase();
  const lowerInterp = interpretationEn.toLowerCase();

  // ── 1. Soil pH ─────────────────────────────────────────────────────────
  if (k === 'ph' || k === 'soil_ph') {
    if (value < 6.5) {
      return {
        status_category: 'LOW',
        priority_rank: 3,
        priority_key: 'high',
        recommendation:
          'Soil reaction is acidic. Consider soil-specific amelioration practices according to the configured soil test recommendation. Avoid applying amendments without a validated requirement.',
        recommendation_mr:
          'मातीचा सामू आम्लधर्मी आहे. माती परीक्षणाधारित शिफारसीनुसार योग्य उपाय करा. प्रमाण निश्चित करणे आवश्यक आहे.',
      };
    }
    if (value <= 7.5) {
      return {
        status_category: 'OPTIMAL',
        priority_rank: 5,
        priority_key: 'info',
        recommendation:
          'Soil reaction is neutral and optimal. No major pH correction is indicated from this result. Maintain balanced nutrient management and continue periodic soil testing.',
        recommendation_mr:
          'मातीचा सामू उदासीन व योग्य आहे. सध्या कोणताही मोठा बदल आवश्यक नाही. संतुलित खत व्यवस्थापन सुरू ठेवा.',
      };
    }
    if (value <= 8.5) {
      return {
        status_category: 'MEDIUM',
        priority_rank: 4,
        priority_key: 'moderate',
        recommendation:
          'Soil reaction is moderately alkaline. Consider soil-specific nutrient and soil management practices based on the soil test and crop requirement. Do not apply amendments without a validated recommendation.',
        recommendation_mr:
          'मातीचा सामू मध्यम अल्कधर्मी आहे. माती परीक्षणाधारित शेत-विशिष्ट उपाय करा. प्रमाण निश्चित केल्याशिवाय संशोधन करू नका.',
      };
    }
    return {
      status_category: 'CRITICAL',
      priority_rank: 1,
      priority_key: 'high',
      recommendation:
        'Soil reaction is strongly alkaline. Further assessment of soil and irrigation-water quality is recommended before selecting reclamation practices.',
      recommendation_mr:
        'मातीचा सामू अत्यंत अल्कधर्मी आहे. जमीन सुधारणा उपाय निवडण्यापूर्वी माती व सिंचन पाण्याची तपासणी करा.',
    };
  }

  // ── 2. Electrical Conductivity (EC) ────────────────────────────────────
  if (k === 'ec' || k === 'electrical_conductivity') {
    if (value <= 1.0) {
      return {
        status_category: 'OPTIMAL',
        priority_rank: 5,
        priority_key: 'info',
        recommendation:
          'Electrical conductivity is within the configured safe range. Maintain appropriate irrigation and nutrient management.',
        recommendation_mr:
          'विद्युत वाहकता सुरक्षित श्रेणीत आहे. योग्य सिंचन आणि खत व्यवस्थापन सुरू ठेवा.',
      };
    }
    if (value <= 2.0) {
      return {
        status_category: 'MEDIUM',
        priority_rank: 4,
        priority_key: 'moderate',
        recommendation:
          'Electrical conductivity is slightly elevated. Monitor salinity risk and maintain appropriate irrigation and drainage practices.',
        recommendation_mr:
          'विद्युत वाहकता किंचित जास्त आहे. क्षारतेची जोखीम लक्षात घेऊन सिंचन आणि पाणी निचऱ्याचे व्यवस्थापन करा.',
      };
    }
    return {
      status_category: 'CRITICAL',
      priority_rank: 1,
      priority_key: 'high',
      recommendation:
        'Electrical conductivity indicates elevated salinity risk. Further assessment of soil and irrigation-water salinity is recommended before selecting corrective practices.',
      recommendation_mr:
        'विद्युत वाहकता क्षारतेचा धोका दर्शविते. योग्य उपाययोजना निवडण्यापूर्वी माती व सिंचन पाण्याची क्षारता तपासणी करा.',
    };
  }

  // ── 3. Organic Carbon ───────────────────────────────────────────────────
  if (k === 'organic_carbon' || k === 'soc') {
    if (value < 0.5) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Organic carbon is low. Improve soil organic matter through appropriate residue management, compost, FYM, or other locally suitable organic inputs according to the farm plan.',
        recommendation_mr:
          'सेंद्रिय कर्ब कमी आहे. पीक अवशेष व्यवस्थापन, कंपोस्ट किंवा शेणखताच्या नियमित वापराने सेंद्रिय घटक वाढवा.',
      };
    }
    if (value <= 0.75) {
      return {
        status_category: 'MEDIUM',
        priority_rank: 4,
        priority_key: 'moderate',
        recommendation:
          'Organic carbon is in the medium range. Maintain organic matter through residue retention, appropriate organic inputs, and balanced nutrient management.',
        recommendation_mr:
          'सेंद्रिय कर्ब मध्यम प्रमाणात आहे. पीक अवशेष जाळू नका आणि सेंद्रिय घटकांचा नियमित वापर करा.',
      };
    }
    if (value <= 1.5) {
      return {
        status_category: 'HIGH',
        priority_rank: 5,
        priority_key: 'info',
        recommendation:
          'Organic carbon is high. Maintain the existing organic matter status and avoid unnecessary additions solely to increase organic carbon.',
        recommendation_mr:
          'सेंद्रिय कर्ब उत्तम आहे. सध्याच्या शेती पद्धती सुरू ठेवा आणि अनावश्यक अतिरिक्त खते टाळा.',
      };
    }
    return {
      status_category: 'VERY HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Organic carbon is very high. Maintain organic matter and avoid unnecessary additional amendments solely to increase an already high value.',
      recommendation_mr:
        'सेंद्रिय कर्ब अत्यंत उत्तम आहे. अतिरिक्त सेंद्रिय खतांचा अनावश्यक वापर टाळा.',
    };
  }

  // ── 4. Available Nitrogen ───────────────────────────────────────────────
  if (k === 'available_nitrogen' || k === 'nitrogen') {
    if (value < 280) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Nitrogen status is low. Follow the field-specific soil-test-based nutrient recommendation and consider integrated nutrient management using appropriate organic and inorganic nutrient sources.',
        recommendation_mr:
          'उपलब्ध नत्र कमी आहे. माती परीक्षणाधारित शेत-विशिष्ट खत शिफारस पाळा आणि सेंद्रिय व रासायनिक नत्राचे एकात्मिक व्यवस्थापन करा.',
      };
    }
    if (value <= 560) {
      return {
        status_category: 'MEDIUM',
        priority_rank: 4,
        priority_key: 'moderate',
        recommendation:
          'Nitrogen status is in the medium range. Maintain balanced nitrogen management based on crop requirement and soil testing.',
        recommendation_mr:
          'उपलब्ध नत्र मध्यम प्रमाणात आहे. पिकाच्या गरजेनुसार संतुलित नत्र व्यवस्थापन ठेवा.',
      };
    }
    return {
      status_category: 'HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Nitrogen status is high. Avoid unnecessary additional nitrogen application and follow the crop-specific soil-test-based recommendation.',
        recommendation_mr:
        'उपलब्ध नत्र जास्त आहे. अनावश्यक अतिरिक्त नत्र वापर टाळा आणि पीक-विशिष्ट शिफारसीनुसार व्यवस्थापन करा.',
    };
  }

  // ── 5. Available Phosphorus ─────────────────────────────────────────────
  if (k === 'available_phosphorus' || k === 'phosphorus') {
    if (value < 11) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Phosphorus status is low. Follow the field-specific soil-test-based phosphorus recommendation.',
        recommendation_mr:
          'उपलब्ध स्फुरद कमी आहे. माती परीक्षणाधारित स्फुरद खत शिफारस पाळा.',
      };
    }
    if (value <= 22) {
      return {
        status_category: 'MEDIUM',
        priority_rank: 4,
        priority_key: 'moderate',
        recommendation:
          'Phosphorus status is in the medium range. Maintain balanced phosphorus application based on crop requirement and soil testing.',
        recommendation_mr:
          'उपलब्ध स्फुरद मध्यम प्रमाणात आहे. पिकाच्या गरजेनुसार संतुलित स्फुरद व्यवस्थापन ठेवा.',
      };
    }
    return {
      status_category: 'HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Phosphorus status is high. Avoid unnecessary phosphorus application until further soil testing indicates a requirement.',
      recommendation_mr:
        'उपलब्ध स्फुरद जास्त आहे. पुढील माती चाचणीशिवाय अतिरिक्त स्फुरद वापर टाळा.',
    };
  }

  // ── 6. Available Potassium ──────────────────────────────────────────────
  if (k === 'available_potassium' || k === 'potassium') {
    if (value < 108) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Potassium status is low. Follow the field-specific soil-test-based potassium recommendation.',
        recommendation_mr:
          'उपलब्ध पालाश कमी आहे. माती परीक्षणाधारित पालाश खत शिफारस पाळा.',
      };
    }
    if (value <= 280) {
      return {
        status_category: 'MEDIUM',
        priority_rank: 4,
        priority_key: 'moderate',
        recommendation:
          'Potassium status is in the medium range. Maintain balanced potassium management according to crop requirement.',
        recommendation_mr:
          'उपलब्ध पालाश मध्यम प्रमाणात आहे. पिकाच्या गरजेनुसार संतुलित पालाश व्यवस्थापन ठेवा.',
      };
    }
    return {
      status_category: 'HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Potassium status is high. Avoid unnecessary potassium application and continue monitoring through soil testing.',
      recommendation_mr:
        'उपलब्ध पालाश जास्त आहे. अनावश्यक पालाश वापर टाळा आणि नियमित माती चाचणी सुरू ठेवा.',
    };
  }

  // ── 7. Exchangeable Sodium ──────────────────────────────────────────────
  if (k === 'exchangeable_sodium' || k === 'esp') {
    if (value < 15) {
      return {
        status_category: 'OPTIMAL',
        priority_rank: 5,
        priority_key: 'info',
        recommendation:
          'Exchangeable sodium is within the acceptable range. Maintain appropriate irrigation and nutrient management.',
        recommendation_mr:
          'विनिमययोग्य सोडियम योग्य मर्यादेत आहे. सिंचन आणि खत व्यवस्थापन सुरू ठेवा.',
      };
    }
    return {
      status_category: 'HIGH',
      priority_rank: 3,
      priority_key: 'high',
      recommendation:
        'Exchangeable sodium is elevated. Monitor sodicity risk and follow a soil- and water-test-based reclamation recommendation where required.',
      recommendation_mr:
        'विनिमययोग्य सोडियम जास्त आहे. सोडिकतेचा धोका लक्षात घेऊन माती व पाण्याच्या चाचणीवर आधारित सुधारणा उपाय करा.',
    };
  }

  // ── 8. Free Lime ────────────────────────────────────────────────────────
  if (k === 'free_lime' || k === 'caco3') {
    if (value <= 10) {
      return {
        status_category: 'OPTIMAL',
        priority_rank: 5,
        priority_key: 'info',
        recommendation:
          'Free lime content is within the configured acceptable range. Interpretation should be considered together with soil reaction and crop requirements.',
        recommendation_mr:
          'मुक्त चुनखडी योग्य मर्यादेत आहे. मातीचा सामू व पिकांच्या गरजांसह मूल्यांकन करा.',
      };
    }
    return {
      status_category: 'HIGH',
      priority_rank: 4,
      priority_key: 'moderate',
      recommendation:
        'Free lime content is elevated. Interpretation should be considered together with soil reaction and crop requirements. Consult local soil management guidance before any corrective treatment.',
      recommendation_mr:
        'मुक्त चुनखडी जास्त आहे. मातीचा सामू व पिकाची गरज लक्षात घेऊन स्थानिक कृषी तज्ञांशी सल्लामसलत करा.',
    };
  }

  // ── 9. Iron (Fe) ────────────────────────────────────────────────────────
  if (k === 'iron' || k === 'fe') {
    if (value < 4.5) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Available iron is below the configured reference range. Follow the soil-test-based micronutrient recommendation.',
        recommendation_mr:
          'उपलब्ध लोह संदर्भ श्रेणीपेक्षा कमी आहे. माती परीक्षणाधारित सूक्ष्म अन्नद्रव्य शिफारस पाळा.',
      };
    }
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Available iron is within the configured range. Maintain balanced nutrient management.',
      recommendation_mr:
        'उपलब्ध लोह योग्य श्रेणीत आहे. संतुलित खत व्यवस्थापन सुरू ठेवा.',
    };
  }

  // ── 10. Manganese (Mn) ──────────────────────────────────────────────────
  if (k === 'manganese' || k === 'mn') {
    if (value < 2.0) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Available manganese is below the configured reference range. Follow the soil-test-based micronutrient recommendation.',
        recommendation_mr:
          'उपलब्ध मँगनीज संदर्भ श्रेणीपेक्षा कमी आहे. माती परीक्षणाधारित सूक्ष्म अन्नद्रव्य शिफारस पाळा.',
      };
    }
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Available manganese is within the configured range. Maintain balanced nutrient management.',
      recommendation_mr:
        'उपलब्ध मँगनीज योग्य श्रेणीत आहे. संतुलित खत व्यवस्थापन सुरू ठेवा.',
    };
  }

  // ── 11. Zinc (Zn) ───────────────────────────────────────────────────────
  if (k === 'zinc' || k === 'zn') {
    if (value < 0.6) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Available zinc is below the configured reference range. Follow the soil-test-based zinc recommendation.',
        recommendation_mr:
          'उपलब्ध जस्त संदर्भ श्रेणीपेक्षा कमी आहे. माती परीक्षणाधारित जस्त सूक्ष्म अन्नद्रव्य शिफारस पाळा.',
      };
    }
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Available zinc is within the configured range. Maintain balanced nutrient management.',
      recommendation_mr:
        'उपलब्ध जस्त योग्य श्रेणीत आहे. संतुलित खत व्यवस्थापन सुरू ठेवा.',
    };
  }

  // ── 12. Copper (Cu) ─────────────────────────────────────────────────────
  if (k === 'copper' || k === 'cu') {
    if (value < 0.2) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Available copper is below the configured reference range. Follow the soil-test-based micronutrient recommendation.',
        recommendation_mr:
          'उपलब्ध तांबे संदर्भ श्रेणीपेक्षा कमी आहे. माती परीक्षणाधारित सूक्ष्म अन्नद्रव्य शिफारस पाळा.',
      };
    }
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Available copper is within the configured range. Maintain balanced nutrient management.',
      recommendation_mr:
        'उपलब्ध तांबे योग्य श्रेणीत आहे. संतुलित खत व्यवस्थापन सुरू ठेवा.',
    };
  }

  // ── 13. Sulphur (S) ─────────────────────────────────────────────────────
  if (k === 'sulphur' || k === 'sulfur' || k === 's') {
    if (value < 10) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Sulphur status is low. Follow the field-specific soil-test-based sulphur recommendation.',
        recommendation_mr:
          'उपलब्ध गंधक कमी आहे. माती परीक्षणाधारित गंधक शिफारस पाळा.',
      };
    }
    if (value <= 40) {
      return {
        status_category: 'OPTIMAL',
        priority_rank: 5,
        priority_key: 'info',
        recommendation:
          'Sulphur status is within the optimal range. Maintain balanced nutrient management.',
        recommendation_mr:
          'उपलब्ध गंधक योग्य श्रेणीत आहे. संतुलित खत व्यवस्थापन सुरू ठेवा.',
      };
    }
    return {
      status_category: 'HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Sulphur status is high. Avoid unnecessary additional sulphur application until further soil testing indicates a requirement.',
      recommendation_mr:
        'उपलब्ध गंधक जास्त आहे. पुढील माती चाचणीशिवाय अतिरिक्त गंधक वापर टाळा.',
    };
  }

  // ── 14. Boron (B) ───────────────────────────────────────────────────────
  if (k === 'boron' || k === 'b') {
    if (value < 0.5) {
      return {
        status_category: 'LOW',
        priority_rank: 2,
        priority_key: 'high',
        recommendation:
          'Available boron is below the configured reference range. Follow the soil-test-based micronutrient recommendation.',
        recommendation_mr:
          'उपलब्ध बोरॉन संदर्भ श्रेणीपेक्षा कमी आहे. माती परीक्षणाधारित सूक्ष्म अन्नद्रव्य शिफारस पाळा.',
      };
    }
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Available boron is within the configured range. Maintain balanced nutrient management.',
      recommendation_mr:
        'उपलब्ध बोरॉन योग्य श्रेणीत आहे. संतुलित खत व्यवस्थापन सुरू ठेवा.',
    };
  }

  // ── 15. Bulk Density ────────────────────────────────────────────────────
  if (k === 'bd' || k === 'bulk_density') {
    if (value > 1.60) {
      return {
        status_category: 'HIGH',
        priority_rank: 3,
        priority_key: 'high',
        recommendation:
          'Soil density is elevated. Consider deep subsoiling and organic residue incorporation to relieve compaction.',
        recommendation_mr:
          'माती घट्ट झाल्याचे दिसते. खोल नांगरट व सेंद्रिय घटकांचा वापर करून मातीची रचना सुधारा.',
      };
    }
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Soil physical condition and density are favorable for root penetration and moisture retention.',
      recommendation_mr:
        'मातीची भौतिक घनता योग्य असून मुळांची वाढ व ओलावा टिकवण्यासाठी अनुकूल आहे.',
    };
  }

  // ── Fallback ────────────────────────────────────────────────────────────
  // Use interpretation string to detect low/high/optimal status
  if (lowerInterp.includes('low') || lowerInterp.includes('deficient') || lowerInterp.includes('critical')) {
    return {
      status_category: 'LOW',
      priority_rank: 2,
      priority_key: 'high',
      recommendation:
        'The nutrient level is below the configured reference range. Follow the soil-test-based nutrient recommendation for this field.',
      recommendation_mr:
        'हा घटक संदर्भ श्रेणीपेक्षा कमी आहे. माती परीक्षणाधारित खत शिफारस पाळा.',
    };
  }
  if (lowerInterp.includes('very high')) {
    return {
      status_category: 'VERY HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Avoid adding additional amounts solely to increase this nutrient. Maintain balanced nutrient management and monitor future soil tests.',
      recommendation_mr:
        'हा घटक अत्यंत उत्तम आहे. अनावश्यक अतिरिक्त खत टाळा आणि पुढील माती चाचणी घ्या.',
    };
  }
  if (lowerInterp.includes('high')) {
    return {
      status_category: 'HIGH',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Avoid unnecessary additional application of this nutrient until the next soil test or crop-specific recommendation.',
      recommendation_mr:
        'हा घटक जास्त आहे. पुढील माती चाचणीशिवाय अतिरिक्त वापर टाळा.',
    };
  }
  if (lowerInterp.includes('medium') || lowerInterp.includes('moderate')) {
    return {
      status_category: 'MEDIUM',
      priority_rank: 4,
      priority_key: 'moderate',
      recommendation:
        'Monitor this nutrient and maintain balanced nutrient management.',
      recommendation_mr:
        'हा घटक मध्यम श्रेणीत आहे. संतुलित खत व्यवस्थापन ठेवा.',
    };
  }
  if (lowerInterp.includes('optimal') || lowerInterp.includes('good') || lowerInterp.includes('sufficient') || lowerInterp.includes('normal') || lowerInterp.includes('safe')) {
    return {
      status_category: 'OPTIMAL',
      priority_rank: 5,
      priority_key: 'info',
      recommendation:
        'Maintain current soil management practices and continue periodic soil testing.',
      recommendation_mr:
        'सध्याच्या शेती पद्धती सुरू ठेवा आणि नियमित माती चाचणी करा.',
    };
  }

  return {
    status_category: 'GOOD',
    priority_rank: 5,
    priority_key: 'info',
    recommendation:
      'Maintain balanced nutrient management and continue periodic soil testing.',
    recommendation_mr:
      'संतुलित खत व्यवस्थापन आणि नियमित माती चाचणी सुरू ठेवा.',
  };
}

// ---------------------------------------------------------------------------
// RANKED KEY RECOMMENDATIONS (top 5, priority order)
// ---------------------------------------------------------------------------
export interface SoilParamLike {
  key?: string;
  parameter_key?: string;
  name?: string;
  parameter_name?: string;
  name_mr?: string;
  parameter_name_mr?: string;
  value?: number | null;
  unit?: string;
  interpretation?: string;
  interpretation_en?: string;
  interpretation_mr?: string;
  status_category?: string;
  priority_rank?: number;
  priority_key?: string;
  recommendation?: string;
  recommendation_mr?: string;
}

export interface KeyRecommendationResult {
  key: string;
  name: string;
  name_mr: string;
  value: number | null;
  unit: string;
  status_category: string;
  priority_rank: number;
  priority_key: string;
  recommendation: string;
  recommendation_mr: string;
}

export function getRankedKeyRecommendations(
  parameters: SoilParamLike[],
  maxItems = 5,
): KeyRecommendationResult[] {
  const seen = new Set<string>();
  const ranked: KeyRecommendationResult[] = [];

  for (const p of parameters) {
    const key = (p.key || p.parameter_key || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const interpEn = p.interpretation || p.interpretation_en || '';
    const interpMr = p.interpretation_mr || interpEn;
    const name = p.name || p.parameter_name || key;
    const nameMr = p.name_mr || p.parameter_name_mr || name;

    // Use existing recommendation from backend if available, else compute client-side
    const backendRec = p.recommendation;
    const backendRecMr = p.recommendation_mr;
    const backendStatus = p.status_category;
    const backendRank = p.priority_rank;
    const backendKey = p.priority_key;

    const computed = getConciseParameterRecommendation(key, p.value ?? null, interpEn, interpMr);

    ranked.push({
      key,
      name,
      name_mr: nameMr,
      value: p.value ?? null,
      unit: p.unit || '',
      status_category: backendStatus || computed.status_category,
      priority_rank: backendRank ?? computed.priority_rank,
      priority_key: (backendKey || computed.priority_key) as PriorityKey,
      recommendation: backendRec || computed.recommendation,
      recommendation_mr: backendRecMr || computed.recommendation_mr,
    });
  }

  // Sort: Critical(1) > Low(2) > High(3) > Medium(4) > Optimal(5)
  ranked.sort((a, b) => a.priority_rank - b.priority_rank || a.key.localeCompare(b.key));

  return ranked.slice(0, maxItems);
}
