// lib/decoEngine.ts

export interface GasMix {
  id: string;
  name: string;
  o2: number; // %
  he: number; // %
  n2: number; // %
  switchDepthFt: number; // Depth at which we switch to this diluent/bailout on ascent
  tankSizeCuFt: number;
  workingPsi: number;
  isUsedAsDiluentOnAscent: boolean; // Allows offboard bailout to be plumbed into loop on ascent
}

export interface PlannerSettings {
  lastStopDepthFt: 10 | 15 | 20;
  descentRateFtMin: number; // Default 60 ft/min
  ascentRateFtMin: number; // Default 30 ft/min
  ocProblemTimeMin: number; // Default 3 min at bottom before OC ascent
  o2Narcotic: boolean; // Default true (treats O2 as narcotic in END)
  targetEndFt: number; // Default 100 ft for auto-diluent & bailout engine
}

export interface DiveProfileRow {
  id: string;
  phase: "DESCENT" | "BOTTOM" | "PROBLEM" | "SWITCH" | "STOP" | "SURFACE";
  depthFt: number;
  depthLabel: string;
  timeMin: number;
  runTimeMin: number;
  activeGasName: string;
  switchedGasHere?: boolean;
  activeSp: number;
  switchedSpHere?: boolean;
  loopFO2: string;
  loopFHe: string;
  cns: number;
  otu: number;
}

export interface DepthMilestone {
  depthFt: number;
  stopTimeMin: number; // 0 if passing through without stopping
  arrivalRunTimeMin: number;
  departRunTimeMin: number;
  activeGasName: string;
  switchedGasHere: boolean;
  activeSp: number;
  switchedSpHere: boolean;
  loopFO2: string;
  loopFHe: string;
  cns: number;
  otu: number;
}

export interface RecommendedTank {
  role: string;
  name: string;
  o2: number;
  he: number;
  n2: number;
  maxPo2Limit: number;
  ocSwitchDepthFt: number;
  ccrSwitchDepthFt: number;
  recommendPlumbIn: boolean;
  tankLabel: string;
  tankSizeCuFt: number;
  workingPsi: number;
  estUsedCuFt: number;
  estReqPsi: number;
  rationale: string;
}

// Official Bühlmann ZHL-16C 16-Compartment Constants (N2 and He)
const ZHL16C_N2_HALFTIMES = [
  4.0, 8.0, 12.5, 18.5, 27.0, 38.3, 54.3, 77.0,
  109.0, 146.0, 187.0, 239.0, 305.0, 390.0, 498.0, 635.0,
];
const ZHL16C_N2_A = [
  1.2599, 1.0000, 0.8618, 1.7562 - 1.0, 0.6200, 0.5043, 0.4410, 0.4000,
  0.3750, 0.3500, 0.3295, 0.3065, 0.2835, 0.2610, 0.2480, 0.2327,
];
const ZHL16C_N2_B = [
  0.5050, 0.6514, 0.7222, 0.7825, 0.8126, 0.8434, 0.8693, 0.8910,
  0.9092, 0.9222, 0.9319, 0.9403, 0.9477, 0.9544, 0.9602, 0.9653,
];

const ZHL16C_HE_HALFTIMES = [
  1.51, 3.02, 4.72, 6.99, 10.21, 14.48, 20.53, 29.11,
  41.20, 55.19, 70.69, 90.34, 115.29, 147.42, 188.24, 240.03,
];
const ZHL16C_HE_A = [
  1.7424, 1.3830, 1.1919, 1.0458, 0.9220, 0.8205, 0.7305, 0.6502,
  0.5950, 0.5545, 0.5333, 0.5189, 0.5181, 0.5176, 0.5172, 0.5119,
];
const ZHL16C_HE_B = [
  0.4245, 0.5747, 0.6527, 0.7223, 0.7582, 0.7957, 0.8279, 0.8553,
  0.8757, 0.8903, 0.8997, 0.9073, 0.9122, 0.9171, 0.9217, 0.9267,
];

const WATER_VAPOR_BAR = 0.0627;

export function depthFtToBar(depthFt: number): number {
  return depthFt / 33 + 1.0;
}

// Calculate MOD in feet rounded to clean 10ft stop increments (+0.5ft seawater tolerance so 100% O2 @ 1.6 = 20ft)
export function calcModFt(o2Pct: number, maxPo2: number): number {
  const fo2 = Math.max(0.05, o2Pct / 100);
  const rawFt = (maxPo2 / fo2 - 1) * 33;
  return Math.max(10, Math.floor((rawFt + 0.5) / 10) * 10);
}

