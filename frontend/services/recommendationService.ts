import { api } from "@/lib/api/client";
import { RecommendationsResponse } from "@/types/recommendation";

export const recommendationService = {
  /**
   * Fetch structured rule-based recommendations for a specific field.
   */
  async getFieldRecommendations(fieldId: string | number): Promise<RecommendationsResponse> {
    const response = await api.get<RecommendationsResponse>(`/recommendations/field/${fieldId}`);
    return response.data;
  },
};
