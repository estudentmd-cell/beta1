const BADGE_STYLES = {
  draft:     'bg-warn-light text-warn',
  finalizat: 'bg-ok-light text-ok',
  comandat:  'bg-danger-light text-danger',
  in_cart:   'bg-warn-light text-warn',
  evicted:   'bg-purple-100 text-purple-700',
};

const BADGE_LABELS = {
  draft:     'Ciornă',
  finalizat: 'Finalizat',
  comandat:  'Comandat',
  in_cart:   'De achitat',
  evicted:   'Arhivat',
};

export default function Badge({ status }) {
  const style = BADGE_STYLES[status] || 'bg-bg-2 text-tx-3';
  const label = BADGE_LABELS[status] || status;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}
