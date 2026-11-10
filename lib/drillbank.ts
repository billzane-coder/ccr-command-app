// lib/drillbank.ts — PART 1 (Scenarios 1 to 30: P2 Hardware & Mod 1 Air/EANx)

export type DrillLevel =
  | "P2 Hardware"
  | "Mod 1: Air/EANx"
  | "Mod 2: Normoxic"
  | "Mod 3: Hypoxic";

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
  // P2 HARDWARE SPECIFIC SCENARIOS (1 - 15)
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
      "At 120ft on 1.3 SP, you hear continuous oxygen injection and see loop PPO2 climb past 1.68 across all cells. Since the Prism 2 has no internal solenoid shutoff slider, how do you stabilize and isolate whether the Solenoid or Manual O2 Block failed?",
    options: [
      {
        label:
          "Switch to BOV open-circuit, shut the right-hand O2 valve, flush the loop with diluent, unplug the Manual O2 Block QD, and crack the O2 valve 1/2 turn while watching PPO2.",
        isCorrect: true,
        feedback:
          "Correct. Unplugging the Manual O2 Block QD isolates the two O2 pathways: cracking the tank valve 1/2 turn shows if the solenoid failed open (PPO2 rises) or if the manual block leaked (PPO2 holds steady).",
      },
      {
        label:
          "Drop your handset setpoint to 0.19 immediately, flush continuously with diluent while staying on the loop, disconnect the left-side ADV hose, and monitor whether PPO2 stabilizes below 1.40.",
        isCorrect: false,
        feedback:
          "Incorrect. Changing electronic setpoint to 0.19 cannot stop a mechanically fouled solenoid or leaking manual O2 valve, and staying on a 1.7+ ata loop risks immediate CNS convulsions.",
      },
      {
        label:
          "Switch to BOV open-circuit, leave the Manual O2 QD connected to bleed line pressure, unthread the 5-pin DiveCAN handset connector to de-energize the SOLO coil, and ascend.",
        isCorrect: false,
        feedback:
          "Incorrect. Never unthread wet-mate or DiveCAN sleeves expecting to stop a mechanical seat leak, and while submerged the SOLO board operates independently of the handset anyway.",
      },
      {
        label:
          "Stay on closed-circuit while venting gas out your nose, close the right-hand O2 tank valve, press the manual O2 button to drain intermediate pressure, and run semiclosed on onboard diluent.",
        isCorrect: false,
        feedback:
          "Incorrect. You should get off a dangerously hyperoxic loop onto known gas first, and unplugging the MAV QD lets you retain full automatic solenoid control if only the manual button leaked.",
      },
    ],
  },
  {
    id: "p2_02",
    level: "P2 Hardware",
    category: "Electronics / Cells",
    title: "Cell Divergence & VOTING FAILED on Ascent",
    depthFt: 100,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.45", "1.05", "1.52"],
    hudState: "MIXED BLINKS ACROSS ALL THREE COLUMNS",
    scenarioText:
      "Ascending toward 100ft, your handset center row turns yellow and alternates between [.45 / 1.05 / 1.52] and 'VOTING FAILED'. How does the P2 controller respond during VOTING FAILED, and what is your immediate diagnostic procedure?",
    options: [
      {
        label:
          "Automatic solenoid firing stops and decompression math defaults to the lowest cell (0.45); verify safe DilPO2, flush the loop with diluent to identify truthful cells, or bail out.",
        isCorrect: true,
        feedback:
          "Spot on. When no two sensors agree within 20%, the SOLO board halts automatic O2 firing to prevent runaway injection and calculates deco using the lowest sensor down to 0.16 ata.",
      },
      {
        label:
          "The controller averages all three sensors (1.01 ata) and keeps firing the solenoid conservatively; inject a manual burst of O2 to test whether Cell 1 climbs out of hypoxia.",
        isCorrect: false,
        feedback:
          "Incorrect. Averaging stops completely when all three cells diverge beyond 20%, and blindly injecting O2 when Cell 3 already reads 1.52 ata risks spiking actual loop PPO2 past 1.6.",
      },
      {
        label:
          "Automatic solenoid firing locks onto the middle sensor (1.05 ata) as a tie-breaker; open the handset menu underwater to recalibrate the sensors against a fresh diluent flush.",
        isCorrect: false,
        feedback:
          "Incorrect. Neither Shearwater nor SOLO uses median tie-breaking during voting failure, and the Calibration menu is completely locked out whenever the unit is submerged in dive mode.",
      },
      {
        label:
          "The solenoid switches to a fixed timed pulse every 15 seconds and deco math freezes; switch your handset to 0.7 setpoint so Cell 1 and Cell 2 re-align within 20%.",
        isCorrect: false,
        feedback:
          "Incorrect. DiveCAN SOLO controllers never fire blind timed O2 pulses when sensor voting fails, and changing electronic setpoint does not change existing cell millivolt divergence.",
      },
    ],
  },
  {
    id: "p2_03",
    level: "P2 Hardware",
    category: "DiveCAN Architecture",
    title: "Detached Wrist Handset at Surface vs. Submerged",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["---", "---", "---"],
    hudState: "3 YELLOW BLINKS (0.7 ATA)",
    scenarioText:
      "While gearing up on the boat bench before entry, a snag pulls the 5-pin DiveCAN handset connector apart because the locking sleeve O-rings were omitted. Your HUD still flashes 3 yellow blinks (0.7). How does the SOLO board behave on the surface?",
    options: [
      {
        label:
          "Independent SOLO solenoid firing only functions while submerged in dive mode; losing the primary handset at the surface disables all automatic oxygen injection despite active HUD blinks.",
        isCorrect: true,
        feedback:
          "Correct. To prevent draining cylinders on the bench, independent SOLO setpoint maintenance is strictly active while submerged. Never breathe the loop at the surface with an unplugged handset.",
      },
      {
        label:
          "The SOLO board maintains the 0.70 ata low setpoint automatically both at the surface and at depth as long as the OBOE monitor bus still powers the LED HUD.",
        isCorrect: false,
        feedback:
          "Incorrect. On the surface, detaching the primary handset halts automatic solenoid control completely—even though the OBOE board continues transmitting sensor PPO2 to the HUD.",
      },
      {
        label:
          "The HUD automatically promotes itself from a monitor device to master bus controller on the surface and fires the solenoid at 0.70 ata until the handset is reconnected.",
        isCorrect: false,
        feedback:
          "Incorrect. The LED HUD sits on the OBOE monitor bus and only sends manual user tap commands to SOLO; it never acts as an automatic PID solenoid controller at the surface.",
      },
      {
        label:
          "Disconnecting the DiveCAN handset at the surface triggers a fail-safe continuous trickle from the solenoid, requiring you to shut the right-hand oxygen cylinder valve immediately.",
        isCorrect: false,
        feedback:
          "Incorrect. The P2 solenoid is an electrically actuated normally-closed valve—losing handset comms on the surface leaves it closed, creating a surface hypoxia hazard if breathed.",
      },
    ],
  },
  {
    id: "p2_04",
    level: "P2 Hardware",
    category: "HUD Blink Code",
    title: "Primary Handset Blank — Decoding LED HUD Blink Pattern",
    depthFt: 90,
    setpoint: 1.2,
    diluent: "18/45",
    cells: ["---", "---", "---"],
    hudState: "COL 1: 1 GRN | COL 2: 1 GRN | COL 3: 4 YEL",
    scenarioText:
      "Your primary wrist handset floods and goes dark at 90ft. Checking your Hollis LED HUD, Column 1 flashes 1 Green blink, Column 2 flashes 1 Green blink, and Column 3 flashes 4 Yellow blinks per cycle. What are your three O2 sensors reading?",
    options: [
      {
        label:
          "Cell 1 = 1.1 ata, Cell 2 = 1.1 ata, and Cell 3 = 0.6 ata — indicating two healthy sensors tracking together while Cell 3 is failing low or current-limiting.",
        isCorrect: true,
        feedback:
          "Exact HUD decode. Alternating Green/Yellow marks 1.0 ata; each Green blink adds +0.1 ata above 1.0 (1 Green = 1.1), and each Yellow blink subtracts 0.1 ata below 1.0 (4 Yellow = 0.6).",
      },
      {
        label:
          "Cell 1 = 1.0 ata, Cell 2 = 1.0 ata, and Cell 3 = 0.4 ata — indicating the SOLO board has dropped to backup low setpoint while Cell 3 has completely disconnected.",
        isCorrect: false,
        feedback:
          "Incorrect. 1.0 ata is displayed as alternating Green+Yellow flashes, not a single Green flash, and 0.4 ata below 1.0 would produce 6 rapid Red blinks at the bottom of Column 3.",
      },
      {
        label:
          "Cell 1 = 1.2 ata, Cell 2 = 1.2 ata, and Cell 3 = 0.8 ata — because Green blinks count upward in 0.2 ata increments while Yellow blinks count downward in 0.05 ata steps.",
        isCorrect: false,
        feedback:
          "Incorrect. Every blink on the Hollis LED HUD represents a uniform 0.1 ata step away from the 1.0 ata centerline (1 Green = 1.1 ata; 4 Yellow = 0.6 ata).",
      },
      {
        label:
          "Cell 1 = 0.9 ata, Cell 2 = 0.9 ata, and Cell 3 = 1.4 ata — indicating two sensors reading slightly below 1.0 ata while Cell 3 is spiking toward hyperoxia.",
        isCorrect: false,
        feedback:
          "Incorrect. You reversed the color scheme: Green blinks always indicate PPO2 above 1.0 ata (1.1 to 1.6), while Yellow blinks indicate PPO2 below 1.0 ata (0.9 down to 0.5).",
      },
    ],
  },
  {
    id: "p2_05",
    level: "P2 Hardware",
    category: "HUD Wet-Contact Commands",
    title: "Commanding Manual Solenoid O2 Boost via LED HUD",
    depthFt: 80,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.68", "0.69", "0.68"],
    hudState: "3 YELLOW BLINKS ACROSS ALL COLUMNS",
    scenarioText:
      "After losing your primary wrist controller at 80ft, your rig is holding the 0.70 ata fallback setpoint. Using only the wet-contact pins on your Hollis LED HUD, how do you command a 2.5-second solenoid O2 injection versus switching setpoint to 1.2?",
    options: [
      {
        label:
          "Double-tap the wet contacts once to highlight Column 1 and hold 3 seconds for a 2.5s O2 shot, or double-tap twice to Column 2 and hold 3 seconds for 1.2 SP.",
        isCorrect: true,
        feedback:
          "Spot on. Saying 'tap-tap' (~1s) steps across HUD command columns: Column 1 fires a 2.5-second solenoid O2 burst, and Column 2 toggles active SOLO setpoint between 0.7 and 1.2.",
      },
      {
        label:
          "Bridge the wet contacts continuously for 5 seconds to fire a 2.5s O2 burst, or double-tap three times to Column 3 and hold 3 seconds to engage the 1.2 setpoint.",
        isCorrect: false,
        feedback:
          "Incorrect. Bridging for 5 seconds powers the HUD on at startup, and Column 3 is surface Calibration (which must never be attempted underwater).",
      },
      {
        label:
          "Single-tap the wet contacts rapidly four times to pulse the solenoid for 2.5 seconds, or hold the wet contacts for 10 full seconds to step SOLO up to 1.2 SP.",
        isCorrect: false,
        feedback:
          "Incorrect. Single taps or 10-second holds are ignored to prevent false triggers in saltwater; all HUD commands require paced double-taps followed by a 3-second confirmation hold.",
      },
      {
        label:
          "The LED HUD is strictly a passive optical monitor on the OBOE board and has zero electrical ability to fire the solenoid or alter SOLO setpoints underwater.",
        isCorrect: false,
        feedback:
          "Incorrect. Unlike basic analog HUDs, the DiveCAN Hollis LED HUD includes wet-contact command capability allowing emergency O2 injection (Col 1) and 0.7/1.2 SP switching (Col 2).",
      },
    ],
  },
  {
    id: "p2_06",
    level: "P2 Hardware",
    category: "Head & Scrubber Assembly",
    title: "Total Exhalation Lock-Up Upon Entering the Water",
    depthFt: 15,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.72", "0.71", "0.72"],
    hudState: "3 YELLOW BLINKS",
    scenarioText:
      "A diver rushes a turnaround repack, skips the 5-minute pre-breath, and splashes in. At 15ft they can inhale from the loop (triggering the ADV), but when exhaling, the loop locks solid and gas blows out their mask skirt. What assembly fault occurred?",
    options: [
      {
        label:
          "The radial scrubber basket was loaded upside down in the bucket, pressing its solid flat bottom plate tight against the red silicone CO2 seal and blocking the center bore.",
        isCorrect: true,
        feedback:
          "Correct. Inserting the P2 radial basket upside down seals its solid bottom end-cap directly over the head's central gas port, completely blocking exhalation flow through the canister.",
      },
      {
        label:
          "The red silicone CO2 seal was accidentally omitted from the head plate channel during assembly, allowing exhaled gas to pressurize the sensor chamber and jam the check valve.",
        isCorrect: false,
        feedback:
          "Incorrect. Omitting the red CO2 seal causes zero breathing resistance and 100% scrubber bypass (silent, rapid hypercapnia)—it never blocks gas flow.",
      },
      {
        label:
          "Both DSV directional mushroom valves were installed backwards during post-dive reassembly, allowing inhalation from the right hose while locking off exhalation on the left.",
        isCorrect: false,
        feedback:
          "Incorrect. If both DSV mushroom valves were reversed, loop flow would simply run backwards (right-to-left) with normal resistance rather than locking exhalation solid.",
      },
      {
        label:
          "The counterlung over-pressure relief valve (OPV) was rotated fully clockwise prior to the positive pressure test and left capped, trapping exhaled gas inside the bladder.",
        isCorrect: false,
        feedback:
          "Incorrect. Even with the OPV dialed fully clockwise for diving, exhaled gas circulates freely through the scrubber into the inhalation counterlung unless the canister path is obstructed.",
      },
    ],
  },
  {
    id: "p2_07",
    level: "P2 Hardware",
    category: "Solenoid Power",
    title: "Dynamic EXT V Sag Below 7.0V During Deep Ascent",
    depthFt: 110,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["1.12", "1.14", "1.13"],
    hudState: "YELLOW BLINKS + LOW EXT BATTERY ALERT",
    scenarioText:
      "While ascending from 140ft through 110ft, solenoid duty cycle increases to offset falling ambient pressure. Your handset triggers a Low External Battery alert (EXT V = 6.6V) and loop PPO2 lags down at 1.12. How should you manage the ascent?",
    options: [
      {
        label:
          "Expect imminent solenoid failure as the dual 9V head batteries sag below 7.0V; maintain setpoint manually using short Manual O2 Addition bursts while ascending at normal speed.",
        isCorrect: true,
        feedback:
          "Correct. Below the 7.0V dynamic threshold, the solenoid coil may lack magnetic pull to lift the plunger against 145 psi IP. Transition smoothly to manual O2 addition and abort.",
      },
      {
        label:
          "Double your ascent rate to 60 ft/min up to your first stop so you clear deep water before the 9V solenoid batteries drop below their 5.0V hardware cutoff.",
        isCorrect: false,
        feedback:
          "Dangerous! Ascending rapidly causes ambient pressure (and loop PPO2) to plummet twice as fast while violating decompression ceilings and risking acute ascent hypoxia.",
      },
      {
        label:
          "Switch the handset to 0.70 setpoint to reduce solenoid duty cycle until reaching 30ft, knowing the handset's internal 3.6V lithium battery will take over coil power if EXT V dies.",
        isCorrect: false,
        feedback:
          "Incorrect. The wrist handset battery (INT V) strictly powers DiveCAN logic and display optics—it is electrically isolated from driving the 6V head solenoid coil.",
      },
      {
        label:
          "Immediately bail out onto open-circuit backgas for the entire ascent because low EXT V simultaneously shuts down all three O2 sensor amplifiers and decompression tissue tracking.",
        isCorrect: false,
        feedback:
          "Incorrect. Sensor amplification and decompression tracking are powered independently by the handset/OBOE lithium cells—with intact scrubbers and sensors, manual O2 loop control works cleanly.",
      },
    ],
  },
  {
    id: "p2_08",
    level: "P2 Hardware",
    category: "Solenoid Plumbing",
    title: "Solenoid Clicking Audibly While Loop PPO2 Continues Falling",
    depthFt: 85,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["0.62", "0.61", "0.63"],
    hudState: "4 YELLOW BLINKS",
    scenarioText:
      "At 85ft, your O2 SPG shows 2,200 psi, pressing your Manual O2 Addition button injects O2 briskly, and you hear the head solenoid clicking every few seconds—yet loop PPO2 drops steadily unless you add O2 manually. Which P2 part is obstructed?",
    options: [
      {
        label:
          "The 0.0020-inch sintered bronze inline flow restrictor inside the solenoid LP hose fitting on the O2 first stage is clogged; fly the loop manually via MAV and abort.",
        isCorrect: true,
        feedback:
          "Exact P2 diagnosis. The manual O2 block uses a standard LP port, whereas the solenoid hose relies on a tiny 0.0020\" restrictor orifice at the 1st stage that clogs easily if moisture enters.",
      },
      {
        label:
          "The high-pressure sintered inlet filter inside the DIN wheel of the oxygen first stage is blocked; switch to open-circuit bailout immediately before the MAV starves too.",
        isCorrect: false,
        feedback:
          "Incorrect. If the 1st stage DIN inlet filter were blocked, the SPG or MAV flow would sag when pressed—brisk MAV delivery proves 1st stage intermediate pressure is healthy.",
      },
      {
        label:
          "All three galvanic O2 sensors have become coated with condensation simultaneously and are under-reporting actual loop PPO2; perform an immediate pure O2 flush to dry them.",
        isCorrect: false,
        feedback:
          "Incorrect. The sensors respond immediately whenever you press the manual O2 button, proving the cells are active and that no gas is passing through the clicking solenoid.",
      },
      {
        label:
          "The internal stainless steel battery cap over-pressure relief valve on the head has popped open, venting every solenoid O2 pulse directly into the surrounding water.",
        isCorrect: false,
        feedback:
          "Incorrect. A popped head relief valve produces an unmistakable stream of bubbles behind your neck whenever the solenoid fires or when positive loop pressure builds.",
      },
    ],
  },
  {
    id: "p2_09",
    level: "P2 Hardware",
    category: "Loop Hardware",
    title: "Leaking White Inhalation Hose Nut During Bubble Check",
    depthFt: 20,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.72", "0.73", "0.72"],
    hudState: "3 YELLOW BLINKS",
    scenarioText:
      "During your 20ft descent bubble check, your teammate points out bubbles escaping where the left inhalation hose nut (white Delrin nut over the white head stripe) meets the electronics head. Reaching back to snug it down, which direction do you rotate it?",
    options: [
      {
        label:
          "Turn the white left-hand inhalation nut counter-clockwise (looking down onto the port) because Hollis uses a reverse left-hand thread to prevent cross-connecting loop hoses.",
        isCorrect: true,
        feedback:
          "Spot on. On the P2 head, the black exhalation nut uses a standard right-hand thread, while the white inhalation nut is reverse-threaded (counter-clockwise to tighten, clockwise to loosen).",
      },
      {
        label:
          "Turn the white left-hand inhalation nut clockwise (standard right-hand thread) until it bottoms against the stainless reinforcement ring, matching the black exhalation nut.",
        isCorrect: false,
        feedback:
          "Critical trap! Turning the white P2 inhalation nut clockwise unscrews it from the head port, risking a sudden loop flood right behind your neck.",
      },
      {
        label:
          "Push the white Delrin collar straight down and rotate 90 degrees clockwise to lock the quarter-turn bayonet pins, then tug-test the corrugated breathing hose.",
        isCorrect: false,
        feedback:
          "Incorrect. The Prism 2 head uses fully threaded Delrin compression nuts over O-ring spigots, not quarter-turn bayonet collars.",
      },
      {
        label:
          "Do not touch the white nut underwater because it is retained by a set-screw; abort to the surface, drain the loop, and replace the torn flat rubber washer inside.",
        isCorrect: false,
        feedback:
          "Incorrect. There is no locking set-screw or flat washer—it seals via dual radial O-rings and can be gently snugged counter-clockwise if left slightly loose.",
      },
    ],
  },
  {
    id: "p2_10",
    level: "P2 Hardware",
    category: "Water Management",
    title: "Draining Accumulated Water from Front-Mounted Counterlungs",
    depthFt: 75,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "1.19"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "Midway through a dive on a P2 rigged with Front-Mounted Counterlungs (FMCL), you hear heavy gurgling in your right exhalation hose after clearing your mask. How do you route and expel that water underwater without wetting the scrubber?",
    options: [
      {
        label:
          "Lift the corrugated hoses so water runs into the right exhalation counterlung, go vertical, unlock the bottom drain collar counter-clockwise, and pull the drain nipple while adding diluent.",
        isCorrect: true,
        feedback:
          "Correct. The right exhalation counterlung serves as the water trap upstream of the head; unlocking its bottom collar and pulling the nipple under slight positive loop pressure purges water cleanly.",
      },
      {
        label:
          "Pitch head-down at a 45-degree angle, rotate the right shoulder OPV fully counter-clockwise, and exhale forcefully through your mouth to blow water out the shoulder dump.",
        isCorrect: false,
        feedback:
          "Never pitch head-down with water in the loop! Inverting yourself dumps trapped water out of the exhalation lung straight into the electronics head and soda lime canister.",
      },
      {
        label:
          "Hold your DSV mouthpiece above your forehead to prevent flooding, crack the barrel halfway open, and press the manual oxygen button to fountain the water out.",
        isCorrect: false,
        feedback:
          "Incorrect. Raising and cracking a mouthpiece above your head causes violent freeflow/venting of all loop gas followed by immediate loop flooding.",
      },
      {
        label:
          "Leave the bottom drain collars locked to preserve vacuum integrity and inhale slightly deeper to pull the water across the head moisture pads where it will be absorbed.",
        isCorrect: false,
        feedback:
          "Incorrect. Canister foam pads only catch minor humidity condensation—drawing liquid water into the head risks sensor shorting and a caustic alkaline cocktail.",
      },
    ],
  },
  {
    id: "p2_11",
    level: "P2 Hardware",
    category: "DSV / BOV Compatibility",
    title: "Swapping DSV to BOV While Leaving Old Hose Stubs Installed",
    depthFt: 25,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.70", "0.71", "0.70"],
    hudState: "3 YELLOW BLINKS (DISPLAYS NORMAL)",
    scenarioText:
      "Before a trip, a diver upgrades from a standard Hollis DSV to a Hollis BOV by unthreading the hose couplings and attaching the new BOV body onto their existing DSV hose stubs and valve cages. Why is this flagged as a critical hazard?",
    options: [
      {
        label:
          "Hollis DSV and BOV stub fittings and directional valve cages have different internal tolerances and are non-interchangeable, risking check-valve bypass and fatal CO2 rebreathing.",
        isCorrect: true,
        feedback:
          "Correct. DSV and BOV directional cages and hose stubs must never be mixed—always swap the matched valve-and-stub assembly together and run a directional flow test.",
      },
      {
        label:
          "DSV hose stubs use metric threads whereas the BOV body uses imperial threads, causing the breathing hoses to blow off the mouthpiece as soon as the ADV triggers.",
        isCorrect: false,
        feedback:
          "Incorrect. The outer coupling threads physically mate (which is why divers make this mistake!), making the hidden internal check-valve mismatch so insidious.",
      },
      {
        label:
          "Leaving DSV stubs on a BOV blocks the open-circuit second-stage exhaust tee, causing the BOV demand diaphragm to freeflow continuously whenever diluent is pressurized.",
        isCorrect: false,
        feedback:
          "Incorrect. The open-circuit demand exhaust sits centrally on the BOV front cover; the danger of mismatched stubs lies in compromising closed-circuit directional mushroom sealing.",
      },
      {
        label:
          "DSV stubs lack the internal stainless grounding ring required by the BOV, causing static interference across the DiveCAN NERD 2 and HUD optical counterweight mounts.",
        isCorrect: false,
        feedback:
          "Incorrect. DiveCAN cables are internally shielded inside their own 5-pin jackets and do not ground through Delrin mouthpiece stubs.",
      },
    ],
  },
  {
    id: "p2_12",
    level: "P2 Hardware",
    category: "Regulator Failure",
    title: "O2 First Stage Relief Bubbles & Creeping Loop PPO2",
    depthFt: 60,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.48", "1.50", "1.49"],
    hudState: "5 GREEN BLINKS + BUBBLES BEHIND RIGHT SHOULDER",
    scenarioText:
      "At 60ft, your teammate signals a steady stream of fine bubbles escaping from the over-pressure relief valve on your right-hand O2 first stage, while your loop PPO2 creeps up to 1.50 without solenoid clicks. What failed and what is your response?",
    options: [
      {
        label:
          "The O2 1st stage HP seat is creeping past 145 psi IP, popping the safety relief valve and forcing O2 past the solenoid seat; shut the O2 tank valve, flush diluent, and feather O2 manually to abort.",
        isCorrect: true,
        feedback:
          "Spot on. Excessive intermediate pressure simultaneously lifts the 1st stage over-pressure relief valve and overpowers the closed solenoid plunger seat into the head.",
      },
      {
        label:
          "The right-lung OPV spring has weakened and is venting normal loop gas behind your shoulder; rotate the OPV clockwise and lower your electronic setpoint to 1.0 ata.",
        isCorrect: false,
        feedback:
          "Incorrect. A loose counterlung OPV vents loop gas without raising PPO2—rising PPO2 paired with bubbles at the green 1st stage confirms high-pressure O2 regulator creep.",
      },
      {
        label:
          "Your solenoid is stuck electrically open due to a shorted SOLO FET; unplug the Manual O2 Addition Block QD hose and leave the right-hand O2 cylinder valve fully open.",
        isCorrect: false,
        feedback:
          "Incorrect. An electrical solenoid fault does not cause bubbles to vent from the 1st stage over-pressure relief valve, and leaving the O2 tank valve open will continue over-pressurizing the hose.",
      },
      {
        label:
          "Cold water has caused the DIN wheel O-ring on the O2 cylinder to extrude; switch to open-circuit bailout and leave the O2 cylinder valve open so water cannot enter the 1st stage.",
        isCorrect: false,
        feedback:
          "Incorrect. An external DIN O-ring leak bleeds gas into the water without raising loop PPO2; when loop PPO2 is climbing uncommanded, you must close the O2 valve.",
      },
    ],
  },
  {
    id: "p2_13",
    level: "P2 Hardware",
    category: "Scrubber Bypass",
    title: "Greased Red Silicone Head Seal Slippage",
    depthFt: 50,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "1.20"],
    hudState: "2 GREEN BLINKS (ELECTRONICS NORMAL)",
    scenarioText:
      "Before diving, a diver applies oxygen-compatible lubricant to ALL red seals on the P2 head—including the wide flat red silicone CO2 seal inside the underside head groove. Fifteen minutes into the dive at 50ft, they develop severe air hunger and panic. Why?",
    options: [
      {
        label:
          "Lubricating the red silicone CO2 seal makes it slick, causing it to squirm out of its groove against the scrubber basket lip and allowing exhaled CO2 to bypass the absorbent bed.",
        isCorrect: true,
        feedback:
          "Critical P2 rule: Lubricate the two outer red head-to-bucket O-rings, NEVER the wide red silicone CO2 seal. It must stay completely dry and gummy to seal the radial basket top.",
      },
      {
        label:
          "PTFE lubricant reacts exothermically with soda lime dust at 50ft, releasing toxic fluorocarbon vapors into the inhalation pathway without altering galvanic O2 readings.",
        isCorrect: false,
        feedback:
          "Incorrect. Cristo-Lube/Tribolube is chemically inert at diving temperatures; the danger on the red CO2 seal is purely mechanical slippage creating an un-scrubbed gas bypass.",
      },
      {
        label:
          "Excess grease migrates upward onto the Teflon faces of all three O2 sensors, locking their readings at 1.20 ata while the solenoid starves the diver of oxygen.",
        isCorrect: false,
        feedback:
          "Incorrect. Hypoxia does not cause severe air hunger or labored breathing—un-scrubbed CO2 bypassing a displaced red basket seal triggers violent hypercapnic air starvation.",
      },
      {
        label:
          "Lubricating the inner seal seals the scrubber too tightly, preventing radial gas expansion and doubling resistive work of breathing across the outer mesh screen.",
        isCorrect: false,
        feedback:
          "Incorrect. A slipped inner CO2 seal lowers breathing resistance rather than raising it because gas takes the path of least resistance straight past the scrubber top into the inhale port.",
      },
    ],
  },
  {
    id: "p2_14",
    level: "P2 Hardware",
    category: "Dual-Bus Calibration",
    title: "NERD 2 PPO2 Offset From Primary Wrist Handset",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.98", "0.98", "0.98"],
    hudState: "NERD 2 READS: 0.89 / 0.90 / 0.89 IN PURE O2",
    scenarioText:
      "During Step 7 of your run-up, you flow 100% O2 with the DSV cracked and calibrate your primary wrist handset, which cleanly updates to 0.98 across all cells. Glancing at your DiveCAN NERD 2, however, it reads 0.89 / 0.90 / 0.89. Why?",
    options: [
      {
        label:
          "The SOLO control bus (handset) and OBOE monitor bus (NERD 2 / HUD) store calibration scaling factors independently; you must also run Calibrate inside the NERD 2 menu.",
        isCorrect: true,
        feedback:
          "Spot on. For true hardware independence on the P2, the SOLO board and OBOE board maintain separate calibration tables—both displays must be calibrated during your O2 flush.",
      },
      {
        label:
          "The NERD 2 automatically subtracts water vapor pressure and barometric altitude offsets twice when mounted downstream of the DSV, making a 0.09 ata offset normal.",
        isCorrect: false,
        feedback:
          "Incorrect. Both Shearwater devices sit on the same three sensor splits inside the head and must agree within ±0.02 ata once both buses are calibrated.",
      },
      {
        label:
          "Your sensors are current-limiting under the electrical load of driving two digital displays simultaneously, requiring immediate replacement of all three O2 cells.",
        isCorrect: false,
        feedback:
          "Incorrect. High-impedance amplifier inputs on SOLO and OBOE draw virtually zero current from the galvanic cells; an uncalibrated OBOE bus is simply using stale old scaling factors.",
      },
      {
        label:
          "The 5-pin DiveCAN monitor connector has corroded pins causing a 10% analog voltage drop along the cable to the NERD 2 eyepiece; clean the external plug with contact spray.",
        isCorrect: false,
        feedback:
          "Incorrect. DiveCAN transmits digital CAN-bus packets from the OBOE board inside the head to the NERD 2—cable resistance cannot cause a proportional analog voltage drop.",
      },
    ],
  },
  {
    id: "p2_15",
    level: "P2 Hardware",
    category: "HUD Power Warning",
    title: "Solid Yellow LED Row for 30 Seconds on HUD Startup",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.21", "0.21", "0.21"],
    hudState: "SOLID YELLOW ROW FOR 30s THEN NORMAL BLINKS",
    scenarioText:
      "When you wet your fingers and turn on the Hollis LED HUD during bench setup, a solid row of yellow LEDs illuminates for 30 seconds before transitioning into normal ambient-air blink patterns. What does this tell you?",
    options: [
      {
        label:
          "The 3.6V Saft LS14500 lithium battery powering the OBOE/HUD circuit inside the head is low; replace it before diving because the HUD gives zero mid-dive low-battery warnings.",
        isCorrect: true,
        feedback:
          "Critical P2 detail! That 30-second solid yellow bar at turn-on is the ONLY low-battery alert the LED HUD ever displays—it will never flash a battery warning underwater.",
      },
      {
        label:
          "The HUD is performing its mandatory 30-second sensor warm-up and ambient barometric zeroing sequence; once normal blinks resume, the battery is confirmed >85%.",
        isCorrect: false,
        feedback:
          "Incorrect. Normal HUD startup cycles through every LED briefly to verify bulb health; holding a solid yellow row for 30 seconds is the specific low-battery fault code.",
      },
      {
        label:
          "The OBOE board detected >15% millivolt drift since your last calibration and is prompting you to flush with 100% O2 and double-tap Column 3 within two minutes.",
        isCorrect: false,
        feedback:
          "Incorrect. Calibration failure on the HUD is indicated by top and bottom red LEDs lighting solid after a calibration command, not a 30-second yellow bar at boot.",
      },
      {
        label:
          "Moisture has bridged the external wet-contact pins on the HUD end-cap, locking the unit inside Command Column 2 until rinsed with fresh water and dried.",
        isCorrect: false,
        feedback:
          "Incorrect. Continuous wet-contact bridging underwater is normal in saltwater and does not trigger a 30-second solid yellow startup bar.",
      },
    ],
  },

  // =====================================================
  // MOD 1: AIR / EANx CCR SCENARIOS (16 - 30)
  // =====================================================
  {
    id: "m1_16",
    level: "Mod 1: Air/EANx",
    category: "Oxygen Sensor Diagnostics",
    title: "Unchanging Identical Sensor Readings at 110ft",
    depthFt: 110,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.20"],
    hudState: "2 GREEN BLINKS (ZERO FLUCTUATION)",
    scenarioText:
      "Thirty-five minutes into a steady wreck dive at 110ft, your instrument scan shows 1.20 / 1.20 / 1.20—and none of the three digits have shifted by even 0.01 over several breaths, nor has the solenoid clicked recently. What is your immediate check?",
    options: [
      {
        label:
          "Execute a diluent flush with known air diluent (expected 0.91 ata at 110ft) and watch over 3–4 breaths to verify all three sensors drop briskly and respond.",
        isCorrect: true,
        feedback:
          "Correct. Completely frozen digits suggest condensation blocking the sensor membranes or electronic lockup. Flushing with known lower-PO2 diluent safely proves real-time cell response.",
      },
      {
        label:
          "Inject a 2-second manual burst of oxygen first to verify that all three cells climb cleanly to 1.35+ ata without wasting onboard diluent or altering buoyancy.",
        isCorrect: false,
        feedback:
          "Dangerous trap! If water droplets or current-limiting froze the cells at 1.20 while actual loop PPO2 crept higher, adding pure O2 at 110ft could trigger an instant CNS convulsion.",
      },
      {
        label:
          "Continue the dive normally while maintaining your 90-second scan habit, since modern PID solenoid controllers hold loop PPO2 within ±0.002 ata at constant depth.",
        isCorrect: false,
        feedback:
          "Incorrect. Even with digital PID firing, normal inhalation/exhalation mixing and metabolic uptake always produce minor 0.01–0.03 ata ripples across healthy cells.",
      },
      {
        label:
          "Lower your handset setpoint from 1.20 down to 0.70 ata and wait three minutes to see whether metabolic oxygen consumption pulls the display numbers downward.",
        isCorrect: false,
        feedback:
          "Incorrect. Waiting three minutes on a potentially hypoxic or hyperoxic loop with unresponsive displays wastes critical reaction time when a diluent flush gives an answer in 10 seconds.",
      },
    ],
  },
  {
    id: "m1_17",
    level: "Mod 1: Air/EANx",
    category: "Rescue Procedures",
    title: "Unresponsive CCR Teammate Face-Down at 55ft",
    depthFt: 55,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "1.19"],
    hudState: "TEAMMATE UNRESPONSIVE WITH MOUTHPIECE IN",
    scenarioText:
      "Your buddy goes unresponsive face-down at 55ft with their BOV mouthpiece still in their mouth. Before rolling them upright into a vertical ascent position and ascending, what is your critical first manipulation of their mouthpiece?",
    options: [
      {
        label:
          "Hold the mouthpiece firmly in their mouth and rotate the BOV lever to Open-Circuit (closing the loop) BEFORE turning them upright, then control buoyancy up to the surface.",
        isCorrect: true,
        feedback:
          "Spot on. Closing the loop / switching BOV to OC before rolling them upright prevents hydrostatic counterlung pressure from blowing the mouthpiece out, prevents loop flooding, and feeds safe OC gas if they gasp.",
      },
      {
        label:
          "Remove the BOV from their mouth immediately so expanding loop gas cannot over-pressurize their alveoli during ascent, and tilt their chin slightly downward to drain water.",
        isCorrect: false,
        feedback:
          "Never pull a retained mouthpiece out of an unconscious diver's mouth! Doing so exposes their airway to drowning and floods the CCR loop, adding 15+ lbs of negative weight.",
      },
      {
        label:
          "Leave the BOV in closed-circuit mode so the warm loop gas protects their airway, roll them upright first, and hold down their manual diluent button during ascent.",
        isCorrect: false,
        feedback:
          "Incorrect. Leaving the loop open in CC mode keeps them exposed to whatever bad loop gas caused blackout, and rolling upright first makes positive pressure pop the mouthpiece out.",
      },
      {
        label:
          "Shut both of the victim's onboard O2 and Diluent cylinder valves first to prevent a buoyant runaway, leave the BOV in CC mode, and tow them up using your own wing.",
        isCorrect: false,
        feedback:
          "Incorrect. Shutting their diluent valve disables BOV open-circuit breathing and wing inflation if they gasp or need buoyancy lift—switch the BOV to OC and keep the mouthpiece seated.",
      },
    ],
  },
  {
    id: "m1_18",
    level: "Mod 1: Air/EANx",
    category: "Pneumatics / Diluent",
    title: "Runaway ADV / Manual Diluent Freeflow at 95ft",
    depthFt: 95,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["0.64", "0.65", "0.64"],
    hudState: "4 YELLOW BLINKS + ROARING GAS IN LOOP",
    scenarioText:
      "At 95ft, gas begins roaring continuously into your inhalation counterlung. Your counterlungs balloon tight, pulling you upward, while loop PPO2 drops toward 0.64 ata as air flushes out excess oxygen. What is your priority sequence?",
    options: [
      {
        label:
          "Dump excess gas immediately via nose/mouthpiece and OPV to arrest upward buoyancy, switch to offboard OC if needed, and shut the left-hand Diluent valve (or unplug the MAV QD).",
        isCorrect: true,
        feedback:
          "Correct. Stopping a runaway buoyant ascent comes first; once neutral and breathing comfortably, isolate the freeflowing left-hand diluent supply or QD hose and abort.",
      },
      {
        label:
          "Dial the counterlung OPV fully clockwise to conserve onboard diluent, hold the manual O2 button down to keep PPO2 above 1.0, and swim downward against the lift.",
        isCorrect: false,
        feedback:
          "Fatal error! Closing the OPV during a mechanical diluent freeflow turns your counterlungs into a lift bag and risks rupturing a bladder or rocketing you through deco ceilings.",
      },
      {
        label:
          "Rotate your BOV into Open-Circuit mode while leaving the left-hand Diluent cylinder valve wide open so the BOV second stage consumes the excess intermediate pressure.",
        isCorrect: false,
        feedback:
          "Incorrect. Switching the BOV barrel closes off the mouthpiece from the loop—trapping the roaring ADV/MAV freeflow inside the sealed counterlungs and launching you upward even faster!",
      },
      {
        label:
          "Close the right-hand Oxygen cylinder valve first to prevent hyperoxia, purge your drysuit completely, and feather the left-hand Diluent valve only after reaching 20ft.",
        isCorrect: false,
        feedback:
          "Incorrect. Oxygen is not freeflowing—left-side diluent is! Leaving a roaring diluent freeflow open until 20ft guarantees a uncontrolled buoyant blow-up and drained tank.",
      },
    ],
  },
  {
    id: "m1_19",
    level: "Mod 1: Air/EANx",
    category: "Directional Check Valves",
    title: "Severe Air Hunger With Rock-Steady Green Displays",
    depthFt: 70,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.19", "1.21"],
    hudState: "2 GREEN BLINKS (ALL DISPLAYS NORMAL)",
    scenarioText:
      "Twenty minutes into a relaxed cruise at 70ft with minimal swimming, you suddenly experience intense air starvation, a throbbing temple headache, and rapid deep breathing. Your handset and HUD read a steady 1.20 ata green. What failed and how do you respond?",
    options: [
      {
        label:
          "A mouthpiece directional mushroom valve has curled or torn, causing dead-space CO2 pendulum rebreathing while fresh gas stagnates at the head; bail out to OC permanently.",
        isCorrect: true,
        feedback:
          "Exact diagnosis. Failed check valves trap exhaled CO2 oscillating in the corrugated hoses without reaching the scrubber or O2 sensors—electronics look normal, and the loop is unrecoverable.",
      },
      {
        label:
          "Your radial scrubber has developed a slight cold-water efficiency dip; perform a thorough 5-second diluent flush, slow your finning pace, and remain on closed-circuit to ascend.",
        isCorrect: false,
        feedback:
          "Dangerous trap! Fighting CO2 symptoms by staying on the loop with repeated diluent flushes builds massive tissue CO2 debt; whether check-valve or breakthrough, bail out to OC immediately.",
      },
      {
        label:
          "All three O2 sensors are stuck high while actual loop gas has dropped hypoxic; press the manual O2 button for three seconds to relieve the shortness of breath.",
        isCorrect: false,
        feedback:
          "Incorrect. Hypoxia causes euphoria or sudden blackout WITHOUT shortness of breath—violent air hunger and headache are classic hypercapnia (CO2), which O2 injection cannot fix.",
      },
      {
        label:
          "Your loop volume is slightly over-inflated, increasing hydrostatic load; exhale three full breaths out your nose to restore Minimum Loop and continue your planned bottom time.",
        isCorrect: false,
        feedback:
          "Incorrect. Once acute hypercapnia symptoms (air starvation + pounding headache) strike, CO2 retention is already critical—never stay on the loop trying to 'breathe through it'.",
      },
    ],
  },
  {
    id: "m1_20",
    level: "Mod 1: Air/EANx",
    category: "Chemical Hazards",
    title: "Flooded Loop & Alkaline Caustic Cocktail",
    depthFt: 45,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.15", "0.92", "1.18"],
    hudState: "HEAVY GURGLING + BURNING SOAPY LIQUID",
    scenarioText:
      "After bumping an unlocked DSV while stowing a reel, water floods the loop and your next inhalation draws burning, soapy alkaline liquid into your mouth. What is the immediate underwater procedure and proper surface first-aid rinse?",
    options: [
      {
        label:
          "Bail out to open-circuit immediately, spit and swish clean seawater/water through your mouth without swallowing, abort on OC, and sip a weak acid like orange juice on deck.",
        isCorrect: true,
        feedback:
          "Correct. Get off the loop instantly, flush your mouth repeatedly with water underwater, ascend on OC, and use a mild food acid (juice/vinegar-water) on deck to neutralize residual base without violent heat.",
      },
      {
        label:
          "Switch to BOV open-circuit, swallow any liquid in your pharynx so you do not aspirate droplets into your lungs, and induce vomiting immediately upon boarding the boat.",
        isCorrect: false,
        feedback:
          "Never swallow caustic soda lime liquid and never induce vomiting after alkaline exposure—vomiting burns the esophagus a second time and risks pulmonary aspiration!",
      },
      {
        label:
          "Purge the mouthpiece using your manual oxygen button while tilting your head back, drain the right counterlung trap, and flush with diluent to dilute the remaining bed.",
        isCorrect: false,
        feedback:
          "Incorrect. Tilting your head back pours alkaline solution straight toward your vocal cords and trachea, and a flooded soda lime canister can never be recovered mid-dive.",
      },
      {
        label:
          "Bail out to offboard open-circuit, keep your mouth sealed around the second stage without rinsing underwater, and gargle concentrated sodium bicarbonate solution at the surface.",
        isCorrect: false,
        feedback:
          "Incorrect. Immediate copious water rinsing underwater is essential to halt chemical tissue burns, and sodium bicarbonate is itself alkaline—it will not neutralize caustic hydroxide.",
      },
    ],
  },
  {
    id: "m1_21",
    level: "Mod 1: Air/EANx",
    category: "Surface Protocol",
    title: "Quick Shallow Re-Entry With Cylinder Valves Closed",
    depthFt: 12,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.14", "0.15", "0.14"],
    hudState: "BOTTOM RED LEDS FLASHING RAPIDLY",
    scenarioText:
      "Ten minutes after surfacing and shutting down cylinder valves on deck, a diver pops the mouthpiece back in without a checklist or pre-breath and drops to 12ft to grab a dropped camera. Why does a turned-off CCR cause sudden blackout in shallow water with zero warning?",
    options: [
      {
        label:
          "Granular absorbent continues scrubbing exhaled CO2 passively without tank pressure, eliminating any air-hunger reflex while metabolism rapidly drains shallow loop PPO2 below 0.16 ata.",
        isCorrect: true,
        feedback:
          "Spot on. Human breathing drive responds to rising CO2, not falling O2. Because the scrubber keeps CO2 near zero even with tanks shut, the diver feels totally normal right up to hypoxic unconsciousness.",
      },
      {
        label:
          "With both cylinder valves closed, the unpowered solenoid vents remaining head pressure out the battery relief valve, collapsing the counterlungs and causing thoracic squeeze at 12ft.",
        isCorrect: false,
        feedback:
          "Incorrect. Closed tank valves do not vent loop gas out the head relief valve; the lethal trap is silent metabolic oxygen depletion without CO2 buildup.",
      },
      {
        label:
          "Cold shallow water stops the endothermic soda lime reaction within 60 seconds when diluent flow is absent, causing instantaneous CO2 narcosis on the third breath.",
        isCorrect: false,
        feedback:
          "Incorrect. Soda lime CO2 absorption is exothermic (heat-producing) and works independently of tank valves—and CO2 causes intense air starvation before blackout, unlike silent hypoxia.",
      },
      {
        label:
          "Descending from 0ft to 12ft compresses residual nitrogen in the unpressurized loop by 36%, creating acute shallow-water counterdiffusion across alveolar capillaries.",
        isCorrect: false,
        feedback:
          "Incorrect. Compressing loop gas slightly raises partial pressures temporarily during descent, but ongoing metabolic O2 burn at shallow ambient pressure quickly drives FO2 below survival limits.",
      },
    ],
  },
  {
    id: "m1_22",
    level: "Mod 1: Air/EANx",
    category: "Alarm Management",
    title: "Managing a Confirmed Single Failed Sensor During Abort",
    depthFt: 85,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.21", "0.28"],
    hudState: "MASTER ALARM FLASHING CONTINUOUSLY",
    scenarioText:
      "At 85ft, Cell 3 drops to 0.28 while Cells 1 and 2 track together at 1.20 and respond accurately to a diluent flush check. As you call the dive and begin ascending on the loop, why do controllers/protocols address clearing or isolating a persistent single-cell alarm?",
    options: [
      {
        label:
          "Leaving a master alarm locked on continuously creates system 'Alarm Blindness' and diver 'Alarm Habituation', potentially masking a second critical fault during decompression.",
        isCorrect: true,
        feedback:
          "Correct. Once a fault is diagnosed and you have turned the dive, a permanently flashing master warning can hide new secondary emergencies (like low battery or high PPO2) on ascent.",
      },
      {
        label:
          "Isolating or acknowledging the failed cell unlocks full three-cell redundancy again so the team can safely continue their planned bottom segment before ascending.",
        isCorrect: false,
        feedback:
          "Never continue a bottom dive on two cells! Losing any O2 sensor immediately drops you to minimum two-cell voting—always terminate the dive and ascend cleanly.",
      },
      {
        label:
          "Clearing the low-cell warning forces the SOLO board to boost voltage across Cell 3's gold Molex pins, evaporating trapped condensation off the sensing membrane.",
        isCorrect: false,
        feedback:
          "Incorrect. Galvanic O2 cells are passive electrochemical fuel cells that generate their own millivolts—the controller never applies heating voltage to sensor pins.",
      },
      {
        label:
          "Unless the master alarm is cleared within 60 seconds, Shearwater controllers automatically lock out decompression tissue calculations and revert to simple bottom-timer mode.",
        isCorrect: false,
        feedback:
          "Incorrect. Shearwater handsets never lock out decompression stop calculations during an active sensor warning.",
      },
    ],
  },
  {
    id: "m1_23",
    level: "Mod 1: Air/EANx",
    category: "Buoyancy & Trim",
    title: "Verifying Proper CCR Ballast & Minimum Loop Volume",
    depthFt: 15,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.19"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "How do you confirm your rig ballast is properly weighted for technical CCR decompression diving, and what physical cue confirms you have set optimal 'Minimum Loop' breathing volume at depth?",
    options: [
      {
        label:
          "You can hold a 15ft stop with an empty wing even after handing off all offboard stages, and at Minimum Loop a slightly deeper-than-normal inhalation just kisses the ADV.",
        isCorrect: true,
        feedback:
          "Spot on. Worst-case CCR weighting accounts for passing off depleted/shared bailout stages to a teammate, while Minimum Loop keeps hydrostatic breathing effort minimal and loop flushes fast.",
      },
      {
        label:
          "You float at eye level on the surface with a full wing, full counterlungs, and full stages, and at Minimum Loop the counterlung OPV vents a bubble at the peak of every exhalation.",
        isCorrect: false,
        feedback:
          "Incorrect. If the OPV vents on every breath, your loop is completely over-full (maximum loop), causing severe hydrostatic loading and wasting gas continuously.",
      },
      {
        label:
          "You carry enough lead to sink effortlessly at the surface with full counterlungs and a half-inflated wing, using manual diluent injections into the loop to hover neutrally at stops.",
        isCorrect: false,
        feedback:
          "Never over-weight yourself or use counterlung gas for buoyancy compensation—inflated counterlungs increase work of breathing and make PPO2 control sluggish.",
      },
      {
        label:
          "You weight strictly for full aluminum bailout stages at the start of the dive, relying on rhythmic deep-breath holding on the loop to fine-tune vertical trim during deco.",
        isCorrect: false,
        feedback:
          "Incorrect. Breath-holding does zero buoyancy tuning on a closed-circuit rebreather because total displaced volume (diver lungs + counterlungs) stays constant throughout each breath.",
      },
    ],
  },
  {
    id: "m1_24",
    level: "Mod 1: Air/EANx",
    category: "Pneumatics / Descent",
    title: "Collapsed Counterlungs & Non-Firing ADV on Descent",
    depthFt: 50,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.25", "1.26", "1.24"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Descending down the shotline through 50ft, your counterlungs flatten tight against your chest/shoulders and your inhalation bottoms out completely without triggering the ADV, though your Diluent SPG reads 2,800 psi. What is your immediate sequence?",
    options: [
      {
        label:
          "Arrest your descent immediately, inject gas with the Manual Diluent Addition button (or bail out to OC if blocked), verify the diluent valve/QD hose, and abort the dive.",
        isCorrect: true,
        feedback:
          "Correct. Stop descending immediately to prevent pulmonary/loop barotrauma, restore breathable volume manually with diluent (never pure O2 at 50ft!), and turn the dive due to the faulty ADV.",
      },
      {
        label:
          "Press the Manual Oxygen Addition button briskly to re-inflate the collapsed counterlungs at 50ft so you can keep descending while the higher pressure unsticks the ADV.",
        isCorrect: false,
        feedback:
          "Fatal trap! Filling empty counterlungs with 100% O2 at 50ft (2.51 ata ambient pressure) drives loop PPO2 past 2.2+ ata instantly, risking an underwater CNS seizure.",
      },
      {
        label:
          "Exhale residual lung air through your nose into your mask while dropping to 80ft, allowing the steeper ambient pressure differential to pop the stuck ADV diaphragm open.",
        isCorrect: false,
        feedback:
          "Incorrect. Dumping gas out your nose when the loop is already collapsed worsens loop squeeze and guarantees you have zero breathable volume on your next inhalation.",
      },
      {
        label:
          "Open the DSV barrel slightly for half a second to equalize hydrostatic loop pressure with ambient water, then snap it shut and continue descending on manual diluent.",
        isCorrect: false,
        feedback:
          "Incorrect. Cracking the DSV while counterlungs are under negative squeeze sucks water straight into the breathing loop and canister!",
      },
    ],
  },
  {
    id: "m1_25",
    level: "Mod 1: Air/EANx",
    category: "Mixed Team Protocols",
    title: "Emergency Gas Sharing in a Mixed CCR + Open-Circuit Team",
    depthFt: 110,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.21"],
    hudState: "LOOP FLOODED + OWN BAILOUT DEPLETED",
    scenarioText:
      "You are diving your CCR alongside an open-circuit technical teammate wearing backmounted doubles (EAN28) and a side-slung EAN50 deco stage. At 110ft, a burst hose drains your bailout tank right as your loop floods. Which teammate gas do you take?",
    options: [
      {
        label:
          "Deploy gas-sharing on your teammate's primary long-hose backgas (EAN28), verify breathable MOD, and ascend together clearing whichever diver's computer is more conservative.",
        isCorrect: true,
        feedback:
          "Spot on. An open-circuit diver's stage cylinder is a high-O2 shallow deco mix (EAN50 = 2.17 ata at 110ft!), NOT deep bailout—at depth you must share their breathable backgas long hose.",
      },
      {
        label:
          "Have your OC teammate unclip and pass you their independent EAN50 stage bottle immediately at 110ft so both divers can swim untethered to the 70ft decompression stop.",
        isCorrect: false,
        feedback:
          "Lethal mistake! Unlike a CCR diver's deep bailout stage, an OC diver's stage carries hyperoxic deco gas—breathing EAN50 at 110ft exposes you to 2.17 ata PPO2.",
      },
      {
        label:
          "Plug your teammate's low-pressure drysuit inflation hose into your Manual Diluent Addition quick-disconnect and breathe your flooded CCR in semiclosed mode to conserve their doubles.",
        isCorrect: false,
        feedback:
          "Incorrect. Never breathe a flooded CCR loop in any mode (caustic cocktail hazard), and drysuit inflation systems often carry hypoxic/anesthetic Argon with zero oxygen!",
      },
      {
        label:
          "Share your teammate's primary backgas long hose up to 70ft, then follow your CCR computer's shorter decompression stops since your tissues loaded at 1.20 setpoint on the bottom.",
        isCorrect: false,
        feedback:
          "Incorrect. Once tethered on shared open-circuit backgas, the pair stays together all the way to the surface—meaning both divers must clear the slower (usually OC) decompression schedule.",
      },
    ],
  },
  {
    id: "m1_26",
    level: "Mod 1: Air/EANx",
    category: "Bailout Ascent",
    title: "Venting Expanding Gas From a Sealed Loop on OC Ascent",
    depthFt: 40,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.95", "0.96", "0.95"],
    hudState: "BREATHING OFFBOARD OPEN-CIRCUIT STAGE",
    scenarioText:
      "After bailing out onto your offboard stage at 100ft due to suspected scrubber breakthrough and closing your DSV, you ascend through 40ft. Trapped gas inside your sealed counterlungs expands and makes you float upward. How do you vent the loop cleanly?",
    options: [
      {
        label:
          "Pull the counterlung OPV dump cord (BMCL) or hold the closed DSV higher than the lungs facing down and crack it briskly open-then-shut while gas bubbles out.",
        isCorrect: true,
        feedback:
          "Correct. Either actuate the counterlung dump/OPV or hold the mouthpiece at a high point and burp the barrel shut BEFORE bubbling stops so zero water enters the canister.",
      },
      {
        label:
          "Rotate the DSV barrel wide open and tuck the mouthpiece under your chin strap for the remainder of the ascent so expanding gas vents passively at every stop.",
        isCorrect: false,
        feedback:
          "Incorrect. Leaving a DSV open while off the loop floods the hoses, counterlungs, and canister with water—causing a sudden 15+ lb negative buoyancy swing mid-ascent.",
      },
      {
        label:
          "Switch back onto the CCR mouthpiece for two quick breaths at each 10ft stop to inhale the excess loop volume and vent it safely out through your mask skirt.",
        isCorrect: false,
        feedback:
          "Never inhale even a single breath from a loop abandoned for scrubber breakthrough or caustic flooding!",
      },
      {
        label:
          "Disconnect both breathing hoses at the head ports behind your neck so expanding counterlung gas vents directly without risking caustic backflow toward the mouthpiece.",
        isCorrect: false,
        feedback:
          "Incorrect. Unthreading head hoses underwater floods the electronics head, destroys the O2 sensors, and saturates the soda lime canister.",
      },
    ],
  },
  {
    id: "m1_27",
    level: "Mod 1: Air/EANx",
    category: "Gas Management",
    title: "Calculating Onboard Oxygen Minimum Turn Pressure",
    depthFt: 100,
    setpoint: 1.2,
    diluent: "21/00",
    cells: ["1.20", "1.20", "1.20"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "You splash with a 3-liter (AL19) onboard O2 cylinder filled to 150 bar (450 free liters). Planning a 1/3 reserve (150 L / 50 bar), a conservative 1.5 L/min metabolic burn rate, and a 20-minute ascent + deco TTS, what is your minimum O2 turn pressure to leave bottom?",
    options: [
      {
        label:
          "60 bar (870 psi) — reserving 30 liters (10 bar) for your 20-minute metabolic burn during ascent/deco on top of your mandatory 150-liter (50 bar) 1/3 reserve.",
        isCorrect: true,
        feedback:
          "Exact CCR O2 math! Metabolic O2 usage is independent of depth: 20 min × 1.5 L/min = 30 L (10 bar in a 3L tank), plus 50 bar reserve = 60 bar minimum turn pressure.",
      },
      {
        label:
          "90 bar (1,305 psi) — because ambient pressure at 100ft (4.0 ata) quadruples closed-circuit O2 solenoid consumption during ascent to 6.0 L/min (120 L / 40 bar) plus 50 bar reserve.",
        isCorrect: false,
        feedback:
          "Classic OC-mindset trap! Unlike open-circuit gas, closed-circuit metabolic oxygen consumption depends strictly on physical workload (0.5–1.5 L/min), NOT ambient depth pressure.",
      },
      {
        label:
          "50 bar (725 psi) — because ascending from 100ft to the surface expands existing loop oxygen fourfold via Boyle's Law, eliminating any need for solenoid O2 injection on ascent.",
        isCorrect: false,
        feedback:
          "Dangerous misconception! Ascending REDUCES ambient pressure, causing loop PPO2 to drop rapidly—the solenoid actually fires heavily during ascent to hold 1.2–1.4 setpoint.",
      },
      {
        label:
          "100 bar (1,450 psi) — applying the open-circuit rule of thirds where 1/3 (50 bar) is used on the bottom, 1/3 is used on ascent, and 1/3 is kept in reserve.",
        isCorrect: false,
        feedback:
          "Incorrect. On a CCR with plenty of O2 endurance, dedicating only 50 bar to the bottom needlessly wastes usable cylinder capacity; reserve 1/3 + calculated ascent metabolic volume.",
      },
    ],
  },
  {
    id: "m1_28",
    level: "Mod 1: Air/EANx",
    category: "Scrubber Chemistry",
    title: "Stirring or Air-Drying Partially Used Granular Absorbent",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "21/00",
    cells: ["0.70", "0.70", "0.70"],
    hudState: "SURFACE TURNAROUND PREP",
    scenarioText:
      "After logging 85 minutes on a 180-minute radial scrubber, a diver dumps the absorbent onto a clean tray overnight to evaporate moisture, stirs the white and violet granules evenly, and repacks it for a 60-minute morning dive. Why is this hazardous?",
    options: [
      {
        label:
          "Used soda lime never regenerates, and disturbing or stirring a partially reacted bed destroys the uniform chemical reaction front—causing immediate CO2 channeling and early breakthrough.",
        isCorrect: true,
        feedback:
          "Spot on. Partially used absorbent may only be dived again if kept sealed and undisturbed inside its basket within manufacturer limits; once opened or poured out, discard 100% of it.",
      },
      {
        label:
          "Exposing warm partially reacted calcium carbonate to dry cabin air converts residual sodium hydroxide into carbon monoxide gas that off-gasses on the next pre-breath.",
        isCorrect: false,
        feedback:
          "Incorrect. Soda lime does not generate carbon monoxide when exposed to room air; the lethal danger is destroying the active reaction zone geometry and creating low-resistance channels.",
      },
      {
        label:
          "Stirring is safe ONLY if fewer than 30% of the ethyl-violet indicator granules have changed color, since dye intensity directly measures remaining hydroxide capacity.",
        isCorrect: false,
        feedback:
          "Dangerous myth! Indicator dye bleaches back to white over hours in storage or UV light even when the granules are 100% exhausted—never judge sorb life by color.",
      },
      {
        label:
          "Air-drying removes the 14–19% bound water hydration content inside fresh granules, causing the canister to overheat and melt the Delrin center bore tube underwater.",
        isCorrect: false,
        feedback:
          "Incorrect. Over-dried absorbent actually loses chemical reactivity rather than overheating; regardless, dumping and remixing used granules ruins bed integrity.",
      },
    ],
  },
  {
    id: "m1_29",
    level: "Mod 1: Air/EANx",
    category: "Sensor Failure Modes",
    title: "Aging Sensor Passes Air Check But Caps Out at High PO2",
    depthFt: 90,
    setpoint: 1.3,
    diluent: "21/00",
    cells: ["1.31", "1.32", "0.94"],
    hudState: "COL 1: 3 GRN | COL 2: 3 GRN | COL 3: 1 YEL",
    scenarioText:
      "An 11-month-old O2 cell read a normal 10.8 mV in ambient air on the boat, yet during your 100% O2 flush it plateaued slightly sluggishly, and now at 90ft on 1.3 SP it refuses to read above 0.94 ata regardless of O2 injection. What failure mode is this?",
    options: [
      {
        label:
          "The sensor is 'current-limiting' — depleted lead anode surface area can still produce low current at 0.21 ata in air, but hits an electrical ceiling at elevated PO2.",
        isCorrect: true,
        feedback:
          "Critical CCR physics! A current-limited cell looks totally fine in air and can trick divers who skip linearity checks—if two cells current-limit at 0.95 while SP is 1.3, the solenoid runs away!",
      },
      {
        label:
          "Nitrogen narcosis gas density at 90ft slows oxygen diffusion across Cell 3's hydrophobic membrane by 28%, requiring a recalibration offset for dives deeper than 60ft.",
        isCorrect: false,
        feedback:
          "Incorrect. Galvanic O2 sensors respond strictly to oxygen partial pressure independent of inert nitrogen pressure when healthy.",
      },
      {
        label:
          "Cell 3 has an internal short circuit across its load resistor that multiplies millivolts inversely above 1.0 ata; lower setpoint to 0.90 ata and complete the planned bottom time.",
        isCorrect: false,
        feedback:
          "Incorrect. An internal short drops voltage to 0.0 mV across all pressures, and you must never continue a planned bottom dive after losing sensor agreement—turn the dive immediately.",
      },
      {
        label:
          "Cold diluent striking Cell 3 from the ADV port has chilled its KOH electrolyte below freezing; close the diluent valve and breathe warm exhaled gas to restore 1.30 ata.",
        isCorrect: false,
        feedback:
          "Incorrect. On the Prism 2, ADV diluent enters the left inhalation counterlung downstream of the head, whereas O2 sensors sit above the warm exothermic scrubber bed.",
      },
    ],
  },
  {
    id: "m1_30",
    level: "Mod 1: Air/EANx",
    category: "Calibration Physics",
    title: "Handset Calibrates to 0.96 Instead of 0.98 in Pure O2",
    depthFt: 0,
    setpoint: 0.19,
    diluent: "21/00",
    cells: ["0.96", "0.96", "0.96"],
    hudState: "CALIBRATION PASSED — ALL CELLS LINEAR",
    scenarioText:
      "At sea level as a low-pressure storm front rolls in, you flow analyzed 99% O2 through your cracked-DSV loop until millivolts hold rock-steady within ±2% of your Air × 4.76 target. Upon hitting Calibrate (FO2 set to 98%), the screen displays 0.96 / 0.96 / 0.96. Why?",
    options: [
      {
        label:
          "With Altitude set to Auto, the handset multiplies your 0.98 FO2 setting by ambient barometric pressure (~980 mbar ÷ 1013 mbar = 0.96 ata); the calibration is valid.",
        isCorrect: true,
        feedback:
          "Spot on. Partial pressure equals gas fraction × ambient pressure ($PPO_2 = FO_2 \\times P_{amb}$). When barometric pressure is below 1013 mbar (or at altitude), 98% O2 exerts less than 0.98 bar.",
      },
      {
        label:
          "Residual nitrogen trapped inside the counterlung corners diluted the flush down to 96% O2; repeat the positive pressure test and re-calibrate with the DSV sealed shut.",
        isCorrect: false,
        feedback:
          "Trap! Calibrating with the DSV sealed shut under positive pressure artificially inflates ambient loop pressure above 1.0 bar, making sensors under-read true PPO2 underwater!",
      },
      {
        label:
          "All three sensors have aged uniformly by 2% since manufacture; open the System Setup menu and raise Calibration FO2 from 98% to 100% until the screen reads 0.98.",
        isCorrect: false,
        feedback:
          "Incorrect. Never falsify the Calibration FO2 setting to force a specific display number—the internal pressure transducer is accurately compensating for low barometric pressure.",
      },
      {
        label:
          "Water vapor saturation inside the freshly packed soda lime bed displaces 0.02 ata of oxygen pressure, indicating your absorbent batch was stored improperly and is damp.",
        isCorrect: false,
        feedback:
          "Incorrect. Dry ambient O2 flush gas before pre-breathing has minimal humidity shift, and the Shearwater controller displays barometric-scaled FO2 immediately upon calibration.",
      },
    ],
  },
  // =====================================================
  // MOD 2: NORMOXIC TRIMIX CCR SCENARIOS (31 - 45)
  // =====================================================
  {
    id: "m2_31",
    level: "Mod 2: Normoxic",
    category: "Zero Sensor Data / Deco",
    title: "Running Pure Oxygen Metabolic Mode at 20ft With Dead Displays",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["FAIL", "FAIL", "FAIL"],
    hudState: "ALL DISPLAYS DARK — ZERO SENSOR TELEMETRY",
    scenarioText:
      "After total sensor/bus failure with a dry intact loop and fresh scrubber, you bailed out to OC and ascended to your 20ft stop with heavy deco remaining. How do you safely run pure O2 metabolic replacement on the loop at 20ft?",
    options: [
      {
        label:
          "Flush the loop thoroughly with 100% O2, set Minimum Loop, inject O2 manually whenever the counterlung bottoms out, and perform a full O2 re-flush every 15 minutes.",
        isCorrect: true,
        feedback:
          "Correct. At 20ft (1.6 ata) or shallower, pure O2 cannot exceed 1.60 ata. Full O2 re-flushes every 15 minutes purge nitrogen and helium off-gassing from your tissues into the loop.",
      },
      {
        label:
          "Begin pure O2 metabolic loop mode at your 30ft stop to conserve deep bailout gas early, adding O2 on every third breath and re-flushing with diluent every 20 minutes.",
        isCorrect: false,
        feedback:
          "Lethal depth error! At 30ft (1.91 ata), flushing a sensorless loop with 100% O2 exposes you to 1.91 ata PPO2—pure O2 metabolic mode is strictly restricted to 20ft (6m) or shallower.",
      },
      {
        label:
          "Flush once with 100% O2 at 20ft, leave the left-hand diluent valve open so the ADV prevents loop squeeze, and avoid touching manual valves until clearing your final stop.",
        isCorrect: false,
        feedback:
          "Incorrect. As metabolism consumes loop volume, leaving the ADV active injects low-O2 bottom diluent at 20ft while tissue off-gassing dilutes FO2—silently driving the blind loop hypoxic.",
      },
      {
        label:
          "Shut both onboard valves after a single 100% O2 flush at 20ft and rebreathe the fixed volume for 45 minutes, since radial scrubbers absorb off-gassed nitrogen and helium.",
        isCorrect: false,
        feedback:
          "Incorrect. Granular absorbent only scrubs CO2, never inert N2 or He, and metabolic consumption will collapse the counterlungs flat within a few minutes unless O2 is manually replaced.",
      },
    ],
  },
  {
    id: "m2_32",
    level: "Mod 2: Normoxic",
    category: "Loss of O2 / Gas Extender",
    title: "Depleted Onboard O2 & Offboard-Fed Semiclosed Ascent",
    depthFt: 140,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.72", "0.71", "0.73"],
    hudState: "3 YELLOW BLINKS (O2 SPG AT 0 PSI)",
    scenarioText:
      "A ruptured HP seat O-ring drains your onboard O2 tank at 140ft. Your scrubber and sensors remain 100% functional, and your deep offboard stage (TMx 20/35) has an LP quick-disconnect whip. How do you run a semiclosed ascent?",
    options: [
      {
        label:
          "Connect the offboard LP whip, wait until loop PPO2 drops to match supply gas PPO2 at depth, cycle 3 breaths in and vent the 4th out your nose, and go full OC by 30–20ft.",
        isCorrect: true,
        feedback:
          "Spot on. Waiting until loop PPO2 meets supply gas PPO2 preserves existing O2, the 4th-breath nose-vent maintains safe steady-state FO2, and switching to OC by 30–20ft prevents shallow hypoxia.",
      },
      {
        label:
          "Connect the offboard LP whip, flush the entire loop immediately at 140ft to clear residual onboard diluent, vent every 10th breath out your nose, and stay semiclosed to the surface.",
        isCorrect: false,
        feedback:
          "Dangerous in shallow water! Venting only every 10th breath and staying semiclosed on a 20% O2 mix up to the surface allows metabolic O2 drop to drive inspired PPO2 below 0.16 ata.",
      },
      {
        label:
          "Leave your offboard stage disconnected for emergencies and run semiclosed exclusively on your 3-liter onboard 16/35 diluent cylinder all the way through shallow decompression.",
        isCorrect: false,
        feedback:
          "Incorrect. A tiny 3L onboard cylinder carrying 16% O2 lacks both the volume for semiclosed flushing and the oxygen fraction needed to prevent hypoxia at shallow stops.",
      },
      {
        label:
          "Plumb your hyperoxic EAN50 deco stage into the manual diluent block at 140ft and inject brief pulses manually to mimic a solenoid while keeping your DSV closed.",
        isCorrect: false,
        feedback:
          "Hazardous! Plumbing a toxic high-O2 stage into your diluent feed at 140ft (where EAN50 = 2.62 ata) risks a single accidental flush or stuck button triggering an instant convulsion.",
      },
    ],
  },
  {
    id: "m2_33",
    level: "Mod 2: Normoxic",
    category: "Team Rescue / Wrong Gas",
    title: "Teammate Bails Out Onto Hyperoxic Deco Stage at 185ft",
    depthFt: 185,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.29", "1.30", "1.31"],
    hudState: "3 GREEN BLINKS (YOUR RIG NORMAL)",
    scenarioText:
      "At 185ft, your teammate gets an alarm, bails out off the loop, and begins breathing an offboard regulator without verifying the cylinder. Moving in to cross-check them, you see the hose traces to their 'TMx 50/20 — MOD 70FT' bottle. What is your immediate move?",
    options: [
      {
        label:
          "Deploy your own known-breathable deep offboard regulator and put it directly to your teammate's mouth (pulling the toxic reg out if required) before sorting out their stages.",
        isCorrect: true,
        feedback:
          "Exact life-saving priority. At 185ft, 50% O2 delivers 3.30 ata PPO2—seconds count before a grand mal CNS seizure strikes. Give them your verified breathable gas first, then untangle gear.",
      },
      {
        label:
          "Flash your primary light urgently, point to the 'MOD 70FT' cylinder band, and assist your teammate in unclipping and opening their own deep bailout regulator.",
        isCorrect: false,
        feedback:
          "Too slow! Spending 20–30 seconds communicating with hand signals and opening a stowed valve while your buddy inhales 3.30 ata PPO2 practically guarantees an underwater convulsion.",
      },
      {
        label:
          "Reach across and shut the valve on their 50% deco cylinder first so they cannot inhale another breath, leaving them to switch back onto their CCR BOV automatically.",
        isCorrect: false,
        feedback:
          "Incorrect. Shutting off a panicked diver's air supply at 185ft without simultaneously presenting a breathable second stage can cause them to bolt or inhale from a flooded/toxic loop.",
      },
      {
        label:
          "Hold onto their harness and ascend rapidly together at 60 ft/min up to 70ft so the 50% mix drops below 1.60 ata before CNS toxicity symptoms manifest.",
        isCorrect: false,
        feedback:
          "Fatal error! Rocket-ascending 115 vertical feet causes extreme arterial gas embolism and fulminant decompression sickness while still exposing them to >2.0 ata O2 on the way up.",
      },
    ],
  },
  {
    id: "m2_34",
    level: "Mod 2: Normoxic",
    category: "Hypercapnia / Stage Sharing",
    title: "Delayed Bailout CO2 Debt & Team Bailout Cylinder Trade",
    depthFt: 70,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["1.30", "1.30", "1.29"],
    hudState: "TEAMMATE ON OC AT 3x NORMAL SAC",
    scenarioText:
      "Your teammate tried to 'flush through' scrubber breakthrough at depth before finally bailing out to OC. Now at 70ft with 35 minutes of deco remaining, they are still breathing heavily at 3x normal SAC and signal 50% stage pressure remaining. How do you manage team gas?",
    options: [
      {
        label:
          "Recognize whole-body tissue CO2 debt takes 30+ minutes to clear; trade stages now at 50% pressure—verifying MOD and passing the 2nd stage first before swapping cylinder clips.",
        isCorrect: true,
        feedback:
          "Spot on. Delayed bailout saturates slow tissues with dissolved CO2, driving 2–3x ventilation long after switching to OC. Trading tanks at 50% keeps a usable bailout cylinder on every diver.",
      },
      {
        label:
          "Let your teammate breathe their current bailout cylinder down to 200 psi first to minimize underwater unclipping tasks, then pass your full cylinder across at the 30ft stop.",
        isCorrect: false,
        feedback:
          "Incorrect. Draining one cylinder completely leaves whichever diver holds that empty bottle with zero offboard bailout redundancy if a second CCR failure or separation occurs.",
      },
      {
        label:
          "Unclip your full bailout tank, clip it onto your teammate's harness first, and have them switch regulators afterward so neither diver has to hold an unclipped bottle.",
        isCorrect: false,
        feedback:
          "Wrong sequence! Always verify the cylinder MOD label together and establish the diver breathing the new regulator FIRST before unclipping and trading hardware.",
      },
      {
        label:
          "Have your teammate switch back onto their CCR loop for 5 minutes while resting motionless on the line at 70ft, since resting CO2 production drops enough for spent sorb to recover.",
        isCorrect: false,
        feedback:
          "Never return to a broken-through scrubber! Exhausted or channeled absorbent cannot scrub even resting metabolic CO2 and will spike arterial PCO2 toward unconsciousness.",
      },
    ],
  },
  {
    id: "m2_35",
    level: "Mod 2: Normoxic",
    category: "Acute Oxygen Toxicity",
    title: "Prodromal CNS Symptoms (Tinnitus & Cheek Twitch) at 30ft",
    depthFt: 30,
    setpoint: 1.3,
    diluent: "18/35",
    cells: ["1.31", "1.30", "1.32"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Ten minutes into a 30ft decompression stop after a long trimix profile, you develop sudden tunnel vision, ringing ears, mild nausea, and a rhythmic twitch under your left eye. What is the fastest, safest way to drop your inspired PO2?",
    options: [
      {
        label:
          "Bail out immediately onto your LOWEST-oxygen offboard cylinder after verifying its MOD label, signal your teammate, and hold reduced PO2 for ≥15 minutes past symptom resolution.",
        isCorrect: true,
        feedback:
          "Correct. Switching to open-circuit on your low-O2 bottom bailout mix (~0.34 ata PO2 at 30ft) drops alveolar PO2 on the very next breath—far faster than flushing or lowering SP on the loop.",
      },
      {
        label:
          "Switch your handset setpoint from 1.30 down to 0.70 ata immediately and breathe calmly on the loop while metabolic uptake brings your PPO2 down gently without inert spikes.",
        isCorrect: false,
        feedback:
          "Dangerous! Metabolic burn takes several minutes to consume high loop O2 at rest—with active facial twitching, a full tonic-clonic convulsion can hit before loop PPO2 drops.",
      },
      {
        label:
          "Bail out immediately onto your EAN50 deco stage (0.95 ata PO2 at 30ft) so you cut oxygen pressure below 1.0 ata without lengthening your remaining decompression obligation.",
        isCorrect: false,
        feedback:
          "Incorrect. While 0.95 ata is lower than 1.31, your deep trimix bailout stage delivers ~0.34 ata at 30ft, providing a dramatically steeper, safer oxygen drop to halt an impending seizure.",
      },
      {
        label:
          "Ascend immediately from 30ft up to 15ft to cut ambient hydrostatic pressure by 25%, holding onto the shotline while keeping your mouthpiece locked in closed-circuit mode.",
        isCorrect: false,
        feedback:
          "Incorrect. Ascending violates your 30ft decompression ceiling (risking spinal/cerebral DCS), and on a constant-PO2 CCR the solenoid will simply fire to hold 1.30 ata at 15ft anyway!",
      },
    ],
  },
  {
    id: "m2_36",
    level: "Mod 2: Normoxic",
    category: "Omitted Decompression",
    title: "Asymptomatic Blow-Up From 20ft Stop (>1 Minute at Surface)",
    depthFt: 0,
    setpoint: 1.3,
    diluent: "18/35",
    cells: ["0.95", "0.96", "0.95"],
    hudState: "MISSED DECO STOP ALARM FLASHING",
    scenarioText:
      "Two minutes into an 8-minute stop at 20ft, a jammed drysuit inflator floats you to the surface. It takes 2.5 minutes at the surface to unhook the whip. You have zero DCS symptoms, ample gas/sorb, and re-descend to 20ft (computer shows 6m @ 20ft + 12m @ 15ft). What stops do you run?",
    options: [
      {
        label:
          "Multiply both the remaining 20ft stop and final 15ft stop by 1.5× (9 min @ 20ft and 18 min @ 15ft), plus extend the final stop further as gas and scrubber allow.",
        isCorrect: true,
        feedback:
          "Exact omitted-decompression contingency for an asymptomatic surface interval >1 minute (under 5 min) from 20ft or shallower: 1.5× on both the 20ft and final stop.",
      },
      {
        label:
          "Complete the exact 6 min @ 20ft and 12 min @ 15ft displayed on your wrist handset plus a 1-minute penalty, since ZHL-16C dynamically recalculates surface bubble growth.",
        isCorrect: false,
        feedback:
          "Incorrect. Dissolved-phase Haldane/Bühlmann computers do NOT model free-phase microbubble growth triggered during unscheduled surface pressure drops; manual 1.5× extension is required.",
      },
      {
        label:
          "Descend past 20ft down to 60ft for 5 minutes at 1.40 setpoint to crush any silent venous bubbles first, then follow the original unadjusted decompression schedule upward.",
        isCorrect: false,
        feedback:
          "Incorrect. Re-descending deeper than your missed stop loads additional inert gas without following an established recompression table; return strictly to the missed stop depth.",
      },
      {
        label:
          "Never re-enter the water once your head breaks the surface during a decompression dive; board the vessel immediately, breathe surface O2, and await helicopter evacuation.",
        isCorrect: false,
        feedback:
          "Incorrect. While symptomatic divers must NEVER re-enter the water, an asymptomatic diver who surfaces briefly from a shallow stop with working gear can prevent DCS via prompt re-immersion.",
      },
    ],
  },
  {
    id: "m2_37",
    level: "Mod 2: Normoxic",
    category: "Omitted Decompression",
    title: "Asymptomatic Blow-Up From 50ft Deco Stop (<3 Min on Surface)",
    depthFt: 0,
    setpoint: 1.3,
    diluent: "16/35",
    cells: ["0.95", "0.95", "0.96"],
    hudState: "CEILING VIOLATION ALARM FLASHING",
    scenarioText:
      "A runaway wing inflator pulls a diver to the surface from their 50ft stop. They unplug the LP inflator on the surface, confirm zero neurological or joint symptoms, and drop back to 50ft within 2.5 minutes. How should they modify their remaining 50, 40, 30, 20, and 10ft stops?",
    options: [
      {
        label:
          "Clear the 50ft and 40ft stops per schedule (or 1.5× starting at 40ft), and multiply the 30ft stop and ALL shallower stops (30, 20, 10ft) by 1.5× plus extra final-stop margin.",
        isCorrect: true,
        feedback:
          "Correct. When surfacing asymptomatically from deeper than 20ft and returning promptly (<5 min), extend at minimum the 30ft (9m) and all shallower stops by 1.5× normal duration.",
      },
      {
        label:
          "Double (2.0×) the deep 50ft and 40ft stops where bubble crushing is greatest, then run the 30ft, 20ft, and 10ft stops at standard 1.0× computer durations to limit CNS%.",
        isCorrect: false,
        feedback:
          "Backwards! Extending deep stops loads slower compartments with more inert gas while under-treating the high-gradient shallow stops where off-gassing and oxygen window elimination peak.",
      },
      {
        label:
          "Skip the 50ft and 40ft stops completely and hold at 20ft on pure oxygen loop flush for twice the total remaining TTS so nitrogen and helium wash out without adding inert load.",
        isCorrect: false,
        feedback:
          "Dangerous! Staying at 20ft when you still owe 50ft and 40ft ceiling stops leaves fast/intermediate compartments severely supersaturated, inviting acute spinal DCS.",
      },
      {
        label:
          "Add a flat 5-minute penalty to the 50ft stop only and surface normally once your Shearwater ceiling clears 0ft, provided loop setpoint is boosted to 1.45 ata.",
        isCorrect: false,
        feedback:
          "Insufficient. A blow-up from 50ft creates significant silent bubble seeds that slow true gas elimination—requiring 1.5× stop extensions across all shallow stops from 30ft upward.",
      },
    ],
  },
  {
    id: "m2_38",
    level: "Mod 2: Normoxic",
    category: "In-Water DCS Contingency",
    title: "Onset of Deep Shoulder Pain During 20ft Decompression Stop",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.29", "1.30"],
    hudState: "3 GREEN BLINKS (CNS AT 42%)",
    scenarioText:
      "Ten minutes into a 25-minute stop at 20ft, you develop a deep, dull ache in your left shoulder and elbow consistent with decompression sickness. Your rig is working normally and your CNS clock is at 42%. What is the proper underwater action?",
    options: [
      {
        label:
          "Alert your team (send up an emergency DSMB slate note to prep boat O2/EMS), raise loop PPO2 to 1.60 ata at ≤20ft via pure O2 flush, and extend your shallow stops as gas/sorb allow.",
        isCorrect: true,
        feedback:
          "Spot on. At 20ft (1.6 ata ambient) or shallower, flushing with 100% O2 safely maximizes inert gas elimination without exceeding 1.6 ata while surface crew prepares evacuation.",
      },
      {
        label:
          "Abort the remaining 15 minutes of 20ft decompression immediately and ascend to the boat deck so you can begin normobaric 100% surface oxygen and oral rehydration faster.",
        isCorrect: false,
        feedback:
          "Never surface early with uncleared decompression stops while already experiencing DCS! Ambient pressure reduction from 1.6 to 1.0 bar expands existing bubbles by 60%.",
      },
      {
        label:
          "Descend immediately from 20ft back down to 100ft on a 1.60 ata electronic setpoint for 30 minutes to mechanically recompress the shoulder bubble before re-ascending.",
        isCorrect: false,
        feedback:
          "Hazardous! Improvised deep underwater recompression at 100ft on 1.60 SP invites fatal CNS convulsions and traps you with massive new inert gas obligations.",
      },
      {
        label:
          "Drop your setpoint to 0.70 ata to prevent hyperoxic vasoconstriction in the shoulder joint, massage the painful deltoid vigorously, and finish your scheduled stops.",
        isCorrect: false,
        feedback:
          "Incorrect. Lowering PO2 collapses the oxygen window needed to shrink inert gas bubbles, and vigorous joint massage underwater can mobilize venous bubbles.",
      },
    ],
  },
  {
    id: "m2_39",
    level: "Mod 2: Normoxic",
    category: "Isobaric Counterdiffusion",
    title: "Inert Gas Matching to Prevent Isobaric Counterdiffusion (ICD)",
    depthFt: 175,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Why do technical CCR divers match the Helium-to-Nitrogen proportions of their deep/intermediate offboard bailout cylinders to their onboard diluent, and why must you never dive deep on Air/EANx diluent and bail out onto high-Helium Trimix?",
    options: [
      {
        label:
          "Switching from heavy nitrogen-loaded tissues onto a high-helium gas causes fast helium inward diffusion to outpace slow nitrogen washout—creating inner-ear supersaturation bubbles at constant depth.",
        isCorrect: true,
        feedback:
          "Exact ICD mechanism. Helium diffuses in rapidly while dissolved nitrogen leaves slowly, summing to local tissue supersaturation and vestibular (inner-ear) hits without any depth change.",
      },
      {
        label:
          "Switching from nitrogen diluent onto helium bailout cools alveolar capillary blood by 4°C instantaneously, causing dissolved nitrogen to precipitate out of plasma via Henry's Law.",
        isCorrect: false,
        feedback:
          "Incorrect. Cold gas actually increases gas solubility slightly in liquid; ICD is driven by unequal diffusivity and solubility coefficients between N2 and He across tissue membranes.",
      },
      {
        label:
          "Breathing open-circuit helium after closed-circuit nitrogen reverses osmotic water balance across the pulmonary membrane, causing acute immersion pulmonary edema within five minutes.",
        isCorrect: false,
        feedback:
          "Incorrect. Immersion pulmonary edema (IPE) relates to central blood pooling, hypertension, overhydration, and negative inspiratory pressure—not He/N2 counterdiffusion.",
      },
      {
        label:
          "Matching He/N2 ratios is strictly a dive-computer software requirement because ZHL-16C algorithms crash if helium rises while nitrogen falls in the fast 4-minute compartment.",
        isCorrect: false,
        feedback:
          "Incorrect. Bühlmann ZHL-16C tracks pN2 and pHe compartments independently without crashing; the danger is real physiological inner-ear and dermal bubble formation.",
      },
    ],
  },
  {
    id: "m2_40",
    level: "Mod 2: Normoxic",
    category: "Descent Physics",
    title: "Boyle's Law Compression PPO2 Spike Past 1.56 ata at 150ft",
    depthFt: 150,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.56", "1.58", "1.55"],
    hudState: "6 GREEN / RED HIGH-PO2 ALERT",
    scenarioText:
      "Dropping briskly down a steep wall to 150ft, your handset alerts High PPO2 (1.57 ata across all cells) even though your solenoid hasn't clicked since 90ft. Your onboard 16/40 diluent has a DilPO2 of 0.89 ata at 150ft. What happened and how do you fix it?",
    options: [
      {
        label:
          "Rapid hydrostatic compression multiplied existing loop FO2 faster than metabolism burned it; level off immediately, flush with diluent to drop PPO2 and verify cells, then resume.",
        isCorrect: true,
        feedback:
          "Spot on. Because your 16/40 diluent exerts 0.89 ata at 150ft (well below your 1.30 SP), pausing descent and flushing immediately brings loop PPO2 down while proving sensor linearity.",
      },
      {
        label:
          "Your right-hand O2 solenoid is leaking mechanically under pressure; shut the O2 cylinder valve immediately, bail out onto open-circuit backgas, and abort the dive.",
        isCorrect: false,
        feedback:
          "Unnecessary abort! On any fast descent, compressing a loop that held 1.2–1.3 ata shallower naturally spikes PPO2 via Boyle's Law; if PPO2 holds steady after a diluent flush, nothing is leaking.",
      },
      {
        label:
          "Continue descending down to 180ft while exhaling forcefully through your nose so the ADV injects fresh 16/40 diluent automatically without slowing down your descent time.",
        isCorrect: false,
        feedback:
          "Dangerous! Descending deeper increases ambient pressure further—pushing 1.57 ata past 1.75+ ata—before you confirm whether the spike was simple compression or a stuck O2 valve.",
      },
      {
        label:
          "Hold your depth at 150ft without flushing so you conserve onboard trimix diluent, waiting 3–4 minutes for resting metabolic uptake to burn the 1.57 ata spike down to 1.30.",
        isCorrect: false,
        feedback:
          "Incorrect. Sitting at 1.57+ ata for several minutes racks up heavy CNS toxicity clock percentage and leaves you exposed if a real O2 leak is actually feeding the loop.",
      },
    ],
  },
  {
    id: "m2_41",
    level: "Mod 2: Normoxic",
    category: "Compound Equipment Failure",
    title: "Shut-Down Deco Stage Hose + Subsequent CO2 Breakthrough",
    depthFt: 170,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.31", "1.30"],
    hudState: "ON DEEP OC BAILOUT — DECO REG HAS BLOWN SPG",
    scenarioText:
      "At 170ft, the HP gauge hose on your full TMx 50/20 deco stage ruptures, so you shut its valve before losing much gas. Five minutes later, scrubber breakthrough forces you onto OC bailout on your deep stage (TMx 18/40), which lacks enough volume to finish shallow deco alone. What do you do at 70ft?",
    options: [
      {
        label:
          "Stabilize at your 70ft stop and perform an underwater DIN regulator swap—moving the intact regulator assembly from your nearly empty deep stage onto your full 50/20 cylinder.",
        isCorrect: true,
        feedback:
          "Great compound problem-solving! Once at 70ft where 18/40 is nearly spent and 50/20 is breathable, wet-swapping the intact DIN 1st stage unlocks your full deco gas supply to finish stops safely.",
      },
      {
        label:
          "Perform the wet DIN regulator swap immediately on the bottom at 170ft before ascending so you do not have to manage unclipping hardware while hovering in mid-water at 70ft.",
        isCorrect: false,
        feedback:
          "Fatal depth error! Swapping your only working regulator onto a 50% oxygen cylinder at 170ft (3.08 ata PPO2) leaves you with zero breathable gas to get off the bottom.",
      },
      {
        label:
          "Crack the valve slightly on the 50/20 cylinder with the ruptured HP hose at 70ft and breathe the second stage between bursts while letting the HP leak bubble continuously.",
        isCorrect: false,
        feedback:
          "Incorrect. Even through an HP pinhole restrictor, continuous venting over 35+ minutes of shallow decompression can drain the stage prematurely when you have a good DIN reg right beside it.",
      },
      {
        label:
          "Switch back onto your CCR loop at 20ft using pure O2 metabolic replacement mode so you do not have to touch the shut-down 50/20 cylinder.",
        isCorrect: false,
        feedback:
          "Lethal trap! Metabolic O2 replacement mode ONLY works when the scrubber is intact—you bailed out due to CO2 scrubber breakthrough, meaning the loop is permanently unbreathable.",
      },
    ],
  },
  {
    id: "m2_42",
    level: "Mod 2: Normoxic",
    category: "Decompression Loop Dynamics",
    title: "Gradual Counterlung Volume Expansion at Constant Deco Depth",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.29"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Hovering motionless at your 20ft stop for 20 minutes without touching manual valves or triggering the ADV, your PPO2 holds steady at 1.30—yet your counterlungs steadily swell past Minimum Loop and pull you slightly buoyant. Why is loop gas volume growing?",
    options: [
      {
        label:
          "Dissolved N2 and He off-gassing out of your tissues into your exhaled breath adds inert volume to the loop, diluting FO2 and prompting solenoid O2 pulses; vent out your nose periodically.",
        isCorrect: true,
        feedback:
          "Spot on. During peak shallow off-gassing, your body dumps liters of dissolved inert gas into the closed loop, triggering extra solenoid O2 additions to hold 1.30 ata—gradually inflating the loop.",
      },
      {
        label:
          "Your left-side ADV tilt-valve seat has developed a slow intermediate-pressure creep at shallow ambient pressure; close your diluent tank valve for the duration of the 20ft stop.",
        isCorrect: false,
        feedback:
          "Incorrect. Gradual volume gain during long trimix stops is completely normal physiological off-gassing + solenoid makeup; periodically venting via your nose restores Minimum Loop.",
      },
      {
        label:
          "Exothermic heat peaking inside the radial scrubber bed expands loop gas volume by 25% via Charles's Law during motionless stops; switch to open-circuit for 5 minutes to cool it.",
        isCorrect: false,
        feedback:
          "Incorrect. Gas thermal expansion from 20°C to 35°C is only ~5% and stabilizes within minutes—continuous steady volume growth over 20 minutes comes from tissue inert off-gassing + solenoid O2.",
      },
      {
        label:
          "Exhausting soda lime granules release trapped carbon dioxide gas back into the breathing loop once saturation exceeds 75%; bail out to open-circuit immediately.",
        isCorrect: false,
        feedback:
          "Incorrect. Spent soda lime stops absorbing new exhaled CO2 (which matches O2 consumed 1:1 without increasing net volume), it never chemically generates excess gas volume.",
      },
    ],
  },
  {
    id: "m2_43",
    level: "Mod 2: Normoxic",
    category: "Surface DCI First Aid",
    title: "Using a CCR as an Emergency ~100% O2 Unit on Deck",
    depthFt: 0,
    setpoint: 1.0,
    diluent: "16/40",
    cells: ["0.96", "0.97", "0.96"],
    hudState: "SURFACE EMERGENCY OXYGEN MODE",
    scenarioText:
      "During a long run back from an offshore wreck, a responsive diver develops mild skin marbling and joint pain, and the boat's dedicated O2 cylinder runs dry. How can an intact CCR with fresh sorb safely deliver ~100% emergency oxygen on deck?",
    options: [
      {
        label:
          "Shut the diluent valve, flush repeatedly with manual O2 to ≥0.95 PO2, keep the responsive patient supine pinching nostrils (no mask/clips), monitor cells/sorb, and re-flush every 15–20 min.",
        isCorrect: true,
        feedback:
          "Correct emergency improvisation. Closing diluent prevents dilution, avoiding a mask/noseclip lets the mouthpiece drop free if consciousness changes, and 15–20m re-flushes purge off-gassed N2/He.",
      },
      {
        label:
          "Leave both cylinders open, set the controller to 1.30 setpoint so the solenoid fires continuously on deck, and fit a snug dive mask over the patient's nose to guarantee zero air leaks.",
        isCorrect: false,
        feedback:
          "Dangerous! Setting 1.30 SP at 1.0 bar sea level locks the solenoid firing continuously (draining O2 rapidly and spiking line load), and strapping a mask onto a sick patient risks airway obstruction.",
      },
      {
        label:
          "Switch the BOV into Open-Circuit mode and connect the green O2 1st stage LP whip directly into the BOV demand port so the patient breathes open-circuit 100% O2 from the 3L tank.",
        isCorrect: false,
        feedback:
          "Poor gas conservation and O2-clean hazard! Breathing open-circuit drains a 3L cylinder in ~20 minutes instead of 4+ hours on closed-circuit, and diluent BOV internals aren't oxygen-clean for pure O2.",
      },
      {
        label:
          "Flush once with 100% O2 on deck, shut both tank valves completely to prevent solenoid over-injection, and let the patient breathe the sealed loop untouched for two hours.",
        isCorrect: false,
        feedback:
          "Fatal error! Shutting the O2 valve while a patient metabolizes oxygen and off-gasses nitrogen into a sealed surface loop will collapse the lungs and drive the loop severely hypoxic within minutes.",
      },
    ],
  },
  {
    id: "m2_44",
    level: "Mod 2: Normoxic",
    category: "Thermal & Suit Plumbing",
    title: "Drysuit Inflation Gas Selection on Helium CCR Dives",
    depthFt: 165,
    setpoint: 1.3,
    diluent: "16/45",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "When configuring your Prism 2 for cold-water trimix decompression dives in Barrie/Great Lakes conditions, how should you plumb your drysuit inflation supply and what cross-connection hazard must NEVER occur with Argon?",
    options: [
      {
        label:
          "Mount a small dedicated Air/Argon suit cylinder completely isolated from loop plumbing—never inflate with high-He diluent (6× heat loss) and never carry Argon where it could feed the loop.",
        isCorrect: true,
        feedback:
          "Spot on. Plumbing drysuit inflation off onboard helium diluent chills you rapidly and drains critical loop/wing reserve, while accidentally plumbing anoxic Argon into a CCR causes instant fatal hypoxia.",
      },
      {
        label:
          "Tee your drysuit LP whip directly off the right-hand Oxygen 1st stage because oxygen has lower thermal conductivity than air and eliminates mounting an extra pony bottle.",
        isCorrect: false,
        feedback:
          "Extreme fire hazard! Never inject pure oxygen into a drysuit filled with flammable undergarments, lint, skin oils, and static electricity.",
      },
      {
        label:
          "Plumb your drysuit directly off your left-hand 16/45 trimix diluent 1st stage, since modern trilaminate suits trap radiant heat independent of internal gas thermal conductivity.",
        isCorrect: false,
        feedback:
          "Incorrect. Helium conducts body heat roughly 6 times faster than air regardless of shell material, and a stuck suit inflator at 165ft would instantly drain your onboard diluent/BOV supply.",
      },
      {
        label:
          "Fill your onboard left-hand CCR cylinder with Argon for maximum thermal insulation and rely exclusively on your offboard low-O2 stage whip for loop diluent additions.",
        isCorrect: false,
        feedback:
          "Lethal configuration! Argon is 100% anoxic (0% O2) and roughly twice as narcotic as nitrogen under pressure—it must NEVER be connected to any breathing loop, ADV, or BOV.",
      },
    ],
  },
  {
    id: "m2_45",
    level: "Mod 2: Normoxic",
    category: "Team Separation",
    title: "Lost Teammate Protocol in Low-Visibility Cold Water",
    depthFt: 155,
    setpoint: 1.2,
    diluent: "18/35",
    cells: ["1.20", "1.21", "1.20"],
    hudState: "2 GREEN BLINKS — ZERO VISUAL ON PARTNER",
    scenarioText:
      "Exploring a dark Great Lakes wreck exterior at 155ft in 15ft visibility, you turn from checking your handset and realize your CCR teammate's light beam is gone. Because CCRs emit virtually zero bubble noise or surface trail, what is the standard protocol?",
    options: [
      {
        label:
          "Hold position and search/shield your own light for maximum 1 minute looking for their beam glow; if not reunited, abort immediately, ascend on schedule, and shoot a DSMB at your first stop.",
        isCorrect: true,
        feedback:
          "Standard technical lost-buddy rule. Briefly cupping your light helps spot a faint partner beam in dark water; after 60 seconds, both divers ascend cleanly on schedule to reunite at deco or surface.",
      },
      {
        label:
          "Swim a 5-minute expanding circular search around the wreck superstructure while banging your bolt snap, since CCR gas endurance easily supports extended solo searching.",
        isCorrect: false,
        feedback:
          "Incorrect. Searching for 5 minutes at 155ft racks up massive unplanned decompression obligation and delays surface rescue response if your partner actually suffered an emergency and ascended.",
      },
      {
        label:
          "Immediately drop to your backup 0.70 setpoint, dump your wing to hold the bottom, and wait 10 minutes at the wreck bow mooring line in case your buddy backtracks.",
        isCorrect: false,
        feedback:
          "Dangerous! Dropping setpoint to 0.70 at 155ft skyrockets inert gas tissue loading while waiting 10 minutes destroys your bailout gas reserve margins.",
      },
      {
        label:
          "Ascend at 60 ft/min up to 50ft above the wreck where visibility is clearer to look down for their canister light, then drop back to 155ft if you spot them.",
        isCorrect: false,
        feedback:
          "Never yo-yo ascend 100 vertical feet and re-descend on a technical trimix dive—fast ascents followed by re-compression trap arterialized microbubbles.",
      },
    ],
  },

  // =====================================================
  // MOD 3: HYPOXIC TRIMIX EXPEDITION SCENARIOS (46 - 60)
  // =====================================================
  {
    id: "m3_46",
    level: "Mod 3: Hypoxic",
    category: "Hypoxic Diluent / BOV",
    title: "Surface & Shallow Hazard With Onboard Trimix 10/70 on the BOV",
    depthFt: 6,
    setpoint: 0.7,
    diluent: "10/70",
    cells: ["0.70", "0.71", "0.70"],
    hudState: "3 YELLOW BLINKS (CHOPPY SURFACE ENTRY)",
    scenarioText:
      "You are entering rough water for a 300ft dive carrying hypoxic Trimix 10/70 in your left onboard diluent cylinder (10% O2; minimum breathable OC depth 20ft/6m) plumbed directly to your BOV. Why is reflexively bailing out to your BOV near the surface lethal?",
    options: [
      {
        label:
          "At 1.0–1.2 bar near the surface, open-circuit 10/70 delivers ~0.10–0.12 ata PO2—two open-circuit breaths off the BOV wash oxygen out of your lungs and trigger instant hypoxic blackout.",
        isCorrect: true,
        feedback:
          "Critical Mod 3 rule! Breathing <0.16 ata open-circuit gas strips oxygen *out* of venous blood into your lungs. With hypoxic onboard diluent, plumb the BOV to breathable offboard travel gas or isolate it shallow.",
      },
      {
        label:
          "Inhaling 70% helium open-circuit at 6ft causes acute vocal-cord laryngospasm and conductive pulmonary hypothermia within three breaths.",
        isCorrect: false,
        feedback:
          "Incorrect. Helium does not cause laryngospasm; the immediate killer at 6ft is acute anoxia/hypoxia from inhaling 10% oxygen at ~1.18 ata ambient pressure (0.12 ata PO2).",
      },
      {
        label:
          "It is completely safe to breathe 10/70 open-circuit off the BOV for 3–4 minutes at the surface because residual oxygen stored in muscle myoglobin buffers arterial PO2.",
        isCorrect: false,
        feedback:
          "Lethal misconception! Unlike breath-holding, actively ventilating open-circuit 0.10 ata gas flushes alveolar O2 below venous blood pressure, causing unconsciousness in as few as 2–4 breaths.",
      },
      {
        label:
          "Activating the BOV at 6ft back-pressures the left-hand ADV diaphragm, dumping 10/70 into the closed loop and causing all three O2 cells to fail calibration.",
        isCorrect: false,
        feedback:
          "Incorrect. Switching the BOV to OC isolates the loop mechanically; the lethal danger is the diver directly inhaling 0.10 ata hypoxic gas from the BOV second stage.",
      },
    ],
  },
  {
    id: "m3_47",
    level: "Mod 3: Hypoxic",
    category: "Hypoxic Descent Technique",
    title: "Descending Through the Shallow Zone With Hypoxic 10/70 Diluent",
    depthFt: 25,
    setpoint: 0.7,
    diluent: "10/70",
    cells: ["0.42", "0.43", "0.41"],
    hudState: "BOTTOM RED / 6 YELLOW BLINKS — PO2 SAGGING",
    scenarioText:
      "Dropping from the surface through 25ft with hypoxic 10/70 onboard diluent feeding your ADV, a diver inhales deeply as counterlungs compress—injecting a huge slug of 10% O2 diluent that drops loop PPO2 to 0.42 ata before hydrostatic pressure catches up. How is this prevented?",
    options: [
      {
        label:
          "Ensure loop PPO2 starts ≥0.70–1.0 at entry and inject small manual O2 pulses alongside diluent (or feed normoxic offboard travel gas into the loop) through the top 40ft.",
        isCorrect: true,
        feedback:
          "Spot on. Adding hypoxic 10% O2 gas at 10–25ft dilutes loop FO2 faster than modest compression raises pressure—either pre-spike/co-inject O2 manually or plumb normoxic travel gas for shallow descent.",
      },
      {
        label:
          "Close the left-hand diluent valve completely from the surface down to 60ft and inflate your collapsing counterlungs exclusively with pure 100% manual oxygen.",
        isCorrect: false,
        feedback:
          "Dangerous! Filling collapsing counterlungs solely with 100% O2 down to 60ft (2.82 ata ambient) creates a pure oxygen loop that spikes past 2.5+ ata PPO2!",
      },
      {
        label:
          "Drop head-first at 100 ft/min with an empty wing so rapid Boyle's Law compression raises 10% oxygen past 0.50 ata before you need to take a single breath.",
        isCorrect: false,
        feedback:
          "Reckless! Blindly rocketing down at 100 ft/min invites ear barotrauma, uncontrolled bottom overshoot, and catastrophic crash landings if equalization stalls at 20ft.",
      },
      {
        label:
          "Set your primary controller to 1.40 setpoint before leaving the surface so the solenoid fires continuously on deck and masks any hypoxic ADV injection.",
        isCorrect: false,
        feedback:
          "Incorrect. Selecting 1.40 SP on the surface cannot exceed 1.0 bar ambient pressure, wastes O2 continuously on deck, and a restricted solenoid still lags behind a massive gulp of 10% ADV gas.",
      },
    ],
  },
  {
    id: "m3_48",
    level: "Mod 3: Hypoxic",
    category: "Gas Density & WOB",
    title: "High Gas Density & Runaway Exertion CO2 Spiral at 300ft",
    depthFt: 300,
    setpoint: 1.3,
    diluent: "10/60",
    cells: ["1.30", "1.31", "1.29"],
    hudState: "3 GREEN BLINKS (HEAVY SWIMMING AGAINST CURRENT)",
    scenarioText:
      "At 300ft (10.1 bar ambient), a diver fins hard into a current to reach a wreck tie-off. Even with 60% helium, loop gas density approaches ~5.4 g/L. Why can sustained exertion at 300ft trigger fatal CO2 retention even with a brand-new packed scrubber?",
    options: [
      {
        label:
          "Turbulent airway/loop resistance rises sharply with gas density so respiratory muscles generate CO2 faster than alveolar ventilation clears it, while dense gas causes scrubber 'roll-off'.",
        isCorrect: true,
        feedback:
          "Exact deep physiology! Above ~5.2 g/L, internal human airway flow limiting + respiratory muscle work traps CO2 inside the diver's blood *before* gas even reaches the canister, compounded by bed roll-off.",
      },
      {
        label:
          "At 10 bar ambient pressure, helium molecules compress soda lime pores shut mechanically, halting chemical hydroxide reactions completely until ascending above 200ft.",
        isCorrect: false,
        feedback:
          "Incorrect. Helium is the smallest, lightest monatomic gas and reduces density compared to nitrogen—the bottleneck is total gas density (g/L) driving internal airway CO2 retention and mass-transfer limits.",
      },
      {
        label:
          "High hydrostatic pressure forces dissolved nitrogen across the blood-brain barrier to paralyze the medullary breathing center without raising arterial CO2 levels.",
        isCorrect: false,
        feedback:
          "Incorrect. With 60% helium, loop END is well controlled; the acute danger during deep exertion is hypercapnic CO2 retention leading to panic and hyperoxic/CO2 blackout.",
      },
      {
        label:
          "Breathing rapidly at 300ft cools the three O2 sensors unevenly, causing the PID controller to starve oxygen down to 0.50 ata while continuing to display 1.30 green.",
        isCorrect: false,
        feedback:
          "Incorrect. Rapid breathing actually warms the scrubber bed via exothermic CO2 reaction; sensor readings remain valid while unmonitored arterial CO2 spirals out of control.",
      },
    ],
  },
  {
    id: "m3_49",
    level: "Mod 3: Hypoxic",
    category: "HPNS & Compression",
    title: "Fine Hand Tremors & Dizziness on Fast Descent Past 320ft",
    depthFt: 320,
    setpoint: 1.2,
    diluent: "10/80",
    cells: ["1.20", "1.21", "1.20"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "After a fast descent to 320ft using a near-heliox 10/80 diluent (very low nitrogen), a diver experiences fine intention tremors in both hands, myoclonic muscle twitches, lightheadedness, and mild nausea despite normal PPO2 and minimal END. What is occurring?",
    options: [
      {
        label:
          "High Pressure Nervous Syndrome (HPNS) from rapid hydrostatic compression of neural membranes; mitigate by slowing deep descent rates and retaining balanced nitrogen in trimix.",
        isCorrect: true,
        feedback:
          "Spot on. Pure heliox + fast compression hyper-excites CNS neurons (HPNS). Retaining a controlled nitrogen fraction (trimix) uses mild lipid narcosis to counterbalance HPNS tremors.",
      },
      {
        label:
          "Acute CNS oxygen toxicity prodrome triggered by helium accelerating free-radical lipid peroxidation at 1.20 ata; bail out immediately onto a 10% oxygen open-circuit stage.",
        isCorrect: false,
        feedback:
          "Incorrect. Helium does not accelerate CNS oxygen toxicity at 1.20 ata, and bailing out to 10% O2 at 320ft (10.7 bar) still exposes you to 1.07 ata PO2 anyway!",
      },
      {
        label:
          "Inner-ear barotrauma from helium diffusing across the round window membrane faster than Eustachian tube equalization; perform a forceful Valsalva maneuver.",
        isCorrect: false,
        feedback:
          "Incorrect. Bilateral hand tremors and myoclonic jerking without ear pain are classic neurological signs of HPNS, not middle-ear barotrauma.",
      },
      {
        label:
          "Severe nitrogen narcosis caused by compressed 10% residual nitrogen exerting 3.5 bar narcotic pressure; flush the loop with pure heliox 10/90 to eliminate tremors.",
        isCorrect: false,
        feedback:
          "Backwards! With 10/80 diluent at 320ft, FN2 is tiny (~10%)—flushing to pure 10/90 heliox removes nitrogen's stabilizing counter-effect and actually *worsens* HPNS tremors.",
      },
    ],
  },
  {
    id: "m3_50",
    level: "Mod 3: Hypoxic",
    category: "Multi-Stage Management",
    title: "Valve Configuration Across Three Offboard Bailout Stages at 280ft",
    depthFt: 280,
    setpoint: 1.2,
    diluent: "10/65",
    cells: ["1.20", "1.19", "1.20"],
    hudState: "2 GREEN BLINKS",
    scenarioText:
      "Cruising the bottom at 280ft carrying three offboard stages—Deep Bailout (TMx 14/55), Intermediate Travel/Deco (TMx 35/25, MOD 110ft), and Shallow Deco (EAN50 / O2)—which cylinder valves should be OPEN and which CLOSED while at 280ft?",
    options: [
      {
        label:
          "Keep the breathable Deep Bailout (TMx 14/55) valve OPEN for instant deployment, and keep all toxic shallower cylinders CLOSED with stowed regs until ascending to each MOD.",
        isCorrect: true,
        feedback:
          "Universal multi-stage CCR standard: any stage breathable at your current ambient depth stays pressurized/open for immediate emergency breaths; any hyperoxic mix stays shut and stowed.",
      },
      {
        label:
          "Keep all three offboard cylinder valves wide OPEN from surface to bottom so a single-handed regulator grab works at any depth without wasting time turning valves on ascent.",
        isCorrect: false,
        feedback:
          "Lethal hazard! Open hyperoxic stages at 280ft invite wrong-gas seizures during task-loaded bailouts and risk losing all your shallow deco gas to an unseen silent second-stage leak.",
      },
      {
        label:
          "Keep all three offboard cylinder valves CLOSED at 280ft to prevent accidental freeflows, relying strictly on your onboard 3-liter BOV until you pause to open a stage.",
        isCorrect: false,
        feedback:
          "Dangerous at 280ft! At 9.5 bar ambient pressure, a 3-liter onboard diluent cylinder drains in ~60–90 seconds under stressed OC breathing—your primary deep bailout stage must be ready to breathe.",
      },
      {
        label:
          "Keep TMx 14/55 CLOSED because 14% O2 is hypoxic at the surface, and open TMx 35/25 at 280ft since 35% O2 guarantees immediate oxygenation during a hypoxic loop failure.",
        isCorrect: false,
        feedback:
          "Fatal MOD math! At 280ft (9.48 bar), TMx 14/55 exerts a safe 1.33 ata PO2 (breathable!), whereas TMx 35/25 exerts a lethal 3.32 ata PO2.",
      },
    ],
  },
  {
    id: "m3_51",
    level: "Mod 3: Hypoxic",
    category: "Ascent Gas Strategy",
    title: "Plumbing & Flushing Intermediate Trimix Into the Loop on Ascent",
    depthFt: 110,
    setpoint: 1.3,
    diluent: "10/65",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS",
    scenarioText:
      "Ascending on an intact CCR loop from a 280ft dive on 10/65 onboard diluent, you arrive at 110ft carrying a plumbed-in TMx 35/25 stage (Flush PO2 = 1.52 ata @ 110ft, 1.16 ata @ 75ft). At what depth and why do expedition divers flush intermediate mixes into the loop?",
    options: [
      {
        label:
          "Wait until ≤75–80ft where 35/25 flush PO2 drops ≤1.20 ata, then flush the loop to shift the He/N2 inert gradient favorably for shallower stops without risking abrupt ICD.",
        isCorrect: true,
        feedback:
          "Spot on! Even though OC MOD for 35% O2 is ~110ft (1.52 ata), flushing it into a CCR loop is delayed until DilPO2 ≤1.20 ata (~75–80ft) so you don't overshoot your 1.30 setpoint while optimizing He washout.",
      },
      {
        label:
          "Flush the loop aggressively with TMx 35/25 immediately at 110ft because matching open-circuit 1.52 ata MOD maximizes off-gassing without triggering High-PO2 alarms.",
        isCorrect: false,
        feedback:
          "Trap! Flushing a CCR loop with a gas whose PO2 is 1.52 ata pushes loop PPO2 well above your 1.30–1.40 setpoint and gives you zero ability to drop PPO2 if a spike occurs.",
      },
      {
        label:
          "Flush pure Air (21/00) directly into the 10/65 loop at 150ft to purge all helium out of the counterlungs early and slash shallow decompression stop times in half.",
        isCorrect: false,
        feedback:
          "High ICD & narcosis risk! Abruptly dumping 79% nitrogen air over tissues heavily saturated with 65% helium at 150ft spikes both END narcosis and Isobaric Counterdiffusion.",
      },
      {
        label:
          "Never flush offboard gases into an active CCR loop during ascent because changing inert gas fractions invalidates the SOLO board's galvanic O2 sensor calibration.",
        isCorrect: false,
        feedback:
          "Incorrect. Galvanic O2 sensors measure oxygen partial pressure cleanly across trimix/nitrox switches, and Shearwater CC gas switches track tissue loading accurately when updated.",
      },
    ],
  },
  {
    id: "m3_52",
    level: "Mod 3: Hypoxic",
    category: "Oxygen Budget Strategy",
    title: "Stepped Bottom-to-Deco Setpoint Management on 3-Hour Profiles",
    depthFt: 270,
    setpoint: 1.05,
    diluent: "10/65",
    cells: ["1.05", "1.06", "1.05"],
    hudState: "ALTERNATING GRN/YEL TO 1 GRN BLINK",
    scenarioText:
      "On a 270ft dive with a 190-minute runtime, why do expedition divers commonly run a conservative 1.0–1.1 ata bottom setpoint and boost to 1.35–1.40 ata only at ≤80–70ft during decompression (paired with periodic 5-minute low-PO2 breaks)?",
    options: [
      {
        label:
          "At 270ft (9.2 bar), dropping SP by 0.25 ata barely changes huge inert pressure while lowering CNS/WOB risk, banking CNS% allowance for shallow stops where high PO2 cuts deco sharply.",
        isCorrect: true,
        feedback:
          "Exact deep oxygen optimization. At 9.2 bar, 8.15 vs 7.90 bar inert pressure is negligible (~3%), whereas at 20ft (1.6 bar), boosting from 1.1 to 1.4 cuts inspired inert pressure in half!",
      },
      {
        label:
          "Running 1.30 ata at 270ft causes helium to bond chemically with hemoglobin, whereas keeping bottom SP at 1.05 prevents pulmonary OTUs from accumulating below 100ft.",
        isCorrect: false,
        feedback:
          "Incorrect. Helium is chemically inert and never binds hemoglobin, and OTUs accumulate anytime inspired PO2 exceeds 0.50 ata regardless of water depth.",
      },
      {
        label:
          "You should run the exact opposite profile—1.40 ata on the bottom at 270ft to prevent inert uptake, then drop to 0.90 ata from 70ft upward so bubbles expand slowly.",
        isCorrect: false,
        feedback:
          "Dangerous! Running 1.40 ata under heavy gas density/CO2 risk at 270ft invites deep CNS convulsions, while dropping to 0.90 ata on shallow deco balloons TTS and slows inert elimination.",
      },
      {
        label:
          "Taking 5-minute low-PO2 breaks on a CCR requires opening the DSV and breathing ambient water vapor, making breaks impossible without bailing out to open-circuit air.",
        isCorrect: false,
        feedback:
          "Incorrect. Low-PO2 breaks are easily performed either by breathing a low-O2 offboard regulator for 5 minutes or flushing the loop down with low-O2 diluent at 0.70 SP.",
      },
    ],
  },
  {
    id: "m3_53",
    level: "Mod 3: Hypoxic",
    category: "Scrubber Endurance Limits",
    title: "Unplanned Entanglement Delay Pushing Rated Scrubber Duration",
    depthFt: 60,
    setpoint: 1.3,
    diluent: "12/55",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS — RUNTIME AT RATED SORB LIMIT",
    scenarioText:
      "Clearing a fouled line on the bottom delayed your departure by 20 minutes, extending total runtime 25 minutes past your radial scrubber's conservative 4°C rating. Now hovering calmly at 60ft with 40 minutes of deco left, should you automatically bail out to OC right now?",
    options: [
      {
        label:
          "In a genuine unplanned delay with low prior workload and zero CO2 symptoms, stay on the intact loop hyper-vigilantly to preserve offboard bailout reserves, ready to bail instantly.",
        isCorrect: true,
        feedback:
          "Sound expedition judgment. Factory ratings assume harsh test workloads/temps with safety margin; prematurely dumping onto OC at 60ft could exhaust your stages before clearing 10ft if no CO2 signs exist.",
      },
      {
        label:
          "Yes—at the exact minute of rated canister duration, soda lime undergoes instantaneous 100% saturation collapse and releases lethal CO2 on the very next breath.",
        isCorrect: false,
        feedback:
          "Incorrect. While you must NEVER *plan* to exceed rated scrubber limits, breakthrough under calm resting deco is progressive rather than a digital timer cliff—conserve OC gas until needed or shallow.",
      },
      {
        label:
          "Raise your loop setpoint to 1.60 ata at 60ft and skip half of your 20ft and 10ft stops so you surface before exceeding the canister clock by more than 10 minutes.",
        isCorrect: false,
        feedback:
          "Hazardous! Running 1.60 SP at 60ft invites an underwater seizure, and deliberately omitting 20 minutes of trimix decompression guarantees severe DCS when you still have full OC bailout stages.",
      },
      {
        label:
          "Perform continuous 10-second diluent flushes every 60 seconds at 60ft so fresh gas blows CO2 out the counterlung OPV without relying on chemical absorption.",
        isCorrect: false,
        feedback:
          "Inefficient! Dumping massive open-circuit-equivalent volumes through the loop every minute drains your diluent/offboard supply without offering the clean safety of open-circuit regulators.",
      },
    ],
  },
  {
    id: "m3_54",
    level: "Mod 3: Hypoxic",
    category: "Severe Thermal Emergency",
    title: "Catastrophic Drysuit Flood in 40°F Water Approaching Shallow Deco",
    depthFt: 20,
    setpoint: 1.3,
    diluent: "15/45",
    cells: ["1.30", "1.30", "1.29"],
    hudState: "3 GREEN BLINKS — VIOLENT UNCONTROLLABLE SHIVERING",
    scenarioText:
      "A ripped neck seal floods your drysuit during a 40°F (4°C) Great Lakes trimix dive. Approaching your 20ft stop with 45 minutes of deco left, violent shivering is progressing toward loss of finger dexterity and mental confusion. What emergency deco adjustment is warranted?",
    options: [
      {
        label:
          "Step setpoint to 1.40 ata up to 20ft, then at ≤20ft flush the loop with 100% O2 (1.60 ata @ 20ft / 1.45 ata @ 15ft) so your real-time O2 computer clears accelerated deco cleanly.",
        isCorrect: true,
        feedback:
          "Correct life-safety trade-off. When impending severe hypothermia threatens consciousness underwater, maximizing the oxygen window at ≤20ft (where pure O2 cannot exceed 1.6 ata) safely trims exit time.",
      },
      {
        label:
          "Set your primary controller to 1.60 ata starting at 90ft so you maximize decompression acceleration across all intermediate and shallow stops.",
        isCorrect: false,
        feedback:
          "Too dangerous! Shivering and cold stress heighten CNS toxicity susceptibility—running 1.60 ata on a fluctuating loop at 90ft risks fatal deep convulsions.",
      },
      {
        label:
          "Bail out onto cold open-circuit trimix stages immediately from 60ft upward so expanding regulator gas keeps you alert and prevents shivering-induced loop volume swings.",
        isCorrect: false,
        feedback:
          "Worst possible thermal move! Switching from warm, humid exothermic CCR loop gas onto ice-cold, bone-dry open-circuit expanding gas accelerates core hypothermia dramatically.",
      },
      {
        label:
          "Add +20% extra hang time to your 20ft and 10ft stops despite losing hand dexterity, because cold peripheral vasoconstriction traps inert gas inside skin tissues.",
        isCorrect: false,
        feedback:
          "While mild cooling normally favors conservative GF High settings, once catastrophic flooding threatens imminent hypothermic incapacitation underwater, getting out safely before blackout takes priority.",
      },
    ],
  },
  {
    id: "m3_55",
    level: "Mod 3: Hypoxic",
    category: "Computer Discrepancy",
    title: "Managing Divergent Primary & Backup Computers in a Crisis",
    depthFt: 30,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "PRIMARY TTS: 18 MIN | BACKUP TTS: 29 MIN",
    scenarioText:
      "On normal dives, you clear whichever of your two computers is more conservative. During an emergency bailout ascent where your backup computer stayed locked on a conservative fixed/bailout assumption (29m TTS) while your real-time O2-integrated computer shows 18m TTS and gas is critically tight, what applies?",
    options: [
      {
        label:
          "In a genuine life-support gas or thermal crisis, follow the shorter valid schedule on your real-time O2-monitoring computer to surface with breathing gas, accepting backup lockout.",
        isCorrect: true,
        feedback:
          "Correct contingency judgment. Running out of breathing gas underwater at 10ft to satisfy a conservative backup model is fatal—follow valid real-time O2 tissue tracking in a true gas emergency.",
      },
      {
        label:
          "Hold at 30ft until your final bailout stage hits 0 psi trying to clear the 29-minute backup computer, then make a rapid free ascent once the regulator breathes hard.",
        isCorrect: false,
        feedback:
          "Never breathe your final cylinder to empty underwater! Surfacing cleanly after clearing your primary ZHL-16C O2-integrated schedule is vastly safer than drowning or bolting at 0 psi.",
      },
      {
        label:
          "Average the two computers mathematically (23.5 minutes) on every routine dive as well as emergencies so neither Shearwater unit ever enters violation mode.",
        isCorrect: false,
        feedback:
          "Incorrect. On normal non-emergency dives you always respect the more conservative unit; averaging violates the conservative computer anyway without resting on coherent tissue math.",
      },
      {
        label:
          "Reset tissue compartments inside your backup computer menu at 30ft so both screens match 18 minutes before ascending to the boat.",
        isCorrect: false,
        feedback:
          "Incorrect. Tissue reset functions are locked out underwater during an active dive and must never be cleared mid-expedition.",
      },
    ],
  },
  {
    id: "m3_56",
    level: "Mod 3: Hypoxic",
    category: "Post-Dive Physiology",
    title: "Post-Dive Gear Hauling Strain & Latent Patent Foramen Ovale (PFO)",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "15/45",
    cells: ["0.70", "0.70", "0.70"],
    hudState: "POST-DIVE BOAT LADDER EXIT",
    scenarioText:
      "After surfacing from a heavy trimix profile, why do experienced expedition divers often breathe high-PO2 loop gas calmly for several minutes before exiting and pass off heavy stages rather than climbing a steep ladder fully loaded?",
    options: [
      {
        label:
          "Heavy lifting and Valsalva strain spike right-atrial chest pressure upon release, which can pop open a latent heart PFO flap and shunt silent venous bubbles directly into brain/spinal arteries.",
        isCorrect: true,
        feedback:
          "Crucial physiology! ~25% of divers have a probe-patent foramen ovale. Venous microbubbles peak 15–60 min post-dive; unclipping heavy stages in the water avoids right-to-left arterial shunting.",
      },
      {
        label:
          "Climbing a ladder with twin stages compresses femoral veins in the legs, forcing dissolved helium backward into sciatic nerve sheaths via retrograde venous reflux.",
        isCorrect: false,
        feedback:
          "Incorrect. Neurological inner-ear, cerebral, and cutis marmorata hits after heavy lifting stem from paradoxical right-to-left cardiac/pulmonary shunting of venous bubbles.",
      },
      {
        label:
          "Post-dive exertion raises core body temperature by 1.5°C, causing dissolved oxygen inside arterial blood to boil out into hyperoxic micro-emboli.",
        isCorrect: false,
        feedback:
          "Incorrect. Metabolizable oxygen is rapidly consumed by tissues and does not form persistent post-dive arterial emboli—inert N2 and He venous bubbles shunted across a PFO are the culprit.",
      },
      {
        label:
          "Hauling a heavy CCR up a boat ladder jars the warm radial soda lime bed, releasing carbon monoxide gas if you take another breath on deck.",
        isCorrect: false,
        feedback:
          "Incorrect. Jarring a canister can loosen dust or settle granules for *future* dives, but the physiological danger to the diver climbing loaded after deco is PFO bubble shunting.",
      },
    ],
  },
  {
    id: "m3_57",
    level: "Mod 3: Hypoxic",
    category: "Drift Decompression",
    title: "Partially Deflated DSMB During Blue-Water Drift Decompression",
    depthFt: 60,
    setpoint: 1.3,
    diluent: "16/40",
    cells: ["1.30", "1.30", "1.30"],
    hudState: "3 GREEN BLINKS — OPEN-WATER DRIFT HANG",
    scenarioText:
      "Hanging in mid-water at 60ft under your primary DSMB during an offshore drift deco, you notice the buoy's duckbill/OPV leaked partially—leaving it lying flat in surface chop, yet still holding too much lift to reel back down to 60ft. What is the proper fix?",
    options: [
      {
        label:
          "Hold your 60ft ceiling strictly and either clip/send a second inflated DSMB up the existing line as a messenger float or deploy your backup DSMB on a separate spool per team SOP.",
        isCorrect: true,
        feedback:
          "Correct. Never break your deco ceiling for surface gear! Sending a secondary buoy up the taut line (or shooting a second spool) restores high-visibility surface tracking cleanly.",
      },
      {
        label:
          "Ascend briefly from 60ft to 25ft where water pressure drops enough for the half-filled DSMB to stand vertical again, then drop back down to 60ft.",
        isCorrect: false,
        feedback:
          "Never violate a 60ft trimix ceiling to fix a marker buoy! Ascending 35ft above your stop invites immediate bubble formation.",
      },
      {
        label:
          "Cut the primary spool line immediately so the flat buoy drifts away, finish 45 minutes of bubble-free CCR deco unmarked, and shoot a fresh buoy only after clearing 10ft.",
        isCorrect: false,
        feedback:
          "Dangerous in open water! Unlike open-circuit divers, CCR teams leave zero surface bubble trail—drifting unmarked for 45 minutes in current risks losing the chase boat completely.",
      },
      {
        label:
          "Tie the spool off to your harness waist D-ring and inflate your wing to pull harder against the line so line tension snaps the surface buoy upright.",
        isCorrect: false,
        feedback:
          "Never clip or tie an active surface line directly to your harness in choppy water, and inflating your wing against a semi-sunken buoy will pull you upward through your ceiling!",
      },
    ],
  },
  {
    id: "m3_58",
    level: "Mod 3: Hypoxic",
    category: "Multi-Day Hyperoxia",
    title: "Progressive Distance Blur vs. Delayed Post-Dive Ear Fullness",
    depthFt: 0,
    setpoint: 0.7,
    diluent: "15/45",
    cells: ["0.70", "0.70", "0.70"],
    hudState: "DAY 5 EXPEDITION MEDICAL CHECK",
    scenarioText:
      "After five consecutive days of 3-hour CCR dives at 1.30–1.40 deco SP, Diver 1 notices boat buoys in the distance look blurry (reading wet notes up close is fine), while Diver 2 wakes up 4 hours post-dive with retracted, aching eardrums. What caused each issue?",
    options: [
      {
        label:
          "Diver 1 has hyperoxic lenticular myopia (halt high-PO2 diving; clear masks via nose only when needed or use low-O2 gas); Diver 2 has middle-ear O2 absorption squeeze (equalize post-dive).",
        isCorrect: true,
        feedback:
          "Classic multi-day CCR expedition physiology! High loop O2 inside the mask/lungs alters crystalline lens refraction (myopia), while >80% O2 trapped in the middle ear absorbs while sleeping.",
      },
      {
        label:
          "Both divers are suffering subacute cerebral and vestibular arterial gas embolisms requiring immediate chamber recompression on Treatment Table 6.",
        isCorrect: false,
        feedback:
          "Incorrect. Painless symmetrical myopic shift after multi-day high OTU loads and delayed bilateral middle-ear negative squeeze hours after sleep are specific hyperoxic effects, not AGE.",
      },
      {
        label:
          "Diver 1 has scopolamine patch pupil dilation and Diver 2 has external swimmer's otitis; both divers can continue 1.40 SP diving tomorrow using antibiotic ear drops.",
        isCorrect: false,
        feedback:
          "Incorrect. Scopolamine blurs *near* vision (presbyopia-like accommodation loss), whereas hyperoxic lens shift blurs *distant* vision (myopia)—continuing high-PO2 diving worsens it.",
      },
      {
        label:
          "Diver 1 has corneal helium microbubbles from mask squeeze and Diver 2 has inner-ear ICD; switch both divers to pure oxygen open-circuit deco from 20ft upward.",
        isCorrect: false,
        feedback:
          "Incorrect. Pure oxygen at 20ft actually *increases* middle-ear O2 fraction to 100%, making post-dive middle-ear oxygen absorption squeeze even stronger unless air/diluent is equalized before exit.",
      },
    ],
  },
  {
    id: "m3_59",
    level: "Mod 3: Hypoxic",
    category: "Cold-Water Canister Physics",
    title: "Helium Thermal Conductivity & Radial Scrubber Cold Derating",
    depthFt: 260,
    setpoint: 1.2,
    diluent: "10/65",
    cells: ["1.20", "1.20", "1.21"],
    hudState: "2 GREEN BLINKS (39°F / 4°C DEEP WATER)",
    scenarioText:
      "Planning a 260ft dive in 39°F (4°C) Great Lakes water using 65% helium diluent, how does high helium content combined with near-freezing water affect your radial soda lime canister compared to warm-water air diluent diving?",
    options: [
      {
        label:
          "Helium's 6× higher thermal conductivity strips exothermic reaction heat out through the bucket walls faster, chilling outer granules and requiring strict cold-water duration derating.",
        isCorrect: true,
        feedback:
          "Spot on. Soda lime efficiency plummets when chilled; helium rapidly conducts the bed's active reaction heat into surrounding 4°C water, shortening effective breakthrough time.",
      },
      {
        label:
          "Helium's tiny atomic radius lowers gas density so dramatically that cold-water scrubber duration increases by 30% beyond the 190-minute 4°C air-diluent rating.",
        isCorrect: false,
        feedback:
          "Dangerous assumption! While helium lowers density compared to air at 260ft, convective/conductive heat stripping in 4°C water still severely limits cold reaction kinetics—never exceed rated 4°C limits.",
      },
      {
        label:
          "Below 40°F, helium condenses moisture onto the outer radial mesh screen and freezes it solid unless you pre-heat the canister above 120°F on the truck dashboard.",
        isCorrect: false,
        feedback:
          "Incorrect. Freshly breathed canister beds stay above freezing internally from metabolic/chemical heat, and baking plastic baskets/O2 sensors at 120°F+ damages cells and dries out sorb.",
      },
      {
        label:
          "Helium selectively poisons potassium hydroxide catalysts inside 8–12 mesh granules below 200ft, requiring you to pack fine 4–8 mesh industrial hospital lime instead.",
        isCorrect: false,
        feedback:
          "Never use coarse 4–8 mesh hospital lime in a P2 radial basket! Hollis specifies high-grade 8–12 mesh diving absorbent; coarse 4–8 mesh drastically increases channeling and early breakthrough.",
      },
    ],
  },
  {
    id: "m3_60",
    level: "Mod 3: Hypoxic",
    category: "Bailout Regulator Freeze",
    title: "Freeflowing Deep Offboard Bailout Stage During Cold Ascent",
    depthFt: 150,
    setpoint: 1.3,
    diluent: "12/55",
    cells: ["FAIL", "FAIL", "FAIL"],
    hudState: "ON OC BAILOUT — DEEP STAGE ICING & FREEFLOWING",
    scenarioText:
      "After bailing out off a flooded CCR in 40°F water, heavy breathing at 150ft freezes your deep offboard stage (TMx 16/45) into a violent freeflow. Your next stage (TMx 50/20) is toxic until 70ft. How do you survive the 150ft-to-70ft ascent?",
    options: [
      {
        label:
          "Sip from the edges of the freeflowing mouthpiece without sealing your lips while feathering the stage cylinder valve back-and-forth (or sharing a buddy's deep stage) up to 70ft.",
        isCorrect: true,
        feedback:
          "Exact cold-water bailout survival skill! Never seal lips on a freeflow (barotrauma) and never open a 50% deco bottle at 150ft; feathering the frozen tank valve conserves enough gas to reach 70ft or your teammate.",
      },
      {
        label:
          "Shut the frozen 16/45 cylinder completely and switch onto your TMx 50/20 regulator for shallow sips while ascending fast, holding your breath between sips to lower average PO2.",
        isCorrect: false,
        feedback:
          "Double fatality trap! Breathing 50% O2 at 150ft delivers 2.77 ata PO2 (seizure), and breath-holding while ascending on open-circuit causes catastrophic pulmonary barotrauma / AGE.",
      },
      {
        label:
          "Seal your lips tightly around the freeflowing second stage and route the excess gas through your nose into your mask so your drysuit hood warms the frozen first stage.",
        isCorrect: false,
        feedback:
          "Never seal your mouth tightly around a violently freeflowing second stage—140 psi intermediate pressure can rupture alveoli in an instant!",
      },
      {
        label:
          "Close the frozen offboard stage and switch back onto your flooded closed-circuit loop in manual mode until reaching 70ft, blowing caustic water out between breaths.",
        isCorrect: false,
        feedback:
          "Incorrect. Returning to a flooded soda lime canister at 150ft delivers an unbreathable caustic cocktail into your lungs when feathering your stage or sharing with your teammate is immediately available.",
      },
    ],
  },
];