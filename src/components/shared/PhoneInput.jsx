import { useState } from 'react';

const PREFIXES = [
  { code: '+373', label: '🇲🇩 +373', country: 'MD' },
  { code: '+40',  label: '🇷🇴 +40',  country: 'RO' },
];

export default function PhoneInput({ value, onChange, disabled }) {
  const [prefix, setPrefix] = useState(PREFIXES[0].code);

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange(prefix + digits, digits);
  };

  const digits = value ? value.replace(prefix, '').replace(/\D/g, '') : '';

  return (
    <div className="flex gap-2">
      <select
        value={prefix}
        onChange={(e) => setPrefix(e.target.value)}
        disabled={disabled}
        className="bg-bg-2 border border-bdr rounded px-3 py-3 text-sm font-medium min-w-[100px]"
      >
        {PREFIXES.map((p) => (
          <option key={p.code} value={p.code}>{p.label}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        value={digits}
        onChange={handleChange}
        disabled={disabled}
        placeholder="69 123 456"
        className="flex-1 bg-card border border-bdr rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ac/30 focus:border-ac disabled:bg-bg-2 disabled:text-tx-3"
      />
    </div>
  );
}
