"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilParameter } from "@/types/soilHealth";

interface SoilParameterTableProps {
  parameters: SoilParameter[];
}

export const SoilParameterTable: React.FC<SoilParameterTableProps> = ({ parameters }) => {
  const { t, locale } = useI18n();

  const getStatusBadge = (interpretation: string) => {
    const lower = (interpretation || "").toLowerCase();

    if (lower.includes("high") || lower.includes("sufficient") || lower.includes("optimal") || lower.includes("normal") || lower.includes("सुरक्षित") || lower.includes("पुरेसे")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          {interpretation}
        </span>
      );
    }
    if (lower.includes("alkaline") || lower.includes("medium") || lower.includes("विम्लधर्मी") || lower.includes("मध्यम")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          {interpretation}
        </span>
      );
    }
    if (lower.includes("low") || lower.includes("acidic") || lower.includes("deficient") || lower.includes("critical") || lower.includes("कमी") || lower.includes("आम्लधर्मी") || lower.includes("कमतरता")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
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

  const getSourceBadge = (source: string) => {
    const s = (source || "").toUpperCase();
    if (s.includes("LAB")) {
      return (
        <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-soil-primary/10 text-soil-primary border border-soil-primary/20">
          LAB OBSERVATION
        </span>
      );
    }
    if (s.includes("DSM")) {
      return (
        <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          DSM PREDICTION
        </span>
      );
    }
    if (s.includes("IMPORTED")) {
      return (
        <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
          IMPORTED DATA
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
        {source || t("soilHealthCard.notAvailable")}
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
    <div className="overflow-x-auto rounded-md border border-stone-800 bg-white mb-6 shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-stone-800 text-white uppercase text-[11px] tracking-wider font-sans">
          <tr>
            <th className="py-2.5 px-3 border-r border-stone-700 w-12 text-center">
              {t("soilHealthCard.tableSrNo")}
            </th>
            <th className="py-2.5 px-3 border-r border-stone-700">
              {t("soilHealthCard.tableParam")}
            </th>
            <th className="py-2.5 px-3 border-r border-stone-700 text-right w-24">
              {t("soilHealthCard.tableValue")}
            </th>
            <th className="py-2.5 px-3 border-r border-stone-700 w-20">
              {t("soilHealthCard.tableUnit")}
            </th>
            <th className="py-2.5 px-3 border-r border-stone-700">
              {t("soilHealthCard.tableInterp")}
            </th>
            <th className="py-2.5 px-3 border-r border-stone-700">
              {t("soilHealthCard.tableRange")}
            </th>
            <th className="py-2.5 px-3 text-center w-36">
              {t("soilHealthCard.tableSource")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300 font-sans">
          {parameters.map((param, index) => {
            const displayName = locale === "mr" && param.name_mr ? param.name_mr : param.name;
            const displayInterp = locale === "mr" && param.interpretation_mr ? param.interpretation_mr : param.interpretation;

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
                    ? getStatusBadge(displayInterp)
                    : <span className="text-stone-400 italic">{t("soilHealthCard.notAvailable")}</span>}
                </td>
                <td className="py-2 px-3 border-r border-stone-300 text-stone-600 text-[11px] font-sans">
                  {param.reference_range || "—"}
                </td>
                <td className="py-2 px-3 text-center">
                  {getSourceBadge(param.source)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
