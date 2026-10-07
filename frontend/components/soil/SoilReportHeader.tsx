"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";

interface SoilReportHeaderProps {
  isDemo?: boolean;
}

export const SoilReportHeader: React.FC<SoilReportHeaderProps> = () => {
  const { t, locale } = useI18n();

  return (
    <div className="mb-4 text-center pt-2 sm:pt-3">
      {/* 1. ADT AI TRAINING FOUNDATION, BARAMATI - Bold Green Title */}
      <h1 className="text-xl sm:text-2xl font-black text-[#1e5622] uppercase tracking-wide">
        {locale === "mr" ? "एडीटी एआय ट्रेनिंग फाउंडेशन, बारामती" : "ADT AI TRAINING FOUNDATION, BARAMATI"}
      </h1>

      {/* 2. Baramati, Pune, Maharashtra - Subheader */}
      <p className="text-sm font-semibold text-stone-700 mt-0.5">
        {locale === "mr" ? "बारामती, पुणे, महाराष्ट्र" : "Baramati, Pune, Maharashtra"}
      </p>

      {/* 3. SOIL TEST REPORT - Centered green bold heading */}
      <h2 className="text-base sm:text-lg font-black text-[#1e5622] uppercase tracking-wider mt-1.5 mb-2">
        {locale === "mr" ? "मृदा चाचणी अहवाल" : "SOIL TEST REPORT"}
      </h2>
    </div>
  );
};
