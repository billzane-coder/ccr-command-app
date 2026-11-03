"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Filter,
  Award,
  FastForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DRILL_SCENARIOS, DrillLevel } from "../lib/drillbank";

export default function DrillSimulator() {
  const [levelFilter, setLevelFilter] = useState<"ALL" | DrillLevel>("ALL");
  const [currentDrillIdx, setCurrentDrillIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });
  const [seenIds, setSeenIds] = useState<string[]>([]);

  const filteredDrills = useMemo(() => {
    if (levelFilter === "ALL") return DRILL_SCENARIOS;
    return DRILL_SCENARIOS.filter((d) => d.level === levelFilter);
  }, [levelFilter]);

  const activeDrill =
    filteredDrills[currentDrillIdx % filteredDrills.length] ||
    DRILL_SCENARIOS[0];

  // Typewriter effect whenever activeDrill changes
  useEffect(() => {
    if (!activeDrill) return;
    const fullText = activeDrill.scenarioText;
    setTypedText("");
    setIsTypingDone(false);
    setSelectedOption(null);

    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      if (i >= fullText.length) {
        setTypedText(fullText);
        setIsTypingDone(true);
        clearInterval(interval);
      } else {
        setTypedText(fullText.slice(0, i));
      }
    }, 18);

    return () => clearInterval(interval);
  }, [activeDrill]);

  // Smart Shuffle: Picks an unseen drill from the filtered pool first before repeating
  const randomizeNextDrill = () => {
    if (filteredDrills.length <= 1) return;
    const unseenIndices = filteredDrills
      .map((d, idx) => ({ id: d.id, idx }))
      .filter((item) => !seenIds.includes(item.id) && item.idx !== currentDrillIdx);

    if (unseenIndices.length > 0) {
      const pick =
        unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
      setSeenIds([...seenIds, pick.id]);
      setCurrentDrillIdx(pick.idx);
    } else {
      // Pool exhausted—reset deck and pick a random one
      const next = (currentDrillIdx + 1) % filteredDrills.length;
      setSeenIds([filteredDrills[next].id]);
      setCurrentDrillIdx(next);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    if (!seenIds.includes(activeDrill.id)) {
      setSeenIds([...seenIds, activeDrill.id]);
    }
    const isRight = activeDrill.options[idx].isCorrect;
    setScore((prev) => ({
      correct: prev.correct + (isRight ? 1 : 0),
      attempted: prev.attempted + 1,
    }));
  };

  return (
    <div className="flex-1 flex flex-col justify-between gap-3.5">
      {/* Top Filter & Score Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Certification / Rig Level (
            {filteredDrills.length} Scenarios)
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
            <Award className="w-3.5 h-3.5" />
            <span>
              Score: {score.correct}/{score.attempted}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {(
            [
              "ALL",
              "P2 Hardware",
              "Tec 40 CCR",
              "Tec 60 CCR",
              "Tec 100 CCR",
            ] as const
          ).map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setLevelFilter(lvl);
                setCurrentDrillIdx(0);
              }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all truncate ${
                levelFilter === lvl
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {lvl === "P2 Hardware" ? "P2 Rig" : lvl.replace(" CCR", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Shearwater Handset Telemetry Header */}
      <div className="bg-black border-2 border-slate-700 rounded-2xl p-3.5 font-mono shadow-inner">
        <div className="flex justify-between items-center text-[11px] text-cyan-400 border-b border-slate-800 pb-1.5 mb-2">
          <span>DEPTH: {activeDrill.depthFt} FT</span>
          <span>DIL: {activeDrill.diluent}</span>
          <span>SP: {activeDrill.setpoint}</span>
          <span className="text-amber-400">{activeDrill.level}</span>
        </div>

        <div className="grid grid-cols-3 text-center py-2 bg-slate-950 rounded-xl border border-slate-800 mb-2">
          {activeDrill.cells.map((c, idx) => {
            const num = parseFloat(c);
            const isDanger = isNaN(num) || num > 1.6 || num < 0.45;
            return (
              <div key={idx}>
                <span className="text-[10px] text-slate-500 block">
                  CELL {idx + 1}
                </span>
                <span
                  className={`text-xl font-bold ${
                    isDanger
                      ? "text-red-500 animate-pulse"
                      : "text-emerald-400"
                  }`}
                >
                  {c}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-center text-amber-300 bg-amber-950/30 py-1 px-2 rounded border border-amber-500/30">
          HUD / STATUS: {activeDrill.hudState}
        </div>
      </div>

      {/* Typewriter Scenario Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                SCENARIO #{(currentDrillIdx % filteredDrills.length) + 1} OF{" "}
                {filteredDrills.length} • {activeDrill.category}
              </span>
              <h3 className="text-sm font-bold text-amber-400">
                {activeDrill.title}
              </h3>
            </div>
            {!isTypingDone && (
              <button
                onClick={() => {
                  setTypedText(activeDrill.scenarioText);
                  setIsTypingDone(true);
                }}
                className="flex items-center gap-1 text-[11px] text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0"
              >
                <FastForward className="w-3 h-3" /> Skip
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-100 font-mono leading-relaxed min-h-[105px] bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {typedText}
            {!isTypingDone && (
              <span className="inline-block w-2 h-4 bg-amber-400 ml-1 animate-pulse" />
            )}
          </p>
        </div>

        {/* Multiple Choice Options Appear When Typing Finishes */}
        {isTypingDone && (
          <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              SELECT IMMEDIATE RESPONSE:
            </span>
            {activeDrill.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              let btnStyle =
                "bg-slate-950 border-slate-700 text-slate-200 hover:border-amber-500/50";
              if (selectedOption !== null) {
                if (opt.isCorrect) {
                  btnStyle =
                    "bg-emerald-950/90 border-emerald-500 text-emerald-100";
                } else if (isSelected && !opt.isCorrect) {
                  btnStyle = "bg-red-950/90 border-red-500 text-red-100";
                } else {
                  btnStyle = "bg-slate-950/40 border-slate-800 text-slate-500";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full p-3 rounded-xl border text-left text-xs leading-relaxed transition-all ${btnStyle}`}
                >
                  <div className="flex items-start justify-between gap-2 font-semibold">
                    <span>{opt.label}</span>
                    {selectedOption !== null && opt.isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {isSelected && !opt.isCorrect && (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                  {(isSelected || (selectedOption !== null && opt.isCorrect)) && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[11px] opacity-95 font-normal">
                      {opt.feedback}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation: Previous / Random Shuffle / Next */}
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            setCurrentDrillIdx(
              (currentDrillIdx - 1 + filteredDrills.length) %
                filteredDrills.length
            )
          }
          className="px-3.5 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center"
          title="Previous scenario"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={randomizeNextDrill}
          className="flex-1 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" /> Shuffle Unseen Scenario (
          {filteredDrills.length} Pool)
        </button>

        <button
          onClick={() =>
            setCurrentDrillIdx((currentDrillIdx + 1) % filteredDrills.length)
          }
          className="px-3.5 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center"
          title="Next scenario in order"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}