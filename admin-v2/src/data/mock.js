// ═══ MOCK DATA — Admin Panel V2 ═══
// Based on REAL Momentive products, prices, and workflow

// ── PRODUCTS ──
export const PRODUCTS = {
  'pagini-groase': {
    name: 'Album Pagini Groase',
    type: 'Layflat',
    description: 'Pagini rigide, deschidere 180° flat',
    formats: ['20×20', '20×30', '23×23', '30×30'],
    pages: [20, 30, 40, 50, 60, 70, 80],
    prices: {
      '20×20': { 20: 100, 30: 130, 40: 160, 50: 190, 60: 220, 70: 250, 80: 280 },
      '20×30': { 20: 120, 30: 155, 40: 190, 50: 225, 60: 260, 70: 295, 80: 330 },
      '23×23': { 20: 130, 30: 168, 40: 205, 50: 243, 60: 280, 70: 318, 80: 358 },
      '30×30': { 20: 160, 30: 205, 40: 250, 50: 295, 60: 340, 70: 385, 80: 430 },
    },
    extraRotation: 60,
  },
  'pagini-subtiri': {
    name: 'Album Pagini Subțiri',
    type: 'Magazine / Printbook',
    description: 'Pagini flexibile, stil revistă',
    formats: ['20×20', '20×30', '23×23', '30×30'],
    pages: [32, 52, 60, 72, 80, 96],
    prices: {
      '20×20': { 32: 85, 52: 120, 60: 140, 72: 165, 80: 185, 96: 215 },
      '20×30': { 32: 95, 52: 135, 60: 155, 72: 185, 80: 205, 96: 240 },
      '23×23': { 32: 100, 52: 140, 60: 162, 72: 190, 80: 212, 96: 250 },
      '30×30': { 32: 120, 52: 168, 60: 195, 72: 228, 80: 255, 96: 300 },
    },
    extraRotation: 60,
  },
};

// ── OFFERS ──
export const OFFERS = [
  { id: 'offer-nunta', product: 'pagini-groase', name: 'Album de Nuntă', emoji: '💒', format: '30×30', pages: 40, oldPrice: 250, newPrice: 189, badge: '-24%', deadline: '2026-05-10', theme: 'wedding' },
  { id: 'offer-copii', product: 'pagini-groase', name: 'Album pentru Copii', emoji: '👶', format: '20×20', pages: 30, oldPrice: 130, newPrice: 99, badge: '-24%', deadline: '2026-05-15', theme: 'kids' },
  { id: 'offer-vacanta', product: 'pagini-subtiri', name: 'Album de Vacanță', emoji: '🏖', format: '23×23', pages: 52, oldPrice: 140, newPrice: 105, badge: '-25%', deadline: '2026-04-30', theme: 'travel' },
  { id: 'offer-familie', product: 'pagini-groase', name: 'Album de Familie', emoji: '👨‍👩‍👧‍👦', format: '23×23', pages: 40, oldPrice: 205, newPrice: 159, badge: '-22%', deadline: '2026-06-01', theme: 'family' },
];

// ── COVERS ──
export const COVERS = [
  { id: 'typewriter', name: 'Typewriter', theme: 'classic', frames: 1, texts: 2 },
  { id: 'tender-moments', name: 'Tender Moments', theme: 'family', frames: 1, texts: 1 },
  { id: 'just-married', name: 'Just Married', theme: 'wedding', frames: 2, texts: 2 },
  { id: 'classic-portrait', name: 'Classic Portrait', theme: 'classic', frames: 1, texts: 1 },
  { id: 'modern-grid', name: 'Modern Grid', theme: 'modern', frames: 4, texts: 1 },
  { id: 'minimalist', name: 'Minimalist', theme: 'minimal', frames: 0, texts: 1 },
];