// Auto-calculate optimal CCR Onboard Diluent for a given Depth (ft) & Bottom Setpoint (ata)
export function calculateOptimalDiluent(
  depthFt: number,
  setpoint: number,
  settings?: Partial<PlannerSettings>
): { o2: number; he: number; n2: number } {
  const cleanDepth = Math.max(10, depthFt);
  const cleanSp = Math.max(0.5, setpoint);
  const targetEndFt = settings?.targetEndFt ?? 100;
  const o2Narcotic = settings?.o2Narcotic ?? true;

  const ambBar = depthFtToBar(cleanDepth);

  // Target Flush PO2 <= min(1.15, SP - 0.15) so a diluent flush drops loop PO2 safely below setpoint
  const targetFlushPo2 = Math.min(1.15, Math.max(0.75, cleanSp - 0.15));
  const rawO2Pct = Math.floor((targetFlushPo2 / ambBar) * 100);

  // Cap standard CCR onboard diluent at 21% (Air/Heliair/Trimix) down to 8% for extreme hypoxic
  const o2 = Math.min(21, Math.max(8, rawO2Pct));
  const fO2 = o2 / 100;

  let he = 0;
  if (cleanDepth > targetEndFt) {
    const endRatio = (targetEndFt + 33) / (cleanDepth + 33);
    // 1. Helium needed for Diluent/BOV END <= targetEndFt
    const reqFHeDil = o2Narcotic
      ? 1 - endRatio
      : 1 - fO2 - 0.79 * endRatio;

    // 2. Helium needed for CCR Loop END at Setpoint <= targetEndFt
    const actualLoopPO2 = Math.min(ambBar, cleanSp);
    const loopFO2 = actualLoopPO2 / ambBar;
    const reqFHeLoop = o2Narcotic
      ? ((1 - fO2) * (1 - endRatio)) / Math.max(0.1, 1 - loopFO2)
      : (1 - fO2) * (1 - (0.79 * endRatio) / Math.max(0.1, 1 - loopFO2));

    const maxReqPct = Math.max(0, reqFHeDil * 100, reqFHeLoop * 100);
    he = Math.min(100 - o2, Math.ceil(maxReqPct / 5) * 5);
  }

  // 3. Ensure Loop Gas Density stays <= 5.2 g/L on deep dives
  while (he + 5 <= 100 - o2) {
    const actualLoopPO2 = Math.min(ambBar, cleanSp);
    const loopFO2 = actualLoopPO2 / ambBar;
    const fHe = he / 100;
    const fN2 = Math.max(0, 1 - fO2 - fHe);
    const inertSum = fHe + fN2;
    const loopFHe = inertSum > 0 ? (1 - loopFO2) * (fHe / inertSum) : 0;
    const loopFN2 = Math.max(0, 1 - loopFO2 - loopFHe);
    const density = (loopFHe * 0.18 + loopFN2 * 1.25 + loopFO2 * 1.43) * ambBar;
    if (density <= 5.2) break;
    he += 5;
  }

  return {
    o2,
    he,
    n2: Math.max(0, 100 - o2 - he),
  };
}

// NOAA CNS% per minute lookup based on actual PO2 (ata)
function getCnsPerMinute(po2: number): number {
  if (po2 <= 0.5) return 0;
  if (po2 <= 0.6) return 100 / 720;
  if (po2 <= 0.7) return 100 / 570;
  if (po2 <= 0.8) return 100 / 450;
  if (po2 <= 0.9) return 100 / 360;
  if (po2 <= 1.0) return 100 / 300;
  if (po2 <= 1.1) return 100 / 240;
  if (po2 <= 1.2) return 100 / 210;
  if (po2 <= 1.3) return 100 / 180;
  if (po2 <= 1.4) return 100 / 150;
  if (po2 <= 1.5) return 100 / 120;
  if (po2 <= 1.6) return 100 / 45;
  return 100 / 15;
}

// CCR Loop Physics & Safety Limits (Max Flush PO2 = 1.2, Max END = 130ft)
export function evaluateDiluentAtDepth(
  depthFt: number,
  dilO2: number,
  dilHe: number,
  setpoint: number,
  o2Narcotic: boolean = true
) {
  const ambBar = depthFtToBar(depthFt);
  const fO2 = Math.max(0.01, dilO2 / 100);
  const fHe = Math.max(0, dilHe / 100);
  const fN2 = Math.max(0, 1 - fO2 - fHe);

  const flushPO2 = fO2 * ambBar;
  const isFlushPO2Unsafe = flushPO2 > 1.2 || flushPO2 < 0.16;
  const maxFlushDepthFt = Math.floor((1.2 / fO2 - 1) * 33);

  const idealMaxDilO2Pct = Math.max(
    8,
    Math.min(21, Math.floor((Math.min(1.15, Math.max(0.75, setpoint - 0.15)) / ambBar) * 100))
  );

  const actualLoopPO2 = Math.min(ambBar, setpoint);
  const loopFO2 = actualLoopPO2 / ambBar;
  const inertRatioHe = fHe + fN2 > 0 ? fHe / (fHe + fN2) : 0;
  const loopFHe = (1 - loopFO2) * inertRatioHe;
  const loopFN2 = 1 - loopFO2 - loopFHe;

  const narcoticFraction = o2Narcotic ? 1 - loopFHe : loopFN2 / 0.79;
  const loopENDFt = Math.max(
    0,
    Math.round(narcoticFraction * (depthFt + 33) - 33)
  );
  const isENDUnsafe = loopENDFt > 130;

  const gasDensityGL =
    (loopFHe * 0.18 + loopFN2 * 1.25 + loopFO2 * 1.43) * ambBar;
  const eqAirDensityFt = Math.max(
    0,
    Math.round((gasDensityGL / 1.29 - 1) * 33)
  );

  return {
    ambBar,
    flushPO2: Number(flushPO2.toFixed(2)),
    isFlushPO2Unsafe,
    maxFlushDepthFt,
    idealMaxDilO2Pct,
    loopFO2: Math.round(loopFO2 * 100),
    loopFHe: Math.round(loopFHe * 100),
    loopENDFt,
    isENDUnsafe,
    gasDensityGL: Number(gasDensityGL.toFixed(2)),
    eqAirDensityFt,
  };
}

