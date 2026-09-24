"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/context/AuthContext";
import {
  geographyService,
  StateItem,
  DistrictItem,
  TalukaItem,
  VillageItem,
} from "@/services/geographyService";
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Sparkles,
  MapPin,
} from "lucide-react";

interface FarmerAccessFormProps {
  className?: string;
}

export const FarmerAccessForm: React.FC<FarmerAccessFormProps> = ({ className = "" }) => {
  const { t, language } = useI18n();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Geographic dropdown lists
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [talukas, setTalukas] = useState<TalukaItem[]>([]);
  const [villages, setVillages] = useState<VillageItem[]>([]);

  // Selected values
  const [selectedStateId, setSelectedStateId] = useState<number | "">("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "">("");
  const [selectedTalukaId, setSelectedTalukaId] = useState<number | "">("");
  const [selectedVillageId, setSelectedVillageId] = useState<number | "">("");
  const [gatNo, setGatNo] = useState<string>("");

  // Loading states
  const [loadingStates, setLoadingStates] = useState<boolean>(false);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingTalukas, setLoadingTalukas] = useState<boolean>(false);
  const [loadingVillages, setLoadingVillages] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Status & error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load States on mount
  useEffect(() => {
    let isMounted = true;
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const data = await geographyService.getStates();
        if (isMounted) {
          setStates(data);
          const mh = data.find((s) => s.name.toLowerCase() === "maharashtra");
          if (mh) {
            setSelectedStateId(mh.id);
          }
        }
      } catch (err) {
        if (isMounted) setErrorMessage(t("geo.errorLoadingStates"));
      } finally {
        if (isMounted) setLoadingStates(false);
      }
    };
    fetchStates();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Districts when State changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      return;
    }
    let isMounted = true;
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const data = await geographyService.getDistricts(Number(selectedStateId));
        if (isMounted) {
          setDistricts(data);
          const pune = data.find((d) => d.name.toLowerCase() === "pune");
          if (pune) {
            setSelectedDistrictId(pune.id);
          }
        }
      } catch (err) {
        if (isMounted) setErrorMessage(t("geo.errorLoadingDistricts"));
      } finally {
        if (isMounted) setLoadingDistricts(false);
      }
    };
    fetchDistricts();
    return () => {
      isMounted = false;
    };
  }, [selectedStateId]);

  // Fetch Talukas when District changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setTalukas([]);
      return;
    }
    let isMounted = true;
    const fetchTalukas = async () => {
      setLoadingTalukas(true);
      try {
        const data = await geographyService.getTalukas(Number(selectedDistrictId));
        if (isMounted) {
          setTalukas(data);
        }
      } catch (err) {
        if (isMounted) setErrorMessage(t("geo.errorLoadingTalukas"));
      } finally {
        if (isMounted) setLoadingTalukas(false);
      }
    };
    fetchTalukas();
    return () => {
      isMounted = false;
    };
  }, [selectedDistrictId]);

  // Fetch Villages when Taluka changes
  useEffect(() => {
    if (!selectedTalukaId) {
      setVillages([]);
      return;
    }
    let isMounted = true;
    const fetchVillages = async () => {
      setLoadingVillages(true);
      try {
        const data = await geographyService.getVillages(Number(selectedTalukaId));
        if (isMounted) {
          setVillages(data);
        }
      } catch (err) {
        if (isMounted) setErrorMessage(t("geo.errorLoadingVillages"));
      } finally {
        if (isMounted) setLoadingVillages(false);
      }
    };
    fetchVillages();
    return () => {
      isMounted = false;
    };
  }, [selectedTalukaId]);

  // 1. Cascading State Change
  const handleStateChange = (idStr: string) => {
    const id = idStr ? Number(idStr) : "";
    setSelectedStateId(id);
    setSelectedDistrictId("");
    setSelectedTalukaId("");
    setSelectedVillageId("");
    setGatNo("");
    setDistricts([]);
    setTalukas([]);
    setVillages([]);
    setErrorMessage(null);
  };

  // 2. Cascading District Change
  const handleDistrictChange = (idStr: string) => {
    const id = idStr ? Number(idStr) : "";
    setSelectedDistrictId(id);
    setSelectedTalukaId("");
    setSelectedVillageId("");
    setGatNo("");
    setTalukas([]);
    setVillages([]);
    setErrorMessage(null);
  };

  // 3. Cascading Taluka Change
  const handleTalukaChange = (idStr: string) => {
    const id = idStr ? Number(idStr) : "";
    setSelectedTalukaId(id);
    setSelectedVillageId("");
    setGatNo("");
    setVillages([]);
    setErrorMessage(null);
  };

  // 4. Village Change
  const handleVillageChange = (idStr: string) => {
    const id = idStr ? Number(idStr) : "";
    setSelectedVillageId(id);
    setGatNo("");
    setErrorMessage(null);
  };

  // Quick 1-click Demo Fill for evaluation
  const handleFillDemo = async () => {
    try {
      setErrorMessage(null);
      let mh = states.find((s) => s.name.toLowerCase() === "maharashtra");
      if (!mh) {
        const sList = await geographyService.getStates();
        setStates(sList);
        mh = sList.find((s) => s.name.toLowerCase() === "maharashtra");
      }
      const sId = mh ? mh.id : 1;
      setSelectedStateId(sId);

      const dList = await geographyService.getDistricts(sId);
      setDistricts(dList);
      const pune = dList.find((d) => d.name.toLowerCase() === "pune");
      const dId = pune ? pune.id : 1;
      setSelectedDistrictId(dId);

      const tList = await geographyService.getTalukas(dId);
      setTalukas(tList);
      const baramati = tList.find((t) => t.name.toLowerCase() === "baramati");
      if (baramati) {
        setSelectedTalukaId(baramati.id);
        const vList = await geographyService.getVillages(baramati.id);
        setVillages(vList);
        const malegaon = vList.find(
          (v) =>
            v.name.toLowerCase().includes("malegaon bk") ||
            v.name.toLowerCase().includes("malegaon")
        );
        if (malegaon) {
          setSelectedVillageId(malegaon.id);
          setGatNo("104");
          // Smooth 1-click demo access for Gat 104
          setSubmitting(true);
          await login({
            state_id: Number(sId),
            district_id: Number(dId),
            taluka_id: Number(baramati.id),
            village_id: Number(malegaon.id),
            gat_no: "104",
          });
          setSuccessMessage(t("auth.farmVerified") || "Farm verified successfully");
          setTimeout(() => {
            router.push("/dashboard");
          }, 250);
        }
      }
    } catch (e: any) {
      console.error("Demo fill error:", e);
      setSubmitting(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStateId) {
      setErrorMessage(t("geo.selectState"));
      return;
    }
    if (!selectedDistrictId) {
      setErrorMessage(t("geo.selectDistrict"));
      return;
    }
    if (!selectedTalukaId) {
      setErrorMessage(t("auth.missingTalukaError") || t("geo.pleaseSelectTaluka"));
      return;
    }
    if (!selectedVillageId) {
      setErrorMessage(t("auth.missingVillageError") || t("geo.pleaseSelectVillage"));
      return;
    }
    const cleanGat = gatNo.trim();
    if (!cleanGat) {
      setErrorMessage(t("geo.pleaseEnterGat"));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await login({
        state_id: Number(selectedStateId),
        district_id: Number(selectedDistrictId),
        taluka_id: Number(selectedTalukaId),
        village_id: Number(selectedVillageId),
        gat_no: cleanGat,
      });

      setSuccessMessage(t("auth.farmVerified") || "Farm verified successfully");

      setTimeout(() => {
        router.push("/dashboard");
      }, 350);
    } catch (err: any) {
      const serverStatus = err?.status || err?.response?.status;
      const serverDetail = err?.response?.data?.detail || err?.message;

      if (serverStatus === 404) {
        setErrorMessage(
          t("auth.invalidGatError") ||
            "We couldn't find this Gat / Survey Number in the selected village."
        );
      } else if (serverStatus === 400) {
        setErrorMessage(
          t("auth.hierarchyError") ||
            "Invalid geographic selection. Please check the administrative hierarchy."
        );
      } else if (serverStatus === 422) {
        setErrorMessage(t("geo.pleaseEnterGat") || "Please enter a valid Gat Number.");
      } else {
        setErrorMessage(
          serverDetail ||
            t("auth.serverProblemError") ||
            "Something went wrong while finding your field. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`w-full max-w-[640px] mx-auto bg-white rounded-2xl border border-surface-border p-6 sm:p-8 md:p-10 shadow-card space-y-7 ${className}`}
    >
      {/* Card Header: Find Your Field */}
      <div className="text-center space-y-1.5 border-b border-surface-border pb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-text-main tracking-tight">
          {t("auth.findYourField") || "Find Your Field"}
        </h2>
        <p className="text-xs sm:text-sm text-text-muted">
          {t("auth.accessSubtitle") ||
            "Select your location and enter your Gat Number to view your farm details."}
        </p>
      </div>

      {/* Form with Steps 1 & 2 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: SELECT YOUR LOCATION */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-soil-primary bg-soil-primaryLight px-2 py-0.5 rounded">
              Step 1
            </span>
            <h3 className="text-xs font-bold tracking-wider text-text-main uppercase">
              {t("auth.selectYourLocation") || "SELECT YOUR LOCATION"}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. State Selector */}
            <div className="space-y-1.5">
              <label htmlFor="access-state" className="block text-xs font-semibold text-text-main">
                {t("geo.state")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="access-state"
                  value={selectedStateId}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={loadingStates}
                  className="w-full appearance-none rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-medium text-text-main focus:border-soil-primary focus:ring-2 focus:ring-soil-primary/20 transition-all cursor-pointer disabled:bg-surface-muted disabled:text-text-light"
                >
                  <option value="">
                    {loadingStates ? t("geo.loadingDistricts") : t("geo.selectState")}
                  </option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {language === "mr" && s.name === "Maharashtra" ? "महाराष्ट्र" : s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-text-light pointer-events-none" />
              </div>
            </div>

            {/* 2. District Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="access-district"
                className="block text-xs font-semibold text-text-main"
              >
                {t("geo.district")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="access-district"
                  value={selectedDistrictId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!selectedStateId || loadingDistricts}
                  className="w-full appearance-none rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-medium text-text-main focus:border-soil-primary focus:ring-2 focus:ring-soil-primary/20 transition-all cursor-pointer disabled:bg-surface-muted disabled:text-text-light"
                >
                  <option value="">
                    {loadingDistricts ? t("geo.loadingDistricts") : t("geo.selectDistrict")}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {language === "mr" && d.name === "Pune" ? "पुणे" : d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-text-light pointer-events-none" />
              </div>
            </div>

            {/* 3. Taluka Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="access-taluka"
                className="block text-xs font-semibold text-text-main"
              >
                {t("geo.taluka")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="access-taluka"
                  value={selectedTalukaId}
                  onChange={(e) => handleTalukaChange(e.target.value)}
                  disabled={!selectedDistrictId || loadingTalukas}
                  className="w-full appearance-none rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-medium text-text-main focus:border-soil-primary focus:ring-2 focus:ring-soil-primary/20 transition-all cursor-pointer disabled:bg-surface-muted disabled:text-text-light"
                >
                  <option value="">
                    {loadingTalukas ? t("geo.loadingTalukas") : t("geo.selectTaluka")}
                  </option>
                  {talukas.map((tk) => (
                    <option key={tk.id} value={tk.id}>
                      {tk.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-text-light pointer-events-none" />
              </div>
            </div>

            {/* 4. Village Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="access-village"
                className="block text-xs font-semibold text-text-main"
              >
                {t("geo.village")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="access-village"
                  value={selectedVillageId}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  disabled={!selectedTalukaId || loadingVillages || villages.length === 0}
                  className="w-full appearance-none rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-medium text-text-main focus:border-soil-primary focus:ring-2 focus:ring-soil-primary/20 transition-all cursor-pointer disabled:bg-surface-muted disabled:text-text-light"
                >
                  <option value="">
                    {loadingVillages
                      ? t("geo.loadingVillages")
                      : !selectedTalukaId
                      ? t("geo.selectVillage")
                      : villages.length === 0
                      ? t("geo.noVillagesFound")
                      : t("geo.selectVillage")}
                  </option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-text-light pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: ENTER YOUR GAT / SURVEY NUMBER */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-soil-primary bg-soil-primaryLight px-2 py-0.5 rounded">
              Step 2
            </span>
            <label
              htmlFor="access-gat"
              className="text-xs font-bold tracking-wider text-text-main uppercase"
            >
              {t("auth.enterGatOrSurvey") || "ENTER YOUR GAT / SURVEY NUMBER"}{" "}
              <span className="text-red-500">*</span>
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-light">
              <Search className="w-5 h-5 text-soil-primary/80" />
            </div>
            <input
              id="access-gat"
              type="text"
              value={gatNo}
              onChange={(e) => {
                setGatNo(e.target.value);
                setErrorMessage(null);
              }}
              disabled={!selectedVillageId}
              placeholder={t("auth.enterGatPlaceholder") || "e.g. 104"}
              className="w-full rounded-xl border border-surface-border bg-white pl-11 pr-4 py-3 sm:py-3.5 text-base font-semibold text-text-main placeholder-text-light/70 focus:border-soil-primary focus:ring-2 focus:ring-soil-primary/20 transition-all disabled:bg-surface-muted disabled:text-text-light shadow-xs"
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-text-muted">
            {t("auth.noAccountNeeded") ||
              "No password or OTP required. Simply select your location and Gat number."}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2.5 text-xs text-soil-primary font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-soil-primary shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!selectedVillageId || !gatNo.trim() || submitting}
            className="w-full py-3.5 sm:py-4 px-6 rounded-xl bg-soil-primary text-white text-base font-bold hover:bg-soil-primaryHover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t("auth.checkingYourField") || "Finding your field..."}</span>
              </>
            ) : (
              <>
                <span>{t("auth.viewMyField") || "View My Field →"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Demo helper quick pill */}
      <div className="pt-3 border-t border-surface-border text-center">
        <button
          id="quick-demo-btn"
          type="button"
          onClick={handleFillDemo}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-soil-cream text-soil-primary hover:bg-soil-beige/80 transition-colors text-xs font-semibold border border-soil-secondary/40 shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-soil-secondary" />
          <span>Quick Demo: Baramati → Malegaon Bk → Gat 104</span>
        </button>
      </div>
    </div>
  );
};
