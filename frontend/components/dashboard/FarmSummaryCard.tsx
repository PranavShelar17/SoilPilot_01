"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { Tractor, Info, MapPin } from "lucide-react";

interface FarmSummaryCardProps {
  gatNo: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  area: number | null;
  areaUnit?: string;
  isDemo?: boolean;
}

export const FarmSummaryCard: React.FC<FarmSummaryCardProps> = ({
  gatNo,
  village,
  taluka,
  district,
  state,
  area,
  areaUnit = "hectare",
  isDemo = false,
}) => {
  const { t } = useI18n();

  const formattedArea =
    area !== null && area !== undefined && area > 0
      ? `${area} ${areaUnit}`
      : t("dashboard.notAvailable");

  return (
    <section className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-4 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Tractor className="w-5 h-5 text-soil-primary" />
          <h2 className="text-sm font-bold text-text-main tracking-wider uppercase">
            {t("dashboard.yourFarm")}
          </h2>
        </div>

        {isDemo && (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-soil-cream text-soil-primary border border-soil-secondary/40 shadow-xs">
            {t("common.demoData")}
          </span>
        )}
      </div>

      {/* Cadastral Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
          <span className="text-text-muted block font-medium">{t("geo.gatNo")}</span>
          <span className="text-base font-bold text-text-main block">
            {gatNo || t("dashboard.notAvailable")}
          </span>
        </div>

        <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
          <span className="text-text-muted block font-medium">{t("dashboard.fieldArea")}</span>
          <span className="text-base font-bold text-text-main block">
            {formattedArea}
          </span>
        </div>

        <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
          <span className="text-text-muted block font-medium">{t("geo.village")}</span>
          <span className="text-sm font-bold text-text-main block truncate" title={village}>
            {village || t("dashboard.notAvailable")}
          </span>
        </div>

        <div className="p-3 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
          <span className="text-text-muted block font-medium">{t("geo.taluka")}</span>
          <span className="text-sm font-bold text-text-main block truncate" title={taluka}>
            {taluka || t("dashboard.notAvailable")}
          </span>
        </div>
      </div>

      {/* Administrative Hierarchy summary bar */}
      <div className="p-3 bg-surface-muted rounded-xl border border-surface-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-muted">
          <MapPin className="w-3.5 h-3.5 text-soil-primary" />
          <span>{t("geo.district")} & {t("geo.state")}</span>
        </div>
        <span className="font-semibold text-text-main">
          {district || "Pune"}, {state || "Maharashtra"}
        </span>
      </div>

      {/* Demo Data Disclaimer if applicable */}
      {isDemo && (
        <div className="p-2.5 rounded-lg bg-soil-cream/50 border border-soil-beige text-[11px] text-text-muted flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-soil-primary shrink-0 mt-0.5" />
          <span>{t("dashboard.demoNotice")}</span>
        </div>
      )}
    </section>
  );
};
