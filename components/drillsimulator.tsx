"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Filter,
  Award,
  FastForward,
} from "lucide-react";

interface DrillScenario {
  id: string;
  level: "Tec 40 CCR" | "Tec 60 CCR" | "P2 Hardware";
  category: string;
  title: string;
  depthFt: number;
  setpoint: number;
  diluent: string;
  cells: [string, string, string];
  hudState: string;
  scenarioText: string;
  options: {
    label: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

const DRILL_SCENARIOS: DrillScenario[] = [
  {
    id: "drill_runaway_o2_p2",
    level: "P2 Hardware",
    category: "Hyperoxia / Valve Diagnostics",
    title: "Uncommanded O2 Injection at 120ft (No Isolator Slider)",
    depthFt: 120,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["1.68", "1.71", "1.69"],
    hudState: "TOP RED BLINKING (7x) + RED BUDDY LIGHT PULSING",
    scenarioText:
      "You reach 120ft and switch your Petrel controller to 1.3 SP. Moments later, you hear continuous oxygen injection and watch your loop PPO2 climb past 1.68 across all three cells. Because the Prism 2 does not have an internal solenoid isolator slider, how do you safely stabilize the loop and diagnose whether the Solenoid or Manual O2 Add Block failed?",
    options: [
      {
        label:
          "A. Lower your electronic setpoint to 0.7 and exhale through your nose until the PPO2 drops.",
        isCorrect: false,
        feedback:
          "Incorrect. Lowering the electronic setpoint will not stop a mechanically stuck-open solenoid or leaking manual O2 valve, and waiting for metabolism or nose-venting against a continuous O2 feed risks CNS convulsions.",
      },
      {
        label:
          "B. Bail out to BOV/OC, shut the right-hand O2 tank valve, diluent flush the loop, disconnect the QD hose at the Manual O2 Addition Block, and briefly crack the O2 tank valve 1/2 turn while watching PPO2.",
        isCorrect: true,
        feedback:
          "Spot on. On a CCR without a solenoid slider, disconnecting the QD feed to the Manual O2 Block and cracking the O2 cylinder valve 1/2 turn isolates the fault: if PPO2 rises, the solenoid failed open (abort feathering the tank valve); if PPO2 stays steady, the manual valve leaked (leave it unplugged and let the solenoid run the ascent).",
      },
      {
        label:
          "C. Unplug the DiveCAN controller cable underwater so the SOLO board powers down the solenoid.",
        isCorrect: false,
        feedback:
          "Incorrect. While submerged, the SOLO board continues operating independently even if the handset is unplugged—and unplugging electronics will not stop a mechanical debris leak in the solenoid or MAV.",
      },
    ],
  },
  {
    id: "drill_stuck_cells",
    level: "Tec 40 CCR",
    category: "Oxygen Sensor Diagnostics",
    title: "Suspiciously Steady Sensor Readings at 110ft",
    depthFt: 110,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.20"],
    hudState: "2 GREEN BLINKS (STEADY)",
    scenarioText:
      "You are 35 minutes into a dive at 110ft. During your 1-to-2 minute instrument scan, you notice all three cells read an identical 1.20—and have not fluctuated by even 0.01 over your last several breaths, nor have you heard the solenoid fire recently. What is the danger and your immediate diagnostic step?",
    options: [
      {
        label:
          "A. Manually inject a burst of O2 first to see if the sensors climb above 1.20.",
        isCorrect: false,
        feedback:
          "Dangerous! If moisture has blocked the cell membranes or the cells are current-limited/stuck, the actual loop PPO2 might already be dangerously high, or injecting blind O2 could spike the loop into CNS toxicity without the display moving.",
      },
      {
        label:
          "B. Perform a Diluent Flush (replacing loop gas with known DilPO2) and breathe 3–4 times to verify all three sensors drop to the expected DilPO2 for 110ft.",
        isCorrect: true,
        feedback:
          "Correct. Sensors that do not fluctuate slightly with breathing may be 'stuck' due to condensation on the membranes. Flushing with diluent introduces a known safe gas with a lower PPO2, immediately proving whether the sensors respond accurately.",
      },
      {
        label:
          "C. Nothing is wrong—Shearwater PID controllers hold 1.20 with zero fluctuation at constant depth.",
        isCorrect: false,
        feedback:
          "Incorrect. Even with a PID controller, normal metabolic consumption and breathing cycles cause minor 0.01–0.03 fluctuations. Frozen numbers are a classic warning sign of unresponsive sensors.",
      },
    ],
  },
  {
    id: "drill_voting_failed",
    level: "P2 Hardware",
    category: "Electronics / Cells",
    title: "Cell Divergence & VOTING FAILED on Deco",
    depthFt: 100,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.45", "1.05", "1.52"],
    hudState: "MIXED BLINKS ACROSS COLUMNS",
    scenarioText:
      "While ascending to your 100ft stop, your handset center row turns yellow and alternates between [.45 / 1.05 / 1.52] and 'VOTING FAILED'. How does the P2 controller behave during VOTING FAILED, and what should you do?",
    options: [
      {
        label:
          "A. The solenoid stops firing completely and deco math defaults to the lowest cell (0.45). Check DilPO2, execute a diluent flush to see which cell matches known DilPO2, or bail out to OC.",
        isCorrect: true,
        feedback:
          "Spot on. When no two cells agree within 20%, voting fails: automatic O2 injection is disabled, and decompression calculations use the lowest sensor (down to 0.16). Flushing with known diluent reveals which cell is telling the truth.",
      },
      {
        label:
          "B. The controller averages all three cells (1.01) and keeps firing the solenoid normally.",
        isCorrect: false,
        feedback:
          "Incorrect. The P2 only averages cells that pass voting (within 20% of another cell). Once VOTING FAILED appears, the solenoid will not inject O2.",
      },
      {
        label:
          "C. Enter the Calibrate menu underwater to reset the drifting sensors.",
        isCorrect: false,
        feedback:
          "Incorrect. The Calibrate menu is locked out and hidden whenever the computer is in dive mode underwater.",
      },
    ],
  },
  {
    id: "drill_metabolic_o2_mode",
    level: "Tec 60 CCR",
    category: "Zero Sensor Data / Deco",
    title: "Metabolic Oxygen Replacement (O2 Rebreather Mode) at 20ft",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["FAIL", "FAIL", "FAIL"],
    hudState: "DARK / NO USEABLE SENSOR DATA",
    scenarioText:
      "After an electronics/sensor failure with an intact loop and good scrubber, you bailed out to OC and ascended to your 20ft (6m) stop. You have a long decompression remaining and want to conserve offboard gas by returning to the loop in pure O2 Metabolic Replacement Mode. How do you manage the loop at 20ft?",
    options: [
      {
        label:
          "A. Flush the loop thoroughly with 100% O2, set minimum loop, manually add O2 whenever the counterlung bottoms out, and completely re-flush with O2 every 15 minutes.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR protocol. At 20ft (6m) or shallower, 100% O2 cannot exceed 1.6 ata. Because your tissues are off-gassing nitrogen and helium into the loop as you decompress, you must completely re-flush with O2 every 15 minutes (and if the ADV ever triggers).",
      },
      {
        label:
          "B. Flush once with diluent and once with O2, then breathe normally without touching the valves until surfacing.",
        isCorrect: false,
        feedback:
          "Incorrect. Without replacing metabolized O2 manually, the loop volume will collapse and trigger the ADV (injecting low-O2 diluent at 20ft, risking hypoxia), and off-gassed inert gas will dilute the loop.",
      },
      {
        label:
          "C. Use Metabolic O2 Replacement starting at 50ft (15m) to save even more bailout gas.",
        isCorrect: false,
        feedback:
          "Fatal error! Pure oxygen at 50ft has a PPO2 of 2.5 ata. Metabolic O2 replacement without working sensors is strictly limited to 20ft (6m) or shallower (moving to 15ft/5m as soon as 20ft clears).",
      },
    ],
  },
  {
    id: "drill_semiclosed_offboard",
    level: "Tec 60 CCR",
    category: "Loss of O2 / Gas Extender",
    title: "Depleted O2 Supply & Offboard-Fed Semiclosed Ascent",
    depthFt: 140,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.72", "0.71", "0.73"],
    hudState: "3 YELLOW BLINKS (DROPPING)",
    scenarioText:
      "A blown high-pressure O-ring on your right-hand O2 first stage drains your onboard O2 cylinder at 140ft. Your scrubber and electronics are 100% intact, and your low-O2 offboard bailout cylinder (TMx 20/35) has an LP quick-disconnect feed hose. How do you execute a semiclosed ascent?",
    options: [
      {
        label:
          "A. Plug the offboard LP hose into the loop, wait until loop PPO2 drops to the offboard gas PPO2 at current depth, then cycle 3 breaths in and vent the 4th out your nose—and switch to full OC between 30ft and 20ft.",
        isCorrect: true,
        feedback:
          "Spot on. Connecting your low-O2 offboard cylinder gives you ample gas volume and higher O2% than onboard diluent. Wait until loop PPO2 drops to the supply gas PPO2 so you don't waste existing loop O2, flush every 4th breath (more frequently as you shallow), and go to full OC by 30ft–20ft where PPO2 drops rapidly.",
      },
      {
        label:
          "B. Immediately vent all gas from the loop at 140ft and stay on semiclosed breathing all the way onto the boat deck.",
        isCorrect: false,
        feedback:
          "Incorrect. Venting immediately wastes the 0.72 PPO2 gas already in the loop, and staying on semiclosed breathing in the final 20ft to the surface carries a severe risk of shallow-water hypoxia.",
      },
      {
        label:
          "C. Use semiclosed breathing even if you suspect the scrubber is also channeling.",
        isCorrect: false,
        feedback:
          "Never! Semiclosed breathing recycles gas through the canister and is ONLY valid when the loop and scrubber are 100% intact.",
      },
    ],
  },
  {
    id: "drill_wrong_gas_teammate",
    level: "Tec 60 CCR",
    category: "Team Rescue / NO TOX",
    title: "Teammate Bails Out onto High-O2 Bottle at 185ft",
    depthFt: 185,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.29", "1.30", "1.31"],
    hudState: "3 GREEN BLINKS (YOUR RIG NORMAL)",
    scenarioText:
      "At 185ft (56m), your teammate gets a red alarm, bails out off the loop, and deploys an offboard second stage without following the NO TOX procedure. As you move in to perform the 'X' (eXamine) step, you see the regulator hose goes to their high-O2 cylinder labeled 'TMx 50/24 — MAX DEPTH 60FT'. What do you do right now?",
    options: [
      {
        label:
          "A. Tap your teammate, point to the cylinder label, and help them unclip and deploy their own low-O2 regulator.",
        isCorrect: false,
        feedback:
          "Too slow! At 185ft, breathing 50% O2 exposes your teammate to a lethal PPO2 of 3.3+ ata—a CNS convulsion can strike within seconds. Do not waste time untangling their low-O2 regulator.",
      },
      {
        label:
          "B. Immediately deploy and hand your teammate YOUR OWN breathable low-O2 offboard second stage (pulling the toxic reg from their mouth if necessary), then sort out their regulators once they are breathing safe gas.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR protocol. At 185ft, 50% O2 is immediately life-threatening. Give them your own known-breathable low-O2 second stage immediately, then sort out their cylinders once they are safe.",
      },
      {
        label:
          "C. Signal your teammate to go back onto their CCR loop immediately.",
        isCorrect: false,
        feedback:
          "Incorrect. Your teammate bailed out due to a critical loop failure—forcing them back onto a potentially hypoxic, hyperoxic, or CO2-contaminated loop is unsafe.",
      },
    ],
  },
  {
    id: "drill_delayed_bailout_co2",
    level: "Tec 60 CCR",
    category: "Hypercapnia / Gas Sharing",
    title: "Delayed Bailout, Rapid Breathing & 50% Cylinder Trade",
    depthFt: 70,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["1.30", "1.30", "1.29"],
    hudState: "TEAMMATE BAILED OUT ON OC",
    scenarioText:
      "Your teammate had a scrubber channeling issue at depth but fought to stay on the loop with repeated diluent flushes before finally bailing out to OC. Now at 70ft with 35 minutes of deco left, they are breathing heavily at 3x their normal SAC rate and signal they have already used 50% of their bailout cylinder. Why is their breathing still elevated, and what is the team gas-sharing protocol?",
    options: [
      {
        label:
          "A. Systemic tissue CO2 load takes 30+ minutes to off-gas after delayed bailout. Trade cylinders with your teammate now at 50% remaining—showing the label and passing the 2nd stage first before unclipping and swapping tanks.",
        isCorrect: true,
        feedback:
          "Correct. Delaying bailout during a CO2/mushroom valve issue builds a massive tissue CO2 debt that keeps respiration 2x–3x normal for over 30 minutes. Trading cylinders at 50% ensures every diver on the team retains a working offboard bailout.",
      },
      {
        label:
          "B. Wait until your teammate's cylinder hits 0 psi before passing them your cylinder so you don't have to swap tanks twice.",
        isCorrect: false,
        feedback:
          "Incorrect. Letting a bailed-out diver drain a cylinder completely leaves whomever gets that empty cylinder with zero offboard bailout capability if a second emergency occurs.",
      },
      {
        label:
          "C. Have the teammate return to their CCR loop for 5 minutes at 70ft to calm their breathing down.",
        isCorrect: false,
        feedback:
          "Never! A channeling or breakthrough scrubber is 100% unrecoverable. Returning to the loop will rapidly spike their PCO2 toward black-out levels.",
      },
    ],
  },
  {
    id: "drill_cns_ventid_deco",
    level: "Tec 60 CCR",
    category: "Oxygen Toxicity",
    title: "Tunnel Vision & Facial Twitching on Deco at 30ft",
    depthFt: 30,
    setpoint: 1.3,
    diluent: "18/35",
    cells: ["1.31", "1.30", "1.32"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "While decompressing at 30ft (9m) after a long deep dive, you experience sudden tunnel vision, ringing in your ears, nausea, and a muscle twitch in your cheek. Which method of lowering your PPO2 is required?",
    options: [
      {
        label:
          "A. Switch your controller setpoint from 1.3 to 0.7 and let your metabolism gradually lower the loop PPO2.",
        isCorrect: false,
        feedback:
          "Incorrect! Metabolic oxygen consumption is far too slow when active VENTID symptoms are present—a full CNS convulsion can occur while you wait for the loop to drop.",
      },
      {
        label:
          "B. Immediately bail out to your LOWEST oxygen offboard bailout cylinder (using NO TOX), alert your team, and stay at a low PO2 for at least 15 minutes after all symptoms subside.",
        isCorrect: true,
        feedback:
          "Correct. Bailing out to your low-O2 offboard gas is the fastest possible way to drop inspired PO2. If the loop is intact and you later return to it, flush it thoroughly with diluent and run a low setpoint (<1.0) for the remainder of the dive.",
      },
      {
        label:
          "C. Bail out to your high-O2 deco cylinder (EAN50) to finish decompression faster.",
        isCorrect: false,
        feedback:
          "Incorrect! Breathing 50% O2 at 30ft gives you a PPO2 of 0.95 ata—much higher than your low-O2 trimix bailout gas (~0.35 ata at 30ft).",
      },
    ],
  },
  {
    id: "drill_omitted_deco_surface",
    level: "Tec 60 CCR",
    category: "Omitted Decompression",
    title: "Accidental Blow-Up from 20ft Stop (>1 Min on Surface)",
    depthFt: 0,
    setpoint: 1.3,
    diluent: "18/35",
    cells: ["0.95", "0.96", "0.95"],
    hudState: "MISSED DECO STOP ALARM FLASHING RED",
    scenarioText:
      "Two minutes into an 8-minute stop at 20ft (6m), a fouled chest strap depresses your drysuit inflator and floats you to the surface. It takes you 2.5 minutes at the surface to unjam the valve. You have zero DCS symptoms, ample gas/scrubber, and re-descend to 20ft where your computer shows 6 min @ 20ft and 12 min @ 15ft. What schedule should you actually follow?",
    options: [
      {
        label:
          "A. Follow the exact 6 min @ 20ft and 12 min @ 15ft shown on the screen, then exit.",
        isCorrect: false,
        feedback:
          "Incorrect. Because you were at the surface for MORE than 1 minute, standard omitted-decompression protocol requires multiplying the 20ft and final stops by 1.5x.",
      },
      {
        label:
          "B. Multiply both the 20ft (6m) stop and final 15ft (5m) stop by 1.5x (9 min @ 20ft + 18 min @ 15ft), plus extend the final stop as much as practicable.",
        isCorrect: true,
        feedback:
          "Correct! When surfacing from 20ft (6m) or shallower with no symptoms and taking MORE than 1 minute to return to stop depth, extend both the 20ft stop and final stop by 1.5x normal time, plus extra margin at the last stop.",
      },
      {
        label:
          "C. Do not re-descend—stay on the boat and drink fluids without oxygen.",
        isCorrect: false,
        feedback:
          "Incorrect. If you have no symptoms, functional gear, and return promptly, re-descending to complete extended stops prevents symptomatic bubble growth.",
      },
    ],
  },
  {
    id: "drill_unresponsive_diver_rescue",
    level: "Tec 40 CCR",
    category: "Rescue Procedures",
    title: "Unresponsive CCR Diver Underwater",
    depthFt: 55,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "1.19"],
    hudState: "VICTIM UNRESPONSIVE FACE-DOWN",
    scenarioText:
      "Your teammate becomes unresponsive at 55ft with the CCR mouthpiece still in their mouth. Before you turn the victim face-up and begin a controlled ascent to the surface, what is the critical first step with their mouthpiece/BOV and why?",
    options: [
      {
        label:
          "A. Pull the mouthpiece out of their mouth so expanding loop gas doesn't cause an embolism.",
        isCorrect: false,
        feedback:
          "Never remove a mouthpiece that is in an unconscious diver's mouth! Removing it drowns the airway and floods the CCR loop, making the rig up to 17 lbs negatively buoyant.",
      },
      {
        label:
          "B. Hold the mouthpiece in their mouth and CLOSE the loop (activating the BOV) BEFORE turning them upright, then ascend while venting their BCD/suit/loop as needed.",
        isCorrect: true,
        feedback:
          "Spot on. Closing the loop/activating the BOV before turning the victim upright prevents hydrostatic loop pressure from blowing the mouthpiece out of their mouth, keeps the loop from flooding (preserving buoyancy), and delivers clean open-circuit diluent if they take a breath.",
      },
      {
        label:
          "C. Leave the loop open in CC mode and press their manual O2 valve continuously on the way up.",
        isCorrect: false,
        feedback:
          "Incorrect. If the victim lost consciousness from hyperoxia, CO2, or hypoxia, leaving the loop open in CC mode keeps them on bad gas and risks flooding the loop if their jaw relaxes.",
      },
    ],
  },
  {
    id: "drill_solo_surface",
    level: "P2 Hardware",
    category: "DiveCAN Architecture",
    title: "Detached Wrist Display at Surface vs. Depth",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["---", "---", "---"],
    hudState: "3 YELLOW BLINKS (0.7 ATA)",
    scenarioText:
      "While gearing up on the boat bench before jumping in, a snag pulls the DiveCAN wrist display connector loose (locking sleeve O-rings were left off). Your HUD is still blinking 3 yellow flashes (0.7). Will the SOLO board keep firing the solenoid on the surface?",
    options: [
      {
        label:
          "A. Yes, the SOLO board maintains 0.7 setpoint at all times whether on the surface or underwater.",
        isCorrect: false,
        feedback:
          "Incorrect! Per the P2 DiveCAN architecture, independent SOLO solenoid control ONLY functions while submerged in a dive to prevent continuous surface firing and gas drain.",
      },
      {
        label:
          "B. No. Independent SOLO solenoid operation only works while submerged. Disconnection at the surface results in total loss of automatic solenoid control.",
        isCorrect: true,
        feedback:
          "Correct. At the surface, losing the wrist handset stops automatic solenoid control completely. Never breathe the loop on the surface with a disconnected handset, and always secure DiveCAN locking sleeves with both O-rings.",
      },
    ],
  },
  {
    id: "drill_adv_freeflow",
    level: "Tec 40 CCR",
    category: "Pneumatics / Diluent",
    title: "Runaway ADV / Manual Diluent Valve Freeflow",
    depthFt: 95,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["0.64", "0.65", "0.64"],
    hudState: "4 YELLOW BLINKS (DROPPING)",
    scenarioText:
      "At 95ft, you hear gas roaring continuously into your inhalation counterlung. Your loop volume balloons, making you positively buoyant, and your PPO2 drops toward 0.64 as the incoming diluent flushes out oxygen. How do you control the rig?",
    options: [
      {
        label:
          "A. Close the OPV completely so you don't waste gas, and press the manual O2 button to fight the diluent flow.",
        isCorrect: false,
        feedback:
          "Incorrect! Closing the OPV during a diluent freeflow will over-inflate your counterlungs and launch you toward the surface in a runaway buoyant ascent.",
      },
      {
        label:
          "B. Vent loop gas via nose/mouthpiece and OPV to prevent a buoyant runaway, bail out to offboard OC if needed to breathe comfortably, and shut down the left-hand Diluent tank valve (or disconnect the LP QD feed).",
        isCorrect: true,
        feedback:
          "Correct. Priority one is preventing a runaway ascent by venting excess loop/BCD gas. Once stable on your offboard bailout, shut down the left-side diluent cylinder valve (or unplug the leaking manual diluent QD) and abort the dive.",
      },
    ],
  },
];

export default function DrillSimulator() {
  const [levelFilter, setLevelFilter] = useState<
    "ALL" | "Tec 40 CCR" | "Tec 60 CCR" | "P2 Hardware"
  >("ALL");
  const [currentDrillIdx, setCurrentDrillIdx] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });

