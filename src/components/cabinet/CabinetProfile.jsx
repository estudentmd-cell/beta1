import { useState } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';

export default function CabinetProfile({ onNavigate }) {
  const { clientName, clientPhone, user } = useAuthStore();
  const { addToast } = useUIStore();
  // Get email from auth store: user.email (Google) or clientEmail (OTP registration)
  const clientEmail = useAuthStore.getState().clientEmail || user?.email || '';

  const [name, setName] = useState(clientName || '');
  const [phone, setPhone] = useState(clientPhone || '');
  const email = clientEmail || '';

  const initial = clientName ? clientName.charAt(0).toUpperCase() : '?';

  const handleSave = (e) => {
    e.preventDefault();
    useAuthStore.getState().setClientInfo(name, phone);
    addToast('Datele au fost salvate!');
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
      {/* Header — desktop only */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={() => onNavigate('account')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F0F0] transition-colors"
        >
          <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-serif text-[24px] text-[#1A1A1A]">Date personale</h1>
      </div>

      {/* Profile hero */}
      <div className="bg-white rounded-[12px] p-4 md:p-6 flex items-center gap-4">
        <div className="w-[56px] h-[56px] md:w-16 md:h-16 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-xl md:text-2xl font-bold shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-[17px] font-semibold text-[#1C1C1E]">{clientName || 'Utilizator'}</p>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Membru din martie 2026</p>
        </div>
      </div>

      {/* Form card */}
      <form onSubmit={handleSave} className="bg-white rounded-[12px] p-4 md:p-5 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-[12px] font-semibold text-[#888] uppercase tracking-wide mb-1.5">
            Nume complet
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Introdu numele complet"
            className="w-full px-4 py-3 text-[14px] text-[#1A1A1A] bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E] transition-colors"
          />
        </div>

        {/* Email (disabled) */}
        <div>
          <label className="block text-[12px] font-semibold text-[#888] uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-3 text-[14px] text-[#AAA] bg-[#F0F0F0] border border-[#E0E0E0] rounded-lg cursor-not-allowed"
          />
          <p className="text-[11px] text-[#BBB] mt-1">Emailul nu poate fi modificat</p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[12px] font-semibold text-[#888] uppercase tracking-wide mb-1.5">
            Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+373 6X XXX XXX"
            className="w-full px-4 py-3 text-[14px] text-[#1A1A1A] bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E] transition-colors"
          />
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="w-full py-3 bg-[#3D6B5E] text-white text-[14px] font-semibold rounded-lg hover:bg-[#34594f] transition-colors"
        >
          Salveaza modificarile
        </button>
      </form>
    </div>
  );
}
