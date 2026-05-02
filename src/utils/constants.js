export const SERVICE_INFO = {
  full_design: {
    icon: '✨',
    title: 'Vreau designer',
    desc: 'Încarci pozele, noi aranjăm totul profesional. Tu doar aprobi rezultatul.',
    time: '24-48h',
    path: 'designer',
    recommended: true,
  },
  self_service: {
    icon: '🎨',
    title: 'Creez singur',
    desc: 'Aranjezi pozele pe pagini cum dorești. Noi verificăm calitatea înainte de tipar.',
    time: '12h verificare',
    path: 'self',
  },
};

export const ORDER_STEPS = [
  { key: 'paid',     label: 'Plătit' },
  { key: 'designer', label: 'Designer' },
  { key: 'macheta',  label: 'Machetă' },
  { key: 'livrat',   label: 'Livrat' },
];

export function getOrderStepIndex(status) {
  if (status === 'delivered' || status === 'shipped') return 3;
  if (status === 'approved_print' || status === 'in_print') return 3;
  if (status === 'pending_client_approval' || status === 'revision_requested') return 2;
  if (status === 'designer_working' || status === 'paid_pending_designer') return 1;
  if (status === 'awaiting_payment') return 0;
  return 0;
}

export const SCREEN_STEP = {
  'phone': 2, 'phone-confirm': 2, 'cabinet': 2,
  'editor': 3,
  'checkout': 4,
  'confirm-designer': 5, 'confirm-self': 5,
  'phone-return': 2,
  'approval': 5, 'confirm-approved': 5, 'revision': 5,
  'order-detail': 4,
};
