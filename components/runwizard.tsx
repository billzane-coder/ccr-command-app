"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  RotateCcw,
  Timer,
  Sliders,
  Wrench,
  ChevronDown,
  ChevronUp,
  Smartphone,
} from "lucide-react";

type SecondaryDisplay = "hud" | "nerd2";
type CounterlungType = "bmcl" | "fmcl";

interface TroubleshootingItem {
  likelihood: "Most Likely" | "Common" | "Less Likely" | "Rare / Critical";
  issue: string;
  fix: string;
}

interface RunUpStep {
  id: string;
  stepNumber: number;
  phase: string;
  title: string;
  instruction: string;
  subPoints: string[];
  referenceSpec?: string;
  inputType?: "mv_air" | "mv_o2" | "battery" | "timer_60" | "timer_300" | "none";
  criticalWarning?: string;
  troubleshooting: TroubleshootingItem[];
}

export default function RunWizard({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  // Rig Configuration State
  const [secondaryDisplay, setSecondaryDisplay] = useState<SecondaryDisplay>("hud");
  const [counterlungType, setCounterlungType] = useState<CounterlungType>("bmcl");

  // Wizard Progress & Telemetry State
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stepConfirmed, setStepConfirmed] = useState<Record<string, boolean>>({});
  const [airMv, setAirMv] = useState({ c1: "11.2", c2: "11.5", c3: "11.4" });
  const [o2Mv, setO2Mv] = useState({ c1: "53.2", c2: "54.7", c3: "54.2" });
  const [batVolts, setBatVolts] = useState({ ext: "8.4", int: "3.45" });
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTrouble, setShowTrouble] = useState(false);

  // Screen Wake Lock State (Overrides phone screen timeout)
  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    const savedDisp = localStorage.getItem("p2_pref_display") as SecondaryDisplay;
    const savedLung = localStorage.getItem("p2_pref_lung") as CounterlungType;
    if (savedDisp === "hud" || savedDisp === "nerd2") setSecondaryDisplay(savedDisp);
    if (savedLung === "bmcl" || savedLung === "fmcl") setCounterlungType(savedLung);
  }, []);

  // Request Screen Wake Lock on mount & when tab becomes visible again
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLock.addEventListener("release", () => {
            setWakeLockActive(false);
          });
        }
      } catch (err) {
        setWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  const updateDisplayPref = (val: SecondaryDisplay) => {
    setSecondaryDisplay(val);
    localStorage.setItem("p2_pref_display", val);
  };

  const updateLungPref = (val: CounterlungType) => {
    setCounterlungType(val);
    localStorage.setItem("p2_pref_lung", val);
  };

  // Timer Countdown Hook
  useEffect(() => {
    if (!timerRunning || timerSeconds === null) return;
    if (timerSeconds <= 0) {
      setTimerRunning(false);
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const steps: RunUpStep[] = useMemo(() => {
    const isNerd = secondaryDisplay === "nerd2";
    const isBmcl = counterlungType === "bmcl";

    return [
      {
        id: "step_1",
        stepNumber: 1,
        phase: "Head & Scrubber",
        title: "Red CO2 Seal & Scrubber Basket",
        instruction:
          "Inspect the red silicone CO2 seal in the head plate groove. Confirm it is dry, free of grease, and seated flat before mounting the packed radial scrubber basket.",
        subPoints: [
          "Never lubricate the red CO2 seal (causes slippage and 100% CO2 bypass).",
          "Confirm bottom moisture pad is flat and clear of the bucket compression spring.",
          "Verify 1 thread is exposed above the nylock nut on the bottom bucket spring post.",
          "Latch all 3 stainless steel bucket latches evenly and inspect the 2 red head O-rings through the clear urethane bucket.",
        ],
        referenceSpec:
          "Max Sorb Duration (8-12 Mesh): 190 min @ 4°C (40m) | Verify 0 channeling",
        inputType: "none",
        criticalWarning: "Omitting the red CO2 seal results in 100% scrubber bypass.",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "Bucket won't push up flush against the head flange or latches feel overly tight.",
            fix: "Scrubber basket was inserted upside down (center tube must face UP) or the bottom moisture pad is bunched up under the compression spring.",
          },
          {
            likelihood: "Common",
            issue: "Scrubber basket lid won't thread down flush onto the cage.",
            fix: "Crushed soda lime dust has caked in the plastic threads. Brush out threads or soak basket top/threads in warm white vinegar for 15 minutes and rinse.",
          },
          {
            likelihood: "Less Likely",
            issue: "Red CO2 seal keeps popping out of its head plate channel.",
            fix: "Lubricant got onto the red seal or into the groove. Wash both with warm soapy water (Dawn/Simple Green) and dry completely—it must feel gummy, never slick.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Pinched or rolled red head-to-bucket O-ring visible through clear bucket.",
            fix: "Unlatch bucket immediately, remove both O-rings in order, clean soda lime grit out of grooves, lightly lubricate with Cristo-Lube/Tribolube, and re-seat straight up without twisting.",
          },
        ],
      },
      {
        id: "step_2",
        stepNumber: 2,
        phase: "Primary Electronics",
        title: "Controller Boot & Air mV Linearity",
        instruction:
          "Power on the primary wrist handset (press MENU + SELECT simultaneously). Press SELECT 3 times to bring up the raw Millivolts info screen in ambient air.",
        subPoints: [
          "Enter your 3 cell millivolt readings below to auto-calculate your 100% O2 linearity targets.",
          "Switch active Setpoint to .19 (9x MENU presses) so the solenoid does not fire while setting up.",
        ],
        referenceSpec:
          "Valid Air Range: 8.5 mV – 14.0 mV (Multiply by 4.76 for expected 100% O2 mV)",
        inputType: "mv_air",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "Cell mV reading is slightly high in air (e.g., 15–20 mV).",
            fix: "Residual oxygen is still sitting in the head from a previous test or cylinder crack. Open DSV and wave/flush fresh ambient air through the head until mV settles.",
          },
          {
            likelihood: "Common",
            issue: "One cell reads below 8.5 mV in ambient air or shows FAIL.",
            fix: "Cell is nearing the end of its 12-month service life, or the 3-pin Molex connector on the back of the cell is loose/oxidized. Reseat connector or clean pins with a tiny drop of DeoxIT Gold.",
          },
          {
            likelihood: "Less Likely",
            issue: "All 3 cells read 0.0 mV or FAIL simultaneously.",
            fix: "Main 6-pin Molex wiring harness inside the head is unplugged, or the DiveCAN handset connector sleeve is not fully seated.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Solenoid keeps clicking in air even after switching Setpoint to .19.",
            fix: "You are either above 3,000 ft altitude, or all 3 sensors are reading <0.19 due to an uncalibrated state. Close O2 tank valve until ready to flush and calibrate.",
          },
        ],
      },
      {
        id: "step_3",
        stepNumber: 3,
        phase: "Secondary Display",
        title: isNerd
          ? "NERD 2 Boot & Millivolt Cross-Check"
          : "LED HUD Startup & Array Check",
        instruction: isNerd
          ? "Power on your DiveCAN NERD 2 (press both left/right piezo buttons). Verify the heads-up optics are clear, battery indicator is solid, and cell readings match the primary handset."
          : "Activate the DiveCAN LED HUD by bridging the wet contacts for 5 seconds. Verify every LED row and the red end-cap buddy warning light illuminate.",
        subPoints: isNerd
          ? [
              "Step through NERD 2 info screens (right button) to verify mV readings match your primary handset.",
              "Confirm NERD 2 internal rechargeable battery is adequately charged for the planned runtime.",
              "Verify the eyepiece mount is secure on the DSV/BOV counterweight and aligned with your line of sight.",
            ]
          : [
              "Confirm the directional 'UP' arrow flashes in the correct orientation.",
              "Watch for a 30-second solid yellow row—this is the ONLY warning you will get for a low HUD battery.",
            ],
        referenceSpec: isNerd
          ? "NERD 2 DiveCAN Bus | Verify mV agreement with Primary Controller"
          : "HUD Power: 3.6V Saft LS14500 in head | Smither's Code: 1 blink per 0.1 ata from 1.0",
        inputType: "none",
        criticalWarning: isNerd
          ? undefined
          : "The LED HUD only alerts for low battery at turn-on, never mid-dive.",
        troubleshooting: isNerd
          ? [
              {
                likelihood: "Most Likely",
                issue: "NERD 2 shows 'NO COMMS' or dashes for PPO2.",
                fix: "Check the 5-pin DiveCAN monitor bus connector—align the index lines, push firmly together, and secure the locking sleeve with both O-rings.",
              },
              {
                likelihood: "Common",
                issue: "NERD 2 PPO2 readings differ slightly from primary wrist handset.",
                fix: "The Monitor Bus (OBOE) and Control Bus (SOLO) store calibration independently. Calibrate both the wrist handset AND the NERD 2 during Step 7.",
              },
              {
                likelihood: "Less Likely",
                issue: "NERD 2 screen is dim or battery icon is yellow/red.",
                fix: "Attach the magnetic 4-pin USB charger before diving. Never start a deco dive with a low NERD 2 internal Li-Ion battery.",
              },
            ]
          : [
              {
                likelihood: "Most Likely",
                issue: "HUD won't turn on when touching the wet contacts.",
                fix: "Dry fingers don't conduct enough current. Lick your finger or bridge the two metal wet-contact pins on the red end-cap with a wet coin/key for a full 5 seconds.",
              },
              {
                likelihood: "Common",
                issue: "Yellow LED row stays lit solid for 30 seconds at turn-on.",
                fix: "The 3.6V Saft LS14500 lithium AA battery inside the head battery compartment is low. Replace it before diving (HUD has no mid-dive low-battery alarm).",
              },
              {
                likelihood: "Less Likely",
                issue: "Four corner LEDs are blinking continuously.",
                fix: "No DiveCAN communications between the head OBOE board and HUD. Reseat the 5-pin DiveCAN cable connector and verify locking sleeve O-rings.",
              },
              {
                likelihood: "Rare / Critical",
                issue: "Double-tap commands are ignored by the HUD.",
                fix: "Taps are too fast or too slow. Say 'tap-tap' aloud (~1 second total) using a wet finger or metal object to enter Command Column 1.",
              },
            ],
      },
      {
        id: "step_4",
        stepNumber: 4,
        phase: "High Pressure",
        title: "Oxygen HP System Leak Check",
        instruction:
          "Slowly open the right-hand Oxygen cylinder valve to pressurize the green-coded 1st stage and solenoid feed lines, then shut the valve completely.",
        subPoints: [
          "Monitor the O2 SPG for at least 60 seconds.",
          "Confirm zero needle drop before reopening the O2 cylinder valve.",
        ],
        referenceSpec: "1st Stage Intermediate Pressure: 140–145 psi (9.7–10 bar)",
        inputType: "timer_60",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "O2 SPG needle drops rapidly as soon as you close the tank valve.",
            fix: "Your handset setpoint is still above ambient air (e.g., 0.7 or 1.3), causing the solenoid to fire and drain the line! Set handset to .19 and re-test.",
          },
          {
            likelihood: "Common",
            issue: "Slow, steady SPG needle creep downward over 60 seconds.",
            fix: "Check the DIN wheel O-ring on the O2 1st stage, the quick-disconnect (QD) Schrader valve on the Manual O2 Addition Valve/Block, or the SPG swivel spool.",
          },
          {
            likelihood: "Less Likely",
            issue: "Audible hiss coming from the 1st stage body.",
            fix: "Intermediate pressure (IP) has crept above 145 psi and popped the 1st stage over-pressure relief valve. Do not dive—1st stage requires O2-clean service.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Gas escaping from the stainless steel battery cap relief valve on the head.",
            fix: "Internal solenoid O-ring or solenoid seat has lost gas containment into the solenoid housing. Abort dive and send head for authorized service.",
          },
        ],
      },
      {
        id: "step_5",
        stepNumber: 5,
        phase: "Loop Integrity",
        title: "Negative Pressure (Vacuum) Test",
        instruction:
          "Open the DSV/BOV in CC mode. Inhale from the mouthpiece and exhale through your nose until counterlungs and corrugated hoses collapse tight. Shut the DSV/BOV.",
        subPoints: [
          "Observe cell mV or PPO2 drop by 0.1–0.2 due to partial vacuum.",
          isBmcl
            ? "Confirm breathing hoses remain tightly compressed for 60s. If vacuum creeps, check the BMCL bottom drain cord/valve or DSV O-rings."
            : "Confirm breathing hoses remain tightly compressed for 60s. If vacuum creeps, check the FMCL drain locking collars or OPV mushroom seal.",
        ],
        referenceSpec: "Minimum Hold: 60 Seconds | Zero hose relaxation",
        inputType: "timer_60",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: isBmcl
              ? "Hoses slowly lengthen and vacuum is lost (BMCL)."
              : "Hoses slowly lengthen and vacuum is lost (FMCL).",
            fix: isBmcl
              ? "Debris or hair is caught in the BMCL bottom drain/OPV dump valve, or the pull cord is snagged slightly open. Flush drain with fresh water and snap valve shut."
              : "The locking collar on one of the FMCL bottom water drains is unscrewed/loose, allowing vacuum to pull the nipple inward. Tighten both drain locking collars.",
          },
          {
            likelihood: "Common",
            issue: "Cannot pull a vacuum at all—air keeps entering as you inhale.",
            fix: "The ADV is firing because the Diluent cylinder is pressurized! Close the Diluent valve and bleed the line via the ADV/MAV before pulling your negative test, or don't inhale past the ADV trigger point.",
          },
          {
            likelihood: "Less Likely",
            issue: "Audible whistle or slow leak right at the mouthpiece.",
            fix: "The 3 internal barrel O-rings inside the DSV/BOV rotating drum are dry/worn, or the O-ring under the hose counterweight nut is nicked.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Head-to-bucket or T-piece connection leaks under vacuum.",
            fix: "Check that the white reverse-thread inhalation hose nut on the head is seated flat against the stainless steel ring and T-piece O-rings are lubricated.",
          },
        ],
      },
      {
        id: "step_6",
        stepNumber: 6,
        phase: "Loop Integrity",
        title: "Positive Pressure Hold Test",
        instruction: isBmcl
          ? "Ensure the DSV/BOV is closed. Press the shrouded green button on your Manual O2 Addition Block to bring the loop up to full pressure until the counterlung OPV vents. Hold for 60 seconds and verify pressure does not drop significantly."
          : "Ensure the DSV/BOV is closed and rotate the Exhalation Counterlung OPV fully clockwise. Depress the manual O2 button to bring the loop up to full pressure until the OPV vents. Hold for 60 seconds and verify pressure does not drop significantly.",
        subPoints: [
          "Bring the loop all the way up to full positive relief pressure until the OPV cracks/vents.",
          "Note: A slight initial pressure settle as the injected gas cools and the urethane bladders stretch is normal—confirm it stabilizes and does not continue dropping.",
          "Palpate the counterlungs after 60 seconds to verify they remain firm with no continuous leak.",
        ],
        referenceSpec:
          "Minimum Hold: 60 Seconds at Full OPV Relief Pressure",
        inputType: "timer_60",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "Counterlungs feel slightly softer after 15 seconds, so you aren't sure if it's a real leak or just gas cooling / bladder stretch.",
            fix: "Top the loop back up with a short push of the manual O2 button until the OPV vents again, then wait 60 seconds. If the OPV vents immediately on a tiny tap after 60s, the loop is 100% tight.",
          },
          {
            likelihood: "Common",
            issue: "Gas vents out of the OPV at very low pressure (FMCL).",
            fix: "You forgot to twist the FMCL OPV body fully clockwise to its maximum cracking pressure setting before filling the loop.",
          },
          {
            likelihood: "Less Likely",
            issue: "Bubbles or hissing around the mouthpiece barrel.",
            fix: "DSV/BOV shutoff lever is not pushed 100% into the closed position, or the DSV barrel O-rings need lubrication.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Counterlungs steadily go flat over 60 seconds.",
            fix: "Check the 2 red bucket O-rings, the counterlung-to-head hose O-rings, or submerge the sealed unit (with tanks mounted) to spot the bubble stream.",
          },
        ],
      },
      {
        id: "step_7",
        stepNumber: 7,
        phase: "Continuous O2 Flush & Calibration",
        title: "Crack DSV, Flow-Flush Until mV Stabilize & Calibrate",
        instruction:
          "Crack the DSV/BOV slightly open so running the Manual O2 Addition Valve does not build positive pressure in the loop. Hold the O2 addition button down to flow pure O2 through the loop until all 3 sensor mV readings climb, plateau, and stop flickering for several seconds—then close the DSV and calibrate.",
        subPoints: [
          "Cracking the DSV prevents loop over-pressurization and avoids artificial hyperbaric PPO2 spikes on the sensor membranes during the flush.",
          "Watch the raw Millivolts screen: once all 3 numbers stop climbing and hold rock-steady for several seconds, release the O2 button and shut the DSV/BOV.",
          "Calibrate Primary Handset: Press MENU twice to 'Calibrate', then press SELECT twice.",
          isNerd
            ? "Calibrate NERD 2: Enter the NERD 2 menu -> Calibrate, and confirm so both buses are calibrated."
            : "Calibrate LED HUD: Double-tap HUD wet contacts 3 times to Column 3 (Calibrate), then hold for 3 seconds until LEDs count up.",
        ],
        referenceSpec:
          "Valid 100% O2 Range: 40.6 – 67.0 mV | Must match Air mV × 4.76 (±5%)",
        inputType: "mv_o2",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "Actual O2 mV is significantly LOWER than your Air × 4.76 linearity target (e.g., 42 mV instead of 53 mV).",
            fix: "Incomplete O2 flush (nitrogen still trapped in the counterlungs/scrubber) OR the cell is current-limiting (aged cell unable to output full voltage at 100% O2). Flow more O2 with the DSV cracked; if mV refuses to climb to target, replace the current-limited cell!",
          },
          {
            likelihood: "Common",
            issue: "Calibration succeeds, but handset shows 0.96 instead of 0.98.",
            fix: "Normal barometric weather variance! When Altitude is set to 'Auto', Shearwater multiplies FO2 (0.98) by current barometric pressure (e.g., 990 mbar / 1013 mbar = 0.96).",
          },
          {
            likelihood: "Less Likely",
            issue: "Actual O2 mV is HIGHER than Air × 4.76 target.",
            fix: "You closed the DSV before releasing the manual O2 button, trapping positive pressure inside the loop (calibrating above 1.0 ata), OR your initial Air mV reading was taken with residual O2 in the head.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Handset displays 'FAIL' or HUD lights top & bottom red LEDs solid.",
            fix: "Sensor output fell outside the 30–70 mV hardware window (or you calibrated in air by mistake). Never dive if any sensor fails calibration.",
          },
        ],
      },
      {
        id: "step_8",
        stepNumber: 8,
        phase: "Load Test",
        title: "Solenoid Firing & Dynamic Battery Check",
        instruction:
          "Switch setpoint above 1.0 (e.g., 1.2 or 1.3) so the solenoid fires under load. Confirm O2 injection into the head plate, then return setpoint to .19 and check EXT V and INT V.",
        subPoints: [
          "Press SELECT 8 times from the main screen to view dynamic load voltages.",
          "Note: EXT V displays '?' until the solenoid has fired at least once under a valid calibration.",
        ],
        referenceSpec:
          "Minimum Dynamic Voltage: EXT V (Solenoid) ≥ 7.0V | INT V (Handset) ≥ 3.18V",
        inputType: "battery",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "EXT V shows a yellow '?' on the wrist display.",
            fix: "The solenoid has not fired yet since booting up. Bump setpoint to 1.3 so the solenoid clicks at least once—EXT V is only sampled dynamically under load while firing.",
          },
          {
            likelihood: "Common",
            issue: "Solenoid clicks audibly, but no O2 enters the loop (SPG doesn't drop when tank closed).",
            fix: "The 0.0020-inch inline sintered bronze flow restrictor inside the solenoid hose fitting at the O2 1st stage is clogged with debris/corrosion. Clean or service restrictor—never dive without it.",
          },
          {
            likelihood: "Less Likely",
            issue: "EXT V drops below 7.0V when firing.",
            fix: "Open the stainless steel battery cover on the head and replace BOTH 9V alkaline solenoid batteries with fresh name-brand Duracell/Energizer batteries (never use discount or NiMH rechargeable 9Vs).",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Setpoint is 1.3, calibration is valid, EXT V is good, but solenoid does not click at all.",
            fix: "Internal solenoid coil or SOLO board failure. Abort dive and send head to an authorized Hollis service facility.",
          },
        ],
      },
      {
        id: "step_9",
        stepNumber: 9,
        phase: "Pneumatics",
        title: "Diluent Leak Check (60s), ADV & BOV Test",
        instruction:
          "Pressurize the left-side Diluent cylinder, close the valve, and run the 60-second timer below to verify zero SPG drop. Reopen the Diluent valve completely and test the ADV, manual Dil add, BCD inflator, and BOV OC demand.",
        subPoints: [
          isBmcl
            ? "Test the unshrouded blue button on your Manual Diluent Addition Block and verify smooth flow."
            : "Test the Manual Diluent Addition button on your inhalation counterlung.",
          "Inhale loop down with nose blocked until the inhalation counterlung collapses and triggers the ADV.",
          "Watch Diluent SPG while breathing BOV in OC mode—needle must not dip (confirms tank valve is fully open).",
        ],
        referenceSpec:
          "Hold Timer: 60 Seconds Zero SPG Drop | Verify all valves reopened",
        inputType: "timer_60",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "Diluent SPG needle dips every time you inhale from the BOV or hit the ADV.",
            fix: "You forgot to reopen the left-hand Diluent tank valve after completing the 60-second leak check! Open the Diluent valve completely.",
          },
          {
            likelihood: "Common",
            issue: "Diluent SPG slowly drops during the 60-second leak check.",
            fix: "Check the BCD/wing LP inflator quick-disconnect, the manual diluent block QD fitting, or the threaded ADV swivel nut on the inhalation T-piece.",
          },
          {
            likelihood: "Less Likely",
            issue: "BCD inflator button sticks or auto-inflates slowly.",
            fix: "Salt crystals have dried inside the inflator Schrader stem. Soak and flush the inflator mechanism in warm fresh water before diving.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "ADV requires extreme inhalation effort to trigger or free-flows.",
            fix: "Inspect the ADV diaphragm/tilt-valve plunger in the inhalation counterlung/T-piece for sand or an unseated rubber gasket.",
          },
        ],
      },
      {
        id: "step_10",
        stepNumber: 10,
        phase: "Final Verification",
        title: "5-Minute Seated Pre-Breath",
        instruction:
          "Switch handset from .19 to Low Setpoint (e.g., 0.7). Block your nose (put mask on or pinch nostrils) and breathe the loop for a full 5 minutes while seated in a safe location.",
        subPoints: [
          "As metabolic consumption drops PPO2 below 0.7, listen for the solenoid clicking.",
          isNerd
            ? "Verify PPO2 climbs smoothly back to 0.7 over 3–4 breaths on both the wrist handset and NERD 2."
            : "Verify PPO2 climbs smoothly back to 0.7 over 3–4 breaths on both the wrist handset and LED HUD (3 yellow blinks).",
        ],
        referenceSpec:
          "Mandatory Duration: 5:00 Minutes | Nose Blocked & Seated",
        inputType: "timer_300",
        criticalWarning:
          "A 5-minute pre-breath tests solenoid PID control, NOT guaranteed scrubber duration.",
        troubleshooting: [
          {
            likelihood: "Most Likely",
            issue: "Loop PPO2 slowly drops below 0.50 during pre-breath without recovering.",
            fix: "Either your handset is still set to the .19 bench setpoint, OR your right-hand O2 cylinder valve was left closed! Verify SP = 0.7 and O2 tank is open.",
          },
          {
            likelihood: "Common",
            issue: "You feel high breathing resistance or cannot exhale/inhale around the loop.",
            fix: "If the exhalation lung balloons or locks up, the scrubber basket was installed upside down (flat lid sealing against the red CO2 seal). Open bucket and flip basket.",
          },
          {
            likelihood: "Less Likely",
            issue: "PPO2 swings wildly (e.g., jumping from 0.5 to 1.4) when the solenoid fires.",
            fix: "Moisture on the O2 sensor faces or corroded sensor harness pins causing erratic PID feedback. Stop pre-breath, inspect/dry sensors, and recalibrate.",
          },
          {
            likelihood: "Rare / Critical",
            issue: "Onset of air hunger, rapid breathing, flushing, or headache during pre-breath.",
            fix: "CO2 bypass! Either the red CO2 seal was omitted, a mushroom valve in the DSV/BOV is missing/inverted, or you forgot to block your nose. Come off the loop immediately.",
          },
        ],
      },
    ];
  }, [secondaryDisplay, counterlungType]);

  const currentStep = steps[currentStepIdx];
  const isCurrentStepConfirmed = !!stepConfirmed[currentStep.id];

  // Check if any O2 cell in Step 7 is out of linearity (±5% from Air mV * 4.76) or out of absolute range (40.6 - 67.0 mV)
  const o2Diagnostics = useMemo(() => {
    const issues: string[] = [];
    (["c1", "c2", "c3"] as const).forEach((cell, idx) => {
      const airVal = parseFloat(airMv[cell]) || 0;
      const o2Val = parseFloat(o2Mv[cell]) || 0;
      const expected = airVal * 4.76;
      const pctDiff = expected > 0 ? ((o2Val - expected) / expected) * 100 : 0;

      if (o2Val < 40.6) {
        issues.push(
          `Cell #${idx + 1} (${o2Val} mV) is below the 40.6 mV factory minimum. Likely causes: Incomplete O2 loop flush, exhausted/current-limiting sensor, or moisture droplet blocking the Teflon face.`
        );
      } else if (o2Val > 67.0) {
        issues.push(
          `Cell #${idx + 1} (${o2Val} mV) exceeds the 67.0 mV maximum. Likely causes: Positive pressure trapped in the loop (DSV closed before releasing O2 button), or out-of-spec cell.`
        );
      } else if (pctDiff < -5) {
        issues.push(
          `Cell #${idx + 1} (${o2Val} mV) is ${Math.abs(pctDiff).toFixed(
            1
          )}% BELOW its ${expected.toFixed(
            1
          )} mV linearity target. This means either the loop isn't fully flushed with 100% O2 yet, OR Cell #${
            idx + 1
          } is current-limiting (aging anode unable to produce full voltage at high PO2).`
        );
      } else if (pctDiff > 5) {
        issues.push(
          `Cell #${idx + 1} (${o2Val} mV) is ${pctDiff.toFixed(
            1
          )}% ABOVE its ${expected.toFixed(
            1
          )} mV linearity target. Likely causes: Loop is slightly over-pressurized (crack DSV to equalize to 1.0 ata), or the initial Air mV reading was taken unevenly.`
        );
      }
    });
    return issues;
  }, [airMv, o2Mv]);

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* RIG HARDWARE CONFIGURATION & WAKE LOCK BAR */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>RIG:</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
              wakeLockActive
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Prevents phone screen from timing out during run-up and 5-minute pre-breath"
          >
            <Smartphone className="w-3 h-3" />
            {wakeLockActive ? "SCREEN AWAKE LOCKED" : "WAKE LOCK STANDBY"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* HUD vs NERD 2 Toggle */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
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

          {/* BMCL vs FMCL Toggle */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
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

      {/* STEP CONTENT BODY */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="text-emerald-400 font-bold uppercase">
            {currentStep.phase}
          </span>
          <span>
            STEP {currentStep.stepNumber} OF {steps.length}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h2 className="text-xl font-bold text-white leading-tight mb-2.5">
          {currentStep.title}
        </h2>
        <p className="text-sm text-slate-200 leading-relaxed mb-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          {currentStep.instruction}
        </p>

        {currentStep.criticalWarning && (
          <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-500/50 rounded-xl p-3 mb-3.5 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{currentStep.criticalWarning}</span>
          </div>
        )}

        <ul className="space-y-2 mb-4">
          {currentStep.subPoints.map((pt, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="text-emerald-400 font-bold">•</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>

        {currentStep.referenceSpec && (
          <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3 mb-3.5">
            <span className="text-[10px] font-mono uppercase text-cyan-400 block mb-0.5">
              REQUIRED TARGET / SPEC
            </span>
            <p className="text-xs font-mono text-slate-100">
              {currentStep.referenceSpec}
            </p>
          </div>
        )}

        {/* AIR MILLIVOLT INPUTS */}
        {currentStep.inputType === "mv_air" && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-3.5">
            <span className="text-xs font-mono text-emerald-400 block mb-2">
              ENTER AIR MILLIVOLTS (8.5 – 14.0 mV):
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["c1", "c2", "c3"] as const).map((cell, idx) => {
                const val = parseFloat(airMv[cell]) || 0;
                const inSpec = val >= 8.5 && val <= 14.0;
                return (
                  <div key={cell} className="flex flex-col">
                    <label className="text-[10px] font-mono text-slate-400 mb-1">
                      CELL #{idx + 1}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={airMv[cell]}
                      onChange={(e) =>
                        setAirMv({ ...airMv, [cell]: e.target.value })
                      }
                      className={`bg-slate-900 border-2 rounded-lg p-2 text-center font-mono text-sm font-bold ${
                        inSpec
                          ? "border-emerald-500/50 text-emerald-300"
                          : "border-red-500 bg-red-950/40 text-red-300"
                      }`}
                    />
                    <span className="text-[10px] font-mono text-slate-400 mt-1 text-center">
                      100% O2 Target: {(val * 4.76).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STABILIZED O2 MILLIVOLT INPUTS WITH RED LINEARITY DIAGNOSTIC */}
        {currentStep.inputType === "mv_o2" && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-3.5 space-y-3">
            <span className="text-xs font-mono text-emerald-400 block">
              ENTER STABILIZED 100% O2 mV (40.6 – 67.0 mV & ±5% Linearity):
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["c1", "c2", "c3"] as const).map((cell, idx) => {
                const val = parseFloat(o2Mv[cell]) || 0;
                const expected = (parseFloat(airMv[cell]) || 11) * 4.76;
                const minLinear = expected * 0.95;
                const maxLinear = expected * 1.05;
                const inRange = val >= 40.6 && val <= 67.0;
                const isLinear = val >= minLinear && val <= maxLinear;
                const isHealthy = inRange && isLinear;

                return (
                  <div key={cell} className="flex flex-col">
                    <label className="text-[10px] font-mono text-slate-400 mb-1">
                      CELL #{idx + 1}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={o2Mv[cell]}
                      onChange={(e) =>
                        setO2Mv({ ...o2Mv, [cell]: e.target.value })
                      }
                      className={`bg-slate-900 border-2 rounded-lg p-2 text-center font-mono text-sm font-bold transition-all ${
                        isHealthy
                          ? "border-emerald-500/50 text-emerald-300"
                          : "border-red-500 bg-red-950/50 text-red-300 animate-pulse"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-mono mt-1 text-center ${
                        isHealthy ? "text-slate-400" : "text-red-400 font-bold"
                      }`}
                    >
                      Target: {expected.toFixed(1)} (±2.5)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Red Diagnostic Warning Box if out of linearity or spec */}
            {o2Diagnostics.length > 0 && (
              <div className="bg-red-950/80 border border-red-500 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-300 uppercase font-mono">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Linearity / Calibration Threshold Alert</span>
                </div>
                {o2Diagnostics.map((diag, i) => (
                  <p key={i} className="text-[11px] text-red-100 leading-relaxed">
                    • {diag}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BATTERY VOLTAGE INPUTS */}
        {currentStep.inputType === "battery" && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-3.5 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                EXT V (SOLENOID ≥ 7.0V)
              </label>
              <input
                type="number"
                step="0.1"
                value={batVolts.ext}
                onChange={(e) =>
                  setBatVolts({ ...batVolts, ext: e.target.value })
                }
                className={`w-full bg-slate-900 border-2 rounded-lg p-2 text-center font-mono text-base font-bold ${
                  parseFloat(batVolts.ext) >= 7.0
                    ? "border-emerald-500/50 text-emerald-300"
                    : "border-red-500 bg-red-950/40 text-red-400"
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                INT V (HANDSET ≥ 3.18V)
              </label>
              <input
                type="number"
                step="0.01"
                value={batVolts.int}
                onChange={(e) =>
                  setBatVolts({ ...batVolts, int: e.target.value })
                }
                className={`w-full bg-slate-900 border-2 rounded-lg p-2 text-center font-mono text-base font-bold ${
                  parseFloat(batVolts.int) >= 3.18
                    ? "border-emerald-500/50 text-emerald-300"
                    : "border-red-500 bg-red-950/40 text-red-400"
                }`}
              />
            </div>
          </div>
        )}

        {/* HOLD & PRE-BREATH TIMERS (Included on Steps 4, 5, 6, 9, and 10) */}
        {(currentStep.inputType === "timer_60" ||
          currentStep.inputType === "timer_300") && (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Timer className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">
                  HOLD TIMER
                </span>
                <span className="text-xl font-mono font-bold text-white">
                  {timerSeconds !== null
                    ? `${Math.floor(timerSeconds / 60)}:${String(
                        timerSeconds % 60
                      ).padStart(2, "0")}`
                    : currentStep.inputType === "timer_60"
                    ? "1:00"
                    : "5:00"}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setTimerSeconds(currentStep.inputType === "timer_60" ? 60 : 300);
                setTimerRunning(true);
              }}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
            >
              {timerRunning ? "Restart Timer" : "Start Timer"}
            </button>
          </div>
        )}

        {/* COLLAPSIBLE TROUBLESHOOTING GUIDE (MOST LIKELY -> LEAST LIKELY) */}
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTrouble(!showTrouble)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-mono font-bold text-amber-400 hover:bg-slate-900/60 transition-all"
          >
            <span className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              TROUBLESHOOTING THIS STEP (MOST TO LEAST LIKELY)
            </span>
            {showTrouble ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showTrouble && (
            <div className="p-3.5 pt-1 space-y-2.5 border-t border-slate-800/80">
              {currentStep.troubleshooting.map((t, idx) => {
                const badgeColor =
                  t.likelihood === "Most Likely"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : t.likelihood === "Common"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : t.likelihood === "Less Likely"
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : "bg-red-500/20 text-red-300 border-red-500/40";

                return (
                  <div
                    key={idx}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}
                      >
                        {idx + 1}. {t.likelihood.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 pt-0.5">
                      Symptom: {t.issue}
                    </p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      <strong className="text-emerald-400">Action:</strong>{" "}
                      {t.fix}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER CONFIRMATION & NAVIGATION */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <button
          onClick={() => {
            setStepConfirmed({ ...stepConfirmed, [currentStep.id]: true });
            setTimerRunning(false);
            setTimerSeconds(null);
            setShowTrouble(false);
            if (currentStepIdx < steps.length - 1) {
              setCurrentStepIdx(currentStepIdx + 1);
            } else if (onComplete) {
              onComplete();
            }
          }}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            isCurrentStepConfirmed
              ? "bg-emerald-600 text-white"
              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          {currentStepIdx === steps.length - 1
            ? "CONFIRM & COMPLETE PRE-BREATH (RETURN HOME)"
            : "CONFIRM READINGS & NEXT STEP"}
        </button>

        <div className="flex items-center justify-between gap-2">
          <button
            disabled={currentStepIdx === 0}
            onClick={() => {
              setTimerRunning(false);
              setTimerSeconds(null);
              setShowTrouble(false);
              setCurrentStepIdx(Math.max(0, currentStepIdx - 1));
            }}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Card
          </button>
          <button
            onClick={() => {
              setStepConfirmed({});
              setCurrentStepIdx(0);
              setTimerRunning(false);
              setTimerSeconds(null);
              setShowTrouble(false);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Run-Up
          </button>
        </div>
      </div>
    </div>
  );
}