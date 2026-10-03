"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";

interface SoilReportHeaderProps {
  isDemo?: boolean;
}

export const SoilReportHeader: React.FC<SoilReportHeaderProps> = ({ isDemo = true }) => {
  const { t, locale } = useI18n();

  return (
    <div className="mb-4 text-center">
      {/* 1. SOILPILOT - Green bold title */}
      <h1 className="text-xl sm:text-2xl font-black text-[#1e5622] uppercase tracking-wide">
        SOILPILOT
      </h1>

      {/* 2. ADT AI TRAINING FOUNDATION, BARAMATI - Large bold black */}
      <h2 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-tight mt-1">
        {locale === "mr" ? "एडीटी एआय ट्रेनिंग फाउंडेशन, बारामती" : "ADT AI TRAINING FOUNDATION, BARAMATI"}
      </h2>

      {/* 3. Baramati, Pune, Maharashtra - Subheader */}
      <p className="text-sm font-medium text-stone-700 mt-0.5">
        {locale === "mr" ? "बारामती, पुणे, महाराष्ट्र" : "Baramati, Pune, Maharashtra"}
      </p>

      {/* 4. DEMO DATA - Red bold text */}
      {isDemo && (
        <p className="text-xs font-black text-red-600 uppercase tracking-wider mt-1">
          {locale === "mr" ? "डेमो डेटा" : "DEMO DATA"}
        </p>
      )}

      {/* 5. Solid Green Divider Line */}
      <div className="w-full border-t-2 border-[#1e5622] my-4" />

      {/* 6. SOIL SAMPLE TEST REPORT - Centered green bold heading */}
      <h3 className="text-base sm:text-lg font-black text-[#1e5622] uppercase tracking-wider mb-4">
        {locale === "mr" ? "मृदा नमुना चाचणी अहवाल" : "SOIL SAMPLE TEST REPORT"}
      </h3>
    </div>
  );
};
