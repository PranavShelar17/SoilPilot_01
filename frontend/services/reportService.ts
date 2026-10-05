import { api } from "@/lib/api/client";
import { SoilHealthReport } from "@/types/soilHealth";

export interface ReportVerificationResult {
  verified: boolean;
  status: string;
  report_no?: string;
  receipt_no?: string;
  farmer_name?: string;
  gat_no?: string;
  village?: string;
  taluka?: string;
  district?: string;
  report_date?: string;
  sample_date?: string;
  is_demo?: boolean;
  laboratory_name?: string;
}

export const reportService = {
  /**
   * Fetch complete Soil Health Report metadata and parameters.
   */
  async getFieldReport(fieldId: string | number): Promise<SoilHealthReport> {
    try {
      const response = await api.get<SoilHealthReport>(`/reports/${fieldId}`);
      if (response.data && response.data.parameters && response.data.parameters.length > 0) {
        return response.data;
      }
      const { soilHealthService } = await import("./soilHealthService");
      return soilHealthService.getFieldReport(fieldId);
    } catch (err) {
      const { soilHealthService } = await import("./soilHealthService");
      return soilHealthService.getFieldReport(fieldId);
    }
  },

  /**
   * Fetch Soil Health Card specific diagnostics.
   */
  async getSoilHealthCard(fieldId: string | number): Promise<SoilHealthReport> {
    try {
      const response = await api.get<SoilHealthReport>(`/reports/${fieldId}/soil-health-card`);
      if (response.data && response.data.parameters && response.data.parameters.length > 0) {
        return response.data;
      }
      const { soilHealthService } = await import("./soilHealthService");
      return soilHealthService.getFieldReport(fieldId);
    } catch (err) {
      const { soilHealthService } = await import("./soilHealthService");
      return soilHealthService.getFieldReport(fieldId);
    }
  },

  /**
   * Trigger download of official Soil Health Card PDF from backend.
   */
  async downloadSoilHealthCardPdf(fieldId: string | number, lang: string = "en"): Promise<void> {
    const cleanGat = String(fieldId).replace(/[^\d]/g, "") || "18";
    const filename = `SoilPilot_Soil_Health_Card_Gat_${cleanGat}.pdf`;
    const token = typeof window !== "undefined" ? sessionStorage.getItem("soilpilot_token") || "" : "";
    const directUrl = `/api/pdf/soil-health-card?fieldId=${encodeURIComponent(fieldId)}&lang=${encodeURIComponent(lang)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

    try {
      const res = await fetch(directUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        let targetFilename = filename;
        const disposition = res.headers.get("content-disposition");
        if (disposition) {
          const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i.exec(disposition);
          if (match && match[1]) {
            targetFilename = decodeURIComponent(match[1].trim().replace(/['"]/g, ""));
          }
        }
        if (!targetFilename.toLowerCase().endsWith(".pdf")) {
          targetFilename += ".pdf";
        }

        const pdfFile = new File([arrayBuffer], targetFilename, { type: "application/pdf" });
        const blobUrl = window.URL.createObjectURL(pdfFile);

        const a = document.createElement("a");
        a.style.position = "fixed";
        a.style.left = "-9999px";
        a.href = blobUrl;
        a.download = targetFilename;
        a.setAttribute("download", targetFilename);
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        }, 3000);
        return;
      }
    } catch (e) {
      console.warn("Proxy download failed, attempting native browser download:", e);
    }

    // Direct browser navigation stream fallback
    const link = document.createElement("a");
    link.href = directUrl;
    link.download = filename;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
    }, 1000);
  },

  /**
   * Trigger download of official Detailed Soil Report PDF from backend.
   */
  async downloadDetailedReportPdf(fieldId: string | number, lang: string = "en"): Promise<void> {
    const cleanGat = String(fieldId).replace(/[^\d]/g, "") || "18";
    const filename = `SoilPilot_Detailed_Soil_Report_Gat_${cleanGat}.pdf`;
    const token = typeof window !== "undefined" ? sessionStorage.getItem("soilpilot_token") || "" : "";
    const directUrl = `/api/pdf/detailed-report?fieldId=${encodeURIComponent(fieldId)}&lang=${encodeURIComponent(lang)}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

    try {
      const res = await fetch(directUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        let targetFilename = filename;
        const disposition = res.headers.get("content-disposition");
        if (disposition) {
          const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i.exec(disposition);
          if (match && match[1]) {
            targetFilename = decodeURIComponent(match[1].trim().replace(/['"]/g, ""));
          }
        }
        if (!targetFilename.toLowerCase().endsWith(".pdf")) {
          targetFilename += ".pdf";
        }

        const pdfFile = new File([arrayBuffer], targetFilename, { type: "application/pdf" });
        const blobUrl = window.URL.createObjectURL(pdfFile);

        const a = document.createElement("a");
        a.style.position = "fixed";
        a.style.left = "-9999px";
        a.href = blobUrl;
        a.download = targetFilename;
        a.setAttribute("download", targetFilename);
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        }, 3000);
        return;
      }
    } catch (e) {
      console.warn("Detailed report proxy download failed, attempting native browser download:", e);
    }

    // Direct browser navigation stream fallback
    const link = document.createElement("a");
    link.href = directUrl;
    link.download = filename;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
    }, 1000);
  },

  /**
   * Verify authenticity of a report number.
   */
  async verifyReport(reportNo: string): Promise<ReportVerificationResult> {
    const response = await api.get<ReportVerificationResult>(`/reports/verify/${encodeURIComponent(reportNo)}`);
    return response.data;
  },
};
