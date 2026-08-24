export interface PairedTrialStat {
  n: number;
  meanTC: number;
  meanConv: number;
  meanDiff: number;
  sdDiff: number;
  standardError: number;
  tStat: number;
  pValue: number;
  isSignificant: boolean;
}

// Polynomial approximation of the error function erf(x)
function mathErf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Two-tailed p-value calculation
function calculatePValue(tStat: number, df: number): number {
  if (df <= 0) return 1.0;
  const absT = Math.abs(tStat);
  const z = absT * (1 - 1 / (4 * df));
  const p = 1.0 - mathErf(z / Math.SQRT2);
  
  return Number(Math.max(0.0001, Math.min(1.0, p)).toFixed(4));
}

export function computePairedTTest(pairs: { tcYield: number; convYield: number }[]): PairedTrialStat | null {
  const n = pairs.length;
  if (n < 2) return null;

  const differences = pairs.map((p) => p.tcYield - p.convYield);
  const meanDiff = differences.reduce((a, b) => a + b, 0) / n;
  
  const meanTC = pairs.reduce((a, b) => a + b.tcYield, 0) / n;
  const meanConv = pairs.reduce((a, b) => a + b.convYield, 0) / n;

  const varianceDiff = differences.reduce((acc, d) => acc + Math.pow(d - meanDiff, 2), 0) / (n - 1);
  const sdDiff = Math.sqrt(varianceDiff);
  const standardError = sdDiff / Math.sqrt(n);

  const tStat = standardError > 0 ? meanDiff / standardError : 0;
  const df = n - 1;
  const pValue = calculatePValue(tStat, df);

  return {
    n,
    meanTC: Math.round(meanTC),
    meanConv: Math.round(meanConv),
    meanDiff: Math.round(meanDiff),
    sdDiff: Number(sdDiff.toFixed(2)),
    standardError: Number(standardError.toFixed(2)),
    tStat: Number(tStat.toFixed(3)),
    pValue,
    isSignificant: pValue < 0.05,
  };
}