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

export interface DecoStop {
  depthFt: number;
  timeMin: number;
  runTimeMin: number;
  activeGasName: string;
  activeSp: number;
  loopFO2: string;
  loopFHe: string;
  cns: number;
  otu: number;
}

export interface SavedDivePlan {
  id: string;
  title: string;
  date: string;
  bottomDepthFt: number;
  bottomTimeMin: number;
  setpoint: number;
  decoSetpoint: number;
  decoSpSwitchDepthFt: number;
  gfLow: number;
  gfHigh: number;
  bottomDiluent: { o2: number; he: number };
  ascentDiluents: GasMix[];
  bailoutGases: GasMix[];
  ccrRunTimeMin: number;
  ccrTtsMin: number;
  ocRunTimeMin: number;
  ocTtsMin: number;
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
  return 100 / 15; // > 1.6 ata spike
}

// CCR Loop Physics & Safety Limits (Max Flush PO2 = 1.2, Max END = 130ft)
export function evaluateDiluentAtDepth(
  depthFt: number,
  dilO2: number,
  dilHe: number,
  setpoint: number
) {
  const ambBar = depthFtToBar(depthFt);
  const fO2 = Math.max(0.01, dilO2 / 100);
  const fHe = Math.max(0, dilHe / 100);
  const fN2 = Math.max(0, 1 - fO2 - fHe);

  // Diluent Flush PO2 at target depth
  const flushPO2 = fO2 * ambBar;
  const isFlushPO2Unsafe = flushPO2 > 1.2 || flushPO2 < 0.16;

  // Max Operating Depth for Diluent assuming 1.2 max Flush PO2
  const maxFlushDepthFt = Math.floor((1.2 / fO2 - 1) * 33);

  // Loop fractions at Setpoint (Pamb >= SP)
  const actualLoopPO2 = Math.min(ambBar, setpoint);
  const loopFO2 = actualLoopPO2 / ambBar;
  const inertRatioHe = fHe + fN2 > 0 ? fHe / (fHe + fN2) : 0;
  const loopFHe = (1 - loopFO2) * inertRatioHe;
  const loopFN2 = 1 - loopFO2 - loopFHe;

  // CCR END Formula (considering O2 and N2 narcotic, He non-narcotic)
  const loopENDFt = Math.max(0, Math.round((1 - loopFHe) * (depthFt + 33) - 33));
  const isENDUnsafe = loopENDFt > 130;

  // Equivalent Air Density & Loop Gas Density (g/L): He=0.18, N2=1.25, O2=1.43
  const gasDensityGL = (loopFHe * 0.18 + loopFN2 * 1.25 + loopFO2 * 1.43) * ambBar;
  const eqAirDensityFt = Math.max(0, Math.round((gasDensityGL / 1.29 - 1) * 33));

  // Ideal Low-O2 and High-O2 Offboard Bailout recommender (matching He/N2 ratio)
  const idealLowBailO2 = Math.max(16, Math.round(loopFO2 * 100));
  const denom = Math.max(0.01, 1 - fO2);
  const idealLowBailHe = Math.round((((1 - idealLowBailO2 / 100) * fHe) / denom) * 100);
  const idealHighBailO2 = 50;
  const idealHighBailHe = Math.round((((1 - 0.5) * fHe) / denom) * 100);

  return {
    ambBar,
    flushPO2: Number(flushPO2.toFixed(2)),
    isFlushPO2Unsafe,
    maxFlushDepthFt,
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
      actualPO2: ambBar * fO2,
      loopFO2Pct: Math.round(fO2 * 100),
      loopFHePct: Math.round(fHe * 100),
    };
  } else {
    // CCR Mode: Loop maintains setpoint (capped at ambient pressure if very shallow)
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
      actualPO2,
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
    nextN2[i] = nextN2[i] + (inspiredN2 - nextN2[i]) * (1 - Math.exp(-kN2 * tMin));
    nextHe[i] = nextHe[i] + (inspiredHe - nextHe[i]) * (1 - Math.exp(-kHe * tMin));
  }
  return { nextN2, nextHe };
}

// Compute Ceiling in Bar for a given Gradient Factor (0.0 to 1.0)
function getCeilingBar(pN2Arr: number[], pHeArr: number[], gf: number): number {
  let maxCeilingBar = 0;
  for (let i = 0; i < 16; i++) {
    const pTotal = pN2Arr[i] + pHeArr[i];
    if (pTotal <= 0) continue;
    const a = (ZHL16C_N2_A[i] * pN2Arr[i] + ZHL16C_HE_A[i] * pHeArr[i]) / pTotal;
    const b = (ZHL16C_N2_B[i] * pN2Arr[i] + ZHL16C_HE_B[i] * pHeArr[i]) / pTotal;
    const ceiling = (pTotal - a * gf) / (gf / b - gf + 1.0);
    if (ceiling > maxCeilingBar) maxCeilingBar = ceiling;
  }
  return Math.max(1.0, maxCeilingBar);
}

// Pick best active Diluent or OC Bailout gas at current depth
function selectActiveGasForDepth(
  depthFt: number,
  bottomDil: { o2: number; he: number },
  ascentGases: GasMix[],
  mode: "CCR" | "OC"
) {
  const candidates = ascentGases
    .filter((g) => (mode === "CCR" ? g.isUsedAsDiluentOnAscent : true))
    .filter((g) => depthFt <= g.switchDepthFt)
    .sort((a, b) => a.switchDepthFt - b.switchDepthFt);

  if (candidates.length > 0) {
    const chosen = candidates[0];
    return { name: chosen.name, o2: chosen.o2, he: chosen.he, id: chosen.id };
  }
  return {
    name: `Dil ${bottomDil.o2}/${bottomDil.he}`,
    o2: bottomDil.o2,
    he: bottomDil.he,
    id: "bottom_dil",
  };
}

