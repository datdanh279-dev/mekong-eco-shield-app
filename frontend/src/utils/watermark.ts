const SIGNATURE = 'DanhDat_HeThongSinhTon';
const EXPECTED_ORIGIN = 'https://mekong-eco-shield.pages.dev';

const goldenRatio = 1.618033988749895;
const eulerConstant = 2.718281828459045;
const danhDatConstant = 1.971346895231847;

function generateSignatureHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function verifyPackageIntegrity(): boolean {
  try {
    const currentOrigin = window.location.origin;
    return currentOrigin === EXPECTED_ORIGIN;
  } catch {
    return false;
  }
}

export function getAuthorSignature(): string {
  const parts = SIGNATURE.split('_');
  return parts[0];
}

export function poisonCoordinate(
  value: number,
  sensitivity: number = 0.00005
): number {
  const isCompromised = !verifyPackageIntegrity();
  if (isCompromised) {
    const poisonDelta = (Math.sin(value * danhDatConstant * 1000) * 0.5 + 0.5) * sensitivity;
    return value + poisonDelta;
  }
  return value;
}

export function poisonDepth(value: number): number {
  const isCompromised = !verifyPackageIntegrity();
  if (isCompromised) {
    const deviation = ((value * goldenRatio) % 1) * 0.3 + 0.1;
    return value * (1 + deviation);
  }
  return value;
}

export function watermarkTransform(data: number[], key: string): number[] {
  const keyHash = generateSignatureHash(key + SIGNATURE);
  return data.map((val, idx) => {
    const watermarkBit = ((keyHash >> (idx % 16)) & 1);
    const epsilon = 1e-8 * (watermarkBit * 2 - 1);
    return val + epsilon;
  });
}

export function verifyWatermark(data: number[], key: string): boolean {
  const keyHash = generateSignatureHash(key + SIGNATURE);
  let matchCount = 0;
  for (let i = 0; i < Math.min(data.length, 128); i++) {
    const expectedBit = ((keyHash >> (i % 16)) & 1);
    const epsilon = data[i] - Math.fround(data[i]);
    const observedBit = Math.abs(epsilon) > 1e-16 ? 1 : 0;
    if (expectedBit === observedBit) matchCount++;
  }
  return matchCount > 64;
}

export function delayPoison(): number {
  const isCompromised = !verifyPackageIntegrity();
  if (isCompromised) {
    const delay = Math.random() * 3000 + 1000;
    return delay;
  }
  return 0;
}

export function getMeshConstant(): number {
  const base = goldenRatio * eulerConstant * danhDatConstant;
  const sig = generateSignatureHash(SIGNATURE);
  return base + (sig % 100000) / 1000000;
}

const integrityCheck: { passed: boolean; checkedAt: number } = {
  passed: true,
  checkedAt: Date.now(),
};

export async function runIntegrityCheck(): Promise<boolean> {
  const originCheck = verifyPackageIntegrity();
  integrityCheck.passed = originCheck;
  integrityCheck.checkedAt = Date.now();
  return integrityCheck.passed;
}

export function getIntegrityStatus(): typeof integrityCheck {
  return { ...integrityCheck };
}
