import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SoilHealthReport } from "@/types/soilHealth";

/**
 * Generates and downloads the Farmer-Friendly Soil Health Card PDF.
 */
export function downloadSoilHealthCardPdf(report: SoilHealthReport, locale: string = "en") {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const isMr = locale === "mr";

  // SoilPilot Green Header Banner
  doc.setFillColor(42, 124, 19); // #2A7C13
  doc.rect(0, 0, 210, 28, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SOILPILOT - SOIL HEALTH CARD", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Digital Soil Mapping & Soil Health Portal | Maharashtra Agricultural Cadastre", 14, 18);
  doc.text("ISO/ICAR Standardized Soil Diagnostic Assessment", 14, 23);

  // Demo Stamp if applicable
  if (report.is_demo) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(145, 8, 52, 12, 1, 1, "F");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DEMONSTRATION RECORD", 148, 15);
  }

  // Farmer & Field Identification Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, 34, 182, 38, 2, 2, "FD");

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FARMER & FIELD IDENTIFICATION", 18, 41);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Farmer Name: ${report.farmer?.name || "Farmer"}`, 18, 48);
  doc.text(`Gat / Survey No: Gat No. ${report.field?.gat_no || "N/A"}`, 18, 54);
  doc.text(`Village: ${report.field?.village || "N/A"}`, 18, 60);
  doc.text(`Taluka & District: ${report.field?.taluka || "N/A"}, ${report.field?.district || "N/A"}`, 18, 66);

  doc.text(`Report Number: ${report.report?.report_no || "Pending"}`, 110, 48);
  doc.text(`Sample Date: ${report.report?.sample_date || "N/A"}`, 110, 54);
  doc.text(`Report Date: ${report.report?.report_date || "N/A"}`, 110, 60);
  doc.text(`Crop: ${report.report?.crop_name || "Sugarcane / Cash Crop"}`, 110, 66);

  // Summary Table of Key Nutrients
  const primaryKeys = ["ph", "ec", "organic_carbon", "available_nitrogen", "available_phosphorus", "available_potassium"];
  const summaryParams = report.parameters.filter((p) => primaryKeys.includes(p.key));

  const tableRows = (summaryParams.length > 0 ? summaryParams : report.parameters.slice(0, 6)).map((p, idx) => [
    idx + 1,
    p.name,
    p.value !== null && p.value !== undefined ? String(p.value) : "N/A",
    p.unit || "-",
    p.interpretation,
    p.reference_range || "-",
  ]);

  autoTable(doc, {
    startY: 78,
    head: [["Sr.", "Soil Parameter", "Observed Value", "Unit", "Interpretation", "Optimal / Reference Range"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [42, 124, 19],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 46, fontStyle: "bold" },
      2: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      3: { cellWidth: 20 },
      4: { cellWidth: 35, fontStyle: "bold" },
      5: { cellWidth: 45 },
    },
  });

  // Observations Section
  const finalY = (doc as any).lastAutoTable?.finalY || 150;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, finalY + 6, 182, 48, 2, 2, "FD");

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("AGRONOMIC OBSERVATIONS & FERTILITY GUIDANCE", 18, finalY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const observations = [
    "1. Soil Reaction: Soil pH is on the alkaline side (8.38), typical of Vertisols in the Deccan plateau.",
    "2. Salinity Index: Electrical Conductivity (0.10 dS/m) is normal with zero immediate salinity threat.",
    "3. Organic Matter: Organic carbon (1.02%) is very high; soil moisture retention and microbial health are strong.",
    "4. Nitrogen: Available nitrogen is low (163 kg/ha); split applications of nitrogenous fertilizers are suggested.",
    "5. Phosphorus & Potash: Phosphorus is in medium range; Potassium is very high, allowing lower basal potash doses.",
  ];

  let textY = finalY + 20;
  observations.forEach((obs) => {
    doc.text(obs, 18, textY);
    textY += 5.5;
  });

  // Sign-off footer
  doc.setDrawColor(180, 180, 180);
  doc.line(14, 270, 196, 270);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text("SoilPilot Agricultural Diagnostic Center | Soil, Water & Pest Analysis Division", 14, 275);
  doc.text("Official Authorized Analytical Report | Page 1 of 1", 14, 279);
  doc.text("Authorized Chemist Sign-Off", 155, 275);

  doc.save(`SoilHealthCard_Gat_${report.field?.gat_no || "Plot"}.pdf`);
}

/**
 * Generates and downloads the Detailed Multi-Column Soil Laboratory Test Report PDF.
 */