  const filteredDrills = useMemo(() => {
    if (levelFilter === "ALL") return DRILL_SCENARIOS;
    return DRILL_SCENARIOS.filter((d) => d.level === levelFilter);
  }, [levelFilter]);

  const activeDrill = filteredDrills[currentDrillIdx % filteredDrills.length];

  // Typewriter effect whenever activeDrill changes
  useEffect(() => {
    if (!activeDrill) return;
    const fullText = activeDrill.scenarioText;
    setTypedText("");
    setIsTypingDone(false);
    setSelectedOption(null);

    let i = 0;
    const interval = setInterval(() => {
      i += 2;
      if (i >= fullText.length) {
        setTypedText(fullText);
        setIsTypingDone(true);
        clearInterval(interval);
      } else {
        setTypedText(fullText.slice(0, i));
      }
    }, 20);

    return () => clearInterval(interval);
  }, [activeDrill]);

  const randomizeNextDrill = () => {
    if (filteredDrills.length <= 1) return;
    let next = Math.floor(Math.random() * filteredDrills.length);
    if (next === currentDrillIdx % filteredDrills.length) {
      next = (next + 1) % filteredDrills.length;
    }
    setCurrentDrillIdx(next);
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return; // Lock in first answer for score tracking
    setSelectedOption(idx);
    const isRight = activeDrill.options[idx].isCorrect;
    setScore((prev) => ({
      correct: prev.correct + (isRight ? 1 : 0),
      attempted: prev.attempted + 1,
    }));
  };

  return (
    <div className="flex-1 flex flex-col justify-between gap-3.5">
      {/* Top Filter & Score Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-amber-400 mr-1" />
          {(["ALL", "P2 Hardware", "Tec 40 CCR", "Tec 60 CCR"] as const).map(
            (lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setLevelFilter(lvl);
                  setCurrentDrillIdx(0);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  levelFilter === lvl
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          <Award className="w-3.5 h-3.5" />
          <span>
            {score.correct}/{score.attempted}
          </span>
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
            const isDanger =
              isNaN(num) || num > 1.6 || num < 0.45;
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
                {activeDrill.category}
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
                className="flex items-center gap-1 text-[11px] text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
              >
                <FastForward className="w-3 h-3" /> Skip Typing
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

      {/* Randomize Next Drill Button */}
      <button
        onClick={randomizeNextDrill}
        className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
      >
        <RotateCcw className="w-4 h-4" /> Randomize Next Scenario (
        {filteredDrills.length} in Pool)
      </button>
    </div>
  );
}