'use client';

/*
 * MAVERICK serverless client-side API.
 * Reimplements the FastAPI backend (backend/main.py) fully in the browser:
 * auth, upload, sample data, Module A (outlier detection), Module B (drift
 * prediction), comprehensive analysis, explainability, dashboard.
 *
 * The module patches window.fetch so existing fetch('/api/...') calls in the
 * pages are serviced in-memory, making the app a pure static site that can be
 * hosted on Netlify with no backend.
 */

const STORE_KEY = 'maverick_state_v1';
const EXCLUDE_COLS = ['component_id', 'lot_id', 'is_defective', 'test_hour'];
const PARAM_PREFIXES = ['iddq', 'leakage', 'delay', 'supply_current'];
const NORM_975 = 1.959963984540054;

/* ---------------- utils ---------------- */

function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H0 = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const len = bytes.length;
  const bitLenHi = Math.floor(len / 0x20000000);
  const bitLenLo = (len % 0x20000000) * 8;
  const padded = new Uint8Array(((len + 8) >> 6 << 6) + 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLenHi, false);
  view.setUint32(padded.length - 4, bitLenLo, false);
  const w = new Int32Array(64);
  let h = H0.slice();
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getInt32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & hh);
      const t1 = (hh + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h = [(h[0] + a) | 0, (h[1] + b) | 0, (h[2] + c) | 0, (h[3] + d) | 0,
         (h[4] + e) | 0, (h[5] + f) | 0, (h[6] + hh) | 0, (h[7] + g) | 0].map((v) => v | 0);
  }
  return h.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

function rnd(x, digits) {
  if (x === null || x === undefined || isNaN(x)) return x;
  const m = Math.pow(10, digits);
  return Math.round(x * m) / m;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sampleStd(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function popStd(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function quantile(arr, q) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function median(arr) {
  return quantile(arr, 0.5);
}

/* ---------------- MT19937 (numpy-style seeding, seed 42) ---------------- */

function initMt(seed) {
  const N = 624;
  const mt = new Uint32Array(N);
  mt[0] = seed >>> 0;
  for (let i = 1; i < N; i++) {
    mt[i] = (Math.imul(1812433253, (mt[i - 1] ^ (mt[i - 1] >>> 30)) >>> 0) + i) >>> 0;
  }
  return mt;
}

function initByArray(key) {
  const N = 624;
  const mt = initMt(19650218);
  let i = 1;
  let j = 0;
  let k = Math.max(N, key.length);
  for (; k; k--) {
    mt[i] = (((mt[i] ^ Math.imul((mt[i - 1] ^ (mt[i - 1] >>> 30)) >>> 0, 1664525) >>> 0) + (key[j] >>> 0) + j) >>> 0);
    i++; j++;
    if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    if (j >= key.length) j = 0;
  }
  for (k = N - 1; k; k--) {
    mt[i] = (((mt[i] ^ Math.imul((mt[i - 1] ^ (mt[i - 1] >>> 30)) >>> 0, 1566083941) >>> 0) - i) >>> 0);
    i++;
    if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
  }
  mt[0] = 0x80000000 >>> 0;
  return mt;
}

function createRng(seed) {
  const N = 624;
  const M = 397;
  const MATRIX_A = 0x9908b0df;
  const UPPER = 0x80000000;
  const LOWER = 0x7fffffff;
  const mt = typeof seed === 'number' ? initMt(seed) : initByArray([seed >>> 0]);
  let mti = N;

  function twist() {
    let kk = 0;
    for (; kk < N - M; kk++) {
      const y = (mt[kk] & UPPER) | (mt[kk + 1] & LOWER);
      mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    }
    for (; kk < N - 1; kk++) {
      const y = (mt[kk] & UPPER) | (mt[kk + 1] & LOWER);
      mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    }
    const y = (mt[N - 1] & UPPER) | (mt[0] & LOWER);
    mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0);
    mti = 0;
  }

  function nextInt() {
    if (mti >= N) twist();
    let y = mt[mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  function random() {
    const a = (nextInt() >>> 5) * 67108864;
    const b = nextInt() >>> 6;
    return (a + b) / 9007199254740992;
  }

  let spare = null;
  function normal(mu, sigma) {
    if (spare !== null) {
      const z = spare;
      spare = null;
      return mu + sigma * z;
    }
    let u1 = 0;
    let u2 = 0;
    while (u1 <= 0) u1 = random();
    u2 = random();
    const r = Math.sqrt(-2 * Math.log(u1));
    const z0 = r * Math.cos(2 * Math.PI * u2);
    const z1 = r * Math.sin(2 * Math.PI * u2);
    spare = z1;
    return mu + sigma * z0;
  }

  return { random, normal, nextInt };
}

/* ---------------- CSV parser ---------------- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== '')) rows.push(row);
  }
  if (!rows.length) return { columns: [], records: [] };
  const columns = rows[0].map((h) => h.trim());
  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const rec = {};
    for (let c = 0; c < columns.length; c++) {
      rec[columns[c]] = parseValue(rows[r][c]);
    }
    records.push(rec);
  }
  return { columns, records };
}

function parseValue(raw) {
  const v = raw.trim();
  if (v === '') return null;
  const lower = v.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const n = parseFloat(v);
  if (!isNaN(n) && v !== '' && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(v)) return n;
  return v;
}

function isNumericColumn(records, col) {
  for (const r of records) {
    const v = r[col];
    if (v === null || v === undefined) continue;
    if (typeof v !== 'number') return false;
  }
  return true;
}

function numericColumns(records, columns) {
  return columns.filter((c) => isNumericColumn(records, c));
}

/* ---------------- state store ---------------- */

let state = null;

function defaultState() {
  const demoBroken = Object.fromEntries(['admin@isro.gov.in', 'qa@isro.gov.in', 'engineer@isro.gov.in'].map(() => []));
  return {
    users: {
      'admin@isro.gov.in': {
        password: sha256Hex('Admin@123!'),
        name: 'Admin User',
        role: 'admin',
      },
      'qa@isro.gov.in': {
        password: sha256Hex('Qa@123!'),
        name: 'QA Inspector',
        role: 'qa_inspector',
      },
      'engineer@isro.gov.in': {
        password: sha256Hex('Eng@123!'),
        name: 'Engineer',
        role: 'engineer',
      },
    },
    tokens: {},
    dataset: null,
    filename: null,
    columns: [],
    lots: [],
    outlier_results: null,
    outlier_summary: null,
    combined_results: null,
    drift_results: null,
    drift_accuracy: {},
    trained_parameters: [],
    training_metrics: {},
    safety_slopes: {},
    feature_importances: {},
    detectorConfig: { z_threshold: 1.5, iqr_multiplier: 1.5, absolute_limits: null },
  };
}

function persist() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage full or unavailable - keep operating in memory */
  }
}

function loadState() {
  if (typeof localStorage === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return { ...base, ...parsed, users: { ...base.users, ...(parsed.users || {}) }, tokens: parsed.tokens || {} };
  } catch (e) {
    return defaultState();
  }
}

state = loadState();

/* ---------------- auth ---------------- */

function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) {
    return 'Password must contain a special character (!@#$%^&*...)';
  }
  return null;
}

/* ---------------- sample data (port of backend/models/sample_data.py) ---------------- */

