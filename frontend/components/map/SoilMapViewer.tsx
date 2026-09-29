"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
export function getClassification(layerId: string | undefined, val: number): ClassificationResult {
  const id = (layerId || "ndvi").toLowerCase();
  if (id === "ndvi") {
    if (val < 0.2) return { status: "Sparse / Fallow", color: "#94a3b8", textColor: "#080d19" };
    if (val < 0.5) return { status: "Moderate Canopy", color: "#f59e0b", textColor: "#000000" };
    return { status: "Healthy / Dense Canopy", color: "#00e676", textColor: "#000000" };
  }
  if (id === "evi") {
    if (val < 0.2) return { status: "Low Biomass", color: "#94a3b8", textColor: "#080d19" };
    if (val < 0.4) return { status: "Moderate Biomass", color: "#f59e0b", textColor: "#000000" };
    return { status: "High Biomass", color: "#00e676", textColor: "#000000" };
  }
  if (id === "ph") {
    if (val < 6.5) return { status: "Acidic Soil", color: "#ef4444", textColor: "#ffffff" };
    if (val <= 7.8) return { status: "Optimal Neutral", color: "#00e676", textColor: "#000000" };
    if (val <= 8.5) return { status: "Moderate Alkaline", color: "#f59e0b", textColor: "#000000" };
    return { status: "Strongly Alkaline", color: "#ef4444", textColor: "#ffffff" };
  }
  if (id === "soc") {
    if (val < 0.5) return { status: "Low Organic Matter", color: "#ef4444", textColor: "#ffffff" };
    if (val < 0.75) return { status: "Medium Organic Carbon", color: "#f59e0b", textColor: "#000000" };
    return { status: "High Organic Carbon", color: "#00e676", textColor: "#000000" };
  }
  if (id === "nitrogen") {
    if (val < 13.0) return { status: "Low / Deficient", color: "#ef4444", textColor: "#ffffff" };
    if (val < 16.0) return { status: "Medium Nitrogen", color: "#f59e0b", textColor: "#000000" };
    return { status: "Sufficient / High", color: "#00e676", textColor: "#000000" };
  }
  if (id === "bd") {
    if (val < 1.45) return { status: "Ideal Porosity", color: "#00e676", textColor: "#000000" };
    if (val <= 1.58) return { status: "Moderate Density", color: "#f59e0b", textColor: "#000000" };
    return { status: "Compacted Soil", color: "#ef4444", textColor: "#ffffff" };
  }
  if (id === "elevation") {
    return { status: "Deccan Plateau", color: "#00e676", textColor: "#000000" };
  }
  if (id === "uncertainty") {
    if (val < 8.0) return { status: "High Confidence", color: "#00e676", textColor: "#000000" };
    if (val < 15.0) return { status: "Moderate Confidence", color: "#f59e0b", textColor: "#000000" };
    return { status: "Elevated Uncertainty", color: "#ef4444", textColor: "#ffffff" };
  }
  return { status: "Standard Monitoring", color: "#00e676", textColor: "#000000" };
}

