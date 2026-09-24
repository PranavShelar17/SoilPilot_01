"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FarmMap } from "@/components/map/FarmMap";
import { AuthorizedFieldResponse } from "@/services/fieldService";
import {
  Tractor,
  User,
  MapPin,
  ArrowLeft,
  CheckCircle,
  Info,
  Maximize2,
} from "lucide-react";

export default function MyFarmPage() {
  const { t } = useI18n();
  const { farmer, field, location } = useAuth();
  const [liveField, setLiveField] = useState<AuthorizedFieldResponse | null>(null);

  // Fallback to auth context if live field is still loading
  const farmerName = liveField?.farmer_name || farmer?.name || t("geo.unassigned");
  const gatNo = liveField?.gat_no || field?.gat_no || "";
  const village = liveField?.village || location?.village || "";
  const taluka = liveField?.taluka || location?.taluka || "";
  const district = liveField?.district || location?.district || "Pune";
  const state = liveField?.state || location?.state || "Maharashtra";
  const area = liveField?.area ?? field?.area;
  const isDemo = liveField?.is_demo ?? field?.is_demo ?? true;

  const handleFieldLoaded = React.useCallback((loaded: AuthorizedFieldResponse) => {
    setLiveField(loaded);
  }, []);

  const formattedArea =
    area !== null && area !== undefined && area > 0
      ? `${area} ${t("myFarm.areaUnitHa") || "Ha"}`
      : t("dashboard.notAvailable");

  return (

    <ProtectedRoute>
      <div className="space-y-6 max-w-6xl mx-auto pb-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-soil-primary hover:text-soil-primaryHover transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("myFarm.backToDashboard")}</span>
          </Link>
        </div>

        {/* 1. Header Section */}
        <div className="bg-white rounded-2xl border border-surface-border p-6 sm:p-7 shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-soil-primaryLight border border-soil-secondary/30 text-soil-primary flex items-center justify-center font-bold shadow-xs shrink-0">
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-text-main tracking-tight">
                  {t("myFarm.title")}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-soil-primaryLight text-soil-primary border border-soil-secondary/30">
                  <CheckCircle className="w-3 h-3" />
                  <span>Phase 5</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                {t("myFarm.subtitle")}
              </p>
            </div>
          </div>

          {/* Context Pill */}
          <div className="flex flex-wrap items-center gap-2">
            {village && gatNo ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-surface-subtle border border-surface-border text-xs font-bold text-text-main flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-soil-primary shrink-0" />
                <span>
                  {village} • {t("geo.gatNo")} {gatNo}
                </span>
                <span className="text-text-light font-normal">
                  ({taluka}, {district})
                </span>
              </div>
            ) : null}

            {isDemo && (
              <span className="text-[10px] uppercase font-bold px-2.5 py-1.5 rounded-lg bg-soil-cream text-soil-primary border border-soil-secondary/40 shadow-xs">
                {t("common.demoData")}
              </span>
            )}
          </div>
        </div>

        {/* 2. Interactive MapLibre Farm Map */}
        <section aria-label="Farm Map" className="w-full">
          <FarmMap onFieldLoaded={handleFieldLoaded} />
        </section>


        {/* 3. Field Information Card */}
        <section className="bg-white rounded-2xl border border-surface-border p-6 sm:p-7 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-surface-border pb-3.5">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-soil-primary" />
              <h2 className="text-sm font-bold text-text-main tracking-wider uppercase">
                {t("myFarm.fieldInfo")}
              </h2>
            </div>
            <span className="text-xs text-text-muted">
              {t("myFarm.readOnlyNotice")}
            </span>
          </div>

          {/* 6-Grid Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Gat Number */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
              <span className="text-text-muted flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-soil-primary" />
                <span>{t("geo.gatNo")}</span>
              </span>
              <span className="text-base font-bold text-soil-primary block">
                {gatNo || t("dashboard.notAvailable")}
              </span>
            </div>

            {/* Field Area */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
              <span className="text-text-muted block font-medium">
                {t("dashboard.fieldArea")}
              </span>
              <span className="text-base font-bold text-text-main block">
                {formattedArea}
              </span>
            </div>

            {/* Village */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
              <span className="text-text-muted block font-medium">
                {t("geo.village")}
              </span>
              <span className="text-base font-bold text-text-main block">
                {village || t("dashboard.notAvailable")}
              </span>
            </div>

            {/* Taluka */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
              <span className="text-text-muted block font-medium">
                {t("geo.taluka")}
              </span>
              <span className="text-base font-bold text-text-main block">
                {taluka || t("dashboard.notAvailable")}
              </span>
            </div>

            {/* District & State */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
              <span className="text-text-muted block font-medium">
                {t("geo.district")} & {t("geo.state")}
              </span>
              <span className="text-base font-bold text-text-main block">
                {district}, {state}
              </span>
            </div>

            {/* Registered Landholder */}
            <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-1">
              <span className="text-text-muted flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-soil-primary" />
                <span>{t("myFarm.registeredLandholder")}</span>
              </span>
              <span className="text-base font-bold text-text-main block truncate">
                {farmerName}
              </span>
            </div>
          </div>

          {/* Demo Data Disclaimer Banner */}
          {isDemo && (
            <div className="p-3.5 rounded-xl bg-soil-cream/70 border border-soil-secondary/30 text-xs text-text-main flex items-start gap-2.5">
              <Info className="w-4 h-4 text-soil-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-soil-primary block">
                  {t("common.demoData")}
                </span>
                <span className="text-text-muted">
                  {t("common.demoDataNotice") || t("myFarm.demoNotice")}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
