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
    <div className="pt-3 print:pt-2 break-inside-avoid page-break-inside-avoid">
      {/* 1. Section Header */}
      <h3 className="text-xs font-black text-[#1e5622] uppercase tracking-wider mb-1.5 print:mb-1">
        {isMr ? "अहवाल तपशील व प्रयोगशाळा प्रमाणीकरण" : "REPORT INFORMATION & LABORATORY CERTIFICATION"}
      </h3>

      {/* 2. Solid Green Divider Line */}
      <div className="w-full border-t-2 border-[#1e5622] mb-2.5 print:mb-1.5" />

      {/* 3. Report Info & Chemist Sign-Off (2-Column Balanced Layout) */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 text-xs text-stone-800">
        <div className="space-y-0.5 max-w-md">
          <p className="font-bold text-stone-900 text-xs">
            {isMr ? "एडीटी एआय ट्रेनिंग फाउंडेशन, बारामती" : "ADT AI TRAINING FOUNDATION, BARAMATI"}
          </p>
          <p className="font-medium text-stone-700 text-[11px] print:text-[10px]">
            {isMr
              ? "कृषी निदान व डिजिटल मृदा परीक्षण केंद्र, बारामती / पुणे, महाराष्ट्र"
              : "Agricultural Diagnostic & Digital Soil Testing Center, Baramati / Pune, Maharashtra"}
          </p>
          <p className="text-stone-600 font-mono text-[11px] print:text-[9.5px]">
            {isMr ? "अहवाल संदर्भ" : "Report Ref"}: {displayRef} &bull; {isMr ? "दिनांक" : "Date"}: {displayDate}
          </p>
        </div>

        <div className="sm:text-right space-y-0.5">
          <p className="font-bold text-stone-900 text-xs">
            {isMr ? "डॉ. एस. के. जोशी (मुख्य रसायनशास्त्रज्ञ)" : "Dr. S. K. Joshi (Chief Chemist)"}
          </p>
          <p className="font-bold uppercase text-[10.5px] print:text-[9.5px] text-stone-900 tracking-wider">
            {isMr ? "अधिकृत मृदा परीक्षण रसायनशास्त्रज्ञ" : "AUTHORIZED SOIL TESTING CHEMIST"}
          </p>
          <p className="text-[10.5px] print:text-[9.5px] text-stone-600">
            {isMr ? "मृदा निदान व विश्लेषणात्मक रसायनशास्त्र विभाग" : "Soil Diagnostics & Analytical Chemistry Division"}
          </p>
        </div>
      </div>
    </div>
  );
};