// Calculate Inspired N2 & He partial pressures in CCR vs OC mode
function getInspiredInertPressures(
  depthFt: number,
  o2Pct: number,
  hePct: number,
  mode: "CCR" | "OC",
  setpoint: number
) {
  const ambBar = depthFtToBar(depthFt);
  const fO2 = o2Pct / 100;
  const fHe = hePct / 100;
  const fN2 = Math.max(0, 1 - fO2 - fHe);

  if (mode === "OC") {
    const pInert = Math.max(0, ambBar - WATER_VAPOR_BAR);
    return {
      pN2: pInert * fN2,
      pHe: pInert * fHe,
      actualPO2: Number((ambBar * fO2).toFixed(2)),
      loopFO2Pct: Math.round(fO2 * 100),
      loopFHePct: Math.round(fHe * 100),
    };
  } else {
    const actualPO2 = Math.min(ambBar, setpoint);
    const pInertTotal = Math.max(0, ambBar - actualPO2 - WATER_VAPOR_BAR);
    const dilInertSum = fHe + fN2;
    const heRatio = dilInertSum > 0 ? fHe / dilInertSum : 0;
    const n2Ratio = dilInertSum > 0 ? fN2 / dilInertSum : 0;
    const loopFO2 = actualPO2 / ambBar;
    const loopFHe = (1 - loopFO2) * heRatio;
    return {
      pN2: pInertTotal * n2Ratio,
      pHe: pInertTotal * heRatio,
      actualPO2: Number(actualPO2.toFixed(2)),
      loopFO2Pct: Math.round(loopFO2 * 100),
      loopFHePct: Math.round(loopFHe * 100),
    };
  }
}

// Haldane tissue loading step for time tMin at constant depth
function loadTissuesConstant(
  pN2Arr: number[],
  pHeArr: number[],
  inspiredN2: number,
  inspiredHe: number,
  tMin: number
) {
  const nextN2 = [...pN2Arr];
  const nextHe = [...pHeArr];
  for (let i = 0; i < 16; i++) {
    const kN2 = Math.LN2 / ZHL16C_N2_HALFTIMES[i];
    const kHe = Math.LN2 / ZHL16C_HE_HALFTIMES[i];
    nextN2[i] =
      nextN2[i] + (inspiredN2 - nextN2[i]) * (1 - Math.exp(-kN2 * tMin));
    nextHe[i] =
      nextHe[i] + (inspiredHe - nextHe[i]) * (1 - Math.exp(-kHe * tMin));
  }
  return { nextN2, nextHe };
}

// Compute Ceiling in Bar for a given Gradient Factor (0.0 to 1.0)
function getCeilingBar(pN2Arr: number[], pHeArr: number[], gf: number): number {
  let maxCeilingBar = 0;
  for (let i = 0; i < 16; i++) {
    const pTotal = pN2Arr[i] + pHeArr[i];
    if (pTotal <= 0) continue;
    const a =
      (ZHL16C_N2_A[i] * pN2Arr[i] + ZHL16C_HE_A[i] * pHeArr[i]) / pTotal;
    const b =
      (ZHL16C_N2_B[i] * pN2Arr[i] + ZHL16C_HE_B[i] * pHeArr[i]) / pTotal;
    const ceiling = (pTotal - a * gf) / (gf / b - gf + 1.0);
    if (ceiling > maxCeilingBar) maxCeilingBar = ceiling;
  }
  return Math.max(1.0, maxCeilingBar);
}

// Pick best active Diluent (CCR) or Offboard Bailout Gas (OC) at current depth
export function selectActiveGasForDepth(
  depthFt: number,
  bottomDil: { o2: number; he: number },
  ascentGases: GasMix[],
  mode: "CCR" | "OC"
) {
  if (mode === "CCR") {
    const ccrCandidates = ascentGases
      .filter((g) => g.isUsedAsDiluentOnAscent && depthFt <= g.switchDepthFt)
      .sort((a, b) => a.switchDepthFt - b.switchDepthFt || b.o2 - a.o2);

    if (ccrCandidates.length > 0) {
      const chosen = ccrCandidates[0];
      return { name: chosen.name, o2: chosen.o2, he: chosen.he, id: chosen.id };
    }
    return {
      name: `Dil ${bottomDil.o2}/${bottomDil.he}`,
      o2: bottomDil.o2,
      he: bottomDil.he,
      id: "bottom_dil",
    };
  } else {
    const ambBar = depthFtToBar(depthFt);
    const validOcTanks = ascentGases
      .filter((g) => depthFt <= g.switchDepthFt && (g.o2 / 100) * ambBar >= 0.16)
      .sort((a, b) => a.switchDepthFt - b.switchDepthFt || b.o2 - a.o2);

    if (validOcTanks.length > 0) {
      const chosen = validOcTanks[0];
      return { name: chosen.name, o2: chosen.o2, he: chosen.he, id: chosen.id };
    }

    if (ascentGases.length > 0) {
      const deepestTank = [...ascentGases].sort(
        (a, b) => b.switchDepthFt - a.switchDepthFt || a.o2 - b.o2
      )[0];
      return {
        name: deepestTank.name,
        o2: deepestTank.o2,
        he: deepestTank.he,
        id: deepestTank.id,
      };
    }

    return {
      name: `Dil ${bottomDil.o2}/${bottomDil.he}`,
      o2: bottomDil.o2,
      he: bottomDil.he,
      id: "bottom_dil",
    };
  }
}

