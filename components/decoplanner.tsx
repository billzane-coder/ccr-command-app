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
} from "lucide-react";
import {
  GasMix,
  evaluateDiluentAtDepth,
  runDecoSimulation,
} from "../lib/decoEngine";

interface ExtendedGasMix extends GasMix {
  maxPo2Limit: number; // 1.4 or 1.6 for OC MOD calculation
  ccrSwitchDepthFt: number; // Depth at which to plumb & flush into CCR loop on ascent
}

interface FavoritePlan {
  id: string;
  name: string;
  bottomDepthFt: number;
  bottomTimeMin: number;
  setpoint: number;
  gfLow: number;
  gfHigh: number;
  dilO2: number;
  dilHe: number;
  workingSac: number;
  decoSac: number;
  includeReserve: boolean;
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

// Helper: Calculate MOD in feet from O2% and Max PO2 (rounded down to 10ft stop increment)
function calcModFt(o2Pct: number, maxPo2: number): number {
  const fo2 = Math.max(0.05, o2Pct / 100);
  const rawFt = (maxPo2 / fo2 - 1) * 33;
  return Math.max(10, Math.floor(rawFt / 10) * 10);
}

export default function DecoPlanner() {
  const [subTab, setSubTab] = useState<"planner" | "compare">("planner");

  // Dive Profile Inputs
  const [bottomDepthFt, setBottomDepthFt] = useState<number>(150);
  const [bottomTimeMin, setBottomTimeMin] = useState<number>(25);
  const [setpoint, setSetpoint] = useState<number>(1.3);
  const [gfLow, setGfLow] = useState<number>(30);
  const [gfHigh, setGfHigh] = useState<number>(85);
  const [dilO2, setDilO2] = useState<number>(16);
  const [dilHe, setDilHe] = useState<number>(35);

  // SAC / RMV & Reserve Settings
  const [workingSac, setWorkingSac] = useState<number>(0.65);
  const [decoSac, setDecoSac] = useState<number>(0.5);
  const [includeThirdsReserve, setIncludeThirdsReserve] = useState<boolean>(true);

  // Offboard Bailout & Plumb-In Ascent Diluent Cylinders
  const [gases, setGases] = useState<ExtendedGasMix[]>([
    {
      id: "g1",
      name: "TMx 18/34",
      o2: 18,
      he: 34,
      n2: 48,
      maxPo2Limit: 1.4,
      switchDepthFt: 220,
      ccrSwitchDepthFt: 150,
      tankSizeCuFt: 80,
      workingPsi: 3000,
      isUsedAsDiluentOnAscent: true,
    },
    {
      id: "g2",
      name: "TMx 50/21",
      o2: 50,
      he: 21,
      n2: 29,
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

  // Tank Builder / Editor State (Click any tank to edit)
  const [editingGasId, setEditingGasId] = useState<string | null>(null);
  const [formO2, setFormO2] = useState<number>(32);
  const [formHe, setFormHe] = useState<number>(0);
  const [formMaxPo2, setFormMaxPo2] = useState<number>(1.4);
  const [formSwitchFt, setFormSwitchFt] = useState<number>(100);
  const [formCcrSwitchFt, setFormCcrSwitchFt] = useState<number>(70);
  const [formTankCuFt, setFormTankCuFt] = useState<number>(80);
  const [formWorkingPsi, setFormWorkingPsi] = useState<number>(3000);
  const [formPlumbIn, setFormPlumbIn] = useState<boolean>(false);

  // Favorites State (Saved in localStorage)
  const [favorites, setFavorites] = useState<FavoritePlan[]>([]);
  const [favName, setFavName] = useState<string>("");

  // Subsurface Plan vs. Actual Telemetry State
  const [actualSamples, setActualSamples] = useState<TelemetrySample[]>([]);
  const [logName, setLogName] = useState<string>("");

  // Load saved favorites on mount
  useEffect(() => {
    const saved = localStorage.getItem("p2_deco_favorites_v1");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveFavoritesToStorage = (updated: FavoritePlan[]) => {
    setFavorites(updated);
    localStorage.setItem("p2_deco_favorites_v1", JSON.stringify(updated));
  };

  // Auto-calculate MOD & CCR Flush Depth whenever O2% or Max PO2 changes in the form
  const handleFormO2orPo2Change = (newO2: number, newMaxPo2: number) => {
    setFormO2(newO2);
    setFormMaxPo2(newMaxPo2);
    const autoOcMod = calcModFt(newO2, newMaxPo2);
    const autoCcrFlushMod = calcModFt(newO2, 1.2); // CCR diluent flush target <= 1.2 PO2
    setFormSwitchFt(autoOcMod);
    setFormCcrSwitchFt(autoCcrFlushMod);
  };

  // Load a tank into the editor when clicked
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

  const saveOrAddGas = () => {
    const cleanO2 = Math.min(100, Math.max(5, formO2));
    const cleanHe = Math.min(100 - cleanO2, Math.max(0, formHe));
    const n2 = Math.max(0, 100 - cleanO2 - cleanHe);
    const label =
      cleanHe > 0
        ? `TMx ${cleanO2}/${cleanHe}`
        : cleanO2 === 100
        ? "O2 100%"
        : `EAN${cleanO2}`;

    const newEntry: ExtendedGasMix = {
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

    if (editingGasId) {
      setGases(gases.map((g) => (g.id === editingGasId ? newEntry : g)));
      setEditingGasId(null);
    } else {
      setGases([...gases, newEntry]);
    }
  };

  // One-click Add Suggested Low-O2 or High-O2 Bailout Mix
  const addSuggestedMix = (mixStr: string, isLowO2: boolean) => {
    // Parse "TMx 18/35"
    const nums = mixStr.replace("TMx", "").trim().split("/");
    const o2 = parseInt(nums[0], 10) || (isLowO2 ? 18 : 50);
    const he = parseInt(nums[1], 10) || 0;
    const n2 = Math.max(0, 100 - o2 - he);
    const po2Lim = isLowO2 ? 1.4 : 1.6;
    const modFt = calcModFt(o2, po2Lim);
    const ccrModFt = calcModFt(o2, 1.2);

    const newGas: ExtendedGasMix = {
      id: "sug_" + Date.now() + Math.random().toString(36).slice(2, 5),
      name: he > 0 ? `TMx ${o2}/${he}` : `EAN${o2}`,
      o2,
      he,
      n2,
      maxPo2Limit: po2Lim,
      switchDepthFt: modFt,
      ccrSwitchDepthFt: ccrModFt,
      tankSizeCuFt: 80,
      workingPsi: 3000,
      isUsedAsDiluentOnAscent: isLowO2,
    };
    setGases([...gases, newGas]);
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

  // Save & Load Favorites
  const saveCurrentAsFavorite = () => {
    const title =
      favName.trim() || `${bottomDepthFt}ft/${bottomTimeMin}m (${dilO2}/${dilHe})`;
    const fav: FavoritePlan = {
      id: "fav_" + Date.now(),
      name: title,
      bottomDepthFt,
      bottomTimeMin,
      setpoint,
      gfLow,
      gfHigh,
      dilO2,
      dilHe,
      workingSac,
      decoSac,
      includeReserve: includeThirdsReserve,
      gases,
    };
    saveFavoritesToStorage([fav, ...favorites]);
    setFavName("");
  };

  const loadFavorite = (fav: FavoritePlan) => {
    setBottomDepthFt(fav.bottomDepthFt);
    setBottomTimeMin(fav.bottomTimeMin);
    setSetpoint(fav.setpoint);
    setGfLow(fav.gfLow);
    setGfHigh(fav.gfHigh);
    setDilO2(fav.dilO2);
    setDilHe(fav.dilHe);
    setWorkingSac(fav.workingSac);
    setDecoSac(fav.decoSac);
    setIncludeThirdsReserve(fav.includeReserve);
    setGases(fav.gases);
    setEditingGasId(null);
  };

  const deleteFavorite = (id: string) => {
    saveFavoritesToStorage(favorites.filter((f) => f.id !== id));
  };

  // 1. Evaluate Diluent Physics at Bottom Depth
  const dilEval = useMemo(
    () => evaluateDiluentAtDepth(bottomDepthFt, dilO2, dilHe, setpoint),
    [bottomDepthFt, dilO2, dilHe, setpoint]
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
        bottomDepthFt,
        bottomTimeMin,
        setpoint,
        gfLowPct: gfLow,
        gfHighPct: gfHigh,
        bottomDil: { o2: dilO2, he: dilHe },
        ascentGases: ccrMappedGases,
        mode: "CCR",
        workingSacCuFtMin: workingSac,
        decoSacCuFtMin: decoSac,
      }),
    [
      bottomDepthFt,
      bottomTimeMin,
      setpoint,
      gfLow,
      gfHigh,
      dilO2,
      dilHe,
      ccrMappedGases,
      workingSac,
      decoSac,
    ]
  );

  // 3. Run Open-Circuit Bailout (OC) Deco Simulation
  const ocBailoutPlan = useMemo(
    () =>
      runDecoSimulation({
        bottomDepthFt,
        bottomTimeMin,
        setpoint,
        gfLowPct: gfLow,
        gfHighPct: gfHigh,
        bottomDil: { o2: dilO2, he: dilHe },
        ascentGases: gases,
        mode: "OC",
        workingSacCuFtMin: workingSac,
        decoSacCuFtMin: decoSac,
      }),
    [
      bottomDepthFt,
      bottomTimeMin,
      setpoint,
      gfLow,
      gfHigh,
      dilO2,
      dilHe,
      gases,
      workingSac,
      decoSac,
    ]
  );

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
        d = Math.round((t / 3) * bottomDepthFt);
      } else if (t <= bottomTimeMin) {
        d = bottomDepthFt + Math.round(Math.sin(t) * 4);
      } else {
        const matchStop = ccrPlan.stops.find((s) => t <= s.runTimeMin);
        d = matchStop ? matchStop.depthFt + (t % 2 === 0 ? 3 : -2) : 15;
      }

      const sp = t < 5 ? 0.7 : 1.3;
      const oscillation = d > 60 ? Math.sin(t * 1.4) * 0.11 : Math.sin(t) * 0.04;
      const basePo2 = Math.min(d / 33 + 1, sp + oscillation);

      sim.push({
        timeMin: t,
        depthFt: Math.max(0, d),
        cell1: Number(basePo2.toFixed(2)),
        cell2: Number((basePo2 + 0.02).toFixed(2)),
        cell3: Number((basePo2 > 1.2 ? basePo2 - 0.08 : basePo2 - 0.01).toFixed(2)),
        setpoint: sp,
      });
    }
    setActualSamples(sim);
  };

  const coachingMetrics = useMemo(() => {
    if (actualSamples.length === 0) return null;

    const maxActualDepth = Math.max(...actualSamples.map((s) => s.depthFt));
    const bottomSamples = actualSamples.filter(
      (s) => s.timeMin >= 4 && s.timeMin <= bottomTimeMin
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

    const firstHighSpSample = actualSamples.find((s) => s.setpoint >= 1.2);
    const spSwitchMin = firstHighSpSample ? firstHighSpSample.timeMin : 0;

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
          "Your bottom PPO2 fluctuated noticeably around setpoint. Avoid using counterlungs for buoyancy adjustments and keep minimum loop volume so the ADV doesn't inject uncommanded diluent on deep inhalations.",
      });
    } else {
      suggestions.push({
        status: "good",
        title: "Tight Loop Volume & Setpoint Control",
        detail: `Average loop PPO2 stayed within ±${avgPo2Deviation.toFixed(
          2
        )} ata of your ${setpoint} setpoint during the bottom phase.`,
      });
    }

    if (maxCellSpread >= 0.08) {
      suggestions.push({
        status: "alert",
        title: `Sensor Divergence Detected (${maxCellSpread.toFixed(
          2
        )} ata spread)`,
        detail:
          "Cell #3 tracked lower than Cells #1 and #2 at high PPO2. Inspect the head sensor holder for condensation on the Teflon face or check if Cell #3 is beginning to current-limit.",
      });
    } else {
      suggestions.push({
        status: "good",
        title: "All 3 O2 Cells Tracking Linearly",
        detail: `Max spread across all three sensors was only ${maxCellSpread.toFixed(
          2
        )} ata.`,
      });
    }

    if (spSwitchMin > 3.5) {
      suggestions.push({
        status: "warn",
        title: `Delayed High Setpoint Switch (Min ${spSwitchMin})`,
        detail:
          "Switching from 0.7 to 1.3 after reaching bottom increases inert gas loading in fast tissues during descent. Consider enabling Auto SP Up at 70ft on your Petrel/Perdix.",
      });
    }

    return {
      maxActualDepth,
      actualRuntime: actualSamples[actualSamples.length - 1]?.timeMin || 0,
      avgPo2Deviation: avgPo2Deviation.toFixed(2),
      maxCellSpread: maxCellSpread.toFixed(2),
      suggestions,
    };
  }, [actualSamples, bottomTimeMin, setpoint]);

  const plumbedInGases = gases.filter((g) => g.isUsedAsDiluentOnAscent);

  return (
    <div className="space-y-4">
      {/* Sub-navigation: Deco Planner vs. Subsurface Plan-vs-Actual */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setSubTab("planner")}
          className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === "planner"
              ? "bg-purple-500 text-slate-950"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Compass className="w-4 h-4" /> ZHL-16C Deco & Bailout
        </button>
        <button
          onClick={() => setSubTab("compare")}
          className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === "compare"
              ? "bg-cyan-500 text-slate-950"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" /> Plan vs. Actual Log
        </button>
      </div>

      {subTab === "planner" && (
        <>
          {/* SAVED FAVORITES BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" /> Saved Favorite Plans & Tank Fleets
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {favorites.length} Saved
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name current setup (e.g., 150ft Trimix + 2 AL80s)..."
                value={favName}
                onChange={(e) => setFavName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                onClick={saveCurrentAsFavorite}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Save Plan
              </button>
            </div>

            {favorites.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-1 pb-0.5">
                {favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 shrink-0"
                  >
                    <button
                      onClick={() => loadFavorite(fav)}
                      className="text-left text-xs font-semibold text-cyan-300 hover:text-white"
                    >
                      {fav.name}
                    </button>
                    <button
                      onClick={() => deleteFavorite(fav.id)}
                      className="text-slate-500 hover:text-red-400 ml-1"
                      title="Remove favorite"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1. PROFILE, DILUENT & SAC RATE INPUT CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-purple-400 font-bold">
                1. Profile, Onboard Diluent & SAC Rates
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Bühlmann ZHL-16C + GF
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  DEPTH (FT)
                </label>
                <input
                  type="number"
                  value={bottomDepthFt}
                  onChange={(e) => setBottomDepthFt(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-sm text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  BOT TIME (MIN)
                </label>
                <input
                  type="number"
                  value={bottomTimeMin}
                  onChange={(e) => setBottomTimeMin(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-sm text-white text-center font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  SETPOINT (ATA)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={setpoint}
                  onChange={(e) => setSetpoint(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-sm text-emerald-400 text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  DIL O2%
                </label>
                <input
                  type="number"
                  value={dilO2}
                  onChange={(e) => setDilO2(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-white text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  DIL HE%
                </label>
                <input
                  type="number"
                  value={dilHe}
                  onChange={(e) => setDilHe(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-white text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  GF LOW
                </label>
                <input
                  type="number"
                  value={gfLow}
                  onChange={(e) => setGfLow(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-cyan-400 text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  GF HIGH
                </label>
                <input
                  type="number"
                  value={gfHigh}
                  onChange={(e) => setGfHigh(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-mono text-xs text-cyan-400 text-center"
                />
              </div>
            </div>

            {/* CONSUMPTION RATE (SAC / RMV) INPUTS FOR BAILOUT */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-cyan-400 flex items-center gap-1 font-bold">
                  <Wind className="w-3.5 h-3.5" /> OC Bailout Consumption (SAC / RMV)
                </span>
                <button
                  onClick={() => setIncludeThirdsReserve(!includeThirdsReserve)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                    includeThirdsReserve
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-900 border-slate-700 text-slate-400"
                  }`}
                >
                  {includeThirdsReserve
                    ? "+1/3 Reserve (×1.5): ON"
                    : "Reserve: OFF (Raw Vol)"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    WORKING / ASCENT SAC (CUFT/MIN)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={workingSac}
                    onChange={(e) => setWorkingSac(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-xs text-white text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    DECO STOP SAC (CUFT/MIN)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={decoSac}
                    onChange={(e) => setDecoSac(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 font-mono text-xs text-white text-center"
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
                  Limit ≤130ft
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
                  @ {bottomDepthFt}ft
                </span>
              </div>
            </div>
          </div>

          {/* 2. OFFBOARD BAILOUT & PLUMB-IN ASCENT DILUENT FLEET */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-cyan-400 font-bold">
                2. Bailout & Plumb-In Ascent Tanks
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Tap any tank to edit
              </span>
            </div>

            {/* ONE-CLICK ACCEPT SUGGESTED BAILOUT TANKS */}
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-mono uppercase text-cyan-300 block">
                Recommended He/N2-Matched Offboard Tanks (Tap to Add):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addSuggestedMix(dilEval.idealLowBailout, true)}
                  className="py-2 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  Low-O2: {dilEval.idealLowBailout}
                </button>
                <button
                  onClick={() => addSuggestedMix(dilEval.idealHighBailout, false)}
                  className="py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  High-O2: {dilEval.idealHighBailout}
                </button>
              </div>
            </div>

            {/* TANK CARDS LIST */}
            <div className="space-y-2.5">
              {gases.map((g) => {
                const rawCuFt = ocBailoutPlan.gasUsageCuFt[g.name] || 0;
                const usedCuFt = Math.ceil(
                  includeThirdsReserve ? rawCuFt * 1.5 : rawCuFt
                );
                const psiPerCuFt = g.workingPsi / g.tankSizeCuFt;
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
                      {/* Clicking tank info loads it into editor */}
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

                    {/* DEDICATED CCR DILUENT PLUMB-IN LINE WHEN ENABLED */}
                    {g.isUsedAsDiluentOnAscent && (
                      <div className="bg-purple-950/30 border border-purple-500/40 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="font-mono text-[11px] text-purple-200">
                          <strong className="text-purple-300">
                            CCR DILUENT LINE:
                          </strong>{" "}
                          Plumb & Flush into loop on ascent at:
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={g.ccrSwitchDepthFt || g.switchDepthFt}
                            onChange={(e) =>
                              updateCcrSwitchDepth(g.id, Number(e.target.value))
                            }
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

            {/* CLEARLY LABELED TANK ADD / EDIT FORM */}
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
                  <input
                    type="number"
                    value={formO2}
                    onChange={(e) =>
                      handleFormO2orPo2Change(Number(e.target.value), formMaxPo2)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    HELIUM (%)
                  </label>
                  <input
                    type="number"
                    value={formHe}
                    onChange={(e) => setFormHe(Number(e.target.value))}
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
                  <input
                    type="number"
                    value={formSwitchFt}
                    onChange={(e) => setFormSwitchFt(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-xs text-center font-mono text-cyan-300 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                    TANK SIZE (CUFT)
                  </label>
                  <input
                    type="number"
                    value={formTankCuFt}
                    onChange={(e) => setFormTankCuFt(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">
                     RATED PSI
                  </label>
                  <input
                    type="number"
                    value={formWorkingPsi}
                    onChange={(e) => setFormWorkingPsi(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-center font-mono text-white"
                  />
                </div>
              </div>

              {/* Plumb-in toggle inside builder */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPlumbIn}
                    onChange={(e) => setFormPlumbIn(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span>Also plumb into loop as CCR Ascent Diluent</span>
                </label>

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

          {/* 3. SIDE-BY-SIDE CCR vs. OC BAILOUT SCHEDULE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                3. Deco Schedule (CCR vs. OC Bailout)
              </span>
              <span className="text-xs font-mono text-slate-300">
                CCR TTS:{" "}
                <strong className="text-emerald-400">
                  {ccrPlan.totalRunTimeMin}m
                </strong>{" "}
                | BO TTS:{" "}
                <strong className="text-amber-400">
                  {ocBailoutPlan.totalRunTimeMin}m
                </strong>
              </span>
            </div>

            {/* Active CCR Diluent Switch Summary Line */}
            <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 text-[11px] font-mono text-slate-300">
              <span className="text-purple-400 font-bold">
                CCR DILUENT SCHEDULE:{" "}
              </span>
              Start on Onboard{" "}
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
                  (No offboard tanks plumbed into loop for ascent)
                </span>
              )}
            </div>

            {ccrPlan.stops.length === 0 ? (
              <p className="text-xs font-mono text-emerald-400 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                No decompression stops required for this profile.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                      <th className="py-1.5">STOP</th>
                      <th className="py-1.5">CCR STOP</th>
                      <th className="py-1.5">CCR RUN</th>
                      <th className="py-1.5 text-purple-300">CCR DIL</th>
                      <th className="py-1.5">LOOP</th>
                      <th className="py-1.5 text-amber-400">OC BO STOP</th>
                      <th className="py-1.5 text-cyan-300">OC GAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ccrPlan.stops.map((s) => {
                      const boStop = ocBailoutPlan.stops.find(
                        (b) => b.depthFt === s.depthFt
                      );
                      return (
                        <tr key={s.depthFt}>
                          <td className="py-1.5 font-bold text-white">
                            {s.depthFt} ft
                          </td>
                          <td className="py-1.5 text-emerald-400 font-bold">
                            {s.timeMin}m
                          </td>
                          <td className="py-1.5 text-slate-300">
                            {s.runTimeMin}m
                          </td>
                          <td className="py-1.5 text-purple-300 font-semibold">
                            {s.activeGasName}
                          </td>
                          <td className="py-1.5 text-slate-400">
                            {s.loopFO2}/{s.loopFHe}
                          </td>
                          <td className="py-1.5 text-amber-300 font-bold">
                            {boStop ? `${boStop.timeMin}m` : "-"}
                          </td>
                          <td className="py-1.5 text-cyan-300">
                            {boStop ? boStop.activeGasName : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
              <span>
                CCR CNS: {ccrPlan.totalCns}% | OTU: {ccrPlan.totalOtu}
              </span>
              <span>OC Bailout CNS: {ocBailoutPlan.totalCns}%</span>
            </div>
          </div>
        </>
      )}

      {/* ==========================================
          SUBTAB 2: SUBSURFACE PLAN VS. ACTUAL DEBRIEF
         ========================================== */}
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
              your current {bottomDepthFt}ft / {bottomTimeMin}m plan.
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
                      (Plan {bottomDepthFt}ft)
                    </span>
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    RUNTIME
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
                <span className="text-[11px] font-mono uppercase text-slate-400 block">
                  Automated Telemetry Debrief & Suggestions:
                </span>
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