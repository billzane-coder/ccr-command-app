// lib/drillBank.ts — PART 1 (Scenarios 1 to 25)

export type DrillLevel = "P2 Hardware" | "Tec 40 CCR" | "Tec 60 CCR" | "Tec 100 CCR";

export interface DrillScenario {
  id: string;
  level: DrillLevel;
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

export const DRILL_SCENARIOS: DrillScenario[] = [
  // =====================================================
  // P2 HARDWARE SPECIFIC SCENARIOS (1 - 12)
  // =====================================================
  {
    id: "p2_01",
    level: "P2 Hardware",
    category: "Hyperoxia / Valve Diagnostics",
    title: "Uncommanded O2 Injection at 120ft (No Isolator Slider)",
    depthFt: 120,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["1.68", "1.71", "1.69"],
    hudState: "TOP RED BLINKING (7x) + RED BUDDY LIGHT PULSING",
    scenarioText:
      "At 120ft on 1.3 SP, you hear continuous oxygen injection and watch loop PPO2 climb past 1.68 across all three cells. Because the Prism 2 does not have an internal solenoid isolator slider, how do you stabilize the loop and diagnose whether the Solenoid or Manual O2 Add Block failed?",
    options: [
      {
        label: "A. Lower electronic setpoint to 0.7 and exhale through your nose until PPO2 drops.",
        isCorrect: false,
        feedback: "Lowering setpoint will not stop a mechanically stuck-open solenoid or leaking MAV, and waiting for metabolism risks CNS convulsions.",
      },
      {
        label: "B. Bail out to BOV/OC, shut the right-hand O2 tank valve, diluent flush, disconnect the QD hose at the Manual O2 Addition Block, and briefly crack the O2 tank valve 1/2 turn while watching PPO2.",
        isCorrect: true,
        feedback: "Correct. Unplugging the QD feed to the Manual O2 Block and cracking the O2 tank valve 1/2 turn isolates the fault: if PPO2 rises, the solenoid failed open (feather tank valve); if steady, the MAV leaked (leave QD unplugged and let solenoid run the ascent).",
      },
      {
        label: "C. Unplug the DiveCAN handset cable so the SOLO board powers down.",
        isCorrect: false,
        feedback: "While submerged, the SOLO board continues operating independently even if the handset is unplugged.",
      },
    ],
  },
  {
    id: "p2_02",
    level: "P2 Hardware",
    category: "Electronics / Cells",
    title: "Cell Divergence & VOTING FAILED on Deco",
    depthFt: 100,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.45", "1.05", "1.52"],
    hudState: "MIXED BLINKS ACROSS COLUMNS",
    scenarioText:
      "Ascending to your 100ft stop, your handset center row turns yellow and alternates between [.45 / 1.05 / 1.52] and 'VOTING FAILED'. How does the P2 controller behave during VOTING FAILED, and what is your immediate action?",
    options: [
      {
        label: "A. Solenoid stops firing completely and deco math defaults to the lowest cell (0.45). Check DilPO2, execute a diluent flush to see which cell matches known DilPO2, or bail out to OC.",
        isCorrect: true,
        feedback: "Spot on. When no two cells agree within 20%, voting fails: automatic O2 injection stops and deco math uses the lowest cell (down to 0.16). Flushing with known diluent reveals which cell is accurate.",
      },
      {
        label: "B. Controller averages all three cells (1.01) and keeps firing the solenoid.",
        isCorrect: false,
        feedback: "The P2 only averages cells that pass voting (within 20% of another cell). Once VOTING FAILED appears, the solenoid will not fire.",
      },
      {
        label: "C. Enter the Calibrate menu underwater to reset the drifting sensors.",
        isCorrect: false,
        feedback: "The Calibrate menu is locked out whenever the computer is in dive mode underwater.",
      },
    ],
  },
  {
    id: "p2_03",
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
        label: "A. Yes, the SOLO board maintains 0.7 setpoint at all times whether on the surface or underwater.",
        isCorrect: false,
        feedback: "Per the P2 DiveCAN architecture, independent SOLO solenoid control ONLY functions while submerged in a dive.",
      },
      {
        label: "B. No. Independent SOLO solenoid operation only works while submerged. Disconnection at the surface results in total loss of automatic solenoid control.",
        isCorrect: true,
        feedback: "Correct. At the surface, losing the wrist handset stops automatic solenoid control completely to prevent continuous surface firing.",
      },
      {
        label: "C. The HUD takes over solenoid control at the surface.",
        isCorrect: false,
        feedback: "The HUD is a monitor-only device on the OBOE bus and never controls the solenoid.",
      },
    ],
  },
  {
    id: "p2_04",
    level: "P2 Hardware",
    category: "HUD Smither's Code",
    title: "Primary Handset Blank — Decoding HUD Blink Pattern",
    depthFt: 90,
    setpoint: 1.2,
    diluent: "18/45",
    cells: ["---", "---", "---"],
    hudState: "COL 1: 1 GRN | COL 2: 1 GRN | COL 3: 4 YEL",
    scenarioText:
      "Your primary handset screen goes dark at 90ft. Looking at your Hollis LED HUD, Column 1 flashes 1 Green blink, Column 2 flashes 1 Green blink, and Column 3 flashes 4 Yellow blinks per cycle. What are your three cells reading?",
    options: [
      {
        label: "A. Cell 1 = 1.1 ata, Cell 2 = 1.1 ata, Cell 3 = 0.6 ata (Cell 3 failing low).",
        isCorrect: true,
        feedback: "Exact Smither's Code math! 1.0 ata is the baseline: each Green blink adds +0.1 ata above 1.0 (1 Green = 1.1 ata), and each Yellow blink subtracts -0.1 ata below 1.0 (4 Yellow = 0.6 ata). Two cells agree at 1.1 while Cell 3 reads low.",
      },
      {
        label: "B. Cell 1 = 1.0 ata, Cell 2 = 1.0 ata, Cell 3 = 1.4 ata.",
        isCorrect: false,
        feedback: "1.0 ata is indicated by alternating Green+Yellow blinks. 1 Green blink is 1.1 ata, and Yellow blinks are below 1.0 ata.",
      },
      {
        label: "C. All three cells are above 1.6 ata.",
        isCorrect: false,
        feedback: "PPO2 above 1.6 ata flashes Red at the top of the column (7+ blinks).",
      },
    ],
  },
  {
    id: "p2_05",
    level: "P2 Hardware",
    category: "HUD Emergency Commands",
    title: "Forcing Solenoid Boost via HUD Wet Contacts",
    depthFt: 80,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.68", "0.69", "0.68"],
    hudState: "3 YELLOW BLINKS ACROSS ALL COLUMNS",
    scenarioText:
      "Your primary wrist controller floods and dies at 80ft, and the SOLO board has defaulted to maintaining the 0.7 ata low setpoint. While aborting the dive on the loop, how can you command the solenoid to inject a 2.5-second burst of O2 using only the LED HUD?",
    options: [
      {
        label: "A. Double-tap the HUD wet contacts once to highlight Column 1 (Inject O2), then press and hold the wet contacts for 3 seconds.",
        isCorrect: true,
        feedback: "Correct! In the P2 HUD command menu, 1 double-tap selects Column 1 (Inject O2). Holding the wet contacts for 3 seconds commands the SOLO board to fire the solenoid for 2.5 seconds.",
      },
      {
        label: "B. Double-tap the HUD wet contacts 3 times to Column 3 and hold for 3 seconds.",
        isCorrect: false,
        feedback: "Column 3 is 'Calibrate' (surface only)—never trigger calibration underwater.",
      },
      {
        label: "C. Bridge the HUD wet contacts continuously for 30 seconds to switch setpoints.",
        isCorrect: false,
        feedback: "Column 2 (Switch SP to 1.2) requires 2 double-taps followed by a 3-second hold.",
      },
    ],
  },
  {
    id: "p2_06",
    level: "P2 Hardware",
    category: "Head & Scrubber Assembly",
    title: "Extreme Exhalation Resistance on First Breath",
    depthFt: 15,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.72", "0.71", "0.72"],
    hudState: "3 YELLOW BLINKS",
    scenarioText:
      "During a hasty repack between dives, a diver skips the 5-minute seated pre-breath and jumps in. At 15ft, they can inhale from the loop (triggering the ADV), but when they try to exhale, the exhalation hose locks up solid and gas vents out their mask skirt. What assembly error occurred?",
    options: [
      {
        label: "A. The radial scrubber basket was installed upside down in the bucket, sealing its solid flat bottom plate against the red CO2 seal in the head.",
        isCorrect: true,
        feedback: "Spot on. Installing the P2 scrubber basket upside down blocks the central gas bore against the head plate, completely obstructing gas flow through the canister.",
      },
      {
        label: "B. The red CO2 seal was left on the bench.",
        isCorrect: false,
        feedback: "Omitting the red CO2 seal causes 100% scrubber bypass (zero resistance, fatal CO2 buildup), not a physical flow blockage.",
      },
      {
        label: "C. The O2 cylinder valve is closed.",
        isCorrect: false,
        feedback: "A closed O2 valve does not block exhalation into the counterlung.",
      },
    ],
  },
  {
    id: "p2_07",
    level: "P2 Hardware",
    category: "Solenoid Power",
    title: "EXT V Drops to 6.6V During Deep Ascent",
    depthFt: 110,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["1.12", "1.14", "1.13"],
    hudState: "YELLOW BLINKS + LOW EXT BATTERY ALERT",
    scenarioText:
      "As you begin ascending from 130ft to 110ft, the solenoid has to fire frequently to keep up with falling ambient pressure. Your handset flashes a Low External Battery warning (`EXT V = 6.6V`) and PPO2 lags at 1.12. What is happening and how should you ascend?",
    options: [
      {
        label: "A. The dual 9V solenoid batteries in the head are sagging below the 7.0V minimum under load and may soon fail to lift the solenoid plunger. Assist and maintain setpoint manually with small bursts of the Manual O2 Addition Valve while ascending slowly.",
        isCorrect: true,
        feedback: "Correct. Below 7.0V dynamic voltage, the 6V solenoid coil cannot reliably open against 145 psi intermediate pressure. Transition to manual O2 control (vent first, then add small O2 bursts) and abort.",
      },
      {
        label: "B. Ascend at 60 ft/min so you spend less time in the water before the battery dies.",
        isCorrect: false,
        feedback: "Ascending fast causes PPO2 to plummet even faster (hypoxia risk) and violates decompression ceilings.",
      },
      {
        label: "C. Ignore it—the handset's internal 3.6V SAFT battery automatically powers the solenoid if EXT V dies.",
        isCorrect: false,
        feedback: "False! The handset battery (`INT V`) only powers the wrist display and DiveCAN logic; it cannot fire the solenoid.",
      },
    ],
  },
  {
    id: "p2_08",
    level: "P2 Hardware",
    category: "Solenoid Restrictor",
    title: "Solenoid Clicking Audibly But PPO2 Keeps Falling",
    depthFt: 85,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["0.62", "0.61", "0.63"],
    hudState: "4 YELLOW BLINKS",
    scenarioText:
      "At 85ft, your O2 SPG reads 2,200 psi, your manual O2 addition button flows briskly when pressed, and you can clearly hear the solenoid clicking every few seconds—yet loop PPO2 steadily drops unless you press the manual O2 button. What P2 component is blocked?",
    options: [
      {
        label: "A. The 0.0020-inch sintered bronze inline flow restrictor inside the solenoid LP hose fitting at the O2 1st stage is clogged.",
        isCorrect: true,
        feedback: "Exact P2 diagnostic! The manual O2 valve uses a standard LP port, while the solenoid feed hose passes through a microscopic 0.0020\" restrictor and filter screen that can clog if moisture/verdigris enters the 1st stage. Maintain SP manually with the MAV and abort.",
      },
      {
        label: "B. All three O2 cells have failed simultaneously.",
        isCorrect: false,
        feedback: "When you press the manual O2 button, the cells respond immediately—proving the sensors are working.",
      },
      {
        label: "C. The ADV is stuck closed.",
        isCorrect: false,
        feedback: "A stuck-closed ADV prevents diluent addition on descent, not O2 maintenance at constant depth.",
      },
    ],
  },
  {
    id: "p2_09",
    level: "P2 Hardware",
    category: "Loop Hardware",
    title: "White Reverse-Thread Inhalation Hose Nut",
    depthFt: 40,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.18", "1.19", "1.18"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "During your 20ft bubble check, your teammate points to a steady stream of bubbles escaping where the inhalation breathing hose attaches to the head port (marked with a white bar). You reach back to snug the white plastic hose nut down. Which way do you turn it?",
    options: [
      {
        label: "A. Counter-clockwise (left-hand / reverse thread) to tighten the white inhalation nut.",
        isCorrect: true,
        feedback: "Correct! On the Hollis Prism 2, the white inhalation nut and head port have a reverse (counter-clockwise) thread so the inhalation and exhalation hoses can never be cross-connected. Turning it clockwise unscrews it!",
      },
      {
        label: "B. Clockwise (standard righty-tighty) with as much force as possible.",
        isCorrect: false,
        feedback: "Turning the white nut clockwise loosens it and can flood the head!",
      },
      {
        label: "C. Pull the bayonet pin and rotate 90 degrees.",
        isCorrect: false,
        feedback: "The P2 head uses threaded Delrin nuts over stainless steel reinforcement rings, not quarter-turn bayonets.",
      },
    ],
  },
  {
    id: "p2_10",
    level: "P2 Hardware",
    category: "Water Management",
    title: "Water Gurgling in Exhalation Hose vs. Inhalation Hose",
    depthFt: 75,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "1.19"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "Ninety minutes into a dive on a P2 configured with Front-Mounted Counterlungs (FMCLs), you hear noticeable gurgling in your corrugated hoses. How does the P2 trap water, and how can you expel accumulated water from the FMCL underwater?",
    options: [
      {
        label: "A. Lift the breathing hoses upright to drain water down into the exhalation counterlung, assume a vertical position, unscrew the bottom drain locking collar on the exhalation lung, and press the manual diluent valve (or exhale) while pulling the drain nipple outward.",
        isCorrect: true,
        feedback: "Spot on. The exhalation counterlung acts as the P2's water trap before gas enters the head. Unscrewing the FMCL drain locking collar and pulling the drain nipple while pressurizing the loop purges trapped water.",
      },
      {
        label: "B. Roll upside down (head-down) and shake the canister so water runs into the scrubber.",
        isCorrect: false,
        feedback: "Never invert yourself to clear water! Allowing water to bypass the counterlung trap and enter the soda lime scrubber degrades the bed and risks a caustic cocktail.",
      },
      {
        label: "C. Open the DSV underwater above your head and let the water fall out.",
        isCorrect: false,
        feedback: "Opening the DSV above your head vents all loop gas and floods the entire breathing loop.",
      },
    ],
  },
  {
    id: "p2_11",
    level: "P2 Hardware",
    category: "BOV / DSV Hardware",
    title: "Mismatched DSV and BOV Hose Stubs",
    depthFt: 20,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.70", "0.71", "0.70"],
    hudState: "3 YELLOW BLINKS",
    scenarioText:
      "A diver swaps from their standard P2 DSV to a Hollis BOV before a trip, but leaves the old DSV hose stubs attached to the corrugated hoses instead of swapping the complete assembly. What hazard does the Hollis manual warn about?",
    options: [
      {
        label: "A. DSV and BOV directional flow cages and stub fittings are NOT interchangeable—mixing components can jam the barrel or defeat the one-way mushroom valves, causing fatal CO2 pendulum breathing.",
        isCorrect: true,
        feedback: "Correct. Hollis explicitly warns never to mix DSV and BOV fittings/stubs; always swap the complete mouthpiece + hose assembly and perform the stereo mushroom valve check.",
      },
      {
        label: "B. The BOV will only work in open-circuit mode.",
        isCorrect: false,
        feedback: "The issue is mechanical incompatibility of the stubs/valve cages, which compromises loop sealing and directional check valves.",
      },
      {
        label: "C. It has no effect as long as the O-rings are lubricated.",
        isCorrect: false,
        feedback: "False—DSV and BOV components have different tolerances and valve cage retainers.",
      },
    ],
  },
  {
    id: "p2_12",
    level: "P2 Hardware",
    category: "1st Stage Over-Pressure",
    title: "Creeping O2 1st Stage Intermediate Pressure (>145 psi)",
    depthFt: 60,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.48", "1.50", "1.49"],
    hudState: "5 GREEN BLINKS + BUBBLES FROM RIGHT SHOULDER",
    scenarioText:
      "At 60ft, your teammate signals that a steady stream of small bubbles is coming from the over-pressure relief valve on your right-hand O2 1st stage regulator, and your loop PPO2 is creeping up toward 1.50 even though the solenoid isn't firing. What failed?",
    options: [
      {
        label: "A. The O2 1st stage high-pressure seat is creeping, driving Intermediate Pressure (IP) well above the 140–145 psi spec—popping the 1st stage relief valve and forcing O2 past the solenoid/MAV seat. Bail out, close the O2 tank valve, flush the loop, and feather the O2 tank valve manually to abort.",
        isCorrect: true,
        feedback: "Spot on. When 1st stage IP creeps excessively high, the safety relief valve vents to prevent hose rupture, and excess IP can overcome the closed solenoid or MAV seat. Shutting the O2 tank valve and feathering it manually controls the leak.",
      },
      {
        label: "B. Your OPV on the counterlung is set too loose.",
        isCorrect: false,
        feedback: "Bubbles from the 1st stage relief valve combined with rising PPO2 indicate a high-pressure 1st stage seat creep.",
      },
      {
        label: "C. Switch setpoint to 1.6 so the computer stops alarming.",
        isCorrect: false,
        feedback: "Never mask a mechanical oxygen leak by raising setpoint.",
      },
    ],
  },

  // =====================================================
  // TEC 40 CCR SCENARIOS (13 - 25)
  // =====================================================
  {
    id: "t40_13",
    level: "Tec 40 CCR",
    category: "Oxygen Sensor Diagnostics",
    title: "Suspiciously Steady Sensor Readings at 110ft",
    depthFt: 110,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.20"],
    hudState: "2 GREEN BLINKS (STEADY)",
    scenarioText:
      "You are 35 minutes into a dive at 110ft. During your 1-to-2 minute instrument scan, you notice all three cells read an identical 1.20—and have not fluctuated by even 0.01 over your last several breaths, nor have you heard the solenoid fire recently. What is your immediate diagnostic step?",
    options: [
      {
        label: "A. Manually inject a burst of O2 first to see if the sensors climb above 1.20.",
        isCorrect: false,
        feedback: "Dangerous! If moisture has blocked the cell membranes or the cells are stuck, actual loop PPO2 might already be dangerously high.",
      },
      {
        label: "B. Perform a Diluent Flush (replacing loop gas with known DilPO2) and breathe 3–4 times to verify all three sensors drop to the expected DilPO2 for 110ft.",
        isCorrect: true,
        feedback: "Correct. Sensors that do not fluctuate with breathing may be 'stuck' due to condensation. Flushing with diluent introduces a known safe gas with a lower PPO2, proving whether the sensors respond.",
      },
      {
        label: "C. Nothing is wrong—PID controllers hold 1.20 with zero fluctuation.",
        isCorrect: false,
        feedback: "Normal metabolic consumption and breathing cycles always cause minor 0.01–0.03 fluctuations.",
      },
    ],
  },
  {
    id: "t40_14",
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
        label: "A. Pull the mouthpiece out of their mouth so expanding loop gas doesn't cause an embolism.",
        isCorrect: false,
        feedback: "Never remove a mouthpiece that is in an unconscious diver's mouth! Removing it drowns the airway and floods the CCR loop.",
      },
      {
        label: "B. Hold the mouthpiece in their mouth and CLOSE the loop (activating the BOV) BEFORE turning them upright, then ascend while venting their BCD/suit/loop as needed.",
        isCorrect: true,
        feedback: "Spot on. Closing the loop/activating the BOV before turning the victim upright prevents hydrostatic loop pressure from blowing the mouthpiece out, keeps the loop from flooding, and delivers clean OC diluent if they gasp.",
      },
      {
        label: "C. Leave the loop open in CC mode and press their manual O2 valve continuously on the way up.",
        isCorrect: false,
        feedback: "Leaving the loop open in CC mode keeps them on potentially toxic gas and risks flooding the loop if their jaw relaxes.",
      },
    ],
  },
  {
    id: "t40_15",
    level: "Tec 40 CCR",
    category: "Pneumatics / Diluent",
    title: "Runaway ADV / Manual Diluent Valve Freeflow",
    depthFt: 95,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["0.64", "0.65", "0.64"],
    hudState: "4 YELLOW BLINKS (DROPPING)",
    scenarioText:
      "At 95ft, you hear gas roaring continuously into your inhalation counterlung. Your loop volume balloons, making you positively buoyant, and your PPO2 drops toward 0.64 as incoming diluent flushes out oxygen. How do you control the rig?",
    options: [
      {
        label: "A. Close the OPV completely so you don't waste gas, and press the manual O2 button to fight the diluent flow.",
        isCorrect: false,
        feedback: "Closing the OPV during a diluent freeflow will over-inflate your counterlungs and launch you into a runaway buoyant ascent.",
      },
      {
        label: "B. Vent loop gas via nose/mouthpiece and OPV to prevent a buoyant runaway, bail out to offboard OC if needed to breathe comfortably, and shut down the left-hand Diluent tank valve (or disconnect the leaking LP QD feed).",
        isCorrect: true,
        feedback: "Correct. Priority one is preventing a runaway ascent by venting excess loop/BCD gas, then shutting down the left-side diluent supply or unplugging the leaking QD.",
      },
      {
        label: "C. Switch to BOV open-circuit mode and keep the diluent valve wide open.",
        isCorrect: false,
        feedback: "If the ADV or MAV is freeflowing into the loop, switching the BOV to OC without shutting the diluent valve/QD will still balloon the loop and drain your onboard diluent.",
      },
    ],
  },
  {
    id: "t40_16",
    level: "Tec 40 CCR",
    category: "Non-Return Valves",
    title: "Mushroom Valve Failure (Pendulum Breathing)",
    depthFt: 70,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.19", "1.21"],
    hudState: "2 GREEN BLINKS (ALL DISPLAYS NORMAL)",
    scenarioText:
      "Twenty minutes into a dive at 70ft with zero exertion, you suddenly feel severe air starvation, a pounding headache, and rapid labored breathing. You check your handset and HUD: PPO2 is 1.20 and everything is green, and you haven't heard the solenoid fire in a while. What failed and can you stay on the loop?",
    options: [
      {
        label: "A. A DSV/BOV mushroom (non-return) valve has failed or warped, causing you to rebreathe dead-space CO2 back and forth in the hose while fresh oxygen sits stagnant at the sensors. Bail out to OC immediately and DO NOT return to the loop.",
        isCorrect: true,
        feedback: "Exact Tec 40 CCR diagnosis. Mushroom valve failure is silent on your electronics because gas stops circulating past the scrubber and sensors—it is 100% unrecoverable underwater. Bail out and abort on OC.",
      },
      {
        label: "B. Perform a diluent flush and stay on the loop since your displays are green.",
        isCorrect: false,
        feedback: "A diluent flush only clears the loop for 1–2 breaths if a mushroom valve has failed; CO2 will immediately build back up in the hose.",
      },
      {
        label: "C. Raise setpoint to 1.4 to cure the air hunger.",
        isCorrect: false,
        feedback: "Air starvation with a normal PPO2 is hypercapnia (CO2), not hypoxia. Raising setpoint will not fix a failed check valve.",
      },
    ],
  },
  {
    id: "t40_17",
    level: "Tec 40 CCR",
    category: "Chemical Hazards",
    title: "Flooded Loop & Caustic Cocktail",
    depthFt: 45,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.15", "0.92", "1.18"],
    hudState: "GURGLING + BURNING TASTE IN MOUTH",
    scenarioText:
      "After accidentally leaving the DSV partially cracked during a drill, you hear heavy gurgling, feel high breathing resistance, and suddenly get a soapy, burning alkaline liquid in your mouth on inhalation. What is the immediate procedure and post-dive first aid?",
    options: [
      {
        label: "A. Swallow the liquid to clear your airway, flush with diluent, and keep diving.",
        isCorrect: false,
        feedback: "Never swallow alkaline soda lime solution or attempt to stay on a flooded loop!",
      },
      {
        label: "B. Immediately bail out to BOV/offboard OC, spit/blow the liquid out and rinse your mouth with water, abort the dive on OC, and sip a mildly acidic beverage (like orange juice or soda—not milk) at the surface while seeking medical evaluation if irritation persists.",
        isCorrect: true,
        feedback: "Spot on. A flooded loop is unrecoverable. Bail out immediately, rinse your mouth, abort on OC, and use a mildly acidic drink (orange juice/soda) at the surface to neutralize residual alkaline sodalime.",
      },
      {
        label: "C. Tilt your head up and press the manual O2 button to blow the water back into the scrubber.",
        isCorrect: false,
        feedback: "Tilting your head up runs caustic water straight down your trachea.",
      },
    ],
  },
  {
    id: "t40_18",
    level: "Tec 40 CCR",
    category: "Surface Protocol",
    title: "Entering the Water with Cylinder Valves Closed ('Mistake #1')",
    depthFt: 12,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.15", "0.14", "0.15"],
    hudState: "RED ALARM FLASHING",
    scenarioText:
      "Fifteen minutes after surfacing from Dive 1, a diver jumps back into 12ft of water to retrieve a dropped GoPro without repeating a predive check or pre-breath—forgetting they had already closed their O2 and Diluent tank valves. Why is shallow water / surface breathing on a turned-off CCR the #1 cause of rapid hypoxic blackout?",
    options: [
      {
        label: "A. Without O2 injection, metabolic consumption drops loop FO2 steadily, and without ambient depth pressure to multiply that fraction, inspired PPO2 plunges below the 0.16 ata blackout threshold within a few minutes without causing any CO2 air-hunger warning.",
        isCorrect: true,
        feedback: "Correct. Because the scrubber still removes CO2 smoothly even with the tanks closed, you feel zero shortness of breath while metabolizing the loop down to <0.16 ata unconsciousness. Never jump in for a 'quick' dive without a full predive check and pre-breath.",
      },
      {
        label: "B. Because the scrubber stops removing CO2 when the tank valves are closed.",
        isCorrect: false,
        feedback: "Soda lime is a passive chemical reaction—it continues scrubbing CO2 even with the gas valves closed, which is why hypoxia strikes without warning!",
      },
      {
        label: "C. Because nitrogen narcosis is strongest at 12ft.",
        isCorrect: false,
        feedback: "Narcosis is not a factor at 12ft; unwarned shallow-water hypoxia is the killer.",
      },
    ],
  },
  {
    id: "t40_19",
    level: "Tec 40 CCR",
    category: "Alarm Management",
    title: "Preventing Alarm Blindness vs. Alarm Habituation",
    depthFt: 85,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "0.35"],
    hudState: "MASTER ALARM FLASHING",
    scenarioText:
      "At 85ft, Cell #3 fails low (0.35) while Cells #1 and #2 confirm accurate (1.20) on a diluent flush. Why does technical CCR protocol emphasize disabling/deselecting a confirmed failed sensor (or clearing a resolved master alarm) as you abort the dive?",
    options: [
      {
        label: "A. To prevent 'Alarm Blindness'—if a master alarm stays locked on from a known sensor fault, it cannot alert you if a second, life-threatening emergency occurs during your ascent.",
        isCorrect: true,
        feedback: "Correct. Leaving a master alarm flashing continuously causes both system Alarm Blindness (masking new faults) and diver Alarm Habituation (tuning out warnings).",
      },
      {
        label: "B. So you can continue the dive as planned without aborting.",
        isCorrect: false,
        feedback: "You never silence an alarm or disable a cell to continue a dive—you always turn the dive when a sensor fails.",
      },
      {
        label: "C. Because disabling a sensor recharges the solenoid battery.",
        isCorrect: false,
        feedback: "Disabling a sensor has no effect on battery charge.",
      },
    ],
  },
  {
    id: "t40_20",
    level: "Tec 40 CCR",
    category: "Buoyancy & Weighting",
    title: "Proper Tec CCR Weighting & Minimum Loop Check",
    depthFt: 15,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.19"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "How do you verify that you are properly weighted for a technical CCR decompression dive, and how do you confirm 'Minimum Loop' volume at a constant depth?",
    options: [
      {
        label: "A. You should be able to remove all offboard bailout cylinders and hold a 15ft (5m) stop comfortably with an empty BCD, and at Minimum Loop a slightly deeper-than-normal inhalation should just trigger the ADV.",
        isCorrect: true,
        feedback: "Spot on. Weighting must allow you to hold 15ft even in a worst-case scenario where you handed off your bailout cylinders to a teammate, and Minimum Loop means holding just one normal breath in the counterlungs.",
      },
      {
        label: "B. Inflate the counterlungs completely with the manual diluent button whenever you feel heavy.",
        isCorrect: false,
        feedback: "Never use loop volume for buoyancy control—over-inflated counterlungs increase hydrostatic work of breathing and CO2 retention.",
      },
      {
        label: "C. Use breath control (holding deep breaths) to fine-tune hovering just like open-circuit.",
        isCorrect: false,
        feedback: "Breathing does not change net displacement on a CCR because gas merely moves between your lungs and the counterlungs.",
      },
    ],
  },
  {
    id: "t40_21",
    level: "Tec 40 CCR",
    category: "Pneumatics / ADV",
    title: "ADV Fails Closed During Descent",
    depthFt: 50,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.25", "1.26", "1.24"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "While descending through 50ft, the counterlungs collapse flat against your chest and you cannot get a full breath in, even though your Diluent SPG reads 2,800 psi. What is your immediate sequence of actions?",
    options: [
      {
        label: "A. Keep descending to 100ft so the higher water pressure forces the ADV open.",
        isCorrect: false,
        feedback: "Descending further with a collapsed loop causes a severe lung/loop squeeze and spikes PPO2.",
      },
      {
        label: "B. Stop your descent immediately, press the Manual Diluent Addition button to restore breathable loop volume (or bail out to BOV if manual add fails), verify the diluent valve/QD is open, and abort the dive.",
        isCorrect: true,
        feedback: "Correct. Stop descending immediately, inject diluent via the manual button to restore loop volume, and turn the dive since the automatic diluent valve is malfunctioning.",
      },
      {
        label: "C. Fill the collapsed counterlungs using only 100% O2 from the manual oxygen button at 50ft.",
        isCorrect: false,
        feedback: "Filling a collapsed loop with pure O2 at 50ft (2.5 ata) will spike loop PPO2 into CNS toxicity!",
      },
    ],
  },
  {
    id: "t40_22",
    level: "Tec 40 CCR",
    category: "Mixed Team Protocols",
    title: "Decompressing in a Mixed CCR + Open-Circuit Team",
    depthFt: 90,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.21"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "You are diving your P2 alongside an open-circuit technical diver wearing doubles and an EAN50 deco stage. At 110ft, you have an unrecoverable loop failure and exhaust your own bailout cylinder due to a freeflow. Which regulator from your OC teammate can you breathe at 110ft?",
    options: [
      {
        label: "A. Their EAN50 stage cylinder regulator because it has more oxygen.",
        isCorrect: false,
        feedback: "Fatal mistake! An open-circuit diver's deco stage (EAN50, MOD 60ft) is NOT a deep bailout gas—breathing 50% O2 at 110ft is 2.17 ata PPO2.",
      },
      {
        label: "B. Their primary long-hose backgas regulator (doubles main supply), then ascend together following the most conservative computer on the team.",
        isCorrect: true,
        feedback: "Correct. In a mixed OC/CCR team, an OC diver's stage bottle is a shallow decompression gas, not a deep bailout gas. At depth, you must share their breathable backgas via the long hose.",
      },
      {
        label: "C. Their drysuit argon inflation hose.",
        isCorrect: false,
        feedback: "Argon has no oxygen and no second stage.",
      },
    ],
  },
  {
    id: "t40_23",
    level: "Tec 40 CCR",
    category: "Bailout Ascent",
    title: "Managing Loop Expansion During an Open-Circuit Bailout Ascent",
    depthFt: 40,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.95", "0.96", "0.95"],
    hudState: "ON OFFBOARD OPEN-CIRCUIT BAILOUT",
    scenarioText:
      "You bailed out onto your offboard open-circuit cylinder at 100ft due to a scrubber issue and closed your DSV/BOV. As you ascend through 40ft, the trapped gas inside your sealed CCR counterlungs expands and makes you increasingly buoyant because the OPV isn't venting fast enough. How do you vent the sealed loop without flooding it?",
    options: [
      {
        label: "A. Leave the DSV wide open for the rest of the ascent so all gas escapes.",
        isCorrect: false,
        feedback: "Leaving the DSV wide open floods the entire loop and canister, causing a sudden 15+ lb loss of buoyancy.",
      },
      {
        label: "B. Pull the counterlung OPV dump cord (BMCL) or hold the mouthpiece higher than the counterlungs pointing down and use a quick, sharp open-then-close motion to burp out expanding gas before it stops bubbling.",
        isCorrect: true,
        feedback: "Spot on. Either use the counterlung OPV pull-dump or hold the mouthpiece above the lungs and crack it open-and-shut briskly while gas bubbles out, closing it before water can enter.",
      },
      {
        label: "C. Switch back to breathing the CCR loop to exhale the gas through your nose.",
        isCorrect: false,
        feedback: "Never inhale from a loop that you abandoned due to a scrubber failure!",
      },
    ],
  },
  {
    id: "t40_24",
    level: "Tec 40 CCR",
    category: "Turn Pressures",
    title: "Calculating Onboard Oxygen Turn Pressure",
    depthFt: 100,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.20"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "You start a dive with a 3-liter (AL19) onboard O2 cylinder at 150 bar (450 liters total). You plan a 1/3 reserve (150 liters), leaving 300 liters of usable O2. Assuming a conservative 1.5 L/min metabolic rate and a 20-minute ascent + deco obligation (30 liters needed for ascent), at what O2 cylinder pressure must you turn the dive and leave the bottom?",
    options: [
      {
        label: "A. 60 bar (870 psi) — which leaves 30 liters (10 bar) for the 20-minute ascent plus your 150-liter (50 bar) reserve.",
        isCorrect: true,
        feedback: "Exact math! 50 bar reserve + 10 bar ascent gas = 60 bar (870 psi) minimum turn pressure to leave the bottom.",
      },
      {
        label: "B. 10 bar (145 psi).",
        isCorrect: false,
        feedback: "Turning at 10 bar leaves zero reserve if a delay occurs on ascent.",
      },
      {
        label: "C. Oxygen consumption triples at 100ft compared to the surface.",
        isCorrect: false,
        feedback: "On a CCR, metabolic O2 consumption (0.5–1.5 L/min) depends on physical exertion, not depth!",
      },
    ],
  },
  {
    id: "t40_25",
    level: "Tec 40 CCR",
    category: "Scrubber Physics",
    title: "Stirring or 'Resting' Partially Used Sorb ('Myths 3 & 4')",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.70", "0.70", "0.70"],
    hudState: "BENCH PREP",
    scenarioText:
      "After a 90-minute dive, a diver opens their scrubber basket, pours the half-used soda lime into a tub to dry overnight, and plans to stir and repack it the next morning for a 60-minute dive. Why is this potentially fatal?",
    options: [
      {
        label: "A. Used soda lime never 'recovers' overnight, and stirring a partially used bed destroys the distinct chemical reaction front (interface)—mixing exhausted granules throughout the stack and causing immediate CO2 channeling and breakthrough.",
        isCorrect: true,
        feedback: "Correct. Once a partially used scrubber is opened or disturbed, the reaction interface is destroyed and the entire canister MUST be repacked with 100% fresh absorbent.",
      },
      {
        label: "B. Stirring used absorbent makes it absorb too much oxygen.",
        isCorrect: false,
        feedback: "Soda lime does not absorb oxygen; stirring it destroys the CO2 reaction bed and causes channeling.",
      },
      {
        label: "C. It is safe as long as the color-indicating dye hasn't turned violet.",
        isCorrect: false,
        feedback: "Color-indicating dye fades over time and is never a reliable indicator of remaining scrubber life.",
      },
    ],
  },