// ── STATUSES (real workflow) ──
export const STATUSES = {
  awaiting_photos:    { label: 'Treb. poze',        color: 'bg-yellow-100 text-yellow-700',  icon: '🟡' },
  awaiting_payment:   { label: 'Așteaptă plata',    color: 'bg-orange-100 text-orange-700',  icon: '🟠' },
  making_layout:      { label: 'Se maketează',       color: 'bg-blue-100 text-blue-700',      icon: '🔵' },
  client_reviewing:   { label: 'Trimisă la client',  color: 'bg-violet-100 text-violet-700',  icon: '🟣' },
  client_editing:     { label: 'Client editează',    color: 'bg-amber-100 text-amber-700',    icon: '✏️' },
  revision_requested: { label: 'Cere modificări',    color: 'bg-orange-100 text-orange-700',  icon: '🔄' },
  ready_to_print:     { label: 'Gata de tipar',      color: 'bg-green-100 text-green-700',    icon: '🟢' },
  printing:           { label: 'Se imprimă',         color: 'bg-red-100 text-red-600',        icon: '🔴' },
  printing_urgent:    { label: 'Urgență tipar',      color: 'bg-red-200 text-red-700',        icon: '🚨' },
  packaging:          { label: 'Împachetare',        color: 'bg-teal-100 text-teal-700',      icon: '📦' },
  ready_to_ship:      { label: 'Gata de livrat',     color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  delivered:          { label: 'Livrat',             color: 'bg-emerald-200 text-emerald-800', icon: '✅' },
  problem:            { label: 'Problemă',           color: 'bg-red-100 text-red-600',        icon: '⚠️' },
  abandoned:          { label: 'Abandonat',          color: 'bg-gray-100 text-gray-500',      icon: '💀' },
};

// ── CLIENTS (realistic) ──
export const CLIENTS = [
  { id: 'c1', name: 'Iura Pepa', phone: '+373 685 36 264', email: '', location: 'Chișinău, Moldova', device: 'mobile', type: 'lead', score: 'hot', created_at: '2026-03-06', last_access: '2026-03-09', totalOrders: 1, totalPhotos: 71, totalSpent: 850 },
  { id: 'c2', name: 'SMIGON LILIANA', phone: '79229244', email: 'smigon.l@gmail.com', location: 'Chișinău, Moldova', device: 'desktop', type: 'client', score: 'hot', created_at: '2026-03-03', last_access: '2026-03-13', totalOrders: 3, totalPhotos: 210, totalSpent: 2550 },
  { id: 'c3', name: 'Anastasia Kiose', phone: '+373 795 43 440', email: 'kiose.a@gmail.com', location: 'Bălți, Moldova', device: 'mobile', type: 'client', score: 'warm', created_at: '2026-03-07', last_access: '2026-03-13', totalOrders: 1, totalPhotos: 65, totalSpent: 850 },
  { id: 'c4', name: 'Olesea', phone: '685 36 264', email: '', location: 'Cahul, Moldova', device: 'mobile', type: 'lead', score: 'cold', created_at: '2026-02-01', last_access: '2026-02-05', totalOrders: 0, totalPhotos: 0, totalSpent: 0 },
  { id: 'c5', name: 'Iulia Murea', phone: '62141422', email: 'iulia.m@yahoo.com', location: 'Chișinău, Moldova', device: 'desktop', type: 'client', score: 'warm', created_at: '2026-03-04', last_access: '2026-03-13', totalOrders: 1, totalPhotos: 85, totalSpent: 850 },
  { id: 'c6', name: 'Ana Artene', phone: '782 17 799', email: 'ana.art@gmail.com', location: 'Orhei, Moldova', device: 'mobile', type: 'client', score: 'hot', created_at: '2026-03-05', last_access: '2026-03-13', totalOrders: 1, totalPhotos: 92, totalSpent: 850 },
  { id: 'c7', name: 'Alexandra Balan', phone: '069793232', email: '', location: 'Soroca, Moldova', device: 'mobile', type: 'lead', score: 'warm', created_at: '2026-03-10', last_access: '2026-03-11', totalOrders: 1, totalPhotos: 45, totalSpent: 850 },
  { id: 'c8', name: 'Adriana', phone: '+32 465 62 97 97', email: 'adriana.md@gmail.com', location: 'Bruxelles, Belgia', device: 'desktop', type: 'client', score: 'hot', created_at: '2026-03-11', last_access: '2026-03-13', totalOrders: 1, totalPhotos: 120, totalSpent: 2950 },
  { id: 'c9', name: 'Inga', phone: '+373 694 47 948', email: 'inga.v@mail.ru', location: 'Chișinău, Moldova', device: 'mobile', type: 'client', score: 'warm', created_at: '2026-03-12', last_access: '2026-03-13', totalOrders: 1, totalPhotos: 78, totalSpent: 850 },
  { id: 'c10', name: 'Natalia Vulpe', phone: '+373 69 123 456', email: 'natalia.v@gmail.com', location: 'Chișinău, Moldova', device: 'desktop', type: 'client', score: 'hot', created_at: '2026-03-12', last_access: '2026-03-13', totalOrders: 2, totalPhotos: 150, totalSpent: 1700 },
];

// ── ORDERS (realistic, based on Excel data) ──
export const ORDERS = [
  {
    id: '#1130', clientId: 'c1', clientName: 'Iura Pepa', clientPhone: '+373 685 36 264',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 0,
    status: 'printing', urgent: false, designer: 'Ana', photos: 71, photosPlaced: 71,
    dates: { paid: '2026-03-06', layoutSent: '2026-03-09', layoutApproved: '2026-03-10', toPrint: '2026-03-13', factoryReady: null, delivered: null },
    printCode: '', notes: '', address: '', device: 'mobile',
  },
  {
    id: '#1131', clientId: 'c3', clientName: 'Anastasia Kiose', clientPhone: '+373 795 43 440',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'packaging', urgent: false, designer: 'Ana', photos: 65, photosPlaced: 65,
    dates: { paid: '2026-03-07', layoutSent: '2026-03-10', layoutApproved: '2026-03-10', toPrint: '2026-03-13', factoryReady: '2026-03-23', delivered: null },
    printCode: 'F-2026-0087', notes: '', address: 'Ginta Latină 48, Anestiade', device: 'mobile',
  },
  {
    id: '#1132', clientId: 'c7', clientName: 'Alexandra Balan', clientPhone: '069793232',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'printing', urgent: false, designer: 'Ana', photos: 45, photosPlaced: 45,
    dates: { paid: '2026-03-10', layoutSent: '2026-03-11', layoutApproved: '2026-03-13', toPrint: '2026-03-13', factoryReady: null, delivered: null },
    printCode: '', notes: '', address: '', device: 'mobile',
  },
  {
    id: '#1133', clientId: 'c8', clientName: 'Adriana', clientPhone: '+32 465 62 97 97',
    product: 'pagini-groase', productName: 'Album Pagini Groase (Catifea)', format: '20×20', pages: 20, price: 2950, paid: 2950,
    status: 'printing', urgent: false, designer: 'Ana', photos: 120, photosPlaced: 120,
    dates: { paid: '2026-03-11', layoutSent: '2026-03-13', layoutApproved: '2026-03-13', toPrint: '2026-03-13', factoryReady: null, delivered: null },
    printCode: '', notes: '', address: 'Bruxelles, Belgia', device: 'desktop',
  },
  {
    id: '#1134', clientId: 'c2', clientName: 'SMIGON LILIANA', clientPhone: '79229244',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'delivered', urgent: false, designer: 'Ana', photos: 70, photosPlaced: 70,
    dates: { paid: '2026-03-06', layoutSent: '2026-03-06', layoutApproved: '2026-03-06', toPrint: '2026-03-06', factoryReady: '2026-03-09', delivered: '2026-03-09' },
    printCode: 'F-2026-0081', notes: 'macheta 1', address: 'Ridicare personala', device: 'desktop',
  },
  {
    id: '#1135', clientId: 'c2', clientName: 'SMIGON LILIANA', clientPhone: '79229244',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'delivered', urgent: false, designer: 'Ana', photos: 70, photosPlaced: 70,
    dates: { paid: '2026-03-06', layoutSent: '2026-03-06', layoutApproved: '2026-03-06', toPrint: '2026-03-06', factoryReady: '2026-03-09', delivered: '2026-03-09' },
    printCode: 'F-2026-0082', notes: 'macheta 2', address: 'Ridicare personala', device: 'desktop',
  },
  {
    id: '#1136', clientId: 'c2', clientName: 'SMIGON LILIANA', clientPhone: '79229244',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'delivered', urgent: false, designer: 'Ana', photos: 70, photosPlaced: 70,
    dates: { paid: '2026-03-06', layoutSent: '2026-03-06', layoutApproved: '2026-03-06', toPrint: '2026-03-06', factoryReady: '2026-03-09', delivered: '2026-03-09' },
    printCode: 'F-2026-0083', notes: 'macheta 3', address: 'Ridicare personala', device: 'desktop',
  },
  {
    id: '#1137', clientId: 'c5', clientName: 'Iulia Murea', clientPhone: '62141422',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'printing', urgent: false, designer: 'Ana', photos: 85, photosPlaced: 85,
    dates: { paid: '2026-03-04', layoutSent: '2026-03-09', layoutApproved: '2026-03-10', toPrint: '2026-03-13', factoryReady: null, delivered: null },
    printCode: '', notes: '', address: '', device: 'desktop',
  },
  {
    id: '#1138', clientId: 'c6', clientName: 'Ana Artene', clientPhone: '782 17 799',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'printing', urgent: false, designer: 'Ana', photos: 92, photosPlaced: 92,
    dates: { paid: '2026-03-05', layoutSent: '2026-03-10', layoutApproved: '2026-03-10', toPrint: '2026-03-13', factoryReady: null, delivered: null },
    printCode: '', notes: '', address: '', device: 'mobile',
  },
  {
    id: '#1139', clientId: 'c10', clientName: 'Natalia Vulpe', clientPhone: '+373 69 123 456',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 850,
    status: 'printing', urgent: false, designer: 'Ana', photos: 75, photosPlaced: 75,
    dates: { paid: '2026-03-12', layoutSent: '2026-03-12', layoutApproved: '2026-03-13', toPrint: '2026-03-13', factoryReady: null, delivered: null },
    printCode: '', notes: '', address: '', device: 'desktop',
  },
  {
    id: '#1140', clientId: 'c4', clientName: 'Olesea', clientPhone: '685 36 264',
    product: 'pagini-subtiri', productName: 'Album Pagini Subțiri', format: '20×30', pages: 40, price: 850, paid: 0,
    status: 'abandoned', urgent: false, designer: '', photos: 0, photosPlaced: 0,
    dates: { paid: null, layoutSent: null, layoutApproved: null, toPrint: null, factoryReady: null, delivered: null },
    printCode: '', notes: 'nu răspunde la telefon', address: '', device: 'mobile',
  },
  {
    id: '#1141', clientId: 'c9', clientName: 'Inga', clientPhone: '+373 694 47 948',
    product: 'pagini-groase', productName: 'Album Pagini Groase', format: '20×20', pages: 20, price: 100, paid: 0,
    status: 'awaiting_photos', urgent: false, designer: '', photos: 12, photosPlaced: 0,
    dates: { paid: null, layoutSent: null, layoutApproved: null, toPrint: null, factoryReady: null, delivered: null },
    printCode: '', notes: 'a început să încarce poze', address: '', device: 'mobile',
  },
];

export const TEAM = [
  { id: 't1', name: 'Dumitru', role: 'owner', activeOrders: 0, completedOrders: 45 },
  { id: 't2', name: 'Ana', role: 'designer', activeOrders: 8, completedOrders: 32 },
];

// ── Helper functions ──
export function getClientOrders(clientId) {
  return ORDERS.filter((o) => o.clientId === clientId);
}
export function getOrdersByStatus(status) {
  return ORDERS.filter((o) => o.status === status);
}
export function getStats() {
  const total = ORDERS.length;
  const paid = ORDERS.filter((o) => o.paid > 0).length;
  const printing = ORDERS.filter((o) => ['printing', 'printing_urgent'].includes(o.status)).length;
  const delivered = ORDERS.filter((o) => o.status === 'delivered').length;
  const abandoned = ORDERS.filter((o) => o.status === 'abandoned').length;
  const revenue = ORDERS.reduce((sum, o) => sum + (o.paid || 0), 0);
  const awaitingPhotos = ORDERS.filter((o) => o.status === 'awaiting_photos').length;
  const makingLayout = ORDERS.filter((o) => o.status === 'making_layout').length;
  const awaitingApproval = ORDERS.filter((o) => ['client_reviewing', 'revision_requested'].includes(o.status)).length;
  return { total, paid, printing, delivered, abandoned, revenue, awaitingPhotos, makingLayout, awaitingApproval };
}
export function getUrgentActions() {
  const actions = [];
  ORDERS.forEach((o) => {
    if (o.status === 'awaiting_photos' && o.photos > 0)
      actions.push({ type: 'call', order: o, message: `${o.clientName} — a încărcat ${o.photos} poze, nu a plasat` });
    if (o.status === 'abandoned')
      actions.push({ type: 'recover', order: o, message: `${o.clientName} — abandonat, de sunat` });
    if (o.status === 'client_reviewing') {
      const sent = o.dates.layoutSent ? new Date(o.dates.layoutSent) : null;
      if (sent && (Date.now() - sent.getTime()) > 48 * 3600000)
        actions.push({ type: 'reminder', order: o, message: `${o.clientName} — maketă neraprobată 3+ zile` });
    }
  });
  return actions;
}
export function getPrice(productSlug, format, pages) {
  const p = PRODUCTS[productSlug];
  if (!p || !p.prices[format]) return 0;
  return p.prices[format][pages] || 0;
}
