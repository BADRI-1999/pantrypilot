/** Normalize a food/product string for fuzzy matching. */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d+\s*(kg|g|gm|gms|ml|l|ltr|pcs|pc|pack|pkt|x)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convert a quantity in a receipt unit into a food entity's base unit (g/ml/pcs). */
export function toBaseUnit(
  quantity: number,
  unit: string,
  baseUnit: string,
  densityGPerMl = 1,
): { quantity: number; unit: string } {
  const u = unit.toLowerCase().trim();
  // mass
  if (u === 'kg') return convert(quantity * 1000, 'g', baseUnit, densityGPerMl);
  if (u === 'g' || u === 'gm' || u === 'gms') return convert(quantity, 'g', baseUnit, densityGPerMl);
  // volume
  if (u === 'l' || u === 'ltr' || u === 'litre') return convert(quantity * 1000, 'ml', baseUnit, densityGPerMl);
  if (u === 'ml') return convert(quantity, 'ml', baseUnit, densityGPerMl);
  // count
  if (u === 'pcs' || u === 'pc' || u === 'piece' || u === 'pack' || u === 'pkt' || u === 'unit')
    return { quantity, unit: 'pcs' };
  // default: assume already base
  return { quantity, unit: baseUnit };
}

function convert(
  quantity: number,
  from: 'g' | 'ml',
  baseUnit: string,
  densityGPerMl: number,
): { quantity: number; unit: string } {
  if (from === baseUnit) return { quantity, unit: baseUnit };
  if (from === 'g' && baseUnit === 'ml') return { quantity: quantity / densityGPerMl, unit: 'ml' };
  if (from === 'ml' && baseUnit === 'g') return { quantity: quantity * densityGPerMl, unit: 'g' };
  // count base but mass/volume given → leave as-is in base
  return { quantity, unit: baseUnit };
}

export function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
