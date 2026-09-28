/**
 * Digital Soil Mapping (DSM) Layer Definitions and Types.
 * SoilPilot Phase 6 (+ raster / Gat visualisation)
 */

export type DSMLayerId =
  | "farm_boundary"
  | "ndvi"
  | "evi"
  | "ph"
  | "soc"
  | "nitrogen"
  | "bd"
  | "elevation"
  | "uncertainty";

/** Layers that are backed by a raster (everything except the boundary layer). */
export type DSMRasterLayerId = Exclude<DSMLayerId, "farm_boundary">;

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

/** Bounding box as [west, south, east, north] in EPSG:4326. */
export type BBox = [number, number, number, number];

/** Describes the quantised value grid that sits next to a layer's PNG overlay. */
export interface RasterGridMeta {
  file: string;
  width: number;
  height: number;
  dtype: "uint16";
  scale: number;
  offset: number;
  nodata: number;
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
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  colorStops?: ColorStop[];
  /** XYZ raster tile template (optional alternative to a static image overlay). */
  rasterTileUrl?: string;
  /** [west, south, east, north] */
  rasterBounds?: BBox;
  isDefault?: boolean;

  // --- populated from the DSM manifest -------------------------------------
  /** Georeferenced PNG overlay (transparent where there is no data). */
  rasterImageUrl?: string;
  /** Binary value grid used for the pixel probe and per-Gat statistics. */
  rasterGridUrl?: string;
  gridMeta?: RasterGridMeta;
  category?: string;
  marathiName?: string;
  description?: string;
  mean?: number;
  std?: number;
}

/** Shape of `public/data/dsm/manifest.json` (produced by scripts/gis/export_dsm_web.py). */
export interface DSMManifestLayer {
  id: DSMRasterLayerId;
  key: string;
  name: string;
  marathiName: string;
  unit: string;
  category: string;
  description: string;
  cmap: string;
  min: number;
  max: number;
  mean: number;
  std: number;
  validPixels: number;
  image: string;
  grid: RasterGridMeta;
  legendStops: { pct: number; color: string; value: number }[];
}

export interface DSMManifest {
  version: number;
  generatedAt: string;
  crs: string;
  bounds: BBox;
  size: [number, number];
  sampleKml: {
    file: string;
    label: string;
    village: string;
    taluka: string;
    district: string;
    state: string;
  };
  layers: DSMManifestLayer[];
}

export interface DSMViewerState {
  activeLayerId: DSMLayerId;
  layerOpacity: number;
  showBoundary: boolean;
  activeBasemap: "satellite" | "street";
}
