"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CadastralSoilExplorer } from "@/components/map/CadastralSoilExplorer";
import { AuthorizedFieldResponse } from "@/services/fieldService";
import {
  Tractor,
  MapPin,
  ArrowLeft,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";

export default function MyFarmPage() {
  const { t } = useI18n();
  const { farmer, field, location } = useAuth();
  const [liveField, setLiveField] = useState<AuthorizedFieldResponse | null>(null);

  // Fallback to auth context if live field is still loading
  const farmerName = liveField?.farmer_name || farmer?.name || t("geo.unassigned");
  const gatNo = liveField?.gat_no || field?.gat_no || "104";
  const village = liveField?.village || location?.village || "Malegaon Bk";
  const taluka = liveField?.taluka || location?.taluka || "Baramati";
  const district = liveField?.district || location?.district || "Pune";
  const state = liveField?.state || location?.state || "Maharashtra";
  const area = liveField?.area ?? field?.area ?? 1.96;
  const isDemo = liveField?.is_demo ?? field?.is_demo ?? true;

  const formattedArea =
    area !== null && area !== undefined && area > 0
      ? `${area} ${t("myFarm.areaUnitHa") || "Ha"}`
      : t("dashboard.notAvailable");

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-soil-primary hover:text-soil-primaryHover transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("myFarm.backToDashboard") || "Back to Dashboard"}</span>
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
                  {t("myFarm.title") || "My Farm"}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-soil-primaryLight text-soil-primary border border-soil-secondary/30">
                  <CheckCircle className="w-3 h-3" />
                  <span>Cadastral DSM Active</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                {t("myFarm.subtitle") || "Surveyed parcel boundaries, digital soil diagnostics, and calibrated fertilizer prescriptions."}
              </p>
            </div>
          </div>

          {/* Context Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-surface-subtle border border-surface-border text-xs font-bold text-text-main flex items-center gap-1.5 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-soil-primary shrink-0" />
              <span>
                {village} &bull; {t("geo.gatNo") || "Gat"} {gatNo}
              </span>
              <span className="text-text-muted font-normal">
                ({taluka}, {district} &middot; {formattedArea})
              </span>
            </div>

            {isDemo && (
              <span className="text-[10px] uppercase font-bold px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1 shadow-xs">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                <span>{t("common.demoData") || "DEMO DATA"}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Unified Cadastral DSM System (Directly from soil-main) */}
        <section aria-label="Cadastral Soil System">
          <CadastralSoilExplorer initialGat={String(gatNo)} />
        </section>
      </div>
    </ProtectedRoute>
  );
}
