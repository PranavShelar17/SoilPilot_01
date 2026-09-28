"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { soilHealthService } from "@/services/soilHealthService";
import { reportService } from "@/services/reportService";
import { SoilHealthReport } from "@/types/soilHealth";
import { KML_AVAILABLE_GATS } from "@/types/gat";
import { SoilReportHeader } from "./SoilReportHeader";
import { FarmerSampleInfoTable } from "./FarmerSampleInfoTable";
import { SoilParameterTable } from "./SoilParameterTable";
import { SoilHealthSummaryCards } from "./SoilHealthSummaryCards";
import { SoilReportFooter } from "./SoilReportFooter";
import { GatSoilHealthPanel } from "@/components/gat/GatSoilHealthPanel";
import Link from "next/link";
import {
  Download,
  Printer,
  FileText,
  LayoutGrid,
  Radar,
  AlertCircle,
  RefreshCw,
  FlaskConical,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";

interface SoilHealthCardViewProps {
  fieldIdOverride?: string | number;
}

export const SoilHealthCardView: React.FC<SoilHealthCardViewProps> = ({ fieldIdOverride }) => {
  const { t, locale } = useI18n();
  const { field, farmer, location, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const urlGat = searchParams?.get("gat");

  const [selectedGat, setSelectedGat] = useState<string>(() => {
    const validGats: string[] = [...KML_AVAILABLE_GATS];
    if (urlGat && validGats.includes(urlGat.replace(/[^\d]/g, ""))) return urlGat.replace(/[^\d]/g, "");
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("soilpilot_selected_gat");
      if (stored && validGats.includes(stored.replace(/[^\d]/g, ""))) return stored.replace(/[^\d]/g, "");
    }
    const fieldGat = field?.gat_no?.replace(/[^\d]/g, "");
    if (fieldGat && validGats.includes(fieldGat)) return fieldGat;
    return "15";
  });

  useEffect(() => {
    if (urlGat) {
      setSelectedGat(urlGat);
      if (typeof window !== "undefined") {
        localStorage.setItem("soilpilot_selected_gat", urlGat);
      }
    } else if (field?.gat_no) {
      setSelectedGat(field.gat_no);
      if (typeof window !== "undefined") {
        localStorage.setItem("soilpilot_selected_gat", field.gat_no);
      }
    }
  }, [urlGat, field?.gat_no]);

  const [activeTab, setActiveTab] = useState<"detailed" | "dsm_matrix" | "summary">("detailed");
  const [report, setReport] = useState<SoilHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState<boolean>(false);
  const [downloadingDetailed, setDownloadingDetailed] = useState<boolean>(false);

  const activeFieldId =
    fieldIdOverride ||
    (selectedGat ? `demo-field-gat-${selectedGat}` : field?.id || (field?.gat_no ? `demo-field-gat-${field.gat_no}` : "demo-field-gat-12"));

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await soilHealthService.getFieldReport(activeFieldId);
      setReport(data);
    } catch (err: any) {
      console.error("Error loading soil health report:", err);
      setError(err?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchReport();
    }
  }, [activeFieldId, authLoading]);

  // Loading skeleton
  if (loading || authLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 py-6 animate-pulse">
        <div className="h-14 bg-stone-200 rounded-lg w-full" />
        <div className="h-36 bg-stone-100 rounded-lg w-full" />
        <div className="h-72 bg-stone-100 rounded-lg w-full" />
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-stone-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-stone-900">
          {t("soilHealthCard.errorTitle")}
        </h2>
        <p className="text-xs text-stone-600">
          Please check your connection or verify that your field details are valid.
        </p>
        <button
          type="button"
          onClick={fetchReport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-soil-primary text-white font-medium text-xs rounded-lg hover:bg-soil-primaryHover transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t("soilHealthCard.retry")}</span>
        </button>
      </div>
    );
  }

  // If no report is available for this field
  if (!report.has_report && report.parameters.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-stone-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 text-stone-500 flex items-center justify-center">
          <FlaskConical className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-stone-900">
          {t("soilHealthCard.noReportTitle")}
        </h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          {t("soilHealthCard.noReportDesc")}
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
          <span>{t("soilHealthCard.reportPending")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Clean Navigation & Parcel Identity Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/soil-map?gat=${selectedGat}`}
          className="text-xs font-bold text-soil-primary hover:text-soil-primaryHover flex items-center gap-1.5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{locale === "mr" ? `← माती नकाशा पहा (गट ${selectedGat})` : `← View Soil Map (Gat ${selectedGat})`}</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/90 rounded-lg text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {report?.field?.village || "Malegaon Kh"} &bull; {t("geo.gatNo") || "Gat No."} {selectedGat}
              {report?.field?.area ? ` (${report.field.area} Ha)` : ""}
            </span>
          </span>
          <Link
            href={`/recommendations?gat=${selectedGat}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-soil-cream text-soil-primary border border-soil-secondary/30 rounded-lg text-xs font-bold hover:bg-soil-primaryLight transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-soil-primary" />
            <span>{locale === "mr" ? `खत शिफारसी पहा →` : `View Recommendations →`}</span>
          </Link>
        </div>
      </div>


      {/* Top Action Bar: Level Toggle & Download Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs print:hidden">
        {/* Level Toggle: Detailed Report vs DSM Soil Matrix vs Summary */}
        <div className="flex items-center p-1 bg-stone-100 rounded-lg border border-stone-200/80 gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("detailed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "detailed"
                ? "bg-white text-soil-primary shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t("soilHealthCard.viewDetailed") || "Laboratory Health Card"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dsm_matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "dsm_matrix"
                ? "bg-white text-soil-primary shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Radar className="w-4 h-4 text-emerald-600" />
            <span>{t("soilHealthCard.viewDsmMatrix") || "DSM Soil Matrix & Variability"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "summary"
                ? "bg-white text-soil-primary shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{t("soilHealthCard.viewSummary") || "Nutrient Summary"}</span>
          </button>
        </div>

        {/* Action Buttons: PDF Downloads, Recommendations & Print */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/recommendations?gat=${selectedGat}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-soil-cream text-soil-primary border border-soil-secondary/40 rounded-lg hover:bg-soil-creamMuted transition-all shadow-xs"
          >
            <Lightbulb className="w-3.5 h-3.5 text-soil-primary" />
            <span>{t("nav.recommendations")}</span>
          </Link>

          <button
            type="button"
            disabled={downloadingCard}
            onClick={async () => {
              try {
                setDownloadingCard(true);
                await reportService.downloadSoilHealthCardPdf(activeFieldId, locale);
              } catch (err) {
                console.error("PDF download failed:", err);
              } finally {
                setDownloadingCard(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-soil-primary text-white rounded-lg hover:bg-soil-primaryHover transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {downloadingCard ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{t("soilHealthCard.downloadCard")}</span>
          </button>

          <button
            type="button"
            disabled={downloadingDetailed}
            onClick={async () => {
              try {
                setDownloadingDetailed(true);
                await reportService.downloadDetailedReportPdf(activeFieldId, locale);
              } catch (err) {
                console.error("Detailed dossier download failed:", err);
              } finally {
                setDownloadingDetailed(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {downloadingDetailed ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>
              {downloadingDetailed
                ? t("reports.generatingPdf") || "Generating..."
                : t("soilHealthCard.downloadReport")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 cursor-pointer"
            title={t("soilHealthCard.printReport")}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "dsm_matrix" ? (
        <div className="space-y-4">
          <GatSoilHealthPanel
            dsmStats={report.dsm_stats}
            fieldInfo={report.field}
            loading={loading}
          />
        </div>
      ) : activeTab === "summary" ? (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-300 shadow-sm print:p-0 print:border-none print:shadow-none space-y-6">
          <SoilReportHeader isDemo={report.is_demo} />
          <FarmerSampleInfoTable
            farmer={report.farmer}
            field={report.field}
            report={report.report}
          />
          <SoilHealthSummaryCards parameters={report.parameters} />
          <SoilReportFooter
            isDemo={report.is_demo}
            reportDate={report.report?.report_date}
            reportNo={report.report?.report_no}
            observations={report.observations || report.report?.observations}
          />
        </div>
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-300 shadow-sm print:p-0 print:border-none print:shadow-none space-y-6">
          {/* 1. Header Section */}
          <SoilReportHeader isDemo={report.is_demo} />

          {/* 2. Farmer & Sample Information Table */}
          <FarmerSampleInfoTable
            farmer={report.farmer}
            field={report.field}
            report={report.report}
          />

          {/* 3. Laboratory Chemical & Physical Soil Analysis Table */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-sans">
                Laboratory Soil Chemical & Nutrient Analysis
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">
                Standard: ICAR / MPKV Rahuri Vertisol Diagnostic Matrix
              </span>
            </div>

            <SoilParameterTable parameters={report.parameters} />

            <SoilReportFooter
              isDemo={report.is_demo}
              reportDate={report.report?.report_date}
              reportNo={report.report?.report_no}
              observations={report.observations || report.report?.observations}
            />
          </div>
        </div>
      )}
    </div>
  );
};
