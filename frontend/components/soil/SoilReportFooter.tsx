"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { CheckCircle2, ShieldAlert } from "lucide-react";

interface SoilReportFooterProps {
  isDemo?: boolean;
  reportDate?: string;
  reportNo?: string;
}

export const SoilReportFooter: React.FC<SoilReportFooterProps> = ({
  isDemo = false,
  reportDate,
  reportNo,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 pt-2">
      {/* Soil Health Observations & Agronomic Advice Box */}
      <div className="rounded-md border border-stone-800 p-4 bg-stone-50/70 text-xs">
        <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] mb-2.5 pb-1 border-b border-stone-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-soil-primary" />
          <span>{t("soilHealthCard.observations")}</span>
        </h4>
        <ul className="space-y-1.5 text-stone-800 list-disc list-inside leading-relaxed">
          <li>{t("soilHealthCard.obs1")}</li>
          <li>{t("soilHealthCard.obs2")}</li>
          <li>{t("soilHealthCard.obs3")}</li>
          <li>{t("soilHealthCard.obs4")}</li>
          <li>{t("soilHealthCard.obs5")}</li>
          <li>{t("soilHealthCard.obs6")}</li>
        </ul>
      </div>

      {/* Laboratory Signatures & Certification Block (Matches standard laboratory dossier) */}
      <div className="border border-stone-800 rounded-md p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
        <div>
          <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wide mb-1">
            {t("soilHealthCard.reportInfo")}
          </h5>
          <p className="text-[11px] text-stone-600">
            {t("soilHealthCard.labAddress")}
          </p>
          <div className="mt-2 text-[11px] text-stone-500 font-mono">
            <span>Report Ref: {reportNo || "SPL-2026-0104"}</span>
            <span className="mx-2">•</span>
            <span>Date: {reportDate || "20-09-2026"}</span>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end">
          <div className="w-48 border-b border-stone-800 pb-1 text-center">
            <span className="font-serif italic text-stone-800 font-bold text-xs block">
              Dr. S. K. Joshi (Chief Chemist)
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-stone-600 mt-1">
            {t("soilHealthCard.certifiedBy")}
          </span>
          <span className="text-[10px] text-soil-primary font-semibold">
            Soil Diagnostics & Analytical Chemistry Division
          </span>
        </div>
      </div>

      {/* Demo Advisory Disclaimer */}
      {isDemo && (
        <div className="p-3 bg-amber-50 rounded-md border border-amber-200 flex items-start gap-2 text-amber-900 text-[11px] leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>{t("soilHealthCard.demoWarning")}</p>
        </div>
      )}
    </div>
  );
};
