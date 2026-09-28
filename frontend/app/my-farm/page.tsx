"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ChevronDown,
  Lock,
} from "lucide-react";

const DEFAULT_GATS = ["12", "13", "14", "15", "16", "17", "18", "20", "21", "22", "25"];

function MyFarmContent() {
  const { t } = useI18n();
  const { farmer, field, location } = useAuth();
  const searchParams = useSearchParams();
  const urlGat = searchParams?.get("gat");

  const isAdmin =
    farmer?.role === "admin" ||
    field?.gat_no?.toLowerCase() === "admin" ||
    (typeof window !== "undefined" &&
      searchParams?.get("admin") === "true");

  const [liveField, setLiveField] = useState<AuthorizedFieldResponse | null>(null);

  // Directly initialize selectedGat from the authenticated login field
  const loginGat = (
    field?.gat_no ||
    farmer?.gat_number ||
    (typeof window !== "undefined" ? localStorage.getItem("soilpilot_selected_gat") : "") ||
    urlGat ||
    "13"
  ).replace(/[^\d]/g, "") || "13";

  const [selectedGat, setSelectedGat] = useState<string>(loginGat);

  // Keep selectedGat strictly connected to authenticated user's field
  useEffect(() => {
    const activeLoginGat = (
      field?.gat_no ||
      farmer?.gat_number ||
      (typeof window !== "undefined" ? localStorage.getItem("soilpilot_selected_gat") : "") ||
      urlGat ||
      "13"
    ).replace(/[^\d]/g, "");
    if (activeLoginGat) {
      setSelectedGat(activeLoginGat);
      if (typeof window !== "undefined") {
        localStorage.setItem("soilpilot_selected_gat", activeLoginGat);
      }
    }
  }, [field?.gat_no, farmer?.gat_number, urlGat]);

  const handleGatChange = useCallback((newGat: string) => {
    if (!isAdmin) return; // Only admin can switch Gats on My Farm
    const clean = newGat.replace(/[^\d]/g, "") || newGat;
    setSelectedGat(clean);
    if (typeof window !== "undefined") {
      localStorage.setItem("soilpilot_selected_gat", clean);
      window.dispatchEvent(new Event("soilpilot_gat_changed"));
    }
  }, [isAdmin]);

  const handleFieldLoaded = useCallback((loaded: AuthorizedFieldResponse) => {
    setLiveField(loaded);
  }, []);

  // Compute available gats including current selected
  const availableGats = React.useMemo(() => {
    const list = [...DEFAULT_GATS];
    if (selectedGat && !list.includes(selectedGat)) {
      list.unshift(selectedGat);
    }
    if (field?.gat_no && !list.includes(field.gat_no)) {
      list.push(field.gat_no);
    }
    return Array.from(new Set(list));
  }, [selectedGat, field?.gat_no]);

  // Fallback to auth context if live field is still loading
  const farmerName = liveField?.farmer_name || farmer?.name || t("geo.unassigned");
  const gatNo = field?.gat_no || selectedGat || liveField?.gat_no || "13";
  const village = liveField?.village || location?.village || "Malegaon Kh";
  const taluka = liveField?.taluka || location?.taluka || "Baramati";
  const district = liveField?.district || location?.district || "Pune";
  const state = liveField?.state || location?.state || "Maharashtra";
  const area = liveField?.area ?? (gatNo === "13" ? 5.14 : (field?.area ?? 1.49));
  const isDemo = liveField?.is_demo ?? field?.is_demo ?? true;

  const formattedArea =
    area !== null && area !== undefined && area > 0
      ? `${area} ${t("myFarm.areaUnitHa") || "Ha"}`
      : t("dashboard.notAvailable");

  return (
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

        {/* Context Controls & Gat Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interactive Gat Selector (Admin only) / Verified Badge (Farmer) */}
          {isAdmin ? (
            <div className="relative inline-flex items-center bg-surface-subtle border border-surface-border rounded-xl px-3 py-1.5 shadow-xs hover:border-soil-primary/40 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-soil-primary shrink-0 mr-1.5" />
              <span className="text-xs text-text-muted mr-1.5 font-medium">
                {village} • {t("geo.gatNo")}
              </span>
              <select
                id="selected-gat-dropdown"
                value={selectedGat}
                onChange={(e) => handleGatChange(e.target.value)}
                aria-label="Select Gat"
                className="bg-transparent text-xs font-bold text-soil-primary focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {availableGats.map((g) => (
                  <option key={g} value={g} className="text-text-main font-semibold">
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-text-muted pointer-events-none absolute right-2.5" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{village} • {t("geo.gatNo")} {gatNo} (Your Farm Boundary)</span>
            </div>
          )}

          <span className="text-text-light font-normal text-xs hidden sm:inline">
            ({taluka}, {district})
          </span>

          {isDemo && (
            <span className="text-[10px] uppercase font-bold px-2.5 py-1.5 rounded-lg bg-soil-cream text-soil-primary border border-soil-secondary/40 shadow-xs">
              {t("common.demoData")}
            </span>
          )}
        </div>
      </div>

      {/* 2. Interactive Farm Map with Selected Gat Boundary */}
      <section aria-label="Farm Map" className="w-full">
        <FarmMap
          selectedGat={selectedGat}
          onFieldLoaded={handleFieldLoaded}
        />
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
  );
}

export default function MyFarmPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading Farm Map...</div>}>
        <MyFarmContent />
      </Suspense>
    </ProtectedRoute>
  );
}
