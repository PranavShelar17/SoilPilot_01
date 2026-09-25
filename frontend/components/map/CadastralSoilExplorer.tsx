"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { useI18n } from "@/i18n/useI18n";
import {
  Layers,
  MapPin,
  Compass,
  Droplets,
  Sparkles,
  Activity,
  Mountain,
  Sprout,
  BarChart3,
  ShieldCheck,
  Printer,
  Download,
  Lightbulb,
  Maximize2,
  Calendar,
  Crosshair,
  TrendingUp,
  FileText,
  Sliders,
  CheckCircle2,
  Satellite,
  Map as StreetIcon,
  X,
  Wheat,
} from "lucide-react";

// Crop STCR calibration parameters
interface STCRFormula {
  name: string;
  nameMr: string;
  calc: (n: number, ph: number, soc: number) => {
    ureaKg: number;
    dapKg: number;
    mopKg: number;
    fymT: number;
    schedule: { stage: string; stageMr: string; dose: string }[];
  };
}

const CROP_STCR_CONFIG: Record<string, STCRFormula> = {
  sugarcane: {
    name: "Sugarcane",
    nameMr: "ऊस",
    calc: (n, ph) => {
      const ureaKg = Math.max(120, Math.round(180 - (n - 12.0) * 12));
      return {
        ureaKg,
        dapKg: 75,
        mopKg: 65,
        fymT: 5.0,
        schedule: [
          {
            stage: "Basal Sowing",
            stageMr: "लागवड वेळ",
            dose: "Urea 45 kg + DAP 75 kg + MOP 30 kg + FYM 5 Tonnes",
          },
          {
            stage: "Tillering (6-8 Weeks)",
            stageMr: "फुटवे फुटण्याची वेळ (६-८ आठवडे)",
            dose: "Urea 60 kg + Micronutrient Grade II (5 kg)",
          },
          {
            stage: "Grand Growth (12-16 Weeks)",
            stageMr: "मोठी बांधणी (१२-१६ आठवडे)",
            dose: `Urea ${Math.max(40, ureaKg - 105)} kg + MOP 35 kg`,
          },
        ],
      };
    },
  },
  soybean: {
    name: "Soybean",
    nameMr: "सोयाबीन",
    calc: () => ({
      ureaKg: 30,
      dapKg: 50,
      mopKg: 25,
      fymT: 2.5,
      schedule: [
        {
          stage: "Basal Sowing",
          stageMr: "पेरणीवेळी",
          dose: "Urea 30 kg + DAP 50 kg + MOP 25 kg + Rhizobium culture",
        },
        {
          stage: "Pod Formation",
          stageMr: "शेंगा भरताना",
          dose: "19:19:19 Foliar spray (1.5%) + Boron (0.5g/L)",
        },
      ],
    }),
  },
  wheat: {
    name: "Wheat",
    nameMr: "गहू",
    calc: () => ({
      ureaKg: 85,
      dapKg: 50,
      mopKg: 30,
      fymT: 3.0,
      schedule: [
        {
          stage: "Basal Sowing",
          stageMr: "पेरणीवेळी",
          dose: "Urea 40 kg + DAP 50 kg + MOP 30 kg",
        },
        {
          stage: "CRI Stage (21 Days)",
          stageMr: "मुकुट मुळे फुटताना (२१ दिवस)",
          dose: "Urea 45 kg with first critical irrigation",
        },
      ],
    }),
  },
  onion: {
    name: "Onion",
    nameMr: "कांदा",
    calc: () => ({
      ureaKg: 100,
      dapKg: 60,
      mopKg: 50,
      fymT: 5.0,
      schedule: [
        {
          stage: "Transplanting",
          stageMr: "पुनर्लागवड",
          dose: "Urea 40 kg + DAP 60 kg + MOP 30 kg + Sulphur 10 kg",
        },
        {
          stage: "Bulb Development (30 Days)",
          stageMr: "कांदा पोसताना (३० दिवस)",
          dose: "Urea 60 kg + MOP 20 kg",
        },
      ],
    }),
  },
  grapes: {
    name: "Grapes",
    nameMr: "द्राक्षे",
    calc: () => ({
      ureaKg: 90,
      dapKg: 65,
      mopKg: 110,
      fymT: 7.0,
      schedule: [
        {
          stage: "Foundation Pruning (April)",
          stageMr: "खरड छाटणी (एप्रिल)",
          dose: "DAP 65 kg + Urea 45 kg + FYM 7 Tonnes",
        },
        {
          stage: "Fruit Pruning (October)",
          stageMr: "गोडी छाटणी (ऑक्टोबर)",
          dose: "Urea 45 kg + MOP 110 kg (Split weekly via fertigation)",
        },
      ],
    }),
  },
  pomegranate: {
    name: "Pomegranate",
    nameMr: "डाळिंब",
    calc: () => ({
      ureaKg: 75,
      dapKg: 50,
      mopKg: 80,
      fymT: 6.0,
      schedule: [
        {
          stage: "Bahar Treatment",
          stageMr: "बहार नियोजन",
          dose: "DAP 50 kg + FYM 6 Tonnes + Trichoderma harzianum",
        },
        {
          stage: "Fruit Development",
          stageMr: "फळ विकास अवस्था",
          dose: "Urea 75 kg + MOP 80 kg in fertigation splits",
        },
      ],
    }),
  },
};

