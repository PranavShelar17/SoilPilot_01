"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { SoilReportFieldInfo, SoilReportFarmerInfo, SoilReportMetadata } from "@/types/soilHealth";
import {
  translateGeoName,
  translateFarmerName,
  formatGatLabel,
} from "@/i18n/marathiHelper";

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
  const { t, locale } = useI18n();
  const isMr = locale === "mr";

  const farmerName =
    translateFarmerName(farmer?.name, isMr) ||
    (isMr ? "रमेश पाटील" : "Ramesh Patil (रमेश पाटील)");

  const gatNumber = field?.gat_no || "22";
  const gatLabel = `${isMr ? "गट क्र." : "Gat No."} ${gatNumber}`;
  const areaPart = field?.area
    ? ` (${field.area} ${isMr ? "हेक्टर" : "hectare"})`
    : gatNumber === "22"
    ? ` (1.49 ${isMr ? "हेक्टर" : "hectare"})`
    : "";

  const villageName = translateGeoName(field?.village || "Malegaon Kh.", isMr);
  const talukaName = translateGeoName(field?.taluka || "Baramati", isMr);
  const districtName = translateGeoName(field?.district || "Pune", isMr);
  
  // Reference date: 20-09-2026
  const displayDate = report?.report_date || "20-09-2026";

  return (
    <div className="mb-6 print:mb-2">
      {/* Green Divider Line above section */}
      <div className="w-full border-t-2 border-[#1e5622] mb-2" />
      {/* Section Title */}
      <h3 className="text-xs font-black text-[#1e5622] uppercase tracking-wider mb-2 print:mb-1">
        {locale === "mr" ? "शेतकरी व माती नमुना तपशील" : "FARMER & SAMPLE INFORMATION"}
      </h3>

      {/* 4-Column Table */}
      <div className="overflow-hidden rounded-sm border border-stone-300 text-xs text-stone-900 bg-white shadow-xs">
        <table className="w-full border-collapse">
          <tbody>
            {/* Row 1: Farmer's Name & Taluka */}
            <tr className="border-b border-stone-300">
              <td className="w-[18%] px-3 py-2 print:px-2 print:py-1 font-bold text-stone-800 bg-stone-100 border-r border-stone-300 print:text-[10px]">
                {locale === "mr" ? "शेतकऱ्याचे नाव" : "Farmer's Name"}
              </td>
              <td className="w-[32%] px-3 py-2 print:px-2 print:py-1 text-stone-900 font-medium border-r border-stone-300 print:text-[10px]">
                {farmerName}
              </td>
              <td className="w-[18%] px-3 py-2 print:px-2 print:py-1 font-bold text-stone-800 bg-stone-100 border-r border-stone-300 print:text-[10px]">
                {locale === "mr" ? "तालुका" : "Taluka"}
              </td>
              <td className="w-[32%] px-3 py-2 print:px-2 print:py-1 text-stone-900 font-medium print:text-[10px]">
                {talukaName}
              </td>
            </tr>

            {/* Row 2: Gat No. & District */}
            <tr className="border-b border-stone-300">
              <td className="px-3 py-2 print:px-2 print:py-1 font-bold text-stone-800 bg-stone-100 border-r border-stone-300 print:text-[10px]">
                {locale === "mr" ? "गट क्र." : "Gat No."}
              </td>
              <td className="px-3 py-2 print:px-2 print:py-1 text-stone-900 font-medium border-r border-stone-300 print:text-[10px]">
                {gatLabel}{areaPart}
              </td>
              <td className="px-3 py-2 print:px-2 print:py-1 font-bold text-stone-800 bg-stone-100 border-r border-stone-300 print:text-[10px]">
                {locale === "mr" ? "जिल्हा" : "District"}
              </td>
              <td className="px-3 py-2 print:px-2 print:py-1 text-stone-900 font-medium print:text-[10px]">
                {districtName}
              </td>
            </tr>

            {/* Row 3: Village & Date */}
            <tr>
              <td className="px-3 py-2 print:px-2 print:py-1 font-bold text-stone-800 bg-stone-100 border-r border-stone-300 print:text-[10px]">
                {locale === "mr" ? "गाव" : "Village"}
              </td>
              <td className="px-3 py-2 print:px-2 print:py-1 text-stone-900 font-medium border-r border-stone-300 print:text-[10px]">
                {villageName}
              </td>
              <td className="px-3 py-2 print:px-2 print:py-1 font-bold text-stone-800 bg-stone-100 border-r border-stone-300 print:text-[10px]">
                {locale === "mr" ? "दिनांक" : "Date"}
              </td>
              <td className="px-3 py-2 print:px-2 print:py-1 text-stone-900 font-medium font-mono print:text-[10px]">
                {displayDate}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
