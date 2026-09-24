"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { AlertCircle } from "lucide-react";

export const DemoBanner: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="bg-soil-cream border-b border-soil-beige px-4 py-2 text-xs md:text-sm text-text-main flex items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
        <span className="inline-flex items-center gap-1 font-bold text-soil-primary bg-white/80 px-2 py-0.5 rounded border border-soil-secondary text-[11px] uppercase tracking-wider shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
          {t("common.demoData")}
        </span>
        <span className="text-text-muted truncate">
          {t("common.demoNotice")}
        </span>
      </div>
    </div>
  );
};
