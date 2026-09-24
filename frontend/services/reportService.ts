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
    const response = await api.get(`/reports/${fieldId}/soil-health-card/pdf`, {
      params: { lang },
      responseType: "blob",
    });

    let filename = `SoilPilot_Soil_Health_Card_Gat_${fieldId}.pdf`;
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.indexOf("filename=") !== -1) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, "");
      }
    }

    const blob = new Blob([response.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Trigger download of official Detailed Soil Report PDF from backend.
   */
  async downloadDetailedReportPdf(fieldId: string | number, lang: string = "en"): Promise<void> {
    const response = await api.get(`/reports/${fieldId}/detailed/pdf`, {
      params: { lang },
      responseType: "blob",
    });

    let filename = `SoilPilot_Detailed_Soil_Report_Gat_${fieldId}.pdf`;
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.indexOf("filename=") !== -1) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, "");
      }
    }

    const blob = new Blob([response.data], { type: "application/pdf" });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Verify authenticity of a report number.
   */
  async verifyReport(reportNo: string): Promise<ReportVerificationResult> {
    const response = await api.get<ReportVerificationResult>(`/reports/verify/${encodeURIComponent(reportNo)}`);
    return response.data;
  },
};
