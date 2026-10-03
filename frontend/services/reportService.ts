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
    const response = await api.get<SoilHealthReport>(`/reports/${fieldId}`);
    return response.data;
  },

  /**
   * Fetch Soil Health Card specific diagnostics.
   */
  async getSoilHealthCard(fieldId: string | number): Promise<SoilHealthReport> {
    const response = await api.get<SoilHealthReport>(`/reports/${fieldId}/soil-health-card`);
    return response.data;
  },

  /**
   * Trigger download of official Soil Health Card PDF from backend.
   */
  async downloadSoilHealthCardPdf(fieldId: string | number, lang: string = "en"): Promise<void> {
    const cleanGat = String(fieldId).replace(/[^\d]/g, "") || "18";
    let filename = `SoilPilot_Soil_Health_Card_Gat_${cleanGat}.pdf`;

    const response = await api.get(`/reports/${fieldId}/soil-health-card/pdf`, {
      params: { lang },
      responseType: "blob",
    });

    const disposition =
      response.headers["content-disposition"] ||
      response.headers["Content-Disposition"];
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i.exec(disposition);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim().replace(/['"]/g, ""));
      }
    }

    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    const blob = new Blob([response.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // Delay cleanup to allow browser download manager to capture download name and stream
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // ignore
      }
    }, 30000);
  },

  /**
   * Trigger download of official Detailed Soil Report PDF from backend.
   */
  async downloadDetailedReportPdf(fieldId: string | number, lang: string = "en"): Promise<void> {
    const cleanGat = String(fieldId).replace(/[^\d]/g, "") || "18";
    let filename = `SoilPilot_Detailed_Soil_Report_Gat_${cleanGat}.pdf`;

    const response = await api.get(`/reports/${fieldId}/detailed/pdf`, {
      params: { lang },
      responseType: "blob",
    });

    const disposition =
      response.headers["content-disposition"] ||
      response.headers["Content-Disposition"];
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i.exec(disposition);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim().replace(/['"]/g, ""));
      }
    }

    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename += ".pdf";
    }

    const blob = new Blob([response.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // Delay cleanup to allow browser download manager to capture download name and stream
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // ignore
      }
    }, 30000);
  },

  /**
   * Verify authenticity of a report number.
   */
  async verifyReport(reportNo: string): Promise<ReportVerificationResult> {
    const response = await api.get<ReportVerificationResult>(`/reports/verify/${encodeURIComponent(reportNo)}`);
    return response.data;
  },
};
