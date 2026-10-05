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
      {/* 1. ADT AI TRAINING FOUNDATION, BARAMATI - Bold Green Title */}
      <h1 className="text-xl sm:text-2xl font-black text-[#1e5622] uppercase tracking-wide">
        {locale === "mr" ? "एडीटी एआय ट्रेनिंग फाउंडेशन, बारामती" : "ADT AI TRAINING FOUNDATION, BARAMATI"}
      </h1>

      {/* 2. Baramati, Pune, Maharashtra - Subheader */}
      <p className="text-sm font-semibold text-stone-600 mt-0.5">
        {locale === "mr" ? "बारामती, पुणे, महाराष्ट्र" : "Baramati, Pune, Maharashtra"}
      </p>

      {/* 3. DEMO DATA - Red bold text */}
      {isDemo && (
        <p className="text-xs font-black text-red-600 uppercase tracking-wider mt-1">
          {locale === "mr" ? "डेमो डेटा" : "DEMO DATA"}
        </p>
      )}

      {/* 4. Solid Green Divider Line */}
      <div className="w-full border-t-2 border-[#1e5622] my-3.5" />

      {/* 5. SOIL SAMPLE TEST REPORT - Centered green bold heading */}
      <h2 className="text-base sm:text-lg font-black text-[#1e5622] uppercase tracking-wider mb-3">
        {locale === "mr" ? "मृदा नमुना चाचणी अहवाल" : "SOIL SAMPLE TEST REPORT"}
      </h2>
    </div>
  );
};
