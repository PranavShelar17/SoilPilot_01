"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { FarmSummaryCard } from "@/components/dashboard/FarmSummaryCard";
import { FarmMapPreview } from "@/components/dashboard/FarmMapPreview";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { SoilOverview } from "@/components/dashboard/SoilOverview";
import {
  Tractor,
  FileBadge,
  Map,
  Lightbulb,
  FileText,
  AlertCircle,
} from "lucide-react";

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

        {/* 3. Explore Your Farm: Quick Action Cards */}
        <section className="space-y-3 pt-2">
          <div>
            <h3 className="text-base font-bold text-text-main">
              {t("dashboard.exploreFarm")}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t("dashboard.exploreFarmSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* My Farm */}
            <QuickActionCard
              title={t("nav.myFarm")}
              description={t("myFarm.description")}
              href="/my-farm"
              icon={<Tractor className="w-5 h-5" />}
              iconBgClass="bg-soil-primaryLight text-soil-primary"
              badge="Cadastral Parcel"
              ctaText={t("common.viewDetails")}
            />

            {/* Soil Map */}
            <QuickActionCard
              title={t("nav.soilMap")}
              description={t("soilMap.description")}
              href="/soil-map"
              icon={<Map className="w-5 h-5" />}
              iconBgClass="bg-soil-beige text-soil-primary"
              badge="Phase 6"
              ctaText={t("common.viewDetails")}
            />

            {/* Soil Health Card */}
            <QuickActionCard
              title={t("nav.soilHealthCard")}
              description={t("soilHealthCard.description")}
              href="/soil-health-card"
              icon={<FileBadge className="w-5 h-5" />}
              iconBgClass="bg-soil-cream text-soil-primary"
              badge="Phase 7"
              ctaText={t("common.viewDetails")}
            />

            {/* Recommendations */}
            <QuickActionCard
              title={t("nav.recommendations")}
              description={t("recommendations.description")}
              href="/recommendations"
              icon={<Lightbulb className="w-5 h-5" />}
              iconBgClass="bg-surface-muted text-soil-primary"
              badge="Phase 8"
              ctaText={t("common.viewDetails")}
            />

            {/* Reports */}
            <QuickActionCard
              title={t("nav.reports")}
              description={t("reports.description")}
              href="/reports"
              icon={<FileText className="w-5 h-5" />}
              iconBgClass="bg-surface-muted text-soil-primary"
              badge="Phase 9"
              ctaText={t("common.viewDetails")}
            />
          </div>
        </section>

        {/* 4. Section 17 & 18: Soil Overview Preview */}
        <SoilOverview />
      </div>
    </ProtectedRoute>
  );
}
