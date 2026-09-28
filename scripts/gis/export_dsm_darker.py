"""
SoilPilot - Export DSM GeoTIFF rasters with darker, richer, saturated color palettes
matching the reference agricultural monitoring visuals (deep wine red -> bold crimson
-> dark orange -> golden sand -> vibrant green -> deep dark forest pine green).

Uses pure numpy, tifffile, and Pillow (no matplotlib dependency).
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

NODATA_U16 = 65535
MAX_U16 = 65534

# -----------------------------------------------------------------------------
# Darker, richer multi-stop color palettes matching user's reference image
# Format: list of (position_0_to_1, (R, G, B))
# -----------------------------------------------------------------------------

# Reference Screenshot: Deep wine red -> Crimson -> Dark orange -> Amber -> Golden cream -> Rich green -> Darkest pine green
DARK_AGRONOMIC_PALETTE = [
    (0.00, (127, 29, 29)),    # #7f1d1d - Deepest dark wine/burgundy
    (0.12, (168, 20, 36)),    # #a81424 - Rich dark red
    (0.24, (220, 38, 38)),    # #dc2626 - Bold scarlet red
    (0.36, (234, 88, 12)),    # #ea580c - Fiery dark orange
    (0.48, (245, 158, 11)),   # #f59e0b - Warm amber gold
    (0.58, (254, 240, 138)),  # #fef08a - Golden sand / light cream
    (0.68, (132, 204, 22)),   # #84cc16 - Fresh lime green
    (0.80, (22, 163, 74)),    # #16a34a - Vibrant green
    (0.90, (21, 128, 61)),    # #15803d - Rich forest green
    (1.00, (5, 46, 22)),      # #052e16 - Deepest dark pine green
]

DARK_PH_PALETTE = [
    (0.00, (185, 28, 28)),    # #b91c1c - Dark red (acidic)
    (0.25, (234, 88, 12)),    # #ea580c - Fiery orange (slightly acidic)
    (0.50, (16, 149, 106)),   # #10956a - Deep emerald green (neutral / optimal vertisol)
    (0.75, (30, 64, 175)),    # #1e40af - Deep royal indigo (moderately alkaline)
    (1.00, (88, 28, 135)),    # #581c87 - Deep dark violet (strongly alkaline)
]

DARK_SOC_PALETTE = [
    (0.00, (153, 27, 27)),    # #991b1b - Dark rust (very low organic matter)
    (0.25, (217, 119, 6)),    # #d97706 - Dark amber (moderate)
    (0.50, (161, 98, 7)),     # #a16207 - Deep ochre (good organic carbon)
    (0.75, (69, 26, 3)),      # #451a03 - Rich dark humus (high organic carbon)
    (1.00, (24, 9, 2)),       # #180902 - Deep dark earth brown (very high)
]

DARK_NITROGEN_PALETTE = [
    (0.00, (185, 28, 28)),    # #b91c1c - Dark red (deficient)
    (0.25, (234, 88, 12)),    # #ea580c - Dark orange (low)
    (0.50, (13, 148, 136)),   # #0d9488 - Deep teal (medium)
    (0.75, (29, 78, 216)),    # #1d4ed8 - Royal blue (sufficient)
    (1.00, (15, 23, 42)),     # #0f172a - Deepest dark navy (rich)
]

DARK_BD_PALETTE = [
    (0.00, (21, 128, 61)),    # #15803d - Dark forest green (low bulk density / well aerated)
    (0.50, (217, 119, 6)),    # #d97706 - Dark amber (moderate)
    (1.00, (127, 29, 29)),    # #7f1d1d - Deep wine red (high bulk density / compacted)
]

DARK_ELEVATION_PALETTE = [
    (0.00, (22, 101, 52)),    # #166534 - Dark valley green
    (0.35, (202, 138, 4)),    # #ca8a04 - Dark golden slope
    (0.70, (161, 98, 7)),     # #a16207 - Deep ochre ridge
    (1.00, (68, 64, 60)),     # #44403c - Dark stone crest
]

DARK_UNCERTAINTY_PALETTE = [
    (0.00, (21, 128, 61)),    # #15803d - Dark green (high model confidence)
    (0.50, (217, 119, 6)),    # #d97706 - Dark amber (medium uncertainty)
    (1.00, (153, 27, 27)),    # #991b1b - Dark crimson (higher uncertainty)
]

LAYERS_CONFIG = [
    dict(
        id="ndvi",
        file="NDVI",
        name="NDVI Vegetation Index",
        marathi="वनस्पती निर्देशांक (NDVI)",
        unit="index",
        palette=DARK_AGRONOMIC_PALETTE,
        category="Organisms (O)",
        desc="Normalized Difference Vegetation Index from Sentinel-2 (10m). Measures crop vigor & canopy density.",
        # Agricultural contrast limits: stretch 0.08 to 0.72 so farm parcels display the full dark red -> green range
        clip_pmin=0.08,
        clip_pmax=0.72,
    ),
    dict(
        id="evi",
        file="EVI",
        name="EVI Vegetation Index",
        marathi="वर्धित वनस्पती निर्देशांक (EVI)",
        unit="index",
        palette=DARK_AGRONOMIC_PALETTE,
        category="Organisms (O)",
        desc="Enhanced Vegetation Index. Reduced atmospheric and soil background interference for high biomass.",
        clip_pmin=0.05,
        clip_pmax=0.52,
    ),
    dict(
        id="ph",
        file="pH",
        name="Soil pH (Reaction)",
        marathi="जमिनीचा सामू (pH)",
        unit="pH",
        palette=DARK_PH_PALETTE,
        category="Soil Chemical (S)",
        desc="Acidity / Alkalinity level (0-14 scale). Optimal range for Deccan vertisols is 6.5 - 7.8.",
        clip_pmin=7.02,
        clip_pmax=7.28,
    ),
    dict(
        id="soc",
        file="SOC",
        name="Soil Organic Carbon (SOC)",
        marathi="सेंद्रिय कर्ब (SOC)",
        unit="%",
        palette=DARK_SOC_PALETTE,
        category="Soil Chemical (S)",
        desc="Organic Carbon percentage in topsoil (0-15 cm). Key driver of microbial health and nutrient buffering.",
        clip_pmin=1.22,
        clip_pmax=2.05,
    ),
    dict(
        id="nitrogen",
        file="Nitrogen",
        name="Available Nitrogen (N)",
        marathi="उपलब्ध नत्र (N)",
        unit="mg/kg",
        palette=DARK_NITROGEN_PALETTE,
        category="Primary Nutrient (S)",
        desc="Alkaline permanganate extractable Nitrogen (mg/kg). Equivalent to kg/ha (x2 factor).",
        clip_pmin=12.1,
        clip_pmax=15.5,
    ),
    dict(
        id="bd",
        file="BD",
        name="Bulk Density",
        marathi="घनता (Bulk Density)",
        unit="g/cm³",
        palette=DARK_BD_PALETTE,
        category="Soil Physical (S)",
        desc="Dry mass of soil per unit volume (g/cm³). Indicator of compaction, root penetration and aeration.",
        clip_pmin=1.51,
        clip_pmax=1.59,
    ),
    dict(
        id="elevation",
        file="Elevation",
        name="Elevation (DEM)",
        marathi="उंची (Elevation)",
        unit="m",
        palette=DARK_ELEVATION_PALETTE,
        category="Relief (R)",
        desc="Height above Mean Sea Level (m) derived from DEM. Controls hydrologic runoff & accumulation.",
        clip_pmin=542.0,
        clip_pmax=578.0,
    ),
    dict(
        id="uncertainty",
        file="Uncertainty",
        name="DSM Prediction Uncertainty",
        marathi="मॉडेल अनिश्चितता (Uncertainty)",
        unit="% error",
        palette=DARK_UNCERTAINTY_PALETTE,
        category="Model Quality (QRF)",
        desc="Quantile Regression Forest 90% prediction interval error. Lower values represent higher confidence.",
        clip_pmin=5.8,
        clip_pmax=10.5,
    ),
]


def read_geotiff(path: Path):
    """Return (float32 array with NaN nodata, (west, south, east, north))."""
    with tifffile.TiffFile(path) as tif:
        page = tif.pages[0]
        arr = page.asarray().astype(np.float32)
        tags = page.tags
        scale = tags["ModelPixelScaleTag"].value
        tie = tags["ModelTiepointTag"].value
        nodata_tag = tags.get("GDAL_NODATA")
        nodata = float(nodata_tag.value) if nodata_tag is not None else None

    if nodata is not None and not np.isnan(nodata):
        arr[arr == nodata] = np.nan

    h, w = arr.shape
    west, north = tie[3], tie[4]
    east = west + w * scale[0]
    south = north - h * scale[1]
    return arr, (west, south, east, north)


def colorize_array(arr: np.ndarray, vmin: float, vmax: float, palette: list[tuple[float, tuple[int, int, int]]]) -> np.ndarray:
    """Map 2D float array to darker RGBA image using piecewise linear interpolation."""
    valid = np.isfinite(arr)
    span = vmax - vmin if vmax > vmin else 1.0
    norm = np.clip((arr - vmin) / span, 0.0, 1.0)

    h, w = arr.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    pcts = [p[0] for p in palette]
    r_vals = [p[1][0] for p in palette]
    g_vals = [p[1][1] for p in palette]
    b_vals = [p[1][2] for p in palette]

    norm_valid = norm[valid]
    r = np.interp(norm_valid, pcts, r_vals).astype(np.uint8)
    g = np.interp(norm_valid, pcts, g_vals).astype(np.uint8)
    b = np.interp(norm_valid, pcts, b_vals).astype(np.uint8)

    rgba[valid, 0] = r
    rgba[valid, 1] = g
    rgba[valid, 2] = b
    rgba[valid, 3] = 255  # Fully opaque, crisp color overlay

    return rgba


def build_darker_dsm(src: Path, kml: Path, out: Path) -> None:
    (out / "layers").mkdir(parents=True, exist_ok=True)
    (out / "grids").mkdir(parents=True, exist_ok=True)

    manifest_layers = []
    ref_bounds = None
    ref_shape = None

    for cfg in LAYERS_CONFIG:
        tif_path = src / f"{cfg['file']}.tif"
        if not tif_path.exists():
            print(f"  ! skipping {cfg['id']}: {tif_path} not found")
            continue

        arr, bounds = read_geotiff(tif_path)
        if ref_bounds is None:
            ref_bounds, ref_shape = bounds, arr.shape
        elif arr.shape != ref_shape or not np.allclose(bounds, ref_bounds, atol=1e-7):
            raise SystemExit(f"{tif_path.name} does not share the reference grid - resample first")

        valid = np.isfinite(arr)
        vals = arr[valid]
        raw_min, raw_max = float(vals.min()), float(vals.max())

        # Use tuned agricultural contrast limits if configured, else raw limits
        vmin = cfg.get("clip_pmin", raw_min)
        vmax = cfg.get("clip_pmax", raw_max)
        span = vmax - vmin if vmax > vmin else 1.0

        # ---- 1. Colorized darker PNG overlay ---------------------------------
        rgba = colorize_array(arr, vmin, vmax, cfg["palette"])
        Image.fromarray(rgba, "RGBA").save(out / "layers" / f"{cfg['id']}.png", optimize=True)

        # ---- 2. Quantised uint16 grid for live pixel probe & client stats ----
        step = (raw_max - raw_min) / MAX_U16 if (raw_max - raw_min) > 0 else 1.0
        q = np.full(arr.shape, NODATA_U16, dtype="<u2")
        q[valid] = np.round((arr[valid] - raw_min) / step).astype("<u2")
        (out / "grids" / f"{cfg['id']}.bin").write_bytes(q.tobytes())

        # ---- 3. Darker legend color stops ------------------------------------
        stops = []
        for pct_pos, (r, g, b) in cfg["palette"]:
            val = round(vmin + pct_pos * span, 3)
            stops.append({
                "pct": int(round(pct_pos * 100)),
                "color": f"rgb({r}, {g}, {b})",
                "value": val,
            })

        h, w = arr.shape
        manifest_layers.append({
            "id": cfg["id"],
            "key": cfg["file"],
            "name": cfg["name"],
            "marathiName": cfg["marathi"],
            "unit": cfg["unit"],
            "category": cfg["category"],
            "description": cfg["desc"],
            "cmap": "DarkerAgro",
            "min": round(vmin, 4),
            "max": round(vmax, 4),
            "mean": round(float(vals.mean()), 4),
            "std": round(float(vals.std()), 4),
            "validPixels": int(valid.sum()),
            "image": f"layers/{cfg['id']}.png",
            "grid": {
                "file": f"grids/{cfg['id']}.bin",
                "width": int(w),
                "height": int(h),
                "dtype": "uint16",
                "scale": step,
                "offset": raw_min,
                "nodata": NODATA_U16,
            },
            "legendStops": stops,
        })
        print(f"  [OK] {cfg['id']:<12} range=[{vmin:>7.3f} .. {vmax:<7.3f}] valid={int(valid.sum()):,}")

    if ref_bounds is None:
        raise SystemExit("No rasters found")

    shutil.copyfile(kml, out / "sample-gats.kml")

    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "crs": "EPSG:4326",
        "bounds": [round(v, 8) for v in ref_bounds],
        "size": [int(ref_shape[1]), int(ref_shape[0])],
        "sampleKml": {
            "file": "sample-gats.kml",
            "label": "Baramati pilot - sample Gat boundaries",
            "village": "Malegaon",
            "taluka": "Baramati",
            "district": "Pune",
            "state": "Maharashtra",
        },
        "layers": manifest_layers,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out / 'manifest.json'}")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", type=Path, default=root / "layers")
    ap.add_argument("--kml", type=Path, default=root / "layers" / "trial.kml")
    ap.add_argument("--out", type=Path, default=root / "frontend" / "public" / "data" / "dsm")
    a = ap.parse_args()
    build_darker_dsm(a.src, a.kml, a.out)
