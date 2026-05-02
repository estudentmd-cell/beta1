export function formatPrice(n) {
  return (Number(n) || 0).toFixed(2).replace('.', ',') + ' lei';
}

export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
