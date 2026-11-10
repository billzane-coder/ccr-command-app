"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  Sliders,
  Wrench,
  CheckSquare,
  X,
} from "lucide-react";

type SecondaryDisplay = "hud" | "nerd2";
type CounterlungType = "bmcl" | "fmcl";
type ChecklistTab = "build" | "plan" | "presplash" | "postdive";

interface ChecklistItem {
  id: string;
  phase: string;
  title: string;
  details: string[];
  criticalNote?: string;
  isCustom?: boolean;
}

export default function ChecklistManager() {
  const [activeTab, setActiveTab] = useState<ChecklistTab>("build");

  // Shared Rig Hardware Preferences (Synced with RunWizard)
  const [secondaryDisplay, setSecondaryDisplay] =
    useState<SecondaryDisplay>("hud");
  const [counterlungType, setCounterlungType] =
    useState<CounterlungType>("bmcl");

  // Checked State & Custom User Items (Persisted in localStorage)
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<
    Record<ChecklistTab, ChecklistItem[]>
  >({
    build: [],
    plan: [],
    presplash: [],
    postdive: [],
  });

  // Add Custom Item Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");

  useEffect(() => {
    try {
      const savedDisp = localStorage.getItem(
        "p2_pref_display"
      ) as SecondaryDisplay;
      const savedLung = localStorage.getItem(
        "p2_pref_lung"
      ) as CounterlungType;
      if (savedDisp === "hud" || savedDisp === "nerd2")
        setSecondaryDisplay(savedDisp);
      if (savedLung === "bmcl" || savedLung === "fmcl")
        setCounterlungType(savedLung);

      const savedChecks = localStorage.getItem("p2_checklists_checked_v2");
      if (savedChecks) setCheckedMap(JSON.parse(savedChecks));

      const savedCustom = localStorage.getItem("p2_checklists_custom_v2");
      if (savedCustom) setCustomItems(JSON.parse(savedCustom));
    } catch (e) {
      console.error("Failed loading checklist state:", e);
    }
  }, []);

  const updateDisplayPref = (val: SecondaryDisplay) => {
    setSecondaryDisplay(val);
    localStorage.setItem("p2_pref_display", val);
  };

  const updateLungPref = (val: CounterlungType) => {
    setCounterlungType(val);
    localStorage.setItem("p2_pref_lung", val);
  };

  const toggleCheck = (id: string) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    localStorage.setItem("p2_checklists_checked_v2", JSON.stringify(next));
  };

  const resetCurrentTabChecks = (itemsInTab: ChecklistItem[]) => {
    const next = { ...checkedMap };
    itemsInTab.forEach((item) => {
      delete next[item.id];
    });
    setCheckedMap(next);
    localStorage.setItem("p2_checklists_checked_v2", JSON.stringify(next));
  };

  const addCustomStep = () => {
    if (!newTitle.trim()) return;
    const item: ChecklistItem = {
      id: `custom_${activeTab}_${Date.now()}`,
      phase: "Custom User Step",
      title: newTitle.trim(),
      details: newDetail.trim() ? [newDetail.trim()] : [],
      isCustom: true,
    };
    const updated = {
      ...customItems,
      [activeTab]: [...(customItems[activeTab] || []), item],
    };
    setCustomItems(updated);
    localStorage.setItem("p2_checklists_custom_v2", JSON.stringify(updated));
    setNewTitle("");
    setNewDetail("");
    setShowAddForm(false);
  };

  const deleteCustomStep = (id: string) => {
    const updated = {
      ...customItems,
      [activeTab]: (customItems[activeTab] || []).filter((i) => i.id !== id),
    };
    setCustomItems(updated);
    localStorage.setItem("p2_checklists_custom_v2", JSON.stringify(updated));
  };

  // Built-in Hollis Prism 2 Checklists (Dynamically adapted to BMCL/FMCL & HUD/NERD2)
  const builtInLists = useMemo((): Record<ChecklistTab, ChecklistItem[]> => {
    const isNerd = secondaryDisplay === "nerd2";
    const isBmcl = counterlungType === "bmcl";

    return {
      // =====================================================================
      // TAB 1: HOLLIS PRISM 2 BENCH BUILD FROM SCRATCH (14 STEPS)
      // =====================================================================
      build: [
        {
          id: "b_01",
          phase: "1. Frame, Harness & Bucket",
          title: "Mount Backplate/Wing, Harness & Clear Scrubber Bucket",
          details: [
            "Secure clear urethane scrubber bucket to the backplate/spine frame and verify mounting hardware is tight.",
            "Inspect clear bucket walls for stress cracks, deep gouges, or chemical crazing.",
            "Check bottom compression spring post in base of bucket: verify 1 thread is exposed above the nylock nut.",
          ],
        },
        {
          id: "b_02",
          phase: "1. Frame, Harness & Bucket",
          title: "Seat Bottom Moisture Pad in Scrubber Bucket",
          details: [
            "Place circular bottom moisture absorption pad flat in the base of the clear bucket.",
            "Confirm pad edges are flat and do not bunch around the stainless steel compression spring.",
          ],
        },
        {
          id: "b_03",
          phase: "2. Radial Scrubber Packing",
          title: "Inspect Radial Scrubber Basket & Center Tube",
          details: [
            "Verify outer mesh screen, inner perforated center bore tube, and top plastic cap threads are clean and undamaged.",
            "Confirm zero dried soda lime dust in cap threads (soak threads 15 min in white vinegar if crusty).",
          ],
        },
        {
          id: "b_04",
          phase: "2. Radial Scrubber Packing",
          title: "Pack Radial Scrubber (~5.5 lb / 8–12 Mesh Absorbent)",
          details: [
            "Cover/plug the open center bore tube so zero caustic granules fall inside the central gas channel.",
            "Pour fresh 8–12 mesh absorbent to ~50% height, tap sides gently to settle, then fill flush to the top inner lip (never pound or crush granules).",
            "Seat top foam compression pad flat over the bed, thread plastic lid down flush until snug, blow out loose dust, and log fresh sorb time (190 min max @ 4°C).",
          ],
          criticalNote:
            "Never stir or re-pack partially used absorbent—disturbing the reaction front causes immediate CO2 channeling.",
        },
        {
          id: "b_05",
          phase: "3. Head, Cells & Seals",
          title: "Verify Head Solenoid & Display Batteries",
          details: [
            "Inside stainless head battery bay: verify two fresh name-brand 9V alkaline batteries (Duracell/Energizer—never discount or NiMH rechargeables) for solenoid power.",
            isNerd
              ? "Verify 3.6V Saft LS14500 battery in primary handset and confirm NERD 2 internal Li-Ion battery is charged."
              : "Verify 3.6V Saft LS14500 lithium AA battery in head bay (HUD power) and handset battery.",
            "Inspect and lightly lubricate battery cap O-ring before securing stainless cover.",
          ],
        },
        {
          id: "b_06",
          phase: "3. Head, Cells & Seals",
          title: "Inspect 3 Galvanic O2 Sensors & Molex Harness",
          details: [
            "Check manufacturing/install dates on all 3 sensors (must be <12 months in air and matched wisely by stagger rotation).",
            "Verify sensor O-rings are seated cleanly in the head chamber and 3-pin Molex plugs are firmly pushed onto gold sensor pins with zero wire strain.",
          ],
        },
        {
          id: "b_07",
          phase: "3. Head, Cells & Seals",
          title: "Install DRY Red Silicone CO2 Seal & Lube Head O-Rings",
          details: [
            "Press the red silicone CO2 seal flat into the underside head plate groove—confirm it is 100% DRY and tacky (zero grease!).",
            "Clean grooves and apply a thin film of O2-compatible lube (Cristo-Lube / Tribolube) to the TWO red outer head-to-bucket O-rings.",
          ],
          criticalNote:
            "Never lubricate the red CO2 seal (causes slippage) and never omit it (causes 100% scrubber bypass).",
        },
        {
          id: "b_08",
          phase: "3. Head, Cells & Seals",
          title: "Mate Basket & Electronics Head to Clear Bucket",
          details: [
            "Slide packed scrubber basket into clear bucket with open center bore tube facing UP.",
            "Push Electronics Head straight down onto bucket without twisting; snap all 3 stainless steel over-center latches down evenly.",
            "Visually inspect all 360° of both red head O-rings through the clear bucket wall to confirm a solid seal band with zero pinches or rolls.",
          ],
        },
        {
          id: "b_09",
          phase: "4. Counterlungs & Breathing Loop",
          title: isBmcl
            ? "Mount Back-Mounted Counterlungs (BMCL) & Chest MAV Blocks"
            : "Mount Front-Mounted Counterlungs (FMCL) & Check Drains",
          details: isBmcl
            ? [
                "Route BMCL inhale (left) and exhale (right) lungs cleanly under backplate/wing shoulder assembly and secure harness keepers.",
                "Verify bottom BMCL over-pressure / water dump valve pull-cord moves freely and snaps shut cleanly.",
                "Secure left Manual Diluent Addition Block (unshrouded blue button) and right Manual O2 Addition Block (shrouded green button) on chest harness.",
              ]
            : [
                "Attach Left (Inhalation) and Right (Exhalation) FMCLs to shoulder and waist D-rings.",
                "Turn both bottom FMCL water-drain locking collars clockwise to lock nipples shut against vacuum leaks.",
                "Verify ADV swivel nut on Left (Inhalation) lung and OPV + Manual O2 valve on Right (Exhalation) lung are snug.",
              ],
        },
        {
          id: "b_10",
          phase: "4. Counterlungs & Breathing Loop",
          title: "Flow-Test DSV / BOV Directional Mushroom Valves",
          details: [
            "Confirm DSV and BOV hose stubs/cages are matched (never mix DSV and BOV fittings).",
            "Open mouthpiece barrel and perform stereo check-valve test: confirm gas flows strictly Left-to-Right across your face (inhale from LEFT hose, exhale into RIGHT hose) with zero back-leakage.",
            "Inspect mouthpiece bite tabs, cable tie security, and smooth one-handed barrel/BOV rotation.",
          ],
        },
        {
          id: "b_11",
          phase: "4. Counterlungs & Breathing Loop",
          title: "Connect Loop Hoses to Counterlungs & Head (Watch Reverse Thread!)",
          details: [
            "Verify stainless steel reinforcement rings are seated on head ports and O-rings on T-pieces/head fittings are lightly lubricated.",
            "LEFT (INHALATION) HEAD PORT — WHITE NUT: Uses a REVERSE (left-hand) thread! Turn COUNTER-CLOCKWISE to tighten down flat.",
            "RIGHT (EXHALATION) HEAD PORT — BLACK NUT: Uses a STANDARD (right-hand) thread. Turn CLOCKWISE to tighten down flat.",
            "Connect corrugated hoses to counterlung T-pieces and verify comfortable head turn left/right/up without pulling the mouthpiece.",
          ],
          criticalNote:
            "White Left Inhalation nut tightens COUNTER-CLOCKWISE. Forcing it clockwise cross-threads or loosens the loop!",
        },
        {
          id: "b_12",
          phase: "5. Cylinders, 1st Stages & LP Plumbing",
          title: "Analyze & Mount O2 (Right) and Diluent (Left) Cylinders",
          details: [
            "Calibrate analyzer and verify Oxygen (≥98% O2) and Diluent (target O2% & He% for planned MOD/END); label both tanks clearly.",
            "Mount Oxygen cylinder on diver's RIGHT side and Diluent cylinder on diver's LEFT side; cinch cam bands tight and tug-test.",
          ],
        },
        {
          id: "b_13",
          phase: "5. Cylinders, 1st Stages & LP Plumbing",
          title: "Attach 1st Stage Regulators & Route LP Quick-Disconnects",
          details: [
            "Thread Green-coded O2 1st stage onto Right cylinder (verify 0.0020\" sintered bronze flow restrictor is installed in solenoid feed port); connect solenoid feed, Manual O2 QD, and Right O2 SPG.",
            "Thread Black-coded Diluent 1st stage onto Left cylinder; connect ADV feed, Manual Diluent QD, BOV open-circuit LP hose, wing inflator LP hose, and Left Diluent SPG.",
            "Route all LP/HP hoses cleanly inside the frame to eliminate snag hazards.",
          ],
        },
        {
          id: "b_14",
          phase: "6. DiveCAN Electronics & Final Bench Check",
          title: isNerd
            ? "Connect DiveCAN Handset & NERD 2 Cables (Locking Sleeves)"
            : "Connect DiveCAN Handset & Route LED HUD (Locking Sleeves)",
          details: [
            "Align red/white index marks on 5-pin DiveCAN connectors, push straight together (never twist pins), slide locking sleeves down, and confirm BOTH retaining O-rings are securing each sleeve.",
            isNerd
              ? "Clip NERD 2 optical mount cleanly onto DSV/BOV hose counterweight in clear view of your eye."
              : "Secure LED HUD clip onto DSV/BOV counterweight with directional 'UP' arrow oriented properly.",
            "Proceed to the 'Run-Up & Pre-Breath' wizard on the home dashboard for leak tests, calibration, and 5-minute pre-breath.",
          ],
        },
      ],

      // =====================================================================
      // TAB 2: AGENCY-NEUTRAL DIVE PLAN & BUDDY GEAR CHECK (8 STEPS)
      // =====================================================================
      plan: [
        {
          id: "p_01",
          phase: "Dive Planning",
          title: "1. Gas Mixes, Volumes & Turn Pressures",
          details: [
            "Confirm onboard O2 and Diluent pressures meet planned duration + 1/3 reserve.",
            "Confirm offboard bailout cylinders are analyzed, externally labeled with MOD in feet/meters, and sized for worst-case deep bailout + problem-solving time.",
          ],
        },
        {
          id: "p_02",
          phase: "Dive Planning",
          title: "2. Decompression Schedule, Setpoints & Bailout Slate",
          details: [
            "Verify primary & backup computers match planned Gradient Factors (GF Low / GF High), CC gases, and BO gases.",
            "Brief bottom setpoint, ascent/deco setpoint boost depth, and wet-slate backup tables for both CCR and OC Bailout.",
          ],
        },
        {
          id: "p_03",
          phase: "Dive Planning",
          title: "3. Dive Objectives, Routing & Max Limits",
          details: [
            "Agree on primary objective, descent/ascent line protocols, max depth, and hard turn time.",
            "Review lost-teammate procedure (1-minute search max, then ascend on schedule) and omitted-deco contingencies.",
          ],
        },
        {
          id: "p_04",
          phase: "Dive Planning",
          title: "4. Oxygen Exposure (CNS% & OTU) & Diluent Flush Limit",
          details: [
            "Verify planned CCR & OC Bailout CNS% (<80% target) and daily OTU budget.",
            "Confirm onboard Diluent flush PO2 at max target depth is ≤1.2 ata (ideally 0.1–0.2 ata below bottom setpoint).",
          ],
        },
        {
          id: "p_05",
          phase: "Dive Planning",
          title: "5. Narcosis (END ≤130ft) & Loop Gas Density (≤5.2 g/L)",
          details: [
            "Confirm Helium fraction keeps loop Equivalent Narcotic Depth within personal/team limits.",
            "Confirm loop gas density at max depth stays ≤5.2 g/L to prevent CO2 retention and scrubber roll-off.",
          ],
        },
        {
          id: "p_06",
          phase: "Dive Planning",
          title: "6. Thermal Protection & Suit Inflation",
          details: [
            "Verify undergarments, drysuit seals, and dedicated drysuit inflation cylinder (Air/Argon—never inflate drysuit with high-He diluent).",
          ],
        },
        {
          id: "p_07",
          phase: "Dive Planning",
          title: "7. Surface Support, Comms & Emergency Evacuation",
          details: [
            "Review DSMB color codes (Yellow = emergency/gas need vs. Red/Orange = normal deco), light/hand signals, surface O2 kit location, and nearest chamber/EMS plan.",
          ],
        },
        {
          id: "p_08",
          phase: "Partner Physical Check",
          title: "8. Hands-On Partner Gear & Valve Cross-Check",
          details: [
            "Buoyancy Systems: Test wing power inflator, drysuit inflator, and all dump valves (zero creeping inflation).",
            "Trim & Ballast: Confirm diver can hold 15ft stop with empty wing even if offboard stages are handed off; verify ditchable pockets if worn.",
            "Harness & Stage Clips: Tug-test waist buckle, crotch strap, and offboard stage bolt snaps; confirm clean hose routing.",
            "Valves & Pressures: Physically confirm onboard O2 & Diluent valves are FULLY OPEN, breathable deep bailout is OPEN, and toxic high-O2 deco stage valve is CLOSED with reg stowed.",
            "Final Loop & Display Check: Confirm handset + HUD/NERD 2 are active at 0.7 SP, breathe BOV in OC then switch back to CC, and commit to a 15–20ft submerged bubble check.",
          ],
        },
      ],

      // =====================================================================
      // TAB 3: BOAT / PRE-SPLASH QUICK CHECK (6 STEPS)
      // =====================================================================
      presplash: [
        {
          id: "s_01",
          phase: "Immediate Pre-Entry",
          title: "Run-Up & 5-Minute Seated Pre-Breath Completed",
          details: [
            "Confirm negative/positive loop tests passed, sensors calibrated cleanly, and 5-minute pre-breath completed within the last 30 minutes.",
          ],
        },
        {
          id: "s_02",
          phase: "Immediate Pre-Entry",
          title: "Onboard O2 & Diluent Valves OPEN + SPGs Verified",
          details: [
            "Breathe BOV in OC while watching Diluent SPG (zero needle dip) and tap Manual O2 while watching O2 SPG.",
          ],
        },
        {
          id: "s_03",
          phase: "Immediate Pre-Entry",
          title: "Offboard Bailout Valve States Verified for Entry Depth",
          details: [
            "Deep/Travel bailout (breathable on surface/bottom): Valve OPEN & 2nd stage accessible.",
            "High-O2 Deco stage (toxic at bottom): Valve CLOSED & regulator positively stowed/banded.",
          ],
        },
        {
          id: "s_04",
          phase: "Immediate Pre-Entry",
          title: "Primary Handset, Backup Computer & HUD/NERD 2 Active",
          details: [
            "Verify Setpoint is 0.7 ata (and Auto SP Up configured if desired), all 3 cells tracking ~0.70, and zero active error messages.",
          ],
        },
        {
          id: "s_05",
          phase: "Immediate Pre-Entry",
          title: isBmcl
            ? "BMCL Dump Cord Clear & Drysuit Inflator Connected"
            : "FMCL OPV Set & Water Drain Collars Locked",
          details: isBmcl
            ? [
                "Confirm BMCL bottom dump cord is reachable and drysuit/wing LP inflators are snapped on securely.",
              ]
            : [
                "Adjust right-lung FMCL OPV for ascent/diving, confirm bottom drain collars are locked, and connect suit/wing LP hoses.",
              ],
        },
        {
          id: "s_06",
          phase: "Immediate Pre-Entry",
          title: "Mask, Primary/Backup Lights, Cutting Tool, DSMBs & Reels",
          details: [
            "Confirm pockets contain backup mask, primary + backup DSMBs/spools, wet notes, and accessible cutting devices. Go on loop BEFORE entering water!",
          ],
        },
      ],

      // =====================================================================
      // TAB 4: HOLLIS P2 POST-DIVE BREAKDOWN, STERAMINE & STORAGE (10 STEPS)
      // =====================================================================
      postdive: [
        {
          id: "d_01",
          phase: "1. Seal & Exterior Rinse",
          title: "Close DSV/BOV & Rinse Assembled Rig Exterior",
          details: [
            "Ensure DSV/BOV barrel is CLOSED and DiveCAN cable locking sleeves remain sealed.",
            "While LP lines are still pressurized (prevents water entering BOV/MAV seats), rinse entire rig exterior, wing, harness, 1st stages, and SPGs with warm fresh water.",
          ],
        },
        {
          id: "d_02",
          phase: "1. Seal & Exterior Rinse",
          title: "Shut Valves, Bleed LP Plumbing & Cap 1st Stages",
          details: [
            "Close Right (O2) and Left (Diluent) tank valves completely.",
            "Depress BOV purge, Manual Diluent button, Manual O2 button, and wing inflator until both SPGs drop to zero.",
            "Disconnect LP quick-disconnects, remove 1st stages from cylinders, and fit clean, dry dust caps.",
          ],
        },
        {
          id: "d_03",
          phase: "2. Protect Electronics Head",
          title: "Drain Exhalation Counterlung Water Trap First",
          details: [
            "Before unthreading hoses or tilting the unit, open the Right (Exhalation) Counterlung bottom drain to expel condensed loop water so it cannot run back into the head.",
            "Power down Shearwater handset (and NERD 2 if equipped).",
          ],
        },
        {
          id: "d_04",
          phase: "2. Protect Electronics Head",
          title: "Detach Loop Hoses from Head (Watch Reverse Thread!)",
          details: [
            "RIGHT (EXHALATION) BLACK NUT: Turn COUNTER-CLOCKWISE to loosen.",
            "LEFT (INHALATION) WHITE NUT: Reverse thread! Turn CLOCKWISE to loosen—do not force counter-clockwise!",
          ],
          criticalNote:
            "White Left Inhalation nut loosens CLOCKWISE (reverse thread).",
        },
        {
          id: "d_05",
          phase: "2. Protect Electronics Head",
          title: "Remove Electronics Head & Air-Dry O2 Sensors in Shade",
          details: [
            "Release the 3 stainless steel bucket latches, lift the Electronics Head straight up off the bucket, and set it on a dry, padded towel away from water splashes.",
            "NEVER rinse, spray, or submerge the underside of the head or O2 sensors!",
            "Gently blot condensation from the head plate, red CO2 seal, and sensor chamber using a clean lint-free cloth; allow sensors to air-dry in shade (never seal damp sensors in an airtight container).",
          ],
        },
        {
          id: "d_06",
          phase: "3. Scrubber & Bucket Care",
          title: "Empty/Inspect Scrubber Basket & Rinse Bucket",
          details: [
            "Pull radial scrubber basket out of clear bucket. If sorb duration is complete or storing >24 hrs, dispose of caustic soda lime safely in trash.",
            "Rinse empty basket screens, foam pads, and clear urethane bucket in warm fresh water (soak basket lid threads in white vinegar for 15 min if white carbonate buildup is present).",
          ],
        },
        {
          id: "d_07",
          phase: "4. Loop Disinfection",
          title: "Mix Steramine™ Bath & Soak Breathing Loop (10 Minutes)",
          details: [
            "Mix 1 Steramine™ quaternary ammonium tablet per 1 gallon (3.8 L) of warm fresh water (or Virkon® S per label).",
            "Plug/cap BOV LP inlet, open DSV/BOV barrel, and submerge DSV/BOV, corrugated breathing hoses, T-pieces, and Inhale/Exhale Counterlungs.",
            "Agitate so disinfectant reaches 100% of internal surfaces and soak for a full 10-minute contact time.",
          ],
        },
        {
          id: "d_08",
          phase: "4. Loop Disinfection",
          title: "Potable Water Rinse & Hang Vertically Out of UV",
          details: [
            "Flush all disinfected loop parts, BOV second stage, OPV, and ADV thoroughly with clean fresh potable water.",
            "Hang corrugated hoses stretched vertically and counterlungs upside-down/drains-open in a shaded, ventilated area until 100% bone-dry inside.",
          ],
        },
        {
          id: "d_09",
          phase: "5. Inspection & Storage",
          title: "Inspect Mushroom Valves, O-Rings & Dry Red CO2 Seal",
          details: [
            "Once dry, inspect DSV/BOV mushroom flappers for curling/tears, check hose Oetiker clamps, and verify the red silicone CO2 seal is clean and completely dry.",
          ],
        },
        {
          id: "d_10",
          phase: "5. Inspection & Storage",
          title: "Store Unlatched & Relieve Seal Compression",
          details: [
            "Leave the 3 stainless bucket latches UNLATCHED during storage so the two red head O-rings and red CO2 seal do not flatten.",
            "Store DSV/BOV barrel in the OPEN position inside a clean dust-free case so barrel O-rings don't take a compression set.",
            "If storing >3–4 weeks, remove the two 9V alkaline batteries from the head bay to prevent battery corrosion.",
          ],
        },
      ],
    };
  }, [secondaryDisplay, counterlungType]);

  const activeItems = useMemo(() => {
    return [
      ...(builtInLists[activeTab] || []),
      ...(customItems[activeTab] || []),
    ];
  }, [builtInLists, customItems, activeTab]);

  const completedCount = activeItems.filter((i) => checkedMap[i.id]).length;
  const progressPct =
    activeItems.length > 0
      ? Math.round((completedCount / activeItems.length) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col gap-3.5">
      {/* RIG HARDWARE BAR (SYNCED WITH RUN-UP WIZARD) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>P2 CONFIG:</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => updateDisplayPref("hud")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                secondaryDisplay === "hud"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              LED HUD
            </button>
            <button
              onClick={() => updateDisplayPref("nerd2")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                secondaryDisplay === "nerd2"
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              NERD 2
            </button>
          </div>

          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => updateLungPref("bmcl")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                counterlungType === "bmcl"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              BMCL
            </button>
            <button
              onClick={() => updateLungPref("fmcl")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                counterlungType === "fmcl"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              FMCL
            </button>
          </div>
        </div>
      </div>

      {/* 4 CHECKLIST TABS */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
        {(
          [
            { key: "build", label: "Bench Build" },
            { key: "plan", label: "Plan & Gear" },
            { key: "presplash", label: "Pre-Splash" },
            { key: "postdive", label: "Post-Dive" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setShowAddForm(false);
            }}
            className={`py-2 px-1 rounded-lg transition-all text-center truncate ${
              activeTab === tab.key
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROGRESS & ACTION HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase">
              {activeTab === "build" && "P2 Scratch Assembly"}
              {activeTab === "plan" && "Mission Plan & Partner Check"}
              {activeTab === "presplash" && "Final Boat / Entry Check"}
              {activeTab === "postdive" && "Breakdown, Steramine & Storage"}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {completedCount}/{activeItems.length} ({progressPct}%)
          </span>
        </div>

        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Custom Step
          </button>
          <button
            onClick={() => resetCurrentTabChecks(activeItems)}
            className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset Tab
          </button>
        </div>

        {/* ADD CUSTOM STEP DRAWER */}
        {showAddForm && (
          <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                Add Personal Step to Current Tab
              </span>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Step title (e.g., Pack Shearwater Swift transmitters)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Optional sub-note / torque / pressure detail..."
              value={newDetail}
              onChange={(e) => setNewDetail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300"
            />
            <button
              onClick={addCustomStep}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs"
            >
              Save Custom Step
            </button>
          </div>
        )}
      </div>

      {/* CHECKLIST ITEMS CARDS */}
      <div className="space-y-2.5">
        {activeItems.map((item, idx) => {
          const isChecked = !!checkedMap[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`cursor-pointer rounded-2xl p-3.5 border transition-all active:scale-[0.99] ${
                isChecked
                  ? "bg-emerald-950/25 border-emerald-500/40 opacity-75"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <CheckSquare className="w-5 h-5 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                      Step {idx + 1} • {item.phase}
                    </span>
                    {item.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomStep(item.id);
                        }}
                        className="text-slate-500 hover:text-red-400 p-0.5"
                        title="Delete custom step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h3
                    className={`text-sm font-bold leading-snug ${
                      isChecked ? "line-through text-slate-400" : "text-white"
                    }`}
                  >
                    {item.title}
                  </h3>

                  {item.details.length > 0 && (
                    <ul className="space-y-1 pt-0.5">
                      {item.details.map((d, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-300 leading-relaxed flex items-start gap-1.5"
                        >
                          <span className="text-cyan-400 font-bold">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.criticalNote && (
                    <div className="flex items-start gap-2 bg-red-950/60 border border-red-500/40 rounded-xl p-2.5 mt-1.5 text-[11px] text-red-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span>{item.criticalNote}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}