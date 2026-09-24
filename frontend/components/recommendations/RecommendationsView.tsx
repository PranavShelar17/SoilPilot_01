"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { recommendationService } from "@/services/recommendationService";
import { RecommendationsResponse, RecommendationItem } from "@/types/recommendation";
import { RecommendationsHeader } from "./RecommendationsHeader";
import { SoilStatusOverview } from "./SoilStatusOverview";
import { RecommendationsSummaryCards } from "./RecommendationsSummaryCards";
import { RecommendationCard } from "./RecommendationCard";
import {
  AlertCircle,
  RefreshCw,
  FileText,
  Map as MapIcon,
  ShieldCheck,
  Filter,
} from "lucide-react";

interface RecommendationsViewProps {
  fieldIdOverride?: string | number;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ fieldIdOverride }) => {
  const { t } = useI18n();
  const { field, loading: authLoading } = useAuth();

  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "high" | "attention" | "info">("all");

  const activeFieldId =
    fieldIdOverride ||
    field?.id ||
    (field?.gat_no ? `demo-field-gat-${field.gat_no}` : "demo-field-gat-104");

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await recommendationService.getFieldRecommendations(activeFieldId);
      setData(res);
    } catch (err: any) {
      console.error("Error loading recommendations:", err);
      setError(err?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchRecommendations();
    }
  }, [activeFieldId, authLoading]);

  // Loading Skeleton
  if (loading || authLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 py-6 animate-pulse">
        <div className="h-20 bg-stone-200 rounded-2xl w-full" />
        <div className="h-44 bg-stone-100 rounded-2xl w-full" />
        <div className="h-24 bg-stone-100 rounded-2xl w-full" />
        <div className="h-64 bg-stone-100 rounded-2xl w-full" />
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-surface-border shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-text-main">
          {t("recommendations.errorTitle")}
        </h2>
        <p className="text-xs text-text-muted">
          {t("recommendations.errorDesc")}
        </p>
        <button
          type="button"
          onClick={fetchRecommendations}
          className="inline-flex items-center gap-2 px-4 py-2 bg-soil-primary text-white font-medium text-xs rounded-xl hover:bg-soil-primaryHover transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t("recommendations.retry")}</span>
        </button>
      </div>
    );
  }

  // Empty State: No soil data available yet
  if (!data.has_data || data.recommendations.length === 0) {
    return (
      <div className="max-w-3xl mx-auto my-10 space-y-6">
        <RecommendationsHeader
          village={data.field.village}
          gatNo={data.field.gat_no}
          area={data.field.area}
          areaUnit={data.field.area_unit || "Ha"}
          isDemo={data.is_demo}
        />

        <div className="p-8 sm:p-12 bg-white rounded-2xl border border-surface-border shadow-sm text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-lg sm:text-xl font-bold text-text-main">
              {t("recommendations.noDataTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {t("recommendations.noDataDesc")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/soil-health-card"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-soil-primary text-white text-xs font-bold hover:bg-soil-primaryHover transition-all shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>{t("recommendations.noDataAction")}</span>
            </Link>
            <Link
              href="/soil-map"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-subtle text-text-main border border-surface-border text-xs font-semibold hover:bg-surface-muted transition-all"
            >
              <MapIcon className="w-4 h-4 text-soil-primary" />
              <span>{t("recommendations.noDataSecondary")}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter recommendations based on tab
  const filteredRecs = data.recommendations.filter((rec: RecommendationItem) => {
    if (activeTab === "high") return rec.priority_key === "high";
    if (activeTab === "attention") return rec.needs_attention;
    if (activeTab === "info") return rec.priority_key === "info";
    return true; // "all"
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4 sm:py-6">
      {/* 1. Header with Field Meta and Link to Soil Health Card */}
      <RecommendationsHeader
        village={data.field.village}
        gatNo={data.field.gat_no}
        area={data.field.area}
        areaUnit={data.field.area_unit || "Ha"}
        isDemo={data.is_demo}
      />

      {/* 2. Your Soil Status Overview */}
      {data.soil_overview && data.soil_overview.length > 0 && (
        <SoilStatusOverview items={data.soil_overview} />
      )}

      {/* 3. Summary Metric Cards */}
      <RecommendationsSummaryCards summary={data.summary} />

      {/* 4. Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "all"
              ? "bg-soil-primary text-white shadow-xs"
              : "bg-surface-subtle text-text-muted hover:text-text-main hover:bg-surface-muted border border-surface-border"
          }`}
        >
          {t("recommendations.filterAll")} ({data.summary.parameters_reviewed})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("high")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "high"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-surface-subtle text-rose-700 hover:bg-rose-50 border border-rose-200"
          }`}
        >
          {t("recommendations.filterHigh")} ({data.summary.high_priority_count})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("attention")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "attention"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-surface-subtle text-amber-800 hover:bg-amber-50 border border-amber-200"
          }`}
        >
          {t("recommendations.filterAttention")} ({data.summary.parameters_needing_attention})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("info")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "info"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-surface-subtle text-text-muted hover:text-text-main hover:bg-surface-muted border border-surface-border"
          }`}
        >
          {t("recommendations.filterInfo")} ({data.summary.info_count})
        </button>
      </div>

      {/* 5. Recommendation Cards List */}
      <div className="space-y-4">
        {filteredRecs.map((rec: RecommendationItem) => (
          <RecommendationCard key={rec.parameter_key} item={rec} />
        ))}
      </div>

      {/* 6. Scientific Safety & Advisory Notice */}
      <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border flex items-start gap-3 text-xs text-text-muted leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-soil-primary shrink-0 mt-0.5" />
        <p>{t("recommendations.disclaimer")}</p>
      </div>
    </div>
  );
};
