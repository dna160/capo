// Pre-generated demo vault codes for Ultra Milk × Kamen Rider: Gotchard
// These are issued deterministically during demo redemption so the same
// typed code always produces the same-looking reward code.

export const VAULT_STANDARD: string[] = [
  'GOTS-RIDE-A4K2M9', 'GOTS-RIDE-B7R5P1', 'GOTS-RIDE-C2W8N6',
  'GOTS-RIDE-D9X1Q3', 'GOTS-RIDE-E5T4L8', 'GOTS-RIDE-F3Y7J2',
  'GOTS-RIDE-G6H0V5', 'GOTS-RIDE-H1S9U4', 'GOTS-RIDE-I8Z3K7',
  'GOTS-RIDE-J4A6R0', 'GOTS-RIDE-K9M2W1', 'GOTS-RIDE-L7N5B8',
  'GOTS-RIDE-M2P8F3', 'GOTS-RIDE-N6Q1C9', 'GOTS-RIDE-O3T4X5',
  'GOTS-RIDE-P5V7E2', 'GOTS-RIDE-Q1Y0H6', 'GOTS-RIDE-R8U3G4',
  'GOTS-RIDE-S4J9D7', 'GOTS-RIDE-T2K6I1',
]

export const VAULT_TIER1: string[] = [
  'KRGR-T1-MX4902', 'KRGR-T1-BN7153', 'KRGR-T1-QR2864',
  'KRGR-T1-WK5017', 'KRGR-T1-ZA8340', 'KRGR-T1-FJ1596',
  'KRGR-T1-LP3782', 'KRGR-T1-UH6025', 'KRGR-T1-CT9418',
  'KRGR-T1-YV2673', 'KRGR-T1-SN4831', 'KRGR-T1-GM7209',
  'KRGR-T1-DP5064', 'KRGR-T1-EX8317', 'KRGR-T1-IB1940',
]

export const VAULT_TIER2: string[] = [
  'KRGR-T2-XP7302', 'KRGR-T2-AW4185', 'KRGR-T2-VN9426',
  'KRGR-T2-JR1058', 'KRGR-T2-HQ6793', 'KRGR-T2-KD2541',
  'KRGR-T2-TS3867', 'KRGR-T2-MU9014', 'KRGR-T2-OE5738',
  'KRGR-T2-CB4290', 'KRGR-T2-FZ8163', 'KRGR-T2-IG3705',
]

export const VAULT_TIER3: string[] = [
  'KRGR-T3-GOTCH01', 'KRGR-T3-GOTCH02', 'KRGR-T3-GOTCH03',
  'KRGR-T3-GOTCH04', 'KRGR-T3-GOTCH05', 'KRGR-T3-GOTCH06',
  'KRGR-T3-GOTCH07', 'KRGR-T3-GOTCH08', 'KRGR-T3-GOTCH09',
  'KRGR-T3-GOTCH10',
]

export const VAULT_VARIETY: string[] = [
  'KRGR-VAR-FULLSET1', 'KRGR-VAR-FULLSET2', 'KRGR-VAR-FULLSET3',
  'KRGR-VAR-FULLSET4', 'KRGR-VAR-FULLSET5',
]

/** Pick a code from a pool using a numeric seed (wraps around) */
export function pickCode(pool: string[], seed: number): string {
  return pool[Math.abs(seed) % pool.length]
}
