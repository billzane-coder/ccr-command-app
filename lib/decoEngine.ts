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

export interface DiveProfileRow {
  id: string;
  phase: "DESCENT" | "BOTTOM" | "PROBLEM" | "ASCENT" | "STOP";
  depthFt: number; // Primary depth for matching CCR & OC rows
  depthLabel: string; // e.g., "0 → 150 ft", "150 ft (Bot)", "80 ft"
  timeMin: number;
  runTimeMin: number;
  activeGasName: string;
  activeSp: number;
  loopFO2: string;
  loopFHe: string;
  cns: number;
  otu: number;
}

export interface MultiDecoSettings {
  lastStopDepthFt: 10 | 15 | 20;
  descentRateFtMin: number; // Default 60 ft/min
  ascentRateFtMin: number; // Default 30 ft/min
  ocProblemTimeMin: number; // Default 3 min at bottom before OC ascent
  o2Narcotic: boolean; // Default true (treats O2 as narcotic in END)
}

// Official Bühlmann ZHL-16C 16-Compartment Constants (N2 and He)
const ZHL16C_N2_HALFTIMES = [
  4.0, 8.0, 12.5, 18.5, 27.0, 38.3, 54.3, 77.0,
  109.0, 146.0, 187.0, 239.0, 305.0, 390.0, 498.0, 635.0,
];
const ZHL16C_N2_A = [
  1.2599, 1.0000, 0.8618, 0.7562, 0.6200, 0.5043, 0.4410, 0.4000,
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

  // PADI Tec 60 Ideal Max Diluent O2% (Setpoint - 0.2 ata rule)
  const idealMaxDilO2Pct = Math.max(
    10,
    Math.floor((( Math.max(0.7, setpoint - 0.2) ) / ambBar) * 100)
  );

  // Loop fractions at Setpoint
  const actualLoopPO2 = Math.min(ambBar, setpoint);
  const loopFO2 = actualLoopPO2 / ambBar;
  const inertRatioHe = fHe + fN2 > 0 ? fHe / (fHe + fN2) : 0;
  const loopFHe = (1 - loopFO2) * inertRatioHe;
  const loopFN2 = 1 - loopFO2 - loopFHe;

  // CCR END Formula (O2 + N2 narcotic vs N2 only)
  const narcoticFraction = o2Narcotic ? 1 - loopFHe : loopFN2 / 0.79;
  const loopENDFt = Math.max(
    0,
    Math.round(narcoticFraction * (depthFt + 33) - 33)
  );
  const isENDUnsafe = loopENDFt > 130;

  // Loop Gas Density (g/L): He=0.18, N2=1.25, O2=1.43
  const gasDensityGL =
    (loopFHe * 0.18 + loopFN2 * 1.25 + loopFO2 * 1.43) * ambBar;
  const eqAirDensityFt = Math.max(
    0,
    Math.round((gasDensityGL / 1.29 - 1) * 33)
  );

  // Ideal Low-O2 and High-O2 Offboard Bailout recommender (matching He/N2 ratio)
  const idealLowBailO2 = Math.max(16, Math.round(loopFO2 * 100));
  const denom = Math.max(0.01, 1 - fO2);
  const idealLowBailHe = Math.round(
    (((1 - idealLowBailO2 / 100) * fHe) / denom) * 100
  );
  const idealHighBailO2 = 50;
  const idealHighBailHe = Math.round((((1 - 0.5) * fHe) / denom) * 100);

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
    idealLowBailout: `TMx ${idealLowBailO2}/${idealLowBailHe}`,
    idealHighBailout: `TMx ${idealHighBailO2}/${idealHighBailHe}`,
  };
}

