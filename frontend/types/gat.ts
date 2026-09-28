/**
 * Gat (cadastral parcel) types used by the KML importer and the soil map.
 */
import type { BBox, DSMRasterLayerId } from "@/types/gis";

/** Authoritative Gat parcel numbers available in the user's trial.kml dataset. */
export const KML_AVAILABLE_GATS = ["12", "13", "14", "15", "16", "17", "18", "20", "21", "22", "25"] as const;
export type KmlAvailableGat = (typeof KML_AVAILABLE_GATS)[number];

export type Position = [number, number]; // [lng, lat]

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Position[][][];
}

export type GatGeometry = PolygonGeometry | MultiPolygonGeometry;

export interface GatProperties {
  /** Unique id within the collection (Placemark name, de-duplicated). */
  gat_id: string;
  name: string;
  description: string | null;
  area_sqm: number;
  area_ha: number;
  area_acres: number;
  centroid: Position;
  bounds: BBox;
  source: "sample" | "upload" | "backend-kml";
  is_village_boundary?: boolean;
  /** Any ExtendedData / SimpleData found on the Placemark. */
  attributes: Record<string, string>;
}

export interface GatFeature {
  type: "Feature";
  id: string;
  properties: GatProperties;
  geometry: GatGeometry;
}

export interface GatCollection {
  type: "FeatureCollection";
  features: GatFeature[];
}

export interface GatSourceInfo {
  kind: "sample" | "upload";
  label: string;
  fileName?: string;
  count: number;
  skipped: number;
  warnings: string[];
}

export interface SoilClassification {
  status: string;
  statusMr: string;
  color: string;
  rating: string;
  advice: string;
  adviceMr: string;
}

export interface ParamStat {
  layerId: DSMRasterLayerId;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  p10: number;
  p90: number;
  /** Number of raster cells inside the polygon. */
  count: number;
  classification: SoilClassification;
}

export interface GatStats {
  gatId: string;
  params: Partial<Record<DSMRasterLayerId, ParamStat>>;
  /** 100 - mean model uncertainty (floored at 85), when the uncertainty layer is loaded. */
  confidence: number | null;
}
