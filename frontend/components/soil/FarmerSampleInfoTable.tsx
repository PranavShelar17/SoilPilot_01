"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilReportFieldInfo, SoilReportFarmerInfo, SoilReportMetadata } from "@/types/soilHealth";

interface FarmerSampleInfoTableProps {
  farmer: SoilReportFarmerInfo;
  field: SoilReportFieldInfo;
  report: SoilReportMetadata | null;
}

export const FarmerSampleInfoTable: React.FC<FarmerSampleInfoTableProps> = ({
  farmer,
  field,
  report,
}) => {
  const { t } = useI18n();

  return (
    <div className="mb-6 overflow-hidden rounded-md border border-stone-800 text-xs text-stone-900 bg-white shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-800">
        {/* Left Side: Farmer & Field Details */}
        <div className="p-0">
          <div className="bg-stone-100 font-bold px-3 py-1.5 border-b border-stone-300 text-stone-800 uppercase tracking-wide text-[11px]">
            {t("soilHealthCard.farmerInfo")}
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-stone-200">
                <td className="w-1/3 px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.farmerName")}:
                </td>
                <td className="px-3 py-1.5 font-bold text-stone-900">
                  {farmer?.name || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.gatNo")}:
                </td>
                <td className="px-3 py-1.5 font-bold text-stone-900">
                  {field?.gat_no ? `Gat No. ${field.gat_no}` : t("soilHealthCard.notAvailable")}
                  {field?.area && (
                    <span className="text-stone-600 font-normal ml-2">
                      ({field.area} {field.area_unit || "Ha"})
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.village")}:
                </td>
                <td className="px-3 py-1.5 font-medium text-stone-900">
                  {field?.village || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.taluka")}:
                </td>
                <td className="px-3 py-1.5 font-medium text-stone-900">
                  {field?.taluka || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.district")}:
                </td>
                <td className="px-3 py-1.5 font-medium text-stone-900">
                  {field?.district || t("soilHealthCard.notAvailable")}, {field?.state || "Maharashtra"}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.sampleName")}:
                </td>
                <td className="px-3 py-1.5 font-medium text-stone-800 italic">
                  {report?.sample_name || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Side: Sample & Receipt Details */}
        <div className="p-0">
          <div className="bg-stone-100 font-bold px-3 py-1.5 border-b border-stone-300 text-stone-800 uppercase tracking-wide text-[11px]">
            {t("soilHealthCard.sampleInfo")}
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-stone-200">
                <td className="w-1/3 px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.reportNo")}:
                </td>
                <td className="px-3 py-1.5 font-bold font-mono text-stone-900">
                  {report?.report_no || t("soilHealthCard.reportPending")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.receiptNo")}:
                </td>
                <td className="px-3 py-1.5 font-mono text-stone-900">
                  {report?.receipt_no || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.sampleDate")}:
                </td>
                <td className="px-3 py-1.5 text-stone-900">
                  {report?.sample_date || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.reportDate")}:
                </td>
                <td className="px-3 py-1.5 font-semibold text-stone-900">
                  {report?.report_date || t("soilHealthCard.notAvailable")}
                </td>
              </tr>
              <tr className="border-b border-stone-200">
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("soilHealthCard.cropName")}:
                </td>
                <td className="px-3 py-1.5 font-bold text-soil-primary">
                  {report?.crop_name || "Sugarcane / Cash Crop"}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 font-bold text-stone-700 bg-stone-50/50">
                  {t("reports.status")}:
                </td>
                <td className="px-3 py-1.5 font-bold">
                  {report?.status === "Available" ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">
                      Verified & Certified
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold">
                      {report?.status || t("soilHealthCard.reportPending")}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