// =====================================================
  // TEC 60 CCR SCENARIOS (26 - 38)
  // =====================================================
  {
    id: "t60_26",
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
          "Without replacing metabolized O2 manually, the loop volume will collapse and trigger the ADV (injecting low-O2 diluent at 20ft, risking hypoxia), and off-gassed inert gas will dilute the loop.",
      },
      {
        label:
          "C. Use Metabolic O2 Replacement starting at 50ft (15m) to save even more bailout gas.",
        isCorrect: false,
        feedback:
          "Fatal error! Pure oxygen at 50ft has a PPO2 of 2.5 ata. Metabolic O2 replacement without working sensors is strictly limited to 20ft (6m) or shallower.",
      },
    ],
  },
  {
    id: "t60_27",
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
          "Venting immediately wastes the 0.72 PPO2 gas already in the loop, and staying on semiclosed breathing in the final 20ft to the surface carries a severe risk of shallow-water hypoxia.",
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
    id: "t60_28",
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
          "Too slow! At 185ft, breathing 50% O2 exposes your teammate to a lethal PPO2 of 3.3+ ata—a CNS convulsion can strike within seconds.",
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
          "Your teammate bailed out due to a critical loop failure—forcing them back onto a compromised loop is unsafe.",
      },
    ],
  },
  {
    id: "t60_29",
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
          "B. Wait until your teammate's cylinder hits 0 psi before passing them your cylinder.",
        isCorrect: false,
        feedback:
          "Letting a bailed-out diver drain a cylinder completely leaves whomever gets that empty cylinder with zero offboard bailout capability.",
      },
      {
        label:
          "C. Have the teammate return to their CCR loop for 5 minutes at 70ft to calm their breathing down.",
        isCorrect: false,
        feedback:
          "A channeling or breakthrough scrubber is 100% unrecoverable.",
      },
    ],
  },
  {
    id: "t60_30",
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
          "Metabolic oxygen consumption is far too slow when active VENTID symptoms are present—a full CNS convulsion can occur while you wait.",
      },
      {
        label:
          "B. Immediately bail out to your LOWEST oxygen offboard bailout cylinder (using NO TOX), alert your team, and stay at a low PO2 for at least 15 minutes after all symptoms subside.",
        isCorrect: true,
        feedback:
          "Correct. Bailing out to your low-O2 offboard gas is the fastest possible way to drop inspired PO2. If you later return to an intact loop, flush with diluent and run a low setpoint (<1.0) for the rest of the dive.",
      },
      {
        label:
          "C. Bail out to your high-O2 deco cylinder (EAN50) to finish decompression faster.",
        isCorrect: false,
        feedback:
          "Breathing 50% O2 at 30ft gives you a PPO2 of 0.95 ata—much higher than your low-O2 trimix bailout gas (~0.35 ata at 30ft).",
      },
    ],
  },
  {
    id: "t60_31",
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
          "Because you were at the surface for MORE than 1 minute, standard omitted-decompression protocol requires multiplying the 20ft and final stops by 1.5x.",
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
          "If you have no symptoms, functional gear, and return promptly, re-descending to complete extended stops prevents symptomatic bubble growth.",
      },
    ],
  },
  {
    id: "t60_32",
    level: "Tec 60 CCR",
    category: "Omitted Decompression",
    title: "Blow-Up from Deeper Than 20ft (Surface from 50ft Stop)",
    depthFt: 0,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.95", "0.95", "0.96"],
    hudState: "DECO VIOLATION ALARM",
    scenarioText:
      "A runaway wing inflator blows a diver to the surface from their 50ft (15m) deco stop. They disconnect the LP hose at the surface, have zero DCS symptoms, and re-descend to 50ft in under 3 minutes. How do they adjust their remaining stops (50ft, 40ft, 30ft, 20ft, 15ft)?",
    options: [
      {
        label:
          "A. Complete the 50ft and 40ft (12m) stops per schedule (or 1.5x on 40ft per newer guidelines), then multiply the 30ft (9m) stop and ALL shallower stops by 1.5x normal deco time, plus extend the final stop as much as practicable.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR omitted decompression protocol for blow-ups from deeper than 20ft (6m) when asymptomatic.",
      },
      {
        label:
          "B. Only add 1 minute to the 50ft stop and surface normally.",
        isCorrect: false,
        feedback:
          "Adding 1 minute only applies to briefly missing a stop underwater without surfacing—surfacing from deeper than 20ft requires extending the 30ft and all shallower stops by 1.5x.",
      },
      {
        label:
          "C. Descend back to the max bottom depth of 180ft for 10 minutes.",
        isCorrect: false,
        feedback:
          "Never re-descend to the bottom—return to the missed stop depth.",
      },
    ],
  },
  {
    id: "t60_33",
    level: "Tec 60 CCR",
    category: "Underwater DCS Emergency",
    title: "Joint Pain Developing Underwater at 20ft Deco Stop",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.29", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "While decompressing at 20ft (6m) with 15 minutes remaining, you develop deep, throbbing pain in your left shoulder and elbow (suspected underwater DCS). You have had zero oxygen toxicity symptoms and your CNS% is low. What should you do underwater?",
    options: [
      {
        label:
          "A. Immediately abort remaining deco and bolt to the surface.",
        isCorrect: false,
        feedback:
          "Surfacing with 15 minutes of uncleared decompression while already symptomatic will cause massive bubble expansion and severe neurological DCS.",
      },
      {
        label:
          "B. Signal your team ('I think I'm bent'), raise your setpoint to 1.6 ata (since at 20ft/6m pure O2 in the loop cannot exceed 1.6), extend your shallow stops at 20ft/15ft on 100% O2 (with air breaks) as gas/scrubber allow while a teammate alerts the boat to prep emergency O2 and EMS.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR protocol. Deeper than 20ft, raise SP to max 1.4; at 20ft (6m) or shallower where Pamb is 1.6 ata, raise SP to 1.6 (100% O2 loop) and extend the shallow stops while surface support prepares evacuation.",
      },
      {
        label:
          "C. Lower your setpoint to 0.7 ata so your tissues relax.",
        isCorrect: false,
        feedback:
          "Lowering setpoint reduces the oxygen window gradient and worsens bubble growth.",
      },
    ],
  },
  {
    id: "t60_34",
    level: "Tec 60 CCR",
    category: "Isobaric Counterdiffusion",
    title: "Avoiding Isobaric Counterdiffusion (ICD) on Bailout",
    depthFt: 165,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Why does modern Tec 60 CCR gas planning match the Helium-to-Nitrogen ratio of your offboard bailout mixes (e.g., TMx 18/39 and TMx 50/24) to your onboard diluent, and why must you NEVER dive deep on Air/Nitrox diluent and bail out onto a Helium mix?",
    options: [
      {
        label:
          "A. Switching from a slow-diffusing, high-solubility gas (N2) to a fast-diffusing gas (He) at depth causes helium to enter tissues faster than nitrogen leaves—creating supersaturation and inner-ear/skin Isobaric Counterdiffusion (ICD) bubbles even at constant depth.",
        isCorrect: true,
        feedback:
          "Spot on. Matching the He/N2 ratio across your diluent and offboard bailout cylinders prevents sudden inert gas counterdiffusion gradients and optimizes bailout deco times.",
      },
      {
        label:
          "B. Because helium corrodes open-circuit second stages unless mixed with nitrogen.",
        isCorrect: false,
        feedback:
          "Helium is completely inert and non-corrosive.",
      },
      {
        label:
          "C. Because Shearwater computers cannot calculate EAN50.",
        isCorrect: false,
        feedback:
          "Shearwater computers calculate any combination of O2, N2, and He.",
      },
    ],
  },
  {
    id: "t60_35",
    level: "Tec 60 CCR",
    category: "Descent Physics",
    title: "Fast Descent PO2 Spike Past 1.55 ata at 150ft",
    depthFt: 150,
    setpoint: 1.3,
    diluent: "17/35",
    cells: ["1.56", "1.58", "1.55"],
    hudState: "6 GREEN / RED ALERT",
    scenarioText:
      "Chasing a pelagic along a wall to 150ft, you descend rapidly and your HUD flashes an alert: your loop PPO2 has spiked to 1.57 ata because ambient pressure compressed the loop faster than your metabolism consumed oxygen. Your CCR has no mechanical fault. How do you correct it?",
    options: [
      {
        label:
          "A. Keep descending to 180ft and wait for metabolism to burn off the extra oxygen.",
        isCorrect: false,
        feedback:
          "Descending deeper increases ambient pressure and spikes PPO2 even higher, and waiting for metabolism at 1.57+ ata risks CNS toxicity.",
      },
      {
        label:
          "B. Pause your descent immediately, perform a diluent flush (since your diluent PO2 is 0.1–0.2 below setpoint at max depth), verify sensor responsiveness and stable setpoint, and only then resume.",
        isCorrect: true,
        feedback:
          "Correct. Pausing your descent and flushing with your properly chosen diluent rapidly drops the loop PPO2 back below setpoint while simultaneously verifying that your cells respond at depth.",
      },
      {
        label:
          "C. Close the O2 cylinder valve for the rest of the dive.",
        isCorrect: false,
        feedback:
          "A compression spike is caused by Boyle's Law on descent, not a stuck solenoid—shutting the O2 valve is unnecessary once flushed.",
      },
    ],
  },
  {
    id: "t60_36",
    level: "Tec 60 CCR",
    category: "Offboard Hardware Failure",
    title: "Blown High-O2 Bailout SPG + Simultaneous CO2 Alarm",
    depthFt: 170,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.31", "1.30"],
    hudState: "CO2 BREAKTHROUGH ALARM",
    scenarioText:
      "At 170ft, the SPG hose on your high-O2 deco bailout cylinder (TMx 50/24) ruptures, so you feather/shut its valve down. Moments later, as you start ascending, your CCR scrubber breaks through with high CO2, forcing you onto open-circuit bailout on your low-O2 cylinder (TMx 18/39). You don't have enough volume in the low-O2 bottle alone to finish all shallow stops. What is your best option once you reach 60ft?",
    options: [
      {
        label:
          "A. Underwater at your 60ft stop, swap the working regulator first stage from your depleted low-O2 cylinder onto your full high-O2 cylinder (or remove/plug the blown SPG port with an emergency tool) so you can breathe the high-O2 gas for shallow deco.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR problem-solving procedure (Chapter 2, Exercise 2-6 #7). While the regulator will need a full overhaul after a wet transfer, swapping the working DIN regulator underwater gives you full access to your high-O2 deco gas.",
      },
      {
        label:
          "B. Go back onto the CCR loop at 60ft despite the CO2 breakthrough.",
        isCorrect: false,
        feedback:
          "Never return to a loop with scrubber breakthrough.",
      },
      {
        label:
          "C. Skip all stops shallower than 60ft and surface immediately.",
        isCorrect: false,
        feedback:
          "Skipping 60ft-to-surface decompression carries a near-certain risk of severe/fatal DCS when you have a full cylinder of deco gas clipped to your harness.",
      },
    ],
  },
  {
    id: "t60_37",
    level: "Tec 60 CCR",
    category: "Decompression Physics",
    title: "Loop Volume Creeping Up During Long Shallow Deco Stop",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.29"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "You have been hovering rock-steady at your 20ft (6m) deco stop for 20 minutes. You haven't touched your manual valves or triggered the ADV, and your PPO2 is holding steady at 1.30—yet you notice your counterlung volume has gradually crept above Minimum Loop, making you slightly buoyant. Where is this extra gas coming from?",
    options: [
      {
        label:
          "A. Dissolved inert gas (nitrogen and helium) diffusing out of your tissues into your lungs and exhaled into the loop, combined with the solenoid adding O2 to keep that growing gas volume at 1.30 setpoint. Vent small amounts via your nose periodically to restore Minimum Loop.",
        isCorrect: true,
        feedback:
          "Spot on (Tec 60 CCR Ch. 1 & 2). During long shallow stops, you off-gas significant inert gas volume from your tissues into the loop, which dilutes loop FO2 and prompts the solenoid to inject additional O2 volume.",
      },
      {
        label:
          "B. Water is leaking into the counterlung and displacing gas.",
        isCorrect: false,
        feedback:
          "Water entering the loop makes you negatively buoyant, not positively buoyant.",
      },
      {
        label:
          "C. Your scrubber is generating carbon monoxide.",
        isCorrect: false,
        feedback:
          "Soda lime absorbs CO2 and generates heat and moisture, not gas volume.",
      },
    ],
  },
  {
    id: "t60_38",
    level: "Tec 60 CCR",
    category: "Surface First Aid",
    title: "Administering Emergency 100% O2 via CCR on the Boat",
    depthFt: 0,
    setpoint: 1.0,
    diluent: "16/40",
    cells: ["0.96", "0.97", "0.96"],
    hudState: "SURFACE EMERGENCY O2 MODE",
    scenarioText:
      "On a remote dive boat, a diver develops DCI symptoms after a dive and the boat's demand O2 kit runs low before the coast guard arrives. How do you configure a CCR to supply continuous ~100% emergency oxygen to a responsive, breathing patient lying on deck?",
    options: [
      {
        label:
          "A. Close the diluent cylinder valve, empty the loop and flush repeatedly with manual O2 until displays read ≥0.95 PO2, have the patient lie down and breathe with nostrils pinched (no mask/noseclips), monitor PO2/scrubber continuously, and completely re-flush the loop with O2 every 15–20 minutes.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR Chapter 3 procedure. Re-flushing the loop every 15–20 minutes is essential because the patient is continuously off-gassing nitrogen/helium from their tissues into the loop.",
      },
      {
        label:
          "B. Leave the diluent valve open and set the computer to 0.7 setpoint.",
        isCorrect: false,
        feedback:
          "Leaving diluent open and running 0.7 SP only gives the patient 70% O2 instead of ~100% O2.",
      },
      {
        label:
          "C. Strap a full mask and noseclips onto an unresponsive, non-breathing patient.",
        isCorrect: false,
        feedback:
          "A CCR loop should only be used for a responsive patient who can hold the mouthpiece; never put a mask or noseclips on a DCI patient on deck.",
      },
    ],
  },

  // =====================================================
  // TEC 100 CCR EXPEDITION SCENARIOS (39 - 50)
  // =====================================================
  {
    id: "t100_39",
    level: "Tec 100 CCR",
    category: "Hypoxic Diluent",
    title: "Breathing Hypoxic Trimix (10/70) on BOV at the Surface",
    depthFt: 5,
    setpoint: 0.7,
    diluent: "10/70",
    cells: ["0.70", "0.71", "0.70"],
    hudState: "3 YELLOW BLINKS",
    scenarioText:
      "You are gearing up for a 300ft (90m) expedition dive using hypoxic Trimix 10/70 as your onboard diluent (FO2 = 10%, breathable no shallower than 20ft/6m). During a choppy surface swim to the shotline, why must you NEVER bail out to your onboard BOV or inhale onboard diluent at the surface?",
    options: [
      {
        label:
          "A. At the surface (1.0 ata), Trimix 10/70 has an inspired PO2 of only 0.10 ata—taking 2–3 open-circuit breaths off the BOV flushes your lungs with hypoxic gas and causes immediate shallow-water blackout without warning.",
        isCorrect: true,
        feedback:
          "Critical Tec 100 CCR rule. When diving hypoxic onboard diluent (<16% O2), the BOV is lethal at the surface and in the top 20ft. You must either isolate the BOV at the surface, plumb your BOV to an offboard travel/bailout gas (≥16% O2), or bail out directly to your offboard travel stage.",
      },
      {
        label:
          "B. Because 70% helium causes HPNS at the surface.",
        isCorrect: false,
        feedback:
          "HPNS only occurs under extreme ambient pressure (>400ft), never at the surface.",
      },
      {
        label:
          "C. Because the BOV second stage freezes in warm water with helium.",
        isCorrect: false,
        feedback:
          "The hazard is acute hypoxia (0.10 ata PO2) from breathing 10% oxygen at 1.0 bar ambient pressure.",
      },
    ],
  },
  {
    id: "t100_40",
    level: "Tec 100 CCR",
    category: "Gas Density & CO2",
    title: "Extreme Gas Density & Runaway Work-of-Breathing Spiral at 300ft",
    depthFt: 300,
    setpoint: 1.3,
    diluent: "10/60",
    cells: ["1.30", "1.31", "1.29"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "At 300ft (10 bar ambient pressure), a diver encounters a stiff current and swims hard to reach the wreck. Even with helium in the loop, resistive Work of Breathing (WOB) is high due to gas density. Why can heavy exertion at 300ft trigger an unrecoverable hypercapnia spiral even when the scrubber is 100% fresh?",
    options: [
      {
        label:
          "A. Doubling gas flow rate quadruples resistive drag; at high gas density, the respiratory muscles generate CO2 faster than alveolar ventilation can eliminate it, AND dense gas molecules crowd the scrubber bed ('rolloff'), leading to runaway CO2 retention and blackout.",
        isCorrect: true,
        feedback:
          "Spot on (Tec 40 Ch. 2 & Tec 60 Ch. 2/3). At extreme depth, high gas density simultaneously impairs lung gas exchange, increases muscular CO2 production from breathing effort, and degrades scrubber efficiency. Keep gas density ≤5.2 g/L and never overexert at depth.",
      },
      {
        label:
          "B. Because helium turns into a liquid at 300ft.",
        isCorrect: false,
        feedback:
          "Helium remains a gas; the danger is gas density (g/L) driving resistive WOB and internal CO2 retention.",
      },
      {
        label:
          "C. Because the solenoid stops firing below 250ft.",
        isCorrect: false,
        feedback:
          "Type T CCRs are Depth-tested to 330ft (100m); the limit here is human respiratory physiology.",
      },
    ],
  },
  {
    id: "t100_41",
    level: "Tec 100 CCR",
    category: "HPNS & Compression",
    title: "High Pressure Nervous Syndrome (HPNS) Tremors on Rapid Descent",
    depthFt: 330,
    setpoint: 1.3,
    diluent: "10/75",
    cells: ["1.30", "1.30", "1.31"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "On a rapid descent past 330ft (100m+) breathing a high-helium diluent (low nitrogen), a diver develops fine hand tremors, myoclonic jerking, dizziness, and nausea despite normal PPO2 and low END. What condition is occurring, and how does gas selection mitigate it?",
    options: [
      {
        label:
          "A. High Pressure Nervous Syndrome (HPNS), caused by rapid hydrostatic compression of the central nervous system. It is mitigated by slowing descent rates and using Trimix (retaining a controlled fraction of nitrogen for its mild narcotic counterbalance) rather than pure Heliox.",
        isCorrect: true,
        feedback:
          "Exact Tec 60/100 CCR theory (Ch. 1 p. 54). Researchers added nitrogen to heliox (creating trimix) specifically because nitrogen's mild lipid anesthesia counteracts HPNS tremors at extreme depths.",
      },
      {
        label:
          "B. Hypothermia from breathing warm loop gas.",
        isCorrect: false,
        feedback:
          "The scrubber reaction warms loop gas; tremors and jerking on fast deep descents with high helium are classic HPNS.",
      },
      {
        label:
          "C. Oxygen ear squeeze.",
        isCorrect: false,
        feedback:
          "Oxygen ear occurs hours after a dive when high-FO2 gas is absorbed from the middle ear.",
      },
    ],
  },
  {
    id: "t100_42",
    level: "Tec 100 CCR",
    category: "Multi-Stage Bailout",
    title: "Staging & Managing 3+ Offboard Bailout Cylinders",
    depthFt: 280,
    setpoint: 1.3,
    diluent: "10/65",
    cells: ["1.30", "1.29", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "On a 280ft dive requiring three offboard bailout cylinders (Deep Bailout TMx 14/55, Intermediate Bailout TMx 35/25, and Shallow Deco EAN50/O2), which cylinder valves should be OPEN and which CLOSED while on the bottom at 280ft?",
    options: [
      {
        label:
          "A. Keep the breathable Deep Bailout cylinder (TMx 14/55) valve OPEN for immediate access, and keep all hyperoxic/deco cylinders that are toxic at current depth CLOSED until ascending to their respective MOD switch depths.",
        isCorrect: true,
        feedback:
          "Universal Tec CCR rule (Tec 60 Ch. 1 p. 89): Cylinders containing gas that is breathable at your current depth may be kept open; cylinders with non-breathable (toxic) high-O2 mixes must be kept closed until reaching their switch depth.",
      },
      {
        label:
          "B. Keep all three bailout cylinder valves wide open at 280ft to save time later.",
        isCorrect: false,
        feedback:
          "Leaving high-O2 cylinders open at 280ft risks a fatal wrong-gas switch convulsion or losing your deco gas to a unnoticed regulator freeflow.",
      },
      {
        label:
          "C. Keep all three bailout cylinders closed at 280ft.",
        isCorrect: false,
        feedback:
          "Your primary deep bailout cylinder must be pressurized and open so you can breathe it immediately in a sudden emergency.",
      },
    ],
  },
  {
    id: "t100_43",
    level: "Tec 100 CCR",
    category: "Counterdiffusion / Gas Switches",
    title: "Sequential Offboard Loop Flushes on Ascent to Accelerate Deco",
    depthFt: 120,
    setpoint: 1.3,
    diluent: "10/65",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "After a deep dive on Trimix 10/65 diluent, you are ascending through 120ft on an intact CCR loop. Why do expedition CCR divers often plumb in and flush the loop with a less-helium/higher-N2 offboard bailout mix (or normoxic trimix) during intermediate decompression stops?",
    options: [
      {
        label:
          "A. To conserve onboard diluent and optimize the inert gas gradient (tailoring the He/N2 ratio in the loop for shallower stops), while avoiding abrupt full-EANx switches that could trigger Isobaric Counterdiffusion (ICD).",
        isCorrect: true,
        feedback:
          "Spot on. Plumbing offboard stages into the loop via quick-disconnects lets you flush with intermediate trimix blends on ascent, optimizing off-gassing and conserving onboard gas.",
      },
      {
        label:
          "B. Because 10/65 diluent cannot be used with a 1.3 setpoint at 120ft.",
        isCorrect: false,
        feedback:
          "At 120ft (4.63 ata), the loop FO2 at 1.3 SP is 28% regardless of whether the diluent started at 10% O2—the difference is the He/N2 ratio of the remaining 72% inert fraction.",
      },
      {
        label:
          "C. To cool the scrubber down.",
        isCorrect: false,
        feedback:
          "Cooling the scrubber reduces its reaction efficiency; helium actually conducts heat away faster than nitrogen.",
      },
    ],
  },
  {
    id: "t100_44",
    level: "Tec 100 CCR",
    category: "Oxygen Exposure",
    title: "Managing Multi-Hour CNS% and OTU Limits with Setpoint Stepping",
    depthFt: 260,
    setpoint: 1.1,
    diluent: "10/65",
    cells: ["1.10", "1.10", "1.11"],
    hudState: "1 GREEN BLINK (1.1 ATA)",
    scenarioText:
      "On a 260ft dive with a 3-hour total run time, why might you intentionally run a 1.0–1.1 ata setpoint on the bottom and step up to 1.3–1.4 ata only during the shallow decompression stops, plus take 5-minute low-PO2 'air breaks' every 20 minutes on deco?",
    options: [
      {
        label:
          "A. At 260ft (8.9 bar), a 0.2 ata change in bottom setpoint makes almost zero difference to the huge inert gas pressure (7.8 vs 7.6 bar), so running 1.1 on the bottom saves significant CNS% and OTU allowance for the shallow deco stops where high PO2 provides the biggest decompression advantage.",
        isCorrect: true,
        feedback:
          "Exact Tec 60/100 CCR oxygen management strategy (Ch. 1 p. 44–45). At extreme depth, 0.2 ata is a tiny fraction of total pressure; at shallow deco stops, raising setpoint dramatically widens the oxygen window.",
      },
      {
        label:
          "B. Because oxygen sensors cannot read above 1.1 ata deeper than 200ft.",
        isCorrect: false,
        feedback:
          "Galvanic O2 sensors read partial pressure (ata) up to 2.0+ ata regardless of depth.",
      },
      {
        label:
          "C. Because running 1.1 on the bottom eliminates all decompression stops.",
        isCorrect: false,
        feedback:
          "A 260ft dive always requires substantial decompression.",
      },
    ],
  },
  {
    id: "t100_45",
    level: "Tec 100 CCR",
    category: "Scrubber Roll-Off",
    title: "Emergency Scrubber Duration Extension on Delayed Ascent",
    depthFt: 60,
    setpoint: 1.3,
    diluent: "12/55",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "An entanglement delay at depth adds 45 minutes of extra decompression, pushing your total run time slightly past your scrubber's rated cold-water duration. Under what strict conditions is it reasonable to stay on the loop as long as safely possible rather than immediately bailing out to OC at 60ft?",
    options: [
      {
        label:
          "A. Only in a genuine emergency when your exertion has been low, you are monitoring remaining capacity (and/or CO2 monitor), and you stay hyper-vigilant to bail out to OC immediately at the first sign of CO2 or before reaching <10% estimated capacity—maximizing gas conservation for the team.",
        isCorrect: true,
        feedback:
          "Correct (Tec 60 Ch. 2 p. 123–124). Staying on an intact loop in an unscheduled deco delay conserves your offboard bailout gas as long as exertion was low and zero CO2 symptoms/alarms exist.",
      },
      {
        label:
          "B. You can routinely exceed rated scrubber time on planned dives if the water is warm.",
        isCorrect: false,
        feedback:
          "Never plan a dive that exceeds manufacturer scrubber duration limits.",
      },
      {
        label:
          "C. Wait until you get a severe splitting headache before bailing out.",
        isCorrect: false,
        feedback:
          "Headache is an unreliable late indicator—by the time a headache hits, breakthrough has already occurred.",
      },
    ],
  },
  {
    id: "t100_46",
    level: "Tec 100 CCR",
    category: "Emergency Decompression",
    title: "Flooded Drysuit in 42°F (5°C) Water — Pushing Deco PO2",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "15/45",
    cells: ["1.30", "1.30", "1.29"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "During a deep cold-water wreck dive (42°F / 5°C), a torn wrist seal floods your drysuit. You are shivering violently as you approach your long 20ft (6m) deco stop, and severe hypothermia is becoming a life-threatening risk. What emergency setpoint adjustment is acceptable once you stabilize at 20ft (6m)?",
    options: [
      {
        label:
          "A. Raise your setpoint to 1.4 ata up to 20ft, and once settled at 20ft (6m) or shallower where pure O2 cannot exceed 1.6 ata, flush the loop with 100% O2 (1.6 ata @ 20ft / 1.5 ata @ 15ft) so your oxygen-monitoring computer accelerates the remaining decompression time.",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR emergency procedure (Ch. 2 p. 145). When a life-threatening thermal emergency requires getting out of the water as fast as safely possible, raising loop PO2 to 1.6 at 20ft (6m) maximizes the oxygen window without exceeding 1.6 ata.",
      },
      {
        label:
          "B. Raise your setpoint to 1.6 ata at 90ft.",
        isCorrect: false,
        feedback:
          "Never run a 1.6 setpoint on the loop deeper than 20ft (6m) due to loop fluctuations spiking past 1.7+ ata.",
      },
      {
        label:
          "C. Inflate your flooded drysuit with helium diluent to warm up.",
        isCorrect: false,
        feedback:
          "Helium has six times the thermal conductivity of air and will strip body heat even faster.",
      },
    ],
  },
  {
    id: "t100_47",
    level: "Tec 100 CCR",
    category: "Computer Failure",
    title: "Violating / Disregarding the More Conservative Backup Computer",
    depthFt: 40,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Normally, you must follow the most conservative of your two dive computers at every stop. Under what rare emergency circumstance does technical CCR protocol permit disregarding the more conservative computer and following the less conservative oxygen-monitoring computer?",
    options: [
      {
        label:
          "A. Only in a life-support emergency (such as bailing out with unexpectedly high gas consumption or a severe thermal failure) where minimizing decompression time is necessary for survival—recognizing the violated computer may lock out for 24–48 hours.",
        isCorrect: true,
        feedback:
          "Correct (Tec 60 CCR Ch. 1 p. 87–88). Normally you clear both computers, but in a critical gas/thermal emergency, following the real-time O2-monitoring computer's shorter schedule is an accepted contingency.",
      },
      {
        label:
          "B. Whenever you are hungry or want to beat the other dive teams back to the boat ladder.",
        isCorrect: false,
        feedback:
          "Convenience is never a valid reason to violate a dive computer.",
      },
      {
        label:
          "C. Whenever the two computers differ by more than 1 minute.",
        isCorrect: false,
        feedback:
          "Minor variations of a few minutes between two computers are completely normal.",
      },
    ],
  },
  {
    id: "t100_48",
    level: "Tec 100 CCR",
    category: "Surface Interval DCS Risk",
    title: "Post-Dive Strenuous Exertion & Patent Foramen Ovale (PFO)",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "15/45",
    cells: ["0.70", "0.70", "0.70"],
    hudState: "POST-DIVE SURFACE",
    scenarioText:
      "After surfacing from a heavy trimix decompression dive, what is a 'Surface Decompression Stop' on a CCR, and why must you avoid heavy lifting (like hauling twin bailout tanks and CCR rigs up a steep ladder) for several hours after surfacing?",
    options: [
      {
        label:
          "A. Staying on the loop breathing high oxygen for 5–10+ minutes at the surface before exerting yourself helps clear peak venous gas loads; heavy exertion spikes intrathoracic pressure, which can open a latent Patent Foramen Ovale (PFO) in the heart and shunt venous microbubbles directly into the arterial brain/spinal circulation.",
        isCorrect: true,
        feedback:
          "Spot on (Tec 60 CCR Ch. 3 p. 169–170). About 20–30% of adults have a tissue-flap PFO; heavy post-dive strain can pop it open and cause severe neurological DCS.",
      },
      {
        label:
          "B. Heavy lifting causes oxygen myopia.",
        isCorrect: false,
        feedback:
          "Oxygen myopia is caused by prolonged hyperoxic exposure to the lens of the eye, not lifting gear.",
      },
      {
        label:
          "C. Breathing high O2 at the surface causes nitrogen narcosis.",
        isCorrect: false,
        feedback:
          "There is no narcosis at the surface.",
      },
    ],
  },
  {
    id: "t100_49",
    level: "Tec 100 CCR",
    category: "Drift Decompression",
    title: "Leaking or Spilled DSMB / Lift Bag During Blue-Water Drift Deco",
    depthFt: 60,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "While conducting a blue-water drift decompression hang at 60ft under your primary DSMB, the buoy's over-pressure valve leaks partially—leaving it too low in the swell for the boat captain to see, yet still too buoyant to pull back down to 60ft to reinflate. What are the two accepted tec protocols?",
    options: [
      {
        label:
          "A. Either clip a second DSMB/lift bag onto the existing line and send it up to restore surface buoyancy on a single line, OR deploy a backup DSMB on a separate reel/spool—depending on the pre-agreed regional/team protocol.",
        isCorrect: true,
        feedback:
          "Correct (Tec 60 CCR Ch. 1 p. 102 & Tec 40 Ch. 3 p. 264). Both methods are taught and valid depending on local drift conditions and line integrity.",
      },
      {
        label:
          "B. Ascend from 60ft to the surface to orally inflate the DSMB, then drop back down to 60ft.",
        isCorrect: false,
        feedback:
          "Never violate a 60ft decompression ceiling to fix a surface marker buoy!",
      },
      {
        label:
          "C. Cut the DSMB line and drift with no surface marker at all.",
        isCorrect: false,
        feedback:
          "Drifting in open ocean on a bubble-free CCR without a surface marker risks losing contact with the chase boat.",
      },
    ],
  },
  {
    id: "t100_50",
    level: "Tec 100 CCR",
    category: "Chronic Hyperoxia",
    title: "Oxygen Myopia vs. Oxygen Ear After Multi-Day Expedition",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "15/45",
    cells: ["0.70", "0.70", "0.70"],
    hudState: "EXPEDITION DEBRIEF",
    scenarioText:
      "After five consecutive days of long CCR decompression dives at 1.3 setpoint, Diver A notices distant objects on the horizon look blurry (near-sightedness), while Diver B wakes up 4 hours after the dive with a fullness/squeeze sensation in both ears. What are these two conditions and how are they managed?",
    options: [
      {
        label:
          "A. Diver A has Oxygen Myopia (lens metabolism shift—discontinue diving until vision reverses; prevent by flushing mask with low-O2 diluent instead of loop gas). Diver B has Oxygen Ear (post-dive absorption of 80%+ loop O2 from the middle ear—equalize periodically after surfacing or exchange middle-ear gas with low-O2 mix at the final stop).",
        isCorrect: true,
        feedback:
          "Exact Tec 60 CCR Chapter 2 diagnosis (p. 127–128). Both are classic CCR hyperoxic effects that every expedition rebreather diver must recognize.",
      },
      {
        label:
          "B. Both divers have arterial gas embolisms requiring immediate recompression.",
        isCorrect: false,
        feedback:
          "Gradual progressive myopia over multi-day high-O2 exposure and delayed middle-ear oxygen absorption squeeze are specific non-embolism hyperoxic phenomena.",
      },
      {
        label:
          "C. Diver A should raise their setpoint to 1.6 on the next dive to clear their vision.",
        isCorrect: false,
        feedback:
          "Continuing to dive at high PO2 worsens oxygen myopia—you must discontinue high-PO2 exposure until it resolves.",
      },
    ],
  },
];