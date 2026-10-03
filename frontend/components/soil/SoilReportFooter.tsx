"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";

interface SoilReportFooterProps {
  isDemo?: boolean;
  reportDate?: string;
  reportNo?: string;
  observations?: string[];
}

export const SoilReportFooter: React.FC<SoilReportFooterProps> = ({
  reportDate,
  reportNo,
}) => {
  const { t, locale } = useI18n();
  const isMr = locale === "mr";

  const displayRef = reportNo || "SPL/2026/SL-0104";
  const displayDate = reportDate || "20-09-2026";

  return (
    <div className="pt-4">
      {/* 1. Solid Green Divider Line */}
      <div className="w-full border-t-2 border-[#1e5622] mb-3" />

      {/* 2. Section Header */}
      <h3 className="text-xs font-black text-[#1e5622] uppercase tracking-wider mb-2">
        {isMr ? "अहवाल तपशील व प्रयोगशाळा प्रमाणीकरण" : "REPORT INFORMATION & LABORATORY CERTIFICATION"}
      </h3>

      {/* 3. Report Info & Chemist Sign-Off */}
      <div className="space-y-1 text-xs text-stone-800">
        <p className="font-medium text-stone-800">
          {isMr
            ? "कृषी निदान व डिजिटल मृदा परीक्षण केंद्र, बारामती / पुणे, महाराष्ट्र"
            : "Agricultural Diagnostic & Digital Soil Testing Center, Baramati / Pune, Maharashtra"}
        </p>

        <p className="text-stone-700 font-mono text-[11.5px]">
          {isMr ? "अहवाल संदर्भ" : "Report Ref"}: {displayRef} &bull; {isMr ? "दिनांक" : "Date"}: {displayDate}
        </p>

        <div className="pt-2">
          <p className="font-bold text-stone-900 text-xs">
            {isMr ? "डॉ. एस. के. जोशी (मुख्य रसायनशास्त्रज्ञ)" : "Dr. S. K. Joshi (Chief Chemist)"}
          </p>
          <p className="font-bold uppercase text-[11px] text-stone-900 tracking-wider">
            {isMr ? "अधिकृत मृदा परीक्षण रसायनशास्त्रज्ञ" : "AUTHORIZED SOIL TESTING CHEMIST"}
          </p>
          <p className="text-[11px] text-stone-600">
            {isMr ? "मृदा निदान व विश्लेषणात्मक रसायनशास्त्र विभाग" : "Soil Diagnostics & Analytical Chemistry Division"}
          </p>
        </div>
      </div>
    </div>
  );
};
