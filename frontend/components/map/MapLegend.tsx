import React, { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { DSMLayerConfig } from "@/types/gis";
import { Info, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

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

  const isBoundaryOnly = layer.id === "farm_boundary";

  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-card border border-surface-border p-3.5 sm:p-4 text-xs max-w-[280px] sm:max-w-xs transition-all ${className}`}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-surface-border/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-text-main truncate text-xs sm:text-sm">
            {t(layer.nameKey) || layer.shortName}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle font-semibold text-text-muted shrink-0">
            {layer.unit}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-surface-subtle text-text-muted hover:text-text-main transition-colors shrink-0"
          aria-label={collapsed ? "Expand legend" : "Collapse legend"}
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          {/* Farm Boundary specific legend */}
          {isBoundaryOnly ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <span className="w-4 h-2.5 rounded bg-[#2A7C13]/30 border-2 border-[#2A7C13] shrink-0" />
                <span>{t("map.selectedPlot") || "Selected Farm Plot"}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <span className="w-4 h-2.5 rounded bg-[#76C457]/10 border border-[#76C457] shrink-0" />
                <span>{t("map.allPlots") || "Village Cadastral Fabric"}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Raster Color Ramp or Pending Notice */}
              {layer.colorStops && layer.colorStops.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-text-muted font-bold">
                    <span>{t("dsm.legend.low") || "Low"} ({layer.min})</span>
                    <span>{t("dsm.legend.high") || "High"} ({layer.max})</span>
                  </div>

                  {/* Gradient bar */}
                  <div
                    className="h-3 w-full rounded-md shadow-inner border border-surface-border/40"
                    style={{
                      background: `linear-gradient(to right, ${layer.colorStops
                        .map((s) => s.color)
                        .join(", ")})`,
                    }}
                  />

                  {/* Color intervals breakdown */}
                  <div className="pt-1.5 space-y-1">
                    {layer.colorStops.map((stop) => (
                      <div
                        key={stop.value}
                        className="flex items-center justify-between text-[10px] text-text-muted"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: stop.color }}
                          />
                          <span>{stop.label || stop.value}</span>
                        </div>
                        <span className="font-mono text-text-main font-semibold">
                          {stop.value} {layer.unit !== "Cadastral" && layer.unit !== "Index" ? layer.unit : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Status / Awaiting Raster Ingestion Notice */}
              {layer.status === "pending" && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-1.5 text-[11px] leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {t("dsm.pendingNoticeTitle") || "Awaiting GeoTIFF Raster"}
                    </span>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      {t("dsm.pendingNoticeDesc") ||
                        "Field boundary is active. Raster spatial surface will overlay as soon as dataset is provided."}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Opacity slider */}
          {onOpacityChange && !isBoundaryOnly && (
            <div className="pt-2 border-t border-surface-border/60 space-y-1">
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>{t("dsm.opacity") || "Layer Opacity"}</span>
                <span className="font-mono font-bold text-text-main">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-soil-primary"
              />
            </div>
          )}

          {/* Source Tag */}
          <div className="pt-1.5 border-t border-surface-border/50 flex items-center justify-between text-[10px] text-text-muted">
            <span>{t("map.source") || "Source"}:</span>
            <span className="font-semibold text-soil-primary truncate">
              {layer.sourceType}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