// Helper: Calculate Inspired N2 & He partial pressures in CCR vs OC mode
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
function selectActiveGasForDepth(
  depthFt: number,
  bottomDil: { o2: number; he: number },
  ascentGases: GasMix[],
  mode: "CCR" | "OC"
) {
  if (mode === "CCR") {
    const ccrCandidates = ascentGases
      .filter((g) => g.isUsedAsDiluentOnAscent && depthFt <= g.switchDepthFt)
      .sort((a, b) => a.switchDepthFt - b.switchDepthFt);

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
    // OC BAILOUT MODE:
    // 1. Find all offboard tanks whose switchDepthFt >= current depthFt (and not hypoxic)
    const ambBar = depthFtToBar(depthFt);
    const validOcTanks = ascentGases
      .filter((g) => depthFt <= g.switchDepthFt && (g.o2 / 100) * ambBar >= 0.16)
      .sort((a, b) => a.switchDepthFt - b.switchDepthFt);

    if (validOcTanks.length > 0) {
      const chosen = validOcTanks[0];
      return { name: chosen.name, o2: chosen.o2, he: chosen.he, id: chosen.id };
    }

    // 2. If deeper than all configured switchDepths, use the deepest/lowest-O2 offboard tank available
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

// Full MultiDeco-style ZHL-16C + GF Simulation
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
  settings?: Partial<MultiDecoSettings>;
}) {
  const gfLow = params.gfLowPct / 100;
  const gfHigh = params.gfHighPct / 100;
  const decoSp = params.decoSetpoint ?? params.setpoint;
  const decoSpSwitchFt = params.decoSpSwitchDepthFt ?? 0;

  const descentRate = Math.max(10, params.settings?.descentRateFtMin ?? 60);
  const ascentRate = Math.max(5, params.settings?.ascentRateFtMin ?? 30);
  const lastStopDepthFt = params.settings?.lastStopDepthFt ?? 10;
  const ocProblemTimeMin = Math.max(0, params.settings?.ocProblemTimeMin ?? 3);

  // Surface saturation in air
  let pN2: number[] = new Array(16).fill(0.79 * (1.0 - WATER_VAPOR_BAR));
  let pHe: number[] = new Array(16).fill(0.0);

  let runTime = 0;
  let cns = 0;
  let otu = 0;

  const profileRows: DiveProfileRow[] = [];
  const stops: DiveProfileRow[] = [];
  const gasUsageCuFt: Record<string, number> = {};

  // =========================================================
  // 1. DESCENT PHASE (Always on CCR Loop from 0 -> Bottom)
  // =========================================================
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

  profileRows.push({
    id: "row_descent",
    phase: "DESCENT",
    depthFt: params.bottomDepthFt,
    depthLabel: `0 → ${params.bottomDepthFt} ft`,
    timeMin: Number(descentTime.toFixed(1)),
    runTimeMin: Number(runTime.toFixed(1)),
    activeGasName: `Dil ${params.bottomDil.o2}/${params.bottomDil.he}`,
    activeSp: midDescentInsp.actualPO2,
    loopFO2: `${midDescentInsp.loopFO2Pct}%`,
    loopFHe: `${midDescentInsp.loopFHePct}%`,
    cns: Math.round(cns),
    otu: Math.round(otu),
  });

  // =========================================================
  // 2. BOTTOM PHASE (On CCR Loop until end of Bottom Time)
  // =========================================================
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
    activeGasName: `Dil ${params.bottomDil.o2}/${params.bottomDil.he}`,
    activeSp: botInsp.actualPO2,
    loopFO2: `${botInsp.loopFO2Pct}%`,
    loopFHe: `${botInsp.loopFHePct}%`,
    cns: Math.round(cns),
    otu: Math.round(otu),
  });

  // =========================================================
  // 3. OC BAILOUT PROBLEM-SOLVING AT BOTTOM (OC Mode Only)
  // =========================================================
  if (params.mode === "OC" && ocProblemTimeMin > 0) {
    const deepBoGas = selectActiveGasForDepth(
      params.bottomDepthFt,
      params.bottomDil,
      params.ascentGases,
      "OC"
    );
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
      activeSp: probInsp.actualPO2,
      loopFO2: `${probInsp.loopFO2Pct}%`,
      loopFHe: `${probInsp.loopFHePct}%`,
      cns: Math.round(cns),
      otu: Math.round(otu),
    });
  }

  // =========================================================
  // 4. STEPPED ASCENT TO FIRST STOP (10ft Brackets)
  // =========================================================
  const rawCeilingBar = getCeilingBar(pN2, pHe, gfLow);
  const rawCeilingFt = Math.max(0, (rawCeilingBar - 1.0) * 33);
  const firstStopFt = Math.max(
    lastStopDepthFt,
    Math.ceil(rawCeilingFt / 10) * 10
  );

  let currentDepth = params.bottomDepthFt;
  let totalAscentTransitMin = 0;

  // Group contiguous ascent brackets by active gas so you see exact gas switches on ascent
  let segStartDepth = currentDepth;
  let segTimeMin = 0;
  let segGasName = "";
  let segLastInsp: ReturnType<typeof getInspiredInertPressures> | null = null;

  while (currentDepth > firstStopFt) {
    const nextBracket = Math.max(firstStopFt, currentDepth - 10);
    const stepDist = currentDepth - nextBracket;
    const stepMin = stepDist / ascentRate;
    const midDepth = (currentDepth + nextBracket) / 2;

    const stepSp =
      decoSpSwitchFt > 0 && midDepth <= decoSpSwitchFt
        ? decoSp
        : params.setpoint;
    const stepGas = selectActiveGasForDepth(
       nextBracket, // Check switch eligibility as we arrive at the bracket
      params.bottomDil,
      params.ascentGases,
      params.mode
    );
    const stepInsp = getInspiredInertPressures(
      midDepth,
      stepGas.o2,
      stepGas.he,
      params.mode,
      stepSp
    );

    const afterStep = loadTissuesConstant(
      pN2,
      pHe,
      stepInsp.pN2,
      stepInsp.pHe,
      stepMin
    );
    pN2 = afterStep.nextN2;
    pHe = afterStep.nextHe;
    runTime += stepMin;
    totalAscentTransitMin += stepMin;
    cns += stepMin * getCnsPerMinute(stepInsp.actualPO2);
    otu +=
      stepMin *
      Math.pow(Math.max(0, (stepInsp.actualPO2 - 0.5) / 0.5), 0.83);

    if (params.mode === "OC") {
      const stepCuFt =
        stepMin * params.workingSacCuFtMin * depthFtToBar(midDepth);
      gasUsageCuFt[stepGas.name] =
        (gasUsageCuFt[stepGas.name] || 0) + stepCuFt;
    }

    if (segGasName && segGasName !== stepGas.name && segLastInsp) {
      profileRows.push({
        id: `asc_${segStartDepth}_${currentDepth}`,
        phase: "ASCENT",
        depthFt: currentDepth,
        depthLabel: `${segStartDepth} → ${currentDepth} ft`,
        timeMin: Number(segTimeMin.toFixed(1)),
        runTimeMin: Math.round(runTime - stepMin),
        activeGasName: segGasName,
        activeSp: segLastInsp.actualPO2,
        loopFO2: `${segLastInsp.loopFO2Pct}%`,
        loopFHe: `${segLastInsp.loopFHePct}%`,
        cns: Math.round(cns),
        otu: Math.round(otu),
      });
      segStartDepth = currentDepth;
      segTimeMin = 0;
    }

    segGasName = stepGas.name;
    segTimeMin += stepMin;
    segLastInsp = stepInsp;
    currentDepth = nextBracket;
  }

  if (segTimeMin > 0 && segLastInsp) {
    profileRows.push({
      id: `asc_${segStartDepth}_${firstStopFt}`,
      phase: "ASCENT",
      depthFt: firstStopFt,
      depthLabel: `${segStartDepth} → ${firstStopFt} ft`,
      timeMin: Number(segTimeMin.toFixed(1)),
      runTimeMin: Math.round(runTime),
      activeGasName: segGasName,
      activeSp: segLastInsp.actualPO2,
      loopFO2: `${segLastInsp.loopFO2Pct}%`,
      loopFHe: `${segLastInsp.loopFHePct}%`,
      cns: Math.round(cns),
      otu: Math.round(otu),
    });
  }

  // Build stop depth sequence down to Last Stop Depth (10ft, 15ft, or 20ft)
  const stopDepths: number[] = [];
  for (let d = firstStopFt; d >= 20; d -= 10) {
    stopDepths.push(d);
  }
  if (lastStopDepthFt === 15 && !stopDepths.includes(15)) {
    stopDepths.push(15);
  } else if (lastStopDepthFt === 10 && !stopDepths.includes(10)) {
    stopDepths.push(10);
  }

  let totalStopMin = 0;

  // =========================================================
  // 5. WALK DECOMPRESSION STOPS TO SURFACE
  // =========================================================
  for (let idx = 0; idx < stopDepths.length; idx++) {
    const stopDepth = stopDepths[idx];
    const nextDepth = idx + 1 < stopDepths.length ? stopDepths[idx + 1] : 0;

    const nextGf =
      firstStopFt > 0
        ? gfHigh + ((gfHigh - gfLow) / (0 - firstStopFt)) * nextDepth
        : gfHigh;

    const stopActiveSp =
      decoSpSwitchFt > 0 && stopDepth <= decoSpSwitchFt
        ? decoSp
        : params.setpoint;

    const activeGas = selectActiveGasForDepth(
      stopDepth,
      params.bottomDil,
      params.ascentGases,
      params.mode
    );
    const stopInsp = getInspiredInertPressures(
      stopDepth,
      activeGas.o2,
      activeGas.he,
      params.mode,
      stopActiveSp
    );

    let stopMin = 0;
    while (stopMin < 240) {
      const reqBar = getCeilingBar(pN2, pHe, nextGf);
      const nextStopBar = depthFtToBar(nextDepth);
      if (reqBar <= nextStopBar) break;
      const stepLoad = loadTissuesConstant(
        pN2,
        pHe,
        stopInsp.pN2,
        stopInsp.pHe,
        1
      );
      pN2 = stepLoad.nextN2;
      pHe = stepLoad.nextHe;
      stopMin++;
    }

    if (stopMin > 0) {
      runTime += stopMin;
      totalStopMin += stopMin;
      cns += stopMin * getCnsPerMinute(stopInsp.actualPO2);
      otu +=
        stopMin *
        Math.pow(Math.max(0, (stopInsp.actualPO2 - 0.5) / 0.5), 0.83);

      if (params.mode === "OC") {
        const cuFt =
          stopMin * params.decoSacCuFtMin * depthFtToBar(stopDepth);
        gasUsageCuFt[activeGas.name] =
          (gasUsageCuFt[activeGas.name] || 0) + cuFt;
      }

      const stopRow: DiveProfileRow = {
        id: `stop_${stopDepth}`,
        phase: "STOP",
        depthFt: stopDepth,
        depthLabel: `${stopDepth} ft`,
        timeMin: stopMin,
        runTimeMin: Math.round(runTime),
        activeGasName: activeGas.name,
        activeSp: stopInsp.actualPO2,
        loopFO2: `${stopInsp.loopFO2Pct}%`,
        loopFHe: `${stopInsp.loopFHePct}%`,
        cns: Math.round(cns),
        otu: Math.round(otu),
      };
      stops.push(stopRow);
      profileRows.push(stopRow);
    }

    // Transit to next stop or surface
    const transitDist = stopDepth - nextDepth;
    if (transitDist > 0) {
      const transitMin = transitDist / ascentRate;
      const midTransitDepth = (stopDepth + nextDepth) / 2;
      runTime += transitMin;
      totalAscentTransitMin += transitMin;
      if (params.mode === "OC") {
        const transitCuFt =
          transitMin * params.decoSacCuFtMin * depthFtToBar(midTransitDepth);
        gasUsageCuFt[activeGas.name] =
          (gasUsageCuFt[activeGas.name] || 0) + transitCuFt;
      }
    }
  }

  const totalRunTimeRounded = Math.round(runTime);
  const ttsMin = Math.max(0, totalRunTimeRounded - params.bottomTimeMin);

  return {
    stops,
    profileRows, // Full dive profile from 0ft -> Bottom -> Ascent -> Stops
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