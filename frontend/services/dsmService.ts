import { api } from "@/lib/api/client";
import { DSMLayerConfig } from "@/types/gis";
import { DSM_LAYERS, DSM_LAYER_LIST } from "@/lib/gis/dsmLayers";

export const dsmService = {
  /**
   * Fetches all registered Digital Soil Mapping (DSM) layers from backend.
   * Falls back to local DSM_LAYER_LIST configuration.
   */
  async getLayers(): Promise<DSMLayerConfig[]> {
    try {
      const response = await api.get<any[]>("/soil-layers");
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((item) => ({
          ...DSM_LAYERS[item.id as keyof typeof DSM_LAYERS],
          ...item,
          nameKey: DSM_LAYERS[item.id as keyof typeof DSM_LAYERS]?.nameKey || item.id,
          descriptionKey: DSM_LAYERS[item.id as keyof typeof DSM_LAYERS]?.descriptionKey || item.id,
        }));
      }
    } catch (e) {
      // Backend unavailable or fallback
    }
    return DSM_LAYER_LIST;
  },

  async getLayerById(layerId: string): Promise<DSMLayerConfig | null> {
    try {
      const response = await api.get<any>(`/soil-layers/${layerId}`);
      if (response.data) {
        return {
          ...DSM_LAYERS[layerId as keyof typeof DSM_LAYERS],
          ...response.data,
        };
      }
    } catch (e) {
      // Fallback
    }
    return DSM_LAYERS[layerId as keyof typeof DSM_LAYERS] || null;
  },
};