// Full MultiDeco-style ZHL-16C + GF Schedule Generator
// Supports Stepped Ascent Setpoint Boost (e.g., 1.2 bottom -> 1.4+ @ 80ft), Multi-Diluent Flushes & OC Bailout
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
}) {
  const gfLow = params.gfLowPct / 100;
  const gfHigh = params.gfHighPct / 100;
  const decoSp = params.decoSetpoint ?? params.setpoint;
  const decoSpSwitchFt = params.decoSpSwitchDepthFt ?? 0;

  // Surface saturation in air (0.79 * (1.0 - 0.0627))
  let pN2: number[] = new Array(16).fill(0.79 * (1.0 - WATER_VAPOR_BAR));
  let pHe: number[] = new Array(16).fill(0.0);

  let runTime = 0;
  let cns = 0;
  let otu = 0;

  // 1. Descent (60 ft/min) on Bottom Setpoint
  const descentTime = Math.max(1, Math.round(params.bottomDepthFt / 60));
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

  // 2. Bottom Segment (Always on CCR at Bottom Setpoint up until end of bottom time)
  const botRemainTime = Math.max(1, params.bottomTimeMin - descentTime);
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

  // 3. Find First Stop Depth using GF Low
  const rawCeilingBar = getCeilingBar(pN2, pHe, gfLow);
  const rawCeilingFt = Math.max(0, (rawCeilingBar - 1.0) * 33);
  const firstStopFt = Math.ceil(rawCeilingFt / 10) * 10;

  const stops: DecoStop[] = [];
  const gasUsageCuFt: Record<string, number> = {};

  // Ascent from bottom to First Stop (30 ft/min)
  const distToFirstStop = Math.max(0, params.bottomDepthFt - firstStopFt);
  const ascTimeMin = Math.max(1, Math.round(distToFirstStop / 30));
  const midAscDepth = (params.bottomDepthFt + firstStopFt) / 2;
  const ascActiveSp =
    decoSpSwitchFt > 0 && midAscDepth <= decoSpSwitchFt
      ? decoSp
      : params.setpoint;
  const ascGas = selectActiveGasForDepth(
    midAscDepth,
    params.bottomDil,
    params.ascentGases,
    params.mode
  );
  const ascInsp = getInspiredInertPressures(
    midAscDepth,
    ascGas.o2,
    ascGas.he,
    params.mode,
    ascActiveSp
  );
  const afterAsc = loadTissuesConstant(
    pN2,
    pHe,
    ascInsp.pN2,
    ascInsp.pHe,
    ascTimeMin
  );
  pN2 = afterAsc.nextN2;
  pHe = afterAsc.nextHe;
  runTime += ascTimeMin;
  cns += ascTimeMin * getCnsPerMinute(ascInsp.actualPO2);
  otu +=
    ascTimeMin *
    Math.pow(Math.max(0, (ascInsp.actualPO2 - 0.5) / 0.5), 0.83);

  if (params.mode === "OC") {
    const cuFt =
      ascTimeMin * params.workingSacCuFtMin * depthFtToBar(midAscDepth);
    gasUsageCuFt[ascGas.name] = (gasUsageCuFt[ascGas.name] || 0) + cuFt;
  }

  let totalStopMin = 0;

  // 4. Walk the GF Slope from First Stop to Surface (10ft increments)
  for (let stopDepth = firstStopFt; stopDepth >= 10; stopDepth -= 10) {
    const nextDepth = stopDepth === 10 ? 0 : stopDepth - 10;
    const nextGf =
      firstStopFt > 0
        ? gfHigh + ((gfHigh - gfLow) / (0 - firstStopFt)) * nextDepth
        : gfHigh;

    // Apply stepped Ascent/Deco Setpoint boost once at or shallower than decoSpSwitchFt
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
    while (stopMin < 180) {
      const reqBar = getCeilingBar(pN2, pHe, nextGf);
      const nextStopBar = depthFtToBar(nextDepth);
      if (reqBar <= nextStopBar && stopMin >= 1) break;
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

      stops.push({
        depthFt: stopDepth,
        timeMin: stopMin,
        runTimeMin: runTime,
        activeGasName: activeGas.name,
        activeSp: Number(stopInsp.actualPO2.toFixed(2)),
        loopFO2: `${stopInsp.loopFO2Pct}%`,
        loopFHe: `${stopInsp.loopFHePct}%`,
        cns: Math.round(cns),
        otu: Math.round(otu),
      });
    }
  }

  // TTS = Ascent time + Total Deco Stop time (Time from leaving bottom to reaching surface)
  const ttsMin = Math.max(0, runTime - params.bottomTimeMin);

  return {
    stops,
    totalRunTimeMin: runTime, // Full Dive Run Time (RT)
    ttsMin, // Time To Surface from leaving bottom (Ascent + Deco Stops)
    totalDecoStopMin: totalStopMin, // Pure hang time on deco stops
    ascentTransitMin: ascTimeMin,
    totalCns: Math.round(cns),
    totalOtu: Math.round(otu),
    gasUsageCuFt,
  };
}