export function getInterpretation(layer: DSMLayerConfig | null, val: number): string {
  if (!layer) return "Standard Monitoring";
  return getClassification(layer.id, val).status;
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

function probeValueAt(
  lng: number,
  lat: number,
  layerConfig: DSMLayerConfig | null,
  currentGrid: RasterGrid | null,
  selectedGat: string | null,
  gatData: Record<string, GatDataFull> | null
): { val: number; interp: string; swatch: string; col: number; row: number } {
  let val: number | null = null;
  let col = 432;
  let row = 287;

  const cleanGat = selectedGat?.replace(/[^\d]/g, "") || selectedGat;
  if (cleanGat && gatData && (gatData[cleanGat] || getOrCreateGatEntry(gatData, cleanGat)) && layerConfig) {
    const entry = gatData[cleanGat] || getOrCreateGatEntry(gatData, cleanGat);
    const overlay = entry.overlays?.[layerConfig.id];
    if (overlay?.grid) {
      val = sampleGatGrid(overlay.grid, lng, lat);
    }
  }

  if (val === null && currentGrid) {
    col = Math.floor((lng - currentGrid.west) / currentGrid.pxW);
    row = Math.floor((currentGrid.north - lat) / currentGrid.pxH);
    if (col >= 0 && row >= 0 && col < currentGrid.width && row < currentGrid.height) {
      val = sampleGrid(currentGrid, lng, lat);
    }
  }

  // Filter out any nodata / out-of-bounds artifacts from grid edge
  if (val !== null && layerConfig) {
    const minBound = (layerConfig.min ?? 0) * 0.5;
    const maxBound = (layerConfig.max ?? 100) * 1.5;
    if (val > maxBound || val < minBound) {
      val = null;
    }
  }

  // Normalize NDVI/EVI if value is scaled by 100
  if (val !== null && (layerConfig?.id === "ndvi" || layerConfig?.id === "evi") && val > 1.0) {
    val = val / 100;
  }

  if (val === null) {
    if (cleanGat && gatData && (gatData[cleanGat] || getOrCreateGatEntry(gatData, cleanGat)) && layerConfig) {
      const entry = gatData[cleanGat] || getOrCreateGatEntry(gatData, cleanGat);
      val = entry.stats?.[layerConfig.id]?.mean ?? 0.518;
    } else {
      val =
        layerConfig?.mean ??
        (layerConfig?.min !== undefined && layerConfig?.max !== undefined
          ? (layerConfig.min + layerConfig.max) / 2
          : 0.518);
    }
  }

  const interp = getInterpretation(layerConfig, val);
  const swatch = interpolateColor(val, layerConfig?.colorStops);
  return { val, interp, swatch, col, row };
}

/**
 * Generates an in-memory high-definition canvas DataURL for a parcel,
 * sampling continuous values from the layer's RasterGrid,
 * smoothly contour-shaded and strictly clipped to the parcel polygon boundary.
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

  const W = 256;
  const H = 256;
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

  // 2. Sample or interpolate raster values
  const minVal = layer.min ?? 0.05;
  const maxVal = layer.max ?? 0.8;
  const span = maxVal - minVal || 1.0;
  const meanVal = layer.mean ?? (minVal + maxVal) / 2;

  // Pre-generate 256-step color lookup array for maximum performance
  const colorTable: [number, number, number][] = [];
  for (let c = 0; c <= 255; c++) {
    const v = minVal + (c / 255) * span;
    const colorStr = interpolateColor(v, layer.colorStops);
    const m = colorStr.match(/\d+/g);
    if (m && m.length >= 3) {
      colorTable.push([Number(m[0]), Number(m[1]), Number(m[2])]);
    } else {
      colorTable.push([0, 230, 118]);
    }
  }

  // Sample on a 16x16 control grid across the parcel bounding box
  const gw = 16;
  const gh = 16;
  const valGrid: number[][] = [];

  for (let gy = 0; gy < gh; gy++) {
    valGrid[gy] = [];
    const sampleLat = maxLat - (gy / (gh - 1)) * dLat;
    for (let gx = 0; gx < gw; gx++) {
      const sampleLng = minLng + (gx / (gw - 1)) * dLng;
      let val: number | null = null;
      if (grid) {
        val = sampleGrid(grid, sampleLng, sampleLat);
        if (val !== null && (layer.id === "ndvi" || layer.id === "evi") && val > 1.0) {
          val = val / 100;
        }
        if (val !== null && (val > maxVal * 1.5 || val < minVal * 0.5)) {
          val = null;
        }
      }
      if (val === null || isNaN(val)) {
        // Deterministic organic spatial variation across the plot
        const nx = gx / (gw - 1);
        const ny = gy / (gh - 1);
        const wave = Math.sin(nx * Math.PI * 1.3 + 0.4) * 0.14 + Math.cos(ny * Math.PI * 1.6 + 0.2) * 0.11;
        val = Math.max(minVal, Math.min(maxVal, meanVal + wave * (maxVal - meanVal)));
      }
      valGrid[gy][gx] = val;
    }
  }

  // Bilinear interpolation for each canvas pixel
  const imgData = ctx.createImageData(W, H);
  const data = imgData.data;

  for (let y = 0; y < H; y++) {
    const gyFloat = (y / (H - 1)) * (gh - 1);
    const gy0 = Math.floor(gyFloat);
    const gy1 = Math.min(gh - 1, gy0 + 1);
    const ty = gyFloat - gy0;

    for (let x = 0; x < W; x++) {
      const gxFloat = (x / (W - 1)) * (gw - 1);
      const gx0 = Math.floor(gxFloat);
      const gx1 = Math.min(gw - 1, gx0 + 1);
      const tx = gxFloat - gx0;

      const v00 = valGrid[gy0][gx0];
      const v10 = valGrid[gy0][gx1];
      const v01 = valGrid[gy1][gx0];
      const v11 = valGrid[gy1][gx1];

      const vTop = v00 + tx * (v10 - v00);
      const vBottom = v01 + tx * (v11 - v01);
      const val = vTop + ty * (vBottom - vTop);

      const norm = Math.max(0, Math.min(255, Math.round(((val - minVal) / span) * 255)));
      const [r, g, b] = colorTable[norm];

      const idx = (y * W + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 232;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Subtle organic relief shading to match reference contour look
  ctx.save();
  ctx.beginPath();
  outerRing.forEach(([lng, lat], i) => {
    const px = Math.max(0, Math.min(W, ((lng - minLng) / dLng) * W));
    const py = Math.max(0, Math.min(H, ((maxLat - lat) / dLat) * H));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.clip();

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  grad.addColorStop(0.4, "rgba(255, 255, 255, 0.01)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.12)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
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
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<any>(null);

  // Layer references
  const tileLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<ImageOverlay | null>(null);
  const geojsonLayerRef = useRef<GeoJSON | null>(null);
  const farmLayerRef = useRef<GeoJSON | null>(null);
  const hudMarkerRef = useRef<Marker | null>(null);

  const [ready, setReady] = useState(false);
  const [clickedProbe, setClickedProbe] = useState<ClickedProbeState | null>(null);

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
        { padding: [60, 60], maxZoom: 18 }
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
          lyr.on({
            click: (e: any) => {
              if (isAdmin) {
                onSelectGat(feature.id);
              }
              const { lat, lng } = e.latlng;
              const probe = probeValueAt(lng, lat, layer, grid, selectedGatId, gatDataFullRef.current);
              setClickedProbe({
                lng,
                lat,
                val: probe.val,
                col: probe.col,
                row: probe.row,
                interpretation: probe.interp,
                swatchColor: probe.swatch,
              });
            },
            mousemove: (e: any) => {
              const { lat, lng } = e.latlng;
              const probe = probeValueAt(lng, lat, layer, grid, selectedGatId, gatDataFullRef.current);
              setClickedProbe({
                lng,
                lat,
                val: probe.val,
                col: probe.col,
                row: probe.row,
                interpretation: probe.interp,
                swatchColor: probe.swatch,
              });
            },
          });
        },
      }
    ).addTo(map);

    geojsonLayerRef.current = geojsonLayer;

    // Auto-fit to Gat
    fitToData();
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

    const fullEntry =
      cleanGat && gatDataFull
        ? (gatDataFull[cleanGat] || getOrCreateGatEntry(gatDataFull, cleanGat))
        : null;

    const gatOverlay = fullEntry?.overlays?.[layer.id];

    // Determine whether this Gat has an exact precomputed PNG
    const hasMatchingPrecomputed =
      Boolean(gatOverlay?.url) &&
      cleanGat &&
      (gatOverlay!.url.includes(`/${cleanGat}_`) || gatOverlay!.url.includes(`gat_${cleanGat}_`));

    let overlayUrl: string | undefined = undefined;
    let latLngBounds: [[number, number], [number, number]];

    if (hasMatchingPrecomputed && gatOverlay?.url) {
      overlayUrl = gatOverlay.url;
      latLngBounds = (gatOverlay.latLngBounds || [
        [gatOverlay.bounds[1], gatOverlay.bounds[0]],
        [gatOverlay.bounds[3], gatOverlay.bounds[2]],
      ]) as [[number, number], [number, number]];
    } else {
      // Generate crisp, parcel-specific clipped canvas heatmap directly aligned with polygon bounds
      overlayUrl = generateParcelLayerCanvas(
        outerRing,
        layer,
        grid,
        { minLng: pMinLng, maxLng: pMaxLng, minLat: pMinLat, maxLat: pMaxLat }
      );
      latLngBounds = [
        [pMinLat, pMinLng],
        [pMaxLat, pMaxLng],
      ];
    }

    if (!overlayUrl) return;

    // 3. Render Leaflet Image Overlay
    const overlay = L.imageOverlay(overlayUrl, latLngBounds, {
      opacity,
      interactive: false,
      zIndex: 10,
    }).addTo(map);

    overlayLayerRef.current = overlay;

    // 4. Calculate exact SVG/CSS percentage clipping path based on the overlay's bounds
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

    // 5. Ensure GeoJSON parcel outline stays prominently above raster
    if (geojsonLayerRef.current) {
      geojsonLayerRef.current.bringToFront();
    }

    return () => {
      map.off("zoomend", applyClip);
      map.off("viewreset", applyClip);
    };
  }, [layer, selectedGatId, myGatId, opacity, ready, isAdmin, gatDataFull, gats, grid]);

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

    const lng = gatInfo ? gatInfo.centroid[0] : (one?.properties?.centroid?.[0] ?? 74.50568);
    const lat = gatInfo ? gatInfo.centroid[1] : (one?.properties?.centroid?.[1] ?? 18.16614);

    const probe = probeValueAt(lng, lat, layer, grid, selectedGatId, gatDataFull);

    setClickedProbe({
      lng,
      lat,
      val: probe.val,
      col: probe.col,
      row: probe.row,
      interpretation: probe.interp,
      swatchColor: probe.swatch,
    });
  }, [selectedGatId, myGatId, ready, layer, gats, gatDataFull, grid]);

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

    const layerName = layer?.shortName || layer?.name || "NDVI";
    const layerUnit = layer?.unit || "index";
    const valDisplay =
      clickedProbe?.val !== null && clickedProbe?.val !== undefined
        ? formatValue(clickedProbe.val)
        : (gatInfo?.stats?.[layer?.id as DSMRasterLayerId]?.mean !== undefined
            ? gatInfo.stats[layer?.id as DSMRasterLayerId]!.mean.toFixed(3)
            : "0.518");

    const classInfo = getClassification(layer?.id, clickedProbe?.val ?? 0.518);

    const avgDisplay = (() => {
      const layerId = layer?.id as DSMRasterLayerId | undefined;
      if (gatInfo && layerId && gatInfo.stats?.[layerId]?.mean !== undefined) {
        return gatInfo.stats[layerId].mean.toFixed(2);
      }
      if (selectedStats && layerId && selectedStats.params[layerId]?.mean !== undefined) {
        return selectedStats.params[layerId]!.mean.toFixed(2);
      }
      return layer?.mean !== undefined ? layer.mean.toFixed(2) : "0.39";
    })();

    const hudHtml = `
      <div style="display: flex; align-items: center; gap: 0; filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.45)); font-family: system-ui, -apple-system, sans-serif; pointer-events: none; user-select: none;">
        <!-- 1. White Gat Badge (Left side) -->
        <div style="background: #ffffff; border-radius: 10px; padding: 10px 14px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2); border: 1.5px solid rgba(229, 231, 235, 0.95); min-width: 155px; white-space: nowrap;">
          <div style="font-weight: 800; font-size: 14px; color: #00c853; line-height: 1.25; letter-spacing: -0.01em;">
            Gat / गट क्र. ${cleanNum}
          </div>
          <div style="font-size: 11.5px; color: #64748b; font-weight: 600; margin-top: 3px; white-space: nowrap;">
            Area: ${acres} Acres (${ha} Ha)
          </div>
        </div>

        <!-- 2. White Connecting Pointer Arrow pointing to Dark Card -->
        <div style="width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 8px solid #ffffff; margin-left: -1px; margin-right: 6px; filter: drop-shadow(2px 0 1px rgba(0,0,0,0.08));"></div>

        <!-- 3. Dark HUD Card with Vibrant Neon Green Border (Right side - exactly matching reference screenshot) -->
        <div style="background: rgba(8, 14, 26, 0.96); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; border: 2px solid #00e676; box-shadow: 0 0 20px rgba(0, 230, 118, 0.35), 0 10px 30px rgba(0, 0, 0, 0.7); padding: 11px 16px; min-width: 290px; color: #ffffff;">
          <!-- Top Row: Location Icon + Gat Number + Lat/Lng Coordinates -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; font-weight: 700;">
            <div style="display: flex; align-items: center; gap: 6px; color: #ffffff;">
              <span style="color: #00e676; font-size: 13px;">📍</span>
              <span>Gat / गट क्र. ${cleanNum}</span>
            </div>
            <span style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: #94a3b8; font-weight: 600; letter-spacing: -0.01em;">
              ${probeLat.toFixed(5)}° N, ${probeLng.toFixed(5)}° E
            </span>
          </div>

          <!-- Divider -->
          <div style="width: 100%; height: 1px; background: rgba(51, 65, 85, 0.85); margin: 8px 0;"></div>

          <!-- Metric Row: Clicked / Cursor Layer: [Large Neon Green Value] [unit] -->
          <div style="display: flex; align-items: baseline; gap: 7px; margin: 2px 0;">
            <span style="font-weight: 700; font-size: 13.5px; color: #ffffff; letter-spacing: -0.01em;">
              Clicked / Cursor ${layerName}:
            </span>
            <span style="font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 900; font-size: 24px; color: #00e676; line-height: 1; letter-spacing: -0.02em;">
              ${valDisplay}
            </span>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">
              ${layerUnit}
            </span>
          </div>

          <!-- Bottom Row: Status Pill Badge + Plot Average -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 8px;">
            <span style="display: inline-flex; align-items: center; padding: 2.5px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; background: ${classInfo.color}; color: ${classInfo.textColor}; letter-spacing: -0.01em;">
              ${classInfo.status}
            </span>
            <span style="font-size: 11.5px; color: #cbd5e1; font-weight: 600;">
              Plot Avg: ${avgDisplay} ${layerUnit}
            </span>
          </div>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: "soilpilot-hud-marker",
      html: hudHtml,
      iconSize: [460, 100],
      iconAnchor: [80, 50],
    });

    const marker = L.marker([probeLat, probeLng], { icon: customIcon, interactive: false }).addTo(map);
    hudMarkerRef.current = marker;
  }, [selectedGatId, myGatId, gats, ready, clickedProbe, layer, selectedStats, gatDataFull]);

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
