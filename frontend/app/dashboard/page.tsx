"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { FarmSummaryCard } from "@/components/dashboard/FarmSummaryCard";
import { FarmMapPreview } from "@/components/dashboard/FarmMapPreview";
import { SoilOverview } from "@/components/dashboard/SoilOverview";
import { AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { t } = useI18n();
  const { loading, farmer, field, location } = useAuth();

  // Show clean skeleton while session is validating
  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardSkeleton />
      </ProtectedRoute>
    );
  }

  // Graceful fallback if data somehow failed to load
  if (!field) {
    return (
      <ProtectedRoute>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-surface-border shadow-card text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text-main">
            {t("dashboard.loadError")}
          </h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-soil-primary text-white font-medium text-sm rounded-lg hover:bg-soil-primaryHover transition-colors shadow-sm"
          >
            {t("dashboard.retry")}
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  const farmerName = farmer?.name || t("geo.unassigned");
  const gatNo = field.gat_no;
  const village = location?.village || "";
  const taluka = location?.taluka || "";
  const district = location?.district || "";
  const state = location?.state || "Maharashtra";
  const area = field.area;
  const areaUnit = field.area_unit || "hectare";
  const isDemo = field.is_demo ?? true;

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* 1. Welcome Section */}
        <WelcomeSection
          farmerName={farmerName}
          gatNo={gatNo}
          village={village}
          taluka={taluka}
          district={district}
        />

        {/* 2. Farm Identity & Location Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* YOUR FARM Summary Card */}
          <FarmSummaryCard
            gatNo={gatNo}
            village={village}
            taluka={taluka}
            district={district}
            state={state}
            area={area}
            areaUnit={areaUnit}
            isDemo={isDemo}
          />

          {/* Section 19: Farm Map Location Preview */}
          <FarmMapPreview gatNo={gatNo} />
        </div>

        {/* 3. Section 17 & 18: Soil Overview Preview */}
        <SoilOverview />
      </div>
    </ProtectedRoute>
  );
}
