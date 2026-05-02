const STATUS_MAP = {
  draft:                    { label: 'Ciornă',             bg: 'bg-gray-100',   text: 'text-gray-600' },
  awaiting_payment:         { label: 'Așteaptă achitarea', bg: 'bg-amber-100',  text: 'text-amber-700' },
  paid_pending_designer:    { label: 'Așteaptă designer',  bg: 'bg-blue-100',   text: 'text-blue-700' },
  paid_pending_verification:{ label: 'Așteaptă verificare',bg: 'bg-blue-100',   text: 'text-blue-700' },
  designer_working:         { label: 'Designer lucrează',  bg: 'bg-indigo-100', text: 'text-indigo-700' },
  pending_client_approval:  { label: 'Așteaptă aprobare',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  revision_requested:       { label: 'Revizuire cerută',   bg: 'bg-orange-100', text: 'text-orange-700' },
  approved_print:           { label: 'Gata de tipar',      bg: 'bg-green-100',  text: 'text-green-700' },
  in_print:                 { label: 'La tipar',           bg: 'bg-teal-100',   text: 'text-teal-700' },
  print_ready:              { label: 'Primit de la tipar', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  shipped:                  { label: 'Expediat',           bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered:                { label: 'Livrat',             bg: 'bg-emerald-100',text: 'text-emerald-800' },
  cancelled:                { label: 'Anulat',             bg: 'bg-red-100',    text: 'text-red-700' },
  refunded:                 { label: 'Rambursat',          bg: 'bg-red-100',    text: 'text-red-600' },
};

/**
 * Compute a granular client activity status from order data.
 * Shows exactly where the client is in the sales funnel.
 */
export function getGranularStatus(order) {
  // Non-draft statuses use the standard map
  if (order.status && order.status !== 'draft') {
    return STATUS_MAP[order.status] || { label: order.status, bg: 'bg-gray-100', text: 'text-gray-600' };
  }

  // Draft — compute granular status from data
  const photos = order.totalPhotos || 0;
  const used = order.usedPhotos || 0;
  const progress = order.progress || 0;
  const createdAt = order.createdAt || order.created_at;
  const hoursSinceCreate = createdAt ? (Date.now() - new Date(createdAt).getTime()) / 3600000 : 0;
  const daysSinceCreate = hoursSinceCreate / 24;

  // --- Fără poze ---
  if (photos === 0 && daysSinceCreate > 3) {
    return { label: 'Abandonat', bg: 'bg-red-50', text: 'text-red-500', icon: '🔴', stage: 'lost' };
  }
  if (photos === 0 && hoursSinceCreate > 24) {
    return { label: 'Nu a încărcat', bg: 'bg-red-50', text: 'text-red-400', icon: '🔴', stage: 'risk' };
  }
  if (photos === 0) {
    return { label: 'Vizitator nou', bg: 'bg-gray-100', text: 'text-gray-500', icon: '⚪', stage: 'new' };
  }

  // --- Are poze dar nu a ales produs (upload-first flow) ---
  const hasProduct = order.productConfig?.format && order.productConfig?.initialPages;
  if (photos > 0 && !hasProduct && daysSinceCreate > 1) {
    return { label: 'Poze fără album', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '📷', stage: 'photos_no_product' };
  }
  if (photos > 0 && !hasProduct) {
    return { label: 'Tocmai a încărcat', bg: 'bg-yellow-50', text: 'text-yellow-600', icon: '📷', stage: 'just_uploaded' };
  }

  // --- Are poze dar nu le-a plasat ---
  if (used === 0 && daysSinceCreate > 2) {
    return { label: 'Poze nefolosite', bg: 'bg-orange-100', text: 'text-orange-700', icon: '🟠', stage: 'stuck_upload' };
  }
  if (used === 0) {
    return { label: 'A încărcat poze', bg: 'bg-yellow-50', text: 'text-yellow-600', icon: '🟡', stage: 'uploaded' };
  }

  // --- Editează ---
  if (progress < 30 && daysSinceCreate > 2) {
    return { label: 'Editează greu', bg: 'bg-orange-50', text: 'text-orange-600', icon: '🟠', stage: 'stuck_editor' };
  }
  if (progress < 50) {
    return { label: 'Lucrează', bg: 'bg-orange-50', text: 'text-orange-600', icon: '🟠', stage: 'working' };
  }

  // --- Aproape gata ---
  if (progress >= 80 && daysSinceCreate > 1) {
    return { label: 'Gata — nu comandă!', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '🟢', stage: 'hot_lead' };
  }
  if (progress >= 50) {
    return { label: 'Aproape gata', bg: 'bg-blue-50', text: 'text-blue-600', icon: '🔵', stage: 'almost' };
  }

  return { label: 'Gata de trimis', bg: 'bg-green-50', text: 'text-green-600', icon: '🟢', stage: 'ready' };
}

/**
 * Sales action — tells admin exactly what to do for this client.
 * Returns { action, reason, priority: 'hot'|'warm'|'cold'|'none' }
 */
export function getSalesAction(order) {
  const photos = order.totalPhotos || 0;
  const used = order.usedPhotos || 0;
  const progress = order.progress || 0;
  const createdAt = order.createdAt || order.created_at;
  const hoursSinceCreate = createdAt ? (Date.now() - new Date(createdAt).getTime()) / 3600000 : 0;
  const daysSinceCreate = hoursSinceCreate / 24;
  const phone = order.clientPhone || order.client_phone || '';

  // Already paid — no sales action needed
  if (order.status && order.status !== 'draft') {
    return { action: null, reason: null, priority: 'none' };
  }

  // HOT — gata dar nu comandă (cel mai aproape de vânzare!)
  if (progress >= 70 && daysSinceCreate > 0.5) {
    return {
      action: 'Sună ACUM',
      reason: `Album ${progress}% gata, ${photos} poze — nu a comandat de ${Math.floor(daysSinceCreate)}z`,
      priority: 'hot',
      phone,
    };
  }

  // HOT — are poze dar nu a ales produs (upload-first)
  const hasProduct = order.productConfig?.format && order.productConfig?.initialPages;
  if (photos >= 10 && !hasProduct && hoursSinceCreate > 6) {
    return {
      action: 'Sună — ajută să aleagă albumul',
      reason: `${photos} poze încărcate, nu a ales formatul — ajută-o să decidă`,
      priority: 'hot',
      phone,
    };
  }

  // HOT — are multe poze dar nu le folosește
  if (photos >= 20 && used === 0 && hoursSinceCreate > 12) {
    return {
      action: 'Sună — oferă ajutor',
      reason: `${photos} poze încărcate dar 0 plasate — poate nu știe cum`,
      priority: 'hot',
      phone,
    };
  }

  // WARM — are poze, editează dar încet
  if (photos > 0 && used > 0 && progress < 50 && daysSinceCreate > 2) {
    return {
      action: 'Sună — propune designer gratuit',
      reason: `Editează de ${Math.floor(daysSinceCreate)}z, doar ${progress}% — propune serviciul designer`,
      priority: 'warm',
      phone,
    };
  }

  // WARM — poze puține, poate nu a terminat uploadul
  if (photos > 0 && photos < 10 && daysSinceCreate > 1) {
    return {
      action: 'Sună — încurajează upload',
      reason: `Doar ${photos} poze de ${Math.floor(daysSinceCreate)}z — poate are nevoie de ajutor`,
      priority: 'warm',
      phone,
    };
  }

  // COLD — vizitator care nu a uploadat
  if (photos === 0 && hoursSinceCreate > 24) {
    return {
      action: 'Sună — întreabă dacă are nevoie',
      reason: `A creat proiect dar n-a uploadat nimic de ${Math.floor(hoursSinceCreate)}h`,
      priority: 'cold',
      phone,
    };
  }

  // Nou — lasă-l să lucreze
  return { action: null, reason: null, priority: 'none' };
}

export default function StatusBadge({ status, order }) {
  const s = order ? getGranularStatus(order) : (STATUS_MAP[status] || { label: status || '—', bg: 'bg-gray-100', text: 'text-gray-600' });
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon ? `${s.icon} ` : ''}{s.label}
    </span>
  );
}

export { STATUS_MAP };
