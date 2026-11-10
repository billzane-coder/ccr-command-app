"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Compass,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Activity,
  Sparkles,
  Edit3,
  Bookmark,
  Check,
  X,
  Wind,
  TrendingUp,
  Settings,
  Package,
  Eye,
  RotateCcw,
} from "lucide-react";
import {
  GasMix,
  depthFtToBar,
  evaluateDiluentAtDepth,
  runDecoSimulation,
} from "../lib/decoEngine";

interface PlannerEngineSettings {
  lastStopDepthFt: 10 | 15 | 20;
  descentRateFtMin: number;
  ascentRateFtMin: number;
  ocProblemTimeMin: number;
  o2Narcotic: boolean;
  targetEndFt: number;
}

interface ExtendedGasMix extends GasMix {
  maxPo2Limit: number;
  ccrSwitchDepthFt: number;
  roleTag?: string;
}

interface FavoritePlan {
  id: string;
  name: string;
  bottomDepthFt: number;
  bottomTimeMin: number;
  setpoint: number;
  autoMatchDiluent?: boolean;
  useDecoSpBoost: boolean;
  decoSetpoint: number;
  decoSpSwitchDepthFt: number;
  gfLow: number;
  gfHigh: number;
  dilO2: number;
  dilHe: number;
  workingSac: number;
  decoSac: number;
  includeReserve: boolean;
  settings: PlannerEngineSettings;
  gases: ExtendedGasMix[];
}

interface TelemetrySample {
  timeMin: number;
  depthFt: number;
  cell1: number;
  cell2: number;
  cell3: number;
  setpoint: number;
}

/**
 * Controlled decimal/integer input that allows clearing the box completely empty
 * without snapping back to a leading "0" while typing.
 */
function NumericInput({
  value,
  onChange,
  min,
  max,
  className,
  placeholder,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState<string>(String(value));
  const [focused, setFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!focused) {
      setRaw(String(value));
    }
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={focused ? raw : String(value)}
      onFocus={(e) => {
        setFocused(true);
        setRaw(String(value));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const next = e.target.value.trim();
        if (!/^\d*\.?\d*$/.test(next)) return;
        setRaw(next);
        if (next !== "" && next !== ".") {
          const parsed = parseFloat(next);
          if (!Number.isNaN(parsed)) {
            onChange(parsed);
          }
        }
      }}
      onBlur={() => {
        setFocused(false);
        if (raw === "" || raw === ".") {
          const fallback = min !== undefined ? min : 0;
          onChange(fallback);
          setRaw(String(fallback));
        } else {
          let parsed = parseFloat(raw);
          if (Number.isNaN(parsed)) parsed = min !== undefined ? min : 0;
          if (min !== undefined && parsed < min) parsed = min;
          if (max !== undefined && parsed > max) parsed = max;
          onChange(parsed);
          setRaw(String(parsed));
        }
      }}
      className={className}
    />
  );
}

const DEFAULT_LOCKER_TANKS: ExtendedGasMix[] = [
  {
    id: "lck_1",
    name: "TMx 18/45 (AL80)",
    o2: 18,
    he: 45,
    n2: 37,
    maxPo2Limit: 1.4,
    switchDepthFt: 220,
    ccrSwitchDepthFt: 100,
    tankSizeCuFt: 80,
    workingPsi: 3000,
    isUsedAsDiluentOnAscent: true,
  },
  {
    id: "lck_2",
    name: "EAN32 (AL80)",
    o2: 32,
    he: 0,
    n2: 68,
    maxPo2Limit: 1.4,
    switchDepthFt: 100,
    ccrSwitchDepthFt: 90,
    tankSizeCuFt: 80,
    workingPsi: 3000,
    isUsedAsDiluentOnAscent: false,
  },
  {
    id: "lck_3",
    name: "EAN50 (AL80)",
    o2: 50,
    he: 0,
    n2: 50,
    maxPo2Limit: 1.6,
    switchDepthFt: 70,
    ccrSwitchDepthFt: 40,
    tankSizeCuFt: 80,
    workingPsi: 3000,
    isUsedAsDiluentOnAscent: false,
  },
  {
    id: "lck_4",
    name: "O2 100% (AL40)",
    o2: 100,
    he: 0,
    n2: 0,
    maxPo2Limit: 1.6,
    switchDepthFt: 20,
    ccrSwitchDepthFt: 20,
    tankSizeCuFt: 40,
    workingPsi: 3000,
    isUsedAsDiluentOnAscent: false,
  },
];

function calcModFt(o2Pct: number, maxPo2: number): number {
  const fo2 = Math.max(0.05, o2Pct / 100);
  const rawFt = (maxPo2 / fo2 - 1) * 33;
  return Math.max(10, Math.floor(rawFt / 10) * 10);
}

/**
 * Calculates optimal CCR onboard diluent (O2% & He%) for a given depth & bottom setpoint:
 * - Keeps Diluent Flush PO2 <= min(1.10, Setpoint - 0.15) (capped at 21% O2 for standard air range)
 * - Sizes Helium in 5% steps to hold CCR Loop END <= targetEndFt AND Loop Gas Density <= 5.2 g/L
 */
function calculateOptimalDiluent(
  depthFt: number,
  bottomSp: number,
  targetEndFt: number,
  o2Narcotic: boolean
): { o2: number; he: number } {
  const safeDepth = Math.max(10, depthFt);
  const ambBar = depthFtToBar(safeDepth);
  const maxFlushPo2 = Math.min(1.1, Math.max(0.65, bottomSp - 0.15));

  let o2 = 21;
  if (0.21 * ambBar > maxFlushPo2) {
    o2 = Math.max(8, Math.min(21, Math.floor((maxFlushPo2 / ambBar) * 100)));
  }

  const actualLoopPo2 = Math.min(ambBar, bottomSp);
  const loopFO2 = actualLoopPo2 / ambBar;
  const fO2 = o2 / 100;

  let he = 0;
  if (safeDepth > targetEndFt) {
    let reqLoopFHe = 0;
    if (o2Narcotic) {
      reqLoopFHe = Math.max(0, 1 - (targetEndFt + 33) / (safeDepth + 33));
    } else {
      const maxLoopFN2 = 0.79 * ((targetEndFt + 33) / (safeDepth + 33));
      reqLoopFHe = Math.max(0, 1 - loopFO2 - maxLoopFN2);
    }
    const rawDilFHe =
      1 - loopFO2 > 0.01 ? (reqLoopFHe / (1 - loopFO2)) * (1 - fO2) : 0;
    he = Math.ceil((rawDilFHe * 100) / 5) * 5;
  }

  // Step Helium up in 5% increments if loop gas density exceeds 5.2 g/L
  while (he < 100 - o2) {
    const fHe = he / 100;
    const fN2 = Math.max(0, 1 - fO2 - fHe);
    const heRatio = fHe + fN2 > 0 ? fHe / (fHe + fN2) : 0;
    const loopFHe = (1 - loopFO2) * heRatio;
    const loopFN2 = Math.max(0, 1 - loopFO2 - loopFHe);
    const density =
      (loopFHe * 0.18 + loopFN2 * 1.25 + loopFO2 * 1.43) * ambBar;
    if (density <= 5.2) break;
    he += 5;
  }

  he = Math.min(100 - o2, Math.max(0, he));
  return { o2, he };
}

function pickSmartCylinderSpec(requiredCuFt: number): {
  tankSizeCuFt: number;
  workingPsi: number;
  cylLabel: string;
} {
  if (requiredCuFt <= 36) {
    return { tankSizeCuFt: 40, workingPsi: 3000, cylLabel: "AL40" };
  }
  if (requiredCuFt <= 78) {
    return { tankSizeCuFt: 80, workingPsi: 3000, cylLabel: "AL80" };
  }
  if (requiredCuFt <= 105) {
    return { tankSizeCuFt: 108, workingPsi: 3000, cylLabel: "LP108" };
  }
  return { tankSizeCuFt: 160, workingPsi: 3000, cylLabel: "2× AL80" };
}