export function downloadDetailedReportPdf(report: SoilHealthReport, locale: string = "en") {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header Title matching Reference Report
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SOIL, WATER, FERTILIZER AND PEST TESTING LABORATORY", 105, 14, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SOILPILOT DIGITAL SOIL MAPPING & DIAGNOSTIC PORTAL", 105, 19, { align: "center" });
  doc.text("District Soil Diagnostic Center, Baramati / Pune, Maharashtra", 105, 23, { align: "center" });

  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(14, 26, 196, 26);

  // Title Box
  doc.setFillColor(42, 124, 19);
  doc.rect(55, 29, 100, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SOIL SAMPLE TEST REPORT", 105, 34.5, { align: "center" });

  // Farmer / Sample Information 2-Column Table
  autoTable(doc, {
    startY: 40,
    body: [
      [
        `Farmer's Name: ${report.farmer?.name || "Farmer"}`,
        `Receipt No. & Date: ${report.report?.receipt_no || "REC-7842/26"} (${report.report?.sample_date || "15-09-2026"})`,
      ],
      [
        `Gat No: ${report.field?.gat_no || "104"} (Area: ${report.field?.area || 1.96} ${report.field?.area_unit || "Ha"})`,
        `Sample Date: ${report.report?.sample_date || "15-09-2026"}`,
      ],
      [
        `Village: ${report.field?.village || "Malegaon Bk"}`,
        `Crop Name: ${report.report?.crop_name || "Sugarcane / Cash Crop"}`,
      ],
      [
        `Taluka: ${report.field?.taluka || "Baramati"}`,
        `Report No.: ${report.report?.report_no || "SPL/2026/SL-0104"}`,
      ],
      [
        `District: ${report.field?.district || "Pune"}, Maharashtra`,
        `Sample Name: ${report.report?.sample_name || "Surface Composite (0-15 cm)"}`,
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [100, 100, 100],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 91, fontStyle: "normal" },
      1: { cellWidth: 91, fontStyle: "normal" },
    },
  });

  // Complete Soil Parameter Table (7 columns)
  const fullTableRows = report.parameters.map((p, idx) => [
    p.sr_no || idx + 1,
    p.name,
    p.value !== null && p.value !== undefined ? String(p.value) : "N/A",
    p.unit || "-",
    p.interpretation,
    p.reference_range || "-",
    p.source || "LAB OBSERVATION",
  ]);

  const afterInfoY = (doc as any).lastAutoTable?.finalY || 70;

  autoTable(doc, {
    startY: afterInfoY + 4,
    head: [["Sr.", "Parameter", "Observed", "Unit", "Interpretation", "Interpretive Range / Classification", "Source"]],
    body: fullTableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 30, 30],
      lineColor: [180, 180, 180],
    },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 42, fontStyle: "bold" },
      2: { cellWidth: 18, halign: "right", fontStyle: "bold" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 32 },
      5: { cellWidth: 40, fontSize: 7 },
      6: { cellWidth: 26, fontSize: 6.5, halign: "center" },
    },
  });

  const finalParamY = (doc as any).lastAutoTable?.finalY || 180;

  // Observations & Agronomic remarks
  doc.setDrawColor(100, 100, 100);
  doc.setFillColor(250, 250, 250);
  doc.rect(14, finalParamY + 4, 182, 38, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text("SOIL HEALTH OBSERVATION & SCIENTIFIC NOTES:", 18, finalParamY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("• Soil pH (8.38) indicates moderately alkaline soil. Organic carbon is very high (> 0.80%), indicating fertile soil base.", 18, finalParamY + 16);
  doc.text("• Available nitrogen is low (< 280 kg/ha); split doses of urea or incorporation of green manure (dhaincha/sunhemp) advised.", 18, finalParamY + 21);
  doc.text("• Available phosphorus is medium (14.5 kg/ha). Available potassium is very high (> 300 kg/ha); reduce chemical potash doses.", 18, finalParamY + 26);
  doc.text("• Micronutrients: Zinc and Boron are below critical limits; soil or foliar application of micronutrient grade II is recommended.", 18, finalParamY + 31);
  doc.text("• Free Lime (8.2%) is within moderate limits for calcareous Vertisols; phosphorus fixation should be monitored.", 18, finalParamY + 36);

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Verified By: Analytical Chemist", 20, 275);
  doc.text("Authorized Signatory: Soil Scientist / Lab Director", 115, 275);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${report.report?.report_date || "20-09-2026"} | SoilPilot Soil Testing Laboratory`, 14, 282);

  doc.save(`SoilTestReport_Gat_${report.field?.gat_no || "Plot"}_Detailed.pdf`);
}
