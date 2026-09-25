"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { GeoJSONGeometry } from "@/services/fieldService";
import { useI18n } from "@/i18n/useI18n";
import { Plus, Minus, Focus, Satellite, Map as StreetIcon } from "lucide-react";

import { DSMLayerConfig } from "@/types/gis";

interface MapLibreWrapperProps {
  geometry: GeoJSONGeometry;
  gatNo: string;
  villageName?: string;
  talukaName?: string;
  districtName?: string;
  areaText?: string;
  className?: string;
  interactive?: boolean;
  allPlotsGeoJSON?: any;
  dsmLayer?: DSMLayerConfig | null;
  dsmOpacity?: number;
}

// Bounding box calculator for GeoJSON Polygon / MultiPolygon
function computeBounds(geom: GeoJSONGeometry): [number, number, number, number] | null {
  if (!geom || !geom.coordinates) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const traverse = (coords: any) => {
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(coords)) {
      for (const item of coords) {
        traverse(item);
      }
    }
  };

  traverse(geom.coordinates);

  if (minLng === Infinity || minLat === Infinity) return null;
  return [minLng, minLat, maxLng, maxLat];
}

// Compute centroid of geometry for initial popup placement
function computeCentroid(geom: GeoJSONGeometry): [number, number] | null {
  const bounds = computeBounds(geom);
  if (!bounds) return null;
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

export const MapLibreWrapper: React.FC<MapLibreWrapperProps> = ({
  geometry,
  gatNo,
  villageName,
  talukaName = "Baramati",
  districtName = "Pune",
  areaText,
  className = "h-[560px]",
  interactive = true,
  allPlotsGeoJSON,
  dsmLayer,
  dsmOpacity = 0.75,
}) => {
  const { t, language } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<"satellite" | "street">("satellite");
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Fit camera smoothly to the field boundary
  const fitToFarm = useCallback(() => {
    const map = mapRef.current;
    if (!map || !geometry) return;

    const bounds = computeBounds(geometry);
    if (bounds) {
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 17,
          duration: 1000,
        }
      );
    }
  }, [geometry]);

  const geomCoordsString = JSON.stringify(geometry?.coordinates || []);
  const allPlotsString = JSON.stringify(allPlotsGeoJSON?.features?.length || 0);

  // Build farmer-friendly popup HTML
  const createPopupHTML = useCallback((props: any, isSelected: boolean) => {
    const plotGat = props.gat_no || gatNo;
    const plotVillage = props.village || villageName || "Malegaon";
    const plotTaluka = props.taluka || talukaName || "Baramati";
    const plotDistrict = props.district || districtName || "Pune";
    const plotArea = props.area ? `${props.area} Ha` : (areaText || "Not Available");
    const plotSource = props.source || "Demo GIS Data";

    const titleText = isSelected
      ? (language === "mr" ? "🌱 तुमचे शेत" : "🌱 Your Farm")
      : (language === "mr" ? "भूखंड तपशील" : "Plot Details");

    const gatLabel = language === "mr" ? "गट क्रमांक" : "Gat No.";
    const villageLabel = language === "mr" ? "गाव" : "Village";
    const talukaLabel = language === "mr" ? "तालुका" : "Taluka";
    const districtLabel = language === "mr" ? "जिल्हा" : "District";
    const areaLabel = language === "mr" ? "क्षेत्रफळ" : "Area";
    const sourceLabel = language === "mr" ? "स्रोत" : "Source";
    const viewButtonText = language === "mr" ? "शेताचा तपशील पहा" : "View Farm Details";
    const badgeText = language === "mr" ? "निवडलेले" : "Selected";

    return `
      <div style="font-family: inherit; padding: 12px 14px; min-width: 210px; color: #1e293b;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
          <span style="font-weight: 800; font-size: 13px; color: #2A7C13;">
            ${titleText}
          </span>
          ${isSelected ? `<span style="font-size: 10px; font-weight: 700; background: #2A7C13; color: white; padding: 2px 6px; border-radius: 4px;">${badgeText}</span>` : ''}
        </div>
        <div style="font-size: 12px; line-height: 1.6;">
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span style="color: #64748b;">${gatLabel}:</span>
            <span style="font-weight: 700; color: #0f172a;">${plotGat}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span style="color: #64748b;">${villageLabel}:</span>
            <span style="font-weight: 600;">${plotVillage}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px;">
            <span style="color: #64748b;">${talukaLabel}, ${districtLabel}:</span>
            <span>${plotTaluka}, ${plotDistrict}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 2px;">
            <span style="color: #64748b;">${areaLabel}:</span>
            <span style="font-weight: 700; color: #2A7C13;">${plotArea}</span>
          </div>
        </div>
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8;">
          <span>${sourceLabel}: ${plotSource}</span>
          ${isSelected ? `<a href="/my-farm" style="color: #2A7C13; font-weight: 700; text-decoration: none;">${viewButtonText} →</a>` : ''}
        </div>
      </div>
    `;
  }, [gatNo, villageName, talukaName, districtName, areaText, language]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const satelliteTiles =
      process.env.NEXT_PUBLIC_MAP_TILES_SATELLITE ||
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

    const streetTiles =
      process.env.NEXT_PUBLIC_MAP_TILES_STREET ||
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    const initialBounds = computeBounds(geometry);
    const centerLng = initialBounds ? (initialBounds[0] + initialBounds[2]) / 2 : 74.505;
    const centerLat = initialBounds ? (initialBounds[1] + initialBounds[3]) / 2 : 18.155;

    const styleDefinition: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "satellite-source": {
          type: "raster",
          tiles: [satelliteTiles],
          tileSize: 256,
          attribution: "&copy; Esri &mdash; DigitalGlobe",
          maxzoom: 19,
        },
        "street-source": {
          type: "raster",
          tiles: [streetTiles],
          tileSize: 256,
          attribution: "&copy; OpenStreetMap contributors",
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: "basemap-satellite-layer",
          type: "raster",
          source: "satellite-source",
          minzoom: 0,
          maxzoom: 20,
          layout: { visibility: "visible" },
        },
        {
          id: "basemap-street-layer",
          type: "raster",
          source: "street-source",
          minzoom: 0,
          maxzoom: 20,
          layout: { visibility: "none" },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleDefinition,
      center: [centerLng, centerLat],
      zoom: 15,
      interactive: interactive,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      // 1. ALL PLOTS LAYER (Background with subtle styling)
      if (allPlotsGeoJSON && allPlotsGeoJSON.features && allPlotsGeoJSON.features.length > 0) {
        map.addSource("all-plots-source", {
          type: "geojson",
          data: allPlotsGeoJSON,
        });

        map.addLayer({
          id: "all-plots-fill",
          type: "fill",
          source: "all-plots-source",
          paint: {
            "fill-color": "#76C457",
            "fill-opacity": 0.08,
          },
        });

        map.addLayer({
          id: "all-plots-outline",
          type: "line",
          source: "all-plots-source",
          paint: {
            "line-color": "#76C457",
            "line-width": 1.5,
            "line-opacity": 0.55,
          },
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
        });
      }

      // 2. SELECTED FARMER PLOT LAYER (Prominent highlight)
      map.addSource("farm-field-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            gat_no: gatNo,
            village: villageName,
            taluka: talukaName,
            district: districtName,
            area: areaText?.replace(/[^0-9.]/g, "") || null,
            source: "Demo GIS Data",
          },
          geometry: geometry as any,
        },
      });

      map.addLayer({
        id: "farm-field-fill",
        type: "fill",
        source: "farm-field-source",
        paint: {
          "fill-color": "#2A7C13",
          "fill-opacity": 0.28,
        },
      });

      map.addLayer({
        id: "farm-field-outline",
        type: "line",
        source: "farm-field-source",
        paint: {
          "line-color": "#2A7C13",
          "line-width": 3.5,
          "line-opacity": 0.95,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });

      map.resize();
      setMapLoaded(true);

      // Auto-fit bounds with padding
      if (initialBounds) {
        map.fitBounds(
          [
            [initialBounds[0], initialBounds[1]],
            [initialBounds[2], initialBounds[3]],
          ],
          {
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
            maxZoom: 17,
            duration: 1200,
          }
        );
      }

      // Open initial popup for selected farmer plot if interactive
      if (interactive) {
        const centroid = computeCentroid(geometry);
        if (centroid) {
          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            offset: 15,
          })
            .setLngLat(centroid)
            .setHTML(createPopupHTML({
              gat_no: gatNo,
              village: villageName,
              taluka: talukaName,
              district: districtName,
              area: areaText?.replace(/[^0-9.]/g, "") || null,
              source: "Demo GIS Data"
            }, true))
            .addTo(map);

          popupRef.current = popup;
        }
      }
    });

    // CLICK INTERACTION: Clicking on any plot shows/updates popup
    if (interactive) {
      const handlePlotClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties || {};
        const clickedGat = String(props.gat_no || "").trim();
        const isSelected = clickedGat.toLowerCase() === String(gatNo).trim().toLowerCase();

        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          offset: 15,
        })
          .setLngLat(e.lngLat)
          .setHTML(createPopupHTML(props, isSelected))
          .addTo(map);

        popupRef.current = popup;
      };

      map.on("click", "all-plots-fill", handlePlotClick);
      map.on("click", "farm-field-fill", handlePlotClick);

      map.on("mouseenter", "all-plots-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "all-plots-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "farm-field-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "farm-field-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    map.on("error", (e) => {
      console.warn("MapLibre tile/resource warning:", e);
    });

    mapRef.current = map;

    const handleResize = () => {
      map.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geomCoordsString, allPlotsString, gatNo, villageName, talukaName, districtName, interactive]);

  // Dynamic DSM Layer Handling (Add / Update / Remove raster layers cleanly)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const currentDsmSourceId = "dsm-raster-source";
    const currentDsmLayerId = "dsm-raster-layer";

    // If active layer is farm_boundary (or no layer / pending without tiles or image), hide/remove raster layer
    if (!dsmLayer || dsmLayer.id === "farm_boundary" || (!dsmLayer.rasterTileUrl && !dsmLayer.imageUrl)) {
      if (map.getLayer(currentDsmLayerId)) {
        map.setLayoutProperty(currentDsmLayerId, "visibility", "none");
      }
      return;
    }

    // Clean up existing source/layer if switching between different layer image URLs or tile URLs
    if (map.getLayer(currentDsmLayerId)) {
      map.removeLayer(currentDsmLayerId);
    }
    if (map.getSource(currentDsmSourceId)) {
      map.removeSource(currentDsmSourceId);
    }

    // Insert DSM raster below the farm boundaries so the boundary is always visible
    const beforeLayerId = map.getLayer("all-plots-fill")
      ? "all-plots-fill"
      : map.getLayer("farm-field-fill")
      ? "farm-field-fill"
      : undefined;

    if (dsmLayer.imageUrl && dsmLayer.imageCoordinates) {
      // Direct high-resolution GeoTIFF rendered PNG overlay
      map.addSource(currentDsmSourceId, {
        type: "image",
        url: dsmLayer.imageUrl,
        coordinates: dsmLayer.imageCoordinates,
      });

      map.addLayer(
        {
          id: currentDsmLayerId,
          type: "raster",
          source: currentDsmSourceId,
          paint: {
            "raster-opacity": dsmOpacity,
            "raster-fade-duration": 200,
          },
          layout: {
            visibility: "visible",
          },
        },
        beforeLayerId
      );
    } else if (dsmLayer.rasterTileUrl) {
      // Standard raster tile service
      map.addSource(currentDsmSourceId, {
        type: "raster",
        tiles: [dsmLayer.rasterTileUrl],
        tileSize: 256,
        bounds: dsmLayer.rasterBounds,
      });

      map.addLayer(
        {
          id: currentDsmLayerId,
          type: "raster",
          source: currentDsmSourceId,
          paint: {
            "raster-opacity": dsmOpacity,
            "raster-fade-duration": 200,
          },
          layout: {
            visibility: "visible",
          },
        },
        beforeLayerId
      );
    }
  }, [dsmLayer?.id, dsmLayer?.imageUrl, dsmLayer?.rasterTileUrl, dsmOpacity, mapLoaded]);

  // Handle Basemap Switching (Satellite <-> Street)
  const handleBasemapChange = (type: "satellite" | "street") => {
    setActiveBasemap(type);
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer("basemap-satellite-layer")) {
      map.setLayoutProperty(
        "basemap-satellite-layer",
        "visibility",
        type === "satellite" ? "visible" : "none"
      );
    }
    if (map.getLayer("basemap-street-layer")) {
      map.setLayoutProperty(
        "basemap-street-layer",
        "visibility",
        type === "street" ? "visible" : "none"
      );
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 300 });
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden shadow-card border border-surface-border bg-slate-900 ${className}`}>
      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Top Left: Farmer Context Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md border border-surface-border/80 flex items-center gap-2 text-xs font-semibold text-text-main">
          <span className="w-2.5 h-2.5 rounded-full bg-soil-primary animate-pulse" />
          <span>
            {villageName ? `${villageName} • ` : ""}
            {t("geo.gatNo")} {gatNo}
          </span>
          {areaText && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-soil-primaryLight font-bold text-soil-primary">
              {areaText}
            </span>
          )}
        </div>
      </div>

      {/* Top Right: Basemap Switcher */}
      {interactive && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-surface-border/80 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleBasemapChange("satellite")}
              aria-label={t("map.satellite") || "Satellite"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeBasemap === "satellite"
                  ? "bg-soil-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>{t("map.satellite") || "Satellite"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleBasemapChange("street")}
              aria-label={t("map.street") || "Street"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeBasemap === "street"
                  ? "bg-soil-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-surface-subtle"
              }`}
            >
              <StreetIcon className="w-3.5 h-3.5" />
              <span>{t("map.street") || "Street"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Left: Navigation & Fit-to-Farm Controls */}
      {interactive && (
        <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-1.5">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-surface-border/80 p-1 flex flex-col gap-1">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label={t("myFarm.zoomIn") || "Zoom in"}
              title={t("myFarm.zoomIn") || "Zoom in"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-main hover:bg-surface-subtle active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="w-full h-px bg-surface-border" />
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label={t("myFarm.zoomOut") || "Zoom out"}
              title={t("myFarm.zoomOut") || "Zoom out"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-main hover:bg-surface-subtle active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={fitToFarm}
            aria-label={t("map.fitToFarm") || "Fit to farm"}
            title={t("map.fitToFarm") || "Fit to farm"}
            className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-surface-border/80 flex items-center justify-center text-soil-primary hover:bg-soil-primaryLight/50 active:scale-95 transition-all"
          >
            <Focus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