// ZHL-16C + Gradient Factors Simulation with Full Switch & Stop Milestone Tracking
export function runDecoSimulation(params: {
  bottomDepthFt: number;
  bottomTimeMin: number;
  setpoint: number;
  decoSetpoint?: number;
  decoSpSwitchDepthFt?: number;
  gfLowPct: number;
  gfHighPct: number;
  bottomDil: { o2: number; he: number };
  ascentGases: GasMix[];
  mode: "CCR" | "OC";
  workingSacCuFtMin: number;
  decoSacCuFtMin: number;
  settings?: Partial<PlannerSettings>;
}) {
  const gfLow = params.gfLowPct / 100;
  const gfHigh = params.gfHighPct / 100;
  const decoSp = params.decoSetpoint ?? params.setpoint;
  const decoSpSwitchFt = params.decoSpSwitchDepthFt ?? 0;

  const descentRate = Math.max(10, params.settings?.descentRateFtMin ?? 60);
  const ascentRate = Math.max(5, params.settings?.ascentRateFtMin ?? 30);
  const lastStopDepthFt = params.settings?.lastStopDepthFt ?? 10;
  const ocProblemTimeMin = Math.max(0, params.settings?.ocProblemTimeMin ?? 3);

  let pN2: number[] = new Array(16).fill(0.79 * (1.0 - WATER_VAPOR_BAR));
  let pHe: number[] = new Array(16).fill(0.0);

  let runTime = 0;
  let cns = 0;
  let otu = 0;

  const profileRows: DiveProfileRow[] = [];
  const stops: DiveProfileRow[] = [];
  const milestones: Record<number, DepthMilestone> = {};
  const gasUsageCuFt: Record<string, number> = {};

  // 1. DESCENT PHASE (On CCR Loop from 0 -> Bottom)
  const descentTime = Math.max(
    1,
    Math.round((params.bottomDepthFt / descentRate) * 10) / 10
  );
  const midDescentInsp = getInspiredInertPressures(
    params.bottomDepthFt / 2,
    params.bottomDil.o2,
    params.bottomDil.he,
    "CCR",
    params.setpoint
  );
  const afterDescent = loadTissuesConstant(
    pN2,
    pHe,
    midDescentInsp.pN2,
    midDescentInsp.pHe,
    descentTime
  );
  pN2 = afterDescent.nextN2;
  pHe = afterDescent.nextHe;
  runTime += descentTime;
  cns += descentTime * getCnsPerMinute(midDescentInsp.actualPO2);
  otu +=
    descentTime *
    Math.pow(Math.max(0, (midDescentInsp.actualPO2 - 0.5) / 0.5), 0.83);

  const onBoardDilName = `Dil ${params.bottomDil.o2}/${params.bottomDil.he}`;

  profileRows.push({
    id: "row_descent",
    phase: "DESCENT",
    depthFt: params.bottomDepthFt,
    depthLabel: `0 → ${params.bottomDepthFt} ft (Desc)`,
    timeMin: Number(descentTime.toFixed(1)),
    runTimeMin: Number(runTime.toFixed(1)),
    activeGasName: onBoardDilName,
    activeSp: midDescentInsp.actualPO2,
    loopFO2: `${midDescentInsp.loopFO2Pct}%`,
    loopFHe: `${midDescentInsp.loopFHePct}%`,
    cns: Math.round(cns),
    otu: Math.round(otu),
  });

  // 2. BOTTOM PHASE (On CCR Loop until end of Bottom Time)
  const botRemainTime = Math.max(0.5, params.bottomTimeMin - descentTime);
  const botInsp = getInspiredInertPressures(
    params.bottomDepthFt,
    params.bottomDil.o2,
    params.bottomDil.he,
    "CCR",
    params.setpoint
  );
  const afterBottom = loadTissuesConstant(
    pN2,
    pHe,
    botInsp.pN2,
    botInsp.pHe,
    botRemainTime
  );
  pN2 = afterBottom.nextN2;
  pHe = afterBottom.nextHe;
  runTime += botRemainTime;
  cns += botRemainTime * getCnsPerMinute(botInsp.actualPO2);
  otu +=
    botRemainTime *
    Math.pow(Math.max(0, (botInsp.actualPO2 - 0.5) / 0.5), 0.83);

  profileRows.push({
    id: "row_bottom",
    phase: "BOTTOM",
    depthFt: params.bottomDepthFt,
    depthLabel: `${params.bottomDepthFt} ft (Bottom)`,
    timeMin: Number(botRemainTime.toFixed(1)),
    runTimeMin: Math.round(runTime),
    activeGasName: onBoardDilName,
    activeSp: botInsp.actualPO2,
    loopFO2: `${botInsp.loopFO2Pct}%`,
    loopFHe: `${botInsp.loopFHePct}%`,
    cns: Math.round(cns),
    otu: Math.round(otu),
  });

  let trackingGasName = onBoardDilName;
  let trackingSp = params.setpoint;

  // 3. OC BAILOUT PROBLEM-SOLVING AT BOTTOM (OC Mode Only)
  if (params.mode === "OC") {
    const deepBoGas = selectActiveGasForDepth(
      params.bottomDepthFt,
      params.bottomDil,
      params.ascentGases,
      "OC"
    );
    trackingGasName = deepBoGas.name;

    if (ocProblemTimeMin > 0) {
      const probInsp = getInspiredInertPressures(
        params.bottomDepthFt,
        deepBoGas.o2,
        deepBoGas.he,
        "OC",
        params.setpoint
      );
      const afterProb = loadTissuesConstant(
        pN2,
        pHe,
        probInsp.pN2,
        probInsp.pHe,
        ocProblemTimeMin
      );
      pN2 = afterProb.nextN2;
      pHe = afterProb.nextHe;
      runTime += ocProblemTimeMin;
      cns += ocProblemTimeMin * getCnsPerMinute(probInsp.actualPO2);
      otu +=
        ocProblemTimeMin *
        Math.pow(Math.max(0, (probInsp.actualPO2 - 0.5) / 0.5), 0.83);

      const probCuFt =
        ocProblemTimeMin *
        params.workingSacCuFtMin *
        depthFtToBar(params.bottomDepthFt);
      gasUsageCuFt[deepBoGas.name] =
        (gasUsageCuFt[deepBoGas.name] || 0) + probCuFt;

      profileRows.push({
        id: "row_oc_problem",
        phase: "PROBLEM",
        depthFt: params.bottomDepthFt,
        depthLabel: `${params.bottomDepthFt} ft (BO Solve)`,
        timeMin: ocProblemTimeMin,
        runTimeMin: Math.round(runTime),
        activeGasName: deepBoGas.name,
        switchedGasHere: true,
        activeSp: probInsp.actualPO2,
        loopFO2: `${probInsp.loopFO2Pct}%`,
        loopFHe: `${probInsp.loopFHePct}%`,
        cns: Math.round(cns),
        otu: Math.round(otu),
      });
    }
  }

  // 4. BUILD COMPLETE ASCENT CANDIDATE DEPTH GRID (10ft Stops + Last Stop + Any Custom Switch Depths)
  const stopGridSet = new Set<number>();
  for (
    let d = Math.floor((params.bottomDepthFt - 1) / 10) * 10;
    d >= 20;
    d -= 10
  ) {
    if (d >= lastStopDepthFt) stopGridSet.add(d);
  }
  if (lastStopDepthFt < params.bottomDepthFt) {
    stopGridSet.add(lastStopDepthFt);
  }

  const allDepthSet = new Set<number>(stopGridSet);
  // Include any custom CCR or OC switch depths strictly below bottomDepthFt
  params.ascentGases.forEach((g) => {
    if (g.switchDepthFt > 0 && g.switchDepthFt < params.bottomDepthFt) {
      if (params.mode === "CCR" && g.isUsedAsDiluentOnAscent) {
        allDepthSet.add(g.switchDepthFt);
      } else if (params.mode === "OC") {
        allDepthSet.add(g.switchDepthFt);
      }
    }
  });
  if (
    params.mode === "CCR" &&
    decoSpSwitchFt > 0 &&
    decoSpSwitchFt < params.bottomDepthFt &&
    decoSp !== params.setpoint
  ) {
    allDepthSet.add(decoSpSwitchFt);
  }

  const sortedAscentDepths = Array.from(allDepthSet).sort((a, b) => b - a);

  let currentDepth = params.bottomDepthFt;
  let firstStopLocked: number | null = null;
  let totalAscentTransitMin = 0;
  let totalStopMin = 0;

  // Check if initial ceiling already requires a stop at bottomDepthFt (very rare, e.g. shallow long dive)
  const initCeilFt = Math.max(0, (getCeilingBar(pN2, pHe, gfLow) - 1.0) * 33);
  if (
    sortedAscentDepths.length > 0 &&
    initCeilFt > sortedAscentDepths[0]
  ) {
    firstStopLocked = Math.ceil(initCeilFt / 10) * 10;
  }

  // 5. STEP UPWARD THROUGH EVERY DEPTH MILESTONE TO SURFACE
  for (let i = 0; i < sortedAscentDepths.length; i++) {
    const targetDepth = sortedAscentDepths[i];
    const dist = currentDepth - targetDepth;

    // Transit from currentDepth -> targetDepth
    if (dist > 0) {
      const stepMin = dist / ascentRate;
      const midDepth = (currentDepth + targetDepth) / 2;
      const transitSp =
        params.mode === "CCR" && decoSpSwitchFt > 0 && midDepth <= decoSpSwitchFt
          ? decoSp
          : params.setpoint;
      const transitGas = selectActiveGasForDepth(
        midDepth,
        params.bottomDil,
        params.ascentGases,
        params.mode
      );
      const transitInsp = getInspiredInertPressures(
        midDepth,
        transitGas.o2,
        transitGas.he,
        params.mode,
        transitSp
      );

      const afterTransit = loadTissuesConstant(
        pN2,
        pHe,
        transitInsp.pN2,
        transitInsp.pHe,
        stepMin
      );
      pN2 = afterTransit.nextN2;
      pHe = afterTransit.nextHe;
      runTime += stepMin;
      totalAscentTransitMin += stepMin;
      cns += stepMin * getCnsPerMinute(transitInsp.actualPO2);
      otu +=
        stepMin *
        Math.pow(Math.max(0, (transitInsp.actualPO2 - 0.5) / 0.5), 0.83);

      if (params.mode === "OC") {
        const sacToUse =
          firstStopLocked !== null
            ? params.decoSacCuFtMin
            : params.workingSacCuFtMin;
        const stepCuFt = stepMin * sacToUse * depthFtToBar(midDepth);
        gasUsageCuFt[transitGas.name] =
          (gasUsageCuFt[transitGas.name] || 0) + stepCuFt;
      }
      currentDepth = targetDepth;
    }

    const arrivalRunTime = Math.round(runTime);

    // Evaluate Gas & Setpoint at targetDepth
    const activeGas = selectActiveGasForDepth(
      targetDepth,
      params.bottomDil,
      params.ascentGases,
      params.mode
    );
    const targetSpSetting =
      params.mode === "CCR" && decoSpSwitchFt > 0 && targetDepth <= decoSpSwitchFt
        ? decoSp
        : params.setpoint;

    const switchedGasHere = activeGas.name !== trackingGasName;
    const switchedSpHere =
      params.mode === "CCR" && Math.abs(targetSpSetting - trackingSp) >= 0.01;

    trackingGasName = activeGas.name;
    trackingSp = targetSpSetting;

    const atDepthInsp = getInspiredInertPressures(
      targetDepth,
      activeGas.o2,
      activeGas.he,
      params.mode,
      targetSpSetting
    );

    // Determine next stop grid depth above targetDepth (or 0 if targetDepth <= lastStopDepthFt)
    let nextStopGridDepth = 0;
    for (let j = i + 1; j < sortedAscentDepths.length; j++) {
      if (stopGridSet.has(sortedAscentDepths[j])) {
        nextStopGridDepth = sortedAscentDepths[j];
        break;
      }
    }

    let stopMin = 0;
    if (stopGridSet.has(targetDepth)) {
      // Check if ascending to nextStopGridDepth would violate GF ceiling
      if (firstStopLocked === null) {
        const testCeilBar = getCeilingBar(pN2, pHe, gfLow);
        if (testCeilBar > depthFtToBar(nextStopGridDepth)) {
          firstStopLocked = targetDepth;
        }
      }

      if (firstStopLocked !== null) {
        const nextGf =
          firstStopLocked > 0
            ? gfHigh +
              ((gfHigh - gfLow) / (0 - firstStopLocked)) * nextStopGridDepth
            : gfHigh;

        while (stopMin < 240) {
          const reqBar = getCeilingBar(pN2, pHe, nextGf);
          if (reqBar <= depthFtToBar(nextStopGridDepth)) break;
          const stepLoad = loadTissuesConstant(
            pN2,
            pHe,
            atDepthInsp.pN2,
            atDepthInsp.pHe,
            1
          );
          pN2 = stepLoad.nextN2;
          pHe = stepLoad.nextHe;
          stopMin++;
        }
      }
    }

    if (stopMin > 0) {
      runTime += stopMin;
      totalStopMin += stopMin;
      cns += stopMin * getCnsPerMinute(atDepthInsp.actualPO2);
      otu +=
        stopMin *
        Math.pow(Math.max(0, (atDepthInsp.actualPO2 - 0.5) / 0.5), 0.83);

      if (params.mode === "OC") {
        const stopCuFt =
          stopMin * params.decoSacCuFtMin * depthFtToBar(targetDepth);
        gasUsageCuFt[activeGas.name] =
          (gasUsageCuFt[activeGas.name] || 0) + stopCuFt;
      }
    }

    const departRunTime = Math.round(runTime);

    milestones[targetDepth] = {
      depthFt: targetDepth,
      stopTimeMin: stopMin,
      arrivalRunTimeMin: arrivalRunTime,
      departRunTimeMin: departRunTime,
      activeGasName: activeGas.name,
      switchedGasHere,
      activeSp: atDepthInsp.actualPO2,
      switchedSpHere,
      loopFO2: `${atDepthInsp.loopFO2Pct}%`,
      loopFHe: `${atDepthInsp.loopFHePct}%`,
      cns: Math.round(cns),
      otu: Math.round(otu),
    };

    if (stopMin > 0) {
      const stopRow: DiveProfileRow = {
        id: `stop_${targetDepth}`,
        phase: "STOP",
        depthFt: targetDepth,
        depthLabel: `${targetDepth} ft Stop`,
        timeMin: stopMin,
        runTimeMin: departRunTime,
        activeGasName: activeGas.name,
        switchedGasHere,
        activeSp: atDepthInsp.actualPO2,
        switchedSpHere,
        loopFO2: `${atDepthInsp.loopFO2Pct}%`,
        loopFHe: `${atDepthInsp.loopFHePct}%`,
        cns: Math.round(cns),
        otu: Math.round(otu),
      };
      stops.push(stopRow);
      profileRows.push(stopRow);
    } else if (switchedGasHere || switchedSpHere) {
      // Explicit Ascent Switch Row when a gas or SP switch occurs without a stop
      profileRows.push({
        id: `switch_${targetDepth}`,
        phase: "SWITCH",
        depthFt: targetDepth,
        depthLabel: `${targetDepth} ft (Switch)`,
        timeMin: 0,
        runTimeMin: arrivalRunTime,
        activeGasName: activeGas.name,
        switchedGasHere,
        activeSp: atDepthInsp.actualPO2,
        switchedSpHere,
        loopFO2: `${atDepthInsp.loopFO2Pct}%`,
        loopFHe: `${atDepthInsp.loopFHePct}%`,
        cns: Math.round(cns),
        otu: Math.round(otu),
      });
    }
  }

  // Final transit from shallowest depth -> 0 ft Surface
  if (currentDepth > 0) {
    const finalMin = currentDepth / ascentRate;
    const midFinal = currentDepth / 2;
    const finalGas = selectActiveGasForDepth(
      currentDepth,
      params.bottomDil,
      params.ascentGases,
      params.mode
    );
    runTime += finalMin;
    totalAscentTransitMin += finalMin;
    if (params.mode === "OC") {
      const finalCuFt =
        finalMin * params.decoSacCuFtMin * depthFtToBar(midFinal);
      gasUsageCuFt[finalGas.name] =
        (gasUsageCuFt[finalGas.name] || 0) + finalCuFt;
    }
  }

  const totalRunTimeRounded = Math.round(runTime);
  const ttsMin = Math.max(0, totalRunTimeRounded - params.bottomTimeMin);

  profileRows.push({
    id: "row_surface",
    phase: "SURFACE",
    depthFt: 0,
    depthLabel: "0 ft (Surface)",
    timeMin: 0,
    runTimeMin: totalRunTimeRounded,
    activeGasName: trackingGasName,
    activeSp: params.mode === "CCR" ? Math.min(1.0, trackingSp) : 0.21,
    loopFO2: "-",
    loopFHe: "-",
    cns: Math.round(cns),
    otu: Math.round(otu),
  });

  return {
    stops,
    profileRows,
    milestones,
    totalRunTimeMin: totalRunTimeRounded,
    ttsMin,
    totalDecoStopMin: totalStopMin,
    ascentTransitMin: Math.round(totalAscentTransitMin),
    ocProblemTimeMin: params.mode === "OC" ? ocProblemTimeMin : 0,
    totalCns: Math.round(cns),
    totalOtu: Math.round(otu),
    gasUsageCuFt,
  };
}

