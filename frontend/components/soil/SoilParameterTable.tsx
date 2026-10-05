"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilParameter } from "@/types/soilHealth";
import {
  getConciseParameterRecommendation,
  getCleanReferenceRange,
  getCleanReferenceRangeMr,
} from "@/lib/soilRecommendations";
import { translateParamName, translateStatus } from "@/i18n/marathiHelper";

interface SoilParameterTableProps {
  parameters: SoilParameter[];
}

export const SoilParameterTable: React.FC<SoilParameterTableProps> = ({ parameters }) => {
  const { t, locale } = useI18n();
  const isMr = locale === "mr";

  const renderInterpretationText = (interpretation: string, statusCategory?: string) => {
    const lower = (interpretation || statusCategory || "").toLowerCase();

    // High -> Vibrant Blue
    if (lower.includes("high") || lower.includes("जास्त")) {
      return (
        <span className="font-bold text-[#1565c0]">
          {interpretation}
        </span>
      );
    }

    // Deficient / Critical -> Red / Crimson
    if (
      lower.includes("deficient") ||
      lower.includes("critical") ||
      lower.includes("कमतरता")
    ) {
      return (
        <span className="font-bold text-[#dc2626]">
          {interpretation}
        </span>
      );
    }

    // Low / Marginal -> Amber / Orange
    if (
      lower.includes("low") ||
      lower.includes("marginal") ||
      lower.includes("कमी") ||
      lower.includes("सीमांत")
    ) {
      return (
        <span className="font-bold text-[#c2410c]">
          {interpretation}
        </span>
      );
    }

    // Suitable, Non-saline, Normal, Medium, Sufficient, Moderate Density -> Bold Dark
    return (
      <span className="font-bold text-stone-900">
        {interpretation || "—"}
      </span>
    );
  };

  const formatObservedValue = (val: any) => {
    if (val === null || val === undefined) return "—";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toFixed(2);
  };

  if (!parameters || parameters.length === 0) {
    return (
      <div className="p-8 text-center bg-stone-50 border border-stone-300 rounded-md my-4">
        <p className="text-sm font-semibold text-stone-600">
          {t("soilHealthCard.noReportDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Section Title */}
      <h3 className="text-xs font-black text-[#1e5622] uppercase tracking-wider mb-2">
        {isMr ? "प्रयोगशाळा मृदा रासायनिक आणि पोषकतत्व विश्लेषण" : "LABORATORY SOIL CHEMICAL & NUTRIENT ANALYSIS"}
      </h3>

      <div className="overflow-x-auto rounded-sm border border-stone-300 bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse min-w-[760px] print:min-w-0 print:text-[10px]">
          <thead className="bg-[#1e5622] text-white uppercase text-[11px] print:text-[9.5px] tracking-wider font-sans">
            <tr>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5 border-r border-[#2e7d32] w-14 text-center">
                {isMr ? "अ.क्र." : "SR. NO."}
              </th>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5 border-r border-[#2e7d32] w-48">
                {isMr ? "घटक / निर्देशांक" : "PARAMETER"}
              </th>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5 border-r border-[#2e7d32] text-center w-28">
                {isMr ? "निरीक्षित मूल्य" : "OBSERVED VALUE"}
              </th>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5 border-r border-[#2e7d32] text-center w-20">
                {isMr ? "एकक" : "UNIT"}
              </th>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5 border-r border-[#2e7d32] w-32">
                {isMr ? "निष्कर्ष" : "INTERPRETATION"}
              </th>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5 border-r border-[#2e7d32] w-40">
                {isMr ? "संदर्भ श्रेणी" : "REFERENCE RANGE"}
              </th>
              <th className="py-2.5 px-3 print:py-1 print:px-1.5">
                {isMr ? "शिफारस" : "RECOMMENDATION"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 font-sans">
            {parameters.map((param, index) => {
              const displayName =
                isMr
                  ? param.name_mr || translateParamName(param.key || param.name, true)
                  : param.name;
              const rawInterp = isMr && param.interpretation_mr ? param.interpretation_mr : param.interpretation;
              const displayInterp = isMr ? translateStatus(rawInterp, true) : rawInterp;
              
              const numVal =
                typeof param.value === "number"
                  ? param.value
                  : param.value !== null && param.value !== undefined && !isNaN(Number(param.value))
                  ? Number(param.value)
                  : null;

              const fallbackRec = getConciseParameterRecommendation(
                param.key,
                numVal,
                param.interpretation,
                param.interpretation_mr,
              );
              const recText =
                isMr && param.recommendation_mr
                  ? param.recommendation_mr
                  : param.recommendation || (isMr ? fallbackRec.recommendation_mr : fallbackRec.recommendation);

              return (
                <tr
                  key={param.key || index}
                  className="bg-white hover:bg-stone-50/70 print:break-inside-avoid"
                >
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 border-r border-stone-200 text-center font-mono font-medium text-stone-700">
                    {param.sr_no || index + 1}
                  </td>
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 border-r border-stone-200 text-stone-900 font-medium print:text-[10px]">
                    {displayName}
                  </td>
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 border-r border-stone-200 text-center font-mono font-bold text-stone-950 text-xs print:text-[10px]">
                    {formatObservedValue(param.value)}
                  </td>
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 border-r border-stone-200 text-center text-stone-700 font-medium print:text-[10px]">
                    {param.unit || "—"}
                  </td>
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 border-r border-stone-200 print:text-[10px]">
                    {param.value !== null && param.value !== undefined
                      ? renderInterpretationText(displayInterp, param.status_category)
                      : <span className="text-stone-400 italic">—</span>}
                  </td>
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 border-r border-stone-200 text-stone-800 text-xs font-medium whitespace-nowrap print:text-[9.5px]">
                    {isMr
                      ? getCleanReferenceRangeMr(param.key, param.reference_range)
                      : getCleanReferenceRange(param.key, param.reference_range)}
                  </td>
                  <td className="py-2 px-3 print:py-0.5 print:px-1.5 text-stone-800 leading-snug text-[11.5px] print:text-[9.5px] print:leading-tight">
                    <span className="font-normal">{recText}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note below table */}
      <p className="text-[#dc2626] font-medium text-xs mt-3 print:mt-1.5 print:text-[9.5px]">
        {isMr
          ? "टीप: या अहवालातील मातीचे गुणधर्म व निष्कर्ष ०–३० सें.मी. मुळांच्या कार्यक्षेत्रातील खोलीवर आधारित आहेत."
          : "Note: Soil properties and interpretations in this report are based on the 0–30 cm root-zone soil depth."}
      </p>
    </div>
  );
};
