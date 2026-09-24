"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { FlaskConical, Award, ShieldCheck } from "lucide-react";

interface SoilReportHeaderProps {
  isDemo?: boolean;
}

export const SoilReportHeader: React.FC<SoilReportHeaderProps> = ({ isDemo = false }) => {
  const { t, locale } = useI18n();

  return (
    <div className="border-b-2 border-stone-800 pb-4 mb-6">
      {/* Top Organization Branding */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-soil-primary text-white flex items-center justify-center shadow-sm shrink-0">
            <FlaskConical className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-soil-primary uppercase font-serif">
              SoilPilot
            </h1>
            <p className="text-xs font-semibold text-text-muted tracking-wide uppercase">
              {t("soilHealthCard.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-end gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-soil-primary bg-soil-cream px-2.5 py-1 rounded border border-soil-secondary/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ICAR Standardized Soil Diagnostic Protocol</span>
          </div>
          {isDemo && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              {t("common.demoData")}
            </span>
          )}
        </div>
      </div>

      {/* Laboratory Title (Matching uploaded reference report structure) */}
      <div className="mt-4 text-center border-t border-b border-stone-300 py-2.5 bg-stone-50/70">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-800 font-sans">
          {t("soilHealthCard.labSubtitle")}
        </h2>
        <p className="text-[11px] text-stone-600 font-medium mt-0.5">
          {t("soilHealthCard.labAddress")}
        </p>
      </div>

      {/* Report Title */}
      <div className="mt-4 text-center">
        <div className="inline-block px-6 py-1.5 bg-soil-primary text-white text-sm sm:text-base font-black tracking-wider uppercase rounded-sm shadow-xs font-serif">
          {t("soilHealthCard.sampleReportTitle")}
        </div>
      </div>
    </div>
  );
};
