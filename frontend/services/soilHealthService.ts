import { api } from "@/lib/api/client";
import { SoilHealthReport, SoilHealthSummary } from "@/types/soilHealth";

export const soilHealthService = {
  /**
   * Fetch complete Soil Health Report including all parameters, farmer info, and laboratory metadata.
   */
  async getFieldReport(fieldId: string | number): Promise<SoilHealthReport> {
    const response = await api.get<SoilHealthReport>(`/soil-health/field/${fieldId}`);
    return response.data;
  },

  /**
   * Fetch brief Soil Health Summary for dashboard widgets.
   */
  async getFieldSummary(fieldId: string | number): Promise<SoilHealthSummary> {
    const response = await api.get<SoilHealthSummary>(`/soil-health/field/${fieldId}/summary`);
    return response.data;
  },
};
