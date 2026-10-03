"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { DSMLayerConfig, ColorStop } from "@/types/gis";
import { Sliders } from "lucide-react";

interface MapLegendProps {
  layer: DSMLayerConfig;
  opacity: number;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
}

/**
 * 18-step segmented color ramp for NDRE/NDVI vegetation indices.
 * Matches standard remote sensing canopy vigor scale:
 * -1.0 (deep maroon) -> 0.0 (vivid yellow) -> +1.0 (electric green)
 */
const VEGETATION_INDEX_SEGMENTS = [
  "#5a0004", // 0: deep dark maroon (-1.0)
  "#7b0008", // 1: dark maroon
  "#9d0010", // 2: maroon red
  "#bf0d18", // 3: deep crimson
  "#e2231c", // 4: bright red
  "#ec4924", // 5: red-orange
  "#f56f24", // 6: deep orange
  "#f99222", // 7: orange
  "#fbb31e", // 8: amber yellow-orange
  "#fedd1f", // 9: bright canary yellow (0.0 center)
  "#e7ee3e", // 10: lemon / lime
  "#c6e355", // 11: pale lime green
  "#9dce69", // 12: light spring green
  "#71b66b", // 13: medium green
  "#459c5d", // 14: rich foliage green
  "#227f49", // 15: forest green
  "#0c5d33", // 16: deep dark green
  "#00e500", // 17: vivid bright green (+1.0)
];

function parseRgbOrHex(colorStr: string): [number, number, number] {
  if (colorStr.startsWith("#")) {
    const hex = colorStr.replace("#", "");
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  }
  return [100, 100, 100];
}

function getSteppedColors(colorStops?: ColorStop[], steps = 18): string[] {
  if (!colorStops || colorStops.length < 2) {
    return VEGETATION_INDEX_SEGMENTS;
  }
  const minVal = colorStops[0].value;
  const maxVal = colorStops[colorStops.length - 1].value;
  const range = maxVal - minVal || 1;

  const result: string[] = [];
  for (let i = 0; i < steps; i++) {
    const val = minVal + (range * i) / (steps - 1);
    let sIdx = 0;
    while (sIdx < colorStops.length - 1 && colorStops[sIdx + 1].value < val) {
      sIdx++;
    }
    const s1 = colorStops[sIdx];
    const s2 = colorStops[Math.min(sIdx + 1, colorStops.length - 1)];
    const factor = s2.value === s1.value ? 0 : (val - s1.value) / (s2.value - s1.value);
    const [r1, g1, b1] = parseRgbOrHex(s1.color);
    const [r2, g2, b2] = parseRgbOrHex(s2.color);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    result.push(`rgb(${r}, ${g}, ${b})`);
  }
  return result;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  layer,
  opacity,
  onOpacityChange,
  className = "",
}) => {
  const { t, locale } = useI18n();
  const [showOpacity, setShowOpacity] = useState<boolean>(false);
  const isBoundaryOnly = layer.id === "farm_boundary";

  const isVegetationIndex =
    layer.id === "ndvi" ||
    layer.id === "ndre" ||
    layer.id === "evi" ||
    layer.unit === "index";

  // Stepped colors for the segmented pill bar
  const segments = isVegetationIndex
    ? VEGETATION_INDEX_SEGMENTS
    : getSteppedColors(layer.colorStops, 18);

  // Exact 3 reference labels (-1.0, 0.0, 1.0 or layer bounds)
  let minDisplay = "-1.0";
  let midDisplay = "0.0";
  let maxDisplay = "1.0";

  if (isVegetationIndex) {
    minDisplay = "-1.0";
    midDisplay = "0.0";
    maxDisplay = "1.0";
  } else if (layer.min !== undefined && layer.max !== undefined) {
    const min = layer.min;
    const max = layer.max;
    const mid = (min + max) / 2;
    const isDecimal = max < 10 && max - min < 5;
    minDisplay = isDecimal ? min.toFixed(1) : Math.round(min).toString();
    midDisplay = isDecimal ? mid.toFixed(1) : Math.round(mid).toString();
    maxDisplay = isDecimal ? max.toFixed(1) : Math.round(max).toString();
  }

  // Format header title (e.g., "NDRE INDEX", "NDVI INDEX")
  const getHeaderTitle = (): string => {
    if (locale === "mr") {
      if (layer.id === "ndre") return "NDRE निर्देशांक";
      if (layer.id === "ndvi") return "NDVI निर्देशांक";
      if (layer.id === "evi") return "EVI निर्देशांक";
      if (layer.id === "ph") return "मातीचा pH (सामू)";
      if (layer.id === "soc") return "सेंद्रिय कर्ब (SOC)";
      if (layer.id === "nitrogen") return "उपलब्ध नत्र (N)";
      if (layer.id === "bd") return "मृदा घनता (BD)";
      if (layer.id === "elevation") return "उंची (Elevation)";
      if (layer.id === "uncertainty") return "अनिश्चितता (Uncertainty)";
      if (layer.id === "farm_boundary") return "तपशीलवार हद्द (सीमा)";
      if (layer.marathiName) return layer.marathiName;
    }
    if (layer.id === "ndre") return "NDRE INDEX";
    if (layer.id === "ndvi") return "NDVI INDEX";
    if (layer.id === "evi") return "EVI INDEX";
    if (layer.shortName) {
      const upper = layer.shortName.toUpperCase();
      return upper.includes("INDEX") ? upper : `${upper} INDEX`;
    }
    return (layer.name || "INDEX").toUpperCase();
  };

  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-100/90 p-3.5 sm:p-4 text-xs w-[210px] sm:w-[230px] transition-all select-none ${className}`}
    >
      {/* Top Header: Dark Forest Green Bold Title */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[#14532d] text-xs sm:text-[13px] tracking-wide uppercase">
          {getHeaderTitle()}
        </h4>

        {/* Subtle opacity toggle button */}
        {onOpacityChange && !isBoundaryOnly && (
          <button
            type="button"
            onClick={() => setShowOpacity(!showOpacity)}
            title="Adjust layer opacity"
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
            aria-label="Toggle opacity slider"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cadastral Boundary vs Stepped Color Bar */}
      {isBoundaryOnly ? (
        <div className="space-y-1.5 py-2 mt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
            <span className="w-4 h-2.5 rounded bg-amber-400/40 border-2 border-amber-500 shrink-0" />
            <span>{locale === "mr" ? "निवडलेला गट भूखंड" : (t("soilMap.selectedParcel") || "Selected Gat Parcel")}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="w-4 h-2.5 rounded bg-cyan-400/30 border border-cyan-600 shrink-0" />
            <span>{locale === "mr" ? "भूमापन सीमा रचना" : (t("soilMap.cadastralFabric") || "Cadastral Boundary Fabric")}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Segmented Color Pill Bar */}
          <div className="h-3.5 w-full rounded-full overflow-hidden flex shadow-inner border border-slate-200/60 mt-2.5">
            {segments.map((color, idx) => (
              <div
                key={idx}
                className="flex-1 h-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Clean 3-point value scale (-1.0, 0.0, 1.0) */}
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mt-1.5 px-0.5">
            <span>{minDisplay}</span>
            <span className="text-center">{midDisplay}</span>
            <span>{maxDisplay}</span>
          </div>
        </>
      )}

      {/* Optional Opacity Slider Drawer */}
      {showOpacity && onOpacityChange && !isBoundaryOnly && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] font-medium text-slate-500">
            <span>{locale === "mr" ? "पारदर्शकता" : (t("soilMap.opacity") || "Opacity")}</span>
            <span>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#14532d]"
          />
        </div>
      )}
    </div>
  );
};
