"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FarmMap } from "@/components/map/FarmMap";
import { DSMLayerSelector } from "@/components/map/DSMLayerSelector";
import { MapLegend } from "@/components/map/MapLegend";
import { dsmService } from "@/services/dsmService";
import { DSMLayerConfig, DSMLayerId } from "@/types/gis";
import { DSM_LAYERS, DSM_LAYER_LIST } from "@/lib/gis/dsmLayers";
import {
  Layers,
  MapPin,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";
import { CadastralSoilExplorer } from "@/components/map/CadastralSoilExplorer";

export default function SoilMapPage() {
  const { t, language } = useI18n();
  const { field, location } = useAuth();

  const [layers, setLayers] = useState<DSMLayerConfig[]>(DSM_LAYER_LIST);
  const [activeLayerId, setActiveLayerId] = useState<DSMLayerId>("farm_boundary");
  const [layerOpacity, setLayerOpacity] = useState<number>(0.75);
  const [viewMode, setViewMode] = useState<"cadastral" | "simple">("cadastral");

  useEffect(() => {
    async function loadLayers() {
      const data = await dsmService.getLayers();
      setLayers(data);
    }
    loadLayers();
  }, []);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || DSM_LAYERS.farm_boundary;

  const villageDisplay = location?.village || "Malegaon";
  const talukaDisplay = location?.taluka || "Baramati";
  const districtDisplay = location?.district || "Pune";
  const gatDisplay = field?.gat_no || "104";
  const areaDisplay = field?.area ? `${field.area} Ha` : "1.96 Ha";

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header & Farmer Context Banner */}
        <div className="bg-white rounded-2xl border border-surface-border p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-soil-primaryLight border border-soil-primary/20 flex items-center justify-center text-soil-primary shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
                {t("soilMap.title") || "My Soil Map"}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-text-muted">
              {t("soilMap.description") || "Explore soil and environmental properties of your farm."}
            </p>
          </div>

          {/* Context Badge */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-surface-subtle border border-surface-border flex items-center gap-2 text-xs font-semibold text-text-main shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-soil-primary" />
              <span>
                {villageDisplay}, {talukaDisplay} • {t("geo.gatNo") || "Gat No."} {gatDisplay} ({areaDisplay})
              </span>
            </div>

            <div className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1 shadow-xs">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              <span>{t("dashboard.demoNotice") ? "DEMO DATA" : "DEMO DATA"}</span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl bg-surface-subtle border border-surface-border p-1 gap-1 shadow-xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode("cadastral")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === "cadastral"
                    ? "bg-soil-primary text-white shadow-xs font-bold"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                {t("soilMap.cadastralView") || "Cadastral DSM Explorer"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("simple")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === "simple"
                    ? "bg-soil-primary text-white shadow-xs font-bold"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                {t("soilMap.standardView") || "Simple Boundary View"}
              </button>
            </div>
          </div>
        </div>

        {/* Notice for Pending Layers */}
        {activeLayer.status === "pending" && viewMode === "simple" && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-sm text-amber-950">
                {t(activeLayer.nameKey) || activeLayer.shortName} — {t("dsm.pendingNoticeTitle") || "Awaiting Field Raster Ingestion"}
              </span>
              <p className="text-amber-800 leading-relaxed">
                {t("dsm.pendingNoticeBanner") ||
                  "This Digital Soil Mapping layer is awaiting satellite/model raster ingestion. The verified farm boundary remains fully mapped and active below."}
              </p>
            </div>
          </div>
        )}

        {/* Main Map Viewer & Sidebar Grid */}
        {viewMode === "cadastral" ? (
          <CadastralSoilExplorer initialGat={gatDisplay} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Layer Selector (Left column on Desktop, Stacked on Mobile) */}
            <div className="lg:col-span-1 order-2 lg:order-1 space-y-4">
              <DSMLayerSelector
                layers={layers}
                activeLayerId={activeLayerId}
                onSelectLayer={(id) => setActiveLayerId(id)}
              />

              {/* Farm specific metadata info card */}
              <div className="bg-white rounded-2xl border border-surface-border p-4 shadow-card text-xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-text-main font-bold border-b border-surface-border/60 pb-2">
                  <Info className="w-4 h-4 text-soil-primary" />
                  <span>{t("dsm.info.fieldSummary") || "Field Summary"}</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-surface-subtle">
                    <span className="text-text-muted">{t("geo.village") || "Village"}:</span>
                    <span className="font-semibold text-text-main">{villageDisplay}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-surface-subtle">
                    <span className="text-text-muted">{t("geo.taluka") || "Taluka"}:</span>
                    <span className="font-semibold text-text-main">{talukaDisplay}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-surface-subtle">
                    <span className="text-text-muted">{t("geo.gatNo") || "Gat No."}:</span>
                    <span className="font-bold text-soil-primary">{gatDisplay}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-surface-subtle">
                    <span className="text-text-muted">{t("myFarm.fieldArea") || "Area"}:</span>
                    <span className="font-semibold text-text-main">{areaDisplay}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-text-muted">{t("map.source") || "Source"}:</span>
                    <span className="font-semibold text-text-main">{activeLayer.sourceType}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Viewer Container with Floating Legend */}
            <div className="lg:col-span-3 order-1 lg:order-2 relative">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-card border border-surface-border bg-slate-900">
                <FarmMap
                  className="h-[480px] sm:h-[580px] lg:h-[640px]"
                  dsmLayer={activeLayer}
                  dsmOpacity={layerOpacity}
                />

                {/* Floating Map Legend (Bottom Right on Desktop, Collapsible) */}
                <div className="absolute bottom-6 right-4 z-20 pointer-events-auto">
                  <MapLegend
                    layer={activeLayer}
                    opacity={layerOpacity}
                    onOpacityChange={setLayerOpacity}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

