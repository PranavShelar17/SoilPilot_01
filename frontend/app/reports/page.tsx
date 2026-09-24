"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { soilHealthService } from "@/services/soilHealthService";
import { SoilHealthReport } from "@/types/soilHealth";
import { downloadDetailedReportPdf, downloadSoilHealthCardPdf } from "@/lib/pdfGenerator";
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
} from "lucide-react";

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const { field, farmer, location, loading: authLoading } = useAuth();

  const [report, setReport] = useState<SoilHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeFieldId = field?.id || (field?.gat_no ? `demo-field-gat-${field.gat_no}` : "demo-field-gat-104");

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await soilHealthService.getFieldReport(activeFieldId);
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

  const isMr = locale === "mr";

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-surface-border shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-soil-primaryLight text-soil-primary flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text-main">
                {t("reports.title")}
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {t("reports.description")}
              </p>
            </div>
          </div>

          {report?.is_demo && (
            <span className="self-start sm:self-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              {t("common.demoData")}
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white p-8 rounded-2xl border border-surface-border shadow-card animate-pulse space-y-4">
            <div className="h-6 bg-stone-200 rounded w-1/3" />
            <div className="h-20 bg-stone-100 rounded w-full" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-white p-8 rounded-2xl border border-surface-border shadow-card text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-text-main">{t("soilHealthCard.errorTitle")}</p>
            <button
              type="button"
              onClick={loadReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-soil-primary text-white text-xs font-bold rounded-lg hover:bg-soil-primaryHover"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t("soilHealthCard.retry")}</span>
            </button>
          </div>
        )}

        {/* Latest Soil Health Report Card */}
        {!loading && !error && report && (
          <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-soil-primary" />
                <h2 className="text-base font-bold text-text-main">
                  {t("reports.latestReport")}
                </h2>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{report.report?.status || "Available"}</span>
              </span>
            </div>

            {report.has_report ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-subtle border border-surface-border">
                <div>
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.fieldGat")}
                  </span>
                  <span className="text-sm font-bold text-text-main font-mono">
                    Gat No. {report.field?.gat_no || field?.gat_no || "104"}
                  </span>
                  <span className="text-[11px] text-text-light block mt-0.5">
                    {report.field?.village || location?.village || "Malegaon Bk"}, {report.field?.taluka || location?.taluka || "Baramati"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("soilHealthCard.reportNo")}
                  </span>
                  <span className="text-sm font-bold text-text-main font-mono">
                    {report.report?.report_no || "SPL/2026/SL-0104"}
                  </span>
                  <span className="text-[11px] text-text-light block mt-0.5">
                    Ref: {report.report?.receipt_no || "REC-7842/26"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("soilHealthCard.reportDate")}
                  </span>
                  <div className="flex items-center gap-1 text-sm font-bold text-text-main mt-0.5">
                    <Calendar className="w-4 h-4 text-soil-primary" />
                    <span>{report.report?.report_date || "20-09-2026"}</span>
                  </div>
                  <span className="text-[11px] text-text-light block mt-0.5">
                    Sample: {report.report?.sample_date || "15-09-2026"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-text-muted font-medium block">
                    {t("reports.status")}
                  </span>
                  <span className="text-xs font-bold text-soil-primary bg-soil-cream px-2 py-0.5 rounded border border-soil-secondary/30 inline-block mt-0.5">
                    Certified Lab Report
                  </span>
                  <span className="text-[11px] text-text-light block mt-0.5">
                    {report.parameters?.length || 14} Tested Parameters
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-stone-200">
                <p className="text-xs text-text-muted font-medium">
                  {t("reports.noReports")}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {report.has_report && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/soil-health-card"
                  className="flex items-center gap-2 px-4 py-2 bg-soil-primary text-white text-xs font-bold rounded-lg hover:bg-soil-primaryHover transition-colors shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>{t("reports.viewReport")}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => downloadDetailedReportPdf(report, locale)}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-900 transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>{t("reports.downloadPdf")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadSoilHealthCardPdf(report, locale)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-stone-700 text-xs font-bold rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
                >
                  <Download className="w-4 h-4 text-soil-primary" />
                  <span>{t("soilHealthCard.downloadCard")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Report Archive & Multi-Season Historical Log */}
        <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 border-b border-surface-border pb-3">
            <FileSpreadsheet className="w-5 h-5 text-soil-primary" />
            <h3 className="text-base font-bold text-text-main">
              {t("reports.reportHistory")}
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-surface-border text-text-muted">
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
                  <td className="p-3 font-bold">Kharif / Post-Monsoon 2026</td>
                  <td className="p-3 font-mono font-semibold text-soil-primary">
                    {report?.report?.report_no || "SPL/2026/SL-0104"}
                  </td>
                  <td className="p-3 text-text-muted">{report?.report?.sample_date || "15-09-2026"}</td>
                  <td className="p-3 text-text-muted">{report?.report?.report_date || "20-09-2026"}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Certified
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href="/soil-health-card"
                        className="text-soil-primary hover:underline font-bold text-xs"
                      >
                        {t("reports.viewReport")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => report && downloadDetailedReportPdf(report, locale)}
                        className="text-stone-700 hover:text-stone-900"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
