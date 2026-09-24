import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { DSMLayerConfig, DSMLayerId } from "@/types/gis";
import {
  Layers,
  CheckCircle2,
  Clock,
  Compass,
  Sparkles,
  Droplets,
  Activity,
  Mountain,
  Sprout,
  BarChart3,
} from "lucide-react";

interface DSMLayerSelectorProps {
  layers: DSMLayerConfig[];
  activeLayerId: DSMLayerId;
  onSelectLayer: (layerId: DSMLayerId) => void;
  className?: string;
}

const getLayerIcon = (id: DSMLayerId) => {
  switch (id) {
    case "farm_boundary":
      return <Compass className="w-4 h-4 text-soil-primary" />;
    case "ph":
      return <Droplets className="w-4 h-4 text-emerald-600" />;
    case "bd":
      return <BarChart3 className="w-4 h-4 text-amber-600" />;
    case "elevation":
      return <Mountain className="w-4 h-4 text-sky-600" />;
    case "nitrogen":
      return <Activity className="w-4 h-4 text-purple-600" />;
    case "soc":
      return <Sparkles className="w-4 h-4 text-amber-800" />;
    case "ndvi":
      return <Sprout className="w-4 h-4 text-green-600" />;
    default:
      return <Layers className="w-4 h-4 text-soil-primary" />;
  }
};

export const DSMLayerSelector: React.FC<DSMLayerSelectorProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  className = "",
}) => {
  const { t } = useI18n();

  return (
    <div className={`bg-white rounded-2xl border border-surface-border p-4 shadow-card ${className}`}>
      <div className="flex items-center justify-between mb-3 border-b border-surface-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-soil-primaryLight flex items-center justify-center text-soil-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-text-main">
              {t("dsm.selector.title") || "Soil & Environment Layers"}
            </h3>
            <p className="text-[11px] text-text-muted">
              {t("dsm.selector.subtitle") || "Select a layer to view on map"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
        {layers.map((layer) => {
          const isSelected = layer.id === activeLayerId;
          const isAvailable = layer.status === "available";

          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onSelectLayer(layer.id)}
              className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                isSelected
                  ? "bg-soil-primaryLight/40 border-soil-primary shadow-xs ring-1 ring-soil-primary/20"
                  : "bg-surface-subtle/50 hover:bg-surface-subtle border-surface-border/80 hover:border-soil-secondary/50"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {getLayerIcon(layer.id)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-xs sm:text-sm font-bold truncate ${
                      isSelected ? "text-soil-primary" : "text-text-main"
                    }`}
                  >
                    {t(layer.nameKey) || layer.shortName}
                  </span>

                  {isAvailable ? (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{t("dsm.status.available") || "Active"}</span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{t("dsm.status.pending") || "Pending"}</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                  {t(layer.descriptionKey) || layer.unit}
                </p>

                <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                  <span className="font-semibold text-text-main">
                    {layer.unit}
                  </span>
                  <span>•</span>
                  <span className="truncate">{layer.sourceType}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
