"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { DSMLayerConfig } from "@/types/gis";
import { ChevronDown, ChevronUp, Sliders, Layers } from "lucide-react";

interface MapLegendProps {
  layer: DSMLayerConfig;
  opacity: number;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  layer,
  opacity,
  onOpacityChange,
  className = "",
}) => {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [showOpacity, setShowOpacity] = useState<boolean>(false);

  const isBoundaryOnly = layer.id === "farm_boundary";

  // Build gradient CSS from color stops
  const gradientCss =
    layer.colorStops && layer.colorStops.length > 0
      ? `linear-gradient(to right, ${layer.colorStops.map((s) => s.color).join(", ")})`
      : "linear-gradient(to right, #ef4444, #f59e0b, #eab308, #84cc16, #22c55e)";

  const minDisplay = layer.min !== undefined && layer.min !== null ? Number(layer.min).toFixed(3) : "—";
  const maxDisplay = layer.max !== undefined && layer.max !== null ? Number(layer.max).toFixed(3) : "—";
  const unitDisplay = layer.unit && layer.unit !== "Cadastral" ? layer.unit.toLowerCase() : "cadastre";

  return (
    <div
      className={`bg-slate-900/90 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 p-3.5 sm:p-4 text-xs w-[280px] sm:w-[320px] transition-all select-none ${className}`}
    >
      {/* Top Header: Layer Name + Unit Badge + Collapse Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <h4 className="font-bold text-white truncate text-xs sm:text-sm tracking-tight">
            {layer.name || layer.shortName}
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 font-mono font-semibold text-slate-300">
            {unitDisplay}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label={collapsed ? "Expand legend" : "Collapse legend"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-2.5">
          {/* Farm Boundary vs Raster Legend */}
          {isBoundaryOnly ? (
            <div className="space-y-1.5 py-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-4 h-2.5 rounded bg-amber-400/30 border-2 border-amber-400 shrink-0" />
                <span>Selected Gat Parcel</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-4 h-2.5 rounded bg-cyan-400/20 border border-cyan-400 shrink-0" />
                <span>Cadastral Boundary Fabric</span>
              </div>
            </div>
          ) : (
            <>
              {/* Values Row: Low (min) ... High (max) */}
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-300">
                <span>
                  Low <span className="font-mono text-slate-400">({minDisplay})</span>
                </span>
                <span>
                  High <span className="font-mono text-slate-400">({maxDisplay})</span>
                </span>
              </div>

              {/* Continuous Color Gradient Bar */}
              <div className="relative">
                <div
                  className="h-3.5 w-full rounded-md shadow-inner border border-white/20 transition-all"
                  style={{ background: gradientCss }}
                />
              </div>

              {/* Color Stop Markers if available */}
              {layer.colorStops && layer.colorStops.length > 0 && (
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0.5">
                  {layer.colorStops.map((stop, idx) => (
                    <span key={idx} className="truncate">
                      {idx === 0 || idx === layer.colorStops!.length - 1 ? "" : Number(stop.value).toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Opacity control toggle & slider */}
          {onOpacityChange && !isBoundaryOnly && (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <button
                  type="button"
                  onClick={() => setShowOpacity(!showOpacity)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  <Sliders className="w-3 h-3 text-emerald-400" />
                  <span>Opacity: {Math.round(opacity * 100)}%</span>
                </button>
              </div>

              {showOpacity && (
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
