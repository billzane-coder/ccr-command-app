"use client";

import React, { useState } from "react";
import {
  Play,
  ShieldAlert,
  CheckSquare,
  Compass,
  ChevronRight,
  Home,
} from "lucide-react";

import DecoPlanner from "../components/decoplanner";
import RunWizard from "../components/runwizard";
import DrillSimulator from "../components/drillsimulator";
import ChecklistManager from "../components/checklistmanager";

type ActiveModule = "home" | "runup" | "drills" | "checklists" | "planner";

export default function CCRCommandHome() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("home");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* TOP MOBILE NAVIGATION HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setActiveModule("home")}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white">
              P2 LOOP COMMAND
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              CCR DECO, RUN-UP & DRILL SUITE
            </p>
          </div>
        </button>

        {activeModule !== "home" && (
          <button
            onClick={() => setActiveModule("home")}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 border border-slate-700 flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Dashboard
          </button>
        )}
      </header>

      {/* MAIN MOBILE VIEWPORT CONTAINER */}
      <main className="flex-1 flex flex-col max-w-md w-full mx-auto p-4">
        {activeModule === "home" && (
          <div className="flex-1 flex flex-col justify-between gap-4 py-1">
            {/* Status Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase text-cyan-400 font-bold">
                  UNIT PROFILE: PRISM 2 (SHEARWATER)
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  LOCAL STORAGE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select a module below. Rig preferences (HUD vs. NERD 2, BMCL vs.
                FMCL) and custom checklist items persist on your phone.
              </p>
            </div>

            {/* 4 LARGE MOBILE-FRIENDLY COMMAND BUTTONS */}
            <div className="grid grid-cols-1 gap-3.5 my-auto">
              {/* 1. RUN-UP & PRE-BREATH WIZARD */}
              <button
                onClick={() => setActiveModule("runup")}
                className="group relative overflow-hidden bg-gradient-to-br from-emerald-950/90 to-slate-900 border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Play className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block">
                        Step-by-Step Confirmation Cards
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Run-Up & Pre-Breath
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        HUD/NERD 2 toggle, cracked-DSV flow flush, mV & timers
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-emerald-400 shrink-0" />
                </div>
              </button>

              {/* 2. EMERGENCY DRILL SIMULATOR */}
              <button
                onClick={() => setActiveModule("drills")}
                className="group relative overflow-hidden bg-gradient-to-br from-amber-950/80 to-slate-900 border-2 border-amber-500/40 hover:border-amber-400 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block">
                        Tec 40 / Tec 60 / P2 Scenarios
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Emergency Drills
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Randomized live-typing loop failures & bailout decisions
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-amber-400 shrink-0" />
                </div>
              </button>

              {/* 3. CUSTOMIZABLE CHECKLISTS */}
              <button
                onClick={() => setActiveModule("checklists")}
                className="group relative overflow-hidden bg-gradient-to-br from-cyan-950/80 to-slate-900 border-2 border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
                      <CheckSquare className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 block">
                        User-Editable Lists
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Build, GDMOITL & Post-Dive
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Assembly, 7-point planning, Steramine & custom user steps
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-cyan-400 shrink-0" />
                </div>
              </button>

              {/* 4. ZHL-16C DECO & SUBSURFACE LOG ANALYZER */}
              <button
                onClick={() => setActiveModule("planner")}
                className="group relative overflow-hidden bg-gradient-to-br from-purple-950/80 to-slate-900 border-2 border-purple-500/40 hover:border-purple-400 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                      <Compass className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 block">
                        Bühlmann ZHL-16C + Subsurface Debrief
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Deco & Log Analyzer
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        CCR vs. OC Bailout tables, END/Density & Plan-vs-Actual
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-purple-400 shrink-0" />
                </div>
              </button>
            </div>

            <footer className="text-center text-[10px] text-slate-500 pt-2 leading-relaxed">
              Independent training & planning companion. Not affiliated with
              Hollis, PADI, or Shearwater Research. Always verify against
              official manuals and primary dive computers.
            </footer>
          </div>
        )}

       {activeModule === "runup" && (
          <RunWizard onComplete={() => setActiveModule("home")} />
        )}
        {activeModule === "drills" && <DrillSimulator />}
        {activeModule === "checklists" && <ChecklistManager />}
        {activeModule === "planner" && <DecoPlanner />}
      </main>
    </div>
  );
}