function generateFlatData(nComponents = 200, nLots = 5, defectRate = 0.08, seed = 42) {
  const rng = createRng(seed);
  const records = [];
  let componentId = 1000;
  for (let lotIdx = 0; lotIdx < nLots; lotIdx++) {
    const lotId = `LOT-${String.fromCharCode(65 + lotIdx)}${String(lotIdx + 1).padStart(3, '0')}`;
    const lotIddqBase = rng.random() * (12 - 8) + 8;
    const lotLeakageBase = rng.random() * (7 - 3) + 3;
    const lotDelayBase = rng.random() * (2.5 - 2.1) + 2.1;
    const lotSupplyBase = rng.random() * (55 - 45) + 45;
    const lotDriftFactor = rng.random() * (0.005 - 0.001) + 0.001;
    const nInLot = Math.floor(nComponents / nLots);
    for (let i = 0; i < nInLot; i++) {
      const isDefective = rng.random() < defectRate;
      componentId += 1;
      const compId = `COMP-${String(componentId).padStart(5, '0')}`;
      const iddqNoise = rng.normal(0, 0.3);
      const leakageNoise = rng.normal(0, 0.2);
      const delayNoise = rng.normal(0, 0.02);
      const supplyNoise = rng.normal(0, 0.5);
      const record = {
        component_id: compId,
        lot_id: lotId,
        is_defective: isDefective,
      };
      for (const hours of [0, 24, 96, 168]) {
        let timeDrift = lotDriftFactor * hours;
        if (isDefective) {
          const defectMult = rng.random() * (8 - 3) + 3;
          timeDrift *= defectMult;
          timeDrift += 0.0001 * Math.pow(hours, 1.5);
        }
        record[`iddq_${hours}h`] = rnd(Math.max(lotIddqBase + iddqNoise + timeDrift + rng.normal(0, 0.1), 0.1), 4);
        record[`leakage_${hours}h`] = rnd(Math.max(lotLeakageBase + leakageNoise + timeDrift * 0.5 + rng.normal(0, 0.05), 0.01), 4);
        record[`delay_${hours}h`] = rnd(Math.max(lotDelayBase + delayNoise + timeDrift * 0.1 + rng.normal(0, 0.005), 0.5), 4);
        record[`supply_current_${hours}h`] = rnd(Math.max(lotSupplyBase + supplyNoise + timeDrift * 2 + rng.normal(0, 0.2), 1), 4);
      }
      records.push(record);
    }
  }
  return records;
}

/* ---------------- Module A (port of backend/models/outlier_detection.py) ---------------- */

function fitLotStatistics(records, columns, lotColumn = 'lot_id') {
  const lotGroups = {};
  for (const r of records) {
    const lot = r[lotColumn] !== undefined ? String(r[lotColumn]) : 'default';
    if (!lotGroups[lot]) lotGroups[lot] = [];
    lotGroups[lot].push(r);
  }
  const lotStats = {};
  for (const [lot, rows] of Object.entries(lotGroups)) {
    const stats = {};
    for (const col of columns) {
      const values = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && !isNaN(v));
      if (!values.length) continue;
      stats[col] = {
        mean: mean(values),
        std: sampleStd(values),
        median: median(values),
        q25: quantile(values, 0.25),
        q75: quantile(values, 0.75),
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    }
    lotStats[lot] = stats;
  }
  return lotStats;
}

function rowHasCol(rows, col) {
  return rows.some((r) => col in r);
}

function zScoreDetection(value, lotMean, lotStd, threshold) {
  const z = lotStd === 0 ? 0 : (value - lotMean) / lotStd;
  const isAnomaly = Math.abs(z) > threshold;
  const confidence = isAnomaly ? Math.min(Math.abs(z) / threshold, 1) : 0;
  return {
    method: 'z_score',
    z_score: rnd(z, 4),
    threshold,
    is_anomaly: isAnomaly,
    confidence: rnd(confidence, 4),
    detail: `Value deviates ${Math.abs(z).toFixed(2)} std from lot mean`,
  };
}

