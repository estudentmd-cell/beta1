const RO_MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

let _cachedDeliveryDays = null;

export function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function calculateDeliveryDate(workingDays = 18) {
  const date = new Date();
  let added = 0;
  while (added < workingDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}

export function getDeliveryRange() {
  const days = _cachedDeliveryDays || 18;
  const min = calculateDeliveryDate(days - 3);
  const max = calculateDeliveryDate(days);
  return `${formatDate(min)} – ${formatDate(max)}`;
}

// Load delivery days from Firestore settings
export async function loadDeliveryDays(productSlug = 'pagini-groase') {
  if (_cachedDeliveryDays) return _cachedDeliveryDays;
  try {
    const { db } = await import('../firebase/config');
    if (!db) return 18;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'settings', 'products'));
    if (snap.exists()) {
      const items = snap.data().items || [];
      const product = items.find(p => p.slug === productSlug);
      if (product?.deliveryDays) {
        _cachedDeliveryDays = product.deliveryDays;
        return product.deliveryDays;
      }
    }
  } catch {}
  return 18;
}

export function getDeliveryDays() {
  return _cachedDeliveryDays || 18;
}