export default function DecoPlanner() {
  const [subTab, setSubTab] = useState<"planner" | "compare">("planner");
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showTankLocker, setShowTankLocker] = useState<boolean>(false);
  const [recMixStyle, setRecMixStyle] = useState<"matched" | "shop">("matched");

  // Toast / Status Feedback Banner
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3200);
  };

  // Planner Engine Settings State
  const [settings, setSettings] = useState<PlannerEngineSettings>({
    lastStopDepthFt: 10,
    descentRateFtMin: 60,
    ascentRateFtMin: 30,
    ocProblemTimeMin: 3,
    o2Narcotic: true,
    targetEndFt: 100,
  });

  // Dive Profile Inputs
  const [bottomDepthFt, setBottomDepthFt] = useState<number>(150);
  const [bottomTimeMin, setBottomTimeMin] = useState<number>(25);
  const [setpoint, setSetpoint] = useState<number>(1.2);

  // Auto-Match Onboard Diluent to Depth & Bottom PO2
  const [autoMatchDiluent, setAutoMatchDiluent] = useState<boolean>(true);
  const [dilO2, setDilO2] = useState<number>(18);
  const [dilHe, setDilHe] = useState<number>(30);

  const [gfLow, setGfLow] = useState<number>(30);
  const [gfHigh, setGfHigh] = useState<number>(85);

  // Stepped Ascent / Deco Setpoint Boost State
  const [useDecoSpBoost, setUseDecoSpBoost] = useState<boolean>(true);
  const [decoSetpoint, setDecoSetpoint] = useState<number>(1.4);
  const [decoSpSwitchDepthFt, setDecoSpSwitchDepthFt] = useState<number>(80);

  // SAC / RMV & Reserve Settings
  const [workingSac, setWorkingSac] = useState<number>(0.65);
  const [decoSac, setDecoSac] = useState<number>(0.5);
  const [includeThirdsReserve, setIncludeThirdsReserve] = useState<boolean>(true);

  // Section 3 Table View Mode ("BOTH" | "CCR" | "OC")
  const [tableViewMode, setTableViewMode] = useState<"BOTH" | "CCR" | "OC">("BOTH");

  // Active Dive Cylinders
  const [gases, setGases] = useState<ExtendedGasMix[]>([
    {
      id: "g1",
      name: "TMx 18/30",
      o2: 18,
      he: 30,
      n2: 52,
      maxPo2Limit: 1.4,
      switchDepthFt: 220,
      ccrSwitchDepthFt: 90,
      tankSizeCuFt: 80,
      workingPsi: 3000,
      isUsedAsDiluentOnAscent: true,
    },
    {
      id: "g2",
      name: "EAN50",
      o2: 50,
      he: 0,
      n2: 50,
      maxPo2Limit: 1.6,
      switchDepthFt: 70,
      ccrSwitchDepthFt: 40,
      tankSizeCuFt: 80,
      workingPsi: 3000,
      isUsedAsDiluentOnAscent: false,
    },
    {
      id: "g3",
      name: "O2 100%",
      o2: 100,
      he: 0,
      n2: 0,
      maxPo2Limit: 1.6,
      switchDepthFt: 20,
      ccrSwitchDepthFt: 20,
      tankSizeCuFt: 40,
      workingPsi: 3000,
      isUsedAsDiluentOnAscent: false,
    },
  ]);

  // Tank Locker State (Favorite Tanks)
  const [tankLocker, setTankLocker] = useState<ExtendedGasMix[]>(DEFAULT_LOCKER_TANKS);

  // Tank Builder / Editor State
  const [editingGasId, setEditingGasId] = useState<string | null>(null);
  const [formO2, setFormO2] = useState<number>(32);
  const [formHe, setFormHe] = useState<number>(0);
  const [formMaxPo2, setFormMaxPo2] = useState<number>(1.4);
  const [formSwitchFt, setFormSwitchFt] = useState<number>(100);
  const [formCcrSwitchFt, setFormCcrSwitchFt] = useState<number>(70);
  const [formTankCuFt, setFormTankCuFt] = useState<number>(80);
  const [formWorkingPsi, setFormWorkingPsi] = useState<number>(3000);
  const [formPlumbIn, setFormPlumbIn] = useState<boolean>(false);

  // Favorites State (Saved Dive Plans)
  const [favorites, setFavorites] = useState<FavoritePlan[]>([]);
  const [selectedFavId, setSelectedFavId] = useState<string>("");
  const [favName, setFavName] = useState<string>("");

  // Subsurface Plan vs. Actual Telemetry State
  const [actualSamples, setActualSamples] = useState<TelemetrySample[]>([]);
  const [logName, setLogName] = useState<string>("");

  // Load saved Favorites, Tank Locker, and Planner Defaults from localStorage
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem("p2_deco_favorites_v3");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedLocker = localStorage.getItem("p2_tank_locker_v1");
      if (savedLocker) setTankLocker(JSON.parse(savedLocker));

      const savedDefaults = localStorage.getItem("p2_planner_defaults_v2");
      if (savedDefaults) {
        const d = JSON.parse(savedDefaults);
        if (d.settings) setSettings((prev) => ({ ...prev, ...d.settings }));
        if (d.gfLow !== undefined) setGfLow(d.gfLow);
        if (d.gfHigh !== undefined) setGfHigh(d.gfHigh);
        if (d.workingSac !== undefined) setWorkingSac(d.workingSac);
        if (d.decoSac !== undefined) setDecoSac(d.decoSac);
        if (d.setpoint !== undefined) setSetpoint(d.setpoint);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Auto-populate Diluent O2% and He% whenever Depth, Bottom SP, or Target END changes
  useEffect(() => {
    if (!autoMatchDiluent) return;
    const optimal = calculateOptimalDiluent(
      bottomDepthFt,
      setpoint,
      settings.targetEndFt,
      settings.o2Narcotic
    );
    setDilO2(optimal.o2);
    setDilHe(optimal.he);
  }, [
    autoMatchDiluent,
    bottomDepthFt,
    setpoint,
    settings.targetEndFt,
    settings.o2Narcotic,
  ]);

  const saveDefaultsToStorage = () => {
    localStorage.setItem(
      "p2_planner_defaults_v2",
      JSON.stringify({
        settings,
        gfLow,
        gfHigh,
        workingSac,
        decoSac,
        setpoint,
      })
    );
    triggerToast("Saved Planner Settings, GFs & SAC as App Defaults ✓");
    setShowSettingsModal(false);
  };

  const saveFavoritesToStorage = (updated: FavoritePlan[]) => {
    setFavorites(updated);
    localStorage.setItem("p2_deco_favorites_v3", JSON.stringify(updated));
  };

  const saveLockerToStorage = (updated: ExtendedGasMix[]) => {
    setTankLocker(updated);
    localStorage.setItem("p2_tank_locker_v1", JSON.stringify(updated));
  };

  const handleFormO2orPo2Change = (newO2: number, newMaxPo2: number) => {
    setFormO2(newO2);
    setFormMaxPo2(newMaxPo2);
    setFormSwitchFt(calcModFt(newO2, newMaxPo2));
    setFormCcrSwitchFt(calcModFt(newO2, 1.2));
  };

  const startEditingGas = (g: ExtendedGasMix) => {
    setEditingGasId(g.id);
    setFormO2(g.o2);
    setFormHe(g.he);
    setFormMaxPo2(g.maxPo2Limit || 1.4);
    setFormSwitchFt(g.switchDepthFt);
    setFormCcrSwitchFt(g.ccrSwitchDepthFt || calcModFt(g.o2, 1.2));
    setFormTankCuFt(g.tankSizeCuFt);
    setFormWorkingPsi(g.workingPsi || 3000);
    setFormPlumbIn(g.isUsedAsDiluentOnAscent);
  };

  const cancelEditingGas = () => {
    setEditingGasId(null);
    handleFormO2orPo2Change(32, 1.4);
    setFormHe(0);
    setFormTankCuFt(80);
    setFormWorkingPsi(3000);
    setFormPlumbIn(false);
  };

  const buildGasFromForm = (): ExtendedGasMix => {
    const cleanO2 = Math.min(100, Math.max(5, formO2));
    const cleanHe = Math.min(100 - cleanO2, Math.max(0, formHe));
    const n2 = Math.max(0, 100 - cleanO2 - cleanHe);
    const label =
      cleanHe > 0
        ? `TMx ${cleanO2}/${cleanHe}`
        : cleanO2 === 100
        ? "O2 100%"
        : `EAN${cleanO2}`;

    return {
      id: editingGasId || "gas_" + Date.now(),
      name: label,
      o2: cleanO2,
      he: cleanHe,
      n2,
      maxPo2Limit: formMaxPo2,
      switchDepthFt: formSwitchFt,
      ccrSwitchDepthFt: formCcrSwitchFt,
      tankSizeCuFt: formTankCuFt,
      workingPsi: formWorkingPsi,
      isUsedAsDiluentOnAscent: formPlumbIn,
    };
  };

  const saveOrAddGas = () => {
    const newEntry = buildGasFromForm();
    if (editingGasId) {
      setGases(gases.map((g) => (g.id === editingGasId ? newEntry : g)));
      setEditingGasId(null);
      triggerToast(`Updated ${newEntry.name} in Dive Plan ✓`);
    } else {
      setGases([...gases, newEntry]);
      triggerToast(`Added ${newEntry.name} to Dive Plan ✓`);
    }
  };

  const saveFormGasToLocker = () => {
    const entry = buildGasFromForm();
    const lockerItem: ExtendedGasMix = {
      ...entry,
      id: "lck_" + Date.now(),
      name: `${entry.name} (${entry.tankSizeCuFt}cf)`,
    };
    saveLockerToStorage([lockerItem, ...tankLocker]);
    triggerToast(`Saved ${lockerItem.name} to Tank Locker ✓`);
  };

  const addTankFromLocker = (lck: ExtendedGasMix) => {
    const clone: ExtendedGasMix = {
      ...lck,
      id: "gas_" + Date.now() + Math.random().toString(36).slice(2, 5),
      name: lck.name.replace(/\s*\([^)]+\)/g, "").trim(),
    };
    setGases([...gases, clone]);
    triggerToast(`Deployed ${clone.name} from Tank Locker ✓`);
  };

  const removeTankFromLocker = (id: string) => {
    saveLockerToStorage(tankLocker.filter((t) => t.id !== id));
  };

  const toggleGasDiluentAscent = (id: string) => {
    setGases(
      gases.map((g) =>
        g.id === id
          ? { ...g, isUsedAsDiluentOnAscent: !g.isUsedAsDiluentOnAscent }
          : g
      )
    );
  };

  const updateCcrSwitchDepth = (id: string, depth: number) => {
    setGases(
      gases.map((g) => (g.id === id ? { ...g, ccrSwitchDepthFt: depth } : g))
    );
  };

  const removeGas = (id: string) => {
    if (editingGasId === id) setEditingGasId(null);
    setGases(gases.filter((g) => g.id !== id));
  };

  // Save & Load Favorite Plans
  const saveCurrentAsFavorite = () => {
    const title =
      favName.trim() ||
      `${bottomDepthFt}ft / ${bottomTimeMin}m (Dil ${dilO2}/${dilHe})`;
    const fav: FavoritePlan = {
      id: "fav_" + Date.now(),
      name: title,
      bottomDepthFt,
      bottomTimeMin,
      setpoint,
      autoMatchDiluent,
      useDecoSpBoost,
      decoSetpoint,
      decoSpSwitchDepthFt,
      gfLow,
      gfHigh,
      dilO2,
      dilHe,
      workingSac,
      decoSac,
      includeReserve: includeThirdsReserve,
      settings,
      gases,
    };
    const updated = [fav, ...favorites];
    saveFavoritesToStorage(updated);
    setSelectedFavId(fav.id);
    setFavName("");
    triggerToast(`Saved Dive Plan: "${title}" ✓`);
  };

  const handleSelectFavoriteDropdown = (id: string) => {
    setSelectedFavId(id);
    const fav = favorites.find((f) => f.id === id);
    if (!fav) return;
    setAutoMatchDiluent(fav.autoMatchDiluent ?? false);
    setBottomDepthFt(fav.bottomDepthFt);
    setBottomTimeMin(fav.bottomTimeMin);
    setSetpoint(fav.setpoint);
    setUseDecoSpBoost(fav.useDecoSpBoost ?? true);
    setDecoSetpoint(fav.decoSetpoint ?? 1.4);
    setDecoSpSwitchDepthFt(fav.decoSpSwitchDepthFt ?? 80);
    setGfLow(fav.gfLow);
    setGfHigh(fav.gfHigh);
    setDilO2(fav.dilO2);
    setDilHe(fav.dilHe);
    setWorkingSac(fav.workingSac);
    setDecoSac(fav.decoSac);
    setIncludeThirdsReserve(fav.includeReserve);
    if (fav.settings) setSettings((prev) => ({ ...prev, ...fav.settings }));
    setGases(fav.gases);
    setEditingGasId(null);
    triggerToast(`Loaded Saved Plan: "${fav.name}" ✓`);
  };

  const deleteSelectedFavorite = () => {
    if (!selectedFavId) return;
    const target = favorites.find((f) => f.id === selectedFavId);
    saveFavoritesToStorage(favorites.filter((f) => f.id !== selectedFavId));
    setSelectedFavId("");
    if (target) triggerToast(`Removed Plan: "${target.name}"`);
  };

  const safeDepthFt = Math.max(10, bottomDepthFt);
  const safeBottomMin = Math.max(1, bottomTimeMin);

  // 1. Evaluate Diluent Physics at Bottom Depth
  const dilEval = useMemo(
    () =>
      evaluateDiluentAtDepth(
        safeDepthFt,
        dilO2,
        dilHe,
        setpoint,
        settings.o2Narcotic
      ),
    [safeDepthFt, dilO2, dilHe, setpoint, settings.o2Narcotic]
  );

  // Map gases so CCR simulation uses ccrSwitchDepthFt when plumbed in, and OC uses switchDepthFt
  const ccrMappedGases: GasMix[] = useMemo(
    () =>
      gases.map((g) => ({
        ...g,
        switchDepthFt: g.ccrSwitchDepthFt || g.switchDepthFt,
      })),
    [gases]
  );

  // 2. Run Closed-Circuit (CCR) Deco Simulation
  const ccrPlan = useMemo(
    () =>
      runDecoSimulation({
        bottomDepthFt: safeDepthFt,
        bottomTimeMin: safeBottomMin,
        setpoint,
        decoSetpoint: useDecoSpBoost ? decoSetpoint : setpoint,
        decoSpSwitchDepthFt: useDecoSpBoost ? decoSpSwitchDepthFt : 0,
        gfLowPct: gfLow,
        gfHighPct: gfHigh,
        bottomDil: { o2: dilO2, he: dilHe },
        ascentGases: ccrMappedGases,
        mode: "CCR",
        workingSacCuFtMin: workingSac,
        decoSacCuFtMin: decoSac,
        settings,
      }),
    [
      safeDepthFt,
      safeBottomMin,
      setpoint,
      useDecoSpBoost,
      decoSetpoint,
      decoSpSwitchDepthFt,
      gfLow,
      gfHigh,
      dilO2,
      dilHe,
      ccrMappedGases,
      workingSac,
      decoSac,
      settings,
    ]
  );

  // 3. Run Open-Circuit Bailout (OC) Deco Simulation
  const ocBailoutPlan = useMemo(
    () =>
      runDecoSimulation({
        bottomDepthFt: safeDepthFt,
        bottomTimeMin: safeBottomMin,
        setpoint,
        gfLowPct: gfLow,
        gfHighPct: gfHigh,
        bottomDil: { o2: dilO2, he: dilHe },
        ascentGases: gases,
        mode: "OC",
        workingSacCuFtMin: workingSac,
        decoSacCuFtMin: decoSac,
        settings,
      }),
    [
      safeDepthFt,
      safeBottomMin,
      setpoint,
      gfLow,
      gfHigh,
      dilO2,
      dilHe,
      gases,
      workingSac,
      decoSac,
      settings,
    ]
  );

  // 4. SMART MULTI-TIER BAILOUT & PLUMB-IN RECOMMENDATION ENGINE
  const smartRecommendations = useMemo(() => {
    const ambBar = depthFtToBar(safeDepthFt);
    const dilInertSum = Math.max(1, 100 - dilO2);
    const heRatio = dilHe / dilInertSum;
    const candidates: ExtendedGasMix[] = [];

    // Tier A: Shallow / Recreational-Tech Range (<= 110 ft & Zero He)
    if (safeDepthFt <= 110 && dilHe === 0) {
      const botO2 =
        recMixStyle === "shop"
          ? safeDepthFt <= 100
            ? 32
            : 21
          : Math.min(36, Math.floor((1.4 / ambBar) * 100));
      const botMod = calcModFt(botO2, 1.4);
      candidates.push({
        id: "rec_bot",
        name: botO2 === 21 ? "EAN21" : `EAN${botO2}`,
        o2: botO2,
        he: 0,
        n2: 100 - botO2,
        maxPo2Limit: 1.4,
        switchDepthFt: Math.max(safeDepthFt, botMod),
        ccrSwitchDepthFt: Math.min(safeDepthFt, calcModFt(botO2, 1.2)),
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: false,
        roleTag: "Bottom / Ascent Bailout",
      });

      if (safeDepthFt >= 70 || safeBottomMin >= 30) {
        candidates.push({
          id: "rec_deco50",
          name: "EAN50",
          o2: 50,
          he: 0,
          n2: 50,
          maxPo2Limit: 1.6,
          switchDepthFt: 70,
          ccrSwitchDepthFt: 40,
          tankSizeCuFt: 40,
          workingPsi: 3000,
          isUsedAsDiluentOnAscent: false,
          roleTag: "Accelerated Deco (70ft)",
        });
      }
    }
    // Tier B: Normoxic Technical / Mid-Trimix Range (111 ft – 195 ft)
    else if (safeDepthFt <= 195) {
      let botO2 =
        recMixStyle === "shop"
          ? safeDepthFt <= 130
            ? 21
            : 18
          : Math.min(26, Math.max(16, Math.floor((1.4 / ambBar) * 100)));
      let botHe =
        recMixStyle === "shop" && dilHe > 0
          ? dilHe >= 40
            ? 45
            : 35
          : Math.round(((100 - botO2) * heRatio) / 5) * 5;
      botHe = Math.min(100 - botO2, Math.max(0, botHe));

      const botName =
        botHe > 0 ? `TMx ${botO2}/${botHe}` : `EAN${botO2}`;
      const botMod = calcModFt(botO2, 1.4);
      const botCcrFlush = Math.min(
        safeDepthFt,
        Math.max(60, calcModFt(botO2, 1.2))
      );

      candidates.push({
        id: "rec_deep",
        name: botName,
        o2: botO2,
        he: botHe,
        n2: 100 - botO2 - botHe,
        maxPo2Limit: 1.4,
        switchDepthFt: Math.max(safeDepthFt, botMod),
        ccrSwitchDepthFt: botCcrFlush,
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: true,
        roleTag: "Bottom Bailout + CCR Flush",
      });

      // ICD-safe 50% O2 mix if Helium >= 35% in Matched mode, else standard EAN50
      const decoHe =
        recMixStyle === "matched" && botHe >= 35
          ? Math.round((50 * heRatio) / 5) * 5
          : 0;
      const decoName = decoHe > 0 ? `TMx 50/${decoHe}` : "EAN50";
      candidates.push({
        id: "rec_deco50",
        name: decoName,
        o2: 50,
        he: decoHe,
        n2: 50 - decoHe,
        maxPo2Limit: 1.6,
        switchDepthFt: 70,
        ccrSwitchDepthFt: 40,
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: false,
        roleTag: decoHe > 0 ? "ICD-Buffered Deco (70ft)" : "Primary Deco (70ft)",
      });

      candidates.push({
        id: "rec_o2",
        name: "O2 100%",
        o2: 100,
        he: 0,
        n2: 0,
        maxPo2Limit: 1.6,
        switchDepthFt: 20,
        ccrSwitchDepthFt: 20,
        tankSizeCuFt: 40,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: false,
        roleTag: "Shallow Deco (20ft)",
      });
    }
    // Tier C: Deep / Hypoxic Trimix Range (> 195 ft) — Full 4-Gas ICD-Safe Bridge
    else {
      const deepO2 =
        recMixStyle === "shop"
          ? safeDepthFt <= 240
            ? 15
            : 12
          : Math.min(18, Math.max(10, Math.floor((1.35 / ambBar) * 100)));
      const deepHe = Math.min(
        100 - deepO2,
        Math.max(45, Math.round(((100 - deepO2) * heRatio) / 5) * 5)
      );
      candidates.push({
        id: "rec_deep",
        name: `TMx ${deepO2}/${deepHe}`,
        o2: deepO2,
        he: deepHe,
        n2: 100 - deepO2 - deepHe,
        maxPo2Limit: 1.4,
        switchDepthFt: Math.max(safeDepthFt, calcModFt(deepO2, 1.4)),
        ccrSwitchDepthFt: Math.min(safeDepthFt, calcModFt(deepO2, 1.2)),
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: false,
        roleTag: "Deep Bottom Bailout",
      });

      // Travel / Mid-Switch Bridge (prevents ICD jumping from high-He to Nitrox)
      candidates.push({
        id: "rec_travel",
        name: "TMx 35/25",
        o2: 35,
        he: 25,
        n2: 40,
        maxPo2Limit: 1.5,
        switchDepthFt: 110,
        ccrSwitchDepthFt: 80,
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: true,
        roleTag: "ICD Bridge (110ft) + Loop Flush",
      });

      candidates.push({
        id: "rec_deco50",
        name: recMixStyle === "matched" ? "TMx 50/15" : "EAN50",
        o2: 50,
        he: recMixStyle === "matched" ? 15 : 0,
        n2: recMixStyle === "matched" ? 35 : 50,
        maxPo2Limit: 1.6,
        switchDepthFt: 70,
        ccrSwitchDepthFt: 40,
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: false,
        roleTag: "Intermediate Deco (70ft)",
      });

      candidates.push({
        id: "rec_o2",
        name: "O2 100%",
        o2: 100,
        he: 0,
        n2: 0,
        maxPo2Limit: 1.6,
        switchDepthFt: 20,
        ccrSwitchDepthFt: 20,
        tankSizeCuFt: 80,
        workingPsi: 3000,
        isUsedAsDiluentOnAscent: false,
        roleTag: "Shallow O2 Deco (20ft)",
      });
    }

    // Simulate OC Bailout on the candidate fleet to auto-size each cylinder accurately
    const simResult = runDecoSimulation({
      bottomDepthFt: safeDepthFt,
      bottomTimeMin: safeBottomMin,
      setpoint,
      gfLowPct: gfLow,
      gfHighPct: gfHigh,
      bottomDil: { o2: dilO2, he: dilHe },
      ascentGases: candidates,
      mode: "OC",
      workingSacCuFtMin: workingSac,
      decoSacCuFtMin: decoSac,
      settings,
    });

    return candidates.map((c) => {
      const rawCuFt = simResult.gasUsageCuFt[c.name] || 0;
      const neededCuFt = Math.max(
        10,
        Math.ceil(includeThirdsReserve ? rawCuFt * 1.5 : rawCuFt)
      );
      const cylSpec = pickSmartCylinderSpec(neededCuFt);
      return {
        ...c,
        tankSizeCuFt: cylSpec.tankSizeCuFt,
        workingPsi: cylSpec.workingPsi,
        neededCuFt,
        cylLabel: cylSpec.cylLabel,
      };
    });
  }, [
    safeDepthFt,
    safeBottomMin,
    dilO2,
    dilHe,
    setpoint,
    gfLow,
    gfHigh,
    workingSac,
    decoSac,
    includeThirdsReserve,
    settings,
    recMixStyle,
  ]);

  const applyFullSmartFleet = () => {
    const deployed: ExtendedGasMix[] = smartRecommendations.map((r, i) => ({
      id: `smart_${Date.now()}_${i}`,
      name: r.name,
      o2: r.o2,
      he: r.he,
      n2: r.n2,
      maxPo2Limit: r.maxPo2Limit,
      switchDepthFt: r.switchDepthFt,
      ccrSwitchDepthFt: r.ccrSwitchDepthFt,
      tankSizeCuFt: r.tankSizeCuFt,
      workingPsi: r.workingPsi,
      isUsedAsDiluentOnAscent: r.isUsedAsDiluentOnAscent,
      roleTag: r.roleTag,
    }));
    setGases(deployed);
    setEditingGasId(null);
    triggerToast(
      `Loaded ${deployed.length}-Tank Smart Bailout & Plumb-In Fleet ✓`
    );
  };

  const addSingleSmartTank = (r: (typeof smartRecommendations)[number]) => {
    const entry: ExtendedGasMix = {
      id: `smart_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: r.name,
      o2: r.o2,
      he: r.he,
      n2: r.n2,
      maxPo2Limit: r.maxPo2Limit,
      switchDepthFt: r.switchDepthFt,
      ccrSwitchDepthFt: r.ccrSwitchDepthFt,
      tankSizeCuFt: r.tankSizeCuFt,
      workingPsi: r.workingPsi,
      isUsedAsDiluentOnAscent: r.isUsedAsDiluentOnAscent,
      roleTag: r.roleTag,
    };
    setGases([...gases, entry]);
    triggerToast(`Added ${r.name} (${r.cylLabel}) to Dive Plan ✓`);
  };

  // Build Unified "BOTH" Table Rows so EVERY CCR Flush, SP Boost & OC Switch Depth is visible
  const unifiedBothRows = useMemo(() => {
    const ccrAscRows = ccrPlan.profileRows.filter((r) => r.phase === "SWITCH");
    const ocAscRows = ocBailoutPlan.profileRows.filter(
      (r) => r.phase === "SWITCH"
    );

    const deepestFirstStop = Math.max(
      ccrPlan.stops[0]?.depthFt || 0,
      ocBailoutPlan.stops[0]?.depthFt || 0
    );

    // Collect every ascent switch waypoint deeper than the first stop
    const switchWaypoints = new Set<number>([safeDepthFt]);
    if (deepestFirstStop > 0) switchWaypoints.add(deepestFirstStop);

    ccrAscRows.forEach((r) => {
      if (r.depthFt >= deepestFirstStop && r.depthFt <= safeDepthFt) {
        switchWaypoints.add(r.depthFt);
      }
    });
    ocAscRows.forEach((r) => {
      if (r.depthFt >= deepestFirstStop && r.depthFt <= safeDepthFt) {
        switchWaypoints.add(r.depthFt);
      }
    });
    gases.forEach((g) => {
      if (g.switchDepthFt < safeDepthFt && g.switchDepthFt > deepestFirstStop) {
        switchWaypoints.add(g.switchDepthFt);
      }
      const ccrSw = g.ccrSwitchDepthFt || g.switchDepthFt;
      if (
        g.isUsedAsDiluentOnAscent &&
        ccrSw < safeDepthFt &&
        ccrSw > deepestFirstStop
      ) {
        switchWaypoints.add(ccrSw);
      }
    });
    if (
      useDecoSpBoost &&
      decoSpSwitchDepthFt < safeDepthFt &&
      decoSpSwitchDepthFt > deepestFirstStop
    ) {
      switchWaypoints.add(decoSpSwitchDepthFt);
    }

    const sortedWaypoints = Array.from(switchWaypoints).sort((a, b) => b - a);

    // Helper to evaluate active CCR Diluent, SP, and OC Gas at any transit depth
    const getCcrGasAt = (d: number) => {
      const cands = gases
        .filter(
          (g) =>
            g.isUsedAsDiluentOnAscent &&
            d <= (g.ccrSwitchDepthFt || g.switchDepthFt)
        )
        .sort(
          (a, b) =>
            (a.ccrSwitchDepthFt || a.switchDepthFt) -
            (b.ccrSwitchDepthFt || b.switchDepthFt)
        );
      return cands.length > 0 ? cands[0].name : `Dil ${dilO2}/${dilHe}`;
    };

    const getOcGasAt = (d: number) => {
      const amb = depthFtToBar(d);
      const valid = gases
        .filter((g) => d <= g.switchDepthFt && (g.o2 / 100) * amb >= 0.16)
        .sort((a, b) => a.switchDepthFt - b.switchDepthFt);
      if (valid.length > 0) return valid[0].name;
      if (gases.length > 0) {
        return [...gases].sort(
          (a, b) => b.switchDepthFt - a.switchDepthFt || a.o2 - b.o2
        )[0].name;
      }
      return `Dil ${dilO2}/${dilHe}`;
    };

    const ascentBands: {
      id: string;
      label: string;
      targetDepth: number;
      transitMin: number;
      ccrRun: number;
      ocRun: number;
      sp: number;
      ccrDil: string;
      ocGas: string;
      ccrSwitched: boolean;
      spBoosted: boolean;
      ocSwitched: boolean;
    }[] = [];

    let ccrElapsed = safeBottomMin;
    let ocElapsed = safeBottomMin + settings.ocProblemTimeMin;
    let prevCcrDil = `Dil ${dilO2}/${dilHe}`;
    let prevSp = setpoint;
    let prevOcGas = getOcGasAt(safeDepthFt);

    for (let i = 0; i < sortedWaypoints.length - 1; i++) {
      const fromD = sortedWaypoints[i];
      const toD = sortedWaypoints[i + 1];
      if (fromD <= toD) continue;
      const transitMin =
        Math.round(((fromD - toD) / Math.max(5, settings.ascentRateFtMin)) * 10) /
        10;
      ccrElapsed += transitMin;
      ocElapsed += transitMin;

      const ccrDil = getCcrGasAt(toD);
      const ocGas = getOcGasAt(toD);
      const sp =
        useDecoSpBoost && toD <= decoSpSwitchDepthFt ? decoSetpoint : setpoint;

      ascentBands.push({
        id: `band_${fromD}_${toD}`,
        label: `${fromD} → ${toD} ft (Asc)`,
        targetDepth: toD,
        transitMin,
        ccrRun: Math.round(ccrElapsed),
        ocRun: Math.round(ocElapsed),
        sp,
        ccrDil,
        ocGas,
        ccrSwitched: ccrDil !== prevCcrDil,
        spBoosted: sp !== prevSp,
        ocSwitched: ocGas !== prevOcGas,
      });

      prevCcrDil = ccrDil;
      prevSp = sp;
      prevOcGas = ocGas;
    }

    // Collect all stop depths + any shallow switch depths at or shallower than deepestFirstStop
    const stopDepthSet = new Set<number>([
      ...ccrPlan.stops.map((s) => s.depthFt),
      ...ocBailoutPlan.stops.map((s) => s.depthFt),
    ]);
    gases.forEach((g) => {
      if (
        g.switchDepthFt <= deepestFirstStop &&
        g.switchDepthFt >= settings.lastStopDepthFt
      ) {
        stopDepthSet.add(g.switchDepthFt);
      }
      const ccrSw = g.ccrSwitchDepthFt || g.switchDepthFt;
      if (
        g.isUsedAsDiluentOnAscent &&
        ccrSw <= deepestFirstStop &&
        ccrSw >= settings.lastStopDepthFt
      ) {
        stopDepthSet.add(ccrSw);
      }
    });

    const sortedStopDepths = Array.from(stopDepthSet).sort((a, b) => b - a);
    const stopRows = sortedStopDepths.map((depth) => {
      const ccrStop = ccrPlan.stops.find((s) => s.depthFt === depth);
      const boStop = ocBailoutPlan.stops.find((b) => b.depthFt === depth);

      const ccrDil = ccrStop ? ccrStop.activeGasName : getCcrGasAt(depth);
      const ocGas = boStop ? boStop.activeGasName : getOcGasAt(depth);
      const sp = ccrStop
        ? ccrStop.activeSp
        : Number(
            Math.min(
              depthFtToBar(depth),
              useDecoSpBoost && depth <= decoSpSwitchDepthFt
                ? decoSetpoint
                : setpoint
            ).toFixed(2)
          );

      const ccrSwitched = ccrDil !== prevCcrDil;
      const spBoosted =
        useDecoSpBoost &&
        depth <= decoSpSwitchDepthFt &&
        prevSp < decoSetpoint &&
        sp > prevSp;
      const ocSwitched = ocGas !== prevOcGas;

      prevCcrDil = ccrDil;
      prevSp = sp;
      prevOcGas = ocGas;

      return {
        depth,
        ccrStop,
        boStop,
        ccrDil,
        ocGas,
        sp,
        ccrSwitched,
        spBoosted,
        ocSwitched,
      };
    });

    return { ascentBands, stopRows, bottomOcGas: getOcGasAt(safeDepthFt) };
  }, [
    ccrPlan,
    ocBailoutPlan,
    safeDepthFt,
    safeBottomMin,
    gases,
    dilO2,
    dilHe,
    setpoint,
    useDecoSpBoost,
    decoSetpoint,
    decoSpSwitchDepthFt,
    settings,
  ]);

  // Parse Subsurface (.ssrf / .uddf / .xml) file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const sampleNodes = Array.from(xml.querySelectorAll("sample, waypoint"));

        const parsed: TelemetrySample[] = [];
        let lastPo2 = 0.7;

        sampleNodes.forEach((node, idx) => {
          const timeAttr = node.getAttribute("time") || "";
          let timeMin = idx * 0.5;
          if (timeAttr.includes(":")) {
            const parts = timeAttr.split(":");
            timeMin = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
          }

          const depthAttr =
            node.getAttribute("depth") ||
            node.querySelector("depth")?.textContent ||
            "0";
          const depthMeters = parseFloat(depthAttr.replace("m", "").trim()) || 0;
          const depthFt = Math.round(depthMeters * 3.28084);

          const po2Attr =
            node.getAttribute("po2") ||
            node.getAttribute("sensor1") ||
            node.querySelector("po2")?.textContent;
          if (po2Attr) {
            lastPo2 = parseFloat(po2Attr.replace("bar", "").trim()) || lastPo2;
          }

          const s1 = parseFloat(node.getAttribute("sensor1") || String(lastPo2));
          const s2 = parseFloat(node.getAttribute("sensor2") || String(lastPo2));
          const s3 = parseFloat(node.getAttribute("sensor3") || String(lastPo2));

          parsed.push({
            timeMin: Number(timeMin.toFixed(1)),
            depthFt,
            cell1: Number(s1.toFixed(2)),
            cell2: Number(s2.toFixed(2)),
            cell3: Number(s3.toFixed(2)),
            setpoint: depthFt > 50 ? 1.3 : 0.7,
          });
        });

        if (parsed.length > 0) {
          setActualSamples(parsed);
        }
      } catch (err) {
        console.error("Failed to parse dive log:", err);
      }
    };
    reader.readAsText(file);
  };

  const loadSimulatedP2Dive = () => {
    setLogName("P2_Petrel3_Sim_Dive.ssrf");
    const sim: TelemetrySample[] = [];
    const totalMin = ccrPlan.totalRunTimeMin;

    for (let t = 0; t <= totalMin; t++) {
      let d = 0;
      if (t <= 3) {
        d = Math.round((t / 3) * safeDepthFt);
      } else if (t <= safeBottomMin) {
        d = safeDepthFt + Math.round(Math.sin(t) * 4);
      } else {
        const matchStop = ccrPlan.stops.find((s) => t <= s.runTimeMin);
        d = matchStop
          ? matchStop.depthFt + (t % 2 === 0 ? 3 : -2)
          : settings.lastStopDepthFt;
      }

      const sp =
        t < 5
          ? 0.7
          : useDecoSpBoost && t > safeBottomMin && d <= decoSpSwitchDepthFt
          ? decoSetpoint
          : setpoint;
      const oscillation =
        d > 60 ? Math.sin(t * 1.4) * 0.11 : Math.sin(t) * 0.04;
      const basePo2 = Math.min(d / 33 + 1, sp + oscillation);

      sim.push({
        timeMin: t,
        depthFt: Math.max(0, d),
        cell1: Number(basePo2.toFixed(2)),
        cell2: Number((basePo2 + 0.02).toFixed(2)),
        cell3: Number(
          (basePo2 > 1.2 ? basePo2 - 0.08 : basePo2 - 0.01).toFixed(2)
        ),
        setpoint: sp,
      });
    }
    setActualSamples(sim);
  };

  const coachingMetrics = useMemo(() => {
    if (actualSamples.length === 0) return null;

    const maxActualDepth = Math.max(...actualSamples.map((s) => s.depthFt));
    const bottomSamples = actualSamples.filter(
      (s) => s.timeMin >= 4 && s.timeMin <= safeBottomMin
    );

    const po2Diffs = bottomSamples.map((s) =>
      Math.abs((s.cell1 + s.cell2) / 2 - setpoint)
    );
    const avgPo2Deviation =
      po2Diffs.length > 0
        ? po2Diffs.reduce((a, b) => a + b, 0) / po2Diffs.length
        : 0;

    const maxCellSpread = Math.max(
      ...actualSamples.map(
        (s) =>
          Math.max(s.cell1, s.cell2, s.cell3) -
          Math.min(s.cell1, s.cell2, s.cell3)
      )
    );

    const suggestions: {
      status: "good" | "warn" | "alert";
      title: string;
      detail: string;
    }[] = [];

    if (avgPo2Deviation > 0.07) {
      suggestions.push({
        status: "warn",
        title: `Loop PPO2 Oscillation (±${avgPo2Deviation.toFixed(2)} ata)`,
        detail:
          "Your bottom PPO2 fluctuated noticeably around setpoint. Maintain minimum loop volume so the ADV doesn't inject uncommanded diluent.",
      });
    } else {
      suggestions.push({
        status: "good",
        title: "Tight Loop Volume & Setpoint Control",
        detail: `Average loop PPO2 stayed within ±${avgPo2Deviation.toFixed(
          2
        )} ata of your ${setpoint} setpoint.`,
      });
    }

    if (maxCellSpread >= 0.08) {
      suggestions.push({
        status: "alert",
        title: `Sensor Divergence (${maxCellSpread.toFixed(2)} ata spread)`,
        detail:
          "Cell #3 tracked lower than Cells #1 and #2 at high PPO2. Inspect for moisture on the sensor face or early current-limiting.",
      });
    }

    return {
      maxActualDepth,
      actualRuntime: actualSamples[actualSamples.length - 1]?.timeMin || 0,
      maxCellSpread: maxCellSpread.toFixed(2),
      suggestions,
    };
  }, [actualSamples, safeBottomMin, setpoint]);

  const plumbedInGases = gases.filter((g) => g.isUsedAsDiluentOnAscent);
  const sortedOcScheduleGases = useMemo(
    () => [...gases].sort((a, b) => b.switchDepthFt - a.switchDepthFt),
    [gases]
  );

  return (
    <div className="space-y-3.5 relative">
      {/* FLOATING CONFIRMATION TOAST */}
      {statusToast && (
        <div className="sticky top-14 z-40 bg-emerald-950 border-2 border-emerald-400 text-emerald-100 px-3.5 py-2.5 rounded-xl shadow-2xl flex items-center justify-between text-xs font-mono font-bold">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {statusToast}
          </span>
          <button onClick={() => setStatusToast(null)}>
            <X className="w-3.5 h-3.5 text-emerald-300" />
          </button>
        </div>
      )}

      {/* TOP BAR: SUBTABS + PLANNER SETTINGS BUTTON */}
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubTab("planner")}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              subTab === "planner"
                ? "bg-purple-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Deco Planner
          </button>
          <button
            onClick={() => setSubTab("compare")}
            className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              subTab === "compare"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Log Debrief
          </button>
        </div>

        <button
          onClick={() => setShowSettingsModal(!showSettingsModal)}
          className={`px-3 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
            showSettingsModal
              ? "bg-amber-500 text-slate-950 border-amber-400"
              : "bg-slate-900 text-amber-400 border-slate-800 hover:border-amber-500/50"
          }`}
          title="Planner Settings & Defaults"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* PLANNER SETTINGS & DEFAULTS DRAWER */}
      {showSettingsModal && (
        <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 space-y-3.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Planner Settings & Defaults
            </span>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                LAST STOP DEPTH
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {([10, 15, 20] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() =>
                      setSettings({ ...settings, lastStopDepthFt: d })
                    }
                    className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                      settings.lastStopDepthFt === d
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {d} ft
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                OC PROBLEM TIME @ BOTTOM
              </label>
              <div className="flex items-center gap-1.5">
                <NumericInput
                  min={0}
                  max={15}
                  value={settings.ocProblemTimeMin}
                  onChange={(val) =>
                    setSettings({ ...settings, ocProblemTimeMin: val })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-white text-center font-bold"
                />
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  MIN
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                DESCENT (FT/MIN)
              </label>
              <NumericInput
                min={10}
                max={120}
                value={settings.descentRateFtMin}
                onChange={(val) =>
                  setSettings({ ...settings, descentRateFtMin: val })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-white text-center font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                ASCENT (FT/MIN)
              </label>
              <NumericInput
                min={5}
                max={60}
                value={settings.ascentRateFtMin}
                onChange={(val) =>
                  setSettings({ ...settings, ascentRateFtMin: val })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-white text-center font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                TARGET MAX END (FT)
              </label>
              <NumericInput
                min={60}
                max={150}
                value={settings.targetEndFt}
                onChange={(val) =>
                  setSettings({ ...settings, targetEndFt: val })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-cyan-300 text-center font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                END NARCOSIS
              </label>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    o2Narcotic: !settings.o2Narcotic,
                  })
                }
                className={`w-full py-2 px-2 rounded-xl font-mono text-[11px] font-bold border transition-all ${
                  settings.o2Narcotic
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-950 border-slate-700 text-slate-400"
                }`}
              >
                {settings.o2Narcotic ? "O2 + N2 Narc" : "N2 Only"}
              </button>
            </div>
          </div>

          <button
            onClick={saveDefaultsToStorage}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Save All Settings, GFs & SAC as App
            Defaults
          </button>
        </div>
      )}

      {subTab === "planner" && (
        <>
          {/* SAVED DIVE PLANS DROPDOWN & SAVE BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" /> Saved Dive Plans (
                {favorites.length})
              </span>
              {selectedFavId && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Active Plan Loaded
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={selectedFavId}
                onChange={(e) => handleSelectFavoriteDropdown(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 font-bold"
              >
                <option value="">
                  {favorites.length === 0
                    ? "-- No Saved Plans Yet (Save One Below) --"
                    : "-- Select a Saved Dive Plan to Load --"}
                </option>
                {favorites.map((fav) => (
                  <option key={fav.id} value={fav.id}>
                    {fav.name} ({fav.bottomDepthFt}ft / {fav.bottomTimeMin}m)
                  </option>
                ))}
              </select>

              {selectedFavId && (
                <button
                  onClick={deleteSelectedFavorite}
                  className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  title="Delete selected plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name current dive plan to save..."
                value={favName}
                onChange={(e) => setFavName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                onClick={saveCurrentAsFavorite}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Save Plan
              </button>
            </div>
          </div>

          {/* 1. PROFILE, DILUENT, GFs & SETPOINT SCHEDULE CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-purple-400 font-bold">
                1. Profile, Diluent & Setpoint Schedule
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Last Stop: {settings.lastStopDepthFt}ft | Asc:{" "}
                {settings.ascentRateFtMin}ft/m
              </span>
            </div>

            {/* ROW 1: DEPTH, BOTTOM TIME, BOTTOM SETPOINT */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  DEPTH (FT)
                </label>
                <NumericInput
                  min={10}
                  max={450}
                  value={bottomDepthFt}
                  onChange={setBottomDepthFt}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-sm text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  BOT TIME (MIN)
                </label>
                <NumericInput
                  min={1}
                  max={300}
                  value={bottomTimeMin}
                  onChange={setBottomTimeMin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-sm text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  BOTTOM SP (ATA)
                </label>
                <NumericInput
                  min={0.4}
                  max={1.6}
                  value={setpoint}
                  onChange={setSetpoint}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-sm text-emerald-400 text-center font-bold"
                />
              </div>
            </div>

            {/* ROW 2: ONBOARD DILUENT (AUTO-SYNCED TO DEPTH & PO2) + GF LOW/HIGH */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Onboard Diluent & Gradient Factors
                </span>
                <button
                  onClick={() => setAutoMatchDiluent(!autoMatchDiluent)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 transition-all ${
                    autoMatchDiluent
                      ? "bg-purple-500/20 border-purple-400 text-purple-200"
                      : "bg-slate-950 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                  title="Automatically populate Diluent O2% & He% from Depth, Bottom PO2, and Target END"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  {autoMatchDiluent
                    ? `Auto-Matched Gas (END ≤${settings.targetEndFt}ft)`
                    : "Custom Gas (Tap to Auto-Match)"}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    DIL O2%
                  </label>
                  <NumericInput
                    min={5}
                    max={100}
                    value={dilO2}
                    onChange={(val) => {
                      setAutoMatchDiluent(false);
                      setDilO2(val);
                    }}
                    className={`w-full bg-slate-950 border rounded-xl p-2 font-mono text-xs text-center font-bold ${
                      autoMatchDiluent
                        ? "border-purple-500/50 text-purple-200"
                        : "border-slate-700 text-white"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    DIL HE%
                  </label>
                  <NumericInput
                    min={0}
                    max={95}
                    value={dilHe}
                    onChange={(val) => {
                      setAutoMatchDiluent(false);
                      setDilHe(val);
                    }}
                    className={`w-full bg-slate-950 border rounded-xl p-2 font-mono text-xs text-center font-bold ${
                      autoMatchDiluent
                        ? "border-purple-500/50 text-purple-200"
                        : "border-slate-700 text-white"
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    GF LOW
                  </label>
                  <NumericInput
                    min={10}
                    max={100}
                    value={gfLow}
                    onChange={setGfLow}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-cyan-400 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    GF HIGH
                  </label>
                  <NumericInput
                    min={20}
                    max={100}
                    value={gfHigh}
                    onChange={setGfHigh}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-cyan-400 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* ROW 3 (MOVED BELOW DILUENT & GFs): ASCENT / DECO SETPOINT BOOST */}
            <div className="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Ascent / Deco PO2 Boost
                </span>
                <button
                  onClick={() => setUseDecoSpBoost(!useDecoSpBoost)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                    useDecoSpBoost
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : "bg-slate-900 border-slate-700 text-slate-400"
                  }`}
                >
                  {useDecoSpBoost ? "BOOST ON" : "CONSTANT SP"}
                </button>
              </div>

              {useDecoSpBoost && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      RAISE PO2 AT DEPTH (FT)
                    </label>
                    <NumericInput
                      min={10}
                      max={200}
                      value={decoSpSwitchDepthFt}
                      onChange={setDecoSpSwitchDepthFt}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg p-1.5 font-mono text-xs text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      DECO SETPOINT (ATA)
                    </label>
                    <NumericInput
                      min={0.7}
                      max={1.6}
                      value={decoSetpoint}
                      onChange={setDecoSetpoint}
                      className={`w-full bg-slate-900 border rounded-lg p-1.5 font-mono text-xs text-center font-bold ${
                        decoSetpoint > 1.4
                          ? "border-amber-500 text-amber-300"
                          : "border-emerald-500/40 text-emerald-300"
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ROW 4: CONSUMPTION RATE (SAC / RMV) INPUTS FOR BAILOUT */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-cyan-400 flex items-center gap-1 font-bold">
                  <Wind className="w-3.5 h-3.5" /> OC Bailout SAC (Includes{" "}
                  {settings.ocProblemTimeMin}m Problem-Solve @ Bottom)
                </span>
                <button
                  onClick={() => setIncludeThirdsReserve(!includeThirdsReserve)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                    includeThirdsReserve
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-700 text-slate-400"
                  }`}
                >
                  {includeThirdsReserve ? "+1/3 Res: ON" : "Raw Vol"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    WORK / ASC SAC (CUFT/MIN)
                  </label>
                  <NumericInput
                    min={0.2}
                    max={3.0}
                    value={workingSac}
                    onChange={setWorkingSac}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-xs text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    DECO STOP SAC (CUFT/MIN)
                  </label>
                  <NumericInput
                    min={0.2}
                    max={3.0}
                    value={decoSac}
                    onChange={setDecoSac}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-xs text-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* LIVE LOOP TELEMETRY READOUT */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] font-mono text-slate-400 block">
                  FLUSH PO2
                </span>
                <span
                  className={`text-sm font-mono font-bold ${
                    dilEval.isFlushPO2Unsafe ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {dilEval.flushPO2}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Max {dilEval.maxFlushDepthFt}ft
                </span>
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] font-mono text-slate-400 block">
                  LOOP END
                </span>
                <span
                  className={`text-sm font-mono font-bold ${
                    dilEval.isENDUnsafe ? "text-red-400" : "text-cyan-400"
                  }`}
                >
                  {dilEval.loopENDFt} ft
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Target ≤{settings.targetEndFt}ft
                </span>
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] font-mono text-slate-400 block">
                  DENSITY
                </span>
                <span
                  className={`text-sm font-mono font-bold ${
                    dilEval.gasDensityGL > 5.2
                      ? "text-amber-400"
                      : "text-slate-200"
                  }`}
                >
                  {dilEval.gasDensityGL} g/L
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Limit ≤5.2
                </span>
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] font-mono text-slate-400 block">
                  LOOP MIX
                </span>
                <span className="text-sm font-mono font-bold text-purple-400">
                  {dilEval.loopFO2}/{dilEval.loopFHe}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  @ {safeDepthFt}ft
                </span>
              </div>
            </div>
          </div>

          {/* 2. OFFBOARD BAILOUT, SMART FLEET ENGINE & TANK LOCKER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-cyan-400 font-bold">
                2. Bailout & Plumb-In Ascent Tanks
              </span>
              <button
                onClick={() => setShowTankLocker(!showTankLocker)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1 transition-all ${
                  showTankLocker
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-950 text-amber-400 border-amber-500/40 hover:border-amber-400"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Tank Locker ({tankLocker.length})
              </button>
            </div>

            {/* COLLAPSIBLE TANK LOCKER (FAVORITE TANKS) */}
            {showTankLocker && (
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                  Favorite Tank Locker (Tap + to Deploy Into Dive Plan):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {tankLocker.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5"
                    >
                      <button
                        onClick={() => addTankFromLocker(t)}
                        className="text-left flex-1 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{t.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          (SW {t.switchDepthFt}ft)
                        </span>
                      </button>
                      <button
                        onClick={() => removeTankFromLocker(t.id)}
                        className="text-slate-500 hover:text-red-400 p-0.5"
                        title="Remove from locker"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SMART MULTI-TIER RECOMMENDED BAILOUT & PLUMB-IN ENGINE */}
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Smart Bailout & Stage Engine (Sized for {safeDepthFt}ft /{" "}
                  {safeBottomMin}m)
                </span>

                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono font-bold">
                  <button
                    onClick={() => setRecMixStyle("matched")}
                    className={`px-2 py-0.5 rounded transition-all ${
                      recMixStyle === "matched"
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    He/ICD-Matched
                  </button>
                  <button
                    onClick={() => setRecMixStyle("shop")}
                    className={`px-2 py-0.5 rounded transition-all ${
                      recMixStyle === "shop"
                        ? "bg-cyan-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Standard Blends
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {smartRecommendations.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-white">
                          {r.name}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                          {r.cylLabel} ({r.neededCuFt}/{r.tankSizeCuFt} cf)
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300">
                          OC ≤{r.switchDepthFt}ft
                        </span>
                        {r.isUsedAsDiluentOnAscent && (
                          <span className="text-[10px] font-mono text-purple-300">
                            • Flush @{r.ccrSwitchDepthFt}ft
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {r.roleTag}
                      </span>
                    </div>

                    <button
                      onClick={() => addSingleSmartTank(r)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3 text-cyan-400" /> Add
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={applyFullSmartFleet}
                className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Apply Full {smartRecommendations.length}-Tank Recommended Fleet
              </button>
            </div>

            {/* ACTIVE TANK CARDS LIST */}
            <div className="space-y-2.5">
              {gases.map((g) => {
                const rawCuFt = ocBailoutPlan.gasUsageCuFt[g.name] || 0;
                const usedCuFt = Math.ceil(
                  includeThirdsReserve ? rawCuFt * 1.5 : rawCuFt
                );
                const psiPerCuFt = g.workingPsi / Math.max(1, g.tankSizeCuFt);
                const reqPsi = Math.round(usedCuFt * psiPerCuFt);
                const isOverCapacity = usedCuFt > g.tankSizeCuFt;
                const isEditingThis = editingGasId === g.id;
                const mod14 = calcModFt(g.o2, 1.4);
                const mod16 = calcModFt(g.o2, 1.6);

                return (
                  <div
                    key={g.id}
                    className={`rounded-xl p-3 border transition-all space-y-2 ${
                      isEditingThis
                        ? "bg-slate-900 border-amber-400 ring-1 ring-amber-400/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => startEditingGas(g)}
                        className="text-left flex-1 group"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-sm text-white group-hover:text-cyan-300 flex items-center gap-1">
                            {g.name}
                            <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">
                            OC Switch ≤ {g.switchDepthFt}ft
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            (MOD 1.4: {mod14}ft | 1.6: {mod16}ft)
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          OC Bailout Needed{" "}
                          {includeThirdsReserve ? "(incl. 1/3 Res)" : "(Raw)"}:{" "}
                          <span
                            className={
                              isOverCapacity
                                ? "text-red-400 font-bold"
                                : "text-emerald-400 font-bold"
                            }
                          >
                            {usedCuFt} cuft ({reqPsi} psi)
                          </span>{" "}
                          / {g.tankSizeCuFt} cuft ({g.workingPsi} psi)
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleGasDiluentAscent(g.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                            g.isUsedAsDiluentOnAscent
                              ? "bg-purple-500/20 border-purple-400 text-purple-200"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}
                        >
                          {g.isUsedAsDiluentOnAscent
                            ? "Plumb to Loop: ON"
                            : "OC Bailout Only"}
                        </button>
                        <button
                          onClick={() => removeGas(g.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Delete tank"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {g.isUsedAsDiluentOnAscent && (
                      <div className="bg-purple-950/30 border border-purple-500/40 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="font-mono text-[11px] text-purple-200">
                          <strong className="text-purple-300">
                            CCR DILUENT LINE:
                          </strong>{" "}
                          Plumb & Flush into loop on ascent at:
                        </div>
                        <div className="flex items-center gap-1.5">
                          <NumericInput
                            min={10}
                            max={350}
                            value={g.ccrSwitchDepthFt || g.switchDepthFt}
                            onChange={(val) => updateCcrSwitchDepth(g.id, val)}
                            className="w-16 bg-slate-950 border border-purple-400/60 rounded px-2 py-1 font-mono text-xs text-purple-200 text-center font-bold"
                          />
                          <span className="text-[10px] font-mono text-purple-300">
                            FT
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CLEARLY LABELED TANK ADD / EDIT FORM + SAVE TO LOCKER */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-bold text-amber-400">
                  {editingGasId
                    ? "Editing Selected Tank (Update Below)"
                    : "+ Add Custom Bailout / Ascent Tank"}
                </span>
                {editingGasId && (
                  <button
                    onClick={cancelEditingGas}
                    className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    O2 (%)
                  </label>
                  <NumericInput
                    min={5}
                    max={100}
                    value={formO2}
                    onChange={(val) => handleFormO2orPo2Change(val, formMaxPo2)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    HELIUM (%)
                  </label>
                  <NumericInput
                    min={0}
                    max={95}
                    value={formHe}
                    onChange={setFormHe}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    MAX PO2 LIMIT
                  </label>
                  <select
                    value={formMaxPo2}
                    onChange={(e) =>
                      handleFormO2orPo2Change(formO2, Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-cyan-300 font-bold"
                  >
                    <option value={1.4}>1.4 ata (Bottom)</option>
                    <option value={1.6}>1.6 ata (Deco)</option>
                    <option value={1.2}>1.2 ata (Diluent)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-cyan-400 block mb-1">
                    AUTO MOD / SW (FT)
                  </label>
                  <NumericInput
                    min={10}
                    max={400}
                    value={formSwitchFt}
                    onChange={setFormSwitchFt}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-xs text-center font-mono text-cyan-300 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    TANK SIZE (CUFT)
                  </label>
                  <NumericInput
                    min={10}
                    max={300}
                    value={formTankCuFt}
                    onChange={setFormTankCuFt}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    RATED PSI
                  </label>
                  <NumericInput
                    min={1500}
                    max={4500}
                    value={formWorkingPsi}
                    onChange={setFormWorkingPsi}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPlumbIn}
                    onChange={(e) => setFormPlumbIn(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span>Plumb into CCR Loop on Ascent</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={saveFormGasToLocker}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1"
                    title="Save this tank to your persistent Tank Locker"
                  >
                    <Package className="w-3.5 h-3.5" /> Save to Locker
                  </button>

                  <button
                    onClick={saveOrAddGas}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    {editingGasId ? (
                      <>
                        <Check className="w-4 h-4" /> Update Tank
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Add Tank
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FULL DIVE SPREADSHEET (SHOWS ALL CCR & OC SWITCH DEPTHS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                3. Full Dive Profile & Deco Schedule
              </span>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono font-bold">
                <Eye className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
                {(["BOTH", "CCR", "OC"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setTableViewMode(m)}
                    className={`px-2 py-1 rounded-lg transition-all ${
                      tableViewMode === m
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {m === "BOTH" ? "Both" : m === "CCR" ? "CCR Only" : "OC Only"}
                  </button>
                ))}
              </div>
            </div>

            {/* CLICKABLE SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-2.5 font-mono">
              <button
                onClick={() =>
                  setTableViewMode(tableViewMode === "CCR" ? "BOTH" : "CCR")
                }
                className={`text-left rounded-xl p-3 border transition-all ${
                  tableViewMode === "CCR"
                    ? "bg-emerald-950/50 border-2 border-emerald-400 ring-1 ring-emerald-400/40"
                    : "bg-slate-950 border-emerald-500/30 hover:border-emerald-400/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">
                    Closed-Circuit (CCR)
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {tableViewMode === "CCR" ? "Showing CCR" : "Tap to Solo"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      FULL RUN TIME
                    </span>
                    <span className="text-lg font-bold text-white">
                      {ccrPlan.totalRunTimeMin}m
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">
                      DECO / TTS
                    </span>
                    <span className="text-lg font-bold text-emerald-400">
                      {ccrPlan.ttsMin}m
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Stops: {ccrPlan.totalDecoStopMin}m | Asc:{" "}
                  {ccrPlan.ascentTransitMin}m
                </span>
              </button>

              <button
                onClick={() =>
                  setTableViewMode(tableViewMode === "OC" ? "BOTH" : "OC")
                }
                className={`text-left rounded-xl p-3 border transition-all ${
                  tableViewMode === "OC"
                    ? "bg-amber-950/50 border-2 border-amber-400 ring-1 ring-amber-400/40"
                    : "bg-slate-950 border-amber-500/30 hover:border-amber-400/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">
                    Open-Circuit Bailout
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {tableViewMode === "OC" ? "Showing OC" : "Tap to Solo"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">
                      FULL RUN TIME
                    </span>
                    <span className="text-lg font-bold text-white">
                      {ocBailoutPlan.totalRunTimeMin}m
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">
                      DECO / TTS
                    </span>
                    <span className="text-lg font-bold text-amber-400">
                      {ocBailoutPlan.ttsMin}m
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  +{ocBailoutPlan.ocProblemTimeMin}m Bot Solve | Stops:{" "}
                  {ocBailoutPlan.totalDecoStopMin}m
                </span>
              </button>
            </div>

            {/* COMPLETE CCR DILUENT, SETPOINT & OC BAILOUT SWITCH SUMMARY BANNERS */}
            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 text-[11px] font-mono text-slate-300 space-y-1.5">
              <div>
                <span className="text-purple-400 font-bold">
                  CCR DILUENT SCHEDULE:{" "}
                </span>
                Start on{" "}
                <strong className="text-white">
                  Dil {dilO2}/{dilHe}
                </strong>
                {plumbedInGases.length > 0 ? (
                  plumbedInGases
                    .slice()
                    .sort(
                      (a, b) =>
                        (b.ccrSwitchDepthFt || b.switchDepthFt) -
                        (a.ccrSwitchDepthFt || a.switchDepthFt)
                    )
                    .map((g) => (
                      <span key={g.id}>
                        {" "}
                        → Flush{" "}
                        <strong className="text-purple-300">{g.name}</strong> @{" "}
                        <strong className="text-white">
                          {g.ccrSwitchDepthFt || g.switchDepthFt}ft
                        </strong>
                      </span>
                    ))
                ) : (
                  <span className="text-slate-500">
                    {" "}
                    (No offboard tanks plumbed into loop)
                  </span>
                )}
              </div>

              <div>
                <span className="text-emerald-400 font-bold">
                  CCR SETPOINT SCHEDULE:{" "}
                </span>
                Bottom @{" "}
                <strong className="text-white">{setpoint} ata</strong>
                {useDecoSpBoost && (
                  <span>
                    {" "}
                    → Boost to{" "}
                    <strong className="text-emerald-300">
                      {decoSetpoint} ata
                    </strong>{" "}
                    ≤{" "}
                    <strong className="text-white">
                      {decoSpSwitchDepthFt}ft
                    </strong>
                  </span>
                )}
              </div>

              <div className="pt-1 border-t border-slate-800/80">
                <span className="text-cyan-400 font-bold">
                  OC BAILOUT SCHEDULE:{" "}
                </span>
                {sortedOcScheduleGases.length > 0 ? (
                  sortedOcScheduleGases.map((g, idx) => (
                    <span key={g.id}>
                      {idx === 0 ? "Bailout @ Bottom to " : " → Switch "}
                      <strong className="text-cyan-300">{g.name}</strong>{" "}
                      <span className="text-white">
                        ({idx === 0 && g.switchDepthFt >= safeDepthFt
                          ? `≤${g.switchDepthFt}ft`
                          : `@ ${g.switchDepthFt}ft`})
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">
                    Onboard Dil {dilO2}/{dilHe} BOV only (Add offboard tanks above)
                  </span>
                )}
              </div>
            </div>

            {/* FULL DIVE SPREADSHEET TABLE */}
            <div className="overflow-x-auto">
              {tableViewMode === "CCR" && (
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                      <th className="py-1.5">PHASE / DEPTH</th>
                      <th className="py-1.5">TIME</th>
                      <th className="py-1.5">RUN</th>
                      <th className="py-1.5 text-emerald-300">SP</th>
                      <th className="py-1.5 text-purple-300">CCR DILUENT</th>
                      <th className="py-1.5">LOOP FO2/HE</th>
                      <th className="py-1.5">CNS%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ccrPlan.profileRows.map((r, idx) => {
                      const prev = ccrPlan.profileRows[idx - 1];
                      const dilSwitched =
                        idx > 0 && prev && prev.activeGasName !== r.activeGasName;
                      return (
                        <tr
                          key={r.id}
                          className={
                            r.phase === "BOTTOM"
                              ? "bg-purple-950/20"
                              : dilSwitched
                              ? "bg-purple-950/30"
                              : r.phase === "SWITCH"
                              ? "bg-slate-950/60 text-slate-400"
                              : ""
                          }
                        >
                          <td className="py-1.5 font-bold text-white">
                            {r.depthLabel}
                          </td>
                          <td className="py-1.5 text-emerald-400 font-bold">
                            {r.timeMin}m
                          </td>
                          <td className="py-1.5 text-slate-300">
                            {r.runTimeMin}m
                          </td>
                          <td className="py-1.5 text-emerald-300">
                            {r.activeSp}
                          </td>
                          <td className="py-1.5 text-purple-300 font-semibold">
                            {r.activeGasName}
                            {dilSwitched && (
                              <span className="ml-1 text-[9px] bg-purple-500/30 text-purple-200 px-1 py-0.5 rounded">
                                FLUSH
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-slate-400">
                            {r.loopFO2}/{r.loopFHe}
                          </td>
                          <td className="py-1.5 text-slate-400">{r.cns}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tableViewMode === "OC" && (
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                      <th className="py-1.5">PHASE / DEPTH</th>
                      <th className="py-1.5 text-amber-400">TIME</th>
                      <th className="py-1.5 text-amber-300">RUN</th>
                      <th className="py-1.5 text-cyan-300">ACTIVE GAS</th>
                      <th className="py-1.5">PO2 (ATA)</th>
                      <th className="py-1.5">CNS%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ocBailoutPlan.profileRows.map((r, idx) => {
                      const prev = ocBailoutPlan.profileRows[idx - 1];
                      const gasSwitched =
                        idx > 1 && prev && prev.activeGasName !== r.activeGasName;
                      return (
                        <tr
                          key={r.id}
                          className={
                            r.phase === "PROBLEM"
                              ? "bg-amber-950/30"
                              : gasSwitched
                              ? "bg-cyan-950/30"
                              : r.phase === "SWITCH"
                              ? "bg-slate-950/60 text-slate-400"
                              : ""
                          }
                        >
                          <td className="py-1.5 font-bold text-white">
                            {r.depthLabel}
                          </td>
                          <td className="py-1.5 text-amber-400 font-bold">
                            {r.timeMin}m
                          </td>
                          <td className="py-1.5 text-slate-300">
                            {r.runTimeMin}m
                          </td>
                          <td className="py-1.5 text-cyan-300 font-semibold">
                            {r.activeGasName}
                            {gasSwitched && (
                              <span className="ml-1 text-[9px] bg-cyan-500/30 text-cyan-200 px-1 py-0.5 rounded">
                                SW
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-slate-300">{r.activeSp}</td>
                          <td className="py-1.5 text-slate-400">{r.cns}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tableViewMode === "BOTH" && (
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                      <th className="py-1.5">PHASE / DEPTH</th>
                      <th className="py-1.5 text-emerald-400">CCR MIN</th>
                      <th className="py-1.5">CCR RUN</th>
                      <th className="py-1.5 text-emerald-300">SP</th>
                      <th className="py-1.5 text-purple-300">CCR DIL</th>
                      <th className="py-1.5 text-amber-400">OC MIN</th>
                      <th className="py-1.5 text-amber-300">OC RUN</th>
                      <th className="py-1.5 text-cyan-300">OC GAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {/* 1. Descent Row */}
                    <tr>
                      <td className="py-1.5 font-bold text-slate-300">
                        0 → {safeDepthFt} ft (Desc)
                      </td>
                      <td className="py-1.5 text-emerald-400">
                        {ccrPlan.profileRows[0]?.timeMin}m
                      </td>
                      <td className="py-1.5 text-slate-300">
                        {ccrPlan.profileRows[0]?.runTimeMin}m
                      </td>
                      <td className="py-1.5 text-emerald-300">{setpoint}</td>
                      <td className="py-1.5 text-purple-300">
                        Dil {dilO2}/{dilHe}
                      </td>
                      <td className="py-1.5 text-amber-300">
                        {ocBailoutPlan.profileRows[0]?.timeMin}m
                      </td>
                      <td className="py-1.5 text-amber-200/80">
                        {ocBailoutPlan.profileRows[0]?.runTimeMin}m
                      </td>
                      <td className="py-1.5 text-slate-400">On CCR Loop</td>
                    </tr>

                    {/* 2. Bottom Row */}
                    <tr className="bg-purple-950/20">
                      <td className="py-1.5 font-bold text-white">
                        {safeDepthFt} ft (Bottom)
                      </td>
                      <td className="py-1.5 text-emerald-400 font-bold">
                        {ccrPlan.profileRows[1]?.timeMin}m
                      </td>
                      <td className="py-1.5 text-slate-300">
                        {ccrPlan.profileRows[1]?.runTimeMin}m
                      </td>
                      <td className="py-1.5 text-emerald-300">{setpoint}</td>
                      <td className="py-1.5 text-purple-300">
                        Dil {dilO2}/{dilHe}
                      </td>
                      <td className="py-1.5 text-amber-300 font-bold">
                        {ocBailoutPlan.profileRows[1]?.timeMin}m
                      </td>
                      <td className="py-1.5 text-amber-200/80">
                        {ocBailoutPlan.profileRows[1]?.runTimeMin}m
                      </td>
                      <td className="py-1.5 text-slate-400">On CCR Loop</td>
                    </tr>

                    {/* 3. OC Problem Solving at Bottom */}
                    {settings.ocProblemTimeMin > 0 && (
                      <tr className="bg-amber-950/25">
                        <td className="py-1.5 font-bold text-amber-300">
                          {safeDepthFt} ft (BO Solve)
                        </td>
                        <td className="py-1.5 text-slate-500">-</td>
                        <td className="py-1.5 text-slate-500">-</td>
                        <td className="py-1.5 text-slate-500">-</td>
                        <td className="py-1.5 text-slate-500">Ascending</td>
                        <td className="py-1.5 text-amber-400 font-bold">
                          +{settings.ocProblemTimeMin}m
                        </td>
                        <td className="py-1.5 text-amber-200">
                          {safeBottomMin + settings.ocProblemTimeMin}m
                        </td>
                        <td className="py-1.5 text-cyan-300 font-bold">
                          {unifiedBothRows.bottomOcGas}
                          <span className="ml-1 text-[9px] bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded">
                            BO
                          </span>
                        </td>
                      </tr>
                    )}

                    {/* 4. Intermediate Ascent & Deep Switch Brackets (Bottom -> First Stop) */}
                    {unifiedBothRows.ascentBands.map((b) => (
                      <tr
                        key={b.id}
                        className={
                          b.ccrSwitched || b.ocSwitched || b.spBoosted
                            ? "bg-cyan-950/20"
                            : "bg-slate-950/40 text-slate-300"
                        }
                      >
                        <td className="py-1.5 font-semibold text-slate-200">
                          {b.label}
                        </td>
                        <td className="py-1.5 text-emerald-400/90">
                          {b.transitMin}m
                        </td>
                        <td className="py-1.5 text-slate-300">{b.ccrRun}m</td>
                        <td className="py-1.5 text-emerald-300">
                          {b.sp}
                          {b.spBoosted && (
                            <span className="ml-1 text-[9px] bg-emerald-500/30 text-emerald-200 px-1 py-0.5 rounded">
                              ↑SP
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-purple-300 font-semibold">
                          {b.ccrDil}
                          {b.ccrSwitched && (
                            <span className="ml-1 text-[9px] bg-purple-500/30 text-purple-200 px-1 py-0.5 rounded">
                              FLUSH
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-amber-300/90">
                          {b.transitMin}m
                        </td>
                        <td className="py-1.5 text-amber-200/80">{b.ocRun}m</td>
                        <td className="py-1.5 text-cyan-300 font-semibold">
                          {b.ocGas}
                          {b.ocSwitched && (
                            <span className="ml-1 text-[9px] bg-cyan-500/30 text-cyan-200 px-1 py-0.5 rounded">
                              SW
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* 5. Decompression Stops & Shallow Switch Depths */}
                    {unifiedBothRows.stopRows.map((row) => (
                      <tr
                        key={row.depth}
                        className={
                          row.ccrSwitched || row.ocSwitched || row.spBoosted
                            ? "bg-slate-800/40"
                            : ""
                        }
                      >
                        <td className="py-1.5 font-bold text-white">
                          {row.depth} ft{" "}
                          {row.ccrStop || row.boStop ? "Stop" : "Switch"}
                        </td>
                        <td className="py-1.5 text-emerald-400 font-bold">
                          {row.ccrStop ? `${row.ccrStop.timeMin}m` : "Pass"}
                        </td>
                        <td className="py-1.5 text-slate-300">
                          {row.ccrStop ? `${row.ccrStop.runTimeMin}m` : "-"}
                        </td>
                        <td className="py-1.5 text-emerald-300">
                          {row.sp}
                          {row.spBoosted && (
                            <span className="ml-1 text-[9px] bg-emerald-500/30 text-emerald-200 px-1 py-0.5 rounded">
                              ↑SP
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-purple-300 font-semibold">
                          {row.ccrDil}
                          {row.ccrSwitched && (
                            <span className="ml-1 text-[9px] bg-purple-500/30 text-purple-200 px-1 py-0.5 rounded">
                              FLUSH
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-amber-300 font-bold">
                          {row.boStop ? `${row.boStop.timeMin}m` : "Pass"}
                        </td>
                        <td className="py-1.5 text-amber-200/80">
                          {row.boStop ? `${row.boStop.runTimeMin}m` : "-"}
                        </td>
                        <td className="py-1.5 text-cyan-300 font-semibold">
                          {row.ocGas}
                          {row.ocSwitched && (
                            <span className="ml-1 text-[9px] bg-cyan-500/30 text-cyan-200 px-1 py-0.5 rounded">
                              SW
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
              <span>
                CCR CNS: {ccrPlan.totalCns}% | OTU: {ccrPlan.totalOtu}
              </span>
              <span>OC Bailout CNS: {ocBailoutPlan.totalCns}%</span>
            </div>
          </div>
        </>
      )}

      {/* SUBTAB 2: SUBSURFACE PLAN VS. ACTUAL DEBRIEF */}
      {subTab === "compare" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Import Subsurface-Mobile Dive Log (.ssrf / .uddf / .xml)
            </h3>
            <p className="text-xs text-slate-400">
              Sync your Petrel 3 or Perdix 2 to Subsurface-mobile on your phone,
              export the dive as XML/SSRF, and load it below to compare against
              your current {safeDepthFt}ft / {safeBottomMin}m plan.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex-1 cursor-pointer bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 rounded-xl p-3 text-center text-xs font-bold text-cyan-300 transition-all">
                Choose Subsurface File
                <input
                  type="file"
                  accept=".ssrf,.uddf,.xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={loadSimulatedP2Dive}
                className="px-4 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Load Sample P2 Dive
              </button>
            </div>
          </div>

          {coachingMetrics && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
                  LOG: {logName}
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {actualSamples.length} Samples Parsed
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    MAX DEPTH
                  </span>
                  <span className="text-sm font-bold text-white">
                    {coachingMetrics.maxActualDepth}ft{" "}
                    <span className="text-[10px] text-slate-500">
                      (Plan {safeDepthFt}ft)
                    </span>
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    FULL RUN TIME
                  </span>
                  <span className="text-sm font-bold text-white">
                    {coachingMetrics.actualRuntime}m{" "}
                    <span className="text-[10px] text-slate-500">
                      (Plan {ccrPlan.totalRunTimeMin}m)
                    </span>
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    CELL SPREAD
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    {coachingMetrics.maxCellSpread} ata
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {coachingMetrics.suggestions.map((sug, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      sug.status === "good"
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
                        : sug.status === "warn"
                        ? "bg-amber-950/40 border-amber-500/40 text-amber-100"
                        : "bg-red-950/40 border-red-500/40 text-red-100"
                    }`}
                  >
                    {sug.status === "good" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{sug.title}</div>
                      <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                        {sug.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}