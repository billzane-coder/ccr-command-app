"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  ShieldAlert,
  CheckSquare,
  Compass,
  ChevronRight,
  Home,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import DecoPlanner from "../components/decoplanner";
import RunWizard from "../components/runwizard";
import DrillSimulator from "../components/drillsimulator";
import ChecklistManager from "../components/checklistmanager";

type ActiveModule = "home" | "runup" | "drills" | "checklists" | "planner";

export default function CCRCommanderApp() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("home");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(0);

  // Check if already accepted during this active app session
  useEffect(() => {
    try {
      const accepted = sessionStorage.getItem("ccr_commander_accepted_v1");
      if (accepted === "true") {
        setDisclaimerAccepted(true);
      }
    } catch {
      // Ignore storage restrictions
    } finally {
      setCheckingSession(false);
    }
  }, []);

  // Animate the tactical "LOADING SYSTEM DATA..." bar to 100%
  useEffect(() => {
    if (disclaimerAccepted) return;
    setLoadProgress(12);
    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(100, prev + 11);
      });
    }, 90);
    return () => clearInterval(interval);
  }, [disclaimerAccepted]);

  const handleAcceptDisclaimer = () => {
    try {
      sessionStorage.setItem("ccr_commander_accepted_v1", "true");
    } catch {
      // Ignore storage restrictions
    }
    setDisclaimerAccepted(true);
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  // =========================================================================
  // FULL-SCREEN TACTICAL SPLASH & CRITICAL DISCLAIMER GATE (NO TOP BAR)
  // =========================================================================
  if (!disclaimerAccepted) {
    const isReady = loadProgress >= 100;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between px-4 py-6 relative overflow-hidden select-none">
        {/* Underwater Sunbeams & Tactical Grid Backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.32) 0%, rgba(15,23,42,0.6) 55%, rgba(2,6,23,1) 85%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* 1. BRANDING HEADER */}
        <div className="relative z-10 text-center pt-2">
          <div className="inline-flex items-center justify-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl font-black tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow">
              CCR
            </span>

            {/* Tactical Rebreather Target Emblem */}
            <span className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-cyan-400/80 bg-cyan-950/60 shadow-[0_0_15px_rgba(34,211,238,0.45)]">
              <span className="w-4 h-4 rounded-full border border-cyan-300 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </span>
            </span>

            <span className="text-3xl sm:text-4xl font-black tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow">
              COMMANDER
            </span>
          </div>

          <p className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.22em] text-cyan-300 uppercase mt-1.5">
            THE ULTIMATE REBREATHER COMPANION
          </p>
        </div>

        {/* 2. HOLOGRAPHIC WIREFRAME CCR LOOP, DSV, HOSES & CANISTER SVG */}
        <div className="relative z-10 w-full max-w-sm mx-auto my-2 flex flex-col items-center">
          <svg
            viewBox="0 0 420 225"
            className="w-full h-auto drop-shadow-[0_0_18px_rgba(34,211,238,0.28)]"
            fill="none"
          >
            <defs>
              <linearGradient id="cyanWire" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="sorbGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Ambient Rising Micro-Bubbles */}
            <circle cx="52" cy="45" r="2.5" stroke="#67e8f9" strokeOpacity="0.45" />
            <circle cx="64" cy="28" r="1.5" fill="#67e8f9" fillOpacity="0.4" />
            <circle cx="366" cy="52" r="3" stroke="#67e8f9" strokeOpacity="0.45" />
            <circle cx="354" cy="30" r="1.8" fill="#67e8f9" fillOpacity="0.4" />
            <circle cx="75" cy="185" r="2" stroke="#67e8f9" strokeOpacity="0.35" />
            <circle cx="348" cy="190" r="2.2" stroke="#67e8f9" strokeOpacity="0.35" />

            {/* Left Cylinder / Regulator Pod Wireframe */}
            <g stroke="url(#cyanWire)" strokeWidth="1.2">
              <rect x="28" y="88" width="44" height="82" rx="10" fill="#0f172a" fillOpacity="0.75" />
              <line x1="28" y1="108" x2="72" y2="108" strokeOpacity="0.5" />
              <line x1="28" y1="150" x2="72" y2="150" strokeOpacity="0.5" />
              <circle cx="50" cy="184" r="9" fill="#020617" />
            </g>

            {/* Right Radial Scrubber Canister & Copper Sorb Bed */}
            <g stroke="url(#cyanWire)" strokeWidth="1.3">
              <rect x="336" y="68" width="60" height="96" rx="12" fill="#0f172a" fillOpacity="0.8" />
              <rect
                x="342"
                y="82"
                width="48"
                height="36"
                rx="4"
                fill="url(#sorbGlow)"
                stroke="#fbbf24"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
              <ellipse cx="366" cy="138" rx="24" ry="8" strokeOpacity="0.6" />
              <line x1="366" y1="68" x2="366" y2="164" strokeOpacity="0.4" />
            </g>

            {/* Left & Right Counterlungs + Bottom T-Pieces */}
            <rect
              x="92"
              y="62"
              width="70"
              height="108"
              rx="18"
              fill="#0f172a"
              fillOpacity="0.7"
              stroke="url(#cyanWire)"
              strokeWidth="1.4"
            />
            <rect
              x="258"
              y="62"
              width="70"
              height="108"
              rx="18"
              fill="#0f172a"
              fillOpacity="0.7"
              stroke="url(#cyanWire)"
              strokeWidth="1.4"
            />
            {/* Bottom Drain / MAV T-Connectors */}
            <path
              d="M115 170 L115 196 M102 184 L128 184"
              stroke="#67e8f9"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M305 170 L305 196 M292 184 L318 184"
              stroke="#67e8f9"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Corrugated Left & Right Breathing Loop Hoses */}
            <path
              d="M172 62 C112 42, 76 92, 108 134 C132 162, 182 152, 210 152"
              stroke="#0e7490"
              strokeWidth="24"
              strokeLinecap="round"
            />
            <path
              d="M172 62 C112 42, 76 92, 108 134 C132 162, 182 152, 210 152"
              stroke="#67e8f9"
              strokeWidth="20"
              strokeDasharray="3 5"
              strokeLinecap="round"
            />

            <path
              d="M248 62 C308 42, 344 92, 312 134 C288 162, 238 152, 210 152"
              stroke="#0e7490"
              strokeWidth="24"
              strokeLinecap="round"
            />
            <path
              d="M248 62 C308 42, 344 92, 312 134 C288 162, 238 152, 210 152"
              stroke="#67e8f9"
              strokeWidth="20"
              strokeDasharray="3 5"
              strokeLinecap="round"
            />

            {/* Center Lower Loop Coupling */}
            <rect
              x="182"
              y="138"
              width="56"
              height="28"
              rx="6"
              fill="#020617"
              stroke="#67e8f9"
              strokeWidth="1.6"
            />
            <line x1="200" y1="138" x2="200" y2="166" stroke="#22d3ee" strokeWidth="1.2" />
            <line x1="220" y1="138" x2="220" y2="166" stroke="#22d3ee" strokeWidth="1.2" />

            {/* Top Center DSV / BOV Mouthpiece Assembly */}
            <g>
              {/* Mouthpiece Bite Strap */}
              <path
                d="M190 22 L230 22 L224 40 L196 40 Z"
                fill="#0f172a"
                stroke="#67e8f9"
                strokeWidth="1.5"
              />
              {/* DSV Barrel Body */}
              <rect
                x="172"
                y="44"
                width="76"
                height="40"
                rx="10"
                fill="#020617"
                stroke="#67e8f9"
                strokeWidth="1.8"
              />
              <circle
                cx="210"
                cy="64"
                r="16"
                fill="#083344"
                stroke="#22d3ee"
                strokeWidth="1.4"
              />
              <text
                x="210"
                y="68"
                textAnchor="middle"
                fill="#cffafe"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="1"
              >
                DSV
              </text>
            </g>
          </svg>

          {/* Animated System Data Loader */}
          <div className="w-full max-w-xs flex flex-col items-center mt-1 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-200 uppercase">
              <Loader2
                className={`w-4 h-4 text-cyan-400 ${
                  isReady ? "" : "animate-spin"
                }`}
              />
              <span>
                {isReady
                  ? `SYSTEM DATA READY • ${loadProgress}%`
                  : `LOADING SYSTEM DATA... ${loadProgress}%`}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900/90 border border-slate-700 rounded-full p-0.5 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-600 via-amber-500 to-amber-300 transition-all duration-150 shadow-[0_0_12px_rgba(245,158,11,0.75)]"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. HAZARD-STRIPED CRITICAL DISCLAIMER BOX & AGREE BUTTON */}
        <div className="relative z-10 w-full max-w-md space-y-4">
          <div className="bg-slate-900/95 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            {/* Tactical Hazard-Striped Banner */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950 px-3 py-2">
              <div
                className="h-3 flex-1 rounded-sm opacity-80"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, #b45309, #b45309 6px, #090d16 6px, #090d16 12px)",
                }}
              />
              <span className="px-3 text-xs font-mono font-extrabold tracking-[0.18em] text-slate-200 uppercase shrink-0">
                CRITICAL DISCLAIMER
              </span>
              <div
                className="h-3 flex-1 rounded-sm opacity-80"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, #b45309, #b45309 6px, #090d16 6px, #090d16 12px)",
                }}
              />
            </div>

            {/* Warning Copy */}
            <div className="p-4 text-center space-y-2.5">
              <p className="text-xs text-slate-200 leading-relaxed">
                <strong className="text-amber-400 font-bold">WARNING:</strong>{" "}
                This application is <strong className="text-white">NOT</strong>{" "}
                a substitute for formal training, certification, or hands-on
                instruction from an authorized instructor. Closed Circuit
                Rebreather (CCR) diving carries inherent risks of serious injury
                or death. This app is meant solely as a digital utility for
                certified, active divers to help them stay sharp and keep their
                tools in one place.
              </p>
              <p className="text-[11px] font-semibold text-cyan-200/90 pt-1 border-t border-slate-800">
                By continuing, you confirm you are a certified CCR diver and
                accept all terms.
              </p>
            </div>
          </div>

          {/* Glowing Tactical Enter Button */}
          <button
            disabled={!isReady}
            onClick={handleAcceptDisclaimer}
            className={`w-full py-4 rounded-2xl font-mono font-extrabold text-sm tracking-[0.16em] uppercase transition-all flex items-center justify-center gap-2 border-2 ${
              isReady
                ? "bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.45)] active:scale-[0.98]"
                : "bg-slate-900 border-slate-800 text-slate-500 cursor-wait"
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>I AGREE • ENTER APP</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN CCR COMMANDER APPLICATION SHELL
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* APP NAVIGATION HEADER */}
      <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setActiveModule("home")}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <div>
            <h1 className="text-sm font-black tracking-[0.14em] uppercase text-white">
              CCR COMMANDER
            </h1>
            <p className="text-[10px] text-cyan-400 font-mono">
              THE ULTIMATE REBREATHER COMPANION
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

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 flex flex-col max-w-md w-full mx-auto p-4">
        {activeModule === "home" && (
          <div className="flex-1 flex flex-col justify-between gap-4 py-1">
            {/* Unit Profile Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono uppercase text-cyan-400 font-bold">
                  RIG PROFILE: HOLLIS PRISM 2
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  OFFLINE STORAGE READY
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select a module below. Rig preferences (HUD vs. NERD 2, BMCL vs.
                FMCL), tank locker, and custom checklists persist locally on
                your device.
              </p>
            </div>

            {/* 4 COMMAND MODULES */}
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
                        10-Step Confirmation Cards
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Run-Up & Pre-Breath
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        HUD/NERD 2 toggle, cracked-DSV O2 flush, mV & timers
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
                        60 Hard-Mode CCR & P2 Scenarios
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Emergency Drills
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Shuffled loop failures, raw telemetry & bailout calls
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
                        Scratch Assembly to Storage
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Bench Build, Plan & Post-Dive
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        P2 build steps, partner check, Steramine & custom items
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
                        Bühlmann ZHL-16C + Log Debrief
                      </span>
                      <h2 className="text-xl font-bold text-white">
                        Deco & Bailout Planner
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Smart stage sizing, Tank Locker, SP boost & log analyzer
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-purple-400 shrink-0" />
                </div>
              </button>
            </div>

            <footer className="text-center text-[10px] text-slate-500 pt-2 space-y-1 leading-relaxed">
              <p>
                CCR Commander — Independent utility for certified CCR divers.
                Always verify against official manuals and primary dive
                computers.
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem("ccr_commander_accepted_v1");
                  setDisclaimerAccepted(false);
                }}
                className="text-amber-400/80 hover:text-amber-300 underline font-mono"
              >
                View Splash & Critical Disclaimer
              </button>
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