function iqrDetection(value, q25, q75, multiplier) {
  const iqr = q75 - q25;
  const lowerBound = q25 - multiplier * iqr;
  const upperBound = q75 + multiplier * iqr;
  const isAnomaly = value < lowerBound || value > upperBound;
  const distance = iqr > 0 ? Math.min(Math.abs(value - lowerBound), Math.abs(value - upperBound)) / iqr : 0;
  const confidence = isAnomaly ? Math.min(distance, 1) : 0;
  return {
    method: 'iqr',
    lower_bound: rnd(lowerBound, 4),
    upper_bound: rnd(upperBound, 4),
    iqr: rnd(iqr, 4),
    is_anomaly: isAnomaly,
    confidence: rnd(confidence, 4),
    detail: `Bounds: [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
  };
}

function absoluteLimitCheck(value, param, absoluteLimits) {
  if (!absoluteLimits || !(param in absoluteLimits)) {
    return {
      method: 'absolute_limit',
      is_anomaly: false,
      confidence: 0,
      detail: 'No absolute limit defined',
    };
  }
  const limit = absoluteLimits[param];
  const isAnomaly = value > limit;
  const utilization = (value / limit * 100);
  const confidence = isAnomaly ? Math.min(utilization / 100, 1) : 0;
  return {
    method: 'absolute_limit',
    limit,
    utilization_pct: rnd(utilization, 2),
    is_anomaly: isAnomaly,
    confidence: rnd(confidence, 4),
    detail: `At ${utilization.toFixed(1)}% of absolute limit (${limit})`,
  };
}

function analyzeComponent(component, lotId, parametricCols, lotStats, config) {
  if (!lotStats[lotId]) {
    return { status: 'error', message: `Lot ${lotId} statistics not computed. Call fit_lot_statistics first.` };
  }
  const stats = lotStats[lotId];
  const parameterResults = [];
  let overallRisk = 0;
  let anomalyCount = 0;
  for (const param of parametricCols) {
    if (!(param in component) || !(param in stats)) continue;
    const value = component[param];
    if (value === null || value === undefined || isNaN(value)) continue;
    const zResult = zScoreDetection(value, stats[param].mean, stats[param].std, config.z_threshold);
    const iqrResult = iqrDetection(value, stats[param].q25, stats[param].q75, config.iqr_multiplier);
    const absResult = absoluteLimitCheck(value, param, config.absolute_limits);
    const methods = [zResult, iqrResult, absResult];
    const votes = methods.filter((m) => m.is_anomaly).length;
    const avgConfidence = mean(methods.map((m) => m.confidence || 0));
    let paramRisk = avgConfidence * (1 + 0.2 * votes);
    paramRisk = Math.min(paramRisk, 1);
    const isAnomaly = votes >= 2;
    if (isAnomaly) anomalyCount++;
    parameterResults.push({
      parameter: param,
      value,
      lot_mean: rnd(stats[param].mean, 4),
      lot_std: rnd(stats[param].std, 4),
      methods: { z_score: zResult, iqr: iqrResult, absolute_limit: absResult },
      consensus_votes: votes,
      is_anomaly: isAnomaly,
      risk_score: rnd(paramRisk, 4),
    });
    overallRisk += paramRisk;
  }
  if (parameterResults.length) overallRisk /= parameterResults.length;
  let classification;
  let riskLevel;
  if (overallRisk > 0.7 || anomalyCount > parameterResults.length * 0.5) {
    classification = 'REJECT';
    riskLevel = 'HIGH';
  } else if (overallRisk > 0.4 || anomalyCount > 0) {
    classification = 'REVIEW';
    riskLevel = 'MEDIUM';
  } else {
    classification = 'PASS';
    riskLevel = 'LOW';
  }
  return {
    status: 'success',
    classification,
    risk_level: riskLevel,
    overall_risk_score: rnd(overallRisk, 4),
    anomaly_parameters: anomalyCount,
    total_parameters: parameterResults.length,
    parameters: parameterResults,
    explainability: generateExplanation(parameterResults, classification, overallRisk),
  };
}

function generateExplanation(parameters, classification, riskScore) {
  const reasons = [];
  const recommendations = [];
  for (const param of parameters) {
    if (param.is_anomaly) {
      reasons.push(
        `Parameter '${param.parameter}' = ${param.value} ` +
        `(lot mean: ${param.lot_mean}, std: ${param.lot_std}) - ` +
        `flagged by ${param.consensus_votes}/3 detection methods`
      );
      if (param.parameter.toLowerCase().includes('current') || param.parameter.toLowerCase().includes('leakage')) {
        recommendations.push(
          `Investigate oxide integrity for '${param.parameter}'. Elevated leakage may indicate gate oxide degradation.`
        );
      } else if (param.parameter.toLowerCase().includes('delay')) {
        recommendations.push(
          `Check timing margins for '${param.parameter}'. Drift may indicate metal migration or hot carrier effects.`
        );
      } else {
        recommendations.push(
          `Review manufacturing process for '${param.parameter}' deviation. Consider lot-level investigation.`
        );
      }
    }
  }
  let summary;
  if (classification === 'PASS') {
    summary = `Component PASSES screening. Overall risk score: ${riskScore.toFixed(2)}/1.00. No statistically significant anomalies detected relative to lot distribution.`;
  } else if (classification === 'REVIEW') {
    summary = `Component flagged for MANUAL REVIEW. Overall risk score: ${riskScore.toFixed(2)}/1.00. ${reasons.length} parameter(s) show moderate deviation from lot norms.`;
  } else {
    summary = `Component RECOMMENDED FOR REJECTION. Overall risk score: ${riskScore.toFixed(2)}/1.00. Significant anomalies detected that suggest latent defect risk. Multiple detection methods confirm the anomaly.`;
  }
  return {
    summary,
    reasons,
    recommendations,
    detection_methods_used: ['Z-Score', 'IQR', 'Absolute Limits'],
    confidence_explanation:
      'Risk score is computed as a weighted consensus of three detection methods. ' +
      'A component is flagged only when majority (2/3) methods agree, reducing false positives while maintaining sensitivity to true anomalies.',
  };
}

function computeDetectionScore(results, dataset) {
  const records = dataset.records;
  const columns = dataset.columns;
  if (!columns.includes('is_defective')) {
    return {
      available: false,
      message: 'No ground truth labels (is_defective) available in data',
    };
  }
  const labelMap = {};
  for (const r of records) {
    if ('component_id' in r && 'is_defective' in r) labelMap[String(r.component_id)] = !!r.is_defective;
  }
  let TP = 0, FP = 0, TN = 0, FN = 0;
  const escaped = [];
  for (const r of results) {
    const cid = r.component_id;
    if (cid === undefined || !(String(cid) in labelMap)) continue;
    const trueDefective = labelMap[String(cid)];
    const flagged = r.classification === 'REJECT' || r.classification === 'REVIEW';
    if (trueDefective && flagged) TP++;
    else if (!trueDefective && flagged) FP++;
    else if (trueDefective && !flagged) { FN++; escaped.push(String(cid)); }
    else TN++;
  }
  const total = TP + FP + TN + FN;
  const recall = (TP + FN) > 0 ? TP / (TP + FN) : 0;
  const precision = (TP + FP) > 0 ? TP / (TP + FP) : 0;
  const specificity = (TN + FP) > 0 ? TN / (TN + FP) : 0;
  const accuracy = total > 0 ? (TP + TN) / total : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fnPenalty = 10;
  const fpPenalty = 1;
  const penalized = total > 0 ? (TP + TN - fnPenalty * FN - fpPenalty * FP) / total : 0;
  const score = Math.max(0, Math.min(1, penalized));
  return {
    available: true,
    tp: TP,
    fp: FP,
    tn: TN,
    fn: FN,
    total_evaluated: total,
    precision: rnd(precision, 4),
    recall_aka_sensitivity: rnd(recall, 4),
    specificity: rnd(specificity, 4),
    accuracy: rnd(accuracy, 4),
    f1_score: rnd(f1, 4),
    escaped_components: escaped,
    anomaly_detection_score: rnd(score, 4),
    anomaly_detection_score_pct: rnd(score * 100, 2),
    fn_penalty_weight: fnPenalty,
    fp_penalty_weight: fpPenalty,
    scoring_formula: `Score = max(0, (TP+TN - ${fnPenalty}*FN - ${fpPenalty}*FP) / N)`,
    interpretation:
      'Defective parts flagged as REJECT or REVIEW are True Positives. ' +
      'Defective parts classified PASS are False Negatives and are ' +
      `penalized at ${fnPenalty}x the weight of false alarms.`,
  };
}

function runOutlierAnalysis(records, columns, config) {
  const parametricCols = numericColumns(records, columns).filter((c) => !EXCLUDE_COLS.includes(c));
  if (!parametricCols.length) {
    return { error: 400, detail: 'No parametric columns found' };
  }
  const lotStats = fitLotStatistics(records, parametricCols);
  const results = [];
  for (const r of records) {
    const lotId = 'lot_id' in r ? String(r.lot_id) : 'default';
    const componentId = 'component_id' in r ? r.component_id : 'unknown';
    const analysis = analyzeComponent(r, lotId, parametricCols, lotStats, config);
    analysis.component_id = componentId;
    analysis.lot_id = lotId;
    results.push(analysis);
  }
  const classifications = { PASS: 0, REVIEW: 0, REJECT: 0 };
  const riskScores = [];
  for (const r of results) {
    classifications[r.classification] = (classifications[r.classification] || 0) + 1;
    riskScores.push(r.overall_risk_score);
  }
  const detectionMetrics = computeDetectionScore(results, { records, columns });
  const summary = {
    total_analyzed: results.length,
    classifications,
    avg_risk_score: riskScores.length ? rnd(mean(riskScores), 4) : 0,
    max_risk_score: riskScores.length ? rnd(Math.max(...riskScores), 4) : 0,
    detection_metrics: detectionMetrics,
  };
  const lotStatsShown = {};
  Object.entries(lotStats).slice(0, 5).forEach(([k, v]) => { lotStatsShown[k] = v; });
  return {
    summary,
    lot_statistics: lotStatsShown,
    results,
    total_results: results.length,
    parametric_columns: parametricCols,
  };
}

/* ---------------- Module B (port of backend/models/drift_predictor.py) ---------------- */

function computeDriftFeatures(value0h, value24h, value96h) {
  const features = {
    value_0h: value0h,
    value_24h: value24h,
    drift_0h_24h: value24h - value0h,
    drift_rate_0h_24h: value0h !== 0 ? (value24h - value0h) / 24.0 : 0,
    pct_change_0h_24h: value0h !== 0 ? ((value24h - value0h) / Math.abs(value0h) * 100) : 0,
  };
  if (value96h !== null && value96h !== undefined) {
    features.value_96h = value96h;
    features.drift_24h_96h = value96h - value24h;
    features.drift_rate_24h_96h = value24h !== 0 ? (value96h - value24h) / 72.0 : 0;
    features.acceleration = features.drift_rate_0h_24h !== 0
      ? features.drift_rate_24h_96h - features.drift_rate_0h_24h
      : 0;
  }
  return features;
}

function matrixInvert(mat) {
  const n = mat.length;
  const aug = mat.map((row, i) => row.slice().concat(Array.from({ length: n }, (_, j) => i === j ? 1 : 0)));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
    }
    if (Math.abs(aug[pivot][col]) < 1e-12) return null;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const div = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

function matTranspose(mat) {
  const rows = mat.length;
  const cols = mat[0] ? mat[0].length : 0;
  const out = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) out[j][i] = mat[i][j];
  }
  return out;
}

function matMul(a, b) {
  const n = a.length;
  const m = b[0].length;
  const p = b.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let k = 0; k < p; k++) s += a[i][k] * b[k][j];
      out[i][j] = s;
    }
  }
  return out;
}

function fitLinear(X, y, alpha) {
  const n = X.length;
  const d = X[0].length;
  const xt = matTranspose(X);
  const xtx = matMul(xt, X);
  for (let i = 0; i < d; i++) xtx[i][i] += alpha;
  const xty = xt.map((row) => row.reduce((s, v, k) => s + v * y[k], 0));
  const inv = matrixInvert(xtx);
  if (!inv) return null;
  const beta = inv.map((row) => row.reduce((s, v, k) => s + v * xty[k], 0));
  const intercept = mean(y) - beta.reduce((s, v, k) => s + v * mean(X.map((r) => r[k])), 0);
  return { beta, intercept };
}

function linearPredict(model, x) {
  return model.beta.reduce((s, v, k) => s + v * x[k], 0) + model.intercept;
}

/* CART regression tree for RandomForest / GradientBoosting */

function buildTree(X, y, indices, depth, maxDepth, rngState, featureSubset) {
  const n = indices.length;
  const sumY = indices.reduce((s, i) => s + y[i], 0);
  const meanY = sumY / n;
  const mse = n === 0 ? 0 : indices.reduce((s, i) => s + (y[i] - meanY) ** 2, 0);

  if (depth >= maxDepth || n < 2) {
    return { value: meanY, size: n };
  }

  const d = X[0].length;
  const featPool = featureSubset ? featureSubset : Array.from({ length: d }, (_, i) => i);
  let best = null;

  for (const f of featPool) {
    const o = indices.slice().sort((a, b) => X[a][f] - X[b][f]);
    let leftSum = 0;
    let leftSq = 0;
    let leftN = 0;
    const totalSq = indices.reduce((s, i) => s + y[i] ** 2, 0);
    for (let k = 0; k < n - 1; k++) {
      const yi = y[o[k]];
      leftSum += yi;
      leftSq += yi * yi;
      leftN++;
      const rightN = n - leftN;
      if (X[o[k]][f] === X[o[k + 1]][f]) continue;
      const rightSum = sumY - leftSum;
      const rightSq = totalSq - leftSq;
      const loss = (leftSq - leftSum * leftSum / leftN) + (rightSq - rightSum * rightSum / rightN);
      if (best === null || loss < best.loss) {
        best = { f, thresh: (X[o[k]][f] + X[o[k + 1]][f]) / 2, k, loss, leftN: leftN };
      }
    }
  }

  if (best === null) {
    return { value: meanY, size: n };
  }

  const left = [];
  const right = [];
  for (const i of indices) {
    if (X[i][best.f] <= best.thresh) left.push(i); else right.push(i);
  }
  if (!left.length || !right.length) return { value: meanY, size: n };

  const node = {
    f: best.f,
    thresh: best.thresh,
    improvement: mse - best.loss,
    left: buildTree(X, y, left, depth + 1, maxDepth, rngState, featureSubset),
    right: buildTree(X, y, right, depth + 1, maxDepth, rngState, featureSubset),
    size: n,
    featureImportance: { [best.f]: mse - best.loss },
  };
  return node;
}

function predictTree(tree, x) {
  let node = tree;
  while (node && node.f !== undefined) {
    node = x[node.f] <= node.thresh ? node.left : node.right;
  }
  return node ? node.value : 0;
}

function collectImportance(tree, acc) {
  if (!tree || tree.f === undefined) return acc;
  acc[tree.f] = (acc[tree.f] || 0) + tree.improvement;
  collectImportance(tree.left, acc);
  collectImportance(tree.right, acc);
  return acc;
}

function trainRandomForest(X, y, nEstimators, maxDepth, seed) {
  const rng = createRng(seed);
  const d = X[0].length;
  const trees = [];
  const n = X.length;
  for (let t = 0; t < nEstimators; t++) {
    const sample = [];
    for (let i = 0; i < n; i++) sample.push(Math.floor(rng.random() * n));
    const tree = buildTree(X, y, sample, 0, maxDepth, rng, null);
    trees.push(tree);
  }
  return { trees, predict: (x) => mean(trees.map((t) => predictTree(t, x))) };
}

function trainGradientBoosting(X, y, nEstimators, maxDepth, lr, seed) {
  const rng = createRng(seed);
  const init = mean(y);
  let preds = y.map(() => init);
  const trees = [];
  const n = X.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < nEstimators; t++) {
    const residuals = y.map((yi, i) => yi - preds[i]);
    const tree = buildTree(X, residuals, indices, 0, maxDepth, rng, null);
    trees.push(tree);
    for (let i = 0; i < n; i++) {
      preds[i] += lr * predictTree(tree, X[i]);
    }
  }
  return { trees, init, lr, predict: (x) => init + lr * trees.reduce((s, t) => s + predictTree(t, x), 0) };
}

function featureImportancesTrees(models, featureNames, nFeature) {
  const total = Array(nFeature).fill(0);
  let sum = 0;
  for (const m of models) {
    const acc = {};
    for (const t of m.trees) collectImportance(t, acc);
    for (let f = 0; f < nFeature; f++) {
      const v = (acc[f] || 0) / m.trees.length;
      total[f] += v;
      sum += v;
    }
  }
  const imps = total.map((v) => (sum > 0 ? v / sum : 0));
  const out = {};
  featureNames.forEach((name, i) => { out[name] = imps[i] || 0; });
  return out;
}

function computeSafetySlope(dataset, param, featureTriplet) {
  const col24 = `${param}_24h`;
  const col0 = `${param}_0h`;
  const rows = dataset.records.filter((r) => col24 in r && col0 in r && !isNaN(r[col24]) && r[col0] !== 0);
  const rates = rows.map((r) => (r[col24] - r[col0]) / 24.0);
  if (!rates.length) return 0;
  if (rates.length < 5) return Math.abs(mean(rates)) * 2;
  return Math.abs(mean(rates)) + NORM_975 * sampleStd(rates);
}

function kfoldSplits(n, k) {
  const folds = [];
  let start = 0;
  for (let i = 0; i < k; i++) {
    let size = Math.floor(n / k);
    if (i < n % k) size += 1;
    const test = [];
    for (let j = start; j < start + size; j++) test.push(j);
    start += size;
    folds.push(test);
  }
  return folds;
}

function crossValScore(factory, X, y, folds) {
  let total = 0;
  for (const test of folds) {
    const testSet = new Set(test);
    const trainIdx = Array.from({ length: X.length }, (_, i) => i).filter((i) => !testSet.has(i));
    const Xtr = trainIdx.map((i) => X[i]);
    const ytr = trainIdx.map((i) => y[i]);
    const model = factory(Xtr, ytr);
    let mae = 0;
    for (const i of test) mae += Math.abs(model.predict(X[i]) - y[i]);
    total += mae / test.length;
  }
  return -total / folds.length;
}

let driftModels = {};

function resetDriftModels() {
  driftModels = {};
}

function trainDriftModels(dataset) {
  const records = dataset.records;
  const columns = dataset.columns;
  resetDriftModels();
  const params = [];
  const trainingMetrics = {};
  const safetySlopes = {};
  const featureImportances = {};

  for (const prefix of PARAM_PREFIXES) {
    const col0 = `${prefix}_0h`;
    const col24 = `${prefix}_24h`;
    const col168 = `${prefix}_168h`;
    const col96 = `${prefix}_96h`;
    if (!columns.includes(col0) || !columns.includes(col168)) continue;

    const has96 = columns.includes(col96);
    const featureNames = has96
      ? ['value_0h', 'value_24h', 'drift_0h_24h', 'drift_rate', 'pct_change', 'value_96h', 'drift_24h_96h', 'drift_rate_24h_96h']
      : ['value_0h', 'value_24h', 'drift_0h_24h', 'drift_rate', 'pct_change'];

    const rows = records.filter((r) =>
      r[col0] !== undefined && r[col0] !== null && !isNaN(r[col0]) &&
      r[col24] !== undefined && r[col24] !== null && !isNaN(r[col24]) &&
      r[col168] !== undefined && r[col168] !== null && !isNaN(r[col168]) &&
      (!has96 || (r[col96] !== undefined && r[col96] !== null && !isNaN(r[col96])))
    );

    if (rows.length < 10) continue;

    const Xfeatures = rows.map((r) => {
      const v0 = r[col0];
      const v24 = r[col24];
      const base = [
        v0,
        v24,
        v24 - v0,
        (v24 - v0) / 24.0,
        v0 !== 0 ? ((v24 - v0) / Math.abs(v0) * 100) : 0,
      ];
      if (has96) {
        const v96 = r[col96];
        base.push(v96, v96 - v24, (v96 - v24) / 72.0);
      }
      return base;
    });
    const y = rows.map((r) => r[col168]);

    const d = Xfeatures[0].length;
    const means = Array(d).fill(0);
    const stds = Array(d).fill(0);
    for (let f = 0; f < d; f++) means[f] = mean(Xfeatures.map((row) => row[f]));
    for (let f = 0; f < d; f++) stds[f] = popStd(Xfeatures.map((row) => row[f]));
    const Xscaled = Xfeatures.map((row) => row.map((v, f) => stds[f] > 0 ? (v - means[f]) / stds[f] : 0));

    const folds = kfoldSplits(Xscaled.length, Math.min(5, Math.floor(Xscaled.length / 2)));

    const models = {
      ridge: {
        name: 'ridge',
        factory: (Xtr, ytr) => {
          const m = fitLinear(Xtr, ytr, 1.0);
          return { predict: (x) => m ? linearPredict(m, x) : mean(ytr) };
        },
        importance: null,
      },
      random_forest: {
        name: 'random_forest',
        factory: (Xtr, ytr) => trainRandomForest(Xtr, ytr, 100, 10, 42),
      },
      gradient_boosting: {
        name: 'gradient_boosting',
        factory: (Xtr, ytr) => trainGradientBoosting(Xtr, ytr, 100, 5, 0.1, 42),
      },
    };

    let bestScore = -Infinity;
    let bestName = null;
    for (const [name, mm] of Object.entries(models)) {
      const avg = crossValScore(mm.factory, Xscaled, y, folds);
      if (avg > bestScore) {
        bestScore = avg;
        bestName = name;
      }
    }

    const bestModel = models[bestName].factory(Xscaled, y);
    const predictions = Xscaled.map((x) => bestModel.predict(x));
    const mae = mean(predictions.map((p, i) => Math.abs(p - y[i])));
    const rmse = Math.sqrt(mean(predictions.map((p, i) => (p - y[i]) ** 2)));
    const ssRes = predictions.reduce((s, p, i) => s + (y[i] - p) ** 2, 0);
    const ssTot = y.reduce((s, yi) => s + (yi - mean(y)) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    params.push(prefix);
    trainingMetrics[prefix] = {
      model_type: bestName,
      mae: rnd(mae, 6),
      rmse: rnd(rmse, 6),
      r2_score: rnd(r2, 6),
      cv_score: bestScore > -Infinity ? rnd(-bestScore, 6) : null,
      training_samples: rows.length,
      safety_slope: null,
    };
    safetySlopes[prefix] = computeSafetySlope(dataset, prefix);
    trainingMetrics[prefix].safety_slope = rnd(safetySlopes[prefix], 6);

    let imp = null;
    if (bestName === 'random_forest' || bestName === 'gradient_boosting') {
      imp = featureImportancesTrees([bestModel], featureNames, d);
      imp = normalizeImportances(imp);
    } else {
      const beta = bestModel.beta;
      imp = {};
      featureNames.forEach((name, i) => { imp[name] = Math.abs(beta[i] || 0); });
    }
    featureImportances[prefix] = imp;

    driftModels[prefix] = {
      model: bestModel,
      scaler: { means, stds },
      nFeatures: d,
      safety_slope: safetySlopes[prefix],
      has96,
      training_metrics: trainingMetrics[prefix],
    };
  }

  state.trained_parameters = params;
  state.training_metrics = trainingMetrics;
  state.safety_slopes = safetySlopes;
  state.feature_importances = featureImportances;
  persist();
  return params;
}

function normalizeImportances(imp) {
  const total = Object.values(imp).reduce((s, v) => s + v, 0);
  if (total <= 0) return imp;
  const out = {};
  Object.entries(imp).forEach(([k, v]) => { out[k] = v / total; });
  return out;
}

function predictSingleDrift(param, value0h, value24h, value96h) {
  if (!driftModels[param]) {
    return { status: 'error', message: `No trained model for parameter ${param}` };
  }
  const m = driftModels[param];
  const features = computeDriftFeatures(value0h, value24h, value96h);
  const base = [
    features.value_0h,
    features.value_24h,
    features.drift_0h_24h,
    features.drift_rate_0h_24h,
    features.pct_change_0h_24h,
  ];
  if (m.nFeatures > 5) {
    base.push(
      value96h !== null && value96h !== undefined ? features.value_96h : 0,
      value96h !== null && value96h !== undefined ? features.drift_24h_96h : 0,
      value96h !== null && value96h !== undefined ? features.drift_rate_24h_96h : 0
    );
  }
  const scaled = base.map((v, f) => m.scaler.stds[f] > 0 ? (v - m.scaler.means[f]) / m.scaler.stds[f] : 0);
  const predicted168 = m.model.predict(scaled);
  const predictedDriftRate = (predicted168 - value0h) / 168.0;
  const safetySlope = m.safety_slope;
  const exceeds = safetySlope > 0 && Math.abs(predictedDriftRate) > safetySlope;
  let recommendation;
  let confidence;
  if (exceeds) {
    recommendation = 'REJECT';
    confidence = safetySlope > 0 ? Math.min(Math.abs(predictedDriftRate) / safetySlope, 1.0) : 1.0;
  } else {
    confidence = safetySlope > 0 ? (1.0 - Math.abs(predictedDriftRate) / safetySlope) : 0.9;
    recommendation = 'PASS';
  }
  const explainability = generateDriftExplanation(
    param, features, predicted168, predictedDriftRate, safetySlope, exceeds, recommendation
  );
  return {
    status: 'success',
    parameter: param,
    input: { value_0h: value0h, value_24h: value24h, value_96h: value96h === undefined ? null : value96h },
    prediction: {
      predicted_168h: rnd(predicted168, 6),
      predicted_drift_rate: rnd(predictedDriftRate, 6),
      safety_slope: rnd(safetySlope, 6),
      exceeds_safety_slope: exceeds,
    },
    recommendation,
    confidence: rnd(confidence, 4),
    features,
    model_info: m.training_metrics,
    explainability,
  };
}

function generateDriftExplanation(param, features, predicted168, driftRate, safetySlope, exceeds, recommendation) {
  const importance = state.feature_importances[param] || {};
  const topFeatures = Object.entries(importance).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const reasoning = [
    `Step 1: Initial measurement at 0h = ${features.value_0h.toFixed(4)}`,
    `Step 2: 24h measurement = ${features.value_24h.toFixed(4)}, drift = ${features.drift_0h_24h.toFixed(4)}`,
    `Step 3: Estimated drift rate = ${features.drift_rate_0h_24h.toFixed(6)}/hour`,
    `Step 4: Projected 168h value = ${predicted168.toFixed(4)}`,
    `Step 5: Safety slope threshold = ${safetySlope.toFixed(6)}/hour`,
  ];
  if (exceeds) {
    reasoning.push(`Step 6: EXCEEDS safety slope by ${(Math.abs(driftRate) - safetySlope).toFixed(6)}/hour -> FLAGGED`);
  } else {
    reasoning.push('Step 6: Within safety slope -> CLEARED');
  }
  const featureContributions = [];
  for (const [fname, fimp] of topFeatures) {
    if (fname in features) {
      featureContributions.push({
        feature: fname,
        value: rnd(features[fname], 6),
        importance: rnd(fimp, 4),
        explanation: `${fname} = ${features[fname].toFixed(4)} (model importance: ${(fimp * 100).toFixed(2)}%)`,
      });
    }
  }
  const summary =
    `The model predicts that '${param}' will reach ${predicted168.toFixed(4)} at 168 hours based on the observed drift from 0h (${features.value_0h.toFixed(4)}) ` +
    `to 24h (${features.value_24h.toFixed(4)}). The ${exceeds ? 'projected' : 'observed'} drift rate ` +
    `${exceeds ? 'exceeds' : 'is within'} the safety threshold (${safetySlope.toFixed(6)}/hour), leading to a ` +
    `${recommendation === 'REJECT' ? 'REJECTION' : 'PASS'} recommendation.`;
  return {
    recommendation,
    reasoning,
    feature_contributions: featureContributions,
    summary,
    safety_analysis: {
      current_drift_rate: rnd(driftRate, 6),
      safety_threshold: rnd(safetySlope, 6),
      margin: rnd(safetySlope - Math.abs(driftRate), 6),
      exceeds,
    },
  };
}

function predictDriftBatch(dataset) {
  const allResults = [];
  const accuracyMetrics = {};
  for (const param of driftModels ? Object.keys(driftModels) : []) {
    const col0 = `${param}_0h`;
    const col24 = `${param}_24h`;
    const col96 = `${param}_96h`;
    const col168 = `${param}_168h`;
    const has168 = dataset.columns.includes(col168);
    const has96 = dataset.columns.includes(col96);
    const results = [];
    dataset.records.forEach((row, idx) => {
      const v0 = row[col0];
      const v24 = row[col24];
      if (v0 === undefined || v24 === undefined || v0 === null || v24 === null || isNaN(v0) || isNaN(v24)) return;
      let v96 = has96 ? row[col96] : null;
      if (v96 === undefined || v96 === null || isNaN(v96)) v96 = null;
      const prediction = predictSingleDrift(param, v0, v24, v96);
      const actual = has168 ? row[col168] : null;
      if (has168 && actual !== null && actual !== undefined && !isNaN(actual)) {
        prediction.actual_168h = actual;
        prediction.prediction_error = Math.abs(prediction.prediction.predicted_168h - actual);
      }
      prediction.component_index = idx;
      prediction.component_id = row.component_id;
      if (row.lot_id !== undefined) prediction.lot_id = row.lot_id;
      results.push(prediction);
    });
    allResults.push(...results);
    if (has168) accuracyMetrics[param] = getOverallAccuracy(results);
  }
  return { allResults, accuracyMetrics };
}

function getOverallAccuracy(results) {
  const errors = results.filter((r) => r.prediction_error !== undefined).map((r) => r.prediction_error);
  const actuals = results.filter((r) => r.actual_168h !== undefined).map((r) => r.actual_168h);
  const predicted = results.filter((r) => r.actual_168h !== undefined).map((r) => r.prediction.predicted_168h);
  if (!errors.length) return { message: 'No ground truth available for accuracy calculation' };
  const mae = mean(errors);
  const rmse = Math.sqrt(mean(errors.map((e) => e ** 2)));
  const mape = mean(errors.map((e, i) => Math.abs(e / (actuals[i] !== 0 ? actuals[i] : 1) * 100)));
  const ssRes = actuals.reduce((s, a, i) => s + (a - predicted[i]) ** 2, 0);
  const meanA = mean(actuals);
  const ssTot = actuals.reduce((s, a) => s + (a - meanA) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const sorted = errors.slice().sort((a, b) => a - b);
  return {
    mean_absolute_error: rnd(mae, 6),
    root_mean_squared_error: rnd(rmse, 6),
    mean_absolute_percentage_error: rnd(mape, 2),
    r2_score: rnd(r2, 6),
    n_samples: errors.length,
    max_error: rnd(Math.max(...errors), 6),
    min_error: rnd(Math.min(...errors), 6),
    median_error: rnd(median(sorted), 6),
  };
}

/* ---------------- comprehensive / explain / dashboard ---------------- */

function runComprehensive(records, columns, config) {
  const parametricCols = numericColumns(records, columns).filter((c) => !EXCLUDE_COLS.includes(c));
  if (!parametricCols.length) {
    return { error: 400, detail: 'No parametric columns found' };
  }
  const lotStats = fitLotStatistics(records, parametricCols);
  const outlierResults = records.map((r) => {
    const lotId = 'lot_id' in r ? String(r.lot_id) : 'default';
    const componentId = 'component_id' in r ? r.component_id : 'unknown';
    const a = analyzeComponent(r, lotId, parametricCols, lotStats, config);
    a.component_id = componentId;
    a.lot_id = lotId;
    return a;
  });
  const outlierClassifications = { PASS: 0, REVIEW: 0, REJECT: 0 };
  const riskScores = [];
  for (const r of outlierResults) {
    outlierClassifications[r.classification]++;
    riskScores.push(r.overall_risk_score);
  }
  const detectionMetrics = computeDetectionScore(outlierResults, { records, columns });

  const summary = {
    total_components: records.length,
    module_a: {
      classifications: outlierClassifications,
      avg_risk: riskScores.length ? rnd(mean(riskScores), 4) : 0,
      detection_metrics: detectionMetrics,
    },
    module_b: {
      drift_distribution: { REJECT: 0, PASS: 0 },
      accuracy: {},
    },
  };

  const combinedResults = outlierResults.map((r, i) => ({
    component_id: r.component_id || `COMP-${i}`,
    lot_id: r.lot_id || '',
    outlier_classification: r.classification,
    outlier_risk: r.overall_risk_score,
    drift_recommendation: null,
    combined_verdict: r.classification,
  }));

  const driftPart = runDriftPipeline(records, columns);
  if (driftPart) {
    summary.module_b.drift_distribution = driftPart.distribution;
    summary.module_b.accuracy = driftPart.accuracy;
  }
  state.outlier_results = outlierResults;
  state.outlier_summary = {
    total_analyzed: outlierResults.length,
    classifications: outlierClassifications,
    avg_risk_score: riskScores.length ? rnd(mean(riskScores), 4) : 0,
    detection_metrics: detectionMetrics,
  };
  state.combined_results = combinedResults;
  persist();

  return {
    summary,
    results: combinedResults,
  };
}

function runDriftPipeline(records, columns) {
  const hasDrift = PARAM_PREFIXES.some((p) => columns.includes(`${p}_0h`) && columns.includes(`${p}_168h`));
  if (!hasDrift) return null;
  const params = trainDriftModels({ records, columns });
  if (!params.length) return null;
  const dummyDataset = { records, columns };
  const { allResults, accuracyMetrics } = predictDriftBatch(dummyDataset);
  state.drift_results = allResults;
  state.drift_accuracy = accuracyMetrics;
  persist();
  const distribution = { REJECT: 0, PASS: 0 };
  for (const r of allResults) distribution[r.recommendation] = (distribution[r.recommendation] || 0) + 1;
  return { distribution, accuracy: accuracyMetrics };
}

function buildExplanation(componentId) {
  if (!state.dataset) return { error: 400, detail: 'No data loaded. Upload data and run analysis first.' };
  const dataset = state.dataset;
  const match = dataset.records.find((r) => String(r.component_id) === String(componentId));
  if (!match) return { error: 404, detail: 'Component not found in uploaded data' };

  const rawValues = {};
  for (const col of numericColumns(dataset.records, dataset.columns)) {
    for (const suffix of ['_0h', '_24h', '_96h', '_168h']) {
      if (col.endsWith(suffix)) {
        const param = col.slice(0, -suffix.length);
        if (!rawValues[param]) rawValues[param] = {};
        rawValues[param][suffix] = rnd(match[col], 4);
        break;
      }
    }
  }
  const explanation = {
    component_id: componentId,
    lot_id: 'lot_id' in match ? String(match.lot_id) : null,
    is_defective: 'is_defective' in match
      ? (match.is_defective === true || match.is_defective === 'True' || match.is_defective === 1)
      : null,
    raw_values: rawValues,
  };
  if (state.outlier_results) {
    const found = state.outlier_results.find((r) => r.component_id !== undefined && String(r.component_id) === String(componentId));
    if (found) explanation.outlier_analysis = found;
  }
  const driftAnalysis = {};
  if (state.drift_results) {
    for (const r of state.drift_results) {
      const idx = r.component_index;
      if (idx === null || idx === undefined || idx >= dataset.records.length) continue;
      if (String(dataset.records[idx].component_id) === String(componentId)) {
        driftAnalysis[r.parameter] = r;
      }
    }
  }
  if (Object.keys(driftAnalysis).length) explanation.drift_analysis = driftAnalysis;
  return explanation;
}

function buildDashboard() {
  const dashboard = {
    outlier: state.outlier_summary ? { ...state.outlier_summary } : {},
    drift_accuracy: state.drift_accuracy || {},
    data_info: {},
  };
  if (dashboard.outlier.avg_risk_score !== undefined) {
    dashboard.outlier.avg_risk = dashboard.outlier.avg_risk_score;
  }
  if (state.dataset) {
    const dataset = state.dataset;
    dashboard.data_info = {
      total_components: dataset.records.length,
      lots: dataset.columns.includes('lot_id')
        ? new Set(dataset.records.map((r) => String(r.lot_id)).filter(Boolean)).size
        : 0,
      has_ground_truth: dataset.columns.includes('is_defective'),
    };
    if (state.outlier_results) {
      const dist = {};
      for (const r of state.outlier_results) {
        const c = r.classification;
        dist[c] = (dist[c] || 0) + 1;
      }
      dashboard.outlier_distribution = dist;
    }
    if (state.drift_results) {
      const rejected = state.drift_results.filter((r) => r.recommendation === 'REJECT').length;
      const passed = state.drift_results.filter((r) => r.recommendation === 'PASS').length;
      dashboard.drift_distribution = { REJECT: rejected, PASS: passed };
    }
  }
  return dashboard;
}

function buildDataStats() {
  if (!state.dataset) return { error: 'No data loaded. Upload data or generate sample first.' };
  const dataset = state.dataset;
  const numCols = numericColumns(dataset.records, dataset.columns);
  const stats = {};
  for (const col of numCols) {
    const values = dataset.records.map((r) => r[col]).filter((v) => v !== null && v !== undefined && !isNaN(v));
    stats[col] = {
      mean: rnd(mean(values), 4),
      std: rnd(sampleStd(values), 4),
      min: rnd(Math.min(...values), 4),
      max: rnd(Math.max(...values), 4),
      median: rnd(median(values), 4),
    };
  }
  return {
    total_components: dataset.records.length,
    lots: dataset.columns.includes('lot_id')
      ? new Set(dataset.records.map((r) => String(r.lot_id)).filter(Boolean)).size
      : 0,
    column_stats: stats,
    columns: dataset.columns,
  };
}

function preview(records, n) {
  return records.slice(0, n).map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      out[k] = v === null || (typeof v === 'number' && isNaN(v)) ? null : v;
    }
    return out;
  });
}

/* ---------------- API router ---------------- */

export async function handleApiRequest(url, init = {}) {
  const method = (init.method || 'GET').toUpperCase();
  let path = url;
  if (path.startsWith('/api/')) path = path.slice(4);
  if (path.startsWith('api/')) path = path.slice(4);
  const [route, query] = path.split('?');
  const authHeader = (init.headers && init.headers.Authorization) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const authed = !!token && !!state.tokens[token];

  async function bodyJson() {
    if (!init.body) return {};
    if (typeof init.body === 'string') return JSON.parse(init.body || '{}');
    if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
      const obj = {};
      for (const [k, v] of init.body.entries()) obj[k] = v;
      return obj;
    }
    return {};
  }

  async function requireAuth() {
    if (!authed) {
      return { status: 401, body: { detail: 'Invalid token' } };
    }
    return null;
  }

  const respond = (status, body) => ({ status, body });

  /* ---- auth ---- */
  if (method === 'POST' && route === '/auth/login') {
    const { email, password } = await bodyJson();
    const user = state.users[email];
    if (!user || user.password !== sha256Hex(password)) {
      return respond(401, { detail: 'Invalid credentials' });
    }
    const token = sha256Hex(`${email}${Date.now()}${Math.random()}`);
    state.tokens[token] = { email, role: user.role, name: user.name };
    persist();
    return respond(200, {
      token,
      user: { email, name: user.name, role: user.role },
    });
  }

  if (method === 'POST' && route === '/auth/register') {
    const { email, password, name, role = 'engineer' } = await bodyJson();
    if (state.users[email]) return respond(400, { detail: 'Email already registered' });
    const pwError = validatePassword(password);
    if (pwError) return respond(400, { detail: pwError });
    state.users[email] = { password: sha256Hex(password), name, role };
    persist();
    return respond(200, { message: 'Registration successful', email, role });
  }

  if (method === 'GET' && route === '/auth/me') {
    const err = await requireAuth();
    if (err) return err;
    return respond(200, { user: state.tokens[token] });
  }

  /* ---- upload ---- */
  if (method === 'POST' && route === '/upload/csv') {
    const err = await requireAuth();
    if (err) return err;
    const fd = await bodyJson();
    const file = fd.file;
    if (!file && init.body && typeof FormData !== 'undefined' && init.body instanceof FormData) {
      const f = init.body.get('file');
      if (f) { file.name = f.name; file.text = () => f.text(); }
    }
    const fname = file && file.name;
    if (!fname || !/\.(csv|xlsx|xls)$/i.test(fname)) {
      return respond(400, { detail: 'File must be CSV or Excel' });
    }
    try {
      const content = await file.text();
      if (/\.(xlsx|xls)$/i.test(fname)) {
        return respond(400, { detail: 'Error reading file: Excel files are not supported in the browser demo. Please upload a CSV file.' });
      }
      const { columns, records } = parseCsv(content);
      if (!columns.length) return respond(400, { detail: 'Error reading file: Empty CSV' });
      state.dataset = { records, columns };
      state.filename = fname;
      state.columns = columns;
      persist();
      return respond(200, {
        message: 'File uploaded successfully',
        filename: fname,
        rows: records.length,
        columns,
        preview: preview(records, 10),
      });
    } catch (e) {
      return respond(400, { detail: `Error reading file: ${e.message || e}` });
    }
  }

  if (method === 'POST' && route === '/upload/manual') {
    const err = await requireAuth();
    if (err) return err;
    const data = await bodyJson();
    if (!Array.isArray(data)) return respond(400, { detail: 'Invalid payload' });
    const records = data.map((e) => ({ component_id: e.component_id, lot_id: e.lot_id, ...e.measurements }));
    const columns = Object.keys(records[0] || {});
    state.dataset = { records, columns };
    persist();
    return respond(200, {
      message: `Uploaded ${records.length} components`,
      columns,
      preview: preview(records, 10),
    });
  }

  /* ---- data ---- */
  if (method === 'GET' && route === '/data/sample') {
    const err = await requireAuth();
    if (err) return err;
    const records = generateFlatData(200, 5, 0.08);
    const columns = Object.keys(records[0]);
    state.dataset = { records, columns };
    state.filename = 'sample_burn_in_data.csv';
    state.columns = columns;
    persist();
    return respond(200, {
      message: 'Sample data generated',
      rows: records.length,
      columns,
      preview: preview(records, 20),
      lots: [...new Set(records.map((r) => r.lot_id))],
      defective_count: records.filter((r) => r.is_defective).length,
      total_count: records.length,
    });
  }

  if (method === 'GET' && route === '/data/stats') {
    const err = await requireAuth();
    if (err) return err;
    return respond(200, buildDataStats());
  }

  /* ---- analysis ---- */
  if (method === 'POST' && route === '/analysis/outlier') {
    const err = await requireAuth();
    if (err) return err;
    if (!state.dataset) return respond(400, { detail: 'No data loaded' });
    const cfg = { ...state.detectorConfig, ...(await bodyJson()) };
    state.detectorConfig = cfg;
    persist();
    const result = runOutlierAnalysis(state.dataset.records, state.dataset.columns, cfg);
    if (result.error) return respond(result.error, { detail: result.detail });
    state.outlier_results = result.results;
    state.outlier_summary = result.summary;
    persist();
    return respond(200, result);
  }

  if (method === 'POST' && route === '/analysis/drift-train') {
    const err = await requireAuth();
    if (err) return err;
    if (!state.dataset) return respond(400, { detail: 'No data loaded' });
    const trained = trainDriftModels(state.dataset);
    if (!trained.length) {
      return respond(400, { detail: 'No parametric columns with time-series data found' });
    }
    const { allResults, accuracyMetrics } = predictDriftBatch(state.dataset);
    state.drift_results = allResults;
    state.drift_accuracy = accuracyMetrics;
    persist();
    return respond(200, {
      message: 'Models trained successfully',
      trained_parameters: trained,
      training_metrics: state.training_metrics,
      safety_slopes: Object.fromEntries(Object.entries(state.safety_slopes).map(([k, v]) => [k, rnd(v, 6)])),
      feature_importances: state.feature_importances,
      accuracy_metrics: accuracyMetrics,
      total_predictions: allResults.length,
    });
  }

  if (method === 'POST' && route === '/analysis/drift-predict') {
    const err = await requireAuth();
    if (err) return err;
    const { param, value_0h, value_24h, value_96h } = await bodyJson();
    return respond(200, predictSingleDrift(param, value_0h, value_24h, value_96h));
  }

  if (method === 'POST' && route === '/analysis/drift-batch') {
    const err = await requireAuth();
    if (err) return err;
    if (!state.dataset) return respond(400, { detail: 'No data loaded' });
    if (!Object.keys(driftModels).length && state.trained_parameters.length) {
      trainDriftModels(state.dataset);
    }
    const { allResults, accuracyMetrics } = predictDriftBatch(state.dataset);
    state.drift_results = allResults;
    state.drift_accuracy = accuracyMetrics;
    persist();
    return respond(200, {
      total_predictions: allResults.length,
      accuracy_metrics: accuracyMetrics,
      results: allResults,
    });
  }

  if (method === 'GET' && route === '/analysis/dashboard') {
    const err = await requireAuth();
    if (err) return err;
    return respond(200, buildDashboard());
  }

  if (method === 'GET' && route.startsWith('/analysis/explain/')) {
    const err = await requireAuth();
    if (err) return err;
    const componentId = decodeURIComponent(route.slice('/analysis/explain/'.length));
    const result = buildExplanation(componentId);
    if (result.error) return respond(result.error, { detail: result.detail });
    return respond(200, result);
  }

  if (method === 'POST' && route === '/analysis/comprehensive') {
    const err = await requireAuth();
    if (err) return err;
    if (!state.dataset) return respond(400, { detail: 'No data loaded' });
    const cfg = { ...state.detectorConfig, ...(await bodyJson()) };
    state.detectorConfig = cfg;
    persist();
    const result = runComprehensive(state.dataset.records, state.dataset.columns, cfg);
    if (result.error) return respond(result.error, { detail: result.detail });
    persist();
    return respond(200, {
      summary: result.summary,
      results: result.results,
    });
  }

  /* ---- health ---- */
  if (method === 'GET' && route === '/system/health') {
    return respond(200, {
      status: 'healthy',
      system: 'ISRO Burn-In Anomaly Detection System',
      version: '1.0.0',
      data_loaded: !!state.dataset,
      models_trained: Object.keys(driftModels).length > 0,
    });
  }

  return respond(404, { detail: 'Not Found' });
}

/* ---------------- fetch shim ---------------- */

function makeResponse(status, body) {
  const json = JSON.stringify(body);
  if (typeof Response !== 'undefined') {
    return new Response(json, {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: {},
    json: async () => body,
  };
}

export function installShim() {
  if (typeof window === 'undefined') return;
  if (window.__maverickShimInstalled) return;
  window.__maverickShimInstalled = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url);
    if (url && url.startsWith('/api/')) {
      const result = await handleApiRequest(url, init);
      return makeResponse(result.status, result.body);
    }
    if (typeof input === 'string') return realFetch(input, init);
    return realFetch(input, init);
  };
  window.__maverickApi = { handleApiRequest, state, generateFlatData, installShim };
}

installShim();