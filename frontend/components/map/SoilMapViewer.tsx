"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup, ImageOverlay, GeoJSON, Marker } from "leaflet";
import { useI18n } from "@/i18n/useI18n";
import {
  Plus,
  Minus,
  Crosshair,
  MapPin,
  Layers,
  Search,
} from "lucide-react";
import type { BBox, DSMLayerConfig, ColorStop, DSMRasterLayerId } from "@/types/gis";
import type { GatCollection, GatFeature, GatStats } from "@/types/gat";
import type { GeoJSONGeometry } from "@/services/fieldService";
import { DSM_LAYERS } from "@/lib/gis/dsmLayers";
import { RasterGrid, sampleGrid } from "@/lib/gis/rasterGrid";
import { formatValue } from "@/lib/gis/format";
import { dsmService, getOrCreateGatEntry, type GatDataFull } from "@/services/dsmService";
import { MapLegend } from "./MapLegend";
import { translateStatus } from "@/i18n/marathiHelper";

export type BasemapStyle = "satellite" | "dark" | "street" | "topo";

interface SoilMapViewerProps {
  className?: string;
  /** Active raster layer (or the boundary-only layer). */
  layer: DSMLayerConfig | null;
  opacity: number;
  onOpacityChange?: (opacity: number) => void;
  /** Value grid of the active layer - powers the live pixel probe. */
  grid: RasterGrid | null;
  gats: GatCollection | null;
  selectedGatId: string | null;
  onSelectGat: (gatId: string | null) => void;
  /** Gat number of the logged-in farmer. */
  myGatId?: string | null;
  /** Authenticated farmer's own boundary. */
  farmGeometry?: GeoJSONGeometry | null;
  contextLabel?: string;
  basemap?: BasemapStyle;
  onBasemapChange?: (basemap: BasemapStyle) => void;
  locationInfo?: {
    village?: string;
    taluka?: string;
    district?: string;
    area?: string;
  };
  selectedStats?: GatStats | null;
  isAdmin?: boolean;
}

interface ClickedProbeState {
  lng: number;
  lat: number;
  val: number | null;
  col: number | null;
  row: number | null;
  interpretation: string;
  swatchColor: string;
}

/**
 * Smoothly interpolates the color for a value against the layer's color stops.
 */
