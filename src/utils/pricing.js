// Pagini groase (layflat) — prețuri reale sincronizate cu Firestore settings/pricing
export const GROASE_PRICES = {
  '20×20': { 20: 2110, 30: 2360, 40: 2600, 50: 2860, 60: 3140, 70: 3400, 80: 3660 },
  '20×30': { 20: 0, 30: 0, 40: 0, 50: 0, 60: 0, 70: 0, 80: 0 },
  '23×23': { 20: 2450, 30: 2840, 40: 3210, 50: 3600, 60: 4050, 70: 4500, 80: 4950 },
  '30×30': { 20: 2440, 30: 2840, 40: 3220, 50: 3640, 60: 4090, 70: 4500, 80: 4900 },
};
export const GROASE_PAGE_OPTIONS = [20, 30, 40, 50, 60, 70, 80];

// Pagini subțiri (revistă) — prețuri reale sincronizate cu Firestore settings/pricing
export const SUBTIRI_PRICES = {
  '20×20': { 32: 0, 52: 0, 60: 0, 72: 0, 80: 0, 96: 0 },
  '20×30': { 32: 1890, 40: 1960, 52: 2080, 60: 2140, 72: 2240, 80: 2290, 96: 2410 },
  '23×23': { 32: 10, 52: 0, 60: 0, 72: 0, 80: 0, 96: 0 },
  '30×30': { 32: 0, 40: 0, 52: 0, 60: 0, 72: 0, 80: 0, 96: 0 },
};
export const SUBTIRI_PAGE_OPTIONS = [32, 40, 52, 60, 72, 80, 96];

export const EXTRA_ROTATION_PRICE = 60;

export function getPagePrice(format, pages, productSlug) {
  const table = productSlug === 'pagini-subtiri'
    ? SUBTIRI_PRICES[format]
    : GROASE_PRICES[format];
  if (!table) return 0;
  if (table[pages] !== undefined) return table[pages];
  const opts = productSlug === 'pagini-subtiri' ? SUBTIRI_PAGE_OPTIONS : GROASE_PAGE_OPTIONS;
  let basePackage = opts[0];
  for (let i = opts.length - 1; i >= 0; i--) {
    if (opts[i] <= pages) { basePackage = opts[i]; break; }
  }
  const extraRotations = (pages - basePackage) / 2;
  return (table[basePackage] || 0) + extraRotations * EXTRA_ROTATION_PRICE;
}
