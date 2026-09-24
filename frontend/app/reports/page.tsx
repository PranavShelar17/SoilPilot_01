"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { reportService } from "@/services/reportService";
import { SoilHealthReport } from "@/types/soilHealth";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  QrCode,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Info,
} from "lucide-react";

type ButtonState = "idle" | "loading" | "success" | "error";

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const { field, farmer, location, loading: authLoading } = useAuth();

  const [report, setReport] = useState<SoilHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Online preview state for detailed report
  const [showDetailedPreview, setShowDetailedPreview] = useState<boolean>(false);

  // Download state trackers
  const [cardDownloadState, setCardDownloadState] = useState<ButtonState>("idle");
  const [detailedDownloadState, setDetailedDownloadState] = useState<ButtonState>("idle");

  const activeFieldId =
    field?.id ||
    (field?.gat_no ? `demo-field-gat-${field.gat_no}` : "demo-field-gat-104");

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getFieldReport(activeFieldId);
      setReport(data);
    } catch (err: any) {
      console.error("Failed to load reports page data:", err);
      setError(err?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadReport();
    }
  }, [activeFieldId, authLoading]);

  // Handler: Download Soil Health Card PDF
  const handleDownloadCard = async () => {
    if (cardDownloadState === "loading") return;
    try {
      setCardDownloadState("loading");
      await reportService.downloadSoilHealthCardPdf(activeFieldId, locale);
      setCardDownloadState("success");
      setTimeout(() => setCardDownloadState("idle"), 3500);
    } catch (err) {
      console.error("Failed to download Soil Health Card PDF:", err);
      setCardDownloadState("error");
      setTimeout(() => setCardDownloadState("idle"), 4000);
    }
  };

  // Handler: Download Detailed Soil Report PDF
  const handleDownloadDetailed = async () => {
    if (detailedDownloadState === "loading") return;
    try {
      setDetailedDownloadState("loading");
      await reportService.downloadDetailedReportPdf(activeFieldId, locale);
      setDetailedDownloadState("success");
      setTimeout(() => setDetailedDownloadState("idle"), 3500);
    } catch (err) {
      console.error("Failed to download Detailed Report PDF:", err);
      setDetailedDownloadState("error");
      setTimeout(() => setDetailedDownloadState("idle"), 4000);
    }
  };

  // Farmer & Field context from actual session / backend report
  const farmerName =
    report?.farmer?.name || farmer?.name || t("reports.farmerName") || "Farmer";
  const gatNo = report?.field?.gat_no || field?.gat_no || "104";
  const villageName =
    report?.field?.village || location?.village || "Malegaon Bk";
  const talukaName = report?.field?.taluka || location?.taluka || "Baramati";
  const districtName = report?.field?.district || location?.district || "Pune";
  const fieldArea =
    report?.field?.area != null
      ? `${report.field.area} ${report.field.area_unit || "Ha"}`
      : field?.area != null
      ? `${field.area} ${field.area_unit || "Ha"}`
      : "1.96 Ha";
  const reportDate = report?.report?.report_date || "20-09-2026";
  const sampleDate = report?.report?.sample_date || "15-09-2026";
  const reportNo = report?.report?.report_no || "SPL/2026/SL-0104";
  const isDemo = report?.is_demo ?? true;
  const isMr = locale === "mr";

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* ============================================================== */}
        {/* 1. HEADER SECTION                                              */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-card">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-soil-primaryLight border border-soil-primary/20 text-soil-primary flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
                {t("reports.title") || "Reports"}
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                {t("reports.subtitle") ||
                  "View and download your soil health reports."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDemo && (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{t("reports.demoNotice") || "DEMO DATA"}</span>
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-soil-cream text-soil-primary border border-soil-secondary/40 shadow-xs">
              {t("reports.phaseTag") || "Phase 9"}
            </span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white p-8 rounded-2xl border border-surface-border shadow-card animate-pulse space-y-4">
            <div className="h-6 bg-stone-200 rounded w-1/4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-16 bg-stone-100 rounded" />
              <div className="h-16 bg-stone-100 rounded" />
              <div className="h-16 bg-stone-100 rounded" />
              <div className="h-16 bg-stone-100 rounded" />
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-white p-8 rounded-2xl border border-surface-border shadow-card text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-text-main">
              {t("soilHealthCard.errorTitle") ||
                "We couldn't generate your report right now."}
            </p>
            <p className="text-xs text-text-muted">{error}</p>
            <button
              type="button"
              onClick={loadReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-soil-primary text-white text-xs font-bold rounded-lg hover:bg-soil-primaryHover transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t("soilHealthCard.retry") || "Try Again"}</span>
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ============================================================== */}
            {/* 2. FARM INFORMATION SECTION                                    */}
            {/* ============================================================== */}
            <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-soil-primary" />
                  <h2 className="text-sm sm:text-base font-bold text-text-main">
                    {t("reports.farmerInfoTitle") ||
                      "Farm & Farmer Information"}
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-text-muted">
                  {t("reports.certifiedLabReport") ||
                    "Certified Laboratory Soil Report"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-subtle border border-surface-border">
                {/* Farmer Name */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.farmerName") || "Farmer Name"}
                  </span>
                  <span className="text-sm font-bold text-text-main block">
                    {farmerName}
                  </span>
                </div>

                {/* Gat Number */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.gatNo") || "Gat Number"}
                  </span>
                  <span className="text-sm font-bold text-soil-primary font-mono block">
                    Gat No. {gatNo}
                  </span>
                </div>

                {/* Village & Taluka */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.village") || "Village"} &amp;{" "}
                    {t("reports.taluka") || "Taluka"}
                  </span>
                  <span className="text-sm font-semibold text-text-main block">
                    {villageName}, {talukaName}
                  </span>
                  <span className="text-[10px] text-text-muted block">
                    {districtName}, Maharashtra
                  </span>
                </div>

                {/* Field Area */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.fieldArea") || "Field Area"}
                  </span>
                  <span className="text-sm font-bold text-text-main block">
                    {fieldArea}
                  </span>
                </div>

                {/* Report Number */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("soilHealthCard.reportNo") || "Report Number"}
                  </span>
                  <span className="text-xs font-bold font-mono text-text-main block">
                    {reportNo}
                  </span>
                </div>

                {/* Report Date */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.reportDate") || "Report Date"}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-text-main">
                    <Calendar className="w-3.5 h-3.5 text-soil-primary" />
                    <span>{reportDate}</span>
                  </div>
                </div>

                {/* Latest Soil Data Date */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.latestSoilDataDate") ||
                      "Latest Soil Data Date"}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-text-main">
                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                    <span>{sampleDate}</span>
                  </div>
                </div>

                {/* Tested Parameters Count */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.testedParameters") || "Tested Parameters"}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {report?.parameters?.length || 14}{" "}
                    {t("reports.testedParameters") || "Parameters"}
                  </span>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 3. REPORT CARDS SECTION (CARD 1 & CARD 2)                      */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ---------------- CARD 1: SOIL HEALTH CARD ---------------- */}
              <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card hover:border-soil-primary/40 transition-all flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-soil-primaryLight border border-soil-primary/20 text-soil-primary flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Standardized ICAR
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-text-main">
                      {t("reports.card1Title") || "SOIL HEALTH CARD"}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed mt-1">
                      {t("reports.card1Desc") ||
                        "View your complete soil health status and important soil parameters."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-surface-border text-[11px] text-text-muted space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Primary Metrics:</span>
                      <span className="font-semibold text-text-main">
                        pH, EC, SOC, N, P, K + Micronutrients
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Format:</span>
                      <span className="font-semibold text-text-main">
                        A4 Single-Page Health Card
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Link
                    href="/soil-health-card"
                    className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-soil-primary text-white text-xs font-bold rounded-xl hover:bg-soil-primaryHover transition-all shadow-xs text-center"
                  >
                    <Eye className="w-4 h-4" />
                    <span>
                      {t("reports.viewCard") || "View Soil Health Card"}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    disabled={cardDownloadState === "loading"}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                      cardDownloadState === "loading"
                        ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                        : cardDownloadState === "success"
                        ? "bg-emerald-600 text-white"
                        : cardDownloadState === "error"
                        ? "bg-rose-600 text-white"
                        : "bg-stone-800 text-white hover:bg-stone-900"
                    }`}
                  >
                    {cardDownloadState === "loading" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {t("reports.generatingPdf") || "Generating PDF..."}
                        </span>
                      </>
                    ) : cardDownloadState === "success" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {t("reports.pdfDownloaded") || "PDF downloaded"}
                        </span>
                      </>
                    ) : cardDownloadState === "error" ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {t("reports.downloadError") || "Download Failed"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>
                          {t("reports.downloadPdf") || "Download PDF"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ---------------- CARD 2: DETAILED SOIL REPORT ---------------- */}
              <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card hover:border-soil-primary/40 transition-all flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-soil-cream border border-soil-secondary/40 text-soil-primary flex items-center justify-center shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-soil-primaryLight text-soil-primary border border-soil-primary/20">
                      Full Dossier
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-text-main">
                      {t("reports.card2Title") || "DETAILED SOIL REPORT"}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed mt-1">
                      {t("reports.card2Desc") ||
                        "View the complete soil test report with values, interpretation and reference ranges."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-surface-border text-[11px] text-text-muted space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Parameters:</span>
                      <span className="font-semibold text-text-main">
                        Complete 14+ Laboratory Panel
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Features:</span>
                      <span className="font-semibold text-text-main">
                        Ranges, Status, Sources &amp; Notes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDetailedPreview(!showDetailedPreview)}
                    className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-surface-subtle text-soil-primary border border-soil-secondary/40 text-xs font-bold rounded-xl hover:bg-soil-cream transition-all shadow-xs text-center"
                  >
                    {showDetailedPreview ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>
                          {t("reports.closePreview") || "Close Preview"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>
                          {t("reports.viewDetailed") || "View Detailed Report"}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDetailed}
                    disabled={detailedDownloadState === "loading"}
                    className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                      detailedDownloadState === "loading"
                        ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                        : detailedDownloadState === "success"
                        ? "bg-emerald-600 text-white"
                        : detailedDownloadState === "error"
                        ? "bg-rose-600 text-white"
                        : "bg-stone-800 text-white hover:bg-stone-900"
                    }`}
                  >
                    {detailedDownloadState === "loading" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {t("reports.generatingPdf") || "Generating PDF..."}
                        </span>
                      </>
                    ) : detailedDownloadState === "success" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {t("reports.pdfDownloaded") || "PDF downloaded"}
                        </span>
                      </>
                    ) : detailedDownloadState === "error" ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {t("reports.downloadError") || "Download Failed"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>
                          {t("reports.downloadPdf") || "Download PDF"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 4. ONLINE DETAILED SOIL REPORT PREVIEW (SECTIONS 9 & 13)       */}
            {/* ============================================================== */}
            {showDetailedPreview && report && (
              <div className="bg-white rounded-2xl border-2 border-soil-primary/30 p-6 sm:p-8 shadow-card space-y-6">
                {/* Laboratory Heading Banner */}
                <div className="bg-soil-primary text-white p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="text-[11px] font-bold text-soil-cream uppercase tracking-wider block">
                      SOILPILOT — Digital Soil Mapping &amp; Soil Health Portal
                    </span>
                    <h3 className="text-lg font-black tracking-tight mt-0.5">
                      {isMr
                        ? "सविस्तर माती चाचणी व पृथक्करण अहवाल"
                        : "DETAILED SOIL TEST & DIAGNOSTIC REPORT"}
                    </h3>
                    <p className="text-xs text-soil-cream/90 mt-0.5">
                      Standard: ICAR / MPKV Rahuri Vertisol Diagnostic Matrix
                    </p>
                  </div>
                  {isDemo && (
                    <span className="self-start md:self-center px-3 py-1 rounded bg-amber-200 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                      {t("reports.demoNotice") || "DEMO DATA"}
                    </span>
                  )}
                </div>

                {/* Identification Sub-grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-surface-subtle rounded-xl border border-surface-border text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px]">
                      Farmer Name:
                    </span>
                    <span className="font-bold text-text-main">{farmerName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">
                      Gat Number:
                    </span>
                    <span className="font-bold font-mono text-soil-primary">
                      Gat No. {gatNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">
                      Village &amp; Taluka:
                    </span>
                    <span className="font-semibold text-text-main">
                      {villageName}, {talukaName}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">
                      Report Number:
                    </span>
                    <span className="font-bold font-mono text-text-main">
                      {reportNo}
                    </span>
                  </div>
                </div>

                {/* Complete Parameter Table */}
                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-soil-primary text-white font-bold">
                      <tr>
                        <th className="p-3 w-10 text-center">Sr.</th>
                        <th className="p-3">
                          {isMr ? "माती घटक" : "Soil Parameter"}
                        </th>
                        <th className="p-3 text-right">
                          {isMr ? "मूल्य" : "Observed Value"}
                        </th>
                        <th className="p-3 text-center">
                          {isMr ? "एकक" : "Unit"}
                        </th>
                        <th className="p-3">
                          {isMr ? "स्थिती / विश्लेषण" : "Status / Interpretation"}
                        </th>
                        <th className="p-3">
                          {isMr ? "संदर्भ श्रेणी" : "Reference Range"}
                        </th>
                        <th className="p-3 text-center">
                          {isMr ? "माहिती स्रोत" : "Data Source"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {report.parameters && report.parameters.length > 0 ? (
                        report.parameters.map((p, idx) => {
                          const pName = isMr
                            ? p.name_mr || p.name
                            : p.name;
                          const interp = isMr
                            ? p.interpretation_mr || p.interpretation
                            : p.interpretation;
                          const valStr =
                            p.value !== null && p.value !== undefined
                              ? Number(p.value).toFixed(2)
                              : isMr
                              ? "उपलब्ध नाही"
                              : "Not Available";
                          const source =
                            p.source_type || p.source || "LAB OBSERVATION";

                          return (
                            <tr
                              key={p.key || idx}
                              className={
                                idx % 2 === 0
                                  ? "bg-white hover:bg-surface-subtle/60"
                                  : "bg-surface-subtle hover:bg-stone-100/60"
                              }
                            >
                              <td className="p-3 text-center text-text-muted font-mono">
                                {idx + 1}
                              </td>
                              <td className="p-3 font-bold text-text-main">
                                {pName}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-text-main">
                                {valStr}
                              </td>
                              <td className="p-3 text-center text-text-muted">
                                {p.unit || "-"}
                              </td>
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-soil-primaryLight text-soil-primary border border-soil-primary/20">
                                  {interp}
                                </span>
                              </td>
                              <td className="p-3 text-text-muted text-[11px]">
                                {p.reference_range || "-"}
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                                  {source}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-text-muted"
                          >
                            {t("reports.noReports") ||
                              "No soil data available yet."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Soil-Based Recommendation Summary Section (Section 39) */}
                <div className="p-4 rounded-xl bg-soil-primaryLight border border-soil-secondary/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-soil-primary font-bold text-xs">
                      <Lightbulb className="w-4 h-4" />
                      <span>
                        {t("reports.recommendationSummary") ||
                          "Soil-Based Recommendation Summary"}
                      </span>
                    </div>
                    <Link
                      href="/recommendations"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-soil-primary hover:underline"
                    >
                      <span>
                        {t("reports.viewAllRecommendations") ||
                          "View All Recommendations"}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-xs text-text-main leading-relaxed">
                    {isMr
                      ? "माती परीक्षणातील उपलब्ध नत्र (163 kg/ha) कमी असून सामू 8.38 (मध्यम विम्लधर्मी) आढळला आहे. खतांचा संतुलित वापर, शेणखताचा अंतर्भाव आणि सूक्ष्मअन्नद्रव्य पूर्ततेसाठी संपूर्ण शिफारशी पहा."
                      : "Observed Available Nitrogen is low (163 kg/ha) and pH is moderately alkaline (8.38). Split nitrogen applications and basal organic enrichment are recommended. Review full agronomic guidelines in the Recommendations module."}
                  </p>
                </div>

                {/* Data Source & Disclaimer (Section 13) */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border text-[11px] text-text-muted space-y-1.5">
                  <span className="font-bold text-text-main block">
                    DATA SOURCE &amp; PLATFORM DISCLAIMER
                  </span>
                  <p className="leading-relaxed">
                    {t("reports.disclaimer") ||
                      "This report contains information available through the SoilPilot Digital Soil Mapping and Soil Health Portal. Values may originate from laboratory observations, digital soil mapping predictions, or imported datasets. Where data is unavailable, it is marked accordingly. Demo/sample data must never be represented as official cadastral or laboratory data."}
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 5. REPORT VERIFICATION & QR FUNCTIONALITY                      */}
            {/* ============================================================== */}
            <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-soil-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main">
                    {t("reports.verifyTitle") || "Official Report Verification"}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t("reports.verifySubtitle") ||
                      "Verify authenticity of your laboratory record"}
                    :{" "}
                    <span className="font-mono font-bold text-text-main">
                      {reportNo}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authentic Certified Record</span>
                </span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 6. REPORT ARCHIVE & MULTI-SEASON LOG                           */}
            {/* ============================================================== */}
            <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-border pb-3">
                <FileSpreadsheet className="w-5 h-5 text-soil-primary" />
                <h3 className="text-sm sm:text-base font-bold text-text-main">
                  {t("reports.reportHistory") ||
                    "Report Archive & Multi-Season Log"}
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-surface-border text-text-muted font-bold">
                    <tr>
                      <th className="p-3">Season / Year</th>
                      <th className="p-3">Report Number</th>
                      <th className="p-3">Sample Date</th>
                      <th className="p-3">Report Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-text-main">
                    <tr className="hover:bg-surface-subtle/50">
                      <td className="p-3 font-bold">
                        Kharif / Post-Monsoon 2026
                      </td>
                      <td className="p-3 font-mono font-semibold text-soil-primary">
                        {reportNo}
                      </td>
                      <td className="p-3 text-text-muted">{sampleDate}</td>
                      <td className="p-3 text-text-muted">{reportDate}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Certified
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <Link
                            href="/soil-health-card"
                            className="text-soil-primary hover:underline font-bold text-xs"
                          >
                            {t("reports.viewReport") || "View"}
                          </Link>
                          <button
                            type="button"
                            onClick={handleDownloadCard}
                            className="text-stone-700 hover:text-stone-900 inline-flex items-center gap-1 text-xs font-semibold"
                            title="Download Soil Health Card PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Card</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadDetailed}
                            className="text-stone-700 hover:text-stone-900 inline-flex items-center gap-1 text-xs font-semibold"
                            title="Download Detailed Report PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Dossier</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