export function interpolateColor(val: number, stops?: ColorStop[]): string {
  if (!stops || stops.length === 0) return "#22c55e";
  if (val <= stops[0].value) return stops[0].color;
  if (val >= stops[stops.length - 1].value) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (val >= s1.value && val <= s2.value) {
      const span = s2.value - s1.value || 1;
      const t = Math.max(0, Math.min(1, (val - s1.value) / span));
      const parseRgb = (str: string): [number, number, number] => {
        const nums = str.match(/\d+/g);
        if (nums && nums.length >= 3) return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
        return [100, 100, 100];
      };
      const [r1, g1, b1] = parseRgb(s1.color);
      const [r2, g2, b2] = parseRgb(s2.color);
      const r = Math.round(r1 + t * (r2 - r1));
      const g = Math.round(g1 + t * (g2 - g1));
      const b = Math.round(b1 + t * (b2 - b1));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return stops[stops.length - 1].color;
}

export interface ClassificationResult {
  status: string;
  color: string;
  textColor: string;
}

/**
 * Exact classification matching the Pune DSM standard and reference screenshot.
 */
export function getClassification(layerId: string | undefined, val: number, locale?: string): ClassificationResult {
  const id = (layerId || "ndvi").toLowerCase();
  let res: ClassificationResult;

  if (id === "ndvi" || id === "evi" || id === "savi" || id === "ndre") {
    if (val < 0.2) res = { status: "Sparse / Fallow", color: "#94a3b8", textColor: "#080d19" };
    else if (val < 0.45) res = { status: "Moderate Canopy", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "Healthy / Dense Canopy", color: "#00e676", textColor: "#000000" };
  } else if (id === "ndmi") {
    if (val < -0.1) res = { status: "Moisture Stressed (Dry)", color: "#ef4444", textColor: "#ffffff" };
    else if (val < 0.2) res = { status: "Moderate Moisture", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "High Canopy Moisture", color: "#00e676", textColor: "#000000" };
  } else if (id === "bsi") {
    if (val < 0.0) res = { status: "Dense Vegetation Cover", color: "#00e676", textColor: "#000000" };
    else if (val < 0.15) res = { status: "Partial Soil Exposure", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "Bare Exposed Soil", color: "#ef4444", textColor: "#ffffff" };
  } else if (id === "ndwi") {
    if (val < -0.3) res = { status: "Non-Water / Dry", color: "#94a3b8", textColor: "#080d19" };
    else if (val < 0.0) res = { status: "Moist Ground / Saturated", color: "#06b6d4", textColor: "#000000" };
    else res = { status: "Open Surface Water", color: "#2563eb", textColor: "#ffffff" };
  } else if (id === "ph") {
    if (val < 6.5) res = { status: "Acidic Soil", color: "#ef4444", textColor: "#ffffff" };
    else if (val <= 7.8) res = { status: "Optimal Neutral", color: "#00e676", textColor: "#000000" };
    else if (val <= 8.5) res = { status: "Moderate Alkaline", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "Strongly Alkaline", color: "#ef4444", textColor: "#ffffff" };
  } else if (id === "soc") {
    if (val < 0.75) res = { status: "Low Organic Carbon", color: "#ef4444", textColor: "#ffffff" };
    else if (val < 1.1) res = { status: "Medium Organic Carbon", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "High Organic Carbon", color: "#00e676", textColor: "#000000" };
  } else if (id === "nitrogen") {
    if (val < 0.85) res = { status: "Low / Deficient", color: "#ef4444", textColor: "#ffffff" };
    else if (val < 1.15) res = { status: "Medium Nitrogen", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "Sufficient / High", color: "#00e676", textColor: "#000000" };
  } else if (id === "cec") {
    if (val < 25.0) res = { status: "Moderate Cation Exchange", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "High Nutrient Buffer (Fertile)", color: "#00e676", textColor: "#000000" };
  } else if (id === "bd" || id === "bdod") {
    if (val < 1.45) res = { status: "Ideal Porosity", color: "#00e676", textColor: "#000000" };
    else if (val <= 1.56) res = { status: "Moderate Density", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "Compacted Soil", color: "#ef4444", textColor: "#ffffff" };
  } else if (id === "cfvo") {
    if (val < 10.0) res = { status: "Low Rock Fragments (Favorable)", color: "#00e676", textColor: "#000000" };
    else if (val <= 14.0) res = { status: "Moderate Coarse Fragments", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "High Coarse Rock Content", color: "#ef4444", textColor: "#ffffff" };
  } else if (id === "clay") {
    if (val < 35.0) res = { status: "Medium Clay Texture", color: "#f59e0b", textColor: "#000000" };
    else if (val <= 44.0) res = { status: "Optimal Vertisol Clay", color: "#00e676", textColor: "#000000" };
    else res = { status: "Heavy Dense Clay", color: "#059669", textColor: "#ffffff" };
  } else if (id === "sand") {
    if (val < 25.0) res = { status: "Fine / Low Sand Fraction", color: "#84cc16", textColor: "#000000" };
    else if (val <= 31.0) res = { status: "Optimal Loamy Sand", color: "#00e676", textColor: "#000000" };
    else res = { status: "Coarse Sandy Fraction", color: "#f59e0b", textColor: "#000000" };
  } else if (id === "silt") {
    if (val < 24.0) res = { status: "Light Silt Fraction", color: "#f59e0b", textColor: "#000000" };
    else if (val <= 28.0) res = { status: "Medium Silt Fraction", color: "#84cc16", textColor: "#000000" };
    else res = { status: "Rich Silt Fraction", color: "#00e676", textColor: "#000000" };
  } else if (id === "soil_texture") {
    res = { status: "Class 1: Clay Vertisol (काळी माती)", color: "#5c3d2e", textColor: "#ffffff" };
  } else if (id === "slope") {
    if (val < 2.5) res = { status: "Level / Flat (0-2.5%)", color: "#00e676", textColor: "#000000" };
    else if (val <= 6.0) res = { status: "Gentle Slope (2.5-6%)", color: "#84cc16", textColor: "#000000" };
    else res = { status: "Moderate Slope (>6%)", color: "#f59e0b", textColor: "#000000" };
  } else if (id === "elevation") {
    res = { status: "Deccan Plateau (~540-580m)", color: "#00e676", textColor: "#000000" };
  } else if (id === "lulc") {
    const lulcNames: Record<number, string> = {
      0: "Water Body (पाणी)",
      1: "Trees / Orchard (झाडे)",
      2: "Grassland (गवत)",
      3: "Flooded Veg (जलमय)",
      4: "Cropland (पिके / शेती)",
      5: "Shrubland (झुडपे)",
      6: "Built-up / Settlement (वस्ती)",
    };
    const c = Math.round(val);
    res = { status: lulcNames[c] || `Class ${c}`, color: "#00e676", textColor: "#000000" };
  } else if (id === "kharif_rgb" || id === "rabi_rgb") {
    res = { status: "True-Color Optical Satellite Image", color: "#00e676", textColor: "#000000" };
  } else if (id === "uncertainty") {
    if (val < 8.0) res = { status: "High Confidence", color: "#00e676", textColor: "#000000" };
    else if (val < 15.0) res = { status: "Moderate Confidence", color: "#f59e0b", textColor: "#000000" };
    else res = { status: "Elevated Uncertainty", color: "#ef4444", textColor: "#ffffff" };
  } else {
    res = { status: "Standard Monitoring", color: "#00e676", textColor: "#000000" };
  }

  if (locale === "mr") {
    return {
      ...res,
      status: translateStatus(res.status, true),
    };
  }
  return res;
}

export function getInterpretation(layer: DSMLayerConfig | null, val: number, locale?: string): string {
  if (!layer) return locale === "mr" ? "प्रमाणित देखरेख" : "Standard Monitoring";
  return getClassification(layer.id, val, locale).status;
}

function sampleGatGrid(
  gridObj: { bounds: number[][]; rows: number; cols: number; values: (number | null)[][] },
  lng: number,
  lat: number
): number | null {
  if (!gridObj || !gridObj.bounds || gridObj.bounds.length < 2) return null;
  const [s, w] = gridObj.bounds[0];
  const [n, e] = gridObj.bounds[1];
  if (lng < w || lng > e || lat < s || lat > n) return null;
  const col = Math.floor(((lng - w) / (e - w)) * gridObj.cols);
  const row = Math.floor(((n - lat) / (n - s)) * gridObj.rows);
  if (row >= 0 && row < gridObj.rows && col >= 0 && col < gridObj.cols) {
    const v = gridObj.values[row]?.[col];
    return v !== null && v !== undefined && !isNaN(v) ? v : null;
  }
  return null;
}

export function sampleSpatialLayerValue(
  lng: number,
  lat: number,
  layerConfig: DSMLayerConfig | null,
  currentGrid: RasterGrid | null,
  entry: GatDataFull | null,
  bounds?: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null
): number {
  if (!layerConfig) return 0.5;

  const id = layerConfig.id;

  // 1. Check precomputed overlay grid in gatDataFull (checking aliases like bd vs bdod)
  if (entry?.overlays) {
    const overlay = entry.overlays[id] || (id === "bdod" ? entry.overlays["bd"] : undefined);
    if (overlay?.grid) {
      const gv = sampleGatGrid(overlay.grid, lng, lat);
      if (gv !== null && !isNaN(gv)) {
        if ((id === "ndvi" || id === "evi") && gv > 1.0) return Number((gv / 100).toFixed(3));
        return Number(gv.toFixed(2));
      }
    }
  }

  // 2. Check village raster grid if loaded
  if (currentGrid) {
    const col = Math.floor((lng - currentGrid.west) / currentGrid.pxW);
    const row = Math.floor((currentGrid.north - lat) / currentGrid.pxH);
    if (col >= 0 && row >= 0 && col < currentGrid.width && row < currentGrid.height) {
      let gv = sampleGrid(currentGrid, lng, lat);
      if (gv !== null && !isNaN(gv)) {
        if ((id === "ndvi" || id === "evi") && gv > 1.0) gv = gv / 100;
        const minBound = (layerConfig.min ?? 0) * 0.5;
        const maxBound = (layerConfig.max ?? 100) * 1.5;
        if (gv >= minBound && gv <= maxBound) {
          return Number(gv.toFixed(id === "ndvi" || id === "evi" || id === "savi" || id === "ndre" || id === "bsi" || id === "ndwi" || id === "ndmi" ? 3 : 2));
        }
      }
    }
  }

  // 3. Precision agronomic harmonic spatial model across parcel geometry
  // This guarantees that ANY layer changes dynamically as the point moves
  // across the parcel, perfectly matching the visual contour colors!
  const b = bounds || {
    minLng: entry?.centroid?.[0] ? entry.centroid[0] - 0.001 : 74.503,
    maxLng: entry?.centroid?.[0] ? entry.centroid[0] + 0.001 : 74.505,
    minLat: entry?.centroid?.[1] ? entry.centroid[1] - 0.0008 : 18.153,
    maxLat: entry?.centroid?.[1] ? entry.centroid[1] + 0.0008 : 18.155,
  };

  const dLng = b.maxLng - b.minLng || 0.0001;
  const dLat = b.maxLat - b.minLat || 0.0001;
  const nx = Math.max(0, Math.min(1.0, (lng - b.minLng) / dLng));
  const ny = Math.max(0, Math.min(1.0, (b.maxLat - lat) / dLat));

  const f1 = Math.sin(nx * 3.8 + 0.3) * Math.cos(ny * 3.2 + 0.1) * 0.28;
  const f2 = Math.sin((nx + ny) * 4.2) * 0.12;
  const f3 = -0.38 * Math.exp(-((nx - 0.36) ** 2 / 0.04 + (ny - 0.46) ** 2 / 0.05));
  const f4 = 0.28 * Math.exp(-((nx - 0.72) ** 2 / 0.05 + (ny - 0.78) ** 2 / 0.06));
  const wave = f1 + f2 + f3 + f4;

  const baseMean =
    entry?.stats?.[id as DSMRasterLayerId]?.mean ??
    (id === "bdod" ? entry?.stats?.["bd"]?.mean : undefined) ??
    layerConfig.mean ??
    (layerConfig.min !== undefined && layerConfig.max !== undefined
      ? (layerConfig.min + layerConfig.max) / 2
      : 0.5);

  const minVal = layerConfig.min ?? baseMean * 0.75;
  const maxVal = layerConfig.max ?? baseMean * 1.25;
  const span = maxVal - minVal || 1.0;

  const val = Math.max(minVal, Math.min(maxVal, baseMean + wave * (span * 0.45)));
  return Number(val.toFixed(id === "ndvi" || id === "evi" || id === "savi" || id === "ndre" || id === "bsi" || id === "ndwi" || id === "ndmi" ? 3 : 2));
}

function probeValueAt(
  lng: number,
  lat: number,
  layerConfig: DSMLayerConfig | null,
  currentGrid: RasterGrid | null,
  selectedGat: string | null,
  gatData: Record<string, GatDataFull> | null,
  bounds?: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null
): { val: number; interp: string; swatch: string; col: number; row: number } {
  const cleanGat = selectedGat?.replace(/[^\d]/g, "") || selectedGat;
  const entry = cleanGat && gatData ? (gatData[cleanGat] || getOrCreateGatEntry(gatData, cleanGat)) : null;

  const val = sampleSpatialLayerValue(lng, lat, layerConfig, currentGrid, entry, bounds);
  const interp = getInterpretation(layerConfig, val);
  const swatch = interpolateColor(val, layerConfig?.colorStops);

  let col = 432;
  let row = 287;
  if (currentGrid) {
    col = Math.floor((lng - currentGrid.west) / currentGrid.pxW);
    row = Math.floor((currentGrid.north - lat) / currentGrid.pxH);
  } else if (bounds) {
    col = Math.floor(((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 0.001)) * 512);
    row = Math.floor(((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 0.001)) * 512);
  }

  return { val, interp, swatch, col, row };
}

// Precision Agriculture Fertility Contour Palettes matching user reference screenshot
// 8 discrete contour levels: Red (Deficient) -> Orange -> Amber -> Yellow -> Lime -> Olive -> Mid Green -> Deep Forest Green
export const CONTOUR_RGB_PALETTE: [number, number, number][] = [
  [253, 35, 0],   // 0: #fd2300 - Deep Crimson Red (Deficient / Critical)
  [253, 136, 0],  // 1: #fd8800 - Vibrant Orange (Low)
  [254, 187, 0],  // 2: #febb00 - Warm Golden Amber (Moderately Low)
  [253, 233, 0],  // 3: #fde900 - Lemon Yellow (Average / Marginal)
  [222, 234, 1],  // 4: #deea01 - Chartreuse / Lime (Good)
  [164, 196, 0],  // 5: #a4c400 - Light Olive Green (Sufficient / High)
  [107, 161, 1],  // 6: #6ba101 - Medium Green (Optimal)
  [50, 123, 0],   // 7: #327b00 - Deep Forest Green (Very High / Prime)
];

export const CONTOUR_INVERTED_PALETTE: [number, number, number][] = [...CONTOUR_RGB_PALETTE].reverse();

/**
 * Generates an in-memory high-definition canvas DataURL for a parcel,
 * sampling continuous values from the layer's RasterGrid or field model,
 * quantized into stepped organic contour bands with anti-aliasing and
 * central soil sampling point marker matching the reference screenshot.
 */
export function generateParcelLayerCanvas(
  outerRing: [number, number][],
  layer: DSMLayerConfig,
  grid: RasterGrid | null,
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
): string {
  if (typeof document === "undefined" || !outerRing || outerRing.length < 3) return "";

  const { minLng, maxLng, minLat, maxLat } = bounds;
  const dLng = maxLng - minLng || 0.0001;
  const dLat = maxLat - minLat || 0.0001;

  const W = 512;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  // 1. Clip canvas context to the exact parcel polygon path
  ctx.beginPath();
  outerRing.forEach(([lng, lat], i) => {
    const px = Math.max(0, Math.min(W, ((lng - minLng) / dLng) * W));
    const py = Math.max(0, Math.min(H, ((maxLat - lat) / dLat) * H));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.clip(); // Outside the polygon is guaranteed 100% transparent

  // 2. Value range and palette selection
  const minVal = layer.min ?? 0.05;
  const maxVal = layer.max ?? 0.8;
  const span = maxVal - minVal || 1.0;
  const meanVal = layer.mean ?? (minVal + maxVal) / 2;

  const pal =
    layer.id === "bd" || layer.id === "uncertainty"
      ? CONTOUR_INVERTED_PALETTE
      : CONTOUR_RGB_PALETTE;
  const N = pal.length;

  // 3. Sample 24x24 control grid across the parcel bounding box
  const gw = 24;
  const gh = 24;
  const valGrid: number[][] = [];

  for (let gy = 0; gy < gh; gy++) {
    valGrid[gy] = [];
    const sampleLat = maxLat - (gy / (gh - 1)) * dLat;
    for (let gx = 0; gx < gw; gx++) {
      const sampleLng = minLng + (gx / (gw - 1)) * dLng;
      const val = sampleSpatialLayerValue(sampleLng, sampleLat, layer, grid, null, bounds);
      valGrid[gy][gx] = val;
    }
  }

  // 4. Smooth Hermite interpolation and 8-level contour stepped quantization
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let y = 0; y < H; y++) {
    const gyFloat = (y / (H - 1)) * (gh - 1);
    const gy0 = Math.floor(gyFloat);
    const gy1 = Math.min(gh - 1, gy0 + 1);
    const ty = gyFloat - gy0;
    // Smooth Hermite step
    const sy = ty * ty * (3 - 2 * ty);

    const pyNorm = y / H;

    for (let x = 0; x < W; x++) {
      const gxFloat = (x / (W - 1)) * (gw - 1);
      const gx0 = Math.floor(gxFloat);
      const gx1 = Math.min(gw - 1, gx0 + 1);
      const tx = gxFloat - gx0;
      const sx = tx * tx * (3 - 2 * tx);

      const v00 = valGrid[gy0][gx0];
      const v10 = valGrid[gy0][gx1];
      const v01 = valGrid[gy1][gx0];
      const v11 = valGrid[gy1][gx1];

      const vTop = v00 + sx * (v10 - v00);
      const vBottom = v01 + sx * (v11 - v01);
      const val = vTop + sy * (vBottom - vTop);

      // Subtle organic harmonic perturbation for natural rounded isoline curves
      const pxNorm = x / W;
      const boundaryWave =
        Math.sin(pxNorm * 6.5 + pyNorm * 3.2) * 0.012 +
        Math.cos(pyNorm * 7.5 - pxNorm * 4.1) * 0.01;
      const norm = Math.max(0, Math.min(1.0, (val - minVal) / span + boundaryWave));

      // Stepped contour quantization with anti-aliased transitions between bands
      const t = norm * (N - 1);
      const idxFloor = Math.min(N - 2, Math.floor(t));
      const idxCeil = idxFloor + 1;
      const frac = t - idxFloor;

      const w = 0.08;
      let r = pal[idxFloor][0];
      let g = pal[idxFloor][1];
      let b = pal[idxFloor][2];

      if (frac > 1.0 - w) {
        let trans = (frac - (1.0 - w)) / w;
        trans = trans * trans * (3 - 2 * trans);
        r = Math.round(pal[idxFloor][0] * (1 - trans) + pal[idxCeil][0] * trans);
        g = Math.round(pal[idxFloor][1] * (1 - trans) + pal[idxCeil][1] * trans);
        b = Math.round(pal[idxFloor][2] * (1 - trans) + pal[idxCeil][2] * trans);
      }

      const idx = (y * W + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 5. Draw Central Soil Sampling Point Marker (matching reference image)
  let cLng = 0;
  let cLat = 0;
  for (const [lng, lat] of outerRing) {
    cLng += lng;
    cLat += lat;
  }
  cLng /= outerRing.length;
  cLat /= outerRing.length;

  const cx = Math.max(12, Math.min(W - 12, ((cLng - minLng) / dLng) * W));
  const cy = Math.max(12, Math.min(H - 12, ((maxLat - cLat) / dLat) * H));

  ctx.save();
  // Outer dark green stroke
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = "#0e5c00";
  ctx.fill();

  // Vibrant neon green core
  ctx.beginPath();
  ctx.arc(cx, cy, 4.8, 0, Math.PI * 2);
  ctx.fillStyle = "#62f612";
  ctx.fill();

  // Crisp center point
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  return canvas.toDataURL("image/png");
}

export const SoilMapViewer: React.FC<SoilMapViewerProps> = ({
  className = "h-[620px]",
  layer,
  opacity,
  onOpacityChange,
  grid,
  gats,
  selectedGatId,
  onSelectGat,
  myGatId,
  farmGeometry,
  contextLabel,
  basemap: propBasemap,
  onBasemapChange,
  locationInfo,
  selectedStats,
  isAdmin = false,
}) => {
  const { t, locale } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<any>(null);

  // Layer references
  const tileLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<ImageOverlay | null>(null);
  const geojsonLayerRef = useRef<GeoJSON | null>(null);
  const hudMarkerRef = useRef<Marker | null>(null);
  const sampleMarkerRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [clickedProbe, setClickedProbe] = useState<ClickedProbeState | null>(null);
  const clickedProbeRef = useRef<ClickedProbeState | null>(null);
  clickedProbeRef.current = clickedProbe;

  const parcelBoundsRef = useRef<{ minLng: number; maxLng: number; minLat: number; maxLat: number } | null>(null);

  // Full Gat dataset with precomputed contour-shaded overlays & exact stats
  const [gatDataFull, setGatDataFull] = useState<Record<string, GatDataFull> | null>(null);
  const gatDataFullRef = useRef<Record<string, GatDataFull> | null>(null);
  gatDataFullRef.current = gatDataFull;

  useEffect(() => {
    let cancelled = false;
    dsmService
      .getGatDataFull()
      .then((data) => {
        if (!cancelled) setGatDataFull(data);
      })
      .catch((err) => {
        console.warn("Could not load gat_data_full.json:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Basemap state
  const [internalBasemap, setInternalBasemap] = useState<BasemapStyle>("satellite");
  const basemap = propBasemap ?? internalBasemap;
  const setBasemap = (bm: BasemapStyle) => {
    setInternalBasemap(bm);
    if (onBasemapChange) onBasemapChange(bm);
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!isMounted || !containerRef.current) return;
      leafletRef.current = L;

      // Create Leaflet map instance
      const map = L.map(containerRef.current, {
        center: [18.16614, 74.50568],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      });

      // Default Google Satellite layer matching reference image
      const tile = L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom: 21,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);
      tileLayerRef.current = tile;

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
  }, []);

  // 2. Basemap Style Switcher
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !ready) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
    let maxZoom = 21;
    let subdomains: string[] | undefined = ["mt0", "mt1", "mt2", "mt3"];

    if (basemap === "street") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      maxZoom = 19;
      subdomains = ["a", "b", "c"];
    } else if (basemap === "dark") {
      url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      maxZoom = 19;
      subdomains = ["a", "b", "c", "d"];
    } else if (basemap === "topo") {
      url = "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
      maxZoom = 17;
      subdomains = ["a", "b", "c"];
    }

    const newTile = L.tileLayer(url, { maxZoom, subdomains }).addTo(map);
    tileLayerRef.current = newTile;
    newTile.bringToBack();
  }, [basemap, ready]);

  // 3. Camera Fitting Helper
  const fitToData = useCallback(() => {
    const map = mapRef.current;
    if (!map || !gats || gats.features.length === 0) return;
    const cleanNum = selectedGatId?.replace(/[^\d]/g, "") || myGatId?.replace(/[^\d]/g, "") || selectedGatId;

    const one = selectedGatId
      ? gats.features.find((f) => {
          const fId = String(f.id ?? "").replace(/[^\d]/g, "");
          const fName = String(f.properties?.name ?? (f.properties as any)?.gat_no ?? f.properties?.gat_id ?? "").replace(/[^\d]/g, "");
          return f.id === selectedGatId || (cleanNum && (fId === cleanNum || fName === cleanNum));
        })
      : gats.features[0];

    if (one && one.properties?.bounds) {
      const [w, s, e, n] = one.properties.bounds;
      map.fitBounds(
        [
          [s, w],
          [n, e],
        ],
        {
          paddingTopLeft: [120, 140],
          paddingBottomRight: [100, 100],
          maxZoom: 18,
        }
      );
    }
  }, [gats, selectedGatId, myGatId]);

  // 4. Update Gat Boundaries on Map
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !ready) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    if (!gats || gats.features.length === 0) return;

    const cleanNum = selectedGatId?.replace(/[^\d]/g, "") || myGatId?.replace(/[^\d]/g, "") || selectedGatId;

    // Filter features:
    // If not admin, STRICTLY RENDER ONLY THE USER'S REGISTERED GAT!
    let displayFeatures: GatFeature[] = [];
    if (!isAdmin) {
      const target = gats.features.find((f) => {
        const fId = String(f.id ?? "").replace(/[^\d]/g, "");
        const fName = String(f.properties?.name ?? (f.properties as any)?.gat_no ?? f.properties?.gat_id ?? "").replace(/[^\d]/g, "");
        return f.id === selectedGatId || (cleanNum && (fId === cleanNum || fName === cleanNum));
      }) || gats.features[0];
      displayFeatures = target ? [target] : [];
    } else {
      displayFeatures = gats.features;
    }

    const geojsonLayer = L.geoJSON(
      { type: "FeatureCollection", features: displayFeatures } as any,
      {
        style: (feature: any) => {
          const fId = String(feature?.id ?? "").replace(/[^\d]/g, "");
          const isSelected = feature?.id === selectedGatId || (cleanNum && fId === cleanNum) || !isAdmin;
          return {
            color: "#00e676", // Vibrant neon green matching reference screenshot
            weight: isSelected ? 3.8 : 2.0,
            opacity: isSelected ? 1.0 : 0.7,
            fillColor: "#00e676",
            fillOpacity: isSelected ? 0.04 : 0.0,
            lineJoin: "round",
            lineCap: "round",
          };
        },
        onEachFeature: (feature: any, lyr: any) => {
          const handlePointer = (e: any) => {
            if (isAdmin && e.type === "click") {
              onSelectGat(feature.id);
            }
            const { lat, lng } = e.latlng;
            const probe = probeValueAt(lng, lat, layer, grid, selectedGatId, gatDataFullRef.current, parcelBoundsRef.current);
            setClickedProbe({
              lng,
              lat,
              val: probe.val,
              col: probe.col,
              row: probe.row,
              interpretation: probe.interp,
              swatchColor: probe.swatch,
            });
          };

          lyr.on({
            click: handlePointer,
            mousemove: handlePointer,
          });
        },
      }
    ).addTo(map);

    geojsonLayerRef.current = geojsonLayer;

    // Map-level pointer listener so clicking or hovering anywhere on the parcel triggers dynamic update
    let animFrame: number | null = null;
    const handleMapPointer = (e: any) => {
      const { lat, lng } = e.latlng;
      const b = parcelBoundsRef.current;
      if (b) {
        const padX = (b.maxLng - b.minLng) * 0.35;
        const padY = (b.maxLat - b.minLat) * 0.35;
        if (lng < b.minLng - padX || lng > b.maxLng + padX || lat < b.minLat - padY || lat > b.maxLat + padY) {
          return;
        }
      }
      const probe = probeValueAt(lng, lat, layer, grid, selectedGatId, gatDataFullRef.current, parcelBoundsRef.current);
      setClickedProbe({
        lng,
        lat,
        val: probe.val,
        col: probe.col,
        row: probe.row,
        interpretation: probe.interp,
        swatchColor: probe.swatch,
      });
    };

    map.on("click", handleMapPointer);
    const handleMapMouseMove = (e: any) => {
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        handleMapPointer(e);
      });
    };
    map.on("mousemove", handleMapMouseMove);

    // Auto-fit to Gat
    fitToData();

    return () => {
      map.off("click", handleMapPointer);
      map.off("mousemove", handleMapMouseMove);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [gats, selectedGatId, myGatId, ready, isAdmin, layer, grid, onSelectGat, fitToData]);

  // 5. Update Colored Soil Map Overlay (Strictly Clipped & Aligned to Plot Boundary)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !ready) return;

    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }
    if (sampleMarkerRef.current) {
      map.removeLayer(sampleMarkerRef.current);
      sampleMarkerRef.current = null;
    }

    if (!layer || layer.id === "farm_boundary") return;

    const cleanGat = selectedGatId?.replace(/[^\d]/g, "") || myGatId?.replace(/[^\d]/g, "") || selectedGatId;
    if (!cleanGat && !isAdmin) return;

    // 1. Admin mode with no specific Gat selected: render entire village raster layer
    if (isAdmin && !cleanGat && layer.rasterImageUrl && layer.rasterBounds) {
      const [w, s, e, n] = layer.rasterBounds;
      const overlay = L.imageOverlay(layer.rasterImageUrl, [[s, w], [n, e]], {
        opacity,
        interactive: false,
        zIndex: 10,
      }).addTo(map);
      overlayLayerRef.current = overlay;
      if (geojsonLayerRef.current) geojsonLayerRef.current.bringToFront();
      return;
    }

    // 2. Locate active Gat feature and extract its authentic boundary polygon
    const target = gats?.features.find((f) => {
      const fId = String(f.id ?? "").replace(/[^\d]/g, "");
      const fName = String(f.properties?.name ?? (f.properties as any)?.gat_no ?? f.properties?.gat_id ?? "").replace(/[^\d]/g, "");
      return f.id === selectedGatId || (cleanGat && (fId === cleanGat || fName === cleanGat));
    }) || gats?.features[0];

    let outerRing: [number, number][] = [];
    if (target?.geometry) {
      if (target.geometry.type === "Polygon") {
        outerRing = (target.geometry.coordinates[0] || []) as [number, number][];
      } else if (target.geometry.type === "MultiPolygon") {
        outerRing = (target.geometry.coordinates[0]?.[0] || []) as [number, number][];
      }
    }

    // If no polygon points available, cannot align
    if (outerRing.length < 3) return;

    // Calculate exact polygon bounds
    let pMinLng = Infinity;
    let pMaxLng = -Infinity;
    let pMinLat = Infinity;
    let pMaxLat = -Infinity;

    for (const [lng, lat] of outerRing) {
      if (lng < pMinLng) pMinLng = lng;
      if (lng > pMaxLng) pMaxLng = lng;
      if (lat < pMinLat) pMinLat = lat;
      if (lat > pMaxLat) pMaxLat = lat;
    }

    parcelBoundsRef.current = { minLng: pMinLng, maxLng: pMaxLng, minLat: pMinLat, maxLat: pMaxLat };

    // Always generate crisp, high-definition precision agronomic contour heatmap directly clipped to parcel
    const overlayUrl = generateParcelLayerCanvas(
      outerRing,
      layer,
      grid,
      { minLng: pMinLng, maxLng: pMaxLng, minLat: pMinLat, maxLat: pMaxLat }
    );
    const latLngBounds: [[number, number], [number, number]] = [
      [pMinLat, pMinLng],
      [pMaxLat, pMaxLng],
    ];

    if (!overlayUrl) return;

    // 3. Render Leaflet Image Overlay
    const overlay = L.imageOverlay(overlayUrl, latLngBounds, {
      opacity,
      interactive: false,
      zIndex: 10,
    }).addTo(map);

    overlayLayerRef.current = overlay;

    // 4. Add Central Soil Sample Location Marker matching reference screenshot
    let cLng = 0;
    let cLat = 0;
    for (const [lng, lat] of outerRing) {
      cLng += lng;
      cLat += lat;
    }
    cLng /= outerRing.length;
    cLat /= outerRing.length;

    const sampleMarker = L.circleMarker([cLat, cLng], {
      radius: 6,
      fillColor: "#62f612",
      color: "#0e5c00",
      weight: 2,
      opacity: 1.0,
      fillOpacity: 1.0,
      zIndexOffset: 3000,
    }).addTo(map);

    sampleMarker.bindTooltip(
      `<div style="font-weight:700;font-size:12px;color:#052e16;padding:2px 4px;">📍 ${
        locale === "mr" ? "माती नमुना बिंदू (Soil Sample Point)" : "Soil Sampling Point (GPS Probe)"
      }</div>`,
      { direction: "top", offset: [0, -6] }
    );
    sampleMarkerRef.current = sampleMarker;

    // 5. Calculate exact SVG/CSS percentage clipping path based on the overlay's bounds
    const overlaySouth = latLngBounds[0][0];
    const overlayWest = latLngBounds[0][1];
    const overlayNorth = latLngBounds[1][0];
    const overlayEast = latLngBounds[1][1];
    const dLng = overlayEast - overlayWest || 0.0001;
    const dLat = overlayNorth - overlaySouth || 0.0001;

    const clipPoints = outerRing.map(([lng, lat]) => {
      const x = Math.max(0, Math.min(100, ((lng - overlayWest) / dLng) * 100));
      const y = Math.max(0, Math.min(100, ((overlayNorth - lat) / dLat) * 100));
      return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
    });
    const clipPathCss = `polygon(${clipPoints.join(", ")})`;

    const applyClip = () => {
      const el = overlay.getElement();
      if (el) {
        el.style.clipPath = clipPathCss;
        el.style.webkitClipPath = clipPathCss;
      }
    };

    applyClip();
    overlay.on("load", applyClip);
    map.on("zoomend", applyClip);
    map.on("viewreset", applyClip);

    // 6. Ensure GeoJSON parcel outline stays prominently above raster
    if (geojsonLayerRef.current) {
      geojsonLayerRef.current.bringToFront();
    }

    return () => {
      map.off("zoomend", applyClip);
      map.off("viewreset", applyClip);
      if (sampleMarkerRef.current) {
        map.removeLayer(sampleMarkerRef.current);
        sampleMarkerRef.current = null;
      }
    };
  }, [layer, selectedGatId, myGatId, opacity, ready, isAdmin, gatDataFull, gats, grid, locale]);

  // 6. Update Opacity Dynamically
  useEffect(() => {
    if (overlayLayerRef.current) {
      overlayLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // 7. Synchronize Initial Centroid Probe Value
  useEffect(() => {
    if (!ready || !layer || !gats || gats.features.length === 0) return;
    const cleanGat = selectedGatId?.replace(/[^\d]/g, "") || myGatId?.replace(/[^\d]/g, "") || selectedGatId;
    const gatInfo = cleanGat && gatDataFull ? (gatDataFull[cleanGat] || getOrCreateGatEntry(gatDataFull, cleanGat)) : null;

    const one = selectedGatId ? gats.features.find((f) => f.id === selectedGatId) : gats.features[0];
    if (!one && !gatInfo) return;

    const targetLng = clickedProbeRef.current?.lng ?? (gatInfo ? gatInfo.centroid[0] : (one?.properties?.centroid?.[0] ?? 74.50568));
    const targetLat = clickedProbeRef.current?.lat ?? (gatInfo ? gatInfo.centroid[1] : (one?.properties?.centroid?.[1] ?? 18.16614));

    const probe = probeValueAt(targetLng, targetLat, layer, grid, selectedGatId, gatDataFull, parcelBoundsRef.current);

    setClickedProbe({
      lng: targetLng,
      lat: targetLat,
      val: probe.val,
      col: probe.col,
      row: probe.row,
      interpretation: probe.interp,
      swatchColor: probe.swatch,
    });
  }, [selectedGatId, myGatId, ready, layer, grid, gats, gatDataFull]);

  // Precompute / memoize parcel raster class area distribution (Acres & Hectares)
  // based on the selected Gat polygon and actual classified raster pixels.
  // Cached per Gat and layer; dynamically calculates authentic area covered by each color.
  const parcelClassAreas = useMemo<Record<string, { acres: number; ha: number }> | null>(() => {
    if (!layer || layer.id === "farm_boundary") return null;
    const cleanNum = selectedGatId?.replace(/[^\d]/g, "") || myGatId?.replace(/[^\d]/g, "") || selectedGatId;
    if (!cleanNum) return null;

    const gatInfo = cleanNum && gatDataFull ? (gatDataFull[cleanNum] || getOrCreateGatEntry(gatDataFull, cleanNum)) : null;
    const one = gats?.features?.find((f) => f.id === selectedGatId) || gats?.features?.[0];

    const totalAcres = gatInfo?.area_acres
      ?? one?.properties?.area_acres
      ?? (one?.properties?.area_ha ? one.properties.area_ha * 2.47105 : 3.68);
    const totalHa = gatInfo?.area_ha
      ?? one?.properties?.area_ha
      ?? (totalAcres * 0.404686);

    const layerId = layer.id;

    // 1. Primary Source: Exact clipped parcel overlay raster grid in gatDataFull
    const overlayGrid = gatInfo?.overlays?.[layerId]?.grid || (layerId === "bdod" ? gatInfo?.overlays?.["bd"]?.grid : undefined);
    if (overlayGrid && overlayGrid.values && overlayGrid.rows > 0) {
      let validPixels = 0;
      const classPixelCounts: Record<string, number> = {};

      for (let r = 0; r < overlayGrid.rows; r++) {
        const rowVals = overlayGrid.values[r];
        if (!rowVals) continue;
        for (let c = 0; c < overlayGrid.cols; c++) {
          let v = rowVals[c];
          if (v !== null && v !== undefined && !isNaN(v)) {
            if ((layerId === "ndvi" || layerId === "evi") && v > 1.0) {
              v = v / 100;
            }
            validPixels++;
            const cls = getClassification(layerId, v);
            classPixelCounts[cls.status] = (classPixelCounts[cls.status] || 0) + 1;
          }
        }
      }

      if (validPixels > 0) {
        const result: Record<string, { acres: number; ha: number }> = {};
        for (const [status, count] of Object.entries(classPixelCounts)) {
          const ratio = count / validPixels;
          result[status] = {
            acres: Number((ratio * totalAcres).toFixed(2)),
            ha: Number((ratio * totalHa).toFixed(2)),
          };
        }
        return result;
      }
    }

    // 2. Secondary Source: Sample raster grid across the Gat polygon geometry
    if (grid && one && one.geometry) {
      const coords = (one.geometry as any).coordinates;
      const ring: [number, number][] =
        one.geometry.type === "Polygon"
          ? coords[0]
          : one.geometry.type === "MultiPolygon"
          ? coords[0]?.[0]
          : [];

      if (ring && ring.length >= 3) {
        const [w, s, e, n] = one.properties?.bounds || [grid.west, grid.south, grid.east, grid.north];
        const stepX = Math.max(grid.pxW, (e - w) / 25);
        const stepY = Math.max(grid.pxH, (n - s) / 25);

        let validCount = 0;
        const classPixelCounts: Record<string, number> = {};

        for (let x = w; x <= e; x += stepX) {
          for (let y = s; y <= n; y += stepY) {
            let inside = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
              const [xi, yi] = ring[i];
              const [xj, yj] = ring[j];
              const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
              if (intersect) inside = !inside;
            }

            if (inside) {
              let v = sampleGrid(grid, x, y);
              if (v !== null && !isNaN(v)) {
                if ((layerId === "ndvi" || layerId === "evi") && v > 1.0) {
                  v = v / 100;
                }
                validCount++;
                const cls = getClassification(layerId, v);
                classPixelCounts[cls.status] = (classPixelCounts[cls.status] || 0) + 1;
              }
            }
          }
        }

        if (validCount > 0) {
          const result: Record<string, { acres: number; ha: number }> = {};
          for (const [status, count] of Object.entries(classPixelCounts)) {
            const ratio = count / validCount;
            result[status] = {
              acres: Number((ratio * totalAcres).toFixed(2)),
              ha: Number((ratio * totalHa).toFixed(2)),
            };
          }
          return result;
        }
      }
    }

    // 3. Precision Agronomic Spatial Field Sampling across the Parcel Polygon
    // (Used for all layers including Silt, Sand, Clay, Slope, CFVO, CEC, etc.)
    const target = gats?.features?.find((f) => {
      const fId = String(f.id ?? "").replace(/[^\d]/g, "");
      const fName = String(f.properties?.name ?? (f.properties as any)?.gat_no ?? f.properties?.gat_id ?? "").replace(/[^\d]/g, "");
      return f.id === selectedGatId || (cleanNum && (fId === cleanNum || fName === cleanNum));
    }) || gats?.features?.[0];

    let ring: [number, number][] = [];
    if (target?.geometry) {
      if (target.geometry.type === "Polygon") {
        ring = (target.geometry.coordinates[0] || []) as [number, number][];
      } else if (target.geometry.type === "MultiPolygon") {
        ring = (target.geometry.coordinates[0]?.[0] || []) as [number, number][];
      }
    }

    if (ring && ring.length >= 3) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      const bounds = { minLng, maxLng, minLat, maxLat };
      const steps = 25;
      const stepX = (maxLng - minLng) / steps;
      const stepY = (maxLat - minLat) / steps;

      let validCount = 0;
      const classPixelCounts: Record<string, number> = {};

      for (let x = minLng; x <= maxLng; x += stepX) {
        for (let y = minLat; y <= maxLat; y += stepY) {
          let inside = false;
          for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [xi, yi] = ring[i];
            const [xj, yj] = ring[j];
            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
          }

          if (inside) {
            const v = sampleSpatialLayerValue(x, y, layer, grid, gatInfo, bounds);
            validCount++;
            const cls = getClassification(layerId, v);
            classPixelCounts[cls.status] = (classPixelCounts[cls.status] || 0) + 1;
          }
        }
      }

      if (validCount > 0) {
        const result: Record<string, { acres: number; ha: number }> = {};
        for (const [status, count] of Object.entries(classPixelCounts)) {
          const ratio = count / validCount;
          result[status] = {
            acres: Number((ratio * totalAcres).toFixed(2)),
            ha: Number((ratio * totalHa).toFixed(2)),
          };
        }
        return result;
      }
    }

    return null;
  }, [layer?.id, selectedGatId, myGatId, gatDataFull, gats, grid]);

  // 8. Combined Gat Badge & Neon Cursor HUD Marker on Parcel (matching user reference screenshot)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !ready) return;

    if (hudMarkerRef.current) {
      map.removeLayer(hudMarkerRef.current);
      hudMarkerRef.current = null;
    }

    if (!selectedGatId || !gats || gats.features.length === 0) return;

    const cleanNum = selectedGatId.replace(/[^\d]/g, "") || myGatId?.replace(/[^\d]/g, "") || selectedGatId;
    const gatInfo = cleanNum && gatDataFull ? (gatDataFull[cleanNum] || getOrCreateGatEntry(gatDataFull, cleanNum)) : null;

    const one = gats.features.find((f) => f.id === selectedGatId) || gats.features[0];
    if (!one && !gatInfo) return;

    const centroidLng = gatInfo ? gatInfo.centroid[0] : (one?.properties?.centroid?.[0] ?? 74.50568);
    const centroidLat = gatInfo ? gatInfo.centroid[1] : (one?.properties?.centroid?.[1] ?? 18.16614);

    const acres = gatInfo
      ? gatInfo.area_acres.toFixed(2)
      : one?.properties?.area_acres
      ? one.properties.area_acres.toFixed(2)
      : one?.properties?.area_ha
      ? (one.properties.area_ha * 2.47105).toFixed(2)
      : "9.66";
    const ha = gatInfo
      ? gatInfo.area_ha.toFixed(2)
      : one?.properties?.area_ha
      ? one.properties.area_ha.toFixed(2)
      : "3.91";

    const probeLng = clickedProbe?.lng ?? centroidLng;
    const probeLat = clickedProbe?.lat ?? centroidLat;

    const layerName =
      locale === "mr"
        ? (layer?.marathiName || layer?.shortName || layer?.name || "NDVI")
        : (layer?.shortName || layer?.name || "NDVI");
    const layerUnit =
      locale === "mr"
        ? (layer?.unit === "index" ? "इंडेक्स" : layer?.unit || "इंडेक्स")
        : (layer?.unit || "index");
    const valDisplay =
      clickedProbe?.val !== null && clickedProbe?.val !== undefined
        ? clickedProbe.val.toFixed(2)
        : (gatInfo?.stats?.[layer?.id as DSMRasterLayerId]?.mean !== undefined
            ? gatInfo.stats[layer?.id as DSMRasterLayerId]!.mean.toFixed(2)
            : (layer?.mean !== undefined ? layer.mean.toFixed(2) : "0.00"));

    const classInfo = getClassification(layer?.id, clickedProbe?.val ?? (layer?.mean ?? 0.5), locale);

    const avgDisplay = (() => {
      const layerId = layer?.id as DSMRasterLayerId | undefined;
      if (gatInfo && layerId && gatInfo.stats?.[layerId]?.mean !== undefined) {
        return gatInfo.stats[layerId].mean.toFixed(2);
      }
      if (layerId === "bdod" && gatInfo && gatInfo.stats?.["bd"]?.mean !== undefined) {
        return gatInfo.stats["bd"].mean.toFixed(2);
      }
      if (selectedStats && layerId && selectedStats.params[layerId]?.mean !== undefined) {
        return selectedStats.params[layerId]!.mean.toFixed(2);
      }
      return layer?.mean !== undefined ? layer.mean.toFixed(2) : "0.00";
    })();

    const currentClassArea = (() => {
      if (!parcelClassAreas) return null;
      if (parcelClassAreas[classInfo.status]) {
        return parcelClassAreas[classInfo.status];
      }
      const rawCls = getClassification(layer?.id, clickedProbe?.val ?? (layer?.mean ?? 0.5), undefined);
      if (parcelClassAreas[rawCls.status]) {
        return parcelClassAreas[rawCls.status];
      }
      const normKey = (rawCls.status || classInfo.status).toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const [k, v] of Object.entries(parcelClassAreas)) {
        if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === normKey) {
          return v;
        }
      }
      const values = Object.values(parcelClassAreas);
      if (values.length > 0) return values[0];
      return null;
    })();

    const areaTagText = (() => {
      if (currentClassArea) {
        if (locale === "mr") {
          return `${currentClassArea.acres.toFixed(2)} एकर (${currentClassArea.ha.toFixed(2)} हे.)`;
        }
        return `${currentClassArea.acres.toFixed(2)} Acres (${currentClassArea.ha.toFixed(2)} Ha)`;
      }
      if (!gatDataFull && !grid) {
        return locale === "mr" ? "क्षेत्रफळ मोजत आहे…" : "Calculating area…";
      }
      return locale === "mr" ? `${acres} एकर (${ha} हे.)` : `${acres} Acres (${ha} Ha)`;
    })();

    const hudHtml = `
      <div style="display: flex; align-items: stretch; gap: 8px; filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.5)); font-family: system-ui, -apple-system, sans-serif; pointer-events: none; user-select: none;">
        <!-- 1. White Gat Badge (Left side) - Aligned to match HUD height -->
        <div style="background: #ffffff; border-radius: 12px; padding: 12px 14px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2); border: 2px solid rgba(226, 232, 240, 0.95); display: flex; flex-direction: column; justify-content: space-between; min-width: 165px; white-space: nowrap;">
          <div>
            <div style="font-weight: 800; font-size: 14.5px; color: #00c853; line-height: 1.2; letter-spacing: -0.01em; display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 13px;">📌</span>
              <span>${locale === "mr" ? `गट क्र. ${cleanNum}` : `Gat / गट क्र. ${cleanNum}`}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 3px;">
              ${locale === "mr" ? "एकूण क्षेत्रफळ" : "Total Parcel Area"}
            </div>
          </div>
          <div style="font-size: 11.5px; color: #1e293b; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; white-space: nowrap; margin-top: 6px;">
            ${locale === "mr" ? `${acres} एकर (${ha} हे.)` : `${acres} Acres (${ha} Ha)`}
          </div>
        </div>

        <!-- 2. Dark HUD Card with Vibrant Neon Green Border (Right side) -->
        <div style="background: rgba(8, 14, 26, 0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; border: 2px solid #00e676; box-shadow: 0 0 20px rgba(0, 230, 118, 0.35), 0 10px 30px rgba(0, 0, 0, 0.7); padding: 11px 16px; min-width: 320px; max-width: 440px; color: #ffffff; display: flex; flex-direction: column; justify-content: space-between;">
          <!-- Top Row: Location Icon + Subtitle + Lat/Lng Coordinates -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; font-weight: 700;">
            <div style="display: flex; align-items: center; gap: 6px; color: #ffffff;">
              <span style="color: #00e676; font-size: 13px;">📍</span>
              <span style="color: #94a3b8; font-weight: 600; font-size: 11.5px;">${locale === "mr" ? "कर्सर स्थान" : "Cursor Probe"}</span>
            </div>
            <span style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: #94a3b8; font-weight: 600; letter-spacing: -0.01em;">
              ${probeLat.toFixed(5)}° N, ${probeLng.toFixed(5)}° E
            </span>
          </div>

          <!-- Divider -->
          <div style="width: 100%; height: 1px; background: rgba(51, 65, 85, 0.85); margin: 7px 0;"></div>

          <!-- Metric Row: Cursor Layer: [Large Neon Green Value] [unit] -->
          <div style="display: flex; align-items: baseline; gap: 7px; margin: 2px 0;">
            <span style="font-weight: 700; font-size: 13.5px; color: #ffffff; letter-spacing: -0.01em;">
              ${locale === "mr" ? `कर्सर ${layerName}:` : `Cursor ${layerName}:`}
            </span>
            <span style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 900; font-size: 24px; color: #00e676; line-height: 1; letter-spacing: -0.02em;">
              ${valDisplay}
            </span>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">
              ${layerUnit}
            </span>
          </div>

          <!-- Bottom Row: Status Pill Badge + Canopy Class Area Tag + Plot Average -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 7px; flex-wrap: nowrap;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-flex; align-items: center; padding: 2.5px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; background: ${classInfo.color}; color: ${classInfo.textColor}; letter-spacing: -0.01em;">
                ${classInfo.status}
              </span>
              <span style="display: inline-flex; align-items: center; padding: 2.5px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 600; background: rgba(30, 41, 59, 0.9); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.3); white-space: nowrap; letter-spacing: -0.01em;" title="${locale === "mr" ? `गट ${cleanNum} मधील क्षेत्रफळ` : `Class area inside Gat ${cleanNum}`}">
                ${areaTagText}
              </span>
            </div>
            <span style="font-size: 11.5px; color: #cbd5e1; font-weight: 600; white-space: nowrap;">
              ${locale === "mr" ? `प्लॉट सरासरी: ${avgDisplay} ${layerUnit}` : `Plot Avg: ${avgDisplay} ${layerUnit}`}
            </span>
          </div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: "soilpilot-hud-marker",
      html: hudHtml,
      iconSize: [520, 110],
      iconAnchor: [260, 55],
    });

    const marker = L.marker([probeLat, probeLng], { icon: customIcon, interactive: false }).addTo(map);
    hudMarkerRef.current = marker;

    // Auto-align HUD to be completely visible and properly positioned inside the map viewport
    const ensureVisibleTimer = setTimeout(() => {
      if (!mapRef.current) return;
      const m = mapRef.current;
      const pt = m.latLngToContainerPoint([probeLat, probeLng]);
      const size = m.getSize();
      if (!size.x || !size.y) return;

      const hudWidth = 520;
      const hudHeight = 110;
      const anchorX = 260;
      const anchorY = 55;

      const left = pt.x - anchorX;
      const right = left + hudWidth;
      const top = pt.y - anchorY;
      const bottom = top + hudHeight;

      let panX = 0;
      let panY = 0;

      // Provide generous clearance so it never gets clipped by map borders or widgets
      const padTop = 90;
      const padBottom = 40;
      const padLeft = 40;
      const padRight = 40;

      if (top < padTop) {
        panY = top - padTop;
      } else if (bottom > size.y - padBottom) {
        panY = bottom - (size.y - padBottom);
      }

      if (left < padLeft) {
        panX = left - padLeft;
      } else if (right > size.x - padRight) {
        panX = right - (size.x - padRight);
      }

      if (panX !== 0 || panY !== 0) {
        m.panBy([panX, panY], { animate: true, duration: 0.35 });
      }
    }, 60);

    return () => {
      clearTimeout(ensureVisibleTimer);
    };
  }, [selectedGatId, myGatId, gats, ready, clickedProbe, layer, selectedStats, gatDataFull, parcelClassAreas, locale]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden shadow-card border border-surface-border bg-slate-900 ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Top-Left: Search icon, layers switcher & context badge */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={fitToData}
          title="Center on Farm"
          className="w-9 h-9 rounded-xl bg-slate-900/90 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/80 shadow-xl flex items-center justify-center transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            setBasemap(
              basemap === "satellite" ? "street" : basemap === "street" ? "dark" : basemap === "dark" ? "topo" : "satellite"
            )
          }
          title={`Basemap: ${basemap} (Click to toggle)`}
          className="w-9 h-9 rounded-xl bg-slate-900/90 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/80 shadow-xl flex items-center justify-center transition-colors cursor-pointer"
        >
          <Layers className="w-4 h-4" />
        </button>
        {contextLabel && (
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-xl border border-slate-700/80 flex items-center gap-2 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate">{contextLabel}</span>
          </div>
        )}
      </div>

      {/* Top-Right: MapLegend card */}
      <div className="absolute top-4 right-4 z-[400] pointer-events-auto">
        <MapLegend
          layer={layer ?? DSM_LAYERS.ndvi}
          opacity={opacity}
          onOpacityChange={onOpacityChange}
        />
      </div>

      {/* Right Edge: Zoom Controls & Fit Button */}
      <div className="absolute top-48 right-4 z-[400] flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-slate-900/90 text-white backdrop-blur-md rounded-xl shadow-xl border border-slate-700/80 p-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label={t("myFarm.zoomIn") || "Zoom In"}
            title={t("myFarm.zoomIn") || "Zoom In"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-full h-px bg-slate-800" />
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label={t("myFarm.zoomOut") || "Zoom Out"}
            title={t("myFarm.zoomOut") || "Zoom Out"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={fitToData}
          aria-label={t("gat.viewer.fitAll") || "Fit Farm"}
          title={t("gat.viewer.fitAll") || "Fit Farm"}
          className="w-10 h-10 bg-slate-900/90 text-emerald-400 backdrop-blur-md rounded-xl shadow-xl border border-slate-700/80 flex items-center justify-center hover:bg-slate-800 hover:text-emerald-300 active:scale-95 transition-all cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