interface CadastralSoilExplorerProps {
  initialGat?: string;
  className?: string;
  onGatChange?: (gat: string) => void;
}

export const CadastralSoilExplorer: React.FC<CadastralSoilExplorerProps> = ({
  initialGat,
  className = "",
  onGatChange,
}) => {
  const { t, language } = useI18n();
  const isMr = language === "mr";

  // Data states loaded from dsm_layers.json and malegaon_plots.geojson
  const [dsmData, setDsmData] = useState<any>(null);
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // User selection states
  const [selectedGat, setSelectedGat] = useState<string>(initialGat || "ALL");
  const [activeLayerKey, setActiveLayerKey] = useState<string>("NDVI");
  const [layerOpacity, setLayerOpacity] = useState<number>(0.85);
  const [showClhs, setShowClhs] = useState<boolean>(false);
  const [basemap, setBasemap] = useState<"satellite" | "street">("satellite");
  const [activeTab, setActiveTab] = useState<"diagnostics" | "stcr" | "clhs" | "evidence">("diagnostics");
  const [selectedCrop, setSelectedCrop] = useState<string>("sugarcane");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Probe readout
  const [probeCoords, setProbeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [probeValue, setProbeValue] = useState<string>("--");

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const clhsMarkersRef = useRef<maplibregl.Marker[]>([]);

  // 1. Load data from public static files
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dsmRes, geoRes] = await Promise.all([
          fetch("/data/dsm_layers.json"),
          fetch("/data/malegaon_plots.geojson"),
        ]);
        if (dsmRes.ok) {
          const d = await dsmRes.json();
          setDsmData(d);
        }
        if (geoRes.ok) {
          const g = await geoRes.json();
          setGeojsonData(g);
        }
      } catch (err) {
        console.error("Failed to load Cadastral DSM data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update selected Gat if initialGat changes
  useEffect(() => {
    if (initialGat) {
      setSelectedGat(initialGat);
    }
  }, [initialGat]);

  // Available Gats
  const availableGats = useMemo(() => {
    if (!dsmData?.per_gat_stats) return ["12", "13", "14", "15", "16", "17", "18", "20", "21", "22", "25", "104"];
    const keys = Object.keys(dsmData.per_gat_stats);
    if (!keys.includes("104")) keys.unshift("104");
    return keys;
  }, [dsmData]);

  // Current Gat statistics
  const currentGatStats = useMemo(() => {
    if (!dsmData?.per_gat_stats) return null;
    if (selectedGat === "ALL") {
      const firstKey = Object.keys(dsmData.per_gat_stats)[0];
      return dsmData.per_gat_stats[firstKey];
    }
    return dsmData.per_gat_stats[selectedGat] || dsmData.per_gat_stats["21"] || null;
  }, [dsmData, selectedGat]);

  // Active layer config
  const activeLayer = useMemo(() => {
    if (!dsmData?.layers) return null;
    return dsmData.layers.find((l: any) => l.key === activeLayerKey) || dsmData.layers[0];
  }, [dsmData, activeLayerKey]);

  // STCR Calculation results
  const stcrResult = useMemo(() => {
    if (!currentGatStats) return null;
    const n = currentGatStats.stats?.Nitrogen?.mean || 13.5;
    const ph = currentGatStats.stats?.pH?.mean || 7.5;
    const soc = currentGatStats.stats?.SOC?.mean || 1.0;
    const formula = CROP_STCR_CONFIG[selectedCrop] || CROP_STCR_CONFIG.sugarcane;
    return formula.calc(n, ph, soc);
  }, [currentGatStats, selectedCrop]);

  // 2. Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || !geojsonData) return;

    const satelliteTiles =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    const streetTiles = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    const totalBounds = dsmData?.total_bounds || [
      [18.1525, 74.4945],
      [18.1684, 74.5168],
    ];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "satellite-source": {
            type: "raster",
            tiles: [satelliteTiles],
            tileSize: 256,
            maxzoom: 19,
          },
          "street-source": {
            type: "raster",
            tiles: [streetTiles],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-source",
            layout: { visibility: basemap === "satellite" ? "visible" : "none" },
          },
          {
            id: "street-layer",
            type: "raster",
            source: "street-source",
            layout: { visibility: basemap === "street" ? "visible" : "none" },
          },
        ],
      },
      bounds: [
        [totalBounds[0][1], totalBounds[0][0]],
        [totalBounds[1][1], totalBounds[1][0]],
      ],
      fitBoundsOptions: { padding: 40 },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      // Add Cadastral GeoJSON source
      map.addSource("gat-polygons", {
        type: "geojson",
        data: geojsonData,
      });

      // Cadastral fill
      map.addLayer({
        id: "gat-polygons-fill",
        type: "fill",
        source: "gat-polygons",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.12,
        },
      });

      // Cadastral outline
      map.addLayer({
        id: "gat-polygons-line",
        type: "line",
        source: "gat-polygons",
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.5,
          "line-opacity": 0.85,
        },
      });

      // Click on Gat to select
      map.on("click", "gat-polygons-fill", (e) => {
        if (!e.features || !e.features[0]) return;
        const gid = String(e.features[0].properties?.gat_no || "");
        if (gid) {
          handleSelectGat(gid);
        }
      });

      map.on("mouseenter", "gat-polygons-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "gat-polygons-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      // Hover Probe
      map.on("mousemove", (e) => {
        const { lng, lat } = e.lngLat;
        setProbeCoords({ lat, lng });

        // Calculate probe value from active raster grid
        if (activeLayer?.grid && activeLayer.grid.bounds) {
          const b = activeLayer.grid.bounds;
          const minLat = b[0][0], maxLat = b[1][0];
          const minLon = b[0][1], maxLon = b[1][1];

          if (lat >= minLat && lat <= maxLat && lng >= minLon && lng <= maxLon) {
            const rRatio = (maxLat - lat) / (maxLat - minLat);
            const cRatio = (lng - minLon) / (maxLon - minLon);
            const r = Math.floor(rRatio * activeLayer.grid.rows);
            const c = Math.floor(cRatio * activeLayer.grid.cols);

            if (r >= 0 && r < activeLayer.grid.rows && c >= 0 && c < activeLayer.grid.cols) {
              const val = activeLayer.grid.values[r]?.[c];
              if (val !== null && val !== undefined) {
                setProbeValue(`${val} ${activeLayer.unit}`);
                return;
              }
            }
          }
        }
        setProbeValue("--");
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [geojsonData]);

  // 3. Update Basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("satellite-layer")) {
      map.setLayoutProperty("satellite-layer", "visibility", basemap === "satellite" ? "visible" : "none");
    }
    if (map.getLayer("street-layer")) {
      map.setLayoutProperty("street-layer", "visibility", basemap === "street" ? "visible" : "none");
    }
  }, [basemap]);

  // 4. Update Raster Layer on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !activeLayer) return;

    const sourceId = "cadastral-dsm-source";
    const layerId = "cadastral-dsm-layer";

    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    const imageUrl = `/maps/rasters/${activeLayerKey.toLowerCase()}.png`;
    const imageCoords: [[number, number], [number, number], [number, number], [number, number]] = [
      [74.49454665041536, 18.16847153708153],
      [74.51700453251834, 18.16847153708153],
      [74.51700453251834, 18.152481525024204],
      [74.49454665041536, 18.152481525024204],
    ];

    map.addSource(sourceId, {
      type: "image",
      url: imageUrl,
      coordinates: imageCoords,
    });

    map.addLayer(
      {
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": layerOpacity,
          "raster-fade-duration": 150,
        },
      },
      map.getLayer("gat-polygons-fill") ? "gat-polygons-fill" : undefined
    );
  }, [activeLayerKey, layerOpacity, mapRef.current?.isStyleLoaded()]);

  // 5. Update Highlight for Selected Gat
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("gat-polygons-line")) return;

    if (selectedGat === "ALL") {
      map.setPaintProperty("gat-polygons-line", "line-color", "#ffffff");
      map.setPaintProperty("gat-polygons-line", "line-width", 1.5);
      const totalBounds = dsmData?.total_bounds;
      if (totalBounds) {
        map.fitBounds(
          [
            [totalBounds[0][1], totalBounds[0][0]],
            [totalBounds[1][1], totalBounds[1][0]],
          ],
          { padding: 40, duration: 800 }
        );
      }
    } else {
      map.setPaintProperty("gat-polygons-line", "line-color", [
        "case",
        ["==", ["get", "gat_no"], String(selectedGat)],
        "#10b981",
        "#ffffff",
      ]);
      map.setPaintProperty("gat-polygons-line", "line-width", [
        "case",
        ["==", ["get", "gat_no"], String(selectedGat)],
        3.5,
        1.2,
      ]);

      // Zoom to selected Gat
      const feat = geojsonData?.features?.find(
        (f: any) => String(f.properties?.gat_no) === String(selectedGat)
      );
      if (feat && feat.geometry) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const coords = feat.geometry.coordinates[0];
        coords.forEach(([x, y]: [number, number]) => {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        });
        map.fitBounds(
          [
            [minX, minY],
            [maxX, maxY],
          ],
          { padding: 80, maxZoom: 17, duration: 900 }
        );
      }
    }
  }, [selectedGat, geojsonData]);

  // 6. Handle cLHS Markers Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    clhsMarkersRef.current.forEach((m) => m.remove());
    clhsMarkersRef.current = [];

    if (!showClhs || !dsmData?.clhs_points) return;

    dsmData.clhs_points.forEach((pt: any) => {
      const el = document.createElement("div");
      el.className = "clhs-marker";
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = pt.priority === "High" ? "#10b981" : "#f59e0b";
      el.style.border = "2px solid #ffffff";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
        <div style="font-family: inherit; font-size: 11px; padding: 6px; color: #1e293b;">
          <div style="font-weight: 800; color: #10b981; font-size: 12px; margin-bottom: 4px;">${pt.sample_id}</div>
          <div><strong>Priority:</strong> ${pt.priority}</div>
          <div><strong>Target:</strong> ${pt.target_depth}</div>
          <div><strong>GPS:</strong> ${pt.lat.toFixed(5)}° N, ${pt.lon.toFixed(5)}° E</div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">
            pH: ${pt.covariates.pH} &middot; SOC: ${pt.covariates.SOC}% &middot; N: ${pt.covariates.Nitrogen}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pt.lon, pt.lat])
        .setPopup(popup)
        .addTo(map);

      clhsMarkersRef.current.push(marker);
    });
  }, [showClhs, dsmData]);

  const handleSelectGat = (gid: string) => {
    setSelectedGat(gid);
    onGatChange?.(gid);
  };

  // Export cLHS CSV
  const handleExportClhsCSV = () => {
    if (!dsmData?.clhs_points) return;
    const headers = ["Sample_ID", "Latitude", "Longitude", "Target_Depth", "Priority", "Elevation_m", "pH", "SOC_pct", "Nitrogen", "Accessibility"];
    const rows = dsmData.clhs_points.map((p: any) => [
      p.sample_id,
      p.lat,
      p.lon,
      `"${p.target_depth}"`,
      p.priority,
      p.covariates.Elevation,
      p.covariates.pH,
      p.covariates.SOC,
      p.covariates.Nitrogen,
      `"${p.accessibility}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pune_DSM_cLHS_Sampling_Sites_${selectedGat}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLayerIcon = (key: string) => {
    switch (key) {
      case "NDVI":
      case "EVI":
        return <Sprout className="w-3.5 h-3.5 text-emerald-600" />;
      case "pH":
        return <Droplets className="w-3.5 h-3.5 text-blue-600" />;
      case "SOC":
        return <Sparkles className="w-3.5 h-3.5 text-amber-700" />;
      case "Nitrogen":
        return <Activity className="w-3.5 h-3.5 text-purple-600" />;
      case "BD":
        return <BarChart3 className="w-3.5 h-3.5 text-amber-600" />;
      case "Elevation":
        return <Mountain className="w-3.5 h-3.5 text-sky-600" />;
      case "Uncertainty":
        return <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-soil-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-white rounded-2xl border border-surface-border flex items-center justify-center p-8 shadow-card">
        <div className="flex flex-col items-center gap-3">
          <Compass className="w-8 h-8 text-soil-primary animate-spin" />
          <span className="text-sm font-bold text-text-main">
            {isMr ? "कॅडस्ट्रल माती नकाशा लोड होत आहे..." : "Loading Cadastral Digital Soil Mapping System..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header Toolbar: Gat Selector & Quick Stats */}
      <div className="bg-white rounded-2xl border border-surface-border p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
        {/* Left: Gat Selection Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-subtle border border-surface-border rounded-xl px-3 py-1.5 shadow-xs">
            <MapPin className="w-4 h-4 text-soil-primary shrink-0" />
            <span className="text-xs font-bold text-text-muted">
              {isMr ? "गट क्रमांक:" : "Select Gat:"}
            </span>
            <select
              value={selectedGat}
              onChange={(e) => handleSelectGat(e.target.value)}
              className="bg-transparent font-bold text-xs text-text-main outline-none cursor-pointer pr-2"
            >
              <option value="ALL">{isMr ? "सर्व गट (११ पार्सल)" : "All Gats (11 Parcels)"}</option>
              {availableGats.map((g) => (
                <option key={g} value={g}>
                  {isMr ? `गट नं. ${g}` : `Gat No. ${g}`}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Context Badges */}
          {currentGatStats && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-soil-primaryLight/60 text-soil-primary border border-soil-primary/20 font-bold">
                {currentGatStats.area_acres} {isMr ? "एकर" : "Acres"} ({currentGatStats.area_ha} Ha)
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-surface-subtle text-text-muted border border-surface-border">
                {currentGatStats.centroid_lat?.toFixed(4)}° N, {currentGatStats.centroid_lon?.toFixed(4)}° E
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentGatStats.confidence_score}% {isMr ? "विश्वासार्हता" : "Confidence"}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Map Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle cLHS GPS Sampling Sites */}
          <button
            type="button"
            onClick={() => setShowClhs((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              showClhs
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-surface-subtle text-text-main hover:bg-surface-border/50 border-surface-border"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isMr ? "cLHS नमुना स्थाने" : "cLHS GPS Sites (25)"}</span>
          </button>

          {/* Basemap Switcher */}
          <div className="flex items-center rounded-xl bg-surface-subtle border border-surface-border p-1 shadow-xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBasemap("satellite")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                basemap === "satellite" ? "bg-soil-primary text-white font-bold" : "text-text-muted hover:text-text-main"
              }`}
            >
              <Satellite className="w-3 h-3" />
              <span>{isMr ? "उपग्रह" : "Satellite"}</span>
            </button>
            <button
              type="button"
              onClick={() => setBasemap("street")}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                basemap === "street" ? "bg-soil-primary text-white font-bold" : "text-text-muted hover:text-text-main"
              }`}
            >
              <StreetIcon className="w-3 h-3" />
              <span>{isMr ? "रस्ता" : "Street"}</span>
            </button>
          </div>

          {/* Print / Export Soil Health Card */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-soil-primary text-white hover:bg-soil-primaryHover text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isMr ? "आरोग्य पत्रिका प्रिंट" : "Print Health Card"}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Map & Layer Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: 8 DSM Layer Chips + Controls */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          {/* Layer Chips */}
          <div className="bg-white rounded-2xl border border-surface-border p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-soil-primary" />
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                  {isMr ? "डिजिटल माती घटक (८ लेअर्स)" : "Digital Soil Layers (8)"}
                </h3>
              </div>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                Active DSM
              </span>
            </div>

            <div className="space-y-1.5">
              {dsmData?.layers?.map((layer: any) => {
                const isSelected = layer.key === activeLayerKey;
                return (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => setActiveLayerKey(layer.key)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-soil-primaryLight/50 border-soil-primary shadow-xs ring-1 ring-soil-primary/20"
                        : "bg-surface-subtle/50 hover:bg-surface-subtle border-surface-border/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getLayerIcon(layer.key)}
                      <div className="truncate">
                        <span className={`text-xs font-bold block truncate ${isSelected ? "text-soil-primary" : "text-text-main"}`}>
                          {isMr ? layer.marathi_name : layer.name}
                        </span>
                        <span className="text-[10px] text-text-muted block">
                          {layer.category} &middot; {layer.unit}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-soil-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Opacity Slider */}
            <div className="pt-3 border-t border-surface-border space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-text-muted">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isMr ? "पारदर्शकता" : "Opacity"}</span>
                </span>
                <span className="text-text-main">{Math.round(layerOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                className="w-full accent-soil-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Real-time Hover Probe */}
          <div className="bg-white rounded-2xl border border-surface-border p-4 shadow-card space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted font-bold">
              <Crosshair className="w-3.5 h-3.5 text-soil-primary" />
              <span>{isMr ? "नकाशा तपासणी (लाईव्ह प्रोब)" : "Live Map Probe"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-text-muted">{isMr ? "स्थान" : "Coordinates"}:</span>
                <span className="font-semibold text-text-main">
                  {probeCoords ? `${probeCoords.lat.toFixed(4)}°, ${probeCoords.lng.toFixed(4)}°` : "--"}
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 border-t border-surface-border">
                <span className="text-text-muted">{isMr ? "घटक मूल्य" : `${activeLayerKey} Value`}:</span>
                <span className="font-bold text-soil-primary">{probeValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right: Map Viewer + Floating Legend */}
        <div className="lg:col-span-3 order-1 lg:order-2 space-y-3">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-card border border-surface-border bg-slate-900">
            <div ref={mapContainerRef} className="w-full h-[520px] sm:h-[620px]" />

            {/* Floating Legend */}
            {activeLayer && (
              <div className="absolute bottom-5 right-4 z-10 pointer-events-auto bg-white/95 backdrop-blur-md border border-surface-border rounded-xl p-3 shadow-card max-w-xs text-xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-surface-border/60 pb-1.5">
                  <span className="font-bold text-text-main truncate">
                    {isMr ? activeLayer.marathi_name : activeLayer.name}
                  </span>
                  <span className="text-[10px] text-text-muted font-semibold">{activeLayer.unit}</span>
                </div>

                {/* Gradient Bar */}
                <div
                  className="h-3 rounded-md w-full border border-surface-border/40"
                  style={{
                    background: `linear-gradient(to right, ${activeLayer.legend_stops?.map((s: any) => `${s.color} ${s.pct}%`).join(", ")})`,
                  }}
                />

                <div className="flex justify-between text-[10px] font-bold text-text-muted">
                  <span>{activeLayer.min}</span>
                  <span>{((activeLayer.min + activeLayer.max) / 2).toFixed(1)}</span>
                  <span>{activeLayer.max}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Deep Analysis & Gat Diagnostic Tabs (Exact system from soil-main) */}
      <div className="bg-white rounded-2xl border border-surface-border p-6 shadow-card space-y-6">
        {/* Tab Headers */}
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("diagnostics")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "diagnostics"
                ? "bg-soil-primary text-white shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isMr ? "माती आरोग्य निदान (८ पॅरामीटर्स)" : "Soil Health Diagnostics"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stcr")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "stcr"
                ? "bg-soil-primary text-white shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
            }`}
          >
            <Wheat className="w-4 h-4" />
            <span>{isMr ? "STCR खत शिफारस" : "STCR Fertilizer Prescription"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("clhs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "clhs"
                ? "bg-soil-primary text-white shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>{isMr ? "cLHS नमुना योजना (२५ ठिकाणे)" : "cLHS Sampling Plan"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evidence")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "evidence"
                ? "bg-soil-primary text-white shadow-xs"
                : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isMr ? "मॉडेल अचूकता आणि SCORPAN" : "DSM Model Quality & Evidence"}</span>
          </button>
        </div>

        {/* Tab 1: Gat Soil Health Diagnostics Matrix */}
        {activeTab === "diagnostics" && currentGatStats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>
                {isMr
                  ? `गट क्रमांक ${selectedGat} चे सविस्तर माती विश्लेषण (०-१५ सेंमी)`
                  : `Diagnostic parameters for Gat No. ${selectedGat} (Topsoil 0-15 cm)`}
              </span>
              <span className="font-bold text-soil-primary">
                {currentGatStats.area_acres} Acres &middot; {currentGatStats.village}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(currentGatStats.stats || {}).map(([key, stat]: [string, any]) => (
                <div key={key} className="p-4 rounded-xl border border-surface-border bg-surface-subtle/50 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-text-main block">
                        {isMr ? stat.marathi_name : stat.name}
                      </span>
                      <span className="text-[10px] text-text-muted">{stat.name}</span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: stat.classification?.color ? `${stat.classification.color}25` : "#e2e8f0",
                        color: stat.classification?.color || "#1e293b",
                        border: `1px solid ${stat.classification?.color || "#cbd5e1"}50`,
                      }}
                    >
                      {stat.classification?.status}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black text-text-main">{stat.mean}</span>
                      <span className="text-xs font-semibold text-text-muted ml-1">{stat.unit}</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">
                      [{stat.min} &ndash; {stat.max}]
                    </span>
                  </div>

                  <div className="pt-2 border-t border-surface-border/60 text-[11px] text-text-muted flex items-start gap-1.5 leading-relaxed">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{stat.classification?.advice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Calibrated STCR Fertilizer Prescriptions */}
        {activeTab === "stcr" && stcrResult && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-subtle p-4 rounded-xl border border-surface-border">
              <div className="flex items-center gap-3">
                <Wheat className="w-5 h-5 text-soil-primary" />
                <div>
                  <span className="text-xs font-bold text-text-main block">
                    {isMr ? "लक्ष्य पीक निवडा:" : "Select Target Crop for Calibration:"}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {isMr ? "माती चाचणी आणि पीक पोषण गरजांनुसार खतांचे अचूक प्रमाण" : "Soil Test Crop Response (STCR) calibrated formula"}
                  </span>
                </div>
              </div>

              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white border border-surface-border font-bold text-xs text-text-main outline-none cursor-pointer shadow-xs"
              >
                {Object.entries(CROP_STCR_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {isMr ? cfg.nameMr : cfg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Calculated Fertilizer Doses (Urea, DAP, MOP, FYM) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Urea */}
              <div className="p-4 rounded-xl border border-surface-border bg-emerald-50/50 space-y-1">
                <span className="text-emerald-800 font-bold block">Urea (युरिया - 46% N)</span>
                <span className="text-xl font-black text-emerald-950 block">{stcrResult.ureaKg} kg/acre</span>
                <span className="text-[11px] text-emerald-700 font-semibold block">
                  {(stcrResult.ureaKg / 50).toFixed(1)} Bags (५० किलो बॅग)
                </span>
              </div>

              {/* DAP */}
              <div className="p-4 rounded-xl border border-surface-border bg-blue-50/50 space-y-1">
                <span className="text-blue-800 font-bold block">D.A.P. (डायअमोनियम फॉस्फेट)</span>
                <span className="text-xl font-black text-blue-950 block">{stcrResult.dapKg} kg/acre</span>
                <span className="text-[11px] text-blue-700 font-semibold block">
                  {(stcrResult.dapKg / 50).toFixed(1)} Bags (५० किलो बॅग)
                </span>
              </div>

              {/* MOP */}
              <div className="p-4 rounded-xl border border-surface-border bg-amber-50/50 space-y-1">
                <span className="text-amber-800 font-bold block">M.O.P. (पोटॅश - 60% K₂O)</span>
                <span className="text-xl font-black text-amber-950 block">{stcrResult.mopKg} kg/acre</span>
                <span className="text-[11px] text-amber-700 font-semibold block">
                  {(stcrResult.mopKg / 50).toFixed(1)} Bags (५० किलो बॅग)
                </span>
              </div>

              {/* FYM */}
              <div className="p-4 rounded-xl border border-surface-border bg-purple-50/50 space-y-1">
                <span className="text-purple-800 font-bold block">FYM / सेंद्रिय खत</span>
                <span className="text-xl font-black text-purple-950 block">{stcrResult.fymT} Tonnes/acre</span>
                <span className="text-[11px] text-purple-700 font-semibold block">
                  शेणखत / कंपोस्ट / प्रेसमड
                </span>
              </div>
            </div>

            {/* Split Schedule Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-main uppercase tracking-wider">
                {isMr ? "खतांचे हप्ते आणि वेळापत्रक (Split Dosing Timeline)" : "Fertilizer Application Schedule & Split Doses"}
              </h4>
              <div className="space-y-2">
                {stcrResult.schedule.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-surface-border bg-surface-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-soil-primary">
                      {isMr ? item.stageMr : item.stage}
                    </span>
                    <span className="font-mono text-text-main bg-white px-3 py-1 rounded-lg border border-surface-border/70">
                      {item.dose}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: cLHS Field Sampling Plan Table */}
        {activeTab === "clhs" && dsmData?.clhs_points && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-text-muted">
                {isMr
                  ? "कंडिशन्ड लॅटिन हायपरक्यूब सॅम्पलिंग (cLHS) द्वारे निवडलेली २५ प्रमाणित नमुना स्थाने"
                  : "Conditioned Latin Hypercube Sampling (cLHS) 25 Optimized GPS Field Points"}
              </span>
              <button
                type="button"
                onClick={handleExportClhsCSV}
                className="px-3.5 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-border/60 border border-surface-border text-soil-primary font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isMr ? "CSV डाऊनलोड करा" : "Export Sampling Plan (CSV)"}</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border text-text-muted font-bold">
                    <th className="p-3">Sample ID</th>
                    <th className="p-3">Latitude (°N)</th>
                    <th className="p-3">Longitude (°E)</th>
                    <th className="p-3">Depth</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Elevation</th>
                    <th className="p-3">pH</th>
                    <th className="p-3">SOC (%)</th>
                    <th className="p-3">N (mg/kg)</th>
                    <th className="p-3">Accessibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {dsmData.clhs_points.slice(0, 15).map((pt: any) => (
                    <tr key={pt.sample_id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-soil-primary">{pt.sample_id}</td>
                      <td className="p-3 font-mono">{pt.lat.toFixed(5)}</td>
                      <td className="p-3 font-mono">{pt.lon.toFixed(5)}</td>
                      <td className="p-3">{pt.target_depth}</td>
                      <td className="p-3">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${pt.priority === "High" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {pt.priority}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{pt.covariates.Elevation} m</td>
                      <td className="p-3 font-mono">{pt.covariates.pH}</td>
                      <td className="p-3 font-mono">{pt.covariates.SOC}%</td>
                      <td className="p-3 font-mono">{pt.covariates.Nitrogen}</td>
                      <td className="p-3 text-[11px] text-text-muted">{pt.accessibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: DSM Model Quality & SCORPAN Evidence */}
        {activeTab === "evidence" && (
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-1.5 leading-relaxed text-text-muted">
              <span className="font-bold text-text-main text-sm block">
                {isMr ? "पुणे जिल्हा डिजिटल माती नकाशा शास्त्रीय आधार (Dash et al., 2022)" : "Pune District Digital Soil Mapping Framework (Dash et al., 2022)"}
              </span>
              <p>
                {isMr
                  ? "हा प्रकल्प SCORPAN फ्रेमवर्कवर आधारित असून सेंटिनेल-२ (१० मी) उपग्रह प्रतिमा, डिजिटल एलिव्हेशन मॉडेल (DEM), आणि क्वांटाईल रिग्रेशन फॉरेस्ट (QRF) मॉडेलिंगचा वापर करतो. पार्सल स्तरावर माती आरोग्य तपासणी करून शेतकऱ्यांना अचूक शिफारसी पुरवल्या जातात."
                  : "Ground truthed against 35 Indian DSM studies reviewed by Dash et al. (Geoderma Regional 2022). Incorporates high-resolution Sentinel-2 (10m) multi-temporal data, conditioned Latin hypercube sampling (cLHS), and Quantile Regression Forest 90% prediction intervals."}
              </p>
            </div>

            {/* Model Comparison Table */}
            {dsmData?.ml_benchmarks && (
              <div className="space-y-3">
                <h4 className="font-bold text-text-main uppercase tracking-wider text-xs">
                  {isMr ? "मशीन लर्निंग अल्गोरिदम तुलना" : "Comparative ML Model Performance"}
                </h4>
                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle border-b border-surface-border text-text-muted font-bold">
                        <th className="p-3">Model Algorithm</th>
                        <th className="p-3">R² Score</th>
                        <th className="p-3">RMSE (pH)</th>
                        <th className="p-3">RMSE (SOC %)</th>
                        <th className="p-3">Spatial Uncertainty</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {dsmData.ml_benchmarks.map((m: any, idx: number) => (
                        <tr key={idx} className={idx === 0 ? "bg-emerald-50/40 font-semibold" : ""}>
                          <td className="p-3 font-bold text-text-main">{m.model}</td>
                          <td className="p-3 font-mono text-soil-primary">{m.r2}</td>
                          <td className="p-3 font-mono">{m.rmse_ph}</td>
                          <td className="p-3 font-mono">{m.rmse_soc}</td>
                          <td className="p-3">{m.uncertainty_mapping}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${idx === 0 ? "bg-emerald-100 text-emerald-800" : "bg-surface-subtle text-text-muted"}`}>
                              {m.deployment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Print / Export Soil Health Card Modal */}
      {showPrintModal && currentGatStats && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-soil-primaryLight flex items-center justify-center text-soil-primary font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-main">
                    {isMr ? "डिजिटल माती आरोग्य पत्रिका" : "Digital Soil Health Card"}
                  </h3>
                  <span className="text-xs text-text-muted">
                    SoilPilot Digital Soil Mapping System &middot; Pune District
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Body */}
            <div className="space-y-5 text-xs">
              {/* Field Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface-subtle rounded-xl border border-surface-border">
                <div>
                  <span className="text-text-muted block text-[10px]">Gat Number</span>
                  <span className="font-bold text-soil-primary text-sm">Gat {selectedGat}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Survey Area</span>
                  <span className="font-bold text-text-main text-sm">{currentGatStats.area_acres} Acres</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Location</span>
                  <span className="font-semibold text-text-main text-xs">{currentGatStats.village}, Baramati</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">Prediction Reliability</span>
                  <span className="font-bold text-emerald-700 text-xs">{currentGatStats.confidence_score}% High Support</span>
                </div>
              </div>

              {/* Tested Parameters Table */}
              <div className="border border-surface-border rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border text-text-muted font-bold text-[11px]">
                      <th className="p-2.5">Parameter</th>
                      <th className="p-2.5">Mean Value</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5">Range [p10-p90]</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Agronomic Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-[11px]">
                    {Object.entries(currentGatStats.stats || {}).map(([k, s]: [string, any]) => (
                      <tr key={k}>
                        <td className="p-2.5 font-bold text-text-main">{s.name} ({s.marathi_name})</td>
                        <td className="p-2.5 font-mono font-bold">{s.mean}</td>
                        <td className="p-2.5 text-text-muted">{s.unit}</td>
                        <td className="p-2.5 font-mono">[{s.min} &ndash; {s.max}]</td>
                        <td className="p-2.5">
                          <span className="font-bold" style={{ color: s.classification?.color }}>
                            {s.classification?.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-text-muted text-[10px]">{s.classification?.advice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Fertilizer Recommendation Summary */}
              {stcrResult && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-900 block text-xs">
                    Target Crop: {selectedCrop.toUpperCase()} &middot; Calibrated STCR Prescription
                  </span>
                  <div className="grid grid-cols-3 gap-3 font-semibold text-emerald-950">
                    <div>Urea: {stcrResult.ureaKg} kg ({(stcrResult.ureaKg / 50).toFixed(1)} Bags)</div>
                    <div>DAP: {stcrResult.dapKg} kg ({(stcrResult.dapKg / 50).toFixed(1)} Bags)</div>
                    <div>MOP: {stcrResult.mopKg} kg ({(stcrResult.mopKg / 50).toFixed(1)} Bags)</div>
                  </div>
                  <p className="text-[11px] text-emerald-800 pt-1">
                    <strong>Organic Amendment:</strong> Apply {stcrResult.fymT} Tonnes/Acre Farmyard Manure (FYM).
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl border border-surface-border text-xs font-bold text-text-muted hover:bg-surface-subtle cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-soil-primary text-white hover:bg-soil-primaryHover text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