// Helper: Pick physical cylinder size based on simulated gas volume required
function pickCylinderSpec(reqCuFt: number): {
  tankLabel: string;
  tankSizeCuFt: number;
  workingPsi: number;
} {
  if (reqCuFt <= 36) {
    return { tankLabel: "AL40", tankSizeCuFt: 40, workingPsi: 3000 };
  }
  if (reqCuFt <= 78) {
    return { tankLabel: "AL80", tankSizeCuFt: 80, workingPsi: 3000 };
  }
  if (reqCuFt <= 98) {
    return { tankLabel: "HP100", tankSizeCuFt: 100, workingPsi: 3442 };
  }
  return { tankLabel: "2x AL80", tankSizeCuFt: 160, workingPsi: 3000 };
}

// Smart Multi-Tier Offboard Bailout & Ascent Fleet Recommender Engine
export function generateRecommendedFleet(params: {
  bottomDepthFt: number;
  bottomTimeMin: number;
  dilO2: number;
  dilHe: number;
  setpoint: number;
  gfLowPct: number;
  gfHighPct: number;
  workingSacCuFtMin: number;
  decoSacCuFtMin: number;
  includeReserve: boolean;
  settings?: Partial<PlannerSettings>;
}): RecommendedTank[] {
  const depth = Math.max(20, params.bottomDepthFt);
  const ambBar = depthFtToBar(depth);
  const targetEndFt = params.settings?.targetEndFt ?? 100;
  const o2Narcotic = params.settings?.o2Narcotic ?? true;

  const candidateMixes: {
    role: string;
    o2: number;
    he: number;
    maxPo2Limit: number;
    ocSwitchDepthFt: number;
    ccrSwitchDepthFt: number;
    recommendPlumbIn: boolean;
    rationale: string;
  }[] = [];

  // 1. DEEP / BOTTOM BAILOUT GAS (Breathable right at bottomDepthFt <= 1.40 PO2)
  const rawBottomO2 = Math.floor((1.4 / ambBar) * 100);
  const bottomBoO2 =
    depth <= 110
      ? Math.min(32, rawBottomO2)
      : depth <= 130 && params.dilHe === 0
      ? Math.min(28, rawBottomO2)
      : Math.min(21, Math.max(10, rawBottomO2));

  // Match Helium for Target END & Diluent inert ratio
  let bottomBoHe = 0;
  if (depth > targetEndFt || params.dilHe > 0) {
    const endRatio = (targetEndFt + 33) / (depth + 33);
    const reqFHeEnd = o2Narcotic
      ? 1 - endRatio
      : 1 - bottomBoO2 / 100 - 0.79 * endRatio;
    const dilInertRatio =
      params.dilHe > 0
        ? params.dilHe / Math.max(1, 100 - params.dilO2)
        : 0;
    const matchedHe = (100 - bottomBoO2) * dilInertRatio;
    const rawHe = Math.max(0, reqFHeEnd * 100, matchedHe * 0.85);
    bottomBoHe = Math.min(100 - bottomBoO2, Math.round(rawHe / 5) * 5);
  }

  const deepOcMod = Math.max(depth, calcModFt(bottomBoO2, 1.4));
  const deepCcrFlushFt = Math.min(
    Math.max(20, Math.floor((depth - 20) / 10) * 10),
    calcModFt(bottomBoO2, 1.2)
  );
  const bottomPo2Actual = ((bottomBoO2 / 100) * ambBar).toFixed(2);
  const bottomEndActual = Math.max(
    0,
    Math.round((1 - bottomBoHe / 100) * (depth + 33) - 33)
  );

  const isDeepHypoxic = depth > 220 || bottomBoO2 < 16;

  candidateMixes.push({
    role: isDeepHypoxic ? "DEEP BOTTOM BO" : "DEEP BO + LOOP DIL",
    o2: bottomBoO2,
    he: bottomBoHe,
    maxPo2Limit: 1.4,
    ocSwitchDepthFt: deepOcMod,
    ccrSwitchDepthFt: deepCcrFlushFt,
    recommendPlumbIn: !isDeepHypoxic && depth >= 130,
    rationale: `PO2 ${bottomPo2Actual} @ ${depth}ft • END ${bottomEndActual}ft`,
  });

  // 2. TRAVEL / MID-ASCENT STAGE (Added automatically on deep >220ft dives)
  if (isDeepHypoxic) {
    const travelO2 = 21;
    const travelHe = 35;
    candidateMixes.push({
      role: "TRAVEL + LOOP DIL",
      o2: travelO2,
      he: travelHe,
      maxPo2Limit: 1.4,
      ocSwitchDepthFt: calcModFt(travelO2, 1.4), // 180ft
      ccrSwitchDepthFt: calcModFt(travelO2, 1.2), // 150ft
      recommendPlumbIn: true,
      rationale: "Normoxic mid-ascent bridge & CCR flush @ 150ft",
    });
  }

  // 3. ACCELERATED DECO GAS @ 70 FT (ICD-checked: TMx 50/20 if high He, else EAN50)
  if (depth >= 100 || params.bottomTimeMin >= 35) {
    const useHeliumBuffer = bottomBoHe >= 35 || params.dilHe >= 35;
    const decoO2 = 50;
    const decoHe = useHeliumBuffer ? 20 : 0;
    candidateMixes.push({
      role: "70FT DECO STAGE",
      o2: decoO2,
      he: decoHe,
      maxPo2Limit: 1.6,
      ocSwitchDepthFt: 70,
      ccrSwitchDepthFt: 40,
      recommendPlumbIn: false,
      rationale: useHeliumBuffer
        ? "ICD-safe 20% He buffer • 1.56 PO2 @ 70ft"
        : "Standard 70ft deco accelerator • 1.56 PO2 @ 70ft",
    });
  }

  // 4. SHALLOW PURE OXYGEN @ 20 FT (Included on deep or heavy deco profiles)
  if (depth >= 135 || (depth >= 100 && params.bottomTimeMin >= 25)) {
    candidateMixes.push({
      role: "20FT OXYGEN DECO",
      o2: 100,
      he: 0,
      maxPo2Limit: 1.6,
      ocSwitchDepthFt: 20,
      ccrSwitchDepthFt: 20,
      recommendPlumbIn: false,
      rationale: "Max shallow off-gassing • 1.60 PO2 @ 20ft",
    });
  }

  // Build temp GasMix array and run real OC Bailout simulation to size every tank accurately!
  const simGases: GasMix[] = candidateMixes.map((c, idx) => {
    const n2 = Math.max(0, 100 - c.o2 - c.he);
    const name =
      c.he > 0
        ? `TMx ${c.o2}/${c.he}`
        : c.o2 === 100
        ? "O2 100%"
        : `EAN${c.o2}`;
    return {
      id: `rec_${idx}`,
      name,
      o2: c.o2,
      he: c.he,
      n2,
      switchDepthFt: c.ocSwitchDepthFt,
      tankSizeCuFt: 80,
      workingPsi: 3000,
      isUsedAsDiluentOnAscent: c.recommendPlumbIn,
    };
  });

  const ocSim = runDecoSimulation({
    bottomDepthFt: depth,
    bottomTimeMin: params.bottomTimeMin,
    setpoint: params.setpoint,
    gfLowPct: params.gfLowPct,
    gfHighPct: params.gfHighPct,
    bottomDil: { o2: params.dilO2, he: params.dilHe },
    ascentGases: simGases,
    mode: "OC",
    workingSacCuFtMin: params.workingSacCuFtMin,
    decoSacCuFtMin: params.decoSacCuFtMin,
    settings: params.settings,
  });

  return candidateMixes.map((c, idx) => {
    const simGas = simGases[idx];
    const rawCuFt = ocSim.gasUsageCuFt[simGas.name] || 8;
    const estUsedCuFt = Math.max(
      10,
      Math.ceil(params.includeReserve ? rawCuFt * 1.5 : rawCuFt)
    );
    const cyl = pickCylinderSpec(estUsedCuFt);
    const estReqPsi = Math.round(
      (estUsedCuFt / cyl.tankSizeCuFt) * cyl.workingPsi
    );

    return {
      role: c.role,
      name: simGas.name,
      o2: c.o2,
      he: c.he,
      n2: simGas.n2,
      maxPo2Limit: c.maxPo2Limit,
      ocSwitchDepthFt: c.ocSwitchDepthFt,
      ccrSwitchDepthFt: c.ccrSwitchDepthFt,
      recommendPlumbIn: c.recommendPlumbIn,
      tankLabel: cyl.tankLabel,
      tankSizeCuFt: cyl.tankSizeCuFt,
      workingPsi: cyl.workingPsi,
      estUsedCuFt,
      estReqPsi,
      rationale: c.rationale,
    };
  });
}