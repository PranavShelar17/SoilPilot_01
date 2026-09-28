"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { DSMLayerConfig, DSMLayerId } from "@/types/gis";
import type { BasemapStyle } from "./SoilMapViewer";
import {
  Layers,
  Satellite,
  Moon,
  Map as StreetIcon,
  Mountain,
} from "lucide-react";

interface DSMLayerSelectorProps {
  layers: DSMLayerConfig[];
  activeLayerId: DSMLayerId;
  onSelectLayer: (layerId: DSMLayerId) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  basemap?: BasemapStyle;
  onBasemapChange?: (basemap: BasemapStyle) => void;
  className?: string;
}

const LAYER_META: Record<
  string,
  { marathi: string; scorpan: string; color: string; badgeBg: string; badgeText: string }
> = {
  ndvi: {
    marathi: "वनस्पती निर्देशांक (NDVI)",
    scorpan: "Organisms",
    color: "#22c55e",
    badgeBg: "bg-emerald-950/60 border border-emerald-700/50",
    badgeText: "text-emerald-300",
  },
  evi: {
    marathi: "हवीत वनस्पती निर्देशांक (EVI)",
    scorpan: "Organisms",
    color: "#ec4899",
    badgeBg: "bg-pink-950/60 border border-pink-700/50",
    badgeText: "text-pink-300",
  },
  ph: {
    marathi: "मातीचा pH (प्रतिक्रिया)",
    scorpan: "Soil",
    color: "#f97316",
    badgeBg: "bg-amber-950/60 border border-amber-700/50",
    badgeText: "text-amber-300",
  },
  soc: {
    marathi: "मातीत कार्बन (SOC)",
    scorpan: "Soil",
    color: "#eab308",
    badgeBg: "bg-yellow-950/60 border border-yellow-700/50",
    badgeText: "text-yellow-300",
  },
  nitrogen: {
    marathi: "उपलब्ध नत्र (N)",
    scorpan: "Primary",
    color: "#06b6d4",
    badgeBg: "bg-cyan-950/60 border border-cyan-700/50",
    badgeText: "text-cyan-300",
  },
  bd: {
    marathi: "घनता (Bulk Density)",
    scorpan: "Soil",
    color: "#6366f1",
    badgeBg: "bg-indigo-950/60 border border-indigo-700/50",
    badgeText: "text-indigo-300",
  },
  elevation: {
    marathi: "उंची (Elevation)",
    scorpan: "Relief",
    color: "#3b82f6",
    badgeBg: "bg-blue-950/60 border border-blue-700/50",
    badgeText: "text-blue-300",
  },
  uncertainty: {
    marathi: "अनिश्चितता (Uncertainty)",
    scorpan: "Model",
    color: "#a855f7",
    badgeBg: "bg-purple-950/60 border border-purple-700/50",
    badgeText: "text-purple-300",
  },
  farm_boundary: {
    marathi: "शेताची हद्द (Boundary)",
    scorpan: "Cadastre",
    color: "#10b981",
    badgeBg: "bg-emerald-950/60 border border-emerald-700/50",
    badgeText: "text-emerald-300",
  },
};

export const DSMLayerSelector: React.FC<DSMLayerSelectorProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  opacity = 0.85,
  onOpacityChange,
  basemap = "satellite",
  onBasemapChange,
  className = "",
}) => {
  const { t } = useI18n();

  return (
    <div
      className={`bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 shadow-xl space-y-4 select-none ${className}`}
    >
      {/* Title & Dropdown Header (Screenshot 2) */}
      <div className="space-y-2">
        <h3 className="text-base font-extrabold text-white tracking-tight">Soil Map</h3>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Select Layer</label>
          <div className="relative">
            <select
              value={activeLayerId}
              onChange={(e) => onSelectLayer(e.target.value as DSMLayerId)}
              className="w-full bg-slate-800/90 text-white font-medium text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                  {l.name || l.shortName}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400 text-xs">▼</div>
          </div>
        </div>
      </div>

      {/* Section Header: SCORPAN RASTER LAYERS */}
      <div className="pt-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          SCORPAN RASTER LAYERS
        </div>

        <div className="space-y-1.5">
          {layers
            .filter((l) => l.id !== "farm_boundary")
            .map((layer) => {
              const isSelected = layer.id === activeLayerId;
              const meta = LAYER_META[layer.id] || {
                marathi: layer.unit,
                scorpan: "DSM",
                color: "#10b981",
                badgeBg: "bg-slate-800 border border-slate-700",
                badgeText: "text-slate-300",
              };

              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/50 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30"
                      : "bg-slate-800/40 hover:bg-slate-800 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: meta.color }}
                    />
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-bold truncate leading-tight ${
                          isSelected ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {layer.name || layer.shortName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                        {layer.marathiName || meta.marathi}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md ${meta.badgeBg} ${meta.badgeText}`}
                  >
                    {meta.scorpan}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Overlay Opacity Slider (Screenshot 2) */}
      {onOpacityChange && (
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Overlay Opacity</span>
            <span className="font-mono font-bold text-emerald-400">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      )}

      {/* BASEMAP STYLE (Screenshot 2) */}
      {onBasemapChange && (
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BASEMAP STYLE</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: "satellite" as const, label: "Satellite", icon: <Satellite className="w-3.5 h-3.5" /> },
              { id: "dark" as const, label: "Dark Matter", icon: <Moon className="w-3.5 h-3.5" /> },
              { id: "street" as const, label: "Open Street", icon: <StreetIcon className="w-3.5 h-3.5" /> },
              { id: "topo" as const, label: "Topographic", icon: <Mountain className="w-3.5 h-3.5" /> },
            ].map((bm) => {
              const active = basemap === bm.id;
              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => onBasemapChange(bm.id)}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl font-semibold border transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-950/60 border-emerald-500 text-white shadow-xs"
                      : "bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800"
                  }`}
                >
                  {bm.icon}
                  <span className="truncate">{bm.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
