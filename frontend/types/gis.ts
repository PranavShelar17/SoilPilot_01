/**
 * Digital Soil Mapping (DSM) Layer Definitions and Types.
 * SoilPilot Phase 6
 */

export type DSMLayerId =
  | "farm_boundary"
  | "ph"
  | "bd"
  | "elevation"
  | "nitrogen"
  | "soc"
  | "ndvi"
  | "evi"
  | "uncertainty";

export type DSMLayerStatus = "available" | "pending" | "unavailable";

export type DSMSourceType =
  | "DEMO KML"
  | "DSM PREDICTION"
  | "SATELLITE DERIVED"
  | "LAB OBSERVATION"
  | "IMPORTED DATA";

export interface ColorStop {
  value: number;
  color: string;
  label?: string;
}

export interface DSMLayerConfig {
  id: DSMLayerId;
  nameKey: string;
  shortName: string;
  descriptionKey: string;
  unit: string;
  sourceType: DSMSourceType;
  sourceLabel: string;
  status: DSMLayerStatus;
  min?: number;
  max?: number;
  step?: number;
  colorStops?: ColorStop[];
  rasterTileUrl?: string;
  rasterBounds?: [number, number, number, number];
  imageUrl?: string;
  imageCoordinates?: [[number, number], [number, number], [number, number], [number, number]];
  isDefault?: boolean;
}

export interface DSMViewerState {
  activeLayerId: DSMLayerId;
  layerOpacity: number;
  showBoundary: boolean;
  activeBasemap: "satellite" | "street";
}
