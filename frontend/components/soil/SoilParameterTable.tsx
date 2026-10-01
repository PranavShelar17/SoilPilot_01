"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilParameter } from "@/types/soilHealth";
import { Info, X, Lightbulb } from "lucide-react";
import { getConciseParameterRecommendation } from "@/lib/soilRecommendations";

interface SoilParameterTableProps {
  parameters: SoilParameter[];
}

export const SoilParameterTable: React.FC<SoilParameterTableProps> = ({ parameters }) => {
  const { t, locale } = useI18n();
  const [selectedParam, setSelectedParam] = useState<SoilParameter | null>(null);

  const getStatusBadge = (interpretation: string, statusCategory?: string) => {
    const lower = (interpretation || statusCategory || "").toLowerCase();

    // Optimal / Good
    if (
      lower.includes("optimal") ||
      lower.includes("good") ||
      lower.includes("sufficient") ||
      lower.includes("normal") ||
      lower.includes("safe") ||
      lower.includes("सुरक्षित") ||
      lower.includes("पुरेसे")
    ) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          {interpretation}
        </span>
      );
    }

    // Medium / Moderate
    if (
      lower.includes("medium") ||
      lower.includes("moderate") ||
      lower.includes("alkaline") ||
      lower.includes("विम्लधर्मी") ||
      lower.includes("मध्यम")
    ) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          {interpretation}
        </span>
      );
    }

    // High / Very High
    if (lower.includes("very high") || lower.includes("high") || lower.includes("जास्त") || lower.includes("भरपूर")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          {interpretation}
        </span>
      );
    }

    // Low / Acidic / Deficient / Critical
    if (
      lower.includes("low") ||
      lower.includes("acidic") ||
      lower.includes("deficient") ||
      lower.includes("critical") ||
      lower.includes("saline") ||
      lower.includes("sodic") ||
      lower.includes("कमी") ||
      lower.includes("आम्लधर्मी") ||
      lower.includes("कमतरता")
    ) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
          {interpretation}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
        {interpretation || t("soilHealthCard.notAvailable")}
      </span>
    );
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
    <>
      <div className="overflow-x-auto rounded-md border border-stone-800 bg-white mb-6 shadow-xs">
        <table className="w-full text-left text-xs border-collapse min-w-[760px] print:min-w-0">
          <thead className="bg-stone-800 text-white uppercase text-[11px] tracking-wider font-sans">
            <tr>
              <th className="py-2.5 px-3 border-r border-stone-700 w-12 text-center">
                {t("soilHealthCard.tableSrNo")}
              </th>
              <th className="py-2.5 px-3 border-r border-stone-700 w-44">
                {t("soilHealthCard.tableParam")}
              </th>
              <th className="py-2.5 px-3 border-r border-stone-700 text-right w-24">
                {t("soilHealthCard.tableValue")}
              </th>
              <th className="py-2.5 px-3 border-r border-stone-700 w-20">
                {t("soilHealthCard.tableUnit")}
              </th>
              <th className="py-2.5 px-3 border-r border-stone-700 w-32">
                {t("soilHealthCard.tableInterp")}
              </th>
              <th className="py-2.5 px-3 border-r border-stone-700 w-36">
                {t("soilHealthCard.tableRange")}
              </th>
              <th className="py-2.5 px-3">
                {t("soilHealthCard.tableRec") || "RECOMMENDATION"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300 font-sans">
            {parameters.map((param, index) => {
              const displayName = locale === "mr" && param.name_mr ? param.name_mr : param.name;
              const displayInterp = locale === "mr" && param.interpretation_mr ? param.interpretation_mr : param.interpretation;
              // Use backend recommendation if present; otherwise compute client-side
              const fallbackRec = getConciseParameterRecommendation(
                param.key,
                param.value,
                param.interpretation,
                param.interpretation_mr,
              );
              const recText =
                locale === "mr" && param.recommendation_mr
                  ? param.recommendation_mr
                  : param.recommendation || (locale === "mr" ? fallbackRec.recommendation_mr : fallbackRec.recommendation);

              return (
                <tr
                  key={param.key || index}
                  className={index % 2 === 0 ? "bg-white hover:bg-stone-50/80" : "bg-stone-50/50 hover:bg-stone-100/60"}
                >
                  <td className="py-2 px-3 border-r border-stone-300 text-center font-mono font-medium text-stone-700">
                    {param.sr_no || index + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-stone-300 font-bold text-stone-900">
                    {displayName}
                  </td>
                  <td className="py-2 px-3 border-r border-stone-300 text-right font-mono font-black text-stone-950 text-sm">
                    {param.value !== null && param.value !== undefined
                      ? param.value
                      : t("soilHealthCard.notAvailable")}
                  </td>
                  <td className="py-2 px-3 border-r border-stone-300 text-stone-700 font-medium">
                    {param.unit || "—"}
                  </td>
                  <td className="py-2 px-3 border-r border-stone-300">
                    {param.value !== null && param.value !== undefined
                      ? getStatusBadge(displayInterp, param.status_category)
                      : <span className="text-stone-400 italic">{t("soilHealthCard.notAvailable")}</span>}
                  </td>
                  <td className="py-2 px-3 border-r border-stone-300 text-stone-600 text-[11px] font-sans">
                    {param.reference_range || "—"}
                  </td>
                  <td className="py-2 px-3 text-stone-800 leading-relaxed text-[11.5px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-normal">{recText}</span>
                      {(param.recommendation_detail || param.recommendation_detail_mr) && (
                        <button
                          type="button"
                          onClick={() => setSelectedParam(param)}
                          className="shrink-0 text-[10px] text-soil-primary hover:text-soil-primaryHover font-bold inline-flex items-center gap-0.5 hover:underline print:hidden cursor-pointer"
                          title="View detailed recommendation"
                        >
                          <Info className="w-3 h-3" />
                          <span>{t("soilHealthCard.tableRecDetails") || "Details"}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendation Details Modal */}
      {selectedParam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl border border-stone-300 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-stone-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {locale === "mr" && selectedParam.name_mr ? selectedParam.name_mr : selectedParam.name} — {locale === "mr" ? "सविस्तर शिफारस" : "Recommendation Guidance"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParam(null)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-stone-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-stone-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">
                    {t("soilHealthCard.tableValue")}
                  </span>
                  <span className="text-sm font-black font-mono text-stone-900">
                    {selectedParam.value} {selectedParam.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">
                    {t("soilHealthCard.tableInterp")}
                  </span>
                  <span className="text-xs font-bold text-stone-800">
                    {locale === "mr" && selectedParam.interpretation_mr ? selectedParam.interpretation_mr : selectedParam.interpretation}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] uppercase font-bold text-soil-primary tracking-wide mb-1">
                  {locale === "mr" ? "शेतासाठी शिफारस:" : "Actionable Soil Guidance:"}
                </h4>
                <p className="text-xs font-medium text-stone-900 leading-relaxed bg-soil-cream/40 p-3 rounded-lg border border-soil-secondary/30">
                  {locale === "mr" && selectedParam.recommendation_mr ? selectedParam.recommendation_mr : selectedParam.recommendation}
                </p>
              </div>

              {(selectedParam.recommendation_detail || selectedParam.recommendation_detail_mr) && (
                <div>
                  <h4 className="text-[11px] uppercase font-bold text-stone-600 tracking-wide mb-1">
                    {locale === "mr" ? "कृषी व्यवस्थापन सल्ला:" : "Agronomic Advisory Note:"}
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed">
                    {locale === "mr" && selectedParam.recommendation_detail_mr
                      ? selectedParam.recommendation_detail_mr
                      : selectedParam.recommendation_detail}
                  </p>
                </div>
              )}

              <div className="pt-2 text-[10.5px] text-stone-500 border-t border-stone-200">
                {locale === "mr"
                  ? "टीप: खतांची निश्चित मात्रा निवडलेल्या पिकाच्या गरजेनुसार व कृषी विद्यापीठाच्या नियमावलीनुसार ठरवावी."
                  : "Note: Informational soil guidance. Quantitative fertilizer doses should be aligned with specific crop requirements and agricultural university standards."}
              </div>
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedParam(null)}
                className="px-4 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-900 transition-colors"
              >
                {locale === "mr" ? "बंद करा" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
